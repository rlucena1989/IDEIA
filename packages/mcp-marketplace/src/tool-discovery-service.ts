import { MCPToolDefinition, MCPServerDefinition, PermissionTier } from './types';
import { createLogger } from '@ideia/logger';
import { MCPServerRegistry } from './mcp-server-registry';
const logger = createLogger('tool-discovery-service');

export interface DiscoveryResult {
  server: MCPServerDefinition;
  score: number;
  matchedTags: string[];
  missingKeys: string[];
}

export class ToolDiscoveryService {
  private _registry: MCPServerRegistry;
  private _confidenceThreshold: number;

  constructor(registry: MCPServerRegistry, confidenceThreshold = 0.5) {
    this._registry = registry;
    this._confidenceThreshold = confidenceThreshold;
  }

  async discoverFromDependencies(dependencies: Record<string, string>): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    const depNames = Object.keys(dependencies);
    for (const server of this._registry.list()) {
      const matchedTags = server.tags.filter(t => depNames.some(d => d.toLowerCase().includes(t.toLowerCase())));
      if (matchedTags.length > 0) {
        results.push({
          server,
          score: matchedTags.length / Math.max(1, depNames.length),
          matchedTags,
          missingKeys: this._detectMissingEnvKeys(server),
        });
      }
    }
    return results.sort((a, b) => b.score - a.score);
  }

  async discoverFromEnv(envVars: Record<string, string>): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    for (const server of this._registry.list()) {
      const matchedTags = server.tags.filter(t => {
        const envKey = this._tagToEnvKey(t);
        return envVars[envKey] !== undefined;
      });
      if (matchedTags.length > 0) {
        results.push({
          server,
          score: matchedTags.length / Math.max(1, server.tags.length),
          matchedTags,
          missingKeys: this._detectMissingEnvKeys(server, envVars),
        });
      }
    }
    return results.sort((a, b) => b.score - a.score);
  }

  async discoverFromConfigFile(config: Record<string, unknown>): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    for (const server of this._registry.list()) {
      const configKeys = Object.keys(config);
      const matchedTags = server.tags.filter(t => configKeys.some(k => k.toLowerCase().includes(t.toLowerCase())));
      if (matchedTags.length > 0) {
        results.push({
          server,
          score: matchedTags.length / Math.max(1, configKeys.length),
          matchedTags,
          missingKeys: [],
        });
      }
    }
    return results.sort((a, b) => b.score - a.score);
  }

  async discoverAll(): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    for (const server of this._registry.list()) {
      if (server.source !== 'pre-installed') continue;
      results.push({
        server,
        score: 1,
        matchedTags: server.tags,
        missingKeys: this._detectMissingEnvKeys(server),
      });
    }
    return results;
  }

  suggestTools(query: string, minTier?: PermissionTier): MCPToolDefinition[] {
    const lower = query.toLowerCase();
    let tools = this._registry.getAllTools().filter(t =>
      t.name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower),
    );
    if (minTier) {
      const tierOrder: PermissionTier[] = ['T1', 'T2', 'T3', 'T4'];
      const minIdx = tierOrder.indexOf(minTier);
      tools = tools.filter(t => tierOrder.indexOf(t.permissionTier) >= minIdx);
    }
    return tools;
  }

  getDiscoveryConfidence(result: DiscoveryResult): number {
    if (result.score >= 0.8) return 0.95;
    if (result.score >= 0.5) return 0.7;
    return 0.3;
  }

  private _detectMissingEnvKeys(server: MCPServerDefinition, envVars?: Record<string, string>): string[] {
    const missing: string[] = [];
    for (const tag of server.tags) {
      const envKey = this._tagToEnvKey(tag);
      if (envVars && envVars[envKey] !== undefined) continue;
      if (envKey.endsWith('_TOKEN') || envKey.endsWith('_KEY') || envKey.endsWith('_SECRET')) {
        missing.push(envKey);
      }
    }
    return missing;
  }

  private _tagToEnvKey(tag: string): string {
    return tag.toUpperCase().replace(/-/g, '_') + (tag.length < 5 ? '_TOKEN' : '');
  }
}
