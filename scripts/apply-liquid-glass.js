// One-shot (and re-runnable) migration: applies the iOS 27 Liquid Glass theme
// (scripts/liquid-glass.js) to every page embedded in app.html's ALL_PAGES.
//   node scripts/apply-liquid-glass.js           -> rewrites app.html in place
//   node scripts/apply-liquid-glass.js --dry-run -> only reports what would change
// Idempotent: a second run reports 0 changed pages.
const fs = require("fs");
const path = require("path");
const { themeHtml } = require("./liquid-glass");

const appPath = path.join(__dirname, "..", "app.html");
const dry = process.argv.includes("--dry-run");
const src = fs.readFileSync(appPath, "utf8");
const PREFIX = "var ALL_PAGES = ";
const start = src.indexOf(PREFIX);
if (start === -1) { console.error("ALL_PAGES not found"); process.exit(1); }
const lineEnd = src.indexOf("\n", start);
let literal = src.slice(start + PREFIX.length, lineEnd).trim();
if (literal.endsWith(";")) literal = literal.slice(0, -1);
const pages = JSON.parse(literal);

let changed = 0;
for (const key of Object.keys(pages)) {
  const next = themeHtml(pages[key]);
  if (next !== pages[key]) { changed++; pages[key] = next; }
}
// JSON.stringify leaves "/" alone; escape "</" so no embedded "</script>"
// can close the <script> that wraps ALL_PAGES.
const out = JSON.stringify(pages).replace(/<\//g, "<\\/");
const next = src.slice(0, start) + PREFIX + out + ";" + src.slice(lineEnd);
console.log(`${changed}/${Object.keys(pages).length} pages changed`);
if (!dry) fs.writeFileSync(appPath, next);
