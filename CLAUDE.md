# notion-mcp-custom

## Project Goal

A production-ready custom MCP (Model Context Protocol) server for interacting with Notion databases. Supports multi-workspace, multi-token, and multi-target configurations via a YAML config file. Runs as a child process over `stdio` transport.

## Commands

```bash
# Install dependencies
npm install

# Development (watch mode, uses tsx)
npm run dev

# Build TypeScript to dist/
npm run build

# Run production build
npm start
```

## File Structure

```
notion-mcp/
├── src/
│   ├── server.ts              # MCP server entry point — registers all tools, connects stdio transport
│   ├── config.ts              # Config loading, workspace/target resolution, token retrieval
│   ├── notion/
│   │   └── client.ts          # Thin Notion REST API client (fetch-based)
│   └── tools/
│       ├── listWorkspaces.ts  # Tool: list-workspaces
│       ├── listTargets.ts     # Tool: list-targets
│       ├── resolveTarget.ts   # Tool: resolve-target
│       ├── search.ts          # Tool: search
│       ├── queryDataSource.ts # Tool: query-data-source
│       ├── createSimpleTask.ts# Tool: create-simple-task
│       └── upsertPageInTarget.ts # Tool: upsert-page-in-target
├── notion-mcp.config.example.yaml  # Example workspace/target config (copy to notion-mcp.config.yaml)
├── .env.example               # Example environment variables (copy to .env)
├── package.json
├── tsconfig.json
└── .gitignore
```

## Configuration

1. Copy `.env.example` to `.env` and fill in your Notion integration tokens.
2. Copy `notion-mcp.config.example.yaml` to `notion-mcp.config.yaml` and configure your workspaces and targets.
3. Set `NOTION_MCP_CONFIG=./notion-mcp.config.yaml` in your `.env` (or it defaults to `./notion-mcp.config.yaml`).

## Rules

### Rule: Prefer data_source_id over database_id

Always use `data_source_id` if available for a target. Fall back to `database_id` only if `data_source_id` is not set. The Notion API still accepts `data_source_id` values in the `database_id` field of most endpoints. This ensures compatibility with newer Notion workspaces.

Enforced in `queryDataSource` and `upsertPageInTarget`:
```
const databaseId = targetConfig.data_source_id ?? targetConfig.database_id;
```

For `createSimpleTask`, the parent must explicitly use `database_id` key per API requirements, but the value prefers `data_source_id`:
```
parent: { database_id: targetConfig.database_id ?? targetConfig.data_source_id }
```

### Rule: All secrets in .env, never hardcoded

- Notion integration tokens must be stored as environment variables.
- The YAML config references token env var names (e.g., `tokenEnv: NOTION_TOKEN_PERSONAL`), not token values.
- Never commit `.env` or `notion-mcp.config.yaml` — both are in `.gitignore`.
- The `getToken()` function in `config.ts` reads from `process.env` at runtime and throws clearly if the variable is missing.

## Tool Reference

| Tool | Description |
|------|-------------|
| `list-workspaces` | List all configured workspaces with token env and target count |
| `list-targets` | List all targets (optionally filtered by workspace) |
| `resolve-target` | Return full config for a specific workspace+target |
| `search` | Full-text search across a workspace |
| `query-data-source` | Query a database/data source with optional filter and sorts |
| `create-simple-task` | Create a new page with title, due date, notes, priority, status |
| `upsert-page-in-target` | Create or update a page based on a matching property value |
