export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  handler: () => Promise<string | { text: string }>;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{ name: string; description: string; required?: boolean }>;
  handler: (args: Record<string, string>) => Promise<string>;
}

export interface MCPServer {
  name: string;
  version: string;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
}

export class MCPRegistry {
  private servers: Map<string, MCPServer> = new Map();

  register(server: MCPServer): void { this.servers.set(server.name, server); }
  unregister(name: string): boolean { return this.servers.delete(name); }
  getServer(name: string): MCPServer | undefined { return this.servers.get(name); }
  listServers(): MCPServer[] { return Array.from(this.servers.values()); }

  getTools(): MCPTool[] {
    const tools: MCPTool[] = [];
    for (const server of this.servers.values()) tools.push(...server.tools);
    return tools;
  }

  getResources(): MCPResource[] {
    const resources: MCPResource[] = [];
    for (const server of this.servers.values()) resources.push(...server.resources);
    return resources;
  }

  getPrompts(): MCPPrompt[] {
    const prompts: MCPPrompt[] = [];
    for (const server of this.servers.values()) prompts.push(...server.prompts);
    return prompts;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<{ ok: boolean; result?: unknown; error?: string }> {
    for (const server of this.servers.values()) {
      const tool = server.tools.find(t => t.name === name);
      if (!tool) continue;
      try {
        const result = await tool.handler(args);
        return { ok: true, result };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    }
    return { ok: false, error: `Tool not found: ${name}` };
  }

  async readResource(uri: string): Promise<{ ok: boolean; content?: string; error?: string }> {
    for (const server of this.servers.values()) {
      const resource = server.resources.find(r => r.uri === uri);
      if (!resource) continue;
      try {
        const content = await resource.handler();
        return { ok: true, content: typeof content === 'string' ? content : content.text };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    }
    return { ok: false, error: `Resource not found: ${uri}` };
  }

  async getPrompt(name: string, args: Record<string, string>): Promise<{ ok: boolean; prompt?: string; error?: string }> {
    for (const server of this.servers.values()) {
      const prompt = server.prompts.find(p => p.name === name);
      if (!prompt) continue;
      try {
        const result = await prompt.handler(args);
        return { ok: true, prompt: result };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    }
    return { ok: false, error: `Prompt not found: ${name}` };
  }
}

export function createMCPServer(config: { name: string; version?: string }): MCPServer {
  return { name: config.name, version: config.version ?? '1.0.0', tools: [], resources: [], prompts: [] };
}

export function createFileSystemTools(basePath: string): MCPTool[] {
  return [
    {
      name: 'read_file', description: 'Read a file from the workspace',
      inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
      handler: async (args) => {
        const fs = await import('fs');
        const path = await import('path');
        const safePath = path.resolve(basePath, String(args.path));
        if (!safePath.startsWith(path.resolve(basePath))) throw new Error('Path traversal blocked');
        return fs.readFileSync(safePath, 'utf-8');
      },
    },
    {
      name: 'write_file', description: 'Write content to a file',
      inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
      handler: async (args) => {
        const fs = await import('fs');
        const path = await import('path');
        const safePath = path.resolve(basePath, String(args.path));
        if (!safePath.startsWith(path.resolve(basePath))) throw new Error('Path traversal blocked');
        fs.mkdirSync(path.dirname(safePath), { recursive: true });
        fs.writeFileSync(safePath, String(args.content), 'utf-8');
        return { written: true, path: args.path };
      },
    },
    {
      name: 'list_files', description: 'List files in a directory',
      inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
      handler: async (args) => {
        const fs = await import('fs');
        const path = await import('path');
        const dir = path.resolve(basePath, String(args.path));
        if (!dir.startsWith(path.resolve(basePath))) throw new Error('Path traversal blocked');
        return fs.readdirSync(dir);
      },
    },
    {
      name: 'search_files', description: 'Search for files by name pattern',
      inputSchema: { type: 'object', properties: { pattern: { type: 'string' } }, required: ['pattern'] },
      handler: async (args) => {
        const fs = await import('fs');
        const path = await import('path');
        const pattern = String(args.pattern).toLowerCase();
        const results: string[] = [];
        function walk(dir: string) {
          try {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
              const fullPath = path.join(dir, entry.name);
              if (entry.name.toLowerCase().includes(pattern)) results.push(fullPath);
              if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') walk(fullPath);
            }
          } catch {}
        }
        walk(path.resolve(basePath));
        return results.slice(0, 100);
      },
    },
    {
      name: 'execute_command', description: 'Execute a shell command',
      inputSchema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] },
      handler: async (args) => {
        const { execFileSync } = await import('child_process');
        const cmd = String(args.command);
        try {
          const output = execFileSync(process.env.COMSPEC || 'cmd', ['/c', cmd], { encoding: 'utf8', timeout: 30000 });
          return { output: output?.trim() || '', code: 0 };
        } catch (e: unknown) {
          const err = e as { stdout?: string; stderr?: string; status?: number };
          return { output: (err.stdout || err.stderr || '').toString().trim(), code: err.status ?? 1 };
        }
      },
    },
  ];
}

export function createMCPRegistry(): MCPRegistry {
  return new MCPRegistry();
}

export { McpHttpServer, createMcpHttpServer } from './server-http';
export type { McpHttpServerConfig } from './server-http';
export { A2AProtocol, createA2AProtocol } from './a2a';
export type { AgentCard, AgentSkill, A2AMessage, A2ATask, AgentCardStatus } from './a2a';
export { MCPMarketplace, createMarketplace } from './marketplace';
export type { MarketplaceServerEntry, MarketplaceConfig } from './marketplace';
