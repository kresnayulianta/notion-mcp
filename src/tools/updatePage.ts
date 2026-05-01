import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWorkspace, getToken, getApiVersion } from "../config.js";
import { NotionClient } from "../notion/client.js";

export function register(server: McpServer): void {
  server.tool(
    "update-page",
    "Update properties of an existing Notion page by its page_id. Use this to change title, status, due date, assignee, or any other property on a page.",
    {
      page_id: z.string().describe("Notion page ID to update"),
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
      properties: z.string().describe(
        "Notion properties object as a JSON string. Keys are property names, values are Notion property value objects. " +
        "Examples: " +
        "{\"Status\":{\"status\":{\"name\":\"Done\"}}} " +
        "{\"Name\":{\"title\":[{\"text\":{\"content\":\"New Title\"}}]}} " +
        "{\"Due\":{\"date\":{\"start\":\"2026-04-20\"}}}"
      ),
      archived: z.boolean().optional().describe("Set to true to archive (soft-delete) the page"),
    },
    async ({ page_id, workspace, properties, archived }) => {
      try {
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const client = new NotionClient(token, getApiVersion());

        let parsedProperties: Record<string, unknown>;
        try {
          parsedProperties = JSON.parse(properties) as Record<string, unknown>;
        } catch {
          throw new Error(`Invalid JSON for properties: ${properties}`);
        }

        const params: Record<string, unknown> = { properties: parsedProperties };
        if (archived !== undefined) params.archived = archived;

        const result = await client.updatePage(page_id, params);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
      }
    }
  );
}
