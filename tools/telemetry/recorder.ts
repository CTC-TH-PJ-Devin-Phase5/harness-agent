/**
 * tools/telemetry/recorder.ts
 *
 * Raw, per-session event log (R10) — deliberately separate from
 * LEARNING.md. This is the "what happened" trail for debugging one run;
 * LEARNING.md is the curated "what to remember" trail across runs. Never
 * write to LEARNING.md from here.
 */

import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const SESSIONS_DIR = join(__dirname, "..", "..", "logs", "sessions");

// One session id per process lifetime (one harness run = one file).
const SESSION_ID =
  process.env.HARNESS_SESSION_ID ??
  `session-${new Date().toISOString().replace(/[:.]/g, "-")}`;

const sessionFile = join(SESSIONS_DIR, `${SESSION_ID}.json`);

let initPromise: Promise<void> | null = null;
async function ensureDir(): Promise<void> {
  if (!initPromise) {
    initPromise = mkdir(SESSIONS_DIR, { recursive: true }).then(() => undefined);
  }
  return initPromise;
}

export interface TelemetryEvent {
  eventName: string;
  timestamp: string;
  details: Record<string, unknown>;
}

/**
 * Appends one JSON-lines event to logs/sessions/<session-id>.json.
 * Fire-and-forget from callers' perspective — errors are logged, not thrown,
 * so a telemetry hiccup never blocks the harness itself.
 */
export function recordEvent(
  eventName: string,
  details: Record<string, unknown> = {}
): void {
  const event: TelemetryEvent = {
    eventName,
    timestamp: new Date().toISOString(),
    details,
  };

  append(event).catch((err: unknown) => {
    console.error("telemetry: failed to record event", eventName, err);
  });
}

async function append(event: TelemetryEvent): Promise<void> {
  await ensureDir();
  await appendFile(sessionFile, JSON.stringify(event) + "\n", "utf-8");
}

export function currentSessionFile(): string {
  return sessionFile;
}
