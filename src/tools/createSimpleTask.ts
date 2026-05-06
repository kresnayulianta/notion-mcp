import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWorkspace, getToken, resolveTarget, getApiVersion } from "../config.js";
import { NotionClient } from "../notion/client.js";

function alias(aliases: Record<string, string> | undefined, key: string): string {
  return aliases?.[key] ?? key;
}

export function register(server: McpServer): void {
  server.tool(
    "create-simple-task",
    "Create a new page/task in a Notion database target",
    {
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
      target: z.string().optional().describe("Target name within the workspace (use this OR database_id)"),
      database_id: z.string().optional().describe("Notion database ID — use directly without a named target"),
      title: z.string().describe("Title of the task"),
      due_date: z.string().optional().describe("Due date as ISO 8601 date string (e.g. 2024-12-31)"),
      notes: z.string().optional().describe("Notes or description for the task"),
      priority: z.string().optional().describe("Priority level (e.g. High, Medium, Low)"),
      status: z.string().optional().describe("Status value (e.g. Not started, In progress, Done)"),
    },
    async ({ workspace, target, database_id, title, due_date, notes, priority, status }) => {
      try {
        if (!target && !database_id) {
          throw new Error("Either target or database_id must be provided.");
        }
        const { config: wsConfig } = getWorkspace(workspace);
        const token = getToken(wsConfig);

        let databaseId: string;
        let aliases: Record<string, string> | undefined;
        if (target) {
          const targetConfig = resolveTarget(wsConfig, target);
          aliases = targetConfig.propertyAliases;
          databaseId = (targetConfig.database_id ?? targetConfig.data_source_id)!;
          if (!databaseId) throw new Error(`Target "${target}" has neither database_id nor data_source_id configured.`);
        } else {
          databaseId = database_id!;
        }

        const properties: Record<string, unknown> = {};

        // Title property (special Notion type)
        const titleKey = alias(aliases, "title");
        properties[titleKey] = {
          title: [{ text: { content: title } }],
        };

        // Due date
        if (due_date !== undefined) {
          const dueDateKey = alias(aliases, "due_date");
          properties[dueDateKey] = {
            date: { start: due_date },
          };
        }

        // Notes (rich text)
        if (notes !== undefined) {
          const notesKey = alias(aliases, "notes");
          properties[notesKey] = {
            rich_text: [{ text: { content: notes } }],
          };
        }

        // Priority (select)
        if (priority !== undefined) {
          const priorityKey = alias(aliases, "priority");
          properties[priorityKey] = {
            select: { name: priority },
          };
        }

        // Status (status type)
        if (status !== undefined) {
          const statusKey = alias(aliases, "status");
          properties[statusKey] = {
            status: { name: status },
          };
        }

        const client = new NotionClient(token, getApiVersion());
        const page = await client.createPage({
          parent: { database_id: databaseId },
          properties,
        });

        const typedPage = page as { id?: string; url?: string };
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id: typedPage.id,
                  url: typedPage.url,
                  created: true,
                },
                null,
                2
              ),
            },
          ],
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
