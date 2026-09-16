/**
 * Keys the magenta chroma backdrop out of the generated art, writes real alpha, and
 * trims the transparent margin so each cutout sits tight in its box.
 *
 * Gemini returns JPEG with no alpha channel, so generate-assets.mjs renders every
 * subject against a flat #FF00FF backdrop and we remove it here.
 *
 * Three kinds are routed differently, from plan.json's manifest:
 *   texture, environment  full-bleed plates, meant to stay opaque — skipped
 *   symbol                flat single-colour shapes — handed to matte-ink.mjs,
 *                         which builds alpha from luminance so anti-aliased
 *                         edges cannot keep a magenta fringe
 *
 * Usage:
 *   node scripts/matte.mjs                  # everything in the manifest
 *   node scripts/matte.mjs doctor-desk.png  # just these
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { Jimp } from "jimp";

const DIR = path.join(process.cwd(), "public", "art");
const PAD = 4;

/**
 * Kit art that ships already prepared. The alpha check in matte() catches the
 * cutouts; opaque textures need naming, since there is no alpha to detect.
 */
const KIT_ART = new Set(["paper-grain.png"]);

const manifest = () => {
  try {
    return JSON.parse(fs.readFileSync("plan.json", "utf8")).assetManifest ?? [];
  } catch {
    return [];
  }
};

const byKind = (...kinds) =>
  new Set(manifest().filter((a) => kinds.includes(a.kind)).map((a) => `${a.name}.png`));

/** Full-bleed plates are backgrounds, not cutouts — keying them eats the image. */
const skipList = () => new Set([...KIT_ART, ...byKind("texture", "environment")]);

const matte = async (name) => {
  const img = await Jimp.read(path.join(DIR, name));
  const { width, height, data } = img.bitmap;

  // Already keyed (a re-run, or bundled kit art). Matting again would read the
  // composite as opaque and destroy the alpha, so leave it alone.
  let hasAlpha = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) {
      hasAlpha = true;
      break;
    }
  }
  if (hasAlpha) return `${name}  already has alpha, skipped`;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const maxRB = Math.max(r, b);

    // Magenta backdrop: red and blue both high, green clearly suppressed.
    const isKey = maxRB > 90 && g < maxRB * 0.62 && Math.abs(r - b) < maxRB * 0.55;

    let alpha = 0;
    if (!isKey) {
      // Soft edge: how far into "magenta-ness" this pixel sits.
      const spill = (r + b) / 2 - g;
      alpha = Math.round(255 * Math.min(1, Math.max(0, 1 - (spill - 26) / 90)));

      // Despill: pull magenta fringing off the anti-aliased cut edge.
      if (spill > 26) {
        const fix = Math.min(spill - 26, 70);
        data[i] = Math.max(0, r - fix);
        data[i + 2] = Math.max(0, b - fix);
      }
    }
    data[i + 3] = alpha;

    if (alpha > 12) {
      const px = (i / 4) % width;
      const py = Math.floor(i / 4 / width);
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
  }

  if (maxX < 0) throw new Error("keyed out entirely — the model probably ignored the magenta backdrop");

  const x = Math.max(0, minX - PAD);
  const y = Math.max(0, minY - PAD);
  img.crop({
    x,
    y,
    w: Math.min(width, maxX + 1 + PAD) - x,
    h: Math.min(height, maxY + 1 + PAD) - y,
  });
  await img.write(path.join(DIR, name));

  const out = img.bitmap;
  let opaque = 0;
  for (let i = 3; i < out.data.length; i += 4) if (out.data[i] > 12) opaque++;
  const pct = (opaque / (out.width * out.height)) * 100;
  const warn = pct > 95 ? "  <- suspiciously opaque, check the backdrop came out magenta" : "";
  return `${name}  ${out.width}x${out.height}  ${pct.toFixed(0)}% opaque${warn}`;
};

const skip = skipList();
const inks = byKind("symbol");
const explicit = process.argv.slice(2);
const names = explicit.length
  ? explicit
  : fs.readdirSync(DIR).filter((f) => f.endsWith(".png") && !skip.has(f)).sort();

for (const n of names) {
  // Flat shapes get alpha from luminance instead; chroma-keying them fringes.
  if (inks.has(n)) {
    try {
      execFileSync(process.execPath, [path.join(import.meta.dirname, "matte-ink.mjs"), n], {
        stdio: "inherit",
      });
    } catch (err) {
      console.log("ERR", n, err.message);
    }
    continue;
  }
  try {
    console.log("OK ", await matte(n));
  } catch (err) {
    console.log("ERR", n, err.message);
  }
}
