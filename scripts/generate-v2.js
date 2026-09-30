// Generates hub/vocabulaire/grammaire/exercices/lecture/profil pages for the 30
// "starter tier" languages (lang-data-v2.js) and splices them into app.html's
// ALL_PAGES object. Mirrors generate.js but pulls from the lighter v2 dataset,
// and (this time) properly escapes "</script>" inside embedded HTML so it can't
// break out of the outer <script> block that wraps ALL_PAGES in app.html.
const fs = require("fs");
const path = require("path");
const DATA = require("./lang-data-v2");
const { themeHtml } = require("./liquid-glass");

function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

function shell(lang, meta, title, bodyHtml, extraScript) {
  // themeHtml(): links the design-system stylesheets and normalizes anything
  // left literal, so generated pages match the rest of the app exactly.
  return themeHtml(`<!DOCTYPE html>
<html lang="fr"><head><script>(function(){try{
  var t = localStorage.getItem('lang_theme');
  if(t==='dark') document.documentElement.setAttribute('data-theme','dark');
}catch(e){}})();<\/script>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.name)} - ${esc(title)}</title>
<style>
/* iOS 27 Liquid Glass: every value is a design-system token (design-system/
   ios27-liquid-glass.css); --ink/--bg/--primary/... are bridged to tokens by
   design-system/ios27-app.css. themeHtml() below adds both stylesheets. */
*{box-sizing:border-box;margin:0;padding:0}
html{height:100%}
body{font-family:var(--ig27-font-family);background:var(--bg);color:var(--ink);
  min-height:100vh;padding-bottom:var(--ig27-space-8)}
.wrap{max-width:720px;margin:0 auto;padding:var(--ig27-space-5) var(--ig27-content-margin)}
.top{display:flex;align-items:center;gap:var(--ig27-space-3);margin-bottom:var(--ig27-space-4)}
.top .flag{font-size:var(--ig27-fs-title1);line-height:var(--ig27-lh-title1);letter-spacing:var(--ig27-ls-title1)}
.top h1{font-size:var(--ig27-fs-title3);line-height:var(--ig27-lh-title3);letter-spacing:var(--ig27-ls-title3);font-weight:var(--ig27-weight-heavy)}
.top .sub{font-size:var(--ig27-fs-caption1);line-height:var(--ig27-lh-caption1);letter-spacing:var(--ig27-ls-caption1);color:var(--muted)}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--ig27-radius-xxl);padding:var(--ig27-space-4);margin-bottom:var(--ig27-space-3)}
.note{font-size:var(--ig27-fs-footnote);line-height:var(--ig27-lh-footnote);letter-spacing:var(--ig27-ls-footnote);color:var(--muted);margin-bottom:var(--ig27-space-4);background:var(--surface);
  border:1px solid var(--line);border-radius:var(--ig27-radius-xl);padding:var(--ig27-space-3) var(--ig27-space-4)}
h2{font-size:var(--ig27-fs-subheadline);line-height:var(--ig27-lh-subheadline);letter-spacing:var(--ig27-ls-subheadline);margin-bottom:var(--ig27-space-2)}
button{font-family:inherit;cursor:pointer;color:inherit}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:var(--ig27-space-2)}
.vocab-item{display:flex;flex-direction:column;gap:2px;padding:var(--ig27-space-2) var(--ig27-space-3);border-radius:var(--ig27-radius-xl);background:var(--bg);
  border:1px solid var(--line)}
.vocab-item .w{font-size:var(--ig27-fs-callout);line-height:var(--ig27-lh-callout);letter-spacing:var(--ig27-ls-callout);font-weight:var(--ig27-weight-bold)}
.vocab-item .r{font-size:var(--ig27-fs-caption1);line-height:var(--ig27-lh-caption1);letter-spacing:var(--ig27-ls-caption1);color:var(--accent);font-weight:var(--ig27-weight-semibold)}
.vocab-item .f{font-size:var(--ig27-fs-footnote);line-height:var(--ig27-lh-footnote);letter-spacing:var(--ig27-ls-footnote);color:var(--muted)}
.gram-item{padding:var(--ig27-space-2) 0;border-bottom:1px solid var(--line)}
.gram-item:last-child{border-bottom:none}
.gram-item b{display:block;font-size:var(--ig27-fs-subheadline);line-height:var(--ig27-lh-subheadline);letter-spacing:var(--ig27-ls-subheadline);margin-bottom:var(--ig27-space-1);color:var(--primary)}
.gram-item p{font-size:var(--ig27-fs-footnote);line-height:var(--ig27-lh-footnote);letter-spacing:var(--ig27-ls-footnote);color:var(--muted)}
.ex-item{margin-bottom:var(--ig27-space-3);padding-bottom:var(--ig27-space-3);border-bottom:1px solid var(--line)}
.ex-item:last-child{border:none}
.ex-q{font-size:var(--ig27-fs-subheadline);line-height:var(--ig27-lh-subheadline);letter-spacing:var(--ig27-ls-subheadline);font-weight:var(--ig27-weight-semibold);margin-bottom:var(--ig27-space-2)}
.ex-opts{display:flex;flex-wrap:wrap;gap:var(--ig27-space-2)}
.ex-opt{border:1px solid var(--line);background:var(--surface);border-radius:var(--ig27-radius-full);padding:var(--ig27-space-2) var(--ig27-space-3);font-size:var(--ig27-fs-footnote);line-height:var(--ig27-lh-footnote);letter-spacing:var(--ig27-ls-footnote)}
.ex-opt.correct{background:var(--green-soft);border-color:var(--green)}
.ex-opt.wrong{background:var(--red-soft);border-color:var(--red)}
.read-item{margin-bottom:var(--ig27-space-3)}
.read-native{font-size:var(--ig27-fs-callout);line-height:var(--ig27-lh-callout);letter-spacing:var(--ig27-ls-callout);font-weight:var(--ig27-weight-semibold);margin-bottom:var(--ig27-space-1)}
.read-fr{font-size:var(--ig27-fs-footnote);line-height:var(--ig27-lh-footnote);letter-spacing:var(--ig27-ls-footnote);color:var(--muted);cursor:pointer;text-decoration:underline}
.read-fr.hide-fr{display:none}
.score{font-size:var(--ig27-fs-footnote);line-height:var(--ig27-lh-footnote);letter-spacing:var(--ig27-ls-footnote);color:var(--muted);margin-bottom:var(--ig27-space-2)}
.premium-banner{background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:var(--ig27-on-accent);border-radius:var(--ig27-radius-xxl);padding:var(--ig27-space-3) var(--ig27-space-4);
  margin-bottom:var(--ig27-space-3);font-size:var(--ig27-fs-footnote);line-height:var(--ig27-lh-footnote);letter-spacing:var(--ig27-ls-footnote);display:flex;align-items:center;justify-content:space-between;gap:var(--ig27-space-2);flex-wrap:wrap}
.premium-banner a{color:var(--ig27-on-accent);font-weight:var(--ig27-weight-heavy);text-decoration:underline;white-space:nowrap}
</style></head>
<body>
<div class="wrap">
<div class="top"><span class="flag">${meta.flag}</span><div><h1>${esc(meta.name)}</h1><div class="sub">${esc(title)} · débutant</div></div></div>
<div id="premiumBannerSlot"></div>
${bodyHtml}
</div>
<script>
(function(){
  if (document.getElementById('premiumBannerSlot') && ${JSON.stringify(title !== "Accueil" && title !== "Profil")}) {
    fetch('/api/features').then(function(r){return r.ok?r.json():null;}).then(function(d){
      if (!d || d.unlocked) return;
      var premiumOn = (d.features||[]).some(function(f){return f.locked;});
      if (!premiumOn) return;
      document.getElementById('premiumBannerSlot').innerHTML =
        '<div class="premium-banner">✨ Feedback, leçons et exercices avancés disponibles avec Premium <a href="/subscribe">Débloquer ›</a></div>';
    }).catch(function(){});
  }
})();
<\/script>
${extraScript || ""}
</body></html>`);
}

function pageHub(lang, meta) {
  const body = `
<div class="note">${esc(meta.scriptNote)}</div>
<div class="card"><h2>Au programme (débutant)</h2>
<p style="font-size:13px;color:var(--muted);line-height:1.6">
Vocabulaire de base, quelques points de grammaire essentiels, un mini-quiz et un
court texte de lecture. Accès gratuit pour tout le monde ; l'abonnement Premium
débloquera du feedback et des leçons plus poussés à mesure que ce module s'enrichit.
</p></div>`;
  return shell(lang, meta, "Accueil", body);
}

function pageVocab(lang, meta) {
  const themes = Object.entries(DATA[lang].vocab)
    .map(([theme, words]) => `<div class="card"><h2>${esc(theme)}</h2><div class="grid2">${words
      .map(([w, r, f]) => `<div class="vocab-item"><span class="w">${esc(w)}</span><span class="r">${esc(r)}</span><span class="f">${esc(f)}</span></div>`)
      .join("")}</div></div>`)
    .join("");
  return shell(lang, meta, "Vocabulaire", themes);
}

function pageGrammar(lang, meta) {
  const items = DATA[lang].grammar
    .map(([t, d]) => `<div class="gram-item"><b>${esc(t)}</b><p>${esc(d)}</p></div>`)
    .join("");
  return shell(lang, meta, "Grammaire", `<div class="card">${items}</div>`);
}

function pageLecture(lang, meta) {
  const items = DATA[lang].reading
    .map(([native, fr], i) => `<div class="read-item"><div class="read-native">${esc(native)}</div>
      <div class="read-fr hide-fr" id="fr${i}">${esc(fr)}</div>
      <div class="read-fr" onclick="document.getElementById('fr${i}').classList.toggle('hide-fr')" style="text-decoration:underline">Voir la traduction</div></div>`)
    .join("");
  return shell(lang, meta, "Lecture", `<div class="card">${items}</div>`);
}

function pageExercices(lang, meta) {
  const allWords = Object.values(DATA[lang].vocab).flat();
  function shuffle(a) { const arr = a.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  const pool = shuffle(allWords).slice(0, Math.min(12, allWords.length));
  const items = pool.map(([w, r, correct], idx) => {
    const others = allWords.filter((x) => x[2] !== correct);
    const distractors = shuffle(others).slice(0, Math.min(3, others.length)).map((x) => x[2]);
    const options = shuffle([correct, ...distractors]);
    const optsHtml = options
      .map((o) => `<button class="ex-opt" onclick="checkAnswer(this,${idx},'${esc(correct).replace(/'/g, "\\'")}')">${esc(o)}</button>`)
      .join("");
    return `<div class="ex-item" id="exi${idx}"><div class="ex-q">${esc(w)}${r ? ` <span style="color:var(--muted);font-weight:400">(${esc(r)})</span>` : ""} = ?</div><div class="ex-opts">${optsHtml}</div></div>`;
  }).join("");
  const script = `<script>
var score=0, answered=0, total=${pool.length};
function checkAnswer(btn, idx, correct){
  var item = document.getElementById('exi'+idx);
  if (item.dataset.done) return;
  item.dataset.done = "1";
  answered++;
  var opts = item.querySelectorAll('.ex-opt');
  opts.forEach(function(o){
    if (o.textContent.trim() === correct) o.classList.add('correct');
    else if (o === btn) o.classList.add('wrong');
    o.disabled = true;
  });
  if (btn.textContent.trim() === correct) score++;
  document.getElementById('scoreBox').textContent = 'Score : ' + score + ' / ' + answered + ' (sur ' + total + ' questions)';
}
<\/script>`;
  const body = `<div class="score" id="scoreBox">Score : 0 / 0 (sur ${pool.length} questions)</div>${items}`;
  return shell(lang, meta, "Exercices", body, script);
}

function pageProfil(lang, meta) {
  const body = `
<div class="card"><h2>Ton profil</h2>
<p style="font-size:13px;color:var(--muted)">Connecté(e) sur le compte de l'application. Utilise le bouton « Toutes les langues » pour changer de langue, ou « Se déconnecter » depuis l'accueil.</p>
</div>
<div class="card"><h2>Progression</h2>
<p style="font-size:13px;color:var(--muted)">Le suivi détaillé de la progression et les leçons avancées arriveront avec les prochaines mises à jour de ce module.</p>
</div>`;
  return shell(lang, meta, "Profil", body);
}

const NEW_LANGS = Object.keys(DATA);
const entries = {};
for (const lang of NEW_LANGS) {
  const meta = DATA[lang];
  entries[`${lang}__hub.html`] = pageHub(lang, meta);
  entries[`${lang}__vocabulaire.html`] = pageVocab(lang, meta);
  entries[`${lang}__grammaire.html`] = pageGrammar(lang, meta);
  entries[`${lang}__exercices.html`] = pageExercices(lang, meta);
  entries[`${lang}__lecture.html`] = pageLecture(lang, meta);
  entries[`${lang}__profil.html`] = pageProfil(lang, meta);
}

// Splice into app.html's ALL_PAGES: parse the object, add/replace these keys
// (re-running the generator updates pages instead of duplicating them), and
// write it back as one JSON line.
// IMPORTANT: JSON.stringify does NOT escape "/", so any literal "</script>"
// inside the embedded HTML would prematurely close the *outer* <script> tag
// that wraps ALL_PAGES in app.html -> escape every "</" as "<\/".
const appPath = path.join(__dirname, "..", "app.html");
let content = fs.readFileSync(appPath, "utf8");
const PREFIX = "var ALL_PAGES = ";
const start = content.indexOf(PREFIX);
if (start === -1) {
  console.error("ALL_PAGES not found - aborting to avoid corrupting app.html");
  process.exit(1);
}
const lineEnd = content.indexOf("\n", start);
let literal = content.slice(start + PREFIX.length, lineEnd).trim();
if (literal.endsWith(";")) literal = literal.slice(0, -1);
const pages = JSON.parse(literal);
Object.assign(pages, entries);
const out = JSON.stringify(pages).replace(/<\//g, "<\\/");
content = content.slice(0, start) + PREFIX + out + ";" + content.slice(lineEnd);
fs.writeFileSync(appPath, content);
console.log(`Wrote ${Object.keys(entries).length} pages for ${NEW_LANGS.length} languages. New app.html size: ${(content.length / 1e6).toFixed(2)} MB`);
