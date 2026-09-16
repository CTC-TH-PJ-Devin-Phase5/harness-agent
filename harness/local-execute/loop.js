import { chat } from './ollama.js';
import { DEFINITIONS, execute } from './tools.js';
import config from './config.js';

/**
 * Some Ollama models output tool calls as JSON text instead of native tool_calls.
 * Parse newline-separated JSON objects into the same shape as native tool_calls.
 */
function parseTextToolCalls(content) {
  if (!content || !content.trim()) return [];
  const calls = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.name && parsed.arguments !== undefined) {
        calls.push({ function: { name: parsed.name, arguments: parsed.arguments } });
      }
    } catch { /* not a JSON tool call line */ }
  }
  return calls;
}

/**
 * Run one implementation attempt.
 * Returns when LLM calls done() or maxTurns is reached.
 * @param {string} systemPrompt
 * @returns {Promise<{ success: boolean, summary: string, testOutput: string, turns: number }>}
 */
export async function run(systemPrompt) {
  const messages = [{ role: 'system', content: systemPrompt }];
  let turn = 0;

  while (turn < config.ollama.maxTurns) {
    turn++;
    log(`turn ${turn}/${config.ollama.maxTurns}`);

    const message = await chat(messages, DEFINITIONS);
    messages.push({
      role: 'assistant',
      content: message.content ?? '',
      tool_calls: message.tool_calls,
    });

    // Prefer native tool_calls; fall back to text-format JSON (some Ollama models)
    const resolvedCalls =
      message.tool_calls && message.tool_calls.length > 0
        ? message.tool_calls
        : parseTextToolCalls(message.content);

    if (resolvedCalls.length === 0) {
      log('no tool call — prompting to continue');
      messages.push({
        role: 'user',
        content: 'Continue. Use a tool to make progress, or call done() if finished.',
      });
      continue;
    }

    for (const toolCall of resolvedCalls) {
      const name = toolCall.function?.name;
      const args = toolCall.function?.arguments ?? {};

      log(`tool: ${name}(${JSON.stringify(args).slice(0, 120)})`);

      let result;
      try {
        result = execute(name, args);
      } catch (err) {
        result = { output: `Error: ${err.message}` };
        log(`  → error: ${err.message}`);
      }

      if (result.isDone) {
        log(`done() — success=${result.payload.success}`);
        return { ...result.payload, turns: turn };
      }

      messages.push({ role: 'tool', content: result.output ?? '' });
      log(`  → ${String(result.output ?? '').slice(0, 80)}`);
    }
  }

  return {
    success: false,
    summary: `Reached max turns (${config.ollama.maxTurns}) without completing`,
    testOutput: '',
    turns: turn,
  };
}

function log(msg) {
  process.stderr.write(`[local-execute] ${msg}\n`);
}
