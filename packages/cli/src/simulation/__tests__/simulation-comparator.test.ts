import { describe, it, expect } from '@jest/globals';
import { compareSimulations } from '../simulation-comparator';
import { SimulationResult } from '../simulation-types';

describe('simulation-comparator', () => {
  it('compareSimulations should be defined', () => {
    expect(compareSimulations).toBeDefined();
  });

  it('should select winners by lowest risk', () => {
    const results: SimulationResult[] = [
      { scenarioId: 'risky', simulatedAt: '', ok: true, riskLevel: 'high', notes: [], projection: {} },
      { scenarioId: 'safe', simulatedAt: '', ok: true, riskLevel: 'low', notes: [], projection: {} },
    ];
    const comp = compareSimulations(results);
    expect(comp.winners[0]).toBe('safe');
  });

  it('should exclude failed simulations from winners', () => {
    const results: SimulationResult[] = [
      { scenarioId: 'failed', simulatedAt: '', ok: false, riskLevel: 'critical', notes: [], projection: {} },
      { scenarioId: 'passed', simulatedAt: '', ok: true, riskLevel: 'medium', notes: [], projection: {} },
    ];
    const comp = compareSimulations(results);
    expect(comp.winners).not.toContain('failed');
  });
});
