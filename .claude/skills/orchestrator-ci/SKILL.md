---
name: orchestrator-ci
description: "Phase 4b Orchestrator local CI gate. After a clean per-ticket review and before the human approval ask, run pnpm test:unit + lint + typecheck + build, post a pass/fail report (with failure excerpts), append an Execution log row, and on FAIL re-dispatch execute for a CI-fix (shared Attempts 0/2). Use when running /build Phase 4b CI, orchestrator CI, or validating a ticket before approve-to-commit."
---

# Orchestrator CI (Phase 4b)

You are the Orchestrator. Run this skill only after the per-ticket review in
Phase 4b is **clean**. Do not run it on a review miss. Do not run it in
Phase 5. Do not ask for human approval until this skill returns PASS.

## Steps

### 1. Run the suite (all four, always)

On the host, via Bash, in this order — run every step even if an earlier one
fails, so the report shows the full picture:

1. `pnpm test:unit`
2. `pnpm run lint`
3. `pnpm run typecheck`
4. `pnpm run build`

If a script is missing or not runnable in this repo, mark that step **FAIL**
(same class of blocker as a missing unit gate). Do not skip it or substitute
another command.

### 2. Post the report in chat (PASS and FAIL)

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

On PASS, omit `### Failures` or leave it empty. Always include the table and
the Overall line. Quote enough stderr/stdout that a human can see *where* it
broke (file, test name, or first actionable error lines) — not only "failed".

### 3. Append the ticket Execution log row

Add one row to this ticket's `## Execution log` (Orchestrator writes this
row, not `execute`):

| Attempt | Agent | Skill(s) | Source files read | Rule/step followed | What was done | Outcome |
|---|---|---|---|---|---|---|
| `<N/2>` | `orchestrator` | `orchestrator-ci` | `.claude/skills/orchestrator-ci/SKILL.md` | suite steps 1–4 | ran unit+lint+typecheck+build; Overall PASS\|FAIL | `success — CI PASS` or `failure — CI FAIL; see Failures` |

Use the same Attempt fraction as the implement dispatch that just returned
(e.g. if execute just finished attempt `1/2`, this CI row is also under `1/2`).

### 4. Branch on Overall

**PASS** → return to CLAUDE.md §4b human approval ask. Present the CI report
alongside the review verdict and `execute`'s unit output. Do not auto-approve.

**FAIL** → tell the human CI failed (report already posted). Then:

1. If this ticket's Attempts would exceed `2/2` after another implement
   dispatch, **STOP** the ticket (hard stop). Do not dispatch again.
2. Otherwise write a handoff log and re-dispatch `execute` with
   `action: "implement"` and a self-contained `task` that states:
   - this is a **CI-fix** retry (not a new feature slice);
   - which steps failed + the failure excerpts;
   - the original AC, spec sections, security rule choice, out-of-scope,
     and `pnpm test:unit` gate (same Delegation rules as a normal implement);
   - leave changes uncommitted; do not check AC; do not mark Status done.
3. When `execute` returns success, **always** re-review `git diff HEAD`.
   Review miss → stop (no CI). Review clean → run this skill again from
   step 1.

Attempts are the ticket's shared `0/2` counter — initial implement and
CI-fix implement dispatches share that budget. Orchestrator CI runs are
not a separate budget.
