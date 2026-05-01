import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWorkspace, getToken, resolveTarget, getApiVersion } from "../config.js";
import { NotionClient } from "../notion/client.js";

export function register(server: McpServer): void {
  server.tool(
    "query-data-source",
    "Query a Notion database or data source by target name",
    {
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
      target: z.string().describe("Target name within the workspace"),
      filter: z
        .string()
        .optional()
        .describe("Notion filter object as a JSON string"),
      sorts: z
        .string()
        .optional()
        .describe("Notion sorts array as a JSON string"),
      page_size: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results to return (1-100)"),
    },
    async ({ workspace, target, filter, sorts, page_size }) => {
      try {
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const targetConfig = resolveTarget(wsConfig, target);

        const databaseId = targetConfig.data_source_id ?? targetConfig.database_id;
        if (!databaseId) {
          throw new Error(
            `Target "${target}" has neither data_source_id nor database_id configured.`
          );
        }

        const params: Record<string, unknown> = {};
        if (filter) {
          try {
            params.filter = JSON.parse(filter);
          } catch {
            throw new Error(`Invalid JSON for filter: ${filter}`);
          }
        }
        if (sorts) {
          try {
            params.sorts = JSON.parse(sorts);
          } catch {
            throw new Error(`Invalid JSON for sorts: ${sorts}`);
          }
        }
        if (page_size !== undefined) {
          params.page_size = page_size;
        }

        const client = new NotionClient(token, getApiVersion());
        const results = await client.queryDatabase(databaseId, params);
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
