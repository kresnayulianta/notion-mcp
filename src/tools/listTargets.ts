import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadConfig, getWorkspace } from "../config.js";

export function register(server: McpServer): void {
  server.tool(
    "list-targets",
    "List all targets for a workspace (or all workspaces if none specified)",
    {
      workspace: z.string().optional().describe("Workspace name (omit to list all)"),
    },
    async ({ workspace }) => {
      try {
        const config = loadConfig();
        const workspaceNames: string[] = workspace
          ? [getWorkspace(workspace).name]
          : Object.keys(config.workspaces);

        const result = workspaceNames.flatMap((wsName) => {
          const ws = config.workspaces[wsName];
          return Object.entries(ws.targets).map(([targetName, target]) => ({
            workspace: wsName,
            target: targetName,
            data_source_id: target.data_source_id ?? null,
            database_id: target.database_id ?? null,
            propertyAliases: target.propertyAliases ?? {},
          }));
        });

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
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
