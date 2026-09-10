/**
 * Phase 1: asks Gemini 3.1 Pro for the full creative plan and writes it into
 * the project as plan.json (for the scripts) and PLAN.md (for humans).
 *
 * Usage:
 *   node brief.mjs --topic "..." --project ./my-reel [--notes "..."] [--seconds 60]
 */
import fs from "fs";
import path from "path";
import { requireKey, SKILL_DIR } from "./env.mjs";

const MODEL = "gemini-3.1-pro-preview";

const args = (() => {
  const out = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) out[argv[i].slice(2)] = argv[i + 1];
  }
  return out;
})();

if (!args.topic) {
  console.error('Usage: node brief.mjs --topic "..." --project ./slug [--notes "..."]');
  process.exit(1);
}

const project = path.resolve(args.project || ".");
const key = requireKey(project);

const brandPath = fs.existsSync(path.join(project, "brand.config.json"))
  ? path.join(project, "brand.config.json")
  : path.join(SKILL_DIR, "assets", "brand", "brand.config.json");
const brand = JSON.parse(fs.readFileSync(brandPath, "utf8"));

const template = fs.readFileSync(
  path.join(SKILL_DIR, "references", "gemini-brief-prompt.md"),
  "utf8",
);
// Everything above the horizontal rule is documentation for humans, not prompt.
const prompt = template
  .slice(template.indexOf("\n---\n") + 5)
  .replace("{{TOPIC}}", args.topic)
  .replace("{{NOTES}}", args.notes || "None supplied.")
  .replace("{{BRAND}}", JSON.stringify(brand, null, 2))
  .replace("60-second", `${args.seconds || 60}-second`);

console.log(`Asking ${MODEL} for a plan on: ${args.topic}`);

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.9 },
    }),
  },
);

const json = await res.json();
if (json.error) throw new Error(`Gemini: ${json.error.message}`);

const raw = json.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
if (!raw.trim()) {
  throw new Error(
    `Gemini returned no text (finishReason: ${json.candidates?.[0]?.finishReason ?? "unknown"})`,
  );
}

let plan;
try {
  plan = JSON.parse(raw.replace(/^```(?:json)?|```$/gm, "").trim());
} catch {
  fs.writeFileSync(path.join(project, "plan.raw.txt"), raw);
  throw new Error("Gemini did not return valid JSON — raw response saved to plan.raw.txt");
}

fs.mkdirSync(project, { recursive: true });
fs.writeFileSync(path.join(project, "plan.json"), JSON.stringify(plan, null, 2));

/* ── Render the human-readable plan ─────────────────────────────────────── */

const md = [];
md.push(`# ${plan.title}`, "");
md.push(`> ${plan.logline}`, "");
md.push(`**Target length:** ~${plan.durationSeconds}s  ·  **Slug:** \`${plan.slug}\``, "");

md.push("## Voiceover script", "");
md.push("Paste this into your text-to-speech tool, or read it aloud.", "");
md.push("```text", plan.voiceover.script, "```", "");
md.push(`*${plan.voiceover.wordCount} words. ${plan.voiceover.toneNotes}*`, "");

md.push("## Scenes", "");
for (const [i, s] of plan.scenes.entries()) {
  const [a, b] = s.approximateSeconds ?? [];
  md.push(`### ${i + 1}. ${s.title}  \`${a}s–${b}s\``, "");
  md.push(`**Purpose.** ${s.purpose}`, "");
  if (s.eyebrow) md.push(`**Kicker.** ${s.eyebrow}`, "");
  if (s.headline) md.push(`**Headline.** ${s.headline.text}  *(${s.headline.mark} on "${s.headline.emphasis}")*`, "");
  if (s.secondHeadline?.text) md.push(`**Second line.** ${s.secondHeadline.text}`, "");
  if (s.deck) md.push(`**Deck.** ${s.deck}`, "");
  md.push(`**Background.** ${s.background}`, "");
  if (s.beats?.length) {
    md.push("", "| Lands on | Action |", "|---|---|");
    for (const b2 of s.beats) md.push(`| "${b2.onWords}" | ${b2.action} |`);
  }
  md.push("", `**Assets.** ${(s.assets ?? []).join(", ") || "—"}`);
  md.push(`**Components.** ${(s.components ?? []).join(", ") || "—"}`);
  md.push(`**Layout.** ${s.layoutNotes}`, "");
}

md.push("## Transitions", "", "| From | To | Style | Why |", "|---|---|---|---|");
for (const t of plan.transitions ?? []) md.push(`| ${t.from} | ${t.to} | \`${t.style}\` | ${t.why} |`);
md.push("");

md.push("## Asset manifest", "", "| Name | Kind | Aspect | Used in |", "|---|---|---|---|");
for (const a of plan.assetManifest ?? [])
  md.push(`| \`${a.name}\` | ${a.kind} | ${a.aspect} | ${(a.usedIn ?? []).join(", ")} |`);
md.push("", "Generate with `node scripts/generate-assets.mjs`, then matte with `node scripts/matte.mjs`.", "");

md.push("## Sound cues", "", "| Lands on | File | Volume | Why |", "|---|---|---|---|");
for (const s of plan.sfx ?? []) md.push(`| "${s.onWords}" | \`${s.file}\` | ${s.volume} | ${s.why} |`);
md.push("");

md.push("## Call to action", "");
md.push(`**${plan.cta.headline}** — highlight on "${plan.cta.emphasis}"`, "");
md.push(`Button: \`${plan.cta.button}\`  ·  URL: \`${plan.cta.url}\``);
if (plan.cta.badge) md.push(`  ·  Badge: ${plan.cta.badge}`);
md.push("");

if (plan.risks?.length) {
  md.push("## Flagged for review", "");
  for (const r of plan.risks) md.push(`- ${r}`);
  md.push("");
}

md.push("---", "");
md.push("**Next step.** Record the voiceover from the script above and save it to");
md.push("`assets/audio/vo.mp3`, and drop instrumental background music at `assets/audio/bg.mp3`.");
md.push("Length does not matter — the reel is cut to whatever the voiceover turns out to be.");
md.push("");

fs.writeFileSync(path.join(project, "PLAN.md"), md.join("\n"));

console.log(`\nWrote ${path.join(project, "PLAN.md")}`);
console.log(`Wrote ${path.join(project, "plan.json")}`);
console.log(`\n${plan.scenes.length} scenes · ${plan.assetManifest?.length ?? 0} assets · ${plan.voiceover.wordCount} words of VO`);
