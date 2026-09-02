---
# No `paths` — loads unconditionally every session, same priority as CLAUDE.md.
# Keep this file concept-level and language-agnostic. Anything syntax-specific
# (SQL parameterization, XSS escaping, etc.) belongs in security-frontend.md /
# security-backend.md, not here.
---

# Security Rules — Common (All Components)

Applies to every file in this repo (`tools/`, `docs/`, sub-agent prompts).
These map to gate items #4 (SonarQube 0 Critical/High) and #5 (OWASP Top 10)
of the project's security-and-quality gate. Unit/integration test pass rate
and coverage % are process gates, not covered here.

Standard: **OWASP Top 10:2025**. Format: Do / Don't / Why. Level `strict` =
do not generate this pattern, flag the conflict instead of complying.

---

## A03:2025 — Software Supply Chain Failures

**Level**: `strict`

**Do**: Use existing dependencies already in `package.json` wherever
possible. When a new dependency is genuinely needed, prefer actively
maintained packages and note the choice so it can be reviewed.

**Don't**: Add a dependency solely to save a few lines of code, add a
second package that duplicates one already in the project, or pin to a
`latest`/floating version in a lockfile-backed project.

**Why**: A03 is the highest-incidence-rate category in the 2025 data.
Every added dependency is an added attack surface and an unreviewed trust
relationship.

**Refs**: OWASP A03:2025, CWE-1104 (Use of Unmaintained Third-Party
Components)

---

## A04:2025 — Cryptographic Failures (secrets & hashing)

**Level**: `strict`

**Do**: Read secrets, API keys, DB credentials, and signing keys from
environment variables or the project's secret manager. Hash passwords with
bcrypt/argon2. Generate tokens/session IDs with a CSPRNG
(`crypto.randomBytes` / `crypto.randomUUID`, never `Math.random()`).

**Don't**: Hardcode a secret, key, password, or connection string in
source, config, test fixtures, or comments — including "temporary" or
"for now" placeholders. Never use MD5/SHA1 for anything security-relevant
(password hashing, tokens, signatures).

**Why**: Hardcoded credentials are a Sonar Critical-severity finding
(`S2068`/`S6437`-class rules) and the single most common cause of secret
leaks in git history — removing them after a commit doesn't remove them
from history.

**Refs**: OWASP A04:2025, CWE-798 (Hardcoded Credentials), CWE-338 (Weak
PRNG)

---

## A09:2025 — Security Logging and Alerting Failures

**Level**: `strict` (never log sensitive data) / `warning` (missing
security event logs)

**Do**: Log security-relevant events (failed login, authZ denial,
password reset request) with enough context to investigate later
(user id, timestamp, action, IP if available).

**Don't**: Log passwords, tokens, session secrets, full card numbers, or
other PII in plaintext, in any log level, including debug/trace logs that
might ship to production by accident.

**Why**: Logs are frequently the least-protected data store in a system
(shipped to third-party aggregators, retained long-term, broadly
readable) — anything logged should be treated as eventually exposed.

**Refs**: OWASP A09:2025, CWE-532 (Insertion of Sensitive Information
into Log File)

---

## Cross-cutting: Never Weaken Existing Controls

**Level**: `strict`

**Do**: If a task seems to require disabling a test, lint rule, auth
check, or validation step to pass, stop and state the conflict instead of
complying silently. Propose a compliant alternative.

**Don't**: Comment out a failing test, add a broad lint-disable, remove
an auth guard, or loosen input validation just to make CI green.

**Why**: This gate exists specifically to catch controls that get
quietly weakened under time pressure — bypassing it to hit a deadline
defeats its purpose the same day it was set up.

---

## Pre-write Self-Check

Before treating a change as done, verify:

- [ ] No secret/credential/API key literal in the diff
- [ ] No new dependency added without a stated reason
- [ ] No security-relevant log statement includes secret/PII data
- [ ] No existing test, guard, or validation was disabled to pass
