/**
 * Conforms each lip-synced clip Higgsfield returned to what the composition
 * needs — 30fps H.264, no audio, exactly its slice's length — and marks its job
 * done or in need of a retake. Then re-runs demo-timing.mjs so demoTimeline.ts picks
 * the clips up.
 *
 * A clip noticeably shorter than its slice cannot be fixed by trimming: the
 * mouth would stop before the words do. Those are converted anyway so the layout
 * can be checked, and flagged as `retake`.
 *
 * Usage:
 *   node scripts/avatar-normalize.mjs           # every raw clip newer than its output
 *   node scripts/avatar-normalize.mjs --force   # all of them
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const TOLERANCE = 3;
const cwd = process.cwd();
const jobsPath = path.join(cwd, "avatar-jobs.json");
if (!fs.existsSync(jobsPath)) throw new Error("No avatar-jobs.json — run node scripts/avatar-slices.mjs first.");

const file = JSON.parse(fs.readFileSync(jobsPath, "utf8"));
const force = process.argv.includes("--force");
const fps = 30;

/** Any common video extension under the job's raw name. */
const findRaw = (job) => {
  const base = path.join(cwd, job.raw.replace(/\.mp4$/, ""));
  return [".mp4", ".mov", ".webm", ".mkv"].map((e) => base + e).find((p) => fs.existsSync(p)) ?? null;
};

const probeSeconds = (p) =>
  Number(
    execFileSync("npx", ["remotion", "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], {
      encoding: "utf8",
    }).trim(),
  );

let changed = 0;
for (const job of file.jobs) {
  const raw = findRaw(job);
  if (!raw) continue;
  const out = path.join(cwd, job.clip);
  if (!force && fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(raw).mtimeMs && job.status === "done") continue;

  const rawFrames = Math.round(probeSeconds(raw) * fps);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync(
    "npx",
    ["remotion", "ffmpeg", "-y", "-i", raw, "-an", "-r", String(fps), "-t", (job.durationFrames / fps).toFixed(3),
     "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", out],
    { stdio: "ignore" },
  );

  const short = job.durationFrames - rawFrames;
  if (short > TOLERANCE) {
    job.status = "retake";
    job.note = `Clip is ${rawFrames} frames, slice is ${job.durationFrames} — ${short} short. Regenerate from ${job.audio}.`;
  } else {
    job.status = "done";
    delete job.note;
  }
  changed++;
  console.log(`  ${job.scene.padEnd(16)} ${job.status.padEnd(7)} ${rawFrames}/${job.durationFrames} frames${job.note ? "  — " + job.note : ""}`);
}

fs.writeFileSync(jobsPath, JSON.stringify(file, null, 2));
const left = file.jobs.filter((j) => j.status !== "done");
console.log(`\n${changed} clip(s) normalised · ${file.jobs.length - left.length}/${file.jobs.length} done`);
if (left.length) console.log(`Still to do: ${left.map((j) => `${j.scene} (${j.status})`).join(", ")}`);

if (changed) {
  console.log("\nRefreshing src/demoTimeline.ts with the clips…");
  execFileSync(process.execPath, [path.join(import.meta.dirname, "demo-timing.mjs")], { stdio: "inherit" });
}
