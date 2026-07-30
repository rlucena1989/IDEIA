import { describe, it, expect } from '@jest/globals';
import { TypeScriptAdapter, createTypeScriptAdapter } from '../src/index';

describe('TypeScriptAdapter', () => {
  let adapter: TypeScriptAdapter;

  beforeEach(() => {
    adapter = new TypeScriptAdapter();
  });

  describe('constructor', () => {
    it('should create adapter with default config', () => {
      const adapter = new TypeScriptAdapter();
      expect(adapter.name).toBe('typescript');
      expect(adapter.language).toBe('typescript');
    });

    it('should create adapter with custom config', () => {
      const adapter = new TypeScriptAdapter({ projectRoot: '/test' });
      expect(adapter.name).toBe('typescript');
    });
  });

  describe('factory function', () => {
    it('should create adapter instance', () => {
      const adapter = createTypeScriptAdapter();
      expect(adapter).toBeInstanceOf(TypeScriptAdapter);
    });
  });

  describe('capabilities', () => {
    it('should have all required capabilities', () => {
      expect(adapter.capabilities).toContain('detect');
      expect(adapter.capabilities).toContain('init');
      expect(adapter.capabilities).toContain('generateEntity');
      expect(adapter.capabilities).toContain('runLint');
      expect(adapter.capabilities).toContain('runTests');
      expect(adapter.capabilities).toContain('runBuild');
      expect(adapter.capabilities).toContain('qualityGate');
    });
  });
});
