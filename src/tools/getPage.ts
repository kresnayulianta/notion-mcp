import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWorkspace, getToken, getApiVersion } from "../config.js";
import { NotionClient } from "../notion/client.js";

export function register(server: McpServer): void {
  server.tool(
    "get-page",
    "Get a Notion page's properties by its page ID",
    {
      page_id: z.string().describe("Notion page ID (32-char hex or UUID format)"),
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
    },
    async ({ page_id, workspace }) => {
      try {
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const client = new NotionClient(token, getApiVersion());
        const result = await client.retrievePage(page_id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get-page-content",
    "Get the block content (body text, paragraphs, headings, etc.) of a Notion page",
    {
      page_id: z.string().describe("Notion page ID — same as block ID for top-level pages"),
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
      start_cursor: z.string().optional().describe("Pagination cursor for next page of blocks"),
    },
    async ({ page_id, workspace, start_cursor }) => {
      try {
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const client = new NotionClient(token, getApiVersion());
        const result = await client.getBlockChildren(page_id, start_cursor);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
