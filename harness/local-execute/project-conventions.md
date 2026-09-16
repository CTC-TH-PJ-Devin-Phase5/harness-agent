# Project Conventions for Local LLM

These conventions apply to every ticket. Read them before implementing.

## Testing Framework

- **Vitest** — use `vi.fn()`, `vi.mock()`, `vi.spyOn()`
- **NEVER** use `jest.fn()`, `jest.mock()`, `jest.spyOn()` — this project does NOT use Jest
- Test environment: jsdom via `@testing-library/react`
- Setup file: `@testing-library/jest-dom` (provides `toBeInTheDocument()` etc.)

## Import Aliases

- Check the vite.config.ts or tsconfig.json paths to confirm the exact alias for this project
- Always use the correct prefix (e.g. `@/`) — never guess; call `read_file` on the config first

## React Testing Patterns

- **Controlled components** (value + onChange props) REQUIRE a stateful wrapper in tests:
  ```tsx
  function Wrapper() {
    const [val, setVal] = React.useState('');
    return <MyComponent value={val} onChange={setVal} />;
  }
  render(<Wrapper />);
  ```
- Components that use React context MUST be wrapped with the provider:
  ```tsx
  render(<LanguageProvider><MyComponent /></LanguageProvider>);
  ```

## Query Strategy

- Semantic elements (button, input, heading) → `getByRole`, `getAllByRole`
- Non-semantic elements (span, div) → add `data-testid` to the component, then use `getAllByTestId`
- `getAllByRole('span')` is NOT valid — `span` is not an ARIA role

## write_file vs edit_file policy

**Prefer `write_file` for all source files.** Use `edit_file` only when:
- The file is large and you need a single, targeted change
- You have just read the file and are confident about the exact string

**Switch to `write_file` immediately if any of these are true:**
- You have already edited this file once in this attempt
- `edit_file` fails with "old_string appears N times" or "old_string not found"
- The file is a component or page (LoginPage.tsx, OtpInput.tsx, etc.)

Rationale: `edit_file` loses track of file state across multiple sequential edits.
After 2+ edits, the model's mental model of the file diverges from the actual content,
causing cascading "old_string not found" errors that consume all remaining turns.

## Code Style

- Named exports preferred: `export function Foo()` or `export { Foo }`
- Props interfaces named `<ComponentName>Props`
- No `any` types — use `unknown` and narrow with type guards
- Keys on lists: use stable derived strings like `` `item-${id}` `` — never bare array index

## Export and import style

This project uses NAMED exports for all components, hooks, and utilities:
```ts
export function MyComponent() {}   // ✅ named
export { useLang, LanguageProvider };  // ✅ named
export default MyComponent;        // ❌ avoid default exports
```

Always import with the named form:
```ts
import { CaptchaChallenge } from '@/modules/auth/components/CaptchaChallenge'; // ✅
import CaptchaChallenge from '@/modules/auth/components/CaptchaChallenge';     // ❌
```

If unsure of an export name — call `read_file` on that module BEFORE writing the import.

## File modification boundary

Only modify files explicitly listed in the task string under "Files to create / modify".

- If a file is not listed → read it only, never rewrite it.
- If you only need an import from a file → use `read_file` to find the export name, then import. Do NOT rewrite the file to add or rename exports.
- Rewriting an out-of-scope file to "fix" an import will corrupt other modules that depend on it.

## Project Stack

<!-- Fill in after Phase 2 Spec is written for this project -->
<!-- Example:
- Frontend: React 18 + TypeScript 5 + Vite 5 + Tailwind CSS 3
- Tests: Vitest 2 + @testing-library/react 14 + @testing-library/user-event 14
- CSS: utility classes from the design system + CSS custom properties from globals.css
-->
