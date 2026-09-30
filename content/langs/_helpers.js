// Small builders shared by the per-language packs (content/langs/<code>.js).
// g("fr text", "en text") -> { fr, en } gloss/explanation.
const g = (fr, en) => ({ fr, en: en == null ? fr : en });
// verb(pronouns, t, gloss, level, forms, opts): forms = { tenseId: ["form1", ...] }
// or { tenseId: [["form", "romanization"], ...] } for non-Latin scripts.
function verb(pronouns, t, gloss, level, forms, opts = {}) {
  const out = { t, r: opts.r || "", g: gloss, level, irregular: !!opts.irregular, forms: {} };
  for (const [k, arr] of Object.entries(forms)) {
    out.forms[k] = arr.map((x, i) => (Array.isArray(x) ? { p: pronouns[i] || "", t: x[0], r: x[1] || "" } : { p: pronouns[i] || "", t: x }));
  }
  return out;
}
// ex("target", "romanization", "fr", "en")
const ex = (t, r, fr, en) => ({ t, r: r || "", g: g(fr, en) });
// q("question fr", "question en", [[fr,en],...], answerIndex)
const q = (qfr, qen, opts, a) => ({ q: g(qfr, qen), opts: opts.map(([f, e]) => g(f, e)), a });
module.exports = { g, verb, ex, q };
// formsVerb(labels, t, gloss, level, [forms...], opts): languages whose verbs don't
// change with the person (Scandinavian, Japanese…): one row per form.
function formsVerb(labels, t, gloss, level, forms, opts) {
  return verb(labels, t, gloss, level, { formes: forms }, opts);
}
module.exports.formsVerb = formsVerb;
// G(id, level, icon, [titleFr, titleEn], [bodyFr, bodyEn], [ex...]) — compact grammar card.
const G = (id, level, icon, t, b, exs) => ({ id, level, icon, title: g(t[0], t[1]), body: g(b[0], b[1]), ex: exs || [] });
// R(id, level, title, text, rom, [trFr, trEn], [questions...])
const R = (id, level, title, t, r, tr, qs) => ({ id, level, title, t, r: r || "", tr: g(tr[0], tr[1]), q: qs || [] });
// C(id, level, icon, [titleFr, titleEn], [bodyFr, bodyEn])
const C = (id, level, icon, t, b) => ({ id, level, icon, title: g(t[0], t[1]), body: g(b[0], b[1]) });
Object.assign(module.exports, { G, R, C });
