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

**Then read `PLAN.md` yourself and summarise it back**

This is the part that matters. Show the person:

- The narrative arc in a few lines — what the reel argues, scene by scene.
- **The full voiceover script, verbatim.** Do not paraphrase it or show an excerpt. They are
  about to record this.
- Anything in the plan's **Flagged for review** section, called out plainly.

Then say explicitly that this is the cheap moment to change it: a script edit now costs a
minute, the same edit after recording costs them a re-record. Invite specific changes.

If they want changes, rerun `brief.mjs` with `--notes` capturing the correction for anything
structural, or edit `PLAN.md` and `plan.json` together for small tweaks. Keep the two in
sync — the build scripts read the JSON.

**Then stop**

Tell them exactly what you need back and where it goes:

- Voiceover → `<slug>/assets/audio/vo.mp3`, read from the script above. Any length — the reel
  is cut to fit whatever arrives, so they should not trim to hit a target duration.
- Background music → `<slug>/assets/audio/bg.mp3`, instrumental, no vocals.

**Do not scaffold further, generate art, or write scenes.** Everything downstream is timed to
the voiceover; work done before it exists is work redone. Wait for them to come back, then
run `/reel-build`.
