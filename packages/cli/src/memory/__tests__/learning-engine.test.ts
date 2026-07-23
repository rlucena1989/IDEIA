import { describe, it, expect } from '@jest/globals';
import { generateRecommendations } from '../learning-engine';
import type { MemoryPattern } from '@ideia/contracts';

describe('learning-engine', () => {
  it('generateRecommendations should be defined', () => {
    expect(generateRecommendations).toBeDefined();
  });

  it('should return recommendations from patterns', () => {
    const patterns: MemoryPattern[] = [
      { patternId: 'p1', name: 'consistency', frequency: 3, confidence: 0.85, description: '', detectedAt: '' },
    ];
    const recs = generateRecommendations(patterns);
    expect(recs.length).toBe(1);
    expect(recs[0].action).toBe('apply_policy_tuning');
  });

  it('should suggest monitor for low confidence', () => {
    const patterns: MemoryPattern[] = [
      { patternId: 'p2', name: 'rare', frequency: 2, confidence: 0.6, description: '', detectedAt: '' },
    ];
    const recs = generateRecommendations(patterns);
    expect(recs[0].action).toBe('monitor_more');
  });
});
