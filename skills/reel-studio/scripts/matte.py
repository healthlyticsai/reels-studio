"""
Keys the magenta chroma backdrop out of the generated art, writes real alpha, and
trims the transparent margin so each cutout sits tight in its box.

Gemini returns JPEG with no alpha channel, so generate-assets.mjs renders every
subject against a flat #FF00FF backdrop and we remove it here. Assets marked
`kind: texture` in plan.json are meant to stay opaque and are skipped.

Usage:
  python3 scripts/matte.py                  # everything except textures
  python3 scripts/matte.py doctor-desk.png  # just these
"""
import json
import os
import sys

import numpy as np
from PIL import Image

DIR = os.path.join(os.getcwd(), "public", "art")
PAD = 4

# Kit art that ships already prepared. The alpha check below catches the cutouts;
# opaque textures need naming, since there is no alpha to detect.
KIT_ART = {"paper-grain.png"}


def opaque_assets():
    """Textures are backgrounds, not cutouts — keying them would eat the image."""
    try:
        with open("plan.json", encoding="utf-8") as fh:
            plan = json.load(fh)
    except (OSError, ValueError):
        return KIT_ART
    return KIT_ART | {
        f"{a['name']}.png" for a in plan.get("assetManifest", []) if a.get("kind") == "texture"
    }


def matte(name):
    src = Image.open(os.path.join(DIR, name))
    # Already keyed (a re-run, or bundled kit art). Matting again would read the
    # composite as opaque and destroy the alpha, so leave it alone.
    if src.mode == "RGBA" and src.getchannel("A").getextrema()[0] < 250:
        return f"{name}  already has alpha, skipped"

    im = src.convert("RGB")
    a = np.asarray(im).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]

    max_rb = np.maximum(r, b)
    # Magenta backdrop: red and blue both high, green clearly suppressed.
    key = (max_rb > 90) & (g < max_rb * 0.62) & (np.abs(r - b) < max_rb * 0.55)

    # Soft edge: how far into "magenta-ness" this pixel sits.
    spill = (r + b) / 2.0 - g
    alpha = np.where(key, 0.0, np.clip(1.0 - (spill - 26.0) / 90.0, 0.0, 1.0))

    # Despill: pull magenta fringing off the anti-aliased cut edge.
    fix = np.clip(spill - 26.0, 0, 70)
    out = a.astype(np.float32)
    out[..., 0] = np.clip(out[..., 0] - fix, 0, 255)
    out[..., 2] = np.clip(out[..., 2] - fix, 0, 255)

    img = Image.fromarray(np.dstack([out, alpha * 255.0]).astype(np.uint8), "RGBA")

    bbox = img.getchannel("A").point(lambda v: 255 if v > 12 else 0).getbbox()
    if bbox is None:
        raise ValueError("keyed out entirely — the model probably ignored the magenta backdrop")
    img = img.crop(
        (
            max(0, bbox[0] - PAD),
            max(0, bbox[1] - PAD),
            min(img.width, bbox[2] + PAD),
            min(img.height, bbox[3] + PAD),
        )
    )
    img.save(os.path.join(DIR, name))

    opaque = (np.asarray(img)[..., 3] > 12).mean() * 100
    warn = "  <- suspiciously opaque, check the backdrop came out magenta" if opaque > 95 else ""
    return f"{name}  {img.width}x{img.height}  {opaque:.0f}% opaque{warn}"


skip = opaque_assets()
names = sys.argv[1:] or sorted(
    f for f in os.listdir(DIR) if f.endswith(".png") and f not in skip
)

for n in names:
    try:
        print("OK ", matte(n))
    except Exception as exc:  # noqa: BLE001
        print("ERR", n, exc)
