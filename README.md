# @kresnayulianta/notion-mcp

A custom [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for Notion. Supports multi-workspace, dynamic token injection via HTTP headers, and both stdio and HTTP transport modes.

## Features

### Pages
| Tool | Description |
|------|-------------|
| `get-page` | Get a Notion page's properties |
| `get-page-content` | Get block content of a page (raw block objects) |
| `get-page-markdown` | Get page content rendered as Markdown |
| `create-simple-task` | Create a page with title, due date, priority, status |
| `upsert-page-in-target` | Create or update a page by matching property |
| `update-page` | Update properties of an existing page |
| `move-page` | Move a page to a different parent page or database |

### Databases
| Tool | Description |
|------|-------------|
| `query-data-source` | Query a named target database |
| `query-database` | Query any database directly by ID |
| `get-database` | Retrieve database schema (properties, types, select options) |
| `create-database` | Create a new database inside a page |
| `update-database` | Update database title, description, or property schema |

### Blocks
| Tool | Description |
|------|-------------|
| `get-block` | Retrieve a specific block by ID |
| `append-blocks` | Append new content blocks to a page or block |
| `update-block` | Update the content of an existing block |
| `delete-block` | Delete (archive) a block |

### Comments
| Tool | Description |
|------|-------------|
| `list-comments` | List comments on a page or block |
| `create-comment` | Add a comment to a page or inline on a block |

### Users
| Tool | Description |
|------|-------------|
| `list-users` | List all workspace users (names, emails, IDs) |

### Search & Config
| Tool | Description |
|------|-------------|
| `search` | Full-text search across a workspace |
| `list-workspaces` | List all configured Notion workspaces |
| `list-targets` | List registered database targets |
| `add-target` | Register a database as a named target (persisted to config) |
| `remove-target` | Remove a named target from config |

## Usage

### npx — stdio mode

```bash
npx -y @kresnayulianta/notion-mcp <your-notion-token>
```

## Usage with Claude

### Claude Desktop

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@kresnayulianta/notion-mcp"],
      "env": {
        "NOTION_ADHOC_TOKEN": "ntn_yourtoken"
      }
    }
  }
}
```

Or pass the token directly as an argument:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@kresnayulianta/notion-mcp", "ntn_yourtoken"]
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (per project):

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@kresnayulianta/notion-mcp"],
      "env": {
        "NOTION_ADHOC_TOKEN": "ntn_yourtoken"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add notion -- npx -y @kresnayulianta/notion-mcp ntn_yourtoken
```

### HTTP server mode

```bash
npx -y @kresnayulianta/notion-mcp <token> --http --port 3000
```

Or via Docker:
```bash
docker run -p 3000:3000 \
  -e NOTION_TOKEN_PERSONAL=ntn_yourtoken \
  -v ./notion-mcp.config.yaml:/app/notion-mcp.config.yaml \
  ghcr.io/kresnayulianta/notion-mcp
```

### HTTP Authentication

| Header | Purpose |
|--------|---------|
| `X-Notion-Token: ntn_xxx` | Notion API token (per-request) |
| `Authorization: Bearer key` | MCP server access key (set `MCP_API_KEY` env var to enable) |
| `X-Notion-Config: {...}` | Full inline multi-workspace config (JSON) |

**URL params:**
```
http://localhost:3000/mcp?workspace=personal&token_env=NOTION_TOKEN_PERSONAL
```

### Multi-workspace via headers

Pass a full workspace config inline without needing a YAML file:

```json
X-Notion-Config: {
  "personal": {
    "token": "ntn_xxx",
    "targets": { "notes": "database-uuid-1", "tasks": "database-uuid-2" }
  },
  "work": {
    "token": "ntn_yyy",
    "targets": { "projects": "database-uuid-3" }
  }
}
```

## Configuration

### YAML config (optional)

```yaml
# notion-mcp.config.yaml
defaultWorkspace: personal
apiVersion: "2022-06-28"

workspaces:
  personal:
    tokenEnv: NOTION_TOKEN_PERSONAL  # reads from environment variable
    targets:
      notes:
        data_source_id: "your-database-uuid"
        propertyAliases:
          title: Name
          due_date: Date
```

### Environment variables

```bash
NOTION_TOKEN_PERSONAL=ntn_xxx   # Notion integration token
MCP_API_KEY=your-secret         # Optional: lock server with API key
MCP_HTTP_PORT=3000              # HTTP server port (default: 3000)
```

## How to Use

Once connected to Claude Desktop or any MCP-compatible client, you can interact with your Notion workspace using natural language.

### Pages

```
"Create a task called 'Review proposal' due Friday, priority High"
"Show me the content of page <page-id>"
"Update the status of page <page-id> to Done"
"Move page <page-id> to the Projects database"
```

### Databases

```
"Query my tasks database and show overdue items"
"Get the schema of database <database-id>"
"Search my Notion for anything about 'quarterly review'"
```

### Blocks & Comments

```
"Append a bullet list to page <page-id> with these three items: ..."
"Show all comments on page <page-id>"
"Add a comment to page <page-id>: 'Needs review by Monday'"
```

### Multi-workspace

```
"List all configured workspaces"
"Switch to the 'work' workspace and query the roadmap database"
"List targets in my personal workspace"
```

### Tip: Named Targets

Register your frequently-used databases as named targets so you can refer to them by name instead of UUID:

```
"Add a target called 'tasks' pointing to database <database-id>"
"Query my 'tasks' target where status is not Done"
"Create a task in the 'tasks' target called 'Fix login bug'"
```

## Notion Integration Setup

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the token (`ntn_xxx` or `secret_xxx`)
4. Share your Notion pages/databases with the integration

## License

MIT
