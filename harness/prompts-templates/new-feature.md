<!-- DRAFT template — not yet committed. See README.md for how these fit into /build. -->

# Template: New feature / vertical slice

Use when building something that doesn't exist yet — a screen, an
endpoint, a flow — as a tracer-bullet slice through the stack.

```
/build "
GOAL: <one sentence — the user-visible outcome. e.g. 'A user can request
a ride and see the driver's live ETA on the map.'>

CONTEXT (already known — don't re-ask these):
- Source of truth: FR §<x.x>, NFR §<x.x> (path: <docs/requirements-source>)
- Stack/constraints: <framework>, follow the pattern already used in
  <existing module path> — don't introduce a new pattern for this
- Connected-flow status: <state plainly whether front-end, back-end and
  the database are already wired together end-to-end in this repo, or not>

SCOPE:
- In scope: <the specific endpoint(s)/screen(s)/component(s) this task
  must produce>
- Out of scope: <adjacent feature work you are deliberately deferring —
  name it so it doesn't get pulled in as 'while I'm here'>

OPEN QUESTIONS (the real frontier — please grill me on these):
- <edge cases, validation rules, copy, or error-handling choices you
  haven't decided yet>
"
```

## Notes

- If `CONTEXT` and `SCOPE` are both filled in confidently and
  `OPEN QUESTIONS` is short, expect a fast Phase 1 — the frontier is
  mostly closed already.
- Don't guess at `Connected-flow status` to make the section look
  complete. Getting it wrong here means Phase 2 sets the wrong test-kind
  floor, which either wastes an `integration` run against nothing or
  silently skips coverage that should exist.
- Leave `OPEN QUESTIONS` empty only if you mean it — grilling still runs
  and will surface anything you missed, but an honest list here means
  fewer surprise rounds.
