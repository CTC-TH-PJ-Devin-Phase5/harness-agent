#!/usr/bin/env bash
# Launch Phase 4 execute against a local Ollama model via Claude Code CLI.
# Usage: harness/scripts/run-execute.sh <path-to-handoff.json>
#
# Reads provider settings from .claude/harness.json (subagents.execute).
# Overrides: HARNESS_EXECUTE_MODEL, HARNESS_EXECUTE_BASE_URL
set -euo pipefail

usage() {
  echo "Usage: $0 <path-to-handoff.json>" >&2
  echo "  Handoff shape: { subAgent, task, context: { ticket, specPath, action, ... } }" >&2
  exit 2
}

[[ $# -eq 1 ]] || usage
HANDOFF="$1"

if [[ ! -f "$HANDOFF" ]]; then
  echo "error: handoff file not found: $HANDOFF" >&2
  exit 1
fi

# Resolve repo root (script lives at harness/scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"

HARNESS_JSON="$ROOT/.claude/harness.json"
EXECUTE_MD="$ROOT/.claude/agents/execute.md"

if [[ ! -f "$HARNESS_JSON" ]]; then
  echo "error: missing $HARNESS_JSON" >&2
  exit 1
fi
if [[ ! -f "$EXECUTE_MD" ]]; then
  echo "error: missing $EXECUTE_MD" >&2
  exit 1
fi

PROVIDER="$(jq -r '.subagents.execute.provider // "claude"' "$HARNESS_JSON")"
if [[ "$PROVIDER" != "ollama" ]]; then
  echo "error: subagents.execute.provider is \"$PROVIDER\" (expected \"ollama\")." >&2
  echo "  Set it in .claude/harness.json, or use the Agent tool when provider is \"claude\"." >&2
  exit 1
fi

MODEL="${HARNESS_EXECUTE_MODEL:-$(jq -r '.subagents.execute.model // "qwen3-coder"' "$HARNESS_JSON")}"
BASE_URL="${HARNESS_EXECUTE_BASE_URL:-$(jq -r '.subagents.execute.baseUrl // "http://localhost:11434"' "$HARNESS_JSON")}"

if ! command -v claude >/dev/null 2>&1; then
  echo "error: claude CLI not found on PATH." >&2
  exit 1
fi

# Preflight: Ollama reachable
if ! curl -sf --max-time 3 "${BASE_URL%/}/api/tags" >/dev/null 2>&1; then
  echo "error: cannot reach Ollama at $BASE_URL" >&2
  echo "  Fix: start the daemon (e.g. \`ollama serve\`) and retry." >&2
  exit 1
fi

# Preflight: model present (name or name:tag prefix match)
if ! curl -sf --max-time 5 "${BASE_URL%/}/api/tags" \
  | jq -e --arg m "$MODEL" '
      .models // []
      | map(.name // empty)
      | any(. == $m or startswith($m + ":") or (. | split(":")[0] == $m))
    ' >/dev/null 2>&1; then
  echo "error: model \"$MODEL\" not found in Ollama at $BASE_URL" >&2
  echo "  Fix: \`ollama pull $MODEL\` (coding models need ~64k context for tool use)." >&2
  exit 1
fi

TASK="$(jq -r '.task // empty' "$HANDOFF")"
ACTION="$(jq -r '.context.action // "implement"' "$HANDOFF")"
TICKET="$(jq -r '.context.ticket // empty' "$HANDOFF")"
SPEC_PATH="$(jq -r '.context.specPath // empty' "$HANDOFF")"
COMMIT_SUMMARY="$(jq -r '.context.commitSummary // empty' "$HANDOFF")"

if [[ -z "$TASK" ]]; then
  echo "error: handoff missing non-empty \"task\" field: $HANDOFF" >&2
  exit 1
fi

PROMPT_FILE="$(mktemp -t harness-execute-prompt.XXXXXX)"
trap 'rm -f "$PROMPT_FILE"' EXIT

{
  cat <<EOF
You are the harness \`execute\` sub-agent, running in a headless Claude Code
session aimed at a local Ollama model. Follow the role file exactly.

First: Read \`.claude/agents/execute.md\` in full, then follow it for this
dispatch. Do not skip the skill/rule Reads that file requires for this action.

## Dispatch context (from orchestrator handoff)

- action: ${ACTION}
- ticket: ${TICKET}
- specPath: ${SPEC_PATH}
EOF
  if [[ -n "$COMMIT_SUMMARY" ]]; then
    echo "- commitSummary: ${COMMIT_SUMMARY}"
  fi
  cat <<EOF

## Task (self-contained)

${TASK}

## Return

When finished, print a clear summary for the orchestrator: diff overview,
\`pnpm test:unit\` command and pass/fail counts (implement), or the commit
hash (commit). Do not check Acceptance Criteria or mark Status done.
EOF
} >"$PROMPT_FILE"

echo "harness/scripts/run-execute.sh: provider=ollama model=$MODEL baseUrl=$BASE_URL action=$ACTION" >&2
echo "  handoff: $HANDOFF" >&2

# Fresh env for the child so the orchestrator's Anthropic credentials do not
# override Ollama. Permission prompts still apply inside that process.
env -u ANTHROPIC_API_KEY \
  ANTHROPIC_BASE_URL="$BASE_URL" \
  ANTHROPIC_AUTH_TOKEN=ollama \
  ANTHROPIC_API_KEY="" \
  claude -p "$(cat "$PROMPT_FILE")" --model "$MODEL"
