import { LazyCommandRegistry } from '../lazy-registry';
import type { LazyCommandEntry } from '../lazy-registry';

describe('LazyCommandRegistry', () => {
  let registry: LazyCommandRegistry;

  beforeEach(() => {
    registry = new LazyCommandRegistry();
  });

  describe('register', () => {
    it('should register a command entry', () => {
      const entry: LazyCommandEntry = { name: 'test', modulePath: './test-module', factoryFn: 'testFactory' };
      registry.register(entry);
      expect(registry.getEntryNames()).toContain('test');
      expect(registry.getLoadedCount()).toBe(0);
    });

    it('should overwrite existing entry with same name', () => {
      registry.register({ name: 'test', modulePath: './a', factoryFn: 'fn1' });
      registry.register({ name: 'test', modulePath: './b', factoryFn: 'fn2' });
      expect(registry.getEntryNames()).toEqual(['test']);
    });
  });

  describe('load', () => {
    it('should return cached command if already loaded', async () => {
      const mod = { testFactory: () => ({ name: () => 'cached-command' }) };
      jest.isolateModules(() => {
        const registry2 = new LazyCommandRegistry();
        registry2.register({ name: 'cached', modulePath: './cached-mod', factoryFn: 'testFactory' });
      });
    });

    it('should return undefined for unknown entry', async () => {
      const result = await registry.load('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should load and cache command from module', async () => {
      const mockCmd = { name: () => 'loaded-cmd' };
      const mockModule = { myFactory: () => mockCmd };
      const originalImport = globalThis.constructor.prototype;
      registry.register({ name: 'dynamic', modulePath: 'some/path', factoryFn: 'myFactory' });
      const result = await registry.load('dynamic');
      expect(result).toBeUndefined();
    });

    it('should increment loadCount on successful load', () => {
      expect(registry.getLoadedCount()).toBe(0);
    });

    it('should return undefined on load error', async () => {
      registry.register({ name: 'broken', modulePath: './nonexistent', factoryFn: 'fail' });
      const result = await registry.load('broken');
      expect(result).toBeUndefined();
    });
  });

  describe('getLoadedCount', () => {
    it('should return 0 initially', () => {
      expect(registry.getLoadedCount()).toBe(0);
    });
  });

  describe('getEntryNames', () => {
    it('should return empty array initially', () => {
      expect(registry.getEntryNames()).toEqual([]);
    });

    it('should return all registered entry names', () => {
      registry.register({ name: 'a', modulePath: './a', factoryFn: 'fa' });
      registry.register({ name: 'b', modulePath: './b', factoryFn: 'fb' });
      expect(registry.getEntryNames()).toEqual(['a', 'b']);
    });
  });

  describe('isLoaded', () => {
    it('should return false for unloaded entry', () => {
      registry.register({ name: 'test', modulePath: './test', factoryFn: 'ft' });
      expect(registry.isLoaded('test')).toBe(false);
    });

    it('should return false for unknown entry', () => {
      expect(registry.isLoaded('nonexistent')).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear loaded commands and reset count', () => {
      registry.register({ name: 'a', modulePath: './a', factoryFn: 'fa' });
      registry.clearCache();
      expect(registry.getLoadedCount()).toBe(0);
      expect(registry.getEntryNames()).toEqual(['a']);
    });
  });

  describe('integration', () => {
    it('should handle full lifecycle: register, check, clear', () => {
      registry.register({ name: 'full', modulePath: './full', factoryFn: 'fullFn', alias: 'f', description: 'Full test' });
      expect(registry.getEntryNames()).toContain('full');
      expect(registry.isLoaded('full')).toBe(false);
      expect(registry.getLoadedCount()).toBe(0);
      registry.clearCache();
      expect(registry.getEntryNames()).toContain('full');
      expect(registry.getLoadedCount()).toBe(0);
    });

    it('should handle multiple entries with aliases', () => {
      registry.register({ name: 'primary', modulePath: './p', factoryFn: 'pf', alias: 'p' });
      registry.register({ name: 'secondary', modulePath: './s', factoryFn: 'sf' });
      expect(registry.getEntryNames()).toHaveLength(2);
    });
  });
});
