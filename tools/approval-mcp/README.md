# approval-mcp

MCP server exposing `request` — a **blocking** human approval gate (R8).
No auto-approve path exists anywhere in this server.

- `queue.ts` — FIFO queue. Built as a queue from day one so parallel
  execution (R12) can be turned on later without refactoring this file;
  today it only ever holds one item because `execution.mode` defaults to
  `sequential`.
- `server.ts` — the MCP tool itself, plus a minimal stdin CLI driver that
  prompts the human whenever something is waiting in the queue.

## Run it

```bash
pnpm run approval-mcp
```

(`node -r ts-node/register tools/approval-mcp/server.ts` — the CommonJS
register hook, not `--loader ts-node/esm`: this package is `type: commonjs`
and the ESM loader fails to load these files.)

Point your MCP client config at this command, tool name `mcp__approval__request`.
