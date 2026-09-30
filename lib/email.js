// Minimal transactional email helper using the Resend HTTP API (https://resend.com).
// No SDK dependency: Resend's API is a plain JSON POST, so we use Node's built-in fetch.
//
// Configuration — environment variables ONLY (never commit a key; on Render:
// service -> Environment). See .env.example and the README.
//   RESEND_API_KEY  - required to actually send anything. Created in the Resend
//                     dashboard (API Keys). Without it, sendEmail() logs a warning
//                     and resolves { skipped: true } instead of throwing, so signup,
//                     password reset and payments keep working before email is set up.
//   EMAIL_FROM      - sender, e.g. "Mes langues <no-reply@ton-domaine.com>". The
//                     domain must be verified in Resend (Domains -> add -> DNS records
//                     SPF/DKIM) or Resend rejects the send. Until then the fallback
//                     below is Resend's shared test sender, which can only deliver to
//                     the email address of the Resend account owner.

const RESEND_API_KEY = (process.env.RESEND_API_KEY || "").trim();
const RESEND_TEST_SENDER = "Mes langues <onboarding@resend.dev>";
const EMAIL_FROM = (process.env.EMAIL_FROM || "").trim() || RESEND_TEST_SENDER;
const SEND_TIMEOUT_MS = 10000;

// "Name <addr@domain>" or a bare "addr@domain".
const FROM_RE = /^(?:[^<>]*<\s*[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+\s*>|[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)$/;

// Called once at startup (server.js) so a misconfiguration shows up in the
// Render logs immediately, not at the first signup. Never prints the key.
function logEmailConfig() {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set - transactional emails (welcome, password reset, invoice, digest) will be skipped.");
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

// Never throws: callers fire-and-forget it from request handlers, and an email
// problem must never turn a successful signup/reset into an error for the user.
async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set - skipping email to ${to} ("${subject}")`);
    return { skipped: true };
  }
  const payload = { from: EMAIL_FROM, to: [to], subject, html };
  // One retry for transient failures (network error/timeout, 429, 5xx); 4xx
  // configuration errors (bad key, unverified domain) are not retried.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await postToResend(payload);
      if (r.ok) {
        let id = "";
        try { id = JSON.parse(r.body).id || ""; } catch (e) {}
        console.log(`[email] sent "${subject}" to ${to}${id ? ` (id ${id})` : ""}`);
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
  accent: "#0088ff",      // --ig27-blue (light)
  label: "#000000",       // --ig27-label-primary
  secondary: "#8a8a8e",   // --ig27-label-secondary rgba(60,60,67,.6) flattened on white
  separator: "#e5e5ea",   // --ig27-gray5
  font: "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif",
};

function welcomeEmailHtml(name) {
  const hello = name ? `Bienvenue ${escapeHtml(name)} !` : "Bienvenue !";
  return `
  <div style="font-family:${C.font};max-width:520px;margin:0 auto;padding:24px">
    <h1 style="color:${C.accent};font-size:22px">${hello}</h1>
    <p style="color:${C.label};font-size:15px;line-height:1.6">
      Ton compte sur <strong>Mes langues</strong> vient d'être créé. Les 39 langues sont
      accessibles gratuitement au niveau de base (vocabulaire, grammaire, exercices, lecture) :
      choisis-en une sur l'accueil et commence dès maintenant. L'abonnement Premium débloque
      en plus le feedback, les leçons et les exercices avancés.
    </p>
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
      <tr><td style="padding:8px 0;border-bottom:1px solid ${C.separator}">Abonnement premium - Mes langues</td><td style="padding:8px 0;border-bottom:1px solid ${C.separator};text-align:right">${amountStr}</td></tr>
      <tr><td style="padding:10px 0;font-weight:700">Total</td><td style="padding:10px 0;text-align:right;font-weight:700">${amountStr}</td></tr>
    </table>
    <p style="color:${C.secondary};font-size:12px;margin-top:24px">
      Émis par ${escapeHtml(businessName || "Mes langues")}. Conserve cet email comme justificatif de paiement.
    </p>
  </div>`;
}

function suggestionsDigestHtml(suggestions) {
  const rows = suggestions.map((s) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid ${C.separator};font-size:13px;color:${C.secondary};white-space:nowrap;vertical-align:top">${escapeHtml(new Date(s.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }))}</td>
      <td style="padding:10px 8px;border-bottom:1px solid ${C.separator};font-size:13px;color:${C.label};vertical-align:top">${escapeHtml(s.user_email || "anonyme")}</td>
      <td style="padding:10px 8px;border-bottom:1px solid ${C.separator};font-size:14px;color:${C.label};white-space:pre-wrap">${escapeHtml(s.message)}</td>
    </tr>`).join("");
  return `
  <div style="font-family:${C.font};max-width:640px;margin:0 auto;padding:24px">
    <h1 style="color:${C.accent};font-size:20px">💡 Boîte à idées — ${suggestions.length} suggestion${suggestions.length > 1 ? "s" : ""} aujourd'hui</h1>
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      <tr style="text-align:left"><th style="font-size:12px;color:${C.secondary};padding:0 8px 8px">Date</th><th style="font-size:12px;color:${C.secondary};padding:0 8px 8px">Compte</th><th style="font-size:12px;color:${C.secondary};padding:0 8px 8px">Message</th></tr>
      ${rows}
    </table>
    <p style="color:${C.secondary};font-size:12px;margin-top:24px">Récapitulatif automatique quotidien envoyé par Mes langues.</p>
  </div>`;
}

function resetPasswordEmailHtml(resetLink) {
  const safeLink = escapeHtml(resetLink);
  return `
  <div style="font-family:${C.font};max-width:520px;margin:0 auto;padding:24px">
    <h1 style="color:${C.accent};font-size:22px">Réinitialise ton mot de passe</h1>
    <p style="color:${C.label};font-size:15px;line-height:1.6">
      Tu as demandé à réinitialiser le mot de passe de ton compte sur <strong>Mes langues</strong>.
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

module.exports = {
  sendEmail,
  logEmailConfig,
  welcomeEmailHtml,
  invoiceEmailHtml,
  suggestionsDigestHtml,
  resetPasswordEmailHtml,
  escapeHtml,
};
