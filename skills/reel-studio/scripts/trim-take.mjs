/**
 * Cuts stumbles out of an Omni presenter take — a doubled word, a false start —
 * by removing the same time ranges from its picture and its voice together, so
 * the lip-sync survives. Much cheaper than re-filming for half a second.
 *
 * Reads assets/avatar/raw/omni-take.mp4 (kept untouched) and rewrites
 * public/avatar/take.mp4 and assets/audio/vo.mp3. Afterwards re-run
 * transcribe.mjs and demo-timing.mjs: every frame after a cut moves.
 *
 * Usage: node scripts/trim-take.mjs --cut 6.30-6.72 --cut 18.10-18.45
 *        (seconds in the original take; find them with whisper's word times)
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const cwd = process.cwd();
const raw = path.join(cwd, "assets/avatar/raw/omni-take.mp4");
if (!fs.existsSync(raw)) throw new Error("No assets/avatar/raw/omni-take.mp4 — film the take first.");

const argv = process.argv.slice(2);
const cuts = argv
  .flatMap((a, i) => (a === "--cut" ? [argv[i + 1]] : []))
  .map((c) => c.split("-").map(Number))
  .filter(([a, b]) => b > a)
  .sort((x, y) => x[0] - y[0]);
if (!cuts.length) {
  console.error("Usage: node scripts/trim-take.mjs --cut <start>-<end> [--cut …]   (seconds)");
  process.exit(1);
}

const duration = Number(
  execFileSync("npx", ["remotion", "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", raw], { encoding: "utf8" }).trim(),
);

// The ranges to keep are the gaps between the cuts.
const keep = [];
let t = 0;
for (const [a, b] of cuts) {
  if (a > t) keep.push([t, a]);
  t = Math.max(t, b);
}
if (t < duration) keep.push([t, duration]);

// Remotion's bundled ffmpeg has no trim/setpts filters, so each kept range is
// cut out with an accurate (output-side) seek and re-encoded, then the pieces are
// joined with the concat demuxer. Re-encoding every piece the same way keeps the
// join seamless.
const tmp = path.join(cwd, "assets/avatar/raw/trim-parts");
fs.mkdirSync(tmp, { recursive: true });
const pieces = keep.map(([a, b], i) => {
  const out = path.join(tmp, `part${i}.mp4`);
  execFileSync(
    "npx",
    ["remotion", "ffmpeg", "-y", "-v", "error", "-i", raw, "-ss", a.toFixed(3), "-to", b.toFixed(3),
     "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-r", "24", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", out],
    { stdio: "inherit" },
  );
  return out;
});
const list = path.join(tmp, "list.txt");
fs.writeFileSync(list, pieces.map((p) => `file '${p}'`).join("\n"));
const trimmed = path.join(cwd, "assets/avatar/raw/omni-take-trimmed.mp4");
execFileSync("npx", ["remotion", "ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", trimmed], {
  stdio: "inherit",
});
fs.rmSync(tmp, { recursive: true, force: true });

const take = path.join(cwd, "public/avatar/take.mp4");
execFileSync("npx", ["remotion", "ffmpeg", "-y", "-v", "error", "-i", trimmed, "-an", "-r", "30",
  "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", take], { stdio: "inherit" });
const vo = path.join(cwd, "assets/audio/vo.mp3");
execFileSync("npx", ["remotion", "ffmpeg", "-y", "-v", "error", "-i", trimmed, "-vn", "-c:a", "libmp3lame", "-q:a", "2", vo], { stdio: "inherit" });

const removed = cuts.reduce((s, [a, b]) => s + (b - a), 0);
console.log(`Cut ${cuts.length} range(s), ${removed.toFixed(2)}s removed: ${cuts.map(([a, b]) => `${a}–${b}s`).join(", ")}`);
console.log("Rewrote public/avatar/take.mp4 and assets/audio/vo.mp3. Next: transcribe.mjs, then demo-timing.mjs.");
