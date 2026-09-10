/**
 * Resolves GEMINI_API_KEY from the environment, then a .env in the project,
 * then a .env beside the skill. Keeps the key out of git in every case.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const readDotEnv = (dir) => {
  const file = path.join(dir, ".env");
  if (!fs.existsSync(file)) return null;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?GEMINI_API_KEY\s*=\s*(.+?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  return null;
};

export const geminiKey = (projectDir = process.cwd()) =>
  process.env.GEMINI_API_KEY ||
  readDotEnv(projectDir) ||
  readDotEnv(path.resolve(HERE, "..")) ||
  readDotEnv(path.resolve(HERE, "../../..")) ||
  null;

export const requireKey = (projectDir) => {
  const key = geminiKey(projectDir);
  if (!key) {
    console.error(
      "GEMINI_API_KEY not found.\n" +
        "  Get a key at https://aistudio.google.com/apikey, then either\n" +
        "    export GEMINI_API_KEY=... in your shell profile, or\n" +
        "    add GEMINI_API_KEY=... to a .env in the project folder.",
    );
    process.exit(1);
  }
  return key;
};

export const SKILL_DIR = path.resolve(HERE, "..");
