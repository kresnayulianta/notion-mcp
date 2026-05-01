import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadConfig, saveConfig } from "../config.js";

export function register(server: McpServer): void {
  server.tool(
    "add-target",
    "Register a Notion database as a named target in a workspace config. After adding, the target can be used with query-data-source and upsert-page-in-target by name.",
    {
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
      target: z.string().describe("Name for this target (e.g. 'tasks', 'projects')"),
      database_id: z.string().optional().describe("Notion database ID. Use this OR data_source_id."),
      data_source_id: z.string().optional().describe("Notion data source ID (preferred over database_id if both available)"),
      property_aliases: z.string().optional().describe(
        "JSON object mapping alias → actual Notion property name. E.g. '{\"title\":\"Name\",\"due_date\":\"Due\"}'"
      ),
    },
    async ({ workspace, target, database_id, data_source_id, property_aliases }) => {
      try {
        if (!database_id && !data_source_id) {
          throw new Error("Either database_id or data_source_id must be provided.");
        }

        const config = loadConfig();
        const wsKey = workspace ?? config.defaultWorkspace ?? Object.keys(config.workspaces)[0];
        if (!wsKey) throw new Error("No workspace found.");

        const ws = config.workspaces[wsKey];
        if (!ws) throw new Error(`Workspace "${wsKey}" not found.`);

        if (!ws.targets) ws.targets = {};

        let aliases: Record<string, string> | undefined;
        if (property_aliases) {
          try { aliases = JSON.parse(property_aliases) as Record<string, string>; }
          catch { throw new Error(`Invalid JSON for property_aliases: ${property_aliases}`); }
        }

        ws.targets[target] = {
          ...(data_source_id ? { data_source_id } : {}),
          ...(database_id ? { database_id } : {}),
          ...(aliases ? { propertyAliases: aliases } : {}),
        };

        saveConfig(config);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ success: true, workspace: wsKey, target, config: ws.targets[target] }, null, 2),
          }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    "remove-target",
    "Remove a named target from a workspace config.",
    {
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
      target: z.string().describe("Target name to remove"),
    },
    async ({ workspace, target }) => {
      try {
        const config = loadConfig();
        const wsKey = workspace ?? config.defaultWorkspace ?? Object.keys(config.workspaces)[0];
        if (!wsKey) throw new Error("No workspace found.");

        const ws = config.workspaces[wsKey];
        if (!ws) throw new Error(`Workspace "${wsKey}" not found.`);
        if (!ws.targets?.[target]) throw new Error(`Target "${target}" not found in workspace "${wsKey}".`);

        delete ws.targets[target];
        saveConfig(config);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ success: true, workspace: wsKey, removed: target }, null, 2),
          }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
      }
    }
  );
}
