/**
 * Builds a contact sheet so generated art and rendered video can actually be looked at.
 *
 * Bad mattes and layout collisions are invisible in code and obvious in a picture.
 * Art is composited over hot pink so a failed key is unmissable.
 *
 * Usage:
 *   node scripts/contact-sheet.mjs public/art /tmp/contact.png
 *   node scripts/contact-sheet.mjs --video out/reel.mp4 /tmp/final.png [--every 4]
 */
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { Jimp } from "jimp";

const PINK = 0xff50b4ff;
const THUMB = 300;

const grid = async (images, out) => {
  if (images.length === 0) throw new Error("nothing to put in the sheet");
  const cols = Math.min(5, images.length);
  const rows = Math.ceil(images.length / cols);
  const w = Math.max(...images.map((i) => i.bitmap.width));
  const h = Math.max(...images.map((i) => i.bitmap.height));

  const sheet = new Jimp({ width: w * cols, height: h * rows, color: 0xffffffff });
  // Centre each thumbnail in its cell — cutouts vary in aspect, and ragged
  // placement makes it harder to spot the one that came back wrong.
  images.forEach((im, i) => {
    const cx = w * (i % cols) + Math.round((w - im.bitmap.width) / 2);
    const cy = h * Math.floor(i / cols) + Math.round((h - im.bitmap.height) / 2);
    sheet.composite(im, cx, cy);
  });
  await sheet.write(out);
  console.log(`${out}  ${sheet.bitmap.width}x${sheet.bitmap.height}  (${images.length} frames)`);
};

const fromArt = async (folder, out) => {
  const files = fs
    .readdirSync(folder)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .sort();

  const images = [];
  for (const name of files) {
    const im = await Jimp.read(path.join(folder, name));
    // Composite over hot pink: a failed key shows as a magenta rectangle, and a
    // clean cutout shows its white paper border against a colour nothing uses.
    const bg = new Jimp({ width: im.bitmap.width, height: im.bitmap.height, color: PINK });
    bg.composite(im, 0, 0);
    bg.resize({ w: THUMB });
    images.push(bg);
  }
  await grid(images, out);
};

const fromVideo = async (video, out, every) => {
  const probe = execFileSync(
    "npx",
    ["remotion", "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video],
    { encoding: "utf8" },
  );
  const duration = parseFloat(probe.trim().split("\n").at(-1));

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sheet-"));
  const images = [];
  for (let t = 1; t < duration; t += every) {
    const frame = path.join(tmp, `${t}.png`);
    try {
      execFileSync(
        "npx",
        ["remotion", "ffmpeg", "-ss", String(t), "-i", video, "-frames:v", "1", "-vf", `scale=${THUMB}:-1`, frame, "-y"],
        { stdio: "ignore" },
      );
      if (fs.existsSync(frame)) images.push(await Jimp.read(frame));
    } catch {
      /* a frame past the end is not worth failing the sheet over */
    }
  }
  await grid(images, out);
  fs.rmSync(tmp, { recursive: true, force: true });
};

const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.error("Usage: contact-sheet.mjs <art-folder|--video <mp4>> <out.png> [--every N]");
  process.exit(1);
}

if (argv[0] === "--video") {
  const everyIdx = argv.indexOf("--every");
  await fromVideo(argv[1], argv[2], everyIdx === -1 ? 4 : Number(argv[everyIdx + 1]));
} else {
  await fromArt(argv[0], argv[1]);
}
