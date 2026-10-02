/*!
 * Pap’pote — Liquid Glass behaviour (pairs with liquid-glass.css).
 *
 *   PapoteGlass.get()      current transparency 0 (ultra-clair) … 100 (teinté)
 *   PapoteGlass.set(v)     change it (saved on this device, applied to every
 *                          open page and frame of the app instantly)
 *
 * Also: SVG refraction lens for Chromium, press ripples, the tab-bar "drop",
 * and the iOS 27 uniform toolbar when content scrolls under a floating bar.
 * Loaded in <head> after device.js; no dependency, no network.
 */
(function () {
  "use strict";
  var w = window, d = document, root = d.documentElement, KEY = "papote_glass", DEF = 50;
  var mq = function (q) { try { return w.matchMedia(q).matches; } catch (e) { return false; } };

  function read() {
    try { var v = parseInt(localStorage.getItem(KEY), 10); return isNaN(v) ? DEF : Math.max(0, Math.min(100, v)); } catch (e) { return DEF; }
  }
  function apply(v) {
    root.style.setProperty("--lg-t", String(v / 100));
    root.setAttribute("data-glass", v >= 100 ? "solid" : v <= 15 ? "clear" : v >= 75 ? "tinted" : "regular");
  }
  // Same-origin child pages (course iframes). Not window.frames: app.html
  // declares its own global "frames" map, which shadows it.
  function children() {
    var out = [];
    try { d.querySelectorAll("iframe").forEach(function (f) { try { if (f.contentWindow && f.contentWindow.PapoteGlass) out.push(f.contentWindow.PapoteGlass); } catch (e) {} }); } catch (e) {}
    return out;
  }
  var current = read();
  apply(current);

  var api = w.PapoteGlass = {
    get: function () { return current; },
    set: function (v) {
      current = Math.max(0, Math.min(100, Math.round(+v || 0)));
      try { localStorage.setItem(KEY, String(current)); } catch (e) {}
      apply(current);
      // same-origin frames (course pages) follow immediately
      children().forEach(function (g) { g.sync(current); });
      try { if (w.parent !== w && w.parent.PapoteGlass) w.parent.PapoteGlass.sync(current); } catch (e) {}
    },
    sync: function (v) { current = v; apply(v); },
  };
  // other tabs / windows
  w.addEventListener("storage", function (e) { if (e.key === KEY) { current = read(); apply(current); } });

  // ---------------------------------------------------------------- adaptive quality
  // Like iOS on older hardware: if scrolling cannot hold ~45 fps with real
  // translucency, switch the whole app (all frames) to "light" glass — same
  // tint, rim and sheen, but opaque and without blur. Kept for the session.
  var QKEY = "papote_glass_q";
  function setQuality(q, fromPeer) {
    if (q === "low") root.setAttribute("data-lg-quality", "low"); else root.removeAttribute("data-lg-quality");
    try { sessionStorage.setItem(QKEY, q); } catch (e) {}
    if (fromPeer) return;
    children().forEach(function (g) { g.quality(q, true); });
    try { if (w.parent !== w && w.parent.PapoteGlass) w.parent.PapoteGlass.quality(q, true); } catch (e) {}
  }
  api.quality = setQuality;
  try { if (sessionStorage.getItem(QKEY) === "low") root.setAttribute("data-lg-quality", "low"); } catch (e) {}
  var probing = false, probed = false;
  function probe() {
    if (probing || probed || root.getAttribute("data-lg-quality") === "low" || root.getAttribute("data-glass") === "solid") return;
    probing = true;
    var frames = [], last = performance.now(), lastScroll = Date.now();
    var mark = function () { lastScroll = Date.now(); };
    w.addEventListener("scroll", mark, { passive: true });
    var tick = function (now) {
      if (Date.now() - lastScroll < 150) frames.push(now - last); // only frames while scrolling
      last = now;
      if (frames.length >= 50) {
        frames.sort(function (a, b) { return a - b; });
        var median = frames[Math.floor(frames.length / 2)];
        probing = false; probed = true; w.removeEventListener("scroll", mark);
        if (median > 22) setQuality("low");
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  w.addEventListener("scroll", probe, { passive: true });

  // ---------------------------------------------------------------- refraction
  // Only Chromium renders SVG filters inside backdrop-filter; Safari and
  // Firefox keep the (already convincing) blur. Skipped on low-memory devices
  // and when transparency is reduced.
  function wantsRefraction() {
    var ua = navigator.userAgent || "";
    var chromium = /Chrome\/|CriOS|Edg\/|SamsungBrowser/.test(ua) && !/Firefox|FxiOS/.test(ua) && !/Version\/[\d.]+ .*Safari/.test(ua);
    if (!chromium || !/Chrome\//.test(ua)) return false; // CriOS is WebKit on iOS
    if (mq("(prefers-reduced-transparency: reduce)") || mq("(prefers-contrast: more)")) return false;
    if (navigator.deviceMemory && navigator.deviceMemory < 4) return false;
    try { return CSS.supports("backdrop-filter", "url(#x) blur(2px)"); } catch (e) { return false; }
  }
  function injectLens() {
    if (d.getElementById("lg-lens")) return;
    var ns = "http://www.w3.org/2000/svg", svg = d.createElementNS(ns, "svg");
    svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    // Low-frequency noise → smooth displacement: the backdrop bends like
    // through uneven glass; scale kept small so text behind stays shapes.
    svg.innerHTML = '<filter id="lg-lens" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="2" seed="11" result="noise"/>' +
      '<feGaussianBlur in="noise" stdDeviation="2.5" result="soft"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="soft" scale="22" xChannelSelector="R" yChannelSelector="G"/></filter>';
    (d.body || root).appendChild(svg);
  }

  // ---------------------------------------------------------------- ripples
  var PRESS = ".quiz-opt, .bpr, .btn2, .navcard, .pill, .tabbtn, .lvlcard, .order-chip, .kbtn, .outfit-opt, .hub-card, .lg-press, #backHomeBtn, .navtoggle, .profbadge";
  function ripple(e) {
    if (e.button > 0 || mq("(prefers-reduced-motion: reduce)")) return;
    var el = e.target.closest && e.target.closest(PRESS);
    if (!el || el.disabled) return;
    var r = el.getBoundingClientRect(), z = parseFloat(root.style.zoom) || 1;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    var ink = d.createElement("span"); ink.className = "lg-ink"; ink.setAttribute("aria-hidden", "true");
    var dot = d.createElement("i");
    dot.style.left = ((e.clientX - r.left) / z) + "px"; dot.style.top = ((e.clientY - r.top) / z) + "px";
    ink.appendChild(dot); el.appendChild(ink);
    setTimeout(function () { if (ink.parentNode) ink.parentNode.removeChild(ink); }, 700);
  }
  d.addEventListener("pointerdown", ripple, { passive: true });

  // ---------------------------------------------------------------- uniform toolbar
  var scrolled = false;
  function onScroll() {
    var s = (w.scrollY || root.scrollTop || 0) > 6;
    if (s !== scrolled) { scrolled = s; root.classList.toggle("lg-scrolled", s); }
  }
  w.addEventListener("scroll", onScroll, { passive: true });

  // ---------------------------------------------------------------- tab bar drop
  function setupDrop() {
    var bar = d.getElementById("tabbar"); if (!bar || bar.querySelector(".lg-drop")) return;
    var drop = d.createElement("span"); drop.className = "lg-drop"; drop.setAttribute("aria-hidden", "true");
    bar.insertBefore(drop, bar.firstChild); bar.classList.add("lg-has-drop");
    var raf = 0, place = function () {
      if (raf) return;
      // next frame: avoids "ResizeObserver loop" warnings (WebKit)
      raf = requestAnimationFrame(function () { raf = 0; placeNow(); });
    };
    var placeNow = function () {
      var on = bar.querySelector(".tabbtn.on");
      if (!on || !bar.offsetWidth) { drop.style.width = "0"; return; }
      drop.style.width = on.offsetWidth + "px";
      drop.style.transform = "translateX(" + on.offsetLeft + "px)";
    };
    new MutationObserver(place).observe(bar, { subtree: true, attributes: true, attributeFilter: ["class"] });
    w.addEventListener("resize", place);
    if (w.ResizeObserver) new ResizeObserver(place).observe(bar);
    placeNow();
  }

  function ready() {
    if (wantsRefraction()) { injectLens(); root.classList.add("lg-refract"); }
    setupDrop(); onScroll();
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", ready); else ready();
})();
