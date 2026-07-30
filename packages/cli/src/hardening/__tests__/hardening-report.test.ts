import { buildHardeningReport, HardeningReport } from '../hardening-report';
import { DevkitState } from '../../state/state-types';
import { ConsistencyCheckResult } from '../consistency-checker';

function makeState(overrides: Partial<DevkitState> = {}): DevkitState {
  return {
    version: '1.0.0',
    lastUpdated: '2026-07-27',
    summary: 'State is healthy',
    blocks: [],
    metrics: [],
    artifacts: [],
    commands: [],
    blockers: [],
    nextSteps: [],
    ...overrides,
  };
}

function makeConsistencyResult(overrides: Partial<ConsistencyCheckResult> = {}): ConsistencyCheckResult {
  return {
    ok: true,
    attentionCount: 0,
    blockedCount: 0,
    summary: ['All good'],
    ...overrides,
  };
}

describe('hardening-report', () => {
  test('buildHardeningReport returns report with state summary', () => {
    const state = makeState();
    const consistency = makeConsistencyResult();
    const report = buildHardeningReport(state, consistency);
    expect(report.stateSummary).toBe('State is healthy');
  });

  test('buildHardeningReport includes consistency status', () => {
    const state = makeState();
    const consistency = makeConsistencyResult();
    const report = buildHardeningReport(state, consistency);
    expect(report.consistencyStatus.ok).toBe(true);
  });

  test('generatedAt is ISO string', () => {
    const state = makeState();
    const consistency = makeConsistencyResult();
    const report = buildHardeningReport(state, consistency);
    expect(() => new Date(report.generatedAt)).not.toThrow();
  });

  test('includes recommendation when consistency not ok', () => {
    const state = makeState();
    const consistency = makeConsistencyResult({ ok: false });
    const report = buildHardeningReport(state, consistency);
    expect(report.recommendations).toContain('Resolver bloqueadores de consistência antes de avançar');
  });

  test('includes recommendation when attentionCount > 0', () => {
    const state = makeState();
    const consistency = makeConsistencyResult({ ok: true, attentionCount: 2 });
    const report = buildHardeningReport(state, consistency);
    expect(report.recommendations.some(r => r.includes('2'))).toBe(true);
  });

  test('includes recommendation when blockers exist', () => {
    const state = makeState({ blockers: ['Blocker 1', 'Blocker 2'] });
    const consistency = makeConsistencyResult();
    const report = buildHardeningReport(state, consistency);
    expect(report.recommendations.some(r => r.includes('2'))).toBe(true);
  });

  test('returns empty recommendations when healthy', () => {
    const state = makeState();
    const consistency = makeConsistencyResult({ ok: true, attentionCount: 0 });
    const report = buildHardeningReport(state, consistency);
    expect(report.recommendations).toHaveLength(0);
  });

  test('includes metrics snapshot from state', () => {
    const state = makeState({ metrics: [{ name: 'coverage', value: 85, unit: '%' }] });
    const consistency = makeConsistencyResult();
    const report = buildHardeningReport(state, consistency);
    expect(report.metricsSnapshot).toHaveLength(1);
    expect(report.metricsSnapshot[0].name).toBe('coverage');
  });
});
