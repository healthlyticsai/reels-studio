#!/usr/bin/env bash
#
# Creates a fresh reel project in ./<slug>/ — Remotion scaffold, component kit,
# brand config, brand logos and the per-project scripts. Never touches an
# existing folder; reels are cheap and cross-contaminated projects are not.
#
# Demo mode is the one exception: the Studio UI writes the person's intake
# (intake.json, the avatar, the screenshots) into ./<slug>/ first, and this
# scaffolds around it without overwriting any of those files.
#
# Usage: new-project.sh <slug> [--brand /path/to/brand.config.json] [--mode reel|demo]

set -euo pipefail

SLUG="${1:-}"
if [ -z "$SLUG" ]; then
  echo "Usage: new-project.sh <slug> [--brand path/to/brand.config.json] [--mode reel|demo]" >&2
  exit 1
fi
shift

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRAND="$SKILL_DIR/assets/brand/brand.config.json"
MODE="reel"
while [ $# -gt 0 ]; do
  case "$1" in
    --brand) BRAND="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [ "$MODE" != "reel" ] && [ "$MODE" != "demo" ]; then
  echo "--mode must be reel or demo" >&2
  exit 1
fi

INTAKE_ONLY=0
if [ -e "$SLUG" ]; then
  if [ "$MODE" = "demo" ] && [ -f "$SLUG/intake.json" ] && [ ! -f "$SLUG/package.json" ]; then
    INTAKE_ONLY=1
  else
    echo "Refusing to overwrite existing path: ./$SLUG" >&2
    echo "Pick a different slug, or delete it first if it is a scrapped attempt." >&2
    exit 1
  fi
fi

echo "Scaffolding Remotion project in ./$SLUG"
if [ "$INTAKE_ONLY" = 1 ]; then
  # create-video will not write into a non-empty folder, so scaffold beside it
  # and merge — never clobbering what the person uploaded.
  TMP="$(mktemp -d)"
  (cd "$TMP" && npx --yes create-video@latest --yes --blank --no-tailwind "$SLUG" >/dev/null)
  cp -Rn "$TMP/$SLUG/." "$SLUG/"
  rm -rf "$TMP"
else
  npx --yes create-video@latest --yes --blank --no-tailwind "$SLUG" >/dev/null
fi

cd "$SLUG"
rm -f src/Composition.tsx

mkdir -p assets/audio public/art public/sfx public/logo scripts references src/components src/scenes out

cp -R "$SKILL_DIR/assets/template/src/." src/
cp "$BRAND" brand.config.json
cp "$BRAND" src/brand.json
cp -R "$SKILL_DIR/assets/logo/." public/logo/ 2>/dev/null || true
cp -R "$SKILL_DIR/assets/sfx/." public/sfx/ 2>/dev/null || true
# Transition furniture (torn paper, ink blot, paper grain) is kit, not topic art —
# it is already matted and every project needs it, so it ships rather than being
# regenerated per reel.
cp -R "$SKILL_DIR/assets/art/." public/art/ 2>/dev/null || true

# Per-project copies so the project stays runnable after the skill is uninstalled — and so a
# restyle later can redraw the direction from inside the folder. direction.mjs resolves the
# catalog relative to its own parent, which is why creative-systems.json comes along.
for f in generate-assets.mjs matte.mjs matte-ink.mjs transcribe.mjs contact-sheet.mjs \
         check-audio.mjs storyboard.mjs direction.mjs research.mjs gemini.mjs \
         render.mjs env.mjs; do
  cp "$SKILL_DIR/scripts/$f" scripts/
done
cp "$SKILL_DIR/references/creative-systems.json" references/
# Lets the copied scripts find the plugin's .env (see env.mjs).
echo "$SKILL_DIR" > scripts/skill-dir.txt

if [ "$MODE" = "demo" ]; then
  # The demo template layers over the reel kit: same typography, backdrops and
  # transitions, plus the screenshot, phone and avatar components and a
  # data-driven timeline. The reel-only files would only confuse the build.
  cp -R "$SKILL_DIR/assets/template-demo/src/." src/
  rm -f src/Reel.tsx src/timing.ts src/Sfx.tsx src/scenes/SceneProblem.tsx src/scenes/SceneCta.tsx
  mkdir -p public/avatar public/screens assets/avatar/slices assets/avatar/raw
  for f in tts.mjs tts-providers.mjs omni-presenter.mjs widen-avatar.mjs trim-take.mjs demo-timing.mjs avatar-slices.mjs avatar-normalize.mjs image-size.mjs; do
    cp "$SKILL_DIR/scripts/$f" scripts/
  done
fi

cat > .gitignore <<'GI'
node_modules/
whisper.cpp/
out/
.env
scripts/vo16k.wav
.DS_Store
GI

# No Tailwind: the component kit is inline styles throughout and used exactly zero
# utility classes, so the framework was only ever contributing its Preflight reset
# — which src/index.css now carries explicitly. Removing the bundler override also
# lets Remotion use its default bundler, which the override used to break.
cat > remotion.config.ts <<'CFG'
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
CFG

# Pin the extra packages now so phase 3 is a single `npm install`, and so the
# versions always match the Remotion core the scaffold pulled in.
node -e "
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const core = p.dependencies.remotion;
const demo = '$MODE' === 'demo';
p.name = '$SLUG';
p.description = (demo ? 'Product demo: ' : 'Promo reel: ') + '$SLUG';
p.dependencies = {
  ...p.dependencies,
  '@remotion/media': core,
  '@remotion/transitions': core,
  '@remotion/google-fonts': core,
  '@remotion/captions': core,
  '@remotion/shapes': core,
  '@remotion/paths': core,
  '@remotion/install-whisper-cpp': core,
  // Pure-JS image processing for the chroma-key matte and contact sheets, so
  // the pipeline needs nothing beyond Node.
  jimp: '1.6.1',
};
// Tailwind came in with the scaffold and is unused — see remotion.config.ts.
delete p.dependencies['@remotion/tailwind-v4'];
delete p.dependencies['@remotion/tailwind'];
delete p.dependencies.tailwindcss;
p.scripts = {
  ...p.scripts,
  transcribe: 'node scripts/transcribe.mjs',
  art: 'node scripts/generate-assets.mjs && node scripts/matte.mjs',
  // render.mjs sizes concurrency to the machine and will not sit there silently
  // for half an hour; see its header for why a fixed --concurrency was wrong.
  render: demo ? 'node scripts/render.mjs --all' : 'node scripts/render.mjs',
  draft: demo ? 'node scripts/render.mjs --all --draft' : 'node scripts/render.mjs --draft',
  ...(demo
    ? {
        tts: 'node scripts/tts.mjs',
        timing: 'node scripts/demo-timing.mjs',
        'avatar:slices': 'node scripts/avatar-slices.mjs',
        'avatar:normalize': 'node scripts/avatar-normalize.mjs',
      }
    : {}),
};
fs.writeFileSync('package.json', JSON.stringify(p, null, 2));
"

echo
echo "Created ./$SLUG ($MODE)"
if [ "$MODE" = "demo" ]; then
  echo "  intake.json      <- the story, screenshots and presenter from the Studio UI"
  echo "  public/screens/  <- the real product screenshots"
  echo "  public/avatar/   <- the avatar still, then the lip-synced clips"
  echo "  src/demoTimeline.ts <- the timeline (written by scripts/demo-timing.mjs)"
  echo
  echo "npm install has NOT run yet — that happens in the build, after approval."
  exit 0
fi
echo "  assets/audio/   <- voiceover and music go here"
echo "  direction.json  <- the look drawn for this reel (written by brief.mjs)"
echo "  src/look.ts     <- copy the backdrop, camera and type anims here before building"
echo "  src/components/ <- the component kit (already written, compose from it)"
echo "  src/scenes/     <- write one file per scene here"
echo
echo "Render with 'npm run render' (or 'npm run draft' while iterating)."
echo
echo "npm install has NOT run yet — that happens in phase 3, after the audio arrives."
