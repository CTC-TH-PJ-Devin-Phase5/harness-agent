/**
 * tools/telemetry/test-run.ts
 *
 * Schema for the `test_run` telemetry event that `execute` emits once per
 * test invocation in Phase 4a (see .claude/agents/execute.md).
 *
 * Why this file exists: `execute` does not call `recordEvent()` directly —
 * it calls the `mcp__telemetry__record` MCP tool, so `details` arrives as
 * whatever the model chose to send. Nothing can type-check that at the
 * boundary. So the contract lives here in one place, is printed into the
 * MCP tool description (tools/telemetry/server.ts) so the model sees it,
 * and is re-validated here when `scripts/render-test-report.ts` reads the
 * log back. Malformed rows are surfaced in the report, never dropped
 * silently — a missing test result must not look like a passing one.
 */

import type { TelemetryEvent } from "./recorder";

export const TEST_RUN_EVENT = "test_run";

/** Unit and integration are gated separately — 4a requires both to pass. */
export const TEST_KINDS = ["unit", "integration"] as const;
export type TestKind = (typeof TEST_KINDS)[number];

/** Max attempts per ticket before the whole task stops (CLAUDE.md Phase 4a). */
export const MAX_ATTEMPTS = 2;

export interface TestFailure {
  /** Test name, or the file/suite when the runner reports no name. */
  name: string;
  /**
   * Assertion message or truncated runner output. Treat as untrusted text:
   * it lands in an HTML report, so every renderer must escape it, and
   * `execute` must not paste environment dumps in here (A09 — logs are
   * eventually exposed).
   */
  message: string;
}

export interface TestRunDetails {
  /** Repo-relative ticket path, e.g. docs/requirements/<slug>/tickets/01-foo.md */
  ticket: string;
  kind: TestKind;
  /** 1-based; `MAX_ATTEMPTS` at most. */
  attempt: number;
  /** Exact command executed, so a human can reproduce the run. */
  command: string;
  passed: number;
  failed: number;
  skipped: number;
  durationMs?: number;
  /** Present when `failed > 0`. */
  failures?: TestFailure[];
}

/** A `test_run` row that could not be read as a `TestRunDetails`. */
export interface MalformedTestRun {
  reason: string;
  timestamp: string;
  raw: Record<string, unknown>;
}

export type ParsedTestRun =
  | { ok: true; run: TestRunDetails; timestamp: string }
  | { ok: false; malformed: MalformedTestRun };

function asCount(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function parseFailures(value: unknown): TestFailure[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((entry, index) => {
    const record = (entry ?? {}) as Record<string, unknown>;
    return {
      name: asNonEmptyString(record.name) ?? `(unnamed failure ${index + 1})`,
      message: asNonEmptyString(record.message) ?? "(no message reported)",
    };
  });
}

/**
 * Reads one telemetry event as a test run. Returns a `malformed` result
 * rather than throwing, because one bad row must not stop the report that
 * shows the other rows.
 */
export function parseTestRun(event: TelemetryEvent): ParsedTestRun {
  const details = event.details ?? {};
  const missing: string[] = [];

  const ticket = asNonEmptyString(details.ticket);
  if (!ticket) missing.push("ticket");

  const kind = TEST_KINDS.find((candidate) => candidate === details.kind);
  if (!kind) missing.push(`kind (one of ${TEST_KINDS.join(", ")})`);

  const command = asNonEmptyString(details.command);
  if (!command) missing.push("command");

  const passed = asCount(details.passed);
  if (passed === null) missing.push("passed");

  const failed = asCount(details.failed);
  if (failed === null) missing.push("failed");

  const skipped = asCount(details.skipped);
  if (skipped === null) missing.push("skipped");

  const attempt = asCount(details.attempt);
  if (attempt === null || attempt < 1) missing.push("attempt (>= 1)");

  if (
    !ticket ||
    !kind ||
    !command ||
    passed === null ||
    failed === null ||
    skipped === null ||
    attempt === null ||
    attempt < 1
  ) {
    return {
      ok: false,
      malformed: {
        reason: `test_run missing or invalid: ${missing.join(", ")}`,
        timestamp: event.timestamp,
        raw: details,
      },
    };
  }

  const durationMs = asCount(details.durationMs);

  return {
    ok: true,
    timestamp: event.timestamp,
    run: {
      ticket,
      kind,
      attempt,
      command,
      passed,
      failed,
      skipped,
      ...(durationMs === null ? {} : { durationMs }),
      ...(failed > 0
        ? { failures: parseFailures(details.failures) ?? [] }
        : {}),
    },
  };
}

/** Human-readable contract, injected into the MCP tool description. */
export const TEST_RUN_CONTRACT = [
  `Emit "${TEST_RUN_EVENT}" once per test invocation with details:`,
  "{ ticket: string (repo-relative ticket path), " +
    `kind: "${TEST_KINDS.join('" | "')}", ` +
    `attempt: integer >= 1 (max ${MAX_ATTEMPTS}), ` +
    "command: string, passed: integer, failed: integer, skipped: integer, " +
    "durationMs?: integer, " +
    "failures?: [{ name: string, message: string }] (required when failed > 0) }.",
  "These rows are the only source for the Phase 4 HTML test report " +
    "(scripts/render-test-report.ts) — a run you do not record does not " +
    "appear in the report. Never put secrets, tokens, or environment dumps " +
    "in `command` or `message`: the report is a file on disk.",
].join(" ");
