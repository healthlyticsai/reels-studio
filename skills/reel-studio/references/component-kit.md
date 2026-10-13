# Component kit

Everything in `src/components/` is already written and tested. Compose scenes from these
rather than rebuilding typography, transitions or motion devices — that work is done, and
re-deriving it burns context that is better spent on the scene itself.

## Contents

- [Backdrop and camera — `Backdrop.tsx`](#backdrop-and-camera--backdroptsx)
- [Typography — `Type.tsx`](#typography--typetsx)
- [Kinetic type — `KineticType.tsx`](#kinetic-type--kinetictypetsx)
- [Transitions — `Transitions.tsx`](#transitions--transitionstsx)
- [Motion graphics — `MotionGraphics.tsx`](#motion-graphics--motiongraphicstsx)
- [Motion devices — `Devices.tsx`](#motion-devices--devicestsx)
- [Texture and depth — `Texture.tsx`](#texture-and-depth--texturetsx)
- [Captions — `Captions.tsx`](#captions--captionstsx)
- [Product UI — `BrowserFrame`, `ProductPanel`, `LegacyChart`](#product-ui)
- [Props and paper — `Paper.tsx`, `Marks.tsx`, `SoundWave.tsx`, `DataPipe.tsx`](#props-and-paper)
- [Demo mode — `Screenshot`, `PhoneFrame`, `AvatarClip`, `DemoScene`](#demo-mode)

---

## Backdrop and camera — `Backdrop.tsx`

The layer that makes one reel look nothing like the next. `direction.json` names a variant
for the whole reel; copy it into `src/look.ts` once and every scene reads it from there.

```tsx
<Backdrop variant={BACKDROP} />        {/* first element in every scene */}
```

Fourteen variants: `paperCollage`, `risograph`, `swissGrid`, `nightData`, `blueprint`,
`archiveFilm`, `gallery`, `chalkboard`, `neonGradient`, `newsprint`, `cleanStudio`,
`duotoneSplit`, `scrapbook`, `terminalMono`. `isDarkBackdrop(v)` tells you whether type on it
has to be light, so a scene can branch once rather than hard-coding a colour.

`drift` (default true) adds the slow ambient movement. Turn it off for a variant meant to sit
dead still under a locked-off camera.

### `CameraMove`

The frame's own movement, wrapped around a scene's content, from the reel's camera language.

```tsx
<CameraMove mode={CAMERA} duration={SCENES.problem.duration}>
  …scene content…
</CameraMove>
```

`mode` is `locked`, `pushIn`, `drift`, `parallax` or `sideDolly`. `duration` is the scene
length in frames, so a push completes exactly on the cut rather than partway through.

---

## Typography — `Type.tsx`

### `Headline`

The workhorse. Words punch in one at a time; each `Segment` can carry its own animated
emphasis mark pinned to the frame the word is spoken.

```tsx
<Headline
  delay={110}                 // frame the first word lands
  size={94}                   // px; check the width arithmetic in the playbook
  stagger={3}                 // frames between words
  color={COLORS.slate}
  align="center"              // flex justifyContent
  nowrap                      // default true — marks only span one line
  segments={[
    { text: "One hour" },
    { text: "with the patient.", mark: { kind: "underline", at: 152, color: COLORS.teal } },
  ]}
/>
```

`Segment`: `{ text, mark?, color?, gradient?, caps? }`.

### `anim` — how the words arrive

`Headline` takes `anim`, and this is the prop that stops five scenes in a row animating
identically. The plan assigns each scene a type system; `src/look.ts` maps scene id to anim.

| `anim` | Words… |
|---|---|
| `punch` | spring up with an overshoot (the default) |
| `riseMask` | travel up through a clip, so nothing is visible until it is in place |
| `blurIn` | resolve from blur with the tracking closing up |
| `cascade` | drop from above with a small rotation |
| `elastic` | slam in oversized and settle |
| `rollUp` | roll up through a clip with a tilt |
| `flip` | hinge up from the baseline in 3D |
| `drift` | slide in sideways out of a soft blur |

**Adjacent scenes must not share one.** That rule is the whole point of the system, and it is
easiest to check when `look.ts` lists them together.

`Mark` kinds, all with `{ at, color? }`:

| Kind | Reads as | Extra props |
|---|---|---|
| `highlight` | Marker block wiping in behind the words | `rotate` |
| `underline` | Hand-drawn underline drawing left to right | `thickness` |
| `strike` | Struck through — for the thing being rejected | — |
| `circle` | Circled annotation | — |
| `box` | Drawn rectangle | — |

### `Eyebrow`

Small pill above a headline. Caps by default because a kicker is a genuine convention; pass
`caps={false}` when it sits in a row with body copy.

```tsx
<Eyebrow delay={0} color={COLORS.danger} border={`2px solid ${COLORS.danger}33`}>
  The documentation tax
</Eyebrow>
```

### `Deck`

Supporting sentence under a headline. `{ delay, size, color, maxWidth }`.

### `SlamWord`

Full-bleed single word for a climax beat, with an accent rule that draws underneath.
`{ text, color, size, gradient, rule }`.

### `CountUp`

Number rolling up. `{ to, from, delay, duration, decimals, suffix, size, color, gradient }`.
Pin `delay` to the frame the number is spoken.

### `Confetti`

Particle burst. `{ at, count, spread }` — position it inside a relatively-positioned parent.

---

## Kinetic type — `KineticType.tsx`

Whole type systems, rather than variations on one headline. `direction.json` draws four per
reel and the plan assigns one per scene.

| Component | Reads as | Key props |
|---|---|---|
| `MaskReveal` | Lines pushed up through a slot | `lines, stagger, duration` |
| `Typewriter` | The machine writing it | `cps, caret, mono` |
| `CharCascade` | Falling tiles assembling a word | `stagger, from` |
| `VerticalRoll` | A counter cycling through words | `words, hold, duration` |
| `BlurFocus` | A lens finding focus | `duration, blur` |
| `KaraokeLine` | The line filling as it is spoken | `words: {text, at}[], dim, accent` |
| `WordSwap` | One slot in a sentence being replaced | `before, words, at[], after` |
| `SplitFlap` | A departures board settling | `stagger, flips` |
| `ElasticSlam` | A hit, with a frame shake | `shake` |
| `ScrambleText` | Glyphs resolving into a word | `duration` |
| `StackedLines` | A block of type being built line by line | `lines: {text, at}[]` |
| `PullQuote` | Someone else's words | `attribution, duration` |
| `OdometerNumber` | A mechanical counter landing | `value, digits, duration` |

All of them take `delay` — the frame the line starts, pinned to the transcript word it
belongs to — plus the usual `size`, `color`, `weight`, `gradient` and `align`.

`KaraokeLine` and `StackedLines` take a per-item `at` instead of one `delay`, because they
track several words across a sentence. Take those frames from `captions.json`.

`OdometerNumber` moves the glyphs; `CountUp` in `Type.tsx` interpolates the value. They read
differently — use the odometer when the *landing* is the beat.

---

## Transitions — `Transitions.tsx`

Each is a `TransitionPresentation` for `<TransitionSeries>`. Pick the one whose physical
metaphor matches the argument being made — an edit that means something reads as
intentional; a generic crossfade reads as a slideshow.

| Function | Motion | Use when |
|---|---|---|
| `tornPaper()` | Torn strip sweeps down, revealing the next scene | Leaving a world behind — paperwork, the old way |
| `inkSplatter(color)` | Blots splatter, flood to `color`, lift | Entering a dark scene, or a dramatic pivot |
| `cardPush(dir)` | 3D whip push, `dir` is `1` or `-1` | A hard change of subject |
| `stackShuffle()` | Outgoing scene dealt away like a card | Moving from a set of things to a conclusion |
| `halftoneDissolve()` | Dot mask eats the frame and reveals the next | A print-idiom dissolve |
| `whipPan(dir)` | Hard sideways whip with a motion smear | Linking two shots as one head turn |
| `barWipe(color, bars)` | Staggered bars sweep across | A graphic, deliberate edit |
| `zoomPunch()` | Outgoing frame slams past camera, incoming opens up | Landing on a point |
| `glitchSlice()` | Horizontal slices displace, chroma splits | Something breaking, or old tech |
| `irisWipe(x, y)` | Circular iris opens from a point | Focusing onto one thing |
| `shutterSlats(n)` | Alternating slats open from opposite sides | A mechanism revealing |
| `filmBurn()` | Frame blows out hot and burns through | A time jump, an archive cut |
| `colorFlash(color)` | Flash to a flat colour and back | A beat-locked hard cut |
| `pathWipe(angle, color)` | Soft-edged mask travels at an angle behind a drawn rule | A schematic or drawn idiom |

The art direction drawn for the reel names a **cut palette** of four — pick from those rather
than from the whole list, or the edit stops belonging to the look.

See the playbook's timing arithmetic before wiring these up — scene durations must include
the following transition's length.

---

## Motion graphics — `MotionGraphics.tsx`

| Component | What it shows | Key props |
|---|---|---|
| `RippleRings` | Concentric rings pulsing outward — ambient capture, signal | `size, rings, period, color, strength` |
| `ScanBeam` | Beam sweeping down a card — reading, analysing | `at, duration, color, radius` |
| `TickerStrip` | Angled scrolling marquee band | `text, speed, background, size, rotate, caps` |
| `BarCompare` | Animated before/after bars | `bars, max, at, width, stagger` |
| `ArrowScribble` | Hand-drawn arrow drawing toward a target | `at, duration, width, rotate, flip` |
| `StatChip` | Number + label popping in | `at, value, label, color, background` |
| `Motes` | Drifting particles for quiet depth | `count, color, opacity` |

`ScanBeam` needs a `position: relative` parent — it fills its container.

`BarCompare` takes `Bar[]` of `{ label, value, color, caption }`.

---

## Motion devices — `Devices.tsx`

The reel's three signature devices come from here, drawn per reel so the recurring visual
idea differs each time instead of every reel reaching for ripple rings and a bar chart.

| Component | What it shows | Key props |
|---|---|---|
| `DotMatrix` | A count filling a grid of dots | `total, filled, at, columns, dot, gap` |
| `TimelineRail` | Markers filling along a rail in sequence | `points: {label, at}[], width` |
| `PathTrace` | A line drawing itself with a travelling dot | `d, at, duration, thickness, dashed` |
| `OrbitDots` | Satellites circling a centre | `size, count, period, children` |
| `FloatingCards` | A parallax stack fanning out | `cards, at, width, height, spread` |
| `SplitCompare` | A moving divider between two states | `at, to, left, right` |
| `PulseMap` | Nodes with pings travelling between them | `nodes, width, height, period` |
| `RadialBurst` | Speed lines on a stressed syllable | `at, count, length, duration` |
| `HalftoneWave` | A dot field swelling in a wave | `columns, rows, spacing, speed` |
| `ProgressArc` | A gauge filling to a number | `to, at, size, caption, suffix` |
| `IsoGrid` | Isometric tiles rising in sequence | `at, cols, rows, tile, stagger` |
| `FilmStrip` | Frames scrolling past | `frames, speed, frameWidth` |
| `TapeStrip` | A masking-tape label stuck at an angle | `at, rotate, color, size` |
| `SpotlightMask` | Everything dimmed but one region | `at, x, y, radius, dim` |

`PathTrace` positions its dot from the path with `@remotion/paths` — do not reach for SVG's
own `<animateMotion>` anywhere in a Remotion scene, it is a SMIL clock and never advances
under a frame-by-frame renderer.

`SplitCompare` and `SpotlightMask` fill their container; give them an `AbsoluteFill` parent.

---

## Texture and depth — `Texture.tsx`

- `PaperTexture` — grain plus halftone dots. `{ opacity, halftone }`. Put it last in every
  scene at 4–6%; it is what stops the frame looking like a website screenshot.
- `GridBed` — slowly drifting technical grid. `{ color, size, opacity, drift }`.
- `Bloom` — soft brand-coloured glow. `{ x, y, size, opacity, blur }`.

---

## Captions — `Captions.tsx`

```tsx
const pages = useMemo(() => buildPages(captionsJson as Caption[]), []);
<Captions pages={pages} />
```

`buildPages(captions, maxWords = 4, maxGapMs = 420)` merges whisper's sub-word tokens back
into real words, applies the brand corrections from `brand.json`, and groups them into pages
that break on sentence ends. The active word is highlighted per frame.

---

## Product UI

These are written for the Waivs Scribe / OSCAR EMR story. For a different product, edit the
labels and body content — the structure (gradient header, status pill, streaming body) is
the reusable part.

- `BrowserFrame` — macOS Chrome window with an extension slot. `{ width, height, url,
  extensionGlow, children }`.
- `BrandMark` / `BrandLockup` — logo images resolved from `brand.json`. `{ size|width, white }`.
- `ProductPanel` — the product's side panel. `{ width, height, typed, listening,
  contextLoaded, sections, templateLabel }`. `typed` from 0 to 1 streams the body in.
- `LegacyChart` — the incumbent system's screen. `{ width, height, noteFill, highlightChart,
  compact }`.

---

## Props and paper

- `Paper.tsx` — `PaperSheet`, `FormSheet` (faux documents for an avalanche), `Clock`
  (analog clock with spinnable hands).
- `Marks.tsx` — `RubberStamp` (the one place caps are mandatory), plus standalone
  `MarkerHighlight`, `StrikeThrough`, `CircleAnnotation` for marking non-text elements.
- `SoundWave.tsx` — `SoundWave` (bar visualiser driven by layered sines) and `WaveRibbon`
  (continuous sine ribbon).
- `DataPipe.tsx` — `DataPipe` (glowing bezier pipeline with travelling packets) and
  `PipeLabel`. For showing data moving between two systems.

---

## Demo mode

Demo projects (`new-project.sh --mode demo`) add these on top of the kit. Every one of them
reads its layout from `useFormat()` (`src/format.tsx`), so the same scene renders correctly
in `Demo-16x9` and `Demo-9x16`. Use `f.w`, `f.h`, `f.safe` and `f.isLandscape` in any custom
scene. Do not write literal pixel positions.

- `Screenshot`: a real screenshot shown exactly as captured, in `BrowserFrame` (desktop) or
  `PhoneFrame` (mobile). `{ screen, focus, width, height, sceneDuration, enterAt }`. `focus`
  entries are `{ at, until?, box: [x, y, w, h], action, label? }`, with boxes in the image's
  own 0–1 coordinates:
  - `zoom` moves the camera onto the box, and consecutive zooms travel directly from one to
    the next.
  - `highlight` dims everything else and rings the box.
  - `click` glides a cursor in, clicks on `at` with a ripple and a click sound.
  - `label` adds a callout pill that stays the same size through a zoom.
- `PhoneFrame`: a plain device bezel. `{ width, height }`; `PHONE_PAD` is the bezel width.
- `AvatarClip`: the lip-synced presenter, always muted. `{ avatar, width, height, shape:
  "rect" | "circle", enterAt?, presenter? }`. It places `avatar.clip` at `avatar.clipFrom`,
  which is where its audio slice was cut from `vo.mp3`. Until the clip exists it shows the
  still, so layouts can be checked early. Passing `presenter` on a `rect` adds the name tag.
- `DemoScene`: renders a whole scene from its `src/demoTimeline.ts` entry:
  - `avatar`: the presenter full frame.
  - `screen`: headline plus screenshot, with an optional presenter bubble placed in the
    corner away from the first focus box.
  - `split`: presenter beside the screenshot in 16:9, above it in 9:16.
  - `cta`: logo, closing line, button, URL, and an optional bubble.
- `BrowserFrame` gained `extension={false}` for real screenshots and exports `BROWSER_BAR`.
- `LaptopFrame`: a CSS 3D laptop (lid with the real screenshot, hinged keyboard deck, desk
  shadow). `useLaptopPose(motion, duration, enterAt)` drives it; the motions are `swingIn`,
  `tiltBack`, `riseUp`, `float` and `front`. Use it through `Screenshot` with
  `screen.device = "laptop"`. There, zooms move the screen's content rather than the camera,
  so they land while the laptop is turned, and `nextScreen` cross-fades to a second image.
- `GlowText` / `GlowList`: product-film type. Words resolve out of blur with a soft glow, and
  emphasised words take the accent. `GlowList` builds a checklist item by item. Laptop scenes
  and presenter captions use these automatically.
- Backdrop `brandGlow`: the saturated brand gradient these scenes sit on.

`src/demoTimeline.ts` is written by `scripts/demo-timing.mjs`. Change `plan.json` or
`src/look.ts` and re-run rather than editing frames by hand.

