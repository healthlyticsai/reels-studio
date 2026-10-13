/**
 * Checks the keys a phase needs. Reels need Gemini only; `--mode demo` also
 * needs a text-to-speech provider for the voiceover — Google Chirp 3 HD by
 * default, or ElevenLabs.
 *
 * With `--engine omni` the voice comes from Gemini Omni's own take, so only
 * the Gemini key is needed.
 *
 * Usage: node check-env.mjs [--mode demo] [--provider google|elevenlabs] [--engine higgsfield|omni]
 */
import { envValue } from "./env.mjs";
import { providerProblem, resolveProvider } from "./tts-providers.mjs";

const argv = process.argv.slice(2);
const demo = argv.includes("demo");
const i = argv.indexOf("--provider");

let failed = false;
const gemini = envValue("GEMINI_API_KEY");
if (gemini) {
  console.log(`OK: GEMINI_API_KEY found (${gemini.slice(0, 6)}…${gemini.slice(-4)})`);
} else {
  failed = true;
  console.log("MISSING: GEMINI_API_KEY is not set.");
  console.log("  Get one at https://aistudio.google.com/apikey");
  console.log("  Then: export GEMINI_API_KEY=... (or add it to a .env)");
}

const e = argv.indexOf("--engine");
const omni = e !== -1 && argv[e + 1] === "omni";
if (demo && omni) {
  console.log("OK: presenter engine omni — the voice comes from the Omni take (Gemini key above).");
  console.log("  Omni video generation needs billing enabled on the Gemini API key's project.");
} else if (demo) {
  const provider = resolveProvider(i === -1 ? undefined : argv[i + 1], null);
  const problem = providerProblem(provider);
  if (problem) {
    failed = true;
    console.log(`MISSING: voiceover provider "${provider}" — ${problem}.`);
    if (provider === "google") {
      console.log("  Enable the Cloud Text-to-Speech API, then either set GOOGLE_TTS_API_KEY,");
      console.log("  or run `gcloud auth application-default login` and set GCP_PROJECT_ID");
      console.log("  (in ~/.reel-studio/.env, so every demo folder picks it up).");
    }
  } else {
    console.log(`OK: voiceover provider "${provider}" is ready`);
  }
}

process.exit(failed ? 1 : 0);
