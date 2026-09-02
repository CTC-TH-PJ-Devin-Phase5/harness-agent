# agent-harness-template

A template for running AI-assisted development as a gated, 5-phase pipeline instead of one long-running single-agent session. The Orchestrator (main thread) grills, writes the spec and tickets, reviews, and checks acceptance criteria. Only implementation is delegated to the `execute` sub-agent.

## Why

Single-agent sessions drift: scope creeps, the agent grades its own homework, and context gets saturated with tool output. This harness splits the work into gated phases and hands off artifacts (spec.md, tickets, diffs, handoff logs) instead of full conversation history. `execute` never checks its own Acceptance Criteria.

## Workflow

```
/build "<task description>"
  │
  ▼
Phase 1 — Grill (`grill-with-docs`) — orchestrator ↔ you, no skip/timeout
           grilling + domain-modeling → notes, CONTEXT.md, docs/adr/
  ▼
Phase 2 — Spec (`to-spec`) — orchestrator
           docs/requirements/<slug>/spec.md
  ▼
Phase 3 — Tickets (`to-tickets`) — orchestrator ↔ you (approve the breakdown)
           docs/requirements/<slug>/tickets/<NN>-<slug>.md (one file per ticket)
  ▼
Phase 4 — per ticket, dependency order:
           4a  execute sub-agent, implement dispatch (loop, max 2 attempts)
               handoff log → checkout/create ticket branch →
               implement → unit tests + integration tests (host Bash)
                 pass → stop, uncommitted → return summary + report → 4b
                 fail attempt 1 → fix, loop once
                 fail attempt 2 → STOP, ask you
           4b  orchestrator loads `.claude/rules/` (coding-standard + security)
               then reviews this ticket (code-review vs spec + this ticket's AC)
               then asks you, in chat, for approval to commit (blocking, no skip)
               approved → handoff log → execute, commit dispatch → commit
           4c  orchestrator checks `- [x]` on confirmed AC, then Status: done
           rejected approval / unmet AC → STOP, ask you
  ▼
Phase 5 — Review (whole task) vs spec + every ticket's AC
           docs/requirements/<slug>/review.md
  ▼
You approve/reject (manual, always)
  ├─ Approve → done, lessons appended to LEARNING.md
  └─ Reject  → uncheck implicated AC, re-run Phase 4 for those tickets only,
               loop back to Phase 5
```

Orchestrator runbook: `CLAUDE.md`. Slash command: `.claude/commands/build.md`.

## Setup

```bash
git init   # required: Phase 4 puts every ticket on its own branch
pnpm install
./scripts/sync-skills.sh   # pulls the real skill content this harness depends on
```

Phase 4 is branch-per-ticket and commits through `git-convention.md`, so the
harness needs a git repo with at least one commit on `main` before `/build`.

`sync-skills.sh` fetches the actual `SKILL.md` files from
[mattpocock/skills](https://github.com/mattpocock/skills) (MIT licensed) into
`.agents/skills/<name>/SKILL.md`. Phase skills are loaded from that directory —
see `tools/subagent-adapter/interface.ts`.

## Phase 4 test report

`execute` records one `test_run` telemetry row per test invocation, and
`pnpm report:tests` renders those rows into HTML:

```bash
pnpm report:tests                                    # latest session
pnpm report:tests -- --session logs/sessions/x.json  # a specific run
```

- `logs/reports/<ticket>.html` — every attempt for that ticket, unit and
  integration separately, with failure messages.
- `logs/reports/index.html` — one row per ticket, read at Phase 5.

Badges are `passed` / `failed` / `incomplete`. **`incomplete` means one of
the two test kinds was never recorded** — 4a gates on both, so that is a
failed gate, not a pass. Malformed `test_run` rows are rendered as a notice
rather than dropped, because a test result that silently vanishes looks
exactly like a passing one.

The renderer never shells out to a test runner and parses no runner output,
so it works with whatever framework the project uses and adds no dependency.
Its input contract is `tools/telemetry/test-run.ts`, which is also printed
into the telemetry MCP tool description so `execute` sees it. Output is
git-ignored — `git-convention.md` §5 forbids committing generated reports.

## Checks

```bash
pnpm typecheck      # tools/ + scripts/
pnpm check:harness  # cross-file invariants tsc can't see
```

`check:harness` asserts the things spread across TypeScript, JSON and
Markdown: every skill in `SKILLS_BY_SUBAGENT` and rule in
`RULES_BY_SUBAGENT` exists on disk, every provider named in
`.claude/harness.json` has a registered adapter that declares
`capabilities.toolUse`, every sub-agent with permissions has a
`.claude/agents/<name>.md` which itself names every one of those skill and
rule files (the Agent-tool path injects nothing, so a sub-agent can only
load what its own role file points at), the report output stays git-ignored,
and `approval.autoApprove` is still `false` — the config flag that says no
setting may pre-approve a commit; the human approval ask itself now happens
in the orchestrator's own chat rather than through a tool.
It warns (does not fail) when the configured provider is a single-turn stub,
which is the state of a fresh template. Both run in `.github/workflows/ci.yml`.

## Running

```bash
claude
> /build add a GET /goodbye endpoint that mirrors /hello
```

## Handoff logs

Before every sub-agent call, the exact `{ subAgent, task, context }` payload is
written to `docs/requirements/<slug>/handoffs/<timestamp>-<subAgent>.json`.
`runSubAgent()` writes this itself; if you dispatch another way (the Agent tool
on Claude Code, a Cursor Task, etc.), write the same file first. Fallback:
`logs/handoffs/` when the task slug cannot be inferred. Telemetry event
`subagent_delegated` includes the same `context`.

## How Phase 4a is dispatched

Two paths, one payload — see `CLAUDE.md` § Delegation:

- **On Claude Code (default):** the Agent tool with `subagent_type: "execute"`,
  which loads `.claude/agents/execute.md` and grants the real tools. The
  orchestrator cannot call `runSubAgent()` here — that's a TypeScript function
  and reaching it would need `Bash`, the one tool the orchestrator must not have.
- **On other hosts / other providers:** `runSubAgent()` in
  `tools/subagent-adapter/interface.ts`.

Only `runSubAgent()` injects skill and rule content into the sub-agent's
prompt. **The Agent tool injects nothing** — it loads the role file and grants
tools, full stop. So on the default path `execute` Reads
`.agents/skills/{implement,tdd}/SKILL.md` and `.claude/rules/*.md` itself, as
the top of `.claude/agents/execute.md` instructs. `pnpm check:harness` fails if
that file stops naming any of them, because a sub-agent silently running
without its rules looks identical to one following them.

`execute` cannot pause mid-task for a human answer, so the orchestrator
dispatches it **twice per ticket**: once to implement and test (stopping
with the changes uncommitted), and again — only after the orchestrator has
reviewed the diff and asked the human for approval directly in chat — to
commit. See CLAUDE.md § Phase 4b.

**Adapter status:** all four adapters (`claude`, `codex`, `deepseek`, `gemini`)
are single-turn reference stubs declaring `capabilities.toolUse: false`. A single
chat call cannot branch, edit files, run tests, or commit, so `runSubAgent()`
refuses to pair one with `execute` instead of returning prose that looks like
success and silently skips all of that. To route `execute` through a
provider, give that adapter a real multi-turn tool loop and set
`capabilities.toolUse = true`.

## Multi-provider sub-agents

The orchestrator is always Claude (it needs blocking interactive grilling on the
main thread). The only delegated sub-agent is `execute`; it can run on a
different provider — see `.claude/harness.json` → `subagents.execute.provider`
and `tools/subagent-adapter/`.

### Two config files, both with a `permissions` key

- `.claude/settings.json` — Claude Code's own config (MCP servers, its
  permission allowlist). This is what actually gates the orchestrator's tools.
- `.claude/harness.json` — this harness's config: `subagents.<name>.provider`,
  `execution.mode`, and a `permissions` block the adapter only *prints* into the
  sub-agent's prompt. It enforces nothing. On Claude Code, `execute`'s real tool
  scope is the `tools:` frontmatter in `.claude/agents/execute.md`.

## Directory map

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Orchestrator runbook (always-loaded) |
| `.agents/skills/` | Portable, plain-text skill content shared by every provider |
| `.claude/commands/build.md` | Orchestrator prompt (the `/build` slash command) |
| `.claude/agents/execute.md` | `execute` role prompt + its real tool scope (`tools:` frontmatter) |
| `.claude/harness.json` | Harness config: sub-agent provider, `execution.mode` |
| `.claude/settings.json` | Claude Code's own config (MCP servers, permission allowlist) |
| `.claude/rules/` | Project coding/security/git rules — load at 4a (execute) and 4b/5 (review), not Phase 1–3. Adjust the example paths to your project |
| `CONTEXT.md` / `docs/adr/` | Glossary and ADRs written during Phase 1 |
| `docs/requirements/<slug>/` | spec.md / tickets/*.md / review.md / handoffs/*.json per task |
| `logs/sessions/` | Raw per-session telemetry (debugging only) |
| `logs/handoffs/` | Fallback handoff logs when the task slug cannot be inferred |
| `LEARNING.md` | Durable, curated lessons carried across runs |
| `tools/subagent-adapter/` | Provider-agnostic sub-agent dispatch + skill injection + handoff logs |
| `tools/telemetry/` | Session event recording |
| `logs/reports/` | Generated Phase 4 HTML test reports (git-ignored) |
| `tools/telemetry/test-run.ts` | `test_run` event schema — the report's input contract |
| `scripts/render-test-report.ts` | Renders the Phase 4 HTML test report (`pnpm report:tests`) |
| `scripts/check-harness.ts` | Cross-file invariant checks (`pnpm check:harness`, also a CI step) |
| `scripts/smoke-test.md` | Manual end-to-end checklist — the gates can't be unit-tested |
| `.github/workflows/ci.yml` | CI: install → typecheck → check:harness |
