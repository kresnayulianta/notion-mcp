import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWorkspace, getToken, getApiVersion } from "../config.js";
import { NotionClient } from "../notion/client.js";

export function register(server: McpServer): void {
  server.tool(
    "get-block",
    "Retrieve a specific Notion block by its ID, returning its type and content.",
    {
      block_id: z.string().describe("Block ID to retrieve"),
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
    },
    async ({ block_id, workspace }) => {
      try {
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const client = new NotionClient(token, getApiVersion());
        const result = await client.retrieveBlock(block_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    "update-block",
    "Update the content of an existing Notion block. Pass the block type and its updated content object.",
    {
      block_id: z.string().describe("Block ID to update"),
      block_type: z.string().describe(
        "Block type (e.g. 'paragraph', 'heading_1', 'heading_2', 'bulleted_list_item', 'to_do', 'code')"
      ),
      content: z.string().describe(
        "Block content as JSON string matching the block type object. " +
        "Example for paragraph: {\"rich_text\":[{\"type\":\"text\",\"text\":{\"content\":\"Updated text\"}}]}"
      ),
      archived: z.boolean().optional().describe("Set true to archive (soft-delete) the block"),
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
    },
    async ({ block_id, block_type, content, archived, workspace }) => {
      try {
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const client = new NotionClient(token, getApiVersion());

        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          return {
            content: [{ type: "text", text: `Error parsing content JSON: ${e instanceof Error ? e.message : String(e)}` }],
            isError: true,
          };
        }

        const params: Record<string, unknown> = { [block_type]: parsed };
        if (archived !== undefined) params.archived = archived;

        const result = await client.updateBlock(block_id, params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    "delete-block",
    "Delete (archive) a specific Notion block by its ID. This removes the block from the page.",
    {
      block_id: z.string().describe("Block ID to delete"),
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
    },
    async ({ block_id, workspace }) => {
      try {
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const client = new NotionClient(token, getApiVersion());
        const result = await client.deleteBlock(block_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
      }
    }
  );
}
