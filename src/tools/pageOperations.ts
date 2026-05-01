import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWorkspace, getToken, getApiVersion } from "../config.js";
import { NotionClient } from "../notion/client.js";

export function register(server: McpServer): void {
  server.tool(
    "get-page-markdown",
    "Get the content of a Notion page rendered as Markdown. Simpler alternative to get-page-content (which returns raw block objects).",
    {
      page_id: z.string().describe("Notion page ID"),
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
    },
    async ({ page_id, workspace }) => {
      try {
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const client = new NotionClient(token, getApiVersion());
        const result = await client.getPageMarkdown(page_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    "move-page",
    "Move a Notion page to a different parent (another page or database).",
    {
      page_id: z.string().describe("Page ID to move"),
      parent_type: z.enum(["page_id", "database_id"]).describe("Type of the new parent"),
      parent_id: z.string().describe("ID of the new parent page or database"),
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
    },
    async ({ page_id, parent_type, parent_id, workspace }) => {
      try {
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const client = new NotionClient(token, getApiVersion());
        const parent = { [parent_type]: parent_id };
        const result = await client.movePage(page_id, parent);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
      }
    }
  );
}
