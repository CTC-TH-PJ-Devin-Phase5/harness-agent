#!/usr/bin/env bash
# Pulls the real SKILL.md content this harness depends on from
# https://github.com/mattpocock/skills (MIT licensed) into .agents/skills/.
#
# We do this instead of vendoring the text by hand so the content stays
# byte-for-byte identical to upstream and `--update` can re-sync it later.
#
# Usage:
#   ./scripts/sync-skills.sh          # fetch everything listed below
#   ./scripts/sync-skills.sh --update # same, but overwrite existing files

set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/mattpocock/skills/main"
OUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.agents/skills"
FORCE=false

if [[ "${1:-}" == "--update" ]]; then
  FORCE=true
fi

mkdir -p "$OUT_DIR"

# name -> upstream path (relative to repo root)
declare -A SKILLS=(
  ["grill-with-docs"]="skills/engineering/grill-with-docs/SKILL.md"
  ["grilling"]="skills/engineering/grilling/SKILL.md"
  ["to-spec"]="skills/engineering/to-spec/SKILL.md"
  ["to-tickets"]="skills/engineering/to-tickets/SKILL.md"
  ["implement"]="skills/engineering/implement/SKILL.md"
  ["code-review"]="skills/engineering/code-review/SKILL.md"
  ["wayfinder"]="skills/engineering/wayfinder/SKILL.md"
  ["prototype"]="skills/engineering/prototype/SKILL.md"
  ["research"]="skills/engineering/research/SKILL.md"
  ["improve-codebase-architecture"]="skills/engineering/improve-codebase-architecture/SKILL.md"
  ["diagnosing-bugs"]="skills/engineering/diagnosing-bugs/SKILL.md"
  ["tdd"]="skills/engineering/tdd/SKILL.md"
  ["codebase-design"]="skills/engineering/codebase-design/SKILL.md"
  ["handoff"]="skills/engineering/handoff/SKILL.md"
  ["writing-for-agents"]="skills/engineering/writing-for-agents/SKILL.md"
)

echo "Syncing ${#SKILLS[@]} skills from mattpocock/skills into $OUT_DIR"

fail=0
for name in "${!SKILLS[@]}"; do
  dest="$OUT_DIR/$name/SKILL.md"
  if [[ -f "$dest" && "$FORCE" != "true" ]]; then
    echo "  skip   $name/SKILL.md (exists, use --update to overwrite)"
    continue
  fi

  mkdir -p "$OUT_DIR/$name"
  url="$REPO_RAW/${SKILLS[$name]}"
  if curl -fsSL "$url" -o "$dest.tmp"; then
    mv "$dest.tmp" "$dest"
    echo "  synced $name/SKILL.md"
  else
    echo "  FAILED $name/SKILL.md  <- $url (path may have moved upstream; check https://github.com/mattpocock/skills)"
    rm -f "$dest.tmp"
    fail=1
  fi
done

if [[ "$fail" -ne 0 ]]; then
  echo ""
  echo "Some skills failed to sync. The upstream repo path layout may have"
  echo "changed — browse https://github.com/mattpocock/skills/tree/main/skills"
  echo "and update the paths in this script."
  exit 1
fi

echo "Done. Orchestrator phases Read these files directly; sub-agents get them"
echo "either injected by tools/subagent-adapter/interface.ts (runSubAgent path)"
echo "or Read them themselves per .claude/agents/<name>.md (Agent-tool path)."
