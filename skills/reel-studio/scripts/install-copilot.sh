#!/usr/bin/env bash
#
# Installs Reel Studio for GitHub Copilot.
#
# Copilot has no plugin marketplace, but it does read the same open Agent Skills
# format Claude Code uses — so the skill itself needs no translation. What does
# need translating is the six slash commands: Claude Code reads them from
# commands/*.md, Copilot only knows about skills. This writes each one out as a
# sibling skill so /reel, /reel-build and the rest work the same in both hosts.
#
# Usage:
#   bash scripts/install-copilot.sh                 # ~/.copilot/skills, symlinked
#   bash scripts/install-copilot.sh --copy          # copy instead of symlink
#   bash scripts/install-copilot.sh --target ~/.agents/skills
#   bash scripts/install-copilot.sh --uninstall

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_ROOT="$(cd "$SKILL_DIR/../.." && pwd)"
TARGET="$HOME/.copilot/skills"
MODE="link"
ACTION="install"

while [ $# -gt 0 ]; do
  case "$1" in
    --copy) MODE="copy"; shift ;;
    --link) MODE="link"; shift ;;
    --target) TARGET="${2/#\~/$HOME}"; shift 2 ;;
    --uninstall) ACTION="uninstall"; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

COMMANDS=(reel reel-build reel-assets reel-check reel-render reel-revise)

if [ "$ACTION" = "uninstall" ]; then
  for name in reel-studio "${COMMANDS[@]}"; do
    if [ -e "$TARGET/$name" ] || [ -L "$TARGET/$name" ]; then
      rm -rf "$TARGET/$name"
      echo "removed  $TARGET/$name"
    fi
  done
  echo
  echo "Uninstalled. Restart Copilot to drop them from the slash-command list."
  exit 0
fi

mkdir -p "$TARGET"

# ── The skill itself ─────────────────────────────────────────────────────────
# Symlinked by default so `git pull` in the clone updates the installed skill
# with no re-install step. --copy is there for anyone who would rather the
# install survive the clone being moved or deleted.
rm -rf "$TARGET/reel-studio"
if [ "$MODE" = "link" ]; then
  ln -s "$SKILL_DIR" "$TARGET/reel-studio"
  echo "linked   $TARGET/reel-studio -> $SKILL_DIR"
else
  cp -R "$SKILL_DIR" "$TARGET/reel-studio"
  echo "copied   $TARGET/reel-studio"
fi

# ── The commands, rewritten as skills ────────────────────────────────────────
# A Copilot skill needs a `name` matching its folder, and it has no $ARGUMENTS
# substitution — whatever the user types after the slash command is simply in
# the conversation already.
for name in "${COMMANDS[@]}"; do
  src="$PLUGIN_ROOT/commands/$name.md"
  [ -f "$src" ] || { echo "skipped  $name (no commands/$name.md)"; continue; }

  dest="$TARGET/$name"
  rm -rf "$dest"
  mkdir -p "$dest"

  RESOLVED="$TARGET/reel-studio" SRC="$src" NAME="$name" python3 - > "$dest/SKILL.md" <<'PY'
import os, re

src = open(os.environ["SRC"], encoding="utf-8").read()
name = os.environ["NAME"]
resolved = os.environ["RESOLVED"]

_, fm, body = src.split("---", 2)
keys = dict(re.findall(r"^([a-z-]+):\s*(.+)$", fm, re.M))

# Claude Code substitutes $ARGUMENTS; Copilot does not, because the text the
# user typed after the slash command is already part of the conversation.
body = body.replace(
    "**The user's request:**\n\n$ARGUMENTS",
    "**The user's request** is whatever they typed after the slash command in this\n"
    "conversation. If they typed nothing beyond the command, ask for it before starting.",
)
body = body.replace("$ARGUMENTS", "(the request the user typed after the slash command)")

# Point at the installed skill rather than a Claude plugin root.
body = body.replace('SKILL_DIR="${CLAUDE_PLUGIN_ROOT}/skills/reel-studio"', f'SKILL_DIR="{resolved}"')
body = re.sub(r"`reel-studio` skill", f"`reel-studio` skill (at `{resolved}`)", body, count=1)

print("---")
print(f"name: {name}")
print(f"description: {keys.get('description', '').strip()}")
if "argument-hint" in keys:
    print(f"argument-hint: {keys['argument-hint'].strip()}")
print("user-invocable: true")
print("---")
print(body.lstrip("\n"), end="")
PY
  echo "wrote    $dest/SKILL.md"
done

echo
echo "Installed into $TARGET"
echo "  /reel  /reel-build  /reel-assets  /reel-check  /reel-render  /reel-revise"
echo
echo "Restart Copilot, then type / in the chat box to see them."
