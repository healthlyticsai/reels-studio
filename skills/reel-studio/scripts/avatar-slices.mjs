/**
 * Cuts the voiceover into one slice per scene the presenter appears in, and
 * writes avatar-jobs.json — the work list for the Higgsfield lip-sync step.
 *
 * Every slice is cut from the single master vo.mp3, so a clip lip-synced to it
 * matches the soundtrack exactly when demoTimeline.ts places it at the slice's start.
 * Slices carry a few frames of padding and include the transition out, because
 * the outgoing scene is still on screen while that transition plays.
 *
 * Re-running keeps finished jobs whose slice has not moved, and resets any whose
 * timing changed (their old clip no longer matches the audio).
 *
 * Usage: node scripts/avatar-slices.mjs
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const cwd = process.cwd();
const timelinePath = path.join(cwd, "timeline.json");
const jobsPath = path.join(cwd, "avatar-jobs.json");
if (!fs.existsSync(timelinePath)) throw new Error("No timeline.json — run node scripts/demo-timing.mjs first.");

const timeline = JSON.parse(fs.readFileSync(timelinePath, "utf8"));
if (timeline.engine === "omni") {
  console.log("This demo's presenter engine is omni: the presenter is one continuous take from");
  console.log("omni-presenter.mjs, already in sync with vo.mp3. There is nothing to slice.");
  process.exit(0);
}
const previous = fs.existsSync(jobsPath) ? JSON.parse(fs.readFileSync(jobsPath, "utf8")).jobs : [];
const fps = timeline.fps;
const vo = path.join(cwd, "assets/audio/vo.mp3");
const sliceDir = path.join(cwd, "assets/avatar/slices");
fs.mkdirSync(sliceDir, { recursive: true });
fs.mkdirSync(path.join(cwd, "assets/avatar/raw"), { recursive: true });

const jobs = [];
for (const s of timeline.scenes) {
  if (s.avatar.layout === "none") continue;
  const { start, end } = s.slice;
  const audio = `assets/avatar/slices/${s.id}.mp3`;
  const old = previous.find((j) => j.scene === s.id);
  const unchanged = old && old.fromFrame === start && old.endFrame === end && fs.existsSync(path.join(cwd, audio));

  if (!unchanged) {
    execFileSync(
      "npx",
      ["remotion", "ffmpeg", "-y", "-i", vo, "-ss", (start / fps).toFixed(3), "-to", (end / fps).toFixed(3),
       "-c:a", "libmp3lame", "-q:a", "2", path.join(cwd, audio)],
      { stdio: "ignore" },
    );
  }

  jobs.push({
    scene: s.id,
    layout: s.avatar.layout,
    says: s.says,
    fromFrame: start,
    endFrame: end,
    durationFrames: end - start,
    seconds: Number(((end - start) / fps).toFixed(2)),
    audio,
    raw: `assets/avatar/raw/${s.id}.mp4`,
    clip: `public/avatar/${s.id}.mp4`,
    status: unchanged ? old.status : "pending",
    ...(unchanged && old.note ? { note: old.note } : {}),
  });
}

fs.writeFileSync(jobsPath, JSON.stringify({ avatar: "public/" + (timeline.avatarStill ?? ""), jobs }, null, 2));

const pending = jobs.filter((j) => j.status !== "done");
const secs = pending.reduce((a, j) => a + j.seconds, 0);
console.log(`\n${jobs.length} avatar slices · ${pending.length} to generate · ${secs.toFixed(1)}s of lip-sync\n`);
for (const j of jobs) console.log(`  ${j.scene.padEnd(16)} ${j.layout.padEnd(7)} ${String(j.seconds).padStart(6)}s  ${j.status.padEnd(8)} ${j.audio}`);
console.log(
  "\nFor each pending job: lip-sync the avatar still to its audio slice in Higgsfield, save the result as its `raw`\n" +
    "path, then run node scripts/avatar-normalize.mjs.",
);
