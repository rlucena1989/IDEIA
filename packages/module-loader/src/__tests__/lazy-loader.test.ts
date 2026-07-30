import { DefaultModuleRegistry } from '../registry';
jest.mock('@ideia/core-contributions');

import { LazyModuleLoader } from '../lazy-loader';
import { ModuleDefinition } from '../types';

describe('LazyModuleLoader', () => {
  let registry: DefaultModuleRegistry;
  let loader: LazyModuleLoader;

  beforeEach(() => {
    registry = new DefaultModuleRegistry();
    loader = new LazyModuleLoader(registry);
  });

  it('should register a lazy module via registry', () => {
    const def: ModuleDefinition = { id: 'lazy1', path: '/p/lazy1', enabled: true, dependencies: [], metadata: {} };
    loader.registerLazy(def);
    expect(registry['definitions'].has('lazy1')).toBe(true);
  });

  it('should load a module on demand', async () => {
    const def: ModuleDefinition = { id: 'lazy1', path: '/p/lazy1', enabled: true, dependencies: [], metadata: {} };
    loader.registerLazy(def);
    await loader.loadOnDemand('lazy1');
    expect(registry.isLoaded('lazy1')).toBe(true);
  });

  it('should not reload an already loaded module', async () => {
    const def: ModuleDefinition = { id: 'lazy1', path: '/p/lazy1', enabled: true, dependencies: [], metadata: {} };
    loader.registerLazy(def);
    await loader.loadOnDemand('lazy1');
    const loadedAt = registry['loaded'].get('lazy1')!.loadedAt;
    await loader.loadOnDemand('lazy1');
    expect(registry['loaded'].get('lazy1')!.loadedAt).toBe(loadedAt);
  });

  it('should not reload a module that is currently loading', async () => {
    const def: ModuleDefinition = { id: 'lazy1', path: '/p/lazy1', enabled: true, dependencies: [], metadata: {} };
    loader.registerLazy(def);
    const loadPromise1 = loader.loadOnDemand('lazy1');
    const loadPromise2 = loader.loadOnDemand('lazy1');
    await Promise.all([loadPromise1, loadPromise2]);
    const loadedModules = registry.getLoadedModules();
    expect(loadedModules.filter(m => m === 'lazy1')).toHaveLength(1);
  });

  it('should throw when loading an unregistered module', async () => {
    await expect(loader.loadOnDemand('nonexistent')).rejects.toThrow('Module not found: nonexistent');
  });

  it('should skip loading when lazy option is false', async () => {
    const def: ModuleDefinition = { id: 'lazy1', path: '/p/lazy1', enabled: true, dependencies: [], metadata: {} };
    loader.registerLazy(def);
    await loader.loadOnDemand('lazy1', { lazy: false });
    expect(registry.isLoaded('lazy1')).toBe(false);
  });

  it('should recover from loading error and remove from loading set', async () => {
    await expect(loader.loadOnDemand('missing')).rejects.toThrow('Module not found: missing');
    expect(loader['loading'].has('missing')).toBe(false);
  });
});
