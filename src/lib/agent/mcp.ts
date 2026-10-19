// The desk as a remote MCP server, so any MCP client (Claude, ChatGPT, Cursor) can use the same tools as the in-app agent.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { DESK_TOOLS } from "./registry";
import { DeskToolError } from "./tools";

const INSTRUCTIONS =
  "Matchday Revenue Desk is for the marketing and sponsorship staff of MLB and affiliated minor league baseball clubs. It plans next " +
  "season's promotion nights from measured attendance lift, lists sponsor prospects (local businesses plus Qloo audience-fit brands with " +
  "evidence) and finds family food partners near the ballpark. Start with find_clubs to get a club id. Quote numbers as the tools give " +
  "them and say they are estimates; don't invent sponsors, partners or dates the tools didn't return.";

/** Read-only lookups over cached data: nothing is written, deleted or fetched from the open web. */
const ANNOTATIONS = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

export async function toolResult(work: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    const out = await work();
    return { content: [{ type: "text", text: JSON.stringify(out) }], structuredContent: out as Record<string, unknown> };
  } catch (error) {
    if (error instanceof DeskToolError) return { content: [{ type: "text", text: error.message }], isError: true };
    console.error("[mcp] tool failed", error);
    return { content: [{ type: "text", text: "The desk couldn't answer that just now. Please try again in a moment." }], isError: true };
  }
}

export function buildDeskServer(limited: string | null): McpServer {
  const server = new McpServer({ name: "matchday-revenue-desk", title: "Matchday Revenue Desk", version: "1.0.0" }, { instructions: INSTRUCTIONS });
  for (const [name, t] of Object.entries(DESK_TOOLS)) {
    server.registerTool(name, { title: t.title, description: t.description, inputSchema: t.input, annotations: ANNOTATIONS }, (args: unknown) =>
      limited ? Promise.resolve({ content: [{ type: "text" as const, text: limited }], isError: true }) : toolResult(() => t.run(args as never)),
    );
  }
  return server;
}
