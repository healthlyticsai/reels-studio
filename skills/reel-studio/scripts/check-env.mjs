import { geminiKey } from "./env.mjs";

const key = geminiKey();
if (!key) {
  console.log("MISSING: GEMINI_API_KEY is not set.");
  console.log("  Get one at https://aistudio.google.com/apikey");
  console.log("  Then: export GEMINI_API_KEY=... (or add it to a .env)");
  process.exit(1);
}
console.log(`OK: GEMINI_API_KEY found (${key.slice(0, 6)}…${key.slice(-4)})`);
