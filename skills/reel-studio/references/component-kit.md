# Component kit

Everything in `src/components/` is already written and tested. Compose scenes from these
rather than rebuilding typography, transitions or motion devices — that work is done, and
re-deriving it burns context that is better spent on the scene itself.

## Contents

- [Typography — `Type.tsx`](#typography--typetsx)
- [Transitions — `Transitions.tsx`](#transitions--transitionstsx)
- [Motion graphics — `MotionGraphics.tsx`](#motion-graphics--motiongraphicstsx)
- [Texture and depth — `Texture.tsx`](#texture-and-depth--texturetsx)
- [Captions — `Captions.tsx`](#captions--captionstsx)
- [Product UI — `BrowserFrame`, `ProductPanel`, `LegacyChart`](#product-ui)
- [Props and paper — `Paper.tsx`, `Marks.tsx`, `SoundWave.tsx`, `DataPipe.tsx`](#props-and-paper)

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
