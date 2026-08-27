import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const GRADIENT_FROM = "#8b5cf6";
const GRADIENT_TO = "#4f8cff";

// Regular (non-maskable) icon: rounded-square gradient background, glyph fills most of the canvas.
function regularSvg(size) {
  const r = size * 0.22;
  const glyphR = size * 0.34;
  const dotR = size * 0.075;
  const cx = size / 2;
  const cy = size / 2;
  const dotCy = size * 0.195;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GRADIENT_FROM}"/>
      <stop offset="1" stop-color="${GRADIENT_TO}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/>
  <circle cx="${cx}" cy="${cy}" r="${glyphR}" fill="none" stroke="white" stroke-opacity="0.55" stroke-width="${size * 0.035}" stroke-dasharray="${size * 0.045} ${size * 0.07}" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${dotCy}" r="${dotR}" fill="white"/>
</svg>`;
}

// Maskable icon: edge-to-edge background (no rounding — the OS applies its own mask shape),
// glyph scaled down and centered within the ~80% safe zone.
function maskableSvg(size) {
  const glyphR = size * 0.27;
  const dotR = size * 0.06;
  const cx = size / 2;
  const cy = size / 2;
  const dotCy = size * 0.28;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GRADIENT_FROM}"/>
      <stop offset="1" stop-color="${GRADIENT_TO}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
  <circle cx="${cx}" cy="${cy}" r="${glyphR}" fill="none" stroke="white" stroke-opacity="0.55" stroke-width="${size * 0.028}" stroke-dasharray="${size * 0.035} ${size * 0.055}" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${dotCy}" r="${dotR}" fill="white"/>
</svg>`;
}

const regularSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const maskableSizes = [192, 512];

async function run() {
  for (const size of regularSizes) {
    await sharp(Buffer.from(regularSvg(size))).png().toFile(path.join(outDir, `icon-${size}.png`));
  }
  for (const size of maskableSizes) {
    await sharp(Buffer.from(maskableSvg(size))).png().toFile(path.join(outDir, `icon-maskable-${size}.png`));
  }
  await sharp(Buffer.from(regularSvg(180))).png().toFile(path.join(outDir, "apple-touch-icon.png"));
  await sharp(Buffer.from(regularSvg(32))).png().toFile(path.join(outDir, "favicon-32.png"));
  await sharp(Buffer.from(regularSvg(16))).png().toFile(path.join(outDir, "favicon-16.png"));

  // favicon.ico: 16px + 32px PNG frames only, to keep the file small.
  const favicon16 = await sharp(Buffer.from(regularSvg(16))).png().toBuffer();
  const favicon32 = await sharp(Buffer.from(regularSvg(32))).png().toBuffer();
  const { default: pngToIco } = await import("png-to-ico").catch(() => ({ default: null }));
  if (pngToIco) {
    const ico = await pngToIco([favicon16, favicon32]);
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path.join(__dirname, "..", "src", "app", "favicon.ico"), ico);
  }

  console.log("Icons generated in", outDir);
}

run();
