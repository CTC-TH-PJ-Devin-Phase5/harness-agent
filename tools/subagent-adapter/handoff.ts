/**
 * Writes the exact context the orchestrator handed a sub-agent.
 * One file per dispatch. Never throws — a log miss must not block the run.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "..", "..");
const FALLBACK_DIR = join(REPO_ROOT, "logs", "handoffs");

export interface HandoffPayload {
  timestamp: string;
  subAgent: string;
  provider: string;
  task: string;
  context: Record<string, unknown>;
}

function slugFromContext(context: Record<string, unknown>): string | undefined {
  const candidates = [context.specPath, context.ticket, context.ticketPath];
  for (const value of candidates) {
    const text =
      typeof value === "string"
        ? value
        : value && typeof value === "object" && "path" in value
          ? String((value as { path: unknown }).path)
          : "";
    const match = text.match(/docs\/requirements\/([^/]+)/);
    if (match) return match[1];
  }
  return undefined;
}

function fileName(subAgent: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${stamp}-${subAgent}.json`;
}

/** Directory for a task-scoped handoff, or logs/handoffs when slug is unknown. */
export function handoffDir(context: Record<string, unknown>): string {
  const slug = slugFromContext(context);
  if (slug) {
    return join(REPO_ROOT, "docs", "requirements", slug, "handoffs");
  }
  return FALLBACK_DIR;
}

/**
 * Persist the orchestrator → sub-agent context. Returns the path written,
 * or undefined if the write failed.
 */
export async function writeHandoffLog(
  payload: Omit<HandoffPayload, "timestamp">
): Promise<string | undefined> {
  const record: HandoffPayload = {
    timestamp: new Date().toISOString(),
    ...payload,
  };
  const dir = handoffDir(payload.context);
  const path = join(dir, fileName(payload.subAgent));
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(path, JSON.stringify(record, null, 2) + "\n", "utf-8");
    return path;
  } catch (err) {
    console.error("handoff: failed to write", path, err);
    return undefined;
  }
}
