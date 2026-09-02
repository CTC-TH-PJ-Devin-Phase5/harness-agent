/**
 * subagent-adapter/codex.ts
 *
 * Codex provider adapter — same contract as claude.ts. Adjust
 * CODEX_API_URL / payload shape to match whichever Codex-compatible
 * endpoint you're targeting (OpenAI API, Azure OpenAI, a local proxy, etc).
 *
 * !! SINGLE-TURN REFERENCE STUB — `capabilities.toolUse` is false. !!
 * One chat/completions call, no `tools`, no loop: it cannot edit files, run
 * tests, or commit on a later dispatch, so `runSubAgent()` refuses to pair
 * it with `execute`. To use it for real work, add a multi-turn tool loop
 * and set capabilities.toolUse = true.
 */

import type {
  ProviderAdapter,
  SubAgentRequest,
  SubAgentResult,
} from "./interface";
import { registerProvider } from "./interface";

const CODEX_API_URL =
  process.env.CODEX_API_URL ?? "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.CODEX_SUBAGENT_MODEL ?? "gpt-5-codex";

async function run(
  request: SubAgentRequest,
  systemPrompt: string
): Promise<SubAgentResult> {
  const apiKey = process.env.CODEX_API_KEY;
  if (!apiKey) {
    throw new Error(
      "CODEX_API_KEY not set — required by tools/subagent-adapter/codex.ts"
    );
  }

  const userMessage = JSON.stringify(request.context, null, 2);

  const response = await fetch(CODEX_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      ok: false,
      summary: `Codex API error ${response.status}: ${body.slice(0, 500)}`,
      filesChanged: [],
      warnings: [],
      raw: null,
    };
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? "";

  return {
    ok: true,
    summary: text,
    filesChanged: [],
    warnings: [],
    raw: data,
  };
}

const codexAdapter: ProviderAdapter = {
  name: "codex",
  capabilities: { toolUse: false },
  run,
};
registerProvider(codexAdapter);

export default codexAdapter;
