import { describe, it, expect } from '@jest/globals';
import { computeAdaptiveScores } from '../adaptive-score';
import { OperationalPattern } from '../pattern-types';

describe('adaptive-score', () => {
  it('computeAdaptiveScores should be defined', () => {
    expect(computeAdaptiveScores).toBeDefined();
  });

  it('should return baseline weights for no patterns', () => {
    const scores = computeAdaptiveScores([]);
    expect(scores.consistencyWeight).toBe(1);
    expect(scores.hardeningWeight).toBe(1);
    expect(scores.generationWeight).toBe(1);
    expect(scores.evolutionWeight).toBe(1);
  });

  it('should increase consistency weight with high patterns', () => {
    const patterns: OperationalPattern[] = [
      { patternId: 'p1', name: 'P1', description: '', frequency: 3, confidence: 0.8, impact: 'high', triggers: [], recommendedAction: 'repair' },
    ];
    const scores = computeAdaptiveScores(patterns);
    expect(scores.consistencyWeight).toBe(1.1);
    expect(scores.hardeningWeight).toBe(1);
  });

  it('should decrease generation weight with high patterns', () => {
    const patterns: OperationalPattern[] = [
      { patternId: 'p1', name: 'P1', description: '', frequency: 3, confidence: 0.8, impact: 'high', triggers: [], recommendedAction: 'repair' },
    ];
    const scores = computeAdaptiveScores(patterns);
    expect(scores.generationWeight).toBe(0.95);
  });

  it('should increase evolution weight with more patterns', () => {
    const patterns: OperationalPattern[] = [
      { patternId: 'p1', name: 'P1', description: '', frequency: 1, confidence: 0.8, impact: 'low', triggers: [], recommendedAction: 'sync' },
      { patternId: 'p2', name: 'P2', description: '', frequency: 2, confidence: 0.8, impact: 'medium', triggers: [], recommendedAction: 'repair' },
    ];
    const scores = computeAdaptiveScores(patterns);
    expect(scores.evolutionWeight).toBe(1.1);
  });
});
