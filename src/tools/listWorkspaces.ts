import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig, listWorkspaceNames } from "../config.js";

export function register(server: McpServer): void {
  server.tool("list-workspaces", "List all configured Notion workspaces", {}, async () => {
    try {
      const config = loadConfig();
      const result = listWorkspaceNames().map((name) => {
        const ws = config.workspaces[name];
        return {
          name,
          tokenEnv: ws.tokenEnv,
          targetCount: Object.keys(ws.targets).length,
        };
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
  });
}
