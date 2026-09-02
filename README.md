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
                 pass → stop, uncommitted → return summary + test output → 4b
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
```

Phase 4 is branch-per-ticket and commits through `git-convention.md`, so the
harness needs a git repo with at least one commit on `main` before `/build`.

Skill content lives directly in `.claude/skills/<name>/SKILL.md` — most of it
originates from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT
licensed), vendored into this repo rather than fetched at setup time. To pull
in updates from upstream, copy the relevant `SKILL.md` file(s) over manually.

## Test evidence

There is no generated test report. `execute` runs unit and integration tests
on the host via `Bash` and reports the actual command plus pass/fail counts
directly in the summary it returns to the orchestrator (CLAUDE.md § 4a), and
logs each attempt as a row in that ticket's own `## Execution log` table
(`.claude/agents/execute.md`). The orchestrator reads that table — not a
rendered file — during the 4b per-ticket review and the Phase 5 whole-task
review.

## Running

```bash
claude
> /build add a GET /goodbye endpoint that mirrors /hello
```

## Handoff logs

Before every sub-agent call, the exact `{ subAgent, task, context }` payload is
written to `docs/requirements/<slug>/handoffs/<timestamp>-<subAgent>.json` —
the orchestrator writes this itself with `Write` before each dispatch.
Fallback: `logs/handoffs/` when the task slug cannot be inferred.

## How Phase 4a is dispatched

The orchestrator dispatches `execute` via the Agent tool with
`subagent_type: "execute"`, which loads `.claude/agents/execute.md` and
grants the real tools (`Read`, `Write`, `Edit`, `Bash`). The Agent tool
injects **no skill or rule content** — it loads the role file and grants
tools, full stop. So `execute` Reads `.claude/skills/{implement,tdd}/SKILL.md`
and `.claude/rules/*.md` itself, as the top of `.claude/agents/execute.md`
instructs — a sub-agent that never reads its own rules looks identical to one
following them, so there is no injection step to fall back on here.

`execute` cannot pause mid-task for a human answer, so the orchestrator
dispatches it **twice per ticket**: once to implement and test (stopping
with the changes uncommitted), and again — only after the orchestrator has
reviewed the diff and asked the human for approval directly in chat — to
commit. See CLAUDE.md § Phase 4b.

## Directory map

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Orchestrator runbook (always-loaded) |
| `.claude/skills/` | Plain-text skill content the orchestrator and `execute` read directly |
| `.claude/commands/build.md` | Orchestrator prompt (the `/build` slash command) |
| `.claude/agents/execute.md` | `execute` role prompt + its real tool scope (`tools:` frontmatter) |
| `.claude/harness.json` | Harness config: `execution.mode`, `permissions` (mirrors `execute.md`'s tool scope), `approval.autoApprove` |
| `.claude/settings.json` | Claude Code's own config (permission allowlist) |
| `.claude/rules/` | Project coding/security/git rules — load at 4a (execute) and 4b/5 (review), not Phase 1–3. Adjust the example paths to your project |
| `CONTEXT.md` / `docs/adr/` | Glossary and ADRs written during Phase 1 |
| `docs/requirements/<slug>/` | spec.md / tickets/*.md / review.md / handoffs/*.json per task |
| `logs/handoffs/` | Fallback handoff logs when the task slug cannot be inferred |
| `LEARNING.md` | Durable, curated lessons carried across runs |
