import { describe, it, expect } from '@jest/globals';
import { buildPlatformState } from '../platform-builder';

describe('platform-builder', () => {
  it('buildPlatformState should be defined', () => {
    expect(buildPlatformState).toBeDefined();
  });

  it('should build platform with operational status for high health', () => {
    const state = buildPlatformState({
      name: 'test', version: '1.0', healthScore: 85,
      autonomyLevel: 'assisted', modules: ['m1'], policies: ['p1'],
    });
    expect(state.status).toBe('operational');
    expect(state.healthScore).toBe(85);
  });

  it('should return maintenance status for low health', () => {
    const state = buildPlatformState({
      name: 'test', version: '1.0', healthScore: 60,
      autonomyLevel: 'none', modules: [], policies: [],
    });
    expect(state.status).toBe('maintenance');
  });
});
