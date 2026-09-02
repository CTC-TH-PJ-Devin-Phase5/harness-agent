# End-to-end smoke test (Ticket 18)

This harness's real test is running `/build` against a live provider with
Claude Code logged in — not something that can be faked with unit tests
alone, since the whole point is human-in-the-loop gates. Use this
checklist. Docker is not required.

## Setup

```bash
git init && git commit --allow-empty -m "🔧 init: harness baseline"  # Phase 4 needs main
pnpm install
./scripts/sync-skills.sh
# Claude Code logged in (`claude` on PATH). Docker is not required.
```

Start the long-running MCP servers in separate terminals (or under your
MCP client's process manager):

```bash
pnpm run approval-mcp
pnpm run telemetry-mcp
```

## Happy path

1. Run `/build "add a GET /goodbye endpoint that mirrors /hello"` against a
   toy Express app.
2. **Phase 1** — confirm the orchestrator asks you clarifying questions and
   will not proceed until you answer (try not answering — it should hang,
   not time out or skip).
3. **Phase 2** — confirm `docs/requirements/<slug>/spec.md` gets created.
4. **Phase 3** — confirm `docs/requirements/<slug>/tickets/` gets created
   with one file per ticket (`01-*.md`, `02-*.md`, ...), each with
   acceptance criteria and an `Attempts: 0/2` counter.
5. **Phase 4** — for the first ticket, confirm:
   - a. `execute` creates a new branch named `<slug>/01-<ticket-slug>` off
      `main` before writing any code (first ticket has no blockers); for a
      second, dependent ticket, confirm its branch is created off the
      first ticket's branch instead of off `main`
   - b. code gets written and tests run on the host via execute's Bash
      (check `logs/sessions/<id>.json` for `test_run` events)
   - b2. `logs/reports/<ticket>.html` exists and its badge matches what the
      test run actually did. Deliberately break one test first: the failed
      attempt must show up as a row with its failure message, not vanish.
      Then check the rollup at `logs/reports/index.html`. A ticket where
      only unit tests were recorded must read `incomplete`, never `passed`
   - c. you are prompted at an **approval gate** before anything is
      committed, the summary names the report path, and the process visibly
      blocks until you answer
   - d. answering "n" (reject) does **not** commit and is reported back
   - e. that ticket's own file under `tickets/` now has a new row in its
      `## Execution log` table naming the `execute` sub-agent, the
      skill(s) it used (`implement`, `tdd`), the specific rule/step it
      followed within that skill (e.g. `tdd`'s red-green-refactor), what
      it did, and the outcome — and its
      `Attempts` counter is bumped
6. **Phase 5** — confirm `docs/requirements/<slug>/review.md` gets written
   and you're asked to approve/reject the whole task.
7. Approve — confirm `LEARNING.md` gets a new dated section appended.

## Failure paths

8. **Two failed attempts on one ticket**: force a test to fail twice (e.g.
   point a ticket at an impossible acceptance criterion). Confirm the
   orchestrator stops the *entire task* immediately after attempt 2 fails —
   it must not silently move to the next ticket.
9. **Reject at Phase 5**: after all tickets pass, reject the final review
   with feedback pointing at one specific ticket's behavior. Confirm the
   orchestrator re-runs **only** that ticket (check its file under
   `tickets/` — other tickets' `Attempts` counters should not change) and
   loops back to a new Phase 5 review round.

## Multi-provider check

10. Change `.claude/harness.json` → `subagents.execute.provider` from
    `"claude"` to `"codex"` and re-run a small task through
    `runSubAgent()`. Because every shipped adapter is a single-turn stub
    (`capabilities.toolUse: false`), the dispatch must be **refused** with an
    error naming the missing capability, and a `subagent_dispatch_refused`
    event must appear in `logs/sessions/<id>.json`. A prose "success" here
    would mean the guard regressed and the approval gate is bypassable.
11. To actually run `execute` on another provider, first give that adapter a
    real multi-turn tool loop and set `capabilities.toolUse = true`; then
    repeat the Phase 4 checks in step 5 against it — especially 5c/5d, the
    approval gate.
