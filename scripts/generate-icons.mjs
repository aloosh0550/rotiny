import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const iconsDir = path.join(root, "public", "icons");
const splashDir = path.join(root, "public", "splash");
const assetsDir = path.join(root, "assets");
for (const d of [iconsDir, splashDir, assetsDir]) mkdirSync(d, { recursive: true });

// Routini brand — teal gradient (mirrors --brand-gradient in tokens.css).
const G_FROM = "#12a594";
const G_MID = "#0e7c7b";
const G_TO = "#1f7a8c";
const DARK_BG = "#0f1216";

/** The brand mark (a "daily loop" ring + node) drawn on a 24-unit grid, matching
 *  src/components/ui/Logo.tsx. `scale` maps the 24-grid into the target canvas,
 *  `tx`/`ty` position it. `sw` scales stroke weight. */
function markPaths(color, opacity = 0.92) {
  return `
    <path d="M12 3.5a8.5 8.5 0 1 1-6.01 2.49" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="12" cy="3.5" r="2.6" fill="${color}"/>
    <circle cx="12" cy="12" r="2.4" fill="${color}" fill-opacity="0.5"/>`;
}

function gradientDef() {
  return `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${G_FROM}"/>
    <stop offset="0.55" stop-color="${G_MID}"/>
    <stop offset="1" stop-color="${G_TO}"/>
  </linearGradient>`;
}

/** Rounded-tile icon: gradient background, mark at ~58% of the canvas. */
function regularSvg(size) {
  const r = size * 0.23;
  const markSize = size * 0.58;
  const scale = markSize / 24;
  const offset = (size - markSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>${gradientDef()}</defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${markPaths("#ffffff")}</g>
</svg>`;
}

/** Maskable / full-bleed: no rounding, mark inside the ~72% safe zone. */
function maskableSvg(size, { bleed = true } = {}) {
  const markSize = size * 0.5;
  const scale = markSize / 24;
  const offset = (size - markSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>${gradientDef()}</defs>
  <rect width="${size}" height="${size}" fill="${bleed ? "url(#g)" : "none"}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${markPaths("#ffffff")}</g>
</svg>`;
}

/** Android adaptive foreground: transparent bg, white mark in the safe zone. */
function foregroundSvg(size) {
  const markSize = size * 0.42;
  const scale = markSize / 24;
  const offset = (size - markSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <g transform="translate(${offset} ${offset}) scale(${scale})">${markPaths("#ffffff", 1)}</g>
</svg>`;
}

function backgroundSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>${gradientDef()}</defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
</svg>`;
}

function splashSvg(size, dark) {
  const markSize = size * 0.22;
  const scale = markSize / 24;
  const offset = (size - markSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>${gradientDef()}</defs>
  <rect width="${size}" height="${size}" fill="${dark ? DARK_BG : "#ffffff"}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${markPaths(dark ? "#2dd4bf" : G_MID, 1)}</g>
</svg>`;
}

const png = (svg, file) => sharp(Buffer.from(svg)).png().toFile(file);

async function run() {
  const regularSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  for (const size of regularSizes) await png(regularSvg(size), path.join(iconsDir, `icon-${size}.png`));
  for (const size of [192, 512]) await png(maskableSvg(size), path.join(iconsDir, `icon-maskable-${size}.png`));
  await png(regularSvg(180), path.join(iconsDir, "apple-touch-icon.png"));
  await png(regularSvg(32), path.join(iconsDir, "favicon-32.png"));
  await png(regularSvg(16), path.join(iconsDir, "favicon-16.png"));

  const favicon16 = await sharp(Buffer.from(regularSvg(16))).png().toBuffer();
  const favicon32 = await sharp(Buffer.from(regularSvg(32))).png().toBuffer();
  const { default: pngToIco } = await import("png-to-ico").catch(() => ({ default: null }));
  if (pngToIco) {
    writeFileSync(path.join(root, "src", "app", "favicon.ico"), await pngToIco([favicon16, favicon32]));
  }

  // @capacitor/assets source images
  await png(maskableSvg(1024), path.join(assetsDir, "icon-only.png"));
  await png(foregroundSvg(1024), path.join(assetsDir, "icon-foreground.png"));
  await png(backgroundSvg(1024), path.join(assetsDir, "icon-background.png"));
  await png(splashSvg(2732, false), path.join(assetsDir, "splash.png"));
  await png(splashSvg(2732, true), path.join(assetsDir, "splash-dark.png"));

  // Web splash preview
  await png(splashSvg(1200, false), path.join(splashDir, "splash-light.png"));
  await png(splashSvg(1200, true), path.join(splashDir, "splash-dark.png"));

  console.log("Generated icons, favicon, and Capacitor asset sources.");
}

run();
