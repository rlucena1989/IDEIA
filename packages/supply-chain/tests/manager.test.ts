import { describe, it, expect, beforeEach } from '@jest/globals';
import { SupplyChainManager, createSupplyChainManager } from '../src/manager';

describe('SupplyChainManager', () => {
  let manager: SupplyChainManager;

  beforeEach(() => {
    manager = createSupplyChainManager();
  });

  describe('constructor', () => {
    it('should create manager with components', () => {
      expect(manager).toBeInstanceOf(SupplyChainManager);
      expect(manager.artifactRegistry).toBeDefined();
      expect(manager.dependencyPolicy).toBeDefined();
      expect(manager.buildVerifier).toBeDefined();
    });
  });

  describe('registerArtifact', () => {
    it('should register artifact and return provenance', () => {
      const provenance = manager.registerArtifact(
        'test-artifact',
        '1.0.0',
        'artifact content',
        'builder-1',
        'production',
        ['dep-1', 'dep-2']
      );
      expect(provenance).toBeDefined();
      expect(provenance.name).toBe('test-artifact');
      expect(provenance.version).toBe('1.0.0');
      expect(provenance.producedBy).toBe('builder-1');
      expect(provenance.dependencies).toEqual(['dep-1', 'dep-2']);
    });
  });

  describe('verify', () => {
    it('should verify artifact integrity', () => {
      const provenance = manager.registerArtifact(
        'test-artifact',
        '1.0.0',
        'artifact content',
        'builder-1',
        'production'
      );
      const check = manager.verify(provenance.id, 'artifact content');
      expect(check).toBeDefined();
      expect(check.artifactId).toBe(provenance.id);
    });

    it('should detect mismatched content', () => {
      const provenance = manager.registerArtifact(
        'test-artifact',
        '1.0.0',
        'artifact content',
        'builder-1',
        'production'
      );
      const check = manager.verify(provenance.id, 'different content');
      expect(check.match).toBe(false);
    });
  });

  describe('checkDependency', () => {
    it('should check dependency policy', () => {
      const result = manager.checkDependency('lodash', '4.17.21', 30);
      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe('boolean');
      expect(Array.isArray(result.reasons)).toBe(true);
    });
  });

  describe('verifyBuild', () => {
    it('should verify build reproducibility', () => {
      const inputs = { source: 'src' };
      const config = { env: 'production' };
      const expectedHash = 'abc123';
      const result = manager.verifyBuild(inputs, config, expectedHash);
      expect(result).toBeDefined();
      expect(typeof result.reproducible).toBe('boolean');
      expect(Array.isArray(result.differences)).toBe(true);
    });
  });

  describe('artifactRegistry', () => {
    it('should have artifact registry instance', () => {
      expect(manager.artifactRegistry).toBeDefined();
    });
  });

  describe('dependencyPolicy', () => {
    it('should have dependency policy instance', () => {
      expect(manager.dependencyPolicy).toBeDefined();
    });
  });

  describe('buildVerifier', () => {
    it('should have build verifier instance', () => {
      expect(manager.buildVerifier).toBeDefined();
    });
  });
});

describe('createSupplyChainManager', () => {
  it('should create manager instance', () => {
    const manager = createSupplyChainManager();
    expect(manager).toBeInstanceOf(SupplyChainManager);
  });
});
