import { describe, it, expect } from '@jest/globals';
import { runSimulation } from '../simulation-engine';
import { buildScenario } from '../scenario-builder';

describe('simulation-engine', () => {
  it('runSimulation should be defined', () => {
    expect(runSimulation).toBeDefined();
  });

  it('should return medium risk for simple scenarios', () => {
    const s = buildScenario('s1', 'Simple', '', {}, [], 'OK');
    const result = runSimulation(s);
    expect(result.riskLevel).toBe('medium');
    expect(result.ok).toBe(true);
  });

  it('should return high risk for 4+ constraints', () => {
    const s = buildScenario('s2', 'Complex', '', {}, ['a', 'b', 'c', 'd'], 'OK');
    const result = runSimulation(s);
    expect(result.riskLevel).toBe('high');
    expect(result.ok).toBe(true);
  });

  it('should return critical risk with critical constraint', () => {
    const s = buildScenario('s3', 'Risky', '', {}, ['no-go'], 'Risco');
    const result = runSimulation(s);
    expect(result.riskLevel).toBe('critical');
    expect(result.ok).toBe(false);
  });
});
