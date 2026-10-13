/**
 * Resolves keys from the environment, then a .env in the project, then a .env
 * beside the skill, then ~/.reel-studio/.env. Keeps them out of git in every case.
 *
 * Scripts copied into a project find the plugin through scripts/skill-dir.txt,
 * which new-project.sh writes, so the plugin's own .env works from any project.
 * ~/.reel-studio/.env is the other place for settings every project shares.
 *
 * GEMINI_API_KEY drives the plan and the artwork. Demo mode adds
 * ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID for the voiceover.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const USER_DIR = process.env.REEL_STUDIO_HOME || path.join(os.homedir(), ".reel-studio");

/** The plugin root, when this file is a copy inside a project. */
const PLUGIN_ROOT = (() => {
  try {
    const skillDir = fs.readFileSync(path.join(HERE, "skill-dir.txt"), "utf8").trim();
    return skillDir ? path.resolve(skillDir, "../..") : null;
  } catch {
    return null;
  }
})();

const readDotEnv = (dir, name) => {
  const file = path.join(dir, ".env");
  if (!fs.existsSync(file)) return null;
  const re = new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*(.+?)\\s*$`);
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(re);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  return null;
};

export const envValue = (name, projectDir = process.cwd()) =>
  process.env[name] ||
  readDotEnv(projectDir, name) ||
  readDotEnv(path.resolve(HERE, ".."), name) ||
  readDotEnv(path.resolve(HERE, "../../.."), name) ||
  (PLUGIN_ROOT ? readDotEnv(PLUGIN_ROOT, name) : null) ||
  readDotEnv(USER_DIR, name) ||
  null;

export const geminiKey = (projectDir = process.cwd()) => envValue("GEMINI_API_KEY", projectDir);

const HELP = {
  GEMINI_API_KEY: "Get a key at https://aistudio.google.com/apikey",
  ELEVENLABS_API_KEY: "Create one at https://elevenlabs.io/app/settings/api-keys",
  ELEVENLABS_VOICE_ID:
    "Clone your voice at https://elevenlabs.io/app/voice-lab, then copy its voice ID",
};

/** Exits with instructions when a key is missing. */
export const requireEnv = (name, projectDir) => {
  const value = envValue(name, projectDir);
  if (!value) {
    console.error(
      `${name} not found.\n` +
        `  ${HELP[name] ?? ""}, then either\n` +
        `    export ${name}=... in your shell profile, or\n` +
        `    add ${name}=... to a .env in the project folder.`,
    );
    process.exit(1);
  }
  return value;
};

export const requireKey = (projectDir) => requireEnv("GEMINI_API_KEY", projectDir);

export const SKILL_DIR = path.resolve(HERE, "..");
