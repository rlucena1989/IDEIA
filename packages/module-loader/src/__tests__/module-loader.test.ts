jest.mock('@ideia/core-contributions');

import { DefaultModuleRegistry } from '../registry';
import { ModuleDefinition } from '../types';

describe('DefaultModuleRegistry', () => {
  let registry: DefaultModuleRegistry;

  beforeEach(() => {
    registry = new DefaultModuleRegistry();
  });

  it('should register a module definition', () => {
    const def: ModuleDefinition = { id: 'mod1', path: '/path/to/mod1', enabled: true, dependencies: [], metadata: {} };
    const disposable = registry.register(def);
    expect(disposable).toBeDefined();
    expect(typeof disposable.dispose).toBe('function');
  });

  it('should load a registered module', async () => {
    const def: ModuleDefinition = { id: 'mod1', path: '/path/to/mod1', enabled: true, dependencies: [], metadata: {} };
    registry.register(def);
    const loaded = await registry.load('mod1');
    expect(loaded.id).toBe('mod1');
    expect(loaded.dependencies).toEqual([]);
    expect(loaded.loadedAt).toBeInstanceOf(Date);
    expect(loaded.exports).toEqual({});
  });

  it('should throw when loading an unregistered module', async () => {
    await expect(registry.load('nonexistent')).rejects.toThrow('Module not registered: nonexistent');
  });

  it('should return cached module on subsequent load', async () => {
    const def: ModuleDefinition = { id: 'mod1', path: '/p/mod1', enabled: true, dependencies: [], metadata: {} };
    registry.register(def);
    const first = await registry.load('mod1');
    const second = await registry.load('mod1');
    expect(second).toBe(first);
  });

  it('should report loaded status', async () => {
    const def: ModuleDefinition = { id: 'mod1', path: '/p/mod1', enabled: true, dependencies: [], metadata: {} };
    registry.register(def);
    expect(registry.isLoaded('mod1')).toBe(false);
    await registry.load('mod1');
    expect(registry.isLoaded('mod1')).toBe(true);
  });

  it('should load dependencies before the module', async () => {
    const depDef: ModuleDefinition = { id: 'dep1', path: '/p/dep1', enabled: true, dependencies: [], metadata: {} };
    const modDef: ModuleDefinition = { id: 'mod1', path: '/p/mod1', enabled: true, dependencies: ['dep1'], metadata: {} };
    registry.register(depDef);
    registry.register(modDef);
    const loaded = await registry.load('mod1');
    expect(loaded.dependencies).toEqual(['dep1']);
    expect(registry.isLoaded('dep1')).toBe(true);
  });

  it('should load all registered modules', async () => {
    const def1: ModuleDefinition = { id: 'a', path: '/p/a', enabled: true, dependencies: [], metadata: {} };
    const def2: ModuleDefinition = { id: 'b', path: '/p/b', enabled: true, dependencies: [], metadata: {} };
    registry.register(def1);
    registry.register(def2);
    const all = await registry.loadAll();
    expect(all).toHaveLength(2);
    expect(all.map(m => m.id)).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('should not reload already loaded modules in loadAll', async () => {
    const def: ModuleDefinition = { id: 'mod1', path: '/p/mod1', enabled: true, dependencies: [], metadata: {} };
    registry.register(def);
    await registry.load('mod1');
    const loadedAt = registry['loaded'].get('mod1')!.loadedAt;
    await registry.loadAll();
    expect(registry['loaded'].get('mod1')!.loadedAt).toBe(loadedAt);
  });

  it('should list loaded module IDs', async () => {
    const def: ModuleDefinition = { id: 'mod1', path: '/p/mod1', enabled: true, dependencies: [], metadata: {} };
    registry.register(def);
    expect(registry.getLoadedModules()).toEqual([]);
    await registry.load('mod1');
    expect(registry.getLoadedModules()).toEqual(['mod1']);
  });

  it('should dispose registration removing the definition', () => {
    const def: ModuleDefinition = { id: 'mod1', path: '/p/mod1', enabled: true, dependencies: [], metadata: {} };
    const disposable = registry.register(def);
    expect(registry.isLoaded('mod1')).toBe(false);
    disposable.dispose();
    expect(registry['definitions'].has('mod1')).toBe(false);
  });

  it('should load a module and track it', async () => {
    const def: ModuleDefinition = { id: 'mod1', path: '/p/mod1', enabled: true, dependencies: [], metadata: {} };
    registry.register(def);
    await registry.load('mod1');
    expect(registry.isLoaded('mod1')).toBe(true);
  });
});
