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

`Read` and follow `.claude/skills/grill-with-docs/SKILL.md` (it loads
`grilling` and `domain-modeling`) to interview the human about this task
until requirements are genuinely clear.

- **No timeout. No skip.** Always wait for a real answer.
- This cannot be delegated to a sub-agent: sub-agents run to completion and
  return once, they cannot pause mid-task to wait on a human.
- Produce a set of grilling notes (decisions made, terminology, scope
  boundaries) to hand to Phase 2.

## Phase 2 — Spec (you do this, `to-spec`)

Read and follow `.claude/skills/to-spec/SKILL.md`. Synthesize Phase 1 into
`docs/requirements/<slug>/spec.md`. Do not re-interview; check seams with
the human before writing. No application/production code.

Gate: `docs/requirements/<slug>/spec.md` must exist and be non-empty before
proceeding.

## Phase 3 — Tickets (you do this, `to-tickets`)

Read and follow `.claude/skills/to-tickets/SKILL.md`. Quiz the human on the
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

Write the handoff log, then use the Agent tool with `subagent_type:
"execute"`. See CLAUDE.md § Delegation.

The Agent tool injects **nothing**. So your `task` string must tell
`execute` to Read its own skills (`.claude/skills/implement/SKILL.md`,
`tdd/SKILL.md`) and rules (`.claude/rules/`: coding-standard,
security-common, security-backend, security-frontend) before it writes any
code. `git-convention` isn't needed for this dispatch — nothing gets
committed here. Also make `task` self-contained (AC copied in, relevant
spec section, any Phase-1 prototype/reference, explicit out-of-scope) —
see CLAUDE.md § Delegation for why a short one-liner isn't enough.

`execute` creates the ticket branch (`<slug>/<NN>-<ticket-slug>`, off its
blocker's branch or `main`), then loops at most twice:

1. Implement.
2. Run unit tests and integration tests on the host via execute's Bash.
3. Write/update `logs/reports/<ticket>.html` (execute authors this
   directly with `Write` — no renderer script, no telemetry pipeline).
4. Both pass → stop, **leave the changes uncommitted**, return success +
   diff summary + the actual test output + the report path → 4b. `execute`
   cannot pause mid-task for a human answer, so it never asks for approval
   or commits itself — that's your job next, in 4b.
5. Fail → write the report anyway, then: fail on attempt 1/2 → fix and
   loop back to step 1 (one retry). Fail on attempt 2/2 → stop and report
   failure with the actual output. Do not try a third time.

`execute` does not check Acceptance Criteria and does not mark
`Status` done.

**4b Review this ticket, then the human approval gate** — you do this.
After `execute` reports success, load `.claude/rules/coding-standard.md`
and the security rules, then review this ticket's branch — still
uncommitted — against `spec.md` and this ticket's acceptance criteria
(`code-review`). Do not skip to the next ticket. Read
`logs/reports/<ticket>.html` (the path `execute` returned) and this
ticket's own `## Execution log` table too: both unit and integration must
show a pass on the latest attempt for this to count as tests-passing — a
missing or ambiguous kind in either source is a failed gate, not a pass.

If the review is clean, ask the human directly in this chat for approval
to commit — blocking, no skip, no timeout, same rule as Phase 1. Approved →
write a new handoff log and dispatch `execute` again with
`{ subAgent: "execute", task, context: { ticket, specPath, action: "commit", commitSummary } }`;
this second call only runs `git add` + `git commit` on the already-checked-out
branch, per `git-convention.md`. Rejected → stop (see below); do not commit.

**4c Check Acceptance Criteria** — once the commit dispatch succeeds, mark
`- [x]` each criterion the review confirmed. Leave unmet criteria as
`- [ ]`. Only then mark `Status` done and move to the next ticket. Do not
move on before all four are true: human said yes, commit hash recorded,
AC checked to match what review confirmed, `Status` set to done.

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

Confirm every ticket's own `## Execution log` table and
`logs/reports/<ticket>.html` show a passing final attempt for both unit
and integration tests, and cite both in `review.md`. Call out any ticket
where either doesn't show both passing, or either is missing entirely
(that one's tests were never recorded — unverified).

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
- Every delegation goes through the Agent tool with `subagent_type:
  "execute"`.
- Before every sub-agent call — there are two per ticket, implement and
  commit — write the exact `{ subAgent, task, context }` payload yourself
  with `Write` to
  `docs/requirements/<slug>/handoffs/<ISO-timestamp>-<subAgent>.json`
  before making the call.
- Approval is always manual, always blocking. There is no path in this
  harness that commits code without an explicit human yes.
