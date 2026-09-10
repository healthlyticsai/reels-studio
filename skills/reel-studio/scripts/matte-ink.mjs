/**
 * Alpha for flat single-colour shapes — ink blots, silhouettes, solid graphics.
 *
 * Chroma-keying these leaves a magenta halo on every anti-aliased edge pixel,
 * because the edge is a blend of shape and backdrop. Rebuilding alpha from
 * darkness and forcing the fill colour cannot fringe at all.
 *
 * Usage:
 *   node scripts/matte-ink.mjs ink-splatter.png            # defaults to brand slate
 *   node scripts/matte-ink.mjs logo-shape.png "#2C6BAC"
 */
import fs from "fs";
import path from "path";
import { Jimp } from "jimp";

const DIR = path.join(process.cwd(), "public", "art");

const brandSlate = () => {
  for (const candidate of ["src/brand.json", "brand.config.json"]) {
    try {
      return JSON.parse(fs.readFileSync(candidate, "utf8")).colors.slate;
    } catch {
      /* try the next one */
    }
  }
  return "#0F172A";
};

const toRgb = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const name = process.argv[2] ?? "ink-splatter.png";
const [fr, fg, fb] = toRgb(process.argv[3] ?? brandSlate());

const img = await Jimp.read(path.join(DIR, name));
const { width, height, data } = img.bitmap;

let minX = width;
let minY = height;
let maxX = -1;
let maxY = -1;

for (let i = 0; i < data.length; i += 4) {
  // The magenta backdrop is bright; the shape is dark. Alpha is how far below
  // the backdrop's luminance each pixel sits.
  const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
  const alpha = Math.round(255 * Math.min(1, Math.max(0, (165 - lum) / 55)));

  data[i] = fr;
  data[i + 1] = fg;
  data[i + 2] = fb;
  data[i + 3] = alpha;

  if (alpha > 10) {
    const px = (i / 4) % width;
    const py = Math.floor(i / 4 / width);
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }
}

if (maxX < 0) throw new Error(`${name}: nothing dark enough to keep`);

img.crop({ x: minX, y: minY, w: maxX + 1 - minX, h: maxY + 1 - minY });
await img.write(path.join(DIR, name));

const out = img.bitmap;
let opaque = 0;
for (let i = 3; i < out.data.length; i += 4) if (out.data[i] > 10) opaque++;
console.log(
  `${name}  ${out.width}x${out.height}  ${((opaque / (out.width * out.height)) * 100).toFixed(0)}% opaque`,
);
