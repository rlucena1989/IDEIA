import { randomUUID, createHash } from 'crypto';
import { createLogger } from '@ideia/logger';
import fs from 'fs';
import path from 'path';

const logger = createLogger('plugin-sdk');

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  minDevkitVersion?: string;
  permissions: PluginPermission[];
  hooks: PluginHook[];
  entrypoint: string;
}

export type PluginPermission = 'fs.read' | 'fs.write' | 'network' | 'shell' | 'agent.access' | 'llm.call' | 'memory.access' | 'event.emit' | 'event.subscribe';

export type PluginHook = 'onActivate' | 'onDeactivate' | 'onAgentDecision' | 'onFileSave' | 'onEvent' | 'onStartup' | 'onShutdown' | 'onFileChange' | 'onCommand';

export interface PluginAPI {
  log: (msg: string) => void;
  readFile: (p: string) => string | null;
  writeFile: (p: string, c: string) => boolean;
  fetch: (url: string, opts?: Record<string, unknown>) => Promise<{ ok: boolean; data?: string; error?: string }>;
  execCommand: (cmd: string) => { stdout: string; stderr: string; code: number };
  emitEvent: (type: string, payload?: Record<string, unknown>) => void;
  getConfig: (key: string) => unknown;
}

export interface PluginInstance {
  manifest: PluginManifest;
  api: PluginAPI;
  enabled: boolean;
  instance: Record<string, unknown>;
}

export interface PluginSandbox {
  allowedPermissions: Set<PluginPermission>;
  blockedPaths: RegExp[];
  maxFileSize: number;
  maxExecTime: number;
}

export interface Plugin {
  name: string;
  version: string;
  hooks: PluginHook[];
  activate(context: PluginContext): void | Promise<void>;
  deactivate(): void | Promise<void>;
}

export interface PluginContext {
  eventBus: {
    emit(event: string, payload?: unknown): void;
    on(event: string, handler: (payload: unknown) => void): () => void;
  };
  fileSystem: {
    read(path: string): string | null;
    write(path: string, content: string): boolean;
    watch(path: string, callback: (event: string, file: string) => void): () => void;
  };
  logger: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
    debug(msg: string): void;
  };
  config: {
    get(key: string): unknown;
    set(key: string, value: unknown): void;
  };
}

const DEFAULT_SANDBOX: PluginSandbox = {
  allowedPermissions: new Set(['fs.read']),
  blockedPaths: [/\.env/, /\.git\//, /node_modules\//, /secret/i, /credential/i],
  maxFileSize: 1024 * 1024,
  maxExecTime: 10000,
};

export const HOOKS: PluginHook[] = ['onActivate', 'onDeactivate', 'onAgentDecision', 'onFileSave', 'onEvent', 'onStartup', 'onShutdown', 'onFileChange', 'onCommand'];

export function validateManifest(manifest: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!manifest.id || typeof manifest.id !== 'string') errors.push('Plugin id is required');
  if (!manifest.name || typeof manifest.name !== 'string') errors.push('Plugin name is required');
  if (!manifest.version || typeof manifest.version !== 'string') errors.push('Plugin version is required');
  if (!manifest.entrypoint || typeof manifest.entrypoint !== 'string') errors.push('Plugin entrypoint is required');
  if (manifest.permissions && !Array.isArray(manifest.permissions)) errors.push('Permissions must be an array');
  if (manifest.hooks && !Array.isArray(manifest.hooks)) errors.push('Hooks must be an array');
  return { valid: errors.length === 0, errors };
}

export class PluginManager {
  private registry: PluginRegistry;
  private activatedPlugins: Map<string, Plugin> = new Map();
  private hookHandlers: Map<PluginHook, Array<{ pluginId: string; handler: (payload?: unknown) => void }>> = new Map();
  private baseDir: string;

  constructor(baseDir?: string, sandbox?: Partial<PluginSandbox>) {
    this.baseDir = baseDir ?? path.join(process.cwd(), '.ai', 'plugins');
    this.registry = new PluginRegistry(baseDir, sandbox);
    for (const hook of HOOKS) {
      this.hookHandlers.set(hook, []);
    }
  }

  register(plugin: Plugin): void {
    if (this.activatedPlugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }
    this.activatedPlugins.set(plugin.name, plugin);
    for (const hook of plugin.hooks) {
      const handlers = this.hookHandlers.get(hook);
      if (handlers) {
        handlers.push({ pluginId: plugin.name, handler: (payload) => this.executeHook(plugin.name, hook, payload) });
      }
    }
  }

  unregister(name: string): boolean {
    const plugin = this.activatedPlugins.get(name);
    if (!plugin) return false;
    for (const hook of plugin.hooks) {
      const handlers = this.hookHandlers.get(hook);
      if (handlers) {
        const idx = handlers.findIndex(h => h.pluginId === name);
        if (idx >= 0) handlers.splice(idx, 1);
      }
    }
    this.activatedPlugins.delete(name);
    return true;
  }

  get(name: string): Plugin | undefined {
    return this.activatedPlugins.get(name);
  }

  list(): Plugin[] {
    return Array.from(this.activatedPlugins.values());
  }

  private executeHook(pluginName: string, hook: PluginHook, _payload?: unknown): void {
    const plugin = this.activatedPlugins.get(pluginName);
    if (!plugin) return;
    try {
      if (hook === 'onActivate') plugin.activate(this.createPluginContext(pluginName));
      if (hook === 'onDeactivate') plugin.deactivate();
    } catch (err) {
      logger.error(`Error in hook ${hook}`, { pluginName, error: String(err) });
    }
  }

  private createPluginContext(pluginName: string): PluginContext {
    const pluginDir = path.join(this.baseDir, pluginName);
    return {
      eventBus: {
        emit: (event, payload) => {
          logger.info(`[Plugin:${pluginName}] Event bus emit: ${event}`, payload as Record<string, unknown> | undefined);
        },
        on: (event, _handler) => {
          logger.info('[Plugin:${pluginName}] Event bus subscribe: ${event}');
          return () => {};
        },
      },
      fileSystem: {
        read: (p) => {
          try { return fs.readFileSync(path.resolve(pluginDir, p), 'utf-8'); } catch { return null; }
        },
        write: (p, c) => {
          try { fs.mkdirSync(path.dirname(path.resolve(pluginDir, p)), { recursive: true }); fs.writeFileSync(path.resolve(pluginDir, p), c, 'utf-8'); return true; } catch { return false; }
        },
        watch: (_path, _callback) => {
          logger.info('[Plugin:${pluginName}] File watch: ${_path}');
          return () => {};
        },
      },
      logger: {
        info: (msg) => logger.info(msg),
        warn: (msg) => logger.warn(msg),
        error: (msg) => logger.error(msg),
        debug: (msg) => logger.debug(msg),
      },
      config: {
        get: (key) => {
          try {
            const configPath = path.join(pluginDir, 'config.json');
            if (!fs.existsSync(configPath)) return undefined;
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            return config[key];
          } catch { return undefined; }
        },
        set: (key, value) => {
          try {
            const configPath = path.join(pluginDir, 'config.json');
            let config: Record<string, unknown> = {};
            if (fs.existsSync(configPath)) {
              config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            }
            config[key] = value;
            fs.mkdirSync(path.dirname(configPath), { recursive: true });
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
          } catch {}
        },
      },
    };
  }

  getRegistry(): PluginRegistry {
    return this.registry;
  }

  fireHook(hook: PluginHook, payload?: unknown): void {
    const handlers = this.hookHandlers.get(hook);
    if (!handlers) return;
    for (const h of handlers) {
      try {
        h.handler(payload);
      } catch (err) {
        logger.error(`Error firing ${hook}`, { error: String(err) });
      }
    }
  }
}

export class PluginRegistry {
  private plugins: Map<string, PluginInstance> = new Map();
  private sandbox: PluginSandbox;
  private baseDir: string;

  constructor(baseDir?: string, sandbox?: Partial<PluginSandbox>) {
    this.baseDir = baseDir ?? path.join(process.cwd(), '.ai', 'plugins');
    this.sandbox = { ...DEFAULT_SANDBOX, ...sandbox };
    if (!fs.existsSync(this.baseDir)) fs.mkdirSync(this.baseDir, { recursive: true });
    this.loadInstalled();
  }

  private loadInstalled(): void {
    if (!fs.existsSync(this.baseDir)) return;
    try {
      for (const entry of fs.readdirSync(this.baseDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const manifestPath = path.join(this.baseDir, entry.name, 'manifest.json');
        if (!fs.existsSync(manifestPath)) continue;
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as PluginManifest;
          const result = validateManifest(manifest as unknown as Record<string, unknown>);
          if (result.valid) this.plugins.set(manifest.id, { manifest, api: this.createAPI(manifest), enabled: true, instance: {} });
        } catch {}
      }
    } catch {}
  }

  private createAPI(manifest: PluginManifest): PluginAPI {
    const perms = new Set(manifest.permissions || []);
    const pluginDir = path.join(this.baseDir, manifest.id);

    return {
      log: (msg) => logger.info('[Plugin:${manifest.id}] ${msg}'),
      readFile: (p) => {
        if (!perms.has('fs.read')) return null;
        const resolved = path.resolve(pluginDir, p.replace(/^\.\//, ''));
        for (const bp of this.sandbox.blockedPaths) {
          if (bp.test(resolved)) return null;
        }
        try { return fs.readFileSync(resolved, 'utf-8'); } catch { return null; }
      },
      writeFile: (p, c) => {
        if (!perms.has('fs.write')) return false;
        const resolved = path.resolve(pluginDir, p.replace(/^\.\//, ''));
        for (const bp of this.sandbox.blockedPaths) {
          if (bp.test(resolved)) return false;
        }
        try { fs.mkdirSync(path.dirname(resolved), { recursive: true }); fs.writeFileSync(resolved, c, 'utf-8'); return true; } catch { return false; }
      },
      fetch: async (url, opts) => {
        if (!perms.has('network')) return { ok: false, error: 'Network access not allowed' };
        try {
          const response = await globalThis.fetch(url, opts as RequestInit);
          return { ok: response.ok, data: await response.text() };
        } catch (e) { return { ok: false, error: String(e) }; }
      },
      execCommand: (cmd) => {
        if (!perms.has('shell')) return { stdout: '', stderr: 'Shell access not allowed', code: 1 };
        try {
          const { execFileSync } = require('child_process');
          const output = execFileSync(process.env.COMSPEC || 'cmd', ['/c', cmd], { encoding: 'utf8', timeout: this.sandbox.maxExecTime });
          return { stdout: output?.trim() || '', stderr: '', code: 0 };
        } catch (e: unknown) {
          const err = e as { stdout?: string; stderr?: string; status?: number };
          return { stdout: '', stderr: (err.stderr || err.stdout || String(e)).toString().trim(), code: err.status ?? 1 };
        }
      },
      emitEvent: (type, payload) => {
        if (!perms.has('event.emit')) return;
        logger.info(`[Plugin:${manifest.id}] Event: ${type}`, payload as Record<string, unknown> | undefined);
      },
      getConfig: (key) => {
        try {
          const config = JSON.parse(fs.readFileSync(path.join(pluginDir, 'config.json'), 'utf-8'));
          return config[key];
        } catch { return undefined; }
      },
    };
  }

  install(manifest: PluginManifest, code: string): PluginInstance {
    const result = validateManifest(manifest as unknown as Record<string, unknown>);
    if (!result.valid) throw new Error(`Invalid manifest: ${result.errors.join(', ')}`);

    const pluginDir = path.join(this.baseDir, manifest.id);
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(path.join(pluginDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    const _ext = path.extname(manifest.entrypoint) || '.js';
    fs.writeFileSync(path.join(pluginDir, manifest.entrypoint), code, 'utf-8');

    const instance: PluginInstance = { manifest, api: this.createAPI(manifest), enabled: true, instance: {} };
    this.plugins.set(manifest.id, instance);
    this.runHook(manifest.id, 'onActivate');
    return instance;
  }

  uninstall(id: string): boolean {
    if (!this.plugins.has(id)) return false;
    this.runHook(id, 'onDeactivate');
    this.plugins.delete(id);
    const pluginDir = path.join(this.baseDir, id);
    if (fs.existsSync(pluginDir)) fs.rmSync(pluginDir, { recursive: true, force: true });
    return true;
  }

  get(id: string): PluginInstance | undefined { return this.plugins.get(id); }
  list(): PluginInstance[] { return Array.from(this.plugins.values()); }
  enable(id: string): void { const p = this.plugins.get(id); if (p) p.enabled = true; }
  disable(id: string): void { const p = this.plugins.get(id); if (p) p.enabled = false; }

  private runHook(_id: string, _hook: PluginHook): void {
    // Hook execution would dynamically import the plugin module
    // For now, hooks are registered but execution requires module loading
  }
}

export function createPluginRegistry(baseDir?: string, sandbox?: Partial<PluginSandbox>): PluginRegistry {
  return new PluginRegistry(baseDir, sandbox);
}

export function createPluginManager(baseDir?: string, sandbox?: Partial<PluginSandbox>): PluginManager {
  return new PluginManager(baseDir, sandbox);
}
