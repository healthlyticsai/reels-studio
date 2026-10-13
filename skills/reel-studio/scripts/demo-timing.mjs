/**
 * Turns the approved demo plan and the transcribed voiceover into src/demoTimeline.ts —
 * the timeline both compositions render from.
 *
 * The plan names sentences and words; this finds the frame each one is actually
 * spoken. The script words are aligned against whisper's words (edit-distance
 * alignment, so a misheard brand name or a dropped "the" does not derail
 * everything after it), then:
 *
 *   - each scene starts on its first word, a few frames early so the cut leads
 *   - each focus action ramps in so it lands on its anchor word
 *   - each sound cue lands two frames before its word
 *   - each avatar clip is placed where its audio slice was cut
 *
 * Also copies the audio into public/ (where Remotion reads it) and writes
 * timeline.json, which avatar-slices.mjs and the Studio UI read. Safe to re-run:
 * run it again after the avatar clips arrive so demoTimeline.ts picks them up.
 *
 * Also places the kit's sound effects on each demo's recurring beats (see
 * "Automatic sound design" below) unless intake.soundEffects is false.
 *
 * Usage: node scripts/demo-timing.mjs [--no-auto-sfx]
 */
import fs from "fs";
import path from "path";

const FPS = 30;
/** Frames the cut lands before a scene's first word. */
const CUT_LEAD = 3;
/** Frames a focus ramp starts before its word, so it is settled as the word lands. */
const FOCUS_LEAD = 8;
/** Frames of padding either side of an avatar slice. timeline.json carries the result. */
const SLICE_PAD = 6;
/** Frames held after the last word, so the closing card can settle. */
const TAIL = 45;
const DEFAULT_TRANSITION = 16;

const ANIMS = ["punch", "riseMask", "blurIn", "drift", "cascade", "flip", "rollUp", "elastic"];
const STYLES = new Set([
  "cut", "fade", "slide", "tornPaper", "inkSplatter", "cardPush", "stackShuffle", "halftoneDissolve",
  "whipPan", "barWipe", "zoomPunch", "glitchSlice", "irisWipe", "shutterSlats", "filmBurn", "colorFlash", "pathWipe",
]);
const SFX = new Set(["whoosh", "whip", "page-turn", "switch", "mouse-click", "ding"]);

const cwd = process.cwd();
const read = (p) => JSON.parse(fs.readFileSync(path.join(cwd, p), "utf8"));
const exists = (p) => fs.existsSync(path.join(cwd, p));
const f = (ms) => Math.round((ms / 1000) * FPS);

if (!exists("plan.json")) throw new Error("No plan.json — run the demo brief first.");
if (!exists("src/captions.json")) throw new Error("No src/captions.json — run node scripts/transcribe.mjs first.");

const plan = read("plan.json");
const intake = exists("intake.json") ? read("intake.json") : {};
const captions = read("src/captions.json");
if (!captions.length) throw new Error("src/captions.json is empty — the transcription found no speech.");

/* ── Words ───────────────────────────────────────────────────────────────── */

const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

/** Whisper emits sub-word tokens; glue them back into words (same rule as Captions.tsx). */
const heard = [];
for (const c of captions) {
  const t = c.text.trim();
  if (!t) continue;
  const glue = heard.length && (!/^\s/.test(c.text) || /^[,.\-?!:;]+$/.test(t));
  if (glue) {
    const prev = heard[heard.length - 1];
    prev.text += t;
    prev.endMs = Math.max(prev.endMs, c.endMs);
  } else {
    heard.push({ text: t, startMs: c.startMs, endMs: c.endMs });
  }
}
const heardNorm = heard.map((w) => norm(w.text));

/** Script words, each tagged with its scene. */
const script = [];
let sentenceNo = 0;
plan.scenes.forEach((s, si) => {
  for (const sentence of s.voiceoverSentences ?? []) {
    for (const w of sentence.split(/\s+/).filter(Boolean)) {
      const n = norm(w);
      if (n) script.push({ n, scene: si, sentence: sentenceNo });
    }
    sentenceNo++;
  }
});

/* ── Align script ↔ transcript ──────────────────────────────────────────── */

const n = script.length;
const m = heard.length;
const cost = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
for (let i = 0; i <= n; i++) cost[i][0] = i;
for (let j = 0; j <= m; j++) cost[0][j] = j;
for (let i = 1; i <= n; i++) {
  for (let j = 1; j <= m; j++) {
    const sub = script[i - 1].n === heardNorm[j - 1] ? 0 : 1;
    cost[i][j] = Math.min(cost[i - 1][j - 1] + sub, cost[i - 1][j] + 1, cost[i][j - 1] + 1);
  }
}
/** script index → transcript index (substitutions count as a match: whisper misheard it). */
const map = new Array(n).fill(-1);
for (let i = n, j = m; i > 0 && j > 0; ) {
  const sub = script[i - 1].n === heardNorm[j - 1] ? 0 : 1;
  if (cost[i][j] === cost[i - 1][j - 1] + sub) {
    map[i - 1] = j - 1;
    i--;
    j--;
  } else if (cost[i][j] === cost[i - 1][j] + 1) i--;
  else j--;
}
// Fill the gaps from the nearest matched neighbour.
for (let i = 0; i < n; i++) if (map[i] === -1) map[i] = i > 0 ? map[i - 1] : 0;
const matched = script.filter((_, i) => script[i].n === heardNorm[map[i]]).length;
const accuracy = matched / Math.max(1, n);

const wordFrame = (scriptIndex) => f(heard[map[scriptIndex]].startMs);

/* ── Scene boundaries ────────────────────────────────────────────────────── */

const voEnd = f(heard[heard.length - 1].endMs);
const firstWord = plan.scenes.map((_, si) => script.findIndex((w) => w.scene === si));
const starts = plan.scenes.map((_, si) =>
  si === 0 || firstWord[si] === -1 ? 0 : Math.max(0, wordFrame(firstWord[si]) - CUT_LEAD),
);
// A scene with no words of its own (a pure visual beat) starts where the last one ended.
for (let si = 1; si < starts.length; si++) if (starts[si] <= starts[si - 1]) starts[si] = starts[si - 1] + 45;
const total = Math.max(voEnd + TAIL, starts[starts.length - 1] + 60);

/** Find a phrase inside one scene's words; returns the script index of its first word. */
const findPhrase = (si, phrase) => {
  const target = String(phrase ?? "").split(/\s+/).map(norm).filter(Boolean);
  const idx = script.map((w, i) => (w.scene === si ? i : -1)).filter((i) => i !== -1);
  if (!target.length || !idx.length) return null;
  for (let k = 0; k + target.length <= idx.length; k++) {
    if (target.every((t, o) => script[idx[k + o]].n === t)) return idx[k];
  }
  const loose = idx.find((i) => script[i].n === target[0]);
  return loose ?? null;
};

/* ── Presenter engine ────────────────────────────────────────────────────── */

// "higgsfield": one lip-synced clip per scene, cut to that scene's audio slice.
// "omni": one continuous take whose own audio IS vo.mp3, so every scene plays the
// same take at its absolute frame (clipFrom = -from) and is in sync by construction.
const engine = intake.presenterEngine === "omni" ? "omni" : "higgsfield";
const OMNI_TAKE = "avatar/take.mp4";
const hasTake = engine === "omni" && exists(path.join("public", OMNI_TAKE));

/* ── Screens ─────────────────────────────────────────────────────────────── */

const screens = new Map((intake.screens ?? []).map((s) => [s.id, s]));

/* ── Build scenes ────────────────────────────────────────────────────────── */

const warnings = [];
let prevAnim = null;
const scenes = plan.scenes.map((s, si) => {
  const from = starts[si];
  const next = si + 1 < starts.length ? starts[si + 1] : total;
  const duration = next - from;

  const layout = s.type === "avatar" ? "full" : s.type === "split" ? "split" : (s.avatar ?? "none");
  const t = (plan.transitions ?? []).find((x) => x.from === s.id);
  const style = STYLES.has(t?.style) ? t.style : "fade";
  const transition =
    si < plan.scenes.length - 1
      ? { style, frames: style === "cut" ? 0 : Math.min(DEFAULT_TRANSITION, Math.floor(duration / 3)) }
      : undefined;

  const sliceStart = Math.max(0, from - SLICE_PAD);
  // A full-frame presenter shot jump-cuts on each new sentence after its first.
  const cuts =
    layout === "full"
      ? [...new Set(script.filter((w) => w.scene === si).map((w) => w.sentence))]
          .slice(1)
          .map((sn) => wordFrame(script.findIndex((w) => w.sentence === sn)) - from - 2)
          .filter((c) => c > 20 && c < duration - 10)
      : [];
  const clip = `avatar/${s.id}.mp4`;

  const screen = s.screen ? screens.get(s.screen) : null;
  if (s.screen && !screen) warnings.push(`${s.id}: screen "${s.screen}" is not in intake.json`);

  const focus = (s.focus ?? []).map((fo) => {
    const at = findPhrase(si, fo.onWords);
    if (at === null) warnings.push(`${s.id}: could not find "${fo.onWords}" in this scene's words`);
    const local = at === null ? 12 : Math.max(4, wordFrame(at) - from - FOCUS_LEAD);
    const box = (fo.box ?? [0, 0, 1, 1]).map((v) => Math.min(1, Math.max(0, Number(v))));
    return { at: local, box, action: fo.action ?? "zoom", ...(fo.label ? { label: fo.label } : {}), onWords: fo.onWords };
  });

  let anim = ANIMS.includes(s.typeAnim) ? s.typeAnim : ANIMS[si % ANIMS.length];
  if (anim === prevAnim) anim = ANIMS[(ANIMS.indexOf(anim) + 1) % ANIMS.length];
  prevAnim = anim;

  const headline = s.headline?.text
    ? {
        text: s.headline.text,
        emphasis: s.headline.emphasis || undefined,
        mark: s.headline.mark ?? "none",
        at: 6,
        ...(s.headline.style === "glow" || s.headline.style === "marker" ? { style: s.headline.style } : {}),
      }
    : undefined;

  // Laptop-film extras: the camera move, a mid-scene screen swap, a checklist.
  const MOTIONS = ["swingIn", "tiltBack", "riseUp", "float", "front"];
  const motion = MOTIONS.includes(s.motion) ? s.motion : undefined;
  const wordAt = (phrase, fallback) => {
    const at = findPhrase(si, phrase);
    if (at === null && phrase) warnings.push(`${s.id}: could not find "${phrase}" in this scene's words`);
    return at === null ? fallback : Math.max(4, wordFrame(at) - from - 4);
  };
  const nextSrc = s.nextScreen?.screen ? screens.get(s.nextScreen.screen) : null;
  if (s.nextScreen?.screen && !nextSrc) warnings.push(`${s.id}: nextScreen "${s.nextScreen.screen}" is not in intake.json`);
  const nextScreen = nextSrc
    ? {
        screen: { src: nextSrc.src, device: screen?.device ?? nextSrc.device ?? "desktop", width: nextSrc.width, height: nextSrc.height },
        at: wordAt(s.nextScreen.onWords, Math.round(duration / 2)),
      }
    : undefined;
  // A focus that starts before the swap belongs to the first screenshot: let it
  // go as the second one fades in, or the camera stays parked on a spot that no
  // longer shows what it was pointing at.
  if (nextScreen) {
    for (const fo of focus) if (fo.at < nextScreen.at && fo.until === undefined) fo.until = nextScreen.at + 12;
  }
  const list = (s.list ?? []).length
    ? { items: s.list.map((item, k) => ({ text: item.text, at: wordAt(item.onWords, 20 + k * 20) })) }
    : undefined;

  return {
    id: s.id,
    type: s.type,
    from,
    duration,
    says: (s.voiceoverSentences ?? []).join(" "),
    avatar: {
      layout,
      ...(engine === "omni"
        ? layout !== "none" && hasTake
          ? { clip: OMNI_TAKE }
          : {}
        : layout !== "none" && exists(path.join("public", clip))
          ? { clip }
          : {}),
      clipFrom: engine === "omni" ? -from : sliceStart - from,
      ...(cuts.length ? { cuts } : {}),
      ...(s.avatarCorner ? { corner: s.avatarCorner } : {}),
    },
    ...(screen
      ? {
          screen: {
            src: screen.src,
            device: screen.device ?? "desktop",
            width: screen.width,
            height: screen.height,
            ...(screen.url || intake.url ? { url: screen.url || intake.url } : {}),
          },
        }
      : {}),
    focus,
    ...(motion ? { motion } : {}),
    ...(nextScreen ? { nextScreen } : {}),
    ...(list ? { list } : {}),
    ...(headline ? { headline } : {}),
    ...(s.eyebrow ? { eyebrow: s.eyebrow } : {}),
    typeAnim: anim,
    ...(transition ? { transition } : {}),
    // For avatar-slices.mjs: the slice covers the scene plus the transition out,
    // since the outgoing scene is still on screen while it plays.
    _slice: { start: sliceStart, end: Math.min(voEnd + SLICE_PAD, next + (transition?.frames ?? 0) + SLICE_PAD) },
  };
});

const sfx = (plan.sfx ?? [])
  .filter((x) => SFX.has(x.file))
  .map((x) => {
    const si = plan.scenes.findIndex((s) =>
      (s.voiceoverSentences ?? []).join(" ").toLowerCase().includes(String(x.onWords).toLowerCase()),
    );
    const at = si === -1 ? null : findPhrase(si, x.onWords);
    if (at === null) {
      warnings.push(`sfx "${x.file}" on "${x.onWords}": words not found, dropped`);
      return null;
    }
    return { at: wordFrame(at) - 2, file: x.file, volume: Math.min(0.6, Number(x.volume) || 0.3) };
  })
  .filter(Boolean);

/* ── Automatic sound design ──────────────────────────────────────────────── */

// The six kit sounds, placed on the beats every demo has: a cut, a zoom, a
// highlight landing, the closing button. Mixed well under the voice. The plan's
// own cues win any collision, and cursor clicks already carry their own sound
// inside Screenshot. Off with intake.soundEffects = false or --no-auto-sfx.
const autoSfx = intake.soundEffects !== false && !process.argv.includes("--no-auto-sfx");
const CUT_SOUND = {
  whipPan: ["whip", 0.24], cardPush: ["whip", 0.22], barWipe: ["whip", 0.2], glitchSlice: ["switch", 0.22],
  tornPaper: ["page-turn", 0.26], stackShuffle: ["page-turn", 0.24], slide: ["whoosh", 0.16],
  // A crossfade is meant to be felt, not heard.
  fade: null,
};
const auto = [];
const clicks = [];
if (autoSfx) {
  for (const s of scenes) {
    const t = s.transition;
    if (t && t.style !== "cut") {
      const cue = t.style in CUT_SOUND ? CUT_SOUND[t.style] : ["whoosh", 0.2];
      if (cue) auto.push({ at: s.from + s.duration - 2, file: cue[0], volume: cue[1] });
    }
    for (const fo of s.focus) {
      const at = s.from + fo.at;
      if (fo.action === "zoom") auto.push({ at, file: "whoosh", volume: 0.1, rate: 1.4 });
      if (fo.action === "highlight") auto.push({ at: at + 12, file: "switch", volume: 0.18 });
      if (fo.action === "click") clicks.push(at);
    }
    // CtaLayout pops the button 30 frames after the headline, which lands at 10.
    if (s.type === "cta") auto.push({ at: s.from + (s.headline?.at ?? 10) + 32, file: "ding", volume: 0.26 });
  }
}
const near = (list, at) => list.some((x) => Math.abs((x.at ?? x) - at) < 8);
for (const hit of auto.sort((a, b) => a.at - b.at)) {
  if (hit.at >= 0 && hit.at < total && !near(sfx, hit.at) && !near(clicks, hit.at)) sfx.push(hit);
}
sfx.sort((a, b) => a.at - b.at);

/* ── Audio into public/ ──────────────────────────────────────────────────── */

fs.mkdirSync(path.join(cwd, "public", "audio"), { recursive: true });
fs.copyFileSync(path.join(cwd, "assets/audio/vo.mp3"), path.join(cwd, "public/audio/vo.mp3"));
const music = exists("assets/audio/bg.mp3");
if (music) fs.copyFileSync(path.join(cwd, "assets/audio/bg.mp3"), path.join(cwd, "public/audio/bg.mp3"));

/* ── Write ───────────────────────────────────────────────────────────────── */

const stripped = scenes.map(({ _slice, ...rest }) => rest);
const avatarStill = intake.avatar ?? "avatar/avatar.png";
const cta = {
  headline: plan.cta?.headline ?? "",
  ...(plan.cta?.emphasis ? { emphasis: plan.cta.emphasis } : {}),
  button: plan.cta?.button ?? "Book a demo",
  url: plan.cta?.url ?? intake.url ?? "",
  ...(plan.cta?.badge ? { badge: plan.cta.badge } : {}),
};

const ts = `/**
 * The demo's timeline — WRITTEN BY scripts/demo-timing.mjs from plan.json and
 * the transcribed voiceover. Every frame below is where its word is actually
 * spoken. Re-run the script rather than hand-editing frames; hand-edit the plan
 * or the look instead. Script/transcript word match: ${(accuracy * 100).toFixed(0)}%.
 */
import type { Cta, DemoScene, Presenter, SfxHit } from "./demoSpec";

export const FPS = ${FPS};

export const AVATAR_STILL = ${JSON.stringify(avatarStill)};

export const HAS_VO = true;

export const MUSIC = ${music};

export const SCENES: DemoScene[] = ${JSON.stringify(stripped, null, 2)};

export const TOTAL = ${total};

/** Frame the narration stops: "${heard[heard.length - 1].text}". */
export const VO_END = ${voEnd};

export const CTA: Cta = ${JSON.stringify(cta, null, 2)};

export const PRESENTER: Presenter = ${JSON.stringify(intake.presenter ?? {}, null, 2)};

export const SFX: SfxHit[] = ${JSON.stringify(sfx, null, 2)};
`;

fs.writeFileSync(path.join(cwd, "src/demoTimeline.ts"), ts);
fs.writeFileSync(
  path.join(cwd, "timeline.json"),
  JSON.stringify({ fps: FPS, total, voEnd, accuracy, avatarStill, engine, scenes: scenes.map(({ _slice, ...s }) => ({ ...s, slice: _slice })) }, null, 2),
);

/* ── Report ──────────────────────────────────────────────────────────────── */

const sec = (fr) => (fr / FPS).toFixed(2).padStart(6);
console.log(`\nPresenter: ${engine}${engine === "omni" ? (hasTake ? " (one continuous take)" : " — no take yet, run omni-presenter.mjs") : ""}`);
console.log(`Script/transcript word match: ${(accuracy * 100).toFixed(0)}%  ·  VO ends f${voEnd}  ·  total ${total} frames (${(total / FPS).toFixed(1)}s)\n`);
for (const s of scenes) {
  console.log(`  ${s.id.padEnd(16)} ${s.type.padEnd(7)} f${String(s.from).padStart(5)}  ${sec(s.from)}s  +${s.duration}  avatar:${s.avatar.layout}${s.avatar.clip ? " (clip)" : ""}`);
  for (const fo of s.focus) console.log(`      ${fo.action.padEnd(9)} local f${String(fo.at).padStart(4)}  "${fo.onWords}"`);
}
if (accuracy < 0.85) {
  warnings.unshift(
    `Only ${(accuracy * 100).toFixed(0)}% of script words matched the transcript — check the voiceover is the approved script.`,
  );
}
if (warnings.length) {
  console.log("\nCheck these:");
  for (const w of warnings) console.log(`  - ${w}`);
}
console.log(`\nSound: ${sfx.length} cue(s)${autoSfx ? "" : " — automatic sound effects off"}.`);
console.log(`Wrote src/demoTimeline.ts and timeline.json${music ? "" : " (no bg.mp3 — music off)"}.`);
