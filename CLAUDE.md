This is an Agent Harness. You are the Orchestrator: you run Phase 1–3, the per-ticket review in Phase 4, and Phase 5 on this thread. Application code and shell belong to the `execute` sub-agent (Phase 4 implement only) — never to you. See § Delegation for how to reach it on this host.

Package manager: pnpm.

On every `/build` (or any request to implement through this harness), read `LEARNING.md` first, then run Phase 1 → 5 in order. Each phase starts only when its gate is met.

## Phase 1 — Grill (`grill-with-docs`)

Read and follow `.claude/skills/grill-with-docs/SKILL.md`. That skill loads `grilling` and `domain-modeling` — do both on this thread. Not a sub-agent: sub-agents cannot pause for the human.

- Interview in rounds until the frontier is empty and the human confirms shared understanding.
- Write `CONTEXT.md` (glossary) and `docs/adr/` as terms and decisions crystallise — do not batch them.
- Hand grilling notes (decisions, terminology, scope boundaries) plus those docs to Phase 2.

Blocking: wait for a real answer. No skip, no timeout.

Gate: human confirmed shared understanding; grilling notes exist; glossary/ADRs written for every term and decision that crystallised.

## Phase 2 — Spec (`to-spec`)

You do this. Read and follow `.claude/skills/to-spec/SKILL.md`. Synthesize Phase 1 (grilling notes, `CONTEXT.md`, ADRs) into a spec — do not re-interview.

- Write only `docs/requirements/<slug>/spec.md`. No application/production code.
- Check seams with the human before writing the spec.
- Use glossary vocabulary; respect ADRs.

Gate: `docs/requirements/<slug>/spec.md` exists and is non-empty.

## Phase 3 — Tickets (`to-tickets`)

You do this. Read and follow `.claude/skills/to-tickets/SKILL.md`. Break the spec into tracer-bullet tickets.

- Quiz the human on the breakdown (granularity, blocking edges, merge/split) and iterate until they approve.
- Write **one file per ticket** at `docs/requirements/<slug>/tickets/<NN>-<ticket-slug>.md`, numbered from `01`, blockers first. No application/production code.
- Each file must include: title, status, related spec section, acceptance criteria, **Depends on** (blocking edges), attempts counter starting at `0/2`, and an empty `## Execution log`.

Gate: that tickets directory has at least one ticket file, and the human approved the breakdown.

## Phase 4 — Execute (`execute`) then review this ticket

One ticket at a time, dependency order (`execution.mode`, default sequential). Do not start the next ticket until this ticket's gate is met.

### 4a Implement

Dispatch per § Delegation — on Claude Code, the Agent tool with `subagent_type: "execute"`, after writing the handoff log yourself. Payload: `{ subAgent: "execute", task, context: { ticket, specPath, action: "implement" } }`.

`execute` creates the ticket branch (`<slug>/<NN>-<ticket-slug>`, off its blocker's branch or `main`), then runs this loop (max two attempts):

1. Implement.
2. Run **unit tests and integration tests** on the host via execute's Bash.
3. Both pass → stop the loop. **Leave the changes uncommitted** on the ticket branch and return success to 4b, with a diff summary and the actual test output (command run, pass/fail counts) — there is no generated report, this returned summary plus the ticket file's own `## Execution log` row is the only test evidence you get. `execute` does not commit here and does not seek approval — a sub-agent cannot block mid-task on a human answer, so the approval gate now lives in the orchestrator (4b), not in `execute`.
4. Fail → log the failure output, then: if this was attempt 1/2, fix and loop back to step 1 (one retry). If this was attempt 2/2, stop and report failure with the actual output. Do not try a third time.

`execute` does not check Acceptance Criteria and does not mark `Status` done.

Skills and rules for 4a implement: skills `implement` + `tdd` (from `.claude/skills/`), rules `coding-standard`, `security-common`, `security-backend`, `security-frontend` (from `.claude/rules/`). `git-convention` is not needed here — nothing gets committed yet.

The Agent tool injects **nothing** — it only loads `.claude/agents/execute.md` and grants tools. So your task string must tell `execute` to Read both sets itself before writing code, and `execute.md` opens by telling it to do exactly that. Do not assume the skill content arrived: an `execute` that never read `implement`/`tdd` is an `execute` with no test-first guidance and no idea what a tracer bullet is.

### 4b Review this ticket, then the human approval gate

You do this. After `execute` reports success, load `.claude/rules/coding-standard.md` and the security rules (`security-common`, plus `security-backend` / `security-frontend` if this ticket touched that surface). Then review **this ticket's branch** — still uncommitted at this point — against `spec.md` and **this ticket's** acceptance criteria (`code-review` skill: Standards axis = those rules, Spec axis = spec + AC). Do not skip to the next ticket. Do not load `git-convention` here — that belongs to the commit dispatch below.

Check the test result `execute` returned (command run, pass/fail counts) and this ticket file's own `## Execution log` table as part of this review — both unit and integration must show a pass on the latest attempt for this to count as tests-passing; if either kind is missing or ambiguous, treat that as a failed gate, not a pass, and do not check AC off it. Note in your review which AC the tests actually covered.

Reading a diff is review, not implementation, so you do hold read-only git (`git diff`/`log`/`show`/`rev-parse`/`merge-base`, allowlisted in `.claude/settings.json`). `git diff <base>` shows uncommitted working-tree changes just as well as committed ones, so this is enough even though nothing has landed yet. The fixed point is this ticket's base branch — its blocker's branch, or `main` for an unblocked ticket. Two deviations from the upstream `code-review` skill: the spec source is always `docs/requirements/<slug>/spec.md` plus this ticket's AC, so skip its issue-tracker lookup and never ask for `/setup-matt-pocock-skills`; and mutating git (`push`, `reset --hard`, `clean`) stays denied to you.

If the review finds a miss, stop here (see the STOP rule in 4c) — do not ask for human approval on a diff that already failed review.

If the review is clean, the human approval gate is yours to run, directly in this chat: present what changed, your review verdict, and the test result, then ask for an explicit yes/no to commit. Blocking, no skip, no timeout — the same rule as Phase 1. This is the harness's one human checkpoint; nothing here may auto-approve.

- Approved → write a new handoff log, then dispatch `execute` again with `{ subAgent: "execute", task, context: { ticket, specPath, action: "commit", commitSummary } }`. This second call only runs `git add` + `git commit` on the already-checked-out ticket branch per `git-convention.md` — it does not re-implement or re-test. Record the commit hash it returns in the ticket file.
- Rejected → stop the whole ticket (see 4c); do not commit.

### 4c Check Acceptance Criteria

Once the commit dispatch above succeeds, mark `- [x]` each criterion your review confirmed in that ticket file. Leave unmet criteria as `- [ ]`. Only then mark `Status` done.

**Hard stop — do not dispatch the next ticket's implement call until all four are true:**
1. The human gave an explicit yes to the approval ask in 4b, in this chat, for this ticket.
2. The commit dispatch (`action: "commit"`) returned a real commit hash, and you recorded it in the ticket file.
3. Every AC this ticket claims is marked `- [x]`, backed by what the review actually confirmed — not marked pass by default.
4. `Status` in the ticket file is set to done.

There is no "review looked fine, moving on" shortcut — a clean review only authorizes the approval *ask*, not the move to the next ticket. If any of the four is missing, you are mid-ticket, not between tickets: stay here and resolve it (or stop, per below) before touching ticket N+1.

- All four true → next ticket.
- Two failed test attempts, review finds a miss, human rejects the approval, or any AC still unchecked → stop the whole task, tell the human which ticket/criteria and why, wait.

The tip of the work lives on the last completed ticket's branch, not `main`.

## Phase 5 — Review (whole task)

Once every ticket has its AC checked, load the same Standards rules as 4b. Compare the tip branch against `spec.md` and every ticket's acceptance criteria (`code-review` skill). Confirm the `[x]` marks still match the code. Write `docs/requirements/<slug>/review.md`. Present a summary and ask approve/reject. Wait for an explicit human answer.

Confirm every ticket's own `## Execution log` table shows a passing final attempt for both unit and integration tests, and cite that in `review.md`. Call out explicitly any ticket whose log doesn't show both passing, or whose log is missing entirely — the latter means its tests were never recorded, and the decision must not be made without flagging that as unverified.

- Approve → append a dated lessons section to `LEARNING.md`. Stop.
- Reject → uncheck the implicated AC, re-run Phase 4 for those tickets only, then Phase 5 again.

## Delegation

Only Phase 4a is delegated, in **two dispatches per ticket**: implement (§4a) and, only after your own human approval ask in §4b succeeds, commit. Write/mutate `Bash` is `execute` only — you hold read-only git for review (see 4b). The approval gate itself is not a tool call: you ask directly in this chat and block for a real answer, the same way you do in Phase 1. Every commit still waits on that explicit human yes. Per-ticket review and AC checkboxes are yours (4b–4c), not `execute`.

**Dispatch.** Use the Agent tool with `subagent_type: "execute"`. It loads `.claude/agents/execute.md` and grants the real tools, so `execute` can branch, edit, test, and (on the second dispatch) commit. It does **not** inject skills or rules — so `execute` Reads them itself (see 4a). Write the handoff log yourself with `Write` before each dispatch.

Never send the sub-agent your raw conversation history — only the payload below.

**`task` must be self-contained, not a one-liner.** `execute` sees nothing you saw in Phase 1–3 except what's in `task` and `context`. A short prompt ("implement ticket 03") forces `execute` to guess scope from the ticket file alone — exactly the kind of guess that produces scope drift the orchestrator is supposed to have already resolved by grilling. Every `task` string must spell out, inline:
- The acceptance criteria for this ticket, copied in — not just a path to go read.
- The specific `spec.md` section(s) this ticket implements, and any constraint from `CONTEXT.md`/`docs/adr/` that bears on it.
- Any prototype, sketch, or reference artifact from Phase 1 grilling that shows the intended shape (state the artifact's path or content explicitly — never assume `execute` will find or infer it).
- What is explicitly out of scope for this ticket, if the boundary is easy to overrun.

If you can't fill in all four from what Phase 1–3 produced, that's a signal Phase 1's frontier wasn't actually empty — go back and grill, don't paper over the gap with a vague `task`.

**Handoff log.** Before every sub-agent call, persist the exact payload you are about to send:

`docs/requirements/<slug>/handoffs/<ISO-timestamp>-<subAgent>.json`

```json
{ "subAgent": "execute", "task": "<task>", "context": { "ticket": "<path>", "specPath": "<path>", "action": "implement" } }
```

The commit dispatch's `context` additionally carries `"action": "commit"` and a `commitSummary` describing what the human approved. Write this file yourself with `Write` — same shape, same path — before each of the two dispatches.

## Rules (`.claude/rules/`)

Do not load these in Phase 1–3. They are how-to-write-code, not grilling/spec/tickets.

| When | Load | Why |
|---|---|---|
| **4a Implement** | `coding-standard`, `security-common`, `security-backend`, `security-frontend` (+ skills `implement`, `tdd`) | Write against them. The Agent tool injects nothing, so `execute` Reads them itself — `.claude/agents/execute.md` names every one of these files at the top. |
| **4a commit dispatch** | `git-convention` | Subject/body of the commit `execute` makes after your human approval ask in 4b. |
| **4b / Phase 5 review** | `coding-standard`, `security-common`, + backend/frontend if that surface is in the diff | Standards axis of `code-review`. Not `git-convention`. |
| **sdlc-checklist** (before a PR, outside `/build`) | coding-standard + the three security files | Pre-PR gate. |

## Pointers

- `README.md` — why the harness exists, setup, directory map.
- `.claude/commands/build.md` — full `/build` orchestrator prompt (gates, retry, reject loop).
- `.claude/agents/execute.md` — when changing the `execute` role or tool scope.
- `.claude/rules/` — when to load: see Rules section (4a implement + 4b/5 Standards review, not Phase 1–3).
- `.claude/skills/grill-with-docs/SKILL.md` — Phase 1 entry (loads `grilling` + `domain-modeling`).
- `.claude/skills/to-spec/SKILL.md` — Phase 2 spec template and process.
- `.claude/skills/to-tickets/SKILL.md` — Phase 3 vertical slices and ticket template.
- `.claude/skills/code-review/SKILL.md` — Phase 4b per-ticket review and Phase 5 whole-task review.
- `docs/requirements/<slug>/handoffs/` — exact context sent to each sub-agent.
- `.claude/harness.json` — `execution.mode`, `permissions` (mirrors `execute.md`'s `tools:` frontmatter), `approval.autoApprove` (must stay `false`). (Claude Code's own settings live in `.claude/settings.json`.)
- `LEARNING.md` — prior-run lessons; read at `/build` start and before each execute ticket.

## Plan Mode

- Extremely concise. Sacrifice grammar for concision.
- End with unresolved questions, if any.
