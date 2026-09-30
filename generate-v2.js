// Generates hub/vocabulaire/grammaire/exercices/lecture/profil pages for the 30
// "starter tier" languages (lang-data-v2.js) and splices them into app.html's
// ALL_PAGES object. Mirrors generate.js but pulls from the lighter v2 dataset,
// and (this time) properly escapes "</script>" inside embedded HTML so it can't
// break out of the outer <script> block that wraps ALL_PAGES in app.html.
const fs = require("fs");
const path = require("path");
const DATA = require("./lang-data-v2");

function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

function shell(lang, meta, title, bodyHtml, extraScript) {
  return `<!DOCTYPE html>
<html lang="fr"><head><script>(function(){try{
  var t = localStorage.getItem('lang_theme');
  if(t==='dark') document.documentElement.setAttribute('data-theme','dark');
}catch(e){}})();<\/script>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.name)} - ${esc(title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html{height:100%}
:root{
  --ink:#201C2E; --muted:#726C8A; --bg:#F5F1EC; --surface:#FFFFFF;
  --primary:${meta.color}; --primary-dark:#241F5C; --accent:#EF8A2E;
  --line:rgba(32,28,46,.1); --green:#2E9E6D; --green-soft:#DFF3EA; --red:#E1524B; --red-soft:#FBE2E0;
}
:root[data-theme="dark"]{--ink:#F0EDF7;--muted:#A39CC4;--bg:#181521;--surface:#221E30;--line:rgba(255,255,255,.09)}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--ink);
  min-height:100vh;padding-bottom:30px}
.wrap{max-width:720px;margin:0 auto;padding:20px 16px}
.top{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.top .flag{font-size:28px}
.top h1{font-size:19px;font-weight:800}
.top .sub{font-size:12px;color:var(--muted)}
.card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:14px}
.note{font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:16px;background:var(--surface);
  border:1px solid var(--line);border-radius:12px;padding:12px 14px}
h2{font-size:15px;margin-bottom:10px}
button{font-family:inherit;cursor:pointer;color:inherit}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.vocab-item{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:10px;background:var(--bg);
  border:1px solid var(--line)}
.vocab-item .w{font-size:16px;font-weight:700}
.vocab-item .r{font-size:11.5px;color:var(--accent);font-weight:600}
.vocab-item .f{font-size:12.5px;color:var(--muted)}
.gram-item{padding:10px 0;border-bottom:1px solid var(--line)}
.gram-item:last-child{border-bottom:none}
.gram-item b{display:block;font-size:14px;margin-bottom:4px;color:var(--primary)}
.gram-item p{font-size:13px;color:var(--muted);line-height:1.55}
.ex-item{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--line)}
.ex-item:last-child{border:none}
.ex-q{font-size:14.5px;font-weight:600;margin-bottom:8px}
.ex-opts{display:flex;flex-wrap:wrap;gap:8px}
.ex-opt{border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:8px 12px;font-size:13px}
.ex-opt.correct{background:var(--green-soft);border-color:var(--green)}
.ex-opt.wrong{background:var(--red-soft);border-color:var(--red)}
.read-item{margin-bottom:14px}
.read-native{font-size:15.5px;font-weight:600;margin-bottom:4px}
.read-fr{font-size:12.5px;color:var(--muted);cursor:pointer;text-decoration:underline}
.read-fr.hide-fr{display:none}
.score{font-size:13px;color:var(--muted);margin-bottom:10px}
.premium-banner{background:linear-gradient(135deg,#4A3FA0,#241F5C);color:#fff;border-radius:14px;padding:14px 16px;
  margin-bottom:14px;font-size:13px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.premium-banner a{color:#fff;font-weight:800;text-decoration:underline;white-space:nowrap}
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
</body></html>`;
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

// Build the JS snippet to splice in: ", "key": "escaped"" pairs.
// IMPORTANT: JSON.stringify does NOT escape "/", so any literal "</script>"
// inside the embedded HTML (there are some, in the inline <script> blocks
// above) would prematurely close the *outer* <script> tag that wraps
// ALL_PAGES in app.html. Replace "<\/" -> "<\\/" after stringifying, exactly
// like the repair fix applied to the previous 5-language batch.
let snippet = "";
for (const [key, html] of Object.entries(entries)) {
  const jsonStr = JSON.stringify(html).replace(/<\//g, "<\\/");
  snippet += `, ${JSON.stringify(key)}: ${jsonStr}`;
}

const appPath = path.join(__dirname, "..", "app.html");
let content = fs.readFileSync(appPath, "utf8");
const marker = '"};\n\n\nvar container = document.getElementById';
const idx = content.indexOf(marker);
if (idx === -1) {
  console.error("Marker not found - aborting to avoid corrupting app.html");
  process.exit(1);
}
const insertAt = idx + 1;
content = content.slice(0, insertAt) + snippet + content.slice(insertAt);
fs.writeFileSync(appPath, content);
console.log(`Inserted ${Object.keys(entries).length} pages for ${NEW_LANGS.length} languages. New app.html size: ${(content.length / 1e6).toFixed(2)} MB`);
