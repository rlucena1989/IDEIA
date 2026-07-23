import { describe, it, expect } from '@jest/globals';
import { recommendActions } from '../recommendation-engine';
import { OperationalPattern } from '../pattern-types';

describe('recommendation-engine', () => {
  it('recommendActions should be defined', () => {
    expect(recommendActions).toBeDefined();
  });

  it('should return sync recommendation for no patterns', () => {
    const recs = recommendActions([]);
    expect(recs.length).toBe(1);
    expect(recs[0].action).toBe('sync');
    expect(recs[0].priority).toBe('low');
  });

  it('should map patterns to recommendations', () => {
    const patterns: OperationalPattern[] = [
      { patternId: 'p1', name: 'P1', description: 'Test pattern', frequency: 3, confidence: 0.87, impact: 'high', triggers: ['t1'], recommendedAction: 'repair' },
    ];
    const recs = recommendActions(patterns);
    expect(recs.length).toBe(1);
    expect(recs[0].action).toBe('repair');
    expect(recs[0].priority).toBe('high');
    expect(recs[0].reason).toBe('Test pattern');
  });

  it('should map critical impact to critical priority', () => {
    const patterns: OperationalPattern[] = [
      { patternId: 'p1', name: 'P1', description: 'Critical', frequency: 5, confidence: 0.95, impact: 'critical', triggers: [], recommendedAction: 'block' },
    ];
    const recs = recommendActions(patterns);
    expect(recs[0].priority).toBe('critical');
    expect(recs[0].action).toBe('block');
  });
});
