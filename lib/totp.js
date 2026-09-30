// Time-based one-time passwords (RFC 6238, HMAC-SHA1, 6 digits, 30 s) for the
// administrator's two-factor authentication — compatible with Google
// Authenticator, Apple Passwords, 1Password, Authy, etc. No dependency.
const crypto = require("crypto");

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP = 30;

function base32Encode(buf) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secretB32, counter) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", base32Decode(secretB32)).update(msg).digest();
  const off = h[h.length - 1] & 15;
  const code = ((h[off] & 127) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(code % 1e6).padStart(6, "0");
}

function newSecret() {
  return base32Encode(crypto.randomBytes(20));
}

// Returns the matching time step (to block replays) or -1. Accepts ±1 step of
// clock drift; `lastStep` rejects a code that was already used.
function verify(secretB32, code, lastStep = -1, now = Date.now()) {
  const c = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(c)) return -1;
  const step = Math.floor(now / 1000 / STEP);
  for (const s of [step, step - 1, step + 1]) {
    if (s <= lastStep) continue;
    const expected = Buffer.from(hotp(secretB32, s));
    if (crypto.timingSafeEqual(expected, Buffer.from(c))) return s;
  }
  return -1;
}

function otpauthUri(secretB32, account, issuer) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP}`;
}

// Secrets are stored encrypted (AES-256-GCM) with a key derived from
// TOTP_ENC_KEY (or JWT_SECRET): a database leak alone does not reveal them.
function keyFrom(material) {
  return crypto.createHash("sha256").update("papote-totp:" + material).digest();
}
function encrypt(plain, material) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", keyFrom(material), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}
function decrypt(blob, material) {
  const [iv, tag, enc] = String(blob).split(".").map((x) => Buffer.from(x, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", keyFrom(material), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

// One-time recovery codes (shown once, stored hashed).
function newRecoveryCodes(n = 8) {
  return Array.from({ length: n }, () => {
    const raw = crypto.randomBytes(5).toString("hex");
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}
function hashRecovery(code) {
  return crypto.createHash("sha256").update(String(code).trim().toLowerCase()).digest("hex");
}

module.exports = { newSecret, verify, hotp, otpauthUri, encrypt, decrypt, newRecoveryCodes, hashRecovery, base32Encode, STEP };
