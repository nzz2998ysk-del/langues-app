// iOS 27 "Liquid Glass" theming for every generated/embedded HTML page.
//
// design-system/ios27-liquid-glass.css is the single source of truth for
// values (colors, radii, blur, SF Pro type scale, motion). This module:
//   - exposes the <link> tags every page must load (`HEAD_LINKS`, `TAIL_LINK`);
//   - rewrites a page's literal design values (hex/rgba colors, radii, font
//     sizes, blur, easing, durations, shadows, font stacks) into var(--ig27-*)
//     tokens, and removes the page's own legacy --ink/--bg/--primary/...
//     definitions (design-system/ios27-app.css re-defines those names from
//     tokens, once, for all pages).
//
// Used by scripts/apply-liquid-glass.js (one-shot migration of app.html's
// ALL_PAGES + app.html chrome) and by the page generators, so a language added
// later gets exactly the same design as the existing ones. Idempotent: running
// it on an already-themed page changes nothing.

const TOKENS_HREF = "/design-system/ios27-liquid-glass.css";
const APP_HREF = "/design-system/ios27-app.css";
// Tokens go first (before the page's own <style>), the app layer last (after
// it) so the shared rules win ties against page rules.
const HEAD_LINKS = `<link rel="stylesheet" href="${TOKENS_HREF}">`;
const TAIL_LINK = `<link rel="stylesheet" href="${APP_HREF}">`;

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
const T = (name) => `var(--ig27-${name})`;
const mix = (name, pct) => `color-mix(in srgb,var(--ig27-${name}) ${pct}%,transparent)`;

// Literal color -> token, in two steps:
//  1. exact match against a value defined in the token file itself (light or
//     dark block), e.g. rgba(60,60,67,.6) -> var(--ig27-label-secondary);
//  2. otherwise a hue/lightness classifier onto the system palette. Following
//     the iOS one-tint-color model, every blue/indigo/violet hue collapses onto
//     the single accent (system blue); pastels become the matching *-soft tint;
//     neutrals become labels/backgrounds; translucency is kept via color-mix.
const fs = require("fs");
const path = require("path");
const TOKEN_FILE = path.join(__dirname, "..", "design-system", "ios27-liquid-glass.css");

function parseColor(raw) {
  let m = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  m = raw.replace(/\s+/g, "").match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : parseFloat(m[4]) };
  return null;
}
const colorKey = (c) => `${c.r},${c.g},${c.b},${Math.round(c.a * 100)}`;

// Reverse index of the token file: "r,g,b,alpha%" -> token name. Only plain
// color tokens (a single color value), first definition wins (light block).
const EXACT = (() => {
  const idx = {};
  const skip = /^(?:on-accent|white|black|glass-rim-color|highlight|scrim)$/;
  const css = fs.readFileSync(TOKEN_FILE, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of css.matchAll(/--ig27-([a-z0-9-]+)\s*:\s*(#[0-9a-f]{3,6}|rgba?\([^)]*\))\s*;/gi)) {
    const c = parseColor(m[2]);
    if (!c || skip.test(m[1])) continue;
    const k = colorKey(c);
    if (!(k in idx)) idx[k] = m[1];
  }
  return idx;
})();

function hsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}
function hueToken(h, l, s) {
  if (h < 15 || h >= 345) return "red";
  // gold/amber (the app's former brand accent) -> the tint color, like violet
  if (h >= 36 && h < 50 && s >= 0.45 && s <= 0.85 && l >= 0.35 && l <= 0.75) return "accent";
  if (h < 48) return l < 0.35 ? "brown" : "orange";
  if (h < 65) return "yellow";
  if (h < 160) return "green";
  if (h < 190) return "teal";
  if (h < 300) return "accent"; // blue, indigo, violet: one tint color
  return "pink";
}
const SOFT = new Set(["accent", "green", "red", "orange", "yellow", "pink", "indigo", "teal", "gray"]);

// Returns a token expression for a literal color. `prop` disambiguates white
// (a surface when painted as a background, a label on tint otherwise).
function mapColor(raw, prop) {
  const c = parseColor(raw);
  if (!c) return raw;
  if (c.a <= 0) return "transparent";
  const { h, s, l } = hsl(c);
  // neutral = low saturation OR tiny chroma (near-whites such as the grouped background have a
  // high HSL saturation but no visible hue)
  const neutral = s < 0.15 || (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) < 12;
  const isBg = /background/.test(prop || "");
  // Opaque neutrals are classified by role below (pure white/black also exist
  // as theme-flipping background tokens, which would invert text colors).
  const exact = !(c.a === 1 && neutral) && EXACT[colorKey(c)];
  if (exact) return T(exact);
  if (c.a < 1) {
    // translucent: base token + alpha
    let base;
    if (neutral) base = l < 0.15 ? "black" : l > 0.9 ? (isBg && c.a >= 0.5 ? "glass-regular-bg" : "white") : "gray";
    else base = hueToken(h, l, s);
    if (base === "glass-regular-bg") return T(base);
    return mix(base, Math.round(c.a * 100));
  }
  if (neutral) {
    if (l >= 0.98) return isBg ? T("bg-grouped-secondary") : T("on-accent");
    if (l >= 0.88) return T("bg-grouped-primary");
    if (l < 0.25) return T("label-primary");
    return T("label-secondary");
  }
  const hue = hueToken(h, l, s);
  if (l >= 0.85) return T((SOFT.has(hue) ? hue : "accent") + "-soft");
  if (l < 0.18) return T("label-primary");
  return T(hue);
}
const mapHex = (raw, prop) => mapColor(raw, prop);
const mapRgba = (raw, prop) => mapColor(raw, prop);

// ---------------------------------------------------------------------------
// Radii, type scale, motion
// ---------------------------------------------------------------------------
function radiusToken(px) {
  if (px >= 999) return T("radius-full");
  if (px <= 0) return T("radius-none");
  if (px <= 5) return T("radius-xs");
  if (px <= 8) return T("radius-sm");
  if (px <= 10) return T("radius-md");
  if (px <= 13) return T("radius-lg");
  if (px <= 17) return T("radius-xl");
  if (px <= 22) return T("radius-xxl");
  if (px <= 28) return T("radius-xxxl");
  return T("radius-glass");
}
// SF Pro text styles, by point size.
function typeStep(px) {
  if (px < 11.5) return "caption2";
  if (px < 12.5) return "caption1";
  if (px < 14) return "footnote";
  if (px < 15.5) return "subheadline";
  if (px < 16.5) return "callout";
  if (px < 18.5) return "body";
  if (px < 21) return "title3";
  if (px < 25) return "title2";
  if (px < 31) return "title1";
  return "large-title";
}
const DISPLAY_MAX = 36; // bigger than Large Title = emoji/glyph art, not text: left as-is
const typeDecl = (s) =>
  `font-size:${T("fs-" + s)};line-height:${T("lh-" + s)};letter-spacing:${T("ls-" + s)}`;

function easingToken(args) {
  const n = args.split(",").map((x) => parseFloat(x));
  return n[1] > 1 || n[3] > 1 ? T("ease-spring") : T("ease-standard");
}
function durationToken(sec) {
  if (sec < 0.1 || sec > 0.55) return null;
  if (sec <= 0.2) return T("duration-fast");
  if (sec <= 0.3) return T("duration-base");
  return T("duration-slow");
}

// ---------------------------------------------------------------------------
// CSS transforms
// ---------------------------------------------------------------------------
const LEGACY_VARS = [
  "ink", "muted", "muted-2", "bg", "surface", "primary", "primary-dark", "primary-light",
  "accent", "accent-dark", "accent-soft", "gold", "gold-soft", "green", "green-soft",
  "red", "red-soft", "line", "line-soft", "shadow-sm", "shadow-md", "shadow-lg",
  "ease", "ease-spring", "serif",
];
const LEGACY_DEF_RE = new RegExp(`--(?:${LEGACY_VARS.join("|")})\\s*:[^;}]*;?`, "g");

function shadowToken(value) {
  // Neutral black-only shadows -> elevation tokens; colored ones fall through
  // to the color mapper (their color becomes a token tint).
  const parts = value.split(/,(?![^(]*\))/);
  if (!parts.every((p) => /rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,/.test(p) || /^\s*none\s*$/.test(p))) return null;
  if (parts.some((p) => /inset/.test(p))) return null;
  let maxBlur = 0;
  for (const p of parts) {
    const nums = (p.replace(/rgba?\([^)]*\)/, "").match(/-?\d*\.?\d+px/g) || []).map(parseFloat);
    if (nums[2] !== undefined) maxBlur = Math.max(maxBlur, nums[2]);
  }
  if (maxBlur <= 4) return T("shadow-sm");
  if (maxBlur <= 30) return T("shadow-md");
  return T("shadow-lg");
}

// Rewrite one CSS declaration list (the inside of {...} or a style="" value).
function themeDeclarations(decls, { inBlock }) {
  // font stacks
  decls = decls.replace(/font-family\s*:\s*([^;{}"]*)/g, (m, v) =>
    /-apple-system|var\(--serif\)|Iowan|SF Pro/.test(v) ? `font-family:${T("font-family")}` : m);
  // backdrop blur
  decls = decls.replace(/blur\(\s*(\d*\.?\d+)px\s*\)(\s*saturate\(\s*[\d.]+\s*\))?/g, (m, px) => {
    const small = parseFloat(px) < 5;
    const b = small ? T("glass-small-blur") : T("glass-regular-blur");
    // decorative orbs/filters (large blur without saturate) are not glass
    if (parseFloat(px) > 20) return m;
    return `blur(${b}) saturate(${T("glass-regular-saturate")})`;
  });
  // shadows
  decls = decls.replace(/box-shadow\s*:\s*([^;{}"']*)/g, (m, v) => {
    const t = shadowToken(v);
    return t ? `box-shadow:${t}` : m;
  });
  // radii
  decls = decls.replace(/border-radius\s*:\s*(\d*\.?\d+)px\b/g, (m, px) => `border-radius:${radiusToken(parseFloat(px))}`);
  // easing + durations
  decls = decls.replace(/cubic-bezier\(([^)]*)\)/g, (m, a) => easingToken(a));
  decls = decls.replace(/((?:transition|animation)\s*:\s*)([^;{}"']*)/g, (m, p, v) =>
    p + v.replace(/(^|[\s,])(\d*\.?\d+)s\b/g, (mm, pre, n) => {
      const t = durationToken(parseFloat(n));
      return t ? pre + t : mm;
    }));
  // type scale
  decls = decls.replace(/font-size\s*:\s*(clamp\([^)]*\)|\d*\.?\d+px)/g, (m, v) => {
    let px;
    if (v.startsWith("clamp")) {
      const nums = v.match(/(\d*\.?\d+)px/g) || [];
      px = parseFloat(nums[nums.length - 1]);
      px = Math.min(px, 34);
    } else px = parseFloat(v);
    if (px > DISPLAY_MAX) return m;
    return typeDecl(typeStep(px));
  });
  // weights
  decls = decls.replace(/font-weight\s*:\s*(400|500|600|700|800)\b/g, (m, w) =>
    `font-weight:${T({ 400: "weight-regular", 500: "weight-medium", 600: "weight-semibold", 700: "weight-bold", 800: "weight-heavy" }[w])}`);
  // colors (property-aware for white)
  decls = decls.replace(/([a-z-]+)(\s*:\s*)([^;{}]*)/gi, (m, prop, sep, v) => {
    if (/^--/.test(prop)) return m;
    v = v.replace(/var\((--[a-z0-9-]+)\s*,\s*#[0-9a-fA-F]{3,6}\)/g, "var($1)");
    v = v.replace(/rgba?\([^)]*\)/g, (c) => mapRgba(c, prop));
    v = v.replace(/(?<![&\w])#[0-9a-fA-F]{6}\b|(?<![&\w])#[0-9a-fA-F]{3}\b/g, (c) => mapHex(c, prop));
    return prop + sep + v;
  });
  if (inBlock) {
    // one size token set per rule: drop the rule's own line-height/letter-spacing
    // wherever a type token was just injected
    if (/font-size:var\(--ig27-fs-/.test(decls)) {
      const parts = decls.split(/;(?![^(]*\))/);
      let seenLh = false, seenLs = false;
      decls = parts.filter((p) => {
        if (/^\s*line-height\s*:/.test(p)) { if (/--ig27-lh-/.test(p) && !seenLh) { seenLh = true; return true; } return false; }
        if (/^\s*letter-spacing\s*:/.test(p)) { if (/--ig27-ls-/.test(p) && !seenLs) { seenLs = true; return true; } return false; }
        return true;
      }).join(";");
    }
  }
  return decls;
}

function themeCss(css) {
  css = css.replace(LEGACY_DEF_RE, "");
  css = css.replace(/(^|[}\s])(?::root|html)(?:\[data-theme="dark"\])?\s*\{\s*\}/g, "$1");
  // rule bodies: text between { and } that contains no nested braces
  css = css.replace(/\{([^{}]*)\}/g, (m, body) => "{" + themeDeclarations(body, { inBlock: true }) + "}");
  return css;
}

// Inline styles and style strings built by scripts (style="", cssText,
// '<div style=...>' inside JS). Only declaration-shaped text is touched.
function themeInline(text) {
  text = text.replace(/((?:font-size|color|background|background-color|border|border-color|border-radius|box-shadow|font-family|font-weight|transition|backdrop-filter|-webkit-backdrop-filter|outline)\s*:\s*)([^;"'<>{}\\]*)/g,
    (m, p, v) => themeDeclarations(p + v, { inBlock: false }));
  // element.style.fontSize = "17px" / element.style.color = "<hex>"
  text = text.replace(/(\.style\.fontSize\s*=\s*)(["'])(\d*\.?\d+)px\2/g, (m, a, q, px) =>
    `${a}${q}${T("fs-" + typeStep(parseFloat(px)))}${q}`);
  text = text.replace(/(\.style\.(?:color|background|backgroundColor|borderColor)\s*=\s*[^;\n]*)/g, (m) =>
    m.replace(/(?<![&\w])#[0-9a-fA-F]{6}\b/g, (c) => mapHex(c)));
  // color arrays / {color:"#..."} objects used to paint DOM (confetti, level badges)
  text = text.replace(/(["'])(#[0-9a-fA-F]{6})\1/g, (m, q, c) => q + mapHex(c) + q);
  return text;
}


// ---------------------------------------------------------------------------
// Theme attribute: always explicit ("light" | "dark"), OS setting as default.
// The token file also follows prefers-color-scheme when no attribute is set,
// so the old "remove the attribute to go light" toggle could not leave dark
// mode on a device set to dark. These rewrites make light an explicit value.
// ---------------------------------------------------------------------------
const SYS_THEME = "((window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light')";
const THEME_INIT = `if(t!=='dark'&&t!=='light'){t=${SYS_THEME};} document.documentElement.setAttribute('data-theme',t);`;
function fixThemeScripts(html) {
  return html
    .split("if(t==='dark') document.documentElement.setAttribute('data-theme','dark');").join(THEME_INIT)
    .replace(/var next = isDark\(\) \? '' : 'dark';\s*if\(next\)\{ document\.documentElement\.setAttribute\('data-theme','dark'\); \}\s*else \{ document\.documentElement\.removeAttribute\('data-theme'\); \}/g,
      "var next = isDark() ? 'light' : 'dark';\n    document.documentElement.setAttribute('data-theme', next);")
    .replace(/if\(e\.newValue==='dark'\) document\.documentElement\.setAttribute\('data-theme','dark'\);\s*else document\.documentElement\.removeAttribute\('data-theme'\);/g,
      `document.documentElement.setAttribute('data-theme', (e.newValue==='dark'||e.newValue==='light') ? e.newValue : ${SYS_THEME});`);
}

function themeHtml(html) {
  html = fixThemeScripts(html);
  // 1. <style> blocks
  html = html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (m, a, css, b) => a + themeCss(css) + b);
  // 2. everything else (markup + scripts): inline declarations
  const parts = html.split(/(<style[^>]*>[\s\S]*?<\/style>)/g);
  html = parts.map((p) => (p.startsWith("<style") ? p : themeInline(p))).join("");
  // 3. stylesheet links (once)
  if (!html.includes(TOKENS_HREF)) {
    const firstStyle = html.search(/<style[^>]*>/);
    if (firstStyle !== -1) html = html.slice(0, firstStyle) + HEAD_LINKS + "\n" + html.slice(firstStyle);
    else html = html.replace(/<\/head>/i, HEAD_LINKS + "\n</head>");
  }
  if (!html.includes(APP_HREF)) {
    // after the LAST <style> in <head> so the app layer wins ties
    const headEnd = html.search(/<\/head>/i);
    if (headEnd !== -1) html = html.slice(0, headEnd) + TAIL_LINK + "\n" + html.slice(headEnd);
  }
  return html;
}

module.exports = {
  TOKENS_HREF, APP_HREF, HEAD_LINKS, TAIL_LINK,
  themeHtml, themeCss, fixThemeScripts, THEME_INIT, themeInline, mapHex, mapRgba, typeStep, radiusToken,
};
