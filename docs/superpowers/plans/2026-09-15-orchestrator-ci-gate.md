# Orchestrator CI Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Phase 4b Orchestrator-owned local CI gate (unit + lint + typecheck + build) with chat report, Execution-log rows, and CI-fix re-dispatch to `execute` (shared 0/2 attempts) before the human approval ask.

**Architecture:** Doc-driven harness change. New skill `orchestrator-ci` holds the runnable procedure; `CLAUDE.md` / `build.md` point at it from §4b; `execute.md` and the ticket template learn CI-fix + log rows. No application code, no GitHub Actions.

**Tech Stack:** Markdown skills/commands, existing `.claude/settings.json` Bash allowlist for `pnpm test:*` / `pnpm run lint|typecheck|build`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-15-orchestrator-ci-gate-design.md`
- CI runs only in Phase 4b after clean review, before human approval — never Phase 5.
- Fixed commands in order: `pnpm test:unit`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`.
- Run all four then summarize; missing script = FAIL for that step.
- Fail → tell human + re-dispatch `execute` implement (CI-fix); share ticket Attempts `0/2`.
- `approval.autoApprove` stays `false`.
- Do not add `.github/workflows`.
- Follow `.claude/skills/writing-for-agents/SKILL.md` when writing skills / CLAUDE.md pointers.

---

## File map

| File | Responsibility |
|---|---|
| `.claude/skills/orchestrator-ci/SKILL.md` | Procedure: run suite, report, PASS/FAIL branches, attempts, log row |
| `CLAUDE.md` | Orchestrator runbook: insert gate in §4b; Bash exception; Delegation; Pointers; hard stop; Phase 5 log cite |
| `.claude/commands/build.md` | Mirror §4b sequence for `/build` |
| `.claude/agents/execute.md` | CI-fix implement payload expectations |
| `harness/requirements-templates/tickets/01-example-ticket.md` | Execution log comment + example CI row |
| `README-HARNESS.md` | Workflow text + replace "No CI…" with local Orchestrator CI gate |

---

### Task 1: Create `orchestrator-ci` skill

**Files:**
- Create: `.claude/skills/orchestrator-ci/SKILL.md`

**Interfaces:**
- Consumes: design § Command suite, Report format, Failure → re-dispatch
- Produces: skill named `orchestrator-ci` that CLAUDE.md / build.md will point to

- [ ] **Step 1: Write the skill file**

Create `.claude/skills/orchestrator-ci/SKILL.md` with exactly this content:

```markdown
---
name: orchestrator-ci
description: "Phase 4b Orchestrator local CI gate. After a clean per-ticket review and before the human approval ask, run pnpm test:unit + lint + typecheck + build, post a pass/fail report (with failure excerpts), append an Execution log row, and on FAIL re-dispatch execute for a CI-fix (shared Attempts 0/2). Use when running /build Phase 4b CI, orchestrator CI, or validating a ticket before approve-to-commit."
---

# Orchestrator CI (Phase 4b)

You are the Orchestrator. Run this skill only after the per-ticket review in
Phase 4b is **clean**. Do not run it on a review miss. Do not run it in
Phase 5. Do not ask for human approval until this skill returns PASS.

## Steps

### 1. Run the suite (all four, always)

On the host, via Bash, in this order — run every step even if an earlier one
fails, so the report shows the full picture:

1. `pnpm test:unit`
2. `pnpm run lint`
3. `pnpm run typecheck`
4. `pnpm run build`

If a script is missing or not runnable in this repo, mark that step **FAIL**
(same class of blocker as a missing unit gate). Do not skip it or substitute
another command.

### 2. Post the report in chat (PASS and FAIL)

```markdown
## Orchestrator CI (ticket NN)
| Step | Command | Result |
| 1 | pnpm test:unit | PASS / FAIL |
| 2 | pnpm run lint | PASS / FAIL |
| 3 | pnpm run typecheck | PASS / FAIL |
| 4 | pnpm run build | PASS / FAIL |

Overall: PASS | FAIL

### Failures
- <command>: <short excerpt of the error / failing location>
```

On PASS, omit `### Failures` or leave it empty. Always include the table and
the Overall line. Quote enough stderr/stdout that a human can see *where* it
broke (file, test name, or first actionable error lines) — not only "failed".

### 3. Append the ticket Execution log row

Add one row to this ticket's `## Execution log` (Orchestrator writes this
row, not `execute`):

| Attempt | Agent | Skill(s) | Source files read | Rule/step followed | What was done | Outcome |
|---|---|---|---|---|---|---|
| `<N/2>` | `orchestrator` | `orchestrator-ci` | `.claude/skills/orchestrator-ci/SKILL.md` | suite steps 1–4 | ran unit+lint+typecheck+build; Overall PASS\|FAIL | `success — CI PASS` or `failure — CI FAIL; see Failures` |

Use the same Attempt fraction as the implement dispatch that just returned
(e.g. if execute just finished attempt `1/2`, this CI row is also under `1/2`).

### 4. Branch on Overall

**PASS** → return to CLAUDE.md §4b human approval ask. Present the CI report
alongside the review verdict and `execute`'s unit output. Do not auto-approve.

**FAIL** → tell the human CI failed (report already posted). Then:

1. If this ticket's Attempts would exceed `2/2` after another implement
   dispatch, **STOP** the ticket (hard stop). Do not dispatch again.
2. Otherwise write a handoff log and re-dispatch `execute` with
   `action: "implement"` and a self-contained `task` that states:
   - this is a **CI-fix** retry (not a new feature slice);
   - which steps failed + the failure excerpts;
   - the original AC, spec sections, security rule choice, out-of-scope,
     and `pnpm test:unit` gate (same Delegation rules as a normal implement);
   - leave changes uncommitted; do not check AC; do not mark Status done.
3. When `execute` returns success, **always** re-review `git diff HEAD`.
   Review miss → stop (no CI). Review clean → run this skill again from
   step 1.

Attempts are the ticket's shared `0/2` counter — initial implement and
CI-fix implement dispatches share that budget. Orchestrator CI runs are
not a separate budget.
```

- [ ] **Step 2: Verify the skill file**

Run:

```bash
test -f .claude/skills/orchestrator-ci/SKILL.md && rg -n "pnpm run build|Overall: PASS|CI-fix|Attempts" .claude/skills/orchestrator-ci/SKILL.md
```

Expected: file exists; matches for all four patterns.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/orchestrator-ci/SKILL.md
git commit -m "$(cat <<'EOF'
✨ feat: add orchestrator-ci skill for Phase 4b local CI gate

EOF
)"
```

---

### Task 2: Wire the gate into `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: skill `orchestrator-ci` from Task 1
- Produces: Orchestrator runbook that always loads the skill in §4b before approval

- [ ] **Step 1: Fix the opening ownership sentence**

Replace the first paragraph's claim that shell belongs only to `execute` so CI Bash is allowed. Change the opening to:

```markdown
This is an Agent Harness. You are the Orchestrator: you run Phase 1–3, the per-ticket review and Orchestrator CI gate in Phase 4, and Phase 5 on this thread. Application code and mutating implementation shell belong to the `execute` sub-agent (Phase 4 implement / commit only) — never to you. Exception: in Phase 4b after a clean review you run the local CI suite yourself via Bash per `.claude/skills/orchestrator-ci/SKILL.md`. See § Delegation for how to reach `execute` on this host.
```

- [ ] **Step 2: Insert the CI gate into §4b**

In `### 4b Review this ticket, then the human approval gate`, after the paragraph that ends with "do not ask for human approval on a diff that already failed review." and **before** the paragraph that currently starts "If the review is clean, the human approval gate…", replace that "If the review is clean, the human approval gate…" paragraph with:

```markdown
If the review is clean, Read and follow `.claude/skills/orchestrator-ci/SKILL.md` **before** asking for human approval. That skill runs the local CI suite (`pnpm test:unit`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`), posts the pass/fail report (with failure excerpts) in this chat, and appends an Orchestrator row to the ticket's `## Execution log`. On CI FAIL: tell the human, then re-dispatch `execute` with a CI-fix implement payload per that skill (shared Attempts `0/2`); after `execute` returns, always re-review `git diff HEAD` before running CI again. On CI PASS only: the human approval gate is yours to run, directly in this chat — present what changed, your review verdict, the `execute` unit result, and the Orchestrator CI report, then ask for an explicit yes/no to commit. Blocking, no skip, no timeout — the same rule as Phase 1. This is the harness's one human checkpoint; nothing here may auto-approve. Do not ask for approval while CI is FAIL or while a CI-fix dispatch is still owed.
```

Also update the earlier sentence in §4b that says you "hold read-only git" so it does not contradict CI Bash — keep read-only **mutating** git denial, but add that CI Bash is allowed:

After "Reading a diff is review, not implementation, so you do hold read-only git (`git diff`/`log`/`show`/`rev-parse`/`merge-base`, allowlisted in `.claude/settings.json`)." insert:

```markdown
 Separately, after a clean review you may run the Orchestrator CI Bash commands allowlisted in `.claude/settings.json` (`pnpm test:*`, `pnpm run lint|typecheck|build`) per `orchestrator-ci` — that is validation, not implementation.
```

- [ ] **Step 3: Update Delegation + hard stop + Phase 5 log + Pointers + Rules**

1. In `## Delegation`, replace "Write/mutate `Bash` is `execute` only — you hold read-only git for review (see 4b)." with:

```markdown
Write/mutate implementation `Bash` and all commits are `execute` only — you hold read-only git for review, plus the Orchestrator CI Bash suite in §4b per `orchestrator-ci`.
```

2. Also note under Delegation that implement dispatches include **CI-fix** retries from §4b (still `action: "implement"`), and that each such dispatch counts toward the ticket's Attempts `0/2`.

3. In §4c hard stop bullet list, extend the stop conditions line to include exhausted attempts after CI FAIL:

```markdown
- Two failed test/CI-fix attempts, review finds a miss, Orchestrator CI still FAIL after Attempts are exhausted, human rejects the approval, or any AC still unchecked → stop the whole task, tell the human which ticket/criteria and why, wait.
```

4. In Phase 5, after the sentence that confirms `pnpm test:unit` in the Execution log, add:

```markdown
Also confirm the latest Orchestrator CI row for each ticket shows Overall PASS; if missing or FAIL, flag it in `review.md` as unverified (do not re-run CI in Phase 5).
```

5. In `## Rules` table, add a row:

```markdown
| **4b Orchestrator CI** | skill `orchestrator-ci` | Local CI suite + report before human approval ask. |
```

6. In `## Pointers`, add after the `code-review` bullet:

```markdown
- `.claude/skills/orchestrator-ci/SKILL.md` — Phase 4b local CI gate after clean review, before human approval.
```

- [ ] **Step 4: Verify CLAUDE.md wiring**

Run:

```bash
rg -n "orchestrator-ci|CI-fix|pnpm run build|Orchestrator CI" CLAUDE.md
```

Expected: hits in opening, §4b, Delegation, Rules, Pointers, and Phase 5. Confirm no leftover claim that *all* Bash is execute-only without the CI exception.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
🔧 update: wire Orchestrator CI gate into Phase 4b runbook

EOF
)"
```

---

### Task 3: Mirror the gate in `/build` command

**Files:**
- Modify: `.claude/commands/build.md`

**Interfaces:**
- Consumes: same §4b sequence as Task 2
- Produces: `/build` prompt that cannot skip CI before approval

- [ ] **Step 1: Patch the 4b block**

Replace the paragraph that currently says (approx.):

> If the review is clean, ask the human directly in this chat for approval to commit…

with:

```markdown
If the review is clean, Read and follow `.claude/skills/orchestrator-ci/SKILL.md`
before asking for approval. Run the local CI suite, post the report (pass or
fail, with failure excerpts), and log an Orchestrator row on the ticket.
CI FAIL → tell the human and re-dispatch `execute` for a CI-fix implement
(shared Attempts `0/2`); re-review then re-run CI after it returns. CI PASS
only → ask the human directly in this chat for approval to commit —
blocking, no skip, no timeout, same rule as Phase 1. Present review verdict,
execute unit output, and Orchestrator CI report together. Approved →
write a new handoff log and dispatch `execute` again with
`{ subAgent: "execute", task, context: { ticket, specPath, action: "commit", commitSummary } }`;
this second call only runs `git add` + `git commit` on the already-checked-out
task branch, per `git-convention.md`. Rejected → stop (see below); do not commit.
```

Also extend the STOP bullet that mentions "Two failed test attempts" to include CI-fix / Orchestrator CI exhausted, matching CLAUDE.md.

- [ ] **Step 2: Verify**

Run:

```bash
rg -n "orchestrator-ci|CI-fix" .claude/commands/build.md
```

Expected: both patterns present in the 4b section.

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/build.md
git commit -m "$(cat <<'EOF'
🔧 update: require orchestrator-ci in /build Phase 4b

EOF
)"
```

---

### Task 4: Teach `execute` about CI-fix dispatches

**Files:**
- Modify: `.claude/agents/execute.md`

**Interfaces:**
- Consumes: CI-fix payload shape from `orchestrator-ci`
- Produces: execute behavior that treats CI-fix like implement, guided by failure summary

- [ ] **Step 1: Add a CI-fix subsection under implement mode**

After the bullet that says implement mode stops uncommitted for the orchestrator's approval ask, add:

```markdown
### CI-fix implement dispatches

The orchestrator may call you again with `action: "implement"` after
Orchestrator CI failed in Phase 4b. Treat this like any other implement
dispatch, with these extras:

- The `task` will label itself a **CI-fix** and include which CI steps
  failed plus error excerpts. Fix those failures; do not expand scope into
  unrelated AC.
- Still run your own `pnpm test:unit` loop (max attempts remaining on the
  ticket). Still leave changes uncommitted. Still do not check AC or mark
  Status done. Still do not run lint/typecheck/build as a substitute for
  the orchestrator's CI — that suite is the orchestrator's job after you
  return.
- Bump Attempts / append your Execution log row as usual. The orchestrator
  appends its own CI row separately after it re-runs CI.
```

- [ ] **Step 2: Verify**

Run:

```bash
rg -n "CI-fix|Orchestrator CI" .claude/agents/execute.md
```

Expected: both present.

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/execute.md
git commit -m "$(cat <<'EOF'
🔧 update: document CI-fix implement dispatches for execute

EOF
)"
```

---

### Task 5: Ticket template Execution log

**Files:**
- Modify: `harness/requirements-templates/tickets/01-example-ticket.md`

**Interfaces:**
- Consumes: Execution log row shape from `orchestrator-ci`
- Produces: template comment that orchestrator appends CI rows

- [ ] **Step 1: Update the Execution log comment**

Replace the comment above the table with:

```markdown
<!-- Appended by execute after every implement attempt (one row per attempt).
     Orchestrator also appends one row per Orchestrator CI run (Agent =
     orchestrator, Skill(s) = orchestrator-ci) after Phase 4b CI. -->
```

Optionally add a second example header note under the empty table:

```markdown
<!-- Example Orchestrator CI row (do not leave this placeholder in real tickets):
| 1/2 | orchestrator | orchestrator-ci | .claude/skills/orchestrator-ci/SKILL.md | suite steps 1–4 | ran unit+lint+typecheck+build; Overall PASS | success — CI PASS |
-->
```

- [ ] **Step 2: Verify**

Run:

```bash
rg -n "orchestrator-ci|Orchestrator CI" harness/requirements-templates/tickets/01-example-ticket.md
```

Expected: matches.

- [ ] **Step 3: Commit**

```bash
git add harness/requirements-templates/tickets/01-example-ticket.md
git commit -m "$(cat <<'EOF'
📝 docs: note Orchestrator CI rows in ticket Execution log template

EOF
)"
```

---

### Task 6: Update `README-HARNESS.md`

**Files:**
- Modify: `README-HARNESS.md`

**Interfaces:**
- Consumes: workflow from design + CLAUDE.md
- Produces: human-facing docs that describe the local CI gate (still no shipped GHA)

- [ ] **Step 1: Update the Phase 4 ASCII workflow**

Change the `4b` lines in the workflow code block to:

```text
           4b  orchestrator loads `.claude/rules/` (coding-standard + security)
               then reviews this ticket (code-review vs spec + this ticket's AC)
               review miss → STOP
               review clean → orchestrator-ci (unit+lint+typecheck+build),
                 show report; FAIL → tell you + execute CI-fix (shared 0/2);
                 PASS → ask you, in chat, for approval to commit (blocking)
               approved → handoff log → execute, commit dispatch → commit
```

Also update the intro sentence under Why / Workflow if it lists only review+AC as orchestrator duties — mention Orchestrator CI.

- [ ] **Step 2: Replace the "No CI, no build tooling" section**

Replace that section heading and body with:

```markdown
### Local Orchestrator CI (no shipped GitHub Actions)

The template still ships with no `package.json`, no lockfile, and no
`.github/workflows` CI — a template should not impose a toolchain on the
project that clones it. Mechanical enforcement inside `/build` is the
**Orchestrator CI gate** in Phase 4b (skill `orchestrator-ci`): after a
clean per-ticket review and before the human approval ask, the Orchestrator
runs `pnpm test:unit`, `pnpm run lint`, `pnpm run typecheck`, and
`pnpm run build` on the host, posts a pass/fail report (with failure
excerpts), and on failure re-dispatches `execute` for a CI-fix (shared
Attempts `0/2`).

`execute`'s own implement loop remains `pnpm test:unit` only. Add your own
GitHub Actions / hooks for merge blocking if you want remote enforcement;
treat the harness gates as the shift-left layer, not a substitute for a
pipeline that can block a merge.
```

- [ ] **Step 3: Update the Test gate section**

After the paragraph about `pnpm test:unit` and Execution log, add:

```markdown
Separately, the Orchestrator records each Orchestrator CI run as its own
row on that same `## Execution log` table. A missing or failing final
Orchestrator CI row is a failed 4b gate — do not ask for human approval
until Overall PASS.
```

- [ ] **Step 4: Add skill to the directory map table** (if the README lists skills)

Add a row or bullet for `.claude/skills/orchestrator-ci/SKILL.md` — Phase 4b local CI gate.

- [ ] **Step 5: Verify**

Run:

```bash
rg -n "orchestrator-ci|No CI, no build tooling|Local Orchestrator CI" README-HARNESS.md
```

Expected: `orchestrator-ci` and `Local Orchestrator CI` present; old heading `No CI, no build tooling` **absent**.

- [ ] **Step 6: Commit**

```bash
git add README-HARNESS.md
git commit -m "$(cat <<'EOF'
📝 docs: document Orchestrator CI gate in README-HARNESS

EOF
)"
```

---

### Task 7: Cross-doc consistency check

**Files:**
- Verify only (no new files unless a gap from the spec is found)

**Interfaces:**
- Consumes: all files from Tasks 1–6
- Produces: confirmation the design checklist is covered

- [ ] **Step 1: Spec coverage grep**

Run:

```bash
rg -n "orchestrator-ci" CLAUDE.md .claude/commands/build.md .claude/skills/orchestrator-ci/SKILL.md .claude/agents/execute.md README-HARNESS.md harness/requirements-templates/tickets/01-example-ticket.md

rg -n "pnpm run lint|pnpm run typecheck|pnpm run build" .claude/skills/orchestrator-ci/SKILL.md

rg -n "CI-fix" CLAUDE.md .claude/commands/build.md .claude/agents/execute.md .claude/skills/orchestrator-ci/SKILL.md

rg -n "No CI, no build tooling" README-HARNESS.md || true
```

Expected:
- `orchestrator-ci` in all six paths
- all three commands in the skill
- `CI-fix` in CLAUDE, build, execute, skill
- `No CI, no build tooling` returns no matches

- [ ] **Step 2: Manual checklist against the design**

Confirm each design requirement maps to a file:

| Design requirement | Where |
|---|---|
| 4b only, after clean review | CLAUDE.md §4b, build.md, skill |
| Fixed four commands | skill |
| Report always + failure excerpts | skill |
| FAIL → human + execute CI-fix | skill, CLAUDE, build, execute |
| Shared Attempts 0/2 | skill, CLAUDE |
| Execution log CI row | skill, ticket template, README |
| No GHA / no Phase 5 run | README, skill, CLAUDE Phase 5 cite-only |
| settings allowlist already OK | no change required |

If any row is missing, fix in the owning file and commit that fix before finishing.

- [ ] **Step 3: Final commit only if Step 2 produced fixes**; otherwise stop with a clean tree.

---

## Self-review (plan author)

1. **Spec coverage:** Placement, ownership, commands, report, retry/attempts, skill, file list, non-goals — each has a task. Phase 5 cite-only added in Task 2 (stronger than "no Phase 5 CI" without leaving logs unchecked).
2. **Placeholders:** None — skill body and CLAUDE/build patches are full text.
3. **Consistency:** Skill name `orchestrator-ci` used everywhere; CI-fix is always `action: "implement"`; Attempts shared `0/2`.
