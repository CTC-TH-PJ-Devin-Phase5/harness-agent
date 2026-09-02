/**
 * scripts/render-test-report.ts
 *
 * Renders the Phase 4 HTML test report from `test_run` telemetry events.
 *
 * Source of truth is `logs/sessions/<id>.json` — the same rows `execute`
 * already records once per test invocation (R10). Nothing here shells out to
 * a test runner or parses runner output, so the report works with whatever
 * framework the project uses and adds no dependency (A03).
 *
 * Output (git-ignored — generated report output is never committed, see
 * .claude/rules/git-convention.md §5):
 *   logs/reports/<ticket>.html   one per ticket
 *   logs/reports/index.html      whole-task rollup, for Phase 5
 *
 * Usage:
 *   pnpm report:tests                                  # latest session
 *   pnpm report:tests -- --session logs/sessions/x.json
 *   pnpm report:tests -- --out logs/reports
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import { parseTestRun, TEST_KINDS, TEST_RUN_EVENT } from "../tools/telemetry/test-run";
import type {
  MalformedTestRun,
  TestKind,
  TestRunDetails,
} from "../tools/telemetry/test-run";
import type { TelemetryEvent } from "../tools/telemetry/recorder";

const REPO_ROOT = join(__dirname, "..");
const SESSIONS_DIR = join(REPO_ROOT, "logs", "sessions");
const DEFAULT_OUT_DIR = join(REPO_ROOT, "logs", "reports");
const INDEX_FILE = "index.html";
const SAFE_FILENAME = /[^a-z0-9._-]/gi;
const MAX_MESSAGE_CHARS = 4000;

type TicketStatus = "passed" | "failed" | "incomplete";

interface TicketReport {
  ticket: string;
  fileName: string;
  status: TicketStatus;
  latestAttempt: number;
  runs: Array<TestRunDetails & { timestamp: string }>;
}

interface SessionReport {
  sessionFile: string;
  tickets: TicketReport[];
  malformed: MalformedTestRun[];
}

// --- reading -------------------------------------------------------------

function latestSessionFile(): string {
  if (!existsSync(SESSIONS_DIR)) {
    throw new Error(
      `No ${SESSIONS_DIR} directory — nothing has recorded telemetry yet.`
    );
  }
  const candidates = readdirSync(SESSIONS_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => join(SESSIONS_DIR, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  const newest = candidates[0];
  if (!newest) {
    throw new Error(
      `No session logs in ${SESSIONS_DIR} — run Phase 4a with the telemetry MCP server up.`
    );
  }
  return newest;
}

/** The log is JSON-lines; a truncated final line is skipped, not fatal. */
function readEvents(sessionFile: string): TelemetryEvent[] {
  return readFileSync(sessionFile, "utf-8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as TelemetryEvent];
      } catch {
        return [];
      }
    });
}

// --- grouping ------------------------------------------------------------

function ticketFileName(ticket: string): string {
  const stem = basename(ticket).replace(/\.md$/i, "");
  const safe = stem.replace(SAFE_FILENAME, "-");
  // `ticket` comes from telemetry details, i.e. from the model — basename +
  // allowlist keeps a crafted value like "../../.ssh/config" inside outDir.
  return `${safe || "unknown-ticket"}.html`;
}

function statusFor(runs: TestRunDetails[], latestAttempt: number): TicketStatus {
  const latest = runs.filter((run) => run.attempt === latestAttempt);
  const covered = TEST_KINDS.every((kind) =>
    latest.some((run) => run.kind === kind)
  );
  if (latest.some((run) => run.failed > 0)) return "failed";
  // 4a gates on unit AND integration, so a run missing one is not a pass.
  return covered ? "passed" : "incomplete";
}

export function buildReport(sessionFile: string): SessionReport {
  const malformed: MalformedTestRun[] = [];
  const byTicket = new Map<string, Array<TestRunDetails & { timestamp: string }>>();

  for (const event of readEvents(sessionFile)) {
    if (event.eventName !== TEST_RUN_EVENT) continue;
    const parsed = parseTestRun(event);
    if (!parsed.ok) {
      malformed.push(parsed.malformed);
      continue;
    }
    const rows = byTicket.get(parsed.run.ticket) ?? [];
    rows.push({ ...parsed.run, timestamp: parsed.timestamp });
    byTicket.set(parsed.run.ticket, rows);
  }

  const tickets = [...byTicket.entries()]
    .map(([ticket, runs]) => {
      const latestAttempt = Math.max(...runs.map((run) => run.attempt));
      return {
        ticket,
        fileName: ticketFileName(ticket),
        status: statusFor(runs, latestAttempt),
        latestAttempt,
        runs: [...runs].sort(
          (a, b) => a.attempt - b.attempt || a.kind.localeCompare(b.kind)
        ),
      };
    })
    .sort((a, b) => a.ticket.localeCompare(b.ticket));

  return { sessionFile, tickets, malformed };
}

// --- rendering -----------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Runner output is arbitrary text; cap it so one crash dump can't be the report. */
function truncate(value: string): string {
  return value.length > MAX_MESSAGE_CHARS
    ? `${value.slice(0, MAX_MESSAGE_CHARS)}\n… truncated (${value.length} chars total)`
    : value;
}

const STYLE = `
:root { color-scheme: light dark; --pass: #1a7f37; --fail: #cf222e; --warn: #9a6700; --line: #d0d7de; }
body { font: 14px/1.5 ui-sans-serif, system-ui, sans-serif; margin: 0 auto; max-width: 60rem; padding: 2rem 1rem; }
h1 { font-size: 1.4rem; margin-bottom: .25rem; }
.meta { color: #6e7781; font-size: .85rem; margin-bottom: 1.5rem; }
table { border-collapse: collapse; width: 100%; margin-bottom: 1.5rem; }
th, td { border: 1px solid var(--line); padding: .4rem .6rem; text-align: left; vertical-align: top; }
th { font-weight: 600; }
code, pre { font-family: ui-monospace, SFMono-Regular, monospace; font-size: .85em; }
pre { background: rgba(127,127,127,.12); border-radius: 4px; margin: .3rem 0 0; overflow-x: auto; padding: .6rem; white-space: pre-wrap; }
.badge { border-radius: 999px; font-size: .75rem; font-weight: 600; padding: .1rem .55rem; white-space: nowrap; }
.passed { background: var(--pass); color: #fff; }
.failed { background: var(--fail); color: #fff; }
.incomplete { background: var(--warn); color: #fff; }
.notice { border-left: 3px solid var(--warn); padding: .5rem .8rem; margin-bottom: 1.5rem; }
`.trim();

function page(title: string, body: string): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<style>${STYLE}</style>`,
    "</head>",
    "<body>",
    body,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function badge(status: TicketStatus): string {
  return `<span class="badge ${status}">${status}</span>`;
}

function duration(run: TestRunDetails): string {
  return run.durationMs === undefined ? "—" : `${run.durationMs} ms`;
}

function failureList(run: TestRunDetails): string {
  if (!run.failures?.length) return "";
  const items = run.failures
    .map(
      (failure) =>
        `<li><strong>${escapeHtml(failure.name)}</strong>` +
        `<pre>${escapeHtml(truncate(failure.message))}</pre></li>`
    )
    .join("");
  return `<ul>${items}</ul>`;
}

function runRow(run: TestRunDetails & { timestamp: string }): string {
  return [
    "<tr>",
    `<td>${run.attempt}</td>`,
    `<td>${escapeHtml(run.kind satisfies TestKind)}</td>`,
    `<td><code>${escapeHtml(run.command)}</code></td>`,
    `<td>${run.passed}</td>`,
    `<td>${run.failed}</td>`,
    `<td>${run.skipped}</td>`,
    `<td>${duration(run)}</td>`,
    `<td>${failureList(run) || "—"}</td>`,
    "</tr>",
  ].join("");
}

function malformedNotice(malformed: MalformedTestRun[]): string {
  if (malformed.length === 0) return "";
  const items = malformed
    .map(
      (entry) =>
        `<li><code>${escapeHtml(entry.timestamp)}</code> — ${escapeHtml(entry.reason)}` +
        `<pre>${escapeHtml(truncate(JSON.stringify(entry.raw, null, 2)))}</pre></li>`
    )
    .join("");
  return (
    `<div class="notice"><strong>${malformed.length} malformed ` +
    `<code>${TEST_RUN_EVENT}</code> row(s)</strong> — shown rather than dropped, ` +
    `because a test result that silently vanishes looks the same as a passing one. ` +
    `See the contract in <code>tools/telemetry/test-run.ts</code>.<ul>${items}</ul></div>`
  );
}

export function renderTicketPage(
  ticket: TicketReport,
  sessionFile: string
): string {
  const body = [
    `<h1>${escapeHtml(basename(ticket.ticket))} ${badge(ticket.status)}</h1>`,
    `<p class="meta">Ticket: <code>${escapeHtml(ticket.ticket)}</code><br>`,
    `Latest attempt: ${ticket.latestAttempt} · Session: <code>${escapeHtml(basename(sessionFile))}</code><br>`,
    `<a href="./${escapeHtml(INDEX_FILE)}">← all tickets</a></p>`,
    "<table><thead><tr>",
    "<th>Attempt</th><th>Kind</th><th>Command</th><th>Passed</th><th>Failed</th>",
    "<th>Skipped</th><th>Duration</th><th>Failures</th>",
    "</tr></thead><tbody>",
    ticket.runs.map(runRow).join("\n"),
    "</tbody></table>",
  ].join("\n");
  return page(`Test report — ${basename(ticket.ticket)}`, body);
}

export function renderIndexPage(report: SessionReport): string {
  const rows = report.tickets
    .map((ticket) =>
      [
        "<tr>",
        `<td><a href="./${escapeHtml(ticket.fileName)}">${escapeHtml(basename(ticket.ticket))}</a></td>`,
        `<td>${badge(ticket.status)}</td>`,
        `<td>${ticket.latestAttempt}</td>`,
        `<td>${ticket.runs.length}</td>`,
        "</tr>",
      ].join("")
    )
    .join("\n");

  const empty =
    '<div class="notice">No <code>test_run</code> events in this session. ' +
    "Either Phase 4a has not run yet, or <code>execute</code> did not record its " +
    "test invocations — check <code>.claude/agents/execute.md</code>.</div>";

  const body = [
    "<h1>Phase 4 test report</h1>",
    `<p class="meta">Session: <code>${escapeHtml(basename(report.sessionFile))}</code> · ` +
      `${report.tickets.length} ticket(s)</p>`,
    malformedNotice(report.malformed),
    report.tickets.length === 0
      ? empty
      : `<table><thead><tr><th>Ticket</th><th>Status</th><th>Latest attempt</th><th>Runs</th></tr></thead><tbody>\n${rows}\n</tbody></table>`,
  ].join("\n");
  return page("Phase 4 test report", body);
}

// --- entry point ---------------------------------------------------------

function flagValue(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

function main(): void {
  const argv = process.argv.slice(2);
  const sessionFile = flagValue(argv, "--session") ?? latestSessionFile();
  const outDir = flagValue(argv, "--out") ?? DEFAULT_OUT_DIR;

  if (!existsSync(sessionFile)) {
    console.error(`No such session log: ${sessionFile}`);
    process.exitCode = 1;
    return;
  }

  const report = buildReport(sessionFile);
  mkdirSync(outDir, { recursive: true });

  for (const ticket of report.tickets) {
    writeFileSync(
      join(outDir, ticket.fileName),
      renderTicketPage(ticket, sessionFile),
      "utf-8"
    );
  }
  writeFileSync(join(outDir, INDEX_FILE), renderIndexPage(report), "utf-8");

  const failed = report.tickets.filter((t) => t.status !== "passed");
  console.log(
    `test report: ${join(outDir, INDEX_FILE)} ` +
      `(${report.tickets.length} ticket(s), ${failed.length} not passing, ` +
      `${report.malformed.length} malformed row(s))`
  );
}

if (require.main === module) {
  main();
}
