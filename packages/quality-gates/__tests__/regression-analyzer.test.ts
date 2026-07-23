import { RegressionAnalyzer } from '../src/regression-analyzer';
import { GateResult } from '../src/types';

const passed = (name: string): GateResult => ({
  gate: name, status: 'passed' as const, severity: 'error' as const, layer: 'syntax' as const, durationMs: 10, blocking: true,
});

const failed = (name: string): GateResult => ({
  gate: name, status: 'failed' as const, severity: 'error' as const, layer: 'functional' as const, durationMs: 10, error: 'fail', blocking: true,
});

describe('RegressionAnalyzer', () => {
  const analyzer = new RegressionAnalyzer();

  it('detects new failures', () => {
    const result = analyzer.analyze(
      [passed('lint'), passed('tests')],
      [passed('lint'), failed('tests')],
    );
    expect(result.hasRegression).toBe(true);
    expect(result.newFailures).toContain('tests');
  });

  it('detects fixed issues', () => {
    const result = analyzer.analyze(
      [failed('tests')],
      [passed('tests')],
    );
    expect(result.fixedIssues).toContain('tests');
  });

  it('reports no regression when nothing changes', () => {
    const before = [passed('g1')];
    const result = analyzer.analyze(before, before);
    expect(result.hasRegression).toBe(false);
  });
});
