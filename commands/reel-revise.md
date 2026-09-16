---
description: Change something in an existing reel and re-render it
argument-hint: "<what to change> [folder]"
---

Revise an existing reel using the `reel-studio` skill.

**The user's request:**

$ARGUMENTS

**Work in place**

Do not start a new project. `cd` into the existing folder, make the change there, re-check the
affected frames, re-render. With no folder given, use the most recent reel and say which.

**Work out what the change actually touches**

- **Visual only** — colour, photo, layout, timing, sound level, a transition. Edit and
  re-render. No re-record.
- **The words on screen** — a headline or a caption. Edit the scene. The captions are
  generated from `src/captions.json`, so a spoken-word correction goes in
  `brand.json → captions.misheardBrandTerms` rather than being hand-edited.
- **The script itself** — the narration changes. This needs a new recording. Update `PLAN.md`,
  tell them plainly that a new `vo.mp3` is required, and stop. When it arrives, re-run
  `node scripts/transcribe.mjs` and **re-derive `src/timing.ts` from the new transcript** —
  every anchor in the reel is pinned to word positions that have just moved.
- **A generated photo** — regenerate that one asset with `/reel-assets`, passing `--ref` if it
  has to match a person already in the reel.
- **The whole look** — "make it feel darker", "this is too papery", "can it look like the
  last one". A restyle is not a rebuild. `BACKDROP` and `CAMERA` in `src/look.ts` re-skin
  every scene at once, and a scene's entry in `SCENE_TYPE_ANIM` changes how its type arrives.
  For a genuinely different direction, draw a new one — `node scripts/direction.mjs
  --project .` (add `--art <id>` if they named a style, or `--seed <n>` for a look they liked
  before) — then update `look.ts` from the new `direction.json`. The scenes themselves usually survive untouched; check the transitions
  still come from the new art direction's cut palette.

**Then**

Render stills for the frames you touched and read them before re-rendering the video. A fix
that looks right in code often moves something else.

Say what you changed and what you deliberately left alone.
