import { runHardeningCheck } from '../hardening-checker';
import { DevkitState } from '../../state/state-types';
import { ConsistencyReport } from '../../state/consistency-types';

function makeState(overrides: Partial<DevkitState> = {}): DevkitState {
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    summary: 'State summary',
    blocks: [],
    metrics: [],
    artifacts: [],
    commands: [],
    blockers: [],
    nextSteps: [],
    ...overrides,
  };
}

function makeConsistency(
  items: { area: string; status: 'ok' | 'attention' | 'blocked'; notes?: string[] }[] = []
): ConsistencyReport {
  return {
    generatedAt: new Date().toISOString(),
    items: items.map(i => ({
      area: i.area,
      docs: 'ok' as const,
      code: 'ok' as const,
      tests: 'ok' as const,
      cli: 'ok' as const,
      extension: 'ok' as const,
      status: i.status,
      notes: i.notes ?? [],
    })),
    summary: ['Consistency summary'],
  };
}

describe('hardening-checker', () => {
  test('returns ok with score 100 for perfect state', () => {
    const state = makeState();
    const consistency = makeConsistency();
    const result = runHardeningCheck(state, consistency);
    expect(result.ok).toBe(true);
    expect(result.score).toBe(100);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  test('errors on missing version', () => {
    const state = makeState({ version: '' });
    const consistency = makeConsistency();
    const result = runHardeningCheck(state, consistency);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.code === 'STATE_NO_VERSION')).toBe(true);
    expect(result.score).toBe(90);
  });

  test('warns on blockers', () => {
    const state = makeState({ blockers: ['Blocker 1', 'Blocker 2'] });
    const consistency = makeConsistency();
    const result = runHardeningCheck(state, consistency);
    expect(result.warnings.some(w => w.code === 'STATE_BLOCKERS')).toBe(true);
  });

  test('critical error on blocked consistency items', () => {
    const state = makeState();
    const consistency = makeConsistency([
      { area: 'security', status: 'blocked', notes: ['Vulnerability found'] },
    ]);
    const result = runHardeningCheck(state, consistency);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.code === 'CONSISTENCY_BLOCKED_SECURITY')).toBe(true);
    expect(result.errors[0].severity).toBe('critical');
  });

  test('warning on attention consistency items', () => {
    const state = makeState();
    const consistency = makeConsistency([
      { area: 'docs', status: 'attention' },
    ]);
    const result = runHardeningCheck(state, consistency);
    expect(result.warnings.some(w => w.code === 'CONSISTENCY_ATTENTION_DOCS')).toBe(true);
  });

  test('multiple blocked areas create multiple errors', () => {
    const state = makeState();
    const consistency = makeConsistency([
      { area: 'security', status: 'blocked' },
      { area: 'performance', status: 'blocked' },
    ]);
    const result = runHardeningCheck(state, consistency);
    const blockedErrors = result.errors.filter(e => e.code.startsWith('CONSISTENCY_BLOCKED'));
    expect(blockedErrors).toHaveLength(2);
  });

  test('summary reflects ok status', () => {
    const state = makeState();
    const consistency = makeConsistency();
    const result = runHardeningCheck(state, consistency);
    expect(result.summary).toContain('Hardening OK');
  });

  test('summary reflects error status', () => {
    const state = makeState({ version: '' });
    const consistency = makeConsistency();
    const result = runHardeningCheck(state, consistency);
    expect(result.summary).toContain('Hardening com problemas');
  });
});
