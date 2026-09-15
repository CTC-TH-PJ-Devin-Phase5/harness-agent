# Orchestrator CI gate (Phase 4b)

## Goal

Add a second mechanical validation layer owned by the Orchestrator: after a clean per-ticket review in Phase 4b and before the human approval ask, run a fixed local CI suite, show pass/fail output (including where it broke), and on failure re-dispatch `execute` to fix (max 2 attempts shared with the ticket counter).

## Non-goals

- No GitHub Actions / remote CI workflow shipped by this change.
- No Orchestrator CI run in Phase 5.
- No change to `execute`'s own implement-mode gate (`pnpm test:unit` remains the implement loop gate).
- `execute` still does not check Acceptance Criteria or mark Status done.

## Placement in Phase 4b

After `execute` returns implement success:

1. Orchestrator loads coding/security rules and reviews `git diff HEAD` vs `spec.md` + this ticket's AC.
2. If review finds a miss → stop (existing STOP rule). Do **not** run CI.
3. If review is clean → run **Orchestrator CI** (this design).
4. If CI fails → show report to human → re-dispatch `execute` (`action: "implement"`, CI-fix payload) → loop until CI passes or attempts exhausted.
5. If CI passes → show report → ask human yes/no to commit (existing blocking approval gate).
6. On human yes → commit dispatch as today.

## Ownership

| Concern | Owner |
|---|---|
| Implement + `pnpm test:unit` loop | `execute` |
| Diff review vs spec/AC | Orchestrator |
| Local CI suite (this gate) | Orchestrator |
| Human approve-to-commit ask | Orchestrator |
| AC checkboxes / Status done | Orchestrator (4c) |

Orchestrator runs the CI suite via host Bash. Existing `.claude/settings.json` already allowlists `pnpm test:*`, `pnpm run lint:*`, `pnpm run typecheck:*`, `pnpm run build:*`. Docs must stop saying Orchestrator Bash is review-git-only; CI Bash in 4b is explicitly allowed.

## Command suite (fixed order)

Run all four, then summarize (do not stop-at-first-fail for reporting — collect every step's result so the human sees the full picture):

1. `pnpm test:unit`
2. `pnpm run lint`
3. `pnpm run typecheck`
4. `pnpm run build`

Missing / non-runnable script → that step is **FAIL** (same class of blocker as a missing `pnpm test:unit` gate). Do not skip silently.

## Report format (always, pass or fail)

Post in the Orchestrator chat every CI run:

```markdown
## Orchestrator CI (ticket NN)
| Step | Command | Result |
| 1 | pnpm test:unit | PASS / FAIL |
| 2 | pnpm run lint | PASS / FAIL |
| 3 | pnpm run typecheck | PASS / FAIL |
| 4 | pnpm run build | PASS / FAIL |

Overall: PASS | FAIL

### Failures
- <command>: <short excerpt of the error / failing location>
```

On PASS, omit `### Failures` or leave it empty. Always include the table and Overall line.

Also append a row to the ticket's `## Execution log` for the Orchestrator CI attempt (commands + overall pass/fail). Exact table columns may extend the existing execute log template without breaking prior rows.

## Failure → re-dispatch `execute`

1. Tell the human CI failed (with the report above).
2. Write a new handoff log, then dispatch `execute` with `action: "implement"` and a self-contained `task` that includes:
   - that this is a **CI-fix** retry (not a fresh feature slice);
   - the failure summary (which steps failed + excerpts);
   - the same AC / spec / out-of-scope constraints as the original implement dispatch;
   - reminder: leave uncommitted; do not check AC; gate remains `pnpm test:unit` inside execute's own loop.
3. After `execute` returns success again → Orchestrator **always** re-reviews the new `git diff HEAD` (diff changed) → if review clean, re-run Orchestrator CI → rinse. Review miss still stops without another CI run.

### Attempts

Share the ticket's existing attempts counter (`0/2`). Each implement dispatch that returns for 4b (initial or CI-fix) consumes toward the same max of 2. After 2 failed paths that still leave CI or review unmet → stop the whole ticket (existing hard stop).

Clarification: the counter is the ticket's implement attempts, not a separate CI-only budget. Orchestrator CI runs are not separately capped beyond that — once attempts are exhausted, stop.

## New skill

Add `.claude/skills/orchestrator-ci/SKILL.md`:

- Trigger: Phase 4b after clean review, before human approval ask.
- Steps: run the four commands; build the report; decide PASS/FAIL; on FAIL instruct re-dispatch; on PASS hand back to 4b approval ask.
- Reference: command list, missing-script rule, report template, attempts rule.

Pointer from `CLAUDE.md` §4b and `.claude/commands/build.md` so the Orchestrator always loads it at that branch.

## Files to change

| File | Change |
|---|---|
| `.claude/skills/orchestrator-ci/SKILL.md` | New skill |
| `CLAUDE.md` | Insert CI gate in §4b; allow Orchestrator CI Bash; Pointers row |
| `.claude/commands/build.md` | Mirror 4b sequence |
| `README-HARNESS.md` | Replace "No CI…" framing with local Orchestrator CI gate in 4b; still no shipped GHA |
| `.claude/agents/execute.md` | Document CI-fix implement payload expectations |
| Ticket / requirements templates (`## Execution log`) | Record Orchestrator CI rows |

## Out of scope for implementation follow-up

- Configurable command lists in `harness.json` (rejected in design; suite is fixed).
- Phase 5 CI re-run.
- Auto-approve on CI pass (`approval.autoApprove` stays `false`).
