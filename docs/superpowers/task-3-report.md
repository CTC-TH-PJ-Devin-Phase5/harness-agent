# Task 3 — `/build` mirror (review fix)

## Review findings addressed

- Opener + Constraints: Orchestrator CI Bash exception (Phase 4b after clean review); kept never write app code / never commit.
- 4b: STOP on review miss before Orchestrator CI or approval ask.
- 4b: No approval while CI FAIL or CI-fix owed; no auto-approve.
- 4c: Aligned with CLAUDE (clean review → CI only; CI PASS → approval ask; four hard-stop conditions).
- Handoff log bullet: initial implement, CI-fix implements, commit (not “two per ticket” only).

## Verification

```bash
rg -n "orchestrator-ci|CI-fix|review finds a miss|auto-approve|Hard stop|CI PASS only" .claude/commands/build.md
```

All expected patterns present in `.claude/commands/build.md`.
