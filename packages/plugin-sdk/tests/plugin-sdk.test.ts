import { describe, it, expect, beforeEach } from '@jest/globals';
import { PluginManager, PluginRegistry, validateManifest, createPluginRegistry, createPluginManager } from '../src/index';
import { PluginManifest, Plugin, PluginHook } from '../src/index';

describe('validateManifest', () => {
  it('should validate valid manifest', () => {
    const manifest: Record<string, unknown> = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      entrypoint: 'index.js',
      permissions: ['fs.read'],
      hooks: ['onActivate'],
    };
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject manifest without id', () => {
    const manifest: Record<string, unknown> = {
      name: 'Test Plugin',
      version: '1.0.0',
      entrypoint: 'index.js',
    };
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Plugin id is required');
  });

  it('should reject manifest without name', () => {
    const manifest: Record<string, unknown> = {
      id: 'test-plugin',
      version: '1.0.0',
      entrypoint: 'index.js',
    };
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Plugin name is required');
  });

  it('should reject manifest with invalid permissions', () => {
    const manifest: Record<string, unknown> = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      entrypoint: 'index.js',
      permissions: 'invalid' as unknown,
    };
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Permissions must be an array');
  });
});

describe('PluginManager', () => {
  let manager: PluginManager;

  beforeEach(() => {
    manager = createPluginManager();
  });

  describe('constructor', () => {
    it('should create manager with default base dir', () => {
      expect(manager).toBeInstanceOf(PluginManager);
    });

    it('should create manager with custom base dir', () => {
      const manager = createPluginManager('/custom/path');
      expect(manager).toBeInstanceOf(PluginManager);
    });
  });

  describe('register', () => {
    it('should register plugin', () => {
      const plugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        hooks: ['onActivate'],
        activate: () => {},
        deactivate: () => {},
      };
      manager.register(plugin);
      const retrieved = manager.get('test-plugin');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-plugin');
    });

    it('should throw error for duplicate plugin', () => {
      const plugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        hooks: ['onActivate'],
        activate: () => {},
        deactivate: () => {},
      };
      manager.register(plugin);
      expect(() => manager.register(plugin)).toThrow('Plugin "test-plugin" is already registered');
    });
  });

  describe('unregister', () => {
    it('should unregister plugin', () => {
      const plugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        hooks: ['onActivate'],
        activate: () => {},
        deactivate: () => {},
      };
      manager.register(plugin);
      const result = manager.unregister('test-plugin');
      expect(result).toBe(true);
      expect(manager.get('test-plugin')).toBeUndefined();
    });

    it('should return false for non-existent plugin', () => {
      const result = manager.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent plugin', () => {
      const plugin = manager.get('non-existent');
      expect(plugin).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should return empty list initially', () => {
      const plugins = manager.list();
      expect(plugins).toEqual([]);
    });

    it('should return registered plugins', () => {
      const plugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        hooks: ['onActivate'],
        activate: () => {},
        deactivate: () => {},
      };
      manager.register(plugin);
      const plugins = manager.list();
      expect(plugins).toHaveLength(1);
    });
  });

  describe('fireHook', () => {
    it('should fire hook without error', () => {
      manager.fireHook('onActivate');
    });
  });

  describe('getRegistry', () => {
    it('should return registry instance', () => {
      const registry = manager.getRegistry();
      expect(registry).toBeInstanceOf(PluginRegistry);
    });
  });
});

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = createPluginRegistry();
  });

  describe('constructor', () => {
    it('should create registry instance', () => {
      expect(registry).toBeInstanceOf(PluginRegistry);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent plugin', () => {
      const plugin = registry.get('non-existent');
      expect(plugin).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should return list of plugins', () => {
      const plugins = registry.list();
      expect(Array.isArray(plugins)).toBe(true);
    });
  });

  describe('enable', () => {
    it('should enable plugin', () => {
      registry.enable('test-plugin');
    });
  });

  describe('disable', () => {
    it('should disable plugin', () => {
      registry.disable('test-plugin');
    });
  });
});

describe('createPluginRegistry', () => {
  it('should create registry instance', () => {
    const registry = createPluginRegistry();
    expect(registry).toBeInstanceOf(PluginRegistry);
  });
});

describe('createPluginManager', () => {
  it('should create manager instance', () => {
    const manager = createPluginManager();
    expect(manager).toBeInstanceOf(PluginManager);
  });
});
