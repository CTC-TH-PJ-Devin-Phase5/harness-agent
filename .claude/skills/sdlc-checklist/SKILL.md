# Skill: sdlc-checklist

<!-- Local, hand-authored skill specific to this harness, not fetched from
     mattpocock/skills. -->

## When to Use

Invoke this skill **before creating a PR** to validate that all code changes meet the project's SDLC quality gate. The PR must not be created until this skill reports `FINAL STATUS: READY`.

Trigger phrases: `/sdlc-checklist`, "run sdlc checklist", "validate before PR", "pre-PR check".

---

## Instructions

Run ALL five validation phases below in sequence. Do not skip any phase. Do not reorder phases. Do not generate narrative summaries outside the defined report structure.

Use the status values: `PASS | PARTIAL | MISSING | VIOLATION | RISK | N/A`
Use the severity values: `HIGH | MEDIUM | LOW`

Read the following reference files before starting:
- `.claude/rules/coding-standard.md`
- `.claude/rules/security-common.md`
- `.claude/rules/security-frontend.md`
- `.claude/rules/security-backend.md`

---

## Phase 1 — Coding Standard Check

Validate ALL sections. For each section produce a table: `| Rule | Status | Details |`

**1.1 Naming Conventions** — variables (camelCase), functions (camelCase, verb-based), classes/types/interfaces (PascalCase), constants (UPPER_SNAKE_CASE), file naming (PascalCase for React components, camelCase for hooks, kebab-case for others)

**1.2 Function Design Rules** — function size, single responsibility, max 3 nesting levels, backend `validate → execute → return` pattern, React `hooks → derived data → handlers → render` pattern

**1.3 TypeScript Rules** — no `any`, no unnecessary `as`, no `@ts-ignore` (use `@ts-expect-error`), no unnecessary `!`, proper interface/type usage, explicit return types on exported functions, correct nullable handling

**1.4 React & Frontend Component Rules** — function components only, `<ComponentName>Props` interface naming, hooks rules, state management, `on`/`handle` event prefix, a11y attributes, Tailwind CSS styling

**1.5 Immutability Rules** — immutable update patterns, no shared state mutation, `readonly`/`Readonly<T>` usage, `as const`, no direct React state mutation

**1.6 Project Structure & Module Boundaries** — feature module structure, cross-module import boundaries, shared-package alias usage (if one exists), no circular deps, backend `routes → controller → validator → service` pattern

**1.7 Async & Error Propagation** — async/await only (no `.then` chains), backend errors via `next(err)`, typed errors from `common/errors/`, frontend try/catch with user feedback, no fire-and-forget promises

**1.8 Import & Export Conventions** — import order (built-ins → external → shared → relative), named exports, path aliases, no deep cross-module imports, `import type` for type-only imports

**1.9 API Design Standards** — API versioning, response format consistency, HTTP status usage, pagination, rate limiting

**1.10 Linting & Formatting** — linter config, formatter config, CI enforcement, import ordering, unused imports, `--max-warnings=0`

**1.11 Performance Guidelines** — no N+1 queries, caching strategy, API response time, React perf patterns (memo/useMemo/useCallback/key), bundle optimization

End with:
### Coding Standard Summary
`| Category | Pass | Violations | Missing |`

---

## Phase 2 — Security Check

Validate ALL sections. For each section produce: `| Rule ID | Rule | Status | Details |`

**2.1 Frontend Security** — input validation, XSS prevention, token storage, CSRF protection, CSP headers, frontend secret exposure, frontend dependency risks

**2.2 Backend Security** — input validation, SQL injection prevention, authentication, authorization, global error handling, security headers, rate limiting, secrets management, logging security, dependency pinning, CORS, SSRF prevention, file upload security

**2.3 Infrastructure Security** — Docker image security, secret handling, environment isolation, CI/CD security, entrypoint validation

End with:
### Security Summary
`| Category | Pass | Violations/Missing | N/A |`

---

## Phase 3 — Test Validation

Validate ALL sections. For each section produce: `| Requirement | Status | Details |`

Run this repo's test-with-coverage command and capture results. **As of this
skill's introduction, this repo (agent-harness-template) uses `pnpm`, has no
`test:all:coverage` script, and has zero test files anywhere** — running
that command will fail because it doesn't exist, not because tests are
failing. Report that honestly as `MISSING` (test tooling not set up), not
as a false `VIOLATION`/coverage-number, until an actual test runner and
script are added to `package.json`.

**3.1 Test Coverage** — unit test cases = 100%, integration test cases = 100%, unit test coverage > 80%, integration test coverage > 80%, all tests passing, merged UT+IT coverage > 80%

**3.2 Required Coverage Areas** — happy path, error cases, edge cases, permission checks, validation failures, empty/null/invalid input

**3.3 Test Quality** — naming convention, test isolation, mocking strategy, test data management, fixture usage

**3.4 Integration Tests** — integration test cases = 100%, coverage > 80%, database interaction, API integration, transaction handling, error path testing

**3.5 Missing Test Areas** — untested modules, missing regression/API/boundary/unit/integration tests

End with:
### Test Validation Summary
`| Category | Pass | Issues |`

---

## Phase 4 — Documentation Check

Validate ALL sections. For each section produce: `| Check | Status | Details |`

**4.1 README Validation** — setup instructions, architecture consistency, API documentation, usage examples

**4.2 Documentation File Validation** — workflow, API, theme, pipeline, governance docs

**4.3 CHANGELOG Validation** — CHANGELOG existence, release documentation, version tracking

**4.4 Stale Reference Validation** — broken file references, deleted workflow references, outdated commands, invalid paths

End with:
### Documentation Summary
`| Category | Pass | Issues |`

---

## Phase 5 — Final Quality Gate

Validate ALL sections. For each section produce: `| Check | Status | Details |`

**5.1 Checklist Completion** — confirm phases 1–4 all completed

**5.2 Build Verification** — build, lint, TypeScript validation, test execution, all coverage thresholds met

**5.3 Blocking Issues** — check against every blocking condition in the Blocking Rules below

**5.4 Remaining Incomplete Items** — missing implementation, tooling, documentation, protections, test coverage

End with:
### Severity Assessment
`| Severity | Count | Items |`

---

## Blocking Rules

Set `FINAL STATUS: BLOCKED` when ANY of the following is true:

- Build system missing or failing
- Linter missing or failing
- Formatter missing
- CI/CD workflow missing
- Required security middleware missing
- Critical broken references exist
- Critical validation tooling missing
- Required tests missing for implemented business logic
- Unit test cases below 100%
- Integration test cases below 100%
- Unit test coverage below 80%
- Integration test coverage below 80%
- Any failing unit tests
- Any failing integration tests
- The test-with-coverage command fails or does not exist
- Merged UT+IT coverage below 80%
- Critical security validation fails

---

## Final Readiness Status

After Phase 5, always output this block verbatim (fill in placeholders, keep ASCII borders):

```text
+------------------------------------------------------+
|                                                      |
|   FINAL STATUS: <READY | BLOCKED | FAILED>           |
|                                                      |
|   Reason: <summary>                                  |
|   - <blocking issue 1>                               |
|   - <blocking issue 2>                               |
|                                                      |
|   <X> coding standard violations                     |
|   <X> security gaps                                  |
|   <X> missing test areas                             |
|   Unit test cases: <X> (PASS: <X>, FAIL: <X>)        |
|   Unit test coverage: <X>% (Required: >80%)          |
|   Integration test cases: <X> (PASS: <X>, FAIL: <X>) |
|   Integration test coverage: <X>% (Required: >80%)   |
|                                                      |
|   Total test cases: <X> (UT: <X> + IT: <X>)          |
|   Total PASS: <X>  |  Total FAIL: <X>                |
|   All tests (UT+IT): <PASSED | FAILED>               |
|   All test coverage (UT+IT merged): <X>% (Required: >80%) |
|   test:all:coverage execution: <PASSED | FAILED>      |
|   <X> documentation inconsistencies                  |
|                                                      |
+------------------------------------------------------+
```

---

## Gate Rule

If `FINAL STATUS` is `BLOCKED` or `FAILED`, **do not proceed with PR creation**. Report the blocking issues to the user and wait for fixes before re-running this skill.

Only when `FINAL STATUS: READY` may a PR be created.

---

## Recommended Priority Actions

After the final status block, list up to 10 actions ordered by severity:

1. Fix failing tests
2. Increase unit test coverage to meet >80% threshold
3. Increase integration test coverage to meet >80% threshold
4. Resolve security violations
5. Fix coding standard violations (HIGH severity first)
6. Add missing critical path tests
7. Add regression tests
8. Fix broken documentation references
9. Configure CI/CD coverage enforcement gates
10. Address MEDIUM/LOW severity findings
