import {
  QualityGateSystem,
  createQualityGateSystem,
  ConfidenceScorer,
  GateBarrier,
  RegressionAnalyzer,
} from '../src/index';
import type { GateResult } from '../src/types';

function makeGateResult(overrides: Partial<GateResult> = {}): GateResult {
  return {
    gate: 'test-gate',
    status: 'passed',
    severity: 'warning',
    layer: 'syntax',
    durationMs: 10,
    blocking: true,
    ...overrides,
  };
}

describe('QualityGateSystem', () => {
  it('creates with default gates via factory', () => {
    const system = createQualityGateSystem();
    expect(system).toBeInstanceOf(QualityGateSystem);
  });

  it('supports custom gate registration via addGate', () => {
    const system = createQualityGateSystem();
    system.addGate('custom-gate', 'A custom test gate', 'error', 'functional', true);
    const gates = system.barrier.getRegisteredGates();
    expect(gates.some(g => g.name === 'custom-gate')).toBe(true);
  });
});

describe('ConfidenceScorer', () => {
  it('calculates score from gate results', () => {
    const scorer = new ConfidenceScorer();
    const results: GateResult[] = [
      makeGateResult({ gate: 'lint', status: 'passed', layer: 'syntax', severity: 'warning' }),
      makeGateResult({ gate: 'test', status: 'passed', layer: 'functional', severity: 'error' }),
    ];
    const score = scorer.calculate(results);
    expect(score.overall).toBeGreaterThan(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(score.gatesPassed).toBe(2);
    expect(score.gatesTotal).toBe(2);
  });

  it('handles empty results', () => {
    const scorer = new ConfidenceScorer();
    const score = scorer.calculate([]);
    expect(score.overall).toBe(0);
  });

  it('penalises critical failures', () => {
    const scorer = new ConfidenceScorer();
    const results: GateResult[] = [
      makeGateResult({ gate: 'critical-test', status: 'failed', severity: 'critical', layer: 'systemic' }),
    ];
    const score = scorer.calculate(results);
    expect(score.overall).toBeLessThan(70);
    expect(score.criticalFailures).toBe(1);
  });
});

describe('GateBarrier', () => {
  it('allows passage when all gates pass', async () => {
    const barrier = new GateBarrier();
    const results: GateResult[] = [makeGateResult({ status: 'passed' })];
    const decision = await barrier.evaluate(results);
    expect(decision.canProceed).toBe(true);
    expect(decision.blockedBy).toHaveLength(0);
  });

  it('blocks when a blocking gate fails', async () => {
    const barrier = new GateBarrier();
    const results: GateResult[] = [makeGateResult({ gate: 'critical', status: 'failed', blocking: true })];
    const decision = await barrier.evaluate(results);
    expect(decision.canProceed).toBe(false);
    expect(decision.blockedBy.length).toBeGreaterThan(0);
  });

  it('warns but does not block for non-blocking failures', async () => {
    const barrier = new GateBarrier();
    const results: GateResult[] = [makeGateResult({ gate: 'warn-gate', status: 'failed', blocking: false })];
    const decision = await barrier.evaluate(results);
    expect(decision.canProceed).toBe(true);
    expect(decision.warnings.length).toBeGreaterThan(0);
  });
});

describe('RegressionAnalyzer', () => {
  it('detects new failures', () => {
    const analyzer = new RegressionAnalyzer();
    const before: GateResult[] = [makeGateResult({ gate: 'test', status: 'passed' })];
    const after: GateResult[] = [makeGateResult({ gate: 'test', status: 'failed' })];
    const result = analyzer.analyze(before, after);
    expect(result.hasRegression).toBe(true);
    expect(result.newFailures).toContain('test');
  });

  it('reports fixed issues', () => {
    const analyzer = new RegressionAnalyzer();
    const before: GateResult[] = [makeGateResult({ gate: 'test', status: 'failed' })];
    const after: GateResult[] = [makeGateResult({ gate: 'test', status: 'passed' })];
    const result = analyzer.analyze(before, after);
    expect(result.fixedIssues).toContain('test');
    expect(result.hasRegression).toBe(false);
  });

  it('reports no regression when both pass', () => {
    const analyzer = new RegressionAnalyzer();
    const before: GateResult[] = [makeGateResult({ gate: 'test', status: 'passed' })];
    const after: GateResult[] = [makeGateResult({ gate: 'test', status: 'passed' })];
    const result = analyzer.analyze(before, after);
    expect(result.hasRegression).toBe(false);
    expect(result.newFailures).toHaveLength(0);
  });
});
