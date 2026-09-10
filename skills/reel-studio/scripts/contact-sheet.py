"""
Builds a contact sheet so generated art and rendered video can actually be looked at.

Bad mattes and layout collisions are invisible in code and obvious in a picture.
Art is composited over hot pink so a failed key is unmissable.

Usage:
  python3 scripts/contact-sheet.py public/art /tmp/contact.png
  python3 scripts/contact-sheet.py --video out/reel.mp4 /tmp/final.png [--every 4]
"""
import os
import subprocess
import sys
import tempfile

from PIL import Image

PINK = (255, 80, 180, 255)
THUMB = 300


def grid(images, out, cols=None):
    if not images:
        raise SystemExit("nothing to put in the sheet")
    cols = cols or min(5, len(images))
    rows = (len(images) + cols - 1) // cols
    w = max(i.width for i in images)
    h = max(i.height for i in images)
    sheet = Image.new("RGB", (w * cols, h * rows), (255, 255, 255))
    for i, im in enumerate(images):
        sheet.paste(im, (w * (i % cols), h * (i // cols)))
    sheet.save(out)
    print(f"{out}  {sheet.size[0]}x{sheet.size[1]}  ({len(images)} frames)")


def from_art(folder, out):
    images = []
    for name in sorted(f for f in os.listdir(folder) if f.lower().endswith((".png", ".jpg"))):
        im = Image.open(os.path.join(folder, name)).convert("RGBA")
        bg = Image.new("RGBA", im.size, PINK)
        bg.alpha_composite(im)
        scale = THUMB / im.width
        images.append(bg.convert("RGB").resize((THUMB, max(1, int(im.height * scale)))))
    grid(images, out)


def from_video(video, out, every):
    duration = float(
        subprocess.run(
            ["npx", "remotion", "ffprobe", "-v", "error", "-show_entries",
             "format=duration", "-of", "csv=p=0", video],
            capture_output=True, text=True, check=True,
        ).stdout.strip().split("\n")[-1]
    )
    with tempfile.TemporaryDirectory() as tmp:
        images = []
        for t in range(1, int(duration), every):
            frame = os.path.join(tmp, f"{t}.png")
            subprocess.run(
                ["npx", "remotion", "ffmpeg", "-ss", str(t), "-i", video,
                 "-frames:v", "1", "-vf", f"scale={THUMB}:-1", frame, "-y"],
                capture_output=True, check=False,
            )
            if os.path.exists(frame):
                images.append(Image.open(frame).convert("RGB"))
        grid(images, out)


args = sys.argv[1:]
if not args:
    raise SystemExit(__doc__)

if args[0] == "--video":
    every = int(args[args.index("--every") + 1]) if "--every" in args else 4
    from_video(args[1], args[2], every)
else:
    from_art(args[0], args[1])
