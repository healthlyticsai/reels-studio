/**
 * Generates the collage artwork listed in plan.json's assetManifest.
 *
 * Gemini cannot emit an alpha channel — asked for transparency it paints a fake
 * checkerboard into the pixels. So every prompt is rendered against a flat magenta
 * backdrop that matte.py keys out afterwards.
 *
 * Usage:
 *   node scripts/generate-assets.mjs                 # everything in the manifest
 *   node scripts/generate-assets.mjs doctor-desk     # just these
 *   node scripts/generate-assets.mjs payoff --ref doctor-desk.png
 */
import fs from "fs";
import path from "path";
import { requireKey } from "./env.mjs";

const MODEL = "gemini-3-pro-image";
const OUT = path.join(process.cwd(), "public", "art");
const key = requireKey(process.cwd());

/** Shared art direction, so every cutout belongs to the same collage. */
const CUTOUT = [
  "Editorial magazine collage cutout of the subject, placed on a completely flat, solid, uniform pure magenta background (hex #FF00FF) that fills the entire frame edge to edge.",
  "The magenta is a chroma-key backdrop: absolutely no magenta anywhere on the subject, no shadows or reflections cast onto the backdrop, no gradient or vignette in the backdrop.",
  "Clean crisp cutout edge with a subtle 12px pure-white paper border around the subject, as if scissor-cut from a printed page.",
  "Slightly desaturated documentary photography, cool neutral grade, soft even studio light, gentle film grain.",
  "No text, no logos, no watermarks, no user interface.",
  "Shot straight on, subject fully inside the frame with generous margin, nothing cropped at the edges.",
].join(" ");

const TEXTURE = [
  "Flat top-down scan, evenly lit, seamless and tileable, no shadows, no text, no people.",
].join(" ");

const argv = process.argv.slice(2);
const refIndex = argv.indexOf("--ref");
const refFile = refIndex === -1 ? null : argv[refIndex + 1];
const wanted = argv.slice(0, refIndex === -1 ? undefined : refIndex);

const plan = JSON.parse(fs.readFileSync("plan.json", "utf8"));
const manifest = plan.assetManifest ?? [];
const queue = wanted.length ? manifest.filter((a) => wanted.includes(a.name)) : manifest;

if (queue.length === 0) {
  console.error(`No matching assets. Manifest has: ${manifest.map((a) => a.name).join(", ")}`);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

const generate = async (asset) => {
  const direction = asset.kind === "texture" ? TEXTURE : CUTOUT;
  const parts = [];

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
      text: `Using the person in the reference image as the exact same individual — same face, same hair, same wardrobe — ${asset.prompt} ${direction}`,
    });
  } else {
    parts.push({ text: `${asset.prompt} ${direction}` });
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
  return `${asset.name}.png  ${(fs.statSync(file).size / 1024).toFixed(0)}KB`;
};

for (const asset of queue) {
  try {
    console.log("OK ", await generate(asset));
  } catch (err) {
    console.log("ERR", asset.name, err.message);
  }
}

console.log("\nNow run: python3 scripts/matte.py");
console.log("Flat single-colour shapes (ink blots, silhouettes) need matte-ink.py instead.");
