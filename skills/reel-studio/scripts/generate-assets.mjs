/**
 * Generates the artwork listed in plan.json's assetManifest.
 *
 * The art direction is not hard-coded here. It is read from direction.json, which
 * direction.mjs drew for this reel — so the same prompt produces a riso print in
 * one reel and a low-key night photograph in the next, and two reels never share
 * a palette by accident. If direction.json is missing, a neutral documentary
 * direction is used.
 *
 * Gemini cannot emit an alpha channel — asked for transparency it paints a fake
 * checkerboard into the pixels. So anything that has to sit on top of a scene is
 * rendered against a flat magenta backdrop that matte.mjs keys out afterwards.
 * Textures and environments are full-bleed and skip the chroma step entirely.
 *
 * Usage:
 *   node scripts/generate-assets.mjs                 # everything in the manifest
 *   node scripts/generate-assets.mjs doctor-desk     # just these
 *   node scripts/generate-assets.mjs --missing       # only what is not on disk yet
 *   node scripts/generate-assets.mjs payoff --ref doctor-desk.png
 */
import fs from "fs";
import path from "path";
import { requireKey } from "./env.mjs";

const MODEL = "gemini-3-pro-image";
const OUT = path.join(process.cwd(), "public", "art");
const key = requireKey(process.cwd());
const CONCURRENCY = 3;

/* ── Art direction ───────────────────────────────────────────────────────── */

const FALLBACK = {
  imageDirection:
    "Slightly desaturated documentary photography, cool neutral grade, soft even light, gentle film grain, crisp detail.",
  propDirection: "Object photographed straight on under soft even light, neutral grade.",
};

const direction = (() => {
  try {
    return JSON.parse(fs.readFileSync("direction.json", "utf8")).artDirection;
  } catch {
    return FALLBACK;
  }
})();

/** Chroma boilerplate, appended to anything that has to be cut out. */
const CHROMA = [
  "Place the subject on a completely flat, solid, uniform pure magenta background (hex #FF00FF) filling the entire frame edge to edge.",
  "The magenta is a chroma-key backdrop: absolutely no magenta anywhere on the subject, no shadows or reflections cast onto the backdrop, no gradient or vignette in the backdrop.",
  "Shot straight on, subject fully inside the frame with generous margin, nothing cropped at the edges.",
].join(" ");

const NO_TEXT = "No text, no logos, no watermarks, no user interface elements.";

/** The direction each kind of asset gets, on top of its own prompt. */
const directionFor = (kind) => {
  switch (kind) {
    case "texture":
      return `${direction.imageDirection} Flat top-down scan of the surface, evenly lit, seamless and tileable, no shadows, no people. ${NO_TEXT}`;
    case "environment":
      return `${direction.imageDirection} A wide establishing view of the place with no one in the foreground, composed so type can sit over the upper third. ${NO_TEXT}`;
    case "symbol":
      return `A single flat solid-black graphic shape on a pure white background, no gradients, no shading, no outline, no texture, hard clean edges, centred with generous margin. ${NO_TEXT}`;
    case "prop":
      return `${direction.propDirection} ${CHROMA} ${NO_TEXT}`;
    default:
      return `${direction.imageDirection} ${CHROMA} ${NO_TEXT}`;
  }
};

/* ── Arguments ───────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const refIndex = argv.indexOf("--ref");
const refFile = refIndex === -1 ? null : argv[refIndex + 1];
const onlyMissing = argv.includes("--missing");
const wanted = argv
  .slice(0, refIndex === -1 ? undefined : refIndex)
  .filter((a) => !a.startsWith("--"));

const plan = JSON.parse(fs.readFileSync("plan.json", "utf8"));
const manifest = plan.assetManifest ?? [];

let queue = wanted.length ? manifest.filter((a) => wanted.includes(a.name)) : manifest;
if (onlyMissing) queue = queue.filter((a) => !fs.existsSync(path.join(OUT, `${a.name}.png`)));

if (queue.length === 0) {
  console.error(
    wanted.length
      ? `No matching assets. Manifest has: ${manifest.map((a) => a.name).join(", ")}`
      : "Nothing to generate.",
  );
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

console.log(`Art direction: ${direction.name ?? "neutral documentary"}`);
console.log(`Generating ${queue.length} assets, ${CONCURRENCY} at a time.\n`);

/* ── Generation ──────────────────────────────────────────────────────────── */

const generate = async (asset) => {
  const parts = [];
  const art = directionFor(asset.kind);

  // A reference image keeps a person recognisably the same across scenes, which
  // is what makes a before/after callback land.
  const ref = refFile ?? (asset.referenceOf ? `${asset.referenceOf}.png` : null);
  if (ref && fs.existsSync(path.join(OUT, ref))) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: fs.readFileSync(path.join(OUT, ref)).toString("base64"),
      },
    });
    parts.push({
      text: `Using the person in the reference image as the exact same individual — same face, same hair, same wardrobe — ${asset.prompt} ${art}`,
    });
  } else {
    parts.push({ text: `${asset.prompt} ${art}` });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: asset.aspect || "1:1" },
        },
      }),
    },
  );

  const json = await res.json();
  if (json.error) throw new Error(json.error.message);

  const image = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!image) throw new Error("no image in response");

  const file = path.join(OUT, `${asset.name}.png`);
  fs.writeFileSync(file, Buffer.from(image.inlineData.data, "base64"));
  return `${asset.name}.png  ${asset.kind}  ${(fs.statSync(file).size / 1024).toFixed(0)}KB`;
};

// A manifest of fifteen-plus assets is slow one at a time and gets rate-limited
// all at once, so run a small pool. One retry covers the usual transient 429.
const pending = [...queue];
const failed = [];

const worker = async () => {
  while (pending.length) {
    const asset = pending.shift();
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log("OK ", await generate(asset));
        break;
      } catch (err) {
        if (attempt === 2) {
          console.log("ERR", asset.name, err.message);
          failed.push(asset.name);
        } else {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }
  }
};

await Promise.all(new Array(CONCURRENCY).fill(0).map(worker));

const symbols = queue.filter((a) => a.kind === "symbol").map((a) => `${a.name}.png`);

console.log("\nNow run: node scripts/matte.mjs");
if (symbols.length) {
  console.log(`  (it will route these flat shapes through matte-ink: ${symbols.join(", ")})`);
}
if (failed.length) {
  console.log(`\nFailed, rerun with: node scripts/generate-assets.mjs ${failed.join(" ")}`);
}
