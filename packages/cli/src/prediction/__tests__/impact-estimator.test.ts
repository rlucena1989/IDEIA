import { describe, it, expect } from '@jest/globals';
import { estimateImpact } from '../impact-estimator';

describe('impact-estimator', () => {
  it('estimateImpact should be defined', () => {
    expect(estimateImpact).toBeDefined();
  });

  it('should return low severity for low score', () => {
    const impact = estimateImpact('cache', 'availability', 2);
    expect(impact.severity).toBe('low');
    expect(impact.target).toBe('cache');
    expect(impact.impactArea).toBe('availability');
  });

  it('should return critical severity for high score', () => {
    const impact = estimateImpact('db', 'consistency', 9);
    expect(impact.severity).toBe('critical');
  });

  it('should include reasoning', () => {
    const impact = estimateImpact('api', 'performance', 5);
    expect(impact.reasoning).toContain('performance');
    expect(impact.reasoning).toContain('5');
  });
});
