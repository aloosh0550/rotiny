import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";

const ROOT = "/workspaces/rotiny/out";
const PORT = 4178;
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
    let p = decodeURIComponent(req.url.split("?")[0]);
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
const SAFE = ".pt-safe{padding-top:28px!important}.pb-safe{padding-bottom:24px!important}";
const SCREENS = [
  ["home", "/"],
  ["tasks", "/tasks/"],
  ["taskform", "/tasks/?add=1"],
  ["habits", "/habits/"],
  ["habitadd", "/habits/?add=1"],
  ["appointments", "/appointments/"],
  ["adhkar", "/adhkar/"],
  ["plan", "/plan/"],
  ["summary", "/more/summary/"],
  ["settings", "/more/settings/"],
  ["settings-notifications", "/more/settings/notifications/"],
  ["settings-prayer", "/more/settings/prayer/"],
  ["settings-calendar", "/more/settings/calendar/"],
];

const b = await chromium.launch({ args: ["--disable-dev-shm-usage", "--no-sandbox"] });
for (const width of [360, 393]) {
  const ctx = await b.newContext({
    viewport: { width, height: 820 },
    deviceScaleFactor: 1.5,
    isMobile: true,
    hasTouch: true,
    locale: "ar",
    colorScheme: "dark",
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("routini:theme", "dark");
      localStorage.setItem("routini:locale", "ar");
    } catch {}
  });
  const p = await ctx.newPage();
  await p.goto(B + "/onboarding/", { waitUntil: "domcontentloaded" });
  for (let i = 0; i < 4; i++) {
    for (const bt of await p.locator("button").all()) {
      const tx = (await bt.textContent().catch(() => "")) || "";
      if (/التالي|ابدأ|هيا/.test(tx)) {
        await bt.click().catch(() => {});
        break;
      }
    }
    await p.waitForTimeout(450);
  }
  await p.waitForTimeout(1200);
  for (const [name, path] of SCREENS) {
    await p.goto(B + path, { waitUntil: "domcontentloaded" });
    await p.addStyleTag({ content: SAFE }).catch(() => {});
    await p.waitForTimeout(1000);
    // "taskform" — open the full task form Sheet (the options button on the quick-add bar)
    if (name === "taskform") {
      await p
        .locator('button[aria-label]:has(svg.lucide-sliders-horizontal)')
        .first()
        .click({ timeout: 3000 })
        .catch(async () => {
          // fallback: 2nd button in the quick-add form row
          await p.locator("form button").nth(0).click({ timeout: 2000 }).catch(() => {});
        });
      await p.waitForTimeout(700);
      // scroll the sheet so the new fields (energy cost / planned-for / context) show
      await p
        .evaluate(() => {
          const sc = [...document.querySelectorAll("form, [class*='overflow']")].find(
            (el) => el.scrollHeight > el.clientHeight,
          );
          if (sc) sc.scrollTop = sc.scrollHeight;
        })
        .catch(() => {});
      await p.waitForTimeout(400);
    }
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await p.screenshot({ path: `/tmp/qa/${width}_${name}.png` });
    console.log(`${width} ${name}`.padEnd(32), ov > 1 ? `⚠ overflow ${ov}px` : "ok");
  }
  await p.goto(B + "/", { waitUntil: "domcontentloaded" });
  await p.addStyleTag({ content: SAFE }).catch(() => {});
  await p.waitForTimeout(700);
  try {
    await p.locator("button.fixed").last().click({ timeout: 3000 });
    await p.waitForTimeout(500);
    await p.locator("input").first().fill("اجتماع مع احمد الخميس الساعة 4");
    await p.getByRole("button", { name: /تأكيد|Confirm/ }).first().click();
    await p.waitForTimeout(700);
    await p.screenshot({ path: `/tmp/qa/${width}_smartadd.png` });
    console.log(`${width} smartadd`.padEnd(32), "ok");
  } catch (e) {
    console.log(`${width} smartadd`.padEnd(32), "fail:", e.message.split("\n")[0]);
  }
  await ctx.close();
}
await b.close();
server.close();
console.log("QA DONE");
