# agent-harness-template

A template for running AI-assisted development as a gated, 5-phase pipeline
instead of one long-running single-agent session. The Orchestrator (the main
Claude Code thread) grills you for requirements, writes the spec and tickets,
reviews each ticket, and checks its acceptance criteria. Only implementation
is delegated to the `execute` sub-agent, one ticket at a time, and nothing
gets committed without an explicit human yes.

**→ Full documentation: [README-HARNESS.md](README-HARNESS.md)** — why it
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
runbook it follows is [CLAUDE.md](CLAUDE.md).

---

**If you cloned this template into your own project:** replace this file with
your project's own README. It exists only so this repo's GitHub front page
shows something — GitHub renders `README.md` and nothing else, so the harness
documentation lives in `README-HARNESS.md` to leave that slot free for you.
Keep `README-HARNESS.md`, `CLAUDE.md`, `.claude/` and `LEARNING.md`; those are
the harness itself.
