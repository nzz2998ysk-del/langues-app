// Course content + premium features, shared by server.js.
//
// Content lives in course/data/<code>.json (built by scripts/course/build.js
// from content/). It is NOT served statically: /api/course/:lang goes through
// here so premium-only content (C1/C2 levels, the extra exercise material) is
// actually withheld from free accounts instead of just being hidden in the UI.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "course", "data");
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const PREMIUM_LEVELS = new Set(["C1", "C2"]);

// Global premium features (independent of the per-language module grid). Each
// is a row in the `features` table (category 'global') so the admin can make
// any of them free with one switch. The engine (course/engine.js) checks
// access.features[key] before enabling the matching screen or behaviour.
const PREMIUM_FEATURES = [
  { key: "premium:levels-c", label: "Niveaux C1 / C2 (mots, leçons, examens)" },
  { key: "premium:lessons-unlimited", label: "Leçons illimitées (sinon 3 leçons par jour)" },
  { key: "premium:srs-advanced", label: "Révision SRS avancée (algorithme SM-2, prévisions, sans limite)" },
  { key: "premium:pronunciation-ai", label: "Exercices de prononciation avec reconnaissance vocale et score" },
  { key: "premium:stats-advanced", label: "Statistiques avancées (par thème, niveau, historique)" },
  { key: "premium:progress-detailed", label: "Progression détaillée mot par mot" },
  { key: "premium:certificates", label: "Certificats de niveau" },
  { key: "premium:badges", label: "Badges et succès" },
  { key: "premium:offline", label: "Mode hors-ligne" },
  { key: "premium:custom-words", label: "Mots personnels illimités (sinon 20)" },
  { key: "premium:exam", label: "Examens blancs par niveau" },
  { key: "premium:export", label: "Export de la progression (CSV)" },
];

const cache = new Map(); // code -> { mtimeMs, data }
function loadCourse(code) {
  if (!/^[a-z]{2,3}$/.test(code)) return null;
  const file = path.join(DATA_DIR, code + ".json");
  let st;
  try { st = fs.statSync(file); } catch (e) { return null; }
  const hit = cache.get(code);
  if (hit && hit.mtimeMs === st.mtimeMs) return hit.data;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  cache.set(code, { mtimeMs: st.mtimeMs, data });
  return data;
}

// Returns a copy of the course for one user: admin level overrides applied,
// premium-only material removed when locked (with counts kept, so the UI can
// show what Premium would unlock).
function courseForUser(course, { overrides, levelsLocked }) {
  const out = { ...course };
  let words = course.words;
  if (overrides && overrides.size) {
    words = words.map((w) => (overrides.has(w.id) ? { ...w, level: overrides.get(w.id), levelOverridden: true } : w));
  }
  const lockedCounts = {};
  const keep = (item) => {
    if (!levelsLocked || !PREMIUM_LEVELS.has(item.level)) return true;
    lockedCounts[item.level] = (lockedCounts[item.level] || 0) + 1;
    return false;
  };
  out.words = words.filter(keep);
  for (const k of ["phrases", "grammar", "readings", "culture", "cloze", "order"]) {
    if (Array.isArray(course[k])) out[k] = course[k].filter(keep);
  }
  out.locked = { levels: levelsLocked ? [...PREMIUM_LEVELS] : [], counts: lockedCounts };
  return out;
}

// Keeps the course_words table (one row per word, with its CEFR level) in
// sync with the built content. Runs at startup; a content hash stored in
// app_meta makes it a no-op when nothing changed. Admin overrides live in a
// separate column and are never touched by the sync.
async function syncVocabulary(pool) {
  let files = [];
  try { files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")); } catch (e) { return 0; }
  const hash = crypto.createHash("sha256");
  for (const f of files.sort()) hash.update(f + fs.statSync(path.join(DATA_DIR, f)).size);
  const digest = hash.digest("hex");
  const prev = await pool.query("SELECT value FROM app_meta WHERE key = 'course_words_hash'");
  if (prev.rows[0] && prev.rows[0].value === digest) return 0;

  let total = 0;
  for (const f of files) {
    const code = f.replace(/\.json$/, "");
    const course = loadCourse(code);
    if (!course) continue;
    const ids = [], words = [], roms = [], glosses = [], themes = [], levels = [];
    for (const w of course.words) {
      ids.push(w.id); words.push(w.t); roms.push(w.r || ""); glosses.push((w.g && (w.g.fr || w.g.en)) || "");
      themes.push(w.theme || ""); levels.push(w.level);
    }
    await pool.query(
      `INSERT INTO course_words (lang, word_id, word, romanization, gloss_fr, theme, level)
       SELECT $1, * FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[])
       ON CONFLICT (lang, word_id) DO UPDATE SET word = EXCLUDED.word, romanization = EXCLUDED.romanization,
         gloss_fr = EXCLUDED.gloss_fr, theme = EXCLUDED.theme, level = EXCLUDED.level, updated_at = NOW()`,
      [code, ids, words, roms, glosses, themes, levels]
    );
    await pool.query("DELETE FROM course_words WHERE lang = $1 AND NOT (word_id = ANY($2::text[]))", [code, ids]);
    total += ids.length;
  }
  await pool.query(
    `INSERT INTO app_meta (key, value) VALUES ('course_words_hash', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [digest]
  );
  return total;
}

module.exports = { LEVELS, PREMIUM_LEVELS, PREMIUM_FEATURES, loadCourse, courseForUser, syncVocabulary };
