// Minimal transactional email helper using the Resend HTTP API (https://resend.com).
// No SDK dependency: Resend's API is a plain JSON POST, so we use Node's built-in fetch.
//
// Configure with:
//   RESEND_API_KEY  - required to actually send anything (get one free at resend.com)
//   EMAIL_FROM      - sender address, e.g. "Mes langues <onboarding@resend.dev>"
//                     (the resend.dev address works with zero setup for testing/low volume;
//                     verify your own domain in Resend later to send as you@yourdomain.com)
//
// If RESEND_API_KEY is not set, sendEmail() logs and resolves instead of throwing, so the
// app keeps working (signup/payments still succeed) even before email is configured.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Mes langues <onboarding@resend.dev>";

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

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set - skipping email to ${to} ("${subject}")`);
    return { skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] Resend API error ${res.status}: ${body}`);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] send failed:", err.message);
    return { ok: false };
  }
}

function welcomeEmailHtml(name) {
  const hello = name ? `Bienvenue ${escapeHtml(name)} !` : "Bienvenue !";
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px">
    <h1 style="color:#3D348B;font-size:22px">${hello}</h1>
    <p style="color:#333;font-size:15px;line-height:1.6">
      Ton compte sur <strong>Mes langues</strong> vient d'être créé. Tu peux dès maintenant
      commencer à apprendre l'hébreu, l'espagnol, l'anglais et l'italien gratuitement,
      et découvrir le chinois mandarin, le portugais, le russe, l'allemand et le japonais
      en version premium.
    </p>
    <p style="color:#726C8A;font-size:13px;margin-top:28px">
      Cet email a été envoyé automatiquement suite à la création de ton compte.
    </p>
  </div>`;
}

function invoiceEmailHtml({ invoiceNumber, date, amount, currency, email, businessName }) {
  const amountStr = (amount / 100).toFixed(2).replace(".", ",") + " " + currency.toUpperCase();
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h1 style="color:#3D348B;font-size:20px">Facture ${invoiceNumber}</h1>
    <p style="color:#333;font-size:15px">Merci pour ton paiement !</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;color:#333">
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Date</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${date}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Client</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${escapeHtml(email)}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Abonnement premium - Mes langues</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${amountStr}</td></tr>
      <tr><td style="padding:10px 0;font-weight:700">Total</td><td style="padding:10px 0;text-align:right;font-weight:700">${amountStr}</td></tr>
    </table>
    <p style="color:#726C8A;font-size:12px;margin-top:24px">
      Émis par ${escapeHtml(businessName || "Mes langues")}. Conserve cet email comme justificatif de paiement.
    </p>
  </div>`;
}

function suggestionsDigestHtml(suggestions) {
  const rows = suggestions.map((s) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#726C8A;white-space:nowrap;vertical-align:top">${escapeHtml(new Date(s.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }))}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#333;vertical-align:top">${escapeHtml(s.user_email || "anonyme")}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;color:#333;white-space:pre-wrap">${escapeHtml(s.message)}</td>
    </tr>`).join("");
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto;padding:24px">
    <h1 style="color:#3D348B;font-size:20px">💡 Boîte à idées — ${suggestions.length} suggestion${suggestions.length > 1 ? "s" : ""} aujourd'hui</h1>
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      <tr style="text-align:left"><th style="font-size:12px;color:#726C8A;padding:0 8px 8px">Date</th><th style="font-size:12px;color:#726C8A;padding:0 8px 8px">Compte</th><th style="font-size:12px;color:#726C8A;padding:0 8px 8px">Message</th></tr>
      ${rows}
    </table>
    <p style="color:#726C8A;font-size:12px;margin-top:24px">Récapitulatif automatique quotidien envoyé par Mes langues.</p>
  </div>`;
}

module.exports = { sendEmail, welcomeEmailHtml, invoiceEmailHtml, suggestionsDigestHtml, escapeHtml };
