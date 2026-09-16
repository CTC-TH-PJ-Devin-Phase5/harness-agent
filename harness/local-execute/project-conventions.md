# Project Conventions for Local LLM

These conventions apply to every ticket. Read them before implementing.

## Testing Framework

- **Vitest** — use `vi.fn()`, `vi.mock()`, `vi.spyOn()`
- **NEVER** use `jest.fn()`, `jest.mock()`, `jest.spyOn()` — this project does NOT use Jest
- Test environment: jsdom via `@testing-library/react`
- Setup file: `@testing-library/jest-dom` (provides `toBeInTheDocument()` etc.)

## Import Aliases

- `@/` maps to `apps/web/src/` — always use `@/modules/auth/...` NOT `@modules/auth/...`
- Workspace package: `@driver-app/test` runs tests

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

## edit_file Recovery

- If `edit_file` fails with "old_string appears N times" → use `write_file` to replace the ENTIRE file
- Never loop retrying the same `edit_file` — switch to `write_file` immediately

## Code Style

- Named exports preferred: `export function Foo()` or `export { Foo }`
- Props interfaces named `<ComponentName>Props`
- No `any` types — use `unknown` and narrow with type guards
- Keys on lists: use stable derived strings like `` `item-${id}` `` — never bare array index

## Project Stack

- Frontend: React 18 + TypeScript 5 + Vite 5 + Tailwind CSS 3
- Tests: Vitest 2 + @testing-library/react 14 + @testing-library/user-event 14
- CSS: Tailwind utility classes + CSS custom properties from globals.css
- No inline style hex values — use Tailwind classes or `var(--token-name)`
