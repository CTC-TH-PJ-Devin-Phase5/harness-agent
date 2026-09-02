/**
 * subagent-adapter/claude.ts
 *
 * Claude provider adapter. Uses the same self-contained-prompt contract as
 * every other provider (R15/R16) — no reliance on Claude Code's native
 * .claude/agents/*.md content injection, since that path is Claude-only
 * and would break the uniform multi-provider design.
 *
 * !! SINGLE-TURN REFERENCE STUB — `capabilities.toolUse` is false. !!
 *
 * This is one Messages API call with no `tools` parameter and no loop. It
 * can *describe* an implementation; it cannot perform one. It therefore
 * cannot run the `execute` sub-agent, and `runSubAgent()` refuses that
 * pairing rather than returning a prose response that looks like success
 * and silently skips implementation, testing, and the commit dispatch that
 * only ever runs after the orchestrator's own human approval ask succeeds.
 *
 * Two ways to actually dispatch a tool-capable `execute`:
 *   1. On Claude Code: the native Agent tool with subagent_type "execute",
 *      which loads .claude/agents/execute.md and grants the real tools.
 *      This is the documented default — see CLAUDE.md § Delegation.
 *   2. From any environment: give this adapter a real multi-turn loop
 *      (Messages API `tools` + tool_result round-trips, or spawn the
 *      `claude` CLI headless), then set capabilities.toolUse = true.
 */

import type {
  ProviderAdapter,
  SubAgentRequest,
  SubAgentResult,
} from "./interface";
import { registerProvider } from "./interface";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.CLAUDE_SUBAGENT_MODEL ?? "claude-sonnet-5";

async function run(
  request: SubAgentRequest,
  systemPrompt: string
): Promise<SubAgentResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not set — required by tools/subagent-adapter/claude.ts"
    );
  }

  const userMessage = JSON.stringify(request.context, null, 2);

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      ok: false,
      summary: `Claude API error ${response.status}: ${body.slice(0, 500)}`,
      filesChanged: [],
      warnings: [],
      raw: null,
    };
  }

  const data = await response.json();
  const text = (data.content ?? [])
    .filter((block: { type: string }) => block.type === "text")
    .map((block: { text: string }) => block.text)
    .join("\n");

  // filesChanged stays empty because nothing was written: this is one
  // stateless completion, not an agent loop. A real tool-loop adapter must
  // fill it from the write/edit calls it executed — see SubAgentResult.
  return {
    ok: true,
    summary: text,
    filesChanged: [],
    warnings: [],
    raw: data,
  };
}

const claudeAdapter: ProviderAdapter = {
  name: "claude",
  capabilities: { toolUse: false },
  run,
};
registerProvider(claudeAdapter);

export default claudeAdapter;
