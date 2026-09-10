#!/usr/bin/env bash
#
# Creates a fresh reel project in ./<slug>/ — Remotion scaffold, component kit,
# brand config, brand logos and the per-project scripts. Never touches an
# existing folder; reels are cheap and cross-contaminated projects are not.
#
# Usage: new-project.sh <topic-slug> [--brand /path/to/brand.config.json]

set -euo pipefail

SLUG="${1:-}"
if [ -z "$SLUG" ]; then
  echo "Usage: new-project.sh <topic-slug> [--brand path/to/brand.config.json]" >&2
  exit 1
fi

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRAND="$SKILL_DIR/assets/brand/brand.config.json"
[ "${2:-}" = "--brand" ] && BRAND="$3"

if [ -e "$SLUG" ]; then
  echo "Refusing to overwrite existing path: ./$SLUG" >&2
  echo "Pick a different slug, or delete it first if it is a scrapped attempt." >&2
  exit 1
fi

echo "Scaffolding Remotion project in ./$SLUG"
npx --yes create-video@latest --yes --blank --no-tailwind "$SLUG" >/dev/null

cd "$SLUG"
rm -f src/Composition.tsx

mkdir -p assets/audio public/art public/sfx public/logo scripts src/components src/scenes out

cp -R "$SKILL_DIR/assets/template/src/." src/
cp "$BRAND" brand.config.json
cp "$BRAND" src/brand.json
cp -R "$SKILL_DIR/assets/logo/." public/logo/ 2>/dev/null || true
cp -R "$SKILL_DIR/assets/sfx/." public/sfx/ 2>/dev/null || true
# Transition furniture (torn paper, ink blot, paper grain) is kit, not topic art —
# it is already matted and every project needs it, so it ships rather than being
# regenerated per reel.
cp -R "$SKILL_DIR/assets/art/." public/art/ 2>/dev/null || true

# Per-project copies so the project stays runnable after the skill is uninstalled.
for f in generate-assets.mjs matte.mjs matte-ink.mjs transcribe.mjs contact-sheet.mjs check-audio.mjs env.mjs; do
  cp "$SKILL_DIR/scripts/$f" scripts/
done

cat > .gitignore <<'GI'
node_modules/
whisper.cpp/
out/
.env
scripts/vo16k.wav
.DS_Store
GI

# Rspack does not emit a bundle alongside the Tailwind override in this setup,
# so renders fail with a missing bundle.js. Webpack works.
cat > remotion.config.ts <<'CFG'
import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

// Rspack is intentionally off: with the Tailwind bundler override it reports
// 100% bundling and then emits no bundle.js, so every render fails.
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.overrideBundlerConfig(enableTailwind);
CFG

# Pin the extra packages now so phase 3 is a single `npm install`, and so the
# versions always match the Remotion core the scaffold pulled in.
node -e "
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const core = p.dependencies.remotion;
p.name = '$SLUG';
p.description = 'Promo reel: $SLUG';
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
p.scripts = {
  ...p.scripts,
  transcribe: 'node scripts/transcribe.mjs',
  art: 'node scripts/generate-assets.mjs && node scripts/matte.mjs',
  render: 'remotion render Reel out/$SLUG.mp4 --codec=h264 --crf=20 --concurrency=6',
};
fs.writeFileSync('package.json', JSON.stringify(p, null, 2));
"

echo
echo "Created ./$SLUG"
echo "  assets/audio/   <- voiceover and music go here"
echo "  src/components/ <- the component kit (already written, compose from it)"
echo "  src/scenes/     <- write one file per scene here"
echo
echo "npm install has NOT run yet — that happens in phase 3, after the audio arrives."
