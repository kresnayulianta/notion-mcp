import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWorkspace, getToken, getApiVersion } from "../config.js";
import { NotionClient } from "../notion/client.js";

export function register(server: McpServer): void {
  server.tool(
    "query-database",
    "Query any Notion database directly by its database_id. Use this when the database is not registered as a named target. Supports filter, sorts, and pagination.",
    {
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
      database_id: z.string().describe("Notion database ID (32-char hex or UUID format)"),
      filter: z.string().optional().describe("Notion filter object as a JSON string"),
      sorts: z.string().optional().describe("Notion sorts array as a JSON string"),
      page_size: z.number().int().min(1).max(100).optional().describe("Number of results (1-100)"),
      start_cursor: z.string().optional().describe("Pagination cursor from previous response"),
    },
    async ({ workspace, database_id, filter, sorts, page_size, start_cursor }) => {
      try {
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const client = new NotionClient(token, getApiVersion());

        const params: Record<string, unknown> = {};
        if (filter) {
          try { params.filter = JSON.parse(filter); }
          catch { throw new Error(`Invalid JSON for filter: ${filter}`); }
        }
        if (sorts) {
          try { params.sorts = JSON.parse(sorts); }
          catch { throw new Error(`Invalid JSON for sorts: ${sorts}`); }
        }
        if (page_size !== undefined) params.page_size = page_size;
        if (start_cursor) params.start_cursor = start_cursor;

        const results = await client.queryDatabase(database_id, params);
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
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
