import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig, requestContext, type InlineWorkspace } from "./config.js";
import * as listWorkspaces from "./tools/listWorkspaces.js";
import * as listTargets from "./tools/listTargets.js";
import * as resolveTarget from "./tools/resolveTarget.js";
import * as search from "./tools/search.js";
import * as queryDataSource from "./tools/queryDataSource.js";
import * as queryDatabase from "./tools/queryDatabase.js";
import * as createSimpleTask from "./tools/createSimpleTask.js";
import * as upsertPageInTarget from "./tools/upsertPageInTarget.js";
import * as updatePage from "./tools/updatePage.js";
import * as getPage from "./tools/getPage.js";
import * as manageTargets from "./tools/manageTargets.js";
import * as appendBlocks from "./tools/appendBlocks.js";
import * as getDatabase from "./tools/getDatabase.js";
import * as listUsers from "./tools/listUsers.js";
import * as comments from "./tools/comments.js";
import * as blockOperations from "./tools/blockOperations.js";
import * as databaseOperations from "./tools/databaseOperations.js";
import * as pageOperations from "./tools/pageOperations.js";

function createServer(): McpServer {
  const config = loadConfig();
  const server = new McpServer({ name: "notion-mcp-custom", version: "1.0.0" });

  listWorkspaces.register(server);
  listTargets.register(server);
  resolveTarget.register(server);
  search.register(server);
  queryDataSource.register(server);
  queryDatabase.register(server);
  createSimpleTask.register(server);
  upsertPageInTarget.register(server);
  updatePage.register(server);
  getPage.register(server);
  manageTargets.register(server);
  appendBlocks.register(server);
  getDatabase.register(server);
  listUsers.register(server);
  comments.register(server);
  blockOperations.register(server);
  databaseOperations.register(server);
  pageOperations.register(server);

  // ── Resources ────────────────────────────────────────────────
  server.resource(
    "workspaces",
    "notion://workspaces",
    { description: "List of configured Notion workspaces and their targets" },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify({
          defaultWorkspace: config.defaultWorkspace,
          workspaces: Object.entries(config.workspaces).map(([name, ws]) => ({
            name,
            targets: Object.keys(ws.targets),
          })),
        }),
      }],
    })
  );

  // ── Prompts ──────────────────────────────────────────────────
  server.prompt(
    "create-task",
    "Create a new task in the Notion personal workspace",
    async () => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: 'Use the create-simple-task tool with workspace "personal" and target "tasks". Provide a title, and optionally due_date (ISO 8601), notes, priority (High/Medium/Low), and status.',
        },
      }],
    })
  );

  server.prompt(
    "search-notion",
    "Search across a Notion workspace for pages or database entries",
    async () => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: 'Use the search tool with workspace "personal" and a query string. Returns matching pages and database entries. For structured data queries, use query-data-source instead.',
        },
      }],
    })
  );

  return server;
}

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.MCP_HTTP_PORT ?? "3000", 10);
const MCP_API_KEY = process.env.MCP_API_KEY;

function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (!MCP_API_KEY) { next(); return; }
  const auth = req.headers["authorization"];
  const fromBearer = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  const fromHeader = req.headers["x-api-key"];
  const provided = fromBearer ?? (Array.isArray(fromHeader) ? fromHeader[0] : fromHeader);
  if (provided !== MCP_API_KEY) {
    res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
    return;
  }
  next();
}

app.use("/mcp", requireApiKey);

/** Extract Notion token from request — X-Notion-Token header or ?token= param.
 *  Note: Authorization header is reserved for MCP API key auth. */
function extractToken(req: express.Request): string | undefined {
  const xToken = req.headers["x-notion-token"];
  if (xToken) return Array.isArray(xToken) ? xToken[0] : xToken;
  const qToken = req.query.token;
  if (typeof qToken === "string") return qToken;
  if (Array.isArray(qToken) && typeof qToken[0] === "string") return qToken[0] as string;
  return undefined;
}

/** Parse X-Notion-Config header → inline multi-workspace config */
function extractInlineConfig(req: express.Request): Record<string, InlineWorkspace> | undefined {
  const raw = req.headers["x-notion-config"];
  const str = Array.isArray(raw) ? raw[0] : raw;
  if (!str) return undefined;
  try {
    return JSON.parse(str) as Record<string, InlineWorkspace>;
  } catch {
    console.warn("notion-mcp: failed to parse X-Notion-Config header:", str.slice(0, 120));
    return undefined;
  }
}

function buildCtx(req: express.Request) {
  return {
    defaultWorkspace: req.query.workspace as string | undefined,
    adhocToken: extractToken(req),
    tokenEnv: req.query.token_env as string | undefined,
    inlineConfig: extractInlineConfig(req),
    apiVersion: req.query.api_version as string | undefined,
  };
}

app.post("/mcp", async (req, res) => {
  await requestContext.run(buildCtx(req), async () => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => { server.close().catch(console.error); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
});

app.get("/mcp", async (req, res) => {
  await requestContext.run(buildCtx(req), async () => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => { server.close().catch(console.error); });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });
});

app.delete("/mcp", async (req, res) => {
  res.status(405).json({ error: "Method not supported in stateless mode" });
});

app.get("/health", (_req, res) => { res.json({ ok: true, service: "notion-mcp" }); });

app.listen(PORT, () => {
  console.log(`notion-mcp HTTP server listening on :${PORT}`);
});
