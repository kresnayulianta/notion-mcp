#!/usr/bin/env node
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    http: { type: "boolean", default: false },
    port: { type: "string", default: "3000" },
    help: { type: "boolean", short: "h", default: false },
  },
  allowPositionals: true,
});

if (values.help) {
  console.error([
    "Usage: notion-mcp [token] [options]",
    "",
    "Arguments:",
    "  token     Notion API token (ntn_xxx or secret_xxx)",
    "",
    "Options:",
    "  --http        Start HTTP server instead of stdio",
    "  --port <n>    HTTP port (default: 3000)",
    "  -h, --help    Show help",
    "",
    "Examples:",
    "  notion-mcp ntn_mytoken                     # stdio mode (Claude Desktop, Cursor, etc.)",
    "  notion-mcp ntn_mytoken --http --port 3000  # HTTP server mode",
    "  notion-mcp --http --port 3000              # HTTP mode, token via X-Notion-Token header",
  ].join("\n"));
  process.exit(0);
}

const token = positionals[0];
if (token) {
  process.env.NOTION_ADHOC_TOKEN = token;
}

if (values.http) {
  process.env.MCP_HTTP_PORT = values.port as string;
  await import("./http.js");
} else {
  await import("./server.js");
}
