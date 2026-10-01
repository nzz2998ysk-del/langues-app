// Transactional email helper using the SendGrid v3 HTTP API
// (https://api.sendgrid.com/v3/mail/send): a plain JSON POST over HTTPS with
// Node's built-in fetch, no SDK. (Render's free plan blocks outbound SMTP
// ports 25/465/587; HTTPS on 443 works.)
//
// Configuration — environment variables ONLY (never commit a key; on Render:
// service -> Environment). See .env.example and the README.
//   SENDGRID_API_KEY - required to send anything. SendGrid -> Settings ->
//                      API Keys (permission "Mail Send"). Without it,
//                      sendEmail() logs a warning and resolves { skipped: true }
//                      instead of throwing, so signup, password reset and
//                      payments keep working.
//   EMAIL_FROM       - optional sender, "Name <address>" or a bare address.
//                      Default: "Papote <papotelangues@icloud.com>". The address
//                      must be a verified sender in SendGrid (Settings ->
//                      Sender Authentication), or SendGrid answers 403.

const SENDGRID_API_KEY = (process.env.SENDGRID_API_KEY || "").trim();
const SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";
const DEFAULT_FROM = "Papote <papotelangues@icloud.com>";
const EMAIL_FROM = (process.env.EMAIL_FROM || "").trim() || DEFAULT_FROM;
const SEND_TIMEOUT_MS = 10000;
const LEGACY_VARS = ["RESEND_API_KEY", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "SMTP_HOST", "SMTP_PORT", "GMAIL_USER", "GMAIL_APP_PASSWORD"];

// "Name <addr@domain>" or a bare "addr@domain".
const FROM_RE = /^(?:[^<>]*<\s*[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+\s*>|[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)$/;
// SendGrid wants { email, name } rather than a "Name <addr>" string.
function parseFrom(v) {
  const m = /^\s*(.*?)\s*<\s*([^<>\s]+)\s*>\s*$/.exec(v);
  if (m) return m[1] ? { email: m[2], name: m[1].replace(/^"|"$/g, "") } : { email: m[2] };
  return { email: v.trim(), name: "Papote" };
}
const FROM = parseFrom(EMAIL_FROM);

function emailProvider() {
  return SENDGRID_API_KEY ? "sendgrid" : "";
}

// Called once at startup (server.js) so a misconfiguration shows up in the
// Render logs immediately, not at the first signup. Never prints the key.
function logEmailConfig() {
  const legacy = LEGACY_VARS.filter((k) => process.env[k]);
  if (legacy.length) console.warn(`[email] ${legacy.join(", ")} ${legacy.length > 1 ? "are" : "is"} no longer used (emails go through the SendGrid API) - you can remove ${legacy.length > 1 ? "them" : "it"} from Render.`);
  if (!SENDGRID_API_KEY) {
    console.warn("[email] SENDGRID_API_KEY not set - transactional emails (welcome, password reset, invoice, digest) will be skipped.");
    return;
  }
  if (!FROM_RE.test(EMAIL_FROM)) {
    console.warn(`[email] EMAIL_FROM looks malformed ("${EMAIL_FROM}") - expected "Name <address>"; SendGrid will reject sends.`);
  } else {
    console.log(`[email] SendGrid configured, sending as ${FROM.name ? FROM.name + " " : ""}<${FROM.email}> (must be a verified sender in SendGrid)`);
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

async function postToSendGrid(payload) {
  const res = await fetch(SENDGRID_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  const body = await res.text().catch(() => "");
  // 202 Accepted, empty body; the message id comes back in a header.
  return { status: res.status, ok: res.ok, body, id: res.headers && res.headers.get ? res.headers.get("x-message-id") || "" : "" };
}

// Never throws: callers fire-and-forget it from request handlers, and an email
// problem must never turn a successful signup/reset into an error for the user.
// attachments: [{ filename, content: Buffer, contentType }]
async function sendEmail({ to, subject, html, headers, attachments }) {
  if (!SENDGRID_API_KEY) {
    console.warn(`[email] SENDGRID_API_KEY not set - skipping email to ${maskEmail(to)} ("${subject}")`);
    return { skipped: true };
  }
  // SendGrid requires text/plain (if present) before text/html.
  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: FROM,
    subject,
    content: [
      { type: "text/plain", value: htmlToText(html) || " " },
      { type: "text/html", value: html },
    ],
  };
  if (headers) payload.headers = headers;
  if (attachments && attachments.length) {
    payload.attachments = attachments.map((a) => ({
      content: Buffer.from(a.content).toString("base64"),
      filename: a.filename,
      type: a.contentType || "application/octet-stream",
      disposition: "attachment",
    }));
  }
  // One retry for transient failures (network error/timeout, 429, 5xx); 4xx
  // configuration errors (bad key, unverified sender) are not retried.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await postToSendGrid(payload);
      if (r.ok) {
        console.log(`[email] sent "${subject}" to ${maskEmail(to)}${r.id ? ` (id ${r.id})` : ""}`);
        return { ok: true, id: r.id };
      }
      const transient = r.status === 429 || r.status >= 500;
      const hint = r.status === 401 ? " - check SENDGRID_API_KEY" : r.status === 403 ? ` - is ${FROM.email} a verified sender in SendGrid (Settings -> Sender Authentication)?` : "";
      console.error(`[email] SendGrid API error ${r.status} (attempt ${attempt}): ${r.body}${hint}`);
      if (!transient || attempt === 2) return { ok: false, status: r.status };
    } catch (err) {
      console.error(`[email] send failed (attempt ${attempt}): ${err.message}`);
      if (attempt === 2) return { ok: false };
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return { ok: false };
}

// Email design = the app's design system, with literal values (email clients
// can't load stylesheets or CSS variables): grouped background, white rounded
// card, brand gradient (blue -> indigo) on the header band and buttons, the
// logo and the mascot. Table layout + inline styles so Gmail, Apple Mail and
// Outlook render it the same; images are absolute URLs with alt text.
const C = {
  accent: "#0060c0",      // --ig27-blue (light)
  brand: "#6155f5",       // --ig27-indigo (--brand)
  label: "#000000",       // --ig27-label-primary
  secondary: "#6b6b70",   // --ig27-label-secondary flattened on white
  separator: "#e5e5ea",   // --ig27-gray5
  bg: "#f2f2f7",          // --ig27-bg-grouped-primary
  soft: "#f2f2f7",
  font: "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif",
};
const GRAD = `linear-gradient(135deg,${C.accent},${C.brand})`;
const APP_URL = String(process.env.APP_URL || "https://langues-app.onrender.com").trim().replace(/\/+$/, "");
const asset = (p) => (APP_URL ? APP_URL + p : "");

// Logs never contain full email addresses (personal data).
function maskEmail(to) {
  const [u, d] = String(to || "").split("@");
  return d ? `${u.slice(0, 2)}***@${d}` : "***";
}

// Plain-text part (better deliverability, readable in any client).
function htmlToText(html) {
  return String(html || "")
    .replace(/<(style|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, t) => `${t.replace(/<[^>]+>/g, "").trim()} (${href})`)
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|h1|h2|tr|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split("\n").map((l) => l.trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function button(href, label) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px"><tr>
      <td bgcolor="${C.accent}" style="border-radius:999px;background:${C.accent};background-image:${GRAD}">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font-family:${C.font};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">${label}</a>
      </td></tr></table>`;
}

// The shared frame. body is trusted HTML built by the templates below (every
// user-supplied value inside it is escaped where it is interpolated).
function layout({ preheader, mascot, title, body, footer, wide }) {
  const logo = asset("/design-system/brand/logo-128.png");
  const masc = mascot ? asset(`/design-system/brand/mascotte/mascotte-${mascot}-128.png`) : "";
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader || "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background:${C.bg}">
<tr><td align="center" style="padding:28px 14px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:${wide ? 640 : 560}px">
    <tr><td align="center" style="padding:0 0 18px">
      ${logo ? `<img src="${logo}" width="44" height="44" alt="" style="display:inline-block;vertical-align:middle;border:0;border-radius:12px">` : ""}
      <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-family:${C.font};font-size:22px;font-weight:800;color:${C.label};letter-spacing:-.3px">Papote</span>
    </td></tr>
    <tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:28px;border:1px solid ${C.separator};box-shadow:0 14px 34px -18px rgba(0,0,0,.25);overflow:hidden">
      <div style="height:6px;line-height:6px;font-size:0;background:${C.accent};background-image:${GRAD};border-radius:28px 28px 0 0">&nbsp;</div>
      <div style="padding:30px 30px 28px;font-family:${C.font}">
        ${masc ? `<img src="${masc}" width="88" height="88" alt="" style="display:block;border:0;margin:0 0 6px">` : ""}
        <h1 style="margin:0 0 14px;font-family:${C.font};font-size:24px;line-height:1.25;font-weight:800;color:${C.label};letter-spacing:-.3px">${title}</h1>
        ${body}
      </div>
    </td></tr>
    <tr><td align="center" style="padding:20px 12px 0;font-family:${C.font};font-size:12px;line-height:1.6;color:${C.secondary}">
      ${footer || "Cet email t'a été envoyé automatiquement par Papote."}<br>
      ${APP_URL ? `<a href="${APP_URL}/" style="color:${C.accent};text-decoration:none;font-weight:600">Ouvrir Papote</a>` : "Papote"}
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

const P = (t) => `<p style="margin:0 0 12px;font-size:15.5px;line-height:1.6;color:${C.label}">${t}</p>`;
const SMALL = (t) => `<p style="margin:14px 0 0;font-size:13px;line-height:1.55;color:${C.secondary}">${t}</p>`;

function welcomeEmailHtml(name, verifyLink) {
  const hello = name ? `Bienvenue ${escapeHtml(name)} !` : "Bienvenue sur Papote !";
  const perks = [
    ["🌍", "39 langues, gratuites du niveau A1 au B2"],
    ["🧠", "Vocabulaire, grammaire, conjugaison, lecture et écoute"],
    ["🎯", "Une leçon du jour et des révisions au bon moment"],
  ].map(([i, t]) => `<tr><td width="34" style="padding:7px 0;font-size:20px;vertical-align:top">${i}</td><td style="padding:9px 0;font-family:${C.font};font-size:15px;line-height:1.45;color:${C.label}">${t}</td></tr>`).join("");
  const verify = verifyLink
    ? button(verifyLink, "Confirmer mon adresse email") + SMALL("Ce lien est valable 7 jours. Confirmer ton adresse te permet de récupérer ton compte si tu oublies ton mot de passe.")
    : (APP_URL ? button(APP_URL + "/", "Commencer à apprendre") : "");
  return layout({
    preheader: "Ton compte Papote est prêt : choisis une langue et commence ta première leçon.",
    mascot: "wave",
    title: hello,
    body: P("Ton compte <strong>Papote</strong> vient d'être créé. Voici ce qui t'attend :") +
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px">${perks}</table>` +
      verify +
      SMALL("Envie d'aller plus loin ? <strong>Premium</strong> débloque les niveaux C1/C2, les leçons illimitées, la révision avancée et la prononciation notée."),
    footer: "Tu reçois cet email suite à la création de ton compte Papote.",
  });
}

// money: amount in cents
function invoiceEmailHtml({ invoiceNumber, date, amount, currency, email, businessName }) {
  const amountStr = (amount / 100).toFixed(2).replace(".", ",") + (String(currency).toLowerCase() === "eur" ? " €" : " " + String(currency).toUpperCase());
  const row = (k, v, strong) => `<tr><td style="padding:11px 0;border-bottom:1px solid ${C.separator};font-family:${C.font};font-size:14px;color:${C.secondary}">${k}</td><td align="right" style="padding:11px 0;border-bottom:1px solid ${C.separator};font-family:${C.font};font-size:14px;color:${C.label};${strong ? "font-weight:700" : ""}">${v}</td></tr>`;
  return layout({
    preheader: `Merci ! Ton abonnement Premium est actif. Facture ${invoiceNumber} jointe.`,
    mascot: "heart",
    title: "Bienvenue dans Premium ✨",
    body: P("Merci pour ton abonnement ! Ton compte est passé en <strong>Premium</strong> : niveaux C1 et C2, leçons illimitées, révision avancée, prononciation notée et statistiques détaillées sont débloqués dans les 39 langues.") +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0;background:${C.soft};border-radius:18px"><tr><td style="padding:6px 18px 4px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${row("Facture", escapeHtml(invoiceNumber))}
          ${row("Date", escapeHtml(date))}
          ${row("Compte", escapeHtml(email))}
          ${row("Abonnement Papote Premium", amountStr)}
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="padding:14px 0;font-family:${C.font};font-size:15px;font-weight:800;color:${C.label}">Total payé</td>
          <td align="right" style="padding:14px 0;font-family:${C.font};font-size:20px;font-weight:800;color:${C.accent}">${amountStr}</td>
        </tr></table>
      </td></tr></table>` +
      SMALL("📎 La facture est jointe à cet email au format PDF. Tu peux aussi la retrouver à tout moment dans ton profil.") +
      (APP_URL ? button(APP_URL + "/", "Profiter de Premium") : "") +
      SMALL("Abonnement sans engagement : tu peux le résilier à tout moment depuis ton profil."),
    footer: `Émis par ${escapeHtml(businessName || "Papote")}. Conserve cet email comme justificatif de paiement.`,
  });
}

function suggestionsDigestHtml(suggestions) {
  const rows = suggestions.map((s) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid ${C.separator};font-family:${C.font};font-size:12.5px;color:${C.secondary};white-space:nowrap;vertical-align:top">${escapeHtml(new Date(s.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }))}</td>
      <td style="padding:10px 8px;border-bottom:1px solid ${C.separator};font-family:${C.font};font-size:13px;color:${C.label};vertical-align:top">${escapeHtml(s.user_email || "anonyme")}</td>
      <td style="padding:10px 8px;border-bottom:1px solid ${C.separator};font-family:${C.font};font-size:14px;color:${C.label};white-space:pre-wrap">${s.category ? `<b>[${escapeHtml(s.category)}]</b> ` : ""}${escapeHtml(s.message)}</td>
    </tr>`).join("");
  const n = suggestions.length;
  return layout({
    wide: true,
    preheader: `${n} nouvelle${n > 1 ? "s" : ""} idée${n > 1 ? "s" : ""} dans la boîte à idées.`,
    mascot: "thinking",
    title: `💡 ${n} suggestion${n > 1 ? "s" : ""} aujourd'hui`,
    body: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px">
      <tr style="text-align:left"><th align="left" style="font-family:${C.font};font-size:12px;color:${C.secondary};padding:0 8px 8px">Date</th><th align="left" style="font-family:${C.font};font-size:12px;color:${C.secondary};padding:0 8px 8px">Compte</th><th align="left" style="font-family:${C.font};font-size:12px;color:${C.secondary};padding:0 8px 8px">Message</th></tr>
      ${rows}
    </table>` + (APP_URL ? button(APP_URL + "/admin", "Ouvrir l'administration") : ""),
    footer: "Récapitulatif automatique quotidien de la boîte à idées.",
  });
}

function resetPasswordEmailHtml(resetLink) {
  const safeLink = escapeHtml(resetLink);
  return layout({
    preheader: "Choisis un nouveau mot de passe pour ton compte Papote (lien valable 1 heure).",
    mascot: "thinking",
    title: "Mot de passe oublié ?",
    body: P("Pas de panique, ça arrive à tout le monde ! Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable <strong>1 heure</strong>.") +
      button(resetLink, "Choisir un nouveau mot de passe") +
      SMALL(`Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br><span style="word-break:break-all;color:${C.accent}">${safeLink}</span>`) +
      SMALL("Tu n'es pas à l'origine de cette demande ? Ignore cet email : ton mot de passe actuel reste inchangé."),
    footer: "Cet email fait suite à une demande de réinitialisation sur Papote.",
  });
}

// Daily practice reminder (opt-in from the profile). French or English copy
// depending on the account's base language; always carries an unsubscribe link.
function reminderEmailHtml({ lang, name, streak, due, langName, appLink, unsubLink }) {
  const fr = lang === "fr";
  const hi = name ? (fr ? `Coucou ${escapeHtml(name)} !` : `Hi ${escapeHtml(name)}!`) : (fr ? "Coucou !" : "Hi!");
  const streakLine = streak > 1
    ? (fr ? `Ta série de <strong>${streak} jours</strong> t'attend : 5 minutes suffisent pour la garder 🔥` : `Your <strong>${streak}-day streak</strong> is waiting: 5 minutes are enough to keep it 🔥`)
    : (fr ? "5 minutes aujourd'hui, et ta mémoire te dira merci." : "5 minutes today and your memory will thank you.");
  const dueLine = due > 0
    ? (fr ? `<strong>${due} mot${due > 1 ? "s" : ""}</strong> à réviser en ${escapeHtml(langName)}.` : `<strong>${due} word${due > 1 ? "s" : ""}</strong> to review in ${escapeHtml(langName)}.`)
    : (fr ? `Ta leçon du jour en ${escapeHtml(langName)} est prête.` : `Your daily ${escapeHtml(langName)} lesson is ready.`);
  return layout({
    preheader: fr ? `Ta leçon du jour en ${langName} t'attend.` : `Your daily ${langName} lesson is waiting.`,
    mascot: streak > 1 ? "excited" : "wink",
    title: hi,
    body: P(streakLine) + P(dueLine) + button(appLink, fr ? "Faire ma leçon du jour" : "Do today's lesson"),
    footer: `${fr ? "Tu reçois ce rappel parce que tu l'as activé dans ton profil Papote." : "You get this reminder because you turned it on in your Papote profile."}
      <a href="${escapeHtml(unsubLink)}" style="color:${C.secondary}">${fr ? "Ne plus recevoir de rappels" : "Stop reminders"}</a>`,
  });
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
  htmlToText,
};
