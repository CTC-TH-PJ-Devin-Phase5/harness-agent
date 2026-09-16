#!/usr/bin/env node
/**
 * harness/local-execute/index.js
 *
 * CLI entry point for the local-LLM execute agent (Phase 4a).
 *
 * Usage:
 *   node harness/local-execute/index.js <handoff-json-path>
 *
 * Exits 0 on success, 1 on failure.
 * Writes result to <handoff-json-path>.result.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { run } from './loop.js';
import config from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const handoffPath = process.argv[2];
  if (!handoffPath) die('Usage: node harness/local-execute/index.js <handoff-json-path>');

  const absHandoff = path.resolve(handoffPath);
  if (!fs.existsSync(absHandoff)) die(`Handoff file not found: ${absHandoff}`);

  const handoff = JSON.parse(fs.readFileSync(absHandoff, 'utf8'));
  validateHandoff(handoff);

  const { task, context } = handoff;
  const ticketPath = path.resolve(config.repoRoot, context.ticket);
  const specPath = path.resolve(config.repoRoot, context.specPath);

  if (!fs.existsSync(ticketPath)) die(`Ticket not found: ${context.ticket}`);
  if (!fs.existsSync(specPath)) die(`Spec not found: ${context.specPath}`);

  const ticketContent = fs.readFileSync(ticketPath, 'utf8');
  const specContent = fs.readFileSync(specPath, 'utf8');

  // Inject project conventions so the LLM knows project-specific patterns
  // (Vitest vs Jest, testing wrappers, import aliases, etc.)
  const conventionsPath = path.join(__dirname, 'project-conventions.md');
  const conventions = fs.existsSync(conventionsPath)
    ? fs.readFileSync(conventionsPath, 'utf8')
    : '';

  const systemPrompt = buildSystemPrompt({ task, ticketContent, specContent, conventions });

  const resultPath = absHandoff.replace(/\.json$/, '.result.json');

  log(`model   : ${config.ollama.model}`);
  log(`endpoint: ${config.ollama.baseUrl}`);
  log(`ticket  : ${context.ticket}`);

  let lastResult;

  for (let attempt = 1; attempt <= config.attempts.max; attempt++) {
    log(`─── attempt ${attempt}/${config.attempts.max} ───`);

    try {
      lastResult = await run(systemPrompt);
    } catch (err) {
      lastResult = { success: false, summary: `Threw: ${err.message}`, testOutput: '', turns: 0 };
      log(`attempt ${attempt} error: ${err.message}`);
    }

    lastResult.attempt = attempt;
    log(`attempt ${attempt} → success=${lastResult.success}`);

    if (lastResult.success) break;
    if (attempt < config.attempts.max) log('retrying...');
  }

  fs.writeFileSync(resultPath, JSON.stringify(lastResult, null, 2), 'utf8');
  console.log(formatResult(lastResult, resultPath));

  process.exit(lastResult.success ? 0 : 1);
}

function buildSystemPrompt({ task, ticketContent, specContent, conventions = '' }) {
  return `\
You are an implementation agent (Phase 4a of the development harness).
Implement EXACTLY what the ticket requires — no more, no less.
${conventions ? `\n${conventions}\n` : ''}

## Rules
- Write tests FIRST (TDD: red → green → refactor).
- Run pnpm test:unit to verify. Call done(success=true) only after it passes.
- Use edit_file for targeted changes; write_file only for new files.
- Do not commit. Do not check Acceptance Criteria.
- You have ${config.ollama.maxTurns} turns. Start by reading existing files if any.
- If you cannot complete the task, call done(success=false, summary="<reason>").

## Task
${task}

## Ticket
${ticketContent}

## Spec
${specContent}`;
}

function validateHandoff(h) {
  if (!h.context?.ticket) die('Handoff missing context.ticket');
  if (!h.context?.specPath) die('Handoff missing context.specPath');
  if (h.context?.action === 'commit') {
    die('local-execute handles implement only — use execute sub-agent for commit dispatches');
  }
}

function formatResult(result, resultPath) {
  const lines = [
    '',
    `local-execute: ${result.success ? '✓ SUCCESS' : '✗ FAILURE'}`,
    `  attempt : ${result.attempt}/${config.attempts.max}`,
    `  turns   : ${result.turns}`,
    `  summary : ${result.summary}`,
    `  result  : ${resultPath}`,
  ];
  if (result.testOutput) {
    lines.push('', 'test output:');
    for (const l of result.testOutput.trim().split('\n')) lines.push('  ' + l);
  }
  return lines.join('\n');
}

function log(msg) {
  process.stderr.write(`[local-execute] ${msg}\n`);
}

function die(msg) {
  process.stderr.write(`[local-execute] FATAL: ${msg}\n`);
  process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`[local-execute] Unhandled: ${err.stack}\n`);
  process.exit(1);
});
