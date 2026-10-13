/**
 * Widens a tight headshot into a 16:9 waist-up frame before the presenter is
 * filmed from it.
 *
 * Omni's image-to-video starts the take from the still, which is what keeps the
 * face truly the person's — but it also keeps the still's framing. A chest-up
 * headshot then gives a take that is too tight to crop for a vertical video, so
 * the vertical cut ends up all face. Extending the frame outwards (more backdrop,
 * headroom, the body down to the waist) fixes that without touching the face:
 * the model is asked to leave the original pixels alone and only paint around them.
 *
 * Writes public/avatar/avatar-wide.png and points intake.json's `avatar` at it
 * (the original stays as avatar.png). Billable: one image generation.
 *
 * Usage: node scripts/widen-avatar.mjs [--force]
 */
import fs from "fs";
import path from "path";
import { requireKey } from "./env.mjs";

const MODEL = "gemini-3-pro-image";
const cwd = process.cwd();
const intakePath = path.join(cwd, "intake.json");
const intake = JSON.parse(fs.readFileSync(intakePath, "utf8"));
const out = path.join(cwd, "public/avatar/avatar-wide.png");

if (fs.existsSync(out) && !process.argv.includes("--force")) {
  console.log("public/avatar/avatar-wide.png already exists — pass --force to regenerate.");
  process.exit(0);
}

const source = path.join(cwd, "public", intake.avatar && !intake.avatar.includes("-wide") ? intake.avatar : "avatar/avatar.png");
const key = requireKey(cwd);
const mime = source.endsWith(".png") ? "image/png" : "image/jpeg";

const prompt =
  "Extend this photograph outward into a wider 16:9 medium shot. " +
  "Keep the person exactly as they are — the same face, eyes, hair, beard, expression and skin: do not redraw, retouch or beautify the face in any way. " +
  "Reveal more of the same smooth grey studio backdrop above the head and to both sides, with generous headroom above the hair. " +
  "Continue the body down to the waist: the same charcoal textured blazer with the burgundy flower on the lapel, the same black shirt, arms relaxed, hands loosely together at waist height. " +
  "The person stays centred. Same soft studio lighting and colour, a real photograph shot on a full-frame camera, natural skin texture, no text.";

const call = async (imageConfig) => {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ inlineData: { mimeType: mime, data: fs.readFileSync(source).toString("base64") } }, { text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig },
      }),
    },
  );
  return res.json();
};

console.log(`Widening ${path.relative(cwd, source)} into a 16:9 waist-up frame with ${MODEL}…`);
// The largest size first; not every model accepts imageSize.
let json = await call({ aspectRatio: "16:9", imageSize: "4K" });
if (json.error) {
  console.log(`  4K not accepted (${json.error.message.slice(0, 120)}); retrying at the default size.`);
  json = await call({ aspectRatio: "16:9" });
}
if (json.error) throw new Error(json.error.message);
const image = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
if (!image) throw new Error(`No image returned: ${JSON.stringify(json).slice(0, 300)}`);

fs.writeFileSync(out, Buffer.from(image.inlineData.data, "base64"));
intake.avatarOriginal = intake.avatarOriginal ?? intake.avatar;
intake.avatar = "avatar/avatar-wide.png";
fs.writeFileSync(intakePath, JSON.stringify(intake, null, 2));
console.log(`Wrote public/avatar/avatar-wide.png (${(fs.statSync(out).size / 1024).toFixed(0)} KB); intake.json now films from it.`);
console.log("Look at it before filming: the face must be unchanged.");
