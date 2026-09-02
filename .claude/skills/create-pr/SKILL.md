# Skill: create-pr

<!-- Local, hand-authored skill specific to this harness, not fetched from
     mattpocock/skills. -->

## Purpose

Prepare completed work for code review by committing changes, pushing the current branch, and creating a Pull Request.

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
