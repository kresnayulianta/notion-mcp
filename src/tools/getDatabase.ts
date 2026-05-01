import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWorkspace, getToken, getApiVersion } from "../config.js";
import { NotionClient } from "../notion/client.js";

export function register(server: McpServer): void {
  server.tool(
    "get-database",
    "Retrieve a Notion database schema — including all property names, types, and select/multi-select options. Use this to understand a database before querying or creating pages in it.",
    {
      database_id: z.string().describe("Notion database ID (32-char hex or UUID format)"),
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
    },
    async ({ database_id, workspace }) => {
      try {
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const client = new NotionClient(token, getApiVersion());
        const result = await client.retrieveDatabase(database_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
      }
    }
  );
}
