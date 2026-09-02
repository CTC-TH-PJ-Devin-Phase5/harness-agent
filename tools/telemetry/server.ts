/**
 * tools/telemetry/server.ts
 *
 * MCP server exposing `record`, so sub-agents (namely `execute`) can log
 * stage milestones themselves (e.g. execute_started, test_run,
 * execute_finished) per R10 — matches the mcp__telemetry__record entry in
 * .claude/harness.json permissions.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { recordEvent } from "./recorder";
import { TEST_RUN_CONTRACT } from "./test-run";

const server = new Server(
  { name: "telemetry-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "record",
      description:
        "Append an event to the current session's telemetry log. " +
        "Use for stage milestones (execute_started, test_run, execute_finished, etc). " +
        TEST_RUN_CONTRACT,
      inputSchema: {
        type: "object",
        properties: {
          eventName: { type: "string" },
          details: { type: "object", additionalProperties: true },
        },
        required: ["eventName"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { eventName, details } = (req.params.arguments ?? {}) as {
    eventName: string;
    details?: Record<string, unknown>;
  };

  recordEvent(eventName, details ?? {});

  return {
    content: [{ type: "text", text: `recorded: ${eventName}` }],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("telemetry-mcp fatal error:", err);
  process.exit(1);
});
