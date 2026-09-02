/**
 * check-harness.ts
 *
 * The harness's contract is split across TypeScript, JSON config, and
 * Markdown. `tsc` only sees the first third, so a rename in
 * `.claude/rules/` or a provider typo in `.claude/harness.json` breaks
 * `/build` at dispatch time with nothing catching it earlier. This script
 * asserts the cross-file invariants that no single file can express.
 *
 * Run: `pnpm check:harness` (also a CI step).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  RULES_BY_SUBAGENT,
  SKILLS_BY_SUBAGENT,
  SUBAGENTS_REQUIRING_TOOL_USE,
  registeredProviders,
} from "../tools/subagent-adapter";
import type { ProviderName, SubAgentName } from "../tools/subagent-adapter";

const REPO_ROOT = join(__dirname, "..");
const HARNESS_JSON = join(REPO_ROOT, ".claude", "harness.json");

/** Orchestrator phases run on the main thread, so no adapter reads these — only CLAUDE.md points at them. */
const ORCHESTRATOR_SKILLS = [
  "grill-with-docs",
  "grilling",
  "domain-modeling",
  "to-spec",
  "to-tickets",
  "code-review",
] as const;

interface HarnessConfig {
  subagents?: Record<string, { provider?: string }>;
  permissions?: Record<string, { allow?: string[] }>;
  execution?: { mode?: string; max_parallel?: number };
  approval?: { autoApprove?: boolean };
}

const failures: string[] = [];

function check(condition: boolean, message: string): void {
  if (!condition) {
    failures.push(message);
  }
}

function repoFileExists(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

function readHarnessConfig(): HarnessConfig {
  return JSON.parse(readFileSync(HARNESS_JSON, "utf-8")) as HarnessConfig;
}

function checkSkillsExist(): void {
  for (const [subAgent, skills] of Object.entries(SKILLS_BY_SUBAGENT)) {
    for (const skill of skills) {
      const path = `.agents/skills/${skill}/SKILL.md`;
      check(
        repoFileExists(path),
        `SKILLS_BY_SUBAGENT["${subAgent}"] names "${skill}" but ${path} is missing — run ./scripts/sync-skills.sh`
      );
    }
  }

  for (const skill of ORCHESTRATOR_SKILLS) {
    const path = `.agents/skills/${skill}/SKILL.md`;
    check(
      repoFileExists(path),
      `CLAUDE.md's orchestrator phases need ${path}, which is missing — run ./scripts/sync-skills.sh`
    );
  }
}

function checkRulesExist(): void {
  for (const [subAgent, rules] of Object.entries(RULES_BY_SUBAGENT)) {
    for (const rule of rules) {
      const path = `.claude/rules/${rule}.md`;
      check(
        repoFileExists(path),
        `RULES_BY_SUBAGENT["${subAgent}"] names "${rule}" but ${path} is missing`
      );
    }
  }
}

function checkAdaptersDeclareCapabilities(): void {
  const adapters = registeredProviders();
  check(
    adapters.size > 0,
    "No provider adapters registered — tools/subagent-adapter/index.ts should import each one"
  );

  for (const [name, adapter] of adapters) {
    check(
      typeof adapter.capabilities?.toolUse === "boolean",
      `Adapter "${name}" does not declare capabilities.toolUse — runSubAgent()'s tool-use guard reads it`
    );
    check(
      typeof adapter.run === "function",
      `Adapter "${name}" does not implement run()`
    );
  }
}

function checkConfiguredProvidersResolve(config: HarnessConfig): void {
  const adapters = registeredProviders();
  const known = [...adapters.keys()].join(", ");

  for (const [subAgent, entry] of Object.entries(config.subagents ?? {})) {
    const provider = entry.provider;
    check(
      Boolean(provider),
      `.claude/harness.json subagents.${subAgent} has no provider`
    );
    if (!provider) continue;

    check(
      adapters.has(provider as ProviderName),
      `.claude/harness.json sets subagents.${subAgent}.provider = "${provider}", but no such adapter is registered (have: ${known})`
    );

    // Not a failure: every shipped adapter is a single-turn stub, so this is
    // the expected state of a fresh template. Warn so it isn't a surprise at
    // dispatch time — runSubAgent() will refuse this pairing.
    const adapter = adapters.get(provider as ProviderName);
    if (
      adapter &&
      !adapter.capabilities.toolUse &&
      SUBAGENTS_REQUIRING_TOOL_USE.has(subAgent as SubAgentName)
    ) {
      console.warn(
        `warn: subagents.${subAgent}.provider = "${provider}" has capabilities.toolUse === false, ` +
          `so runSubAgent() will refuse it. Dispatch Phase 4a via the Agent tool (see CLAUDE.md ` +
          `§ Delegation), or give that adapter a real tool loop.`
      );
    }
  }
}

function checkApprovalGateNotDisabled(config: HarnessConfig): void {
  // security-common.md: never weaken an existing control. The gate is the
  // harness's one human checkpoint, so a config that pre-approves commits
  // is a hard failure, not a preference.
  check(
    config.approval?.autoApprove === false,
    '.claude/harness.json must set approval.autoApprove to false — no auto-approve path may exist'
  );
}

function checkSubAgentDefinitionsMatchPermissions(config: HarnessConfig): void {
  for (const subAgent of Object.keys(config.permissions ?? {})) {
    const path = `.claude/agents/${subAgent}.md`;
    check(
      repoFileExists(path),
      `.claude/harness.json declares permissions for "${subAgent}" but ${path} is missing — the Agent-tool dispatch path reads that file`
    );
  }
}

/**
 * On the Agent-tool dispatch path nothing injects skills or rules — the
 * sub-agent has to Read them itself, which it can only do if its own role
 * file names them. So the file must stay in sync with the code's lists.
 */
function checkSubAgentPromptNamesItsInputs(): void {
  for (const subAgent of Object.keys(SKILLS_BY_SUBAGENT) as SubAgentName[]) {
    const relativePath = `.claude/agents/${subAgent}.md`;
    const path = join(REPO_ROOT, relativePath);
    if (!existsSync(path)) continue; // reported by checkSubAgentDefinitionsMatchPermissions

    const content = readFileSync(path, "utf-8");
    const expected = [
      ...SKILLS_BY_SUBAGENT[subAgent].map(
        (skill) => `.agents/skills/${skill}/SKILL.md`
      ),
      ...RULES_BY_SUBAGENT[subAgent].map((rule) => `.claude/rules/${rule}.md`),
    ];

    for (const reference of expected) {
      check(
        content.includes(reference),
        `${relativePath} never names "${reference}", so on the Agent-tool path (which injects nothing) "${subAgent}" would run without it`
      );
    }
  }
}

function checkReportOutputIgnored(): void {
  // git-convention.md §5: never commit generated report output. The report
  // renderer writes HTML into logs/reports/, so the ignore rule and the
  // renderer's output dir have to stay in sync.
  const gitignorePath = join(REPO_ROOT, ".gitignore");
  if (!existsSync(gitignorePath)) {
    failures.push(".gitignore is missing");
    return;
  }
  const lines = readFileSync(gitignorePath, "utf-8")
    .split("\n")
    .map((line) => line.trim());
  check(
    lines.includes("logs/reports/*.html"),
    '.gitignore must ignore "logs/reports/*.html" — git-convention.md §5 forbids committing generated report output'
  );
}

function main(): void {
  check(
    existsSync(HARNESS_JSON),
    ".claude/harness.json is missing — runSubAgent() cannot resolve a provider without it"
  );
  if (!existsSync(HARNESS_JSON)) {
    report();
    return;
  }

  const config = readHarnessConfig();

  checkSkillsExist();
  checkRulesExist();
  checkAdaptersDeclareCapabilities();
  checkConfiguredProvidersResolve(config);
  checkApprovalGateNotDisabled(config);
  checkSubAgentDefinitionsMatchPermissions(config);
  checkSubAgentPromptNamesItsInputs();
  checkReportOutputIgnored();

  report();
}

function report(): void {
  if (failures.length === 0) {
    console.log("harness invariants ok");
    return;
  }
  console.error(`harness invariants FAILED (${failures.length}):`);
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exitCode = 1;
}

main();
