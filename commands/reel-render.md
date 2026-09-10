---
description: Render the reel to mp4 and verify the delivered file
argument-hint: "[folder] [crf 18-24] [any notes]"
---

Render the reel using the `reel-studio` skill.

**The user's request:**

$ARGUMENTS

**Before rendering**

If the frames have not been reviewed since the last change, run `/reel-check` first. A render
takes minutes; a still takes seconds.

**Do this**

1. `cd` into the reel folder. With none given, use the most recent one.
2. ```bash
   npx remotion render Reel out/<slug>.mp4 --codec=h264 --crf=20 --concurrency=6
   ```
   `--crf=20` is the default. `18` is visually identical for this content and roughly 15%
   larger; `22–24` if the file has to fit a tighter upload limit. Drop `--concurrency` if the
   machine is swapping.

**Then check the delivered file, not the composition**

They can differ, and the mp4 is what ships.

```bash
node scripts/contact-sheet.mjs --video out/<slug>.mp4 /tmp/final.png
```

**Read that sheet.** Confirm every scene is there, nothing is hidden behind a caption, the
transitions land, and the last frame is the call to action rather than an empty hold.

Also confirm the duration matches the voiceover — if the video is meaningfully longer than
the narration, the composition length in `src/timing.ts` is stale.

**Then deliver**

Send the mp4 with `SendUserFile`, and say:

- What you built, in a couple of lines.
- Anything you changed from `PLAN.md`, and why.
- Anything you could not do, or left out.

Note the file size. Above ~30MB it will not reach a phone through this conversation, though
it is still on disk — say so plainly rather than letting them wonder where it went.
