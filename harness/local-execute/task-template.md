# Local-LLM Task String Template

Use this template when writing the `task` field in a handoff JSON for a
`Provider: local-llm` dispatch. Fill in every section — missing sections
cause the LLM to guess, which leads to loops and wasted turns.

---

## Template

```
Implement Ticket <NN>: <ticket title>. Provider: local-llm.

## Files to read first
- <path/to/test-file.test.tsx>      ← read the tests to understand what to implement
- <path/to/related-source.tsx>      ← read existing code to match conventions

## Files to create / modify (exact paths)
Create:
  <path/to/Component.tsx>
  <path/to/another.ts>

Modify:
  <path/to/index.ts>  (add exports for the new files)

## Component/function requirements
<describe each component/function at the behavioural level>
<include the Props interface definition>
<include any non-obvious implementation details>

## Known patterns to follow
<any specific patterns the LLM must use — e.g.:>
- Backspace in inputs → use onKeyDown, not onChange
- Controlled components → must track focus with useRef, not native focus
- <any other project-specific pattern relevant to this ticket>

## Success condition
pnpm test:unit must exit 0.
Expected: <N> tests, <M> test files pass.
Call done(success=true) ONLY after that.

## Out of scope
- <file or concern to NOT touch>
- <another boundary>

## Security surface
Frontend only — load .claude/rules/security-frontend.md
[OR: Backend only — load .claude/rules/security-backend.md]
```

---

## Checklist before dispatching

- [ ] Exact filenames specified (LLM must not invent names)
- [ ] Test files listed under "Files to read first"
- [ ] Known failure patterns included (check LEARNING.md)
- [ ] Success condition states exact test count
- [ ] Out-of-scope boundary is clear
- [ ] Security surface named explicitly
