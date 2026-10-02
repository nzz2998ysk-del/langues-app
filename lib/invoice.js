// Premium invoice as a PDF (attached to the payment email, downloadable from
// the profile). Seller identity comes from the same environment variables as
// the legal notice (LEGAL_PUBLISHER, LEGAL_ADDRESS, LEGAL_SIRET,
// LEGAL_CONTACT_EMAIL); INVOICE_VAT_NOTE overrides the VAT mention.
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const LOGO = path.join(__dirname, "..", "design-system", "brand", "logo-256.png");
// Literal values of the design-system tokens (a PDF can't read CSS).
const BLUE = "#0060c0";    // --ig27-blue
const INDIGO = "#6155f5";  // --ig27-indigo (--brand)
const INK = "#000000";
const MUTED = "#6b6b70";
const LINE = "#e5e5ea";
const SOFT = "#f2f2f7";    // --ig27-bg-grouped-primary
// Micro-entreprise default; a VAT-registered seller sets INVOICE_VAT_NOTE.
const DEFAULT_VAT_NOTE = "TVA non applicable, art. 293 B du CGI";

function money(cents, currency) {
  const v = (Number(cents) || 0) / 100;
  const cur = String(currency || "eur").toUpperCase();
  const n = v.toFixed(2).replace(".", ",");
  return cur === "EUR" ? `${n} €` : `${n} ${cur}`;
}

function seller(env = process.env) {
  const v = (k) => String(env[k] || "").trim();
  return {
    name: v("LEGAL_PUBLISHER") || v("BUSINESS_NAME") || "Pap’pote",
    address: v("LEGAL_ADDRESS"),
    siret: v("LEGAL_SIRET"),
    email: v("LEGAL_CONTACT_EMAIL"),
    vatNote: v("INVOICE_VAT_NOTE") || DEFAULT_VAT_NOTE,
    url: v("APP_URL"),
  };
}

// inv: { number, date (Date), amountCents, currency, customerEmail,
//        customerName, description, period }
// Resolves with a Buffer.
function invoicePdf(inv, env) {
  const s = seller(env);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: `Facture ${inv.number}`, Author: s.name } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const W = doc.page.width, L = 50, R = W - 50;

    // Brand band (same gradient as the app: blue -> indigo)
    const grad = doc.linearGradient(0, 0, W, 0);
    grad.stop(0, BLUE).stop(1, INDIGO);
    doc.rect(0, 0, W, 8).fill(grad);

    // Header: logo + name, invoice title on the right
    let y = 40;
    if (fs.existsSync(LOGO)) doc.image(LOGO, L, y, { width: 48, height: 48 });
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(22).text("Pap’pote", L + 60, y + 6);
    doc.fillColor(MUTED).font("Helvetica").fontSize(10).text("Apprendre les langues, simplement", L + 60, y + 32);
    doc.fillColor(BLUE).font("Helvetica-Bold").fontSize(24).text("FACTURE", L, y, { width: R - L, align: "right" });
    doc.fillColor(INK).font("Helvetica").fontSize(10)
      .text(`N° ${inv.number}`, L, y + 32, { width: R - L, align: "right" })
      .text(`Date : ${inv.date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`, L, y + 46, { width: R - L, align: "right" });

    // Seller / customer blocks
    y = 130;
    const colW = (R - L - 20) / 2;
    const block = (x, title, lines) => {
      doc.roundedRect(x, y, colW, 92, 10).fill(SOFT);
      doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(8).text(title.toUpperCase(), x + 14, y + 12, { characterSpacing: 0.6 });
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(11).text(lines[0] || "", x + 14, y + 26, { width: colW - 28 });
      doc.font("Helvetica").fontSize(9.5).fillColor(INK);
      lines.slice(1).filter(Boolean).forEach((l) => doc.text(l, { width: colW - 28 }));
    };
    block(L, "Émetteur", [s.name, s.address, s.siret ? `SIRET : ${s.siret}` : "", s.email]);
    block(L + colW + 20, "Client", [inv.customerName || inv.customerEmail, inv.customerName ? inv.customerEmail : ""]);

    // Line items
    y = 250;
    doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(9)
      .text("DÉSIGNATION", L, y).text("QTÉ", R - 170, y, { width: 40, align: "right" }).text("MONTANT", R - 110, y, { width: 110, align: "right" });
    doc.moveTo(L, y + 16).lineTo(R, y + 16).lineWidth(1).strokeColor(LINE).stroke();
    y += 26;
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(11).text(inv.description || "Abonnement Pap’pote Premium", L, y, { width: R - L - 190 });
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(inv.period || "Accès à tous les niveaux et fonctions Premium", L, y + 16, { width: R - L - 190 });
    doc.fillColor(INK).font("Helvetica").fontSize(11).text("1", R - 170, y, { width: 40, align: "right" }).text(money(inv.amountCents, inv.currency), R - 110, y, { width: 110, align: "right" });
    y += 46;
    doc.moveTo(L, y).lineTo(R, y).strokeColor(LINE).stroke();

    // Total
    y += 14;
    doc.roundedRect(R - 220, y, 220, 44, 12).fill(grad);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text("TOTAL PAYÉ", R - 206, y + 16);
    doc.fontSize(16).text(money(inv.amountCents, inv.currency), R - 206, y + 13, { width: 192, align: "right" });
    y += 60;
    doc.fillColor(MUTED).font("Helvetica").fontSize(9).text(s.vatNote, L, y, { width: R - L, align: "right" });

    // Payment + footer
    y += 40;
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(10).text("Paiement", L, y);
    doc.font("Helvetica").fontSize(9.5).fillColor(INK)
      .text(`Réglé par carte bancaire via Stripe le ${inv.date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}. Aucun montant restant dû.`, L, y + 15, { width: R - L })
      .text("Abonnement sans engagement, résiliable à tout moment depuis ton profil.", { width: R - L });
    // footer sits inside the bottom margin: lift it so pdfkit does not add a page
    doc.page.margins.bottom = 0;
    const fy = doc.page.height - 70;
    doc.moveTo(L, fy).lineTo(R, fy).strokeColor(LINE).stroke();
    doc.fillColor(MUTED).fontSize(8.5)
      .text([s.name, s.siret ? `SIRET ${s.siret}` : "", s.email, s.url].filter(Boolean).join("  ·  "), L, fy + 10, { width: R - L, align: "center" })
      .text("Merci pour ta confiance et bon apprentissage avec Pap’pote !", { width: R - L, align: "center" });
    doc.end();
  });
}

module.exports = { invoicePdf, money, DEFAULT_VAT_NOTE };
