#!/usr/bin/env bash
set -euo pipefail

# Copy the Harness Framework into an Application repository.
# Usage: ./init-harness-agent.sh [DEST]
#   DEST  Target directory (default: current working directory)

HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="${1:-.}"

for item in .claude .gitignore CLAUDE.md docs LEARNING.md logs README-HARNESS.md; do
  cp -r "$HARNESS_DIR/$item" "$DEST/"
done

echo "Harness Framework installed into $(cd "$DEST" && pwd)"
