import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { DependencyResolver } from '../dependency-resolver';

const mockFetch = jest.fn();
(globalThis as Record<string, unknown>).fetch = mockFetch;

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;

  beforeEach(() => {
    resolver = new DependencyResolver();
    mockFetch.mockReset();
  });

  describe('resolve', () => {
    it('returns empty results for no dependencies', async () => {
      const result = await resolver.resolve({});
      expect(result.dependencies).toEqual({});
      expect(result.devDependencies).toEqual({});
      expect(result.peerDependencies).toEqual({});
      expect(result.optionalDependencies).toEqual({});
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('resolves regular dependencies', async () => {
      const result = await resolver.resolve({
        dependencies: { express: '^4.18.0' },
      });
      expect(result.dependencies).toEqual({ express: '^4.18.0' });
    });

    it('resolves devDependencies', async () => {
      const result = await resolver.resolve({
        devDependencies: { jest: '^29.0.0' },
      });
      expect(result.devDependencies).toEqual({ jest: '^29.0.0' });
    });

    it('resolves peerDependencies', async () => {
      const result = await resolver.resolve({
        peerDependencies: { react: '^18.0.0' },
      });
      expect(result.peerDependencies).toEqual({ react: '^18.0.0' });
    });

    it('resolves optionalDependencies', async () => {
      const result = await resolver.resolve({
        optionalDependencies: { fsevents: '^2.3.0' },
      });
      expect(result.optionalDependencies).toEqual({ fsevents: '^2.3.0' });
    });

    it('warns on duplicate package names across sections', async () => {
      const result = await resolver.resolve({
        dependencies: { express: '^4.18.0' },
        devDependencies: { express: '^5.0.0' },
      });
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].code).toBe('DUPLICATE_DEP');
      expect(result.dependencies).toEqual({ express: '^4.18.0' });
      expect(result.devDependencies).toEqual({});
    });

    it('merges existing dependencies', async () => {
      const result = await resolver.resolve(
        { dependencies: { lodash: '^4.17.0' } },
        { commander: '^9.0.0' },
      );
      expect(result.dependencies).toEqual({ lodash: '^4.17.0', commander: '^9.0.0' });
    });

    it('detects version conflicts with existing deps', async () => {
      const result = await resolver.resolve(
        { dependencies: { lodash: '^4.17.0' } },
        { lodash: '^5.0.0' },
      );
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].code).toBe('VERSION_CONFLICT');
      expect(result.dependencies.lodash).toBe('^5.0.0');
    });

    it('warns on missing peer runtime dependency', async () => {
      const result = await resolver.resolve({
        peerDependencies: { react: '^18.0.0' },
      });
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].code).toBe('MISSING_PEER_RUNTIME');
    });

    it('does not warn when peer has corresponding runtime dep', async () => {
      const result = await resolver.resolve({
        dependencies: { react: '^18.0.0' },
        peerDependencies: { react: '^18.0.0' },
      });
      const peerWarnings = result.warnings.filter(w => w.code === 'MISSING_PEER_RUNTIME');
      expect(peerWarnings.length).toBe(0);
    });

    it('handles all four dependency sections simultaneously', async () => {
      const result = await resolver.resolve({
        dependencies: { express: '^4.18.0' },
        devDependencies: { jest: '^29.0.0' },
        peerDependencies: { react: '^18.0.0' },
        optionalDependencies: { fsevents: '^2.3.0' },
      });
      expect(result.dependencies.express).toBe('^4.18.0');
      expect(result.devDependencies.jest).toBe('^29.0.0');
      expect(result.peerDependencies.react).toBe('^18.0.0');
      expect(result.optionalDependencies.fsevents).toBe('^2.3.0');
    });
  });

  describe('checkLatestVersion', () => {
    it('returns latest version from registry', async () => {
      mockFetch.mockImplementation(async () => ({
        ok: true,
        json: async () => ({ 'dist-tags': { latest: '1.2.3' } }),
      }));
      const result = await resolver.checkLatestVersion('express');
      expect(result).toBe('1.2.3');
    });

    it('caches registry responses', async () => {
      mockFetch.mockImplementation(async () => ({
        ok: true,
        json: async () => ({ 'dist-tags': { latest: '1.2.3' } }),
      }));
      await resolver.checkLatestVersion('express');
      await resolver.checkLatestVersion('express');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('returns unknown on fetch failure', async () => {
      mockFetch.mockImplementation(async () => { throw new Error('Network error'); });
      const result = await resolver.checkLatestVersion('nonexistent');
      expect(result).toBe('unknown');
    });

    it('returns unknown on non-ok response', async () => {
      mockFetch.mockImplementation(async () => ({
        ok: false,
        status: 404,
      }));
      const result = await resolver.checkLatestVersion('nonexistent');
      expect(result).toBe('unknown');
    });
  });

  describe('resolveVersions', () => {
    it('resolves latest to actual version', async () => {
      mockFetch.mockImplementation(async () => ({
        ok: true,
        json: async () => ({ 'dist-tags': { latest: '1.2.3' } }),
      }));
      const result = await resolver.resolveVersions({ express: 'latest' });
      expect(result.express).toBe('^1.2.3');
    });

    it('resolves * to actual version', async () => {
      mockFetch.mockImplementation(async () => ({
        ok: true,
        json: async () => ({ 'dist-tags': { latest: '2.0.0' } }),
      }));
      const result = await resolver.resolveVersions({ lodash: '*' });
      expect(result.lodash).toBe('^2.0.0');
    });

    it('keeps explicit versions unchanged', async () => {
      const result = await resolver.resolveVersions({ express: '^4.18.0' });
      expect(result.express).toBe('^4.18.0');
    });

    it('uses wildcard fallback when registry fails for latest', async () => {
      mockFetch.mockImplementation(async () => { throw new Error('fail'); });
      const result = await resolver.resolveVersions({ pkg: 'latest' });
      expect(result.pkg).toBe('*');
    });
  });

  describe('generatePackageJson', () => {
    it('generates package.json string', () => {
      const deps = {
        dependencies: { express: '^4.18.0' },
        devDependencies: { jest: '^29.0.0' },
        peerDependencies: {},
        optionalDependencies: {},
        errors: [],
        warnings: [],
      };
      const result = resolver.generatePackageJson('my-app', 'My app', deps);
      const parsed = JSON.parse(result);
      expect(parsed.name).toBe('my-app');
      expect(parsed.dependencies.express).toBe('^4.18.0');
      expect(parsed.devDependencies.jest).toBe('^29.0.0');
    });

    it('includes custom scripts', () => {
      const deps = {
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
        optionalDependencies: {},
        errors: [],
        warnings: [],
      };
      const result = resolver.generatePackageJson('app', '', deps, { start: 'node server.js' });
      const parsed = JSON.parse(result);
      expect(parsed.scripts.start).toBe('node server.js');
    });

    it('includes engines', () => {
      const deps = {
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
        optionalDependencies: {},
        errors: [],
        warnings: [],
      };
      const result = resolver.generatePackageJson('app', '', deps, {}, { node: '>=18' });
      const parsed = JSON.parse(result);
      expect(parsed.engines.node).toBe('>=18');
    });
  });

  describe('mergeDependencyArrays', () => {
    it('merges base and override', () => {
      const result = resolver.mergeDependencyArrays(
        { express: '^4.18.0', lodash: '^4.17.0' },
        { express: '^5.0.0', axios: '^1.0.0' },
      );
      expect(result.express).toBe('^5.0.0');
      expect(result.lodash).toBe('^4.17.0');
      expect(result.axios).toBe('^1.0.0');
    });
  });

  describe('detectConflicts', () => {
    it('detects version mismatches', () => {
      const warnings = resolver.detectConflicts(
        { express: '^4.18.0' },
        { express: '^5.0.0' },
      );
      expect(warnings.length).toBe(1);
      expect(warnings[0].code).toBe('VERSION_MISMATCH');
    });

    it('returns empty for no conflicts', () => {
      const warnings = resolver.detectConflicts(
        { express: '^4.18.0' },
        { lodash: '^4.17.0' },
      );
      expect(warnings.length).toBe(0);
    });
  });
});
