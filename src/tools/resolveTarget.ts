import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getWorkspace, resolveTarget } from "../config.js";

export function register(server: McpServer): void {
  server.tool(
    "resolve-target",
    "Resolve and return the full config for a specific target in a workspace",
    {
      workspace: z.string().optional().describe("Workspace name (uses default if omitted)"),
      target: z.string().describe("Target name within the workspace"),
    },
    async ({ workspace, target }) => {
      try {
        const { name: wsName, config: wsConfig } = getWorkspace(workspace);
        const targetConfig = resolveTarget(wsConfig, target);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  workspace: wsName,
                  target,
                  ...targetConfig,
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
