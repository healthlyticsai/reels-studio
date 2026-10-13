#!/usr/bin/env bash
#
# Demo Studio: every command in the pipeline, one step at a time.
#
#   bash command.sh                  # list the steps
#   bash command.sh <step> [demo]    # run one step for a demo folder (default: waivs-30s)
#
# Examples:
#   bash command.sh studio
#   bash command.sh brief waivs-30s
#   bash command.sh film waivs-30s
#
# Steps marked $$ call a paid API. Nothing runs unless you name a step, so running
# this file on its own is always safe.

set -euo pipefail

REPO="$HOME/Healthlytics/reels-studio"
SKILL="$REPO/skills/reel-studio"
DEMOS="${DEMO_STUDIO_ROOT:-$HOME/Healthlytics/demos}"
DEMO="${2:-waivs-30s}"
PROJECT="$DEMOS/$DEMO"

in_project() {
  if [ ! -d "$PROJECT" ]; then
    echo "No demo folder at $PROJECT" >&2
    exit 1
  fi
  cd "$PROJECT"
}

step="${1:-help}"

case "$step" in

  # ── 0. One-time setup ──────────────────────────────────────────────────────
  # Keys live in ~/.reel-studio/.env (every demo folder reads it) or the repo's .env:
  #   GEMINI_API_KEY=...         plan, research, Omni presenter, image widening
  #   GCP_PROJECT_ID=...         billing project for Google Chirp voices (with gcloud login)
  #   ELEVENLABS_API_KEY=...     only for ElevenLabs voices
  #   ELEVENLABS_VOICE_ID=...
  #   HF_CREDENTIALS=id:secret   only for the Higgsfield API
  setup)
    cd "$REPO" && npm install
    gcloud auth application-default login   # for Google Chirp voices without an API key
    ;;

  check-keys)
    in_project
    node "$SKILL/scripts/check-env.mjs" --mode demo --engine omni
    ;;

  # ── 1. The Studio (intake form + review page) ─────────────────────────────
  # Open http://localhost:4400 — your demo is at http://localhost:4400/#/p/<demo>
  studio)
    cd "$REPO" && node studio/server.mjs
    ;;

  # ── 2. Scaffold the Remotion project around a Studio intake ───────────────
  scaffold)
    cd "$DEMOS" && bash "$SKILL/scripts/new-project.sh" "$DEMO" --mode demo
    cd "$PROJECT" && npm install
    ;;

  # ── 3. Stage the storyboard with Gemini ($$, small) ────────────────────────
  # Then check the boxes and approve in the Studio.
  brief)
    in_project
    node "$SKILL/scripts/demo-brief.mjs" --project .
    ;;

  storyboard)
    in_project
    node "$SKILL/scripts/storyboard.mjs" .
    ;;

  # ── 4. Widen the avatar photo to a 16:9 waist-up frame ($$, one image) ─────
  widen-avatar)
    in_project
    node scripts/widen-avatar.mjs
    ;;

  # ── 5. Film the presenter with Gemini Omni ─────────────────────────────────
  film-dry-run)          # free: shows the segments and prompts
    in_project
    node scripts/omni-presenter.mjs --dry-run --resolution 4k
    ;;

  film-draft)            # $$ cheap 360p take, to check timing
    in_project
    node scripts/omni-presenter.mjs --force --resolution 360p
    ;;

  film)                  # $$ the real 4K take (~15 min)
    in_project
    node scripts/omni-presenter.mjs --force --resolution 4k
    ;;

  film-from)             # $$ keep earlier segments, re-film from N: bash command.sh film-from <demo> 3
    in_project
    node scripts/omni-presenter.mjs --force --resolution 4k --from-segment "${3:?segment number}"
    ;;

  # ── 5b. Or voice with Chirp / ElevenLabs instead (Higgsfield engine) ($$) ──
  voice)
    in_project
    node scripts/tts.mjs --force
    ;;

  # ── 6. Check every word of the take ────────────────────────────────────────
  check-words)
    in_project
    npx remotion ffmpeg -y -v error -i assets/audio/vo.mp3 -ar 16000 -ac 1 /tmp/vo.wav
    ./whisper.cpp/main -m whisper.cpp/ggml-small.en.bin -f /tmp/vo.wav -ml 1 -sow -np
    rm -f /tmp/vo.wav
    ;;

  # ── 7. Cut stumbles out of the take (picture and voice together) ──────────
  # Seconds in the original take, from check-words:
  #   bash command.sh trim <demo> 5.56-5.97 17.58-17.96
  trim)
    in_project
    shift 2
    cuts=()
    for c in "$@"; do cuts+=(--cut "$c"); done
    node scripts/trim-take.mjs "${cuts[@]}"
    ;;

  # ── 8. Shrink the 4K take to 2560×1440 (sharp enough, renders much faster) ─
  resize-take)
    in_project
    src=assets/avatar/raw/omni-take-trimmed.mp4
    [ -f "$src" ] || src=assets/avatar/raw/omni-take.mp4
    npx remotion ffmpeg -y -v error -i "$src" -an -r 30 -vf scale=2560:1440 \
      -c:v libx264 -pix_fmt yuv420p -crf 17 public/avatar/take.mp4
    ;;

  # ── 9. Transcribe and time everything to the words ─────────────────────────
  timing)
    in_project
    node scripts/transcribe.mjs
    node scripts/demo-timing.mjs
    ;;

  # ── 10. Review stills (both formats) ───────────────────────────────────────
  # bash command.sh stills <demo> 80 300 520   → out/stills/
  stills)
    in_project
    shift 2
    frames=("$@")
    [ ${#frames[@]} -gt 0 ] || frames=(40 150 250 350 450 550 650 750 850)
    for f in "${frames[@]}"; do
      npx remotion still Demo-16x9 "out/stills/16x9-f$f.png" --frame="$f" --scale=0.5
      npx remotion still Demo-9x16 "out/stills/9x16-f$f.png" --frame="$f" --scale=0.5
    done
    ;;

  # ── 11. Render ─────────────────────────────────────────────────────────────
  draft)                 # half size, both formats, a few minutes
    in_project
    node scripts/render.mjs --all --draft
    ;;

  render)                # full quality, both formats → out/<demo>-16x9.mp4 and -9x16.mp4
    in_project
    node scripts/render.mjs --all
    ;;

  # ── 12. Check the delivered files ──────────────────────────────────────────
  verify)
    in_project
    for f in out/"$DEMO"-16x9.mp4 out/"$DEMO"-9x16.mp4; do
      echo "$f: $(npx remotion ffprobe -v error -show_entries stream=codec_type,width,height \
        -show_entries format=duration -of csv=p=0 "$f" | tr '\n' ' ')"
      node scripts/contact-sheet.mjs --video "$f" "/tmp/$(basename "$f" .mp4)-sheet.png"
    done
    open out/
    ;;

  # ── Extra: Higgsfield API test ($$, needs API credits) ─────────────────────
  higgsfield-test)
    cd "$REPO" && npx tsx index.ts
    ;;

  help|*)
    cat <<EOF
Usage: bash command.sh <step> [demo]     (demo defaults to waivs-30s)

  setup            one-time: repo packages + gcloud login
  check-keys       confirm the API keys are found
  studio           start the Studio at http://localhost:4400
  scaffold         create the Remotion project around a Studio intake
  brief        \$\$  stage the storyboard with Gemini
  storyboard       print the storyboard again
  widen-avatar \$\$  widen the avatar photo to a 16:9 waist-up frame
  film-dry-run     show Omni's segments and prompts (free)
  film-draft   \$\$  cheap 360p presenter take
  film         \$\$  4K presenter take
  film-from    \$\$  re-film from segment N:  film-from <demo> 3
  voice        \$\$  voiceover with Chirp/ElevenLabs (Higgsfield engine only)
  check-words      transcribe the take word by word
  trim             cut stumbles:  trim <demo> 5.56-5.97 17.58-17.96
  resize-take      shrink the 4K take for rendering
  timing           transcribe + time the demo to the words
  stills           review frames in both formats:  stills <demo> [frames...]
  draft            half-size render of both formats
  render           full render of both formats
  verify           check the finished files and open the folder
  higgsfield-test \$\$ one Seedance clip via the Higgsfield API
EOF
    ;;
esac
