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

/* ── Header ──────────────────────────────────────────────────────────────── */

say(`${plan.title}`);
say("=".repeat(plan.title.length));
say();
wrap(plan.logline).forEach(say);
say();
say(`Target length  ~${plan.durationSeconds}s        Scenes  ${plan.scenes?.length ?? 0}        Folder  ./${slug}/`);

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
say(`  Artwork    ${(plan.assetManifest ?? []).map((x) => x.name).join(", ") || "none"}`);
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
