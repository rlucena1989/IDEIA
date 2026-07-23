import { describe, it, expect } from '@jest/globals';
import { buildScenario } from '../scenario-builder';

describe('scenario-builder', () => {
  it('buildScenario should be defined', () => {
    expect(buildScenario).toBeDefined();
  });

  it('should build a valid scenario', () => {
    const s = buildScenario('s1', 'Test', 'A test', { key: 'value' }, ['c1'], 'OK');
    expect(s.scenarioId).toBe('s1');
    expect(s.name).toBe('Test');
    expect(s.inputs.key).toBe('value');
    expect(s.constraints).toContain('c1');
  });
});
