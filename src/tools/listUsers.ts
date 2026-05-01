import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWorkspace, getToken, getApiVersion } from "../config.js";
import { NotionClient } from "../notion/client.js";

export function register(server: McpServer): void {
  server.tool(
    "list-users",
    "List all users in the Notion workspace. Returns user IDs, names, and email addresses — useful for finding user IDs to assign pages/tasks.",
    {
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
      start_cursor: z.string().optional().describe("Pagination cursor from a previous response"),
    },
    async ({ workspace, start_cursor }) => {
      try {
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const client = new NotionClient(token, getApiVersion());
        const result = await client.listUsers(start_cursor);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
      }
    }
  );
}
