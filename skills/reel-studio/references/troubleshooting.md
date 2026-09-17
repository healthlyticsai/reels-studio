# Troubleshooting

Failures seen in production, with the fix. Most cost an hour the first time and a minute once
you know the shape of them.

## Render fails: `ENOENT ... bundle.js`

Bundling reports 100% and then no bundle exists. This is rspack plus the Tailwind bundler
override — they do not compose in this setup and the failure is silent.

`new-project.sh` already writes a `remotion.config.ts` with rspack off. If you have re-enabled
it, comment out `Config.setRspack(true)` again, or drop
`Config.overrideBundlerConfig(enableTailwind)` if you genuinely need rspack. Webpack renders
these compositions fine.

## Generated art has grey checkerboard squares in it

Gemini painted a fake transparency checker into the pixels. It cannot emit an alpha channel,
so asking for a "transparent background" gets you a picture *of* transparency.

The prompts in `generate-assets.mjs` request a flat magenta backdrop for exactly this reason.
If you see a checkerboard, the prompt lost its chroma-key direction — regenerate, then matte.

## An asset comes back "98% opaque" from matte.mjs

The model ignored the magenta instruction and used a grey studio backdrop, so there was
nothing to key. Regenerate just that one:

```bash
node scripts/generate-assets.mjs <asset-name> && node scripts/matte.mjs <asset-name>.png
```

If it happens twice, make the backdrop instruction more emphatic in the asset's `prompt`
field in `plan.json` — it competes with whatever else the prompt is asking for.

## A cutout has a pink halo around its edges

Chroma keying a flat single-colour shape always fringes: the anti-aliased edge pixels are a
blend of shape and backdrop, so despilling cannot fully recover them. Use the luminance
matte instead:

```bash
node scripts/matte-ink.mjs <asset-name>.png "#0F172A"
```

This only works for shapes with one fill colour. Photographic cutouts are fine with
`matte.mjs` — their edges have real detail to despill against.

## Whisper download times out partway

`transcribe.mjs` uses `small.en` (~466MB). On a slow connection the fetch can abort with
`UND_ERR_BODY_TIMEOUT`. Delete the partial model and retry:

```bash
rm -f whisper.cpp/ggml-*.bin && node scripts/transcribe.mjs
```

`base.en` (~142MB) is a fallback if the connection keeps dropping — timings stay good enough
to cut to, though word boundaries get slightly looser.

## Captions read `burn` `out` or `Sc` `ribe` as separate pills

Whisper emits sub-word tokens. `buildPages` merges any token that did not arrive with a
leading space onto the previous word — if you see broken words, the caption data is being
rendered without going through `buildPages`.

## Captions spell the product name wrong

Whisper transcribes phonetically. Add the mishearing to
`brand.json → captions.misheardBrandTerms`, for example `{"waves": "Waivs"}`. It is applied
at render time, so no re-transcription is needed.

## Text is hidden behind a caption pill

Scene content is below y=1620. Anything anchored with `bottom:` needs at least `240px`. See
the caption safe zone section of the playbook.

## A strike-through only crosses the first line of a headline

The headline wrapped. Marks span one segment on one line by design. Either shrink the font
(not below ~80px, where it stops reading as a headline on a phone) or split the line into two
`Headline` components. The width arithmetic is in the playbook.

## Adding a line to a header pushed something else out of place

The header block grew and now overlaps whatever sits below it. Absolutely-positioned siblings
do not reflow around each other. Re-render the stills for that scene after any change to a
header stack.

## Animation plays in Studio but not in the render

CSS `transition` or `animation` somewhere, or a Tailwind animation class. Remotion renders
frame by frame with no wall clock, so those never appear in output. Drive it from
`useCurrentFrame()` instead.

## A frame flickers between renders

`Math.random()` somewhere. Use Remotion's `random(seed)` so every render of a frame is
identical.

## The video looks fine in Studio but wrong in the mp4

They can genuinely differ. Always check the delivered file:

```bash
node scripts/contact-sheet.mjs --video out/reel.mp4 /tmp/final.png
```

## Render is very slow

Drop `--concurrency` if the machine is swapping; raise it if cores are idle. `--crf=20` is a
good default — `18` is visually identical for this content and roughly 15% larger. Vertical
reels at 69s land around 28–32MB at crf 20, which is under most upload limits.

## The drawn direction

**Two reels came out looking alike.** The history that holds recent picks out of the pool
lives at `~/.reel-studio/history.json` (or `$REEL_STUDIO_HOME/history.json`). If it was
cleared, or the reels were made on different machines, the draws are independent and can
collide. Force one with `--art <id>`, or just `--redraw` until it is different.

**`direction.json` is missing.** `brief.mjs` writes it. A project scaffolded before the
variation system existed will not have one — run
`node scripts/direction.mjs --project .` inside the folder to draw one, then fill in
`src/look.ts` from it. Without it, `generate-assets.mjs` falls back to a neutral documentary
direction rather than failing, so art still generates; it just will not belong to a look.

**The reel does not look like its art direction.** Almost always `src/look.ts` was never
filled in, so every scene is still rendering the default `paperCollage` backdrop. Check that
`BACKDROP`, `CAMERA` and `SCENE_TYPE_ANIM` match `direction.json` and the plan, and that
every scene actually renders `<Backdrop variant={BACKDROP} />`.

**Every headline animates the same way.** `SCENE_TYPE_ANIM` has the same value for adjacent
scenes, or the scenes are not passing `anim` to `Headline` at all. This is the most visible
failure in the whole system and it is invisible in a still — scrub two adjacent scenes in
Remotion Studio rather than trusting frames.

## Assets

**The manifest came back with four assets.** `brief.mjs` makes a second call to top it up to
twelve and prints when it does. If the top-up also failed, the message says so — rerun the
brief, or add entries to `plan.json` by hand and run
`node scripts/generate-assets.mjs --missing`.

**Generation is rate-limited part way through a manifest.** It runs three at a time and
retries once, then prints the names that failed with the command to rerun them. Run that;
already-generated assets are left alone.

**A texture or environment plate came out with a transparent hole in it.** Its `kind` in the
manifest is `cutout` or `prop`, so it was chroma-keyed. Fix the `kind` to `texture` or
`environment`, regenerate, and re-matte.

**A flat shape has a magenta fringe.** Its `kind` is not `symbol`. Fix the manifest rather
than running `matte-ink.mjs` by hand, or the next regeneration repeats it.

## Rendering

**A render that takes far longer than two to four minutes.** Check the machine before
anything else:

```bash
sysctl vm.swapusage
```

`used` close to `total` means it is out of memory and swapping, and a swapping render is
disk-bound rather than merely slow — this is the difference between two minutes and thirty.
Closing a browser is worth more than any flag. `render.mjs` already backs concurrency off when
it sees swap pressure, but it cannot free memory that something else is holding.

**`render.mjs` stopped itself.** It has two limits, because there are two failures. No output
at all for 8 minutes means hung (`--stall-minutes`). Still going after 25 minutes means
thrashing (`--max-minutes`). Both print the ladder to work through. Raising the ceiling and
rerunning is the last resort, not the first — fix the memory instead.

**It says "bundling" for two minutes on a new project.** Normal, once per project. Later
renders and every still reuse the cached bundle and take seconds. Deleting
`node_modules/.cache` forces it to happen again.

**Hardware-accelerated encoding warnings.** Remotion refuses hardware acceleration whenever
`--crf` is set, so `render.mjs` does not ask for it. Encoding is about a tenth of the wall
time here, so anchoring quality to crf is the better trade. Nothing is wrong.

**The mp4 is under 100KB.** `render.mjs` treats that as a failure and says so — Remotion
reported success but wrote nothing usable, which normally means the composition resolved to
zero frames. Check `TOTAL` in `src/timing.ts`.

**Renders got slower after adding scenes.** Full-frame CSS `filter: blur()` is the most
expensive thing in the kit, and several transitions use it. A reel with a blur running under
every scene, rather than only across the cuts, will be noticeably slower to render.
