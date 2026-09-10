"""
Alpha for flat single-colour shapes — ink blots, silhouettes, solid graphics.

Chroma-keying these leaves a magenta halo on every anti-aliased edge pixel,
because the edge is a blend of shape and backdrop. Rebuilding alpha from
darkness and forcing the fill colour cannot fringe at all.

Usage:
  python3 scripts/matte-ink.py ink-splatter.png            # defaults to brand slate
  python3 scripts/matte-ink.py logo-shape.png "#2C6BAC"
"""
import json
import os
import sys

import numpy as np
from PIL import Image

DIR = os.path.join(os.getcwd(), "public", "art")


def brand_slate():
    for candidate in ("src/brand.json", "brand.config.json"):
        try:
            with open(candidate, encoding="utf-8") as fh:
                return json.load(fh)["colors"]["slate"]
        except (OSError, ValueError, KeyError):
            continue
    return "#0F172A"


def to_rgb(hex_colour):
    h = hex_colour.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


name = sys.argv[1] if len(sys.argv) > 1 else "ink-splatter.png"
fill = to_rgb(sys.argv[2] if len(sys.argv) > 2 else brand_slate())

src = os.path.join(DIR, name)
a = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)

# The magenta backdrop is bright; the shape is dark. Alpha is how far below the
# backdrop's luminance each pixel sits.
alpha = np.clip((165.0 - a.mean(axis=2)) / 55.0, 0.0, 1.0)

rgba = np.zeros((*alpha.shape, 4), dtype=np.uint8)
rgba[..., 0], rgba[..., 1], rgba[..., 2] = fill
rgba[..., 3] = (alpha * 255).astype(np.uint8)

img = Image.fromarray(rgba, "RGBA")
img = img.crop(img.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox())
img.save(src)

print(f"{name}  {img.width}x{img.height}  {(np.asarray(img)[..., 3] > 10).mean() * 100:.0f}% opaque")
