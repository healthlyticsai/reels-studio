---
name: reel-studio
description: Plans, builds and renders a brand-consistent vertical promo reel (1080x1920 Remotion video with voiceover, captions, photo cutouts, motion graphics and sound design) starting from a one-line topic. Use this whenever someone wants a reel, promo video, product video, social video, explainer, Instagram/TikTok/Reels/Shorts video, launch video, or feature announcement video — including when they only say something like "make a video about our new booking flow", "we need a reel for the OSCAR integration", "can you put together a 60 second promo", or when they hand over a voiceover file and background music and ask for a video around them. Also use it when someone asks to revise, re-render, extend or restyle a reel that this skill previously produced. Also covers demo mode: a product demo video where the person's own avatar presents their own story over their real product screenshots, lip-synced with Higgsfield and voiced with Google Chirp 3 HD or ElevenLabs, rendered 16:9 and 9:16 — use it when someone says "product demo video", "demo with my avatar", "walk through the dashboard screenshots", or mentions the Demo Studio, /demo or /demo-build.
---

# Reel Studio

Turns a topic into a finished vertical promo reel. The pipeline has three phases with a
deliberate human checkpoint between phase 1 and phase 3, because the voiceover is the clock
that everything else is cut to — there is no point building animation before it exists.

```
  Phase 1  topic ──▶ draw a creative direction ──┐
                ──▶ research the topic  ─────────┴─▶ Gemini 3.8 Flash
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
| `/demo <folder>` | Demo mode, phase 1: stage a Studio intake into a storyboard, then stop |
| `/demo-build` | Demo mode, phase 3: voice, lip-sync, check, render 16:9 and 9:16 |

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

**2. Ask Gemini 3.8 Flash for the creative plan.**

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

Stills are two or three seconds each once the bundle is warm. The first one in a fresh project
builds the bundle and can take a couple of minutes — normal, and once only. A still cannot
show motion, so when the question is timing rather than layout, use
`node scripts/render.mjs --draft` for the whole reel at half scale.

**7. Render.**

```bash
node scripts/render.mjs
```

Use this rather than calling `npx remotion render` yourself. It reads the machine's actual
free memory and swap pressure and sizes concurrency from them, prints a heartbeat with an ETA
every fifteen seconds, and stops itself with a diagnosis instead of running for half an hour.

**Run it in the background and relay the heartbeat.** A render with no visible output is
indistinguishable from a hung one, and that is the single most common way this step goes
wrong for a person watching it.

Expect two to four minutes for a 60-second reel on a laptop, nearly all of it rendering
frames rather than encoding them. If it is dramatically slower than that, the machine is out
of memory — `sysctl vm.swapusage` will say so, and closing a browser is worth more than any
flag. `node scripts/render.mjs --draft` is half scale and about a third quicker, for when you
are checking motion rather than delivering.

**8. Check the delivered file, not just the composition.** They can differ, and the mp4 is
what ships.

```bash
node scripts/contact-sheet.mjs --video out/<topic-slug>.mp4 /tmp/final.png
```

Read that sheet. If it is clean, send the mp4 with `SendUserFile` and summarise what you
built, what you changed from the plan, and anything you left out.

## Demo mode

A second pipeline in the same kit, for product demos rather than argued reels. The person
brings three things: **their story** (spoken word for word), **their avatar** (one still image)
and **their real product screenshots**. Out come two renders of one timeline, 16:9 and 9:16.

```
  Studio UI ──▶ intake.json + avatar + screenshots
                    │  /demo
  Phase 1  demo-brief.mjs: Gemini stages the story over the screenshots
           (scenes, presenter on/off, zoom/highlight/click boxes, PHI check)
                    │
  ═════════ HAND-OFF: approve the storyboard (Studio or chat) ═════════
                    │  /demo-build
  Phase 3  tts.mjs (Google Chirp 3 HD or ElevenLabs) → transcribe.mjs → demo-timing.mjs
           → avatar-slices.mjs → Higgsfield lip-sync via MCP → avatar-normalize.mjs
           → stills in both formats → render.mjs --all
```

Three rules hold it up. Each one prevents a failure that is expensive to find late:

- **The product is never generated.** Screens are the uploaded PNGs, shown exactly, through
  `Screenshot` (browser or phone frame, zoom, highlight, cursor click). An AI video model
  asked to show a UI invents text and buttons, which is wrong for a real product.
- **One voice track.** `vo.mp3` is made once from the approved script. The presenter clips are
  lip-synced to *slices cut from it* and played muted, so the mouth matches the soundtrack
  exactly. Never lip-sync from text, which re-voices the line and breaks sync.
- **The story is theirs.** `demo-brief.mjs` refuses a plan whose scenes do not reproduce the
  story word for word. Improvements come back as `suggestedEdits` unless `--polish` is
  passed.

### Two presenter engines

`intake.presenterEngine`, chosen in the Studio:

- **`higgsfield`** (default, production): the whole script is voiced once (Chirp or
  ElevenLabs), cut into per-scene slices, and each slice is lip-synced onto the avatar still by
  Higgsfield. It gives the best sync and your own voice, but needs a paid Higgsfield plan (the
  free plan has no credits and cannot use MCP).
- **`omni`** (proof of concept): `omni-presenter.mjs` has Gemini Omni Flash film the presenter
  delivering the whole script as **one continuous take** (a first clip, then extensions, about
  40 seconds at most). Omni cannot lip-sync to supplied audio, so the pipeline is inverted:
  the take's own audio becomes `vo.mp3`, and every presenter scene plays the take at its
  absolute frame (`clipFrom = -from`). Sync comes from Omni generating voice and face
  together. The voice is Omni's, not a chosen one; Omni may paraphrase a word or refuse a
  photo of a real person (then use an illustrated character or `--describe`). It needs only
  the Gemini key, with billing enabled for video generation.

### Setup, once

- Keys: `GEMINI_API_KEY`, plus the voice provider chosen in the Studio (`intake.voice.provider`):
  - **Google Chirp 3 HD** (the default): `GOOGLE_TTS_API_KEY`, or gcloud application-default
    credentials (`gcloud auth application-default login`), billed to `GCP_PROJECT_ID` (or
    `GOOGLE_CLOUD_PROJECT`). Keep shared settings in `~/.reel-studio/.env`, the one `.env`
    that every script finds, including the copies inside each demo folder.
  - **ElevenLabs**: `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` (their cloned voice).

  `node "$SKILL_DIR/scripts/check-env.mjs" --mode demo [--provider google|elevenlabs]` checks
  them.
- Higgsfield (engine `higgsfield` only): `claude mcp add --transport http higgsfield https://mcp.higgsfield.ai`, then sign
  in through `/mcp`. Every generation spends Higgsfield credits. Say how many seconds are
  about to be generated before starting, and never regenerate a clip whose job is `done`.
- The Studio: `node studio/server.mjs` from the plugin root, then open http://localhost:4400.
  Projects live in `$DEMO_STUDIO_ROOT` (default `~/Healthlytics/demos`).

### Phase 1: stage

`/demo <folder>` covers it: scaffold around the intake with `new-project.sh <folder> --mode
demo` (it merges and never overwrites the uploads), then run
`demo-brief.mjs --project <folder>`. Relay the storyboard in full. Then check it yourself:
open each screenshot a scene uses and compare every focus box with the element its words name.
Gemini's boxes are good but not perfect, and a zoom into the wrong panel is the most visible
mistake a demo can make. Fix boxes in `plan.json` directly. Anything in `phiCheck` blocks the
demo until the screenshot is replaced with one from a demo account.

Stop at approval. The Studio writes `approved.json`; in chat, write it yourself when they say
yes.

### Phase 3: build

`/demo-build` lists every step. The parts that are specific to demos:

- `demo-timing.mjs` aligns the script to whisper's words (edit distance, so a misheard brand
  name does not shift everything after it) and writes `src/demoTimeline.ts`. It is safe to
  re-run, and `avatar-normalize.mjs` re-runs it so new clips get picked up. Do not hand-edit
  frame numbers in the timeline; change `plan.json` or the look instead, and re-run.
- `DemoScene` renders most scenes straight from the timeline. `src/look.ts` holds the backdrop
  and camera. Write a custom scene only for something the plan cannot express; see the
  component kit's "Demo" section.
- Stills go to `out/stills/` so the Studio shows them. Check both formats: a layout that fits
  16:9 can collide in 9:16.
- `render.mjs --all` renders `Demo-16x9` and then `Demo-9x16`, one after the other.
- Sound design is automatic. `demo-timing.mjs` puts the kit's six sounds on each demo's
  recurring beats: a whoosh or whip on each cut (nothing on a fade), a quiet whoosh on each
  zoom, a switch when a highlight lands, and a ding on the closing button. Cursor clicks play
  their own sound inside `Screenshot`. The plan's `sfx` cues win any collision. It is off
  when the Studio's "Sound effects" box is unchecked (`intake.soundEffects: false`).
- A voice change after `vo.mp3` exists means redoing everything after it: `tts.mjs --force`,
  `transcribe.mjs`, `demo-timing.mjs`, `avatar-slices.mjs` (every clip resets), then the
  lip-sync again. Say so before doing it.

A presenter clip that shows the still image rather than video means its job is not `done`.
Check `avatar-jobs.json`: `retake` jobs carry a note saying why.

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
- [Gemini demo prompt](./references/gemini-demo-prompt.md) — how demo mode stages a story
  over screenshots. Edit it to change scene rules, focus-box rules or the privacy check.
