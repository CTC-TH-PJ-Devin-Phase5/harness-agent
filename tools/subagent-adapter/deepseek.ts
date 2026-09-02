/**
 * subagent-adapter/deepseek.ts
 *
 * Deepseek provider adapter — same contract as claude.ts / codex.ts.
 * Deepseek's API is OpenAI-compatible, so the payload shape mirrors codex.ts.
 *
 * !! SINGLE-TURN REFERENCE STUB — `capabilities.toolUse` is false. !!
 * See codex.ts for what that means and how to promote it.
 */

import type {
  ProviderAdapter,
  SubAgentRequest,
  SubAgentResult,
} from "./interface";
import { registerProvider } from "./interface";

const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com/chat/completions";
const MODEL = process.env.DEEPSEEK_SUBAGENT_MODEL ?? "deepseek-chat";

async function run(
  request: SubAgentRequest,
  systemPrompt: string
): Promise<SubAgentResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY not set — required by tools/subagent-adapter/deepseek.ts"
    );
  }

  const userMessage = JSON.stringify(request.context, null, 2);

  const response = await fetch(DEEPSEEK_API_URL, {
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
      summary: `Deepseek API error ${response.status}: ${body.slice(0, 500)}`,
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

const deepseekAdapter: ProviderAdapter = {
  name: "deepseek",
  capabilities: { toolUse: false },
  run,
};
registerProvider(deepseekAdapter);

export default deepseekAdapter;
