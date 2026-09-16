---
description: Start a new promo reel — scaffold the project and get the creative plan and voiceover script
argument-hint: "<topic> [audience: ...] [against: ...] [tone: ...] [seconds: 45]"
---

Start a **new reel** using the `reel-studio` skill. Load the skill now and follow phase 1.

**The user's request:**

$ARGUMENTS

**How to read that request**

- The first part is the topic. Everything after it is context that shapes the brief:
  audience, what it is positioned against, tone, length, anything off-limits. Pass all of it
  to `brief.mjs` via `--notes`.
- Turn the topic into a short kebab-case slug — about five words, short enough to type. That
  becomes the folder name.
- If the topic is genuinely too thin to write a script from ("make a reel"), ask what it is
  about before spending a Gemini call. Anything with a real subject in it is enough to start.

**Do this**

Resolve the skill directory first — the scaffolding scripts live there, and nothing exists in
the working directory yet:

```bash
SKILL_DIR="${CLAUDE_PLUGIN_ROOT}/skills/reel-studio"
```

1. Check the key: `node "$SKILL_DIR/scripts/check-env.mjs"`. Stop and explain if it is missing.
2. Scaffold: `bash "$SKILL_DIR/scripts/new-project.sh" "<slug>"`. It refuses to overwrite an
   existing folder — if the slug is taken, ask whether to revise that reel instead.
3. Brief: `node "$SKILL_DIR/scripts/brief.mjs" --topic "..." --notes "..." --project ./<slug>`

   That one command draws a creative direction for this reel, researches the topic with web
   grounding, then writes the plan against both. It takes a couple of minutes. Pass everything
   the person told you through `--notes` — it reaches the research pass as well as the brief.

   Add `--seconds 45` for a different length, `--art <id>` or `--arc <id>` if they asked for a
   specific style or structure, `--seed <n>` to reproduce a look from an earlier reel.
   `node "$SKILL_DIR/scripts/direction.mjs" --list` prints every option by id.

**Then show them the whole plan**

`brief.mjs` finishes by printing a storyboard digest: the look drawn for this reel, what the
research turned up, the voiceover script verbatim, every scene shot by shot with its headline
and kinetic type treatment and the words each beat lands on, the cuts between scenes, the
artwork to be generated, anything flagged for review, and the two audio files you need back.

**Relay that digest in full.** Do not compress it to a summary, and do not tell them to open
`PLAN.md` instead. They are approving a storyboard and then going away to record a voiceover
from it — a one-line arc is not enough to judge whether scene 3 earns its place. The digest
is already shaped for reading, so pass it through rather than rewriting it.

Read `PLAN.md` yourself too, and add anything worth weighing that the digest leaves out — a
claim that overreaches, a scene doing too little work, a script that will run long.

Then say plainly that this is the cheap moment to change it: an edit now costs a rerun, the
same edit after recording costs a re-record. Invite specific changes.

If a tool for publishing a shareable page or document is available, offer in one line to put
the plan up as one — storyboards usually need sign-off from someone outside this
conversation. Do not build it unless they say yes.

Call out the look explicitly. It is drawn fresh for every reel, it is the part people do not
expect to be asked about, and it is the cheapest thing in the pipeline to change — `--redraw`
for a different one, `--art <id>` if they name a style.

If they want other changes, rerun `brief.mjs` with `--notes` for anything structural, or edit
`PLAN.md` and `plan.json` together for small tweaks — keep the two in sync, the build scripts
read the JSON. A rerun keeps the existing direction and research unless you pass `--redraw`,
so fixing the script does not cost you the look. Re-print after a rerun with
`node "$SKILL_DIR/scripts/storyboard.mjs" ./<slug>`.

**Then stop**

The digest already ends with the two files and their paths, but restate the ask in your own
closing line so it is not buried at the bottom of a long message:

- Voiceover → `<slug>/assets/audio/vo.mp3`, read from the script above. Any length — the reel
  is cut to fit whatever arrives, so they should not trim to hit a target duration.
- Background music → `<slug>/assets/audio/bg.mp3`, instrumental, no vocals.

**Do not scaffold further, generate art, or write scenes.** Everything downstream is timed to
the voiceover; work done before it exists is work redone. Wait for them to come back, then
run `/reel-build`.
