import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWorkspace, getToken, getApiVersion } from "../config.js";
import { NotionClient } from "../notion/client.js";

export function register(server: McpServer): void {
  server.tool(
    "create-database",
    "Create a new Notion database as a child of an existing page. Requires defining the database title and its property schema.",
    {
      parent_page_id: z.string().describe("Page ID that will contain this database"),
      title: z.string().describe("Database title"),
      properties: z.string().describe(
        "Database property schema as JSON string. Must include at least a 'title' property. " +
        "Example: {\"Name\":{\"title\":{}},\"Status\":{\"select\":{\"options\":[{\"name\":\"Todo\",\"color\":\"red\"},{\"name\":\"Done\",\"color\":\"green\"}]}},\"Due Date\":{\"date\":{}}}"
      ),
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
    },
    async ({ parent_page_id, title, properties, workspace }) => {
      try {
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const client = new NotionClient(token, getApiVersion());

        let parsedProperties: unknown;
        try {
          parsedProperties = JSON.parse(properties);
        } catch (e) {
          return {
            content: [{ type: "text", text: `Error parsing properties JSON: ${e instanceof Error ? e.message : String(e)}` }],
            isError: true,
          };
        }

        const params = {
          parent: { type: "page_id", page_id: parent_page_id },
          title: [{ type: "text", text: { content: title } }],
          properties: parsedProperties,
        };

        const result = await client.createDatabase(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    "update-database",
    "Update a Notion database's title, description, or property schema.",
    {
      database_id: z.string().describe("Notion database ID to update"),
      title: z.string().optional().describe("New database title"),
      description: z.string().optional().describe("New database description"),
      properties: z.string().optional().describe(
        "Updated property schema as JSON string. Only include properties you want to add or modify — existing properties not listed are unchanged. " +
        "Example: {\"Priority\":{\"select\":{\"options\":[{\"name\":\"High\",\"color\":\"red\"}]}}}"
      ),
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
    },
    async ({ database_id, title, description, properties, workspace }) => {
      try {
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const client = new NotionClient(token, getApiVersion());

        const params: Record<string, unknown> = {};
        if (title) params.title = [{ type: "text", text: { content: title } }];
        if (description) params.description = [{ type: "text", text: { content: description } }];
        if (properties) {
          try {
            params.properties = JSON.parse(properties);
          } catch (e) {
            return {
              content: [{ type: "text", text: `Error parsing properties JSON: ${e instanceof Error ? e.message : String(e)}` }],
              isError: true,
            };
          }
        }

        const result = await client.updateDatabase(database_id, params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
      }
    }
  );
}
