import type { StateChange, StateDelta } from '../delta-types';

describe('StateChange type', () => {
  it('constructs a valid change', () => {
    const change: StateChange = {
      path: 'src/main.ts',
      kind: 'added',
      after: 'new code',
      impact: 'medium',
      reason: 'Feature implementation',
    };
    expect(change.path).toBe('src/main.ts');
    expect(change.kind).toBe('added');
  });

  it('accepts all kind variants', () => {
    const kinds: StateChange['kind'][] = ['added', 'removed', 'changed', 'unchanged'];
    for (const kind of kinds) {
      const c: StateChange = { path: 'f.ts', kind, impact: 'low', reason: 'test' };
      expect(c.kind).toBe(kind);
    }
  });

  it('accepts all impact levels', () => {
    const impacts: StateChange['impact'][] = ['low', 'medium', 'high', 'critical'];
    for (const impact of impacts) {
      const c: StateChange = { path: 'f.ts', kind: 'changed', impact, reason: 'test' };
      expect(c.impact).toBe(impact);
    }
  });

  it('before can be undefined', () => {
    const change: StateChange = { path: 'f.ts', kind: 'added', after: 'new', impact: 'low', reason: 'add' };
    expect(change.before).toBeUndefined();
  });

  it('after can be undefined for removals', () => {
    const change: StateChange = { path: 'f.ts', kind: 'removed', before: 'old', impact: 'high', reason: 'remove' };
    expect(change.after).toBeUndefined();
  });
});

describe('StateDelta type', () => {
  it('constructs a valid delta', () => {
    const delta: StateDelta = {
      generatedAt: new Date().toISOString(),
      fromVersion: 'v1.0',
      toVersion: 'v1.1',
      changes: [],
      summary: { added: 0, removed: 0, changed: 0, unchanged: 0, critical: 0 },
    };
    expect(delta.fromVersion).toBe('v1.0');
    expect(delta.toVersion).toBe('v1.1');
  });

  it('tracks changes summary correctly', () => {
    const changes: StateChange[] = [
      { path: 'a.ts', kind: 'added', after: 'x', impact: 'low', reason: 'new' },
      { path: 'b.ts', kind: 'changed', before: 'y', after: 'z', impact: 'critical', reason: 'fix' },
    ];
    const delta: StateDelta = {
      generatedAt: new Date().toISOString(),
      fromVersion: 'v1',
      toVersion: 'v2',
      changes,
      summary: { added: 1, removed: 0, changed: 1, unchanged: 0, critical: 1 },
    };
    expect(delta.summary.added).toBe(1);
    expect(delta.summary.critical).toBe(1);
  });
});
