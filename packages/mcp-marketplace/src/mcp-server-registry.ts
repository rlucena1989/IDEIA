import { MCPServerDefinition, MCPToolDefinition, PermissionTier, PackageSource } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('mcp-server-registry');

export class MCPServerRegistry {
  private _servers: Map<string, MCPServerDefinition> = new Map();

  register(server: MCPServerDefinition): void {
    const key = `${server.name}@${server.version}`;
    const existing = this._servers.get(key);
    if (existing && existing.version === server.version) {
      throw new Error(`Server ${server.name}@${server.version} already registered`);
    }
    this._servers.set(key, server);
  }

  unregister(name: string, version?: string): boolean {
    if (version) {
      return this._servers.delete(`${name}@${version}`);
    }
    const keys = Array.from(this._servers.keys()).filter(k => k.startsWith(`${name}@`));
    let deleted = false;
    for (const key of keys) {
      if (this._servers.delete(key)) deleted = true;
    }
    return deleted;
  }

  get(name: string, version?: string): MCPServerDefinition | undefined {
    if (version) {
      return this._servers.get(`${name}@${version}`);
    }
    const versions = this.getVersions(name);
    if (versions.length === 0) return undefined;
    return versions.sort((a, b) => b.version.localeCompare(a.version))[0];
  }

  getVersions(name: string): MCPServerDefinition[] {
    return Array.from(this._servers.values()).filter(s => s.name === name);
  }

  list(): MCPServerDefinition[] {
    return Array.from(this._servers.values());
  }

  listByCategory(category: string): MCPServerDefinition[] {
    return this.list().filter(s => s.tools.some(t => t.category === category));
  }

  listBySource(source: PackageSource): MCPServerDefinition[] {
    return this.list().filter(s => s.source === source);
  }

  listByPermission(tier: PermissionTier): MCPServerDefinition[] {
    return this.list().filter(s => s.permissions.includes(tier));
  }

  search(query: string): MCPServerDefinition[] {
    const lower = query.toLowerCase();
    return this.list().filter(s =>
      s.name.toLowerCase().includes(lower) ||
      s.description.toLowerCase().includes(lower) ||
      s.tags.some(t => t.toLowerCase().includes(lower)),
    );
  }

  getTools(name: string, version?: string): MCPToolDefinition[] {
    const server = this.get(name, version);
    return server?.tools ?? [];
  }

  getAllTools(): MCPToolDefinition[] {
    return this.list().flatMap(s => s.tools);
  }

  findTool(toolName: string): { server: MCPServerDefinition; tool: MCPToolDefinition } | undefined {
    for (const server of this._servers.values()) {
      const tool = server.tools.find(t => t.name === toolName);
      if (tool) return { server, tool };
    }
    return undefined;
  }

  count(): number {
    return this._servers.size;
  }

  clear(): void {
    this._servers.clear();
  }
}
