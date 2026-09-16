/**
 * Phase 1: turns a topic into the full creative plan.
 *
 * Three steps, in order, because each one feeds the next:
 *
 *   1. direction.mjs draws a unique look, arc, edit language, kinetic type set
 *      and motion motifs for this reel, holding out whatever the last few reels
 *      used. This is what stops every reel resembling the last one.
 *   2. research.mjs grounds the topic — real numbers, real objects, real human
 *      moments — so the asset manifest is built out of this world rather than
 *      out of stock-photo instincts.
 *   3. Gemini 3.1 Pro writes the plan against both, and it lands as plan.json
 *      (for the scripts) and PLAN.md (for humans).
 *
 * Usage:
 *   node brief.mjs --topic "..." --project ./my-reel [--notes "..."] [--seconds 60]
 *
 *   --no-research      skip the grounding pass
 *   --redraw           draw a fresh creative direction even if one exists
 *   --art <id>         force an art direction (see direction.mjs --list)
 *   --arc <id>         force a narrative arc
 *   --seed <n>         reproduce an earlier draw exactly
 *   --min-assets <n>   floor for the asset manifest (default 12)
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { requireKey, SKILL_DIR } from "./env.mjs";
import { callGemini, extractJson, MODEL } from "./gemini.mjs";

const args = (() => {
  const out = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const next = argv[i + 1];
    out[argv[i].slice(2)] = next && !next.startsWith("--") ? next : true;
  }
  return out;
})();

if (!args.topic) {
  console.error('Usage: node brief.mjs --topic "..." --project ./slug [--notes "..."]');
  process.exit(1);
}

const project = path.resolve(args.project && args.project !== true ? args.project : ".");
const key = requireKey(project);
const seconds = Number(args.seconds) || 60;
const minAssets = Number(args["min-assets"]) || 12;
const here = import.meta.dirname;

fs.mkdirSync(project, { recursive: true });

const run = (script, extra) =>
  execFileSync(process.execPath, [path.join(here, script), ...extra], { stdio: "inherit" });

/* ── 1. Creative direction ───────────────────────────────────────────────── */

const directionPath = path.join(project, "direction.json");

if (!fs.existsSync(directionPath) || args.redraw) {
  const flags = ["--project", project];
  for (const flag of ["art", "arc", "edit", "camera", "gambit", "type", "motifs", "seed"]) {
    if (args[flag] && args[flag] !== true) flags.push(`--${flag}`, String(args[flag]));
  }
  run("direction.mjs", flags);
} else {
  console.log("Reusing the existing direction.json (pass --redraw for a new look).\n");
}

const direction = JSON.parse(fs.readFileSync(directionPath, "utf8"));

/* ── 2. Research ─────────────────────────────────────────────────────────── */

const researchPath = path.join(project, "research.json");

if (args["no-research"] !== true && (!fs.existsSync(researchPath) || args.redraw)) {
  try {
    const flags = ["--topic", args.topic, "--project", project];
    if (args.notes && args.notes !== true) flags.push("--notes", String(args.notes));
    run("research.mjs", flags);
  } catch {
    // Grounding is a quality lever, not a hard dependency — a rate limit or a
    // network blip should not cost the person their whole brief.
    console.log("Research step failed; continuing without it.\n");
  }
}

const research = fs.existsSync(researchPath)
  ? JSON.parse(fs.readFileSync(researchPath, "utf8"))
  : null;

/* ── 3. The brief ────────────────────────────────────────────────────────── */

const brandPath = fs.existsSync(path.join(project, "brand.config.json"))
  ? path.join(project, "brand.config.json")
  : path.join(SKILL_DIR, "assets", "brand", "brand.config.json");
const brand = JSON.parse(fs.readFileSync(brandPath, "utf8"));

/** The direction, written out as the instruction block the prompt reads. */
const directionBlock = () => {
  const d = direction;
  const lines = [];
  lines.push(`**ART DIRECTION — ${d.artDirection.name}** (id: \`${d.artDirection.id}\`)`);
  lines.push(d.artDirection.summary);
  lines.push(`- Mood: ${d.artDirection.mood}. Backdrop variant: \`${d.artDirection.backdrop}\`.`);
  lines.push(`- Typography feel: ${d.artDirection.typographyFeel}`);
  lines.push(`- Photography: ${d.artDirection.imageDirection}`);
  lines.push(`- Objects: ${d.artDirection.propDirection}`);
  lines.push(`- Cut palette (transitions must come from here): ${d.artDirection.transitions.join(", ")}`);
  lines.push(`- Avoid: ${d.artDirection.avoid}`);
  lines.push("");
  lines.push(`**NARRATIVE ARC — ${d.narrativeArc.name}** (id: \`${d.narrativeArc.id}\`)`);
  lines.push(d.narrativeArc.shape);
  lines.push("");
  lines.push(`**OPENING GAMBIT** — ${d.openingGambit.how}`);
  lines.push("");
  lines.push(`**EDIT LANGUAGE — ${d.editLanguage.name}** — ${d.editLanguage.how} Pace: ${d.editLanguage.pace}.`);
  lines.push("");
  lines.push(`**CAMERA LANGUAGE — ${d.cameraLanguage.name}** — ${d.cameraLanguage.how}`);
  lines.push("");
  lines.push("**KINETIC TYPE SYSTEMS** — spread these across the scenes, never twice in a row:");
  for (const t of d.typeSystems) lines.push(`- \`${t.id}\` — **${t.name}**, built on \`${t.primary}\`. ${t.how}`);
  lines.push("");
  lines.push("**MOTION MOTIFS** — the three signature devices for this reel:");
  for (const m of d.motionMotifs) lines.push(`- \`${m.id}\` — **${m.name}** (\`${m.component}\`). ${m.how}`);
  return lines.join("\n");
};

const researchBlock = () =>
  research
    ? JSON.stringify(research, null, 2)
    : "No research was gathered for this reel. Be explicit in `risks` about any figure you " +
      "could not ground, and lean on concrete description rather than statistics.";

const template = fs.readFileSync(
  path.join(SKILL_DIR, "references", "gemini-brief-prompt.md"),
  "utf8",
);
// Everything above the horizontal rule is documentation for humans, not prompt.
const prompt = template
  .slice(template.indexOf("\n---\n") + 5)
  .replaceAll("{{TOPIC}}", args.topic)
  .replaceAll("{{NOTES}}", args.notes && args.notes !== true ? String(args.notes) : "None supplied.")
  .replaceAll("{{BRAND}}", JSON.stringify(brand, null, 2))
  .replaceAll("{{SECONDS}}", String(seconds))
  .replaceAll("{{MIN_ASSETS}}", String(minAssets))
  .replaceAll("{{DIRECTION}}", directionBlock())
  .replaceAll("{{RESEARCH}}", researchBlock());

console.log(`\nAsking ${MODEL} for a plan on: ${args.topic}`);
console.log(`  look: ${direction.artDirection.name}  ·  arc: ${direction.narrativeArc.name}`);

const { text } = await callGemini({ key, prompt, json: true, temperature: 1.0 });

let plan;
try {
  plan = extractJson(text);
} catch {
  fs.writeFileSync(path.join(project, "plan.raw.txt"), text);
  throw new Error("Gemini did not return valid JSON — raw response saved to plan.raw.txt");
}

/* ── Top up a thin asset manifest ────────────────────────────────────────── */

// A short manifest is the most common reason two reels end up looking alike, so
// it is worth one extra call rather than a warning nobody reads.
if ((plan.assetManifest?.length ?? 0) < minAssets) {
  const have = plan.assetManifest ?? [];
  console.log(`Manifest came back with ${have.length} assets; asking for ${minAssets - have.length} more.`);

  const topUp = `You planned this reel:\n\n${JSON.stringify(
    { title: plan.title, scenes: plan.scenes, assetManifest: have },
    null,
    2,
  )}\n\nIts asset manifest is too thin — it needs at least ${minAssets} entries and it has ${have.length}.
Add ${minAssets - have.length + 2} more assets drawn from the research below, covering props,
textures, an environment and additional human moments. Do not repeat anything already there,
and give each one a \`usedIn\` naming a scene that exists.

Art direction: ${direction.artDirection.name} — ${direction.artDirection.summary}

Research:
${researchBlock()}

Return ONLY a JSON array of asset objects with the fields
{ name, kind, aspect, prompt, usedIn, fromResearch, referenceOf }.`;

  try {
    const extra = extractJson((await callGemini({ key, prompt: topUp, json: true, temperature: 0.9 })).text);
    const names = new Set(have.map((a) => a.name));
    plan.assetManifest = [...have, ...(Array.isArray(extra) ? extra : []).filter((a) => a?.name && !names.has(a.name))];
    // The new assets have to reach the scenes too, or they are generated and never used.
    for (const asset of plan.assetManifest) {
      for (const sceneId of asset.usedIn ?? []) {
        const scene = plan.scenes?.find((s) => s.id === sceneId);
        if (scene && !(scene.assets ?? []).includes(asset.name)) {
          scene.assets = [...(scene.assets ?? []), asset.name];
        }
      }
    }
  } catch (err) {
    console.log(`Top-up failed (${err.message}); continuing with ${have.length}.`);
  }
}

plan.direction = {
  artDirection: direction.artDirection.id,
  backdrop: direction.artDirection.backdrop,
  narrativeArc: direction.narrativeArc.id,
  editLanguage: direction.editLanguage.id,
  cameraLanguage: direction.cameraLanguage.id,
  typeSystems: direction.typeSystems.map((t) => t.id),
  motionMotifs: direction.motionMotifs.map((m) => m.id),
  seed: direction.seed,
};

fs.writeFileSync(path.join(project, "plan.json"), JSON.stringify(plan, null, 2));

/* ── Render the human-readable plan ─────────────────────────────────────── */

const md = [];
md.push(`# ${plan.title}`, "");
md.push(`> ${plan.logline}`, "");
md.push(`**Target length:** ~${plan.durationSeconds}s  ·  **Slug:** \`${plan.slug}\``, "");

md.push("## Look and shape", "");
md.push(`**Art direction.** ${direction.artDirection.name} — ${direction.artDirection.summary}`, "");
md.push(`**Narrative arc.** ${direction.narrativeArc.name} — ${direction.narrativeArc.shape}`, "");
md.push(`**Edit.** ${direction.editLanguage.name} — ${direction.editLanguage.how}`, "");
md.push(`**Camera.** ${direction.cameraLanguage.name} — ${direction.cameraLanguage.how}`, "");
md.push(`**Kinetic type.** ${direction.typeSystems.map((t) => t.name).join(", ")}`, "");
md.push(`**Motion motifs.** ${direction.motionMotifs.map((m) => m.name).join(", ")}`, "");
md.push(`*Drawn with seed \`${direction.seed}\` — rerun with \`--seed ${direction.seed}\` to reproduce this look, or \`--redraw\` for a different one.*`, "");

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
  if (s.typeSystem) md.push(`**Type.** \`${s.typeSystem}\` — ${s.kineticNotes ?? ""}`, "");
  if (s.motionMotif) md.push(`**Motif.** \`${s.motionMotif}\``, "");
  if (s.cameraNote) md.push(`**Camera.** ${s.cameraNote}`, "");
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

md.push("## Asset manifest", "", `${(plan.assetManifest ?? []).length} assets.`, "", "| Name | Kind | Aspect | Used in | From |", "|---|---|---|---|---|");
for (const a of plan.assetManifest ?? [])
  md.push(`| \`${a.name}\` | ${a.kind} | ${a.aspect} | ${(a.usedIn ?? []).join(", ")} | ${a.fromResearch ?? "—"} |`);
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

console.log(`Wrote ${path.join(project, "PLAN.md")}`);
console.log(`Wrote ${path.join(project, "plan.json")}\n`);

// Print the storyboard straight away. The person has to approve this before
// recording anything, so it belongs in the conversation, not in a file they
// have to be told to go and open.
execFileSync(process.execPath, [path.join(here, "storyboard.mjs"), project], { stdio: "inherit" });
