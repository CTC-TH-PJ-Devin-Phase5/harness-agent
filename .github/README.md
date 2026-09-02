# agent-harness-template

A template for running AI-assisted development as a gated, 5-phase pipeline
instead of one long-running single-agent session. The Orchestrator (the main
Claude Code thread) grills you for requirements, writes the spec and tickets,
reviews each ticket, and checks its acceptance criteria. Only implementation
is delegated to the `execute` sub-agent, one ticket at a time, and nothing
gets committed without an explicit human yes.

**→ Full documentation: [README-HARNESS.md](../README-HARNESS.md)** — why it
exists, setup, the phase-by-phase workflow, how dispatch works, and the
directory map.

```
Phase 1  Grill    interview until requirements are actually clear (blocking)
Phase 2  Spec     synthesize into docs/requirements/<slug>/spec.md
Phase 3  Tickets  break it into tracer-bullet tickets you approve
Phase 4  Execute  per ticket: implement + test → review → you approve → commit
Phase 5  Review   whole task vs spec and every ticket's AC → you approve
```

Start a run with `/build "<what you want>"` inside `claude`. The orchestrator
runbook it follows is [CLAUDE.md](../CLAUDE.md).

---

**Why this file lives in `.github/`:** GitHub renders a repo's front page
from `.github/README.md` first, then root `README.md`, then
`docs/README.md` — and only from a file named exactly `README.md`. There is
no setting that points the front page at `README-HARNESS.md`, so this stub
holds the front page while the harness's actual documentation stays in
`README-HARNESS.md`, leaving the root `README.md` slot free.

**If you cloned this template into your own project:** delete this file and
write your project's own root `README.md`. Leaving it in place means your
front page keeps showing the harness template instead of your project,
because `.github/README.md` outranks the root one. Keep
`README-HARNESS.md`, `CLAUDE.md`, `.claude/` and `LEARNING.md` — those are
the harness itself.
