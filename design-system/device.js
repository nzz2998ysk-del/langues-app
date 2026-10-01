/*!
 * Papote device layer — detects the device and exposes it to every page.
 *
 *   window.PapoteDevice.info          current snapshot (see detect())
 *   window.PapoteDevice.on(fn)        fn(info) now and on every change
 *   window.PapoteDevice.refresh()     re-detect (called on resize/rotation)
 *
 * It also writes the result on <html> so CSS can combine signals instead of
 * relying on width alone:
 *   data-device  phone | tablet | laptop | desktop | wide | tv
 *   data-bp      xs | sm | md | lg | xl | xxl | tv      (viewport width)
 *   data-os      ios | ipados | android | windows | macos | linux | chromeos | other
 *   data-browser safari | chrome | edge | firefox | samsung | opera | other
 *   data-input   touch | mouse | hybrid      (+ data-pen when a stylus is used)
 *   data-orient  portrait | landscape        data-short (height < 500px)
 *   data-tiny    (width < 360px)             data-fold (dual-screen / folded hinge)
 *   data-webview (in-app WebView)            data-kbd (keyboard navigation in use)
 * and CSS variables: --vh (1% of the visible height), --app-h (visible height,
 * shrinks with the on-screen keyboard), --ui-zoom (scale used on big screens).
 *
 * Debug: add ?debug=device to any URL (remembered) or press Alt+Shift+D to
 * show a panel with everything detected and the active breakpoints.
 * No dependency, no network, no tracking: everything stays in the browser.
 */
(function () {
  "use strict";
  var w = window, d = document, root = d.documentElement, nav = w.navigator || {};
  var TOP = (function () { try { return w.top === w; } catch (e) { return false; } })();
  var listeners = [], info = {}, hiModel = "";
  var mq = function (q) { try { return !!(w.matchMedia && w.matchMedia(q).matches); } catch (e) { return false; } };
  var BPS = [["xs", 0], ["sm", 360], ["md", 600], ["lg", 900], ["xl", 1200], ["xxl", 1600], ["tv", 2400]];

  function parseUA() {
    var ua = nav.userAgent || "", os = "other", browser = "other", version = "", model = "", brand = "";
    var touchMac = /Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1; // iPadOS reports itself as a Mac
    if (/iPad/.test(ua) || touchMac) { os = "ipados"; model = "iPad"; brand = "Apple"; }
    else if (/iPhone|iPod/.test(ua)) { os = "ios"; model = /iPod/.test(ua) ? "iPod" : "iPhone"; brand = "Apple"; }
    else if (/Android/.test(ua)) {
      os = "android";
      var m = /Android[^;)]*;\s*(?:[a-z]{2}[-_][A-Za-z]{2};\s*)?([^;)]+?)(?:\s+Build\/|\))/.exec(ua);
      if (m && !/^(K|Mobile|wv)$/.test(m[1].trim())) model = m[1].trim();
    }
    else if (/CrOS/.test(ua)) os = "chromeos";
    else if (/Windows/.test(ua)) os = "windows";
    else if (/Mac OS X|Macintosh/.test(ua)) { os = "macos"; brand = "Apple"; }
    else if (/Linux/.test(ua)) os = "linux";
    var b;
    if ((b = /Edg(?:e|A|iOS)?\/([\d.]+)/.exec(ua))) browser = "edge";
    else if ((b = /SamsungBrowser\/([\d.]+)/.exec(ua))) browser = "samsung";
    else if ((b = /(?:OPR|Opera)\/([\d.]+)/.exec(ua))) browser = "opera";
    else if ((b = /(?:Firefox|FxiOS)\/([\d.]+)/.exec(ua))) browser = "firefox";
    else if ((b = /(?:Chrome|CriOS)\/([\d.]+)/.exec(ua))) browser = "chrome";
    else if ((b = /Version\/([\d.]+).*Safari/.exec(ua))) browser = "safari";
    else if (/AppleWebKit/.test(ua) && (os === "ios" || os === "ipados")) browser = "safari";
    version = b ? b[1].split(".")[0] : "";
    // In-app browsers (Instagram, Facebook...) and native WebViews.
    var webview = /; wv\)/.test(ua) || /FBAN|FBAV|Instagram|Line\/|MicroMessenger|GSA\//.test(ua) ||
      ((os === "ios" || os === "ipados") && /AppleWebKit/.test(ua) && !/Safari\//.test(ua));
    var tvUA = /SMART-TV|SmartTV|Tizen|Web0S|webOS.*TV|BRAVIA|HbbTV|AFT[A-Z]|CrKey|GoogleTV|Android TV|AppleTV|Xbox/i.test(ua);
    if (!brand && model) {
      var BR = [[/^Pixel/i, "Google"], [/^SM-|Galaxy/i, "Samsung"], [/^(M\d{4}|Redmi|Mi |POCO|2\d{3}[A-Z0-9]+)/i, "Xiaomi"], [/^(CPH|OPPO)/i, "OPPO"], [/^(ONEPLUS|[A-Z]{2}\d{4})/i, "OnePlus"], [/^(moto|XT\d)/i, "Motorola"], [/^(HUAWEI|[A-Z]{3}-[AL]X?\d)/i, "Huawei"], [/^(V\d{4}|vivo)/i, "vivo"], [/^Nokia/i, "Nokia"], [/^(Lenovo|TB-)/i, "Lenovo"], [/^(SO-|XQ-)/i, "Sony"], [/^(Nothing|A0\d{2})/i, "Nothing"]];
      for (var i = 0; i < BR.length; i++) if (BR[i][0].test(model)) { brand = BR[i][1]; break; }
    }
    return { os: os, browser: browser, version: version, model: model, brand: brand, webview: webview, tvUA: tvUA };
  }

  // Dynamic Type / Android font scale: size of the system body font vs. 17px.
  function fontScale() {
    try {
      var p = d.createElement("p");
      p.style.cssText = "position:absolute;visibility:hidden;font:-apple-system-body;margin:0";
      (d.body || root).appendChild(p);
      var px = parseFloat(getComputedStyle(p).fontSize) || 16;
      p.parentNode.removeChild(p);
      var rem = parseFloat(getComputedStyle(root).fontSize) || 16;
      return Math.round(Math.max(px / 17, rem / 16) * 100) / 100;
    } catch (e) { return 1; }
  }

  function segments() {
    try {
      if (w.visualViewport && w.visualViewport.segments && w.visualViewport.segments.length > 1) return w.visualViewport.segments.length;
      if (typeof w.getWindowSegments === "function") { var s = w.getWindowSegments(); if (s && s.length > 1) return s.length; }
    } catch (e) {}
    return mq("(horizontal-viewport-segments: 2)") || mq("(vertical-viewport-segments: 2)") || mq("(spanning: single-fold-vertical)") || mq("(spanning: single-fold-horizontal)") ? 2 : 1;
  }

  var UA = parseUA(), penSeen = false, kbd = false;

  function detect() {
    var vv = w.visualViewport;
    var vw = w.innerWidth || root.clientWidth, vh = w.innerHeight || root.clientHeight;
    var sw = (w.screen && w.screen.width) || vw, sh = (w.screen && w.screen.height) || vh;
    var coarse = mq("(pointer: coarse)"), anyFine = mq("(any-pointer: fine)"), hover = mq("(hover: hover)");
    var touch = (nav.maxTouchPoints || 0) > 0 || "ontouchstart" in w;
    var input = coarse ? (anyFine ? "hybrid" : "touch") : (touch ? "hybrid" : "mouse");
    var shortSide = Math.min(sw, sh), longSide = Math.max(sw, sh);
    var type;
    if (UA.tvUA || (!touch && !hover && vw >= 1280)) type = "tv";
    else if (UA.os === "ipados") type = "tablet";
    else if (UA.os === "ios") type = "phone";
    else if ((coarse || touch && UA.os === "android") && shortSide < 600) type = "phone";
    else if ((coarse || UA.os === "android") && shortSide < 1100) type = "tablet";
    else if (vw >= 2400) type = "wide";
    else if (vw >= 1600 || longSide >= 1900) type = "desktop";
    else type = "laptop";
    var bp = "xs"; for (var i = 0; i < BPS.length; i++) if (vw >= BPS[i][1]) bp = BPS[i][0];
    if (type === "tv") bp = "tv";
    var orient = (w.screen && w.screen.orientation && w.screen.orientation.type) ? (w.screen.orientation.type.indexOf("portrait") === 0 ? "portrait" : "landscape") : (vh >= vw ? "portrait" : "landscape");
    if (!TOP) orient = vh >= vw ? "portrait" : "landscape"; // an iframe follows its own box
    // Approximate browser zoom (desktop) and pinch zoom (mobile).
    var pageZoom = (!coarse && w.outerWidth && vw) ? Math.round((w.outerWidth / vw) * 100) / 100 : 1;
    var pinch = vv && vv.scale ? Math.round(vv.scale * 100) / 100 : 1;
    // Big screens: scale the whole UI so text stays readable from a distance.
    var uiZoom = 1;
    if (TOP) {
      if (type === "tv") uiZoom = Math.min(3, Math.max(1.25, vw / 1280));
      else if (vw >= 2000) uiZoom = Math.min(2.4, vw / 1600);
      uiZoom = Math.round(uiZoom * 100) / 100;
    }
    return {
      type: type, bp: bp, os: UA.os, browser: UA.browser, browserVersion: UA.version, brand: UA.brand, model: hiModel || UA.model,
      webview: UA.webview, input: input, touch: touch, hover: hover, pen: penSeen, keyboardNav: kbd,
      viewport: { w: vw, h: vh, visibleH: Math.round(vv ? vv.height : vh) }, screen: { w: sw, h: sh }, dpr: Math.round((w.devicePixelRatio || 1) * 100) / 100,
      ratio: Math.round((Math.max(vw, vh) / Math.max(1, Math.min(vw, vh))) * 100) / 100, orientation: orient,
      short: vh < 500, tiny: vw < 360, foldSegments: segments(), zoom: { page: pageZoom, pinch: pinch, ui: uiZoom },
      prefs: {
        dark: mq("(prefers-color-scheme: dark)"), contrast: mq("(prefers-contrast: more)") ? "more" : mq("(prefers-contrast: less)") ? "less" : "normal",
        forcedColors: mq("(forced-colors: active)"), reducedMotion: mq("(prefers-reduced-motion: reduce)"), reducedTransparency: mq("(prefers-reduced-transparency: reduce)"),
        fontScale: fontScale(),
      },
      top: TOP,
    };
  }

  function apply(i) {
    var ds = root.dataset;
    ds.device = i.type; ds.bp = i.bp; ds.os = i.os; ds.browser = i.browser; ds.input = i.input; ds.orient = i.orientation;
    toggle("short", i.short); toggle("tiny", i.tiny); toggle("fold", i.foldSegments > 1); toggle("webview", i.webview);
    toggle("pen", i.pen); toggle("kbd", i.keyboardNav); toggle("bigtext", i.prefs.fontScale >= 1.2);
    var s = root.style;
    s.setProperty("--vh", (i.viewport.h / 100) + "px");
    s.setProperty("--app-h", i.viewport.visibleH + "px");
    s.setProperty("--app-hz", (i.viewport.visibleH / i.zoom.ui) + "px"); // same, in zoomed CSS px
    s.setProperty("--ui-zoom", String(i.zoom.ui));
    if (TOP && "zoom" in s) s.zoom = i.zoom.ui !== 1 ? String(i.zoom.ui) : "";
  }
  function toggle(k, on) { if (on) root.setAttribute("data-" + k, ""); else root.removeAttribute("data-" + k); }

  var pending = 0;
  function refresh() {
    pending = 0;
    var prev = JSON.stringify(info);
    info = detect(); apply(info);
    if (JSON.stringify(info) !== prev) {
      api.info = info;
      for (var k = 0; k < listeners.length; k++) { try { listeners[k](info); } catch (e) {} }
      try { w.dispatchEvent(new CustomEvent("papote:device", { detail: info })); } catch (e) {}
      if (panel) paintPanel();
    }
  }
  function schedule() { if (!pending) pending = (w.requestAnimationFrame || setTimeout)(refresh); }

  var api = w.PapoteDevice = {
    info: info, breakpoints: BPS.map(function (b) { return { name: b[0], min: b[1] }; }),
    on: function (fn) { listeners.push(fn); try { fn(info); } catch (e) {} return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    refresh: refresh,
  };

  w.addEventListener("resize", schedule);
  w.addEventListener("orientationchange", function () { setTimeout(refresh, 250); });
  if (w.visualViewport) { w.visualViewport.addEventListener("resize", schedule); }
  ["(prefers-color-scheme: dark)", "(prefers-contrast: more)", "(prefers-reduced-motion: reduce)", "(pointer: coarse)", "(forced-colors: active)"].forEach(function (q) {
    try { var m = w.matchMedia(q); (m.addEventListener ? m.addEventListener("change", schedule) : m.addListener(schedule)); } catch (e) {}
  });
  // Stylus and keyboard are only known once used.
  w.addEventListener("pointerdown", function (e) { if (e.pointerType === "pen" && !penSeen) { penSeen = true; schedule(); } if (kbd) { kbd = false; schedule(); } }, true);
  w.addEventListener("keydown", function (e) { if ((e.key === "Tab" || e.key && e.key.indexOf("Arrow") === 0) && !kbd) { kbd = true; schedule(); } }, true);
  // Chromium exposes the exact phone model on request (no prompt, no network).
  try {
    if (nav.userAgentData && nav.userAgentData.getHighEntropyValues) {
      nav.userAgentData.getHighEntropyValues(["model"]).then(function (v) { if (v && v.model) { hiModel = v.model; schedule(); } }).catch(function () {});
    }
  } catch (e) {}

  refresh();
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", refresh);

  // ---------------------------------------------------------------- debug panel
  var panel = null;
  function debugOn() {
    try {
      var q = /[?&]debug=device\b/.test(location.search) || /[?&]debug=device\b/.test(w.top.location.search);
      if (q) localStorage.setItem("papote_debug_device", "1");
      if (/[?&]debug=off\b/.test(location.search)) localStorage.removeItem("papote_debug_device");
      return localStorage.getItem("papote_debug_device") === "1";
    } catch (e) { return false; }
  }
  function paintPanel() {
    var i = info, rows = [
      ["Appareil", i.type + (i.brand || i.model ? " · " + [i.brand, i.model].filter(Boolean).join(" ") : "")],
      ["Système", i.os + " · " + i.browser + (i.browserVersion ? " " + i.browserVersion : "") + (i.webview ? " (WebView)" : "")],
      ["Entrée", i.input + (i.pen ? " + stylet" : "") + (i.keyboardNav ? " + clavier" : "") + (i.hover ? " · survol" : "")],
      ["Fenêtre", i.viewport.w + "×" + i.viewport.h + " (visible " + i.viewport.visibleH + ") · " + i.orientation],
      ["Écran", i.screen.w + "×" + i.screen.h + " · DPR " + i.dpr + " · ratio " + i.ratio],
      ["Zoom", "page ≈" + i.zoom.page + " · pincement " + i.zoom.pinch + " · UI " + i.zoom.ui],
      ["Breakpoint", api.breakpoints.map(function (b) { return (b.name === i.bp ? "▶" : "") + b.name + "≥" + b.min; }).join(" ")],
      ["Drapeaux", ["short", "tiny"].filter(function (k) { return i[k]; }).concat(i.foldSegments > 1 ? ["pliable"] : []).join(", ") || "—"],
      ["Préférences", (i.prefs.dark ? "sombre" : "clair") + " · contraste " + i.prefs.contrast + (i.prefs.reducedMotion ? " · sans animation" : "") + (i.prefs.forcedColors ? " · couleurs forcées" : "") + " · texte ×" + i.prefs.fontScale],
    ];
    panel.innerHTML = '<b style="display:block;margin-bottom:4px">📱 Papote · appareil détecté</b>' + rows.map(function (r) {
      return '<div><span style="opacity:.7">' + r[0] + " :</span> " + String(r[1]).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) + "</div>";
    }).join("") + '<div style="opacity:.6;margin-top:4px">Alt+Maj+D pour masquer · ?debug=off pour désactiver</div>';
  }
  function showPanel(on) {
    if (!TOP) return;
    if (on && !panel) {
      panel = d.createElement("div");
      panel.id = "papoteDeviceDebug";
      panel.setAttribute("role", "status");
      panel.style.cssText = "position:fixed;left:calc(8px + env(safe-area-inset-left));bottom:calc(8px + env(safe-area-inset-bottom));z-index:2147483647;max-width:min(94vw,460px);padding:10px 12px;border-radius:12px;background:rgba(20,20,24,.88);color:#fff;font:12px/1.45 ui-monospace,Menlo,monospace;box-shadow:0 8px 30px rgba(0,0,0,.35);pointer-events:none";
      (d.body || root).appendChild(panel); paintPanel();
    } else if (!on && panel) { panel.parentNode.removeChild(panel); panel = null; }
  }
  w.addEventListener("keydown", function (e) {
    if (e.altKey && e.shiftKey && (e.key === "D" || e.key === "d" || e.code === "KeyD")) {
      var next = !panel; try { if (next) localStorage.setItem("papote_debug_device", "1"); else localStorage.removeItem("papote_debug_device"); } catch (x) {}
      showPanel(next);
    }
  });
  if (debugOn()) { if (d.body) showPanel(true); else d.addEventListener("DOMContentLoaded", function () { showPanel(true); }); }
})();
