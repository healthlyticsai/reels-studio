# Reel Studio

A Claude Code skill that turns a one-line topic into a finished vertical promo reel —
1080×1920, cut to your voiceover, with captions, photo collage, motion graphics and sound
design.

You describe the topic. Claude writes the plan and the script. You record the voiceover and
pick the music. Claude builds and renders the reel.

```
  You:     "make a reel about the new one-click referral letters"
           │
  Phase 1  A look is drawn for this reel, the topic is researched,
           then Gemini 3.1 Pro writes the plan — narrative arc, scene
           beats, the voiceover script, an asset manifest, sound cues
           │
  ═══════  You record the voiceover and pick background music  ═══════
           │
  Phase 3  Claude transcribes the voiceover to word-level timings, cuts
           every scene to it, generates the artwork, builds the scenes,
           renders the video
```

Two ideas hold the whole thing up.

**The voiceover is the clock.** Nothing gets animated until it exists, and every beat is
pinned to the frame a specific word is spoken — which is what makes the result feel *cut to*
the narration rather than laid over it.

**The look is drawn, not chosen.** Every reel gets a different art direction, narrative
shape, edit rhythm, set of kinetic text treatments and motion motifs, pulled from a catalog
and held out against what your last few reels used. See
[Every reel looks different](#every-reel-looks-different).

---

## Table of contents

- [Installation — Claude Code](#installation--claude-code)
- [Installation — GitHub Copilot](#installation--github-copilot)
- [Making your first reel](#making-your-first-reel)
- [Every reel looks different](#every-reel-looks-different)
- [Command reference](#command-reference)
- [Writing a good topic](#writing-a-good-topic)
- [Revising a reel](#revising-a-reel)
- [How long a render takes](#how-long-a-render-takes)
- [What ends up in the folder](#what-ends-up-in-the-folder)
- [Using a different brand](#using-a-different-brand)
- [Changing the house style](#changing-the-house-style)
- [Updating to a new version](#updating-to-a-new-version)
- [Troubleshooting](#troubleshooting)
- [For maintainers](#for-maintainers)

---

## Installation — Claude Code

Using GitHub Copilot instead? Skip to
[Installation — GitHub Copilot](#installation--github-copilot).

You need this once per computer. Budget fifteen minutes, most of it getting two
credentials in place.

### What you need first

| | Why | How to check |
|---|---|---|
| **Claude Code or GitHub Copilot** | Runs the skill | `claude --version` |
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

## Installation — GitHub Copilot

Reel Studio works in Copilot too. Skills are an open standard shared between Copilot and
Claude Code, so the skill itself is the same file — only the way it gets installed differs,
because Copilot has no plugin marketplace.

Steps 1 and 2 from the Claude Code section still apply: you need
[repo access](#step-1--get-access-to-the-repo) and a
[Gemini API key](#step-2--get-a-gemini-api-key). Do those first, then:

### Clone the repo

Put it somewhere permanent — the install points at this folder rather than copying it, so
`git pull` here updates the skill everywhere.

```bash
git clone https://github.com/healthlyticsai/reels-studio.git ~/reels-studio
```

### Run the installer

```bash
bash ~/reels-studio/skills/reel-studio/scripts/install-copilot.sh
```

It writes into `~/.copilot/skills/`, which Copilot reads in every workspace. You should see:

```
linked   ~/.copilot/skills/reel-studio -> ~/reels-studio/skills/reel-studio
wrote    ~/.copilot/skills/reel/SKILL.md
wrote    ~/.copilot/skills/reel-build/SKILL.md
...
```

### Restart Copilot and check

Type `/` in the Copilot chat box. You should see **/reel**, **/reel-build**, **/reel-assets**,
**/reel-check**, **/reel-render** and **/reel-revise** in the list.

From there it works exactly as it does in Claude Code — same commands, same three phases, same
output. Jump to [Making your first reel](#making-your-first-reel).

### Options

```bash
# Copy instead of symlinking, so the install survives moving or deleting the clone.
# Trade-off: updates then need re-running the installer.
bash ~/reels-studio/skills/reel-studio/scripts/install-copilot.sh --copy

# Install to the vendor-neutral folder other agents also read.
bash ~/reels-studio/skills/reel-studio/scripts/install-copilot.sh --target ~/.agents/skills

# Remove it.
bash ~/reels-studio/skills/reel-studio/scripts/install-copilot.sh --uninstall
```

### Updating

With the default symlink install, `git pull` is the whole update:

```bash
cd ~/reels-studio && git pull
```

Re-run the installer only if the set of commands has changed — those are generated files, not
symlinks.

### Why there is an installer at all

Copilot reads the skill format directly, so `skills/reel-studio/SKILL.md` needs no
translation. The six slash commands do: Claude Code reads them from `commands/*.md`, which
Copilot does not look at. The installer rewrites each one as a sibling skill — adding the
`name` field Copilot requires, and replacing Claude Code's `$ARGUMENTS` placeholder, which
Copilot has no equivalent for since whatever you type after the command is already in the
conversation.

---

## Making your first reel

### 1. Ask for it

In Claude Code, in whatever folder you want the reel to live, just say what you want:

> make a reel about the new one-click referral letters in Waivs Scribe

Add anything you know that would shape it — who it is for, what it should be positioned
against, an unusual length. More on that in [Writing a good topic](#writing-a-good-topic).

Claude creates a folder named after the topic, then asks Gemini for the plan and prints the
full storyboard. **This takes about a minute.**

### 2. Read the plan

Claude shows you the **whole storyboard** — not a summary. You get:

- The **look drawn for this reel** — its art direction, the shape of the argument, how it
  cuts, how the text animates. Different every time; say so if you want another one
- What the **research** turned up — how many grounded facts, and anything surprising
- The **voiceover script**, word for word, with delivery notes
- **Every scene** shot by shot: its kicker and headline, which word carries the marker
  emphasis, how its text animates, what moves on which spoken words, which photos it uses,
  where things sit in frame
- The **cut** between each pair of scenes and why it was chosen
- What **artwork** gets generated and how many **sound cues** there are
- How the reel **ends** — the closing line, the button, the URL
- Anything **flagged for review** — Gemini calls out claims that might overreach or need
  legal eyes

It looks like this:

```
  ── THE LOOK — drawn for this reel, different from the last one ───────

  Art        Night data room — Dark operations-room look. Glowing data
             lines over near-black, numbers as the hero.
  Arc        Myth bust: State the thing everyone believes, show why it is
             wrong, replace it with what is actually true.
  Edit       Zoom punch — every emphasis word is a hard scale step in.
  Type       Odometer roll · Scramble settle · Mask rise · Karaoke fill
  Cuts       glitchSlice, zoomPunch, colorFlash, irisWipe

  ── STORYBOARD ───────────────────────────────────────────────────────

  1. The Worst Part   0s–10s   (dark background)

     kicker    POST-VISIT GRIND
     headline  The worst part   [strike on "worst"]

     shots
       on "open OSCAR"
         LegacyChart slides in from the bottom, looking drab and utilitarian.
       on "Billing"
         SlamWord 'BILLING' takes over the screen with a harsh zoom.

     type      scramble-settle — glyphs resolve into the number
     art       doctor-rubbing-eyes
     layout    Cutout of exhausted doctor sits bottom-right. Keep bottom
               300px clear for captions.

        ↓  glitchSlice — the old system stuttering out.
```

It ends with the two audio files it needs from you, so the plan and the ask arrive together.

**This is your cheap moment to redirect.** Changing the script now costs a minute. Changing
it after you have recorded the voiceover costs you a re-record. Read it properly.

If you want changes, just say so in plain language:

> the opening is too gentle — lead with the number of hours lost

> drop scene 4, it repeats scene 2

> legal will not like "capture your full revenue" — soften it

> make it 45 seconds instead

> I do not like this look — give me something else

> use the same look as the referrals reel

Claude will regenerate or edit the plan and re-print the storyboard. Asking for a different
look costs one rerun and never touches the script. The same detail is also
written to **`PLAN.md`** in the new folder if you would rather read it there or send it to
someone for sign-off.

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
4. Generate the photo cutouts, props, textures and plates with Gemini — twelve to eighteen
   of them, so this is one of the slower steps
5. Write the scenes
6. Render test frames and look at them, fix what is wrong, and look again
7. Render the video

Expect **15–30 minutes** end to end. Most of that is generating artwork and the review loop;
the video render itself is two to four minutes. Claude will show you the finished mp4 when it
is done, along with a note of anything it changed from the plan.

---

## Every reel looks different

The thing that kills a video series is not bad reels. It is competent ones that all look the
same — same paper background, same headline punching in word by word, same four photos, same
torn-paper cut. Nobody complains about it, and three reels in the feed looks like a template.

So the look is **drawn before the script is written**, out of a catalog, with whatever your
last few reels used held out of the pool. You get:

| Drawn per reel | Out of |
|---|---|
| **Art direction** — the whole visual world | 14, from paper collage and risograph to night data, blueprint, archive broadcast, newsprint, chalk lecture, terminal mono |
| **Narrative arc** — the shape of the argument | 10, from cost-then-cure to myth-bust, day-in-the-life, countdown, objection-handling, contrarian take |
| **Opening gambit** — the first spoken clause | 10, from a hard number to a cold question to opening mid-action |
| **Edit language** — how it cuts | 10, from whip cuts to freeze-and-annotate to long-take drift |
| **Kinetic type** — how text behaves | 4 drawn from 12, spread across the scenes, never twice in a row |
| **Motion motifs** — the signature devices | 3 drawn from 12 — dot matrices, timeline rails, orbit systems, pulse maps, isometric grids |
| **Camera language** — how the frame moves | 8, from locked off to handheld drift to a side dolly |

That is more combinations than you will ever exhaust, and the history file on your machine
makes a near-repeat unlikely even across a run of reels in one week.

**The topic is researched first, too.** Before the plan is written, the topic is searched and
turned into a brief: real figures with sources, the vocabulary your audience actually uses,
the objections they would raise — and, for the film, the **real objects, rooms and human
moments** of that world. The asset list is built out of those, which is why it runs to twelve
to eighteen images rather than four, and why they look like your industry rather than like
stock photography. It is all written to `RESEARCH.md` in the reel folder if you want to read
it.

### Steering it

You never have to. But if you want to:

> make it look like a risograph print

> I want the dark data-room look, like the OSCAR reel

> use the same look as the referrals reel

Every draw has a **seed**, printed in the storyboard and saved in the reel folder, so a look
someone liked can always be brought back exactly. And if you just do not like what came out:

> give me a different look

costs one rerun and leaves the script alone.

---

## Command reference

They work the same in Claude Code and Copilot. You never have to use them — describing what
you want in plain language works just as well, and the agent picks the right step. They are here for when you would rather type a command than
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

## How long a render takes

A 60-second reel is about 1,800 frames at 1080×1920, and each one is drawn in a real browser.
On an M1 Pro that is **two to four minutes**. Around nine tenths of it is drawing frames;
encoding the video is a short tail at the end.

If a render is taking dramatically longer than that, it is almost always memory — not the
reel, not the settings. Renders run several browser tabs at once, each wanting roughly a
gigabyte. When the machine runs out, it starts swapping to disk, and a render does not get
gradually slower at that point, it falls off a cliff: every frame becomes disk-bound.

Check it directly:

```bash
sysctl vm.swapusage
```

If `used` is close to `total`, the machine is out of memory. **Closing Chrome is worth more
than any setting.** A browser with a lot of tabs open can easily hold 6GB.

Claude now sizes the render to whatever the machine actually has free, so it backs off on its
own rather than piling on more tabs than there is memory for. While it runs you will see a
heartbeat:

```
  [0m31s] rendering frames 433/1773 (24%)  eta 1m36s
  [0m46s] rendering frames 680/1773 (38%)  eta 1m14s
```

That is the important part. A render that prints nothing looks identical to one that has hung,
which is how a slow render turns into half an hour of waiting to find out. If it does go wrong
it now stops itself and says what to try, rather than grinding on until you give up on it.

**While you are still iterating**, a draft render is half scale and about a third quicker:

> render me a draft so I can check the timing

The motion and timing are identical; only the resolution drops. Worth it when the question is
"does this land?" rather than "is this ready to post?".

**The first render in a brand-new reel folder is slower** — a couple of extra minutes while
the project builds itself for the first time. That happens once per reel, not every time.

---

## What ends up in the folder

```
one-click-referrals/
  PLAN.md                 the creative plan, in plain English
  plan.json               the same plan, for the scripts
  direction.json          the look drawn for this reel, and its seed
  RESEARCH.md             what was found about the topic, with sources
  research.json           the same research, for the scripts
  assets/audio/           your voiceover and music
  public/art/             the generated cutouts, props, textures and plates
  src/look.ts             backdrop, camera move and per-scene text animation
  src/scenes/             one file per scene
  src/timing.ts           the timeline, pinned to your voiceover
  out/one-click-referrals.mp4    the reel
```

`npm run render` in that folder re-renders it, and `npm run draft` does a quick half-scale
pass.

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

Three files control how every future reel comes out:

- **`skills/reel-studio/references/creative-systems.json`** — the catalog every reel's look is
  drawn from: the art directions, narrative arcs, edit languages, kinetic type systems,
  motion motifs and camera languages. **Add entries here to widen the range**, or delete ones
  you never want to see. Each art direction carries its own photography direction, which is
  appended to every image prompt, and its own palette of cuts.
- **`skills/reel-studio/references/gemini-brief-prompt.md`** — the brief sent to Gemini. This
  is where the writing rules live: how the argument is structured, what the voiceover may and
  may not sound like, when capital letters are allowed. Edit this to change how reels are
  *written*.
- **`skills/reel-studio/references/production-playbook.md`** — the craft rules Claude follows
  while building. Caption safe zones, headline sizing, sound levels, animation conventions.
  Edit this to change how reels are *made*.

The split is deliberate. The brief and the playbook are the things that should stay
**constant** across every reel — the editorial standard. The catalog is the thing that must
**not**. Widening the catalog makes your reels more varied; editing the brief makes them all
better in the same way.

An art direction is a small block of JSON. Adding one means giving it a name, a summary, a
photography direction, a cut palette, and a `backdrop` naming one of the fourteen variants in
`src/components/Backdrop.tsx` — or a new one you add there.

Change any of them, commit, push, and everyone who updates gets it.

---

## Updating to a new version

When the skill changes — a new art direction, a new component, a fix — here is how to pick it
up. **Your existing reel folders are not touched by any of this.** Each one has its own copy
of the component kit and scripts, so a reel you already rendered keeps rendering the same way;
the update applies to reels you start afterwards.

### Claude Code

Two commands, in this order. The first re-fetches the marketplace listing, the second
reinstalls the plugin from it.

```
/plugin marketplace update healthlytics
```

```
/plugin install reel-studio@healthlytics
```

Then confirm it took:

```
/plugin
```

You should see **reel-studio** listed and enabled. If a slash command misbehaves afterwards,
restart Claude Code — commands are read at startup.

If `/plugin marketplace update` reports it cannot find `healthlytics`, the marketplace was
never added on this machine. Add it and install:

```
/plugin marketplace add healthlyticsai/reels-studio
```

```
/plugin install reel-studio@healthlytics
```

You can also do both from the interactive menu: run `/plugin`, pick the marketplace, and
choose update there.

### GitHub Copilot

If you installed the default way (a symlink into `~/.copilot/skills/`), `git pull` is the
whole update:

```bash
cd ~/reels-studio && git pull
```

The symlink points at your clone, so the new SKILL.md, references, scripts and component kit
are live immediately.

**Re-run the installer as well** whenever the set of slash commands changes, or when a
command's text changes — those are generated files rather than symlinks, so `git pull` alone
does not refresh them:

```bash
bash ~/reels-studio/skills/reel-studio/scripts/install-copilot.sh
```

Then quit VS Code completely and reopen it. A window reload is not always enough.

If you installed with `--copy` instead of the default symlink, `git pull` does nothing for
you — re-run the installer to copy the new files over:

```bash
cd ~/reels-studio && git pull && bash skills/reel-studio/scripts/install-copilot.sh --copy
```

### Checking which version you have

```bash
cd ~/reels-studio && git log --oneline -3
```

For a plugin install, the cached clone is under `~/.claude/plugins/`; the quickest check that
a specific change landed is to ask for something only the new version has. For this release:

> list the art directions reel-studio can use

Claude runs `direction.mjs --list` and prints them. If that command is not found, the update
did not land.

### If an update breaks something

Nothing here is destructive, and reel folders are self-contained, so the fallback is to
reinstall:

```
/plugin uninstall reel-studio@healthlytics
```

```
/plugin install reel-studio@healthlytics
```

For Copilot, `install-copilot.sh --uninstall` then run it again.

---

## Troubleshooting

| What you see | What to do |
|---|---|
| `GEMINI_API_KEY not found` | Redo step 1. Close and reopen Terminal afterwards. |
| Claude does not offer to make a reel | Check `/plugin` shows reel-studio enabled. Try naming it: "use reel-studio to…" |
| A generated photo looks wrong or has grey checkerboard squares | Ask Claude to regenerate that one asset. Gemini cannot make transparent images and occasionally ignores the workaround. |
| Text hidden behind the captions | Ask Claude to fix it — scene content has to stay clear of the bottom band. |
| The speech model download stalls | Ask Claude to retry it. On a slow connection it sometimes times out partway. |
| Rendering feels very slow | Check `sysctl vm.swapusage` — if swap is near full the machine is out of memory, and closing Chrome helps more than any setting. See [How long a render takes](#how-long-a-render-takes). |
| A render seems stuck with no output | It now prints progress every 15 seconds and gives up with an explanation rather than hanging. If you are on an older version, update — that was the fix. |
| The very first render in a new reel is slow | Expected, once per reel, while the project builds itself. Later renders reuse it. |
| Two reels came out looking alike | Say "give me a different look" and Claude redraws it. If it keeps happening, the history file at `~/.reel-studio/history.json` may have been cleared — it is what holds recent looks out of the pool. |
| The look is not what you wanted | Name what you want: "make it look like a blueprint schematic", "use the dark data-room one". Claude will list the options if you ask. |
| Asset generation takes a long time | Expected — a reel is twelve to eighteen images now. It runs three at a time. Regenerate only what failed rather than the whole set. |

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
  references/            playbook, component API, the Gemini brief, troubleshooting,
                         and creative-systems.json — the catalog looks are drawn from
  scripts/               direction, research, brief, scaffold, asset generation,
                         matting, transcription, plus install-copilot.sh, which
                         mirrors the commands as skills
  assets/
    brand/               brand.config.json
    logo/  sfx/  art/    brand logos, six sound effects, transition furniture
    template/            the component kit copied into every new project
```

Projects are scaffolded without Tailwind. The kit is inline styles throughout and used zero
utility classes; all Tailwind contributed was its Preflight reset, which
`assets/template/src/index.css` now carries explicitly — verified pixel-identical. Dropping it
also removes the bundler override that forced Remotion off its default bundler.

### How the pieces fit

- **`scripts/direction.mjs`** draws this reel's look from
  `references/creative-systems.json`, holding out what the last few reels used (history in
  `~/.reel-studio/history.json`, overridable with `REEL_STUDIO_HOME`). Writes
  `direction.json`. Seeded, so `--seed` reproduces a draw exactly.
- **`scripts/research.mjs`** grounds the topic with Gemini plus Google Search and writes
  `research.json` + `RESEARCH.md`. Its `visualMotifs` and `humanMoments` are what the asset
  manifest gets built from.
- **`scripts/brief.mjs`** runs those two, then sends
  `references/gemini-brief-prompt.md` — with the direction and research substituted in — to
  `gemini-3.1-pro-preview`, and writes `plan.json` + `PLAN.md`. It tops the asset manifest up
  with a second call if it comes back under twelve.
- **`scripts/new-project.sh`** scaffolds Remotion, copies the component kit and brand config,
  and pins the dependency set.
- **`scripts/generate-assets.mjs`** reads the plan's asset manifest and appends the art
  direction's own photography direction to every prompt. Gemini cannot emit an alpha channel,
  so cutouts and props are rendered on flat magenta and **`scripts/matte.mjs`** keys them
  out; flat symbols go through **`matte-ink.mjs`** for luminance alpha, and textures and
  environment plates stay opaque. `matte.mjs` routes all three from the manifest.
- **`scripts/transcribe.mjs`** runs whisper.cpp and prints the sentence table the timeline is
  derived from.
- **`scripts/render.mjs`** replaces a fixed `--concurrency=6`, which was the reason renders
  sometimes took half an hour: six 1080x1920 Chromium tabs need memory a working laptop often
  does not have, and past that point a render is disk-bound rather than just slow. It sizes
  concurrency from free memory and swap pressure, heartbeats on its own timer (the cold bundle
  is silent for minutes, which is exactly when you need to see something), and stops with a
  diagnosis at a stall or a ceiling.
- **`assets/template/src/components/`** is the shared kit — fourteen backdrops and five
  camera moves (`Backdrop.tsx`), typography with eight entrances and five emphasis marks
  (`Type.tsx`), thirteen kinetic type systems (`KineticType.tsx`), fourteen scene transitions
  (`Transitions.tsx`), motion devices (`MotionGraphics.tsx`, `Devices.tsx`), captions,
  texture. **`src/look.ts`** in each project is where the drawn direction reaches the code.

### Two hosts, one source

`skills/reel-studio/` is the open Agent Skills format, which Claude Code and Copilot both
read unchanged. Only the slash commands diverge: Claude Code loads `commands/*.md` from the
plugin, and `scripts/install-copilot.sh` regenerates those as sibling skills under
`~/.copilot/skills/`. Edit `commands/*.md` as the single source — Copilot users pick the
change up by re-running the installer.

### Publishing a change

```bash
git add -A && git commit -m "..." && git push
```

Team members pick it up with `/plugin marketplace update healthlytics` followed by
`/plugin install reel-studio@healthlytics`, or from the `/plugin` menu. Copilot users
`git pull`, and re-run `install-copilot.sh` if the commands changed. Full instructions are in
[Updating to a new version](#updating-to-a-new-version) — point people there rather than
retyping it.

### Testing without publishing

```
/plugin marketplace add /absolute/path/to/reels-studio
```

A local path works the same as a GitHub repo, so you can try a change before pushing it —
and it skips the auth step entirely, which makes it the fastest way to check a change.

### Onboarding someone new

The repo being private means a new teammate cannot install the plugin until they are in the
`healthlyticsai` org. Add them there first, then send them at step 1 of
[Installation — Claude Code](#installation--claude-code), or the
[Copilot section](#installation--github-copilot) if that is what they use. The failure mode if you skip it is unhelpful: GitHub returns
`Repository not found` for a private repo you cannot see, which reads like the repo is
missing rather than like a permissions problem.

If the org ever switches this repo to public, steps 1 and its `git ls-remote` check drop
away and the two `/plugin` commands work on their own.
