/**
 * Demo mode, phase 1: turns the Studio intake — story, screenshots, presenter —
 * into a staged plan.
 *
 * Unlike brief.mjs, nothing is researched and nothing is written: the story is
 * the person's own and is spoken word for word. Gemini stages it — cuts it into
 * scenes, decides when the presenter is on camera, pairs sentences with
 * screenshots, and (looking at the images) places the zoom, highlight and click
 * boxes. The plan is checked mechanically afterwards, and sent back once with the
 * list of problems if it fails, because a story that no longer matches word for
 * word would be voiced wrong.
 *
 * Usage:
 *   node demo-brief.mjs --project ./my-demo [--notes "..."] [--polish]
 *
 *   --polish     let Gemini tighten the story (otherwise edits only go in suggestedEdits)
 *   --redraw     draw a fresh look
 *   --art <id>   force an art direction (see direction.mjs --list)
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { requireKey, SKILL_DIR } from "./env.mjs";
import { callGemini, extractJson, MODEL } from "./gemini.mjs";
import { imageSize } from "./image-size.mjs";

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

const project = path.resolve(args.project && args.project !== true ? args.project : ".");
const here = import.meta.dirname;
const intakePath = path.join(project, "intake.json");
if (!fs.existsSync(intakePath)) {
  console.error(`No intake.json in ${project}. Create the demo in the Studio UI first.`);
  process.exit(1);
}
const intake = JSON.parse(fs.readFileSync(intakePath, "utf8"));
const story = String(intake.story ?? "").trim().replace(/\s+/g, " ");
if (!story) {
  console.error("intake.json has no story. The presenter's script is the person's to write — ask them for it.");
  process.exit(1);
}
if (!intake.screens?.length) {
  console.error("intake.json has no screenshots. A demo needs at least one real product screen.");
  process.exit(1);
}
const key = requireKey(project);

/* ── Screens: fill in sizes, load for Gemini ─────────────────────────────── */

const MIME = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
const images = [];
for (const s of intake.screens) {
  const file = path.join(project, "public", s.src);
  if (!fs.existsSync(file)) {
    console.error(`Screenshot ${s.id} is missing: public/${s.src}`);
    process.exit(1);
  }
  const size = imageSize(file);
  s.width = size.width;
  s.height = size.height;
  images.push({ mimeType: MIME[size.type], data: fs.readFileSync(file).toString("base64") });
}
fs.writeFileSync(intakePath, JSON.stringify(intake, null, 2));

/* ── Look: a draw restricted to directions that suit a product UI ───────── */

// Collage, chalkboard and archive film look deliberate around a talking point
// and wrong around a real dashboard. These six let a screenshot be the subject.
const DEMO_ARTS = ["clean-product", "swiss-editorial", "gallery-minimal", "blueprint-technical", "night-data", "neon-gradient"];
const directionPath = path.join(project, "direction.json");
if (!fs.existsSync(directionPath) || args.redraw) {
  const art = args.art && args.art !== true ? String(args.art) : DEMO_ARTS[Math.floor(Math.random() * DEMO_ARTS.length)];
  execFileSync(process.execPath, [path.join(here, "direction.mjs"), "--project", project, "--art", art], { stdio: "inherit" });
}
const direction = JSON.parse(fs.readFileSync(directionPath, "utf8"));

/* ── Prompt ──────────────────────────────────────────────────────────────── */

const brandPath = fs.existsSync(path.join(project, "brand.config.json"))
  ? path.join(project, "brand.config.json")
  : path.join(SKILL_DIR, "assets", "brand", "brand.config.json");
const brand = JSON.parse(fs.readFileSync(brandPath, "utf8"));

const transitions = ["fade", "slide", "cut", ...direction.artDirection.transitions];
const screensBlock = intake.screens
  .map((s, i) => `${i + 1}. id \`${s.id}\` — ${s.device ?? "desktop"}, ${s.width}×${s.height}px — ${s.caption || "no note"}`)
  .join("\n");
const presenter = intake.presenter?.name
  ? `${intake.presenter.name}${intake.presenter.role ? `, ${intake.presenter.role}` : ""}`
  : "Unnamed presenter";

const polish = args.polish
  ? "You may tighten the story for clarity and pace — keep the person's voice, facts and order, and put the final text in `voiceover.script`. Scenes' sentences must then join to `voiceover.script`."
  : "Do NOT change a single word of the story. `voiceover.script` must equal it exactly. Put any improvement you would make in `suggestedEdits` instead.";

const template = fs.readFileSync(path.join(SKILL_DIR, "references", "gemini-demo-prompt.md"), "utf8");
const prompt = template
  .slice(template.indexOf("\n---\n") + 5)
  .replaceAll("{{STORY}}", story)
  .replaceAll("{{PRODUCT}}", `${intake.product ?? brand.product} (${intake.url ?? brand.url})`)
  .replaceAll("{{AUDIENCE}}", intake.audience || "Not specified.")
  .replaceAll("{{NOTES}}", [intake.notes, args.notes !== true ? args.notes : ""].filter(Boolean).join(" ") || "None supplied.")
  .replaceAll("{{PRESENTER}}", presenter)
  .replaceAll("{{SCREENS}}", screensBlock)
  .replaceAll("{{BRAND}}", JSON.stringify({ name: brand.name, product: brand.product, url: brand.url, colors: brand.colors }, null, 2))
  .replaceAll("{{TRANSITIONS}}", transitions.join(", "))
  .replaceAll("{{POLISH}}", polish);

/* ── Validation ──────────────────────────────────────────────────────────── */

const squash = (t) => String(t).replace(/\s+/g, " ").trim();
const ids = new Set(intake.screens.map((s) => s.id));

const validate = (plan) => {
  const errs = [];
  const scenes = plan.scenes ?? [];
  if (scenes.length < 2) errs.push("Fewer than two scenes.");
  const spoken = squash(plan.voiceover?.script ?? "");
  if (!args.polish && spoken !== story) errs.push("voiceover.script differs from the story. It must match it exactly.");
  const joined = squash(scenes.flatMap((s) => s.voiceoverSentences ?? []).join(" "));
  if (joined !== spoken) errs.push("The scenes' voiceoverSentences, joined in order, do not reproduce voiceover.script exactly.");
  const seen = new Set();
  scenes.forEach((s, i) => {
    if (seen.has(s.id)) errs.push(`Duplicate scene id "${s.id}".`);
    seen.add(s.id);
    if (!["avatar", "screen", "split", "cta"].includes(s.type)) errs.push(`${s.id}: unknown type "${s.type}".`);
    if ((s.type === "screen" || s.type === "split") && !ids.has(s.screen)) errs.push(`${s.id}: screen "${s.screen}" does not exist.`);
    const words = squash((s.voiceoverSentences ?? []).join(" ")).toLowerCase();
    for (const fo of s.focus ?? []) {
      const b = fo.box ?? [];
      if (b.length !== 4 || b.some((v) => typeof v !== "number" || v < 0 || v > 1) || b[0] + b[2] > 1.001 || b[1] + b[3] > 1.001) {
        errs.push(`${s.id}: focus on "${fo.onWords}" has an invalid box ${JSON.stringify(b)}.`);
      }
      const phrase = String(fo.onWords ?? "").toLowerCase().replace(/[^a-z0-9' ]/g, "");
      if (!words.replace(/[^a-z0-9' ]/g, "").includes(phrase)) errs.push(`${s.id}: onWords "${fo.onWords}" is not in this scene's sentences.`);
    }
    if (s.nextScreen?.screen && !ids.has(s.nextScreen.screen)) errs.push(`${s.id}: nextScreen "${s.nextScreen.screen}" does not exist.`);
    const clean = (t) => String(t ?? "").toLowerCase().replace(/[^a-z0-9' ]/g, "");
    for (const anchor of [s.nextScreen?.onWords, ...(s.list ?? []).map((x) => x.onWords)].filter(Boolean)) {
      if (!clean(words).includes(clean(anchor))) errs.push(`${s.id}: "${anchor}" is not in this scene's sentences.`);
    }
    if (i === scenes.length - 1 && s.type !== "cta") errs.push("The last scene must be the cta.");
  });
  if ((plan.transitions ?? []).length !== Math.max(0, scenes.length - 1)) errs.push("transitions needs exactly one entry per adjacent pair of scenes.");
  return errs;
};

/* ── Ask ─────────────────────────────────────────────────────────────────── */

console.log(`\nAsking ${MODEL} to stage the demo (${intake.screens.length} screenshots, ${story.split(" ").length} words)`);
console.log(`  look: ${direction.artDirection.name}`);

let plan = extractJson((await callGemini({ key, prompt, images, json: true })).text);
let errors = validate(plan);
if (errors.length) {
  console.log(`First plan had ${errors.length} problem(s); sending it back once.`);
  const retry = `${prompt}\n\n## Your previous answer\n\n${JSON.stringify(plan)}\n\nIt has these problems. Fix every one and return the whole corrected JSON object:\n${errors.map((e) => `- ${e}`).join("\n")}`;
  plan = extractJson((await callGemini({ key, prompt: retry, images, json: true })).text);
  errors = validate(plan);
}

plan.mode = "demo";
// The closing card shows the URL the person gave, not whatever the brand file says.
if (intake.url && plan.cta) plan.cta.url = intake.url;
plan.direction = {
  artDirection: direction.artDirection.id,
  backdrop: direction.artDirection.backdrop,
  cameraLanguage: direction.cameraLanguage.id,
  seed: direction.seed,
};
if (errors.length) plan.validationErrors = errors;
fs.writeFileSync(path.join(project, "plan.json"), JSON.stringify(plan, null, 2));

/* ── PLAN.md ─────────────────────────────────────────────────────────────── */

const md = [`# ${plan.title}`, "", `> ${plan.logline}`, ""];
md.push(`**Look.** ${direction.artDirection.name} — ${direction.artDirection.summary}`, "");
md.push("## Script (spoken as written)", "", "```text", plan.voiceover.script, "```", "");
md.push(`*${plan.voiceover.wordCount} words. ${plan.voiceover.toneNotes ?? ""}*`, "");
md.push("## Scenes", "");
for (const [i, s] of plan.scenes.entries()) {
  md.push(`### ${i + 1}. ${s.id} — ${s.type}${s.screen ? ` on \`${s.screen}\`` : ""} · presenter: ${s.avatar}`, "");
  md.push(`> ${(s.voiceoverSentences ?? []).join(" ")}`, "");
  if (s.purpose) md.push(s.purpose, "");
  if (s.headline?.text) md.push(`**Headline.** ${s.headline.text}  *(${s.headline.mark} on "${s.headline.emphasis}")*`, "");
  if (s.focus?.length) {
    md.push("| On the words | Action | Box (x, y, w, h) | Label |", "|---|---|---|---|");
    for (const fo of s.focus) md.push(`| "${fo.onWords}" | ${fo.action} | ${fo.box.map((v) => v.toFixed(2)).join(", ")} | ${fo.label ?? ""} |`);
    md.push("");
  }
}
md.push("## Transitions", "", ...(plan.transitions ?? []).map((t) => `- ${t.from} → ${t.to}: \`${t.style}\` — ${t.why ?? ""}`), "");
md.push("## Closing card", "", `**${plan.cta.headline}** · button \`${plan.cta.button}\` · ${plan.cta.url}`, "");
for (const [title, list] of [
  ["Suggested edits (not applied)", plan.suggestedEdits],
  ["Flagged for review", plan.risks],
  ["Possible patient data in screenshots", (plan.phiCheck ?? []).map((p) => `\`${p.screen}\`: ${p.concern}`)],
  ["Plan problems left after one retry", plan.validationErrors],
]) {
  if (list?.length) md.push(`## ${title}`, "", ...list.map((x) => `- ${x}`), "");
}
md.push("---", "", "**Next.** Approve this storyboard in the Studio UI (or say so in chat), then run `/demo-build`.", "");
fs.writeFileSync(path.join(project, "PLAN.md"), md.join("\n"));

console.log(`Wrote ${path.join(project, "plan.json")} and PLAN.md`);
if (errors.length) console.log(`\n${errors.length} problem(s) remain — see PLAN.md. Fix plan.json by hand or re-run.`);

execFileSync(process.execPath, [path.join(here, "storyboard.mjs"), project], { stdio: "inherit" });
