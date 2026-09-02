/**
 * subagent-adapter/gemini.ts
 *
 * Gemini provider adapter — same contract as the others. Demonstrates that
 * adding a new provider only means adding a file here; interface.ts and
 * the orchestrator never need to change (R15 acceptance criteria).
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

const MODEL = process.env.GEMINI_SUBAGENT_MODEL ?? "gemini-2.5-pro";
const GEMINI_API_URL = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

async function run(
  request: SubAgentRequest,
  systemPrompt: string
): Promise<SubAgentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY not set — required by tools/subagent-adapter/gemini.ts"
    );
  }

  const userMessage = JSON.stringify(request.context, null, 2);

  const response = await fetch(`${GEMINI_API_URL(MODEL)}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      ok: false,
      summary: `Gemini API error ${response.status}: ${body.slice(0, 500)}`,
      filesChanged: [],
      warnings: [],
      raw: null,
    };
  }

  const data = await response.json();
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((p: { text: string }) => p.text)
      .join("\n") ?? "";

  return {
    ok: true,
    summary: text,
    filesChanged: [],
    warnings: [],
    raw: data,
  };
}

const geminiAdapter: ProviderAdapter = {
  name: "gemini",
  capabilities: { toolUse: false },
  run,
};
registerProvider(geminiAdapter);

export default geminiAdapter;
