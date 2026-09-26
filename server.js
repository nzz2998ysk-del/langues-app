const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const { sendEmail, welcomeEmailHtml, invoiceEmailHtml } = require("./lib/email");
const stripeLib = require("./lib/stripe");

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;
const COOKIE_NAME = "langues_session";
const isProd = process.env.NODE_ENV === "production";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "raphael.sanguinetti@icloud.com").toLowerCase();
const BUSINESS_NAME = process.env.BUSINESS_NAME || "Mes langues";

if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set.");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("FATAL: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});

// Access model: every language is free at a basic level for every account.
// What the admin can toggle free <-> premium here is no longer "which
// language" but "which kind of deeper content" (feedback, lessons, exercises),
// applied across all languages.
const DEFAULT_FEATURES = [
  { key: "feedback-avance", label: "Feedback avancé", category: "premium", is_premium: true, sort_order: 1 },
  { key: "lecons-avancees", label: "Leçons avancées", category: "premium", is_premium: true, sort_order: 2 },
  { key: "exercices-avances", label: "Exercices avancés", category: "premium", is_premium: true, sort_order: 3 },
];

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      subscribed BOOLEAN NOT NULL DEFAULT FALSE,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // Backfill in case the column was added after the table already existed.
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;`);
  // Per-account custom ordering of the language cards on the hub (JSON array of codes).
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS lang_order TEXT;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS features (
      key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'language',
      is_premium BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INT NOT NULL DEFAULT 0
    );
  `);
  // Old model: per-language premium flags (he/es/en/it free, zh/pt/ru/de/ja premium).
  // New model: every language is free; these rows no longer gate anything, so
  // drop them in favor of the 3 global "advanced content" toggles below.
  await pool.query(`DELETE FROM features WHERE category = 'language'`);
  for (const f of DEFAULT_FEATURES) {
    await pool.query(
      `INSERT INTO features (key, label, category, is_premium, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (key) DO NOTHING`,
      [f.key, f.label, f.category, f.is_premium, f.sort_order]
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      stripe_session_id TEXT UNIQUE,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Make sure the designated admin account is always an admin, if it already signed up.
  await pool.query(`UPDATE users SET is_admin = TRUE WHERE email = $1`, [ADMIN_EMAIL]);

  console.log("Database ready (users, features, payments tables ok).");
}

const app = express();
app.set("trust proxy", 1);

// Stripe webhooks need the raw request body to verify the signature, so this route
// is wired up with express.raw() BEFORE the global express.json() middleware below.
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  let event;
  try {
    event = stripeLib.verifyWebhookSignature(req.body.toString("utf8"), req.headers["stripe-signature"]);
  } catch (err) {
    console.error("stripe webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = parseInt(session.client_reference_id, 10);
      if (userId) {
        const result = await pool.query("SELECT id, email FROM users WHERE id = $1", [userId]);
        const user = result.rows[0];
        if (user) {
          await pool.query("UPDATE users SET subscribed = TRUE WHERE id = $1", [userId]);
          const amount = session.amount_total || 0;
          const currency = session.currency || "eur";
          const invoiceNumber = `INV-${new Date().getFullYear()}-${String(userId).padStart(4, "0")}-${Date.now()
            .toString()
            .slice(-5)}`;
          await pool.query(
            `INSERT INTO payments (user_id, stripe_session_id, amount_cents, currency, invoice_number)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (stripe_session_id) DO NOTHING`,
            [userId, session.id, amount, currency, invoiceNumber]
          );
          sendEmail({
            to: user.email,
            subject: `Facture ${invoiceNumber} - ${BUSINESS_NAME}`,
            html: invoiceEmailHtml({
              invoiceNumber,
              date: new Date().toLocaleDateString("fr-FR"),
              amount,
              currency,
              email: user.email,
              businessName: BUSINESS_NAME,
            }),
          }).catch(() => {});
        }
      }
    }
    return res.json({ received: true });
  } catch (err) {
    console.error("stripe webhook handling error:", err);
    return res.status(500).json({ error: "webhook handling failed" });
  }
});

app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());

// ---- very small in-memory rate limiter for auth endpoints (per IP) ----
const attempts = new Map();
function rateLimited(ip, max, windowMs) {
  const now = Date.now();
  const entry = attempts.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count += 1;
  attempts.set(ip, entry);
  return entry.count > max;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of attempts) {
    if (now > entry.resetAt) attempts.delete(ip);
  }
}, 60000).unref();

function signSession(user) {
  return jwt.sign({ uid: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
}

function authMiddleware(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.uid;
    req.userEmail = payload.email;
  } catch (e) {
    // invalid/expired token: treat as logged out
  }
  next();
}
app.use(authMiddleware);

async function requireAdmin(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  try {
    const result = await pool.query("SELECT is_admin FROM users WHERE id = $1", [req.userId]);
    if (!result.rows[0] || !result.rows[0].is_admin) {
      return res.status(403).json({ error: "Accès réservé à l'administrateur." });
    }
    next();
  } catch (err) {
    console.error("requireAdmin error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post("/api/signup", async (req, res) => {
  try {
    const ip = req.ip || "unknown";
    if (rateLimited("signup:" + ip, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ error: "Trop de tentatives. Réessaie dans quelques minutes." });
    }
    const email = String((req.body && req.body.email) || "").trim().toLowerCase();
    const password = String((req.body && req.body.password) || "");
    const name = String((req.body && req.body.name) || "").trim().slice(0, 80);

    if (!EMAIL_RE.test(email) || email.length > 254) {
      return res.status(400).json({ error: "Adresse email invalide." });
    }
    if (password.length < 6 || password.length > 200) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
    }

    const hash = await bcrypt.hash(password, 12);
    const isAdmin = email === ADMIN_EMAIL;
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, email",
      [email, hash, name || null, isAdmin]
    );
    const user = result.rows[0];

    const token = signSession(user);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    sendEmail({
      to: user.email,
      subject: `Bienvenue sur ${BUSINESS_NAME}`,
      html: welcomeEmailHtml(name),
    }).catch(() => {});

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("signup error:", err);
    return res.status(500).json({ error: "Erreur serveur. Réessaie plus tard." });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const ip = req.ip || "unknown";
    if (rateLimited("login:" + ip, 20, 15 * 60 * 1000)) {
      return res.status(429).json({ error: "Trop de tentatives. Réessaie dans quelques minutes." });
    }
    const email = String((req.body && req.body.email) || "").trim().toLowerCase();
    const password = String((req.body && req.body.password) || "");

    if (!EMAIL_RE.test(email) || password.length < 1) {
      return res.status(400).json({ error: "Email ou mot de passe incorrect." });
    }

    const result = await pool.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];
    const hashToCompare = user ? user.password_hash : "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidin";
    const match = await bcrypt.compare(password, hashToCompare);

    if (!user || !match) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    if (email === ADMIN_EMAIL) {
      await pool.query("UPDATE users SET is_admin = TRUE WHERE id = $1", [user.id]);
    }

    const token = signSession(user);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Erreur serveur. Réessaie plus tard." });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

app.get("/api/me", async (req, res) => {
  if (!req.userId) return res.status(401).json({ authenticated: false });
  try {
    const result = await pool.query(
      "SELECT id, email, name, subscribed, is_admin, lang_order FROM users WHERE id = $1",
      [req.userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ authenticated: false });
    let langOrder = null;
    if (user.lang_order) {
      try {
        const parsed = JSON.parse(user.lang_order);
        if (Array.isArray(parsed)) langOrder = parsed;
      } catch (e) {
        // ignore malformed stored order
      }
    }
    return res.json({
      authenticated: true,
      email: user.email,
      name: user.name,
      subscribed: user.subscribed,
      isAdmin: user.is_admin,
      langOrder,
    });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// ---- per-account custom ordering of the language cards on the hub ----
app.put("/api/lang-order", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  const order = req.body && req.body.order;
  if (!Array.isArray(order) || order.length === 0 || order.length > 200) {
    return res.status(400).json({ error: "Ordre invalide." });
  }
  const cleaned = order
    .filter((c) => typeof c === "string" && /^[a-z]{2,4}$/.test(c))
    .slice(0, 200);
  try {
    await pool.query("UPDATE users SET lang_order = $1 WHERE id = $2", [JSON.stringify(cleaned), req.userId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("lang-order error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// ---- features (free/premium toggles) ----
app.get("/api/features", async (req, res) => {
  try {
    const result = await pool.query("SELECT key, label, category, is_premium FROM features ORDER BY sort_order");
    let unlocked = false;
    if (req.userId) {
      const u = await pool.query("SELECT subscribed, is_admin FROM users WHERE id = $1", [req.userId]);
      if (u.rows[0]) unlocked = u.rows[0].subscribed || u.rows[0].is_admin;
    }
    const features = result.rows.map((f) => ({
      key: f.key,
      label: f.label,
      category: f.category,
      premium: f.is_premium,
      locked: f.is_premium && !unlocked,
    }));
    return res.json({ features, unlocked });
  } catch (err) {
    console.error("features error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/api/admin/features", requireAdmin, async (req, res) => {
  const result = await pool.query("SELECT key, label, category, is_premium, sort_order FROM features ORDER BY sort_order");
  return res.json({ features: result.rows });
});

app.patch("/api/admin/features/:key", requireAdmin, async (req, res) => {
  const key = req.params.key;
  const isPremium = Boolean(req.body && req.body.is_premium);
  const result = await pool.query(
    "UPDATE features SET is_premium = $1 WHERE key = $2 RETURNING key, label, is_premium",
    [isPremium, key]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Fonctionnalité introuvable." });
  return res.json({ feature: result.rows[0] });
});

app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  const users = await pool.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE subscribed)::int AS subscribed FROM users");
  const revenue = await pool.query("SELECT COALESCE(SUM(amount_cents),0)::bigint AS total_cents, COUNT(*)::int AS count FROM payments");
  return res.json({
    totalUsers: users.rows[0].total,
    subscribedUsers: users.rows[0].subscribed,
    totalRevenueCents: Number(revenue.rows[0].total_cents),
    totalPayments: revenue.rows[0].count,
  });
});

// ---- payment (Stripe Checkout) ----
app.post("/api/checkout", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  if (!stripeLib.isConfigured()) {
    return res.status(501).json({ error: "Le paiement n'est pas encore configuré côté serveur." });
  }
  try {
    const origin = `${req.protocol}://${req.get("host")}`;
    const session = await stripeLib.createCheckoutSession({
      userId: req.userId,
      email: req.userEmail,
      successUrl: `${origin}/subscribe?success=1`,
      cancelUrl: `${origin}/subscribe?canceled=1`,
    });
    return res.json({ url: session.url });
  } catch (err) {
    console.error("checkout error:", err.message);
    return res.status(500).json({ error: "Impossible de démarrer le paiement pour le moment." });
  }
});

// ---- gate: serve the app only to authenticated users, else the login page ----
app.get("/", (req, res) => {
  if (req.userId) {
    res.sendFile(path.join(__dirname, "app.html"));
  } else {
    res.sendFile(path.join(__dirname, "login.html"));
  }
});

app.get("/subscribe", (req, res) => {
  if (!req.userId) return res.redirect("/");
  res.sendFile(path.join(__dirname, "subscribe.html"));
});

app.get("/admin", async (req, res) => {
  if (!req.userId) return res.redirect("/");
  const result = await pool.query("SELECT is_admin FROM users WHERE id = $1", [req.userId]);
  if (!result.rows[0] || !result.rows[0].is_admin) return res.redirect("/");
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/healthz", (req, res) => res.status(200).send("ok"));

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`langues-app listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
