import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(__dirname, '../..');

// Load .env from harness/local-execute/ (scoped to this component, not repo root)
// This avoids conflicts with the project's own .env at repo root.
// See harness/local-execute/.env.example for available variables.
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

// ─── Config ──────────────────────────────────────────────────────────────────
// Source of truth:
//   1. Environment variables (.env or shell export)  ← user-specific
//   2. Defaults below                                ← safe fallbacks
//
// Model/endpoint are NOT in harness.json — they belong to the environment.
// harness.json only controls structural config (provider toggle, execution mode).

export default {
  repoRoot: REPO_ROOT,

  ollama: {
    baseUrl:       process.env.OLLAMA_BASE_URL        ?? 'http://localhost:11434',
    model:         process.env.OLLAMA_MODEL           ?? 'harness-coder',
    // think: chain-of-thought scratchpad — supported by qwen3:32b (the default base model).
    // Enabled by default; set OLLAMA_THINK=false to disable for faster commit dispatches.
    think:         process.env.OLLAMA_THINK !== 'false',
    timeoutMs:     Number(process.env.OLLAMA_TIMEOUT_MS    ?? 180_000),
    maxTurns:      20,
    // Context window: Ollama default is 2048 — far too small for code files.
    // 16K: model ~20 GB + KV cache ~0.7 GB = ~20.7 GB, fits A10G 24 GB safely.
    // (32K would need ~4.3 GB KV + 20 GB model = 24.3 GB, exceeds A10G.)
    numCtx:        Number(process.env.OLLAMA_NUM_CTX       ?? 16_384),
    // Low temperature reduces hallucination on deterministic coding tasks.
    temperature:   Number(process.env.OLLAMA_TEMPERATURE   ?? 0.1),
    topP:          Number(process.env.OLLAMA_TOP_P         ?? 0.9),
    // Penalise token repetition — reduces stuck loops in long completions.
    repeatPenalty: Number(process.env.OLLAMA_REPEAT_PENALTY ?? 1.1),
  },

  attempts: { max: 2 },

  bash: {
    // Mirrors the allow list in .claude/settings.json — keep in sync.
    allowedPrefixes: [
      'pnpm install',
      'pnpm test',
      'pnpm run test',
      'pnpm run lint',
      'pnpm run typecheck',
      'pnpm run build',
      'npx vitest',
      'npx tsc',
      'npx eslint',
      'npx prettier',
      'node --test',
    ],
    timeoutMs: 120_000,
  },
};
