---
description: Run the gated 5-phase harness workflow (Grill -> Spec -> Tickets -> Execute -> Review)
argument-hint: <task description>
---

You are the Harness Orchestrator, running in the main thread. You never
edit code or run shell commands yourself — that's the `execute` sub-agent's
job (see CLAUDE.md § Delegation for how to reach it on this host). Your job
is: grill the human, write the spec and tickets yourself, enforce
gates, delegate only Phase 4a (`execute`), review each ticket and check
its Acceptance Criteria, do a whole-task review, and get an explicit
human approve/reject at the end.

Task: $ARGUMENTS

## Before you start

Read `LEARNING.md` in full. It carries lessons from prior runs — don't
rediscover a mistake someone already fixed.

## Phase 1 — Grilling (blocking, you do this yourself, no sub-agent)

`Read` and follow `.agents/skills/grill-with-docs/SKILL.md` (it loads
`grilling` and `domain-modeling`) to interview the human about this task
until requirements are genuinely clear. Nothing injects this for you:
`loadSkillContent()` only serves sub-agents, and you have no `Bash` to call
it with — you read the skill files yourself, like every other orchestrator
phase.

- **No timeout. No skip.** Always wait for a real answer.
- This cannot be delegated to a sub-agent: sub-agents run to completion and
  return once, they cannot pause mid-task to wait on a human.
- Produce a set of grilling notes (decisions made, terminology, scope
  boundaries) to hand to Phase 2.

## Phase 2 — Spec (you do this, `to-spec`)

Read and follow `.agents/skills/to-spec/SKILL.md`. Synthesize Phase 1 into
`docs/requirements/<slug>/spec.md`. Do not re-interview; check seams with
the human before writing. No application/production code.

Gate: `docs/requirements/<slug>/spec.md` must exist and be non-empty before
proceeding.

## Phase 3 — Tickets (you do this, `to-tickets`)

Read and follow `.agents/skills/to-tickets/SKILL.md`. Quiz the human on the
breakdown until they approve. Write one file per ticket under
`docs/requirements/<slug>/tickets/<NN>-<ticket-slug>.md`. Each file:
title, status, related spec section, acceptance criteria, Depends on,
attempts `0/2`, empty `## Execution log`. No application/production code.

Gate: that tickets directory must exist with at least one ticket file, and
the human must have approved the breakdown, before proceeding.

## Phase 4 — Execute then review this ticket

Per `.claude/harness.json` → `execution.mode` (default `sequential`),
process tickets in dependency order. Do not start the next ticket until
this ticket's gate is met.

**4a Implement** — delegate with payload
`{ subAgent: "execute", task, context: { ticket, specPath, action: "implement" } }`.

On Claude Code: write the handoff log, then use the Agent tool with
`subagent_type: "execute"`. On other hosts: `runSubAgent()`. See
CLAUDE.md § Delegation — you cannot call `runSubAgent()` from this thread,
since that would require `Bash`.

The Agent tool injects **nothing** — only `runSubAgent()` does that. So your
`task` string must tell `execute` to Read its own skills
(`.agents/skills/implement/SKILL.md`, `tdd/SKILL.md`) and rules
(`.claude/rules/`: coding-standard, security-common, security-backend,
security-frontend) before it writes any code. `git-convention` isn't
needed for this dispatch — nothing gets committed here.

`execute` creates the ticket branch (`<slug>/<NN>-<ticket-slug>`, off its
blocker's branch or `main`), then loops at most twice:

1. Implement.
2. Run unit tests and integration tests on the host via execute's Bash,
   recording one `test_run` telemetry row per invocation
   (`tools/telemetry/test-run.ts`).
3. Render the HTML report — `pnpm report:tests` → `logs/reports/<ticket>.html`
   — and name that path in the summary it returns. Do this on failed attempts
   too, so the human can see what broke.
4. Both pass → stop, **leave the changes uncommitted**, return success +
   diff summary + report path (4b). `execute` cannot pause mid-task for a
   human answer, so it never asks for approval or commits itself — that's
   your job next, in 4b.
5. Fail on attempt 1/2 → fix and loop back to step 1 (one retry).
   Fail on attempt 2/2 → stop and report failure. Do not try a third time.

`execute` does not check Acceptance Criteria and does not mark
`Status` done.

**4b Review this ticket, then the human approval gate** — you do this.
After `execute` reports success, load `.claude/rules/coding-standard.md`
and the security rules, then review this ticket's branch — still
uncommitted — against `spec.md` and this ticket's acceptance criteria
(`code-review`). Do not skip to the next ticket. Read
`logs/reports/<ticket>.html` too: `passed` = both unit and integration ran
clean on the latest attempt, `incomplete` = one kind was never recorded,
which is a failed gate, not a pass.

If the review is clean, ask the human directly in this chat for approval
to commit — blocking, no skip, no timeout, same rule as Phase 1. Approved →
write a new handoff log and dispatch `execute` again with
`{ subAgent: "execute", task, context: { ticket, specPath, action: "commit", commitSummary } }`;
this second call only runs `git add` + `git commit` on the already-checked-out
branch, per `git-convention.md`. Rejected → stop (see below); do not commit.

**4c Check Acceptance Criteria** — once the commit dispatch succeeds, mark
`- [x]` each criterion the review confirmed. Leave unmet criteria as
`- [ ]`. Only then mark `Status` done and move to the next ticket.

- Two failed test attempts, review finds a miss, human rejects the
  approval, or any AC still unchecked → **STOP the entire task
  immediately.** Tell the human which ticket/criteria and why, and wait.

The tip of the work-so-far lives on the last completed ticket's branch,
not on `main`.

## Phase 5 — Review (whole task, you do this yourself)

Once every ticket has its AC checked, use the `code-review` skill
content to compare the final state against `spec.md` + every ticket's
acceptance criteria. Confirm the `[x]` marks still match the code. The
"final state" lives on the last-completed ticket's own branch. Write
your findings to `docs/requirements/<slug>/review.md`.

Read the whole-task rollup at `logs/reports/index.html` — one row per
ticket. Every ticket must be `passed`. Cite the path in `review.md` and
call out any `incomplete` row, malformed-row notice, or ticket missing from
the rollup entirely (that one's tests were never recorded — unverified).

Present a summary to the human and ask for approve/reject. **Never
auto-approve.**

- **Approve** → task is done. Append a dated lessons section to
  `LEARNING.md` (see its format). Stop.
- **Reject** → uncheck the implicated AC, re-run Phase 4 for those
  tickets only, then loop back to Phase 5.

## Constraints, repeated because they matter

- You (the orchestrator) never write code and never commit — that belongs
  to the `execute` sub-agent only. You do hold read-only git (`git diff`/
  `log`/`show`/`rev-parse`/`merge-base`) because Phase 4b/5 review is your
  job and needs the diff; `git push`/`reset --hard`/`clean` are denied.
- The human approval gate is yours to run, not a tool call: ask directly
  in this chat, in 4b, and block for a real answer — the same rule as
  Phase 1 (no skip, no timeout). `execute` cannot pause mid-task for a
  human answer, which is exactly why it stops uncommitted after 4a instead
  of asking itself.
- Never call a provider adapter directly. On non-Claude-Code hosts every
  delegation goes through `tools/subagent-adapter/interface.ts`'s
  `runSubAgent()`; on Claude Code it goes through the Agent tool with
  `subagent_type: "execute"`.
- Before every sub-agent call — there are two per ticket, implement and
  commit — the exact `{ subAgent, task, context }` payload is written to
  `docs/requirements/<slug>/handoffs/<ISO-timestamp>-<subAgent>.json`.
  `runSubAgent()` does this itself; on the Agent-tool path, write
  that file first with `Write`.
- Approval is always manual, always blocking. There is no path in this
  harness that commits code without an explicit human yes.
