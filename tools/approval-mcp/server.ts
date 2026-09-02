/**
 * tools/approval-mcp/server.ts
 *
 * MCP server exposing `request`, a BLOCKING human approval gate (R8).
 * There is no auto-approve path anywhere in this file, by design (R5/R6):
 * every ticket's diff and every commit must get an explicit human yes/no.
 *
 * The `run` tool call blocks on approvalQueue.enqueueAndWait(), which only
 * resolves once something calls approvalQueue.respond() — normally driven
 * by a small CLI loop (see main() below) that prints the pending request
 * and reads a y/n from stdin.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createInterface } from "node:readline";
import { approvalQueue } from "./queue";
import { recordEvent } from "../telemetry/recorder";

const server = new Server(
  { name: "approval-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "request",
      description:
        "Ask a human to approve or reject a diff/command BEFORE it is committed. " +
        "Blocks until the human responds. There is no auto-approve.",
      inputSchema: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "Diff or command summary to show the human.",
          },
        },
        required: ["summary"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { summary } = (req.params.arguments ?? {}) as { summary: string };

  recordEvent("approval_requested", { summary });
  const response = await approvalQueue.enqueueAndWait(summary);
  recordEvent("approval_responded", {
    id: response.id,
    approved: response.approved,
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ approved: response.approved }, null, 2),
      },
    ],
    isError: !response.approved,
  };
});

/**
 * Minimal CLI driver: polls the queue and prompts on stdin whenever there's
 * a pending request. Swap this out for a richer UI without touching the
 * MCP tool contract above.
 */
function startCliDriver() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const poll = setInterval(() => {
    const next = approvalQueue.peekNext();
    if (!next) return;

    clearInterval(poll);
    console.log("\n=== Approval requested ===");
    console.log(next.summary);
    rl.question("Approve? [y/N] ", (answer) => {
      const approved = answer.trim().toLowerCase() === "y";
      approvalQueue.respond(next.id, approved);
      startCliDriver(); // resume polling for the next request, if any
    });
  }, 250);
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  startCliDriver();
}

main().catch((err) => {
  console.error("approval-mcp fatal error:", err);
  process.exit(1);
});
