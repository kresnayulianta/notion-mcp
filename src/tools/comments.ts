import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWorkspace, getToken, getApiVersion } from "../config.js";
import { NotionClient } from "../notion/client.js";

export function register(server: McpServer): void {
  server.tool(
    "list-comments",
    "List all comments on a Notion page or block.",
    {
      page_id: z.string().describe("Page or block ID to list comments for"),
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
      start_cursor: z.string().optional().describe("Pagination cursor from a previous response"),
    },
    async ({ page_id, workspace, start_cursor }) => {
      try {
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const client = new NotionClient(token, getApiVersion());
        const result = await client.listComments(page_id, start_cursor);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    "create-comment",
    "Add a comment to a Notion page or inline on a specific block.",
    {
      page_id: z.string().optional().describe("Page ID to comment on (top-level comment). Use either page_id or block_id + discussion_id."),
      block_id: z.string().optional().describe("Block ID for inline comment (requires discussion_id)"),
      discussion_id: z.string().optional().describe("Discussion thread ID for inline comment on a block"),
      text: z.string().describe("Comment text content"),
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
    },
    async ({ page_id, block_id, discussion_id, text, workspace }) => {
      try {
        if (!page_id && !block_id) {
          return {
            content: [{ type: "text", text: "Error: provide either page_id (top-level comment) or block_id + discussion_id (inline comment)" }],
            isError: true,
          };
        }

        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const client = new NotionClient(token, getApiVersion());

        const rich_text = [{ type: "text", text: { content: text } }];

        let params: Record<string, unknown>;
        if (page_id) {
          params = { parent: { page_id }, rich_text };
        } else {
          params = { discussion_id, rich_text };
        }

        const result = await client.createComment(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
      }
    }
  );
}
