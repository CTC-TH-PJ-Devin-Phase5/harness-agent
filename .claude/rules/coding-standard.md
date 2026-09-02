---
paths:
  - "tools/**/*.ts"
---

# Coding Standard Rules

Applies to TypeScript/TSX source files in this project, backend and frontend
alike. This file is a starting template — replace the example paths in §8
and the shared-package alias in §10 with your own project's actual layout
before relying on this as the full spec.

---

## 1. General Principles

**Do**: Keep functions ≤ 50–80 lines; split React components into sub-components
when JSX exceeds ~100 lines. Extract magic numbers and strings into named
constants. Enforce max line length of 100–120 characters. Prefer explicit,
readable logic.

**Don't**: Write multi-responsibility functions, duplicate logic, or optimise
prematurely.

---

## 2. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Variables / functions | camelCase | `requestCount`, `createRequest()` |
| Classes / Types / Interfaces | PascalCase | `RequestService` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| React component files | PascalCase | `BookingForm.tsx` |
| Hook files | camelCase `use` prefix | `useAppData.ts` |
| Other files (util, service, config) | kebab-case | `validate-request.ts` |
| Test files | Source name + `.test` | `BookingForm.test.tsx` |

**Do**: Rename existing files that don't match the convention when modifying them.

---

## 3. Linting & Formatting

**Do**: Ensure generated code would pass the project's single configured linter
and formatter (no unused imports, no unused variables, correct import order,
no trailing whitespace, no wildcard imports where disallowed).

**Don't**: Add lint-disable comments or `// eslint-disable` directives to make
code pass — fix the underlying issue instead.

---

## 4. Function Design

**Do**:
- Validate inputs first, then execute, then return (backend/utility pattern)
- React components follow: hooks → derived data → event handlers → render (JSX)
- Keep nesting depth ≤ 3 levels; use early returns as guard clauses
- Avoid side effects where possible; return predictable outputs
- Keep Cognitive Complexity ≤ 15 per function (SonarQube S3776). If exceeded, extract nested logic into named helper functions — each helper does one thing.
- Keep nested function depth ≤ 4 levels (SonarQube S2004). Move deeply nested inner functions to module scope and pass required values as parameters.
- Extract complex JSX branches into named sub-components when they add ≥ 3 to the parent's complexity.

---

## 5. TypeScript Rules

**Do**:
- Use `unknown` instead of `any`; narrow with type guards
- Use `interface` for object shapes (props, API responses, models)
- Use `type` for unions, intersections, and computed types
- Name props interfaces `<ComponentName>Props`
- Add explicit return types to all public/exported functions
- Use `as const` for literal/configuration values
- Use optional chaining (`?.`) and nullish coalescing (`??`) for nullable handling
- Use `import type` for type-only imports
- Use `@ts-expect-error` (with an explanatory comment) instead of `@ts-ignore`

**Don't**:
- Use `any`
- Use type assertions (`as`) without a comment explaining why
- Use non-null assertion (`!`) without a comment proving the value is non-null
- Use `||` when `0`, `""`, or `false` are valid values — use `??` instead

---

## 6. React & Frontend Component Rules

**Do**:
- Use function components only; one component per file (file name = component name)
- Define props with `interface <ComponentName>Props`; destructure in the signature
- Custom hooks start with `use`, live in a `hooks/` directory
- Call hooks only at the top level — never inside conditions, loops, or nested functions
- Keep `useEffect` dependencies accurate; do not suppress `exhaustive-deps`
- Name event handler props `on<Action>` (e.g., `onSubmit`); handler functions `handle<Action>`
- Derive computed values with `useMemo` — not `useState` + `useEffect`
- Use Tailwind CSS utility classes as the primary styling approach
- Provide `aria-label` or visible text for interactive elements; meaningful `alt` for images
- Use semantic HTML elements (`button`, `a`, `nav`, `main`, `section`)

**Don't**:
- Use class components
- Spread arbitrary props (`{...rest}`) except in generic wrapper components
- Lift state higher than necessary

---

## 7. Immutability

**Do**: Prefer immutable updates (`{ ...obj, field: value }`, `array.map/filter`).
Use `readonly` on interface properties that must not be mutated.
Use `Readonly<T>` / `ReadonlyArray<T>` for function parameters.

**Don't**: Mutate shared state in-place; never mutate React state directly.

---

## 8. Project Structure & Module Boundaries

**Example layout — adjust to this project's actual source roots:**

**Backend** (e.g. `apps/api/src` or `src/server`): feature modules follow
`routes.ts → controller.ts → validator.ts → service.ts` (+ optional `repository.ts`).
Shared infrastructure belongs in `common/`; external integrations in `infrastructure/`.

**Frontend** (e.g. `apps/web/src` or `src/`): feature modules live under `modules/<feature>/`
with their own `components/`, `pages/`, `services/`, `hooks/`.
Shared UI goes in the top-level `components/`; shared hooks in top-level `hooks/`.

**Don't**: Import from another module's internal files — use the module's public
barrel export (`index.ts`). Do not create circular dependencies between modules.

---

## 9. Async & Error Propagation

**Do**:
- Use `async/await` for all async operations
- Backend controllers: wrap in `try/catch` and call `next(err)` on failure
- Backend services: throw typed errors from `common/errors/` (e.g., `NotFoundError`)
- Frontend: wrap user-triggered async ops in `try/catch` and show feedback (toast)
- Use `Promise.all` for parallel independent operations; `Promise.allSettled` when partial failure is acceptable

**Don't**:
- Use `.then().catch()` chains except for `Promise.all/allSettled`
- Fire-and-forget promises — every promise must be awaited or explicitly handled
- Silently discard errors from API calls

---

## 10. Import & Export Conventions

**Import order** (separate groups with a blank line):
1. Node built-ins (`path`, `fs`)
2. External dependencies (`express`, `react`, `zod`)
3. This project's shared package, if one exists (e.g. `@<project>/shared`)
4. Internal absolute imports
5. Relative imports

**Do**:
- Use named exports by default
- Use `import type` for type-only imports
- Use this project's shared-package alias for shared-package imports, if one exists
- Provide a barrel `index.ts` at each module boundary

**Don't**:
- Use default exports except for lazy-loaded page/route components
- Use wildcard imports (`import * as`) unless the namespace pattern is semantically appropriate
- Import from another module's internal files
- Use relative imports that traverse more than 2 parent directories (`../../../`)

---

## 11. API Design Standards (backend)

- Resource endpoints use plural nouns and kebab-case (`/bookings`, `/trip-requests`)
- URL path versioning: `/api/v1/`
- Success: return data directly (`res.json(data)` / `res.status(201).json(data)`)
- Errors: delegate to the global error handler; do not format error responses in controllers
- Use cursor-based pagination with `total`, `hasNext`, `cursor` metadata
- Every public API must have a rate limiting policy; return `429` on excess

---

## 13. Performance (React-specific)

- Use `React.memo` for expensive pure components with stable props
- Use `useMemo` for expensive computations; `useCallback` for stable function references passed as props
- Do not create new objects, arrays, or functions inline in JSX — extract or memoize
- Do not use array index as `key` for lists that can be reordered, filtered, or modified
- Lazy load components not needed on initial render

---

## 14. SonarQube Quality Rules

Rules derived from critical issues found in this project. Violating these causes CI to fail at the Static Analysis gate.

### String Sorting — S2871

**Don't**: `items.sort()` or `items.sort((a, b) => a - b)` on string arrays — sort order is undefined and unstable.

**Do**: `items.sort((a, b) => a.localeCompare(b))`

### void Operator — S3735

**Don't**: `void someFunction()`

**Do**: `someFunction()` — or `someFunction().catch(() => {})` to suppress floating promise warnings.

### Nested Functions — S2004

**Don't**: Define functions inside functions inside functions (> 4 levels deep).

**Do**: Move inner functions to module scope. Pass required values as parameters instead of closing over them.

---

## Pre-write Self-Check

Before treating generated code as done, verify:

- [ ] No `any` types; `unknown` used where type is not certain
- [ ] Naming conventions match the table in §2
- [ ] Imports are ordered and use `import type` for types
- [ ] No in-place state mutation
- [ ] Async operations have proper error handling
- [ ] No cross-module internal imports
- [ ] No inline magic numbers or hardcoded strings
- [ ] No function exceeds Cognitive Complexity 15 — split into helpers if needed
- [ ] All `.sort()` on string arrays use `localeCompare` comparator
- [ ] No use of `void` operator
- [ ] No functions nested more than 4 levels deep
