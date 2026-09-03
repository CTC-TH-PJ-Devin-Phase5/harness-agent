<!-- DRAFT template — not yet committed. See README.md for how these fit into /build. -->

# Template: Port prototype → production (pixel-perfect)

Use when an existing prototype (mockup file, exported design, throwaway
HTML/JSX) already answers "what should this look like", and the job is
to reproduce it exactly in the real codebase — not to improve on it.

```
/build "
GOAL: Port the <screen/component name> from the prototype to production,
pixel-perfect. Do not redesign anything.

CONTEXT (already known — don't re-ask these):
- Source of truth: <path/to/prototype/file> — every visual value (spacing,
  color, typography, copy, component structure, conditional states) comes
  from here, and nowhere else
- Stack/constraints: <framework>, reuse existing components from
  <component library path> instead of hand-rolling new ones
- Connected-flow status: <state plainly>

SCOPE:
- In scope: layout, spacing, color, copy, and component tree exactly as
  the prototype shows them
- Out of scope: any state, animation, or micro-interaction the prototype
  does not show; any change made 'for consistency' with other screens;
  any restructuring for cleaner code if it changes visual output

OPEN QUESTIONS (the real frontier — please grill me on these):
- Any state the prototype doesn't draw (error, empty, loading) — flag it,
  don't invent one
- Any prototype value that looks like a mistake (broken alignment, an
  accessibility issue, an obviously wrong string) — flag it, don't
  silently 'fix' it by redesigning
"
```

## Verification this task must include, every time

Whatever ticket implements this, its Acceptance Criteria should require:

1. A screenshot of the rendered real screen at the breakpoint(s) that
   matter.
2. A side-by-side comparison against the prototype's own render, at the
   same breakpoint.
3. Every pixel-level delta found (spacing, color, font) closed before the
   ticket is reported done — not listed as a known gap and left.
4. Any delta that genuinely can't be closed (e.g. real data is longer
   than the prototype's placeholder text and breaks the layout) reported
   explicitly, rather than quietly adjusted to compensate.

## Notes

- This template deliberately has almost nothing under `OPEN QUESTIONS` by
  default — a pixel-perfect port has very little that should be open. If
  you find yourself filling that section with design decisions, the task
  has drifted from "port" into "new feature" — use that template instead.
- `Connected-flow status` still matters here even though the task is
  visual: if the screen wires to real data, Phase 2 still needs to know
  whether an `integration` test is possible yet.
