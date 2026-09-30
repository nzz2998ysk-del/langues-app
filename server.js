const express = require("express");
const path = require("path");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const {
  sendEmail,
  welcomeEmailHtml,
  invoiceEmailHtml,
  suggestionsDigestHtml,
  resetPasswordEmailHtml,
  logEmailConfig,
} = require("./lib/email");
const { LEVELS, PREMIUM_FEATURES, loadCourse, courseForUser, syncVocabulary } = require("./lib/course");
const stripeLib = require("./lib/stripe");

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;
const COOKIE_NAME = "langues_session";
const isProd = process.env.NODE_ENV === "production";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "raphael.sanguinetti@icloud.com").toLowerCase();
const BUSINESS_NAME = process.env.BUSINESS_NAME || "Mes langues";
// Where the daily "boîte à idées" digest is sent. Defaults to the admin account.
const DIGEST_EMAIL = (process.env.DIGEST_EMAIL || ADMIN_EMAIL).toLowerCase();
// Local hour (Europe/Paris) after which the in-process scheduler sends the digest.
const DIGEST_HOUR_LOCAL = parseInt(process.env.DIGEST_HOUR_LOCAL || "22", 10);
// Optional shared secret so an external scheduler (e.g. a Render Cron Job) can trigger
// the digest reliably via POST /api/internal/send-digest, since Render's free tier can
// spin a web service down after inactivity, making an in-process setInterval alone
// unreliable as the only delivery mechanism.
const DIGEST_CRON_SECRET = process.env.DIGEST_CRON_SECRET || "";
// Base URL used to build the link inside the "reset your password" email.
const APP_URL = (process.env.APP_URL || "https://langues-app.onrender.com").replace(/\/$/, "");
// How long a password-reset link stays valid.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

// All 39 languages the app teaches, with display metadata — mirrors app.html's
// LANG_META exactly, and is the source of truth for the per-language admin toggles.
const LANG_META = {
  en: { flag: "🇬🇧", name: "English" },
  es: { flag: "🇪🇸", name: "Español" },
  it: { flag: "🇮🇹", name: "Italiano" },
  he: { flag: "🇮🇱", name: "Hébreu" },
  zh: { flag: "🇨🇳", name: "中文" },
  pt: { flag: "🇵🇹", name: "Português" },
  ru: { flag: "🇷🇺", name: "Русский" },
  de: { flag: "🇩🇪", name: "Deutsch" },
  ja: { flag: "🇯🇵", name: "日本語" },
  fr: { flag: "🇫🇷", name: "Français" },
  hi: { flag: "🇮🇳", name: "हिन्दी" },
  ko: { flag: "🇰🇷", name: "한국어" },
  ar: { flag: "🇸🇦", name: "العربية" },
  tr: { flag: "🇹🇷", name: "Türkçe" },
  nl: { flag: "🇳🇱", name: "Nederlands" },
  el: { flag: "🇬🇷", name: "Ελληνικά" },
  pl: { flag: "🇵🇱", name: "Polski" },
  sv: { flag: "🇸🇪", name: "Svenska" },
  vi: { flag: "🇻🇳", name: "Tiếng Việt" },
  la: { flag: "📜", name: "Latina" },
  nb: { flag: "🇳🇴", name: "Norsk bokmål" },
  ga: { flag: "🇮🇪", name: "Gaeilge" },
  id: { flag: "🇮🇩", name: "Bahasa Indonesia" },
  val: { flag: "🐉", name: "High Valyrian" },
  uk: { flag: "🇺🇦", name: "Українська" },
  fi: { flag: "🇫🇮", name: "Suomi" },
  da: { flag: "🇩🇰", name: "Dansk" },
  ro: { flag: "🇷🇴", name: "Română" },
  cs: { flag: "🇨🇿", name: "Čeština" },
  zu: { flag: "🇿🇦", name: "isiZulu" },
  haw: { flag: "🌺", name: "ʻŌlelo Hawaiʻi" },
  sw: { flag: "🌍", name: "Kiswahili" },
  cy: { flag: "🏴", name: "Cymraeg" },
  hu: { flag: "🇭🇺", name: "Magyar" },
  gd: { flag: "🏴", name: "Gàidhlig" },
  ht: { flag: "🇭🇹", name: "Kreyòl ayisyen" },
  eo: { flag: "🌐", name: "Esperanto" },
  tlh: { flag: "🖖", name: "tlhIngan Hol" },
  nv: { flag: "🪶", name: "Diné bizaad" },
};

// The 3 kinds of "advanced content" the Premium subscription unlocks, per language.
const MODULES = [
  { key: "feedback-avance", label: "Feedback avancé" },
  { key: "lecons-avancees", label: "Leçons avancées" },
  { key: "exercices-avances", label: "Exercices avancés" },
];

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
// language" but "which kind of deeper content, in which language" (feedback,
// lessons, exercises) — one switch per language per module, so the admin can
// e.g. keep English's advanced feedback free while charging for Korean's.
function buildDefaultFeatures() {
  const rows = [];
  let sort = 1;
  for (const code of Object.keys(LANG_META)) {
    for (const mod of MODULES) {
      rows.push({
        key: `${code}:${mod.key}`,
        label: `${LANG_META[code].name} — ${mod.label}`,
        category: "module",
        lang_code: code,
        module: mod.key,
        is_premium: true,
        sort_order: sort++,
      });
    }
  }
  return rows;
}
const DEFAULT_FEATURES = buildDefaultFeatures();

// One row per language, independent from the premium features grid: whether the
// admin has marked the language as actively available ("active") or still being
// prepared ("development" - hidden/greyed out for regular users on the hub, no
// email sent when the admin flips this).
const DEFAULT_LANGUAGES = Object.keys(LANG_META).map((code) => ({ code, status: "active" }));

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
  // Base/native language: the language the account already speaks, used to
  // personalize the profile. Defaults to French (the language almost all of the
  // app's existing lesson content is written in) but is freely choosable among
  // all 39 languages, per account.
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS base_lang TEXT NOT NULL DEFAULT 'fr';`);
  // Password-reset flow: a hash of the current one-time token (never the raw
  // token itself) plus its expiry. Both NULL when no reset is in progress.
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS languages (
      code TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'active'
    );
  `);
  for (const l of DEFAULT_LANGUAGES) {
    await pool.query(
      `INSERT INTO languages (code, status) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING`,
      [l.code, l.status]
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS features (
      key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'language',
      is_premium BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INT NOT NULL DEFAULT 0
    );
  `);
  await pool.query(`ALTER TABLE features ADD COLUMN IF NOT EXISTS lang_code TEXT;`);
  await pool.query(`ALTER TABLE features ADD COLUMN IF NOT EXISTS module TEXT;`);
  // Old models: per-language premium flags (category 'language'), then 3 global
  // "advanced content" toggles applied uniformly (category 'premium'). Both are
  // superseded by one row per language per module (category 'module') below, so
  // the admin can set premium/free per language and per module independently.
  await pool.query(`DELETE FROM features WHERE category IN ('language', 'premium')`);
  for (const f of DEFAULT_FEATURES) {
    await pool.query(
      `INSERT INTO features (key, label, category, lang_code, module, is_premium, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (key) DO NOTHING`,
      [f.key, f.label, f.category, f.lang_code, f.module, f.is_premium, f.sort_order]
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS suggestions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ
    );
  `);

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

  // ---- Boîte à idées: moderation fields for the admin dashboard ----
  await pool.query(`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'autre';`);
  await pool.query(`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'nouvelle';`);
  await pool.query(`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS admin_notes TEXT NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;`);

  // ---- Global premium features (one switch each in /admin) ----
  let psort = 10000;
  for (const f of PREMIUM_FEATURES) {
    await pool.query(
      `INSERT INTO features (key, label, category, is_premium, sort_order)
       VALUES ($1, $2, 'global', TRUE, $3)
       ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, category = 'global'`,
      [f.key, f.label, psort++]
    );
  }

  // ---- Course content: every word with its CEFR level (A1..C2) ----
  // Synced from course/data/*.json at startup (lib/course.js). level_override is
  // set from /admin and wins over the content's level everywhere in the app.
  await pool.query(`CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_words (
      lang TEXT NOT NULL,
      word_id TEXT NOT NULL,
      word TEXT NOT NULL,
      romanization TEXT NOT NULL DEFAULT '',
      gloss_fr TEXT NOT NULL DEFAULT '',
      theme TEXT NOT NULL DEFAULT '',
      level TEXT NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
      level_override TEXT CHECK (level_override IN ('A1','A2','B1','B2','C1','C2')),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (lang, word_id)
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS course_words_level_idx ON course_words (lang, (COALESCE(level_override, level)));`);

  // ---- Per-account learning progress (SRS state, stats, badges...) per language ----
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_progress (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lang TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, lang)
    );
  `);
  const synced = await syncVocabulary(pool);
  if (synced) console.log(`Course vocabulary synced (${synced} words).`);

  console.log("Database ready (users, features, languages, payments, suggestions, course_words, user_progress tables ok).");
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

// ---- baseline security headers (A05: Security Misconfiguration) ----
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // microphone=(self): the pronunciation pages (embedded same-origin iframes with
  // allow="microphone") use speech recognition; everything else stays off.
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(self), camera=()");
  // Defense-in-depth against XSS: no external origins are ever loaded (everything
  // is same-origin or inline), so a same-origin-only CSP costs nothing today but
  // stops an accidentally-introduced injection from loading attacker script/data
  // from elsewhere. 'unsafe-inline' is kept because the pages use inline <script>
  // blocks without a nonce; tightening that further would need a template rework.
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; font-src 'self' data:; connect-src 'self'; " +
    "object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
  );
  if (isProd) {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  next();
});

// ---- design system (iOS 27 Liquid Glass tokens + app layer) ----
// Public, cacheable CSS shared by every page, including the language pages
// embedded as srcdoc iframes in app.html (they resolve "/design-system/..."
// against the parent page's URL). Mounted before any auth check so the
// login/reset-password pages can use it too.
app.use("/design-system", express.static(path.join(__dirname, "design-system"), {
  maxAge: isProd ? "1h" : 0,
  index: false,
}));

// ---- course engine assets (JS/CSS/i18n). The content itself (course/data)
// is only reachable through /api/course/:lang, which enforces premium access.
app.use("/course", (req, res, next) => (req.path.startsWith("/data/") ? res.status(404).end() : next()));
app.use("/course", express.static(path.join(__dirname, "course"), { maxAge: isProd ? "1h" : 0, index: false }));
// Offline mode (premium): the service worker must be served from the root to
// control the whole app.
app.get("/sw.js", (req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(__dirname, "course", "sw.js"));
});

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
  return jwt.sign({ uid: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d", algorithm: "HS256" });
}

function authMiddleware(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
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

// Excludes characters that could break out of HTML attribute/text context if an
// address were ever interpolated unescaped somewhere (defense in depth: email
// templates now escape their inputs too, see lib/email.js's escapeHtml).
const EMAIL_RE = /^[^\s@<>"'&]+@[^\s@<>"'&]+\.[^\s@<>"'&]+$/;

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

    // Per-account limit in addition to per-IP: an attacker spreading login
    // attempts across many source IPs against one known email is otherwise
    // not slowed down at all.
    if (rateLimited("login-acct:" + email, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ error: "Trop de tentatives. Réessaie dans quelques minutes." });
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

// ---- forgot / reset password ----
function hashResetToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

app.post("/api/forgot-password", async (req, res) => {
  try {
    const ip = req.ip || "unknown";
    if (rateLimited("forgot-password:" + ip, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ error: "Trop de tentatives. Réessaie dans quelques minutes." });
    }
    const email = String((req.body && req.body.email) || "").trim().toLowerCase();
    // Always answer the same way whether or not the address has an account,
    // so this endpoint can't be used to check who has signed up.
    const genericOk = { ok: true, message: "Si un compte existe avec cet email, un lien a été envoyé." };
    // Per-account limit (same generic response either way, so this doesn't
    // reopen the enumeration question it just closed above).
    if (email && rateLimited("forgot-acct:" + email, 5, 15 * 60 * 1000)) {
      return res.json(genericOk);
    }
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return res.json(genericOk);
    }
    const result = await pool.query("SELECT id, email FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashResetToken(rawToken);
      const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await pool.query(
        "UPDATE users SET reset_token_hash = $1, reset_token_expires = $2 WHERE id = $3",
        [tokenHash, expires, user.id]
      );
      const resetLink = `${APP_URL}/reset-password?token=${rawToken}`;
      sendEmail({
        to: user.email,
        subject: `Réinitialise ton mot de passe - ${BUSINESS_NAME}`,
        html: resetPasswordEmailHtml(resetLink),
      }).catch(() => {});
    }
    return res.json(genericOk);
  } catch (err) {
    console.error("forgot-password error:", err);
    // Still avoid leaking anything about whether the address exists.
    return res.json({ ok: true, message: "Si un compte existe avec cet email, un lien a été envoyé." });
  }
});

app.post("/api/reset-password", async (req, res) => {
  try {
    const ip = req.ip || "unknown";
    if (rateLimited("reset-password:" + ip, 20, 15 * 60 * 1000)) {
      return res.status(429).json({ error: "Trop de tentatives. Réessaie dans quelques minutes." });
    }
    const token = String((req.body && req.body.token) || "");
    const password = String((req.body && req.body.password) || "");
    if (!token) return res.status(400).json({ error: "Lien invalide." });
    if (password.length < 6 || password.length > 200) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
    }
    const tokenHash = hashResetToken(token);
    const result = await pool.query(
      "SELECT id FROM users WHERE reset_token_hash = $1 AND reset_token_expires > NOW()",
      [tokenHash]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ error: "Ce lien a expiré ou n'est plus valide. Refais une demande." });
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      "UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = $2",
      [hash, user.id]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error("reset-password error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/api/me", async (req, res) => {
  if (!req.userId) return res.status(401).json({ authenticated: false });
  try {
    const result = await pool.query(
      "SELECT id, email, name, subscribed, is_admin, lang_order, base_lang FROM users WHERE id = $1",
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
      baseLang: user.base_lang || "fr",
    });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// ---- per-account custom ordering of the language cards on the hub ----
app.put("/api/lang-order", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  if (rateLimited("lang-order:" + req.userId, 60, 15 * 60 * 1000)) {
    return res.status(429).json({ error: "Trop de requêtes. Réessaie dans quelques minutes." });
  }
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

// ---- account profile: display name + base/native language ----
app.put("/api/profile", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  if (rateLimited("profile:" + req.userId, 30, 15 * 60 * 1000)) {
    return res.status(429).json({ error: "Trop de requêtes. Réessaie dans quelques minutes." });
  }
  const body = req.body || {};
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : undefined;
  const baseLang = typeof body.baseLang === "string" ? body.baseLang.trim().toLowerCase() : undefined;
  if (baseLang !== undefined && !LANG_META[baseLang]) {
    return res.status(400).json({ error: "Langue de base inconnue." });
  }
  try {
    if (name !== undefined && baseLang !== undefined) {
      await pool.query("UPDATE users SET name = $1, base_lang = $2 WHERE id = $3", [name || null, baseLang, req.userId]);
    } else if (name !== undefined) {
      await pool.query("UPDATE users SET name = $1 WHERE id = $2", [name || null, req.userId]);
    } else if (baseLang !== undefined) {
      await pool.query("UPDATE users SET base_lang = $1 WHERE id = $2", [baseLang, req.userId]);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("profile error:", err);
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
    const langsResult = await pool.query("SELECT code, status FROM languages");
    const languageStatus = {};
    langsResult.rows.forEach((l) => { languageStatus[l.code] = l.status; });
    return res.json({ features, unlocked, languageStatus });
  } catch (err) {
    console.error("features error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// Full per-language × per-module grid, plus the language metadata (flag/name)
// admin.html needs to render it without hard-coding 39 languages itself.
// ---- Course engine API --------------------------------------------------------
// Access for one account: `features[key] === true` means LOCKED for this account.
async function accessFor(userId) {
  const u = await pool.query("SELECT id, name, subscribed, is_admin, base_lang FROM users WHERE id = $1", [userId]);
  const user = u.rows[0];
  if (!user) return null;
  const unlocked = Boolean(user.subscribed || user.is_admin);
  const f = await pool.query("SELECT key, is_premium FROM features WHERE category IN ('global', 'module')");
  const features = {};
  f.rows.forEach((r) => { features[r.key] = r.is_premium && !unlocked; });
  return { user, unlocked, features };
}

app.get("/api/course/:lang", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  const code = String(req.params.lang);
  if (!LANG_META[code]) return res.status(404).json({ error: "Langue inconnue." });
  try {
    const access = await accessFor(req.userId);
    if (!access) return res.status(401).json({ error: "Session invalide." });
    const status = await pool.query("SELECT status FROM languages WHERE code = $1", [code]);
    if (status.rows[0] && status.rows[0].status === "development" && !access.user.is_admin) {
      return res.status(403).json({ error: "Cette langue est en cours de préparation." });
    }
    const course = loadCourse(code);
    if (!course) return res.status(404).json({ error: "Contenu indisponible." });
    const ov = await pool.query(
      "SELECT word_id, level_override FROM course_words WHERE lang = $1 AND level_override IS NOT NULL", [code]
    );
    const overrides = new Map(ov.rows.map((r) => [r.word_id, r.level_override]));
    const data = courseForUser(course, { overrides, levelsLocked: Boolean(access.features["premium:levels-c"]) });
    res.setHeader("Cache-Control", "private, no-cache");
    return res.json({
      course: data,
      access: { premium: access.unlocked, isAdmin: access.user.is_admin, features: access.features },
      me: { name: access.user.name || "", baseLang: access.user.base_lang || "fr", id: access.user.id },
    });
  } catch (err) {
    console.error("course error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// Learning progress (SRS boxes, answers history, lessons done, badges...) is an
// opaque JSON document per account and language, owned by course/engine.js.
app.get("/api/progress/:lang", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  if (!LANG_META[req.params.lang]) return res.status(404).json({ error: "Langue inconnue." });
  try {
    const r = await pool.query("SELECT data, updated_at FROM user_progress WHERE user_id = $1 AND lang = $2", [req.userId, req.params.lang]);
    return res.json(r.rows[0] ? { data: r.rows[0].data, updatedAt: r.rows[0].updated_at } : { data: null });
  } catch (err) {
    console.error("progress get error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});
app.put("/api/progress/:lang", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  if (!LANG_META[req.params.lang]) return res.status(404).json({ error: "Langue inconnue." });
  if (rateLimited("progress:" + req.userId, 240, 15 * 60 * 1000)) return res.status(429).json({ error: "Trop de sauvegardes." });
  const data = req.body && req.body.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return res.status(400).json({ error: "Données invalides." });
  try {
    await pool.query(
      `INSERT INTO user_progress (user_id, lang, data, updated_at) VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, lang) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [req.userId, req.params.lang, JSON.stringify(data)]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error("progress put error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// Words of a language filtered/sorted by CEFR level, straight from the
// course_words table (admin overrides applied). C1/C2 need Premium.
app.get("/api/vocabulary", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  const lang = String(req.query.lang || "");
  if (!LANG_META[lang]) return res.status(400).json({ error: "Langue inconnue." });
  const levels = String(req.query.level || "").split(",").filter((l) => LEVELS.includes(l));
  const q = String(req.query.q || "").trim().slice(0, 60);
  const sort = { level: "eff_level, word", alpha: "word", theme: "theme, eff_level, word" }[req.query.sort] || "eff_level, word";
  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  try {
    const access = await accessFor(req.userId);
    const allowed = access.features["premium:levels-c"] ? ["A1", "A2", "B1", "B2"] : LEVELS;
    const want = (levels.length ? levels : LEVELS).filter((l) => allowed.includes(l));
    const r = await pool.query(
      `SELECT * FROM (SELECT word_id, word, romanization, gloss_fr, theme, COALESCE(level_override, level) AS eff_level
         FROM course_words WHERE lang = $1) w
       WHERE eff_level = ANY($2::text[]) AND ($3 = '' OR word ILIKE '%' || $3 || '%' OR gloss_fr ILIKE '%' || $3 || '%')
       ORDER BY ${sort} LIMIT $4 OFFSET $5`,
      [lang, want, q, limit, offset]
    );
    const counts = await pool.query(
      "SELECT COALESCE(level_override, level) AS level, COUNT(*)::int AS n FROM course_words WHERE lang = $1 GROUP BY 1", [lang]
    );
    return res.json({
      words: r.rows.map((w) => ({ id: w.word_id, t: w.word, r: w.romanization, fr: w.gloss_fr, theme: w.theme, level: w.eff_level })),
      counts: Object.fromEntries(counts.rows.map((c) => [c.level, c.n])),
    });
  } catch (err) {
    console.error("vocabulary error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// ---- Admin: CEFR level of any word ----
app.get("/api/admin/vocabulary", requireAdmin, async (req, res) => {
  const lang = String(req.query.lang || "");
  if (!LANG_META[lang]) return res.status(400).json({ error: "Langue inconnue." });
  const q = String(req.query.q || "").trim().slice(0, 60);
  const level = LEVELS.includes(req.query.level) ? req.query.level : "";
  const r = await pool.query(
    `SELECT word_id, word, romanization, gloss_fr, theme, level, level_override FROM course_words
     WHERE lang = $1 AND ($2 = '' OR word ILIKE '%' || $2 || '%' OR gloss_fr ILIKE '%' || $2 || '%')
       AND ($3 = '' OR COALESCE(level_override, level) = $3)
     ORDER BY COALESCE(level_override, level), word LIMIT 100`,
    [lang, q, level]
  );
  const counts = await pool.query(
    "SELECT COALESCE(level_override, level) AS level, COUNT(*)::int AS n FROM course_words WHERE lang = $1 GROUP BY 1 ORDER BY 1", [lang]
  );
  return res.json({ words: r.rows, counts: Object.fromEntries(counts.rows.map((c) => [c.level, c.n])) });
});
app.put("/api/admin/vocabulary/:lang/:wordId", requireAdmin, async (req, res) => {
  const level = req.body && req.body.level;
  if (level !== null && !LEVELS.includes(level)) return res.status(400).json({ error: "Niveau invalide." });
  const r = await pool.query(
    "UPDATE course_words SET level_override = $1, updated_at = NOW() WHERE lang = $2 AND word_id = $3 RETURNING word_id, level, level_override",
    [level, req.params.lang, req.params.wordId]
  );
  if (!r.rows[0]) return res.status(404).json({ error: "Mot introuvable." });
  return res.json({ ok: true, word: r.rows[0] });
});

// ---- Admin: boîte à idées ----
const SUGGESTION_STATUSES = ["nouvelle", "vue", "en_cours", "acceptee", "refusee"];
const SUGGESTION_CATEGORIES = ["langue", "contenu", "fonctionnalite", "design", "bug", "autre"];
app.get("/api/admin/suggestions", requireAdmin, async (req, res) => {
  const status = SUGGESTION_STATUSES.includes(req.query.status) ? req.query.status : "";
  const category = SUGGESTION_CATEGORIES.includes(req.query.category) ? req.query.category : "";
  const q = String(req.query.q || "").trim().slice(0, 100);
  try {
    const r = await pool.query(
      `SELECT s.id, s.message, s.category, s.status, s.admin_notes, s.created_at, s.updated_at, s.sent_at,
              u.email AS author_email, u.name AS author_name
         FROM suggestions s LEFT JOIN users u ON u.id = s.user_id
        WHERE ($1 = '' OR s.status = $1) AND ($2 = '' OR s.category = $2)
          AND ($3 = '' OR s.message ILIKE '%' || $3 || '%' OR u.email ILIKE '%' || $3 || '%')
        ORDER BY s.created_at DESC LIMIT 500`,
      [status, category, q]
    );
    const counts = await pool.query("SELECT status, COUNT(*)::int AS n FROM suggestions GROUP BY status");
    return res.json({
      suggestions: r.rows,
      counts: Object.fromEntries(counts.rows.map((c) => [c.status, c.n])),
      statuses: SUGGESTION_STATUSES,
      categories: SUGGESTION_CATEGORIES,
    });
  } catch (err) {
    console.error("admin suggestions error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});
app.put("/api/admin/suggestions/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const body = req.body || {};
  if (body.status !== undefined && !SUGGESTION_STATUSES.includes(body.status)) return res.status(400).json({ error: "Statut invalide." });
  if (body.admin_notes !== undefined && typeof body.admin_notes !== "string") return res.status(400).json({ error: "Notes invalides." });
  try {
    const r = await pool.query(
      `UPDATE suggestions SET status = COALESCE($1, status), admin_notes = COALESCE($2, admin_notes), updated_at = NOW()
       WHERE id = $3 RETURNING id, status, admin_notes, updated_at`,
      [body.status === undefined ? null : body.status, body.admin_notes === undefined ? null : body.admin_notes.slice(0, 5000), id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Idée introuvable." });
    return res.json({ ok: true, suggestion: r.rows[0] });
  } catch (err) {
    console.error("admin suggestion update error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/api/admin/features", requireAdmin, async (req, res) => {
  const result = await pool.query(
    "SELECT key, label, category, lang_code, module, is_premium, sort_order FROM features ORDER BY sort_order"
  );
  const langsResult = await pool.query("SELECT code, status FROM languages");
  const languageStatus = {};
  langsResult.rows.forEach((l) => { languageStatus[l.code] = l.status; });
  return res.json({
    features: result.rows,
    modules: MODULES,
    langMeta: LANG_META,
    langOrder: Object.keys(LANG_META),
    languageStatus,
  });
});

// Admin can flip a language between "active" and "development" whenever they
// want (e.g. while still authoring its content) - purely a visibility switch on
// the hub, independent from the premium/free features grid, and it never sends
// any email.
const LANGUAGE_STATUSES = ["active", "development"];
app.put("/api/admin/languages/:code", requireAdmin, async (req, res) => {
  const code = req.params.code;
  if (!LANG_META[code]) return res.status(400).json({ error: "Langue inconnue." });
  const status = req.body && req.body.status;
  if (!LANGUAGE_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Statut invalide (active ou development)." });
  }
  try {
    await pool.query(
      `INSERT INTO languages (code, status) VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET status = EXCLUDED.status`,
      [code, status]
    );
    return res.json({ ok: true, code, status });
  } catch (err) {
    console.error("languages update error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
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

// Bulk toggles, so the admin isn't stuck clicking 117 checkboxes one at a time:
// by explicit key list, by whole language (all 3 modules), by module across
// every language, or absolutely everything at once.
app.post("/api/admin/features/bulk", requireAdmin, async (req, res) => {
  const body = req.body || {};
  const isPremium = Boolean(body.is_premium);
  let keys = null;

  if (Array.isArray(body.keys)) {
    keys = body.keys.filter((k) => typeof k === "string").slice(0, 500);
  } else if (typeof body.lang_code === "string") {
    if (!LANG_META[body.lang_code]) return res.status(400).json({ error: "Langue inconnue." });
    keys = MODULES.map((m) => `${body.lang_code}:${m.key}`);
  } else if (typeof body.module === "string") {
    if (!MODULES.some((m) => m.key === body.module)) return res.status(400).json({ error: "Module inconnu." });
    keys = Object.keys(LANG_META).map((code) => `${code}:${body.module}`);
  } else if (body.all === true) {
    keys = DEFAULT_FEATURES.map((f) => f.key);
  }

  if (!keys || keys.length === 0) {
    return res.status(400).json({ error: "Précise keys, lang_code, module ou all." });
  }
  try {
    const result = await pool.query(
      "UPDATE features SET is_premium = $1 WHERE key = ANY($2::text[]) RETURNING key, is_premium",
      [isPremium, keys]
    );
    return res.json({ ok: true, updated: result.rows.length });
  } catch (err) {
    console.error("features bulk error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
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

// List registered accounts for the admin panel. Passwords are hashed with
// bcrypt (one-way) specifically so they can never be recovered or displayed —
// not even by an admin — so this intentionally never selects password_hash.
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  const result = await pool.query(
    `SELECT id, email, name, base_lang, subscribed, is_admin, created_at
     FROM users ORDER BY created_at DESC LIMIT 1000`
  );
  return res.json({ users: result.rows });
});

// Manually grant or revoke Premium access for one account, with no payment
// involved — e.g. for a friend, a tester, or a support gesture. This just
// flips the same `subscribed` flag that a real Stripe payment would set, so
// the account immediately unlocks the same premium features either way;
// nothing here talks to Stripe, charges a card, or creates any payment record.
app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: "Identifiant invalide." });
  if (typeof req.body.subscribed !== "boolean") {
    return res.status(400).json({ error: "Paramètre 'subscribed' (booléen) requis." });
  }
  const result = await pool.query(
    "UPDATE users SET subscribed = $1 WHERE id = $2 RETURNING id, email, subscribed",
    [req.body.subscribed, userId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Compte introuvable." });
  return res.json({ user: result.rows[0] });
});

// ---- payment (Stripe Checkout) ----
app.post("/api/checkout", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  if (rateLimited("checkout:" + req.userId, 10, 15 * 60 * 1000)) {
    return res.status(429).json({ error: "Trop de tentatives. Réessaie dans quelques minutes." });
  }
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

// ---- boîte à idées: users submit suggestions, admin gets a daily email digest ----
app.post("/api/suggestions", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  if (rateLimited("suggestion:" + req.userId, 20, 60 * 60 * 1000)) {
    return res.status(429).json({ error: "Trop d'idées envoyées. Réessaie plus tard." });
  }
  const message = String((req.body && req.body.message) || "").trim().slice(0, 2000);
  if (message.length < 3) {
    return res.status(400).json({ error: "Décris un peu plus ton idée." });
  }
  try {
    const category = SUGGESTION_CATEGORIES.includes(req.body && req.body.category) ? req.body.category : "autre";
    await pool.query("INSERT INTO suggestions (user_id, message, category) VALUES ($1, $2, $3)", [req.userId, message, category]);
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("suggestions error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// Sends one digest email with every suggestion submitted since the last digest,
// and marks them sent so the same idea is never emailed twice. Returns the count
// sent (0 if there was nothing new). Shared by the in-process scheduler below and
// by the external-trigger endpoint (POST /api/internal/send-digest).
async function sendSuggestionsDigest() {
  const pending = await pool.query(
    `SELECT s.id, s.message, s.category, s.created_at, u.email AS user_email
     FROM suggestions s LEFT JOIN users u ON u.id = s.user_id
     WHERE s.sent_at IS NULL ORDER BY s.created_at ASC LIMIT 500`
  );
  if (pending.rows.length === 0) return 0;
  const result = await sendEmail({
    to: DIGEST_EMAIL,
    subject: `💡 Boîte à idées — ${pending.rows.length} nouvelle${pending.rows.length > 1 ? "s" : ""} suggestion${pending.rows.length > 1 ? "s" : ""}`,
    html: suggestionsDigestHtml(pending.rows),
  });
  if (result && result.ok === false) {
    // Sending failed (Resend error/network issue): leave sent_at NULL so these
    // suggestions are retried on the next check instead of being silently lost.
    return 0;
  }
  await pool.query(
    "UPDATE suggestions SET sent_at = NOW() WHERE id = ANY($1::int[])",
    [pending.rows.map((r) => r.id)]
  );
  return pending.rows.length;
}

// External trigger (e.g. a Render Cron Job hitting this once a day), since a
// free-tier web service can spin down between requests and silently skip the
// in-process scheduler below.
app.post("/api/internal/send-digest", async (req, res) => {
  if (!DIGEST_CRON_SECRET || req.headers["x-digest-secret"] !== DIGEST_CRON_SECRET) {
    return res.status(403).json({ error: "Non autorisé." });
  }
  try {
    const sent = await sendSuggestionsDigest();
    return res.json({ ok: true, sent });
  } catch (err) {
    console.error("send-digest error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// In-process fallback: once the local (Europe/Paris) hour reaches DIGEST_HOUR_LOCAL,
// send whatever is pending. Checking every 15 min and relying on sent_at as the
// durable "already sent" marker means this is safe to run alongside the external
// trigger above without double-sending, and safe across restarts.
const PARIS_HOUR_FMT = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" });
setInterval(() => {
  const hour = parseInt(PARIS_HOUR_FMT.format(new Date()), 10);
  if (hour < DIGEST_HOUR_LOCAL) return;
  sendSuggestionsDigest().catch((err) => console.error("scheduled digest error:", err));
}, 15 * 60 * 1000).unref();

// ---- gate: serve the app only to authenticated users, else the login page ----
app.get("/", (req, res) => {
  if (req.userId) {
    res.sendFile(path.join(__dirname, "app.html"));
  } else {
    res.sendFile(path.join(__dirname, "login.html"));
  }
});

app.get("/reset-password", (req, res) => {
  res.sendFile(path.join(__dirname, "reset-password.html"));
});

app.get("/ideas", (req, res) => {
  if (!req.userId) return res.redirect("/");
  res.sendFile(path.join(__dirname, "ideas.html"));
});

app.get("/profile", (req, res) => {
  if (!req.userId) return res.redirect("/");
  res.sendFile(path.join(__dirname, "profile.html"));
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
// No favicon file: answer the browser's automatic request with 204 instead of a
// 404 that shows up as a console error on every page load.
app.get("/favicon.ico", (req, res) => res.status(204).end());

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`langues-app listening on port ${PORT}`);
      logEmailConfig();
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
