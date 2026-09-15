import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import config, { REPO_ROOT } from './config.js';

// ─── Ollama tool definitions (JSON Schema) ───────────────────────────────────

export const DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the full content of a file in the repository.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Repo-relative path, e.g. src/api/hello.ts' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'List files and directories under a repo path.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Repo-relative directory path' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Create or completely overwrite a file. Creates parent directories if needed.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Repo-relative path' },
          content: { type: 'string', description: 'Full file content to write' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description:
        'Replace an exact string in a file. old_string must appear exactly once. ' +
        'Prefer this over write_file for targeted edits.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Repo-relative path' },
          old_string: { type: 'string', description: 'Exact text to find (must be unique in file)' },
          new_string: { type: 'string', description: 'Text to replace it with' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_bash',
      description:
        'Run an allowed shell command from the repository root. ' +
        'Use this to run pnpm test:unit and check results.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Command to run. Allowed: pnpm test:unit (and other pnpm/npx test commands)',
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'done',
      description:
        'Signal that the implementation attempt is complete. ' +
        'Call with success=true only after pnpm test:unit passes.',
      parameters: {
        type: 'object',
        properties: {
          success: { type: 'boolean', description: 'true = tests pass, false = giving up' },
          summary: { type: 'string', description: 'One-sentence description of what was done' },
          test_output: {
            type: 'string',
            description: 'Actual pnpm test:unit output (command + pass/fail counts)',
          },
        },
        required: ['success', 'summary'],
      },
    },
  },
];

// ─── Security helpers ─────────────────────────────────────────────────────────

function safePath(relPath) {
  const resolved = path.resolve(REPO_ROOT, relPath);
  if (!resolved.startsWith(REPO_ROOT + path.sep) && resolved !== REPO_ROOT) {
    throw new Error(`Path "${relPath}" resolves outside repository root`);
  }
  return resolved;
}

function isCommandAllowed(command) {
  const trimmed = command.trim();
  return config.bash.allowedPrefixes.some((prefix) => trimmed.startsWith(prefix));
}

// ─── Tool handlers ────────────────────────────────────────────────────────────

const HANDLERS = {
  read_file({ path: relPath }) {
    const abs = safePath(relPath);
    if (!fs.existsSync(abs)) throw new Error(`File not found: ${relPath}`);
    return { output: fs.readFileSync(abs, 'utf8') };
  },

  list_files({ path: relPath = '.' }) {
    const abs = safePath(relPath);
    if (!fs.existsSync(abs)) throw new Error(`Path not found: ${relPath}`);
    const entries = fs.readdirSync(abs, { withFileTypes: true }).map((d) =>
      d.isDirectory() ? `${d.name}/` : d.name,
    );
    return { output: entries.join('\n') };
  },

  write_file({ path: relPath, content }) {
    const abs = safePath(relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
    return { output: `Written: ${relPath}` };
  },

  edit_file({ path: relPath, old_string, new_string }) {
    const abs = safePath(relPath);
    if (!fs.existsSync(abs)) throw new Error(`File not found: ${relPath}`);
    const original = fs.readFileSync(abs, 'utf8');
    const occurrences = original.split(old_string).length - 1;
    if (occurrences === 0) throw new Error(`old_string not found in ${relPath}`);
    if (occurrences > 1) {
      throw new Error(
        `old_string appears ${occurrences} times in ${relPath} — provide more context to make it unique`,
      );
    }
    fs.writeFileSync(abs, original.replace(old_string, new_string), 'utf8');
    return { output: `Edited: ${relPath}` };
  },

  run_bash({ command }) {
    if (!isCommandAllowed(command)) {
      throw new Error(
        `Command not allowed: "${command}". Allowed prefixes: ${config.bash.allowedPrefixes.join(', ')}`,
      );
    }
    try {
      const stdout = execSync(command, {
        cwd: REPO_ROOT,
        timeout: config.bash.timeoutMs,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { output: stdout };
    } catch (err) {
      const out = [err.stdout, err.stderr].filter(Boolean).join('\n');
      return { output: `Exit ${err.status ?? 1}\n${out}` };
    }
  },

  done({ success, summary, test_output }) {
    return { isDone: true, payload: { success, summary, testOutput: test_output ?? '' } };
  },
};

export function execute(name, args) {
  const handler = HANDLERS[name];
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return handler(args);
}
