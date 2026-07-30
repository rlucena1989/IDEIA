import vm from 'vm';
import { createLogger } from '@ideia/logger';
import path from 'path';
import fs from 'fs';
import { PluginManifest, PluginContext } from './index';
const logger = createLogger('plugin-loader');

export interface LoadedPluginInstance {
  manifest: PluginManifest;
  exports: Record<string, unknown>;
  sandbox: vm.Context | null;
  loadedAt: number;
}

export interface PluginLoadResult {
  success: boolean;
  instance?: LoadedPluginInstance;
  error?: string;
}

const LOAD_TIMEOUT_MS = 30000;

const SANDBOX_GLOBALS: string[] = [
  'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'Buffer', 'TextEncoder', 'TextDecoder', 'URL', 'URLSearchParams',
  'Math', 'Date', 'RegExp', 'Map', 'Set', 'WeakMap', 'WeakSet',
  'Promise', 'JSON', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'Array', 'Object', 'String', 'Number', 'Boolean', 'Symbol',
  'Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError',
  'undefined', 'null', 'true', 'false', 'NaN', 'Infinity',
];

function createSandboxContext(manifest: PluginManifest, context: PluginContext): vm.Context {
  const sandboxGlobals: Record<string, unknown> = {};

  for (const key of SANDBOX_GLOBALS) {
    const globalVal = (globalThis as Record<string, unknown>)[key];
    if (globalVal !== undefined) {
      sandboxGlobals[key] = globalVal;
    }
  }

  sandboxGlobals.console = {
    log: (...args: unknown[]) => context.logger.info(args.map(a => String(a)).join(' ')),
    warn: (...args: unknown[]) => context.logger.warn(args.map(a => String(a)).join(' ')),
    error: (...args: unknown[]) => context.logger.error(args.map(a => String(a)).join(' ')),
    debug: (...args: unknown[]) => context.logger.debug(args.map(a => String(a)).join(' ')),
  };

  sandboxGlobals.module = { exports: {} } as { exports: Record<string, unknown> };
  sandboxGlobals.exports = (sandboxGlobals.module as { exports: Record<string, unknown> }).exports;
  sandboxGlobals.__pluginManifest = manifest;
  sandboxGlobals.__pluginContext = context;

  const sandbox = vm.createContext(sandboxGlobals);
  return sandbox;
}

function _isESM(_entrypoint: string): boolean {
  const ext = path.extname(_entrypoint).toLowerCase();
  return ext === '.mjs';
}

function _isCJS(_entrypoint: string): boolean {
  const ext = path.extname(_entrypoint).toLowerCase();
  return ext === '.cjs' || ext === '.js';
}

export class PluginLoader {
  private static loaded = new Map<string, LoadedPluginInstance>();

  static async load(manifest: PluginManifest, context: PluginContext): Promise<PluginLoadResult> {
    try {
      if (PluginLoader.loaded.has(manifest.id)) {
        return {
          success: false,
          error: `Plugin "${manifest.id}" is already loaded`,
        };
      }

      const pluginDir = path.resolve(context.config.get('pluginDir') as string || process.cwd());
      const entrypoint = path.resolve(pluginDir, manifest.entrypoint);

      if (!fs.existsSync(entrypoint)) {
        return {
          success: false,
          error: `Plugin entrypoint not found: ${entrypoint}`,
        };
      }

      const ext = path.extname(entrypoint).toLowerCase();
      let exports: Record<string, unknown>;

      if (ext === '.mjs') {
        exports = await PluginLoader.loadESM(entrypoint, context);
      } else if (ext === '.js' || ext === '.cjs') {
        exports = await PluginLoader.loadCJS(manifest, entrypoint, context);
      } else {
        return {
          success: false,
          error: `Unsupported plugin format: ${ext}`,
        };
      }

      const instance: LoadedPluginInstance = {
        manifest,
        exports,
        sandbox: null,
        loadedAt: Date.now(),
      };

      PluginLoader.loaded.set(manifest.id, instance);
      return { success: true, instance };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  static unload(pluginId: string): boolean {
    return PluginLoader.loaded.delete(pluginId);
  }

  static getLoaded(pluginId: string): LoadedPluginInstance | undefined {
    return PluginLoader.loaded.get(pluginId);
  }

  static listLoaded(): LoadedPluginInstance[] {
    return Array.from(PluginLoader.loaded.values());
  }

  static isLoaded(pluginId: string): boolean {
    return PluginLoader.loaded.has(pluginId);
  }

  private static async loadESM(entrypoint: string, _context: PluginContext): Promise<Record<string, unknown>> {
    const mod = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const id = setTimeout(() => reject(new Error('Plugin ESM load timed out')), LOAD_TIMEOUT_MS);
      import(entrypoint).then((m) => { clearTimeout(id); resolve(m as Record<string, unknown>); }).catch((err: Error) => { clearTimeout(id); reject(new Error(`ESM load failed: ${err.message}`)); });
    });
    return { ...mod };
  }

  private static async loadCJS(manifest: PluginManifest, entrypoint: string, context: PluginContext): Promise<Record<string, unknown>> {
    const sandbox = createSandboxContext(manifest, context);

    const code = fs.readFileSync(entrypoint, 'utf-8');

    const timeoutMs = context.config.get('pluginTimeout') as number || LOAD_TIMEOUT_MS;
    const script = new vm.Script(code, {
      filename: entrypoint,
    });

    script.runInContext(sandbox, { timeout: timeoutMs, breakOnSigint: true });

    const moduleObj = sandbox.module as { exports: Record<string, unknown> };
    return { ...moduleObj.exports };
  }
}
