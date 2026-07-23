import { describe, it, expect } from '@jest/globals';
import { packagePlatform } from '../platform-packager';
import { buildPlatformState } from '../platform-builder';

describe('platform-packager', () => {
  it('packagePlatform should be defined', () => {
    expect(packagePlatform).toBeDefined();
  });

  it('should package modules and policies', () => {
    const state = buildPlatformState({
      name: 'test', version: '2.0', healthScore: 90,
      autonomyLevel: 'assisted', modules: ['m1', 'm2'], policies: ['p1'],
    });
    const pkg = packagePlatform(state);
    expect(pkg.version).toBe('2.0');
    expect(pkg.contents).toContain('m1');
    expect(pkg.contents).toContain('p1');
  });
});
