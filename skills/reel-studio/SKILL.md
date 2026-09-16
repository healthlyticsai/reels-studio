---
name: reel-studio
description: Plans, builds and renders a brand-consistent vertical promo reel (1080x1920 Remotion video with voiceover, captions, photo cutouts, motion graphics and sound design) starting from a one-line topic. Use this whenever someone wants a reel, promo video, product video, social video, explainer, Instagram/TikTok/Reels/Shorts video, launch video, or feature announcement video — including when they only say something like "make a video about our new booking flow", "we need a reel for the OSCAR integration", "can you put together a 60 second promo", or when they hand over a voiceover file and background music and ask for a video around them. Also use it when someone asks to revise, re-render, extend or restyle a reel that this skill previously produced.
---

# Reel Studio

Turns a topic into a finished vertical promo reel. The pipeline has three phases with a
deliberate human checkpoint between phase 1 and phase 3, because the voiceover is the clock
that everything else is cut to — there is no point building animation before it exists.

```
  Phase 1  topic ──▶ draw a creative direction ──┐
                ──▶ research the topic  ─────────┴─▶ Gemini 3.1 Pro
                                                        │
                            PLAN.md + plan.json + direction.json + VO script
                                            │
  ══════════ HAND-OFF: human records VO, supplies music ══════════
                                            │
  Phase 3  transcribe VO ──▶ derive timeline ──▶ generate art ──▶ build scenes ──▶ render
```

Two things happen before the brief is written, and they are the reason two reels on related
topics do not come out looking like each other:

- **The look is drawn, not chosen.** `direction.mjs` picks an art direction, a narrative arc,
  an opening gambit, an edit language, four kinetic type systems, three motion motifs and a
  camera language out of `references/creative-systems.json` — holding out whatever the last
  few reels used. Fourteen art directions, twelve type systems, ten arcs; the combination is
  effectively never repeated.
- **The topic is researched.** `research.mjs` grounds it with real figures and, more
  importantly for the film, the real objects, rooms and human moments of that world. The
  twelve-to-eighteen asset manifest is built out of those rather than out of stock-photo
  instincts.

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

One command, three steps. It draws the creative direction (`direction.json`), researches the
topic with web grounding (`research.json` + `RESEARCH.md`), then sends both, plus the brand
and the prompt in `references/gemini-brief-prompt.md`, to Gemini. Out come `PLAN.md` for
humans and `plan.json` for the scripts. Expect it to take a couple of minutes.

Pass extra context with `--notes "..."` whenever the person has given you product details, a
target audience, a competitor to position against, or anything off-limits. It reaches both
the research pass and the brief, so it is worth passing everything they said.

Useful flags:

| Flag | For |
|---|---|
| `--seconds 45` | A length other than ~60s |
| `--redraw` | A different look, when they do not like the one drawn |
| `--art <id>` / `--arc <id>` | A specific look or structure they asked for |
| `--seed <n>` | Reproduce a look from an earlier reel exactly |
| `--min-assets <n>` | Raise the asset floor above 12 |
| `--no-research` | Skip grounding — only when there is no network or the topic is internal |

`node "$SKILL_DIR/scripts/direction.mjs" --list` prints every art direction, arc, edit
language, type system and motif by id, which is what to show someone who asks what the
options are.

**3. Show them the whole plan.**

`brief.mjs` ends by printing a storyboard digest — the look drawn for this reel, what the
research turned up, the voiceover script verbatim, then every scene shot by shot with its
headline, its kinetic type treatment, its beats and the words each one lands on, the cuts
between them, the artwork to be generated, anything flagged for review, and the two audio
files you need back. Relay that to the person **in full**, in the conversation.

Do not compress it to a summary and do not point them at `PLAN.md` instead. They are being
asked to approve a storyboard and then go and record a voiceover off the back of it; they
cannot judge whether scene 3 earns its place from a one-line arc. The digest is already
shaped for reading — pass it through rather than rewriting it.

Read `PLAN.md` yourself as well, and add anything the digest leaves out that you think they
should weigh — a claim that overreaches, a scene doing too little, a script that runs long.

Then say plainly that this is the cheap moment to redirect: a change now costs a rerun of
`brief.mjs`, the same change after recording costs them a re-record. Invite specific edits.

If a tool for publishing a shareable page or document is available in this session, offer to
put the plan up as one — a storyboard usually needs sign-off from someone who is not in this
conversation. Offer it in one line; do not build it unless they say yes.

Call out the look explicitly when you relay it, because it is the part people do not expect
to be asked about and the cheapest thing in the whole pipeline to change. If they want a
different one, rerun with `--redraw`, or with `--art <id>` if they named a style. If they
liked a previous reel's look, its seed is in that project's `direction.json` and `--seed <n>`
brings it back.

If they want other changes, rerun `brief.mjs` with `--notes` capturing the correction for
anything structural, or edit `PLAN.md` and `plan.json` together for small tweaks. Keep the
two in sync — the build scripts read the JSON. A rerun keeps the existing `direction.json`
and `research.json` unless you pass `--redraw`, so fixing the script does not cost you the
look. Re-print the storyboard after a rerun:
`node "$SKILL_DIR/scripts/storyboard.mjs" ./<topic-slug>`

## Phase 2 — Hand-off (stop here)

The storyboard digest ends with the two files you need and where they go, so the ask has
already been made alongside the plan. Restate it in your own closing line so it does not get
lost at the bottom of a long message:

- **Voiceover** → `<topic-slug>/assets/audio/vo.mp3` — read from the script above.
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
node scripts/matte.mjs                  # keys the chroma out, writes real alpha
```

A manifest is twelve to eighteen assets, so this is one of the slow steps — kick it off early
and let it run while you write scenes. It generates three at a time and retries once, and
`--missing` regenerates only what is not on disk yet.

`generate-assets.mjs` appends the reel's own art direction to every prompt, so the manifest
describes subjects and the direction supplies the look. Gemini cannot emit an alpha channel —
it returns JPEG and paints a fake checkerboard if you ask for transparency — so cutouts and
props are rendered on flat magenta and keyed. Textures and environment plates stay opaque,
and flat symbols are matted from luminance instead so their anti-aliased edges cannot keep a
magenta fringe. `matte.mjs` reads the manifest and routes all of that itself; you still just
run it with no arguments. Details in
[the production playbook](./references/production-playbook.md).

Inspect what came back before building on it — a contact sheet over a loud colour makes bad
mattes obvious immediately:

```bash
node scripts/contact-sheet.mjs public/art /tmp/contact.png
```

Then Read that PNG. Regenerate any asset that came back wrong:
`node scripts/generate-assets.mjs <asset-name>`. To keep a person consistent across scenes
(the same physician tired in scene 1 and relaxed in the payoff), pass a reference image with
`--ref <existing-asset>.png`.

**4. Fill in `src/look.ts` from `direction.json`.** Do this before writing any scene. It is
three values — the backdrop variant, the camera mode, and the type animation for each scene —
and every scene reads them from there, so restyling the reel later is a one-line change.

Check the type animations as you write them: **no two adjacent scenes may share one.** That
is the single most visible rule in the system; a reel that punches every headline in
identically reads as a template however good the writing is.

**5. Write the scenes.** One file per scene in `src/scenes/`, composed from the bundled
component kit — do not rebuild typography, transitions or motion graphics from scratch, they
are already written and battle-tested. [The component kit reference](./references/component-kit.md) is the API.

Every scene has the same skeleton: `<Backdrop variant={BACKDROP} />` first, content wrapped
in `<CameraMove mode={CAMERA} duration={...}>`, `<PaperTexture />` last.

The kit gives you fourteen backdrops and five camera moves; `Headline` with eight entrance
animations and five emphasis marks, plus `Eyebrow`/`Deck`/`SlamWord`/`CountUp`/`Confetti`;
thirteen kinetic type systems in `KineticType.tsx`; fourteen scene transitions; twenty-odd
motion devices across `MotionGraphics.tsx` and `Devices.tsx`; texture overlays, a browser
frame, the product panel, and burned-in captions.

Build each scene from what the plan assigned it — its `typeSystem`, its `motionMotif`, its
`cameraNote` — and take transitions from the art direction's cut palette rather than reaching
for `tornPaper` every time.

[The production playbook](./references/production-playbook.md) carries the craft rules that are easy to get wrong and
expensive to discover late — caption safe zones, headline width arithmetic, the sentence-case
typography policy, sound-design levels, the transition timing math, and §11 on how the
variation system is meant to be honoured. Read it before writing the first scene.

**6. Review your own frames.** This is not optional polish; it is how the real bugs get
found. Layout collisions, clipped text and bad mattes are invisible in code and obvious in a
still.

```bash
npx remotion still Reel /tmp/chk/f<N>.png --frame=<N> --scale=0.4
```

Render one still per major beat — roughly ten to fifteen across the reel — and **Read each
one**. Fix what you see, then re-check. Expect two or three rounds; the first pass always has
something overlapping.

**7. Render.**

```bash
npx remotion render Reel out/<topic-slug>.mp4 --codec=h264 --crf=20 --concurrency=6
```

**8. Check the delivered file, not just the composition.** They can differ, and the mp4 is
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

A restyle is not a rebuild. Changing `BACKDROP` or `CAMERA` in `src/look.ts` re-skins every
scene at once; changing a scene's entry in `SCENE_TYPE_ANIM` changes how its type arrives. If
they want a genuinely different look, redraw the direction and update `look.ts` from it — the
scenes themselves usually survive untouched.

## Reference files

- [Production playbook](./references/production-playbook.md) — the craft rules and the
  failure modes worth knowing in advance. Read this before writing scenes; §11 covers how the
  drawn direction is meant to reach the code.
- [Component kit](./references/component-kit.md) — API for every bundled component.
- [Creative systems](./references/creative-systems.json) — the catalog the look is drawn
  from. Add entries here to widen the range of reels this skill can make.
- [Gemini brief prompt](./references/gemini-brief-prompt.md) — the brief sent to Gemini.
  Edit to change the editorial standard, which is the thing that should stay constant.
- [Troubleshooting](./references/troubleshooting.md) — known breakages and their fixes.
