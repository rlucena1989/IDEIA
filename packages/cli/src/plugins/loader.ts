import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { PluginManifest, validateManifest } from './manifest';

/** Interface que define a estrutura de loaded plugin. */
export interface LoadedPlugin {
  manifest: PluginManifest;
  dir: string;
}

const PLUGIN_DIRS = ['.ai/plugins'];
const NPM_PREFIX = '@ai-devkit-plugin-';

function findPluginDirs(root: string): string[] {
  const dirs: string[] = [];

  for (const rel of PLUGIN_DIRS) {
    const full = path.join(root, rel);
    if (fs.existsSync(full)) {
      for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          dirs.push(path.join(full, entry.name));
        }
      }
    }
  }

  const nodeModules = path.join(root, 'node_modules');
  if (fs.existsSync(nodeModules)) {
    for (const entry of fs.readdirSync(nodeModules, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith(NPM_PREFIX)) {
        dirs.push(path.join(nodeModules, entry.name));
      }
    }
  }

  return dirs;
}

function loadManifestFromDir(dir: string): PluginManifest | null {
  for (const name of ['plugin.yaml', 'plugin.yml', 'plugin.json']) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) {
      try {
        const raw = fs.readFileSync(file, 'utf8');
        const data = name.endsWith('.json') ? JSON.parse(raw) : YAML.parse(raw);
        const { valid, manifest } = validateManifest(data || {});
        if (valid && manifest) return manifest;
      } catch { return null; }
    }
  }
  return null;
}

/**
 * Carrega plugins.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function loadPlugins(root: string): LoadedPlugin[] {
  const result: LoadedPlugin[] = [];
  const dirs = findPluginDirs(root);

  for (const dir of dirs) {
    const manifest = loadManifestFromDir(dir);
    if (manifest) {
      result.push({ manifest, dir });
    }
  }

  return result;
}

/**
 * Busca plugin.
 * @param root - Valor root.
 * @param name - Valor name.
 * @returns O resultado da operação.
 */
export function findPlugin(root: string, name: string): LoadedPlugin | undefined {
  return loadPlugins(root).find(p => p.manifest.name === name);
}
