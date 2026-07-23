import { PluginRegistry, createPluginRegistry, validateManifest, PluginManifest, HOOKS } from '../src/index';
import path from 'path';
import os from 'os';

describe('validateManifest', () => {
  it('validates correct manifest', () => {
    const result = validateManifest({ id: 'p1', name: 'Plugin1', version: '1.0', entrypoint: 'index.js', permissions: ['fs.read'], hooks: ['onActivate'] });
    expect(result.valid).toBe(true);
  });

  it('rejects manifest without id', () => {
    expect(validateManifest({ name: 'P', version: '1', entrypoint: 'i.js' }).valid).toBe(false);
  });

  it('rejects manifest without entrypoint', () => {
    expect(validateManifest({ id: 'p1', name: 'P', version: '1' }).valid).toBe(false);
  });
});

describe('PluginRegistry', () => {
  let registry: PluginRegistry;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `plugin-test-${Date.now()}`);
    require('fs').mkdirSync(tmpDir, { recursive: true });
    registry = createPluginRegistry(tmpDir);
  });

  it('starts empty', () => {
    expect(registry.list()).toHaveLength(0);
  });

  it('installs plugin', () => {
    const manifest: PluginManifest = {
      id: 'test-plugin', name: 'Test Plugin', version: '1.0.0',
      description: 'A test plugin', entrypoint: 'index.js',
      permissions: ['fs.read'], hooks: ['onActivate'],
    };
    const instance = registry.install(manifest, 'module.exports = { activate: () => {} };');
    expect(instance.manifest.id).toBe('test-plugin');
    expect(instance.enabled).toBe(true);
    expect(registry.list()).toHaveLength(1);
  });

  it('uninstalls plugin', () => {
    registry.install({ id: 'p1', name: 'P1', version: '1.0', description: '', entrypoint: 'i.js', permissions: [], hooks: [] }, '');
    expect(registry.uninstall('p1')).toBe(true);
    expect(registry.list()).toHaveLength(0);
  });

  it('enables and disables plugin', () => {
    registry.install({ id: 'p1', name: 'P1', version: '1.0', description: '', entrypoint: 'i.js', permissions: [], hooks: [] }, '');
    registry.disable('p1');
    expect(registry.get('p1')!.enabled).toBe(false);
    registry.enable('p1');
    expect(registry.get('p1')!.enabled).toBe(true);
  });

  it('gets plugin by id', () => {
    registry.install({ id: 'p1', name: 'P1', version: '1.0', description: '', entrypoint: 'i.js', permissions: [], hooks: [] }, '');
    expect(registry.get('p1')).toBeDefined();
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('persists installed plugins to disk', () => {
    registry.install({ id: 'persist-test', name: 'PT', version: '1.0', description: '', entrypoint: 'index.js', permissions: [], hooks: [] }, 'console.log("ok")');
    const registry2 = createPluginRegistry(tmpDir);
    expect(registry2.get('persist-test')).toBeDefined();
  });

  it('API readFile respects permissions', () => {
    const manifest: PluginManifest = { id: 'reader', name: 'Reader', version: '1.0', description: '', entrypoint: 'i.js', permissions: ['fs.read'], hooks: [] };
    const instance = registry.install(manifest, '');
    const content = instance.api.readFile('./manifest.json');
    expect(content).not.toBeNull();
  });

  it('API writeFile respects permissions', () => {
    const manifest: PluginManifest = { id: 'writer', name: 'Writer', version: '1.0', description: '', entrypoint: 'i.js', permissions: ['fs.write'], hooks: [] };
    const instance = registry.install(manifest, '');
    expect(instance.api.writeFile('test.txt', 'hello')).toBe(true);
  });

  it('HOOKS are defined', () => {
    expect(HOOKS).toContain('onActivate');
    expect(HOOKS).toContain('onDeactivate');
    expect(HOOKS).toContain('onShutdown');
  });

  it('createPluginRegistry factory', () => {
    expect(createPluginRegistry()).toBeInstanceOf(PluginRegistry);
  });
});
