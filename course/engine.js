/*!
 * Course engine — renders every module of every language from one data file
 * (GET /api/course/:lang), with one design (the Hebrew module's, on the iOS 27
 * tokens), audio on everything (Web Speech API), a CEFR level on every word,
 * premium gating and an interface in the account's base language.
 *
 * Each embedded page in app.html's ALL_PAGES is a stub:
 *   <body data-lang="he" data-page="vocabulaire"> + /course/i18n.js + this file.
 */
(function () {
  "use strict";

  var body = document.body;
  var LANG = body.getAttribute("data-lang");
  var PAGE = body.getAttribute("data-page") || "hub";
  var LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
  var app = document.getElementById("app");
  var TOP = (function () { try { return window.top.document ? window.top : window; } catch (e) { return window; } })();

  var C, ACCESS, ME, BASE, UI, P; // course, access, me, base language (glosses), interface language, progress

  // ------------------------------------------------------------------ helpers
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function T(key, vars) { return window.I18N ? window.I18N.t(UI || BASE, key, vars) : key; }
  function gl(map) { // text in the base language, English, then French
    if (!map) return "";
    if (typeof map === "string") return map;
    return map[BASE] || map.en || map.fr || "";
  }
  function glLang(map) { // which language gl() actually returned
    if (!map || typeof map === "string") return "";
    return map[BASE] ? BASE : map.en ? "en" : map.fr ? "fr" : "";
  }
  function wg(w) { return gl(w && w.g); }
  function fallbackTag(map) {
    var l = glLang(map);
    return l && l !== BASE ? ' <span class="tag" title="' + esc(T("gloss_fallback")) + '">' + l.toUpperCase() + "</span>" : "";
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function pick(a, n) { return shuffle(a).slice(0, n); }
  function today(d) { d = d || new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function dayOffset(n) { var d = new Date(); d.setDate(d.getDate() + n); return today(d); }
  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-֑ͯ-ׇً-ٟ]/g, "")
      .replace(/[.,!?;:¿¡"'«»“”‘’()\-–—。、！？，・]/g, " ").replace(/\s+/g, " ").trim();
  }
  function lev(a, b) { // Levenshtein distance
    if (a === b) return 0;
    var m = a.length, n = b.length, prev = [], cur, i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function similarity(a, b) { a = norm(a); b = norm(b); var L = Math.max(a.length, b.length); return L ? 1 - lev(a, b) / L : 1; }
  function lvBadge(level) { return level ? '<span class="lv lv-' + level + '" title="' + esc(T("level_" + level)) + '">' + level + "</span>" : ""; }
  function langName(code) {
    try { var n = new Intl.DisplayNames([BASE], { type: "language" }).of(code); if (n && n.toLowerCase() !== code) return n.charAt(0).toUpperCase() + n.slice(1); } catch (e) {}
    return code === LANG ? C.name : code;
  }
  function tgt(text, extra) { return '<span class="t"' + (C.dir === "rtl" ? ' dir="rtl"' : "") + (extra || "") + ">" + esc(text) + "</span>"; }
  function rom(r) { return r && P.settings.rom !== false ? '<span class="r">' + esc(r) + "</span>" : ""; }
  function locked(key) { return !!(ACCESS && ACCESS.features && ACCESS.features[key]); }
  function modLocked(mod) { return locked(LANG + ":" + mod); }
  // ---- Papote mascot: one expression per situation (files in
  // /design-system/brand/mascot/, prepared by scripts/brand/process-brand.py).
  // Without the files, the previous emoji are kept.
  var BRAND = { logo: false, mascot: [] };
  function hasMood(m) { return BRAND.mascot && BRAND.mascot.indexOf(m) >= 0; }
  function masc(mood, size, cls) {
    if (!hasMood(mood)) return "";
    return '<img class="masc ' + (cls || "") + '" src="/design-system/brand/mascot/' + mood + '.png" alt="" width="' + size + '" height="' + size + '" decoding="async">';
  }
  // Big illustration for end screens: mascot if available, else the emoji.
  function mascOr(mood, emoji, size) { return masc(mood, size || 132, "masc-big") || emoji; }
  function pickMood(list) { var ok = list.filter(hasMood); return ok.length ? ok[Math.floor(Math.random() * ok.length)] : list[0]; }

  function toast(msg, mood) {
    var el = document.getElementById("engToast");
    if (!el) { el = document.createElement("div"); el.id = "engToast"; el.className = "toast"; body.appendChild(el); }
    el.textContent = msg;
    if (mood && hasMood(mood)) el.insertAdjacentHTML("afterbegin", masc(mood, 40, "masc-toast"));
    el.classList.add("show");
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove("show"); }, 2600);
  }
  function goTop(url) { try { window.top.location.href = url; } catch (e) { window.location.href = url; } }

  // ------------------------------------------------------------------ audio
  var TTS = {
    voice: null, ready: false, warned: false, approx: false,
    pick: function () {
      if (!("speechSynthesis" in window)) return;
      var voices = speechSynthesis.getVoices();
      if (!voices.length) return;
      var want = (C.tts || LANG).toLowerCase(), prefix = want.split("-")[0];
      var pref = P && P.settings.voice;
      var match = function (tag) { return voices.filter(function (v) { return v.lang.replace("_", "-").toLowerCase() === tag; }); };
      var byPrefix = function (p) { return voices.filter(function (v) { return v.lang.replace("_", "-").toLowerCase().split("-")[0] === p; }); };
      var list = match(want); if (!list.length) list = byPrefix(prefix);
      this.approx = false;
      if (!list.length && C.ttsFallback) { list = match(C.ttsFallback.toLowerCase()); if (!list.length) list = byPrefix(C.ttsFallback.split("-")[0].toLowerCase()); this.approx = list.length > 0; }
      var chosen = pref && list.filter(function (v) { return v.name === pref; })[0];
      this.voice = chosen || list.filter(function (v) { return /premium|enhanced|natural|google/i.test(v.name); })[0] || list[0] || null;
      this.ready = true;
    },
    voicesFor: function () {
      if (!("speechSynthesis" in window)) return [];
      var p = (C.tts || LANG).toLowerCase().split("-")[0], f = (C.ttsFallback || "").toLowerCase().split("-")[0];
      return speechSynthesis.getVoices().filter(function (v) { var l = v.lang.toLowerCase().split(/[-_]/)[0]; return l === p || (f && l === f); });
    },
    speak: function (text, btn, onend) {
      if (!text) return;
      if (!("speechSynthesis" in window)) { toast(T("tts_unsupported")); return; }
      if (!this.ready) this.pick();
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = this.voice ? this.voice.lang : C.tts || LANG;
      if (this.voice) u.voice = this.voice;
      u.rate = (P && P.settings.rate) || 0.9;
      if (!this.voice && !this.warned) { this.warned = true; toast(T("tts_no_voice", { lang: C.name })); }
      else if (this.approx && !this.warned) { this.warned = true; toast(T("tts_approx")); }
      var pill = document.getElementById("speakPill");
      document.querySelectorAll(".speaking").forEach(function (e) { e.classList.remove("speaking"); });
      if (btn) btn.classList.add("speaking");
      if (pill) pill.classList.add("on");
      var done = function () { if (btn) btn.classList.remove("speaking"); if (pill) pill.classList.remove("on"); if (onend) onend(); };
      u.onend = done; u.onerror = done;
      speechSynthesis.speak(u);
    },
  };
  if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = function () { if (C) TTS.pick(); };
  // <button data-say="..."> anywhere plays audio (event delegation)
  function snd(text, small) {
    if (!text) return "";
    return '<button type="button" class="soundbtn' + (small ? " soundbtn-sm" : "") + '" data-say="' + esc(text) + '" aria-label="' + esc(T("listen")) + '" title="' + esc(T("listen")) + '">🔊</button>';
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-say]");
    if (b) { e.stopPropagation(); TTS.speak(b.getAttribute("data-say"), b); }
  });

  // ------------------------------------------------------------------ progress
  function newProgress() {
    return {
      v: 1, updatedAt: 0, xp: 0, streak: { count: 0, last: "" }, days: {}, answers: { total: 0, ok: 0 },
      byTheme: {}, byLevel: {}, words: {}, srs: {}, lessons: {}, exams: {}, badges: {}, custom: [], perfect: 0,
      settings: { rate: 0.9, rom: true, autoplay: true, goal: 30, voice: "" },
    };
  }
  var PKEY;
  function loadLocal() { try { return JSON.parse(localStorage.getItem(PKEY) || "null"); } catch (e) { return null; } }
  var saveTimer = null;
  function save() {
    P.updatedAt = Date.now();
    try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch (e) {}
    try { (TOP.__COURSE_PROGRESS = TOP.__COURSE_PROGRESS || {})[LANG] = P; } catch (e) {}
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      fetch("/api/progress/" + LANG, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: P }) }).catch(function () {});
    }, 1200);
  }
  function mergeProgress(p) { var d = newProgress(); for (var k in d) if (p[k] === undefined) p[k] = d[k]; for (var s in d.settings) if (p.settings[s] === undefined) p.settings[s] = d.settings[s]; return p; }
  function dayRec() { var d = today(); return (P.days[d] = P.days[d] || { xp: 0, ok: 0, ko: 0, lessons: 0, reviews: 0 }); }
  function addXp(n) {
    P.xp += n; dayRec().xp += n;
    var t = today();
    if (P.streak.last !== t) { P.streak.count = P.streak.last === dayOffset(-1) ? P.streak.count + 1 : 1; P.streak.last = t; }
    var keys = Object.keys(P.days).sort(); while (keys.length > 120) delete P.days[keys.shift()];
  }
  function record(item, ok) { // item: word or pseudo-item {id, theme, level}
    P.answers.total++; if (ok) P.answers.ok++;
    var d = dayRec(); ok ? d.ok++ : d.ko++;
    if (item) {
      if (item.theme) { var th = (P.byTheme[item.theme] = P.byTheme[item.theme] || { ok: 0, ko: 0 }); ok ? th.ok++ : th.ko++; }
      if (item.level) { var lv = (P.byLevel[item.level] = P.byLevel[item.level] || { ok: 0, ko: 0 }); ok ? lv.ok++ : lv.ko++; }
      if (item.id) { var w = (P.words[item.id] = P.words[item.id] || { ok: 0, ko: 0, seen: 0, last: 0 }); ok ? w.ok++ : w.ko++; w.last = Date.now(); }
    }
  }
  function known(w) { var s = P.srs[w.id], k = P.words[w.id]; return (s && s.box >= 3) || (s && s.n >= 3) || (k && k.ok >= 3 && k.ok > k.ko * 2); }
  function seen(w) { return !!(P.words[w.id] || P.srs[w.id]); }

  // ------------------------------------------------------------------ SRS
  // Free: Leitner boxes (1,2,4,8,16 days), 20 reviews/day.
  // Premium (premium:srs-advanced): SM-2 with ease factor, unlimited, forecast.
  var DAY = 86400000;
  function srsAdd(w) { if (!P.srs[w.id]) P.srs[w.id] = { box: 0, due: Date.now(), ef: 2.5, n: 0, int: 0, lapses: 0 }; }
  function srsGrade(w, q) { // q: 1 again, 3 hard, 4 good, 5 easy
    var s = P.srs[w.id] || (srsAdd(w), P.srs[w.id]);
    if (!locked("premium:srs-advanced")) {
      if (q < 3) { s.n = 0; s.int = 1; s.lapses++; }
      else { s.n++; s.int = s.n === 1 ? 1 : s.n === 2 ? 3 : Math.round(s.int * s.ef * (q === 3 ? 0.8 : q === 5 ? 1.3 : 1)); }
      s.ef = Math.max(1.3, s.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
      s.box = Math.min(5, s.n);
    } else {
      s.box = q < 3 ? 1 : Math.min(5, s.box + (q === 5 ? 2 : 1)); s.int = [0, 1, 2, 4, 8, 16][s.box]; if (q < 3) s.lapses++;
      s.n = s.box;
    }
    s.due = Date.now() + Math.max(1, s.int) * DAY - 3600000;
    record(w, q >= 3); dayRec().reviews++; addXp(q >= 3 ? 2 : 1); save();
  }
  function dueWords() {
    var now = Date.now(), byId = wordIndex();
    return Object.keys(P.srs).filter(function (id) { return P.srs[id].due <= now && byId[id]; }).map(function (id) { return byId[id]; });
  }
  var _widx;
  function wordIndex() { if (!_widx) { _widx = {}; allWords().forEach(function (w) { _widx[w.id] = w; }); } return _widx; }
  function allWords() {
    var custom = (P.custom || []).map(function (c, i) { return { id: "custom-" + i, t: c.t, r: c.r || "", g: { fr: c.g, en: c.g }, level: c.level || "A1", theme: "_custom", custom: true }; });
    return C.words.concat(custom);
  }

  // ------------------------------------------------------------------ shell
  var MODULES = [
    { id: "hub", ic: "🏠" },
    { id: "vocabulaire", ic: "📚" },
    { id: "phrases", ic: "💬", need: function () { return C.phrases && C.phrases.length; } },
    { id: "grammaire", ic: "📑" },
    { id: "conjugaison", ic: "🔁", need: function () { return C.conj && C.conj.verbs && C.conj.verbs.length; } },
    { id: "alphabet", ic: "🔤", need: function () { return C.alphabet && C.alphabet.length; } },
    { id: "lecture", ic: "📖" },
    { id: "ecoute", ic: "🎧" },
    { id: "exercices", ic: "✏️" },
    { id: "revision", ic: "🧠" },
    { id: "prononciation", ic: "🎙️" },
    { id: "culture", ic: "🌍", need: function () { return C.culture && C.culture.length; } },
    { id: "examen", ic: "🎓", premium: "premium:exam" },
    { id: "stats", ic: "📊" },
    { id: "badges", ic: "🏅", premium: "premium:badges" },
    { id: "certificat", ic: "📜", premium: "premium:certificates" },
    { id: "dictionnaire", ic: "🔎" },
    { id: "profil", ic: "👤" },
  ];
  function available(m) { return !m.need || m.need(); }
  function nav(page) {
    if (window.parent && window.parent !== window) {
      try { window.parent.postMessage({ modNav: page + ".html" }, "*"); return; } catch (e) {}
    }
    PAGE = page; render();
  }
  window.__nav = nav;
  function shell(titleKey, inner, opts) {
    opts = opts || {};
    var menu = MODULES.filter(available).map(function (m) {
      return '<button type="button" data-nav="' + m.id + '"' + (m.id === PAGE ? ' class="on"' : "") + ">" + m.ic + " " + esc(T("mod_" + m.id)) + (m.premium && locked(m.premium) ? " 🔒" : "") + "</button>";
    }).join("");
    return '<header class="hdr">' +
      '<div class="logo">' + esc(C.flag) + "</div>" +
      '<div class="lt"><strong>' + esc(T(titleKey)) + "</strong><small>" + esc(T("learn_lang", { lang: langName(LANG) })) + "</small></div>" +
      '<div class="hdr-actions">' +
      (ACCESS.premium ? '<span class="premium-chip">★ Premium</span>' : '<button type="button" class="profbadge" data-go="/subscribe">★ ' + esc(T("go_premium")) + "</button>") +
      '<button type="button" class="navtoggle" id="themeBtn" aria-label="' + esc(T("theme_toggle")) + '">' + (document.documentElement.getAttribute("data-theme") === "dark" ? "☀️" : "🌙") + "</button>" +
      '<button type="button" class="navtoggle" id="navToggle" aria-expanded="false">☰ ' + esc(T("modules")) + "</button>" +
      "</div></header>" +
      '<nav class="navmenu" id="navMenu">' + menu + "</nav>" +
      (opts.hero || "") +
      '<main class="con">' + inner + "</main>" +
      '<div class="speaking-pill" id="speakPill"><div class="wave"><span></span><span></span><span></span></div>' + esc(T("speaking")) + "</div>";
  }
  document.addEventListener("click", function (e) {
    var n = e.target.closest("[data-nav]"); if (n) { e.preventDefault(); nav(n.getAttribute("data-nav")); return; }
    var g = e.target.closest("[data-go]"); if (g) { e.preventDefault(); goTop(g.getAttribute("data-go")); return; }
    if (e.target.closest("#themeBtn")) {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      [document.documentElement].concat(TOP !== window ? [TOP.document.documentElement] : []).forEach(function (d) { d.setAttribute("data-theme", next); });
      try { localStorage.setItem("lang_theme", next); } catch (err) {}
      e.target.closest("#themeBtn").textContent = next === "dark" ? "☀️" : "🌙";
      return;
    }
    if (e.target.closest("#navToggle")) { var m = document.getElementById("navMenu"); m.classList.toggle("on"); e.target.closest("#navToggle").setAttribute("aria-expanded", m.classList.contains("on")); }
  });
  function gate(featureKey, icon) {
    return '<div class="gate"><div class="big">' + (icon || "🔒") + "</div><h2>" + esc(T("premium_only")) + "</h2><p>" + esc(T("feat_" + featureKey.replace(/^.*:/, ""))) + " — " + esc(T("premium_unlock")) +
      '</p><button type="button" class="bpr" data-go="/subscribe">★ ' + esc(T("go_premium")) + "</button></div>";
  }
  function levelPills(sel, counts, multi) {
    return '<div class="pills" role="group" aria-label="' + esc(T("level")) + '">' +
      '<button type="button" class="pill' + (!sel.length ? " on" : "") + '" data-lv="">' + esc(T("all_levels")) + "</button>" +
      LEVELS.map(function (l) {
        var lockedL = C.locked && C.locked.levels.indexOf(l) >= 0;
        var n = counts ? counts[l] || 0 : null;
        return '<button type="button" class="pill' + (sel.indexOf(l) >= 0 ? " on" : "") + '" data-lv="' + l + '"' + (multi ? ' data-multi="1"' : "") + ">" + l + (lockedL ? " 🔒" : n != null ? ' <span class="n">' + n + "</span>" : "") + "</button>";
      }).join("") + "</div>";
  }
  function themeLabel(id) {
    if (id === "_custom") return T("my_words");
    var t = (C.themes || []).filter(function (x) { return x.id === id; })[0];
    return t ? (t.icon ? t.icon + " " : "") + gl(t) : id;
  }

  // ================================================================== PAGES
  var PAGES = {};

  // ------------------------------------------------------------------ hub
  PAGES.hub = function () {
    var words = allWords(), knownN = words.filter(known).length;
    var acc = P.answers.total ? Math.round(100 * P.answers.ok / P.answers.total) : 0;
    var wotd = C.words.length ? C.words[(new Date().getDate() * 37 + new Date().getMonth() * 11) % C.words.length] : null;
    var due = dueWords().length;
    var hero = '<section class="hero"><div class="hero-watermark" aria-hidden="true">' + esc(C.watermark || C.flag) + "</div>" +
      masc("wave", 104, "masc-hero") +
      "<h1>" + esc(C.greeting || "👋") + (ME.name ? ", " + esc(ME.name) : "") + " !</h1>" +
      "<p>" + esc(T("hub_intro", { lang: langName(LANG) })) + "</p>" +
      '<div class="stat-grid">' +
      stat(P.xp, T("xp")) + stat(P.streak.count + " 🔥", T("streak_days")) + stat(knownN + "/" + words.length, T("words_known")) + stat(acc + "%", T("accuracy")) +
      "</div></section>";
    var levelCards = LEVELS.map(function (l) {
      var lw = words.filter(function (w) { return w.level === l; });
      var k = lw.filter(known).length, lockedL = C.locked && C.locked.levels.indexOf(l) >= 0;
      var n = lockedL ? (C.locked.counts[l] || 0) : lw.length;
      return '<button type="button" class="lvlcard' + (lockedL ? " is-locked" : "") + '" data-nav="level_' + l.toLowerCase() + '">' +
        '<div class="badge bg-' + l + '">' + l + "</div><b>" + esc(T("level_" + l)) + (lockedL ? ' <span class="lock">🔒</span>' : "") + "</b><span>" +
        esc(T("n_words", { n: n })) + (lockedL ? "" : " · " + esc(T("n_known", { n: k }))) + '</span><div class="meter"><i style="width:' + (lw.length ? Math.round(100 * k / lw.length) : 0) + '%"></i></div></button>';
    }).join("");
    var cards = MODULES.filter(function (m) { return m.id !== "hub" && available(m); }).map(function (m) {
      var lk = m.premium && locked(m.premium);
      return '<button type="button" class="navcard' + (lk ? " is-locked" : "") + '" data-nav="' + m.id + '"><div class="ic">' + m.ic + '</div><div><div class="tt">' + esc(T("mod_" + m.id)) + (lk ? ' <span class="lock">🔒</span>' : "") + '</div><div class="ds">' + esc(T("desc_" + m.id)) + '</div></div><span class="arrow">›</span></button>';
    }).join("");
    var html = "";
    if (due) html += '<div class="box row"><div>🧠 <b>' + esc(T("reviews_due", { n: due })) + '</b></div><span class="spacer"></span><button type="button" class="bpr" data-nav="revision">' + esc(T("review_now")) + "</button></div>";
    if (wotd) html += '<div class="sect"><div class="secttit">' + esc(T("word_of_day")) + '</div><div class="box row">' + snd(wotd.t) + '<div><div class="t" style="font-size:var(--ig27-fs-title2);line-height:var(--ig27-lh-title2);font-weight:600">' + esc(wotd.t) + "</div>" + (wotd.r ? '<div class="muted small">' + esc(wotd.r) + "</div>" : "") + "<div>" + esc(wg(wotd)) + fallbackTag(wotd.g) + "</div></div><span class=\"spacer\"></span>" + lvBadge(wotd.level) + "</div></div>";
    html += '<div class="sect"><div class="secttit">' + esc(T("cefr_levels")) + '</div><div class="grid cols-3">' + levelCards + "</div></div>";
    html += '<div class="sect"><div class="secttit">' + esc(T("explore")) + '</div><div class="grid cols-2">' + cards + "</div></div>";
    if (!ACCESS.premium) html += '<div class="sect">' + premiumCard() + "</div>";
    if (C.note) html += '<p class="muted small" style="margin-top:var(--ig27-space-6)">' + esc(gl(C.note)) + "</p>";
    return shell("mod_hub", html, { hero: hero });
  };
  function stat(n, l) { return '<div class="stat-box"><div class="stat-num">' + esc(n) + '</div><div class="stat-lbl">' + esc(l) + "</div></div>"; }
  function premiumCard() {
    var feats = ["levels-c", "lessons-unlimited", "srs-advanced", "pronunciation-ai", "stats-advanced", "progress-detailed", "certificates", "badges", "offline", "exam", "custom-words", "export"];
    return '<div class="premium-card"><h3>★ ' + esc(T("premium_title")) + "</h3><p class=\"muted\">" + esc(T("premium_sub")) + '</p><ul class="premium-list">' +
      feats.map(function (f) { return "<li>✓ <span>" + esc(T("feat_" + f)) + "</span></li>"; }).join("") +
      '</ul><button type="button" class="bpr" data-go="/subscribe">★ ' + esc(T("go_premium")) + "</button></div>";
  }

  // ------------------------------------------------------------------ vocabulary
  var VS = { levels: [], theme: "", sort: "theme", q: "", only: "", shown: 150 };
  PAGES.vocabulaire = function () {
    var words = allWords(), counts = {};
    words.forEach(function (w) { counts[w.level] = (counts[w.level] || 0) + 1; });
    var themes = {}; words.forEach(function (w) { themes[w.theme] = (themes[w.theme] || 0) + 1; });
    var themeOpts = '<option value="">' + esc(T("all_themes")) + "</option>" + Object.keys(themes).map(function (id) {
      return '<option value="' + esc(id) + '"' + (VS.theme === id ? " selected" : "") + ">" + esc(themeLabel(id)) + " (" + themes[id] + ")</option>";
    }).join("");
    var html = '<h1 class="ttl">' + esc(T("mod_vocabulaire")) + '</h1><p class="sub">' + esc(T("vocab_sub", { n: words.length })) + "</p>" +
      '<div class="filters">' + levelPills(VS.levels, counts, true) +
      '<div class="row"><input class="field" type="search" id="vq" placeholder="' + esc(T("search")) + '" value="' + esc(VS.q) + '">' +
      '<select class="sel" id="vtheme" aria-label="' + esc(T("theme")) + '">' + themeOpts + "</select>" +
      '<select class="sel" id="vsort" aria-label="' + esc(T("sort")) + '">' +
      ["theme", "level", "alpha", "learn"].map(function (s) { return '<option value="' + s + '"' + (VS.sort === s ? " selected" : "") + ">" + esc(T("sort_" + s)) + "</option>"; }).join("") +
      '</select><select class="sel" id="vonly" aria-label="' + esc(T("filter")) + '">' +
      ["", "new", "known"].map(function (s) { return '<option value="' + s + '"' + (VS.only === s ? " selected" : "") + ">" + esc(T("only_" + (s || "all"))) + "</option>"; }).join("") +
      "</select></div></div>" +
      '<div id="vcount" class="muted small" style="margin-bottom:var(--ig27-space-2)"></div><div class="vlist" id="vlist"></div>' +
      '<button type="button" class="btn2 more" id="vmore" hidden>' + esc(T("show_more")) + "</button>" + lockedNote();
    return shell("mod_vocabulaire", html);
  };
  function lockedNote() {
    if (!C.locked || !C.locked.levels.length) return "";
    var n = C.locked.levels.reduce(function (a, l) { return a + (C.locked.counts[l] || 0); }, 0);
    return n ? '<div class="box row" style="margin-top:var(--ig27-space-5)">🔒 ' + esc(T("locked_levels", { n: n, levels: C.locked.levels.join(" / ") })) + '<span class="spacer"></span><button type="button" class="bpr" data-go="/subscribe">★ ' + esc(T("go_premium")) + "</button></div>" : "";
  }
  function filteredWords() {
    var q = norm(VS.q), list = allWords().filter(function (w) {
      if (VS.levels.length && VS.levels.indexOf(w.level) < 0) return false;
      if (VS.theme && w.theme !== VS.theme) return false;
      if (VS.only === "known" && !known(w)) return false;
      if (VS.only === "new" && seen(w)) return false;
      if (q && norm(w.t + " " + (w.r || "") + " " + wg(w)).indexOf(q) < 0) return false;
      return true;
    });
    var li = function (w) { return LEVELS.indexOf(w.level); };
    if (VS.sort === "level") list.sort(function (a, b) { return li(a) - li(b); });
    else if (VS.sort === "alpha") list.sort(function (a, b) { return (a.r || a.t).localeCompare(b.r || b.t, LANG); });
    else if (VS.sort === "learn") list.sort(function (a, b) { return (known(a) ? 1 : 0) - (known(b) ? 1 : 0) || li(a) - li(b); });
    return list;
  }
  function vrow(w) {
    return '<div class="vrow" data-wid="' + esc(w.id) + '">' + snd(w.t) +
      '<div class="main"><span class="w t"' + (C.dir === "rtl" ? ' dir="rtl"' : "") + ">" + esc(w.t) + "</span>" + rom(w.r) +
      (w.gender ? '<span class="tag">' + esc(w.gender) + "</span>" : "") + (w.custom ? '<span class="tag">' + esc(T("mine")) + "</span>" : "") +
      (known(w) ? '<span class="known" title="' + esc(T("known")) + '">✓</span>' : "") +
      '<span class="g">' + esc(wg(w)) + fallbackTag(w.g) + "</span></div>" + lvBadge(w.level) +
      '<div class="ex">' + (w.ex ? '<div class="exline">' + snd(w.ex.t, true) + "<div>" + tgt(w.ex.t) + (w.ex.r ? '<div class="muted small">' + esc(w.ex.r) + "</div>" : "") + '<div class="muted">' + esc(gl(w.ex.g)) + "</div></div></div>" : "") +
      (w.pl ? '<div class="exline">' + snd(w.pl.t, true) + "<div>" + esc(T("plural")) + " : " + tgt(w.pl.t) + " " + rom(w.pl.r) + "</div></div>" : "") +
      '<div class="muted small">' + esc(themeLabel(w.theme)) + " · " + esc(T("level_" + w.level)) + '</div><div class="row"><button type="button" class="btn2" data-srs="' + esc(w.id) + '">🧠 ' + esc(P.srs[w.id] ? T("in_review") : T("add_review")) + "</button></div></div></div>";
  }
  function paintVocab() {
    var list = filteredWords(), el = document.getElementById("vlist");
    if (!el) return;
    el.innerHTML = list.slice(0, VS.shown).map(vrow).join("") || '<p class="muted with-masc">' + masc("question", 56, "masc-inline") + esc(T("no_results")) + "</p>";
    document.getElementById("vcount").textContent = T("n_shown", { n: Math.min(VS.shown, list.length), total: list.length });
    document.getElementById("vmore").hidden = list.length <= VS.shown;
  }
  function bindVocab() {
    var upd = function () { VS.shown = 150; paintVocab(); };
    var q = document.getElementById("vq");
    q.addEventListener("input", function () { VS.q = q.value; upd(); });
    document.getElementById("vtheme").addEventListener("change", function (e) { VS.theme = e.target.value; upd(); });
    document.getElementById("vsort").addEventListener("change", function (e) { VS.sort = e.target.value; upd(); });
    document.getElementById("vonly").addEventListener("change", function (e) { VS.only = e.target.value; upd(); });
    document.getElementById("vmore").addEventListener("click", function () { VS.shown += 150; paintVocab(); });
    bindLevelPills(VS, upd);
    app.addEventListener("click", function (e) {
      var s = e.target.closest("[data-srs]");
      if (s) { var w = wordIndex()[s.getAttribute("data-srs")]; if (w) { srsAdd(w); save(); s.textContent = "🧠 " + T("in_review"); toast(T("added_review"), "wink"); } return; }
      var r = e.target.closest(".vrow");
      if (r && !e.target.closest("button")) r.classList.toggle("open");
    });
    paintVocab();
  }
  function bindLevelPills(state, onchange) {
    app.querySelectorAll("[data-lv]").forEach(function (b) {
      b.addEventListener("click", function () {
        var l = b.getAttribute("data-lv");
        if (l && C.locked && C.locked.levels.indexOf(l) >= 0) { toast(T("feat_levels-c") + " — " + T("premium_only"), "peek"); return; }
        if (!l) state.levels = [];
        else if (b.getAttribute("data-multi")) { var i = state.levels.indexOf(l); i >= 0 ? state.levels.splice(i, 1) : state.levels.push(l); }
        else state.levels = [l];
        app.querySelectorAll("[data-lv]").forEach(function (x) { var v = x.getAttribute("data-lv"); x.classList.toggle("on", v ? state.levels.indexOf(v) >= 0 : !state.levels.length); });
        onchange();
      });
    });
  }

  // ------------------------------------------------------------------ phrases
  var PS = { levels: [] };
  PAGES.phrases = function () {
    var html = '<h1 class="ttl">' + esc(T("mod_phrases")) + '</h1><p class="sub">' + esc(T("phrases_sub")) + '</p><div class="filters">' + levelPills(PS.levels, null, true) + '</div><div id="plist"></div>';
    return shell("mod_phrases", html);
  };
  function paintPhrases() {
    var byTheme = {};
    (C.phrases || []).filter(function (p) { return !PS.levels.length || PS.levels.indexOf(p.level) >= 0; }).forEach(function (p) { (byTheme[p.theme] = byTheme[p.theme] || []).push(p); });
    document.getElementById("plist").innerHTML = Object.keys(byTheme).map(function (th) {
      return '<div class="sect"><div class="secttit">' + esc(themeLabel(th)) + "</div>" + byTheme[th].map(function (p) {
        return '<div class="prow">' + snd(p.t) + '<div style="flex:1">' + tgt(p.t) + (p.r && P.settings.rom !== false ? '<div class="muted small">' + esc(p.r) + "</div>" : "") + '<div class="g">' + esc(gl(p.g)) + fallbackTag(p.g) + "</div></div>" + lvBadge(p.level) + "</div>";
      }).join("") + "</div>";
    }).join("") || '<p class="muted with-masc">' + masc("question", 56, "masc-inline") + esc(T("no_results")) + "</p>";
  }
  function bindPhrases() { bindLevelPills(PS, paintPhrases); paintPhrases(); }

  // ------------------------------------------------------------------ grammar
  var GS = { levels: [] };
  PAGES.grammaire = function () {
    var html = '<h1 class="ttl">' + esc(T("mod_grammaire")) + '</h1><p class="sub">' + esc(T("grammar_sub", { lang: langName(LANG) })) + "</p>" +
      '<div class="filters">' + levelPills(GS.levels, null, true) + '</div><div id="glist"></div>' + lockedNote();
    return shell("mod_grammaire", html);
  };
  function grammarCard(g, open) {
    var exs = (g.ex || []).map(function (x) {
      return '<div class="exline">' + snd(x.t, true) + "<div>" + tgt(x.t) + (x.r ? '<div class="muted small">' + esc(x.r) + "</div>" : "") + '<div class="g">' + esc(gl(x.g)) + "</div></div></div>";
    }).join("");
    return '<details class="rule-card"' + (open ? " open" : "") + "><summary>" + (g.icon ? esc(g.icon) + " " : "") + esc(gl(g.title)) + " " + lvBadge(g.level) + fallbackTag(g.body) + "</summary>" +
      '<div class="rule-body">' + gl(g.body) + (exs ? '<div class="exlist">' + exs + "</div>" : "") + "</div></details>";
  }
  function paintGrammar() {
    var list = (C.grammar || []).filter(function (g) { return !GS.levels.length || GS.levels.indexOf(g.level) >= 0; });
    var pron = list.filter(function (g) { return g.kind === "pronunciation"; }), main = list.filter(function (g) { return g.kind !== "pronunciation"; });
    document.getElementById("glist").innerHTML = main.map(function (g, i) { return grammarCard(g, i === 0); }).join("") +
      (pron.length ? '<div class="sect"><div class="secttit">🗣️ ' + esc(T("pronunciation_rules")) + "</div>" + pron.map(function (g) { return grammarCard(g); }).join("") + "</div>" : "") ||
      '<p class="muted with-masc">' + masc("question", 56, "masc-inline") + esc(T("no_results")) + "</p>";
    decorateTargetText(document.getElementById("glist"));
  }
  function bindGrammar() { bindLevelPills(GS, paintGrammar); paintGrammar(); }
  // Grammar/culture bodies are authored HTML: add audio to any <i lang>/<span class="t"> example inside.
  function decorateTargetText(root) {
    root.querySelectorAll(".rule-body .t:not([data-dec]), .rule-body [lang]:not([data-dec])").forEach(function (el) {
      el.setAttribute("data-dec", "1");
      var b = document.createElement("span"); b.innerHTML = snd(el.textContent, true); el.parentNode.insertBefore(b.firstChild, el);
    });
  }

  // ------------------------------------------------------------------ conjugation
  var CS = { verb: 0, tense: "" };
  PAGES.conjugaison = function () {
    var cj = C.conj;
    var verbs = cj.verbs.map(function (v, i) { return '<option value="' + i + '"' + (i === CS.verb ? " selected" : "") + ">" + esc(v.t) + (v.r ? " (" + esc(v.r) + ")" : "") + " — " + esc(gl(v.g)) + " · " + v.level + "</option>"; }).join("");
    var html = '<h1 class="ttl">' + esc(T("mod_conjugaison")) + '</h1><p class="sub">' + esc(gl(cj.note) || T("conj_sub")) + "</p>" +
      '<div class="row" style="margin-bottom:var(--ig27-space-4)"><select class="sel" id="cverb">' + verbs + '</select><button type="button" class="btn2" id="conjPractice">✏️ ' + esc(T("practice")) + "</button></div>" +
      '<div id="ctable"></div>';
    return shell("mod_conjugaison", html);
  };
  function paintConj() {
    var cj = C.conj, v = cj.verbs[CS.verb], tenses = (cj.tenses || []).filter(function (t) { return v.forms[t.id]; });
    document.getElementById("ctable").innerHTML = '<div class="box row">' + snd(v.t) + "<div>" + tgt(v.t, ' style="font-size:var(--ig27-fs-title2);font-weight:600"') + " " + rom(v.r) + '<div class="muted">' + esc(gl(v.g)) + (v.irregular ? " · " + esc(T("irregular")) : "") + "</div></div><span class=\"spacer\"></span>" + lvBadge(v.level) + "</div>" +
      tenses.map(function (t) {
        return '<table class="conj-table"><tr><th colspan="3">' + esc(gl(t)) + "</th></tr>" + v.forms[t.id].map(function (f) {
          return "<tr><td class=\"muted\" style=\"width:30%\">" + esc(f.p || "") + "</td><td>" + tgt(f.t) + (f.r ? '<div class="muted small">' + esc(f.r) + "</div>" : "") + '</td><td style="width:44px">' + snd(((f.p && C.conjSpeakPronoun !== false) ? f.p + " " : "") + f.t, true) + "</td></tr>";
        }).join("") + "</table>";
      }).join("");
  }
  function bindConj() {
    document.getElementById("cverb").addEventListener("change", function (e) { CS.verb = +e.target.value; paintConj(); });
    document.getElementById("conjPractice").addEventListener("click", function () { launchMode("conj"); });
    paintConj();
  }

  // ------------------------------------------------------------------ alphabet
  PAGES.alphabet = function () {
    var cards = C.alphabet.map(function (a, i) { return '<button type="button" class="abc-card" data-abc="' + i + '"><div class="abc-letter">' + esc(a.c) + '</div><div class="abc-name">' + esc(a.name || "") + "</div></button>"; }).join("");
    var extra = C.alphabetExtra ? '<div class="sect"><div class="secttit">' + esc(gl(C.alphabetExtra.title)) + '</div><div class="abc-grid">' + C.alphabetExtra.items.map(function (a) {
      return '<div class="abc-card" data-say="' + esc(a.say || a.c) + '"><div class="abc-letter">' + esc(a.c) + '</div><div class="abc-name">' + esc(a.name || "") + " · " + esc(a.sound || "") + "</div></div>";
    }).join("") + "</div></div>" : "";
    var html = '<h1 class="ttl">' + esc(T("mod_alphabet")) + '</h1><p class="sub">' + esc(gl(C.alphabetNote) || T("alphabet_sub")) + '</p><div id="abcDetail"></div><div class="abc-grid">' + cards + "</div>" + extra;
    return shell("mod_alphabet", html);
  };
  function bindAlphabet() {
    app.addEventListener("click", function (e) {
      var b = e.target.closest("[data-abc]"); if (!b) return;
      var a = C.alphabet[+b.getAttribute("data-abc")];
      TTS.speak(a.say || a.name || a.c);
      document.getElementById("abcDetail").innerHTML = '<div class="abc-detail"><div class="big">' + esc(a.c) + (a.final ? " · " + esc(a.final) : "") + "</div><p><b>" + esc(a.name || "") + "</b>" + (a.sound ? " — " + esc(T("sound")) + " : " + esc(a.sound) : "") + "</p>" +
        (a.note ? '<p class="muted small">' + esc(gl(a.note)) + "</p>" : "") +
        (a.ex ? '<div class="row" style="justify-content:center;margin-top:var(--ig27-space-3)">' + snd(a.ex.t) + tgt(a.ex.t, ' style="font-size:var(--ig27-fs-title1)"') + " " + rom(a.ex.r) + " — " + esc(gl(a.ex.g)) + "</div>" : "") + "</div>";
      document.getElementById("abcDetail").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  // ------------------------------------------------------------------ reading
  var RS = { levels: [] };
  PAGES.lecture = function () {
    var html = '<h1 class="ttl">' + esc(T("mod_lecture")) + '</h1><p class="sub">' + esc(T("reading_sub")) + '</p><div class="filters">' + levelPills(RS.levels, null, true) + '</div><div id="rlist"></div>' + lockedNote();
    return shell("mod_lecture", html);
  };
  function sentences(text) {
    var parts = String(text).match(/[^.!?。！？]+[.!?。！？]*[”"»)]*\s*/g);
    return parts && parts.length ? parts : [text];
  }
  function readingCard(r, i, listenMode) {
    var sents = sentences(r.t).map(function (s) { return '<span class="sent" data-say="' + esc(s.trim()) + '">' + esc(s) + "</span>"; }).join("");
    var tr = gl(r.tr);
    var qs = (r.q || []).map(function (q, qi) {
      var opts = q.opts ? '<div class="opts">' + q.opts.map(function (o, oi) { return '<button type="button" class="btn2" data-rq="' + i + ":" + qi + ":" + oi + '">' + esc(gl(o)) + "</button>"; }).join("") + "</div>" : "";
      return '<div class="read-q">' + esc(gl(q.q)) + opts + "</div>";
    }).join("");
    return '<article class="read-card" id="read' + i + '"><div class="read-title">' + esc(gl(r.title) || r.title) + " " + lvBadge(r.level) + '<span class="spacer"></span><button type="button" class="btn2" data-play="' + i + '">▶ ' + esc(T("listen_text")) + "</button></div>" +
      '<div class="read-text"' + (C.dir === "rtl" ? ' dir="rtl"' : "") + (listenMode ? " hidden" : "") + ">" + sents + "</div>" +
      (r.r && P.settings.rom !== false && !listenMode ? '<div class="read-rom">' + esc(r.r) + "</div>" : "") +
      '<div class="row">' + (listenMode ? '<button type="button" class="btn2" data-show="text">👁 ' + esc(T("show_text")) + "</button>" : "") +
      (tr ? '<button type="button" class="btn2" data-show="tr">🌐 ' + esc(T("show_translation")) + fallbackTag(r.tr) + "</button>" : "") + "</div>" +
      (tr ? '<div class="read-tr" hidden>' + esc(tr) + "</div>" : "") + qs + "</article>";
  }
  function bindReadings(getList) {
    app.addEventListener("click", function (e) {
      var list = getList();
      var p = e.target.closest("[data-play]");
      if (p) { var r = list[+p.getAttribute("data-play")]; TTS.speak(r.t, p); return; }
      var s = e.target.closest("[data-show]");
      if (s) { var card = s.closest(".read-card"); var sel = s.getAttribute("data-show") === "tr" ? ".read-tr" : ".read-text"; var el = card.querySelector(sel); if (el) el.hidden = !el.hidden; return; }
      var q = e.target.closest("[data-rq]");
      if (q) {
        var parts = q.getAttribute("data-rq").split(":").map(Number), rd = list[parts[0]], qq = rd.q[parts[1]];
        var ok = parts[2] === qq.a;
        q.parentNode.querySelectorAll("button").forEach(function (b, i) { b.disabled = true; if (i === qq.a) b.classList.add("ok"); });
        if (!ok) q.classList.add("ko");
        record({ level: rd.level, theme: "_reading" }, ok); addXp(ok ? 3 : 0); save();
      }
    });
  }
  function readingList(state) { return (C.readings || []).filter(function (r) { return !state.levels.length || state.levels.indexOf(r.level) >= 0; }); }
  function bindLecture() {
    var cur = [];
    var paint = function () { cur = readingList(RS); document.getElementById("rlist").innerHTML = cur.map(function (r, i) { return readingCard(r, i); }).join("") || '<p class="muted with-masc">' + masc("question", 56, "masc-inline") + esc(T("no_results")) + "</p>"; };
    bindLevelPills(RS, paint); paint();
    bindReadings(function () { return cur; });
  }

  // ------------------------------------------------------------------ listening
  var ES = { levels: [] };
  PAGES.ecoute = function () {
    var html = '<h1 class="ttl">' + esc(T("mod_ecoute")) + '</h1><p class="sub">' + esc(T("listening_sub")) + "</p>" +
      '<div class="grid cols-2" style="margin-bottom:var(--ig27-space-6)">' +
      modeCard("listen", "🎧") + modeCard("dictation", "⌨️") + "</div>" +
      '<div class="filters">' + levelPills(ES.levels, null, true) + '</div><div class="secttit">' + esc(T("listen_texts")) + '</div><div id="elist"></div>';
    return shell("mod_ecoute", html);
  };

  // ------------------------------------------------------------------ exercises engine
  var QUIZ = null;
  var MODES = [
    { id: "mcq", ic: "☑️" }, { id: "reverse", ic: "🔁" }, { id: "listen", ic: "🎧" },
    { id: "write", ic: "⌨️", adv: true }, { id: "dictation", ic: "📝", adv: true }, { id: "cloze", ic: "🧩", adv: true },
    { id: "order", ic: "🔀", adv: true }, { id: "conj", ic: "🔁", adv: true, need: function () { return C.conj && C.conj.verbs && C.conj.verbs.length; } },
    { id: "mix", ic: "🎲" },
  ];
  function modeCard(id, ic) {
    var m = MODES.filter(function (x) { return x.id === id; })[0], lk = m && m.adv && modLocked("exercices-avances");
    return '<button type="button" class="navcard' + (lk ? " is-locked" : "") + '" data-mode="' + id + '"><div class="ic">' + ic + '</div><div><div class="tt">' + esc(T("mode_" + id)) + (lk ? ' <span class="lock">🔒</span>' : "") + '</div><div class="ds">' + esc(T("mode_" + id + "_d")) + '</div></div><span class="arrow">›</span></button>';
  }
  var XS = { levels: [], theme: "", n: 10 };
  PAGES.exercices = function () {
    var modes = MODES.filter(function (m) { return !m.need || m.need(); }).map(function (m) { return modeCard(m.id, m.ic); }).join("");
    var themes = {}; C.words.forEach(function (w) { themes[w.theme] = 1; });
    var html = '<h1 class="ttl">' + esc(T("mod_exercices")) + '</h1><p class="sub">' + esc(T("exercises_sub")) + "</p>" +
      '<div class="filters">' + levelPills(XS.levels, null, true) + '<div class="row"><select class="sel" id="xtheme"><option value="">' + esc(T("all_themes")) + "</option>" +
      Object.keys(themes).map(function (t) { return '<option value="' + esc(t) + '">' + esc(themeLabel(t)) + "</option>"; }).join("") + '</select><select class="sel" id="xn">' +
      [5, 10, 20, 30].map(function (n) { return '<option value="' + n + '"' + (n === XS.n ? " selected" : "") + ">" + esc(T("n_questions", { n: n })) + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="modes">' + modes + "</div>";
    return shell("mod_exercices", html);
  };
  function pool(levels, theme) {
    var list = C.words.filter(function (w) { return (!levels.length || levels.indexOf(w.level) >= 0) && (!theme || w.theme === theme) && wg(w); });
    return list.length >= 4 ? list : C.words.filter(function (w) { return wg(w); });
  }
  function distractors(correct, list, key, n) {
    var seenV = {}; seenV[key(correct)] = 1;
    var same = list.filter(function (w) { return w.theme === correct.theme; }), rest = list;
    var out = [];
    shuffle(same).concat(shuffle(rest)).forEach(function (w) { var k = key(w); if (out.length < n && k && !seenV[k]) { seenV[k] = 1; out.push(w); } });
    return out;
  }
  function tokens(text) {
    if (/^(ja|zh)$/.test(LANG) && window.Intl && Intl.Segmenter) {
      return Array.from(new Intl.Segmenter(LANG, { granularity: "word" }).segment(text)).map(function (s) { return s.segment; }).filter(function (s) { return s.trim() && !/^[。、！？.!?,]$/.test(s); });
    }
    return text.split(/\s+/).filter(Boolean);
  }
  function makeQuestion(mode, words) {
    var w = words[Math.floor(Math.random() * words.length)];
    switch (mode) {
      case "mcq": case "listen":
        return { mode: mode, item: w, prompt: w.t, rom: w.r, audio: w.t, answer: wg(w), opts: shuffle([wg(w)].concat(distractors(w, words, wg, 3).map(wg))) };
      case "reverse":
        return { mode: mode, item: w, prompt: wg(w), answer: w.t, optsT: true, opts: shuffle([w.t].concat(distractors(w, words, function (x) { return x.t; }, 3).map(function (x) { return x.t; }))) };
      case "write":
        return { mode: mode, item: w, prompt: wg(w), answer: w.t, alt: w.r, typed: true };
      case "dictation":
        return { mode: mode, item: w, prompt: "", audio: w.t, answer: w.t, alt: w.r, typed: true };
      case "cloze": {
        var src = (C.cloze && C.cloze.length && Math.random() < 0.5) ? C.cloze[Math.floor(Math.random() * C.cloze.length)] : null;
        if (src) {
          var others = shuffle(C.cloze.map(function (c) { return c.a; }).filter(function (a) { return a !== src.a; })).slice(0, 3);
          return { mode: mode, item: { level: src.level, theme: "_cloze" }, prompt: src.t, cloze: true, sub: gl(src.g), answer: src.a, optsT: true, opts: shuffle([src.a].concat(others)), audio: src.t.replace(/_+/, src.a) };
        }
        var ph = phrasePool(4);
        if (!ph) return makeQuestion("mcq", words);
        var tk = tokens(ph.t), idx = Math.floor(Math.random() * tk.length), ans = tk[idx].replace(/[.,!?;:。！？、]+$/, "");
        tk[idx] = tk[idx].replace(ans, "_____");
        var pool2 = []; (C.phrases || []).forEach(function (p) { tokens(p.t).forEach(function (x) { x = x.replace(/[.,!?;:。！？、]+$/, ""); if (x && x !== ans && pool2.indexOf(x) < 0) pool2.push(x); }); });
        return { mode: mode, item: { level: ph.level, theme: ph.theme }, prompt: tk.join(/^(ja|zh)$/.test(LANG) ? "" : " "), cloze: true, sub: gl(ph.g), answer: ans, optsT: true, opts: shuffle([ans].concat(pick(pool2, 3))), audio: ph.t };
      }
      case "order": {
        var src2 = (C.order && C.order.length && Math.random() < 0.4) ? C.order[Math.floor(Math.random() * C.order.length)] : null;
        var ws, g, lvl;
        if (src2) { ws = src2.w; g = gl(src2.g); lvl = src2.level; }
        else { var p2 = phrasePool(3); if (!p2) return makeQuestion("mcq", words); ws = tokens(p2.t); g = gl(p2.g); lvl = p2.level; }
        return { mode: mode, item: { level: lvl, theme: "_order" }, prompt: g, order: ws, answer: ws.join(" "), audio: ws.join(/^(ja|zh)$/.test(LANG) ? "" : " ") };
      }
      case "conj": {
        var v = C.conj.verbs[Math.floor(Math.random() * C.conj.verbs.length)];
        var tIds = Object.keys(v.forms), tid = tIds[Math.floor(Math.random() * tIds.length)], forms = v.forms[tid];
        var f = forms[Math.floor(Math.random() * forms.length)];
        var tense = (C.conj.tenses || []).filter(function (x) { return x.id === tid; })[0];
        var opts = [f.t]; shuffle(forms.concat(v.forms[tIds[(tIds.indexOf(tid) + 1) % tIds.length]] || [])).forEach(function (x) { if (opts.length < 4 && opts.indexOf(x.t) < 0) opts.push(x.t); });
        return { mode: mode, item: { level: v.level, theme: "_conj" }, prompt: (f.p ? f.p + " + " : "") + v.t, sub: gl(v.g) + " — " + gl(tense), answer: f.t, optsT: true, opts: shuffle(opts), audio: (f.p ? f.p + " " : "") + f.t };
      }
    }
  }
  function phrasePool(minTokens) {
    var list = (C.phrases || []).concat((C.words || []).filter(function (w) { return w.ex; }).map(function (w) { return { t: w.ex.t, g: w.ex.g, level: w.level, theme: w.theme }; }))
      .filter(function (p) { var n = tokens(p.t).length; return n >= minTokens && n <= 12 && (!XS.levels.length || XS.levels.indexOf(p.level) >= 0); });
    return list.length ? list[Math.floor(Math.random() * list.length)] : null;
  }
  function startQuiz(opts) {
    // opts: {modes:[..], words:[..], n, title, hearts, onDone, levelTag}
    var words = opts.words.length >= 2 ? opts.words : C.words;
    var qs = [];
    for (var i = 0; i < opts.n; i++) {
      var m = opts.modes[i % opts.modes.length];
      var q = makeQuestion(m, words); if (q) qs.push(q);
    }
    QUIZ = { qs: shuffle(qs), i: 0, ok: 0, ko: 0, xp: 0, hearts: opts.hearts || 0, opts: opts, errors: [] };
    paintQuiz();
  }
  function quizShell(inner) {
    var pct = QUIZ ? Math.round(100 * QUIZ.i / QUIZ.qs.length) : 0;
    return '<header class="duo-bar"><button type="button" class="btn2" id="quitQuiz" aria-label="' + esc(T("quit")) + '">✕</button><div class="duo-progress-track"><div class="duo-progress-fill" style="width:' + pct + '%"></div></div>' +
      (QUIZ.hearts ? '<div class="duo-hearts">' + "❤️".repeat(Math.max(0, QUIZ.hearts)) + "</div>" : "") + '<div class="duo-xp">+' + QUIZ.xp + " XP</div></header>" +
      '<main class="con">' + inner + "</main>" + '<div class="speaking-pill" id="speakPill"><div class="wave"><span></span><span></span><span></span></div>' + esc(T("speaking")) + "</div>";
  }
  function paintQuiz() {
    if (QUIZ.i >= QUIZ.qs.length || (QUIZ.opts.hearts && QUIZ.hearts <= 0)) return finishQuiz();
    var q = QUIZ.qs[QUIZ.i], h = '<div class="quiz-card"><div class="quiz-kind">' + esc(T("mode_" + q.mode)) + " · " + (QUIZ.i + 1) + "/" + QUIZ.qs.length + "</div>";
    if (q.mode === "listen" || q.mode === "dictation") h += '<div class="quiz-q"><button type="button" class="bpr" data-say="' + esc(q.audio) + '">🔊 ' + esc(T("listen")) + "</button></div>";
    else if (q.cloze) h += '<div class="quiz-q">' + tgt(q.prompt) + snd(q.audio) + "</div>";
    else if (q.mode === "mcq") h += '<div class="quiz-q">' + tgt(q.prompt) + snd(q.audio) + "</div>" + (q.rom && P.settings.rom !== false ? '<div class="quiz-sub">' + esc(q.rom) + "</div>" : "");
    else h += '<div class="quiz-q">' + esc(q.prompt) + "</div>";
    if (q.sub) h += '<div class="quiz-sub">' + esc(q.sub) + "</div>"; else h += '<div class="quiz-sub"></div>';
    if (q.opts) h += '<div class="quiz-opts">' + q.opts.map(function (o, i) { return '<button type="button" class="quiz-opt' + (q.optsT ? " t" : "") + '" data-opt="' + i + '">' + esc(o) + "</button>"; }).join("") + "</div>";
    else if (q.typed) h += '<input class="answer-input" id="ans" autocomplete="off" autocapitalize="off" spellcheck="false"' + (C.dir === "rtl" ? ' dir="rtl"' : "") + ">" + keyboard() + '<button type="button" class="bpr wide" id="check">' + esc(T("check")) + "</button>";
    else if (q.order) h += '<div class="order-answer" id="oans"></div><div class="order-bank">' + shuffle(q.order.map(function (w, i) { return { w: w, i: i }; })).map(function (o) { return '<button type="button" class="order-chip" data-oi="' + o.i + '">' + esc(o.w) + "</button>"; }).join("") + '</div><div class="row" style="justify-content:center;margin-top:var(--ig27-space-4)"><button type="button" class="btn2" id="oreset">↺ ' + esc(T("reset")) + '</button><button type="button" class="bpr" id="check">' + esc(T("check")) + "</button></div>";
    h += '<div id="fb"></div></div>';
    app.innerHTML = quizShell(h);
    if (P.settings.autoplay && (q.mode === "listen" || q.mode === "dictation" || q.mode === "mcq")) setTimeout(function () { TTS.speak(q.audio); }, 250);
    bindQuiz(q);
  }
  function keyboard() { return C.kb && C.kb.length ? '<div class="keyboard">' + C.kb.map(function (k) { return '<button type="button" class="kbtn" data-key="' + esc(k) + '">' + esc(k) + "</button>"; }).join("") + "</div>" : ""; }
  function bindQuiz(q) {
    document.getElementById("quitQuiz").addEventListener("click", function () { QUIZ = null; render(); });
    var answered = false;
    var finish = function (ok, given) {
      if (answered) return; answered = true;
      if (ok) { QUIZ.ok++; QUIZ.xp += 10; } else { QUIZ.ko++; if (QUIZ.hearts) QUIZ.hearts--; QUIZ.errors.push({ q: q, given: given }); }
      record(q.item, ok); if (q.item && q.item.id && ok && P.srs[q.item.id] === undefined && q.item.t) srsAdd(q.item);
      var adv = !modLocked("feedback-avance");
      var expl = "";
      if (!ok || adv) {
        expl = '<div class="expl">' + esc(T("answer_was")) + " : <b" + (q.optsT || q.typed || q.order ? ' class="t"' : "") + ">" + esc(q.answer) + "</b>" + (q.alt && P.settings.rom !== false ? " (" + esc(q.alt) + ")" : "") + "</div>";
        if (adv && q.item && q.item.ex) expl += '<div class="expl">' + esc(T("example")) + " : " + tgt(q.item.ex.t) + " — " + esc(gl(q.item.ex.g)) + "</div>";
        if (adv && !ok && given && q.typed) expl += '<div class="expl">' + esc(T("similarity", { n: Math.round(100 * similarity(given, q.answer)) })) + "</div>";
        if (!adv && !ok) expl += '<div class="expl muted small">🔒 ' + esc(T("feedback_locked")) + "</div>";
      }
      var fb = document.getElementById("fb");
      var fbMood = ok ? pickMood(["laugh", "wink", "cheer", "amazed"]) : (QUIZ.hearts === 1 ? "sad" : pickMood(["surprised", "question", "sad"]));
      fb.innerHTML = '<div class="feedback ' + (ok ? "ok" : "ko") + (hasMood(fbMood) ? " with-masc" : "") + '">' + masc(fbMood, 64, "masc-fb") + "<div><b>" + esc(ok ? T("correct") : T("wrong")) + "</b>" + expl + "</div></div>" + '<button type="button" class="bpr wide" id="next" style="margin-top:var(--ig27-space-3)">' + esc(T("continue")) + "</button>";
      fb.querySelector(".feedback").classList.add(ok ? "pop" : "shake");
      if (q.audio && (q.mode !== "listen")) TTS.speak(q.audio);
      document.getElementById("next").addEventListener("click", function () { QUIZ.i++; paintQuiz(); });
      document.getElementById("next").focus();
    };
    app.querySelectorAll("[data-opt]").forEach(function (b) {
      b.addEventListener("click", function () {
        var val = q.opts[+b.getAttribute("data-opt")], ok = val === q.answer;
        app.querySelectorAll("[data-opt]").forEach(function (x) { x.disabled = true; if (q.opts[+x.getAttribute("data-opt")] === q.answer) x.classList.add("correct"); });
        if (!ok) b.classList.add("wrong");
        finish(ok, val);
      });
    });
    var ans = document.getElementById("ans");
    if (ans) {
      ans.focus();
      app.querySelectorAll("[data-key]").forEach(function (k) { k.addEventListener("click", function () { ans.value += k.getAttribute("data-key"); ans.focus(); }); });
      var check = function () {
        var v = ans.value.trim(); if (!v) return;
        var ok = norm(v) === norm(q.answer) || (q.alt && norm(v) === norm(q.alt)) || similarity(v, q.answer) >= 0.92;
        ans.disabled = true; finish(ok, v);
      };
      document.getElementById("check").addEventListener("click", check);
      ans.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); answered ? document.getElementById("next").click() : check(); } });
    } else if (q.order) {
      var built = [], oans = document.getElementById("oans");
      var paint = function () { oans.innerHTML = built.map(function (i) { return '<span class="order-chip">' + esc(q.order[i]) + "</span>"; }).join(""); };
      app.querySelectorAll("[data-oi]").forEach(function (c) { c.addEventListener("click", function () { built.push(+c.getAttribute("data-oi")); c.classList.add("used"); paint(); }); });
      document.getElementById("oreset").addEventListener("click", function () { built = []; app.querySelectorAll("[data-oi]").forEach(function (c) { c.classList.remove("used"); }); paint(); });
      document.getElementById("check").addEventListener("click", function () {
        var given = built.map(function (i) { return q.order[i]; }).join(" ");
        finish(norm(given) === norm(q.answer), given);
      });
    }
  }
  function finishQuiz() {
    var Q = QUIZ, total = Q.ok + Q.ko, pct = total ? Math.round(100 * Q.ok / total) : 0;
    addXp(Q.xp); if (total >= 5 && Q.ko === 0) P.perfect = (P.perfect || 0) + 1;
    save();
    var res = Q.opts.onDone ? Q.opts.onDone(Q, pct) : null;
    var errs = Q.errors.length && !modLocked("feedback-avance") ? '<div class="box" style="text-align:left;margin-top:var(--ig27-space-5)"><h3>' + esc(T("review_errors")) + "</h3>" + Q.errors.map(function (e) {
      return '<div class="exline" style="margin-top:var(--ig27-space-2)">' + snd(e.q.audio || e.q.answer, true) + "<div><b>" + esc(e.q.prompt || e.q.audio) + "</b> → " + tgt(e.q.answer) + (e.given ? ' <span class="muted">(' + esc(T("you_said")) + " : " + esc(e.given) + ")</span>" : "") + "</div></div>";
    }).join("") + "</div>" : "";
    var endMood = pct === 100 ? "amazed" : pct >= 80 ? "celebrate" : pct >= 50 ? "cheer" : "sad";
    app.innerHTML = quizShell('<div class="complete"><div class="big">' + mascOr(endMood, pct >= 80 ? "🏆" : pct >= 50 ? "👏" : "💪") + "</div><h2>" + esc(res && res.title || T("quiz_done")) + "</h2><p>" +
      esc(T("score_line", { ok: Q.ok, total: total, pct: pct, xp: Q.xp })) + "</p>" + (res && res.html ? res.html : "") +
      '<div class="row" style="justify-content:center;margin-top:var(--ig27-space-5)"><button type="button" class="btn2" id="again">↺ ' + esc(T("again")) + '</button><button type="button" class="bpr" id="back">' + esc(T("back")) + "</button></div>" + errs + "</div>");
    document.getElementById("again").addEventListener("click", function () { startQuiz(Q.opts); });
    document.getElementById("back").addEventListener("click", function () { QUIZ = null; render(); });
    QUIZ = Q; QUIZ.i = QUIZ.qs.length;
  }
  function launchMode(mode) {
    var m = MODES.filter(function (x) { return x.id === mode; })[0];
    if (m && m.adv && modLocked("exercices-avances")) { app.innerHTML = shell("mod_exercices", gate(LANG + ":exercices-avances", "✏️")); return; }
    var modes = mode === "mix" ? MODES.filter(function (x) { return x.id !== "mix" && (!x.need || x.need()) && !(x.adv && modLocked("exercices-avances")); }).map(function (x) { return x.id; }) : [mode];
    startQuiz({ modes: modes, words: pool(XS.levels, XS.theme), n: XS.n });
  }
  function bindExercices() {
    bindLevelPills(XS, function () {});
    var th = document.getElementById("xtheme"); if (th) th.addEventListener("change", function (e) { XS.theme = e.target.value; });
    var xn = document.getElementById("xn"); if (xn) xn.addEventListener("change", function (e) { XS.n = +e.target.value; });
    app.querySelectorAll("[data-mode]").forEach(function (b) { b.addEventListener("click", function () { launchMode(b.getAttribute("data-mode")); }); });
    if (PENDING_MODE) { var pm = PENDING_MODE; PENDING_MODE = null; launchMode(pm); }
  }
  var PENDING_MODE = null;
  function bindEcoute() {
    app.querySelectorAll("[data-mode]").forEach(function (b) { b.addEventListener("click", function () { XS.levels = ES.levels; launchMode(b.getAttribute("data-mode")); }); });
    var cur = [];
    var paint = function () { cur = readingList(ES); document.getElementById("elist").innerHTML = cur.map(function (r, i) { return readingCard(r, i, true); }).join("") || '<p class="muted with-masc">' + masc("question", 56, "masc-inline") + esc(T("no_results")) + "</p>"; };
    bindLevelPills(ES, paint); paint();
    bindReadings(function () { return cur; });
  }

  // ------------------------------------------------------------------ SRS review
  PAGES.revision = function () {
    var due = dueWords(), adv = !locked("premium:srs-advanced"), cap = adv ? Infinity : 20;
    var doneToday = dayRec().reviews, left = Math.max(0, cap - doneToday);
    var total = Object.keys(P.srs).length;
    var forecast = "";
    if (adv) {
      var days = [0, 0, 0, 0, 0, 0, 0], now = Date.now();
      Object.keys(P.srs).forEach(function (id) { var d = Math.floor((P.srs[id].due - now) / DAY) + 1; if (d >= 0 && d < 7) days[d]++; });
      var mx = Math.max.apply(null, days.concat([1]));
      forecast = '<div class="box"><h3>📅 ' + esc(T("forecast")) + '</h3><div class="bars">' + days.map(function (n, i) { return '<div style="height:' + Math.round(100 * n / mx) + '%" data-tip="' + esc((i === 0 ? T("today") : "J+" + i) + " : " + n) + '"></div>'; }).join("") + "</div></div>";
    }
    var html = '<h1 class="ttl">' + esc(T("mod_revision")) + '</h1><p class="sub">' + esc(adv ? T("srs_adv_sub") : T("srs_free_sub", { n: 20 })) + "</p>" +
      '<div class="stat-grid">' + stat(due.length, T("due_now")) + stat(total, T("in_srs")) + stat(adv ? "∞" : left, T("left_today")) + "</div>" +
      (due.length && left ? '<button type="button" class="bpr wide" id="startRev">🧠 ' + esc(T("review_now")) + " (" + Math.min(due.length, left) + ")</button>" : '<div class="box with-masc">' + masc(!left ? "stretch" : "sleep", 72, "masc-inline") + "<div>" + esc(!left ? T("srs_cap_reached") : T("nothing_due")) + "</div></div>") +
      '<div class="box row" style="margin-top:var(--ig27-space-4)"><span>' + esc(T("learn_new")) + '</span><span class="spacer"></span><select class="sel" id="newLv">' + LEVELS.filter(function (l) { return !(C.locked && C.locked.levels.indexOf(l) >= 0); }).map(function (l) { return "<option>" + l + "</option>"; }).join("") + '</select><button type="button" class="btn2" id="addNew">+ 10</button></div>' +
      forecast + (!adv ? '<div class="sect">' + gate("premium:srs-advanced", "🧠") + "</div>" : "");
    return shell("mod_revision", html);
  };
  function bindRevision() {
    var add = document.getElementById("addNew");
    if (add) add.addEventListener("click", function () {
      var l = document.getElementById("newLv").value, fresh = C.words.filter(function (w) { return w.level === l && !P.srs[w.id]; }).slice(0, 10);
      fresh.forEach(srsAdd); save(); toast(T("added_n", { n: fresh.length }), "wink"); render();
    });
    var st = document.getElementById("startRev");
    if (st) st.addEventListener("click", function () {
      var adv = !locked("premium:srs-advanced"), left = adv ? 1e9 : Math.max(0, 20 - dayRec().reviews);
      reviewSession(shuffle(dueWords()).slice(0, left));
    });
  }
  function reviewSession(cards) {
    var i = 0;
    var paint = function () {
      if (i >= cards.length) { app.innerHTML = shell("mod_revision", '<div class="complete"><div class="big">' + mascOr("love", "🎉") + '</div><h2>' + esc(T("review_done")) + '</h2><button type="button" class="bpr" data-nav="revision">' + esc(T("back")) + "</button></div>"); return; }
      var w = cards[i];
      app.innerHTML = shell("mod_revision", '<div class="quiz-card"><div class="quiz-kind">' + (i + 1) + "/" + cards.length + " " + lvBadge(w.level) + '</div><div class="flash"><div class="big t"' + (C.dir === "rtl" ? ' dir="rtl"' : "") + ">" + esc(w.t) + '</div><div class="row" style="justify-content:center;margin-top:var(--ig27-space-2)">' + snd(w.t) + "</div>" +
        '<div id="back" hidden>' + (w.r ? '<div class="rom">' + esc(w.r) + "</div>" : "") + '<div class="gl">' + esc(wg(w)) + "</div>" + (w.ex ? '<div class="exs">' + snd(w.ex.t, true) + " " + tgt(w.ex.t) + "<br>" + esc(gl(w.ex.g)) + "</div>" : "") + "</div></div>" +
        '<div id="actions"><button type="button" class="bpr wide" id="reveal">' + esc(T("show_answer")) + "</button></div></div>");
      if (P.settings.autoplay) TTS.speak(w.t);
      document.getElementById("reveal").addEventListener("click", function () {
        document.getElementById("back").hidden = false;
        document.getElementById("actions").innerHTML = '<div class="quiz-opts">' + [[1, "again"], [3, "hard"], [4, "good"], [5, "easy"]].map(function (g) { return '<button type="button" class="quiz-opt" data-q="' + g[0] + '">' + esc(T("grade_" + g[1])) + "</button>"; }).join("") + "</div>";
        app.querySelectorAll("[data-q]").forEach(function (b) { b.addEventListener("click", function () { srsGrade(w, +b.getAttribute("data-q")); i++; paint(); }); });
      });
    };
    paint();
  }

  // ------------------------------------------------------------------ pronunciation
  var PR = { levels: [] };
  PAGES.prononciation = function () {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, ai = !locked("premium:pronunciation-ai");
    var html = '<h1 class="ttl">' + esc(T("mod_prononciation")) + '</h1><p class="sub">' + esc(ai ? T("pron_sub_ai") : T("pron_sub_free")) + "</p>" +
      (!SR && ai ? '<div class="box">' + esc(T("sr_unsupported")) + "</div>" : "") +
      (!ai ? '<div class="box row">🔒 ' + esc(T("feat_pronunciation-ai")) + '<span class="spacer"></span><button type="button" class="bpr" data-go="/subscribe">★ ' + esc(T("go_premium")) + "</button></div>" : "") +
      '<div class="filters">' + levelPills(PR.levels, null, true) + '</div><div id="prlist"></div>';
    return shell("mod_prononciation", html);
  };
  function bindPron() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, ai = !locked("premium:pronunciation-ai") && SR;
    var paint = function () {
      var items = (C.phrases || []).map(function (p) { return { t: p.t, r: p.r, g: p.g, level: p.level }; })
        .concat(C.words.map(function (w) { return { t: w.t, r: w.r, g: w.g, level: w.level, id: w.id, theme: w.theme }; }))
        .filter(function (x) { return !PR.levels.length || PR.levels.indexOf(x.level) >= 0; });
      items = items.slice(0, 60);
      document.getElementById("prlist").innerHTML = items.map(function (x, i) {
        return '<div class="prow">' + snd(x.t) + '<div style="flex:1">' + tgt(x.t) + (x.r ? '<div class="muted small">' + esc(x.r) + "</div>" : "") + '<div class="g">' + esc(gl(x.g)) + '</div><div class="small" id="prs' + i + '"></div></div>' +
          (ai ? '<button type="button" class="btn2" data-rec="' + i + '">🎙️ ' + esc(T("record")) + "</button>" : "") + lvBadge(x.level) + "</div>";
      }).join("");
      paint.items = items;
    };
    bindLevelPills(PR, paint); paint();
    if (!ai) return;
    app.addEventListener("click", function (e) {
      var b = e.target.closest("[data-rec]"); if (!b) return;
      var i = +b.getAttribute("data-rec"), x = paint.items[i], out = document.getElementById("prs" + i);
      var rec = new SR(); rec.lang = C.tts || LANG; rec.interimResults = false; rec.maxAlternatives = 3;
      b.disabled = true; out.textContent = T("listening");
      rec.onresult = function (ev) {
        var best = 0, heard = "";
        for (var k = 0; k < ev.results[0].length; k++) { var alt = ev.results[0][k].transcript, sc = Math.max(similarity(alt, x.t), x.r ? similarity(alt, x.r) : 0); if (sc > best) { best = sc; heard = alt; } }
        var pct = Math.round(best * 100);
        out.innerHTML = masc(pct >= 85 ? "amazed" : pct >= 60 ? "cheer" : "question", 48, "masc-inline") + '<b style="color:var(--ig27-' + (pct >= 85 ? "green" : pct >= 60 ? "orange" : "red") + ')">' + pct + "%</b> — " + esc(T("heard")) + " : « " + esc(heard) + " » " + esc(pct >= 85 ? T("pron_great") : pct >= 60 ? T("pron_ok") : T("pron_retry"));
        record({ id: x.id, level: x.level, theme: x.theme || "_pron" }, pct >= 70); addXp(pct >= 85 ? 5 : pct >= 60 ? 2 : 0); save();
      };
      rec.onerror = function (ev) { out.textContent = T("sr_error") + " (" + ev.error + ")"; };
      rec.onend = function () { b.disabled = false; };
      try { rec.start(); } catch (err) { out.textContent = T("sr_error"); b.disabled = false; }
    });
  }

  // ------------------------------------------------------------------ culture
  PAGES.culture = function () {
    var html = '<h1 class="ttl">' + esc(T("mod_culture")) + '</h1><p class="sub">' + esc(T("culture_sub", { lang: langName(LANG) })) + '</p><div id="cul">' +
      (C.culture || []).map(function (c, i) { return grammarCard({ title: c.title, body: c.body, level: c.level, icon: c.icon || "🌍", ex: c.ex }, i === 0); }).join("") + "</div>";
    return shell("mod_culture", html);
  };

  // ------------------------------------------------------------------ levels (lessons)
  function levelOf(page) { var m = /^level_(a1|a2|b1|b2|c1|c2)$/.exec(page); return m ? m[1].toUpperCase() : null; }
  function lessonsToday() { return dayRec().lessons || 0; }
  PAGES.level = function (L) {
    var lockedL = C.locked && C.locked.levels.indexOf(L) >= 0;
    if (lockedL) return shell("mod_levels", '<div class="level-hero"></div>' + gate("premium:levels-c", "🎓"));
    var lw = allWords().filter(function (w) { return w.level === L; }), k = lw.filter(known).length;
    var advLocked = ["B1", "B2", "C1", "C2"].indexOf(L) >= 0 && modLocked("lecons-avancees");
    var unlimited = !locked("premium:lessons-unlimited"), left = unlimited ? Infinity : Math.max(0, 3 - lessonsToday());
    var gram = (C.grammar || []).filter(function (g) { return g.level === L; });
    var reads = (C.readings || []).filter(function (r) { return r.level === L; });
    var exam = P.exams[L];
    var html = '<div style="text-align:center;margin-bottom:var(--ig27-space-5)"><div class="lvlcard" style="display:inline-flex;align-items:center;width:auto;padding:var(--ig27-space-4) var(--ig27-space-6)"><div class="badge bg-' + L + '" style="width:56px;height:56px;font-size:var(--ig27-fs-title2)">' + L + "</div><b>" + esc(T("level_" + L)) + "</b><span>" + esc(T("n_known", { n: k })) + " / " + lw.length + '</span><div class="meter" style="width:220px"><i style="width:' + (lw.length ? Math.round(100 * k / lw.length) : 0) + '%"></i></div></div></div>' +
      (advLocked ? gate(LANG + ":lecons-avancees", "📘") :
        '<div class="grid cols-2">' +
        '<div class="box"><h3>📘 ' + esc(T("lesson")) + '</h3><p class="muted small">' + esc(T("lesson_d")) + "</p>" +
        (left > 0 ? '<button type="button" class="bpr wide" id="startLesson" style="margin-top:var(--ig27-space-3)">' + esc(T("start_lesson")) + "</button>" + (unlimited ? "" : '<p class="muted small" style="margin-top:var(--ig27-space-2)">' + esc(T("lessons_left", { n: left })) + "</p>") :
          masc("sleep", 72, "masc-inline") + '<p class="small" style="margin-top:var(--ig27-space-3)">🔒 ' + esc(T("lessons_cap")) + '</p><button type="button" class="bpr" data-go="/subscribe">★ ' + esc(T("go_premium")) + "</button>") + "</div>" +
        '<div class="box"><h3>🎓 ' + esc(T("mod_examen")) + '</h3><p class="muted small">' + esc(exam ? T("exam_best", { n: exam.best }) : T("exam_d")) + '</p><button type="button" class="btn2" data-exam="' + L + '" style="margin-top:var(--ig27-space-3)">' + esc(T("take_exam")) + (locked("premium:exam") ? " 🔒" : "") + "</button></div></div>") +
      (gram.length ? '<div class="sect"><div class="secttit">📑 ' + esc(T("mod_grammaire")) + "</div>" + gram.map(function (g) { return grammarCard(g); }).join("") + "</div>" : "") +
      (reads.length ? '<div class="sect"><div class="secttit">📖 ' + esc(T("mod_lecture")) + '</div><button type="button" class="btn2" data-nav="lecture">' + esc(T("n_texts", { n: reads.length })) + " ›</button></div>" : "") +
      '<div class="sect"><div class="secttit">📚 ' + esc(T("words_of_level", { level: L })) + '</div><div class="vlist">' + lw.slice(0, 300).map(vrow).join("") + "</div></div>";
    return shell("mod_levels", html);
  };
  function bindLevel(L) {
    decorateTargetText(app);
    app.addEventListener("click", function (e) { var r = e.target.closest(".vrow"); if (r && !e.target.closest("button")) r.classList.toggle("open"); });
    var st = document.getElementById("startLesson");
    if (st) st.addEventListener("click", function () { lessonFlow(L); });
    var ex = app.querySelector("[data-exam]");
    if (ex) ex.addEventListener("click", function () { examFlow(L); });
  }
  function lessonFlow(L) {
    var lw = C.words.filter(function (w) { return w.level === L && wg(w); });
    var fresh = lw.filter(function (w) { return !seen(w); });
    var batch = (fresh.length >= 5 ? fresh : lw).slice(0, 8);
    var i = 0;
    var paint = function () {
      if (i >= batch.length) {
        return startQuiz({ modes: ["mcq", "reverse", "listen", "mcq"], words: batch.length >= 4 ? batch.concat(pick(lw, 8)) : lw, n: 10, hearts: 3, onDone: function (Q, pct) {
          var d = dayRec(); d.lessons = (d.lessons || 0) + 1;
          var ls = (P.lessons[L] = P.lessons[L] || { done: 0 }); ls.done++;
          batch.forEach(function (w) { srsAdd(w); (P.words[w.id] = P.words[w.id] || { ok: 0, ko: 0, seen: 0, last: 0 }).seen++; });
          save();
          return { title: T("lesson_done") };
        } });
      }
      var w = batch[i];
      app.innerHTML = quizShellLesson(i, batch.length, '<div class="quiz-card"><div class="quiz-kind">' + esc(T("new_word")) + " · " + (i + 1) + "/" + batch.length + " " + lvBadge(w.level) + '</div><div class="flash"><div class="big t"' + (C.dir === "rtl" ? ' dir="rtl"' : "") + ">" + esc(w.t) + "</div>" + (w.r ? '<div class="rom">' + esc(w.r) + "</div>" : "") +
        '<div class="row" style="justify-content:center;margin-top:var(--ig27-space-3)">' + snd(w.t) + '</div><div class="gl">' + esc(wg(w)) + fallbackTag(w.g) + "</div>" +
        (w.ex ? '<div class="exs">' + snd(w.ex.t, true) + " " + tgt(w.ex.t) + "<br>" + esc(gl(w.ex.g)) + "</div>" : "") + '</div><button type="button" class="bpr wide" id="nextW">' + esc(T("continue")) + "</button></div>");
      if (P.settings.autoplay) TTS.speak(w.t);
      document.getElementById("nextW").addEventListener("click", function () { i++; paint(); });
    };
    paint();
  }
  function quizShellLesson(i, n, inner) {
    return '<header class="duo-bar"><button type="button" class="btn2" id="quitL" aria-label="' + esc(T("quit")) + '">✕</button><div class="duo-progress-track"><div class="duo-progress-fill" style="width:' + Math.round(50 * i / n) + '%"></div></div></header><main class="con">' + inner + "</main>" +
      '<div class="speaking-pill" id="speakPill"><div class="wave"><span></span><span></span><span></span></div>' + esc(T("speaking")) + "</div>";
  }
  document.addEventListener("click", function (e) { if (e.target.id === "quitL") { e.stopImmediatePropagation(); e.preventDefault(); QUIZ = null; render(); } }, true);

  // ------------------------------------------------------------------ exam
  PAGES.examen = function () {
    if (locked("premium:exam")) return shell("mod_examen", gate("premium:exam", "🎓"));
    var html = '<h1 class="ttl">' + esc(T("mod_examen")) + '</h1><p class="sub">' + esc(T("exam_sub")) + '</p><div class="grid cols-3">' +
      LEVELS.map(function (L) {
        var lk = C.locked && C.locked.levels.indexOf(L) >= 0, ex = P.exams[L];
        return '<button type="button" class="lvlcard' + (lk ? " is-locked" : "") + '" data-exam="' + L + '"' + (lk ? " disabled" : "") + '><div class="badge bg-' + L + '">' + L + "</div><b>" + esc(T("level_" + L)) + (lk ? " 🔒" : "") + "</b><span>" + esc(ex ? T("exam_best", { n: ex.best }) + (ex.passed ? " ✓" : "") : T("not_taken")) + "</span></button>";
      }).join("") + "</div>";
    return shell("mod_examen", html);
  };
  function examFlow(L) {
    if (locked("premium:exam")) { app.innerHTML = shell("mod_examen", gate("premium:exam", "🎓")); return; }
    var lw = C.words.filter(function (w) { return w.level === L && wg(w); });
    if (lw.length < 4) { toast(T("not_enough")); return; }
    var modes = ["mcq", "reverse", "listen"]; if (!modLocked("exercices-avances")) modes.push("write", "cloze");
    startQuiz({ modes: modes, words: lw, n: 20, onDone: function (Q, pct) {
      var prev = P.exams[L];
      P.exams[L] = { best: Math.max(pct, prev ? prev.best : 0), date: today(), passed: (prev && prev.passed) || pct >= 80 };
      save();
      return { title: pct >= 80 ? T("exam_passed", { level: L }) : T("exam_failed"), html: pct >= 80 ? '<p><button type="button" class="btn2" data-nav="certificat">📜 ' + esc(T("mod_certificat")) + "</button></p>" : "" };
    } });
  }

  // ------------------------------------------------------------------ stats
  PAGES.stats = function () {
    var words = allWords(), knownN = words.filter(known).length, acc = P.answers.total ? Math.round(100 * P.answers.ok / P.answers.total) : 0;
    var html = '<h1 class="ttl">' + esc(T("mod_stats")) + '</h1><p class="sub">' + esc(T("stats_sub")) + '</p><div class="stat-grid">' +
      stat(P.xp, T("xp")) + stat(P.streak.count, T("streak_days")) + stat(knownN, T("words_known")) + stat(acc + "%", T("accuracy")) + stat(P.answers.total, T("answers")) + "</div>";
    if (locked("premium:stats-advanced")) return shell("mod_stats", html + gate("premium:stats-advanced", "📊"));
    var days = []; for (var i = 29; i >= 0; i--) { var d = dayOffset(-i); days.push({ d: d, xp: (P.days[d] || {}).xp || 0 }); }
    var mx = Math.max.apply(null, days.map(function (x) { return x.xp; }).concat([1]));
    html += '<div class="box"><h3>📈 ' + esc(T("activity_30")) + '</h3><div class="bars">' + days.map(function (x) { return '<div style="height:' + Math.round(100 * x.xp / mx) + '%" data-tip="' + esc(x.d + " : " + x.xp + " XP") + '"></div>'; }).join("") + "</div></div>";
    html += '<div class="box"><h3>🎯 ' + esc(T("by_level")) + "</h3>" + LEVELS.map(function (L) {
      var lw = words.filter(function (w) { return w.level === L; }), k = lw.filter(known).length, b = P.byLevel[L] || { ok: 0, ko: 0 }, t = b.ok + b.ko;
      return '<div class="hbar"><span>' + lvBadge(L) + " " + k + "/" + lw.length + '</span><div class="meter"><i style="width:' + (lw.length ? Math.round(100 * k / lw.length) : 0) + '%"></i></div><span class="muted">' + (t ? Math.round(100 * b.ok / t) + "%" : "—") + "</span></div>";
    }).join("") + "</div>";
    var themes = Object.keys(P.byTheme).filter(function (t) { return t.charAt(0) !== "_"; }).map(function (t) { var b = P.byTheme[t]; return { t: t, pct: Math.round(100 * b.ok / (b.ok + b.ko)), n: b.ok + b.ko }; }).sort(function (a, b) { return a.pct - b.pct; });
    if (themes.length) html += '<div class="box"><h3>🧩 ' + esc(T("by_theme")) + "</h3>" + themes.map(function (x) { return '<div class="hbar"><span>' + esc(themeLabel(x.t)) + '</span><div class="meter"><i style="width:' + x.pct + '%"></i></div><span class="muted">' + x.pct + "%</span></div>"; }).join("") + "</div>";
    if (!locked("premium:progress-detailed")) {
      var hard = Object.keys(P.words).map(function (id) { return { w: wordIndex()[id], s: P.words[id] }; }).filter(function (x) { return x.w && x.s.ko; }).sort(function (a, b) { return (b.s.ko - b.s.ok) - (a.s.ko - a.s.ok); }).slice(0, 15);
      if (hard.length) html += '<div class="box"><h3>🔥 ' + esc(T("hardest_words")) + '</h3><div class="vlist">' + hard.map(function (x) { return vrow(x.w).replace('<div class="main">', '<div class="main"><span class="tag">✓' + x.s.ok + " ✗" + x.s.ko + "</span>"); }).join("") + "</div></div>";
    }
    return shell("mod_stats", html);
  };

  // ------------------------------------------------------------------ badges
  var BADGES = [
    { id: "first", ic: "🌱", test: function () { return P.answers.total >= 1; } },
    { id: "lesson1", ic: "📘", test: function () { return Object.keys(P.lessons).some(function (k) { return P.lessons[k].done >= 1; }); } },
    { id: "lesson10", ic: "📚", test: function () { return Object.keys(P.lessons).reduce(function (a, k) { return a + P.lessons[k].done; }, 0) >= 10; } },
    { id: "words50", ic: "🔤", test: function () { return allWords().filter(known).length >= 50; } },
    { id: "words250", ic: "🧠", test: function () { return allWords().filter(known).length >= 250; } },
    { id: "words1000", ic: "🏛️", test: function () { return allWords().filter(known).length >= 1000; } },
    { id: "streak3", ic: "🔥", test: function () { return P.streak.count >= 3; } },
    { id: "streak7", ic: "⚡", test: function () { return P.streak.count >= 7; } },
    { id: "streak30", ic: "🌟", test: function () { return P.streak.count >= 30; } },
    { id: "xp1000", ic: "💎", test: function () { return P.xp >= 1000; } },
    { id: "perfect", ic: "🎯", test: function () { return (P.perfect || 0) >= 1; } },
    { id: "reviewer", ic: "🗂️", test: function () { return Object.keys(P.srs).length >= 100; } },
    { id: "examA", ic: "🥉", test: function () { return (P.exams.A1 && P.exams.A1.passed) || (P.exams.A2 && P.exams.A2.passed); } },
    { id: "examB", ic: "🥈", test: function () { return (P.exams.B1 && P.exams.B1.passed) || (P.exams.B2 && P.exams.B2.passed); } },
    { id: "examC", ic: "🥇", test: function () { return (P.exams.C1 && P.exams.C1.passed) || (P.exams.C2 && P.exams.C2.passed); } },
    { id: "speaker", ic: "🎙️", test: function () { return (P.byTheme._pron || { ok: 0 }).ok >= 10; } },
  ];
  function checkBadges() { var fresh = []; BADGES.forEach(function (b) { if (!P.badges[b.id] && b.test()) { P.badges[b.id] = today(); fresh.push(b); } }); return fresh; }
  PAGES.badges = function () {
    if (locked("premium:badges")) return shell("mod_badges", gate("premium:badges", "🏅"));
    checkBadges(); save();
    var html = '<h1 class="ttl">' + esc(T("mod_badges")) + '</h1><p class="sub">' + esc(T("badges_sub", { n: Object.keys(P.badges).length, total: BADGES.length })) + '</p><div class="badges">' +
      BADGES.map(function (b) { var got = P.badges[b.id]; return '<div class="badge-card' + (got ? "" : " off") + '"><div class="ic">' + b.ic + "</div><b>" + esc(T("badge_" + b.id)) + "</b><span>" + esc(got ? T("earned_on", { d: got }) : T("badge_" + b.id + "_d")) + "</span></div>"; }).join("") + "</div>";
    return shell("mod_badges", html);
  };

  // ------------------------------------------------------------------ certificate
  PAGES.certificat = function () {
    if (locked("premium:certificates")) return shell("mod_certificat", gate("premium:certificates", "📜"));
    var passed = LEVELS.filter(function (L) { return P.exams[L] && P.exams[L].passed; });
    if (!passed.length) return shell("mod_certificat", '<div class="gate"><div class="big">📜</div><h2>' + esc(T("no_cert")) + "</h2><p>" + esc(T("no_cert_d")) + '</p><button type="button" class="bpr" data-nav="examen">🎓 ' + esc(T("mod_examen")) + "</button></div>");
    var L = passed[passed.length - 1], ex = P.exams[L];
    var html = '<div class="no-print row" style="margin-bottom:var(--ig27-space-4)">' + passed.map(function (l) { return '<button type="button" class="pill' + (l === L ? " on" : "") + '" data-cert="' + l + '">' + l + "</button>"; }).join("") + '<span class="spacer"></span><button type="button" class="bpr" id="printCert">🖨️ ' + esc(T("print")) + "</button></div>" +
      '<div class="cert" id="cert"></div>';
    setTimeout(function () { paintCert(L); }, 0);
    return shell("mod_certificat", html);
  };
  function paintCert(L) {
    var ex = P.exams[L], el = document.getElementById("cert"); if (!el) return;
    el.innerHTML = '<div style="font-size:48px">' + esc(C.flag) + "</div><h2>" + esc(T("cert_title")) + '</h2><p class="muted">' + esc(T("cert_attests")) + '</p><div class="who">' + esc(ME.name || T("learner")) + "</div><p>" +
      esc(T("cert_body", { lang: langName(LANG), level: L, label: T("level_" + L), score: ex.best })) + '</p><p class="muted small" style="margin-top:var(--ig27-space-6)">' + esc(T("cert_date", { d: ex.date })) + " · Papote · #" + esc(String(ME.id) + "-" + LANG + "-" + L) + "</p>";
  }

  // ------------------------------------------------------------------ dictionary
  PAGES.dictionnaire = function () {
    var cap = locked("premium:custom-words") ? 20 : Infinity;
    var html = '<h1 class="ttl">' + esc(T("mod_dictionnaire")) + '</h1><p class="sub">' + esc(T("dict_sub")) + '</p><input class="field" type="search" id="dq" placeholder="' + esc(T("search")) + '" style="width:100%;margin-bottom:var(--ig27-space-4)"><div id="dres"></div>' +
      '<div class="sect"><div class="secttit">➕ ' + esc(T("my_words")) + " (" + (P.custom || []).length + (cap < Infinity ? "/" + cap : "") + ')</div><div class="box"><div class="row">' +
      '<input class="field" id="cw_t" placeholder="' + esc(T("word_in", { lang: langName(LANG) })) + '"><input class="field" id="cw_r" placeholder="' + esc(T("romanization")) + '"><input class="field" id="cw_g" placeholder="' + esc(T("translation")) + '">' +
      '<select class="sel" id="cw_l">' + LEVELS.map(function (l) { return "<option>" + l + "</option>"; }).join("") + '</select><button type="button" class="bpr" id="cw_add">+</button></div></div><div class="vlist" id="cwlist"></div></div>';
    return shell("mod_dictionnaire", html);
  };
  function bindDict() {
    var q = document.getElementById("dq"), res = document.getElementById("dres");
    var run = function () {
      var s = norm(q.value); if (s.length < 2) { res.innerHTML = ""; return; }
      var w = allWords().filter(function (w) { return norm(w.t + " " + (w.r || "") + " " + wg(w) + " " + (w.g && w.g.fr || "")).indexOf(s) >= 0; }).slice(0, 60);
      var ph = (C.phrases || []).filter(function (p) { return norm(p.t + " " + gl(p.g)).indexOf(s) >= 0; }).slice(0, 20);
      var gr = (C.grammar || []).filter(function (g) { return norm(gl(g.title) + " " + gl(g.body).replace(/<[^>]+>/g, " ")).indexOf(s) >= 0; }).slice(0, 10);
      res.innerHTML = (w.length ? '<div class="vlist">' + w.map(vrow).join("") + "</div>" : "") +
        (ph.length ? '<div class="sect"><div class="secttit">' + esc(T("mod_phrases")) + "</div>" + ph.map(function (p) { return '<div class="prow">' + snd(p.t) + '<div style="flex:1">' + tgt(p.t) + '<div class="g">' + esc(gl(p.g)) + "</div></div>" + lvBadge(p.level) + "</div>"; }).join("") + "</div>" : "") +
        (gr.length ? '<div class="sect"><div class="secttit">' + esc(T("mod_grammaire")) + "</div>" + gr.map(function (g) { return grammarCard(g); }).join("") + "</div>" : "") ||
        '<p class="muted with-masc">' + masc("question", 56, "masc-inline") + esc(T("no_results")) + "</p>";
    };
    q.addEventListener("input", run);
    var paintCustom = function () { document.getElementById("cwlist").innerHTML = allWords().filter(function (w) { return w.custom; }).map(vrow).join(""); };
    document.getElementById("cw_add").addEventListener("click", function () {
      var cap = locked("premium:custom-words") ? 20 : Infinity;
      if ((P.custom || []).length >= cap) { toast(T("feat_custom-words") + " — " + T("premium_only"), "peek"); return; }
      var t = document.getElementById("cw_t").value.trim(), g = document.getElementById("cw_g").value.trim();
      if (!t || !g) { toast(T("word_required")); return; }
      P.custom.push({ t: t, r: document.getElementById("cw_r").value.trim(), g: g, level: document.getElementById("cw_l").value });
      _widx = null; save(); render();
    });
    app.addEventListener("click", function (e) { var r = e.target.closest(".vrow"); if (r && !e.target.closest("button")) r.classList.toggle("open"); });
    paintCustom();
  }

  // ------------------------------------------------------------------ profile / settings
  PAGES.profil = function () {
    var voices = TTS.voicesFor();
    var html = '<h1 class="ttl">' + esc(T("mod_profil")) + '</h1><p class="sub">' + esc(T("profile_sub")) + "</p>" +
      '<div class="box row"><div><b>' + esc(ME.name || T("learner")) + '</b><div class="muted small">' + esc(T("base_lang")) + " : " + esc(langName(BASE)) + " → " + esc(langName(LANG)) + '</div></div><span class="spacer"></span><button type="button" class="btn2" data-go="/profile">✏️ ' + esc(T("change")) + "</button></div>" +
      '<div class="box"><h3>🔊 ' + esc(T("audio")) + '</h3><div class="row" style="margin-bottom:var(--ig27-space-2)"><label for="rate">' + esc(T("speech_rate")) + '</label><input type="range" id="rate" min="0.5" max="1.3" step="0.1" value="' + P.settings.rate + '"><span id="rateV">' + P.settings.rate + "×</span>" + snd(C.words[0] ? C.words[0].t : C.name, true) + "</div>" +
      '<div class="row"><label for="voice">' + esc(T("voice")) + '</label><select class="sel" id="voice"><option value="">' + esc(T("auto")) + "</option>" + voices.map(function (v) { return "<option" + (v.name === P.settings.voice ? " selected" : "") + ">" + esc(v.name) + "</option>"; }).join("") + "</select></div>" +
      (voices.length ? "" : '<p class="muted small">' + esc(T("tts_no_voice", { lang: C.name })) + "</p>") + "</div>" +
      '<div class="box"><h3>⚙️ ' + esc(T("settings")) + "</h3>" +
      toggleRow("rom", T("show_rom")) + toggleRow("autoplay", T("autoplay")) +
      '<div class="row"><label for="goal">' + esc(T("daily_goal")) + '</label><select class="sel" id="goal">' + [10, 30, 50, 100].map(function (n) { return "<option" + (P.settings.goal === n ? " selected" : "") + ' value="' + n + '">' + n + " XP</option>"; }).join("") + "</select></div></div>" +
      '<div class="box"><h3>★ ' + esc(T("premium_tools")) + '</h3><div class="row">' +
      '<button type="button" class="btn2" id="offline">📴 ' + esc(T("feat_offline")) + (locked("premium:offline") ? " 🔒" : "") + "</button>" +
      '<button type="button" class="btn2" id="export">⬇️ ' + esc(T("feat_export")) + (locked("premium:export") ? " 🔒" : "") + "</button>" +
      '</div><p class="muted small" id="offState" style="margin-top:var(--ig27-space-2)"></p></div>' +
      '<div class="box"><h3>🗑️ ' + esc(T("danger")) + '</h3><button type="button" class="btn2 ko" id="reset">' + esc(T("reset_progress")) + "</button></div>";
    return shell("mod_profil", html);
  };
  function toggleRow(k, label) { return '<label class="row" style="margin-bottom:var(--ig27-space-2)"><input type="checkbox" data-set="' + k + '"' + (P.settings[k] !== false ? " checked" : "") + "> " + esc(label) + "</label>"; }
  function bindProfil() {
    var rate = document.getElementById("rate");
    rate.addEventListener("input", function () { P.settings.rate = +rate.value; document.getElementById("rateV").textContent = rate.value + "×"; save(); });
    document.getElementById("voice").addEventListener("change", function (e) { P.settings.voice = e.target.value; TTS.pick(); save(); });
    document.getElementById("goal").addEventListener("change", function (e) { P.settings.goal = +e.target.value; save(); });
    app.querySelectorAll("[data-set]").forEach(function (c) { c.addEventListener("change", function () { P.settings[c.getAttribute("data-set")] = c.checked; save(); }); });
    document.getElementById("reset").addEventListener("click", function () { if (confirm(T("reset_confirm"))) { var s = P.settings; P = newProgress(); P.settings = s; save(); render(); } });
    document.getElementById("export").addEventListener("click", function () {
      if (locked("premium:export")) { toast(T("premium_only"), "peek"); return; }
      var rows = [["word", "romanization", "translation", "level", "theme", "correct", "wrong", "srs_box", "known"]];
      allWords().forEach(function (w) { var s = P.words[w.id] || {}, r = P.srs[w.id] || {}; rows.push([w.t, w.r || "", wg(w), w.level, w.theme, s.ok || 0, s.ko || 0, r.box || "", known(w) ? 1 : 0]); });
      var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })); a.download = "progression-" + LANG + ".csv"; body.appendChild(a); a.click(); a.remove();
    });
    var offState = document.getElementById("offState");
    var swNav = TOP.navigator;
    if (swNav && swNav.serviceWorker && swNav.serviceWorker.controller) offState.textContent = T("offline_on");
    document.getElementById("offline").addEventListener("click", function () {
      if (locked("premium:offline")) { toast(T("premium_only"), "peek"); return; }
      if (!swNav || !swNav.serviceWorker) { offState.textContent = T("offline_unsupported"); return; }
      offState.textContent = T("offline_preparing");
      swNav.serviceWorker.register("/sw.js").then(function (reg) {
        return swNav.serviceWorker.ready.then(function (r) {
          r.active.postMessage({ type: "precache", urls: ["/", "/api/course/" + LANG, "/course/engine.js", "/course/engine.css", "/course/i18n.js", "/design-system/ios27-liquid-glass.css", "/design-system/ios27-app.css"] });
          try { TOP.localStorage.setItem("offline_enabled", "1"); } catch (e) {}
          offState.textContent = T("offline_on");
        });
      }).catch(function () { offState.textContent = T("offline_unsupported"); });
    });
  }

  // ------------------------------------------------------------------ render
  var BINDERS = {
    vocabulaire: bindVocab, phrases: bindPhrases, grammaire: bindGrammar, conjugaison: bindConj, alphabet: bindAlphabet,
    lecture: bindLecture, ecoute: bindEcoute, exercices: bindExercices, revision: bindRevision, prononciation: bindPron,
    culture: function () { decorateTargetText(app); }, dictionnaire: bindDict, profil: bindProfil,
    examen: function () { app.querySelectorAll("[data-exam]").forEach(function (b) { b.addEventListener("click", function () { examFlow(b.getAttribute("data-exam")); }); }); },
    certificat: function () {
      app.querySelectorAll("[data-cert]").forEach(function (b) { b.addEventListener("click", function () { app.querySelectorAll("[data-cert]").forEach(function (x) { x.classList.toggle("on", x === b); }); paintCert(b.getAttribute("data-cert")); }); });
      var pb = document.getElementById("printCert"); if (pb) pb.addEventListener("click", function () { window.print(); });
    },
  };
  function render() {
    // fresh #app (drops listeners bound by the previous page)
    var fresh = app.cloneNode(false); app.parentNode.replaceChild(fresh, app); app = fresh;
    QUIZ = null;
    var L = levelOf(PAGE), fn = L ? function () { return PAGES.level(L); } : PAGES[PAGE];
    var mod = MODULES.filter(function (m) { return m.id === PAGE; })[0];
    if (!fn || (mod && !available(mod))) { PAGE = "hub"; fn = PAGES.hub; }
    document.title = T(L ? "mod_levels" : "mod_" + PAGE) + " · " + langName(LANG);
    app.innerHTML = fn();
    if (L) bindLevel(L); else if (BINDERS[PAGE]) BINDERS[PAGE]();
    var fresh2 = checkBadges(); if (fresh2.length && !locked("premium:badges")) { save(); toast(fresh2[0].ic + " " + T("badge_new", { name: T("badge_" + fresh2[0].id) }), "cool"); }
    var goal = P.settings.goal || 30, d = dayRec();
    if (d.xp >= goal && !d.goalShown) { d.goalShown = true; save(); toast("🎯 " + T("goal_reached", { n: goal }), "celebrate"); }
  }

  // ------------------------------------------------------------------ boot
  function boot() {
    app.innerHTML = '<div class="eng-loading"><div class="spin"></div>…</div>';
    var cache = null;
    try { cache = TOP.__COURSE_CACHE && TOP.__COURSE_CACHE[LANG]; } catch (e) {}
    var courseP = cache ? Promise.resolve(cache) : fetch("/api/course/" + LANG, { credentials: "same-origin" }).then(function (r) {
      if (r.status === 401) { goTop("/"); throw new Error("auth"); }
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "HTTP " + r.status); return j; });
    }).then(function (j) { try { (TOP.__COURSE_CACHE = TOP.__COURSE_CACHE || {})[LANG] = j; } catch (e) {} return j; });
    courseP.then(function (j) {
      C = j.course; ACCESS = j.access; ME = j.me;
      if (j.brand) BRAND = j.brand;
      BASE = String(ME.baseLang || "fr"); UI = (window.I18N && window.I18N.resolve(BASE)) || "fr";
      document.documentElement.lang = BASE;
      if (window.I18N && window.I18N.rtl(BASE)) document.documentElement.dir = "rtl";
      if (C.font) body.style.setProperty("--tfont", C.font);
      if (C.dir === "rtl") body.classList.add("rtl-target");
      PKEY = "course_" + ME.id + "_" + LANG;
      var mem = null; try { mem = TOP.__COURSE_PROGRESS && TOP.__COURSE_PROGRESS[LANG]; } catch (e) {}
      var local = mem || loadLocal();
      var serverP = mem ? Promise.resolve(null) : fetch("/api/progress/" + LANG).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
      var i18nP = window.I18N ? window.I18N.load(UI).then(function (code) { UI = code; }) : Promise.resolve();
      return Promise.all([serverP, i18nP]).then(function (res) { var srv = res[0];
        var remote = srv && srv.data;
        P = mergeProgress(remote && (!local || (remote.updatedAt || 0) > (local.updatedAt || 0)) ? remote : local || newProgress());
        try { (TOP.__COURSE_PROGRESS = TOP.__COURSE_PROGRESS || {})[LANG] = P; } catch (e) {}
        TTS.pick();
        render();
      });
    }).catch(function (err) {
      if (err && err.message === "auth") return;
      app.innerHTML = '<div class="eng-error"><div style="font-size:40px">⚠️</div><p>' + esc((window.I18N && window.I18N.t("fr", "load_error")) || "Erreur") + '</p><p class="muted small">' + esc(err && err.message) + '</p><button type="button" class="bpr" id="engReload">↻</button></div>';
      document.getElementById("engReload").addEventListener("click", function () { location.reload(); });
    });
  }
  // The app shell can ask an already-open page to jump somewhere (e.g. a level preset).
  window.addEventListener("message", function (e) {
    if (e.source !== window.parent) return;
    if (e.data && e.data.presetMode) { PENDING_MODE = e.data.presetMode; }
  });
  boot();
})();
