import { describe, it, expect } from '@jest/globals';
import { validatePrediction } from '../simulation-validator';
import { SimulationResult } from '../simulation-types';

describe('simulation-validator', () => {
  it('validatePrediction should be defined', () => {
    expect(validatePrediction).toBeDefined();
  });

  it('should pass for ok result with low risk', () => {
    const result: SimulationResult = {
      scenarioId: 's1', simulatedAt: '', ok: true, riskLevel: 'low',
      notes: [], projection: {},
    };
    const v = validatePrediction(result);
    expect(v.valid).toBe(true);
  });

  it('should fail for critical risk', () => {
    const result: SimulationResult = {
      scenarioId: 's2', simulatedAt: '', ok: false, riskLevel: 'critical',
      notes: [], projection: {},
    };
    const v = validatePrediction(result);
    expect(v.valid).toBe(false);
    expect(v.reasons.some(r => r.includes('Critical'))).toBe(true);
  });

  it('should warn for high risk', () => {
    const result: SimulationResult = {
      scenarioId: 's3', simulatedAt: '', ok: true, riskLevel: 'high',
      notes: [], projection: {},
    };
    const v = validatePrediction(result);
    expect(v.valid).toBe(false);
    expect(v.reasons.some(r => r.includes('review'))).toBe(true);
  });
});
