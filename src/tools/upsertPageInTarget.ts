import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWorkspace, getToken, resolveTarget, getApiVersion } from "../config.js";
import { NotionClient } from "../notion/client.js";

export function register(server: McpServer): void {
  server.tool(
    "upsert-page-in-target",
    "Create or update a page in a Notion database target based on a matching property value",
    {
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
      target: z.string().describe("Target name within the workspace"),
      match_property: z.string().describe("Property name to match on for the upsert lookup"),
      match_value: z.string().describe("Value to match in the match_property field"),
      properties: z
        .string()
        .describe("Notion properties object as a JSON string (property name -> Notion property value)"),
    },
    async ({ workspace, target, match_property, match_value, properties }) => {
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

        let parsedProperties: Record<string, unknown>;
        try {
          parsedProperties = JSON.parse(properties);
        } catch {
          throw new Error(`Invalid JSON for properties: ${properties}`);
        }

        const client = new NotionClient(token, getApiVersion());

        // Query database to find existing page by match_property == match_value
        const queryResult = await client.queryDatabase(databaseId, {
          filter: {
            property: match_property,
            rich_text: {
              equals: match_value,
            },
          },
          page_size: 1,
        });

        const typedResult = queryResult as { results?: Array<{ id: string }> };
        const existingPages = typedResult.results ?? [];

        if (existingPages.length > 0) {
          // Update existing page
          const pageId = existingPages[0].id;
          await client.updatePage(pageId, { properties: parsedProperties });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ id: pageId, action: "updated" }, null, 2),
              },
            ],
          };
        } else {
          // Create new page
          const page = await client.createPage({
            parent: { database_id: databaseId },
            properties: parsedProperties,
          });
          const typedPage = page as { id?: string; url?: string };
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { id: typedPage.id, url: typedPage.url, action: "created" },
                  null,
                  2
                ),
              },
            ],
          };
        }
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
