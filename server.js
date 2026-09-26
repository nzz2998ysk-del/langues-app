const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;
const COOKIE_NAME = "langues_session";
const isProd = process.env.NODE_ENV === "production";

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

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      subscribed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Database ready (users table ok).");
}

const app = express();
app.set("trust proxy", 1);
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
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email",
      [email, hash, name || null]
    );
    const user = result.rows[0];

    const token = signSession(user);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
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
    // Constant-shape response whether the user exists or not, to avoid
    // leaking which emails are registered via timing/response differences.
    const hashToCompare = user ? user.password_hash : "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidin";
    const match = await bcrypt.compare(password, hashToCompare);

    if (!user || !match) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
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
      "SELECT id, email, name, subscribed FROM users WHERE id = $1",
      [req.userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ authenticated: false });
    return res.json({
      authenticated: true,
      email: user.email,
      name: user.name,
      subscribed: user.subscribed,
    });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// Placeholder for future paid-subscription flow (e.g. Stripe Checkout).
// Not implemented yet: intentionally returns 501 so the frontend can detect
// "not available yet" instead of silently failing.
app.post("/api/subscribe", (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  return res.status(501).json({ error: "L'abonnement payant n'est pas encore disponible." });
});

// ---- gate: serve the app only to authenticated users, else the login page ----
app.get("/", (req, res) => {
  if (req.userId) {
    res.sendFile(path.join(__dirname, "app.html"));
  } else {
    res.sendFile(path.join(__dirname, "login.html"));
  }
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
