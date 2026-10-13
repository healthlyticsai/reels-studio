---
description: Build an approved product demo — voice it, lip-sync the presenter, check frames, render 16:9 and 9:16
argument-hint: "[demo-folder] [notes]"
---

Build the demo using the `reel-studio` skill. Load the skill now and follow "Demo mode",
phase 3.

**The user's request:**

$ARGUMENTS

**Do this**

```bash
SKILL_DIR="${CLAUDE_PLUGIN_ROOT}/skills/reel-studio"
DEMOS="${DEMO_STUDIO_ROOT:-$HOME/Healthlytics/demos}"
```

1. Find the project in `$DEMOS` (most recent with a `plan.json` if none is named) and `cd`
   into it. **Check `approved.json` exists.** If it does not, stop and ask them to approve the
   storyboard, in the Studio or here. If `plan.json` has `phiCheck` entries, confirm
   `approved.json` has `noPhiConfirmed: true` or that the flagged screenshots were replaced.
   Read any `note` in `approved.json` and act on it.
2. `npm install` (background; it overlaps with the next step).

**Which presenter engine?** Read `intake.json` → `presenterEngine`.

- `"omni"` (proof of concept): Gemini Omni Flash films the presenter speaking the whole
  script as one take, and **its audio becomes the voiceover**. Replace step 3 with
  `node scripts/omni-presenter.mjs --dry-run`: show them the segments and prompts, and say it
  bills Omni video seconds on the Gemini key's project. Then run it for real (in the
  background; each segment takes minutes). Use `--resolution 360p` for a cheap first try. If
  Omni refuses the avatar photo, say so and offer `--describe "…"` or an illustrated
  character. **Watch the take** (Read a few frames with `contact-sheet.mjs --video`) before
  continuing. Then do steps 4, 5 and 9–12. Skip steps 6–8: there is nothing to slice or
  lip-sync, because the take is placed at `clipFrom = -from` in every scene and is in sync by
  construction. Expect a lower word match in step 5 if Omni paraphrased; that is Omni
  changing the words, not a timing bug.
- `"higgsfield"` (default): follow every step below.

**Voice and timing**

3. `node scripts/tts.mjs`. This voices the approved script with the provider and voice in
   `intake.json` (Google Chirp 3 HD by default, or ElevenLabs) into `assets/audio/vo.mp3`. It
   keeps an existing file unless you pass `--force`.
4. `node scripts/transcribe.mjs`. This produces the word timings; the first run downloads
   whisper.
5. `node scripts/demo-timing.mjs`. This writes `src/demoTimeline.ts` and `timeline.json`.
   Read its table. A word match under ~90%, or any "could not find" warning, means the
   voiceover and the plan disagree; fix that before anything is lip-synced. It also places
   the sound effects automatically, unless the Studio's sound effects box is off.

**Presenter clips (Higgsfield via MCP)**

6. `node scripts/avatar-slices.mjs`. This cuts one audio slice per scene the presenter
   appears in and lists the jobs, with the total seconds.
7. Tell them how many seconds of lip-sync are about to be generated, then do each job whose
   status is not `done`, **one at a time**:
   - Use the Higgsfield MCP tools (list them first; they may have been renamed since this
     was written). Use the lip-sync / talking-avatar tool that takes an **image plus an audio
     file**. Never use one that takes text, because it would re-voice the line and break sync
     with `vo.mp3`.
   - Inputs: the avatar still (`public/` + `AVATAR_STILL` from `src/demoTimeline.ts`) and
     that job's `audio` slice. If the tool wants URLs rather than files, use its upload tool.
   - Save the result to the job's `raw` path (`assets/avatar/raw/<scene>.mp4`).
   - For a `retake`, read its `note` first. Regenerate only flagged or pending jobs; never
     regenerate one that is `done`.
   If the Higgsfield MCP is not connected, say so and give the setup line from the skill.
   Do not guess tool names. Meanwhile the person can make the clips in the Higgsfield web
   app and upload each on the Studio page; the slices are playable there too.
8. `node scripts/avatar-normalize.mjs`. This conforms the clips, flags any that are too
   short as `retake`, and refreshes the timeline.

**Look, check, render**

9. Copy the backdrop from `direction.json` into `src/look.ts`. Keep the camera `locked` or
   `drift`, because the screenshot zooms already move the frame.
10. Stills, both formats, 6–10 frames each: every scene's entry, every focus action's frame,
    every transition. Write them to `out/stills/` so they appear in the Studio:
    `npx remotion still Demo-16x9 out/stills/16x9-f<N>.png --frame=<N> --scale=0.5`
    (and the same for `Demo-9x16`). **Read every one.** Look for boxes that do not land on
    their element, a bubble covering the focus, text under captions, and a clip that shows
    the still instead of video (its job is not `done`).
11. Draft first: `node scripts/render.mjs --all --draft`. Watch the lip-sync at each
    presenter scene. Then deliver: `node scripts/render.mjs --all`. Run renders in the
    background and relay the heartbeat.
12. `node scripts/contact-sheet.mjs --video out/<folder>-16x9.mp4 /tmp/final-16x9.png` (and
    the 9:16), then read both sheets.

Finish by pointing them at the Studio page, where both renders play and every presenter clip
can be flagged for a retake. Changes after that go through `/reel-revise`.
