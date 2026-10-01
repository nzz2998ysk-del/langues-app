// Transactional email helper. Two ways to send, chosen from the environment
// variables ONLY (never commit a password or key; on Render: service ->
// Environment). See .env.example and the README.
//
// 1) Gmail (simplest, no domain needed) — used when both are set:
//   GMAIL_USER          - the dedicated Gmail address, e.g. papote.app@gmail.com
//   GMAIL_APP_PASSWORD  - a Google "app password" (16 letters, Google account ->
//                         Security -> 2-Step Verification -> App passwords). NOT the
//                         normal Gmail password. Spaces are ignored.
//   Optional: SMTP_HOST / SMTP_PORT to use another SMTP provider with the same
//   two variables as login (defaults: smtp.gmail.com, 465).
//
// 2) Resend (own domain, best deliverability):
//   RESEND_API_KEY  - created in the Resend dashboard (API Keys).
//   EMAIL_FROM      - sender, e.g. "Papote <no-reply@ton-domaine.com>". The
//                     domain must be verified in Resend (Domains -> DNS records
//                     SPF/DKIM). Without it, Resend's shared test sender is used,
//                     which only delivers to the Resend account owner.
//
// Without either, sendEmail() logs a warning and resolves { skipped: true }
// instead of throwing, so signup, password reset and payments keep working.

const GMAIL_USER = (process.env.GMAIL_USER || "").trim();
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
const SMTP_HOST = (process.env.SMTP_HOST || "").trim() || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 465;
const USE_SMTP = Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);

const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
const RESEND_TEST_SENDER = "Papote <onboarding@resend.dev>";
// With Gmail the sender must be the Gmail account itself (Gmail rewrites any
// other address); only the display name is ours.
const EMAIL_FROM = USE_SMTP
  ? `Papote <${GMAIL_USER}>`
  : (process.env.EMAIL_FROM || "").trim() || RESEND_TEST_SENDER;
const SEND_TIMEOUT_MS = 10000;

// "Name <addr@domain>" or a bare "addr@domain".
const FROM_RE = /^(?:[^<>]*<\s*[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+\s*>|[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)$/;

function emailProvider() {
  if (USE_SMTP) return "smtp";
  if (RESEND_API_KEY) return "resend";
  return "";
}

// Called once at startup (server.js) so a misconfiguration shows up in the
// Render logs immediately, not at the first signup. Never prints secrets.
function logEmailConfig() {
  if (USE_SMTP) {
    if (!FROM_RE.test(EMAIL_FROM)) console.warn(`[email] GMAIL_USER looks malformed ("${GMAIL_USER}") - expected an address like papote.app@gmail.com.`);
    else console.log(`[email] SMTP (${SMTP_HOST}:${SMTP_PORT}) configured, sending as ${EMAIL_FROM}`);
    return;
  }
  if (GMAIL_USER || process.env.GMAIL_APP_PASSWORD) {
    console.warn("[email] GMAIL_USER and GMAIL_APP_PASSWORD must both be set to send with Gmail.");
  }
  if (!RESEND_API_KEY) {
    console.warn("[email] no email provider set (GMAIL_USER + GMAIL_APP_PASSWORD, or RESEND_API_KEY) - transactional emails (welcome, password reset, invoice, digest) will be skipped.");
    return;
  }
  if (!FROM_RE.test(EMAIL_FROM)) {
    console.warn(`[email] EMAIL_FROM looks malformed ("${EMAIL_FROM}") - expected "Name <no-reply@domain>"; Resend will reject sends.`);
  } else if (EMAIL_FROM === RESEND_TEST_SENDER) {
    console.warn("[email] EMAIL_FROM not set - using Resend's test sender (onboarding@resend.dev), which only delivers to the Resend account owner. Set EMAIL_FROM to an address on your verified domain.");
  } else {
    console.log(`[email] Resend configured, sending as ${EMAIL_FROM}`);
  }
}

// User-supplied values (name, email, free-text suggestions) are interpolated into
// these HTML email bodies below. Escape them so a crafted value (e.g. a name
// containing "<img onerror=...>") can't inject markup/script into the email.
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

async function postToResend(payload) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  const body = await res.text().catch(() => "");
  return { status: res.status, ok: res.ok, body };
}

let transport = null;
function smtpTransport() {
  if (!transport) {
    // Loaded lazily: an install without nodemailer still runs with Resend.
    const nodemailer = require("nodemailer");
    transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      connectionTimeout: SEND_TIMEOUT_MS,
      greetingTimeout: SEND_TIMEOUT_MS,
      socketTimeout: SEND_TIMEOUT_MS,
    });
  }
  return transport;
}

async function sendWithSmtp({ to, subject, html, headers }) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const info = await smtpTransport().sendMail({ from: EMAIL_FROM, to, subject, html, headers: headers || undefined });
      console.log(`[email] sent "${subject}" to ${maskEmail(to)} via SMTP`);
      return { ok: true, id: info.messageId || "" };
    } catch (err) {
      // 535 = wrong user / app password: a configuration error, not retried.
      const auth = err.responseCode === 535 || err.code === "EAUTH";
      console.error(`[email] SMTP send failed (attempt ${attempt}): ${err.message}${auth ? " - check GMAIL_USER and GMAIL_APP_PASSWORD (an app password, not the Gmail password)" : ""}`);
      if (auth || attempt === 2) return { ok: false };
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return { ok: false };
}

// Never throws: callers fire-and-forget it from request handlers, and an email
// problem must never turn a successful signup/reset into an error for the user.
async function sendEmail({ to, subject, html, headers }) {
  if (USE_SMTP) return sendWithSmtp({ to, subject, html, headers });
  if (!RESEND_API_KEY) {
    console.warn(`[email] no email provider set - skipping email to ${maskEmail(to)} ("${subject}")`);
    return { skipped: true };
  }
  const payload = { from: EMAIL_FROM, to: [to], subject, html };
  if (headers) payload.headers = headers;
  // One retry for transient failures (network error/timeout, 429, 5xx); 4xx
  // configuration errors (bad key, unverified domain) are not retried.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await postToResend(payload);
      if (r.ok) {
        let id = "";
        try { id = JSON.parse(r.body).id || ""; } catch (e) {}
        console.log(`[email] sent "${subject}" to ${maskEmail(to)}${id ? ` (id ${id})` : ""}`);
        return { ok: true, id };
      }
      const transient = r.status === 429 || r.status >= 500;
      console.error(`[email] Resend API error ${r.status} (attempt ${attempt}): ${r.body}`);
      if (!transient || attempt === 2) return { ok: false, status: r.status };
    } catch (err) {
      console.error(`[email] send failed (attempt ${attempt}): ${err.message}`);
      if (attempt === 2) return { ok: false };
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return { ok: false };
}

// Email palette = literal values of design-system/ios27-liquid-glass.css tokens
// (email clients can't load stylesheets or CSS variables).
const C = {
  accent: "#0060c0",      // --ig27-blue (light)
  label: "#000000",       // --ig27-label-primary
  secondary: "#6b6b70",   // --ig27-label-secondary rgba(60,60,67,.76) flattened on white
  separator: "#e5e5ea",   // --ig27-gray5
  font: "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif",
};

// Logs never contain full email addresses (personal data).
function maskEmail(to) {
  const [u, d] = String(to || "").split("@");
  return d ? `${u.slice(0, 2)}***@${d}` : "***";
}

function welcomeEmailHtml(name, verifyLink) {
  const hello = name ? `Bienvenue ${escapeHtml(name)} !` : "Bienvenue !";
  const verify = verifyLink
    ? `
    <p style="margin:24px 0">
      <a href="${escapeHtml(verifyLink)}" style="display:inline-block;background:${C.accent};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px">Confirmer mon adresse email</a>
    </p>
    <p style="color:${C.secondary};font-size:13px;line-height:1.5">Ce lien est valable 7 jours.</p>`
    : "";
  return `
  <div style="font-family:${C.font};max-width:520px;margin:0 auto;padding:24px">
    <h1 style="color:${C.accent};font-size:22px">${hello}</h1>
    <p style="color:${C.label};font-size:15px;line-height:1.6">
      Ton compte sur <strong>Papote</strong> vient d'être créé. Les 39 langues sont
      accessibles gratuitement du niveau A1 au B2 (vocabulaire, grammaire, conjugaison,
      lecture, écoute, exercices) : choisis-en une sur l'accueil et commence dès maintenant.
      L'abonnement Premium débloque en plus les niveaux C1/C2, les leçons illimitées,
      la révision avancée, les certificats et bien plus.
    </p>${verify}
    <p style="color:${C.secondary};font-size:13px;margin-top:28px">
      Cet email a été envoyé automatiquement suite à la création de ton compte.
    </p>
  </div>`;
}

function invoiceEmailHtml({ invoiceNumber, date, amount, currency, email, businessName }) {
  const amountStr = (amount / 100).toFixed(2).replace(".", ",") + " " + currency.toUpperCase();
  return `
  <div style="font-family:${C.font};max-width:560px;margin:0 auto;padding:24px">
    <h1 style="color:${C.accent};font-size:20px">Facture ${invoiceNumber}</h1>
    <p style="color:${C.label};font-size:15px">Merci pour ton paiement !</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;color:${C.label}">
      <tr><td style="padding:8px 0;border-bottom:1px solid ${C.separator}">Date</td><td style="padding:8px 0;border-bottom:1px solid ${C.separator};text-align:right">${date}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid ${C.separator}">Client</td><td style="padding:8px 0;border-bottom:1px solid ${C.separator};text-align:right">${escapeHtml(email)}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid ${C.separator}">Abonnement premium - Papote</td><td style="padding:8px 0;border-bottom:1px solid ${C.separator};text-align:right">${amountStr}</td></tr>
      <tr><td style="padding:10px 0;font-weight:700">Total</td><td style="padding:10px 0;text-align:right;font-weight:700">${amountStr}</td></tr>
    </table>
    <p style="color:${C.secondary};font-size:12px;margin-top:24px">
      Émis par ${escapeHtml(businessName || "Papote")}. Conserve cet email comme justificatif de paiement.
    </p>
  </div>`;
}

function suggestionsDigestHtml(suggestions) {
  const rows = suggestions.map((s) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid ${C.separator};font-size:13px;color:${C.secondary};white-space:nowrap;vertical-align:top">${escapeHtml(new Date(s.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }))}</td>
      <td style="padding:10px 8px;border-bottom:1px solid ${C.separator};font-size:13px;color:${C.label};vertical-align:top">${escapeHtml(s.user_email || "anonyme")}</td>
      <td style="padding:10px 8px;border-bottom:1px solid ${C.separator};font-size:14px;color:${C.label};white-space:pre-wrap">${s.category ? `<b>[${escapeHtml(s.category)}]</b> ` : ""}${escapeHtml(s.message)}</td>
    </tr>`).join("");
  return `
  <div style="font-family:${C.font};max-width:640px;margin:0 auto;padding:24px">
    <h1 style="color:${C.accent};font-size:20px">💡 Boîte à idées — ${suggestions.length} suggestion${suggestions.length > 1 ? "s" : ""} aujourd'hui</h1>
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      <tr style="text-align:left"><th style="font-size:12px;color:${C.secondary};padding:0 8px 8px">Date</th><th style="font-size:12px;color:${C.secondary};padding:0 8px 8px">Compte</th><th style="font-size:12px;color:${C.secondary};padding:0 8px 8px">Message</th></tr>
      ${rows}
    </table>
    <p style="color:${C.secondary};font-size:12px;margin-top:24px">Récapitulatif automatique quotidien envoyé par Papote.</p>
  </div>`;
}

function resetPasswordEmailHtml(resetLink) {
  const safeLink = escapeHtml(resetLink);
  return `
  <div style="font-family:${C.font};max-width:520px;margin:0 auto;padding:24px">
    <h1 style="color:${C.accent};font-size:22px">Réinitialise ton mot de passe</h1>
    <p style="color:${C.label};font-size:15px;line-height:1.6">
      Tu as demandé à réinitialiser le mot de passe de ton compte sur <strong>Papote</strong>.
      Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable 1 heure.
    </p>
    <p style="margin:28px 0">
      <a href="${safeLink}" style="background:${C.accent};color:#ffffff;text-decoration:none;font-weight:700;
        font-size:14.5px;padding:14px 24px;border-radius:999px;display:inline-block">Choisir un nouveau mot de passe</a>
    </p>
    <p style="color:${C.secondary};font-size:12.5px;line-height:1.6">
      Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br>
      <span style="word-break:break-all">${safeLink}</span>
    </p>
    <p style="color:${C.secondary};font-size:13px;margin-top:24px">
      Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email sans risque :
      ton mot de passe actuel reste inchangé tant que tu ne cliques pas sur le lien.
    </p>
  </div>`;
}

// Daily practice reminder (opt-in from the profile). French or English copy
// depending on the account's base language; always carries an unsubscribe link.
function reminderEmailHtml({ lang, name, streak, due, langName, appLink, unsubLink }) {
  const fr = lang === "fr";
  const hi = name ? (fr ? `Coucou ${escapeHtml(name)} !` : `Hi ${escapeHtml(name)}!`) : (fr ? "Coucou !" : "Hi!");
  const streakLine = streak > 1
    ? (fr ? `Ta série de <strong>${streak} jours</strong> t'attend : 5 minutes suffisent pour la garder.` : `Your <strong>${streak}-day streak</strong> is waiting: 5 minutes are enough to keep it.`)
    : (fr ? "5 minutes aujourd'hui, et ta mémoire te dira merci." : "5 minutes today and your memory will thank you.");
  const dueLine = due > 0
    ? (fr ? `<strong>${due} mot${due > 1 ? "s" : ""}</strong> à réviser en ${escapeHtml(langName)}.` : `<strong>${due} word${due > 1 ? "s" : ""}</strong> to review in ${escapeHtml(langName)}.`)
    : (fr ? `Ta leçon du jour en ${escapeHtml(langName)} est prête.` : `Your daily ${escapeHtml(langName)} lesson is ready.`);
  return `
  <div style="font-family:${C.font};max-width:520px;margin:0 auto;padding:24px">
    <h1 style="color:${C.accent};font-size:22px">${hi} 🐱</h1>
    <p style="color:${C.label};font-size:15px;line-height:1.6">${streakLine}<br>${dueLine}</p>
    <p style="margin:24px 0">
      <a href="${escapeHtml(appLink)}" style="display:inline-block;background:${C.accent};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px">${fr ? "Faire ma leçon du jour" : "Do today's lesson"}</a>
    </p>
    <p style="color:${C.secondary};font-size:12px;margin-top:28px">
      ${fr ? "Tu reçois ce rappel parce que tu l'as activé dans ton profil Papote." : "You get this reminder because you turned it on in your Papote profile."}
      <a href="${escapeHtml(unsubLink)}" style="color:${C.secondary}">${fr ? "Ne plus recevoir de rappels" : "Stop reminders"}</a>
    </p>
  </div>`;
}

module.exports = {
  sendEmail,
  emailProvider,
  logEmailConfig,
  welcomeEmailHtml,
  invoiceEmailHtml,
  suggestionsDigestHtml,
  resetPasswordEmailHtml,
  reminderEmailHtml,
  escapeHtml,
};
