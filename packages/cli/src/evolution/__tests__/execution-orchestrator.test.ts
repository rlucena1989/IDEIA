import { describe, it, expect } from '@jest/globals';
import { orchestrateEvolution } from '../execution-orchestrator';
import type { DevkitState } from '../../state/state-types';

describe('execution-orchestrator', () => {
  it('orchestrateEvolution should be defined', () => {
    expect(orchestrateEvolution).toBeDefined();
  });

  it('should return a valid EvolutionRunResult', () => {
    const fromState: DevkitState = { version: '1.0.0', lastUpdated: '', summary: '', blocks: [], metrics: [], artifacts: [], commands: [], blockers: [], nextSteps: [] };
    const toState: DevkitState = { version: '1.1.0', lastUpdated: '', summary: '', blocks: [], metrics: [], artifacts: [], commands: [], blockers: [], nextSteps: [] };
    const result = orchestrateEvolution(fromState, toState);
    expect(result.ok).toBeDefined();
    expect(result.action).toBeDefined();
    expect(result.rationale).toBeDefined();
    expect(result.auditId).toBeDefined();
    expect(result.validation).toBeDefined();
  });
});
