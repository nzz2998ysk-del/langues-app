// ONE-SHOT migration (kept for traceability): extracts the content that used
// to live inside app.html's ALL_PAGES (hand-built pages, three different page
// engines) into one source file per language, content/legacy/<code>.json, in
// the unified course format consumed by scripts/course/build.js.
// It must run against an app.html that still has the legacy pages (git
// history before the course engine), e.g.:
//   git show 3203877:app.html > /tmp/app-legacy.html
//   node scripts/course/convert-legacy.js /tmp/app-legacy.html
const fs = require("fs");
const path = require("path");
const V2 = require("../lang-data-v2");

const src = fs.readFileSync(process.argv[2] || path.join(__dirname, "../../app.html"), "utf8");
const line = src.split("\n").find((l) => l.startsWith("var ALL_PAGES = "));
const PAGES = JSON.parse(line.slice("var ALL_PAGES = ".length).replace(/;\s*$/, ""));
const OUT = path.join(__dirname, "../../content/legacy");
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

// --- helpers -----------------------------------------------------------------
function grab(s, name) { // value of "var NAME = <literal>" by bracket matching
  const m = new RegExp("(?:var|const|let)\\s+" + name + "\\s*=\\s*").exec(s);
  if (!m) return undefined;
  const i = m.index + m[0].length, open = s[i], close = open === "{" ? "}" : open === "[" ? "]" : null;
  if (!close) return undefined;
  let d = 0, q = null, esc = false;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (q) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === open) d++;
    else if (c === close && --d === 0) {
      const txt = s.slice(i, j + 1);
      try { return JSON.parse(txt); } catch (e) { return Function("return " + txt)(); }
    }
  }
}
const decode = (h) => h.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const lvl = (l) => (LEVELS.includes(l) ? l : null);
function write(code, data) {
  fs.writeFileSync(path.join(OUT, code + ".json"), JSON.stringify(data, null, 1) + "\n");
  const n = (k) => (Array.isArray(data[k]) ? data[k].length : data[k] && data[k].verbs ? data[k].verbs.length : 0);
  console.log(code.padEnd(4), "words", n("words"), "grammar", n("grammar"), "conj", n("conj"), "readings", n("readings"), "cloze", n("cloze"), "order", n("order"), "alphabet", n("alphabet"));
}
function grammarFromDetails(html) { // en/es/it grammar page: <details class="topic"><summary>…<span>TITLE</span>…</summary><div class="body">HTML</div>
  const out = [];
  for (const m of html.matchAll(/<details class="topic" id="([^"]*)"><summary><span class="ic">([^<]*)<\/span><span>([\s\S]*?)<\/span>[\s\S]*?<\/summary>\s*<div class="body">([\s\S]*?)<\/div><\/details>/g)) {
    out.push({ id: m[1], icon: m[2], level: null, title: { fr: decode(m[3]) }, body: { fr: m[4].trim() } });
  }
  return out;
}

// --- he: IVRIT_DATA ----------------------------------------------------------
{
  const D = grab(PAGES["he__vocabulaire.html"], "IVRIT_DATA");
  const themes = [], words = [];
  const refRank = {}; // frequency list position -> level
  for (const [label, th] of Object.entries(D.VOCAB_THEMES)) {
    const ref = label.match(/Liste de référence \(mots (\d+)-(\d+)\)/);
    const id = ref ? "frequence" : slug(label.replace(/\s*\([^)]*\)\s*$/, ""));
    if (!themes.find((t) => t.id === id)) themes.push({ id, fr: ref ? "Mots les plus fréquents" : label.replace(/\s*\((A1|A2|B1|B2|C1|C2|A2-B1|A1-B2)\)\s*$/, "") });
    th.words.forEach((w, i) => {
      let level = lvl(w.level) || lvl(th.level);
      if (!level && ref) { // frequency-ordered list: rank decides the level
        const rank = +ref[1] + i;
        level = rank <= 250 ? "A1" : rank <= 500 ? "A2" : rank <= 750 ? "B1" : "B2";
      }
      if (!level && th.level === "A2-B1") level = "A2";
      words.push({ t: w.he, r: w.translit || "", level: level || "A2", theme: id, pos: w.type || "", gender: w.gender || "", pl: w.plural_he ? { t: w.plural_he, r: w.plural_translit || "" } : undefined, g: { fr: w.fr } });
    });
  }
  const conjVerb = (c, level) => ({
    t: c.root, r: "", level, g: { fr: c.meaning },
    forms: Object.fromEntries(["past", "present", "future", "imperative"].filter((k) => c[k]).map((k) => [k, c[k].map((f) => ({ p: f.pron, t: f.he, r: f.translit }))])),
  });
  write("he", {
    themes, words,
    alphabet: D.ALPHABET.map((a) => ({ c: a.letter, final: a.final || "", name: a.name, sound: a.sound, note: a.cursive_note || "", ex: { t: a.word, r: a.translit, g: { fr: a.fr } } })),
    alphabetExtra: { title: { fr: "Voyelles (niqqud)" }, items: D.NIQQUD.map((n) => ({ c: n.symbol, name: n.name, sound: n.sound })) },
    grammar: [
      ...D.GRAMMAR_RULES.map((g, i) => ({ id: "g" + i, level: i < 3 ? "A1" : "A2", title: { fr: g.title }, body: { fr: "<p>" + g.text + "</p>" } })),
      { id: "binyanim", level: "B1", title: { fr: "Les binyanim (schèmes verbaux)" }, body: { fr: D.BINYANIM.map((b) => `<p><b>${b.name}</b> — ${b.sens}. ${b.rule}</p>`).join("") }, ex: D.BINYANIM.map((b) => ({ t: b.example_he, r: b.example_translit, g: { fr: b.example_fr } })) },
    ],
    conj: {
      tenses: [{ id: "past", fr: "Passé" }, { id: "present", fr: "Présent" }, { id: "future", fr: "Futur" }, { id: "imperative", fr: "Impératif" }],
      verbs: [conjVerb(D.CONJ_PAAL, "A2"), conjVerb(D.CONJ_PIEL, "B1"), conjVerb(D.CONJ_HIFIL, "B1")],
      note: { fr: "Conjugaison par racine et binyan : pa'al, pi'el, hif'il." },
    },
    readings: D.READING_TEXTS.map((r, i) => ({ id: "r" + i, level: lvl(r.level) || "B1", title: r.title, t: r.he, r: "", tr: { fr: r.fr }, q: (r.questions || []).map((q) => ({ q: { fr: q } })) })),
    cloze: D.CLOZE_EXERCISES.map((c) => ({ t: c.sentence, a: c.answer, g: { fr: c.fr }, level: "A2" })),
    order: D.SENTENCE_ORDER_EXERCISES.map((o) => ({ w: o.words, g: { fr: o.fr }, level: lvl(o.level) || "A2" })),
  });
}

// --- en / es / it: the "ESP" engine -------------------------------------------
for (const code of ["en", "es", "it"]) {
  const get = (page, n) => grab(PAGES[code + "__" + page + ".html"], n);
  const VOCAB = get("vocabulaire", "DATA") || get("exercices", "VOCAB");
  const CONJ = get("exercices", "CONJ");
  const cfg = get("vocabulaire", "LANGCFG");
  const gramHtml = PAGES[code + "__grammaire.html"];
  const pronHtml = PAGES[code + "__prononciation.html"];
  write(code, {
    kb: cfg.kb || [],
    themes: VOCAB.cats.map((c) => ({ id: c.id, fr: c.label, icon: c.icon })),
    words: VOCAB.words.map((w) => ({ t: w.es, r: "", level: lvl(w.level) || "B1", theme: w.cat, pos: "", gender: w.g || "", g: { fr: w.fr }, ex: w.ex ? { t: w.ex, g: { fr: w.exfr || "" } } : undefined })),
    grammar: [...grammarFromDetails(gramHtml), ...grammarFromDetails(pronHtml).map((g) => ({ ...g, id: "pron-" + g.id, kind: "pronunciation" }))],
    conj: {
      pronouns: CONJ.pronouns,
      tenses: Object.entries(CONJ.tenseLabels).map(([id, fr]) => ({ id, fr })),
      verbs: CONJ.verbs.map((v, i) => ({ t: v.inf, r: "", level: i < 8 ? "A1" : i < 16 ? "A2" : "B1", g: { fr: v.fr }, irregular: v.type === "irregular", forms: Object.fromEntries(Object.entries(v.conj).map(([k, arr]) => [k, arr.map((t, j) => ({ p: CONJ.pronouns[j], t }))])) })),
    },
    readings: get("lecture", "LECTURAS").map((r) => ({ id: r.id, level: lvl(r.level) || "B1", title: r.title, t: r.text, r: "", tr: {}, q: r.questions.map((q) => ({ q: { fr: q.q }, opts: q.opts, a: q.a })) })),
    cloze: get("exercices", "CLOZE").map((c) => ({ t: c.sentence, a: c.answer, g: { fr: c.fr }, level: "A2" })),
  });
}

// --- zh / pt / ru / de / ja: "v1" static pages ---------------------------------
for (const code of ["zh", "pt", "ru", "de", "ja"]) {
  const voc = PAGES[code + "__vocabulaire.html"], gram = PAGES[code + "__grammaire.html"], lec = PAGES[code + "__lecture.html"];
  const themes = [], words = [];
  for (const card of voc.matchAll(/<div class="card"><h2>([^<]*)<\/h2><div class="grid2">([\s\S]*?)<\/div><\/div>(?=<div class="card">|\s*<\/div>)/g)) {
    const id = slug(decode(card[1]));
    themes.push({ id, fr: decode(card[1]) });
    for (const it of card[2].matchAll(/<span class="w">([\s\S]*?)<\/span><span class="r">([\s\S]*?)<\/span><span class="f">([\s\S]*?)<\/span>/g))
      words.push({ t: decode(it[1]), r: decode(it[2]), level: "A1", theme: id, g: { fr: decode(it[3]) } });
  }
  const grammar = [...gram.matchAll(/<div class="gram-item"><b>([\s\S]*?)<\/b><p>([\s\S]*?)<\/p><\/div>/g)].map((m, i) => ({ id: "g" + i, level: i < 4 ? "A1" : "A2", title: { fr: decode(m[1]) }, body: { fr: "<p>" + m[2] + "</p>" } }));
  const readings = [];
  const items = [...lec.matchAll(/<div class="read-native">([\s\S]*?)<\/div>\s*<div class="read-fr hide-fr" id="fr\d+">([\s\S]*?)<\/div>/g)];
  if (items.length) readings.push({ id: "r0", level: "A1", title: "Lecture", t: items.map((m) => decode(m[1])).join(" "), r: "", tr: { fr: items.map((m) => decode(m[2])).join(" ") }, q: [] });
  write(code, { themes, words, grammar, readings });
}

// --- the 30 "v2" starter languages (scripts/lang-data-v2.js) --------------------
for (const [code, d] of Object.entries(V2)) {
  const themes = [], words = [];
  for (const [label, rows] of Object.entries(d.vocab)) {
    const id = slug(label);
    themes.push({ id, fr: label });
    rows.forEach(([t, r, fr]) => words.push({ t, r: r || "", level: "A1", theme: id, g: { fr } }));
  }
  write(code, {
    note: { fr: d.scriptNote },
    themes, words,
    grammar: d.grammar.map(([t, b], i) => ({ id: "g" + i, level: "A1", title: { fr: t }, body: { fr: "<p>" + b + "</p>" } })),
    readings: d.reading.length ? [{ id: "r0", level: "A1", title: "Lecture", t: d.reading.map((x) => x[0]).join(" "), r: "", tr: { fr: d.reading.map((x) => x[1]).join(" ") }, q: [] }] : [],
  });
}
