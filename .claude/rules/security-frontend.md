---
paths:
  - "apps/web/**/*.{ts,tsx}"
---

# Security Rules — Frontend

`paths` above is an example glob — point it at this project's actual
frontend source root. Loads when Claude reads a matching file. Known
limitation: this does NOT reliably trigger on first-time file *creation*
(Write), only on Read/Edit — see project notes. For non-negotiable items,
back this up with a hook; treat this file as the "shift-left" layer, not
the final gate.

Standard: **OWASP Top 10:2025**, scoped to what's actually reachable from
client-side code.

---

## A05:2025 — Injection (XSS)

**Level**: `strict`

**Do**: Let the framework escape output by default. If raw HTML must be
rendered, sanitize it first with an approved library (e.g. DOMPurify)
immediately before render.

**Don't**: Use `dangerouslySetInnerHTML` (or equivalent) with unsanitized
input, or interpolate user/API-sourced strings into `innerHTML`. Never use
`eval`, `new Function()`, or dynamic `import()` with a user-influenced
string.

**Why**: XSS on the frontend is the most direct path from "user input" to
"attacker-controlled code execution in another user's session."

**Refs**: OWASP A05:2025, CWE-79 (Cross-Site Scripting)

---

## A01:2025 — Broken Access Control (client-side hygiene)

**Level**: `strict`

**Do**: Treat every client-side role/permission check as a UX
convenience only (hide a button, redirect away from a page). Assume the
real enforcement happens server-side, in this project's backend.

**Don't**: Write logic that treats a client-side check as sufficient
authorization (e.g. only hiding an "admin" API call behind a UI condition
without the backend also verifying it), or trust a role/claim read from a
client-editable source (localStorage, URL param) without server
verification.

**Why**: Anything in the browser is attacker-controlled. A UI-only gate
is not access control, it's a suggestion.

**Refs**: OWASP A01:2025 (now includes BOLA/BFLA-style failures)

---

## A07:2025 — Authentication Failures (token handling)

**Level**: `warning`

**Do**: Prefer httpOnly, Secure, SameSite cookies for session/auth tokens
when the framework/architecture supports it. If a token must be
accessible to JS, understand it's readable by any successful XSS.

**Don't**: Default to `localStorage`/`sessionStorage` for auth tokens
without considering the httpOnly-cookie alternative first.

**Why**: Token storage location determines blast radius of an XSS bug —
`localStorage` tokens are trivially exfiltrated by injected script.

**Refs**: OWASP A07:2025, OWASP Session Management Cheat Sheet

---

## A02:2025 — Security Misconfiguration (headers, secrets in bundle)

**Level**: `warning`

**Do**: Keep CSP and standard security headers (`X-Content-Type-Options`,
`Referrer-Policy`, etc.) in sync when adding new external script/style/
font/image sources. Only ever expose env vars to the client bundle that
are explicitly meant to be public (e.g. framework's public-prefix
convention).

**Don't**: Add a new third-party script/domain without updating CSP, or
reference a non-public env var in client-rendered code (it will end up in
the shipped JS bundle, readable by anyone).

**Why**: A misconfigured CSP or a leaked server-only env var in a client
bundle turns a contained backend secret into a publicly-readable one.

**Refs**: OWASP A02:2025

---

## A10:2025 — Mishandling of Exceptional Conditions

**Level**: `advisory`

**Do**: Wrap risky UI sections in error boundaries; show a generic
fallback UI on unexpected errors.

**Don't**: Let an unhandled exception dump a raw stack trace or internal
error object to the rendered page.

**Why**: Stack traces can reveal internal file paths, library versions,
and logic — useful recon for an attacker, and unprofessional for users.

**Refs**: OWASP A10:2025

---

## Sonar Critical/High Quick-Hits (Frontend)

- Regex used against user input: check for catastrophic backtracking
  (ReDoS) — avoid nested quantifiers like `(a+)+`.
- No `console.log` of API responses that may contain user/session data
  left in production builds.
- Form inputs handling passwords: `type="password"`, `autocomplete` set
  appropriately, never echoed back in error messages.
