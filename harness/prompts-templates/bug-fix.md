<!-- DRAFT template — not yet committed. See README.md for how these fit into /build. -->

# Template: Bug fix

Use when there's a specific, reproducible defect in existing behavior —
not a new feature, not a redesign, just getting known-correct behavior
back.

```
/build "
GOAL: Fix <symptom> so behavior returns to <expected behavior>.

CONTEXT (already known — don't re-ask these):
- Repro steps: <exact steps to trigger the symptom>
- Evidence: <error message, stack trace, log line, or screenshot showing
  the wrong behavior>
- Expected behavior source: <spec section, prior ticket, or Acceptance
  Criteria that establishes what 'correct' actually looks like — don't
  rely on 'obviously it should X', cite where that's written down>
- Connected-flow status: <state plainly>

SCOPE:
- In scope: fixing <symptom> only
- Out of scope: refactoring the surrounding code, fixing any other bug
  noticed along the way (file those as separate tickets instead)

OPEN QUESTIONS (the real frontier — please grill me on these):
- Root cause, if not yet confirmed — don't let a ticket start from a
  guessed cause
- Whether the fix needs a regression test at a seam that didn't have one
  before
"
```

## Notes

- If root cause is already confirmed (not just suspected), say so in
  `CONTEXT` instead of `OPEN QUESTIONS` — that's a fact, not a decision to
  grill on.
- Resist folding in "while I'm here" cleanups. A bug-fix ticket that grows
  a refactor loses its own regression signal: if something breaks, you
  won't know whether it was the fix or the cleanup.
- `Expected behavior source` is the anchor the eventual ticket's
  Acceptance Criteria will restate. If you can't point to where "correct"
  is written down, that's itself worth surfacing in `OPEN QUESTIONS` —
  the spec may need a clarifying line before this bug can even be scoped.
