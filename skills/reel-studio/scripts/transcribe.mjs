/**
 * Transcribes the voiceover to word-level timestamps and prints the sentence
 * table the timeline is derived from.
 *
 * This is the step that makes the reel feel cut to the narration rather than
 * laid over it: every scene boundary and animation beat is anchored to a frame
 * number taken from here, not from the plan's estimates.
 *
 * First run downloads whisper.cpp and the small.en model (~500MB).
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
  downloadWhisperModel,
  installWhisperCpp,
  transcribe,
  toCaptions,
} from "@remotion/install-whisper-cpp";

const FPS = 30;
const to = path.join(process.cwd(), "whisper.cpp");
const vo = path.join(process.cwd(), "assets", "audio", "vo.mp3");

if (!fs.existsSync(vo)) {
  console.error(`No voiceover at ${vo} — phase 2 has not finished.`);
  process.exit(1);
}

await installWhisperCpp({ to, version: "1.5.5" });
await downloadWhisperModel({ model: "small.en", folder: to });

const wav = path.join(process.cwd(), "scripts", "vo16k.wav");
execSync(`npx remotion ffmpeg -i "${vo}" -ar 16000 -ac 1 "${wav}" -y`, { stdio: "ignore" });

const out = await transcribe({
  model: "small.en",
  whisperPath: to,
  whisperCppVersion: "1.5.5",
  inputPath: wav,
  tokenLevelTimestamps: true,
});

const { captions } = toCaptions({ whisperCppOutput: out });
fs.mkdirSync(path.join(process.cwd(), "src"), { recursive: true });
fs.writeFileSync("src/captions.json", JSON.stringify(captions, null, 2));

const f = (ms) => Math.round((ms / 1000) * FPS);
const end = captions.at(-1).endMs;

console.log(`\n${captions.length} tokens · voiceover ends at ${(end / 1000).toFixed(2)}s (frame ${f(end)})`);
console.log(`Suggested composition length: ${f(end) + 45} frames\n`);
console.log("Sentence boundaries — map scenes onto these, and anchor beats to individual words:\n");

let line = "";
let start = null;
for (const w of captions) {
  if (start === null) start = w.startMs;
  line += w.text;
  if (/[.?!]$/.test(w.text.trim())) {
    console.log(`  f${String(f(start)).padStart(4)}–${String(f(w.endMs)).padEnd(5)} ${line.trim()}`);
    line = "";
    start = null;
  }
}
if (line.trim()) console.log(`  f${String(f(start)).padStart(4)}–${String(f(end)).padEnd(5)} ${line.trim()}`);

console.log("\nWord-level anchors:");
console.log(`  node -e 'require("./src/captions.json").forEach(w=>process.stdout.write(w.text.trim()+"@f"+Math.round(w.startMs/1000*30)+"  "))'`);
console.log("\nWrite these into src/timing.ts. Do not use plan.json's frame estimates.");
