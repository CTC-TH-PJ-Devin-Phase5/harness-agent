---
name: create-pr
description: "Push the task branch and open or update the PR against main. Human-invoked; the orchestrator only recommends it."
disable-model-invocation: true
---

# Skill: create-pr

<!-- Local, hand-authored skill specific to this harness, not fetched from
     mattpocock/skills. -->

## Purpose

Push the current branch and open or update **one** Pull Request against `main`, so reviewers can comment. A human invokes this. The harness orchestrator only recommends it.

## Where this fits in the harness

The orchestrator points here after every ticket's 4c (reviewer window) and again after Phase 5 approve (merge-ready). It never runs this skill: `git push` is denied to it, and a PR is outward-facing.

**Mode comes from the environment**, not from a flag:

- **Ready** — `docs/requirements/<slug>/review.md` has `- [x] Approved` under `### Human decision`.
- **Draft** — that file is missing, the Approved box is unchecked, or Rejected is the recorded decision.

`<slug>` is the current branch name (the task branch). Confirm you are not on `main`.

Outside `/build` — an ordinary branch with no `docs/requirements/<slug>/` artifacts — run all five steps as written, with `sdlc-checklist` as the pre-PR gate.

## Harness docs on a dirty tree

Implementation commits already landed in Phase 4 (one per ticket). After 4c and Phase 5 the working tree may still hold harness docs the orchestrator wrote: ticket markdown (`Status: done`, AC checkboxes), `review.md`, `LEARNING.md`, and handoffs.

If the dirty paths are **only** under `docs/requirements/<slug>/` and/or `LEARNING.md`, commit them on this branch per `git-convention.md`, then continue. If any other path is dirty, stop and say so — do not mix application diffs into this commit.

## Workflow

1. Review current changes:
   - Check git status.
   - Review the diff.
   - Ensure no unrelated changes are included.

2. Validation:
   - Run relevant tests.
   - Run linting/type checks if configured.
   - Ensure the application builds successfully.

3. Commit:
   - Commit harness-doc changes (see above) to the current branch.
   - Follow this repo's `git-convention.md` rule (Gitmoji subject format), not generic conventional-commit prefixes.
   - Do not commit directly to `main`.

4. Push:
   - Push the current branch to the remote repository.

5. Open or update the Pull Request:
   - Target `main`.
   - One PR per task branch: if a PR for this head already exists, update it; never open a second one.

### Draft path (reviewer window)

Skip step 2. `pnpm test:unit` already passed in 4a; this invocation is so reviewers can comment, not to run CI.

Then: step 3 if harness docs are dirty, step 4, then step 5 as **draft**.

- No PR yet → create it as a draft.
- PR exists → update its body, leave it draft (`gh pr ready` stays for the ready path).

**Body** (rebuild every draft invocation):

- Spec title / goal, from `docs/requirements/<slug>/spec.md`.
- One bullet per ticket whose `Status` is `done`: title plus a short AC summary.
- Pointers to `spec.md` and the ticket files on the branch.
- `pnpm test:unit` results cited from each done ticket's `## Execution log`.

### Ready path (Phase 5 approved)

Run steps 3 → 2 → 4 → 5. If step 2 fails, stop: do not push, do not mark the PR ready.

**Body** from `docs/requirements/<slug>/review.md` plus `spec.md`, citing the ticket files for what each commit did.

- No PR yet → create it ready (not draft).
- PR exists → replace the body, then mark it ready for review.

## Rules

- Never merge the Pull Request.
- Do not push directly to `main`.
- One PR per task branch; update the existing one.
- Keep commits focused and meaningful.
- Do not include unrelated changes.
- Do not bypass failing tests (ready path).
- Working tree clean before finishing.
