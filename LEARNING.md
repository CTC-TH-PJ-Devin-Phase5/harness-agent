# LEARNING.md

Durable, curated lessons carried across harness runs. Read by the orchestrator
at the start of every `/build`, and by the `execute` sub-agent before it starts
each ticket. Append a new dated section whenever a task finishes approved —
distill it, don't paste raw logs. Raw per-ticket detail belongs in that
ticket's own `## Execution log` table, not here.

Format:

```
## <date> — <task-slug>
- Lesson: <one line, specific and actionable>
- Lesson: <...>
```

## 2026-09-16 — login-screen (Tickets 01, 02a, 02b)

- Lesson: Local LLM (qwen2.5-coder:32b) writes component logic correctly but fails on Vitest-specific test patterns — always split tickets into `NNa` (Claude writes tests) + `NNb` (local LLM implements against those tests).
- Lesson: When local LLM is stuck in a loop, diagnose the root cause first, then give the exact fix in the task string — after diagnosis, local LLM fixed the Backspace onKeyDown issue in 5 turns.
- Lesson: Backspace in controlled React inputs must be handled in `onKeyDown`, not `onChange` — `onChange` does not fire when the input is already empty.
- Lesson: Local LLM outputs tool calls as JSON text content (not native `tool_calls`) — `loop.js` must parse text-format tool calls as a fallback.
- Lesson: `project-conventions.md` injected into every local-LLM task prevents the most common failure modes (vi.fn vs jest.fn, controlled component wrappers, data-testid queries, edit_file → write_file recovery).
- Lesson: `execute` sub-agent must STOP and report failure when local-execute fails — never implement the ticket itself, as it makes failures invisible and breaks measurement.
- Lesson: Scaffold tickets (package.json, tsconfig, vitest config) must use `Provider: claude` — framework API knowledge gaps cause local LLM to place `resolve.alias` inside `test:{}` instead of top-level.
- Lesson: SSH tunnel to EC2 drops silently between dispatches — always verify connectivity before re-dispatch by checking Ollama endpoint.
