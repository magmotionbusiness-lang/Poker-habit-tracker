// Generates PWA icons, favicons and iOS splash screens from the Stakers mark.
// Usage: pnpm icons   (re-run whenever the mark or brand colours change)
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const CANVAS = "#06060d";
const steps = (fill = "#fff") => `
  <rect x="13" y="38" width="10" height="13" rx="3" fill="${fill}" fill-opacity=".55"/>
  <rect x="27" y="28" width="10" height="23" rx="3" fill="${fill}" fill-opacity=".8"/>
  <rect x="41" y="15" width="10" height="36" rx="3" fill="${fill}"/>`;
const grad = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7c5cff"/><stop offset="100%" stop-color="#4a2fd0"/></linearGradient></defs>`;

// Full-bleed square (iOS rounds corners itself; maskable needs content in the safe zone).
const square = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${grad}
  <rect width="64" height="64" fill="url(#g)"/>
  <g transform="translate(${pad} ${pad}) scale(${(64 - pad * 2) / 64})">${steps()}</g></svg>`;
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${grad}<rect width="64" height="64" rx="14" fill="url(#g)"/>${steps()}</svg>`;
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${steps("#fff")}</svg>`;

const png = (svg, size) =>
  sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

await mkdir("public/icons", { recursive: true });
await mkdir("public/splash", { recursive: true });

const out = [
  ["public/icons/icon-192.png", square(2), 192],
  ["public/icons/icon-512.png", square(2), 512],
  ["public/icons/maskable-512.png", square(12), 512],
  ["public/icons/badge-96.png", badge, 96],
  ["src/app/apple-icon.png", square(4), 180],
  ["src/app/icon.png", rounded, 64],
];
for (const [file, svg, size] of out) await writeFile(file, await png(svg, size));

// Splash: canvas + soft violet glow + centred mark. Must mirror src/config/splash.ts.
const devices = [
  [375, 667, 2],
  [414, 896, 2],
  [375, 812, 3],
  [414, 896, 3],
  [390, 844, 3],
  [428, 926, 3],
  [393, 852, 3],
  [430, 932, 3],
  [402, 874, 3],
  [440, 956, 3],
  [420, 912, 3],
  [744, 1133, 2],
  [820, 1180, 2],
  [834, 1194, 2],
  [834, 1210, 2],
  [1024, 1366, 2],
  [1032, 1376, 2],
];
for (const [w, h, dpr] of devices) {
  const W = w * dpr;
  const H = h * dpr;
  const mark = Math.round(Math.min(W, H) * 0.22);
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><radialGradient id="r" cx="50%" cy="46%" r="55%"><stop offset="0%" stop-color="#7c5cff" stop-opacity=".28"/><stop offset="100%" stop-color="#7c5cff" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="${CANVAS}"/><rect width="100%" height="100%" fill="url(#r)"/></svg>`;
  const markPng = await sharp(Buffer.from(rounded)).resize(mark, mark).png().toBuffer();
  const img = await sharp(Buffer.from(bg))
    .composite([
      { input: markPng, left: Math.round((W - mark) / 2), top: Math.round(H * 0.46 - mark / 2) },
    ])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  await writeFile(`public/splash/splash-${W}x${H}.png`, img);
}
console.log(`Generated ${out.length} icons and ${devices.length} splash screens.`);
