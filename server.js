const express = require("express");
const compression = require("compression");
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
  reminderEmailHtml,
  logEmailConfig,
  emailProvider,
} = require("./lib/email");
const { invoicePdf } = require("./lib/invoice");
const { LEVELS, PREMIUM_FEATURES, loadCourse, courseForUser, syncVocabulary } = require("./lib/course");
const stripeLib = require("./lib/stripe");
const totp = require("./lib/totp");

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;
const COOKIE_NAME = "langues_session";
// Short-lived cookie between "password OK" and "2FA code OK" at login.
const MFA_COOKIE = "langues_mfa";
const isProd = process.env.NODE_ENV === "production";
// Account that becomes administrator — only once it has proved it owns the
// address (email verification link or password-reset link), so nobody can
// pre-register this address and grab the admin role. No hard-coded default.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const BUSINESS_NAME = process.env.BUSINESS_NAME || "Papote";
// Where the daily "boîte à idées" digest is sent. Defaults to the admin account.
const DIGEST_EMAIL = (process.env.DIGEST_EMAIL || ADMIN_EMAIL).toLowerCase();
// Minimum length for new passwords (signup, reset). Existing shorter passwords
// still log in; they are simply not accepted any more for new ones.
const MIN_PASSWORD = 8;
// Email-verification links (sent in the welcome email) stay valid this long.
const VERIFY_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const hasOwn = (obj, key) => typeof key === "string" && Object.prototype.hasOwnProperty.call(obj, key);
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
// Days of Premium offered to whoever invited a friend who then subscribes.
const REFERRAL_DAYS = parseInt(process.env.REFERRAL_DAYS || "30", 10);

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
// Encryption key material for the admins' TOTP secrets.
const TOTP_KEY = process.env.TOTP_ENC_KEY || JWT_SECRET;
if (!DATABASE_URL) {
  console.error("FATAL: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

// ---- Database connection with TLS ----
// DATABASE_SSL = auto (default) | verify | no-verify | disable.
// auto: first try a TLS connection that VERIFIES the server certificate (system
// CAs, plus DATABASE_SSL_CA if set); only if the certificate cannot be verified,
// fall back to encrypted-but-unverified TLS and report it in /admin.
// DATABASE_SSL_CA may be the PEM text or its base64.
const DB_TLS = { mode: "", note: "" };
let pool;
function databaseCa() {
  const raw = process.env.DATABASE_SSL_CA || "";
  if (!raw) return undefined;
  return raw.includes("BEGIN CERTIFICATE") ? raw : Buffer.from(raw, "base64").toString("utf8");
}
const CERT_ERRORS = /SELF_SIGNED|UNABLE_TO_VERIFY|UNABLE_TO_GET_ISSUER|CERT_|ERR_TLS_CERT|altnames|self.signed/i;
async function createPool() {
  const pref = String(process.env.DATABASE_SSL || "auto").toLowerCase();
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(DATABASE_URL);
  const make = (ssl) => new Pool({ connectionString: DATABASE_URL, ssl });
  if (local || pref === "disable") {
    DB_TLS.mode = "disabled";
    DB_TLS.note = local ? "base locale" : "DATABASE_SSL=disable";
    return make(false);
  }
  if (pref === "no-verify") {
    DB_TLS.mode = "unverified";
    DB_TLS.note = "DATABASE_SSL=no-verify";
    return make({ rejectUnauthorized: false });
  }
  const strict = make({ rejectUnauthorized: true, ca: databaseCa() });
  try {
    await strict.query("SELECT 1");
    DB_TLS.mode = "verified";
    DB_TLS.note = databaseCa() ? "certificat vérifié avec DATABASE_SSL_CA" : "certificat vérifié (autorités publiques)";
    return strict;
  } catch (err) {
    await strict.end().catch(() => {});
    if (pref === "verify" || !CERT_ERRORS.test(`${err.code || ""} ${err.message || ""}`)) throw err;
    console.warn(`[db] TLS certificate could not be verified (${err.code || err.message}); falling back to unverified TLS. Set DATABASE_SSL_CA to fix.`);
    DB_TLS.mode = "unverified";
    DB_TLS.note = `certificat non vérifiable (${err.code || "erreur"}) : renseigner DATABASE_SSL_CA`;
    return make({ rejectUnauthorized: false });
  }
}

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

  // ---- account security: email ownership, session revocation, Stripe ids ----
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token_hash TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token_expires TIMESTAMPTZ;`);
  // Bumped on password reset / "log out everywhere": every older session token dies.
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;`);
  // Opt-in daily practice reminder by email: local hour + IANA time zone, and the
  // local date of the last reminder sent (never twice the same day).
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_hour SMALLINT NOT NULL DEFAULT 19;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_tz TEXT NOT NULL DEFAULT 'Europe/Paris';`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_last TEXT;`);
  // Two-factor authentication (TOTP), mandatory for administrators.
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret_enc TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_last_step BIGINT NOT NULL DEFAULT -1;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_recovery JSONB NOT NULL DEFAULT '[]'::jsonb;`);
  // Admins that already exist keep their role (it was granted before email
  // verification existed); new grants require a verified address.
  await pool.query("UPDATE users SET email_verified = TRUE WHERE is_admin = TRUE AND email_verified = FALSE");
  if (ADMIN_EMAIL) {
    await pool.query(`UPDATE users SET is_admin = TRUE WHERE email = $1 AND email_verified = TRUE`, [ADMIN_EMAIL]);
  } else {
    console.warn("[admin] ADMIN_EMAIL not set - no account will be granted the administrator role.");
  }

  // GDPR: deleting an account removes its ideas and progress; invoices are kept
  // for accounting but detached from the (deleted) account.
  await pool.query(`ALTER TABLE payments ALTER COLUMN user_id DROP NOT NULL;`);
  // Invoice snapshot (kept after account deletion) and continuous numbering.
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_email TEXT;`);
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_name TEXT;`);
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS invoice_seq;`);
  await pool.query(`ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;`);
  await pool.query(`ALTER TABLE payments ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;`);
  await pool.query(`ALTER TABLE suggestions DROP CONSTRAINT IF EXISTS suggestions_user_id_fkey;`);
  await pool.query(`ALTER TABLE suggestions ADD CONSTRAINT suggestions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;`);

  // Audit trail of every administrator action.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      admin_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL DEFAULT '',
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      ip TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

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
  // ---- Friends, weekly challenge and referral ----
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS friend_code TEXT UNIQUE;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by INTEGER REFERENCES users(id) ON DELETE SET NULL;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_rewarded BOOLEAN NOT NULL DEFAULT FALSE;`);
  // Premium offered for a time (referral reward), on top of a paid subscription.
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS friends (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, friend_id)
    );
  `);
  // ---- Error tracking: client + server errors, deduplicated by fingerprint ----
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_errors (
      fingerprint TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      message TEXT NOT NULL,
      stack TEXT,
      url TEXT,
      browser TEXT,
      count INTEGER NOT NULL DEFAULT 1,
      first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // ---- Privacy-friendly analytics: daily aggregate counters only (no user id,
  // no IP, no cookie). Daily actives are counted with a per-day keyed hash that
  // cannot be linked from one day to the next; rows older than 90 days go.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics_daily (
      day DATE NOT NULL,
      event TEXT NOT NULL,
      lang TEXT NOT NULL DEFAULT '',
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, event, lang)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics_active (
      day DATE NOT NULL,
      visitor TEXT NOT NULL,
      PRIMARY KEY (day, visitor)
    );
  `);
  // ---- AI conversation partner: messages used per account per day (quota) ----
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_usage (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day DATE NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, day)
    );
  `);
  const synced = await syncVocabulary(pool);
  if (synced) console.log(`Course vocabulary synced (${synced} words).`);

  console.log("Database ready (users, features, languages, payments, suggestions, course_words, user_progress tables ok).");
}

const app = express();
app.set("trust proxy", 1);

// Express 4 does not catch errors thrown by async handlers: an unexpected
// database error would become an unhandled rejection and crash the process.
// Every async route handler is wrapped so errors reach the JSON error handler.
for (const method of ["get", "post", "put", "patch", "delete"]) {
  const original = app[method].bind(app);
  app[method] = (route, ...handlers) =>
    original(route, ...handlers.map((h) =>
      typeof h === "function" && h.constructor.name === "AsyncFunction"
        ? (req, res, next) => h(req, res, next).catch(next)
        : h));
}

// One payment = one invoice: numbered in sequence (PAP-YYYY-00001), stored
// with a snapshot of the customer, emailed once with the PDF attached. Stripe
// retries webhooks: an already-recorded payment is skipped (no duplicate
// number, no second email).
async function recordPaymentAndInvoice(userId, stripeRef, amount, currency, description) {
  const u = (await pool.query("SELECT email, name FROM users WHERE id = $1", [userId])).rows[0];
  if (!u) return;
  const seen = await pool.query("SELECT 1 FROM payments WHERE stripe_session_id = $1", [stripeRef]);
  if (seen.rows[0]) return;
  const ins = await pool.query(
    `INSERT INTO payments (user_id, stripe_session_id, amount_cents, currency, invoice_number, customer_email, customer_name)
     VALUES ($1, $2, $3, $4, 'PAP-' || to_char(NOW() AT TIME ZONE 'Europe/Paris', 'YYYY') || '-' || lpad(nextval('invoice_seq')::text, 5, '0'), $5, $6)
     ON CONFLICT (stripe_session_id) DO NOTHING
     RETURNING invoice_number, created_at`,
    [userId, stripeRef, amount, currency, u.email, u.name || null]
  );
  if (!ins.rows[0]) return;
  const { invoice_number: number, created_at: date } = ins.rows[0];
  let attachments;
  try {
    const pdf = await invoicePdf({ number, date, amountCents: amount, currency, customerEmail: u.email, customerName: u.name, description });
    attachments = [{ filename: `Facture-${number}.pdf`, content: pdf, contentType: "application/pdf" }];
  } catch (e) { console.error("[invoice] PDF generation failed:", e.message); }
  sendEmail({
    to: u.email,
    subject: `Ta facture ${number} - ${BUSINESS_NAME} Premium`,
    html: invoiceEmailHtml({
      invoiceNumber: number,
      date: date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }),
      amount, currency, email: u.email, businessName: BUSINESS_NAME,
    }),
    attachments,
  }).catch(() => {});
}

// Stripe webhooks need the raw request body to verify the signature, so this route
// is wired up with express.raw() BEFORE the global express.json() middleware below.
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  let event;
  try {
    event = stripeLib.verifyWebhookSignature(req.body.toString("utf8"), req.headers["stripe-signature"]);
  } catch (err) {
    console.error("stripe webhook signature verification failed:", err.message);
    return res.status(400).json({ error: "invalid signature" });
  }

  try {
    // Subscription ended or no longer paid: Premium is withdrawn.
    if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const active = event.type === "customer.subscription.updated" && ["active", "trialing"].includes(sub.status);
      await pool.query(
        "UPDATE users SET subscribed = $1 WHERE stripe_subscription_id = $2 OR (stripe_subscription_id IS NULL AND stripe_customer_id = $3)",
        [active, sub.id, sub.customer || ""]
      );
      return res.json({ received: true });
    }
    // Monthly renewal paid: new invoice (the first payment is handled by
    // checkout.session.completed below, so only "subscription_cycle").
    if (event.type === "invoice.paid") {
      const inv = event.data.object;
      if (inv.billing_reason === "subscription_cycle" && inv.amount_paid > 0) {
        const r = await pool.query("SELECT id FROM users WHERE stripe_customer_id = $1 OR stripe_subscription_id = $2 LIMIT 1", [inv.customer || "", inv.subscription || ""]);
        if (r.rows[0]) await recordPaymentAndInvoice(r.rows[0].id, inv.id, inv.amount_paid, inv.currency || "eur", "Abonnement Papote Premium (renouvellement)");
      }
      return res.json({ received: true });
    }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = parseInt(session.client_reference_id, 10);
      const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
      if (userId && paid) {
        const result = await pool.query("SELECT id, email FROM users WHERE id = $1", [userId]);
        const user = result.rows[0];
        if (user) {
          await pool.query(
            "UPDATE users SET subscribed = TRUE, stripe_customer_id = COALESCE($2, stripe_customer_id), stripe_subscription_id = COALESCE($3, stripe_subscription_id) WHERE id = $1",
            [userId, session.customer || null, session.subscription || null]
          );
          // Referral reward, once per invited account: the friend who invited
          // them gets REFERRAL_DAYS of Premium (added after any current period).
          const rw = await pool.query(
            "UPDATE users SET referral_rewarded = TRUE WHERE id = $1 AND referred_by IS NOT NULL AND NOT referral_rewarded RETURNING referred_by", [userId]
          );
          if (rw.rows[0]) {
            await pool.query(
              "UPDATE users SET premium_until = GREATEST(COALESCE(premium_until, NOW()), NOW()) + make_interval(days => $2) WHERE id = $1",
              [rw.rows[0].referred_by, REFERRAL_DAYS]
            );
          }
          await recordPaymentAndInvoice(userId, session.id, session.amount_total || 0, session.currency || "eur", "Abonnement Papote Premium");
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

// API responses carry personal data: never store them in shared caches.
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// CSRF defense in depth (on top of SameSite=Lax cookies and JSON-only bodies):
// a state-changing request coming from another site is refused.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
app.use((req, res, next) => {
  if (SAFE_METHODS.has(req.method) || req.path === "/api/webhooks/stripe" || req.path === "/api/internal/send-digest" ||
    req.path === "/api/internal/send-reminders" || req.path === "/api/reminders/unsubscribe") return next();
  if (req.get("sec-fetch-site") === "cross-site") return res.status(403).json({ error: "Requête refusée." });
  const origin = req.get("origin");
  if (origin) {
    let host = "";
    try { host = new URL(origin).host; } catch (e) { /* malformed */ }
    if (host !== req.get("host")) return res.status(403).json({ error: "Requête refusée." });
  }
  next();
});

// ---- baseline security headers (A05: Security Misconfiguration) ----
// Content-Security-Policy without 'unsafe-inline' for scripts: every <script>
// and <style> element of the HTML pages (including the 936 course pages that
// app.html embeds as srcdoc iframes, which inherit this policy) carries a
// per-request nonce, and no page uses inline event handlers (onclick=...).
// Only style="" attributes stay allowed (style-src-attr): they cannot run code.
app.disable("x-powered-by");
// gzip/brotli for HTML, JSON (a course is ~400 KB of JSON, ~60 KB compressed), JS, CSS.
app.use(compression({ threshold: 1024 }));
app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString("base64");
  res.locals.nonce = nonce;
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // microphone=(self): the pronunciation pages (embedded same-origin iframes with
  // allow="microphone") use speech recognition; everything else stays off.
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(self), camera=()");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'; ` +
    `style-src-elem 'self' 'nonce-${nonce}'; style-src-attr 'unsafe-inline'; ` +
    "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob: data:; " +
    "worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; " +
    "report-uri /api/csp-report"
  );
  if (isProd) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// HTML pages are served with the request's CSP nonce added to every <script>
// and <style> tag. Templates are read once (placeholder pre-inserted), so each
// request is a single string split/join.
const NONCE_MARK = "__CSP_NONCE__";
const htmlTemplates = new Map();
// Cache busting: /course and /design-system files are cached by browsers (1 h
// in production), so the pages reference them as "?v=<hash of their content>".
// A deploy that changes engine.js, a stylesheet... changes the URL, and
// nobody keeps running an old engine against a newer API.
const assetVersions = new Map();
function assetVersion(rel) {
  const file = path.join(__dirname, rel);
  if (!file.startsWith(__dirname + path.sep)) return "";
  try {
    const mtime = require("fs").statSync(file).mtimeMs;
    const hit = assetVersions.get(rel);
    if (hit && (isProd || hit.mtime === mtime)) return hit.v;
    const v = crypto.createHash("sha256").update(require("fs").readFileSync(file)).digest("hex").slice(0, 10);
    assetVersions.set(rel, { mtime, v });
    return v;
  } catch (e) {
    return "";
  }
}
function versionAssets(html) {
  return html.replace(/((?:src|href)=\\?")(\/(?:course|design-system)\/[\w./-]+\.(?:js|css))(?=\\?")/g, (m, pre, url) => {
    const v = assetVersion(url.slice(1));
    return v ? `${pre}${url}?v=${v}` : m;
  });
}
function htmlTemplate(name) {
  if (isProd && htmlTemplates.has(name)) return htmlTemplates.get(name);
  const raw = versionAssets(require("fs").readFileSync(path.join(__dirname, name), "utf8"));
  const tpl = raw.split("\n").map((line) =>
    // app.html's ALL_PAGES line is JSON: its attribute quotes must be escaped.
    line.startsWith("var ALL_PAGES = ")
      ? line.replace(/<(script|style)(?=[\s>])/g, `<$1 nonce=\\"${NONCE_MARK}\\"`)
      : line.replace(/<(script|style)(?=[\s>])/g, `<$1 nonce="${NONCE_MARK}"`)
  ).join("\n").split(NONCE_MARK);
  htmlTemplates.set(name, tpl);
  return tpl;
}
// ---- Papote brand (logo, icons, mascot) ----
// Files are produced by scripts/brand/process-brand.py into design-system/brand/
// and listed in brand.json; everything degrades gracefully when absent.
const BRAND_DIR = path.join(__dirname, "design-system", "brand");
let brandCache = { mtime: -1, data: { logo: false, icons: false, mascot: [] } };
function brandInfo() {
  try {
    const file = path.join(BRAND_DIR, "brand.json");
    const st = require("fs").statSync(file);
    if (st.mtimeMs !== brandCache.mtime) {
      const d = JSON.parse(require("fs").readFileSync(file, "utf8"));
      brandCache = { mtime: st.mtimeMs, data: { logo: !!d.logo, icons: !!d.icons, mascot: Array.isArray(d.mascot) ? d.mascot.filter((m) => /^[a-z]+$/.test(m)) : [] } };
    }
  } catch (e) {
    brandCache = { mtime: -1, data: { logo: false, icons: false, mascot: [] } };
  }
  return brandCache.data;
}
// Mascot expressions: design-system/brand/mascotte/mascotte-<mood>.png
function mascotSrc(mood) {
  return `/design-system/brand/mascotte/mascotte-${mood}.png`;
}
// <picture> with AVIF + WebP at two resolutions and the PNG as fallback: the
// browser picks the lightest format it supports at the right pixel density.
function pictureTag(base, small, full, size, attrs) {
  const set = (ext) => `${base}-${small}.${ext} ${small}w, ${base}${full ? "-" + full : ""}.${ext} ${full || 290}w`;
  return `<picture><source type="image/avif" srcset="${set("avif")}" sizes="${size}px"><source type="image/webp" srcset="${set("webp")}" sizes="${size}px"><img ${attrs}></picture>`;
}
function brandMarkup() {
  const b = brandInfo();
  const has = (m) => b.mascot.includes(m);
  const img = (m, size, cls, loading) => pictureTag(`/design-system/brand/mascotte/mascotte-${m}`, 128, 0, size,
    `${cls ? `class="${cls}" ` : ""}src="${mascotSrc(m)}" alt="" width="${size}" height="${size}"${loading ? ` loading="${loading}"` : ""} decoding="async"`);
  const logo = (cls, alt, size, extra) => pictureTag("/design-system/brand/logo", 128, 512, size,
    `class="${cls}" src="/design-system/brand/logo-512.png" alt="${alt}" width="512" height="512"${extra || ""}`);
  return {
    "<!--BRAND_HEAD-->": b.icons
      ? '<link rel="icon" type="image/png" href="/design-system/brand/favicon-32.png"><link rel="apple-touch-icon" href="/design-system/brand/apple-touch-icon.png"><link rel="manifest" href="/manifest.webmanifest">'
      : "",
    "<!--BRAND_LOGO-->": b.logo ? logo("brand-logo", "Papote", 48) : "",
    // Opening animation: Papote asleep, then wakes up amazed.
    "<!--BRAND_SPLASH-->": has("sleeping") && has("amazed")
      ? `<div class="intro-masc">${img("sleeping", 200, "im-sleep")}${img("amazed", 200, "im-awake")}</div>`
      : b.logo ? logo("intro-logo", "", 200) : "",
    "<!--BRAND_LOADING-->": has("sleeping") ? img("sleeping", 120, "load-masc") : "",
    "<!--BRAND_WAVE-->": has("wave") ? img("wave", 96, "auth-masc") : "",
    "<!--BRAND_PREMIUM-->": ["cool", "heart"].filter(has).map((m) => img(m, 120, "prem-masc prem-" + m)).join(""),
    "<!--BRAND_HERO-->": b.logo ? logo("hero-logo", "Papote", 240, ' fetchpriority="high"') : "",
    "<!--BRAND_MASCOTS-->": ["wave", "happy", "thinking", "heart", "cool", "sleeping"]
      .filter(has).map((m) => img(m, 128, "", "lazy")).join(""),
  };
}

function sendHtml(res, name, vars) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  let html = htmlTemplate(name).join(res.locals.nonce);
  const brand = brandMarkup();
  html = html.replace(/<!--BRAND_[A-Z]+-->/g, (m) => brand[m] || "");
  if (vars) html = html.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
  res.send(html);
}

// ---- Legal notice & privacy policy: publisher identity from the environment ----
const LEGAL_FIELDS = ["LEGAL_PUBLISHER", "LEGAL_ADDRESS", "LEGAL_CONTACT_EMAIL"];
const escapeHtmlText = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function legalVars() {
  const val = (k) => {
    const v = (process.env[k] || "").trim();
    return v ? escapeHtmlText(v) : `<span class="todo">[à compléter : ${k}]</span>`;
  };
  const contact = (process.env.LEGAL_CONTACT_EMAIL || "").trim();
  return {
    LEGAL_PUBLISHER: val("LEGAL_PUBLISHER"),
    LEGAL_ADDRESS: val("LEGAL_ADDRESS"),
    LEGAL_CONTACT_EMAIL: contact ? `<a href="mailto:${escapeHtmlText(contact)}">${escapeHtmlText(contact)}</a>` : val("LEGAL_CONTACT_EMAIL"),
    LEGAL_DIRECTOR: process.env.LEGAL_DIRECTOR ? escapeHtmlText(process.env.LEGAL_DIRECTOR) : val("LEGAL_PUBLISHER"),
    LEGAL_SIRET_LINE: process.env.LEGAL_SIRET ? "SIRET : " + escapeHtmlText(process.env.LEGAL_SIRET) : "",
  };
}
app.get("/mentions-legales", (req, res) => sendHtml(res, "legal.html", legalVars()));
app.get("/confidentialite", (req, res) => sendHtml(res, "privacy.html", legalVars()));

// CSP violation reports (browsers POST them here): logged, rate-limited.
app.post("/api/csp-report", express.json({ type: ["application/csp-report", "application/json"], limit: "20kb" }), (req, res) => {
  if (!rateLimited("csp:" + (req.ip || "unknown"), 30, 15 * 60 * 1000)) {
    const r = (req.body && req.body["csp-report"]) || req.body || {};
    console.warn("[csp] violation:", String(r["violated-directive"] || r.effectiveDirective || "?"), String(r["blocked-uri"] || r.blockedURL || "").slice(0, 200), String(r["document-uri"] || "").slice(0, 120));
  }
  res.status(204).end();
});

// ---- design system (iOS 27 Liquid Glass tokens + app layer) ----
// Public, cacheable CSS shared by every page, including the language pages
// embedded as srcdoc iframes in app.html (they resolve "/design-system/..."
// against the parent page's URL). Mounted before any auth check so the
// login/reset-password pages can use it too.
// Pages reference these files as "?v=<content hash>" (see versionAssets): such
// URLs never change content, so browsers may keep them for a year.
const staticDir = (dir) => {
  const short = express.static(dir, { maxAge: isProd ? "1h" : 0, index: false });
  const forever = express.static(dir, { maxAge: isProd ? "365d" : 0, immutable: isProd, index: false });
  // audio files are named after a hash of their content: cacheable for good too
  return (req, res, next) => (req.query.v || req.path.startsWith("/audio/") ? forever : short)(req, res, next);
};
app.use("/design-system", staticDir(path.join(__dirname, "design-system")));

// ---- course engine assets (JS/CSS/i18n). The content itself (course/data)
// is only reachable through /api/course/:lang, which enforces premium access.
app.use("/course", (req, res, next) => (req.path.startsWith("/data/") ? res.status(404).end() : next()));
app.use("/course", staticDir(path.join(__dirname, "course")));
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

// `mfa: true` marks a session opened with the second factor (required for
// every admin route). Admin sessions last 12 h instead of 30 days.
function signSession(user, opts = {}) {
  const claims = { uid: user.id, email: user.email, tv: user.token_version || 0 };
  if (opts.mfa) claims.mfa = true;
  return jwt.sign(claims, JWT_SECRET, { expiresIn: opts.mfa ? "12h" : "30d", algorithm: "HS256" });
}
function setSessionCookie(res, user, opts = {}) {
  res.cookie(COOKIE_NAME, signSession(user, opts), {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: (opts.mfa ? 12 * 60 * 60 : 30 * 24 * 60 * 60) * 1000,
  });
}

// Session tokens embed the account's token_version: bumping it (password reset,
// "log out everywhere", account deletion) revokes every token issued before.
// A short cache avoids one extra query per request.
const tokenVersionCache = new Map();
async function currentTokenVersion(uid) {
  const hit = tokenVersionCache.get(uid);
  if (hit && hit.exp > Date.now()) return hit.v;
  const r = await pool.query("SELECT token_version FROM users WHERE id = $1", [uid]);
  const v = r.rows[0] ? r.rows[0].token_version : null;
  tokenVersionCache.set(uid, { v, exp: Date.now() + 30000 });
  return v;
}
async function revokeSessions(uid) {
  await pool.query("UPDATE users SET token_version = token_version + 1 WHERE id = $1", [uid]);
  tokenVersionCache.delete(uid);
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of tokenVersionCache) if (v.exp < now) tokenVersionCache.delete(k);
}, 60000).unref();

async function authMiddleware(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return next();
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
  } catch (e) {
    return next(); // invalid/expired token: treat as logged out
  }
  try {
    const v = await currentTokenVersion(payload.uid);
    if (v !== null && v === (payload.tv || 0)) {
      req.userId = payload.uid;
      req.userEmail = payload.email;
      req.mfa = payload.mfa === true;
    }
    next();
  } catch (err) {
    next(err);
  }
}
app.use(authMiddleware);

// Records an administrator action (who, what, on what) in admin_audit.
async function audit(req, action, target, details) {
  try {
    await pool.query(
      "INSERT INTO admin_audit (admin_id, admin_email, action, target, details, ip) VALUES ($1, $2, $3, $4, $5, $6)",
      [req.userId, req.userEmail || "", action, String(target || ""), JSON.stringify(details || {}), req.ip || ""]
    );
  } catch (err) {
    console.error("audit log error:", err.message);
  }
}

// Administrator, whatever the 2FA state (only for the 2FA setup routes).
async function requireAdminBase(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  try {
    const result = await pool.query("SELECT is_admin, totp_enabled FROM users WHERE id = $1", [req.userId]);
    if (!result.rows[0] || !result.rows[0].is_admin) {
      return res.status(403).json({ error: "Accès réservé à l'administrateur." });
    }
    req.totpEnabled = result.rows[0].totp_enabled;
    next();
  } catch (err) {
    next(err);
  }
}

// Administrator with two-factor authentication enabled AND used for this session.
async function requireAdmin(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  try {
    const result = await pool.query("SELECT is_admin, totp_enabled FROM users WHERE id = $1", [req.userId]);
    if (!result.rows[0] || !result.rows[0].is_admin) {
      return res.status(403).json({ error: "Accès réservé à l'administrateur." });
    }
    if (!result.rows[0].totp_enabled) {
      return res.status(403).json({ error: "Active la double authentification pour accéder à l'administration.", code: "mfa_setup_required" });
    }
    if (!req.mfa) {
      return res.status(403).json({ error: "Reconnecte-toi avec ton code de double authentification.", code: "mfa_required" });
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
    if (password.length < MIN_PASSWORD || password.length > 200) {
      return res.status(400).json({ error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.` });
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
    }

    const hash = await bcrypt.hash(password, 12);
    // Never admin at signup: the admin role needs a verified address (see verify-email).
    const rawVerify = crypto.randomBytes(32).toString("hex");
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, is_admin, verify_token_hash, verify_token_expires)
       VALUES ($1, $2, $3, FALSE, $4, $5) RETURNING id, email, token_version`,
      [email, hash, name || null, hashResetToken(rawVerify), new Date(Date.now() + VERIFY_TOKEN_TTL_MS)]
    );
    const user = result.rows[0];
    setSessionCookie(res, user);

    // Invited by a friend (link /?ref=CODE): remember who, and make them friends.
    const ref = String((req.body && req.body.ref) || "").trim().toUpperCase();
    if (/^[A-Z0-9]{8}$/.test(ref)) {
      try {
        const r = await pool.query("SELECT id FROM users WHERE friend_code = $1", [ref]);
        if (r.rows[0]) {
          await pool.query("UPDATE users SET referred_by = $1 WHERE id = $2", [r.rows[0].id, user.id]);
          await pool.query("INSERT INTO friends (user_id, friend_id) VALUES ($1, $2), ($2, $1) ON CONFLICT DO NOTHING", [user.id, r.rows[0].id]);
        }
      } catch (e) { console.error("referral error:", e.message); }
    }

    sendEmail({
      to: user.email,
      subject: `Bienvenue sur ${BUSINESS_NAME}`,
      html: welcomeEmailHtml(name, `${APP_URL}/api/verify-email?token=${rawVerify}`),
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
      "SELECT id, email, password_hash, email_verified, token_version, totp_enabled FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];
    const hashToCompare = user ? user.password_hash : "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidin";
    const match = await bcrypt.compare(password, hashToCompare);

    if (!user || !match) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    if (ADMIN_EMAIL && email === ADMIN_EMAIL && user.email_verified) {
      await pool.query("UPDATE users SET is_admin = TRUE WHERE id = $1", [user.id]);
    }

    if (user.totp_enabled) {
      // Password OK, second factor still needed: no session yet.
      res.cookie(MFA_COOKIE, jwt.sign({ uid: user.id, purpose: "mfa", tv: user.token_version || 0 }, JWT_SECRET, { expiresIn: "5m", algorithm: "HS256" }), {
        httpOnly: true, secure: isProd, sameSite: "strict", maxAge: 5 * 60 * 1000,
      });
      return res.json({ ok: true, mfaRequired: true });
    }
    setSessionCookie(res, user);
    return res.json({ ok: true });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Erreur serveur. Réessaie plus tard." });
  }
});

// Second login step for accounts with 2FA: a 6-digit code from the
// authenticator app, or one of the one-time recovery codes.
app.post("/api/login/mfa", async (req, res) => {
  let pending;
  try {
    pending = jwt.verify(req.cookies[MFA_COOKIE] || "", JWT_SECRET, { algorithms: ["HS256"] });
  } catch (e) {
    return res.status(401).json({ error: "Session expirée : reconnecte-toi." });
  }
  if (pending.purpose !== "mfa") return res.status(401).json({ error: "Session expirée : reconnecte-toi." });
  if (rateLimited("mfa:" + pending.uid, 8, 15 * 60 * 1000)) {
    return res.status(429).json({ error: "Trop de tentatives. Réessaie dans quelques minutes." });
  }
  const r = await pool.query("SELECT id, email, token_version, totp_secret_enc, totp_last_step, totp_recovery FROM users WHERE id = $1 AND totp_enabled", [pending.uid]);
  const user = r.rows[0];
  if (!user || (user.token_version || 0) !== (pending.tv || 0)) return res.status(401).json({ error: "Session expirée : reconnecte-toi." });
  const code = String((req.body && req.body.code) || "").trim();
  let ok = false;
  if (/^\d{6}$/.test(code.replace(/\s+/g, ""))) {
    const step = totp.verify(totp.decrypt(user.totp_secret_enc, TOTP_KEY), code, Number(user.totp_last_step));
    if (step >= 0) {
      ok = true;
      await pool.query("UPDATE users SET totp_last_step = $1 WHERE id = $2", [step, user.id]);
    }
  } else if (code) {
    const h = totp.hashRecovery(code);
    const codes = Array.isArray(user.totp_recovery) ? user.totp_recovery : [];
    if (codes.includes(h)) {
      ok = true;
      await pool.query("UPDATE users SET totp_recovery = $1 WHERE id = $2", [JSON.stringify(codes.filter((c) => c !== h)), user.id]);
    }
  }
  if (!ok) return res.status(401).json({ error: "Code incorrect." });
  res.clearCookie(MFA_COOKIE, { httpOnly: true, secure: isProd, sameSite: "strict" });
  setSessionCookie(res, user, { mfa: true });
  return res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie(MFA_COOKIE, { httpOnly: true, secure: isProd, sameSite: "strict" });
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: isProd, sameSite: "lax" });
  res.json({ ok: true });
});

// Revokes every session of the account (all devices), then logs out this one.
app.post("/api/logout-all", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  await revokeSessions(req.userId);
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: isProd, sameSite: "lax" });
  return res.json({ ok: true });
});

// ---- forgot / reset password ----
function hashResetToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// Email ownership proof (link sent in the welcome email). The designated
// ADMIN_EMAIL account only becomes administrator once this is done.
app.get("/api/verify-email", async (req, res) => {
  const ip = req.ip || "unknown";
  if (rateLimited("verify-email:" + ip, 20, 15 * 60 * 1000)) return res.status(429).send("Trop de tentatives.");
  const token = String(req.query.token || "");
  if (!/^[a-f0-9]{64}$/.test(token)) return res.redirect("/?verified=0");
  const r = await pool.query(
    `UPDATE users SET email_verified = TRUE, verify_token_hash = NULL, verify_token_expires = NULL
      WHERE verify_token_hash = $1 AND verify_token_expires > NOW() RETURNING id, email`,
    [hashResetToken(token)]
  );
  const user = r.rows[0];
  if (!user) return res.redirect("/?verified=0");
  if (ADMIN_EMAIL && user.email === ADMIN_EMAIL) {
    await pool.query("UPDATE users SET is_admin = TRUE WHERE id = $1", [user.id]);
  }
  return res.redirect("/?verified=1");
});

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
    if (password.length < MIN_PASSWORD || password.length > 200) {
      return res.status(400).json({ error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.` });
    }
    const tokenHash = hashResetToken(token);
    const result = await pool.query(
      "SELECT id, email FROM users WHERE reset_token_hash = $1 AND reset_token_expires > NOW()",
      [tokenHash]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ error: "Ce lien a expiré ou n'est plus valide. Refais une demande." });
    }
    const hash = await bcrypt.hash(password, 12);
    // The reset link proves ownership of the address; every existing session
    // (possibly an attacker's) is revoked.
    await pool.query(
      `UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL,
              email_verified = TRUE, is_admin = is_admin OR ($3 <> '' AND email = $3)
        WHERE id = $2`,
      [hash, user.id, ADMIN_EMAIL]
    );
    await revokeSessions(user.id);
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
      "SELECT id, email, name, subscribed, is_admin, lang_order, base_lang, email_verified, reminder_enabled, reminder_hour, reminder_tz, premium_until FROM users WHERE id = $1",
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
      emailVerified: user.email_verified,
      reminder: { enabled: user.reminder_enabled, hour: user.reminder_hour, tz: user.reminder_tz },
      premiumUntil: user.premium_until && new Date(user.premium_until) > new Date() ? user.premium_until : null,
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
  if (baseLang !== undefined && !hasOwn(LANG_META, baseLang)) {
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

// ---- Invoices: list and PDF download (owner only) ----
app.get("/api/invoices", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  const r = await pool.query("SELECT invoice_number, amount_cents, currency, created_at FROM payments WHERE user_id = $1 ORDER BY created_at DESC", [req.userId]);
  return res.json({ invoices: r.rows });
});
app.get("/api/invoices/:number.pdf", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  const number = String(req.params.number || "");
  if (!/^[A-Z0-9-]{4,40}$/.test(number)) return res.status(404).json({ error: "Facture introuvable." });
  const r = await pool.query(
    `SELECT p.invoice_number, p.amount_cents, p.currency, p.created_at, COALESCE(p.customer_email, u.email) AS email, COALESCE(p.customer_name, u.name) AS name
     FROM payments p JOIN users u ON u.id = p.user_id WHERE p.user_id = $1 AND p.invoice_number = $2`, [req.userId, number]);
  const p = r.rows[0];
  if (!p) return res.status(404).json({ error: "Facture introuvable." });
  const pdf = await invoicePdf({ number: p.invoice_number, date: p.created_at, amountCents: p.amount_cents, currency: p.currency, customerEmail: p.email, customerName: p.name });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="Facture-${p.invoice_number}.pdf"`);
  return res.send(pdf);
});

// ---- GDPR: data export and account deletion ----
// Everything stored about the account, as a downloadable JSON file.
app.get("/api/account/export", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  if (rateLimited("export:" + req.userId, 10, 60 * 60 * 1000)) return res.status(429).json({ error: "Trop de requêtes." });
  const u = await pool.query(
    "SELECT id, email, name, base_lang, lang_order, subscribed, is_admin, email_verified, created_at, friend_code, premium_until, reminder_enabled, reminder_hour, reminder_tz FROM users WHERE id = $1",
    [req.userId]
  );
  if (!u.rows[0]) return res.status(404).json({ error: "Compte introuvable." });
  const friends = await pool.query("SELECT u.name, f.created_at FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = $1 ORDER BY f.created_at", [req.userId]);
  const progress = await pool.query("SELECT lang, data, updated_at FROM user_progress WHERE user_id = $1 ORDER BY lang", [req.userId]);
  const ideas = await pool.query("SELECT message, category, status, created_at FROM suggestions WHERE user_id = $1 ORDER BY created_at", [req.userId]);
  const payments = await pool.query("SELECT invoice_number, amount_cents, currency, created_at FROM payments WHERE user_id = $1 ORDER BY created_at", [req.userId]);
  res.setHeader("Content-Disposition", 'attachment; filename="papote-mes-donnees.json"');
  return res.json({
    exportedAt: new Date().toISOString(),
    account: u.rows[0],
    progress: progress.rows,
    ideas: ideas.rows,
    payments: payments.rows,
    friends: friends.rows,
  });
});

// Permanently deletes the account (password required). Progress and ideas are
// deleted with it; invoices are kept for accounting, detached from the account.
app.delete("/api/account", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  if (rateLimited("delete-account:" + req.userId, 5, 15 * 60 * 1000)) return res.status(429).json({ error: "Trop de tentatives." });
  const password = String((req.body && req.body.password) || "");
  const u = await pool.query("SELECT id, password_hash, is_admin FROM users WHERE id = $1", [req.userId]);
  const user = u.rows[0];
  if (!user) return res.status(404).json({ error: "Compte introuvable." });
  if (!password || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(403).json({ error: "Mot de passe incorrect." });
  }
  await pool.query("DELETE FROM users WHERE id = $1", [user.id]);
  tokenVersionCache.delete(user.id);
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: isProd, sameSite: "lax" });
  return res.json({ ok: true });
});

// ---- features (free/premium toggles) ----
app.get("/api/features", async (req, res) => {
  try {
    const result = await pool.query("SELECT key, label, category, is_premium FROM features ORDER BY sort_order");
    let unlocked = false;
    if (req.userId) {
      const u = await pool.query("SELECT subscribed, is_admin, premium_until FROM users WHERE id = $1", [req.userId]);
      if (u.rows[0]) unlocked = hasPremium(u.rows[0]);
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
// Paid subscription, admin, or Premium offered until a date (referral reward).
function hasPremium(u) {
  return Boolean(u && (u.subscribed || u.is_admin || (u.premium_until && new Date(u.premium_until) > new Date())));
}
// ---- Course engine API --------------------------------------------------------
// Access for one account: `features[key] === true` means LOCKED for this account.
async function accessFor(userId) {
  const u = await pool.query("SELECT id, name, subscribed, is_admin, base_lang, premium_until FROM users WHERE id = $1", [userId]);
  const user = u.rows[0];
  if (!user) return null;
  const unlocked = hasPremium(user);
  const f = await pool.query("SELECT key, is_premium FROM features WHERE category IN ('global', 'module')");
  const features = {};
  f.rows.forEach((r) => { features[r.key] = r.is_premium && !unlocked; });
  return { user, unlocked, features };
}

app.get("/api/course/:lang", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  const code = String(req.params.lang);
  if (!hasOwn(LANG_META, code)) return res.status(404).json({ error: "Langue inconnue." });
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
      brand: brandInfo(),
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
  if (!hasOwn(LANG_META, req.params.lang)) return res.status(404).json({ error: "Langue inconnue." });
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
  if (!hasOwn(LANG_META, req.params.lang)) return res.status(404).json({ error: "Langue inconnue." });
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
  if (!hasOwn(LANG_META, lang)) return res.status(400).json({ error: "Langue inconnue." });
  const levels = String(req.query.level || "").split(",").filter((l) => LEVELS.includes(l));
  const q = String(req.query.q || "").trim().slice(0, 60);
  const SORTS = { level: "eff_level, word", alpha: "word", theme: "theme, eff_level, word" };
  const sort = hasOwn(SORTS, req.query.sort) ? SORTS[req.query.sort] : SORTS.level;
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

// ---- Stripe webhook: make sure the events Premium depends on are enabled ----
// Uses the Stripe API with STRIPE_SECRET_KEY: finds the endpoint pointing at
// APP_URL/api/webhooks/stripe and adds any missing event (keeps the others and
// the signing secret). The result is shown in /admin -> Configuration.
const STRIPE_REQUIRED_EVENTS = ["checkout.session.completed", "invoice.paid", "customer.subscription.updated", "customer.subscription.deleted"];
const STRIPE_STATUS = { state: "unknown", detail: "" };
async function checkStripeWebhook() {
  if (!process.env.STRIPE_SECRET_KEY) {
    Object.assign(STRIPE_STATUS, { state: "not_configured", detail: "STRIPE_SECRET_KEY absent" });
    return;
  }
  const url = `${APP_URL}/api/webhooks/stripe`;
  const result = await stripeLib.ensureWebhookEvents(url, STRIPE_REQUIRED_EVENTS);
  Object.assign(STRIPE_STATUS, result);
  console.log(`[stripe] webhook ${url}: ${result.state}${result.detail ? " - " + result.detail : ""}`);
}

// ---- Admin: configuration check (never returns secret values) ----
app.get("/api/admin/config", requireAdmin, async (req, res) => {
  const env = (k) => Boolean(process.env[k] && String(process.env[k]).trim());
  const emailFrom = process.env.EMAIL_FROM || "";
  const legalMissing = LEGAL_FIELDS.filter((k) => !env(k));
  const admins = await pool.query("SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE totp_enabled)::int AS mfa FROM users WHERE is_admin");
  const lastBackup = await pool.query("SELECT value FROM app_meta WHERE key = 'last_backup'");
  const checks = [
    { key: "admin_email", ok: Boolean(ADMIN_EMAIL), label: "ADMIN_EMAIL défini", help: "Render → Environment → ADMIN_EMAIL" },
    { key: "admin_mfa", ok: admins.rows[0].n > 0 && admins.rows[0].mfa === admins.rows[0].n, label: `Double authentification active pour tous les admins (${admins.rows[0].mfa}/${admins.rows[0].n})`, help: "Section « Sécurité » ci-dessous" },
    { key: "anthropic", ok: env("ANTHROPIC_API_KEY"), label: "Conversation IA (ANTHROPIC_API_KEY)", help: "console.anthropic.com → API Keys, puis Render → Environment (jamais dans le code)" },
    { key: "resend", ok: Boolean(emailProvider()), label: "Envoi d'emails (RESEND_API_KEY)", help: "Resend → API Keys, puis Render → Environment (jamais dans le code)" },
    { key: "email_from", ok: /<[^@\s]+@[^>\s]+>/.test(emailFrom) && !/resend\.dev/.test(emailFrom), label: "Expéditeur sur ton domaine (EMAIL_FROM)", help: "Sans domaine vérifié dans Resend → Domains, seule l'adresse du compte Resend reçoit les emails" },
    { key: "stripe", ok: env("STRIPE_SECRET_KEY") && env("STRIPE_PRICE_ID") && env("STRIPE_WEBHOOK_SECRET"), label: "Paiement Stripe configuré", help: "STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET" },
    { key: "stripe_events", ok: STRIPE_STATUS.state === "ok" || STRIPE_STATUS.state === "updated", label: "Webhook Stripe : événements d'abonnement", help: STRIPE_STATUS.detail || STRIPE_STATUS.state },
    { key: "db_tls", ok: DB_TLS.mode === "verified" || DB_TLS.mode === "disabled", label: `TLS base de données : ${DB_TLS.mode}`, help: DB_TLS.note },
    { key: "backup", ok: Boolean(lastBackup.rows[0]) && Date.now() - Date.parse(lastBackup.rows[0].value) < 3 * 86400000, label: "Sauvegarde de la base de moins de 3 jours", help: lastBackup.rows[0] ? `Dernière : ${lastBackup.rows[0].value}` : "GitHub → Settings → Secrets : BACKUP_DATABASE_URL, BACKUP_PASSPHRASE (voir README)" },
    { key: "legal", ok: legalMissing.length === 0, label: "Mentions légales complètes", help: legalMissing.length ? "À définir : " + legalMissing.join(", ") : "" },
    { key: "app_url", ok: env("APP_URL"), label: "APP_URL défini", help: APP_URL },
  ];
  return res.json({ checks });
});

// ---- Admin: send one sample of every email to the admin's own address ----
// Sample data only: no account, token, payment or invoice is created; links
// are harmless (the sample reset link is not a valid token).
app.post("/api/admin/test-emails", requireAdmin, async (req, res) => {
  if (rateLimited("test-emails:" + req.userId, 3, 10 * 60 * 1000)) return res.status(429).json({ error: "Trop d'envois de test, réessaie dans quelques minutes." });
  if (!emailProvider()) return res.status(400).json({ error: "Aucun envoi d'email configuré (RESEND_API_KEY manquante dans Render → Environment)." });
  const to = (await pool.query("SELECT email FROM users WHERE id = $1", [req.userId])).rows[0].email;
  const now = new Date();
  const number = "TEST-" + now.toISOString().slice(0, 10).replace(/-/g, "");
  let pdf = null;
  try { pdf = await invoicePdf({ number, date: now, amountCents: 499, currency: "eur", customerEmail: to, customerName: "Exemple" }); } catch (e) { console.error("[invoice] test PDF failed:", e.message); }
  const samples = [
    ["Bienvenue", { subject: `[TEST] Bienvenue sur ${BUSINESS_NAME}`, html: welcomeEmailHtml("Camille", APP_URL + "/") }],
    ["Mot de passe oublié", { subject: `[TEST] Réinitialise ton mot de passe - ${BUSINESS_NAME}`, html: resetPasswordEmailHtml(APP_URL + "/reset-password?token=exemple-de-test") }],
    ["Facture Premium", { subject: `[TEST] Ta facture ${number} - ${BUSINESS_NAME} Premium`,
      html: invoiceEmailHtml({ invoiceNumber: number, date: now.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }), amount: 499, currency: "eur", email: to, businessName: BUSINESS_NAME }),
      attachments: pdf ? [{ filename: `Facture-${number}.pdf`, content: pdf, contentType: "application/pdf" }] : undefined }],
    ["Rappel quotidien", { subject: "[TEST] 🔥 7 jours de suite — on continue ?", html: reminderEmailHtml({ lang: "fr", name: "Camille", streak: 7, due: 12, langName: "Espagnol", appLink: APP_URL + "/", unsubLink: APP_URL + "/profile" }) }],
    ["Boîte à idées", { subject: "[TEST] 💡 Boîte à idées — 2 nouvelles suggestions", html: suggestionsDigestHtml([
      { created_at: now, user_email: "exemple@papote.app", category: "langue", message: "Ajouter le breton !" },
      { created_at: now, user_email: null, category: "", message: "Un mode sombre encore plus sombre la nuit." }]) }],
  ];
  const results = [];
  for (const [label, mail] of samples) {
    const r = await sendEmail({ to, ...mail });
    results.push({ label, ok: Boolean(r && r.ok) });
  }
  await audit(req, "test_emails", to, { sent: results.filter((r) => r.ok).length });
  return res.json({ to, results });
});

// ---- Admin: two-factor authentication (mandatory for admin routes) ----
app.get("/api/admin/mfa", requireAdminBase, async (req, res) => {
  const r = await pool.query("SELECT totp_recovery FROM users WHERE id = $1", [req.userId]);
  return res.json({ enabled: req.totpEnabled, sessionVerified: req.mfa, recoveryLeft: (r.rows[0].totp_recovery || []).length });
});
// Step 1: new secret (not active until confirmed with a code).
app.post("/api/admin/mfa/setup", requireAdminBase, async (req, res) => {
  if (req.totpEnabled) return res.status(409).json({ error: "La double authentification est déjà active." });
  const secret = totp.newSecret();
  await pool.query("UPDATE users SET totp_secret_enc = $1, totp_last_step = -1 WHERE id = $2", [totp.encrypt(secret, TOTP_KEY), req.userId]);
  return res.json({ secret, otpauth: totp.otpauthUri(secret, req.userEmail || "admin", BUSINESS_NAME) });
});
// Step 2: confirm with a code from the app; returns the one-time recovery codes.
app.post("/api/admin/mfa/enable", requireAdminBase, async (req, res) => {
  if (rateLimited("mfa-enable:" + req.userId, 10, 15 * 60 * 1000)) return res.status(429).json({ error: "Trop de tentatives." });
  if (req.totpEnabled) return res.status(409).json({ error: "La double authentification est déjà active." });
  const r = await pool.query("SELECT id, email, token_version, totp_secret_enc FROM users WHERE id = $1", [req.userId]);
  const user = r.rows[0];
  if (!user.totp_secret_enc) return res.status(400).json({ error: "Commence par générer une clé." });
  const step = totp.verify(totp.decrypt(user.totp_secret_enc, TOTP_KEY), req.body && req.body.code);
  if (step < 0) return res.status(400).json({ error: "Code incorrect : vérifie l'heure du téléphone et réessaie." });
  const codes = totp.newRecoveryCodes();
  await pool.query("UPDATE users SET totp_enabled = TRUE, totp_last_step = $1, totp_recovery = $2 WHERE id = $3",
    [step, JSON.stringify(codes.map(totp.hashRecovery)), user.id]);
  setSessionCookie(res, user, { mfa: true });
  await audit(req, "mfa.enable", user.id, {});
  return res.json({ ok: true, recoveryCodes: codes });
});
// Turning 2FA off needs the password and a current code.
app.post("/api/admin/mfa/disable", requireAdmin, async (req, res) => {
  if (rateLimited("mfa-disable:" + req.userId, 5, 15 * 60 * 1000)) return res.status(429).json({ error: "Trop de tentatives." });
  const r = await pool.query("SELECT password_hash, totp_secret_enc, totp_last_step FROM users WHERE id = $1", [req.userId]);
  const u = r.rows[0];
  const pwOk = await bcrypt.compare(String((req.body && req.body.password) || ""), u.password_hash);
  const step = totp.verify(totp.decrypt(u.totp_secret_enc, TOTP_KEY), req.body && req.body.code, Number(u.totp_last_step));
  if (!pwOk || step < 0) return res.status(403).json({ error: "Mot de passe ou code incorrect." });
  await pool.query("UPDATE users SET totp_enabled = FALSE, totp_secret_enc = NULL, totp_recovery = '[]'::jsonb WHERE id = $1", [req.userId]);
  await audit(req, "mfa.disable", req.userId, {});
  return res.json({ ok: true });
});

// ---- Admin: CEFR level of any word ----
app.get("/api/admin/vocabulary", requireAdmin, async (req, res) => {
  const lang = String(req.query.lang || "");
  if (!hasOwn(LANG_META, lang)) return res.status(400).json({ error: "Langue inconnue." });
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
  if (!hasOwn(LANG_META, req.params.lang)) return res.status(400).json({ error: "Langue inconnue." });
  const r = await pool.query(
    "UPDATE course_words SET level_override = $1, updated_at = NOW() WHERE lang = $2 AND word_id = $3 RETURNING word_id, level, level_override",
    [level, req.params.lang, req.params.wordId]
  );
  if (!r.rows[0]) return res.status(404).json({ error: "Mot introuvable." });
  await audit(req, "word.level", `${req.params.lang}:${req.params.wordId}`, { level });
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
    await audit(req, "idea.update", id, { status: body.status, notesChanged: body.admin_notes !== undefined });
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
  if (!hasOwn(LANG_META, code)) return res.status(400).json({ error: "Langue inconnue." });
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
    await audit(req, "language.status", code, { status });
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
  await audit(req, "feature.toggle", key, { is_premium: isPremium });
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
    if (!hasOwn(LANG_META, body.lang_code)) return res.status(400).json({ error: "Langue inconnue." });
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
    await audit(req, "feature.bulk", body.lang_code || body.module || (body.all ? "all" : "keys"), { is_premium: isPremium, count: result.rows.length });
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

// Latest administrator actions (audit trail).
app.get("/api/admin/audit", requireAdmin, async (req, res) => {
  const r = await pool.query(
    "SELECT id, admin_email, action, target, details, ip, created_at FROM admin_audit ORDER BY created_at DESC LIMIT 200"
  );
  return res.json({ entries: r.rows });
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
  if (!req.body || typeof req.body.subscribed !== "boolean") {
    return res.status(400).json({ error: "Paramètre 'subscribed' (booléen) requis." });
  }
  const result = await pool.query(
    "UPDATE users SET subscribed = $1 WHERE id = $2 RETURNING id, email, subscribed",
    [req.body.subscribed, userId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Compte introuvable." });
  await audit(req, "user.premium", userId, { subscribed: req.body.subscribed, email: result.rows[0].email });
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
    // Fixed base URL (not the request's Host header) for Stripe's redirects.
    const origin = APP_URL;
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
  const given = Buffer.from(String(req.headers["x-digest-secret"] || ""));
  const expected = Buffer.from(DIGEST_CRON_SECRET);
  if (!DIGEST_CRON_SECRET || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
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

// ---- Error tracking ------------------------------------------------------------
// Errors from the browser (POST /api/client-error) and from the server land in
// one deduplicated table the admin reads in /admin. No personal data: messages
// are trimmed, URLs lose their query string, the user agent is reduced to a
// browser family.
function browserFamily(ua) {
  ua = String(ua || "");
  const m = /(Edg|OPR|Firefox|Chrome|CriOS|FxiOS|Safari)\/(\d+)/.exec(ua);
  const name = m ? ({ Edg: "Edge", OPR: "Opera", CriOS: "Chrome iOS", FxiOS: "Firefox iOS" }[m[1]] || m[1]) : "autre";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return `${name}${m ? " " + m[2] : ""}${os ? " · " + os : ""}`;
}
function scrubUrl(u) { return String(u || "").replace(/[?#].*$/, "").slice(0, 200); }
async function logError(source, message, stack, url, ua) {
  try {
    message = String(message || "?").replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<email>").slice(0, 300);
    stack = String(stack || "").slice(0, 2000);
    const firstFrame = (stack.split("\n").find((l) => /:\d+:\d+/.test(l)) || "").replace(/\?v=\w+/g, "").trim();
    const fp = crypto.createHash("sha1").update(source + "|" + message + "|" + firstFrame).digest("hex");
    await pool.query(
      `INSERT INTO app_errors (fingerprint, source, message, stack, url, browser) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (fingerprint) DO UPDATE SET count = app_errors.count + 1, last_seen = NOW(), url = EXCLUDED.url, browser = EXCLUDED.browser`,
      [fp, source, message, stack, scrubUrl(url), browserFamily(ua)]
    );
  } catch (e) { /* never let error logging fail a request */ }
}
app.post("/api/client-error", (req, res) => {
  if (rateLimited("cerr:" + (req.ip || "unknown"), 20, 10 * 60 * 1000)) return res.status(204).end();
  const b = req.body || {};
  if (typeof b.message === "string" && b.message) logError("client", b.message, typeof b.stack === "string" ? b.stack : "", b.url, req.get("user-agent"));
  res.status(204).end();
});
app.get("/api/admin/errors", requireAdmin, async (req, res) => {
  const r = await pool.query("SELECT fingerprint, source, message, stack, url, browser, count, first_seen, last_seen FROM app_errors ORDER BY last_seen DESC LIMIT 200");
  return res.json({ errors: r.rows });
});
app.delete("/api/admin/errors", requireAdmin, async (req, res) => {
  await pool.query("DELETE FROM app_errors");
  await audit(req, "errors.clear", "", {});
  return res.json({ ok: true });
});

// ---- Privacy-friendly analytics -------------------------------------------------
const TRACK_EVENTS = new Set(["view", "lesson_done", "daily_done", "placement_done", "quiz_done", "review_done", "chat_msg", "pron_compare", "exam_done"]);
const TRACK_PAGES = new Set(["hub", "vocabulaire", "phrases", "grammaire", "conjugaison", "alphabet", "lecture", "ecoute", "exercices", "revision", "prononciation", "conversation", "culture", "examen", "stats", "badges", "certificat", "dictionnaire", "profil", "amis", "levels"]);
async function track(event, lang, uid) {
  try {
    await pool.query(
      `INSERT INTO analytics_daily (day, event, lang, count) VALUES (CURRENT_DATE, $1, $2, 1)
       ON CONFLICT (day, event, lang) DO UPDATE SET count = analytics_daily.count + 1`, [event, lang || ""]
    );
    if (uid) {
      const day = new Date().toISOString().slice(0, 10);
      const visitor = crypto.createHmac("sha256", JWT_SECRET).update("dau:" + day + ":" + uid).digest("base64url").slice(0, 22);
      await pool.query("INSERT INTO analytics_active (day, visitor) VALUES (CURRENT_DATE, $1) ON CONFLICT DO NOTHING", [visitor]);
    }
  } catch (e) { /* analytics must never break anything */ }
}
app.post("/api/track", (req, res) => {
  if (!req.userId) return res.status(204).end();
  if (rateLimited("track:" + req.userId, 300, 15 * 60 * 1000)) return res.status(204).end();
  const b = req.body || {};
  let event = String(b.event || "");
  if (event.startsWith("view:")) { const page = event.slice(5); if (!TRACK_PAGES.has(page)) return res.status(204).end(); }
  else if (!TRACK_EVENTS.has(event)) return res.status(204).end();
  const lang = hasOwn(LANG_META, b.lang) ? b.lang : "";
  track(event, lang, req.userId);
  res.status(204).end();
});
app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 30));
  const dau = await pool.query(
    `SELECT d::date AS day, COALESCE(a.n, 0)::int AS n FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, '1 day') d
     LEFT JOIN (SELECT day, COUNT(*) AS n FROM analytics_active GROUP BY day) a ON a.day = d::date ORDER BY d`, [days]
  );
  const events = await pool.query(
    `SELECT event, SUM(count)::int AS n FROM analytics_daily WHERE day > CURRENT_DATE - $1::int GROUP BY event ORDER BY n DESC LIMIT 40`, [days]
  );
  const langs = await pool.query(
    `SELECT lang, SUM(count)::int AS n FROM analytics_daily WHERE day > CURRENT_DATE - $1::int AND lang <> '' GROUP BY lang ORDER BY n DESC LIMIT 40`, [days]
  );
  const signups = await pool.query(
    `SELECT COUNT(*)::int AS n FROM users WHERE created_at > NOW() - ($1::int * INTERVAL '1 day')`, [days]
  );
  return res.json({ days, dau: dau.rows, events: events.rows, langs: langs.rows, signups: signups.rows[0].n });
});
setInterval(() => {
  pool.query("DELETE FROM analytics_active WHERE day < CURRENT_DATE - 90").catch(() => {});
  pool.query("DELETE FROM analytics_daily WHERE day < CURRENT_DATE - 400").catch(() => {});
  pool.query("DELETE FROM app_errors WHERE last_seen < NOW() - INTERVAL '90 days'").catch(() => {});
}, 6 * 60 * 60 * 1000).unref();

// ---- AI conversation partner ------------------------------------------------
// The browser never talks to the AI provider: it posts the conversation here,
// the server adds the system prompt and its key (ANTHROPIC_API_KEY, set only in
// the hosting environment) and returns the reply. Daily quotas per account.
const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-5-5";
// Overridable only so tests can point it at a local mock.
const AI_API_URL = process.env.AI_API_URL || "https://api.anthropic.com/v1/messages";
const AI_DAILY_FREE = parseInt(process.env.AI_DAILY_FREE || "10", 10);
const AI_DAILY_PREMIUM = parseInt(process.env.AI_DAILY_PREMIUM || "150", 10);
const AI_SCENARIOS = {
  free: "a friendly free conversation about the learner's day, hobbies and plans",
  cafe: "ordering at a café or restaurant (you are the waiter)",
  travel: "asking for directions and travel information in a city (you are a local passer-by)",
  intro: "meeting someone for the first time and introducing yourselves",
  shopping: "shopping for clothes or groceries (you are the shop assistant)",
  doctor: "a visit to the doctor (you are the doctor)",
  job: "a job interview (you are the recruiter)",
  debate: "a friendly debate on a current topic of the learner's choice",
};
const LEVEL_STYLE = {
  A1: "very short sentences (max 8 words), the most common words only, present tense",
  A2: "short simple sentences, everyday vocabulary, present/past/future basics",
  B1: "clear sentences of moderate length, common idioms are fine",
  B2: "natural sentences, varied vocabulary and tenses",
  C1: "rich, idiomatic language with nuance",
  C2: "fully native, sophisticated and idiomatic language",
};
async function aiQuota(userId, unlocked) {
  const r = await pool.query("SELECT count FROM ai_usage WHERE user_id = $1 AND day = CURRENT_DATE", [userId]);
  const used = r.rows[0] ? r.rows[0].count : 0;
  const limit = unlocked ? AI_DAILY_PREMIUM : AI_DAILY_FREE;
  return { used, limit, left: Math.max(0, limit - used) };
}
app.get("/api/chat/status", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  try {
    const access = await accessFor(req.userId);
    if (!access) return res.status(401).json({ error: "Session invalide." });
    const q = await aiQuota(req.userId, access.unlocked);
    return res.json({ enabled: Boolean(process.env.ANTHROPIC_API_KEY), ...q, premium: access.unlocked });
  } catch (err) {
    console.error("chat status error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});
function parseAiJson(text) {
  const m = /\{[\s\S]*\}/.exec(text || "");
  if (m) {
    try {
      const j = JSON.parse(m[0]);
      const str = (v) => (typeof v === "string" ? v.slice(0, 1200) : "");
      if (str(j.reply)) return { reply: str(j.reply), rom: str(j.rom), translation: str(j.translation), correction: str(j.correction) };
    } catch (e) { /* fall through */ }
  }
  return { reply: String(text || "").slice(0, 1200), rom: "", translation: "", correction: "" };
}
app.post("/api/chat", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "La conversation IA n'est pas encore activée." });
  if (rateLimited("chat:" + req.userId, 30, 5 * 60 * 1000)) return res.status(429).json({ error: "Doucement ! Réessaie dans quelques minutes." });
  const body = req.body || {};
  const lang = String(body.lang || "");
  const level = LEVELS.includes(body.level) ? body.level : "A2";
  const scenario = hasOwn(AI_SCENARIOS, body.scenario) ? body.scenario : "free";
  if (!hasOwn(LANG_META, lang)) return res.status(400).json({ error: "Langue inconnue." });
  const raw = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
  const messages = [];
  for (const m of raw) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return res.status(400).json({ error: "Message invalide." });
    const content = m.content.trim().slice(0, 500);
    if (!content) continue;
    if (messages.length && messages[messages.length - 1].role === m.role) messages[messages.length - 1].content += "\n" + content;
    else messages.push({ role: m.role, content });
  }
  // Papote speaks first: the API wants a user turn first, so the opening is
  // represented by the "[start]" marker the system prompt explains.
  if (!messages.length || messages[0].role !== "user") messages.unshift({ role: "user", content: "[start]" });
  if (messages[messages.length - 1].role !== "user") return res.status(400).json({ error: "Message invalide." });
  try {
    const access = await accessFor(req.userId);
    if (!access) return res.status(401).json({ error: "Session invalide." });
    if ((level === "C1" || level === "C2") && access.features["premium:levels-c"]) return res.status(403).json({ error: "Niveaux C réservés à Premium." });
    const q = await aiQuota(req.userId, access.unlocked);
    if (q.left <= 0) return res.status(429).json({ error: "quota", ...q });
    const base = access.user.base_lang && LANG_META[access.user.base_lang] ? access.user.base_lang : "fr";
    const target = LANG_META[lang].name, baseName = LANG_META[base].name;
    const system =
      `You are Papote, a warm and playful cat who is a language tutor. You are having a spoken-style conversation in ${target} (language code "${lang}") ` +
      `with a learner whose own language is ${baseName} ("${base}"). Learner level: ${level} — use ${LEVEL_STYLE[level]}. Scenario: ${AI_SCENARIOS[scenario]}.\n` +
      "Rules: always answer in the target language, 1 to 3 sentences, and end with a question that keeps the conversation going. " +
      "Stay in the scenario, stay kind and encouraging, never produce unsafe or adult content; if the learner goes off-topic in a harmful way, gently steer back. " +
      'If the learner\'s message is "[start]", open the conversation yourself.\n' +
      "Reply ONLY with a JSON object, no prose around it: " +
      `{"reply": "<your answer in ${target}>", "rom": "<romanization of reply if ${target} is not written in Latin script, else empty>", ` +
      `"translation": "<translation of your reply in ${baseName}>", ` +
      `"correction": "<if the learner's last message had mistakes: the corrected sentence in ${target} followed by a one-sentence explanation in ${baseName}; else empty>"}`;
    const r = await fetch(AI_API_URL, {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: AI_MODEL, max_tokens: 600, system, messages }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) {
      console.error(`chat: AI provider error ${r.status}`);
      return res.status(502).json({ error: "Le partenaire de conversation ne répond pas. Réessaie." });
    }
    const j = await r.json();
    const text = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
    await pool.query(
      `INSERT INTO ai_usage (user_id, day, count) VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (user_id, day) DO UPDATE SET count = ai_usage.count + 1`, [req.userId]
    );
    track("chat_msg", lang, req.userId);
    return res.json({ ...parseAiJson(text), left: q.left - 1, limit: q.limit });
  } catch (err) {
    console.error("chat error:", err.name === "TimeoutError" ? "timeout" : err);
    return res.status(502).json({ error: "Le partenaire de conversation ne répond pas. Réessaie." });
  }
});

// ---- Friends & weekly challenge ------------------------------------------------
// Each account has an 8-character friend code; adding a code makes both people
// friends. The leaderboard shows display names and this week's XP only (never
// emails). Weekly XP = sum of the per-day XP stored in each language's progress.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
async function friendCode(uid) {
  const r = await pool.query("SELECT friend_code FROM users WHERE id = $1", [uid]);
  if (r.rows[0] && r.rows[0].friend_code) return r.rows[0].friend_code;
  for (let i = 0; i < 5; i++) {
    const code = Array.from(crypto.randomBytes(8), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
    try {
      const u = await pool.query("UPDATE users SET friend_code = $1 WHERE id = $2 AND friend_code IS NULL RETURNING friend_code", [code, uid]);
      if (u.rows[0]) return u.rows[0].friend_code;
      return (await pool.query("SELECT friend_code FROM users WHERE id = $1", [uid])).rows[0].friend_code;
    } catch (e) { if (e.code !== "23505") throw e; }
  }
  throw new Error("could not allocate a friend code");
}
function weekDays(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monday = new Date(d); monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(monday); x.setUTCDate(monday.getUTCDate() + i); return x.toISOString().slice(0, 10); });
}
app.get("/api/friends", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  try {
    const code = await friendCode(req.userId);
    const f = await pool.query("SELECT friend_id FROM friends WHERE user_id = $1", [req.userId]);
    const ids = [req.userId, ...f.rows.map((r) => r.friend_id)];
    const users = await pool.query("SELECT id, name FROM users WHERE id = ANY($1::int[])", [ids]);
    const xp = await pool.query(
      `SELECT p.user_id, COALESCE(SUM(CASE WHEN jsonb_typeof(d.value->'xp') = 'number' THEN (d.value->>'xp')::numeric ELSE 0 END), 0)::int AS xp
       FROM user_progress p
       CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(p.data->'days') = 'object' THEN p.data->'days' ELSE '{}'::jsonb END) d
       WHERE p.user_id = ANY($1::int[]) AND d.key = ANY($2::text[]) GROUP BY p.user_id`,
      [ids, weekDays()]
    );
    const xpBy = new Map(xp.rows.map((r) => [r.user_id, r.xp]));
    const refs = await pool.query("SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE referral_rewarded)::int AS rewarded FROM users WHERE referred_by = $1", [req.userId]);
    const board = users.rows.map((u) => ({
      id: u.id, me: u.id === req.userId, name: u.name || "Papote #" + String(u.id).padStart(4, "0"), xp: xpBy.get(u.id) || 0,
    })).sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
    return res.json({ code, link: `${APP_URL}/?ref=${code}`, board, invited: refs.rows[0].n, rewarded: refs.rows[0].rewarded, referralDays: REFERRAL_DAYS, week: weekDays()[0] });
  } catch (err) {
    console.error("friends error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});
app.post("/api/friends", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  if (rateLimited("friend-add:" + req.userId, 20, 15 * 60 * 1000)) return res.status(429).json({ error: "Trop de tentatives." });
  const code = String((req.body && req.body.code) || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^[A-Z0-9]{8}$/.test(code)) return res.status(400).json({ error: "Code invalide." });
  try {
    const r = await pool.query("SELECT id FROM users WHERE friend_code = $1", [code]);
    if (!r.rows[0]) return res.status(404).json({ error: "Aucun compte avec ce code." });
    if (r.rows[0].id === req.userId) return res.status(400).json({ error: "C'est ton propre code 😺" });
    const n = await pool.query("SELECT COUNT(*)::int AS n FROM friends WHERE user_id = $1", [req.userId]);
    if (n.rows[0].n >= 100) return res.status(400).json({ error: "100 amis au maximum." });
    await pool.query("INSERT INTO friends (user_id, friend_id) VALUES ($1, $2), ($2, $1) ON CONFLICT DO NOTHING", [req.userId, r.rows[0].id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("friend add error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});
app.delete("/api/friends/:id", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Requête invalide." });
  await pool.query("DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)", [req.userId, id]);
  return res.json({ ok: true });
});

// ---- Subscription page: price and the limits of the free plan ----
app.get("/api/plan", async (req, res) => {
  let price = null;
  try { price = await stripeLib.getPrice(); } catch (err) { console.error("plan price error:", err.message); }
  return res.json({
    price,
    free: { lessonsPerDay: 3, reviewsPerDay: 20, customWords: 20, aiPerDay: AI_DAILY_FREE, levels: ["A1", "A2", "B1", "B2"] },
    premium: { aiPerDay: AI_DAILY_PREMIUM, referralDays: REFERRAL_DAYS },
    languages: Object.keys(LANG_META).length,
  });
});

// ---- daily practice reminders (opt-in) ----
function validTimeZone(tz) {
  if (typeof tz !== "string" || tz.length > 64 || !/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(tz)) return false;
  try { new Intl.DateTimeFormat("en-GB", { timeZone: tz }); return true; } catch (e) { return false; }
}
function localParts(tz, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (t) => (parts.find((p) => p.type === t) || {}).value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: parseInt(get("hour"), 10) };
}
// Unsubscribe links are signed (no login needed from the mail client).
function unsubToken(uid) {
  return crypto.createHmac("sha256", JWT_SECRET).update("reminder-unsub:" + uid).digest("base64url").slice(0, 32);
}
function unsubOk(uid, token) {
  const a = Buffer.from(String(token || "")), b = Buffer.from(unsubToken(uid));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.put("/api/reminders", async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Connecte-toi d'abord." });
  if (rateLimited("reminders:" + req.userId, 30, 15 * 60 * 1000)) return res.status(429).json({ error: "Trop de requêtes." });
  const body = req.body || {};
  const enabled = body.enabled === true;
  const hour = Number.isInteger(body.hour) && body.hour >= 0 && body.hour <= 23 ? body.hour : null;
  if (hour === null) return res.status(400).json({ error: "Heure invalide." });
  if (!validTimeZone(body.tz)) return res.status(400).json({ error: "Fuseau horaire invalide." });
  try {
    await pool.query("UPDATE users SET reminder_enabled = $1, reminder_hour = $2, reminder_tz = $3 WHERE id = $4", [enabled, hour, body.tz, req.userId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("reminders error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET from the link in the email, POST from mail clients' one-click
// unsubscribe (RFC 8058, List-Unsubscribe-Post).
async function handleUnsubscribe(req, res) {
  const uid = parseInt(req.query.u, 10);
  if (!Number.isInteger(uid) || !unsubOk(uid, req.query.t)) return res.status(400).type("text/plain").send("Lien invalide.");
  try {
    await pool.query("UPDATE users SET reminder_enabled = FALSE WHERE id = $1", [uid]);
  } catch (err) {
    console.error("unsubscribe error:", err);
    return res.status(500).type("text/plain").send("Erreur serveur.");
  }
  if (req.method === "POST") return res.json({ ok: true });
  res.type("html").send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Papote</title></head>
<body style="font-family:system-ui,sans-serif;max-width:480px;margin:15vh auto;padding:0 16px;text-align:center">
<h1 style="font-size:22px">🐱 C'est noté.</h1><p>Tu ne recevras plus de rappels quotidiens. Tu peux les réactiver à tout moment dans ton profil.</p>
<p lang="en" style="color:#8a8a8e">Done — you won't get daily reminders anymore.</p><p><a href="/">Papote</a></p></body></html>`);
}
app.get("/api/reminders/unsubscribe", handleUnsubscribe);
app.post("/api/reminders/unsubscribe", handleUnsubscribe);

// One pass over the accounts that opted in: whoever reached their reminder hour
// (within a 3-hour window, to survive a sleeping free-tier instance), hasn't
// practised yet today (local date) and wasn't reminded today gets one email.
async function sendDueReminders(now = new Date()) {
  const users = await pool.query(
    `SELECT u.id, u.email, u.name, u.base_lang, u.reminder_hour, u.reminder_tz, u.reminder_last,
            p.lang, p.data, p.updated_at
     FROM users u
     LEFT JOIN LATERAL (SELECT lang, data, updated_at FROM user_progress WHERE user_id = u.id ORDER BY updated_at DESC LIMIT 1) p ON TRUE
     WHERE u.reminder_enabled AND u.email_verified`
  );
  let sent = 0;
  for (const u of users.rows) {
    const tz = validTimeZone(u.reminder_tz) ? u.reminder_tz : "Europe/Paris";
    const local = localParts(tz, now);
    if (local.hour < u.reminder_hour || local.hour >= u.reminder_hour + 3) continue;
    if (u.reminder_last === local.date) continue;
    if (u.updated_at && localParts(tz, new Date(u.updated_at)).date === local.date) continue; // already practised today
    let streak = 0, due = 0;
    const data = u.data && typeof u.data === "object" ? u.data : null;
    if (data) {
      if (data.streak && Number.isInteger(data.streak.count)) streak = data.streak.count;
      if (data.srs && typeof data.srs === "object") due = Object.values(data.srs).filter((x) => x && x.due <= now.getTime()).length;
    }
    const lang = u.base_lang === "fr" ? "fr" : "en";
    const langName = u.lang && LANG_META[u.lang] ? LANG_META[u.lang].name : "Papote";
    const unsubLink = `${APP_URL}/api/reminders/unsubscribe?u=${u.id}&t=${unsubToken(u.id)}`;
    // Mark first: a failed send is skipped for the day rather than retried every 10 minutes.
    await pool.query("UPDATE users SET reminder_last = $1 WHERE id = $2", [local.date, u.id]);
    const r = await sendEmail({
      to: u.email,
      subject: lang === "fr" ? (streak > 1 ? `🔥 ${streak} jours de suite — on continue ?` : "🐱 Ta leçon du jour t'attend") : (streak > 1 ? `🔥 ${streak}-day streak — keep it going?` : "🐱 Your daily lesson is waiting"),
      html: reminderEmailHtml({ lang, name: u.name, streak, due, langName, appLink: APP_URL + "/", unsubLink }),
      headers: { "List-Unsubscribe": `<${unsubLink}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (!r || r.ok !== false) sent++;
  }
  return sent;
}
app.post("/api/internal/send-reminders", async (req, res) => {
  const given = Buffer.from(String(req.headers["x-digest-secret"] || ""));
  const expected = Buffer.from(DIGEST_CRON_SECRET);
  if (!DIGEST_CRON_SECRET || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return res.status(403).json({ error: "Non autorisé." });
  }
  try {
    return res.json({ ok: true, sent: await sendDueReminders() });
  } catch (err) {
    console.error("send-reminders error:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});
setInterval(() => {
  sendDueReminders().catch((err) => console.error("scheduled reminders error:", err));
}, 10 * 60 * 1000).unref();

// ---- gate: serve the app only to authenticated users, else the login page ----
app.get("/", (req, res) => {
  if (req.userId) {
    sendHtml(res, "app.html");
  } else {
    sendHtml(res, "login.html");
  }
});

app.get("/reset-password", (req, res) => {
  sendHtml(res, "reset-password.html");
});

app.get("/ideas", (req, res) => {
  if (!req.userId) return res.redirect("/");
  sendHtml(res, "ideas.html");
});

app.get("/profile", (req, res) => {
  if (!req.userId) return res.redirect("/");
  sendHtml(res, "profile.html");
});

app.get("/subscribe", (req, res) => {
  if (!req.userId) return res.redirect("/");
  sendHtml(res, "subscribe.html");
});

app.get("/admin", async (req, res) => {
  if (!req.userId) return res.redirect("/");
  const result = await pool.query("SELECT is_admin FROM users WHERE id = $1", [req.userId]);
  if (!result.rows[0] || !result.rows[0].is_admin) return res.redirect("/");
  sendHtml(res, "admin.html");
});

app.get("/healthz", (req, res) => res.status(200).send("ok"));
// No favicon file: answer the browser's automatic request with 204 instead of a
// 404 that shows up as a console error on every page load.
app.get("/favicon.ico", (req, res) => {
  if (!brandInfo().icons) return res.status(204).end();
  res.sendFile(path.join(BRAND_DIR, "favicon-32.png"));
});
app.get("/manifest.webmanifest", (req, res) => {
  res.type("application/manifest+json").json({
    name: "Papote", short_name: "Papote", start_url: "/", display: "standalone",
    background_color: "#ffffff", theme_color: "#4f46e5",
    icons: brandInfo().icons ? [
      { src: "/design-system/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/design-system/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ] : [],
  });
});

// Unknown API routes answer JSON, not an HTML page.
app.use("/api", (req, res) => res.status(404).json({ error: "Introuvable." }));

// Last-resort error handler: never leaks stack traces or SQL details to clients.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && (err.type === "entity.parse.failed" || err.type === "entity.too.large")) {
    return res.status(err.status || 400).json({ error: "Requête invalide." });
  }
  console.error(`unhandled error on ${req.method} ${req.path}:`, err && err.message);
  logError("server", err && err.message, err && err.stack, req.path, "");
  if (res.headersSent) return;
  res.status(500).json({ error: "Erreur serveur." });
});

process.on("unhandledRejection", (err) => {
  console.error("unhandled rejection:", err && err.message);
  if (pool) logError("server", "unhandledRejection: " + (err && err.message), err && err.stack, "", "");
});

createPool()
  .then((p) => {
    pool = p;
    console.log(`[db] TLS: ${DB_TLS.mode} (${DB_TLS.note})`);
    return initDb();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`langues-app listening on port ${PORT}`);
      logEmailConfig();
      if (!ADMIN_EMAIL) console.warn("[config] ADMIN_EMAIL is not set: set it in Render -> Environment.");
      checkStripeWebhook().catch((err) => console.warn("[stripe] webhook check failed:", err.message));
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
