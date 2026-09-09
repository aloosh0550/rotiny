// PWA / Service Worker offline verification (Phase 10 · J3).
// Serves the static `out/` build, lets the SW install + precache, then goes
// offline and asserts every top-level route still renders from cache and that an
// unknown route falls back to /offline/.  Run:  node scripts/pwa-check.mjs
// (expects a prior `next build` — `npm run qa` does one; or run build first.)

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";

const ROOT = "/workspaces/rotiny/out";
const PORT = 4179;
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(req.url.split("?")[0]);
    let fp = join(ROOT, p);
    try {
      if ((await stat(fp)).isDirectory()) fp = join(fp, "index.html");
    } catch {
      if (!extname(fp)) fp = join(ROOT, p.replace(/\/$/, ""), "index.html");
    }
    const body = await readFile(fp);
    res.writeHead(200, { "content-type": TYPES[extname(fp)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("404");
  }
});
await new Promise((r) => server.listen(PORT, r));
const B = `http://localhost:${PORT}`;

const ROUTES = [
  "/",
  "/plan/",
  "/tasks/",
  "/habits/",
  "/areas/",
  "/goals/",
  "/reviews/",
  "/achievements/",
  "/assistant/",
  "/adhkar/",
  "/appointments/",
  "/more/",
];

let failures = 0;
const check = (label, ok, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: "ar", serviceWorkers: "allow" });
const page = await ctx.newPage();

// 1. load once online so onboarding completes + the SW installs & precaches
await page.goto(B + "/onboarding/", { waitUntil: "domcontentloaded" });
for (let i = 0; i < 4; i++) {
  for (const bt of await page.locator("button").all()) {
    const tx = (await bt.textContent().catch(() => "")) || "";
    if (/التالي|ابدأ|هيا/.test(tx)) {
      await bt.click().catch(() => {});
      break;
    }
  }
  await page.waitForTimeout(400);
}
await page.goto(B + "/", { waitUntil: "load" });

// wait for the SW to control the page and finish precaching
const controlled = await page
  .waitForFunction(async () => {
    if (!navigator.serviceWorker?.controller) return false;
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active;
  }, null, { timeout: 15000 })
  .then(() => true)
  .catch(() => false);
check("service worker installs and controls the page", controlled);

// give the install handler time to populate the app-shell cache
await page.waitForTimeout(2500);
const shellCount = await page.evaluate(async () => {
  const keys = await caches.keys();
  const shell = keys.find((k) => k.includes("app-shell"));
  if (!shell) return 0;
  return (await (await caches.open(shell)).keys()).length;
});
check("app-shell cache is populated", shellCount >= 8, `${shellCount} entries`);

// 2. go offline and verify every route still renders
await ctx.setOffline(true);
for (const route of ROUTES) {
  const resp = await page.goto(B + route, { waitUntil: "domcontentloaded" }).catch(() => null);
  const bodyText = await page.evaluate(() => document.body?.innerText || "").catch(() => "");
  const looksOffline = /غير متصل|Offline|offline/i.test(bodyText) && route !== "/";
  const rendered = !!resp && !looksOffline && bodyText.trim().length > 0;
  check(`offline route ${route}`, rendered, rendered ? "" : "served offline fallback / blank");
}

// 3. an unknown route should fall back to /offline/
const unknown = await page
  .goto(B + "/definitely-not-a-route/", { waitUntil: "domcontentloaded" })
  .catch(() => null);
const offlineText = await page.evaluate(() => document.body?.innerText || "").catch(() => "");
check(
  "unknown route falls back to the offline page",
  !!unknown && /غير متصل|Offline|تعذّر|لا يوجد اتصال/i.test(offlineText),
  offlineText.slice(0, 40),
);

await ctx.setOffline(false);
await browser.close();
server.close();

console.log(failures ? `\n${failures} check(s) failed` : "\nPWA offline checks passed");
process.exit(failures ? 1 : 0);
