import { describe, it, expect } from '@jest/globals';
import { buildStateDelta } from '../delta-engine';

describe('delta-engine', () => {
  it('buildStateDelta should be defined', () => {
    expect(buildStateDelta).toBeDefined();
  });

  it('should detect added fields', () => {
    const from = { version: '1.0.0' };
    const to = { version: '1.1.0', blocks: ['governance'] };
    const delta = buildStateDelta(from, to);
    expect(delta.summary.added).toBe(1);
    expect(delta.changes.some(c => c.kind === 'added' && c.path === 'blocks')).toBe(true);
  });

  it('should detect removed fields', () => {
    const from = { version: '1.0.0', oldField: 'value' };
    const to = { version: '1.1.0' };
    const delta = buildStateDelta(from, to);
    expect(delta.summary.removed).toBe(1);
  });

  it('should detect changed fields', () => {
    const from = { version: '1.0.0', score: 80 };
    const to = { version: '1.1.0', score: 95 };
    const delta = buildStateDelta(from, to);
    expect(delta.summary.changed).toBeGreaterThanOrEqual(1);
  });

  it('should detect unchanged fields', () => {
    const from = { version: '1.0.0', name: 'test' };
    const to = { version: '1.0.0', name: 'test' };
    const delta = buildStateDelta(from, to);
    expect(delta.summary.unchanged).toBeGreaterThan(0);
  });

  it('should track versions', () => {
    const from = { version: '1.0.0' };
    const to = { version: '1.1.0' };
    const delta = buildStateDelta(from, to);
    expect(delta.fromVersion).toBe('1.0.0');
    expect(delta.toVersion).toBe('1.1.0');
  });
});
