import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWorkspace, getToken, getApiVersion } from "../config.js";
import { NotionClient } from "../notion/client.js";

export function register(server: McpServer): void {
  server.tool(
    "append-blocks",
    "Append new content blocks (paragraphs, headings, bullet lists, to-dos, code, etc.) to a Notion page or block. Use this to write content to a page — not just properties.",
    {
      block_id: z.string().describe("Page or block ID to append children to (same as page_id for top-level pages)"),
      children: z.string().describe(
        "Notion blocks array as JSON string. Each block must have a 'type' and matching type object. " +
        "Examples: paragraph: {\"type\":\"paragraph\",\"paragraph\":{\"rich_text\":[{\"type\":\"text\",\"text\":{\"content\":\"Hello\"}}]}} " +
        "heading_2: {\"type\":\"heading_2\",\"heading_2\":{\"rich_text\":[{\"type\":\"text\",\"text\":{\"content\":\"Section\"}}]}} " +
        "bulleted_list_item: {\"type\":\"bulleted_list_item\",\"bulleted_list_item\":{\"rich_text\":[{\"type\":\"text\",\"text\":{\"content\":\"Item\"}}]}} " +
        "to_do: {\"type\":\"to_do\",\"to_do\":{\"rich_text\":[{\"type\":\"text\",\"text\":{\"content\":\"Task\"}}],\"checked\":false}}"
      ),
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
    },
    async ({ block_id, children, workspace }) => {
      try {
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);
        const client = new NotionClient(token, getApiVersion());

        let parsed: unknown[];
        try {
          parsed = JSON.parse(children) as unknown[];
          if (!Array.isArray(parsed)) throw new Error("children must be a JSON array");
        } catch (e) {
          return {
            content: [{ type: "text", text: `Error parsing children JSON: ${e instanceof Error ? e.message : String(e)}` }],
            isError: true,
          };
        }

        const result = await client.appendBlockChildren(block_id, parsed);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
      }
    }
  );
}
