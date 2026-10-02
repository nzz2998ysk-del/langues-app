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
  // ---- Pap’pote mascot: one expression per situation (files in
  // /design-system/brand/mascotte/, cut by scripts/brand/process-brand.py).
  // Mistakes always get a thinking/curious face, never a sad or mocking one.
  // Without the files, the previous emoji are kept.
  var BRAND = { logo: false, mascot: [] };
  function hasMood(m) { return BRAND.mascot && BRAND.mascot.indexOf(m) >= 0; }
  function masc(mood, size, cls) {
    if (!hasMood(mood)) return "";
    // AVIF/WebP at 128px or full size depending on the displayed size and the
    // screen density; PNG for old browsers. Small decorative ones load lazily.
    var base = "/design-system/brand/mascotte/mascotte-" + mood, set = function (ext) { return base + "-128." + ext + " 128w, " + base + "." + ext + " 290w"; };
    var eager = /masc-hero|masc-big|masc-fb|mt-face/.test(cls || "");
    return '<picture><source type="image/avif" srcset="' + set("avif") + '" sizes="' + size + 'px"><source type="image/webp" srcset="' + set("webp") + '" sizes="' + size + 'px">' +
      '<img class="masc ' + (cls || "") + '" src="' + base + '.png" alt="" width="' + size + '" height="' + size + '"' + (eager ? "" : ' loading="lazy"') + ' decoding="async"></picture>';
  }
  // Big illustration for end screens: mascot if available, else the emoji.
  function mascOr(mood, emoji, size) { return masc(mood, size || 132, "masc-big") || emoji; }
  function pickMood(list) { var ok = list.filter(hasMood); return ok.length ? ok[Math.floor(Math.random() * ok.length)] : list[0]; }
  // "Pap’pote is typing": 2-3 expressions that take turns + a bubble with dots.
  function mascTyping(label, moods) {
    moods = (moods || ["thinking", "curious", "wink"]).filter(hasMood);
    var dots = '<span class="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>';
    if (!moods.length) return '<span class="masc-typing" role="status">' + dots + (label ? '<span class="small">' + esc(label) + "</span>" : "") + "</span>";
    return '<span class="masc-typing" role="status"><span class="mt-faces n' + moods.length + '">' + moods.map(function (m) { return masc(m, 44, "mt-face"); }).join("") + "</span>" + dots + (label ? '<span class="small">' + esc(label) + "</span>" : "") + "</span>";
  }
  function emptyMsg() { return '<p class="muted with-masc">' + masc(pickMood(["thinking", "sad"]), 56, "masc-inline") + esc(T("no_results")) + "</p>"; }

  // A mascot picture that cannot load is removed rather than shown as a
  // broken-image icon (the text around it always stands on its own).
  document.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.tagName === "IMG" && t.classList.contains("masc")) {
      var box = t.closest(".mt-faces"); if (box) box.remove(); else t.remove();
    }
  }, true);
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
  var AUDIO = {}; // text → id of its pre-generated audio file
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
    // Pre-generated neural voice (same everywhere, works offline once heard);
    // the device's voice is the fallback for texts or languages without a file.
    file: null,
    playFile: function (id, btn, onend) {
      var self = this;
      try { speechSynthesis.cancel(); } catch (e) {}
      if (this.file) { this.file.pause(); this.file = null; }
      var a = new Audio("/course/audio/" + LANG + "/" + id + ".mp3");
      a.preservesPitch = true;
      a.playbackRate = Math.max(0.6, Math.min(1.4, ((P && P.settings.rate) || 0.9) / 0.9));
      var pill = document.getElementById("speakPill");
      document.querySelectorAll(".speaking").forEach(function (e) { e.classList.remove("speaking"); });
      if (btn) btn.classList.add("speaking");
      if (pill) pill.classList.add("on");
      var done = function () { if (btn) btn.classList.remove("speaking"); if (pill) pill.classList.remove("on"); if (self.file === a) self.file = null; if (onend) onend(); };
      a.onended = done;
      a.onerror = function () { done(); self.speakDevice(a._text, btn, onend); };
      a._text = this._last;
      this.file = a;
      var p = a.play();
      if (p && p.catch) p.catch(function () { done(); });
    },
    speak: function (text, btn, onend) {
      if (!text) return;
      this._last = text;
      var id = AUDIO[text];
      if (id && !(P && P.settings.voiceSource === "device")) { this.playFile(id, btn, onend); return; }
      this.speakDevice(text, btn, onend);
    },
    speakDevice: function (text, btn, onend) {
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
    { id: "conversation", ic: "🤖" },
    { id: "culture", ic: "🌍", need: function () { return C.culture && C.culture.length; } },
    { id: "examen", ic: "🎓", premium: "premium:exam" },
    { id: "amis", ic: "🏆" },
    { id: "stats", ic: "📊" },
    { id: "badges", ic: "🏅", premium: "premium:badges" },
    { id: "certificat", ic: "📜", premium: "premium:certificates" },
    { id: "dictionnaire", ic: "🔎" },
    { id: "profil", ic: "👤" },
  ];
  function available(m) { return !m.need || m.need(); }
  function nav(page) {
    // Same page (e.g. "Back" at the end of a review, a lesson or a quiz): the
    // app frame would ignore a request for the page it already shows, so
    // re-render here and leave any in-page sub-screen.
    if (page === PAGE) { render(); try { window.scrollTo(0, 0); } catch (e) {} return; }
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
      (ACCESS.ultra ? '<span class="premium-chip ultra-chip">✦ Ultra</span>' : ACCESS.premium ? '<span class="premium-chip">★ Premium</span>' : '<button type="button" class="profbadge" data-go="/subscribe" aria-label="' + esc(T("go_premium")) + '">★<span class="pb-tx"> ' + esc(T("go_premium")) + "</span></button>") +
      '<button type="button" class="navtoggle" id="themeBtn" aria-label="' + esc(T("theme_toggle")) + '">' + (document.documentElement.getAttribute("data-theme") === "dark" ? "☀️" : "🌙") + "</button>" +
      '<button type="button" class="navtoggle" id="navToggle" aria-expanded="false" aria-controls="navMenu" aria-label="' + esc(T("modules")) + '"><span class="nt-ic" aria-hidden="true">☰</span><span class="nt-tx"> ' + esc(T("modules")) + "</span></button>" +
      "</div></header>" +
      '<nav class="navmenu" id="navMenu">' + menu + "</nav>" +
      (opts.hero || "") +
      '<main class="con">' + inner + "</main>" +
      '<div class="speaking-pill" id="speakPill" role="status"><div class="wave" aria-hidden="true"><span></span><span></span><span></span></div><span class="sp-tx">' + esc(T("speaking")) + "</span></div>";
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
    if (e.target.closest("#navToggle")) {
      var m = document.getElementById("navMenu"), tg = e.target.closest("#navToggle");
      m.classList.toggle("on"); tg.setAttribute("aria-expanded", m.classList.contains("on"));
      tg.querySelector(".nt-ic").textContent = m.classList.contains("on") ? "✕" : "☰";
      if (m.classList.contains("on")) { var first = m.querySelector("button.on") || m.querySelector("button"); if (first) first.focus({ preventScroll: true }); }
    }
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

  // Anonymous usage counters (aggregated per day on the server, no user id
  // stored) and error reports, both fire-and-forget.
  function track(ev) {
    try { fetch("/api/track", { method: "POST", credentials: "same-origin", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: ev, lang: LANG }) }).catch(function () {}); } catch (e) {}
  }
  var ERR_SENT = 0;
  function reportError(msg, stack) {
    if (ERR_SENT++ > 5) return;
    try { fetch("/api/client-error", { method: "POST", credentials: "same-origin", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: String(msg || "").slice(0, 300), stack: String(stack || "").slice(0, 2000), url: "/course/" + LANG + "/" + PAGE }) }).catch(function () {}); } catch (e) {}
  }
  window.addEventListener("error", function (e) { if (e && e.message) reportError(e.message, e.error && e.error.stack); });
  window.addEventListener("unhandledrejection", function (e) { var r = e && e.reason; reportError("unhandledrejection: " + (r && r.message || r), r && r.stack); });
  // ================================================================== PAGES
  var PAGES = {};

  // ------------------------------------------------------------------ hub
  PAGES.hub = function () {
    var words = allWords(), knownN = words.filter(known).length;
    var acc = P.answers.total ? Math.round(100 * P.answers.ok / P.answers.total) : 0;
    var wotd = C.words.length ? C.words[(new Date().getDate() * 37 + new Date().getMonth() * 11) % C.words.length] : null;
    var due = dueWords().length;
    var hero = '<section class="hero"><div class="hero-watermark" aria-hidden="true">' + esc(C.watermark || C.flag) + "</div>" +
      heroMascot() +
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
    var html = guidedCards();
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
    return '<div class="premium-card"><h2>★ ' + esc(T("premium_title")) + "</h2><p class=\"muted\">" + esc(T("premium_sub")) + '</p><ul class="premium-list">' +
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
    el.innerHTML = list.slice(0, VS.shown).map(vrow).join("") || emptyMsg();
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
        if (l && C.locked && C.locked.levels.indexOf(l) >= 0) { toast(T("feat_levels-c") + " — " + T("premium_only"), "cool"); return; }
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
    }).join("") || emptyMsg();
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
      emptyMsg();
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
      '<div class="row" style="margin-bottom:var(--ig27-space-4)"><select class="sel" id="cverb" aria-label="' + esc(T("mod_conjugaison")) + '">' + verbs + '</select><button type="button" class="btn2" id="conjPractice">✏️ ' + esc(T("practice")) + "</button></div>" +
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
    var paint = function () { cur = readingList(RS); document.getElementById("rlist").innerHTML = cur.map(function (r, i) { return readingCard(r, i); }).join("") || emptyMsg(); };
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
      '<div class="filters">' + levelPills(XS.levels, null, true) + '<div class="row"><select class="sel" id="xtheme" aria-label="' + esc(T("theme")) + '"><option value="">' + esc(T("all_themes")) + "</option>" +
      Object.keys(themes).map(function (t) { return '<option value="' + esc(t) + '">' + esc(themeLabel(t)) + "</option>"; }).join("") + '</select><select class="sel" id="xn" aria-label="' + esc(T("n_questions", { n: "" }).trim()) + '">' +
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
  // Adaptive progress bar (quizzes, lessons, placement, daily lesson): shows
  // step / total and percentage, exposes role=progressbar, and animates from
  // the previous value (see animateBars) instead of jumping.
  var LASTPCT = 0;
  function progressBar(step, total, pct, kindKey) {
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    var from = LASTPCT; LASTPCT = pct;
    var text = T("progress_text", { i: step, n: total, pct: pct, kind: T(kindKey || "progress_question") });
    return '<div class="pbar" role="progressbar" aria-label="' + esc(T("progress")) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-valuetext="' + esc(text) + '">' +
      '<div class="pbar-track duo-progress-track"><div class="pbar-fill duo-progress-fill" style="width:' + from + '%" data-to="' + pct + '"></div></div>' +
      '<span class="pbar-label" aria-hidden="true"><b>' + step + "</b>/" + total + ' <span class="pbar-pct">· ' + pct + "%</span></span></div>";
  }
  function animateBars() {
    var bars = app.querySelectorAll("[data-to]");
    if (!bars.length) return;
    requestAnimationFrame(function () { requestAnimationFrame(function () { bars.forEach(function (b) { b.style.width = b.getAttribute("data-to") + "%"; b.removeAttribute("data-to"); }); }); });
  }
  function quizShell(inner) {
    var n = QUIZ ? QUIZ.qs.length : 0, i = QUIZ ? QUIZ.i : 0, pct = n ? 100 * i / n : 0;
    if (QUIZ && i === 0 && !QUIZ.ok && !QUIZ.ko) LASTPCT = 0;
    return '<header class="duo-bar"><button type="button" class="btn2 qz-quit" id="quitQuiz" aria-label="' + esc(T("quit")) + '">✕</button>' + progressBar(Math.min(i + 1, n), n, pct) +
      (QUIZ.hearts ? '<div class="duo-hearts">' + "❤️".repeat(Math.max(0, QUIZ.hearts)) + "</div>" : "") + '<div class="duo-xp">+' + QUIZ.xp + " XP</div></header>" +
      '<main class="con"><h1 class="sr-only">' + esc(T("mod_exercices")) + "</h1>" + inner + "</main>" + '<div class="speaking-pill" id="speakPill" role="status"><div class="wave" aria-hidden="true"><span></span><span></span><span></span></div><span class="sp-tx">' + esc(T("speaking")) + "</span></div>";
  }
  function paintQuiz() {
    if (QUIZ.i >= QUIZ.qs.length || (QUIZ.opts.hearts && QUIZ.hearts <= 0)) return finishQuiz();
    var q = QUIZ.qs[QUIZ.i], h = '<div class="quiz-card"><div class="qz-prompt"><div class="quiz-kind">' + esc(T("mode_" + q.mode)) + " · " + (QUIZ.i + 1) + "/" + QUIZ.qs.length + "</div>";
    if (q.mode === "listen" || q.mode === "dictation") h += '<div class="quiz-q"><button type="button" class="bpr" data-say="' + esc(q.audio) + '">🔊 ' + esc(T("listen")) + "</button></div>";
    else if (q.cloze) h += '<div class="quiz-q">' + tgt(q.prompt) + snd(q.audio) + "</div>";
    else if (q.mode === "mcq") h += '<div class="quiz-q">' + tgt(q.prompt) + snd(q.audio) + "</div>" + (q.rom && P.settings.rom !== false ? '<div class="quiz-sub">' + esc(q.rom) + "</div>" : "");
    else h += '<div class="quiz-q">' + esc(q.prompt) + "</div>";
    if (q.sub) h += '<div class="quiz-sub">' + esc(q.sub) + "</div>"; else h += '<div class="quiz-sub"></div>';
    h += '</div><div class="qz-answer">';
    if (q.opts) h += '<div class="quiz-opts">' + q.opts.map(function (o, i) { return '<button type="button" class="quiz-opt' + (q.optsT ? " t" : "") + '" data-opt="' + i + '"><kbd class="qz-key" aria-hidden="true">' + (i + 1) + "</kbd>" + esc(o) + "</button>"; }).join("") + "</div>";
    else if (q.typed) h += '<input class="answer-input" id="ans" autocomplete="off" autocapitalize="off" spellcheck="false"' + (C.dir === "rtl" ? ' dir="rtl"' : "") + ">" + keyboard() + '<button type="button" class="bpr wide" id="check">' + esc(T("check")) + "</button>";
    else if (q.order) h += '<div class="order-answer" id="oans"></div><div class="order-bank">' + shuffle(q.order.map(function (w, i) { return { w: w, i: i }; })).map(function (o) { return '<button type="button" class="order-chip" data-oi="' + o.i + '">' + esc(o.w) + "</button>"; }).join("") + '</div><div class="row" style="justify-content:center;margin-top:var(--ig27-space-4)"><button type="button" class="btn2" id="oreset">↺ ' + esc(T("reset")) + '</button><button type="button" class="bpr" id="check">' + esc(T("check")) + "</button></div>";
    h += '<div id="fb" aria-live="polite"></div></div></div>';
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
      var fbMood = ok ? pickMood(["happy", "heart", "laughing"]) : pickMood(["thinking", "curious"]);
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
    if (!Q.opts.onDone) track("quiz_done");
    var errs = Q.errors.length && !modLocked("feedback-avance") ? '<div class="box" style="text-align:left;margin-top:var(--ig27-space-5)"><h2>' + esc(T("review_errors")) + "</h2>" + Q.errors.map(function (e) {
      return '<div class="exline" style="margin-top:var(--ig27-space-2)">' + snd(e.q.audio || e.q.answer, true) + "<div><b>" + esc(e.q.prompt || e.q.audio) + "</b> → " + tgt(e.q.answer) + (e.given ? ' <span class="muted">(' + esc(T("you_said")) + " : " + esc(e.given) + ")</span>" : "") + "</div></div>";
    }).join("") + "</div>" : "";
    var endMood = pct === 100 ? "heart" : pct >= 80 ? "excited" : pct >= 50 ? "happy" : "thinking";
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
    var paint = function () { cur = readingList(ES); document.getElementById("elist").innerHTML = cur.map(function (r, i) { return readingCard(r, i, true); }).join("") || emptyMsg(); };
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
      forecast = '<div class="box"><h2>📅 ' + esc(T("forecast")) + '</h2><div class="bars">' + days.map(function (n, i) { return '<div style="height:' + Math.round(100 * n / mx) + '%" data-tip="' + esc((i === 0 ? T("today") : "J+" + i) + " : " + n) + '"></div>'; }).join("") + "</div></div>";
    }
    var html = '<h1 class="ttl">' + esc(T("mod_revision")) + '</h1><p class="sub">' + esc(adv ? T("srs_adv_sub") : T("srs_free_sub", { n: 20 })) + "</p>" +
      '<div class="stat-grid">' + stat(due.length, T("due_now")) + stat(total, T("in_srs")) + stat(adv ? "∞" : left, T("left_today")) + "</div>" +
      (due.length && left ? '<button type="button" class="bpr wide" id="startRev">🧠 ' + esc(T("review_now")) + " (" + Math.min(due.length, left) + ")</button>" : '<div class="box with-masc">' + masc(!left ? "stretching" : "sleeping", 72, "masc-inline") + "<div>" + esc(!left ? T("srs_cap_reached") : T("nothing_due")) + "</div></div>") +
      '<div class="box row" style="margin-top:var(--ig27-space-4)"><span>' + esc(T("learn_new")) + '</span><span class="spacer"></span><select class="sel" id="newLv" aria-label="' + esc(T("learn_new")) + '">' + LEVELS.filter(function (l) { return !(C.locked && C.locked.levels.indexOf(l) >= 0); }).map(function (l) { return "<option>" + l + "</option>"; }).join("") + '</select><button type="button" class="btn2" id="addNew">+ 10</button></div>' +
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
      if (i >= cards.length) { track("review_done"); app.innerHTML = shell("mod_revision", '<div class="complete"><div class="big">' + mascOr("heart", "🎉") + '</div><h2>' + esc(T("review_done")) + '</h2><button type="button" class="bpr" data-nav="revision">' + esc(T("back")) + "</button></div>"); return; }
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
      (!SR ? '<div class="box">🎧 ' + esc(T("sr_fallback")) + "</div>" : "") +
      (!canRecord() ? '<div class="box">' + esc(T("rec_unsupported")) + "</div>" : "") +
      (!ai ? '<div class="box row">🔒 ' + esc(T("feat_pronunciation-ai")) + '<span class="spacer"></span><button type="button" class="bpr" data-go="/subscribe">★ ' + esc(T("go_premium")) + "</button></div>" : "") +
      '<div class="filters">' + levelPills(PR.levels, null, true) + '</div><div id="prlist"></div>';
    return shell("mod_prononciation", html);
  };
  // Record & compare: works in every browser with a microphone (MediaRecorder),
  // including those without speech recognition (Firefox...). The learner hears
  // the model and their own voice, sees both waveforms and grades themselves.
  function canRecord() { return !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  var REC = null;
  function recMime() {
    var c = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    for (var i = 0; i < c.length; i++) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c[i])) return c[i];
    return "";
  }
  function envelope(buf, n) {
    var d = buf.getChannelData(0), out = [], step = Math.max(1, Math.floor(d.length / n));
    for (var i = 0; i < n; i++) { var m = 0; for (var k = i * step, e = Math.min(d.length, k + step); k < e; k++) { var v = Math.abs(d[k]); if (v > m) m = v; } out.push(m); }
    var a = 0, b = out.length - 1, thr = Math.max.apply(null, out) * 0.08;
    while (a < b && out[a] < thr) a++; while (b > a && out[b] < thr) b--;
    out = out.slice(Math.max(0, a - 2), b + 3); var mx = Math.max.apply(null, out) || 1;
    return out.map(function (v) { return v / mx; });
  }
  function drawWaves(canvas, model, mine) {
    var ctx = canvas.getContext("2d"), W = canvas.width, H = canvas.height, cs = getComputedStyle(canvas);
    ctx.clearRect(0, 0, W, H);
    [[model, cs.getPropertyValue("--wave-model") || "#8e8e93", -1], [mine, cs.getPropertyValue("--wave-me") || "#0088ff", 1]].forEach(function (s) {
      if (!s[0] || !s[0].length) return;
      ctx.fillStyle = s[1].trim(); var n = s[0].length, bw = W / n;
      s[0].forEach(function (v, i) { var h = Math.max(1, v * (H / 2 - 4)); ctx.fillRect(i * bw, s[2] < 0 ? H / 2 - h : H / 2, Math.max(1, bw - 1), h); });
    });
  }
  function decodeBlob(blob) {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return Promise.resolve(null);
    var ac = new AC();
    return blob.arrayBuffer().then(function (ab) { return new Promise(function (ok, ko) { ac.decodeAudioData(ab, ok, ko); }); }).then(function (b) { ac.close && ac.close(); return b; }).catch(function () { return null; });
  }
  function recordCompare(btn, x, box) {
    if (REC && REC.state === "recording") { REC.stop(); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var chunks = [], mime = recMime(), mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      REC = mr; btn.classList.add("recording"); track("pron_compare"); btn.textContent = "⏹ " + T("rec_stop");
      var timer = setTimeout(function () { if (mr.state === "recording") mr.stop(); }, 7000);
      mr.ondataavailable = function (ev) { if (ev.data && ev.data.size) chunks.push(ev.data); };
      mr.onstop = function () {
        clearTimeout(timer); stream.getTracks().forEach(function (t) { t.stop(); }); REC = null;
        btn.classList.remove("recording"); btn.textContent = "🎤 " + T("rec_compare");
        var blob = new Blob(chunks, { type: mr.mimeType || mime || "audio/webm" }), url = URL.createObjectURL(blob);
        box.hidden = false;
        box.innerHTML = '<div class="row" style="gap:var(--ig27-space-2);flex-wrap:wrap">' + '<button type="button" class="btn2 small" data-say="' + esc(x.t) + '">🔊 ' + esc(T("rec_model")) + "</button>" +
          '<button type="button" class="btn2 small" data-mine>▶︎ ' + esc(T("rec_me")) + '</button></div><canvas class="pr-wave" width="600" height="90" aria-hidden="true"></canvas>' +
          '<div class="small muted pr-legend"><span class="lg-model">■ ' + esc(T("rec_model")) + '</span> <span class="lg-me">■ ' + esc(T("rec_me")) + "</span></div>" +
          '<div class="row" style="gap:var(--ig27-space-2);margin-top:var(--ig27-space-2)"><span class="small">' + esc(T("rec_self")) + '</span><button type="button" class="btn2 small" data-self="1">👍 ' + esc(T("rec_good")) + '</button><button type="button" class="btn2 small" data-self="0">🔁 ' + esc(T("rec_again")) + "</button></div>";
        var me = new Audio(url);
        box.querySelector("[data-mine]").addEventListener("click", function () { me.currentTime = 0; me.play().catch(function () {}); });
        box.querySelectorAll("[data-self]").forEach(function (b) { b.addEventListener("click", function () {
          var good = b.getAttribute("data-self") === "1";
          record({ id: x.id, level: x.level, theme: x.theme || "_pron" }, good); addXp(good ? 3 : 1); save();
          box.querySelectorAll("[data-self]").forEach(function (z) { z.disabled = true; });
          toast(good ? T("pron_great") : T("pron_retry"), good ? "happy" : "thinking");
        }); });
        var canvas = box.querySelector("canvas"), aid = AUDIO[x.t];
        Promise.all([
          decodeBlob(blob),
          aid ? fetch("/course/audio/" + LANG + "/" + aid + ".mp3").then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) { return b ? decodeBlob(b) : null; }).catch(function () { return null; }) : Promise.resolve(null),
        ]).then(function (bufs) { drawWaves(canvas, bufs[1] ? envelope(bufs[1], 120) : null, bufs[0] ? envelope(bufs[0], 120) : null); });
        me.play().catch(function () {});
      };
      mr.start();
    }).catch(function () { toast(T("mic_denied"), "sad"); });
  }
  function bindPron() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, ai = !locked("premium:pronunciation-ai") && SR;
    var paint = function () {
      var items = (C.phrases || []).map(function (p) { return { t: p.t, r: p.r, g: p.g, level: p.level }; })
        .concat(C.words.map(function (w) { return { t: w.t, r: w.r, g: w.g, level: w.level, id: w.id, theme: w.theme }; }))
        .filter(function (x) { return !PR.levels.length || PR.levels.indexOf(x.level) >= 0; });
      items = items.slice(0, 60);
      document.getElementById("prlist").innerHTML = items.map(function (x, i) {
        return '<div class="prow">' + snd(x.t) + '<div style="flex:1">' + tgt(x.t) + (x.r ? '<div class="muted small">' + esc(x.r) + "</div>" : "") + '<div class="g">' + esc(gl(x.g)) + '</div><div class="small" id="prs' + i + '"></div></div>' +
          '<div class="pr-actions">' + (ai ? '<button type="button" class="btn2" data-rec="' + i + '">🎙️ ' + esc(T("record")) + "</button>" : "") +
          (canRecord() ? '<button type="button" class="btn2" data-cmp="' + i + '">🎤 ' + esc(T("rec_compare")) + "</button>" : "") + "</div>" + lvBadge(x.level) + '<div class="pr-cmp" id="prc' + i + '" hidden></div></div>';
      }).join("");
      paint.items = items;
    };
    bindLevelPills(PR, paint); paint();
    app.addEventListener("click", function (e) {
      var c = e.target.closest("[data-cmp]"); if (c) { var j = +c.getAttribute("data-cmp"); recordCompare(c, paint.items[j], document.getElementById("prc" + j)); }
    });
    if (!ai) return;
    app.addEventListener("click", function (e) {
      var b = e.target.closest("[data-rec]"); if (!b) return;
      var i = +b.getAttribute("data-rec"), x = paint.items[i], out = document.getElementById("prs" + i);
      var rec = new SR(); rec.lang = C.tts || LANG; rec.interimResults = false; rec.maxAlternatives = 3;
      b.disabled = true; out.innerHTML = mascTyping(T("listening"), ["curious", "thinking", "wink"]);
      rec.onresult = function (ev) {
        var best = 0, heard = "";
        for (var k = 0; k < ev.results[0].length; k++) { var alt = ev.results[0][k].transcript, sc = Math.max(similarity(alt, x.t), x.r ? similarity(alt, x.r) : 0); if (sc > best) { best = sc; heard = alt; } }
        var pct = Math.round(best * 100);
        out.innerHTML = masc(pct >= 85 ? "amazed" : pct >= 60 ? "happy" : "thinking", 48, "masc-inline") + '<b style="color:var(--ig27-' + (pct >= 85 ? "green" : pct >= 60 ? "orange" : "red") + ')">' + pct + "%</b> — " + esc(T("heard")) + " : « " + esc(heard) + " » " + esc(pct >= 85 ? T("pron_great") : pct >= 60 ? T("pron_ok") : T("pron_retry"));
        record({ id: x.id, level: x.level, theme: x.theme || "_pron" }, pct >= 70); addXp(pct >= 85 ? 5 : pct >= 60 ? 2 : 0); save();
      };
      rec.onerror = function (ev) { out.textContent = T("sr_error") + " (" + ev.error + ")"; };
      rec.onend = function () { b.disabled = false; };
      try { rec.start(); } catch (err) { out.textContent = T("sr_error"); b.disabled = false; }
    });
  }

  // ------------------------------------------------------------------ culture
  // ------------------------------------------------------------------ mascot outfits
  // Accessories unlocked with this language's XP, worn by Pap’pote on the home
  // screen (emoji overlays; HD outfits will need dedicated artwork).
  var OUTFITS = [
    { id: "none", ic: "", xp: 0 },
    { id: "scarf", ic: "🧣", xp: 50 },
    { id: "bow", ic: "🎀", xp: 150 },
    { id: "flower", ic: "🌸", xp: 300 },
    { id: "cap", ic: "🧢", xp: 600 },
    { id: "grad", ic: "🎓", xp: 1200 },
    { id: "crown", ic: "👑", xp: 2500 },
  ];
  function outfitOk(o) { return (P.xp || 0) >= o.xp; }
  function heroMascot() {
    var img = masc("wave", 104, "masc-hero-img"); if (!img) return "";
    var o = OUTFITS.filter(function (x) { return x.id === P.settings.outfit && outfitOk(x); })[0];
    return '<span class="masc-hero">' + img + (o && o.ic ? '<span class="outfit outfit-' + o.id + '" aria-hidden="true">' + o.ic + "</span>" : "") + "</span>";
  }
  function outfitPicker() {
    return '<div class="outfits" role="radiogroup" aria-label="' + esc(T("outfit_title")) + '">' + OUTFITS.map(function (o) {
      var ok = outfitOk(o), on = (P.settings.outfit || "none") === o.id;
      return '<button type="button" class="outfit-opt' + (on ? " on" : "") + '" role="radio" aria-checked="' + on + '" data-outfit="' + o.id + '"' + (ok ? "" : " disabled") + ' title="' + esc(ok ? T("outfit_" + o.id) : T("outfit_locked", { n: o.xp })) + '">' +
        '<span class="oi">' + (o.ic || "∅") + '</span><span class="small">' + esc(ok ? T("outfit_" + o.id) : "🔒 " + o.xp + " XP") + "</span></button>";
    }).join("") + "</div>";
  }

  // ------------------------------------------------------------------ friends & challenges
  PAGES.amis = function () {
    var html = '<h1 class="ttl">' + esc(T("mod_amis")) + '</h1><p class="sub">' + esc(T("friends_sub")) + "</p>" +
      '<div id="friendsBox">' + mascTyping(T("loading")) + "</div>";
    return shell("mod_amis", html);
  };
  function bindAmis() {
    var box = document.getElementById("friendsBox");
    var load = function () {
      fetch("/api/friends", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (d) {
        var medals = ["🥇", "🥈", "🥉"];
        var board = d.board.map(function (u, i) {
          return '<li class="lb-row' + (u.me ? " me" : "") + '"><span class="lb-rank">' + (medals[i] || i + 1) + '</span><span class="lb-name">' + esc(u.name) + (u.me ? " (" + esc(T("you")) + ")" : "") + '</span><b class="lb-xp">' + u.xp + " XP</b>" +
            (u.me ? "" : '<button type="button" class="btn2 small" data-unfriend="' + u.id + '" aria-label="' + esc(T("friend_remove")) + " " + esc(u.name) + '">✕</button>') + "</li>";
        }).join("");
        box.innerHTML =
          '<div class="box"><h2>🏁 ' + esc(T("week_challenge")) + '</h2><p class="muted small">' + esc(T("week_challenge_d")) + "</p>" +
          (d.board.length > 1 ? '<ol class="leaderboard">' + board + "</ol>" : '<div class="with-masc">' + masc("curious", 56, "masc-inline") + "<p>" + esc(T("no_friends")) + "</p></div>") + "</div>" +
          '<div class="grid cols-2" style="margin-top:var(--ig27-space-4)">' +
          '<div class="box"><h2>🎟️ ' + esc(T("my_code")) + '</h2><p class="friend-code" id="myCode">' + esc(d.code) + '</p><div class="row" style="gap:var(--ig27-space-2);flex-wrap:wrap"><button type="button" class="bpr" id="shareLink">🔗 ' + esc(T("invite_friend")) + '</button><button type="button" class="btn2" id="copyCode">📋 ' + esc(T("copy_code")) + "</button></div>" +
          '<p class="muted small" style="margin-top:var(--ig27-space-3)">🎁 ' + esc(T("referral_d", { n: d.referralDays })) + "</p>" +
          (d.invited ? '<p class="small">' + esc(T("referral_stats", { n: d.invited, r: d.rewarded })) + "</p>" : "") + "</div>" +
          '<form class="box" id="addFriend"><h2>➕ ' + esc(T("add_friend")) + '</h2><label class="small" for="friendCode">' + esc(T("friend_code_label")) + '</label><div class="row" style="gap:var(--ig27-space-2);margin-top:var(--ig27-space-2)"><input class="field" id="friendCode" maxlength="9" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD2345" style="flex:1;text-transform:uppercase"><button type="submit" class="bpr">' + esc(T("add")) + "</button></div></form></div>";
        var copy = function (text, okMsg) { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast(okMsg, "wink"); }).catch(function () { prompt(T("copy_code"), text); }); };
        document.getElementById("copyCode").addEventListener("click", function () { copy(d.code, T("copied")); });
        document.getElementById("shareLink").addEventListener("click", function () {
          var text = T("invite_text", { lang: langName(LANG) });
          if (navigator.share) navigator.share({ title: "Pap’pote", text: text, url: d.link }).catch(function () {});
          else copy(text + " " + d.link, T("link_copied"));
        });
        document.getElementById("addFriend").addEventListener("submit", function (e) {
          e.preventDefault();
          var code = document.getElementById("friendCode").value.trim();
          if (!code) { toast(T("friend_code_label"), "thinking"); document.getElementById("friendCode").focus(); return; }
          fetch("/api/friends", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code }) })
            .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
            .then(function (res) { if (res.ok) { toast(T("friend_added"), "excited"); load(); } else toast(res.j.error || T("chat_error"), "sad"); });
        });
        box.querySelectorAll("[data-unfriend]").forEach(function (b) { b.addEventListener("click", function () {
          if (!confirm(T("friend_remove_confirm"))) return;
          fetch("/api/friends/" + b.getAttribute("data-unfriend"), { method: "DELETE", credentials: "same-origin" }).then(load);
        }); });
      }).catch(function () { box.innerHTML = '<div class="box">' + esc(T("chat_error")) + "</div>"; });
    };
    load();
  }

  // ------------------------------------------------------------------ AI conversation
  // Chat with Pap’pote (an AI tutor) through the server proxy /api/chat; the
  // conversation stays in this tab (sessionStorage), never on the server.
  var SCENARIOS = ["free", "cafe", "travel", "intro", "shopping", "doctor", "job", "debate"];
  var CHAT = null;
  function chatKey() { return "papote-chat-" + LANG; }
  function chatLoad() {
    if (CHAT && CHAT.lang === LANG) return CHAT;
    try { CHAT = JSON.parse(sessionStorage.getItem(chatKey()) || "null"); } catch (e) { CHAT = null; }
    if (!CHAT || !Array.isArray(CHAT.msgs)) CHAT = { lang: LANG, scenario: "free", level: dailyLevel(), msgs: [] };
    return CHAT;
  }
  function chatSave() { try { sessionStorage.setItem(chatKey(), JSON.stringify(CHAT)); } catch (e) {} }
  PAGES.conversation = function () {
    var ch = chatLoad(), lv = LEVELS.filter(function (l) { return !(C.locked && C.locked.levels.indexOf(l) >= 0); });
    var html = '<h1 class="ttl">' + esc(T("mod_conversation")) + '</h1><p class="sub">' + esc(T("chat_sub")) + "</p>" +
      '<div id="chatStatus"></div>' +
      '<div class="filters chat-opts"><label class="small">' + esc(T("chat_scenario")) + ' <select class="sel" id="chatSc">' + SCENARIOS.map(function (k) { return '<option value="' + k + '"' + (ch.scenario === k ? " selected" : "") + ">" + esc(T("sc_" + k)) + "</option>"; }).join("") + "</select></label>" +
      '<label class="small">' + esc(T("chat_level")) + ' <select class="sel" id="chatLv">' + lv.map(function (l) { return "<option" + (ch.level === l ? " selected" : "") + ">" + l + "</option>"; }).join("") + "</select></label>" +
      '<button type="button" class="btn2" id="chatNew">↺ ' + esc(T("chat_new")) + "</button></div>" +
      '<div class="chat-log" id="chatLog" role="log" aria-live="polite"></div>' +
      '<form class="chat-in" id="chatForm"><textarea id="chatIn" rows="2" maxlength="500" aria-label="' + esc(T("chat_ph")) + '" placeholder="' + esc(T("chat_ph")) + '"' + (C.dir === "rtl" ? ' dir="rtl"' : "") + ' lang="' + esc(LANG) + '"></textarea>' +
      '<button type="submit" class="bpr" id="chatSend">' + esc(T("chat_send")) + "</button></form>" + correctorBox();
    return shell("mod_conversation", html);
  };
  function chatMsgHtml(m, i) {
    if (m.role === "user") {
      return '<div class="chat-row me"><div class="chat-bubble me"' + (C.dir === "rtl" ? ' dir="rtl"' : "") + ">" + esc(m.content) + "</div></div>" +
        (m.correction ? '<div class="chat-row me"><div class="chat-fix">✏️ ' + esc(m.correction) + "</div></div>" : "");
    }
    return '<div class="chat-row">' + masc(i % 3 ? "happy" : "wave", 40, "chat-av") + '<div class="chat-bubble"><div class="t"' + (C.dir === "rtl" ? ' dir="rtl"' : "") + ">" + esc(m.content) + "</div>" +
      (m.rom && P.settings.rom !== false ? '<div class="muted small">' + esc(m.rom) + "</div>" : "") +
      '<div class="chat-tools">' + snd(m.content, true) + (m.translation ? '<button type="button" class="btn2 small" data-tr="' + i + '">' + esc(T("chat_translate")) + "</button>" : "") + "</div>" +
      (m.translation ? '<div class="muted small chat-tr" id="tr' + i + '" hidden>' + esc(m.translation) + "</div>" : "") + "</div></div>";
  }
  // Ultra: AI correction of a whole text (letter, email, essay…).
  function correctorBox() {
    var lv = LEVELS.filter(function (l) { return !(C.locked && C.locked.levels.indexOf(l) >= 0); });
    var head = '<h2>✍️ ' + esc(T("corr_title")) + ' <span class="ultra-chip small">✦ Ultra</span></h2><p class="muted small">' + esc(T("corr_d")) + "</p>";
    if (!ACCESS.ultra) return '<div class="box corr-box">' + head + '<button type="button" class="bpr" data-go="/subscribe">✦ ' + esc(T("corr_go")) + "</button></div>";
    return '<div class="box corr-box">' + head + '<form id="corrForm"><textarea id="corrIn" rows="6" maxlength="1500" lang="' + esc(LANG) + '"' + (C.dir === "rtl" ? ' dir="rtl"' : "") + ' aria-label="' + esc(T("corr_ph")) + '" placeholder="' + esc(T("corr_ph")) + '"></textarea>' +
      '<div class="row" style="margin-top:var(--ig27-space-2)"><label class="small">' + esc(T("chat_level")) + ' <select class="sel" id="corrLv">' + lv.map(function (l) { return "<option" + ((P.placement && P.placement.level === l) ? " selected" : "") + ">" + l + "</option>"; }).join("") + '</select></label><button type="submit" class="bpr" id="corrGo">' + esc(T("corr_btn")) + "</button></div></form>" +
      '<div id="corrOut" aria-live="polite"></div></div>';
  }
  function bindCorrector() {
    var f = document.getElementById("corrForm"); if (!f) return;
    var out = document.getElementById("corrOut"), go = document.getElementById("corrGo"), inp = document.getElementById("corrIn");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = inp.value.trim(); if (text.length < 3) { inp.focus(); return; }
      go.disabled = true; out.innerHTML = '<div class="chat-row">' + mascTyping(T("corr_wait")) + "</div>";
      fetch("/api/correct", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: LANG, level: document.getElementById("corrLv").value, text: text }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          go.disabled = false;
          if (!x.ok) { out.innerHTML = '<p class="msg">' + esc(x.j.error === "quota" ? T("chat_quota") : x.j.error || T("save_error")) + "</p>"; return; }
          var j = x.j;
          out.innerHTML = '<div class="corr-res">' + (j.score != null ? '<p class="small"><b>' + esc(T("corr_score", { n: j.score })) + "</b></p>" : "") +
            '<h3>' + esc(T("corr_fixed")) + '</h3><div class="corr-text t"' + (C.dir === "rtl" ? ' dir="rtl"' : "") + ">" + esc(j.corrected) + " " + snd(j.corrected, true) + "</div>" +
            (j.notes && j.notes.length ? "<h3>" + esc(T("corr_notes")) + '</h3><ul class="corr-notes">' + j.notes.map(function (n) {
              return "<li>" + (n.from ? '<s class="t">' + esc(n.from) + "</s> → " : "") + '<b class="t">' + esc(n.to) + "</b>" + (n.why ? '<br><span class="muted small">' + esc(n.why) + "</span>" : "") + "</li>";
            }).join("") + "</ul>" : '<p>' + esc(T("corr_perfect")) + "</p>") +
            (j.tip ? '<p class="small">💡 ' + esc(j.tip) + "</p>" : "") + "</div>";
        })
        .catch(function () { go.disabled = false; out.innerHTML = '<p class="msg">' + esc(T("net_error")) + "</p>"; });
    });
  }
  function bindConversation() {
    bindCorrector();
    var ch = chatLoad(), log = document.getElementById("chatLog"), input = document.getElementById("chatIn"), sendB = document.getElementById("chatSend"), status = document.getElementById("chatStatus");
    var busy = false, enabled = true;
    var paint = function (typing) {
      log.innerHTML = ch.msgs.map(chatMsgHtml).join("") + (typing ? '<div class="chat-row">' + mascTyping(T("chat_typing")) + "</div>" : "") +
        (!ch.msgs.length && !typing && enabled ? '<div class="box with-masc">' + masc("wave", 64, "masc-inline") + '<div><p>' + esc(T("chat_intro")) + '</p><button type="button" class="bpr" id="chatStart" style="margin-top:var(--ig27-space-3)">' + esc(T("chat_start")) + "</button></div></div>" : "");
      log.querySelectorAll("[data-tr]").forEach(function (b) { b.addEventListener("click", function () { var el = document.getElementById("tr" + b.getAttribute("data-tr")); el.hidden = !el.hidden; }); });
      var st = document.getElementById("chatStart"); if (st) st.addEventListener("click", function () { send(""); });
      log.scrollTop = log.scrollHeight;
    };
    var setStatus = function (j) {
      if (!j.enabled) { enabled = false; status.innerHTML = '<div class="box with-masc">' + masc("sleeping", 56, "masc-inline") + "<div>" + esc(T("chat_disabled")) + "</div></div>"; input.disabled = sendB.disabled = true; return; }
      status.innerHTML = '<p class="muted small">' + esc(T("chat_left", { n: j.left, max: j.limit })) + (j.premium ? "" : ' · <button type="button" class="linkbtn" data-go="/subscribe">★ ' + esc(T("go_premium")) + "</button>") + "</p>";
      if (j.left <= 0) { input.disabled = sendB.disabled = true; status.innerHTML += '<div class="box">' + esc(T("chat_quota")) + "</div>"; }
    };
    var send = function (text) {
      if (busy) return;
      text = (text || "").trim();
      if (text) ch.msgs.push({ role: "user", content: text.slice(0, 500) });
      busy = true; sendB.disabled = true; paint(true); chatSave();
      fetch("/api/chat", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: LANG, level: ch.level, scenario: ch.scenario, messages: ch.msgs.map(function (m) { return { role: m.role, content: m.content }; }) }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
        .then(function (res) {
          busy = false; sendB.disabled = false;
          if (!res.ok) {
            if (res.status === 429 && res.j.error === "quota") setStatus({ enabled: true, left: 0, limit: res.j.limit, premium: ACCESS.premium });
            else toast(res.j.error || T("chat_error"), "sad");
            if (text) { ch.msgs.pop(); input.value = text; }
            paint(); chatSave(); return;
          }
          var last = ch.msgs[ch.msgs.length - 1];
          if (last && last.role === "user" && res.j.correction) last.correction = res.j.correction;
          ch.msgs.push({ role: "assistant", content: res.j.reply, rom: res.j.rom, translation: res.j.translation });
          if (ch.msgs.length > 40) ch.msgs = ch.msgs.slice(-40);
          chatSave(); paint();
          setStatus({ enabled: true, left: res.j.left, limit: res.j.limit, premium: ACCESS.premium });
          addXp(2); save();
          if (P.settings.autoplay !== false) TTS.speak(res.j.reply);
          input.focus();
        })
        .catch(function () { busy = false; sendB.disabled = false; if (text) { ch.msgs.pop(); input.value = text; } paint(); toast(T("chat_error"), "sad"); });
    };
    document.getElementById("chatForm").addEventListener("submit", function (e) { e.preventDefault(); var v = input.value; if (!v.trim()) return; input.value = ""; send(v); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); document.getElementById("chatForm").requestSubmit(); } });
    document.getElementById("chatSc").addEventListener("change", function (e) { ch.scenario = e.target.value; ch.msgs = []; chatSave(); paint(); });
    document.getElementById("chatLv").addEventListener("change", function (e) { ch.level = e.target.value; chatSave(); });
    document.getElementById("chatNew").addEventListener("click", function () { ch.msgs = []; chatSave(); paint(); });
    paint();
    fetch("/api/chat/status", { credentials: "same-origin" }).then(function (r) { return r.json(); }).then(function (j) { setStatus(j); paint(); }).catch(function () {});
  }

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
    var html = '<h1 class="sr-only">' + esc(T("level_" + L)) + " (" + L + ")</h1>" + '<div style="text-align:center;margin-bottom:var(--ig27-space-5)"><div class="lvlcard" style="display:inline-flex;align-items:center;width:auto;padding:var(--ig27-space-4) var(--ig27-space-6)"><div class="badge bg-' + L + '" style="width:56px;height:56px;font-size:var(--ig27-fs-title2)">' + L + "</div><b>" + esc(T("level_" + L)) + "</b><span>" + esc(T("n_known", { n: k })) + " / " + lw.length + '</span><div class="meter" style="width:min(220px,60vw)"><i style="width:' + (lw.length ? Math.round(100 * k / lw.length) : 0) + '%"></i></div></div></div>' +
      (advLocked ? gate(LANG + ":lecons-avancees", "📘") :
        '<div class="grid cols-2">' +
        '<div class="box"><h2>📘 ' + esc(T("lesson")) + '</h2><p class="muted small">' + esc(T("lesson_d")) + "</p>" +
        (left > 0 ? '<button type="button" class="bpr wide" id="startLesson" style="margin-top:var(--ig27-space-3)">' + esc(T("start_lesson")) + "</button>" + (unlimited ? "" : '<p class="muted small" style="margin-top:var(--ig27-space-2)">' + esc(T("lessons_left", { n: left })) + "</p>") :
          masc(pickMood(["cool", "heart"]), 72, "masc-inline") + '<p class="small" style="margin-top:var(--ig27-space-3)">🔒 ' + esc(T("lessons_cap")) + '</p><button type="button" class="bpr" data-go="/subscribe">★ ' + esc(T("go_premium")) + "</button>") + "</div>" +
        '<div class="box"><h2>🎓 ' + esc(T("mod_examen")) + '</h2><p class="muted small">' + esc(exam ? T("exam_best", { n: exam.best }) : T("exam_d")) + '</p><button type="button" class="btn2" data-exam="' + L + '" style="margin-top:var(--ig27-space-3)">' + esc(T("take_exam")) + (locked("premium:exam") ? " 🔒" : "") + "</button></div></div>") +
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
          track("lesson_done");
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
    if (i === 0) LASTPCT = 0;
    return '<header class="duo-bar"><button type="button" class="btn2 qz-quit" id="quitL" aria-label="' + esc(T("quit")) + '">✕</button>' + progressBar(Math.min(i + 1, n), n, 100 * i / n, "progress_step") + '</header><main class="con"><h1 class="sr-only">' + esc(T("lesson")) + "</h1>" + inner + "</main>" +
      '<div class="speaking-pill" id="speakPill" role="status"><div class="wave" aria-hidden="true"><span></span><span></span><span></span></div><span class="sp-tx">' + esc(T("speaking")) + "</span></div>";
  }
  // ------------------------------------------------------------------ guided path
  // Placement test (adaptive, see placementFlow) + "today's lesson" that mixes due reviews,
  // a few new words at the suggested level and a short quiz.
  function openLevels() {
    return LEVELS.filter(function (l) { return !(C.locked && C.locked.levels.indexOf(l) >= 0) && C.words.filter(function (w) { return w.level === l && wg(w); }).length >= 8; });
  }
  function dailyLevel() {
    var lv = openLevels(); if (!lv.length) return "A1";
    var from = P.placement && lv.indexOf(P.placement.level) >= 0 ? lv.indexOf(P.placement.level) : 0;
    for (var i = from; i < lv.length; i++) {
      var L = lv[i];
      if (C.words.some(function (w) { return w.level === L && wg(w) && !seen(w); })) return L;
    }
    return lv[lv.length - 1];
  }
  function dailyPlan() {
    var adv = !locked("premium:srs-advanced"), left = adv ? 10 : Math.min(10, Math.max(0, 20 - dayRec().reviews));
    var L = dailyLevel(), lw = C.words.filter(function (w) { return w.level === L && wg(w); });
    var fresh = lw.filter(function (w) { return !seen(w); });
    return { level: L, reviews: shuffle(dueWords().filter(function (w) { return !w.custom; })).slice(0, left), fresh: (fresh.length ? fresh : lw).slice(0, 5), pool: lw };
  }
  function guidedCards() {
    var h = "";
    if (!P.placement && openLevels().length > 1) {
      h += '<div class="box with-masc">' + masc("curious", 72, "masc-inline") + '<div style="flex:1"><h2>🧭 ' + esc(T("place_title")) + '</h2><p class="muted small">' + esc(T("place_d")) + '</p><div class="row" style="margin-top:var(--ig27-space-3)"><button type="button" class="bpr" id="placeStart">' + esc(T("place_start")) + '</button><button type="button" class="btn2" id="placeSkip">' + esc(T("place_skip")) + "</button></div></div></div>";
    }
    var plan = dailyPlan(), done = dayRec().daily;
    h += '<div class="box with-masc daily-card">' + masc(done ? "heart" : "excited", 72, "masc-inline") + '<div style="flex:1"><h2>☀️ ' + esc(T("daily_title")) + ' <span class="badge bg-' + plan.level + '" style="vertical-align:middle">' + plan.level + "</span></h2>" +
      '<p class="muted small">' + esc(done ? T("daily_done") : plan.reviews.length ? T("daily_d", { r: plan.reviews.length, n: plan.fresh.length }) : T("daily_d_new", { n: plan.fresh.length })) + "</p>" +
      '<button type="button" class="' + (done ? "btn2" : "bpr") + '" id="dailyStart" style="margin-top:var(--ig27-space-3)">' + esc(done ? T("daily_again") : T("daily_start")) + "</button></div></div>";
    return '<div class="sect">' + h + "</div>";
  }
  function bindGuided() {
    var ps = document.getElementById("placeStart"); if (ps) ps.addEventListener("click", placementFlow);
    var sk = document.getElementById("placeSkip"); if (sk) sk.addEventListener("click", function () { P.placement = { level: "A1", at: Date.now(), skipped: true }; save(); render(); });
    var ds = document.getElementById("dailyStart"); if (ds) ds.addEventListener("click", dailyFlow);
  }
  function dailyFlow() {
    var plan = dailyPlan(), i = 0, j = 0;
    var quiz = function () {
      var words = plan.fresh.concat(plan.reviews);
      startQuiz({ modes: ["mcq", "reverse", "listen", "mcq"], words: words.length >= 4 ? words.concat(pick(plan.pool, 6)) : plan.pool, n: 8, onDone: function () {
        var d = dayRec(); d.daily = true; track("daily_done");
        plan.fresh.forEach(function (w) { if (!P.srs[w.id]) { srsAdd(w); P.srs[w.id].due = Date.now() + DAY - 3600000; } (P.words[w.id] = P.words[w.id] || { ok: 0, ko: 0, seen: 0, last: 0 }).seen++; });
        save();
        return { title: T("daily_done") };
      } });
    };
    var learn = function () {
      if (j >= plan.fresh.length) return quiz();
      var w = plan.fresh[j];
      app.innerHTML = quizShellLesson(plan.reviews.length + j, plan.reviews.length + plan.fresh.length, '<div class="quiz-card"><div class="quiz-kind">' + esc(T("daily_step_new")) + " · " + (j + 1) + "/" + plan.fresh.length + " " + lvBadge(w.level) + '</div><div class="flash"><div class="big t"' + (C.dir === "rtl" ? ' dir="rtl"' : "") + ">" + esc(w.t) + "</div>" + (w.r ? '<div class="rom">' + esc(w.r) + "</div>" : "") +
        '<div class="row" style="justify-content:center;margin-top:var(--ig27-space-3)">' + snd(w.t) + '</div><div class="gl">' + esc(wg(w)) + fallbackTag(w.g) + "</div>" +
        (w.ex ? '<div class="exs">' + snd(w.ex.t, true) + " " + tgt(w.ex.t) + "<br>" + esc(gl(w.ex.g)) + "</div>" : "") + '</div><button type="button" class="bpr wide" id="nextW">' + esc(T("continue")) + "</button></div>");
      if (P.settings.autoplay) TTS.speak(w.t);
      document.getElementById("nextW").addEventListener("click", function () { j++; learn(); });
      document.getElementById("nextW").focus();
    };
    var review = function () {
      if (i >= plan.reviews.length) return learn();
      var w = plan.reviews[i];
      app.innerHTML = quizShellLesson(i, plan.reviews.length + plan.fresh.length, '<div class="quiz-card"><div class="quiz-kind">' + esc(T("daily_step_review")) + " · " + (i + 1) + "/" + plan.reviews.length + " " + lvBadge(w.level) + '</div><div class="flash"><div class="big t"' + (C.dir === "rtl" ? ' dir="rtl"' : "") + ">" + esc(w.t) + '</div><div class="row" style="justify-content:center;margin-top:var(--ig27-space-2)">' + snd(w.t) + "</div>" +
        '<div id="back" hidden>' + (w.r ? '<div class="rom">' + esc(w.r) + "</div>" : "") + '<div class="gl">' + esc(wg(w)) + "</div></div></div>" +
        '<div id="actions"><button type="button" class="bpr wide" id="reveal">' + esc(T("show_answer")) + "</button></div></div>");
      if (P.settings.autoplay) TTS.speak(w.t);
      document.getElementById("reveal").focus();
      document.getElementById("reveal").addEventListener("click", function () {
        document.getElementById("back").hidden = false;
        document.getElementById("actions").innerHTML = '<div class="quiz-opts">' + [[1, "again"], [3, "hard"], [4, "good"], [5, "easy"]].map(function (g) { return '<button type="button" class="quiz-opt" data-q="' + g[0] + '">' + esc(T("grade_" + g[1])) + "</button>"; }).join("") + "</div>";
        app.querySelectorAll("[data-q]").forEach(function (b) { b.addEventListener("click", function () { srsGrade(w, +b.getAttribute("data-q")); i++; review(); }); });
        app.querySelector("[data-q]").focus();
      });
    };
    review();
  }
  // A real level test. Each level tested is a block of 10 questions mixing
  // skills: meaning and recall of words, listening (audio only), words in
  // context, phrase and text comprehension, conjugation and, from B1, typed
  // answers. Wrong options are chosen to be close to the answer (same theme,
  // same part of speech, similar spelling), and answers are not revealed
  // during the test. Blocks go up after a pass (>= 70 %) and down after a
  // fail until the level is bracketed. Result: the last level passed, the
  // level to work on next, and a score per level and per skill.
  var PT_PER = 10, PT_PASS = 0.7;
  var PT_SKILLS = ["vocab", "listen", "grammar", "reading", "writing"];
  function ptWordsAt(L) {
    var list = C.words.filter(function (w) {
      var g = wg(w);
      return w.level === L && g && w.t && w.t.length <= 32 && g.length <= 60 && norm(g) !== norm(w.t);
    });
    // Prefer words translated into the learner's own language.
    var own = list.filter(function (w) { return glLang(w.g) === BASE; });
    return own.length >= 40 ? own : list;
  }
  // Close candidates first: same theme / part of speech, similar spelling.
  function ptNear(w, list, key, n) {
    var k0 = norm(key(w)), g0 = norm(wg(w)), t0 = norm(w.t);
    var words0 = g0.split(" ").filter(function (x) { return x.length >= 4; });
    var cand = list.length > 500 ? shuffle(list).slice(0, 500) : list;
    var scored = [];
    cand.forEach(function (x) {
      if (x === w) return;
      var k = norm(key(x)), gx = norm(wg(x)), tx = norm(x.t);
      if (!k || k === k0 || tx === t0 || gx === g0) return;
      // Avoid near-synonyms that would make two options correct.
      if (words0.some(function (y) { return gx.split(" ").indexOf(y) >= 0; })) return;
      var s = Math.random() * 1.5;
      if (w.pos && x.pos === w.pos) s += 2;
      if (w.theme && x.theme === w.theme) s += 2;
      if (Math.abs(k.length - k0.length) <= 2) s += 1;
      if (k.slice(0, 2) === k0.slice(0, 2)) s += 1.5;
      if (k.length < 24 && k0.length < 24 && lev(k, k0) <= Math.max(2, Math.floor(k0.length / 3))) s += 2;
      scored.push([s, x]);
    });
    scored.sort(function (a, b) { return b[0] - a[0]; });
    var out = [], seenK = {}; seenK[k0] = 1;
    scored.forEach(function (p) { var k = norm(key(p[1])); if (out.length < n && !seenK[k]) { seenK[k] = 1; out.push(p[1]); } });
    return out;
  }
  function ptLatin() { return C.dir !== "rtl" && !/^(ja|zh|ko|ru|uk|el|hi|ar|he|tlh)$/.test(LANG); }
  var PT_BUILD = {
    meaning: function (L, ctx) {
      var w = ctx.next(); if (!w) return null;
      var near = ptNear(w, ctx.pool, wg, 3); if (near.length < 3) return null;
      return { skill: "vocab", kind: T("place_meaning_q"), html: '<div class="quiz-q">' + tgt(w.t) + "</div>", answer: wg(w), opts: shuffle([wg(w)].concat(near.map(wg))) };
    },
    recall: function (L, ctx) {
      var w = ctx.next(); if (!w) return null;
      var tf = function (x) { return x.t; };
      var near = ptNear(w, ctx.pool, tf, 3); if (near.length < 3) return null;
      return { skill: "vocab", kind: T("place_recall_q"), html: '<div class="quiz-q">' + esc(wg(w)) + "</div>", answer: w.t, optsT: true, opts: shuffle([w.t].concat(near.map(tf))) };
    },
    listen: function (L, ctx) {
      var w = ctx.next(function (x) { return x.t.split(" ").length <= 3; }); if (!w) return null;
      var near = ptNear(w, ctx.pool, wg, 3); if (near.length < 3) return null;
      return { skill: "listen", kind: T("place_listen_q"), audio: w.t, html: '<div class="quiz-q"><button type="button" class="bpr" data-say="' + esc(w.t) + '">🔊 ' + esc(T("listen")) + "</button></div>", answer: wg(w), opts: shuffle([wg(w)].concat(near.map(wg))) };
    },
    context: function (L, ctx) {
      // An example sentence with the word blanked out, or a cloze item.
      var cl = (C.cloze || []).filter(function (c) { return c.level === L && !ctx.used["c" + c.id]; });
      var ws = ctx.pool.filter(function (x) { return x.ex && x.ex.t && !ctx.used[x.id] && x.ex.t.toLowerCase().indexOf(x.t.toLowerCase()) >= 0 && x.t.length >= 3; });
      var tf = function (x) { return x.t; };
      if (ws.length && (!cl.length || Math.random() < 0.6)) {
        var w = ws[Math.floor(Math.random() * ws.length)]; ctx.used[w.id] = 1;
        var i = w.ex.t.toLowerCase().indexOf(w.t.toLowerCase()), ans = w.ex.t.substr(i, w.t.length);
        var near = ptNear(w, ctx.pool, tf, 3); if (near.length < 3) return null;
        return { skill: "grammar", kind: T("place_ctx_q"), html: '<div class="quiz-q">' + tgt(w.ex.t.slice(0, i) + "_____" + w.ex.t.slice(i + w.t.length)) + "</div>" + (gl(w.ex.g) ? '<div class="quiz-sub">' + esc(gl(w.ex.g)) + "</div>" : ""), answer: ans, optsT: true, opts: shuffle([ans].concat(near.map(tf))) };
      }
      if (!cl.length) return null;
      var c = cl[Math.floor(Math.random() * cl.length)]; ctx.used["c" + c.id] = 1;
      var others = shuffle((C.cloze || []).map(function (x) { return x.a; }).filter(function (a) { return a !== c.a; }));
      var opts = [c.a]; others.forEach(function (a) { if (opts.length < 4 && opts.indexOf(a) < 0) opts.push(a); });
      if (opts.length < 4) return null;
      return { skill: "grammar", kind: T("place_ctx_q"), html: '<div class="quiz-q">' + tgt(c.t) + "</div>", answer: c.a, optsT: true, opts: shuffle(opts) };
    },
    phrase: function (L, ctx) {
      var all = (C.phrases || []).filter(function (p) { return gl(p.g); });
      var ps = all.filter(function (p) { return p.level === L && !ctx.used[p.id]; });
      if (!ps.length || all.length < 4) return null;
      var p = ps[Math.floor(Math.random() * ps.length)]; ctx.used[p.id] = 1;
      var others = shuffle(all.filter(function (x) { return x !== p && gl(x.g) !== gl(p.g); })).sort(function (a, b) { return (b.level === L) - (a.level === L) || (b.theme === p.theme) - (a.theme === p.theme); }).slice(0, 3);
      return { skill: "reading", kind: T("place_phrase_q"), html: '<div class="quiz-q">' + tgt(p.t) + "</div>", answer: gl(p.g), opts: shuffle([gl(p.g)].concat(others.map(function (x) { return gl(x.g); }))) };
    },
    conj: function (L, ctx) {
      // Present tense = A1, the next two tenses = A2, later ones = B1.
      var cj = C.conj, items = [];
      if (!cj || !cj.verbs) return null;
      cj.verbs.forEach(function (v) {
        Object.keys(v.forms || {}).forEach(function (tid) {
          var ti = (cj.tenses || []).map(function (x) { return x.id; }).indexOf(tid);
          var lvl = ti <= 0 ? "A1" : ti <= 2 ? "A2" : "B1";
          if (LEVELS.indexOf(v.level) > LEVELS.indexOf(lvl)) lvl = v.level;
          if (lvl === L) (v.forms[tid] || []).forEach(function (f) { if (f.t) items.push([v, tid, f]); });
        });
      });
      items = items.filter(function (it) { return !ctx.used["v" + it[0].t + it[1] + it[2].p]; });
      if (!items.length) return null;
      var it = items[Math.floor(Math.random() * items.length)], v = it[0], tid = it[1], f = it[2];
      ctx.used["v" + v.t + tid + f.p] = 1;
      var opts = [f.t];
      shuffle([].concat.apply([], Object.keys(v.forms).map(function (k) { return v.forms[k]; }))).forEach(function (x) { if (opts.length < 4 && x.t && opts.indexOf(x.t) < 0) opts.push(x.t); });
      if (opts.length < 4) return null;
      var tense = (cj.tenses || []).filter(function (x) { return x.id === tid; })[0];
      return { skill: "grammar", kind: T("place_conj_q", { verb: v.t, tense: gl(tense) }), html: '<div class="quiz-q">' + tgt((f.p ? f.p + " " : "") + "_____") + '</div><div class="quiz-sub">' + esc(v.t + " · " + gl(v.g)) + "</div>", answer: f.t, optsT: true, opts: shuffle(opts) };
    },
    reading: function (L, ctx) {
      var rs = (C.readings || []).filter(function (r) { return r.level === L && r.q && r.q.length && !ctx.used["r" + r.id]; });
      if (!rs.length) return null;
      var r = rs[Math.floor(Math.random() * rs.length)]; ctx.used["r" + r.id] = 1;
      var q = r.q[Math.floor(Math.random() * r.q.length)];
      if (!q.opts || q.opts.length < 2) return null;
      return { skill: "reading", kind: T("place_read_q"), html: '<div class="place-read">' + (r.title ? "<b>" + tgt(gl(r.title)) + "</b><br>" : "") + tgt(r.t) + '</div><div class="quiz-q">' + tgt(gl(q.q)) + "</div>", answer: q.opts[q.a], optsT: true, opts: q.opts.slice() };
    },
    typed: function (L, ctx) {
      if (!ptLatin()) return null;
      var w = ctx.next(function (x) { return x.t.split(" ").length <= 2 && x.t.length >= 3; }); if (!w) return null;
      // Any word with the same translation is a right answer too.
      var g0 = norm(wg(w)), alts = C.words.filter(function (x) { return x.t && norm(wg(x)) === g0; }).map(function (x) { return x.t; });
      return { skill: "writing", kind: T("place_type_q", { lang: C.name }), html: '<div class="quiz-q">' + esc(wg(w)) + "</div>", answer: w.t, alts: alts, typed: true };
    },
  };
  var PT_PLAN = {
    A1: ["meaning", "meaning", "recall", "recall", "listen", "listen", "phrase", "conj", "context", "reading"],
    A2: ["meaning", "recall", "recall", "listen", "listen", "phrase", "conj", "context", "typed", "reading"],
    B1: ["meaning", "recall", "recall", "listen", "phrase", "conj", "context", "typed", "typed", "reading"],
    B2: ["meaning", "meaning", "recall", "recall", "listen", "phrase", "context", "typed", "typed", "reading"],
    C1: ["meaning", "meaning", "recall", "recall", "listen", "phrase", "context", "typed", "typed", "reading"],
    C2: ["meaning", "meaning", "recall", "recall", "listen", "phrase", "context", "typed", "typed", "reading"],
  };
  function ptBlock(L) {
    var pool = ptWordsAt(L), order = shuffle(pool), used = {};
    var ctx = { pool: pool, used: used, next: function (f) {
      for (var i = 0; i < order.length; i++) { var w = order[i]; if (!used[w.id] && (!f || f(w))) { used[w.id] = 1; return w; } }
      return null;
    } };
    var qs = [], plan = PT_PLAN[L] || PT_PLAN.B1, fill = ["recall", "meaning"];
    plan.forEach(function (kind, n) {
      var q = PT_BUILD[kind](L, ctx);
      for (var t = 0; !q && t < 4; t++) q = PT_BUILD[fill[(n + t) % 2]](L, ctx);
      if (q) qs.push(q);
    });
    // Reading last (it is the longest), everything else mixed.
    var rd = qs.filter(function (q) { return q.html.indexOf("place-read") >= 0; });
    return shuffle(qs.filter(function (q) { return rd.indexOf(q) < 0; })).concat(rd);
  }
  function ptTypedOk(input, answer) {
    var a = norm(input), b = norm(answer);
    if (!a) return false;
    if (a === b) return true;
    // Leading article optional ("el perro" / "perro"), one typo allowed on long words.
    var parts = b.split(" ");
    if (parts.length > 1 && parts[0].length <= 3 && parts.slice(1).join(" ") === a) return true;
    return b.length >= 7 && lev(a, b) <= 1;
  }
  function placementFlow() {
    var lv = openLevels();
    if (!lv.length) return;
    var idx = Math.min(1, lv.length - 1), part = 0, res = {}, skills = {}, L, qs, k, ok;
    PT_SKILLS.forEach(function (s) { skills[s] = [0, 0]; });
    var finish = function () {
      var passed = lv.filter(function (l) { return res[l] && res[l].pass; });
      // Acquired = highest passed level with no failed level below it.
      var acquired = null;
      for (var i = 0; i < lv.length; i++) { var r = res[lv[i]]; if (r && !r.pass) break; if (r && r.pass) acquired = lv[i]; }
      var work = acquired ? lv[Math.min(lv.indexOf(acquired) + 1, lv.length - 1)] : lv[0];
      var beyond = acquired === lv[lv.length - 1] && C.locked && C.locked.levels.length;
      var scores = {}; Object.keys(res).forEach(function (l) { scores[l] = Math.round(100 * res[l].ok / res[l].n); });
      var sk = {}; PT_SKILLS.forEach(function (s) { if (skills[s][1]) sk[s] = Math.round(100 * skills[s][0] / skills[s][1]); });
      P.placement = { level: work, acquired: acquired, at: Date.now(), scores: scores, skills: sk, v: 2 }; save(); track("placement_done");
      var bar = function (label, pct, extra) { return '<div class="place-bar"><span class="pb-l">' + label + '</span><span class="pb-t"><i style="width:' + pct + '%"></i></span><span class="pb-v">' + pct + " %" + (extra || "") + "</span></div>"; };
      var partial = res[work] && !res[work].pass && scores[work] >= 50 ? '<p class="small">' + esc(T("place_partial", { level: work, pct: scores[work] })) + "</p>" : "";
      app.innerHTML = quizShellLesson(1, 1, '<div class="complete place-result"><div class="big">' + mascOr("excited", "🧭") + "</div>" +
        "<h2>" + esc(acquired ? T("place_acquired", { level: acquired }) : T("place_none")) + "</h2>" +
        '<p class="muted">' + esc(T("place_work", { level: work })) + "</p>" + partial + (beyond ? '<p class="small">' + esc(T("place_beyond")) + "</p>" : "") +
        '<div class="box place-box"><h3>' + esc(T("place_by_level")) + "</h3>" + lv.filter(function (l) { return res[l]; }).map(function (l) { return bar(lvBadge(l), scores[l], res[l].pass ? " ✓" : ""); }).join("") + "</div>" +
        '<div class="box place-box"><h3>' + esc(T("place_by_skill")) + "</h3>" + PT_SKILLS.filter(function (s) { return sk[s] !== undefined; }).map(function (s) { return bar(esc(T("place_sk_" + s)), sk[s]); }).join("") + "</div>" +
        '<div class="row" style="justify-content:center;margin-top:var(--ig27-space-5)"><button type="button" class="bpr" id="placeGo">☀️ ' + esc(T("daily_title")) + '</button><button type="button" class="btn2" id="placeBack">' + esc(T("back")) + "</button></div></div>");
      document.getElementById("placeGo").addEventListener("click", dailyFlow);
      document.getElementById("placeBack").addEventListener("click", function () { QUIZ = null; render(); });
      document.getElementById("placeGo").focus({ preventScroll: true });
    };
    var nextBlock = function () {
      var pass = ok / qs.length >= PT_PASS;
      res[L] = { ok: ok, n: qs.length, pass: pass };
      var up = lv[idx + 1], down = lv[idx - 1];
      if (pass && up && !res[up]) { idx++; return startBlock(); }
      if (!pass && down && !res[down]) { idx--; return startBlock(); }
      finish();
    };
    var paint = function () {
      if (k >= qs.length) return nextBlock();
      var q = qs[k], done = false;
      var body = q.typed
        ? '<form class="place-typed" id="ptForm" autocomplete="off"><input type="text" id="ptIn" class="ans t" lang="' + esc(LANG) + '" autocapitalize="off" spellcheck="false" placeholder="' + esc(T("place_type_ph")) + '" aria-label="' + esc(T("place_type_ph")) + '">' + keyboard() + '<button type="submit" class="bpr wide">' + esc(T("place_check")) + "</button></form>"
        : '<div class="quiz-opts">' + q.opts.map(function (o, n) { return '<button type="button" class="quiz-opt' + (q.optsT ? " t" : "") + '" data-opt="' + n + '">' + esc(o) + "</button>"; }).join("") + "</div>";
      app.innerHTML = quizShellLesson(k, qs.length, '<div class="quiz-card"><div class="quiz-kind">' + esc(T("place_q2", { part: part, i: k + 1, n: qs.length })) + " · " + esc(q.kind) + "</div>" + q.html + body +
        '<div class="row" style="justify-content:center;margin-top:var(--ig27-space-3)"><button type="button" class="btn2" id="dunno">' + esc(T("dont_know")) + "</button></div>" +
        (k === 0 && part === 1 ? '<p class="muted small" style="text-align:center">' + esc(T("place_note")) + "</p>" : "") + "</div>");
      var answer = function (good, el) {
        if (done) return; done = true;
        if (good) ok++;
        skills[q.skill][1]++; if (good) skills[q.skill][0]++;
        // No right/wrong reveal during a level test: just show the choice.
        app.querySelectorAll("[data-opt],#ptIn,#dunno").forEach(function (x) { x.disabled = true; });
        if (el) el.classList.add("picked");
        setTimeout(function () { k++; paint(); }, 380);
      };
      app.querySelectorAll("[data-opt]").forEach(function (b) { b.addEventListener("click", function () { answer(q.opts[+b.getAttribute("data-opt")] === q.answer, b); }); });
      document.getElementById("dunno").addEventListener("click", function () { answer(false); });
      var fm = document.getElementById("ptForm");
      if (fm) {
        var inp = document.getElementById("ptIn");
        app.querySelectorAll("[data-key]").forEach(function (kb) { kb.addEventListener("click", function () { inp.value += kb.getAttribute("data-key"); inp.focus(); }); });
        fm.addEventListener("submit", function (e) { e.preventDefault(); if (!inp.value.trim()) { inp.focus(); return; } answer((q.alts || [q.answer]).some(function (a) { return ptTypedOk(inp.value, a); }), inp); });
        inp.focus();
      }
      if (q.audio) setTimeout(function () { TTS.speak(q.audio); }, 250);
    };
    var startBlock = function () {
      L = lv[idx]; k = 0; ok = 0; part++;
      qs = ptBlock(L);
      if (qs.length < 4) return finish(); // not enough content at this level
      paint();
    };
    startBlock();
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
    startQuiz({ modes: modes, words: lw, n: 20, onDone: function (Q, pct) { track("exam_done");
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
    html += '<div class="box"><h2>📈 ' + esc(T("activity_30")) + '</h2><div class="bars">' + days.map(function (x) { return '<div style="height:' + Math.round(100 * x.xp / mx) + '%" data-tip="' + esc(x.d + " : " + x.xp + " XP") + '"></div>'; }).join("") + "</div></div>";
    html += '<div class="box"><h2>🎯 ' + esc(T("by_level")) + "</h2>" + LEVELS.map(function (L) {
      var lw = words.filter(function (w) { return w.level === L; }), k = lw.filter(known).length, b = P.byLevel[L] || { ok: 0, ko: 0 }, t = b.ok + b.ko;
      return '<div class="hbar"><span>' + lvBadge(L) + " " + k + "/" + lw.length + '</span><div class="meter"><i style="width:' + (lw.length ? Math.round(100 * k / lw.length) : 0) + '%"></i></div><span class="muted">' + (t ? Math.round(100 * b.ok / t) + "%" : "—") + "</span></div>";
    }).join("") + "</div>";
    var themes = Object.keys(P.byTheme).filter(function (t) { return t.charAt(0) !== "_"; }).map(function (t) { var b = P.byTheme[t]; return { t: t, pct: Math.round(100 * b.ok / (b.ok + b.ko)), n: b.ok + b.ko }; }).sort(function (a, b) { return a.pct - b.pct; });
    if (themes.length) html += '<div class="box"><h2>🧩 ' + esc(T("by_theme")) + "</h2>" + themes.map(function (x) { return '<div class="hbar"><span>' + esc(themeLabel(x.t)) + '</span><div class="meter"><i style="width:' + x.pct + '%"></i></div><span class="muted">' + x.pct + "%</span></div>"; }).join("") + "</div>";
    if (!locked("premium:progress-detailed")) {
      var hard = Object.keys(P.words).map(function (id) { return { w: wordIndex()[id], s: P.words[id] }; }).filter(function (x) { return x.w && x.s.ko; }).sort(function (a, b) { return (b.s.ko - b.s.ok) - (a.s.ko - a.s.ok); }).slice(0, 15);
      if (hard.length) html += '<div class="box"><h2>🔥 ' + esc(T("hardest_words")) + '</h2><div class="vlist">' + hard.map(function (x) { return vrow(x.w).replace('<div class="main">', '<div class="main"><span class="tag">✓' + x.s.ok + " ✗" + x.s.ko + "</span>"); }).join("") + "</div></div>";
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
      esc(T("cert_body", { lang: langName(LANG), level: L, label: T("level_" + L), score: ex.best })) + '</p><p class="muted small" style="margin-top:var(--ig27-space-6)">' + esc(T("cert_date", { d: ex.date })) + " · Pap’pote · #" + esc(String(ME.id) + "-" + LANG + "-" + L) + "</p>";
  }

  // ------------------------------------------------------------------ dictionary
  PAGES.dictionnaire = function () {
    var cap = locked("premium:custom-words") ? 20 : Infinity;
    var html = '<h1 class="ttl">' + esc(T("mod_dictionnaire")) + '</h1><p class="sub">' + esc(T("dict_sub")) + '</p><input class="field" type="search" id="dq" placeholder="' + esc(T("search")) + '" style="width:100%;margin-bottom:var(--ig27-space-4)"><div id="dres"></div>' +
      '<div class="sect"><div class="secttit">➕ ' + esc(T("my_words")) + " (" + (P.custom || []).length + (cap < Infinity ? "/" + cap : "") + ')</div><div class="box"><div class="row">' +
      '<input class="field" id="cw_t" placeholder="' + esc(T("word_in", { lang: langName(LANG) })) + '"><input class="field" id="cw_r" placeholder="' + esc(T("romanization")) + '"><input class="field" id="cw_g" placeholder="' + esc(T("translation")) + '">' +
      '<select class="sel" id="cw_l" aria-label="' + esc(T("chat_level")) + '">' + LEVELS.map(function (l) { return "<option>" + l + "</option>"; }).join("") + '</select><button type="button" class="bpr" id="cw_add">+</button></div></div><div class="vlist" id="cwlist"></div></div>';
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
        emptyMsg();
    };
    q.addEventListener("input", run);
    var paintCustom = function () { document.getElementById("cwlist").innerHTML = allWords().filter(function (w) { return w.custom; }).map(vrow).join(""); };
    document.getElementById("cw_add").addEventListener("click", function () {
      var cap = locked("premium:custom-words") ? 20 : Infinity;
      if ((P.custom || []).length >= cap) { toast(T("feat_custom-words") + " — " + T("premium_only"), "cool"); return; }
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
      '<div class="box"><h2>🔊 ' + esc(T("audio")) + '</h2><div class="row" style="margin-bottom:var(--ig27-space-2)"><label for="rate">' + esc(T("speech_rate")) + '</label><input type="range" id="rate" min="0.5" max="1.3" step="0.1" value="' + P.settings.rate + '"><span id="rateV">' + P.settings.rate + "×</span>" + snd(C.words[0] ? C.words[0].t : C.name, true) + "</div>" +
      (C.audio ? '<div class="row"><label for="voiceSource">' + esc(T("voice_source")) + '</label><select class="sel" id="voiceSource"><option value="">' + esc(T("voice_papote")) + '</option><option value="device"' + (P.settings.voiceSource === "device" ? " selected" : "") + ">" + esc(T("voice_device")) + "</option></select></div>" : "") +
      '<div class="row"><label for="voice">' + esc(T("voice")) + '</label><select class="sel" id="voice"><option value="">' + esc(T("auto")) + "</option>" + voices.map(function (v) { return "<option" + (v.name === P.settings.voice ? " selected" : "") + ">" + esc(v.name) + "</option>"; }).join("") + "</select></div>" +
      (voices.length ? "" : '<p class="muted small">' + esc(T("tts_no_voice", { lang: C.name })) + "</p>") + "</div>" +
      '<div class="box"><h2>⚙️ ' + esc(T("settings")) + "</h2>" +
      toggleRow("rom", T("show_rom")) + toggleRow("autoplay", T("autoplay")) +
      '<div class="row"><label for="goal">' + esc(T("daily_goal")) + '</label><select class="sel" id="goal">' + [10, 30, 50, 100].map(function (n) { return "<option" + (P.settings.goal === n ? " selected" : "") + ' value="' + n + '">' + n + " XP</option>"; }).join("") + "</select></div></div>" +
      '<div class="box"><h2>★ ' + esc(T("premium_tools")) + '</h2><div class="row">' +
      '<button type="button" class="btn2" id="offline">📴 ' + esc(T("feat_offline")) + (locked("premium:offline") ? " 🔒" : "") + "</button>" +
      '<button type="button" class="btn2" id="export">⬇️ ' + esc(T("feat_export")) + (locked("premium:export") ? " 🔒" : "") + "</button>" +
      '</div><p class="muted small" id="offState" style="margin-top:var(--ig27-space-2)"></p></div>' +
      '<div class="box kids-switch"><h2>👧 ' + esc(T("kids_title")) + '</h2><p class="muted small">' + esc(T("kids_lead")) + '</p><button type="button" class="bpr" id="toKids" style="margin-top:var(--ig27-space-3)">🧸 ' + esc(T("kids_go")) + "</button></div>" +
      '<div class="box"><h2>🫧 ' + esc(T("glass_title")) + '</h2><p class="muted small">' + esc(T("glass_lead")) + '</p><div class="lg-slider" style="margin-top:var(--ig27-space-3)"><div class="lg-preview" aria-hidden="true"><span class="lg-preview-chip lg-float">' + esc(T("glass_preview")) + '</span><span class="lg-preview-card lg-lite">' + esc(T("glass_card")) + '</span></div><label for="glassRange" class="small">' + esc(T("glass_label")) + '</label><input type="range" id="glassRange" min="0" max="100" step="5"><div class="lg-scale" aria-hidden="true"><span>' + esc(T("glass_clear")) + "</span><span>" + esc(T("glass_tinted")) + "</span></div></div></div>" +
      '<div class="box"><h2>🐱 ' + esc(T("outfit_title")) + '</h2><p class="muted small">' + esc(T("outfit_d")) + "</p>" + outfitPicker() + "</div>" +
      '<div class="box"><h2>🧭 ' + esc(T("place_title")) + '</h2><p class="muted small">' + esc(P.placement && !P.placement.skipped ? T("place_result", { level: P.placement.level }) : T("place_d")) + '</p><button type="button" class="btn2" id="placeRedo" style="margin-top:var(--ig27-space-3)">' + esc(T("place_redo")) + "</button></div>" +
      '<div class="box"><h2>🗑️ ' + esc(T("danger")) + '</h2><button type="button" class="btn2 ko" id="reset">' + esc(T("reset_progress")) + "</button></div>";
    return shell("mod_profil", html);
  };
  function toggleRow(k, label) { return '<label class="row" style="margin-bottom:var(--ig27-space-2)"><input type="checkbox" data-set="' + k + '"' + (P.settings[k] !== false ? " checked" : "") + "> " + esc(label) + "</label>"; }
  function bindProfil() {
    var rate = document.getElementById("rate");
    rate.addEventListener("input", function () { P.settings.rate = +rate.value; document.getElementById("rateV").textContent = rate.value + "×"; save(); });
    document.getElementById("voice").addEventListener("change", function (e) { P.settings.voice = e.target.value; TTS.pick(); save(); });
    var vs = document.getElementById("voiceSource");
    if (vs) vs.addEventListener("change", function (e) { P.settings.voiceSource = e.target.value; save(); TTS.speak((C.words[0] || {}).t); });
    document.getElementById("goal").addEventListener("change", function (e) { P.settings.goal = +e.target.value; save(); });
    app.querySelectorAll("[data-set]").forEach(function (c) { c.addEventListener("change", function () { P.settings[c.getAttribute("data-set")] = c.checked; save(); }); });
    document.getElementById("placeRedo").addEventListener("click", placementFlow);
    var tk = document.getElementById("toKids"); if (tk) tk.addEventListener("click", function () { setMode("kids"); });
    var gr = document.getElementById("glassRange"), G = window.PapoteGlass;
    if (gr && G) {
      var glabel = function (v) { return v + " % — " + (v <= 15 ? T("glass_clear") : v >= 75 ? T("glass_tinted") : T("glass_regular")); };
      var gout = document.getElementById("glassVal");
      var gshow = function () { var t = glabel(+gr.value); gr.setAttribute("aria-valuetext", t); if (gout) gout.textContent = t; };
      gr.value = G.get(); gshow();
      gr.addEventListener("input", function () { G.set(+gr.value); gshow(); });
    }
    app.querySelectorAll("[data-outfit]").forEach(function (b) { b.addEventListener("click", function () { P.settings.outfit = b.getAttribute("data-outfit"); save(); render(); toast(T("outfit_saved"), "happy"); }); });
    document.getElementById("reset").addEventListener("click", function () { if (confirm(T("reset_confirm"))) { var s = P.settings; P = newProgress(); P.settings = s; save(); render(); } });
    document.getElementById("export").addEventListener("click", function () {
      if (locked("premium:export")) { toast(T("premium_only"), "cool"); return; }
      var rows = [["word", "romanization", "translation", "level", "theme", "correct", "wrong", "srs_box", "known"]];
      allWords().forEach(function (w) { var s = P.words[w.id] || {}, r = P.srs[w.id] || {}; rows.push([w.t, w.r || "", wg(w), w.level, w.theme, s.ok || 0, s.ko || 0, r.box || "", known(w) ? 1 : 0]); });
      var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })); a.download = "progression-" + LANG + ".csv"; body.appendChild(a); a.click(); a.remove();
    });
    var offState = document.getElementById("offState");
    var swNav = TOP.navigator;
    if (swNav && swNav.serviceWorker && swNav.serviceWorker.controller) offState.textContent = T("offline_on");
    document.getElementById("offline").addEventListener("click", function () {
      if (locked("premium:offline")) { toast(T("premium_only"), "cool"); return; }
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


  // ------------------------------------------------------------------ immersive quiz
  // While a quiz/lesson screen (with .duo-bar) is shown, the page switches to
  // "quiz mode": the app frame hides its own bars and gives the whole visible
  // height to this page, and fitQuiz() scales the content (--qz) so that the
  // question, the answers and the action buttons fit without scrolling.
  var QMODE = false;
  function setQuizMode(on) {
    document.body.classList.toggle("quiz-mode", on);
    document.documentElement.classList.toggle("quiz-mode", on);
    if (on !== QMODE) {
      QMODE = on;
      if (window.parent && window.parent !== window) {
        // srcdoc pages have an opaque location: target the parent's own origin.
        var origin = "*"; try { origin = window.parent.location.origin; } catch (e) {}
        try { window.parent.postMessage({ immersive: on }, origin); } catch (e) {}
      }
    }
  }
  function fitQuiz() {
    if (!QMODE) return;
    var main = app.querySelector("main.con"); if (!main) return;
    var root = document.documentElement;
    main.classList.remove("qz-scroll", "qz-compact");
    var shrink = function () {
      var qz = 1, guard = 0;
      root.style.setProperty("--qz", "1");
      while (main.scrollHeight > main.clientHeight + 1 && qz > 0.6 && guard++ < 14) {
        qz = Math.round((qz - 0.05) * 100) / 100;
        root.style.setProperty("--qz", String(qz));
      }
      return main.scrollHeight <= main.clientHeight + 1;
    };
    // 1) scale text and spacing; 2) drop secondary elements (label, answers
    // that were not picked, notes) and scale again; 3) last resort on tiny
    // screens: only the content area scrolls, never the page.
    if (shrink()) return;
    main.classList.add("qz-compact");
    if (shrink()) return;
    main.classList.add("qz-scroll");
  }
  var qmPending = 0;
  function checkQuizMode() {
    qmPending = 0;
    setQuizMode(!!app.querySelector(".duo-bar"));
    animateBars();
    fitQuiz();
  }
  new MutationObserver(function () { if (!qmPending) qmPending = requestAnimationFrame(checkQuizMode); }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", function () { if (QMODE) requestAnimationFrame(fitQuiz); });
  if (window.PapoteDevice) window.PapoteDevice.on(function () { if (QMODE) requestAnimationFrame(fitQuiz); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var m = document.getElementById("navMenu");
    if (m && m.classList.contains("on")) { var tg = document.getElementById("navToggle"); tg.click(); tg.focus(); }
  });
  // Keyboard: 1-4 pick an answer, Enter continues, Escape leaves.
  document.addEventListener("keydown", function (e) {
    if (!QMODE || e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = (e.target && e.target.tagName) || "";
    if (e.key === "Escape") { var qb = document.getElementById("quitQuiz") || document.getElementById("quitL"); if (qb) { e.preventDefault(); qb.click(); } return; }
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (/^[1-9]$/.test(e.key)) { var o = app.querySelector('[data-opt="' + (+e.key - 1) + '"]:not(:disabled)'); if (o) { e.preventDefault(); o.click(); } }
  });

  // ------------------------------------------------------------------ render
  var BINDERS = {
    vocabulaire: bindVocab, phrases: bindPhrases, grammaire: bindGrammar, conjugaison: bindConj, alphabet: bindAlphabet,
    lecture: bindLecture, ecoute: bindEcoute, exercices: bindExercices, revision: bindRevision, prononciation: bindPron, conversation: bindConversation, amis: bindAmis,
    hub: bindGuided, culture: function () { decorateTargetText(app); }, dictionnaire: bindDict, profil: bindProfil,
    examen: function () { app.querySelectorAll("[data-exam]").forEach(function (b) { b.addEventListener("click", function () { examFlow(b.getAttribute("data-exam")); }); }); },
    certificat: function () {
      app.querySelectorAll("[data-cert]").forEach(function (b) { b.addEventListener("click", function () { app.querySelectorAll("[data-cert]").forEach(function (x) { x.classList.toggle("on", x === b); }); paintCert(b.getAttribute("data-cert")); }); });
      var pb = document.getElementById("printCert"); if (pb) pb.addEventListener("click", function () { window.print(); });
    },
  };
  // ================================================================== KIDS MODE
  // A separate, simpler app for children (account setting "mode": "kids"):
  // illustrated bilingual stories, picture games, a picture dictionary and a
  // sticker album. Told in the child's language; the words of the language
  // being learned are bubbles the child taps to hear. Content: course/kids.js.
  // Grown-up actions (leave kids mode, settings, Premium) sit behind a small
  // "ask a grown-up" sum.
  var KIDS = false, KV = { view: "home" };
  var KD = window.PAPOTE_KIDS || { WORDS: [], CATEGORIES: [], STORIES: [], STICKERS: [] };
  function KT(fr, en) { return UI === "fr" ? fr : en; }
  var KWORD = null; // cid -> { cid, emoji, t, base, cat }
  function kidsWords() {
    if (KWORD) return KWORD;
    var byCid = {};
    (C.words || []).forEach(function (w) {
      var cid = w.cid || (/^c-/.test(w.id) ? w.id.slice(2) : "");
      if (cid && !byCid[cid]) byCid[cid] = w;
    });
    KWORD = {};
    KD.WORDS.forEach(function (k) {
      var w = byCid[k[0]];
      if (w && w.t) KWORD[k[0]] = { cid: k[0], emoji: k[1], t: w.t, r: w.r || "", base: UI === "fr" ? k[2] : k[3], cat: k[4] };
    });
    return KWORD;
  }
  function kidsList(cat) { var all = kidsWords(); return Object.keys(all).map(function (c) { return all[c]; }).filter(function (w) { return !cat || w.cat === cat; }); }
  function kidsData() { P.kids = P.kids || { stars: 0, stories: {}, games: 0 }; return P.kids; }
  function kidsStickers() { return Math.min(KD.STICKERS.length, Math.floor(kidsData().stars / 5)); }
  function kidsAddStars(n) {
    var k = kidsData(), before = kidsStickers();
    k.stars += n; save();
    var after = kidsStickers();
    if (after > before) setTimeout(function () { kidsCelebrate(KD.STICKERS[after - 1], KT("Nouvel autocollant !", "New sticker!")); }, 500);
  }
  // Narration in the child's language (device voice), target words in the course voice.
  function kidsSayBase(text) {
    if (!("speechSynthesis" in window) || !text) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = BASE === "fr" ? "fr-FR" : "en-GB"; u.rate = 0.92; u.pitch = 1.1;
      var v = speechSynthesis.getVoices().filter(function (x) { return x.lang.toLowerCase().indexOf(BASE) === 0; })[0]; if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function kidsBubble(w) {
    return '<button type="button" class="kw" data-say="' + esc(w.t) + '" aria-label="' + esc(w.t + " — " + w.base) + '"><span class="kw-e" aria-hidden="true">' + w.emoji + "</span>" + tgt(w.t) + "</button>";
  }
  function kidsShell(inner, back) {
    var k = kidsData();
    return '<div class="kids-app">' +
      '<header class="kids-top">' +
        (back ? '<button type="button" class="kids-round" data-kv="' + back + '" aria-label="' + esc(KT("Retour", "Back")) + '">⬅️</button>' : '<span class="kids-flag" aria-hidden="true">' + esc(C.flag) + "</span>") +
        '<span class="kids-stars" aria-label="' + esc(k.stars + " " + KT("étoiles", "stars")) + '">⭐ ' + k.stars + "</span>" +
        '<button type="button" class="kids-round" id="kidsGrown" aria-label="' + esc(KT("Espace des parents", "Grown-ups")) + '">🔒</button>' +
      "</header><main class=\"kids-main\">" + inner + "</main></div>";
  }
  function kidsTile(view, emoji, label, color, extra) {
    return '<button type="button" class="kids-tile" data-kv="' + view + '" style="--kc:' + color + '"><span class="kt-e" aria-hidden="true">' + emoji + '</span><span class="kt-l">' + esc(label) + "</span>" + (extra || "") + "</button>";
  }
  var KVIEWS = {
    home: function () {
      var name = ME.name ? ", " + esc(ME.name) : "";
      return kidsShell('<div class="kids-hello">' + (masc("wave", 120, "kids-masc") || '<span class="kids-big">🐱</span>') +
        '<h1>' + KT("Coucou" + name + " !", "Hi" + name + "!") + "</h1><p>" + esc(KT("Que veux-tu faire aujourd'hui ?", "What do you want to do today?")) + "</p></div>" +
        '<div class="kids-grid">' +
          kidsTile("stories", "📖", KT("Histoires", "Stories"), "#ff9f0a") +
          kidsTile("games", "🎮", KT("Jeux", "Games"), "#34c759") +
          kidsTile("words", "🖼️", KT("Imagier", "Picture words"), "#0a84ff") +
          kidsTile("stickers", "🌟", KT("Mes autocollants", "My stickers"), "#af52de", '<span class="kt-badge">' + kidsStickers() + "/" + KD.STICKERS.length + "</span>") +
        "</div>");
    },
    stories: function () {
      var k = kidsData();
      var cards = KD.STORIES.filter(kidsStoryOk).map(function (s) {
        return '<button type="button" class="kids-story" data-kv="story:' + s.id + '" style="--kc:' + s.color + '"><span class="ks-cover" aria-hidden="true">' + s.cover + '</span><span class="ks-title">' + esc(KT(s.title[0], s.title[1])) + "</span>" + (k.stories[s.id] ? '<span class="ks-done" aria-label="' + esc(KT("lue", "read")) + '">✅</span>' : "") + "</button>";
      }).join("");
      return kidsShell("<h1 class=\"kids-h\">📖 " + esc(KT("Les histoires", "Stories")) + "</h1><div class=\"kids-stories\">" + (cards || "<p>" + esc(KT("Bientôt des histoires dans cette langue !", "Stories coming soon in this language!")) + "</p>") + "</div>", "home");
    },
    games: function () {
      return kidsShell("<h1 class=\"kids-h\">🎮 " + esc(KT("Les jeux", "Games")) + "</h1><div class=\"kids-grid\">" +
        kidsTile("game:listen", "👂", KT("Écoute et trouve", "Listen and find"), "#ff375f") +
        kidsTile("game:word", "🔤", KT("Quel est le mot ?", "Which word?"), "#5e5ce6") +
        kidsTile("game:memory", "🃏", KT("Memory", "Memory"), "#ff9f0a") +
        kidsTile("game:cat", "🐾", KT("Choisis un thème", "Pick a theme"), "#30b0c7") + "</div>", "home");
    },
    words: function () {
      var cats = KD.CATEGORIES.filter(function (c) { return kidsList(c[0]).length >= 3; });
      return kidsShell("<h1 class=\"kids-h\">🖼️ " + esc(KT("L'imagier", "Picture words")) + "</h1><div class=\"kids-cats\">" + cats.map(function (c) {
        return '<button type="button" class="kids-cat" data-kv="cat:' + c[0] + '"><span aria-hidden="true">' + c[1] + "</span>" + esc(KT(c[2], c[3])) + "</button>";
      }).join("") + "</div>", "home");
    },
    stickers: function () {
      var n = kidsStickers(), k = kidsData(), next = 5 - (k.stars % 5);
      return kidsShell("<h1 class=\"kids-h\">🌟 " + esc(KT("Mes autocollants", "My stickers")) + "</h1>" +
        '<p class="kids-p">' + esc(n < KD.STICKERS.length ? KT("Encore " + next + " étoile" + (next > 1 ? "s" : "") + " pour le prochain !", next + " more star" + (next > 1 ? "s" : "") + " for the next one!") : KT("Tu as tous les autocollants. Bravo !", "You have every sticker. Well done!")) + "</p>" +
        '<div class="kids-album">' + KD.STICKERS.map(function (s, i) { return '<span class="kids-sticker' + (i < n ? " on" : "") + '" aria-label="' + (i < n ? s : esc(KT("à gagner", "to win"))) + '">' + (i < n ? s : "❔") + "</span>"; }).join("") + "</div>", "home");
    },
  };
  function kidsStoryOk(s) {
    var all = kidsWords(), slots = [];
    s.pages.forEach(function (p) { p[1].replace(/\{(\w+)\}/g, function (m, c) { slots.push(c); return m; }); });
    return slots.filter(function (c) { return all[c]; }).length >= Math.ceil(slots.length * 0.75);
  }
  function kidsText(raw) {
    var all = kidsWords(), base = raw;
    var html = esc(raw).replace(/\{(\w+)\}/g, function (m, c) {
      var w = all[c]; if (w) return kidsBubble(w);
      var k = KD.WORDS.filter(function (x) { return x[0] === c; })[0];
      return k ? "<b>" + esc(UI === "fr" ? k[2] : k[3]) + "</b>" : "";
    });
    var spoken = base.replace(/\{(\w+)\}/g, function (m, c) { var k = KD.WORDS.filter(function (x) { return x[0] === c; })[0]; return k ? (UI === "fr" ? k[2] : k[3]) : ""; });
    return { html: html, spoken: spoken };
  }
  function kidsStory(id) {
    var s = KD.STORIES.filter(function (x) { return x.id === id; })[0]; if (!s) { kidsGo("stories"); return; }
    var i = 0;
    var paint = function () {
      var p = s.pages[i], tx = kidsText(KT(p[1], p[2]));
      app.innerHTML = kidsShell('<div class="kids-page" style="--kc:' + s.color + '">' +
        '<div class="kids-dots" aria-label="' + (i + 1) + "/" + s.pages.length + '">' + s.pages.map(function (x, j) { return '<i class="' + (j <= i ? "on" : "") + '"></i>'; }).join("") + "</div>" +
        '<div class="kids-scene" aria-hidden="true">' + p[0] + "</div>" +
        '<p class="kids-text">' + tx.html + "</p>" +
        '<div class="kids-nav"><button type="button" class="kids-btn ghost" id="kPrev"' + (i ? "" : " disabled") + ' aria-label="' + esc(KT("Page d'avant", "Previous page")) + '">◀️</button>' +
        '<button type="button" class="kids-btn" id="kRead">🔊 ' + esc(KT("Écouter", "Listen")) + "</button>" +
        '<button type="button" class="kids-btn" id="kNext">' + (i < s.pages.length - 1 ? "▶️" : "🎉 " + esc(KT("Le quiz !", "Quiz time!"))) + "</button></div>" +
        '<p class="kids-hint">' + esc(KT("Touche les mots en couleur pour les entendre !", "Tap the coloured words to hear them!")) + "</p></div>", "stories");
      document.getElementById("kRead").addEventListener("click", function () { kidsSayBase(tx.spoken); });
      document.getElementById("kPrev").addEventListener("click", function () { if (i) { i--; paint(); } });
      document.getElementById("kNext").addEventListener("click", function () {
        if (i < s.pages.length - 1) { i++; paint(); }
        else kidsQuiz(s.quiz.filter(function (c) { return kidsWords()[c]; }), function (stars) {
          var k = kidsData(); if (!k.stories[s.id]) { k.stories[s.id] = Date.now(); stars += 2; }
          track("kids_story_done"); return stars;
        }, "stories");
      });
      if (P.settings.autoplay) kidsSayBase(tx.spoken);
    };
    paint();
  }
  // Questions: listen (hear the word, pick the picture) or word (see the picture, pick the word).
  function kidsQuiz(cids, onDone, back, kind) {
    var all = kidsWords(), pool = Object.keys(all);
    var qs = cids.map(function (c, n) { return { w: all[c], kind: kind || (n % 2 ? "word" : "listen") }; });
    var qi = 0, stars = 0, tries = 0;
    var paint = function () {
      if (qi >= qs.length) {
        var total = onDone ? onDone(stars) : stars; kidsAddStars(total);
        app.innerHTML = kidsShell('<div class="kids-end">' + mascOr("excited", "🎉", 150) + "<h1>" + esc(KT("Bravo !", "Well done!")) + '</h1><p class="kids-earned">' + "⭐".repeat(Math.min(total, 10)) + "</p><p>" + esc(KT("Tu as gagné " + total + " étoile" + (total > 1 ? "s" : "") + " !", "You won " + total + " star" + (total > 1 ? "s" : "") + "!")) + '</p><div class="kids-nav"><button type="button" class="kids-btn" data-kv="' + back + '">' + esc(KT("Encore !", "Again!")) + '</button><button type="button" class="kids-btn ghost" data-kv="home">🏠</button></div></div>', back);
        return;
      }
      var q = qs[qi], others = shuffle(pool.filter(function (c) { return c !== q.w.cid && all[c].cat === q.w.cat; })).slice(0, 2);
      if (others.length < 2) others = others.concat(shuffle(pool.filter(function (c) { return c !== q.w.cid && others.indexOf(c) < 0; })).slice(0, 2 - others.length));
      var opts = shuffle([q.w.cid].concat(others)).map(function (c) { return all[c]; });
      tries = 0;
      var prompt = q.kind === "listen"
        ? '<button type="button" class="kids-listen" data-say="' + esc(q.w.t) + '" aria-label="' + esc(KT("Écouter le mot", "Hear the word")) + '">🔊</button><p class="kids-q">' + esc(KT("Écoute… Où est-ce ?", "Listen… Where is it?")) + "</p>"
        : '<div class="kids-scene" aria-hidden="true">' + q.w.emoji + '</div><p class="kids-q">' + esc(KT("Comment on dit ?", "How do you say it?")) + "</p>";
      app.innerHTML = kidsShell('<div class="kids-game"><div class="kids-dots">' + qs.map(function (x, j) { return '<i class="' + (j < qi ? "on" : j === qi ? "cur" : "") + '"></i>'; }).join("") + "</div>" + prompt +
        '<div class="kids-opts ' + q.kind + '">' + opts.map(function (o) {
          return '<button type="button" class="kids-opt" data-c="' + o.cid + '"' + (q.kind === "word" ? ' data-say="' + esc(o.t) + '"' : ' aria-label="' + esc(o.base) + '"') + ">" + (q.kind === "listen" ? '<span class="ko-e">' + o.emoji + "</span>" : tgt(o.t)) + "</button>";
        }).join("") + '</div><div class="kids-fb" id="kFb" role="status"></div></div>', back);
      if (q.kind === "listen") setTimeout(function () { TTS.speak(q.w.t); }, 250);
      app.querySelectorAll(".kids-opt").forEach(function (b) {
        b.addEventListener("click", function () {
          var ok = b.getAttribute("data-c") === q.w.cid, fb = document.getElementById("kFb");
          if (ok) {
            if (!tries) stars++;
            b.classList.add("good"); app.querySelectorAll(".kids-opt").forEach(function (x) { x.disabled = true; });
            fb.innerHTML = (masc("happy", 64, "masc-inline") || "😺") + "<b>" + esc(pick([KT("Super !", "Great!"), KT("Bravo !", "Well done!"), KT("Génial !", "Awesome!"), KT("Oui !", "Yes!")], 1)[0]) + "</b> " + esc(q.w.emoji + " " + q.w.t + " = " + q.w.base);
            if (q.kind === "word") TTS.speak(q.w.t);
            kidsConfetti(b);
            setTimeout(function () { qi++; paint(); }, 1500);
          } else {
            tries++; b.classList.add("bad"); b.disabled = true;
            fb.innerHTML = (masc("thinking", 64, "masc-inline") || "🤔") + "<b>" + esc(KT("Presque ! Essaie encore.", "Almost! Try again.")) + "</b>";
            if (q.kind === "listen") setTimeout(function () { TTS.speak(q.w.t); }, 400);
          }
        });
      });
    };
    paint();
  }
  function kidsMemory(cat) {
    var words = shuffle(kidsList(cat)).slice(0, 6);
    if (words.length < 3) words = shuffle(kidsList()).slice(0, 6);
    var cards = shuffle(words.map(function (w) { return { c: w.cid, f: "e" }; }).concat(words.map(function (w) { return { c: w.cid, f: "t" }; })));
    var open = [], found = 0, moves = 0, all = kidsWords();
    app.innerHTML = kidsShell("<h1 class=\"kids-h\">🃏 " + esc(KT("Retrouve les paires !", "Find the pairs!")) + '</h1><div class="kids-memory">' + cards.map(function (k, i) {
      var w = all[k.c];
      return '<button type="button" class="km-card" data-i="' + i + '" aria-label="' + esc(KT("Carte", "Card") + " " + (i + 1)) + '"><span class="km-back" aria-hidden="true">❓</span><span class="km-front">' + (k.f === "e" ? '<span class="ko-e">' + w.emoji + "</span>" : tgt(w.t)) + "</span></button>";
    }).join("") + '</div><div class="kids-fb" id="kFb" role="status"></div>', "games");
    app.querySelectorAll(".km-card").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = +b.getAttribute("data-i"), k = cards[i];
        if (b.classList.contains("open") || open.length === 2) return;
        b.classList.add("open"); open.push({ b: b, k: k });
        TTS.speak(all[k.c].t);
        if (open.length < 2) return;
        moves++;
        var a = open[0], z = open[1];
        if (a.k.c === z.k.c) {
          a.b.classList.add("found"); z.b.classList.add("found"); a.b.disabled = z.b.disabled = true; open = []; found++;
          kidsConfetti(z.b);
          if (found === words.length) {
            var stars = moves <= words.length + 3 ? 3 : moves <= words.length * 2 ? 2 : 1;
            setTimeout(function () { kidsAddStars(stars); kidsCelebrate("🏆", KT("Toutes les paires ! +" + stars + " ⭐", "All the pairs! +" + stars + " ⭐")); kidsGo("games"); }, 900);
          }
        } else setTimeout(function () { a.b.classList.remove("open"); z.b.classList.remove("open"); open = []; }, 1000);
      });
    });
  }
  function kidsCategory(cat) {
    var c = KD.CATEGORIES.filter(function (x) { return x[0] === cat; })[0];
    app.innerHTML = kidsShell("<h1 class=\"kids-h\">" + (c ? c[1] + " " + esc(KT(c[2], c[3])) : "") + '</h1><div class="kids-cards">' + kidsList(cat).map(function (w) {
      return '<button type="button" class="kids-card" data-say="' + esc(w.t) + '"><span class="kc-e" aria-hidden="true">' + w.emoji + '</span><span class="kc-t">' + tgt(w.t) + '</span><span class="kc-b">' + esc(w.base) + "</span></button>";
    }).join("") + '</div><div class="kids-nav"><button type="button" class="kids-btn" id="kPlay">🎮 ' + esc(KT("Jouer avec ces mots", "Play with these words")) + "</button></div>", "words");
    document.getElementById("kPlay").addEventListener("click", function () { kidsQuiz(shuffle(kidsList(cat)).slice(0, 6).map(function (w) { return w.cid; }), null, "words"); });
  }
  function kidsCatPicker() {
    var cats = KD.CATEGORIES.filter(function (c) { return kidsList(c[0]).length >= 4; });
    app.innerHTML = kidsShell("<h1 class=\"kids-h\">🐾 " + esc(KT("Choisis un thème", "Pick a theme")) + '</h1><div class="kids-cats">' + cats.map(function (c) {
      return '<button type="button" class="kids-cat" data-kv="play:' + c[0] + '"><span aria-hidden="true">' + c[1] + "</span>" + esc(KT(c[2], c[3])) + "</button>";
    }).join("") + "</div>", "games");
  }
  function kidsConfetti(anchor) {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var r = anchor.getBoundingClientRect(), box = document.createElement("div");
    box.className = "kids-confetti"; box.style.left = (r.left + r.width / 2) + "px"; box.style.top = (r.top + r.height / 2) + "px";
    box.innerHTML = ["⭐", "✨", "🎉", "💛", "🌟", "✨"].map(function (e, i) { return '<i style="--a:' + (i * 60) + 'deg">' + e + "</i>"; }).join("");
    body.appendChild(box); setTimeout(function () { box.remove(); }, 1100);
  }
  // This page lives in an iframe as tall as its content: a fixed overlay
  // centred in it can sit far below the screen. Pin it to the slice of the
  // frame the user actually sees.
  function kidsInView(el, center) {
    try {
      var fe = window.frameElement; if (!fe) return;
      var r = fe.getBoundingClientRect(), vh = window.parent.innerHeight;
      var top = Math.max(0, -r.top), h = Math.min(vh, r.bottom) - Math.max(0, r.top);
      if (h <= 0) return;
      if (center) { el.style.top = (top + h * 0.4) + "px"; return; }
      el.style.top = top + "px"; el.style.bottom = "auto"; el.style.height = h + "px";
    } catch (e) {}
  }
  function kidsCelebrate(emoji, text) {
    var el = document.createElement("div");
    el.className = "kids-pop"; el.setAttribute("role", "status"); kidsInView(el, true);
    el.innerHTML = '<span class="kp-e" aria-hidden="true">' + emoji + '</span><span class="kp-t">' + esc(text) + "</span>";
    body.appendChild(el); setTimeout(function () { el.remove(); }, 2600);
  }
  // "Ask a grown-up": a sum a young child can't do yet, then the grown-up menu.
  function kidsGrownUp() {
    var a = 6 + Math.floor(Math.random() * 7), b = 7 + Math.floor(Math.random() * 6), ans = a * b;
    var opts = shuffle([ans, ans + a, ans - b, ans + 1]);
    var box = document.createElement("div");
    box.className = "kids-gate"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", KT("Espace des parents", "Grown-ups"));
    box.innerHTML = '<div class="kg-card lg-float"><h2>🔒 ' + esc(KT("Pour les grands", "For grown-ups")) + "</h2><p>" + esc(KT("Combien font " + a + " × " + b + " ?", "What is " + a + " × " + b + "?")) + '</p><div class="kg-opts">' +
      opts.map(function (o) { return '<button type="button" class="kids-btn ghost" data-a="' + o + '">' + o + "</button>"; }).join("") +
      '</div><button type="button" class="kids-btn ghost" id="kgClose">' + esc(KT("Fermer", "Close")) + "</button></div>";
    kidsInView(box);
    body.appendChild(box);
    box.querySelector("[data-a]").focus({ preventScroll: true });
    var close = function () { box.remove(); };
    box.querySelector("#kgClose").addEventListener("click", close);
    box.querySelectorAll("[data-a]").forEach(function (b) { b.addEventListener("click", function () {
      if (+b.getAttribute("data-a") !== ans) { b.disabled = true; return; }
      box.querySelector(".kg-card").innerHTML = "<h2>👋 " + esc(KT("Espace des parents", "Grown-ups")) + '</h2><div class="kg-menu">' +
        '<button type="button" class="kids-btn" id="kgAdult">🧑 ' + esc(KT("Passer en mode adulte", "Switch to adult mode")) + "</button>" +
        '<button type="button" class="kids-btn ghost" id="kgProfile">⚙️ ' + esc(KT("Réglages du compte", "Account settings")) + "</button>" +
        (ACCESS.premium ? "" : '<button type="button" class="kids-btn ghost" id="kgPremium">★ Premium</button>') +
        '<button type="button" class="kids-btn ghost" id="kgClose2">' + esc(KT("Retour", "Back")) + "</button></div>";
      box.querySelector("#kgAdult").addEventListener("click", function () { setMode("adult"); close(); });
      box.querySelector("#kgProfile").addEventListener("click", function () { goTop("/profile"); });
      var pm = box.querySelector("#kgPremium"); if (pm) pm.addEventListener("click", function () { goTop("/subscribe"); });
      box.querySelector("#kgClose2").addEventListener("click", close);
    }); });
  }
  // Saves the mode on the account, applies it here and in the app frame.
  function setMode(mode) {
    KIDS = mode === "kids"; ME.mode = mode;
    body.classList.toggle("kids", KIDS); document.documentElement.classList.toggle("kids", KIDS);
    try { TOP.__COURSE_CACHE[LANG].me.mode = mode; } catch (e) {}
    try { window.parent.postMessage({ kidsMode: KIDS }, window.parent.location.origin); } catch (e) {}
    fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: mode }) }).catch(function () {});
    KV = { view: "home" }; render();
  }
  window.__setMode = setMode;
  function kidsGo(view) { KV = { view: view }; renderKids(); try { window.scrollTo(0, 0); } catch (e) {} }
  function renderKids() {
    var v = KV.view;
    if (/^story:/.test(v)) return kidsStory(v.slice(6));
    if (/^cat:/.test(v)) return kidsCategory(v.slice(4));
    if (/^play:/.test(v)) return kidsQuiz(shuffle(kidsList(v.slice(5))).slice(0, 6).map(function (w) { return w.cid; }), null, "games");
    if (v === "game:listen" || v === "game:word") return kidsQuiz(shuffle(kidsList()).slice(0, 6).map(function (w) { return w.cid; }), null, "games", v.slice(5));
    if (v === "game:memory") return kidsMemory("");
    if (v === "game:cat") return kidsCatPicker();
    app.innerHTML = (KVIEWS[v] || KVIEWS.home)();
  }
  document.addEventListener("click", function (e) {
    if (!KIDS) return;
    var g = e.target.closest("#kidsGrown"); if (g) { e.preventDefault(); kidsGrownUp(); return; }
    var k = e.target.closest("[data-kv]"); if (k) { e.preventDefault(); kidsGo(k.getAttribute("data-kv")); }
  });

  function render() {
    // fresh #app (drops listeners bound by the previous page)
    var fresh = app.cloneNode(false); app.parentNode.replaceChild(fresh, app); app = fresh;
    QUIZ = null;
    if (KIDS) { setQuizMode(false); document.title = "Pap’pote · " + langName(LANG); renderKids(); return; }
    var L = levelOf(PAGE), fn = L ? function () { return PAGES.level(L); } : PAGES[PAGE];
    var mod = MODULES.filter(function (m) { return m.id === PAGE; })[0];
    if (!fn || (mod && !available(mod))) { PAGE = "hub"; fn = PAGES.hub; }
    document.title = T(L ? "mod_levels" : "mod_" + PAGE) + " · " + langName(LANG);
    app.innerHTML = fn();
    track("view:" + (L ? "levels" : PAGE));
    if (L) bindLevel(L); else if (BINDERS[PAGE]) BINDERS[PAGE]();
    var fresh2 = checkBadges(); if (fresh2.length && !locked("premium:badges")) { save(); toast(fresh2[0].ic + " " + T("badge_new", { name: T("badge_" + fresh2[0].id) }), "cool"); }
    var goal = P.settings.goal || 30, d = dayRec();
    if (d.xp >= goal && !d.goalShown) { d.goalShown = true; save(); toast("🎯 " + T("goal_reached", { n: goal }), "excited"); }
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
      KIDS = ME.mode === "kids"; KWORD = null;
      body.classList.toggle("kids", KIDS); document.documentElement.classList.toggle("kids", KIDS);
      AUDIO = {};
      (C.words || []).concat(C.phrases || []).forEach(function (w) { if (w.a) AUDIO[w.t] = w.a; });
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
