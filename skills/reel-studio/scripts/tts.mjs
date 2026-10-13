/**
 * Voices the demo script and writes assets/audio/vo.mp3.
 *
 * That one file is the demo's clock: it is transcribed for the timeline, sliced
 * for the avatar lip-sync, and played as the only voice track. So it is made
 * once, from the approved script, and a re-voice means re-running the timing
 * and the avatar slices after it.
 *
 * The script comes from plan.json (the approved, scene-split story), falling
 * back to intake.json's story. The provider and voice come from intake.json's
 * `voice` (set in the Studio): Google Chirp 3 HD by default, or ElevenLabs.
 *
 * Usage:
 *   node scripts/tts.mjs                         # voice it with the intake's choice
 *   node scripts/tts.mjs --force                 # replace an existing vo.mp3 (kept as vo.prev.mp3)
 *   node scripts/tts.mjs --provider elevenlabs   # override the provider for this run
 *   node scripts/tts.mjs --speed 0.95            # slower delivery
 */
import fs from "fs";
import path from "path";
import { describeVoice, providerProblem, resolveProvider, synthesize } from "./tts-providers.mjs";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const cwd = process.cwd();
const readJson = (name) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(cwd, name), "utf8"));
  } catch {
    return null;
  }
};

const plan = readJson("plan.json");
const intake = readJson("intake.json");
const text = (plan?.voiceover?.script ?? intake?.story ?? "").trim();
if (!text) {
  console.error("No script found — plan.json has no voiceover.script and intake.json has no story.");
  process.exit(1);
}

if (intake?.presenterEngine === "omni") {
  console.log("This demo's presenter engine is omni: the voice comes from the Omni take.");
  console.log("Run node scripts/omni-presenter.mjs instead — it writes assets/audio/vo.mp3.");
  process.exit(0);
}

const out = path.join(cwd, "assets", "audio", "vo.mp3");
if (fs.existsSync(out) && !argv.includes("--force")) {
  console.log("assets/audio/vo.mp3 already exists — keeping it. Pass --force to re-voice.");
  process.exit(0);
}

let provider;
try {
  provider = resolveProvider(flag("provider"), intake, cwd);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
const problem = providerProblem(provider, cwd);
if (problem) {
  console.error(`Cannot voice with ${provider}: ${problem}.`);
  process.exit(1);
}
const voice = { ...(intake?.voice ?? {}), speed: Number(flag("speed", intake?.voice?.speed ?? 1)) };

console.log(`Voicing ${text.split(/\s+/).length} words with ${describeVoice(provider, voice, cwd)}`);

let audio;
try {
  audio = await synthesize({ provider, text, voice, cwd });
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

fs.mkdirSync(path.dirname(out), { recursive: true });
if (fs.existsSync(out)) fs.renameSync(out, path.join(path.dirname(out), "vo.prev.mp3"));
fs.writeFileSync(out, audio);

console.log(`Wrote assets/audio/vo.mp3 (${(audio.length / 1024).toFixed(0)} KB)`);
console.log("Next: node scripts/transcribe.mjs, then node scripts/demo-timing.mjs");
