import { describe, it, expect } from '@jest/globals';
import type {
  DevkitState, DevkitStateBlock, DevkitStateMetric,
  DevkitStateArtifact, DevkitStateCommand,
} from '../state-types';

describe('state-types', () => {
  it('DevkitStateMetric should support number value', () => {
    const m: DevkitStateMetric = { name: 'tests', value: 100, unit: 'passing' };
    expect(m.value).toBe(100);
  });

  it('DevkitStateMetric should support string value', () => {
    const m: DevkitStateMetric = { name: 'status', value: 'active' };
    expect(typeof m.value).toBe('string');
  });

  it('DevkitStateMetric should support boolean value', () => {
    const m: DevkitStateMetric = { name: 'ready', value: true };
    expect(m.value).toBe(true);
  });

  it('DevkitStateMetric should have optional description', () => {
    const m: DevkitStateMetric = { name: 'test', value: 1, description: 'Metric description' };
    const m2: DevkitStateMetric = { name: 'test2', value: 2 };
    expect(m.description).toBe('Metric description');
    expect(m2.description).toBeUndefined();
  });

  it('DevkitStateBlock should support all status values', () => {
    const statuses: DevkitStateBlock['status'][] = ['done', 'partial', 'blocked', 'experimental'];
    for (const status of statuses) {
      const b: DevkitStateBlock = { id: 'b1', title: 'Block', status, summary: '', evidence: [] };
      expect(b.status).toBe(status);
    }
  });

  it('DevkitStateBlock should have optional risks', () => {
    const withRisks: DevkitStateBlock = { id: 'b1', title: 'B', status: 'done', summary: '', evidence: [], risks: ['risk1'] };
    const withoutRisks: DevkitStateBlock = { id: 'b2', title: 'B2', status: 'done', summary: '', evidence: [] };
    expect(withRisks.risks).toHaveLength(1);
    expect(withoutRisks.risks).toBeUndefined();
  });

  it('DevkitStateArtifact should support all status values', () => {
    const statuses: DevkitStateArtifact['status'][] = ['present', 'missing', 'stale', 'partial'];
    for (const status of statuses) {
      const a: DevkitStateArtifact = { path: 'docs/', purpose: 'Docs', status };
      expect(a.status).toBe(status);
    }
  });

  it('DevkitStateCommand should support all status values', () => {
    const statuses: DevkitStateCommand['status'][] = ['active', 'deprecated', 'planned'];
    for (const status of statuses) {
      const c: DevkitStateCommand = { command: 'test', purpose: 'Test', status };
      expect(c.status).toBe(status);
    }
  });

  it('DevkitState should be fully constructible', () => {
    const state: DevkitState = {
      version: '2.0.0',
      lastUpdated: '2026-07-26T00:00:00Z',
      summary: 'Full state',
      blocks: [],
      metrics: [],
      artifacts: [],
      commands: [],
      blockers: [],
      nextSteps: [],
    };
    expect(state.version).toBe('2.0.0');
  });

  it('DevkitState should support empty arrays', () => {
    const state: DevkitState = {
      version: '1.0.0', lastUpdated: '', summary: '',
      blocks: [], metrics: [], artifacts: [], commands: [],
      blockers: [], nextSteps: [],
    };
    expect(state.blocks).toEqual([]);
    expect(state.blockers).toEqual([]);
  });
});
