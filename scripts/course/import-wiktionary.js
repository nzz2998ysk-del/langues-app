#!/usr/bin/env node
// Imports a large, frequency-ranked vocabulary for every course language from
// two free, licensed sources (both CC BY-SA, attribution in content/wiktionary/SOURCES.md):
//
//   - meanings:  Wiktionary, via the "<Language>-English Wiktionary dictionary.tsv"
//                files of github.com/Vuizur/Wiktionary-Dictionaries (CC BY-SA 3.0 / GFDL)
//   - frequency: OpenSubtitles 2018 word counts, github.com/hermitdave/FrequencyWords
//                (content CC BY-SA 4.0)
//
// Output: content/wiktionary/<code>.json, merged by scripts/course/build.js after
// the hand-authored words (which always win). Run it again whenever the sources
// are refreshed:
//
//   node scripts/course/import-wiktionary.js --src /path/to/data-src
//     (data-src/wd/*.tsv and data-src/freq/<lang>.txt)
//
// How it works:
//   1. each dictionary line is "lemma|inflected forms…<TAB>html"; every form maps
//      back to its lemma, so frequent inflected forms ("comí") rank their lemma
//      ("comer");
//   2. frequency lists are read in order; a lemma gets the rank of its most
//      frequent form; proper nouns, symbols, multi-word entries and vulgar,
//      obsolete or "form of" senses are dropped;
//   3. levels come from the rank: A1 < 800, A2 < 2000, B1 < 4000, B2 < 7000,
//      C1 < 10500, C2 < 15000;
//   4. the English meaning comes from Wiktionary; the French one is pivoted
//      through the French-English dictionary (the most frequent French word whose
//      own meaning is that English word, same part of speech). Without a French
//      pivot, the app shows the English meaning with an "EN" tag;
//   5. languages without a frequency list are ranked by the frequency of their
//      English meaning (concept frequency).
"use strict";
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const SRC = args.includes("--src") ? args[args.indexOf("--src") + 1] : "/home/user/data-src";
const OUT = path.join(__dirname, "..", "..", "content", "wiktionary");
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;

// course code -> [Wiktionary dictionary name, frequency list file or null]
const LANGS = {
  ar: ["Arabic", "ar"], cs: ["Czech", "cs"], cy: ["Welsh", null], da: ["Danish", "da"], de: ["German", "de"],
  el: ["Greek", "el"], en: ["English", "en"], eo: ["Esperanto", "eo"], es: ["Spanish", "es"], fr: ["French", "fr"],
  ga: ["Irish", null], gd: ["Scottish Gaelic", null], haw: ["Hawaiian", null], he: ["Hebrew", "he"], hi: ["Hindi", "hi"],
  ht: ["Haitian Creole", null], hu: ["Hungarian", "hu"], id: ["Indonesian", "id"], it: ["Italian", "it"], ja: ["Japanese", "ja"],
  ko: ["Korean", "ko"], la: ["Latin", null], nb: ["Norwegian", "no"], nv: ["Navajo", null], pl: ["Polish", "pl"],
  pt: ["Portuguese", "pt"], ro: ["Romanian", "ro"], ru: ["Russian", "ru"], sw: ["Swahili", null], tr: ["Turkish", "tr"],
  uk: ["Ukrainian", "uk"], vi: ["Vietnamese", "vi"], zh: ["Chinese", "zh_cn"], zu: ["Zulu", null],
};
const CUTS = [[800, "A1"], [2000, "A2"], [4000, "B1"], [7000, "B2"], [10500, "C1"], [15000, "C2"]];
const MAX = CUTS[CUTS.length - 1][0];
const levelOf = (k) => (CUTS.find(([n]) => k < n) || [])[1];

const KEEP_POS = new Set(["noun", "verb", "adj", "adv", "pron", "det", "prep", "conj", "particle", "intj", "num", "postp", "article", "contraction", "phrase", "classifier", "counter"]);
const BAD_SENSE = /\b(vulgar|offensive|derogatory|ethnic slur|slur|obsolete|archaic|dated|rare|nonstandard|misspelling|euphemistic|pejorative|sexual|internet slang|historical)\b/i;
const FORM_OF = /\b(allomorph|plural|singular|feminine|masculine|neuter|inflection|inflected|conjugation|conjugated|participle|gerund|alternative|alternate|archaic|obsolete|misspelling|nonstandard|abbreviation|initialism|acronym|diminutive|augmentative|superlative|comparative|genitive|dative|accusative|vocative|ablative|instrumental|locative|nominative|romanization|spelling|form|tense|imperative|subjunctive|indicative|infinitive|mutation|lenited|eclipsed|construct|apocopic|clipping|contraction|short)\b[^.]*\bof\b/i;
const LETTER = /\b(name of the|letter of the)\b.*\b(letter|alphabet|script)\b|\b(script|alphabet) letter\b/i;
const LATIN = /^[A-Za-zÀ-ɏḀ-ỿ'’ʻʼ\- ]+$/;

function strip(html) {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}
function cleanSense(s) {
  let t = strip(s).replace(/^\s*\((?:[^()]|\([^()]*\))*\)\s*/, ""); // leading labels "(transitive)"
  t = t.replace(/\s*\((?:[^()]|\([^()]*\))*\)/g, "").replace(/\s+([.,;:])/g, "$1").replace(/[\s.:;,]+$/, "").trim(); // parentheses, then trailing punctuation
  return t;
}
function parseEntry(html) {
  const blocks = [];
  const re = /<i>([^<]+)<\/i><br><ol>([\s\S]*?)<\/ol>/g;
  let m;
  while ((m = re.exec(html))) {
    const pos = m[1].trim().toLowerCase();
    const senses = []; let labeled = 0;
    const li = /<li>([\s\S]*?)<\/li>/g; let s;
    while ((s = li.exec(m[2]))) {
      const raw = strip(s[1]);
      if (BAD_SENSE.test(raw) || FORM_OF.test(raw) || LETTER.test(raw)) continue;
      const c = cleanSense(s[1]);
      if (c && c.length <= 140 && senses.indexOf(c) < 0) { senses.push(c); if (/^\(/.test(raw)) labeled++; }
    }
    blocks.push({ pos, senses, labeled });
  }
  return blocks;
}
function loadDict(name) {
  const file = path.join(SRC, "wd", `${name}-English Wiktionary dictionary.tsv`);
  const lemmas = new Map(); // lemma -> { blocks, alts }
  const forms = new Map();  // lowercased form -> lemma
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const tab = line.indexOf("\t"); if (tab < 1) continue;
    const heads = line.slice(0, tab).split("|").map((h) => h.trim()).filter(Boolean);
    const lemma = heads[0];
    if (!lemma || /\s/.test(lemma) || /\d/.test(lemma)) continue; // multi-word / numbers
    const blocks = parseEntry(line.slice(tab + 1));
    const prev = lemmas.get(lemma);
    if (prev) prev.blocks.push(...blocks); else lemmas.set(lemma, { blocks, alts: heads.slice(1) });
    for (const h of heads) { const k = h.toLowerCase(); if (!forms.has(k) || h === lemma) forms.set(k, lemma); }
  }
  // a form that is itself a lemma means that lemma ("an" is a preposition, not
  // only a piece of "fängt an")
  for (const lemma of lemmas.keys()) forms.set(lemma.toLowerCase(), lemma);
  return { lemmas, forms };
}
function loadFreq(file) {
  if (!file) return null;
  const p = path.join(SRC, "freq", file + ".txt");
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8").split("\n").map((l) => l.split(" ")[0]).filter(Boolean);
}
// first usable block (a real part of speech with at least one clean sense)
function usable(entry, code) {
  // the richest part of speech, with a head start for the first one listed
  // (Wiktionary lists the main etymology first): "poder" -> verb, "bir" -> numeral
  let best = null, bestScore = -1;
  entry.blocks.forEach((b, i) => {
    const ok = (b.pos === "character" && code === "zh") || KEEP_POS.has(b.pos);
    const score = b.senses.length + (i === 0 ? 2 : 0);
    if (ok && b.senses.length && score > bestScore) { best = b; bestScore = score; }
  });
  return best;
}
const POS_CLASS = (p) => (p === "verb" ? "v" : p === "noun" ? "n" : p === "adj" ? "a" : p === "adv" ? "r" : "o");
function englishTerms(sense) {
  return sense.split(/[;,]/).map((t) => t.trim().toLowerCase().replace(/^(to|a|an|the)\s+/, "").replace(/[!?.…]+$/, "").trim())
    .filter((t) => t && t.length <= 30 && /^[a-z][a-z' -]*$/.test(t));
}
function glossOf(block) {
  const out = []; let len = 0;
  for (const s of block.senses) { if (out.length >= 2 || len + s.length > 70) break; out.push(s); len += s.length; }
  if (!out.length) { const f = block.senses[0]; out.push(f.length > 70 ? f.slice(0, 70).replace(/\s+\S*$/, "") + "…" : f); }
  return out.join("; ");
}
function romanization(entry, code) {
  if (["ja", "zh", "ko", "ar", "he", "hi", "ru", "uk", "el"].indexOf(code) < 0) return "";
  const r = entry.alts.find((a) => LATIN.test(a) && /[a-z]/i.test(a));
  return r || "";
}

// ---------------------------------------------------------------- French pivot
const frFreq = loadFreq("fr") || [];
const frRank = new Map(frFreq.map((w, i) => [w, i]));
const pivot = new Map(); // "class|term" and "term" -> [{ fr, rank }]
{
  const { lemmas } = loadDict("French");
  for (const [lemma, entry] of lemmas) {
    if (!/^[a-zà-ÿœæ'-]+$/i.test(lemma) || lemma[0] !== lemma[0].toLowerCase()) continue; // no proper nouns
    const rank = frRank.has(lemma) ? frRank.get(lemma) : 1e6;
    for (const b of entry.blocks) {
      if (!KEEP_POS.has(b.pos)) continue;
      // main meanings only (first two senses, first two terms): precision first;
      // the very first term of the first sense is preferred ("vous" for "you")
      b.senses.slice(0, 2).forEach((s, si) => {
        englishTerms(s).slice(0, 2).forEach((t, ti) => {
          const primary = si === 0 && ti === 0 ? 0 : 1;
          for (const k of [POS_CLASS(b.pos) + "|" + t, t]) {
            const list = pivot.get(k) || []; list.push({ fr: lemma, rank, primary }); pivot.set(k, list);
          }
        });
      });
    }
  }
  // primary meanings first, then the most frequent French word
  for (const list of pivot.values()) list.sort((a, b) => (a.primary - b.primary) || (a.rank - b.rank));
}
const FR_FIX = { not: "ne… pas", "do": "faire", "will": "(futur)", would: "(conditionnel)" };
function frenchFor(block) {
  const out = [];
  const first = englishTerms(block.senses[0] || "")[0];
  if (first && FR_FIX[first]) return FR_FIX[first];
  for (const s of block.senses.slice(0, 2)) {
    for (const t of englishTerms(s).slice(0, 2)) {
      const hit = (pivot.get(POS_CLASS(block.pos) + "|" + t) || [])[0];
      if (hit && hit.rank < 60000 && out.indexOf(hit.fr) < 0) out.push(hit.fr);
      if (out.length >= 2) break;
    }
    if (out.length >= 2) break;
  }
  return out.join(", ");
}

// English word -> French: candidates whose MAIN meaning is this word, same part
// of speech first ("you" -> "vous, tu"), most frequent French words first.
function frenchOfEnglish(word, pos) {
  // 1) French words whose MAIN meaning is this word; 2) failing that, one of
  // their first meanings (same part of speech first, then any)
  if (FR_FIX[word]) return FR_FIX[word];
  for (const strict of [true, false]) {
    const out = [];
    // the loose pass stays within the same part of speech ("bet" noun -> "pari")
    for (const k of strict ? [POS_CLASS(pos) + "|" + word, word] : [POS_CLASS(pos) + "|" + word]) {
      for (const c of pivot.get(k) || []) {
        if ((!strict || c.primary === 0) && c.rank < (strict ? 30000 : 15000) && out.indexOf(c.fr) < 0) out.push(c.fr);
        if (out.length >= 2) break;
      }
      if (out.length) break;
    }
    if (out.length) return out.join(", ");
  }
  return "";
}

// ---------------------------------------------------------------- English ranks (pivot ranking)
const enFreq = loadFreq("en") || [];
const enRank = new Map(enFreq.map((w, i) => [w, i]));

// ---------------------------------------------------------------- per language
fs.mkdirSync(OUT, { recursive: true });
const report = [];
for (const [code, [dictName, freqFile]] of Object.entries(LANGS)) {
  if (ONLY && ONLY.indexOf(code) < 0) continue;
  const t0 = Date.now();
  const { lemmas, forms } = loadDict(dictName);
  const picked = []; // { lemma, entry, block }
  const seen = new Set();
  const freq = loadFreq(freqFile);
  const take = (lemma) => {
    if (seen.has(lemma)) return;
    const entry = lemmas.get(lemma); if (!entry) return;
    if (code !== "de" && lemma !== lemma.toLowerCase() && LATIN.test(lemma)) return; // proper nouns (German nouns are capitalized)
    if (LATIN.test(lemma) && lemma.replace(/[^A-Za-zÀ-ɏ]/g, "").length < (["it", "es", "fr", "pt", "ro"].indexOf(code) >= 0 ? 1 : 2)) return;
    if (code === "en") { // English course: translate the word itself through the French dictionary
      seen.add(lemma);
      const block = usable(entry, code); if (!block) return;
      const fr = frenchOfEnglish(lemma.toLowerCase(), block.pos);
      if (fr) picked.push({ lemma, entry, block, fr });
      return;
    }
    const block = usable(entry, code); if (!block) return;
    // English words in subtitles ("we", "ok"): skip when only labelled (slang, regional) senses exist
    if (code !== "en" && LATIN.test(lemma) && enRank.has(lemma) && enRank.get(lemma) < 3000 && block.labeled >= block.senses.length) return;
    if (code === "ja" && /^[\u3040-\u30ff]$/.test(lemma)) return; // lone kana: tokenizer fragments
    seen.add(lemma); picked.push({ lemma, entry, block });
  };
  if (freq) {
    for (const w of freq) {
      if (picked.length >= MAX) break;
      const lemma = forms.get(w.toLowerCase()) || forms.get(w);
      if (lemma) take(lemma);
    }
  }
  // Top-up (and the only pass for languages without a frequency list): rank the
  // remaining dictionary words by how common their English meaning is. Catches
  // what subtitle tokens miss (Arabic/Hebrew prefixes, Turkish suffixes, short lists).
  if (picked.length < MAX && code !== "en") {
    const scored = [];
    for (const [lemma, entry] of lemmas) {
      if (seen.has(lemma)) continue;
      const block = usable(entry, code); if (!block) continue;
      const terms = englishTerms(block.senses[0]); if (!terms.length) continue;
      const r = enRank.has(terms[0]) ? enRank.get(terms[0]) : null;
      if (r != null && r < 30000) scored.push([r, lemma]);
    }
    scored.sort((a, b) => a[0] - b[0]);
    for (const [, lemma] of scored) { if (picked.length >= MAX) break; take(lemma); }
  }
  // Levels: fixed cuts for full lists; smaller vocabularies are spread over the
  // six levels in the same proportions, so every level gets words.
  const scale = Math.min(1, picked.length / MAX);
  const levelAt = (k) => (CUTS.find(([n]) => k < Math.max(1, Math.round(n * scale))) || CUTS[CUTS.length - 1])[1];
  const words = picked.map((p, k) => {
    const w = { t: p.lemma, level: levelAt(k), pos: p.block ? p.block.pos : "", g: {} };
    const r = romanization(p.entry, code); if (r) w.r = r;
    if (code === "en") { w.g.fr = p.fr; } else {
      w.g.en = glossOf(p.block);
      const fr = code === "fr" ? "" : frenchFor(p.block); if (fr) w.g.fr = fr;
    }
    return w;
  });
  const lv = {}; words.forEach((w) => { lv[w.level] = (lv[w.level] || 0) + 1; });
  const withFr = words.filter((w) => w.g.fr).length;
  fs.writeFileSync(path.join(OUT, code + ".json"), JSON.stringify({ source: `Wiktionary (${dictName}-English) + ${freqFile ? "OpenSubtitles 2018 frequency (" + freqFile + ")" : "English concept frequency"}`, license: "CC BY-SA", words }));
  report.push(`${code.padEnd(4)} ${String(words.length).padStart(6)} words  fr ${String(Math.round(100 * withFr / Math.max(1, words.length))).padStart(3)}%  ${CUTS.map(([, l]) => l + ":" + (lv[l] || 0)).join(" ")}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  console.log(report[report.length - 1]);
}
