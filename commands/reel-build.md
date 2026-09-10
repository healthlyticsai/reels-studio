---
description: Build the reel now that the voiceover and music have arrived
argument-hint: "[folder] [any notes on what to emphasise]"
---

Build the reel using the `reel-studio` skill. Load the skill now and follow phase 3.

**The user's request:**

$ARGUMENTS

**Do this**

1. Work out which project. With no folder given, use the one with a `PLAN.md` and audio in
   `assets/audio/` — say which you picked. Then `cd` into it.
2. Verify the hand-off actually landed:
   `node scripts/check-audio.mjs .`
   If either file is missing or too small to be a real recording, stop and say so.
3. `npm install`
4. Start the slow things in the background early — transcription and image generation both
   take minutes and neither blocks the other.

**Transcribe first, and rebuild the timeline around what you hear**

```bash
node scripts/transcribe.mjs
```

This is the step that makes the reel feel cut to the narration rather than laid over it.
It prints a sentence table with real frame numbers.

**Write those numbers into `src/timing.ts`. Do not use `plan.json`'s second estimates** —
they were written before the voiceover existed and real delivery drifts by seconds. Map each
scene onto the sentence group that carries it, then anchor individual beats to the frame of
the specific word they land on, leaving a comment naming that word. Read the timing
arithmetic in `references/production-playbook.md` before wiring up transitions — scene
durations have to include the transition that follows them.

**Generate the artwork**

```bash
node scripts/generate-assets.mjs
node scripts/matte.mjs
node scripts/contact-sheet.mjs public/art /tmp/contact.png
```

**Read that contact sheet.** An asset that comes back near-100% opaque was not keyed —
regenerate it. Flat single-colour shapes need `matte-ink.mjs` instead.

**Write the scenes — compose, do not rebuild**

One file per scene in `src/scenes/`, built from the bundled kit. The typography, transitions
and motion devices are already written and tested; re-deriving them burns effort better spent
on the scene. `references/component-kit.md` is the API.

Read `references/production-playbook.md` before the first scene. The rules that are cheap now
and expensive later: content stays above y=1620 or it renders under a caption, headlines are
sentence case with animated marks for emphasis, a headline that wraps breaks its own
underline, every scene needs one slow continuous move.

**Then check your own frames, and render**

Follow through with `/reel-check` and `/reel-render` rather than rendering blind. The first
pass always has something overlapping.
