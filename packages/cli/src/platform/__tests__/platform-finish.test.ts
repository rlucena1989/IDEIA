import { describe, it, expect } from '@jest/globals';
import { finishPlatform } from '../platform-finish';
import { buildPlatformState } from '../platform-builder';

describe('platform-finish', () => {
  it('finishPlatform should be defined', () => {
    expect(finishPlatform).toBeDefined();
  });

  it('should close platform with summary', () => {
    const state = buildPlatformState({
      name: 'ai-devkit', version: '24.0.0', healthScore: 92,
      autonomyLevel: 'assisted', modules: ['m1'], policies: [],
    });
    const result = finishPlatform(state);
    expect(result.closed).toBe(true);
    expect(result.summary).toContain('ai-devkit');
  });
});
