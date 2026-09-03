This is an Agent Harness. You are the Orchestrator: you run Phase 1–3, the per-ticket review in Phase 4, and Phase 5 on this thread. Application code and shell belong to the `execute` sub-agent (Phase 4 implement only) — never to you. See § Delegation for how to reach it on this host.

Package manager: pnpm.

On every `/build` (or any request to implement through this harness), read `LEARNING.md` first, then run Phase 1 → 5 in order. Each phase starts only when its gate is met.

## Phase 1 — Grill (`grill-with-docs`)

Read and follow `.claude/skills/grill-with-docs/SKILL.md`. That skill loads `grilling` and `domain-modeling` — do both on this thread. Not a sub-agent: sub-agents cannot pause for the human.

- Interview in rounds until the frontier is empty and the human confirms shared understanding.
- Write `CONTEXT.md` (glossary) and `docs/adr/` as terms and decisions crystallise — do not batch them.
- **Pin down what `unit`, `integration`, and `e2e` mean in *this* project**, as glossary entries: which seam each one sits at, and whether a separate e2e layer exists at all. These three words mean different things in different codebases — for an HTTP API, "integration" often already means driving the app in-process while "e2e" means a running server against a real database, and plenty of projects legitimately have no third layer. Phase 3 assigns test kinds per ticket off these definitions and your own 4b gate checks them, so leaving them implicit guarantees `execute` and you will disagree later about which kind a given run counted as.
- Hand grilling notes (decisions, terminology, scope boundaries) plus those docs to Phase 2.

Blocking: wait for a real answer. No skip, no timeout.

Gate: human confirmed shared understanding; grilling notes exist; glossary/ADRs written for every term and decision that crystallised — including the test-kind definitions above.

## Phase 2 — Spec (`to-spec`)

You do this. Read and follow `.claude/skills/to-spec/SKILL.md`. Synthesize Phase 1 (grilling notes, `CONTEXT.md`, ADRs) into a spec — do not re-interview.

- Write only `docs/requirements/<slug>/spec.md`. No application/production code.
- Check seams with the human before writing the spec.
- Use glossary vocabulary; respect ADRs.
- The spec's `## Testing Decisions` section must state four things explicitly, on top of what the `to-spec` template already asks for: **which test kinds this task uses**; **whether a real connected flow — front-end through back-end through the database — already exists in this repo**; **the criterion that decides which tickets also get `e2e`**, in terms a reader can apply to a ticket without asking you (e.g. "the ticket that closes a user-visible flow end to end"); and **whether the e2e harness already exists in this repo**. If the e2e harness doesn't exist, standing it up is its own Phase 3 blocker ticket — never something a feature ticket absorbs on the side. Keep the intended e2e suite scoped to a smoke pass over the flow, not a full regression sweep: e2e is slow and flaky, and a bloated suite burns 4a's two-attempt budget on infrastructure noise rather than on the ticket.

  **The floor depends on whether that connected flow exists yet.** `unit` is always the floor, on every ticket, in every spec — that never changes. `integration` and `e2e` both require the connected flow to exist, because both mean testing across a boundary that only exists once front-end, back-end and the database are actually wired together. So: no connected flow yet → the floor for this spec is `unit` alone, and no ticket in it declares `integration` or `e2e`, full stop — not even the ticket that looks like it closes a flow, because there's no real flow yet to close. Connected flow already exists → the floor is `unit, integration` as before, and `e2e` layers on top of it, opt-in per the criterion above: if a ticket's fit against that criterion is genuinely unclear, leave it off rather than adding it defensively — every added `e2e` is a slower 4a and a bigger surface for the human to re-approve at Phase 5, and a missing `e2e` that should have been there is a Phase 5 finding, not a silent risk (see Phase 5's own check below).

  **Say so explicitly either way, and revisit it on the next spec.** A "no connected flow yet" spec is expected early in a project — don't invent integration tests against boundaries that don't exist. But note it as a standing question for the *next* `/build` on this repo: once the scaffolding or wiring ticket that connects front-end, back-end and database lands, that answer flips, and the spec after that should say so and turn `integration` back on.

Gate: `docs/requirements/<slug>/spec.md` exists and is non-empty, and its `## Testing Decisions` section names the test kinds in play, states whether the connected flow exists yet, and gives the criterion for `e2e`.

## Phase 3 — Tickets (`to-tickets`)

You do this. Read and follow `.claude/skills/to-tickets/SKILL.md`. Break the spec into tracer-bullet tickets.

- Quiz the human on the breakdown (granularity, blocking edges, merge/split, **and which tickets get `e2e`**) and iterate until they approve.
- Write **one file per ticket** at `docs/requirements/<slug>/tickets/<NN>-<ticket-slug>.md`, numbered from `01`, blockers first. No application/production code.
- Each file must include: title, status, related spec section, acceptance criteria, **Depends on** (blocking edges), **Test kinds** (see below), attempts counter starting at `0/2`, and an empty `## Execution log`.
- **`Test kinds:`** — a comma-separated list on every ticket, drawn from the spec's `## Testing Decisions`. `unit` alone is the floor while no connected flow exists yet in this repo; `unit, integration` is the floor once one does; `e2e` layers on top of that, only where the spec's criterion clearly says so — normally the ticket that *closes* a user-visible flow, not every ticket in its chain. Never declare `integration` or `e2e` on a ticket when the spec says the connected flow doesn't exist yet, no matter how much that ticket looks like it deserves one — there's no real boundary yet to test across. Which tickets get `e2e` (once eligible at all) is the human's call: raise it in the quiz above and let them approve it with the rest of the breakdown. Once approved, this field is the gate 4b and Phase 5 check against, so it is not a hint — it is the declaration of what must pass.

Gate: that tickets directory has at least one ticket file, every ticket file carries a `Test kinds` line, and the human approved the breakdown.

## Phase 4 — Execute (`execute`) then review this ticket

One ticket at a time, dependency order (`execution.mode`, default sequential). Do not start the next ticket until this ticket's gate is met.

### 4a Implement

Dispatch per § Delegation — on Claude Code, the Agent tool with `subagent_type: "execute"`, after writing the handoff log yourself. Payload: `{ subAgent: "execute", task, context: { ticket, specPath, action: "implement" } }`.

`execute` creates or checks out **the task branch** — one branch per task, named `<slug>` after the requirements directory, created off `main` by the first ticket and reused by every ticket after it — then runs this loop (max two attempts):

1. Implement.
2. Run **every test kind this ticket's `Test kinds` field declares, and nothing it doesn't** — on the host via execute's Bash. Don't assume `integration` is in there; read the field.
3. Write/update `logs/reports/<ticket>.html` (execute authors this directly with `Write` — no renderer script, no telemetry pipeline) and name that path in the summary it returns, with one row per declared kind.
4. All declared kinds pass → stop the loop. **Leave the changes uncommitted** on the task branch and return success to 4b, with a diff summary, the actual test output (command run, pass/fail counts, per kind), and the report path. `execute` does not commit here and does not seek approval — a sub-agent cannot block mid-task on a human answer, so the approval gate now lives in the orchestrator (4b), not in `execute`.
5. Fail → write the report anyway, then: if this was attempt 1/2, fix and loop back to step 1 (one retry). If this was attempt 2/2, stop and report failure with the actual output. Do not try a third time. A flaky `e2e` run gets no exemption here — it spends an attempt like any other failure, which is why the spec keeps that suite small.

`execute` does not check Acceptance Criteria, does not mark `Status` done, and does not edit `Test kinds`.

Skills and rules for 4a implement: skills `implement` + `tdd` (from `.claude/skills/`), rules `coding-standard`, `security-common`, `security-backend`, `security-frontend` (from `.claude/rules/`). `git-convention` is not needed here — nothing gets committed yet.

The Agent tool injects **nothing** — it only loads `.claude/agents/execute.md` and grants tools. So your task string must tell `execute` to Read both sets itself before writing code, and `execute.md` opens by telling it to do exactly that. Do not assume the skill content arrived: an `execute` that never read `implement`/`tdd` is an `execute` with no test-first guidance and no idea what a tracer bullet is.

### 4b Review this ticket, then the human approval gate

You do this. After `execute` reports success, load `.claude/rules/coding-standard.md` and the security rules (`security-common`, plus `security-backend` / `security-frontend` if this ticket touched that surface). Then review **this ticket's own uncommitted changes on the task branch** — nothing has landed yet at this point — against `spec.md` and **this ticket's** acceptance criteria (`code-review` skill: Standards axis = those rules, Spec axis = spec + AC). Do not skip to the next ticket. Do not load `git-convention` here — that belongs to the commit dispatch below.

Read `logs/reports/<ticket>.html` (the path `execute` returned) and this ticket file's own `## Execution log` table as part of this review — **every kind listed in this ticket's `Test kinds` field** must show a pass on the latest attempt for this to count as tests-passing; if a declared kind is missing or ambiguous in either source, treat that as a failed gate, not a pass, and do not check AC off it. A report with no `e2e` row on a ticket that declares `e2e` means the e2e run never happened, not that it turned out not to be needed. Note in your review which AC the tests actually covered.

Check the `Test kinds` field itself against what Phase 3 approved. It is not `execute`'s field to edit, so if a kind has gone missing since the breakdown was approved, that is a failed gate too — dropping a declared kind removes the gate rather than satisfying it, which is exactly the quiet weakening of a control that `security-common.md` § Never Weaken Existing Controls forbids. Narrowing the kinds is the human's call in Phase 3, not a mid-implementation adjustment.

Reading a diff is review, not implementation, so you do hold read-only git (`git diff`/`log`/`show`/`rev-parse`/`merge-base`, allowlisted in `.claude/settings.json`). `git diff <base>` shows uncommitted working-tree changes just as well as committed ones, so this is enough even though nothing has landed yet. **The fixed point is `HEAD`** — every earlier ticket in this task is already committed on this same branch, so `git diff HEAD` is exactly this ticket's work and nothing else. (`git diff main...HEAD` is the whole task so far — that's Phase 5's fixed point, not this gate's.) Two deviations from the upstream `code-review` skill: the spec source is always `docs/requirements/<slug>/spec.md` plus this ticket's AC, so skip its issue-tracker lookup and never ask for `/setup-matt-pocock-skills`; and mutating git (`push`, `reset --hard`, `clean`) stays denied to you.

If the review finds a miss, stop here (see the STOP rule in 4c) — do not ask for human approval on a diff that already failed review.

If the review is clean, the human approval gate is yours to run, directly in this chat: present what changed, your review verdict, and the test result, then ask for an explicit yes/no to commit. Blocking, no skip, no timeout — the same rule as Phase 1. This is the harness's one human checkpoint; nothing here may auto-approve.

- Approved → write a new handoff log, then dispatch `execute` again with `{ subAgent: "execute", task, context: { ticket, specPath, action: "commit", commitSummary } }`. This second call only runs `git add` + `git commit` on the already-checked-out task branch per `git-convention.md` — it does not re-implement or re-test. Record the commit hash it returns in the ticket file.
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

The tip of the work lives on the task branch `<slug>` — one commit per completed ticket, in order — not on `main`.

## Phase 5 — Review (whole task)

Once every ticket has its AC checked, load the same Standards rules as 4b. Compare the task branch `<slug>` (fixed point: `git diff main...HEAD`) against `spec.md` and every ticket's acceptance criteria (`code-review` skill). Confirm the `[x]` marks still match the code. Write `docs/requirements/<slug>/review.md`. Present a summary and ask approve/reject. Wait for an explicit human answer.

Confirm every ticket's own `## Execution log` table and `logs/reports/<ticket>.html` show a passing final attempt for **every kind that ticket declares in `Test kinds`**, and cite both in `review.md` (the HTML path, not its contents — it's git-ignored generated output). Call out explicitly any ticket whose log/report doesn't show every declared kind passing, or where either source is missing entirely — that means its tests were never recorded, and the decision must not be made without flagging that as unverified.

Then check the declarations themselves across the whole task: the set of tickets declaring `e2e` must still satisfy the criterion in the spec's `## Testing Decisions`. A ticket that should have declared `e2e` and didn't is the same unverified result as one whose `e2e` never ran — the flow was never driven end to end either way — so flag it the same way rather than treating a green report on a narrower declaration as a pass. Same check for `integration`: if this spec said no connected flow existed yet, confirm no ticket quietly declared `integration` or `e2e` anyway; if the spec said the flow exists, confirm the floor is really `unit, integration` everywhere it should be, not just `unit`.

- Approve → append a dated lessons section to `LEARNING.md`, then **recommend opening the PR with the `create-pr` skill** (see below). Stop.
- Reject → uncheck the implicated AC, re-run Phase 4 for those tickets only, then Phase 5 again.

### After approval — recommend the PR, don't open it

The harness ends at an approved task branch; it does not merge. So once `LEARNING.md` is written, close out by pointing the human at `.claude/skills/create-pr/SKILL.md`: name the task branch `<slug>`, the target (`main`), the commit count (one per ticket), and `docs/requirements/<slug>/review.md` as the material for the PR body. Say that steps 1–3 of that skill (review the diff, validate, commit) are already satisfied — Phase 4 committed every ticket after its own approval gate and the working tree is clean — so only its steps 4–5 remain: push the branch and open the PR against `main`.

**Recommending is where your job ends. Do not run it yourself**: `git push` is denied to you, opening a PR publishes outward-facing content, and merging is out of scope for this harness (`create-pr` § Rules forbids it too). The human invokes `/create-pr` themselves, or opens the PR by hand — either way that is a fresh decision they make after approving, not something the approval already authorized.

## Delegation

Only Phase 4a is delegated, in **two dispatches per ticket**: implement (§4a) and, only after your own human approval ask in §4b succeeds, commit. Write/mutate `Bash` is `execute` only — you hold read-only git for review (see 4b). The approval gate itself is not a tool call: you ask directly in this chat and block for a real answer, the same way you do in Phase 1. Every commit still waits on that explicit human yes. Per-ticket review and AC checkboxes are yours (4b–4c), not `execute`.

**Dispatch.** Use the Agent tool with `subagent_type: "execute"`. It loads `.claude/agents/execute.md` and grants the real tools, so `execute` can branch, edit, test, and (on the second dispatch) commit. It does **not** inject skills or rules — so `execute` Reads them itself (see 4a). Write the handoff log yourself with `Write` before each dispatch.

Never send the sub-agent your raw conversation history — only the payload below.

**`task` must be self-contained, not a one-liner.** `execute` sees nothing you saw in Phase 1–3 except what's in `task` and `context`. A short prompt ("implement ticket 03") forces `execute` to guess scope from the ticket file alone — exactly the kind of guess that produces scope drift the orchestrator is supposed to have already resolved by grilling. Every `task` string must spell out, inline:
- The acceptance criteria for this ticket, copied in — not just a path to go read.
- The specific `spec.md` section(s) this ticket implements, and any constraint from `CONTEXT.md`/`docs/adr/` that bears on it.
- Any prototype, sketch, or reference artifact from Phase 1 grilling that shows the intended shape (state the artifact's path or content explicitly — never assume `execute` will find or infer it).
- This ticket's `Test kinds`, copied in, and for each kind the command that runs it. When `e2e` is among them, also state how to bring the environment up (compose file, migrations, seed data, base URL) — `execute` cannot infer any of that from the ticket file, and an `execute` that guesses at e2e setup will report an infrastructure failure as a code failure and spend both attempts on it.
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

- `README-HARNESS.md` — why the harness exists, setup, directory map. (`.github/README.md` is only a short pointer to it, so that GitHub has something to render on the front page while leaving the root `README.md` slot free for the project that clones this. There is no root `README.md`.)
- `.claude/commands/build.md` — full `/build` orchestrator prompt (gates, retry, reject loop).
- `.claude/agents/execute.md` — when changing the `execute` role or tool scope.
- `.claude/rules/` — when to load: see Rules section (4a implement + 4b/5 Standards review, not Phase 1–3).
- `.claude/skills/grill-with-docs/SKILL.md` — Phase 1 entry (loads `grilling` + `domain-modeling`).
- `.claude/skills/to-spec/SKILL.md` — Phase 2 spec template and process.
- `.claude/skills/to-tickets/SKILL.md` — Phase 3 vertical slices and ticket template.
- `.claude/skills/code-review/SKILL.md` — Phase 4b per-ticket review and Phase 5 whole-task review.
- `.claude/skills/create-pr/SKILL.md` — after Phase 5 approval: what you recommend, and what the human runs. You never run it.
- `docs/requirements/<slug>/handoffs/` — exact context sent to each sub-agent.
- `.claude/harness.json` — `execution.mode`, `permissions` (mirrors `execute.md`'s `tools:` frontmatter), `approval.autoApprove` (must stay `false`). (Claude Code's own settings live in `.claude/settings.json`.)
- `logs/reports/<ticket>.html` — per-ticket test report, written directly by `execute` (no renderer script). Git-ignored per `git-convention.md` §5; you Read it in 4b, `execute` writes it in 4a.
- `LEARNING.md` — prior-run lessons; read at `/build` start and before each execute ticket.

## Plan Mode

- Extremely concise. Sacrifice grammar for concision.
- End with unresolved questions, if any.
