import { describe, it, expect } from '@jest/globals';
import { controlCycle } from '../cycle-controller';
import { Recommendation } from '../recommendation-engine';

describe('cycle-controller', () => {
  it('controlCycle should be defined', () => {
    expect(controlCycle).toBeDefined();
  });

  it('should escalate on critical priority', () => {
    const recs: Recommendation[] = [
      { action: 'block', reason: 'Critical issue', confidence: 0.98, priority: 'critical' },
    ];
    const result = controlCycle(recs);
    expect(result.shouldEscalate).toBe(true);
    expect(result.shouldRepeat).toBe(false);
    expect(result.nextAction).toBe('block');
  });

  it('should repeat and escalate on repeated repair', () => {
    const recs: Recommendation[] = [
      { action: 'repair', reason: 'R1', confidence: 0.85, priority: 'high' },
      { action: 'repair', reason: 'R2', confidence: 0.80, priority: 'medium' },
    ];
    const result = controlCycle(recs);
    expect(result.shouldRepeat).toBe(true);
    expect(result.shouldEscalate).toBe(true);
    expect(result.nextAction).toBe('review');
  });

  it('should defer on low confidence', () => {
    const recs: Recommendation[] = [
      { action: 'repair', reason: 'R1', confidence: 0.7, priority: 'medium' },
    ];
    const result = controlCycle(recs);
    expect(result.nextAction).toBe('defer');
  });

  it('should return normal cycle for healthy recommendations', () => {
    const recs: Recommendation[] = [
      { action: 'sync', reason: 'Stable', confidence: 0.95, priority: 'low' },
    ];
    const result = controlCycle(recs);
    expect(result.shouldRepeat).toBe(false);
    expect(result.shouldEscalate).toBe(false);
    expect(result.nextAction).toBe('sync');
  });
});
