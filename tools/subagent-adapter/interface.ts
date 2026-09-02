/**
 * subagent-adapter/interface.ts
 *
 * Provider-agnostic contract for dispatching work to the `execute`
 * sub-agent, whichever provider it's configured to run on (R15).
 *
 * The orchestrator NEVER calls a provider adapter directly — it always
 * goes through `runSubAgent()` here, which:
 *   1. Resolves which provider this sub-agent is configured for
 *      (.claude/harness.json -> subagents.<name>.provider)
 *   2. Loads the relevant skill content from .agents/skills/<name>/SKILL.md (R16)
 *   3. Builds a self-contained prompt (role prompt + injected skill text +
 *      task-specific context) — never the full conversation history
 *   4. Writes the exact `{ task, context }` payload to
 *      `docs/requirements/<slug>/handoffs/<timestamp>-<subAgent>.json`
 *      (falls back to `logs/handoffs/` if slug cannot be inferred), and
 *      records a `subagent_delegated` telemetry event that includes that
 *      same context. `subagent_completed`/`subagent_failed` after dispatch.
 *      This is the one chokepoint every delegation passes through (R10)
 *   5. Delegates to the matching provider adapter
 *   6. Returns a structured result the orchestrator can act on
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { recordEvent } from "../telemetry/recorder";
import { writeHandoffLog } from "./handoff";

export type ProviderName = "claude" | "codex" | "deepseek" | "gemini";

export type SubAgentName = "execute";

/** Which .agents/skills/<name>/SKILL.md files back each sub-agent's phase (R14/R16). */
export const SKILLS_BY_SUBAGENT: Record<SubAgentName, string[]> = {
  execute: ["implement", "tdd"],
};

/**
 * Which .claude/rules/<name>.md files back each sub-agent's phase. Rules
 * are project-specific coding standards (not portable skill content), so
 * unlike skills they live only under .claude/ and aren't synced from
 * upstream.
 */
export const RULES_BY_SUBAGENT: Record<SubAgentName, string[]> = {
  execute: [
    "coding-standard",
    "git-convention",
    "security-common",
    "security-backend",
    "security-frontend",
  ],
};

export interface SubAgentRequest {
  subAgent: SubAgentName;
  /** Short, human-readable description of what this invocation is for. */
  task: string;
  /**
   * Structured context handed to `execute` — one ticket + spec path, plus
   * failure context on retry. Never the orchestrator's raw conversation
   * history (R15 context isolation).
   */
  context: Record<string, unknown>;
  /** Absolute or repo-relative paths the sub-agent is allowed to read/write. */
  allowedPaths?: string[];
}

export interface SubAgentResult {
  ok: boolean;
  /** Free-form summary the orchestrator can log / show the user. */
  summary: string;
  /**
   * Repo-relative paths written or modified.
   *
   * A `toolUse: true` adapter MUST populate this from the write/edit tool
   * calls it actually executed — it is the orchestrator's only machine-
   * readable record of what a ticket touched, and Phase 4b uses it to scope
   * the review. Do not parse it out of the model's prose.
   *
   * Single-turn stubs leave it `[]` because nothing was written. That is
   * why they are barred from running `execute` at all.
   */
  filesChanged: string[];
  /** Non-fatal warnings surfaced to the orchestrator. */
  warnings: string[];
  /** Raw provider output, kept for telemetry — not fed back into context. */
  raw: unknown;
}

export interface AdapterCapabilities {
  /**
   * True only if this adapter runs a real multi-turn agent loop in which the
   * model can actually invoke tools (read/write files, run tests via Bash,
   * call `mcp__approval__request`) and the adapter feeds results back until
   * the model stops.
   *
   * A plain one-shot chat/completion call is `false`: it can describe an
   * implementation but cannot perform one. See the guard in `runSubAgent()`.
   */
  toolUse: boolean;
}

export interface ProviderAdapter {
  name: ProviderName;
  capabilities: AdapterCapabilities;
  run(
    request: SubAgentRequest,
    systemPrompt: string
  ): Promise<SubAgentResult>;
}

/**
 * Sub-agents whose job is impossible without real tool use. `execute` must
 * create a branch, edit files, run unit + integration tests, block on the
 * human approval gate, and commit — none of which a single-turn text
 * response can do. Dispatching one to a `toolUse: false` adapter would
 * return prose that *looks* like success and silently bypass the approval
 * gate, so `runSubAgent()` refuses instead.
 */
export const SUBAGENTS_REQUIRING_TOOL_USE: ReadonlySet<SubAgentName> = new Set<SubAgentName>([
  "execute",
]);

const SKILLS_DIR = join(__dirname, "..", "..", ".agents", "skills");
const RULES_DIR = join(__dirname, "..", "..", ".claude", "rules");
const SETTINGS_PATH = join(__dirname, "..", "..", ".claude", "harness.json");

/** Loads and concatenates the skill files a sub-agent's phase depends on. */
export async function loadSkillContent(subAgent: SubAgentName): Promise<string> {
  const names = SKILLS_BY_SUBAGENT[subAgent];
  const parts = await Promise.all(
    names.map(async (name) => {
      const path = join(SKILLS_DIR, name, "SKILL.md");
      try {
        const content = await readFile(path, "utf-8");
        return `<!-- skill: ${name} -->\n${content.trim()}`;
      } catch {
        throw new Error(
          `Missing .agents/skills/${name}/SKILL.md — run ./scripts/sync-skills.sh first`
        );
      }
    })
  );
  return parts.join("\n\n---\n\n");
}

/** Loads and concatenates the rule files a sub-agent's phase depends on. */
export async function loadRuleContent(subAgent: SubAgentName): Promise<string> {
  const names = RULES_BY_SUBAGENT[subAgent];
  const parts = await Promise.all(
    names.map(async (name) => {
      const path = join(RULES_DIR, `${name}.md`);
      try {
        const content = await readFile(path, "utf-8");
        return `<!-- rule: ${name} -->\n${content.trim()}`;
      } catch {
        throw new Error(
          `Missing .claude/rules/${name}.md, referenced by RULES_BY_SUBAGENT["${subAgent}"]`
        );
      }
    })
  );
  return parts.join("\n\n---\n\n");
}

interface Settings {
  subagents: Record<SubAgentName, { provider: ProviderName }>;
  permissions: Record<SubAgentName, { allow: string[] }>;
}

async function loadSettings(): Promise<Settings> {
  const raw = await readFile(SETTINGS_PATH, "utf-8");
  return JSON.parse(raw) as Settings;
}

/** Registry of provider adapters, populated by each adapter module at import time. */
const registry = new Map<ProviderName, ProviderAdapter>();

export function registerProvider(adapter: ProviderAdapter): void {
  registry.set(adapter.name, adapter);
}

/**
 * Snapshot of everything currently registered. Only for introspection —
 * `runSubAgent()` is still the only dispatch path. `scripts/check-harness.ts`
 * uses this to assert every configured provider has an adapter.
 */
export function registeredProviders(): ReadonlyMap<ProviderName, ProviderAdapter> {
  return new Map(registry);
}

/**
 * The single entry point the orchestrator uses to delegate work.
 * Same call shape regardless of which provider the sub-agent runs on.
 */
export async function runSubAgent(
  request: SubAgentRequest
): Promise<SubAgentResult> {
  const settings = await loadSettings();
  const providerName = settings.subagents[request.subAgent]?.provider;
  if (!providerName) {
    throw new Error(
      `No provider configured for sub-agent "${request.subAgent}" in .claude/harness.json`
    );
  }

  const adapter = registry.get(providerName);
  if (!adapter) {
    throw new Error(
      `No adapter registered for provider "${providerName}". ` +
        `Did you forget to import tools/subagent-adapter/${providerName}.ts?`
    );
  }

  // Refuse rather than return a false success. See SUBAGENTS_REQUIRING_TOOL_USE.
  if (
    SUBAGENTS_REQUIRING_TOOL_USE.has(request.subAgent) &&
    !adapter.capabilities.toolUse
  ) {
    recordEvent("subagent_dispatch_refused", {
      subAgent: request.subAgent,
      provider: providerName,
      reason: "adapter cannot invoke tools",
    });
    throw new Error(
      `Sub-agent "${request.subAgent}" requires an adapter that can invoke tools, but ` +
        `provider "${providerName}" is a single-turn adapter (capabilities.toolUse === false). ` +
        `It cannot create a branch, edit files, run tests, or block on the approval gate — ` +
        `dispatching to it would return prose that looks like success and bypass the gate. ` +
        `Either dispatch through a tool-capable host (on Claude Code: the Agent tool with ` +
        `subagent_type "execute" — see CLAUDE.md § Delegation), or implement a real ` +
        `multi-turn tool loop in tools/subagent-adapter/${providerName}.ts and set ` +
        `capabilities.toolUse = true.`
    );
  }

  const skillContent = await loadSkillContent(request.subAgent);
  const ruleContent = await loadRuleContent(request.subAgent);
  const allowList = settings.permissions[request.subAgent]?.allow ?? [];

  const systemPrompt = [
    `You are the "${request.subAgent}" sub-agent in an agent harness.`,
    `Allowed tools: ${allowList.join(", ") || "(none declared)"}`,
    `Task: ${request.task}`,
    "",
    "--- Skill instructions (source of truth, follow these) ---",
    skillContent,
    ...(ruleContent
      ? [
          "",
          "--- Coding standard rules (source of truth, follow these) ---",
          ruleContent,
        ]
      : []),
  ].join("\n");

  const handoffPath = await writeHandoffLog({
    subAgent: request.subAgent,
    provider: providerName,
    task: request.task,
    context: request.context,
  });

  recordEvent("subagent_delegated", {
    subAgent: request.subAgent,
    provider: providerName,
    task: request.task,
    context: request.context,
    handoffPath,
  });

  try {
    const result = await adapter.run(request, systemPrompt);

    // A tool-capable adapter reporting success without naming a single file
    // means it isn't wiring filesChanged up from its tool calls — the
    // orchestrator would then review a ticket with no idea what it touched.
    if (
      adapter.capabilities.toolUse &&
      result.ok &&
      result.filesChanged.length === 0
    ) {
      recordEvent("adapter_contract_warning", {
        subAgent: request.subAgent,
        provider: providerName,
        reason: "ok result reported no filesChanged; see SubAgentResult docs",
      });
    }

    recordEvent("subagent_completed", {
      subAgent: request.subAgent,
      provider: providerName,
      ok: result.ok,
      filesChanged: result.filesChanged,
      warnings: result.warnings,
    });
    return result;
  } catch (err) {
    recordEvent("subagent_failed", {
      subAgent: request.subAgent,
      provider: providerName,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
