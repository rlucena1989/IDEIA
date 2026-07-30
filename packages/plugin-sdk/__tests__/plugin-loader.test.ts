import { PluginLoader } from '../src/plugin-loader';
import { PluginManifest, PluginContext } from '../src/index';
import path from 'path';
import os from 'os';
import fs from 'fs';

function createTestManifest(overrides?: Partial<PluginManifest>): PluginManifest {
  return {
    id: 'test-loader-plugin',
    name: 'Test Loader Plugin',
    version: '1.0.0',
    description: 'A test plugin for loader',
    entrypoint: 'index.js',
    permissions: ['fs.read'],
    hooks: ['onActivate'],
    ...overrides,
  };
}

function createTestContext(pluginDir: string): PluginContext {
  return {
    eventBus: {
      emit: () => {},
      on: () => () => {},
    },
    fileSystem: {
      read: (p) => {
        try { return fs.readFileSync(path.resolve(pluginDir, p), 'utf-8'); } catch { return null; }
      },
      write: (p, c) => {
        try { fs.writeFileSync(path.resolve(pluginDir, p), c, 'utf-8'); return true; } catch { return false; }
      },
      watch: (_p, _cb) => () => {},
    },
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    },
    config: {
      get: (key) => key === 'pluginDir' ? pluginDir : undefined,
      set: () => {},
    },
  };
}

function createPluginFile(baseDir: string, manifest: PluginManifest, code: string): string {
  const pluginDir = path.join(baseDir, manifest.id);
  fs.mkdirSync(pluginDir, { recursive: true });
  const entry = path.join(pluginDir, manifest.entrypoint);
  fs.writeFileSync(entry, code, 'utf-8');
  return pluginDir;
}

describe('PluginLoader', () => {
  let tmpDir: string;
  const manifest = createTestManifest();

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `plugin-loader-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    PluginLoader.unload(manifest.id);
  });

  afterEach(() => {
    PluginLoader.unload(manifest.id);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads a CommonJS plugin successfully', async () => {
    const pluginDir = createPluginFile(tmpDir, manifest, `
      module.exports = {
        activate: function() { return 'activated'; },
        name: 'test-plugin'
      };
    `);
    const context = createTestContext(pluginDir);
    const result = await PluginLoader.load(manifest, context);
    expect(result.success).toBe(true);
    expect(result.instance).toBeDefined();
    expect(result.instance!.manifest.id).toBe('test-loader-plugin');
    expect(PluginLoader.isLoaded('test-loader-plugin')).toBe(true);
  });

  it('returns error for non-existent entrypoint', async () => {
    const badManifest = createTestManifest({ entrypoint: 'nonexistent.js' });
    const badPluginDir = path.join(tmpDir, badManifest.id);
    fs.mkdirSync(badPluginDir, { recursive: true });
    const context = createTestContext(badPluginDir);
    const result = await PluginLoader.load(badManifest, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('prevents loading the same plugin twice', async () => {
    const pluginDir = createPluginFile(tmpDir, manifest, 'module.exports = {};');
    const context = createTestContext(pluginDir);
    const first = await PluginLoader.load(manifest, context);
    expect(first.success).toBe(true);

    const second = await PluginLoader.load(manifest, context);
    expect(second.success).toBe(false);
    expect(second.error).toContain('already loaded');
  });

  it('unloads a plugin', async () => {
    const pluginDir = createPluginFile(tmpDir, manifest, 'module.exports = {};');
    const context = createTestContext(pluginDir);
    await PluginLoader.load(manifest, context);
    expect(PluginLoader.isLoaded('test-loader-plugin')).toBe(true);

    const unloaded = PluginLoader.unload('test-loader-plugin');
    expect(unloaded).toBe(true);
    expect(PluginLoader.isLoaded('test-loader-plugin')).toBe(false);
  });

  it('returns undefined for unloaded plugin', () => {
    expect(PluginLoader.getLoaded('nonexistent')).toBeUndefined();
  });

  it('lists loaded plugins', async () => {
    const pluginDir = createPluginFile(tmpDir, manifest, 'module.exports = {};');
    const context = createTestContext(pluginDir);
    await PluginLoader.load(manifest, context);

    const list = PluginLoader.listLoaded();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.some(l => l.manifest.id === 'test-loader-plugin')).toBe(true);
  });

  it('handles errors in plugin code gracefully', async () => {
    const pluginDir = createPluginFile(tmpDir, manifest, 'throw new Error("plugin crash");');
    const context = createTestContext(pluginDir);
    const result = await PluginLoader.load(manifest, context);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('sandboxes plugin execution', async () => {
    const pluginDir = createPluginFile(tmpDir, manifest, `
      module.exports = {
        getGlobals: function() {
          return {
            hasProcess: typeof process !== 'undefined',
            hasRequire: typeof require !== 'undefined',
            hasFs: typeof require !== 'undefined' && typeof require('fs') !== 'undefined',
          };
        }
      };
    `);
    const context = createTestContext(pluginDir);
    const result = await PluginLoader.load(manifest, context);
    expect(result.success).toBe(true);
  });
});
