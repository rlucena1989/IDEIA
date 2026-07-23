import { describe, it, expect } from '@jest/globals';
import { verifyPlatform } from '../platform-verifier';
import { buildPlatformState } from '../platform-builder';

describe('platform-verifier', () => {
  it('verifyPlatform should be defined', () => {
    expect(verifyPlatform).toBeDefined();
  });

  it('should pass for complete healthy platform', () => {
    const state = buildPlatformState({
      name: 'test', version: '1.0', healthScore: 85,
      autonomyLevel: 'assisted', modules: ['m1'], policies: ['p1'],
    });
    const v = verifyPlatform(state);
    expect(v.ok).toBe(true);
  });

  it('should fail for low health', () => {
    const state = buildPlatformState({
      name: 'test', version: '1.0', healthScore: 50,
      autonomyLevel: 'none', modules: ['m1'], policies: ['p1'],
    });
    const v = verifyPlatform(state);
    expect(v.ok).toBe(false);
    expect(v.issues.some(i => i.includes('Health'))).toBe(true);
  });

  it('should fail without modules', () => {
    const state = buildPlatformState({
      name: 'test', version: '1.0', healthScore: 85,
      autonomyLevel: 'assisted', modules: [], policies: ['p1'],
    });
    const v = verifyPlatform(state);
    expect(v.ok).toBe(false);
  });
});
