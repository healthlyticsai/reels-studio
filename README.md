# Reel Studio

A Claude Code skill that turns a one-line topic into a finished vertical promo reel —
1080×1920, voiceover-synced, with captions, photo collage, motion graphics and sound design.

Built from the production pipeline behind the Waivs Scribe reel.

## What it does

```
  You:     "make a reel about the OSCAR EMR integration"
           │
  Phase 1  Gemini 3.1 Pro writes the plan — narrative arc, scene beats,
           the voiceover script, an asset manifest, sound cues
           │
  ═══════  You record the voiceover and pick background music  ═══════
           │
  Phase 3  Claude transcribes the VO to word-level timings, cuts every
           scene to it, generates the artwork, builds the scenes and renders
```

The voiceover is the clock. Nothing is animated until it exists, and every beat is anchored
to the frame a specific word is spoken — which is what makes the result feel cut to the
narration rather than laid over it.

## Install

**1. Add the marketplace** (once per machine), then install:

```
/plugin marketplace add <your-org>/claude-reel-studio
```

```
/plugin install reel-studio@waivs-marketing
```

**2. Set your Gemini API key.** Get one at https://aistudio.google.com/apikey, then add this
to `~/.zshrc` or `~/.bashrc`:

```bash
export GEMINI_API_KEY="your-key-here"
```

A `.env` file in the reel folder works too. Never commit either.

## Requirements

| Need | Why | Check |
|---|---|---|
| Node 20+ | Remotion | `node --version` |
| Python 3 with Pillow + NumPy | Keying the generated artwork | `python3 -c "import PIL, numpy"` |
| A Gemini API key | Planning and image generation | `echo $GEMINI_API_KEY` |
| ~2GB free disk | whisper.cpp model, per project | |

If Python is missing the libraries: `pip3 install pillow numpy`.

## Using it

Just describe what you want:

> make me a reel about the new custom templates feature

Claude creates `./<topic-slug>/`, writes `PLAN.md`, and shows you the voiceover script.
Read it, ask for changes if you want them, then:

1. Record the voiceover (ElevenLabs, Play.ht, or a real person) → `<slug>/assets/audio/vo.mp3`
2. Drop instrumental background music → `<slug>/assets/audio/bg.mp3`
3. Tell Claude they are ready

**Length does not matter.** The reel is cut to whatever the voiceover turns out to be, so do
not trim the script to hit 60 seconds.

## What you get

```
your-topic-slug/
  PLAN.md               the creative plan, readable
  plan.json             the same plan, for the scripts
  assets/audio/         your voiceover and music
  public/art/           generated cutouts and textures
  src/scenes/           one file per scene
  src/timing.ts         the timeline, anchored to the voiceover
  out/your-topic.mp4    the reel
```

## Branding

The Waivs palette, gradients and logos are the default — no setup needed for Waivs reels.

For a different brand, copy `skills/reel-studio/assets/brand/brand.config.json`, edit the
colours, product name and URL, put the logo PNGs somewhere, and run:

```bash
bash skills/reel-studio/scripts/new-project.sh my-slug --brand /path/to/brand.config.json
```

The component kit reads `src/brand.json` at render time, so a re-skin touches data, not code.

## Repo layout

```
.claude-plugin/          plugin + marketplace manifests
skills/reel-studio/
  SKILL.md               the workflow Claude follows
  references/            playbook, component API, the Gemini brief, troubleshooting
  scripts/               brief, scaffold, asset generation, matting, transcription
  assets/
    brand/               brand.config.json
    logo/  sfx/          brand logos and the six sound effects
    template/            the component kit copied into every new project
```

## Editing house style

The creative direction lives in `skills/reel-studio/references/gemini-brief-prompt.md`. That
is the prompt sent to Gemini — change it to change how every future reel is written.

The craft rules Claude follows while building live in `references/production-playbook.md`.

## Troubleshooting

See `skills/reel-studio/references/troubleshooting.md`. The two that bite most often:

- **Grey checkerboard in generated art** — Gemini cannot make transparent images; the
  chroma-key pipeline handles it, but a regenerate is sometimes needed.
- **Text hidden behind captions** — scene content must stay above y=1620.
