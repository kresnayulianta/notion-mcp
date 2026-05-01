export class NotionClient {
  constructor(
    private readonly token: string,
    private readonly version: string
  ) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `https://api.notion.com${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Notion-Version": this.version,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Notion API error ${response.status} on ${method} ${path}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  search(query: string, filter?: { value: string; property: string }): Promise<unknown> {
    return this.request<unknown>("POST", "/v1/search", {
      query,
      ...(filter ? { filter } : {}),
    });
  }

  retrievePage(pageId: string): Promise<unknown> {
    return this.request<unknown>("GET", `/v1/pages/${pageId}`);
  }

  queryDatabase(databaseId: string, params?: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>("POST", `/v1/databases/${databaseId}/query`, params ?? {});
  }

  createPage(params: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>("POST", "/v1/pages", params);
  }

  updatePage(pageId: string, params: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>("PATCH", `/v1/pages/${pageId}`, params);
  }

  appendBlockChildren(blockId: string, children: unknown[]): Promise<unknown> {
    return this.request<unknown>("PATCH", `/v1/blocks/${blockId}/children`, { children });
  }

  getBlockChildren(blockId: string, startCursor?: string): Promise<unknown> {
    const params = new URLSearchParams();
    if (startCursor) params.set("start_cursor", startCursor);
    const qs = params.toString();
    return this.request<unknown>("GET", `/v1/blocks/${blockId}/children${qs ? `?${qs}` : ""}`);
  }

  retrieveBlock(blockId: string): Promise<unknown> {
    return this.request<unknown>("GET", `/v1/blocks/${blockId}`);
  }

  updateBlock(blockId: string, params: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>("PATCH", `/v1/blocks/${blockId}`, params);
  }

  deleteBlock(blockId: string): Promise<unknown> {
    return this.request<unknown>("DELETE", `/v1/blocks/${blockId}`);
  }

  retrieveDatabase(databaseId: string): Promise<unknown> {
    return this.request<unknown>("GET", `/v1/databases/${databaseId}`);
  }

  createDatabase(params: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>("POST", "/v1/databases", params);
  }

  updateDatabase(databaseId: string, params: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>("PATCH", `/v1/databases/${databaseId}`, params);
  }

  listUsers(startCursor?: string): Promise<unknown> {
    const params = new URLSearchParams();
    if (startCursor) params.set("start_cursor", startCursor);
    const qs = params.toString();
    return this.request<unknown>("GET", `/v1/users${qs ? `?${qs}` : ""}`);
  }

  retrieveUser(userId: string): Promise<unknown> {
    return this.request<unknown>("GET", `/v1/users/${userId}`);
  }

  listComments(blockId: string, startCursor?: string): Promise<unknown> {
    const params = new URLSearchParams({ block_id: blockId });
    if (startCursor) params.set("start_cursor", startCursor);
    return this.request<unknown>("GET", `/v1/comments?${params.toString()}`);
  }

  createComment(params: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>("POST", "/v1/comments", params);
  }

  movePage(pageId: string, parent: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>("POST", `/v1/pages/${pageId}/move`, { parent });
  }

  getPageMarkdown(pageId: string): Promise<unknown> {
    return this.request<unknown>("GET", `/v1/pages/${pageId}/content`);
  }
}
