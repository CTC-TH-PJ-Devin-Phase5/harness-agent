# Local-LLM Task String Template

Use this template when writing the `task` field in a handoff JSON for a
`Provider: local-llm` dispatch. Fill in every `<<<FILL>>>` marker — a task
string with any unfilled marker must not be dispatched.

---

## Template

```
Implement Ticket <<<NN>>>: <<<ticket title>>>.

## Context
Spec section: <<<exact section heading from docs/requirements/<slug>/spec.md>>>
Acceptance criteria for this ticket (copy verbatim from ticket file):
  - [ ] <<<AC 1>>>
  - [ ] <<<AC 2>>>
  <<< ...add all AC items >>>

Constraints from docs/CONTEXT.md / ADRs that apply to this ticket:
  <<<quote the relevant term or decision, or write "none">>>

Phase 1 prototype / reference artifact:
  <<<path or content of any sketch/prototype from grilling, or "none">>>

## Files to read first
- <<<path/to/test-file.test.tsx>>>   ← tests for this ticket (Provider: claude wrote these)
- <<<path/to/related-source.tsx>>>   ← existing code to match conventions

## Files to create / modify (exact paths — LLM must not invent names)
Create:
  <<<path/to/NewComponent.tsx>>>
  <<<path/to/another.ts>>>   ← remove if none

Modify:
  <<<path/to/index.ts>>>   (add exports for the new files; remove if none)

## Component/function requirements
<<<Describe each component/function at the behavioural level.>>>
<<<Include the Props interface definition.>>>
<<<Include any non-obvious implementation details.>>>

## Exact imports (copy these — do NOT guess export names)
```ts
// List every import statement the LLM will need, with exact names.
// Call read_file on the source module if unsure of the export name.
<<<import { ExactName } from '@/path/to/module';>>>
```
(Guessing export names leads to undefined imports that crash at render time.)

## Known patterns to follow
Read .claude/rules/coding-standard.md, .claude/rules/security-common.md,
and <<<security-frontend.md | security-backend.md | both>>> before writing code.
Also read .claude/skills/implement/SKILL.md and .claude/skills/tdd/SKILL.md.

Project-specific patterns for this ticket:
<<<list any known failure patterns from LEARNING.md that apply, e.g.:>>>
  - Backspace in inputs → use onKeyDown, not onChange
  - Controlled components → stateful wrapper required in tests
  - Event handlers: do NOT add async unless the handler has an actual await call
  <<<add more from LEARNING.md or write "none beyond project-conventions.md">>>

## Success condition
Run: pnpm test:unit
Expected: <<<N>>> tests pass across <<<M>>> test files.
Call done(success=true) ONLY after seeing that exact output.
Do NOT substitute a different test command.

## Out of scope
- <<<file or concern to NOT touch — be specific>>>
- <<<another boundary>>>
  <<<if empty, write "none" — never leave this blank>>>

## Security surface
<<<Frontend only — load .claude/rules/security-frontend.md>>>
<<<Backend only  — load .claude/rules/security-backend.md>>>
<<<Both          — load security-frontend.md AND security-backend.md>>>
```

---

## Pre-dispatch checklist (orchestrator must check all before calling Agent)

- [ ] Every `<<<FILL>>>` marker replaced — no placeholder text remains
- [ ] Acceptance criteria copied verbatim from the ticket file
- [ ] Relevant spec section(s) named explicitly
- [ ] Exact file paths listed under "Files to create / modify" (LLM must not invent names)
- [ ] Test file(s) listed under "Files to read first"
- [ ] Exact imports listed (or a `read_file` instruction to find them)
- [ ] Success condition states the exact expected test count
- [ ] LEARNING.md checked — known failure patterns included or noted "none"
- [ ] Out-of-scope boundary is explicit and non-empty
- [ ] Security surface named (frontend / backend / both)
- [ ] Skills and rules to read are named in the task string (orchestrator reads them here; execute reads them at runtime)

**A task string that fails any check above must not be dispatched.**
Fix it first; a vague prompt is worse than a short delay.
