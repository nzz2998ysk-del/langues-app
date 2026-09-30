// Security regression tests: start the real server against a throwaway
// PostgreSQL database and attack it over HTTP.
//
//   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/langues_test npm test
//
// The database is wiped (all tables dropped) before the run: never point this
// at real data. Without TEST_DATABASE_URL the suite is skipped.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const path = require("node:path");
const { Pool } = require("pg");

const DB = process.env.TEST_DATABASE_URL;
const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const ADMIN = "admin-test@example.com";
const PW = "correct-horse-battery";
const WHSEC = "whsec_test_" + crypto.randomBytes(8).toString("hex");
let server, pool;

function stripeEvent(event) {
  const body = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac("sha256", WHSEC).update(`${t}.${body}`).digest("hex");
  return fetch(BASE + "/api/webhooks/stripe", { method: "POST", headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${sig}` }, body });
}

// Minimal cookie-aware client.
function client() {
  let cookie = "";
  return async function req(method, url, body, headers = {}) {
    const res = await fetch(BASE + url, {
      method,
      redirect: "manual",
      headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0].endsWith("=") ? "" : set.split(";")[0];
    let json = null;
    const text = await res.text();
    try { json = JSON.parse(text); } catch (e) { /* not JSON */ }
    return { status: res.status, headers: res.headers, json, text, cookie: () => cookie };
  };
}
async function signup(email, password = PW) {
  const c = client();
  // Distinct client address per signup, so the per-IP signup rate limit does not
  // interfere (the server trusts one proxy hop, like behind Render).
  const ip = `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  const r = await c("POST", "/api/signup", { email, password, name: "Test" }, { "x-forwarded-for": ip });
  assert.equal(r.status, 201, r.text);
  return c;
}

const skip = !DB && "TEST_DATABASE_URL not set";

before(async () => {
  if (skip) return;
  pool = new Pool({ connectionString: DB });
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  server = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    env: { ...process.env, PORT: String(PORT), DATABASE_URL: DB, JWT_SECRET: "test-secret-" + crypto.randomBytes(8).toString("hex"), ADMIN_EMAIL: ADMIN, NODE_ENV: "test", RESEND_API_KEY: "", STRIPE_WEBHOOK_SECRET: WHSEC },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("server did not start")), 60000);
    server.stdout.on("data", (d) => { if (String(d).includes("listening")) { clearTimeout(t); resolve(); } });
    server.on("exit", (code) => reject(new Error("server exited " + code)));
  });
});
after(async () => {
  if (server) server.kill();
  if (pool) await pool.end();
});

test("security headers are set", { skip }, async () => {
  const r = await client()("GET", "/");
  assert.match(r.headers.get("content-security-policy") || "", /default-src 'self'/);
  assert.equal(r.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-powered-by"), null);
});

test("API answers are never cached and 404s are JSON", { skip }, async () => {
  const r = await client()("GET", "/api/does-not-exist");
  assert.equal(r.status, 404);
  assert.ok(r.json && r.json.error);
  assert.equal(r.headers.get("cache-control"), "no-store");
});

test("malformed JSON gets a JSON 400 without stack trace", { skip }, async () => {
  const r = await client()("POST", "/api/login", "{not json");
  assert.equal(r.status, 400);
  assert.ok(r.json && r.json.error);
  assert.doesNotMatch(r.text, /at .*\.js:\d+/);
});

test("protected routes require a session", { skip }, async () => {
  const c = client();
  for (const [m, u] of [["GET", "/api/course/fr"], ["GET", "/api/progress/fr"], ["GET", "/api/account/export"], ["GET", "/api/admin/users"], ["GET", "/api/admin/suggestions"], ["GET", "/api/admin/audit"], ["POST", "/api/suggestions"]]) {
    const r = await c(m, u, m === "GET" ? undefined : {});
    assert.equal(r.status, 401, `${m} ${u} -> ${r.status}`);
  }
});

test("new passwords need at least 8 characters", { skip }, async () => {
  const r = await client()("POST", "/api/signup", { email: "short@example.com", password: "1234567" });
  assert.equal(r.status, 400);
});

test("signing up with ADMIN_EMAIL does not grant admin until the address is verified", { skip }, async () => {
  const c = await signup(ADMIN);
  let r = await c("GET", "/api/admin/users");
  assert.equal(r.status, 403);
  r = await c("GET", "/api/me");
  assert.equal(r.json.isAdmin, false);
  assert.equal(r.json.emailVerified, false);
  // Logging in again does not help either.
  const c2 = client();
  await c2("POST", "/api/login", { email: ADMIN, password: PW });
  assert.equal((await c2("GET", "/api/admin/users")).status, 403);
  // Verification link (token set directly in the DB, as the email would carry it).
  const raw = crypto.randomBytes(32).toString("hex");
  await pool.query("UPDATE users SET verify_token_hash = $1, verify_token_expires = NOW() + interval '1 hour' WHERE email = $2",
    [crypto.createHash("sha256").update(raw).digest("hex"), ADMIN]);
  r = await client()("GET", "/api/verify-email?token=" + raw);
  assert.equal(r.status, 302);
  assert.equal((await c("GET", "/api/admin/users")).status, 200);
});

test("regular users cannot reach admin endpoints (privilege escalation)", { skip }, async () => {
  const c = await signup("user1@example.com");
  for (const [m, u, b] of [
    ["GET", "/api/admin/users"], ["GET", "/api/admin/features"], ["GET", "/api/admin/audit"],
    ["PATCH", "/api/admin/users/1", { subscribed: true }], ["PATCH", "/api/admin/features/premium:levels-c", { is_premium: false }],
    ["POST", "/api/admin/features/bulk", { all: true, is_premium: false }], ["PUT", "/api/admin/languages/fr", { status: "development" }],
    ["PUT", "/api/admin/suggestions/1", { status: "vue" }], ["PUT", "/api/admin/vocabulary/fr/c-hello", { level: "C2" }],
  ]) {
    const r = await c(m, u, b);
    assert.equal(r.status, 403, `${m} ${u} -> ${r.status}`);
  }
  const me = await c("GET", "/api/me");
  assert.equal(me.json.subscribed, false);
  assert.equal(me.json.isAdmin, false);
});

test("a forged or tampered session token is ignored", { skip }, async () => {
  // alg=none token claiming to be user 1 (the admin), no signature.
  const fake = [Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url"), Buffer.from(JSON.stringify({ uid: 1, email: ADMIN })).toString("base64url"), ""].join(".");
  const r = await fetch(BASE + "/api/admin/users", { headers: { cookie: "langues_session=" + fake } });
  assert.equal(r.status, 401);
});

test("free accounts never receive C1/C2 content (server-side premium)", { skip }, async () => {
  const c = await signup("free@example.com");
  const r = await c("GET", "/api/course/en");
  assert.equal(r.status, 200);
  const levels = new Set(r.json.course.words.map((w) => w.level));
  assert.ok(!levels.has("C1") && !levels.has("C2"), "C1/C2 words leaked to a free account");
  const v = await c("GET", "/api/vocabulary?lang=en&level=C1,C2");
  assert.equal(v.json.words.length, 0);
  // The raw content files are not publicly served.
  assert.equal((await c("GET", "/course/data/en.json")).status, 404);
});

test("prototype keys and unknown languages are rejected", { skip }, async () => {
  const c = await signup("proto@example.com");
  for (const code of ["constructor", "__proto__", "toString", "..%2Fserver", "xx"]) {
    const r = await c("GET", "/api/course/" + code);
    assert.equal(r.status, 404, code);
    const p = await c("PUT", "/api/progress/" + code, { data: { xp: 1 } });
    assert.equal(p.status, 404, code);
  }
  const prof = await c("PUT", "/api/profile", { baseLang: "constructor" });
  assert.equal(prof.status, 400);
  const v = await c("GET", "/api/vocabulary?lang=fr&sort=constructor");
  assert.equal(v.status, 200);
});

test("progress is private to each account", { skip }, async () => {
  const a = await signup("alice@example.com");
  const b = await signup("bob@example.com");
  await a("PUT", "/api/progress/de", { data: { xp: 42, secret: "alice" } });
  const r = await b("GET", "/api/progress/de");
  assert.equal(r.json.data, null);
});

test("SQL injection attempts in search parameters are inert", { skip }, async () => {
  const c = await signup("sqli@example.com");
  const r = await c("GET", "/api/vocabulary?lang=fr&q=" + encodeURIComponent("' OR 1=1; DROP TABLE users; --"));
  assert.equal(r.status, 200);
  const users = await pool.query("SELECT COUNT(*)::int AS n FROM users");
  assert.ok(users.rows[0].n > 0);
});

test("cross-site state-changing requests are refused (CSRF)", { skip }, async () => {
  const c = await signup("csrf@example.com");
  let r = await c("PUT", "/api/profile", { name: "pwned" }, { origin: "https://evil.example" });
  assert.equal(r.status, 403);
  r = await c("PUT", "/api/profile", { name: "pwned" }, { "sec-fetch-site": "cross-site" });
  assert.equal(r.status, 403);
  r = await c("PUT", "/api/profile", { name: "ok" }, { origin: BASE });
  assert.equal(r.status, 200);
});

test("stored ideas are kept verbatim for the admin (escaped at render time)", { skip }, async () => {
  const c = await signup("xss@example.com");
  const payload = '<img src=x onerror="alert(1)">';
  const r = await c("POST", "/api/suggestions", { message: payload, category: "<script>" });
  assert.equal(r.status, 201);
  const row = await pool.query("SELECT message, category FROM suggestions WHERE message = $1", [payload]);
  assert.equal(row.rows[0].category, "autre"); // unknown category is normalised
});

test("password reset revokes existing sessions", { skip }, async () => {
  const c = await signup("reset@example.com");
  assert.equal((await c("GET", "/api/me")).status, 200);
  const raw = crypto.randomBytes(32).toString("hex");
  await pool.query("UPDATE users SET reset_token_hash = $1, reset_token_expires = NOW() + interval '1 hour' WHERE email = 'reset@example.com'",
    [crypto.createHash("sha256").update(raw).digest("hex")]);
  const r = await client()("POST", "/api/reset-password", { token: raw, password: "a-brand-new-password" });
  assert.equal(r.status, 200);
  assert.equal((await c("GET", "/api/me")).status, 401);
});

test("log out everywhere revokes the session token", { skip }, async () => {
  const c = await signup("logoutall@example.com");
  const cookieBefore = (await c("GET", "/api/me")).cookie();
  assert.ok(cookieBefore);
  await c("POST", "/api/logout-all", {});
  const r = await fetch(BASE + "/api/me", { headers: { cookie: cookieBefore } });
  assert.equal(r.status, 401);
});

test("GDPR: export contains the account's data, deletion needs the password", { skip }, async () => {
  const c = await signup("gdpr@example.com");
  await c("PUT", "/api/progress/it", { data: { xp: 7 } });
  await c("POST", "/api/suggestions", { message: "Une idée pour tester", category: "autre" });
  const exp = await c("GET", "/api/account/export");
  assert.equal(exp.status, 200);
  assert.equal(exp.json.account.email, "gdpr@example.com");
  assert.equal(exp.json.progress.length, 1);
  assert.equal(exp.json.ideas.length, 1);
  assert.ok(!("password_hash" in exp.json.account));
  assert.equal((await c("DELETE", "/api/account", { password: "wrong-password" })).status, 403);
  assert.equal((await c("DELETE", "/api/account", { password: PW })).status, 200);
  const left = await pool.query(
    "SELECT (SELECT COUNT(*) FROM users WHERE email = 'gdpr@example.com')::int AS u, (SELECT COUNT(*) FROM suggestions WHERE message = 'Une idée pour tester')::int AS s");
  assert.deepEqual(left.rows[0], { u: 0, s: 0 });
});

test("admin actions are written to the audit trail", { skip }, async () => {
  const admin = client();
  await admin("POST", "/api/login", { email: ADMIN, password: PW });
  await signup("gift@example.com");
  const me = await pool.query("SELECT id FROM users WHERE email = 'gift@example.com'");
  const r = await admin("PATCH", "/api/admin/users/" + me.rows[0].id, { subscribed: true });
  assert.equal(r.status, 200);
  const log = await admin("GET", "/api/admin/audit");
  assert.ok(log.json.entries.some((e) => e.action === "user.premium" && e.target === String(me.rows[0].id)));
});

test("the Stripe webhook rejects unsigned events", { skip }, async () => {
  const r = await fetch(BASE + "/api/webhooks/stripe", {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=deadbeef" },
    body: JSON.stringify({ type: "checkout.session.completed", data: { object: { client_reference_id: "1", payment_status: "paid" } } }),
  });
  assert.equal(r.status, 400);
});

test("Premium follows the real Stripe subscription state", { skip }, async () => {
  await signup("payer@example.com");
  const id = (await pool.query("SELECT id FROM users WHERE email = 'payer@example.com'")).rows[0].id;
  const subscribed = async () => (await pool.query("SELECT subscribed FROM users WHERE id = $1", [id])).rows[0].subscribed;
  // An unpaid checkout does not grant anything.
  let r = await stripeEvent({ type: "checkout.session.completed", data: { object: { id: "cs_1", client_reference_id: String(id), payment_status: "unpaid" } } });
  assert.equal(r.status, 200);
  assert.equal(await subscribed(), false);
  // A paid one does, and remembers the subscription.
  r = await stripeEvent({ type: "checkout.session.completed", data: { object: { id: "cs_2", client_reference_id: String(id), payment_status: "paid", customer: "cus_1", subscription: "sub_1", amount_total: 500, currency: "eur" } } });
  assert.equal(r.status, 200);
  assert.equal(await subscribed(), true);
  // Cancellation withdraws Premium.
  r = await stripeEvent({ type: "customer.subscription.deleted", data: { object: { id: "sub_1", customer: "cus_1", status: "canceled" } } });
  assert.equal(r.status, 200);
  assert.equal(await subscribed(), false);
});

test("the digest trigger needs its secret", { skip }, async () => {
  const r = await fetch(BASE + "/api/internal/send-digest", { method: "POST", headers: { "x-digest-secret": "guess" } });
  assert.equal(r.status, 403);
});
