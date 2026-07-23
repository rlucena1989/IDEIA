/** Interface que define a estrutura de plugin manifest. */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  minDevkitVersion: string;
  description: string;
  author: string;
  permissions: PluginPermission[];
  hooks: PluginHook[];
  commands: PluginCommand[];
}

/** Tipo que define plugin permission. */
export type PluginPermission = 'read_file' | 'write_file' | 'execute_command' | 'network' | 'read_config' | 'write_config';
/** Tipo que define plugin hook. */
export type PluginHook = 'onInit' | 'onVerify' | 'onAudit' | 'onGenerate' | 'onBuild' | 'onDeploy';

/** Interface que define a estrutura de plugin command. */
export interface PluginCommand {
  name: string;
  description: string;
  args: Array<{ name: string; type: 'string' | 'number' | 'boolean'; required?: boolean }>;
}

/** Interface que define a estrutura de plugin a p i. */
export interface PluginAPI {
  log: (msg: string) => void;
  readFile: (path: string) => string | null;
  writeFile: (path: string, content: string) => boolean;
  execCommand: (cmd: string) => { stdout: string; stderr: string; code: number };
  getConfig: (key: string) => unknown;
  reportError: (msg: string) => void;
}

/** Interface que define a estrutura de loaded plugin. */
export interface LoadedPlugin {
  manifest: PluginManifest;
  instance: Record<string, (...args: unknown[]) => unknown>;
  enabled: boolean;
}

const PLUGIN_DIRS = ['.ai/plugins', 'node_modules/@ai-devkit-plugin-'];

import fs from 'node:fs';
import path from 'node:path';

function findPluginDirs(): string[] {
  const dirs: string[] = [];
  for (const base of PLUGIN_DIRS) {
    const full = path.join(process.cwd(), base);
    if (fs.existsSync(full)) {
      dirs.push(...fs.readdirSync(full).map(d => path.join(full, d)).filter(d => fs.statSync(d).isDirectory()));
    }
  }
  return dirs;
}

/**
 * Loads and parses a plugin manifest from `plugin.yaml` or `plugin.json`.
 * @param pluginDir - Absolute path to the plugin directory.
 * @returns The parsed manifest or `null` when missing/invalid.
 */
export function loadManifest(pluginDir: string): PluginManifest | null {
  const yamlPath = path.join(pluginDir, 'plugin.yaml');
  const jsonPath = path.join(pluginDir, 'plugin.json');
  if (fs.existsSync(yamlPath)) {
    try {
      const YAML = require('js-yaml');
      return YAML.load(fs.readFileSync(yamlPath, 'utf8')) as PluginManifest;
    } catch { }
  }
  if (fs.existsSync(jsonPath)) {
    try { return JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as PluginManifest; }
    catch { return null; }
  }
  return null;
}

/**
 * Validates a plugin manifest, returning a list of human-readable errors.
 * @param manifest - The manifest to validate.
 * @returns Array of validation error messages (empty when valid).
 */
export function validateSdkManifest(manifest: PluginManifest): string[] {
  const errors: string[] = [];
  if (!manifest.id) errors.push('Plugin id is required');
  if (!manifest.name) errors.push('Plugin name is required');
  if (!manifest.version) errors.push('Plugin version is required');
  if (!manifest.minDevkitVersion) errors.push('Plugin minDevkitVersion is required');
  if (manifest.permissions && !Array.isArray(manifest.permissions)) errors.push('Permissions must be an array');
  if (manifest.commands && !Array.isArray(manifest.commands)) errors.push('Commands must be an array');
  return errors;
}

/**
 * Loads a plugin entry point and instantiates its command handlers.
 * @param pluginDir - Absolute path to the plugin directory.
 * @returns The loaded plugin or `null` when it cannot be loaded.
 */
export function loadPlugin(pluginDir: string): LoadedPlugin | null {
  const manifest = loadManifest(pluginDir);
  if (!manifest) return null;

  const errors = validateSdkManifest(manifest);
  if (errors.length > 0) {
    console.warn(`[Plugin SDK] Plugin "${manifest.id}" validation errors:`, errors);
    return null;
  }

  const entryPoint = path.join(pluginDir, 'index.js');
  if (!fs.existsSync(entryPoint)) {
    console.warn(`[Plugin SDK] Plugin "${manifest.id}" missing index.js`);
    return { manifest, instance: {}, enabled: false };
  }

  const api: PluginAPI = {
    log: (msg) => console.log(`[Plugin:${manifest.id}] ${msg}`),
    readFile: (p) => { try { return fs.readFileSync(path.resolve(p), 'utf8'); } catch { return null; } },
    writeFile: (p, c) => { try { fs.writeFileSync(path.resolve(p), c); return true; } catch { return false; } },
    execCommand: (cmd) => { try { const r = require('child_process').execFileSync(cmd, { encoding: 'utf8' }); return { stdout: r, stderr: '', code: 0 }; } catch (e: unknown) { const err = e as { stderr?: string; message?: string }; return { stdout: '', stderr: err.stderr || err.message || '', code: 1 }; } },
    getConfig: (key) => { try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), '.ai/config.json'), 'utf8'))[key]; } catch { return undefined; } },
    reportError: (msg) => console.error(`[Plugin:${manifest.id}] Error: ${msg}`),
  };

  try {
    const mod = require(entryPoint);
    const instance = typeof mod === 'function' ? mod(api) : mod;
    return { manifest, instance, enabled: true };
  } catch (err: unknown) {
    const e = err as Error;
    console.warn(`[Plugin SDK] Failed to load "${manifest.id}": ${e.message}`);
    return { manifest, instance: {}, enabled: false };
  }
}

/**
 * Discovers and loads all plugins from configured plugin directories.
 * @returns The list of successfully loaded plugins.
 */
export function loadAllPlugins(): LoadedPlugin[] {
  return findPluginDirs().map(dir => loadPlugin(dir)).filter((p): p is LoadedPlugin => p !== null);
}