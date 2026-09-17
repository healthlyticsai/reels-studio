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
   node scripts/render.mjs
   ```
   Do **not** call `npx remotion render` directly. `render.mjs` sizes concurrency to the
   machine's actual free memory, prints a heartbeat with an ETA every fifteen seconds, and
   stops itself with a diagnosis rather than running for half an hour — a fixed
   `--concurrency` on a machine that is already swapping is what turns a two-minute render
   into a thirty-minute one.

   Run it in the **background** and report the heartbeat as it arrives, so the person can see
   it working. Expect two to four minutes for a 60-second reel.

   `node scripts/render.mjs --draft` is half scale and around a third quicker — use it when
   the point is to check motion rather than to deliver.

**If it is slow or gives up**

The script prints the ladder to work through, and the first rung is the one that matters:
check `sysctl vm.swapusage`. Swap near full means the machine is out of memory, and closing a
browser is worth more than any flag. Do not simply rerun it with a longer `--max-minutes` and
hope; say what the machine is doing.

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
