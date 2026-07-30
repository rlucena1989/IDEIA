import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createLogger } from '@ideia/logger';
import { join, resolve } from 'node:path';
import { get } from 'node:https';
import type { MCPServer, MCPTool } from './index';
import { MCPRegistry } from './index';

export interface MarketplaceServerEntry {
  name: string;
  version: string;
  description: string;
  registryUrl: string;
  tools: Array<{ name: string; description: string }>;
  installedAt?: string;
  updatedAt?: string;
}

export interface MarketplaceConfig {
  registryUrl?: string;
  storageDir?: string;
}

function httpGetJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error(`Invalid JSON from ${url}`)); }
      });
    }).on('error', reject);
  });
}

export class MCPMarketplace {
  private registry: MCPRegistry;
  private registryUrl: string;
  private storageDir: string;
  private installed: Map<string, MarketplaceServerEntry> = new Map();

  constructor(config?: MarketplaceConfig) {
    this.registry = new MCPRegistry();
    this.registryUrl = config?.registryUrl ?? 'https://registry.ideia.dev/mcp';
    this.storageDir = config?.storageDir ?? join(process.cwd(), '.ai', 'mcp');
    this.loadInstalled();
  }

  getRegistry(): MCPRegistry { return this.registry; }

  getInstalledServers(): MarketplaceServerEntry[] {
    return Array.from(this.installed.values());
  }

  isInstalled(name: string): boolean {
    return this.installed.has(name);
  }

  async discover(): Promise<MarketplaceServerEntry[]> {
    try {
      const result = await httpGetJson(`${this.registryUrl}/servers`);
      if (Array.isArray(result)) return result as MarketplaceServerEntry[];
      if (result && typeof result === 'object' && 'servers' in result) {
        return (result as { servers: MarketplaceServerEntry[] }).servers;
      }
      return [];
    } catch {
      return [];
    }
  }

  async install(serverName: string, serverEntry?: MarketplaceServerEntry): Promise<MCPServer> {
    if (this.installed.has(serverName)) {
      throw new Error(`Server already installed: ${serverName}`);
    }

    let entry = serverEntry;
    if (!entry) {
      const available = await this.discover();
      entry = available.find(s => s.name === serverName);
      if (!entry) throw new Error(`Server not found in registry: ${serverName}`);
    }

    const server: MCPServer = {
      name: entry.name,
      version: entry.version,
      tools: entry.tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: {},
        handler: async (args: Record<string, unknown>) => {
          try {
            const result = await httpGetJson(
              `${entry?.registryUrl ?? ''}/call?server=${entry?.name ?? ''}&tool=${t.name}&args=${encodeURIComponent(JSON.stringify(args))}`,
            );
            return result;
          } catch (err) {
            return { error: String(err) };
          }
        },
      })),
      resources: [],
      prompts: [],
    };

    this.registry.register(server);

    const installedEntry: MarketplaceServerEntry = {
      ...entry,
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.installed.set(serverName, installedEntry);
    this.saveInstalled();
    return server;
  }

  uninstall(serverName: string): boolean {
    const removed = this.registry.unregister(serverName);
    this.installed.delete(serverName);
    this.saveInstalled();
    return removed;
  }

  async publish(server: MCPServer): Promise<{ ok: boolean; url: string }> {
    return { ok: true, url: `${this.registryUrl}/publish/${server.name}` };
  }

  getTools(): MCPTool[] { return this.registry.getTools(); }

  async callTool(name: string, args: Record<string, unknown>): Promise<{ ok: boolean; result?: unknown; error?: string }> {
    return this.registry.callTool(name, args);
  }

  private loadInstalled(): void {
    const filePath = join(this.storageDir, 'installed.json');
    if (existsSync(filePath)) {
      try {
        const data = JSON.parse(readFileSync(filePath, 'utf-8'));
        if (Array.isArray(data)) {
          for (const entry of data) {
            this.installed.set(entry.name, entry);
          }
        }
        for (const entry of data) {
          if (entry.tools) {
            const server: MCPServer = {
              name: entry.name,
              version: entry.version,
              tools: entry.tools.map((t: { name: string; description: string }) => ({
                name: t.name,
                description: t.description,
                inputSchema: {},
                handler: async (args: Record<string, unknown>) => {
                  try {
                    const result = await httpGetJson(
                      `${entry.registryUrl}/call?server=${entry.name}&tool=${t.name}&args=${encodeURIComponent(JSON.stringify(args))}`,
                    );
                    return result;
                  } catch (err) {
                    return { error: String(err) };
                  }
                },
              })),
              resources: [],
              prompts: [],
            };
            this.registry.register(server);
          }
        }
      } catch {
        this.installed.clear();
      }
    }
  }

  private saveInstalled(): void {
    const dir = resolve(this.storageDir);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'installed.json'),
      JSON.stringify(Array.from(this.installed.values()), null, 2),
      'utf-8',
    );
  }
}

export function createMarketplace(config?: MarketplaceConfig): MCPMarketplace {
  return new MCPMarketplace(config);
}
