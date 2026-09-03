# `/build` Entry Prompt Templates

<!-- DRAFT — not yet committed. Review before adding to git. -->

These are fill-in templates for the **argument you pass to `/build`** —
the very first message that kicks off Phase 1 (Grill). They exist to
pre-answer the frontier questions `grilling` would otherwise have to
raise in round one, so the interview starts smaller and finishes faster.

They do **not** replace grilling. `grilling` (`.claude/skills/grilling/SKILL.md`)
still runs in full — these templates just shrink the frontier by stating,
up front, whatever you already know. Anything you genuinely don't know
goes under `OPEN QUESTIONS`, not left blank; a blank section reads as
"nothing here," which is a different signal than "ask me about this."

## Shared shape

Every template follows the same four sections:

```
GOAL: <one-line, user-visible outcome>

CONTEXT (already known — don't re-ask these):
- Source of truth: <prototype files, FR/NFR doc sections, existing ADRs>
- Stack/constraints: <existing patterns and libraries to reuse>
- Connected-flow status: <does a real front-end↔back-end↔database flow
  already exist in this repo? — feeds straight into CLAUDE.md's test-kind
  floor policy (`unit` alone vs `unit, integration`), so answering it here
  saves Phase 2 from asking>

SCOPE:
- In scope: <bullets>
- Out of scope (explicit non-goals): <bullets>

OPEN QUESTIONS (the real frontier — please grill me on these):
- <whatever you're intentionally leaving open>
```

`CONTEXT` and `SCOPE` are what you already decided. `OPEN QUESTIONS` is
what you want Phase 1 to actually spend rounds on. Keep the split honest —
padding `CONTEXT` with a guess just moves a wrong assumption one step
earlier instead of removing it.

## Templates in this directory

| File | Use when |
|---|---|
| [new-feature.md](new-feature.md) | Building a new vertical slice — a screen, endpoint, or flow that doesn't exist yet |
| [prototype-port.md](prototype-port.md) | Porting an existing prototype/mockup into production, pixel-for-pixel, with no new design decisions |
| [bug-fix.md](bug-fix.md) | Fixing a specific, reproducible defect in existing behavior |

Copy the relevant template's body, fill in the placeholders, and pass the
result as the `/build "..."` argument.

## `prompts-templates/` vs `prompts-examples/`

This directory holds generic, stack-agnostic templates — harness
infrastructure, copied into every project by `init-harness-agent.sh`
alongside `.claude/`, `CLAUDE.md`, and the rest. A sibling
`harness/prompts-examples/` directory (if you create one) is for
**filled-in, app-specific** prompts you actually ran — worked examples
tied to one project's domain. Keep that distinction: this directory
should stay reusable across any project cloned from this harness, so
don't let app-specific detail creep in here.
