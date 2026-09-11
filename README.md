# Reel Studio

A Claude Code skill that turns a one-line topic into a finished vertical promo reel —
1080×1920, cut to your voiceover, with captions, photo collage, motion graphics and sound
design.

You describe the topic. Claude writes the plan and the script. You record the voiceover and
pick the music. Claude builds and renders the reel.

```
  You:     "make a reel about the new one-click referral letters"
           │
  Phase 1  Gemini 3.1 Pro writes the plan — narrative arc, scene beats,
           the voiceover script, an asset manifest, sound cues
           │
  ═══════  You record the voiceover and pick background music  ═══════
           │
  Phase 3  Claude transcribes the voiceover to word-level timings, cuts
           every scene to it, generates the artwork, builds the scenes,
           renders the video
```

The voiceover is the clock. Nothing gets animated until it exists, and every beat is pinned
to the frame a specific word is spoken — which is what makes the result feel *cut to* the
narration rather than laid over it.

---

## Table of contents

- [Installation](#installation)
- [Making your first reel](#making-your-first-reel)
- [Command reference](#command-reference)
- [Writing a good topic](#writing-a-good-topic)
- [Revising a reel](#revising-a-reel)
- [What ends up in the folder](#what-ends-up-in-the-folder)
- [Using a different brand](#using-a-different-brand)
- [Changing the house style](#changing-the-house-style)
- [Troubleshooting](#troubleshooting)
- [For maintainers](#for-maintainers)

---

## Installation

You need this once per computer. Budget fifteen minutes, most of it getting two
credentials in place.

### What you need first

| | Why | How to check |
|---|---|---|
| **Claude Code** | Runs the skill | `claude --version` |
| **Node 20 or newer** | Everything — video, images, transcription | `node --version` |
| **Access to the private repo** | The plugin is fetched from GitHub | see step 1 |
| **A Gemini API key** | Writing the plan and generating the artwork | see step 2 |
| **~2GB free disk** | Speech model, downloaded once, plus each project | |

Nothing else. No Python, no Homebrew packages, no compilers.

If `node --version` says anything below 20, or the command is not found, install Node from
[nodejs.org](https://nodejs.org) and pick the LTS version.

### Step 1 — Get access to the repo

The plugin lives in a **private** repository:
**https://github.com/healthlyticsai/reels-studio**

Claude Code installs a plugin by cloning that repo, so your computer has to be able to reach
it first. Two things are needed:

1. **You are a member of the `healthlyticsai` GitHub organisation** with read access to
   `reels-studio`. Ask whoever runs the org to add you — nothing below works until they have.
2. **Git on your machine can authenticate as you.** Pick whichever of these you prefer.

**The easy way — GitHub CLI**

```bash
brew install gh && gh auth login
```

Choose **GitHub.com**, then **HTTPS**, then **Login with a web browser**, and follow the
prompts. This sets git up for everything, not just this plugin.

**The manual way — a personal access token**

1. Go to **https://github.com/settings/tokens** → *Generate new token (classic)*
2. Tick the **`repo`** scope, generate it, and copy the token
3. In Terminal, clone the repo once so your Mac stores the credential:

```bash
git clone https://github.com/healthlyticsai/reels-studio.git /tmp/auth-check
```

When it asks for a **username**, enter your GitHub username. When it asks for a **password**,
paste the **token** — not your GitHub password. Then clean up:

```bash
rm -rf /tmp/auth-check
```

macOS keeps the token in your keychain, so this is a one-time step.

> **If the organisation uses single sign-on**, your token also needs authorising for
> `healthlyticsai` — there is an **Authorize** button beside the token on the tokens page.
> Without it the clone fails even though the token looks correct.

**Check it worked.** This should print a list of branches rather than asking for a password:

```bash
git ls-remote https://github.com/healthlyticsai/reels-studio.git
```

If it asks for credentials again, or says `Repository not found`, you are either not in the
org yet or the token is missing the `repo` scope. `Repository not found` is what GitHub
returns for a private repo you cannot see — it does not mean the repo is gone.

### Step 2 — Get a Gemini API key

1. Go to **https://aistudio.google.com/apikey**
2. Sign in with your Google account
3. Click **Create API key**
4. Copy it — it looks like `AIzaSy...`

Now tell your computer about it. Open Terminal and run **one** of these, depending on which
shell you use (on a modern Mac it is almost always the first):

```bash
echo 'export GEMINI_API_KEY="paste-your-key-here"' >> ~/.zshrc && source ~/.zshrc
```

```bash
echo 'export GEMINI_API_KEY="paste-your-key-here"' >> ~/.bashrc && source ~/.bashrc
```

Check it worked:

```bash
echo $GEMINI_API_KEY
```

You should see your key printed back. If you see nothing, close Terminal, open it again, and
try once more.

> **Keep the key private.** It is tied to your Google account and spends real quota. Do not
> paste it into a shared document, a git commit, or a Slack channel.

### Step 3 — Install the plugin

Open Claude Code and run these two commands. The first tells Claude where to find the
plugin; the second installs it.

```
/plugin marketplace add healthlyticsai/reels-studio
```

```
/plugin install reel-studio@healthlytics
```

If the first command fails, it is almost always step 1 — go back and check
`git ls-remote` works.

### Step 4 — Check it took

```
/plugin
```

You should see **reel-studio** in the list, enabled. Typing `/reel` should now offer the reel
commands. That is it — you are ready.

---

## Making your first reel

### 1. Ask for it

In Claude Code, in whatever folder you want the reel to live, just say what you want:

> make a reel about the new one-click referral letters in Waivs Scribe

Add anything you know that would shape it — who it is for, what it should be positioned
against, an unusual length. More on that in [Writing a good topic](#writing-a-good-topic).

Claude creates a folder named after the topic, then asks Gemini for the plan. **This takes
about a minute.**

### 2. Read the plan

Claude will show you the narrative arc and the full voiceover script. You will get something
like this:

> **One-Click Referrals**
> *Stop retyping patient histories; Waivs Scribe turns your encounter note into a specialist
> referral with one click.*
>
> **Voiceover script (172 words)**
> "You just finished a complex patient encounter. Now you have to write the referral. In
> OSCAR, that usually means opening a new template and typing everything all over again…"

**This is your cheap moment to redirect.** Changing the script now costs one minute. Changing
it after you have recorded the voiceover costs you a re-record. Read it properly.

If you want changes, just say so in plain language:

> the opening is too gentle — lead with the number of hours lost

> drop the bit about blood pressure readings, legal will not like it

> make it 45 seconds instead

Claude will regenerate or edit the plan. The full plan also lands in **`PLAN.md`** inside the
new folder if you would rather read it there — it has the scene-by-scene breakdown, the
sound cues, and a **Flagged for review** section listing anything that might need a second
opinion before it goes out.

### 3. Record the voiceover and pick music

This is the one part Claude cannot do for you. Claude will stop and wait here.

**Voiceover** → save as `assets/audio/vo.mp3` inside the new folder

- Paste the script into a text-to-speech tool — ElevenLabs, Play.ht and OpenAI's TTS all
  work well — and download the mp3.
- Or record a real person. A human read is usually better if you have someone willing.
- **Do not trim the script to hit a target length.** The reel is cut to whatever the
  voiceover turns out to be. A 68-second voiceover makes a 68-second reel.

**Background music** → save as `assets/audio/bg.mp3` in the same folder

- Instrumental only. Anything with vocals fights the narration.
- It gets automatically turned down under the voice and lifted for the ending, so do not
  worry about levels.
- Shorter than the reel is fine — it loops.

Then tell Claude:

> both files are in

### 4. Claude builds it

From here it is hands-off. Claude will:

1. Install the video packages — under a minute
2. Transcribe your voiceover to word-level timings — **the first time on a new computer this
   downloads a ~500MB speech model, so allow several minutes**; after that it is seconds
3. Rebuild the timeline around what you actually recorded
4. Generate the photo cutouts and textures with Gemini
5. Write the scenes
6. Render test frames and look at them, fix what is wrong, and look again
7. Render the video

Expect **15–30 minutes** end to end, most of it rendering. Claude will show you the finished
mp4 when it is done, along with a note of anything it changed from the plan.

---

## Command reference

You never have to use these — describing what you want in plain language works just as well,
and Claude picks the right step. They are here for when you would rather type a command than
a sentence, and because typing `/reel` shows you the whole set.

| Command | What it does |
|---|---|
| `/reel <topic>` | Start a new reel. Scaffolds the folder, gets the plan, shows you the voiceover script, then waits for your audio. |
| `/reel-build` | Build it, once the voiceover and music are in place. |
| `/reel-assets` | Regenerate the photos and textures — use it when one comes back wrong. |
| `/reel-check` | Render still frames across the reel and check them for layout problems. |
| `/reel-render` | Render the video and verify the finished file. |
| `/reel-revise <change>` | Change something in a reel that already exists. |

Each takes the same free-text detail you would have typed anyway:

```
/reel one-click referral letters. Audience: Ontario family physicians on OSCAR.
Position against retyping referrals by hand. 45 seconds.
```

```
/reel-revise the ending photo looks too corporate, warmer please
```

---

## Writing a good topic

The topic drives everything downstream, so a little detail pays for itself.

**A bare topic works:**

> make a reel about custom scribe templates

**A topic with context works much better:**

> make a reel about custom scribe templates. Audience is family physicians in Ontario on
> OSCAR. The point is that other scribes lock you into a fixed SOAP format and we do not.
> Should feel like the calm, confident option, not a hard sell.

What is worth including, when you know it:

- **Who it is for** — "family physicians in Ontario", "clinic administrators"
- **What it is competing against** — "against manually retyping referrals", "against Nuance DAX"
- **The one thing you want remembered** — if the viewer forgets everything else, what stays?
- **Tone** — "calm and confident", "urgent", "warm"
- **Anything off-limits** — "do not mention pricing", "avoid clinical accuracy claims"
- **Length**, if not roughly 60 seconds

---

## Revising a reel

Just say what you want changed. Claude will work in the existing folder rather than starting
over.

> the headline in scene 3 is too long, shorten it

> swap the ending photo — she looks too corporate

> re-render it, the music was too loud

**When the words change, the voiceover changes.** If you ask for a script edit, you will need
to re-record and drop in a new `vo.mp3`. Anything visual — colours, photos, timing, layout,
sound levels — needs no re-record.

---

## What ends up in the folder

```
one-click-referrals/
  PLAN.md                 the creative plan, in plain English
  plan.json               the same plan, for the scripts
  assets/audio/           your voiceover and music
  public/art/             the generated cutouts and textures
  src/scenes/             one file per scene
  src/timing.ts           the timeline, pinned to your voiceover
  out/one-click-referrals.mp4    the reel
```

Everything is self-contained. You can zip the folder and hand it to someone else, or delete
it when the reel has shipped — the finished mp4 is the only thing you need to keep.

---

## Using a different brand

The Waivs palette, gradients and logos are the default, so Waivs reels need no setup.

For a different brand:

1. Copy `skills/reel-studio/assets/brand/brand.config.json` somewhere and edit the colours,
   product name and URL.
2. Put the logo PNGs somewhere you can point at.
3. Start the project with your brand file:

```bash
bash skills/reel-studio/scripts/new-project.sh my-slug --brand /path/to/brand.config.json
```

The components read the brand file at render time, so re-skinning changes data, never code.

---

## Changing the house style

Two files control how every future reel comes out:

- **`skills/reel-studio/references/gemini-brief-prompt.md`** — the brief sent to Gemini. This
  is where the writing rules live: how the argument is structured, what the voiceover may and
  may not sound like, when capital letters are allowed. Edit this to change how reels are
  *written*.
- **`skills/reel-studio/references/production-playbook.md`** — the craft rules Claude follows
  while building. Caption safe zones, headline sizing, sound levels, animation conventions.
  Edit this to change how reels are *made*.

Both are plain Markdown. Change them, commit, and everyone who pulls gets the new house
style.

---

## Troubleshooting

| What you see | What to do |
|---|---|
| `GEMINI_API_KEY not found` | Redo step 1. Close and reopen Terminal afterwards. |
| Claude does not offer to make a reel | Check `/plugin` shows reel-studio enabled. Try naming it: "use reel-studio to…" |
| A generated photo looks wrong or has grey checkerboard squares | Ask Claude to regenerate that one asset. Gemini cannot make transparent images and occasionally ignores the workaround. |
| Text hidden behind the captions | Ask Claude to fix it — scene content has to stay clear of the bottom band. |
| The speech model download stalls | Ask Claude to retry it. On a slow connection it sometimes times out partway. |
| Rendering feels very slow | Normal for a 60-second reel. Close other heavy apps. |

Deeper detail, including the failure modes worth knowing in advance, is in
**`skills/reel-studio/references/troubleshooting.md`**.

---

## For maintainers

### Repo layout

```
.claude-plugin/
  plugin.json            plugin manifest
  marketplace.json       marketplace manifest (this repo is its own marketplace)
skills/reel-studio/
  SKILL.md               the workflow Claude follows
  references/            playbook, component API, the Gemini brief, troubleshooting
  scripts/               brief, scaffold, asset generation, matting, transcription
  assets/
    brand/               brand.config.json
    logo/  sfx/  art/    brand logos, six sound effects, transition furniture
    template/            the component kit copied into every new project
```

### How the pieces fit

- **`scripts/brief.mjs`** sends `references/gemini-brief-prompt.md` to
  `gemini-3.1-pro-preview` and writes `plan.json` + `PLAN.md`.
- **`scripts/new-project.sh`** scaffolds Remotion, copies the component kit and brand config,
  and pins the dependency set.
- **`scripts/generate-assets.mjs`** reads the plan's asset manifest. Gemini cannot emit an
  alpha channel, so subjects are rendered on flat magenta and **`scripts/matte.mjs`** keys it
  out. Flat single-colour shapes use **`matte-ink.mjs`** instead.
- **`scripts/transcribe.mjs`** runs whisper.cpp and prints the sentence table the timeline is
  derived from.
- **`assets/template/src/components/`** is the shared kit — typography with animated emphasis
  marks, four scene transitions, motion-graphics devices, captions, texture.

### Publishing a change

```bash
git add -A && git commit -m "..." && git push
```

Team members pick it up by opening `/plugin` and updating the **healthlytics**
marketplace from there.

### Testing without publishing

```
/plugin marketplace add /absolute/path/to/reels-studio
```

A local path works the same as a GitHub repo, so you can try a change before pushing it —
and it skips the auth step entirely, which makes it the fastest way to check a change.

### Onboarding someone new

The repo being private means a new teammate cannot install the plugin until they are in the
`healthlyticsai` org. Add them there first, then send them at step 1 of
[Installation](#installation). The failure mode if you skip it is unhelpful: GitHub returns
`Repository not found` for a private repo you cannot see, which reads like the repo is
missing rather than like a permissions problem.

If the org ever switches this repo to public, steps 1 and its `git ls-remote` check drop
away and the two `/plugin` commands work on their own.
