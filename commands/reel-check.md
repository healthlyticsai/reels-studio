---
description: Render still frames across the reel and actually look at them for layout problems
argument-hint: "[frame numbers] [or: scene name to focus on]"
---

Review the reel's own frames using the `reel-studio` skill.

**The user's request:**

$ARGUMENTS

**Why this exists**

Layout collisions, clipped text, bad mattes and z-order mistakes are invisible in source and
obvious in a picture. Every real bug found in the reel this skill was built from was found
here, not by reading code.

**Do this**

1. Pick the frames. With none given, cover every major beat — ten to fifteen across a
   60-second reel. Read `src/timing.ts` and pick a frame inside each scene's headline
   moment, each big transition, and each payoff.
2. Render them:
   ```bash
   npx remotion still Reel /tmp/chk/f<N>.png --frame=<N> --scale=0.4
   ```
   Stills are cheap — two or three seconds each once the bundle is warm. The *first* one in a
   fresh project pays for the bundle and can take a couple of minutes; that is normal and
   happens once.
3. **Read every PNG.** Not a sample — every one.

**What to look for**

- Anything below y≈1620 in the full frame, which is where captions sit.
- Headlines that wrapped. A wrapped line breaks its own underline or strike, which reads as a
  mistake rather than a style.
- Text touching or crossing a card edge.
- An element that moved because a container above it grew — absolutely-positioned siblings do
  not reflow around each other.
- Cutouts with a magenta fringe, or a grey checkerboard, meaning the matte failed.
- A scene where nothing is moving except the foreground.

A still cannot show you motion. When the question is whether the timing lands rather than
whether the layout holds, `node scripts/render.mjs --draft` gives you the whole reel at half
scale in well under half the time of a full render.

**Then**

List what you found, fix it, and re-render the affected frames. Expect two or three rounds.
Say plainly if something is wrong that you have chosen not to fix, and why.
