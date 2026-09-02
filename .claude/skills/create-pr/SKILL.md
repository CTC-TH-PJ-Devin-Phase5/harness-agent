# Skill: create-pr

<!-- Local, hand-authored skill specific to this harness, not fetched from
     mattpocock/skills. -->

## Purpose

Prepare completed work for code review by committing changes, pushing the current branch, and creating a Pull Request.

## Where this fits in the harness

This is the step **after** the harness, not part of it. The orchestrator recommends it once the human approves Phase 5 (CLAUDE.md § Phase 5) and stops there — it never runs this skill itself, because `git push` is denied to it and a PR is outward-facing. **A human invokes this.**

Invoked that way, steps 1–3 below are already satisfied and should come out as no-ops:

- the current branch is the task branch `<slug>`, carrying one commit per completed ticket;
- each of those commits already passed its own review and explicit human approval in Phase 4b, and already follows `git-convention.md`;
- every ticket's declared `Test kinds` already passed on its final attempt, recorded in the ticket's `## Execution log` and `logs/reports/<ticket>.html`.

So confirm them rather than redoing them (a dirty working tree or an unexpected commit means something is wrong — stop and say so), then do steps 4–5. Build the PR body from `docs/requirements/<slug>/review.md` plus `spec.md`, and cite the ticket files for what each commit did.

Outside `/build` — an ordinary branch with no harness artifacts — run all five steps as written, with `sdlc-checklist` as the pre-PR gate.

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
   - Commit changes to the current branch.
   - Follow this repo's `git-convention.md` rule (Gitmoji subject format), not generic conventional-commit prefixes.
   - Do not commit directly to `main`.

4. Push:
   - Push the current branch to the remote repository.

5. Create Pull Request:
   - Create a Pull Request targeting the `main` branch.
   - Include:
     - Summary of changes
     - Key implementation details
     - Testing performed
     - Migration/setup notes if applicable

## Rules

- Never merge the Pull Request.
- Do not push directly to `main`.
- Leave the PR ready for manual review and merge via GitHub console.
- Keep commits focused and meaningful.
- Do not include unrelated changes.
- Do not bypass failing tests.
- Ensure the working tree is clean before finishing.
