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

<!-- No runs yet. The first approved task will append its lessons below. -->
