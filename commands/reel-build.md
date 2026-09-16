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

A manifest runs to twelve to eighteen assets, so start this early and write scenes while it
runs. It generates three at a time; `--missing` picks up only what is not on disk yet.
`matte.mjs` reads the manifest and routes each kind itself — chroma for cutouts and props,
luminance for flat symbols, nothing for textures and environment plates.

**Read that contact sheet.** An asset that comes back near-100% opaque was not keyed —
regenerate it.

**Set the look before writing a line of scene code**

Read `direction.json`. It holds the art direction, camera language, kinetic type systems and
motion motifs drawn for this reel, and it is a spec rather than a mood board. Copy the three
values it decides into `src/look.ts`: the backdrop variant, the camera mode, and the type
animation for each scene from that scene's `typeSystem` in the plan.

**No two adjacent scenes may share a type animation.** Listing them together in `look.ts` is
what makes that easy to check, and it is the single most visible rule in the system.

**Write the scenes — compose, do not rebuild**

One file per scene in `src/scenes/`, built from the bundled kit. The typography, transitions
and motion devices are already written and tested; re-deriving them burns effort better spent
on the scene. `references/component-kit.md` is the API.

Every scene has the same skeleton: `<Backdrop variant={BACKDROP} />` first, content wrapped in
`<CameraMove mode={CAMERA} duration={...}>`, `<PaperTexture />` last. Take each scene's
kinetic treatment and motion motif from what the plan assigned it, and take transitions from
the art direction's cut palette rather than reaching for `tornPaper` every time.

Read `references/production-playbook.md` before the first scene. The rules that are cheap now
and expensive later: content stays above y=1620 or it renders under a caption, headlines are
sentence case with animated marks for emphasis, a headline that wraps breaks its own
underline, every scene needs one slow continuous move.

**Then check your own frames, and render**

Follow through with `/reel-check` and `/reel-render` rather than rendering blind. The first
pass always has something overlapping.
