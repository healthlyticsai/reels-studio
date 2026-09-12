---
name: reel-studio
description: Plans, builds and renders a brand-consistent vertical promo reel (1080x1920 Remotion video with voiceover, captions, photo cutouts, motion graphics and sound design) starting from a one-line topic. Use this whenever someone wants a reel, promo video, product video, social video, explainer, Instagram/TikTok/Reels/Shorts video, launch video, or feature announcement video — including when they only say something like "make a video about our new booking flow", "we need a reel for the OSCAR integration", "can you put together a 60 second promo", or when they hand over a voiceover file and background music and ask for a video around them. Also use it when someone asks to revise, re-render, extend or restyle a reel that this skill previously produced.
---

# Reel Studio

Turns a topic into a finished vertical promo reel. The pipeline has three phases with a
deliberate human checkpoint between phase 1 and phase 3, because the voiceover is the clock
that everything else is cut to — there is no point building animation before it exists.

```
  Phase 1  topic ──▶ Gemini 3.1 Pro ──▶ PLAN.md + plan.json + VO script
                                            │
  ══════════ HAND-OFF: human records VO, supplies music ══════════
                                            │
  Phase 3  transcribe VO ──▶ derive timeline ──▶ generate art ──▶ build scenes ──▶ render
```

## Slash commands

Each phase has a slash command, so a team member never has to remember the script names.
In Claude Code they ship as plugin commands; under GitHub Copilot the installer writes them
as sibling skills. Either way they load this skill and follow the phase below — use them when
the person invokes one, and follow this file directly otherwise.

| Command | Covers |
|---|---|
| `/reel <topic>` | Phase 1 — scaffold, brief, show the script, stop at the hand-off |
| `/reel-build` | Phase 3 — transcribe, re-cut the timeline, generate art, write scenes |
| `/reel-assets` | Generate, key and inspect the artwork |
| `/reel-check` | Render stills across the reel and read them |
| `/reel-render` | Render the mp4 and verify the delivered file |
| `/reel-revise` | Change an existing reel in place |

## Before you start

Set `SKILL_DIR` once — every command below uses it. It is the folder holding this SKILL.md,
which differs by host:

```bash
# Claude Code, installed as a plugin
SKILL_DIR="${CLAUDE_PLUGIN_ROOT}/skills/reel-studio"

# GitHub Copilot, or any agent reading the open skills folders
SKILL_DIR="$HOME/.copilot/skills/reel-studio"
```

If neither resolves, find it: `ls -d ~/.copilot/skills/reel-studio ~/.claude/plugins/cache/*/reel-studio/*/skills/reel-studio 2>/dev/null | head -1`

Then check the Gemini key. It is read from the environment first, then a `.env` in the
project, then a `.env` at the plugin root.

```bash
node "$SKILL_DIR/scripts/check-env.mjs"
```

If it is missing, tell the person to get a key from https://aistudio.google.com/apikey and
either `export GEMINI_API_KEY=...` in their shell profile or drop it in a `.env`. Do not
proceed without it — phase 1 cannot run.

## Phase 1 — Brief

**1. Slugify the topic and create the project.** Always start a new folder, never reuse an
existing one; reels are cheap and cross-contaminated projects are expensive to untangle.
The slug is lowercase, hyphenated, and short enough to type — trim it to about five words.

```bash
bash "$SKILL_DIR/scripts/new-project.sh" "<topic-slug>"
```

This creates `./<topic-slug>/` in the current working directory with the Remotion scaffold,
the component kit, the brand config and the folder structure. It does not install npm
packages yet — that happens in phase 3, so the person is not left waiting during the brief.

**2. Ask Gemini 3.1 Pro for the creative plan.**

```bash
node "$SKILL_DIR/scripts/brief.mjs" --topic "<the full topic>" --project "./<topic-slug>"
```

This sends the prompt in `references/gemini-brief-prompt.md` — a long, specific brief that
asks for a narrative arc, scene-by-scene beats, the exact voiceover script, an asset
manifest, an SFX map and per-scene layout notes. It writes `PLAN.md` (for humans) and
`plan.json` (for the scripts that follow) into the project.

Pass extra context with `--notes "..."` when the person has given you product details,
a target audience, a competitor to position against, or a length other than ~60s.

**3. Read `PLAN.md` yourself, then summarise it for the person.** Show them the narrative
arc in a few lines and the full voiceover script verbatim. This is their last cheap chance
to redirect — a bad script caught here costs a rerun of `brief.mjs`; caught after the VO is
recorded it costs them a re-record. Invite edits explicitly.

If they want changes, either rerun `brief.mjs` with `--notes` capturing the correction, or
edit `PLAN.md` and `plan.json` directly for small tweaks. Keep the two in sync — the scripts
read the JSON.

## Phase 2 — Hand-off (stop here)

Tell them, in plain terms, exactly what you need back and where to put it:

- **Voiceover** → `<topic-slug>/assets/audio/vo.mp3` — read from the script in `PLAN.md`.
  ElevenLabs, Play.ht or a real human all work. Any length; the reel is cut to fit whatever
  arrives, so they should not try to hit a target duration.
- **Background music** → `<topic-slug>/assets/audio/bg.mp3` — instrumental, no vocals
  competing with the VO. It is ducked under the narration automatically and looped if short.

Then **stop and wait**. Do not scaffold further, generate art, or write scenes. Everything
downstream is timed to the voiceover, so work done now is work redone later.

When they come back, verify both files exist and are real audio before continuing:

```bash
node "$SKILL_DIR/scripts/check-audio.mjs" "./<topic-slug>"
```

## Phase 3 — Build

Work through these in order. Steps 1–3 can run while you write scenes, so kick off the slow
ones (npm install, transcription, image generation) in the background early.

**1. Install and wire up.**

```bash
cd <topic-slug> && npm install
```

**2. Transcribe the voiceover.** This is the single most important step, and the reason the
reel feels cut to the narration rather than laid over it.

```bash
node scripts/transcribe.mjs
```

It downloads whisper.cpp (~500MB, first run only), writes `src/captions.json` with
word-level timestamps, and prints a sentence-by-sentence table of start/end times.

**Re-derive the timeline from that table, not from `plan.json`.** Gemini's frame numbers are
an estimate written before the VO existed; the transcript is ground truth. Map each scene to
the sentence group that carries it and write the real frame numbers into `src/timing.ts`.
Anchor individual beats — a highlight sweep, a card entrance, a stamp — to the frame of the
specific word they land on. [the production playbook](./references/production-playbook.md) explains the arithmetic,
including how transition overlap affects scene durations.

**3. Generate and matte the artwork.**

```bash
node scripts/generate-assets.mjs        # reads plan.json's asset manifest
node scripts/matte.mjs                # keys out the chroma backdrop, writes real alpha
```

Gemini cannot emit an alpha channel — it returns JPEG and will paint a fake checkerboard if
you ask for transparency. The prompts therefore request a flat magenta backdrop that
`matte.mjs` keys out. Flat single-colour shapes (ink blots, silhouettes) need
`matte-ink.mjs` instead, which builds alpha from luminance so anti-aliased edges do not keep
a magenta fringe. Details in [the production playbook](./references/production-playbook.md).

Inspect what came back before building on it — a contact sheet over a loud colour makes bad
mattes obvious immediately:

```bash
node scripts/contact-sheet.mjs public/art /tmp/contact.png
```

Then Read that PNG. Regenerate any asset that came back wrong:
`node scripts/generate-assets.mjs <asset-name>`. To keep a person consistent across scenes
(the same physician tired in scene 1 and relaxed in the payoff), pass a reference image with
`--ref <existing-asset>.png`.

**4. Write the scenes.** One file per scene in `src/scenes/`, composed from the bundled
component kit — do not rebuild typography, transitions or motion graphics from scratch, they
are already written and battle-tested. [The component kit reference](./references/component-kit.md) is the API.

The kit gives you: `Headline`/`Eyebrow`/`Deck`/`SlamWord`/`CountUp` with five animated
emphasis marks, four scene transitions, `RippleRings`/`ScanBeam`/`TickerStrip`/`BarCompare`/
`Confetti`/`StatChip`/`Motes`, texture overlays, a browser frame, and burned-in captions.

[The production playbook](./references/production-playbook.md) carries the craft rules that are easy to get wrong and
expensive to discover late — caption safe zones, headline width arithmetic, the sentence-case
typography policy, sound-design levels, and the transition timing math. Read it before
writing the first scene.

**5. Review your own frames.** This is not optional polish; it is how the real bugs get
found. Layout collisions, clipped text and bad mattes are invisible in code and obvious in a
still.

```bash
npx remotion still Reel /tmp/chk/f<N>.png --frame=<N> --scale=0.4
```

Render one still per major beat — roughly ten to fifteen across the reel — and **Read each
one**. Fix what you see, then re-check. Expect two or three rounds; the first pass always has
something overlapping.

**6. Render.**

```bash
npx remotion render Reel out/<topic-slug>.mp4 --codec=h264 --crf=20 --concurrency=6
```

**7. Check the delivered file, not just the composition.** They can differ, and the mp4 is
what ships.

```bash
node scripts/contact-sheet.mjs --video out/<topic-slug>.mp4 /tmp/final.png
```

Read that sheet. If it is clean, send the mp4 with `SendUserFile` and summarise what you
built, what you changed from the plan, and anything you left out.

## Revising an existing reel

If the reel already exists, do not start over — `cd` into its folder, make the edit, re-run
the still checks for the affected frames, and re-render. Re-run `brief.mjs` only if the
message itself is changing, and re-record the VO only if the script changes.

## Reference files

- [Production playbook](./references/production-playbook.md) — the craft rules and the
  failure modes worth knowing in advance. Read this before writing scenes.
- [Component kit](./references/component-kit.md) — API for every bundled component.
- [Gemini brief prompt](./references/gemini-brief-prompt.md) — the brief sent to Gemini.
  Edit to change house style.
- [Troubleshooting](./references/troubleshooting.md) — known breakages and their fixes.
