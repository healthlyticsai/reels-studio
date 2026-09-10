# Production playbook

The craft rules behind these reels, and the failure modes that are cheap to avoid up front
and expensive to discover after a render. Read this before writing the first scene.

## Contents

1. [The voiceover is the clock](#1-the-voiceover-is-the-clock)
2. [Transition timing arithmetic](#2-transition-timing-arithmetic)
3. [The caption safe zone](#3-the-caption-safe-zone)
4. [Headline width arithmetic](#4-headline-width-arithmetic)
5. [Typography and the caps policy](#5-typography-and-the-caps-policy)
6. [Captions from whisper output](#6-captions-from-whisper-output)
7. [Generating art with Gemini](#7-generating-art-with-gemini)
8. [Sound design levels](#8-sound-design-levels)
9. [Animation conventions](#9-animation-conventions)
10. [The review loop](#10-the-review-loop)

---

## 1. The voiceover is the clock

Every frame number in the reel is derived from where a word actually falls in `vo.mp3`.
Gemini's `approximateSeconds` are a planning estimate written before the audio existed; real
delivery drifts by seconds, and a reel cut to the estimate feels laid over the narration
rather than cut to it.

After `scripts/transcribe.mjs` writes `src/captions.json`, print the sentence table and map
scene boundaries onto sentence ends:

```bash
node -e '
const c=require("./src/captions.json");
let line="",start=null;
for(const w of c){ if(start===null)start=w.startMs; line+=w.text;
  if(/[.?!]$/.test(w.text.trim())){
    console.log(`f${Math.round(start/1000*30)}-${Math.round(w.endMs/1000*30)}:${line}`);
    line=""; start=null; } }'
```

Write those numbers into `src/timing.ts` as the `SCENES` map, and set the composition length
to the last frame plus a beat of hold. Then anchor individual beats to individual words —
the strike-through lands on the frame the contradicted word is spoken, the stamp lands on
"burnout", the drawer opens on "extension". Leave a comment naming the word next to each
anchor so the next person editing knows what it is pinned to.

**Do not round the reel to 60 seconds.** If the VO is 68.4s, the reel is 69s. Trimming
narration to hit a round number is the one thing viewers always notice.

## 2. Transition timing arithmetic

`<TransitionSeries>` overlaps scenes: a transition of length `t` between A and B is drawn
during A's last `t` frames, and B's local frame 0 sits at `durationOf(A) - t`.

So to keep every scene's local frame 0 exactly on its voiceover boundary:

```
scene duration = its VO span + the length of the transition that FOLLOWS it
```

The last scene gets no addition. Total length still comes out to the sum of the VO spans,
because `TransitionSeries` subtracts the overlaps back out. `timing.ts` in the template does
this arithmetic for you — put VO spans in `SCENES` and transition lengths in `TRANSITIONS`,
and read `SCENE_DURATION` in the composition.

The practical consequence: each scene keeps rendering for `t` frames past its own content.
Because every `interpolate` in the kit clamps, animations simply hold — but check that the
held frame is a good one, since it is what the audience sees under the outgoing half of the
transition.

## 3. The caption safe zone

Burned-in captions occupy roughly **y=1690 to y=1850**. Most of the feed watches muted, so
captions are not optional and scene content yields to them, not the other way round.

**Keep all scene content above y=1620.** This is the single most common layout bug: a CTA
button, a badge row or a card bottom edge that looks fine in isolation and is buried under a
caption pill in the render. Anything anchored with `bottom:` needs at least `240px`.

A related trap: an element positioned relative to a *container* that itself grows. Adding a
supporting line under a headline pushes the block down into whatever sits below it. When you
add to a header stack, re-check the element underneath.

## 4. Headline width arithmetic

Estimate rendered width as `0.55 x fontSize x characterCount` for Inter 800. The usable width
inside the standard 84px side margins is **912px**.

```
"Reclaim 2+ hours"  = 16 chars x 0.55 x 82px = 722px  ✓
"RECLAIM 2+ HOURS"  at 94px                  = 827px  ✓ but caps
"It reads and writes straight into OSCAR." at 92px    = 2020px  ✗ split it
```

This matters beyond tidiness: `strike`, `underline` and `highlight` marks span a single
segment on a single line. A wrapped headline gets a strike through its first line only, which
reads as a mistake. When a line will not fit, split it into two `Headline` components rather
than shrinking the type below about 80px, where it stops reading as a headline on a phone.

## 5. Typography and the caps policy

Headlines are sentence case. Caps are reserved for four things:

| Where | Why it earns caps |
|---|---|
| Eyebrow kicker above a headline | A 25px kicker is a genuine typographic convention |
| Rubber stamp graphic | Stamps are physically set in caps |
| Authentic UI chrome (`SUBJECTIVE`, `PATIENT`, table headers) | That is how the real software looks |
| Proper nouns (OSCAR, SOAP, API) | They are acronyms |

Everything else — decks, pill rows, ticker bands, pipeline labels, stat chips, button labels,
card titles — is sentence case. `Eyebrow` and `TickerStrip` both take `caps={false}` for the
cases where a pill sits in a row with body copy and three caps blocks in a line just shout.

Emphasis comes from **animated marks, not from shouting**. The five marks — `highlight`
(marker block wiping in behind the words), `underline`, `strike`, `circle`, `box` — attach to
a single `Segment` and take the frame they land on. Pin that frame to the word in the VO.

## 6. Captions from whisper output

Whisper emits sub-word tokens and bare punctuation as separate entries: `burn` + `out`,
`Sc` + `ribe`, `waves` + `.` + `ai`, `bi` + `-` + `direction` + `al`. Rendered one pill per
token, that looks broken.

The rule that fixes it: **a token that did not arrive with a leading space belongs to the
previous word.** `Captions.tsx` in the kit implements this in `mergeTokens`, along with a
`fix()` pass for brand names whisper mishears. Update that map for your product — whisper
will not know how to spell it.

Hold each page until the next one starts rather than fading on the last word's end time,
otherwise captions flicker off in the gaps between phrases.

## 7. Generating art with Gemini

**Gemini's image model cannot emit an alpha channel.** Ask for a transparent background and
it returns a JPEG with a checkerboard *painted into the pixels* — which renders as literal
grey squares in the video. It also returns JPEG regardless of the `.png` filename.

The working pattern:

1. Prompt for a **flat solid `#FF00FF` backdrop** filling the frame, explicitly stating that
   no magenta appears on the subject and no shadow falls on the backdrop.
2. `matte.py` keys it out, despills the magenta fringe from anti-aliased edges, and trims to
   the bounding box.
3. **Flat single-colour shapes** (ink blots, silhouettes, solid graphics) need `matte-ink.py`
   instead. Chroma-keying them leaves a pink halo on every edge pixel; rebuilding alpha from
   luminance and forcing the fill colour cannot fringe at all.

Always Read a contact sheet over a loud colour before building on the assets —
`contact-sheet.py` composites over hot pink so a failed matte is unmissable. A common failure
is the model ignoring the magenta instruction and returning a grey studio backdrop; that
asset comes back near-100% opaque and needs regenerating.

**For character consistency across scenes**, pass an existing asset as a reference image with
`--ref`. The same physician tired at a keyboard in scene 1 and relaxed in the payoff is what
makes the reel feel like one story instead of two stock photos.

## 8. Sound design levels

The voiceover carries the reel. Everything else sits well under it:

| Cue | Volume | Notes |
|---|---|---|
| Voiceover | 1.0 | Never ducked |
| Background music | 0.16 under narration, 0.26 at the CTA | Fade to 0 over the last 40 frames |
| Scene transition | 0.38–0.45 | Fire **2 frames before** the cut so sound leads picture |
| Impact (stamp, slam) | 0.5 | The loudest non-VO element |
| Marker stroke | 0.16–0.26, `playbackRate` 1.35–1.5 | A stroke, not a hit — pitched up and quiet |
| UI (click, switch) | 0.36–0.42 | |
| Success (ding) | 0.3–0.42 | |

Six files cover everything: `whoosh`, `whip`, `page-turn`, `switch`, `mouse-click`, `ding`.
Vary `playbackRate` to get more sounds out of them — the same `whip` at 1.45 is a marker
stroke and at 0.8 is an ink splat.

## 9. Animation conventions

Remotion renders frame by frame, so CSS `transition` and `animation` never appear in output.
Everything is driven by `useCurrentFrame()`.

- Keep `interpolate()` inline in the `style` prop, and always clamp both ends. Inline
  keyframes stay editable in Remotion Studio; unclamped ones produce wild values off-range.
- Use the `scale`, `translate` and `rotate` CSS properties rather than a `transform` string,
  and pass `output: "perceptual-scale"` on scale animations.
- Use `spring()` for anything that enters — cards, pills, words. The kit's `SPRING` presets
  cover the four useful characters: `punch`, `card`, `snap`, `soft`.
- Give every scene one slow continuous move — a 5% push, a tilt easing from 12° to 3°, a
  drift. A scene where only the foreground animates reads as a slideshow.
- Use Remotion's `random(seed)` rather than `Math.random()`, so a frame renders identically
  every time. A non-deterministic frame flickers in the final video.

## 10. The review loop

Render stills and **look at them**. Layout collisions, clipped text, bad mattes and
z-ordering mistakes are invisible in source and obvious in a frame.

```bash
npx remotion still Reel /tmp/chk/f<N>.png --frame=<N> --scale=0.4
```

Cover every major beat — ten to fifteen stills across a 60-second reel — and Read each one.
Then fix and re-check. Two or three rounds is normal; the first pass always has something
overlapping.

When the render finishes, check the **delivered mp4** rather than trusting the composition:

```bash
python3 scripts/contact-sheet.py --video out/reel.mp4 /tmp/final.png
```

Both bugs found in the reel this skill was built from — a supporting line colliding with a
card label, and a stat row sitting under a headline — were invisible in code, invisible in
the scenes read individually, and immediately obvious in the contact sheet.
