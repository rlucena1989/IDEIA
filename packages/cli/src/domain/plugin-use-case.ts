import type { CliCommandResult } from '../types/cli-result';
import { createLogger } from '@ideia/logger';
import { success, failure } from '../types/cli-result';
const logger = createLogger('plugin-use-case');

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  entryPoint: string;
  dependencies: string[];
}

export interface PluginInstance {
  id: string;
  manifest: PluginManifest;
  enabled: boolean;
  installedAt: string;
  lastActivated?: string;
  config: Record<string, unknown>;
}

export class PluginUseCase {
  private plugins: Map<string, PluginInstance> = new Map();

  installPlugin(manifest: PluginManifest): CliCommandResult<PluginInstance> {
    try {
      const existing = Array.from(this.plugins.values()).find(p => p.manifest.name === manifest.name);
      if (existing) return failure(`Plugin "${manifest.name}" is already installed`, 1) as CliCommandResult<PluginInstance>;

      const plugin: PluginInstance = {
        id: `plugin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        manifest,
        enabled: true,
        installedAt: new Date().toISOString(),
        config: {},
      };
      this.plugins.set(plugin.id, plugin);
      return success(`Plugin "${manifest.name} v${manifest.version}" installed`, plugin);
    } catch (err) {
      return failure(`Failed to install plugin: ${err instanceof Error ? err.message : String(err)}`) as CliCommandResult<PluginInstance>;
    }
  }

  uninstallPlugin(pluginId: string): CliCommandResult<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return failure(`Plugin not found: ${pluginId}`, 1) as CliCommandResult<void>;

    this.plugins.delete(pluginId);
    return success(`Plugin "${plugin.manifest.name}" uninstalled`);
  }

  enablePlugin(pluginId: string): CliCommandResult<PluginInstance> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return failure(`Plugin not found: ${pluginId}`, 1) as CliCommandResult<PluginInstance>;

    plugin.enabled = true;
    plugin.lastActivated = new Date().toISOString();
    this.plugins.set(pluginId, plugin);

    return success(`Plugin "${plugin.manifest.name}" enabled`, plugin);
  }

  disablePlugin(pluginId: string): CliCommandResult<PluginInstance> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return failure(`Plugin not found: ${pluginId}`, 1) as CliCommandResult<PluginInstance>;

    plugin.enabled = false;
    this.plugins.set(pluginId, plugin);

    return success(`Plugin "${plugin.manifest.name}" disabled`, plugin);
  }

  getPlugin(pluginId: string): CliCommandResult<PluginInstance> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return failure(`Plugin not found: ${pluginId}`, 1) as CliCommandResult<PluginInstance>;
    return success('Plugin found', plugin);
  }

  listPlugins(): CliCommandResult<PluginInstance[]> {
    const all = Array.from(this.plugins.values());
    return success(`Found ${all.length} plugins`, all);
  }

  configurePlugin(pluginId: string, config: Record<string, unknown>): CliCommandResult<PluginInstance> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return failure(`Plugin not found: ${pluginId}`, 1) as CliCommandResult<PluginInstance>;

    plugin.config = { ...plugin.config, ...config };
    this.plugins.set(pluginId, plugin);

    return success(`Plugin "${plugin.manifest.name}" configured`, plugin);
  }
}

export function createPluginUseCase(): PluginUseCase {
  return new PluginUseCase();
}
