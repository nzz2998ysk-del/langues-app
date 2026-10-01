// Responsive non-regression suite: starts the real server on a throwaway
// database, then drives real browsers through a matrix of devices and checks:
//   - no horizontal overflow on the main pages,
//   - the quiz fits on screen without scrolling, before and after answering,
//   - touch targets are at least 44×44 px on touch screens,
//   - device detection (data-device / data-input / data-orient) is right,
//   - the debug panel (?debug=device) renders,
//   - the login sheet fits, Liquid Glass and its transparency setting work,
//   - the subscription page shows the full Free / Premium comparison.
//
//   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/langues_test \
//   BROWSERS=chromium,firefox,webkit npm run test:responsive
//
// The database is wiped before the run: never point this at real data.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const path = require("node:path");
const { Pool } = require("pg");

let pw = null;
try { pw = require(process.env.PW || "playwright"); } catch (e) { /* not installed */ }
const DB = process.env.TEST_DATABASE_URL;
const skip = (!DB && "TEST_DATABASE_URL not set") || (!pw && "playwright not installed");
const PORT = 3800 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const BROWSERS = (process.env.BROWSERS || "chromium").split(",").map((s) => s.trim()).filter(Boolean);
const EMAIL = "resp@example.com", PASSWORD = "motdepasse123";

const UA = {
  ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  tv: "Mozilla/5.0 (SMART-TV; Linux; Tizen 8.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/8.0 TV Safari/537.36",
};
// expected data-device for each profile
const DEVICES = [
  { name: "galaxy-fold-folded", w: 280, h: 653, touch: true, ua: UA.android, expect: "phone" },
  { name: "iphone-se", w: 320, h: 568, touch: true, ua: UA.ios, expect: "phone" },
  { name: "iphone-15", w: 393, h: 852, touch: true, ua: UA.ios, expect: "phone" },
  { name: "phone-landscape", w: 852, h: 393, touch: true, ua: UA.ios, expect: "phone" },
  { name: "small-landscape", w: 568, h: 320, touch: true, ua: UA.ios, expect: "phone" },
  { name: "ipad-portrait", w: 820, h: 1180, touch: true, ua: UA.ipad, expect: "tablet" },
  { name: "laptop", w: 1366, h: 768, touch: false, expect: "laptop" },
  { name: "desktop", w: 1920, h: 1080, touch: false, expect: "desktop" },
  { name: "tv-4k", w: 3840, h: 2160, touch: false, ua: UA.tv, expect: "tv" },
];

let server, pool, userState;

before(async () => {
  if (skip) return;
  pool = new Pool({ connectionString: DB });
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  server = spawn(process.execPath, [path.join(__dirname, "..", "..", "server.js")], {
    env: { ...process.env, PORT: String(PORT), DATABASE_URL: DB, JWT_SECRET: "resp-" + crypto.randomBytes(8).toString("hex"), NODE_ENV: "test", RESEND_API_KEY: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("server did not start")), 60000);
    server.stdout.on("data", (d) => { if (String(d).includes("listening")) { clearTimeout(t); resolve(); } });
    server.on("exit", (code) => reject(new Error("server exited " + code)));
  });
  // one account, its session cookie reused by every browser context
  const r = await fetch(BASE + "/api/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: "Test" }) });
  assert.equal(r.status, 201);
  const cookie = r.headers.getSetCookie().map((c) => c.split(";")[0]).find((c) => c.startsWith("langues_session="));
  userState = { cookies: [{ name: "langues_session", value: cookie.split("=").slice(1).join("="), domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" }], origins: [] };
});
after(async () => {
  if (server) server.kill();
  if (pool) await pool.end();
});

function contextOptions(browserName, d, state) {
  const o = { viewport: { width: d.w, height: d.h }, hasTouch: d.touch, deviceScaleFactor: d.touch ? 2 : 1 };
  if (d.ua) o.userAgent = d.ua;
  if (browserName !== "firefox") o.isMobile = d.touch; // Firefox has no mobile emulation
  if (state) o.storageState = state;
  return o;
}
// elements sticking out of the viewport without a clipping ancestor
const overflowOf = (target) => target.evaluate(() => {
  const root = document.documentElement, cw = root.clientWidth;
  if (root.style.zoom) return root.scrollWidth > cw + 1 ? ["page scrolls"] : [];
  const clipped = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) if (getComputedStyle(a).overflowX !== "visible") return true; return false; };
  const out = [];
  document.querySelectorAll("body *").forEach((e) => {
    const r = e.getBoundingClientRect();
    if (r.width && r.height && (r.right > cw + 1 || r.left < -1) && !clipped(e) && getComputedStyle(e).position !== "fixed") out.push((e.id ? "#" + e.id : e.tagName.toLowerCase() + "." + String(e.className).split(" ")[0]) + " +" + Math.round(r.right - cw));
  });
  return out.slice(0, 5);
});
const smallTargets = (target) => target.evaluate(() => {
  const out = [];
  document.querySelectorAll("button, a[href], select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), [role=button], summary").forEach((e) => {
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (!r.width || !r.height || cs.visibility === "hidden" || e.closest("[hidden]")) return;
    if (e.tagName === "A" && cs.display === "inline") return; // links inside sentences
    if ((r.height < 43 && r.width < 43) || Math.max(r.width, r.height) < 43 || Math.min(r.width, r.height) < 24) out.push(((e.getAttribute("aria-label") || e.textContent || e.tagName).trim().slice(0, 18)) + " " + Math.round(r.width) + "x" + Math.round(r.height));
  });
  return out.slice(0, 5);
});
async function courseFrame(page, name) {
  for (let i = 0; i < 20; i++) {
    for (const f of page.frames()) { try { if (await f.evaluate(() => document.body && document.body.dataset.page) === name) return f; } catch (e) { /* detached */ } }
    await page.waitForTimeout(250);
  }
  throw new Error("course page not found: " + name);
}
async function quizFits(page, frame, d) {
  const box = await (await frame.frameElement()).boundingBox();
  const m = await frame.evaluate(() => {
    const main = document.querySelector("main.con");
    const last = [...document.querySelectorAll(".quiz-opt")].filter((o) => o.offsetParent).pop();
    const next = document.getElementById("next");
    const bottom = Math.max(last ? last.getBoundingClientRect().bottom : 0, next ? next.getBoundingClientRect().bottom : 0);
    return { quizMode: document.body.classList.contains("quiz-mode"), overflow: main.scrollHeight - main.clientHeight, fallback: main.classList.contains("qz-scroll"), bottom, ih: innerHeight };
  });
  const ok = m.quizMode && m.overflow <= 1 && !m.fallback && m.bottom <= m.ih + 1 && box.y >= -1 && box.y + box.height <= d.h + 1;
  return { ok, ...m, frameTop: Math.round(box.y), frameBottom: Math.round(box.y + box.height) };
}

for (const browserName of BROWSERS) {
  test(`responsive matrix on ${browserName}`, { skip, timeout: 30 * 60 * 1000 }, async (t) => {
    const browser = await pw[browserName].launch();
    try {
      for (const d of DEVICES) {
        await t.test(`${browserName} · ${d.name} (${d.w}×${d.h})`, async () => {
          const problems = [];
          // logged out: landing page + device detection + debug panel
          const lctx = await browser.newContext(contextOptions(browserName, d));
          const lp = await lctx.newPage();
          await lp.goto(BASE + "/?debug=device");
          await lp.waitForTimeout(900);
          const det = await lp.evaluate(() => ({ device: document.documentElement.dataset.device, input: document.documentElement.dataset.input, orient: document.documentElement.dataset.orient, panel: !!document.getElementById("papoteDeviceDebug") }));
          if (det.device !== d.expect) problems.push(`detected ${det.device}, expected ${d.expect}`);
          if (!det.panel) problems.push("debug panel missing");
          if (d.touch && det.input === "mouse") problems.push("touch screen detected as mouse");
          if (det.orient !== (d.w > d.h ? "landscape" : "portrait")) problems.push("orientation " + det.orient);
          const lo = await overflowOf(lp); if (lo.length) problems.push("landing overflow: " + lo.join(", "));
          if (d.touch) { const st = await smallTargets(lp); if (st.length) problems.push("landing small targets: " + st.join(", ")); }
          // login sheet: covers the whole screen, the submit button is on screen
          await lp.evaluate(() => openAuth("login")); // eslint-disable-line no-undef
          await lp.waitForTimeout(700);
          const auth = await lp.evaluate(() => {
            const btn = document.getElementById("authSubmitBtn").getBoundingClientRect(), sheet = document.getElementById("authSheet").getBoundingClientRect();
            const z = parseFloat(document.documentElement.style.zoom) || 1;
            // clientWidth, not innerWidth: WebKit counts a classic scrollbar in innerWidth
            const vw = document.documentElement.clientWidth, k = z > 1 ? z : 1;
            return { btnOk: btn.top >= 0 && btn.bottom <= innerHeight + 1, sheetOk: sheet.left * k <= 1 && sheet.right * k >= vw - 2, sheetW: Math.round(sheet.width * k), vw };
          });
          if (!auth.btnOk) problems.push("login button off screen");
          if (!auth.sheetOk) problems.push(`login backdrop does not cover the screen (${auth.sheetW} < ${auth.vw})`);
          // Liquid Glass is active and the transparency setting applies
          const glass = await lp.evaluate(() => {
            const nav = document.querySelector("header.nav"), cs = getComputedStyle(nav);
            const blur = (cs.backdropFilter && cs.backdropFilter !== "none") || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== "none");
            const supports = CSS.supports("backdrop-filter", "blur(2px)") || CSS.supports("-webkit-backdrop-filter", "blur(2px)");
            window.PapoteGlass.set(100);
            const solid = document.documentElement.dataset.glass;
            window.PapoteGlass.set(50);
            return { ok: !!window.PapoteGlass, blur: !!blur, supports, solid };
          });
          if (!glass.ok) problems.push("PapoteGlass missing");
          if (glass.supports && !glass.blur) problems.push("glass bar has no backdrop blur");
          if (glass.solid !== "solid") problems.push("transparency slider not applied");
          await lctx.close();

          const ctx = await browser.newContext(contextOptions(browserName, d, userState));
          const page = await ctx.newPage();
          const errors = []; page.on("pageerror", (e) => { if (!/ResizeObserver loop/.test(e.message)) errors.push(e.message); }); // benign browser notice
          for (const p of ["/profile", "/subscribe", "/ideas"]) {
            await page.goto(BASE + p); await page.waitForTimeout(p === "/subscribe" ? 1200 : 500);
            const o = await overflowOf(page); if (o.length) problems.push(`${p} overflow: ${o.join(", ")}`);
            if (p === "/subscribe") {
              const sub = await page.evaluate(() => ({ rows: document.querySelectorAll(".cmp-row").length, cta: !!document.getElementById("goBtn"), free: document.querySelector(".cmp-head").textContent }));
              if (sub.rows < 20 || !sub.cta) problems.push("subscribe comparison incomplete: " + JSON.stringify(sub));
            }
            if (p === "/profile" && !(await page.$("#glassRange"))) problems.push("transparency slider missing in profile");
          }
          await page.goto(BASE + "/"); await page.waitForTimeout(2500);
          const ho = await overflowOf(page); if (ho.length) problems.push("home overflow: " + ho.join(", "));
          await page.evaluate(() => openLang("de")); // eslint-disable-line no-undef
          let f = await courseFrame(page, "hub");
          for (const name of ["hub", "vocabulaire", "grammaire", "exercices"]) {
            if (name !== "hub") { await f.evaluate((n) => window.__nav(n), name); await page.waitForTimeout(900); f = await courseFrame(page, name); }
            await page.waitForTimeout(400);
            const o = await overflowOf(f); if (o.length) problems.push(`course ${name} overflow: ${o.join(", ")}`);
            if (d.touch) { const st = await smallTargets(f); if (st.length) problems.push(`course ${name} small targets: ${st.join(", ")}`); }
          }
          // quiz: no scrolling to answer, before and after answering
          await f.$eval('[data-mode="mcq"]', (e) => e.click());
          await page.waitForTimeout(900);
          const q1 = await quizFits(page, f, d);
          if (!q1.ok) problems.push("quiz does not fit: " + JSON.stringify(q1));
          const bar = await f.$eval(".pbar", (b) => ({ role: b.getAttribute("role"), now: b.getAttribute("aria-valuenow"), label: b.querySelector(".pbar-label").textContent }));
          if (bar.role !== "progressbar" || !/1\/10/.test(bar.label)) problems.push("progress bar: " + JSON.stringify(bar));
          await f.$eval(".quiz-opt", (e) => e.click());
          await page.waitForTimeout(700);
          const q2 = await quizFits(page, f, d);
          if (!q2.ok) problems.push("quiz feedback does not fit: " + JSON.stringify(q2));
          if (d.touch) { const st = await smallTargets(f); if (st.length) problems.push("quiz small targets: " + st.join(", ")); }
          // leaving the quiz gives the page back its normal layout
          await f.$eval("#quitQuiz", (e) => e.click());
          await page.waitForTimeout(600);
          const back = await page.evaluate(() => document.body.classList.contains("immersive"));
          if (back) problems.push("app still immersive after leaving the quiz");
          if (errors.length) problems.push("page errors: " + errors.slice(0, 3).join(" | "));
          await ctx.close();
          assert.deepEqual(problems, [], problems.join("\n"));
        });
      }
    } finally {
      await browser.close();
    }
  });
}
