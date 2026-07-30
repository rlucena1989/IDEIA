import { describe, it, expect, beforeEach } from '@jest/globals';
import { DefaultModuleRegistry } from '../src/registry';
import { ModuleDefinition } from '../src/types';

describe('DefaultModuleRegistry', () => {
  let registry: DefaultModuleRegistry;

  beforeEach(() => {
    registry = new DefaultModuleRegistry();
  });

  describe('register', () => {
    it('should register a module', () => {
      const def: ModuleDefinition = {
        id: 'module-1',
        path: '/path/to/module',
        enabled: true,
        dependencies: [],
        metadata: {},
      };
      const disposable = registry.register(def);
      expect(disposable).toBeDefined();
      expect(disposable.dispose).toBeInstanceOf(Function);
    });

    it('should allow unregistering via disposable', () => {
      const def: ModuleDefinition = {
        id: 'module-1',
        path: '/path/to/module',
        enabled: true,
        dependencies: [],
        metadata: {},
      };
      const disposable = registry.register(def);
      disposable.dispose();
      const loaded = registry.getLoadedModules();
      expect(loaded).not.toContain('module-1');
    });
  });

  describe('load', () => {
    it('should load a registered module', async () => {
      const def: ModuleDefinition = {
        id: 'module-1',
        path: '/path/to/module',
        enabled: true,
        dependencies: [],
        metadata: {},
      };
      registry.register(def);
      const loaded = await registry.load('module-1');
      expect(loaded).toBeDefined();
      expect(loaded.id).toBe('module-1');
    });

    it('should throw error for unregistered module', async () => {
      await expect(registry.load('non-existent')).rejects.toThrow('Module not registered');
    });

    it('should load dependencies first', async () => {
      const depDef: ModuleDefinition = {
        id: 'dep-1',
        path: '/path/to/dep',
        enabled: true,
        dependencies: [],
        metadata: {},
      };
      const moduleDef: ModuleDefinition = {
        id: 'module-1',
        path: '/path/to/module',
        enabled: true,
        dependencies: ['dep-1'],
        metadata: {},
      };
      registry.register(depDef);
      registry.register(moduleDef);
      await registry.load('module-1');
      expect(registry.isLoaded('dep-1')).toBe(true);
    });

    it('should return cached module if already loaded', async () => {
      const def: ModuleDefinition = {
        id: 'module-1',
        path: '/path/to/module',
        enabled: true,
        dependencies: [],
        metadata: {},
      };
      registry.register(def);
      const first = await registry.load('module-1');
      const second = await registry.load('module-1');
      expect(first).toBe(second);
    });
  });

  describe('loadAll', () => {
    it('should load all registered modules', async () => {
      const def1: ModuleDefinition = {
        id: 'module-1',
        path: '/path/to/module1',
        enabled: true,
        dependencies: [],
        metadata: {},
      };
      const def2: ModuleDefinition = {
        id: 'module-2',
        path: '/path/to/module2',
        enabled: true,
        dependencies: [],
        metadata: {},
      };
      registry.register(def1);
      registry.register(def2);
      const loaded = await registry.loadAll();
      expect(loaded).toHaveLength(2);
    });

    it('should skip already loaded modules', async () => {
      const def: ModuleDefinition = {
        id: 'module-1',
        path: '/path/to/module',
        enabled: true,
        dependencies: [],
        metadata: {},
      };
      registry.register(def);
      await registry.load('module-1');
      const loaded = await registry.loadAll();
      expect(loaded).toHaveLength(0);
    });
  });

  describe('isLoaded', () => {
    it('should return false for unloaded module', () => {
      expect(registry.isLoaded('module-1')).toBe(false);
    });

    it('should return true for loaded module', async () => {
      const def: ModuleDefinition = {
        id: 'module-1',
        path: '/path/to/module',
        enabled: true,
        dependencies: [],
        metadata: {},
      };
      registry.register(def);
      await registry.load('module-1');
      expect(registry.isLoaded('module-1')).toBe(true);
    });
  });

  describe('getLoadedModules', () => {
    it('should return empty array initially', () => {
      const loaded = registry.getLoadedModules();
      expect(loaded).toEqual([]);
    });

    it('should return loaded module ids', async () => {
      const def: ModuleDefinition = {
        id: 'module-1',
        path: '/path/to/module',
        enabled: true,
        dependencies: [],
        metadata: {},
      };
      registry.register(def);
      await registry.load('module-1');
      const loaded = registry.getLoadedModules();
      expect(loaded).toContain('module-1');
    });
  });

  describe('onModuleLoaded', () => {
    it('should fire event when module is loaded', async () => {
      const def: ModuleDefinition = {
        id: 'module-1',
        path: '/path/to/module',
        enabled: true,
        dependencies: [],
        metadata: {},
      };
      registry.register(def);
      
      let fired = false;
      registry.onModuleLoaded(() => {
        fired = true;
      });
      
      await registry.load('module-1');
      expect(fired).toBe(true);
    });
  });
});
