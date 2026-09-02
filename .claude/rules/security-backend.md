---
paths:
  - "tools/**/*.ts"
---

# Security Rules — Backend (`tools/`)

Loads when Claude reads a matching file under `tools/` (this repo's MCP
servers and sub-agent adapter — the closest thing this project has to a
"backend"). Known limitation: this does NOT reliably trigger on
first-time file *creation* (Write), only on Read/Edit — see project notes.
New MCP tools/handlers are exactly where this matters most, so back the
`strict` items below with a hook rather than relying on this file alone.

Standard: **OWASP Top 10:2025**.

---

## A01:2025 — Broken Access Control (incl. SSRF, BOLA, BFLA)

**Level**: `strict`

**Do**: Check authentication AND authorization on every route, including
internal, admin, and "temporary" endpoints. For any endpoint that takes a
resource ID, verify the caller owns/may access that specific resource
(not just that they're logged in). If the server makes an outbound HTTP
request based on user input, validate the destination against an
allowlist.

**Don't**: Ship a route that checks "is logged in" but not "is allowed to
access *this* record" (BOLA), expose an admin-level action reachable by a
non-admin role because there's no explicit check (BFLA), or pass a
user-supplied URL/hostname directly into an outbound fetch/request call
(SSRF — now part of A01:2025, not a separate category).

**Why**: A01 is OWASP's #1 category for four editions running. BOLA/BFLA
and SSRF are the most common ways an authenticated-but-limited user
reaches data or systems they shouldn't.

**Refs**: OWASP A01:2025, CWE-639 (Authorization Bypass via User-Controlled
Key), CWE-918 (SSRF)

---

## A05:2025 — Injection (SQL/NoSQL/command)

**Level**: `strict`

**Do**: Use parameterized queries or the ORM/query-builder's parameter
binding for every query that includes user input. Use allowlists for
anything that becomes a shell argument; prefer `execFile`/array-args APIs
over shell string interpolation if a subprocess is unavoidable. This is
directly relevant to `execute`'s host `Bash` — never build that command
via string concatenation of untrusted input.

**Don't**: Build a query via string concatenation or template literals
with unsanitized input, or interpolate user input into a shell command
string.

**Why**: Injection remains fully exploitable wherever it exists — the
prevalence dropped industry-wide because parameterization became the
default, not because the underlying risk shrank.

**Refs**: OWASP A05:2025, CWE-89 (SQL Injection), CWE-78 (OS Command
Injection)

---

## A02:2025 — Security Misconfiguration (CORS, error responses, debug)

**Level**: `strict` (CORS wildcard+credentials, stack-trace leaks) /
`warning` (other misconfig)

**Do**: Set CORS to an explicit allowlist of origins. If an error handler
returns a response to the client, return a generic message and an
internal error/reference ID; log the detail server-side only. Keep
debug/verbose modes off by default and gated behind a non-production
env check.

**Don't**: Set `Access-Control-Allow-Origin: *` together with
`Access-Control-Allow-Credentials: true` (invalid and dangerous
combination), or return a raw stack trace, internal file path, or query
string in an API error response.

**Why**: This is now the #2 category — misconfiguration is cheap for an
attacker to find and exploit compared to a novel vulnerability, and CI/CD
automation means one bad template gets replicated everywhere.

**Refs**: OWASP A02:2025

---

## A06:2025 — Insecure Design (rate limiting, business logic)

**Level**: `warning`

**Do**: Apply rate limiting and request-size limits on public-facing
endpoints, especially auth (login, password reset, OTP). Validate
business-logic invariants server-side (e.g. quantity/amount can't go
negative, balance checks happen atomically, not read-then-write with a
race window).

**Don't**: Assume the frontend's input constraints (min/max, dropdown
options) are enforced — re-validate everything server-side.

**Why**: Design-level gaps (missing rate limit, race condition, no
server-side re-validation) aren't caught by pattern-based scanners like
Sonar as reliably as syntax bugs — this needs deliberate attention.

**Refs**: OWASP A06:2025

---

## A07:2025 — Authentication Failures

**Level**: `strict` (password hashing, session fixation) / `warning`
(MFA, lockout policy)

**Do**: Hash passwords with bcrypt/argon2 (see security-common.md).
Rotate/regenerate the session identifier on privilege change (e.g. after
login). Rate-limit and lock out after repeated failed login attempts.

**Don't**: Roll a custom auth scheme when the project's existing
auth/session mechanism already covers the case.

**Why**: Most real-world auth breaches are credential stuffing and
session fixation, not novel crypto attacks — these are the practical
mitigations that matter.

**Refs**: OWASP A07:2025

---

## A08:2025 — Software or Data Integrity Failures

**Level**: `strict`

**Do**: Verify webhook/callback payload signatures before trusting the
body. Use `JSON.parse` for data interchange; avoid any deserialization
path that can execute code from untrusted input.

**Don't**: Process a webhook payload without verifying its signature
header, or deserialize untrusted data with an API that supports
arbitrary object/prototype reconstruction.

**Why**: An unverified webhook is an open endpoint that lets anyone
trigger backend logic by guessing the URL.

**Refs**: OWASP A08:2025, CWE-502 (Deserialization of Untrusted Data)

---

## A10:2025 — Mishandling of Exceptional Conditions

**Level**: `warning`

**Do**: Fail closed on error (deny access / abort the operation) rather
than fail open. Catch specific expected error types; let unexpected
errors propagate to a top-level handler that logs and returns a generic
response.

**Don't**: Use a bare/broad `catch` that swallows the error and
continues as if the operation succeeded, especially around auth or
payment logic.

**Why**: This is a new 2025 category precisely because fail-open error
handling is a common, previously under-tracked root cause of access
bypasses.

**Refs**: OWASP A10:2025

---

## Sonar Critical/High Quick-Hits (Backend)

- Regex against user input: check for ReDoS (nested quantifiers).
- Cookies: `Secure`, `HttpOnly`, `SameSite` set explicitly for any cookie
  carrying session/auth data.
- No `Math.random()` for tokens, password reset codes, or anything
  security-relevant — use `crypto.randomBytes`/`randomUUID`.
- No unbounded request body size on file/JSON upload endpoints.
