// CSP / security-headers verification (Phase 15).
// Serves the static `out/` build and navigates every top-level route with a real
// browser, failing on ANY Content-Security-Policy violation (blocked script,
// style, connection, frame, …). Run:  node scripts/csp-check.mjs
// (expects a prior `next build` — `npm run qa` does one.)

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";

const ROOT = "/workspaces/rotiny/out";
const PORT = 4181;
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
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
  "/onboarding/",
  "/",
  "/plan/",
  "/tasks/",
  "/tasks/?add=1",
  "/habits/",
  "/appointments/",
  "/areas/",
  "/goals/",
  "/reviews/",
  "/achievements/",
  "/assistant/",
  "/adhkar/",
  "/search/",
  "/more/",
  "/more/settings/",
  "/more/settings/ai/",
  "/more/settings/backup/",
  "/more/settings/notifications/",
];

// A real violation blocks something. The "frame-ancestors ignored in <meta>" line
// is informational (that directive is delivered via the HTTP header instead).
const CSP_RE =
  /refused to (load|execute|connect|frame|apply)|violates the following content security policy|blocked by content security policy/i;

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: "ar" });
const page = await ctx.newPage();

const violations = [];
page.on("console", (m) => {
  const t = m.text();
  if (CSP_RE.test(t)) violations.push(t);
});
page.on("pageerror", (e) => {
  if (CSP_RE.test(String(e))) violations.push(String(e));
});

// meta CSP must actually be present
await page.goto(B + "/", { waitUntil: "domcontentloaded" });
const hasMeta = await page.$eval(
  'meta[http-equiv="Content-Security-Policy"]',
  (el) => el.getAttribute("content") || "",
).catch(() => "");
if (!hasMeta) {
  console.log("FAIL  no <meta http-equiv=Content-Security-Policy> in the page");
  process.exit(1);
}
for (const dir of ["default-src 'self'", "object-src 'none'", "connect-src", "base-uri 'self'", "form-action 'self'"]) {
  if (!hasMeta.includes(dir)) {
    console.log(`FAIL  CSP missing "${dir}"`);
    process.exit(1);
  }
}
if (hasMeta.includes("script-src") && hasMeta.includes("'unsafe-eval'")) {
  console.log("FAIL  CSP allows 'unsafe-eval'");
  process.exit(1);
}
console.log("PASS  meta CSP present + core directives set");

// walk every route, run the onboarding flow, exercise a form
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
for (const route of ROUTES) {
  await page.goto(B + route, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(500);
}

await browser.close();
server.close();

if (violations.length) {
  console.log(`\nFAIL  ${violations.length} CSP violation(s):`);
  for (const v of violations.slice(0, 20)) console.log("  - " + v.slice(0, 200));
  process.exit(1);
}
console.log(`\nPASS  no CSP violations across ${ROUTES.length} routes`);
process.exit(0);
