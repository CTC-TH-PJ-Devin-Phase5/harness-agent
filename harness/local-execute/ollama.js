import fs from 'fs';
import path from 'path';
import config, { REPO_ROOT } from './config.js';

const LOG_DIR = path.join(REPO_ROOT, 'harness/logs/ollama-calls');

let _turn = 0;

// Persist every API call for audit — saved to harness/logs/ollama-calls/ (gitignored)
function saveLog(turn, request, response) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(LOG_DIR, `${ts}-turn${String(turn).padStart(2, '0')}.json`);
  fs.writeFileSync(file, JSON.stringify({ request, response }, null, 2), 'utf8');
}

/**
 * Send a chat request to Ollama and return the response message.
 * Every call is logged to harness/logs/ollama-calls/ for audit.
 */
export async function chat(messages, tools) {
  const turn = ++_turn;
  const body = {
    model: config.ollama.model,
    messages,
    tools,
    stream: false,
    think: config.ollama.think,
    options: {
      num_ctx:        config.ollama.numCtx,
      temperature:    config.ollama.temperature,
      top_p:          config.ollama.topP,
      repeat_penalty: config.ollama.repeatPenalty,
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.ollama.timeoutMs);

  let response;
  try {
    response = await fetch(`${config.ollama.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        `Ollama timed out after ${config.ollama.timeoutMs / 1000}s — ` +
          `is "${config.ollama.baseUrl}" reachable and is the model loaded?`,
      );
    }
    throw new Error(`Ollama connection failed: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Ollama HTTP ${response.status}: ${text}`);
  }

  const data = await response.json();
  if (!data.message) throw new Error(`Unexpected Ollama response shape: ${JSON.stringify(data)}`);

  saveLog(turn, body, data);
  return data.message;
}
