// Builds the course content of every language and the app.html page stubs.
//
//   node scripts/course/build.js           -> writes course/data/<code>.json + app.html ALL_PAGES
//   node scripts/course/build.js --check   -> validates the sources, writes nothing
//
// Sources (all under content/):
//   meta.js              per-language metadata (voice, direction, keyboard...)
//   legacy/<code>.json   content migrated from the old hand-built pages
//   vocab/*.txt          multilingual vocabulary, one concept per line:
//                          <id> <LEVEL> [pos] | fr bonjour | en hello | he שלום~shalom | ...
//                        ("~" separates the word from its romanization)
//   phrases/*.txt        same format for sentences (useful phrases, listening,
//                        gap-fill and word-order exercises are built from them)
//   langs/<code>.js      grammar, conjugation, readings, culture, alphabet...
// A concept line gives a word to EVERY language it has a column for, and the
// other columns become its translations — that is what lets any base language
// (profile setting) be used to learn any target language.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const CONTENT = path.join(ROOT, "content");
const OUT = path.join(ROOT, "course", "data");
const META = require(path.join(CONTENT, "meta.js"));
const CODES = Object.keys(META);
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const CHECK = process.argv.includes("--check");
const problems = [];

// ---------------------------------------------------------------- parsing
function parseMatrix(dir, kind) {
  const themes = [], items = [];
  if (!fs.existsSync(dir)) return { themes, items };
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".txt")).sort()) {
    const lines = fs.readFileSync(path.join(dir, file), "utf8").split("\n");
    let theme = null;
    lines.forEach((raw, n) => {
      const line = raw.trim();
      if (!line || line.startsWith("//")) return;
      const where = `${kind}/${file}:${n + 1}`;
      if (line.startsWith("#theme")) { // #theme <id> <icon> | fr Label | en Label | es ...
        const segs = line.slice(6).split("|").map((s) => s.trim());
        const [id, icon] = segs[0].split(/\s+/);
        theme = { id, icon: icon || "" };
        for (const seg of segs.slice(1)) { const i = seg.indexOf(" "); theme[seg.slice(0, i)] = seg.slice(i + 1).trim(); }
        themes.push(theme);
        return;
      }
      if (!theme) { problems.push(`${where}: line before any #theme`); return; }
      const segs = line.split("|").map((s) => s.trim());
      const head = segs[0].split(/\s+/);
      const id = head[0], level = head[1], pos = head[2] || "";
      if (!LEVELS.includes(level)) { problems.push(`${where}: bad level "${level}"`); return; }
      const forms = {};
      for (const seg of segs.slice(1)) {
        if (!seg) continue;
        const i = seg.indexOf(" ");
        const code = i < 0 ? seg : seg.slice(0, i), val = i < 0 ? "" : seg.slice(i + 1).trim();
        if (!META[code]) { problems.push(`${where}: unknown language "${code}"`); continue; }
        if (forms[code]) problems.push(`${where}: duplicate column "${code}"`);
        if (!val || val === "-") continue;
        const [t, r] = val.split("~").map((x) => x.trim());
        forms[code] = { t, r: r || "" };
      }
      if (!forms.fr && !forms.en) problems.push(`${where}: "${id}" has neither fr nor en`);
      items.push({ id, level, pos, theme: theme.id, forms });
    });
  }
  const ids = new Set();
  items.forEach((it) => { if (ids.has(it.id)) problems.push(`${kind}: duplicate id "${it.id}"`); ids.add(it.id); });
  return { themes, items };
}
// glosses of a concept for learners of `code`: every other language's form
function glosses(forms, code) {
  const g = {};
  for (const [c, f] of Object.entries(forms)) if (c !== code) g[c] = f.t;
  return g;
}
const normKey = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-֑ͯ-ׇ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// Themes of the Wiktionary vocabulary: by part of speech.
const WK_THEMES = [
  { id: "lex-noun", fr: "Noms", en: "Nouns", icon: "📦" },
  { id: "lex-verb", fr: "Verbes", en: "Verbs", icon: "🏃" },
  { id: "lex-adj", fr: "Adjectifs", en: "Adjectives", icon: "🎨" },
  { id: "lex-adv", fr: "Adverbes", en: "Adverbs", icon: "⏱️" },
  { id: "lex-gram", fr: "Mots grammaticaux", en: "Function words", icon: "🔗" },
  { id: "lex-other", fr: "Autres mots", en: "Other words", icon: "✳️" },
];
const WK_THEME = { noun: "lex-noun", verb: "lex-verb", adj: "lex-adj", adv: "lex-adv", character: "lex-other",
  pron: "lex-gram", det: "lex-gram", prep: "lex-gram", conj: "lex-gram", particle: "lex-gram", article: "lex-gram",
  postp: "lex-gram", num: "lex-gram", classifier: "lex-gram", counter: "lex-gram", contraction: "lex-gram", intj: "lex-other", phrase: "lex-other" };

// ---------------------------------------------------------------- build one language
const VOCAB = parseMatrix(path.join(CONTENT, "vocab"), "vocab");
const PHRASES = parseMatrix(path.join(CONTENT, "phrases"), "phrases");

function build(code) {
  const meta = META[code];
  const legacyFile = path.join(CONTENT, "legacy", code + ".json");
  const legacy = fs.existsSync(legacyFile) ? JSON.parse(fs.readFileSync(legacyFile, "utf8")) : {};
  const packFile = path.join(CONTENT, "langs", code + ".js"); // "_*.js" files are helpers
  const pack = fs.existsSync(packFile) ? require(packFile) : {};

  // --- words: legacy first (their levels/examples were authored), then concepts
  const words = [], byKey = new Map();
  (legacy.words || []).forEach((w, i) => {
    const word = { id: `w${i + 1}`, ...w };
    if (!LEVELS.includes(word.level)) problems.push(`${code}: legacy word "${w.t}" has level ${w.level}`);
    words.push(word);
    byKey.set(normKey(w.t), word);
  });
  const usedThemes = new Set(words.map((w) => w.theme));
  for (const c of VOCAB.items) {
    const f = c.forms[code];
    if (!f) continue;
    const g = glosses(c.forms, code);
    const existing = byKey.get(normKey(f.t));
    if (existing) { // same word already in the legacy list: give it every translation
      existing.g = { ...g, ...existing.g };
      if (!existing.r && f.r) existing.r = f.r;
      existing.cid = c.id;
      continue;
    }
    const w = { id: "c-" + c.id, t: f.t, r: f.r, level: c.level, theme: c.theme, pos: c.pos, g };
    words.push(w); byKey.set(normKey(f.t), w); usedThemes.add(c.theme);
  }
  (pack.words || []).forEach((w, i) => { // language-specific extra words
    if (byKey.has(normKey(w.t))) return;
    const word = { id: "x" + (i + 1), ...w };
    words.push(word); byKey.set(normKey(w.t), word); usedThemes.add(w.theme);
  });

  // --- large frequency-ranked vocabulary imported from Wiktionary (see
  // scripts/course/import-wiktionary.js and content/wiktionary/SOURCES.md).
  // Hand-authored words above always win; these fill every level.
  const wkFile = path.join(CONTENT, "wiktionary", code + ".json");
  if (fs.existsSync(wkFile)) {
    // duplicates: Hebrew/Arabic vowel marks ignored, Latin accents kept (Vietnamese
    // "ma", "má", "mà" are different words)
    const wkKey = (t) => String(t || "").toLowerCase().replace(/[\u0591-\u05C7\u064B-\u065F\u0670]/g, "").trim();
    const have = new Set(words.map((w) => wkKey(w.t)));
    JSON.parse(fs.readFileSync(wkFile, "utf8")).words.forEach((w, i) => {
      const key = wkKey(w.t);
      if (!key || have.has(key)) return;
      have.add(key);
      const theme = WK_THEME[w.pos] || "lex-other";
      const word = { id: "k" + (i + 1), t: w.t, r: w.r || "", level: w.level, theme, pos: w.pos || "", gender: "", g: w.g, src: "wk" };
      words.push(word); usedThemes.add(theme);
    });
  }

  // --- themes (labels: fr/en/... from the matrix header, legacy fr labels)
  const themes = [];
  const seenT = new Set();
  for (const t of (legacy.themes || []).concat(VOCAB.themes, pack.themes || [], WK_THEMES)) {
    if (seenT.has(t.id) || !usedThemes.has(t.id)) continue;
    seenT.add(t.id); themes.push(t);
  }

  // --- phrases
  const phrases = PHRASES.items.filter((p) => p.forms[code]).map((p) => ({ id: p.id, t: p.forms[code].t, r: p.forms[code].r, level: p.level, theme: p.theme, g: glosses(p.forms, code) }));
  for (const t of PHRASES.themes) if (!seenT.has(t.id) && phrases.some((p) => p.theme === t.id)) { seenT.add(t.id); themes.push(t); }
  (pack.phrases || []).forEach((p) => phrases.push(p));

  const merged = {
    v: 2, code, name: meta.name, flag: meta.flag, tts: meta.tts, ttsFallback: meta.ttsFallback || "", dir: meta.dir || "ltr",
    font: meta.font || "", greeting: meta.greeting, watermark: meta.watermark || meta.flag, kb: legacy.kb && legacy.kb.length ? legacy.kb : meta.kb || [],
    note: pack.note || legacy.note || null,
    themes, words, phrases,
    // pack.replace: legacy sections a richer pack supersedes (e.g. ["grammar"])
    grammar: (has(pack.replace, "grammar") ? [] : legacy.grammar || []).concat(pack.grammar || []),
    conj: pack.conj ? mergeConj(legacy.conj, pack.conj) : legacy.conj || null,
    alphabet: pack.alphabet || legacy.alphabet || null,
    alphabetExtra: pack.alphabetExtra || legacy.alphabetExtra || null,
    alphabetNote: pack.alphabetNote || null,
    readings: (has(pack.replace, "readings") ? [] : legacy.readings || []).concat(pack.readings || []),
    culture: pack.culture || [],
    cloze: (legacy.cloze || []).concat(pack.cloze || []),
    order: (legacy.order || []).concat(pack.order || []),
  };
  // every item must carry a CEFR level
  for (const k of ["grammar", "readings", "culture", "cloze", "order"]) {
    merged[k].forEach((it, i) => {
      if (!it.level) it.level = k === "grammar" ? guessGrammarLevel(i, merged[k].length) : "A2";
      if (!LEVELS.includes(it.level)) problems.push(`${code}.${k}[${i}]: bad level ${it.level}`);
      if (!it.id) it.id = k[0] + i;
    });
  }
  // Legacy HTML (old hand-built pages) carries inline handlers such as
  // onclick="ESP.speak('…')": blocked by the CSP and calling a function that no
  // longer exists. Turn them into the engine's delegated data-say buttons;
  // refuse any other inline handler.
  const fixInline = (html) => typeof html !== "string" ? html : html
    .replace(/<button class='speakbtn' onclick="[A-Z]+\.speak\('(.*?)'\)">/g, (m, t) => `<button type="button" class='soundbtn' data-say="${t.replace(/\\'/g, "'").replace(/"/g, "&quot;")}" aria-label="Écouter">`);
  const walk = (o) => { if (Array.isArray(o)) return o.map(walk); if (o && typeof o === "object") { for (const k of Object.keys(o)) o[k] = walk(o[k]); return o; } return fixInline(o); };
  for (const k of ["grammar", "readings", "culture"]) walk(merged[k]);
  if (/\son[a-z]+\s*=/i.test(JSON.stringify(merged))) problems.push(`${code}: inline event handler left in the content (blocked by the CSP)`);
  if (merged.conj) merged.conj.verbs.forEach((v) => { if (!v.level) v.level = "A2"; });
  words.forEach((w) => { if (!LEVELS.includes(w.level)) problems.push(`${code}: word ${w.id} "${w.t}" bad level ${w.level}`); });
  return merged;
}
function has(list, k) { return Array.isArray(list) && list.includes(k); }
function guessGrammarLevel(i, n) { return LEVELS[Math.min(3, Math.floor((4 * i) / Math.max(1, n)))]; }
function mergeConj(a, b) {
  if (!a) return b;
  return { pronouns: a.pronouns || b.pronouns, tenses: a.tenses.concat((b.tenses || []).filter((t) => !a.tenses.some((x) => x.id === t.id))), verbs: a.verbs.concat(b.verbs.filter((v) => !a.verbs.some((x) => x.t === v.t))), note: a.note || b.note };
}

// ---------------------------------------------------------------- app.html stubs
const PAGES = ["hub", "vocabulaire", "phrases", "grammaire", "conjugaison", "alphabet", "lecture", "ecoute", "exercices", "revision", "prononciation", "conversation", "culture", "examen", "amis", "stats", "badges", "certificat", "dictionnaire", "profil", "level_a1", "level_a2", "level_b1", "level_b2", "level_c1", "level_c2"];
const { THEME_INIT } = require("../liquid-glass");
function stub(code, page) {
  return `<!DOCTYPE html>
<html lang="fr"><head><script>(function(){try{
  var t = localStorage.getItem('lang_theme');
  ${THEME_INIT}
}catch(e){}})();</script>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><script src="/design-system/device.js"></script><script src="/design-system/liquid-glass.js"></script>
<title>${code === "@@CODE@@" ? "@@TITLE@@" : META[code].name}</title>
<link rel="stylesheet" href="/design-system/ios27-liquid-glass.css">
<link rel="stylesheet" href="/course/engine.css">
<link rel="stylesheet" href="/design-system/ios27-app.css">
<link rel="stylesheet" href="/design-system/papote.css">
<link rel="stylesheet" href="/design-system/liquid-glass.css">
<link rel="stylesheet" href="/design-system/responsive.css">
</head><body data-lang="${code}" data-page="${page}"><div id="app"></div>
<script src="/course/i18n.js"></script><script src="/course/kids.js"></script><script src="/course/engine.js"></script>
</body></html>`;
}
function writeAppPages() {
  // The course pages only differ by language, page and title: app.html gets one
  // template and builds the 24 x 39 pages in the browser (it used to embed all
  // of them, ~850 KB). The line keeps its "var ALL_PAGES = " prefix: the server
  // adds the CSP nonce and the asset versions to that line (see server.js).
  const appPath = path.join(ROOT, "app.html");
  let src = fs.readFileSync(appPath, "utf8");
  const PREFIX = "var ALL_PAGES = ";
  const start = src.indexOf(PREFIX);
  if (start === -1) throw new Error("ALL_PAGES not found in app.html");
  const lineEnd = src.indexOf("\n", start);
  const tpl = JSON.stringify(stub("@@CODE@@", "@@PAGE@@")).replace(/<\//g, "<\\/");
  const titles = JSON.stringify(Object.fromEntries(CODES.map((c) => [c, META[c].name])));
  const js = `(function(){var T=${tpl},N=${titles},P=${JSON.stringify(PAGES)},o={};` +
    `Object.keys(N).forEach(function(c){P.forEach(function(p){o[c+"__"+p+".html"]=T.split("@@CODE@@").join(c).split("@@PAGE@@").join(p).split("@@TITLE@@").join(N[c]);});});return o;})()`;
  src = src.slice(0, start) + PREFIX + js + ";" + src.slice(lineEnd);
  fs.writeFileSync(appPath, src);
  return CODES.length * PAGES.length;
}

// Pre-generated audio (scripts/audio/generate.py): each word/sentence that has
// a file gets "a": <id>, played from /course/audio/<code>/<id>.mp3.
function linkAudio(code, c) {
  const idx = path.join(ROOT, "course", "audio", code, "index.json");
  if (!fs.existsSync(idx)) return;
  const map = JSON.parse(fs.readFileSync(idx, "utf8"));
  let n = 0;
  for (const item of c.words.concat(c.phrases)) if (map[item.t]) { item.a = map[item.t]; n++; }
  c.audio = n > 0;
}

// ---------------------------------------------------------------- main
const report = [];
const built = {};
for (const code of CODES) {
  const c = build(code);
  built[code] = c;
  const lv = {}; c.words.forEach((w) => { lv[w.level] = (lv[w.level] || 0) + 1; });
  report.push(`${code.padEnd(4)} words ${String(c.words.length).padStart(5)}  [${LEVELS.map((l) => l + ":" + (lv[l] || 0)).join(" ")}]  phrases ${c.phrases.length}  grammar ${c.grammar.length}  conj ${c.conj ? c.conj.verbs.length : 0}  readings ${c.readings.length}  culture ${c.culture.length}  alphabet ${c.alphabet ? c.alphabet.length : 0}`);
}
if (problems.length) { console.error(problems.slice(0, 60).join("\n")); console.error(`${problems.length} problem(s)`); process.exit(1); }
console.log(report.join("\n"));
if (!CHECK) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [code, c] of Object.entries(built)) { linkAudio(code, c); fs.writeFileSync(path.join(OUT, code + ".json"), JSON.stringify(c)); }
  console.log(`course/data: ${CODES.length} files · app.html: ${writeAppPages()} page stubs`);
}
