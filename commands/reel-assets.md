---
description: Generate or regenerate the reel's photo cutouts and textures, then key and inspect them
argument-hint: "[asset names] [--ref existing-asset.png] [or: what is wrong with the current one]"
---

Generate the reel's artwork using the `reel-studio` skill.

**The user's request:**

$ARGUMENTS

**Do this**

1. `cd` into the reel folder. With none given, use the most recent one with a `plan.json`.
2. Generate. With no names, the whole manifest; with names, just those:
   ```bash
   node scripts/generate-assets.mjs [name ...]
   ```
3. Key out the chroma backdrop:
   ```bash
   node scripts/matte.mjs [name.png ...]
   ```
   Flat single-colour shapes — ink blots, silhouettes, solid graphics — fringe magenta when
   chroma-keyed. Those use `node scripts/matte-ink.mjs <name>.png "#0F172A"` instead.
4. Look at what came back:
   ```bash
   node scripts/contact-sheet.mjs public/art /tmp/contact.png
   ```
   **Read that PNG.** It composites over hot pink so a failed key is unmissable.

**Reading the result**

- **Near-100% opaque** means the model ignored the magenta backdrop and used a grey studio
  one — there was nothing to key. Regenerate that asset. If it happens twice, make the
  backdrop instruction more emphatic in that asset's `prompt` in `plan.json`; it is competing
  with everything else the prompt is asking for.
- **A magenta halo** on a flat shape means it needs `matte-ink.mjs`.
- **A grey checkerboard baked into the image** means the prompt lost its chroma-key direction
  and the model painted a picture *of* transparency. Regenerate.

`matte.mjs` is idempotent — running it again on already-keyed art skips rather than
flattening it, so a re-run is always safe.

**Keeping a person consistent**

If the reel shows the same person in two states — tired then relieved, before then after —
they must be recognisably the same person or the callback does not land. Pass the first asset
as a reference:

```bash
node scripts/generate-assets.mjs payoff-shot --ref opening-shot.png
```

A manifest entry with `referenceOf` set does this automatically.

**Then** re-render any still that uses a changed asset and look at it in place — an asset that
reads well on a contact sheet can still sit wrong in the composition.
