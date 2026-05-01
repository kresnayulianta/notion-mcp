import { readFileSync, writeFileSync } from "fs";
import { AsyncLocalStorage } from "node:async_hooks";
import * as yaml from "yaml";

export interface TargetConfig {
  data_source_id?: string;
  database_id?: string;
  propertyAliases?: Record<string, string>;
}

export interface WorkspaceConfig {
  tokenEnv?: string;  // optional — ad-hoc workspaces supply token via request context
  targets: Record<string, TargetConfig>;
}

export interface AppConfig {
  defaultWorkspace?: string;
  apiVersion?: string;
  workspaces: Record<string, WorkspaceConfig>;
}

// Inline workspace config passed via X-Notion-Config header
// targets values: string (database_id shorthand) or full TargetConfig object
export interface InlineWorkspace {
  token: string;
  targets?: Record<string, string | TargetConfig>;
}

let _config: AppConfig | null = null;

// Request-scoped context: populated from URL params + HTTP headers per request
type RequestCtx = {
  defaultWorkspace?: string;
  adhocToken?: string;                            // from X-Notion-Token header or ?token= param
  tokenEnv?: string;                              // from ?token_env= param — server reads process.env[tokenEnv]
  inlineConfig?: Record<string, InlineWorkspace>; // X-Notion-Config: full multi-workspace config
  apiVersion?: string;
};
export const requestContext = new AsyncLocalStorage<RequestCtx>();

export function loadConfig(): AppConfig {
  if (_config) return _config;
  const configPath = process.env.NOTION_MCP_CONFIG ?? "./notion-mcp.config.yaml";
  try {
    const raw = readFileSync(configPath, "utf-8");
    _config = yaml.parse(raw) as AppConfig;
  } catch {
    // Config file missing or unreadable — start with empty config.
    // Workspaces/tokens can be supplied entirely via request context (X-Notion-Config, token_env, etc.)
    _config = { workspaces: {} };
  }
  return _config;
}

/** Normalise an inline target (string shorthand or full object) → TargetConfig */
function normaliseInlineTarget(val: string | TargetConfig): TargetConfig {
  if (typeof val === "string") return { database_id: val };
  return val;
}

export function getWorkspace(name?: string): { name: string; config: WorkspaceConfig } {
  const config = loadConfig();
  const ctx = requestContext.getStore();
  const target = name ?? ctx?.defaultWorkspace ?? config.defaultWorkspace;

  // 1. Check inline config from X-Notion-Config header
  if (ctx?.inlineConfig) {
    const wsName = target ?? Object.keys(ctx.inlineConfig)[0];
    if (wsName && ctx.inlineConfig[wsName]) {
      const inline = ctx.inlineConfig[wsName]!;
      const targets: Record<string, TargetConfig> = {};
      for (const [k, v] of Object.entries(inline.targets ?? {})) {
        targets[k] = normaliseInlineTarget(v);
      }
      return { name: wsName, config: { targets } };
    }
  }

  // 2. Ad-hoc single token: workspace not in YAML → create empty on the fly
  if ((ctx?.adhocToken || process.env.NOTION_ADHOC_TOKEN) && target && !config.workspaces[target]) {
    return { name: target, config: { targets: {} } };
  }

  // 3. No workspace specified + CLI token + no workspaces in YAML → ad-hoc default
  if (!target && process.env.NOTION_ADHOC_TOKEN && Object.keys(config.workspaces).length === 0) {
    return { name: "__cli__", config: { targets: {} } };
  }

  // 3. YAML config
  if (!target) {
    const keys = Object.keys(config.workspaces);
    if (keys.length === 1) {
      return { name: keys[0]!, config: config.workspaces[keys[0]!]! };
    }
    throw new Error(
      `No workspace specified and no defaultWorkspace configured. Available: ${keys.join(", ")}`
    );
  }

  const wsConfig = config.workspaces[target];
  if (!wsConfig) {
    throw new Error(
      `Workspace "${target}" not found. Available: ${Object.keys(config.workspaces).join(", ")}`
    );
  }

  return { name: target, config: wsConfig };
}

export function getToken(workspaceConfig: WorkspaceConfig): string {
  const ctx = requestContext.getStore();

  // 1. Inline config token (keyed by current workspace name)
  if (ctx?.inlineConfig) {
    const ws = getWorkspace();
    const inline = ctx.inlineConfig[ws.name];
    if (inline?.token) return inline.token;
  }

  // 2. token_env URL param — reference env var by name, token stays server-side
  if (ctx?.tokenEnv) {
    const token = process.env[ctx.tokenEnv];
    if (!token) throw new Error(`Token env var "${ctx.tokenEnv}" (from ?token_env=) is not set.`);
    return token;
  }

  // 3. Adhoc token from X-Notion-Token header or ?token= param
  if (ctx?.adhocToken) return ctx.adhocToken;

  // 4. CLI token — set via NOTION_ADHOC_TOKEN env var (npx/stdio mode)
  if (process.env.NOTION_ADHOC_TOKEN) return process.env.NOTION_ADHOC_TOKEN;

  // 4. YAML tokenEnv
  if (!workspaceConfig.tokenEnv) {
    throw new Error(
      "No token configured. Provide via X-Notion-Token header, ?token_env= or ?token= URL param, X-Notion-Config header, or YAML tokenEnv."
    );
  }
  const token = process.env[workspaceConfig.tokenEnv];
  if (!token) {
    throw new Error(`Token environment variable "${workspaceConfig.tokenEnv}" is not set or empty.`);
  }
  return token;
}

export function resolveTarget(workspaceConfig: WorkspaceConfig, targetName: string): TargetConfig {
  const target = workspaceConfig.targets[targetName];
  if (!target) {
    throw new Error(
      `Target "${targetName}" not found. Available: ${Object.keys(workspaceConfig.targets).join(", ")}`
    );
  }
  return target;
}

export function listWorkspaceNames(): string[] {
  const ctx = requestContext.getStore();
  if (ctx?.inlineConfig) return Object.keys(ctx.inlineConfig);
  return Object.keys(loadConfig().workspaces);
}

export function getApiVersion(): string {
  const ctx = requestContext.getStore();
  if (ctx?.apiVersion) return ctx.apiVersion;
  return loadConfig().apiVersion ?? "2022-06-28";
}

export function clearConfigCache(): void {
  _config = null;
}

export function getConfigPath(): string {
  return process.env.NOTION_MCP_CONFIG ?? "./notion-mcp.config.yaml";
}

export function saveConfig(config: AppConfig): void {
  const configPath = getConfigPath();
  writeFileSync(configPath, yaml.stringify(config), "utf-8");
  _config = config;
}