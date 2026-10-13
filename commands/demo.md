---
description: Stage a product demo from a Studio intake — storyboard the story over the real screenshots, then stop for approval
argument-hint: "<demo-folder> [any notes on emphasis or what to avoid]"
---

Stage a **product demo** using the `reel-studio` skill. Load the skill now and follow
"Demo mode", phase 1.

**The user's request:**

$ARGUMENTS

**What a demo is**

A presenter (the person's avatar, lip-synced by Higgsfield) speaks the person's own story, word
for word, in the voice they picked in the Studio (Google Chirp 3 HD, or their ElevenLabs
clone), over their real product screenshots. The product
is never generated. It is always the uploaded PNG, with the camera zooming, highlighting and
clicking on it. One timeline renders twice: 16:9 and 9:16.

**Do this**

```bash
SKILL_DIR="${CLAUDE_PLUGIN_ROOT}/skills/reel-studio"
DEMOS="${DEMO_STUDIO_ROOT:-$HOME/Healthlytics/demos}"
```

1. Find the project: `$DEMOS/<folder>/intake.json`. With no folder given, use the most
   recently changed intake that has no `plan.json` yet, and say which you picked. If there is
   no intake at all, tell them to start the Studio (`node studio/server.mjs` in the plugin
   folder) and create one at http://localhost:4400. Do not invent a story, because the
   script is theirs to write.
2. Check the keys: `node "$SKILL_DIR/scripts/check-env.mjs" --mode demo --provider <p> --engine <e>`,
   with `<p>` from `intake.json` → `voice.provider` (default `google`) and `<e>` from
   `presenterEngine` (default `higgsfield`; with `omni`, no voice provider is needed). Gemini is needed now. If the
   voice provider is not set up, say so now so it can be sorted before the build.
3. Scaffold around the intake, which never overwrites their uploads:
   `cd "$DEMOS" && bash "$SKILL_DIR/scripts/new-project.sh" "<folder>" --mode demo`
   If the folder already has a `package.json`, it is scaffolded already. Skip this step.
4. Stage it:
   `node "$SKILL_DIR/scripts/demo-brief.mjs" --project "$DEMOS/<folder>" --notes "..."`
   Add `--polish` only if they asked for the story to be tightened. By default it is spoken
   exactly as written, and improvements come back as suggestions.

**Then show them the storyboard**

The script prints it. Relay it in full, as with a reel. Then read `plan.json` yourself and
check the three things most likely to be wrong:

- **Focus boxes.** Open each screenshot a scene uses (Read the PNG in `public/screens/`) and
  check each box against the element its words name. Boxes are `[x, y, w, h]` as fractions
  of the image. Fix a box that misses by editing `plan.json` directly; no re-run is needed.
- **Patient data.** Anything in `phiCheck` blocks the demo until the screenshot is replaced.
  Say so plainly.
- **`validationErrors`.** Fix them in `plan.json`, or re-run with a note.

Point them at the Studio page (http://localhost:4400/#/p/<folder>), where the storyboard is
drawn over the real screenshots with every box visible, and where they can approve it. They
can also approve here in chat. If they do, write
`{"approvedAt": "<now>", "note": "approved in chat"}` to `approved.json`.

**Then stop.** Nothing is voiced or generated until the storyboard is approved; the voiceover
and the lip-sync cost money and time, and both are wasted by a script change afterwards.
Close by naming the next command: `/demo-build <folder>`.
