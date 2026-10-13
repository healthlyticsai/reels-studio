/**
 * Renders plan.json as a storyboard digest for the approval conversation.
 *
 * PLAN.md is the reference document; this is the version a person reads in chat
 * before deciding whether to go and record. It leads with the voiceover script,
 * because that is the expensive thing to get wrong, then walks the scenes shot
 * by shot, then states exactly what has to come back and where it goes.
 *
 * Usage: node scripts/storyboard.mjs [project-dir]
 */
import fs from "fs";
import path from "path";

const project = path.resolve(process.argv[2] ?? ".");
const planPath = path.join(project, "plan.json");

if (!fs.existsSync(planPath)) {
  console.error(`No plan.json in ${project} — run brief.mjs first.`);
  process.exit(1);
}

const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const slug = path.basename(project);

const readJson = (name) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(project, name), "utf8"));
  } catch {
    return null;
  }
};

const direction = readJson("direction.json");
const research = readJson("research.json");
const out = [];
const say = (line = "") => out.push(line);

const rule = (label) => {
  say();
  say(`── ${label} ${"─".repeat(Math.max(0, 66 - label.length))}`);
  say();
};

/** Wrap prose so long lines stay readable in a terminal. */
const wrap = (text, width = 76, indent = "") => {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > width) {
      lines.push(indent + line.trim());
      line = w;
    } else {
      line += " " + w;
    }
  }
  if (line.trim()) lines.push(indent + line.trim());
  return lines;
};

/* ── Demo mode ───────────────────────────────────────────────────────────── */

// A demo's storyboard is about staging, not argument: which sentence plays over
// which screenshot, where the camera goes, and when the presenter is on screen.
if (plan.mode === "demo") {
  const intake = readJson("intake.json") ?? {};
  const screens = new Map((intake.screens ?? []).map((s) => [s.id, s]));
  say(`${plan.title}`);
  say("=".repeat(plan.title.length));
  say();
  wrap(plan.logline).forEach(say);
  say();
  say(`Demo · ${plan.scenes.length} scenes · ${plan.voiceover.wordCount} words (~${Math.round(plan.voiceover.wordCount / 2.5)}s) · renders 16:9 and 9:16 · ./${slug}/`);
  if (direction) say(`Look  ${direction.artDirection.name}`);

  rule(`SCRIPT — spoken exactly as written${intake.presenterEngine === "omni" ? ", voiced by Gemini Omni" : ""}`);
  wrap(plan.voiceover.script, 74, "  ").forEach(say);

  rule("SCENES");
  plan.scenes.forEach((s, i) => {
    const scr = s.screen ? screens.get(s.screen) : null;
    const where = scr ? `${s.screen} (${scr.device ?? "desktop"}: ${scr.caption || scr.src})` : "—";
    say(`  ${i + 1}. ${s.id.toUpperCase()}  ·  ${s.type}  ·  presenter ${s.avatar}  ·  screen ${where}`);
    wrap(`"${(s.voiceoverSentences ?? []).join(" ")}"`, 70, "       ").forEach(say);
    if (s.motion) say(`       laptop    ${s.motion}`);
    if (s.headline?.text) say(`       headline  ${s.headline.text}${s.headline.emphasis ? `  [emphasis "${s.headline.emphasis}"]` : ""}`);
    if (s.nextScreen?.screen) say(`       swap      → ${s.nextScreen.screen} on "${s.nextScreen.onWords}"`);
    for (const item of s.list ?? []) say(`       list      ✱ ${item.text}  on "${item.onWords}"`);
    for (const fo of s.focus ?? []) {
      say(`       ${fo.action.padEnd(9)} on "${fo.onWords}"  box ${fo.box.map((v) => v.toFixed(2)).join(",")}${fo.label ? `  label "${fo.label}"` : ""}`);
    }
    const t = (plan.transitions ?? []).find((x) => x.from === s.id);
    if (t) say(`       ↓ ${t.style}`);
    say();
  });

  say(`  Closing card: "${plan.cta.headline}" · [${plan.cta.button}] · ${plan.cta.url}`);

  const lists = [
    ["SUGGESTED EDITS — not applied; say which to take", plan.suggestedEdits],
    ["FLAGGED FOR REVIEW", plan.risks],
    ["POSSIBLE PATIENT DATA — replace these screenshots before rendering", (plan.phiCheck ?? []).map((p) => `${p.screen}: ${p.concern}`)],
    ["PLAN PROBLEMS — fix before approving", plan.validationErrors],
  ];
  for (const [label, list] of lists) {
    if (!list?.length) continue;
    rule(label);
    for (const x of list) wrap(`- ${x}`, 74, "  ").forEach(say);
  }

  rule("NEXT");
  const omni = intake.presenterEngine === "omni";
  const provider = intake.voice?.provider === "elevenlabs" ? "ElevenLabs" : "Google Chirp 3 HD";
  say("  Approve in the Studio UI (or say so here), then /demo-build " +
    (omni ? "films the presenter with Gemini Omni" : `voices the script with ${provider}, lip-syncs the presenter with Higgsfield,`));
  say("  " + (omni ? "(its audio becomes the voiceover) and renders both formats." : "and renders both formats."));
  say("  Focus boxes are drawn over the screenshots in the Studio UI — check they land.");
  console.log(out.join("\n"));
  process.exit(0);
}

/* ── Header ──────────────────────────────────────────────────────────────── */

say(`${plan.title}`);
say("=".repeat(plan.title.length));
say();
wrap(plan.logline).forEach(say);
say();
say(`Target length  ~${plan.durationSeconds}s        Scenes  ${plan.scenes?.length ?? 0}        Folder  ./${slug}/`);

/* ── The look, drawn fresh for this reel ─────────────────────────────────── */

if (direction) {
  rule("THE LOOK — drawn for this reel, different from the last one");
  const field = (k, v) => wrap(v, 62, "             ").forEach((l, i) => say(i === 0 ? `  ${k.padEnd(11)}${l.trim()}` : l));

  field("Art", `${direction.artDirection.name} — ${direction.artDirection.summary}`);
  field("Arc", `${direction.narrativeArc.name}: ${direction.narrativeArc.shape}`);
  field("Opens", direction.openingGambit.how);
  field("Edit", `${direction.editLanguage.name} — ${direction.editLanguage.how}`);
  field("Camera", `${direction.cameraLanguage.name} — ${direction.cameraLanguage.how}`);
  field("Type", direction.typeSystems.map((t) => t.name).join(" · "));
  field("Motifs", direction.motionMotifs.map((m) => m.name).join(" · "));
  field("Cuts", direction.artDirection.transitions.join(", "));
  say();
  say(`  Not right? "redraw the look" gets a different one, or name a style —`);
  say(`  ${direction.seed} is the seed that reproduces this exact draw.`);
}

if (research) {
  rule("GROUNDED IN");
  const counts = [
    [`${(research.concreteFacts ?? []).length}`, "facts"],
    [`${(research.visualMotifs ?? []).length}`, "visual motifs"],
    [`${(research.humanMoments ?? []).length}`, "human moments"],
    [`${(research.sources ?? []).length}`, "web sources"],
  ];
  say(`  ${counts.map(([n, l]) => `${n} ${l}`).join("   ·   ")}`);
  if (research.surprising?.length) {
    say();
    say("  Worth knowing:");
    for (const item of research.surprising.slice(0, 3)) {
      wrap(item, 68, "      ").forEach((l, i) => say(i === 0 ? `    • ${l.trim()}` : l));
    }
  }
  say();
  say("  Full detail in RESEARCH.md.");
}

/* ── The script, first, because it is the expensive thing to get wrong ───── */

rule("VOICEOVER SCRIPT — read this before anything else");
wrap(plan.voiceover.script).forEach(say);
say();
say(`(${plan.voiceover.wordCount} words)`);
if (plan.voiceover.toneNotes) {
  say();
  say("Delivery:");
  wrap(plan.voiceover.toneNotes, 74, "  ").forEach(say);
}

/* ── Storyboard ──────────────────────────────────────────────────────────── */

rule("STORYBOARD");

const transitionAfter = (id) => (plan.transitions ?? []).find((t) => t.from === id);

(plan.scenes ?? []).forEach((s, i) => {
  const [a, b] = s.approximateSeconds ?? [];
  say(`  ${i + 1}. ${s.title}   ${a}s–${b}s   (${s.background} background)`);
  say();
  if (s.eyebrow) say(`     kicker    ${s.eyebrow}`);
  if (s.headline?.text) {
    const mark = s.headline.mark && s.headline.mark !== "none"
      ? `   [${s.headline.mark} on "${s.headline.emphasis}"]`
      : "";
    say(`     headline  ${s.headline.text}${mark}`);
  }
  if (s.secondHeadline?.text) say(`               ${s.secondHeadline.text}`);
  if (s.deck) wrap(s.deck, 62, "               ").forEach((l, k) => say(k === 0 ? `     deck      ${l.trim()}` : l));

  if (s.beats?.length) {
    say();
    say(`     shots`);
    for (const beat of s.beats) {
      say(`       on "${beat.onWords}"`);
      wrap(beat.action, 64, "         ").forEach(say);
    }
  }

  if (s.typeSystem) say(`     type      ${s.typeSystem}${s.kineticNotes ? ` — ${s.kineticNotes}` : ""}`);
  if (s.motionMotif) say(`     motif     ${s.motionMotif}`);
  if (s.cameraNote) wrap(s.cameraNote, 62, "               ").forEach((l, k) => say(k === 0 ? `     camera    ${l.trim()}` : l));
  if (s.assets?.length) say(`\n     art       ${s.assets.join(", ")}`);
  if (s.layoutNotes) {
    say();
    wrap(s.layoutNotes, 64, "               ").forEach((l, k) =>
      say(k === 0 ? `     layout    ${l.trim()}` : l),
    );
  }

  const t = transitionAfter(s.id);
  if (t) {
    say();
    say(`        ↓  ${t.style} — ${t.why}`);
  }
  say();
});

/* ── Call to action ──────────────────────────────────────────────────────── */

if (plan.cta) {
  rule("ENDS ON");
  say(`  ${plan.cta.headline}`);
  if (plan.cta.emphasis) say(`  (highlight on "${plan.cta.emphasis}")`);
  say();
  say(`  Button   ${plan.cta.button}`);
  say(`  URL      ${plan.cta.url}`);
  if (plan.cta.badge) say(`  Badge    ${plan.cta.badge}`);
}

/* ── Production notes ────────────────────────────────────────────────────── */

rule("WHAT GETS MADE");
const manifest = plan.assetManifest ?? [];
const kinds = manifest.reduce((acc, a) => ({ ...acc, [a.kind]: (acc[a.kind] ?? 0) + 1 }), {});
say(`  Artwork    ${manifest.length} assets — ${Object.entries(kinds).map(([k, n]) => `${n} ${k}`).join(", ")}`);
wrap(manifest.map((x) => x.name).join(", "), 68, "             ").forEach(say);
say(`  Sound      ${(plan.sfx ?? []).length} cues`);
say(`  Cuts       ${(plan.transitions ?? []).map((t) => t.style).join(" → ") || "none"}`);

if (plan.risks?.length) {
  rule("FLAGGED FOR REVIEW");
  // Hanging indent, so a wrapped risk stays visually attached to its bullet.
  for (const r of plan.risks) {
    wrap(r, 70, "     ").forEach((l, k) => say(k === 0 ? `  •  ${l.trim()}` : l));
  }
}

/* ── The hand-off ────────────────────────────────────────────────────────── */

rule("NEEDED BEFORE THE BUILD CAN START");
say("  1. Voiceover      →  " + path.join(slug, "assets/audio/vo.mp3"));
say("     Read from the script above, or paste it into ElevenLabs, Play.ht or");
say("     any text-to-speech tool and download the mp3.");
say();
say("  2. Background     →  " + path.join(slug, "assets/audio/bg.mp3"));
say("     Instrumental only — vocals fight the narration. Ducked and looped");
say("     automatically, so levels and length do not matter.");
say();
say("  Do not trim the script to hit a target length. The reel is cut to");
say("  whatever the voiceover turns out to be.");
say();
say("  Changing the script now costs a minute. Changing it after recording");
say("  costs a re-record — so this is the moment to say what is wrong.");
say();

console.log(out.join("\n"));
