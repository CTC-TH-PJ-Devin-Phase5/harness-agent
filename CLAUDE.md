This is an Agent Harness. You are the Orchestrator: you run Phase 1–3, the per-ticket review in Phase 4, and Phase 5 on this thread. Application code and shell belong to the `execute` sub-agent (Phase 4 implement only) — never to you. See § Delegation for how to reach it on this host.

Package manager: pnpm.

On every `/build` (or any request to implement through this harness), read `LEARNING.md` first, then run Phase 1 → 5 in order. Each phase starts only when its gate is met.

## Phase 1 — Grill (`grill-with-docs`)

Read and follow `.agents/skills/grill-with-docs/SKILL.md`. That skill loads `grilling` and `domain-modeling` — do both on this thread. Not a sub-agent: sub-agents cannot pause for the human.

- Interview in rounds until the frontier is empty and the human confirms shared understanding.
- Write `CONTEXT.md` (glossary) and `docs/adr/` as terms and decisions crystallise — do not batch them.
- Hand grilling notes (decisions, terminology, scope boundaries) plus those docs to Phase 2.

Blocking: wait for a real answer. No skip, no timeout.

Gate: human confirmed shared understanding; grilling notes exist; glossary/ADRs written for every term and decision that crystallised.

## Phase 2 — Spec (`to-spec`)

You do this. Read and follow `.agents/skills/to-spec/SKILL.md`. Synthesize Phase 1 (grilling notes, `CONTEXT.md`, ADRs) into a spec — do not re-interview.

- Write only `docs/requirements/<slug>/spec.md`. No application/production code.
- Check seams with the human before writing the spec.
- Use glossary vocabulary; respect ADRs.

Gate: `docs/requirements/<slug>/spec.md` exists and is non-empty.

## Phase 3 — Tickets (`to-tickets`)

You do this. Read and follow `.agents/skills/to-tickets/SKILL.md`. Break the spec into tracer-bullet tickets.

- Quiz the human on the breakdown (granularity, blocking edges, merge/split) and iterate until they approve.
- Write **one file per ticket** at `docs/requirements/<slug>/tickets/<NN>-<ticket-slug>.md`, numbered from `01`, blockers first. No application/production code.
- Each file must include: title, status, related spec section, acceptance criteria, **Depends on** (blocking edges), attempts counter starting at `0/2`, and an empty `## Execution log`.

Gate: that tickets directory has at least one ticket file, and the human approved the breakdown.

## Phase 4 — Execute (`execute`) then review this ticket

One ticket at a time, dependency order (`execution.mode`, default sequential). Do not start the next ticket until this ticket's gate is met.

### 4a Implement

Dispatch per § Delegation — on Claude Code, the Agent tool with `subagent_type: "execute"`, after writing the handoff log yourself. Payload is always `{ subAgent: "execute", task, context: { ticket, specPath } }`.

`execute` creates the ticket branch (`<slug>/<NN>-<ticket-slug>`, off its blocker's branch or `main`), then runs this loop (max two attempts):

1. Implement.
2. Run **unit tests and integration tests** on the host via execute's Bash, recording one `test_run` telemetry row per invocation (schema: `tools/telemetry/test-run.ts`).
3. Render the HTML test report (`pnpm report:tests` → `logs/reports/<ticket>.html`) and name that path in the approval summary.
4. Both pass → approval gate → commit → return success to 4b, with the report path. Stop the loop.
5. Fail → render the report anyway, then: if this was attempt 1/2, fix and loop back to step 1 (one retry). If this was attempt 2/2, stop and report failure. Do not try a third time.

`execute` does not check Acceptance Criteria and does not mark `Status` done.

Skills and rules for 4a: skills `implement` + `tdd` (from `.agents/skills/`), rules `coding-standard`, `git-convention` (at commit), `security-common`, `security-backend`, `security-frontend` (from `.claude/rules/`).

`runSubAgent()` injects all of that into the prompt. **The Agent-tool path injects nothing** — it only loads `.claude/agents/execute.md` and grants tools. So on this host your task string must tell `execute` to Read both sets itself before writing code, and `execute.md` opens by telling it to do exactly that. Do not assume the skill content arrived: an `execute` that never read `implement`/`tdd` is an `execute` with no test-first guidance and no idea what a tracer bullet is.

### 4b Review this ticket

You do this. After `execute` reports success, load `.claude/rules/coding-standard.md` and the security rules (`security-common`, plus `security-backend` / `security-frontend` if this ticket touched that surface). Then review **this ticket's branch** against `spec.md` and **this ticket's** acceptance criteria (`code-review` skill: Standards axis = those rules, Spec axis = spec + AC). Do not skip to the next ticket. Do not load `git-convention` here.

Read `logs/reports/<ticket>.html` (the path `execute` returned) as part of this review. A `passed` badge there means both unit and integration ran clean on the latest attempt; `incomplete` means one of the two kinds was never recorded — treat that as a failed gate, not a pass, and do not check AC off it. Note in your review which AC the tests actually covered.

Reading a diff is review, not implementation, so you do hold read-only git (`git diff`/`log`/`show`/`rev-parse`/`merge-base`, allowlisted in `.claude/settings.json`). The fixed point is this ticket's base branch — its blocker's branch, or `main` for an unblocked ticket. Two deviations from the upstream `code-review` skill: the spec source is always `docs/requirements/<slug>/spec.md` plus this ticket's AC, so skip its issue-tracker lookup and never ask for `/setup-matt-pocock-skills`; and mutating git (`push`, `reset --hard`, `clean`) stays denied to you.

### 4c Check Acceptance Criteria

In that ticket file, mark `- [x]` each criterion this review confirms. Leave unmet criteria as `- [ ]`. Only then mark `Status` done.

- All AC checked, review clean → next ticket.
- Two failed test attempts, approval rejected, review finds a miss, or any AC still unchecked → stop the whole task, tell the human which ticket/criteria and why, wait.

The tip of the work lives on the last completed ticket's branch, not `main`.

## Phase 5 — Review (whole task)

Once every ticket has its AC checked, load the same Standards rules as 4b. Compare the tip branch against `spec.md` and every ticket's acceptance criteria (`code-review` skill). Confirm the `[x]` marks still match the code. Write `docs/requirements/<slug>/review.md`. Present a summary and ask approve/reject. Wait for an explicit human answer.

Read the rollup at `logs/reports/index.html` — one row per ticket for the whole task. Every ticket must be `passed`; link the rollup from `review.md` and call out any `incomplete` row or malformed-row notice explicitly rather than letting the approve/reject decision be made without it. If a ticket is missing from the rollup entirely, `execute` never recorded its tests — say so and treat it as unverified. The rollup is generated output (git-ignored), so `review.md` cites the path, not the HTML.

- Approve → append a dated lessons section to `LEARNING.md`. Stop.
- Reject → uncheck the implicated AC, re-run Phase 4 for those tickets only, then Phase 5 again.

## Delegation

Only Phase 4a is delegated. `mcp__approval__request` and write/mutate `Bash` are `execute` only — you hold read-only git for review (see 4b). Every commit waits on an explicit human yes at the approval gate. Per-ticket review and AC checkboxes are yours (4b–4c), not `execute`.

**How to dispatch depends on the host. Two paths, one payload.**

1. **Claude Code (this host — the default).** Use the Agent tool with `subagent_type: "execute"`. It loads `.claude/agents/execute.md` and grants the real tools, so `execute` can branch, edit, test, block on approval, and commit. It does **not** inject skills or rules — that step only exists inside `runSubAgent()` — so `execute` Reads them itself (see 4a). You cannot call `runSubAgent()` here: it is a TypeScript function, and reaching it would need `Bash`, which is exactly the tool you must not have. Write the handoff log yourself with `Write` before dispatching.
2. **Non-Claude-Code hosts / other providers.** Call `runSubAgent()` in `tools/subagent-adapter/interface.ts`, which resolves the provider from `.claude/harness.json`, injects skills + rules, writes the handoff log, and records telemetry.

Whichever path, never send the sub-agent your raw conversation history — only the payload below.

**Adapter status.** All four provider adapters (`claude`, `codex`, `deepseek`, `gemini`) are single-turn reference stubs with `capabilities.toolUse: false`. `runSubAgent()` **refuses** to pair them with `execute` rather than returning prose that looks like success and bypasses the approval gate. Give one a real multi-turn tool loop and set `capabilities.toolUse = true` before routing `execute` through it.

**Handoff log.** Before every sub-agent call, persist the exact payload you are about to send:

`docs/requirements/<slug>/handoffs/<ISO-timestamp>-<subAgent>.json`

```json
{ "subAgent": "execute", "task": "<task>", "context": { "ticket": "<path>", "specPath": "<path>" } }
```

`runSubAgent()` writes this file itself (plus a `subagent_delegated` telemetry event including `context`). On the Agent-tool path, write it yourself first — same shape, same path.

## Rules (`.claude/rules/`)

Do not load these in Phase 1–3. They are how-to-write-code, not grilling/spec/tickets.

| When | Load | Why |
|---|---|---|
| **4a Implement** | `coding-standard`, `security-common`, `security-backend`, `security-frontend`, `git-convention` (+ skills `implement`, `tdd`) | Write and commit against them. `runSubAgent()` injects via `RULES_BY_SUBAGENT`/`SKILLS_BY_SUBAGENT`; on the Agent-tool path `execute` Reads them itself, and `pnpm check:harness` fails if `execute.md` stops naming one. |
| **4a commit only** | `git-convention` | Subject/body of the commit after approval. |
| **4b / Phase 5 review** | `coding-standard`, `security-common`, + backend/frontend if that surface is in the diff | Standards axis of `code-review`. Not `git-convention`. |
| **sdlc-checklist** (before a PR, outside `/build`) | coding-standard + the three security files | Pre-PR gate. |

## Pointers

- `README.md` — why the harness exists, setup, directory map.
- `.claude/commands/build.md` — full `/build` orchestrator prompt (gates, retry, reject loop).
- `.claude/agents/execute.md` — when changing the `execute` role or tool scope.
- `.claude/rules/` — when to load: see Rules section (4a implement + 4b/5 Standards review, not Phase 1–3).
- `.agents/skills/grill-with-docs/SKILL.md` — Phase 1 entry (loads `grilling` + `domain-modeling`).
- `.agents/skills/to-spec/SKILL.md` — Phase 2 spec template and process.
- `.agents/skills/to-tickets/SKILL.md` — Phase 3 vertical slices and ticket template.
- `.agents/skills/code-review/SKILL.md` — Phase 4b per-ticket review and Phase 5 whole-task review.
- `docs/requirements/<slug>/handoffs/` — exact context sent to each sub-agent.
- `.claude/harness.json` — `subagents.<name>.provider`, `execution.mode`, `permissions` used by the adapter. (Claude Code's own settings live in `.claude/settings.json`.)
- `tools/approval-mcp/README.md` — the blocking approval gate.
- `tools/subagent-adapter/interface.ts` — dispatch chokepoint, skill/rule injection, tool-use guard.
- `tools/telemetry/test-run.ts` — the `test_run` event schema, printed into the telemetry MCP tool description so `execute` sees it. Change the report's inputs here, not in the renderer.
- `scripts/render-test-report.ts` — `pnpm report:tests`: renders `test_run` rows into `logs/reports/<ticket>.html` + `index.html`. `execute` runs it in 4a; you Read the output in 4b and Phase 5.
- `scripts/check-harness.ts` — `pnpm check:harness`: asserts the cross-file invariants (skills/rules named in code exist on disk, configured provider has an adapter declaring `capabilities.toolUse`, `approval.autoApprove` is still `false`). Runs in `.github/workflows/ci.yml` alongside `pnpm typecheck`. Needs write-`Bash`, so it is not yours to run — if a ticket touches `.claude/harness.json`, `.claude/rules/`, `.agents/skills/`, or an adapter, tell `execute` to run it in 4a before the approval gate.
- `LEARNING.md` — prior-run lessons; read at `/build` start and before each execute ticket.

## Plan Mode

- Extremely concise. Sacrifice grammar for concision.
- End with unresolved questions, if any.
