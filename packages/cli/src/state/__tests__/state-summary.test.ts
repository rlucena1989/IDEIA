import { describe, it, expect } from '@jest/globals';
import { summarizeState } from '../state-summary';
import type { DevkitState } from '../state-types';

function makeState(overrides: Partial<DevkitState> = {}): DevkitState {
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    summary: 'Test',
    blocks: [],
    metrics: [],
    artifacts: [],
    commands: [],
    blockers: [],
    nextSteps: [],
    ...overrides,
  };
}

describe('summarizeState', () => {
  it('should return StateSummary with expected shape', () => {
    const state = makeState();
    const summary = summarizeState(state);
    expect(summary).toHaveProperty('totalBlocks');
    expect(summary).toHaveProperty('doneBlocks');
    expect(summary).toHaveProperty('partialBlocks');
    expect(summary).toHaveProperty('blockedBlocks');
    expect(summary).toHaveProperty('experimentalBlocks');
    expect(summary).toHaveProperty('activeCommands');
    expect(summary).toHaveProperty('totalMetrics');
    expect(summary).toHaveProperty('blockerCount');
    expect(summary).toHaveProperty('overallStatus');
    expect(summary).toHaveProperty('completionPct');
  });

  it('should count done blocks', () => {
    const state = makeState({
      blocks: [
        { id: 'b1', title: 'B1', status: 'done', summary: '', evidence: [] },
        { id: 'b2', title: 'B2', status: 'done', summary: '', evidence: [] },
        { id: 'b3', title: 'B3', status: 'partial', summary: '', evidence: [] },
      ],
    });
    expect(summarizeState(state).doneBlocks).toBe(2);
  });

  it('should count partial blocks', () => {
    const state = makeState({
      blocks: [
        { id: 'b1', title: 'B1', status: 'partial', summary: '', evidence: [] },
        { id: 'b2', title: 'B2', status: 'partial', summary: '', evidence: [] },
      ],
    });
    expect(summarizeState(state).partialBlocks).toBe(2);
  });

  it('should count blocked blocks', () => {
    const state = makeState({
      blocks: [
        { id: 'b1', title: 'B1', status: 'blocked', summary: '', evidence: [] },
      ],
    });
    expect(summarizeState(state).blockedBlocks).toBe(1);
  });

  it('should count experimental blocks', () => {
    const state = makeState({
      blocks: [
        { id: 'b1', title: 'B1', status: 'experimental', summary: '', evidence: [] },
      ],
    });
    expect(summarizeState(state).experimentalBlocks).toBe(1);
  });

  it('should report good status when no issues', () => {
    const state = makeState({
      blocks: [
        { id: 'b1', title: 'B1', status: 'done', summary: '', evidence: [] },
      ],
      blockers: [],
    });
    expect(summarizeState(state).overallStatus).toBe('good');
  });

  it('should report attention when partial blocks exist', () => {
    const state = makeState({
      blocks: [
        { id: 'b1', title: 'B1', status: 'partial', summary: '', evidence: [] },
      ],
      blockers: [],
    });
    expect(summarizeState(state).overallStatus).toBe('attention');
  });

  it('should report critical when blocked blocks exist', () => {
    const state = makeState({
      blocks: [
        { id: 'b1', title: 'B1', status: 'blocked', summary: '', evidence: [] },
      ],
    });
    expect(summarizeState(state).overallStatus).toBe('critical');
  });

  it('should count active commands', () => {
    const state = makeState({
      commands: [
        { command: 'cmd1', purpose: 'test', status: 'active' },
        { command: 'cmd2', purpose: 'test', status: 'deprecated' },
        { command: 'cmd3', purpose: 'test', status: 'planned' },
      ],
    });
    expect(summarizeState(state).activeCommands).toBe(1);
  });

  it('should calculate completion percentage', () => {
    const state = makeState({
      blocks: [
        { id: 'b1', title: 'B1', status: 'done', summary: '', evidence: [] },
        { id: 'b2', title: 'B2', status: 'partial', summary: '', evidence: [] },
        { id: 'b3', title: 'B3', status: 'done', summary: '', evidence: [] },
      ],
    });
    const summary = summarizeState(state);
    expect(summary.completionPct).toBeGreaterThan(0);
    expect(summary.completionPct).toBeLessThanOrEqual(100);
  });

  it('should return 0 completion when no blocks', () => {
    expect(summarizeState(makeState()).completionPct).toBe(0);
  });

  it('should count metrics', () => {
    const state = makeState({
      metrics: [
        { name: 'm1', value: 1 },
        { name: 'm2', value: 2 },
      ],
    });
    expect(summarizeState(state).totalMetrics).toBe(2);
  });

  it('should count blockers', () => {
    const state = makeState({
      blockers: ['b1', 'b2', 'b3'],
    });
    expect(summarizeState(state).blockerCount).toBe(3);
  });

  it('should calculate 100% when all done', () => {
    const state = makeState({
      blocks: [
        { id: 'b1', title: 'B1', status: 'done', summary: '', evidence: [] },
        { id: 'b2', title: 'B2', status: 'done', summary: '', evidence: [] },
      ],
    });
    expect(summarizeState(state).completionPct).toBe(100);
  });
});
