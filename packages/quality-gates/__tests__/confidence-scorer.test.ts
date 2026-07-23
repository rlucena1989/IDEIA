import { ConfidenceScorer } from '../src/confidence-scorer';

describe('ConfidenceScorer', () => {
  const scorer = new ConfidenceScorer();

  it('scores 100 when all pass', () => {
    const score = scorer.calculate([
      { gate: 'lint', status: 'passed', severity: 'error', layer: 'syntax', durationMs: 100, blocking: true },
      { gate: 'tests', status: 'passed', severity: 'error', layer: 'functional', durationMs: 100, blocking: true },
    ]);
    expect(score.overall).toBeGreaterThanOrEqual(70);
    expect(score.gatesPassed).toBe(2);
  });

  it('penalizes critical failures heavily', () => {
    const score = scorer.calculate([
      { gate: 'lint', status: 'passed', severity: 'error', layer: 'syntax', durationMs: 100, blocking: true },
      { gate: 'security', status: 'failed', severity: 'critical', layer: 'systemic', durationMs: 100, error: 'fail', blocking: true },
    ]);
    expect(score.criticalFailures).toBe(1);
    expect(score.overall).toBeLessThan(70);
  });

  it('interprets scores correctly', () => {
    expect(scorer.interpret(95).label).toBe('excelente');
    expect(scorer.interpret(85).label).toBe('bom');
    expect(scorer.interpret(60).label).toBe('regular');
    expect(scorer.interpret(20).label).toBe('critico');
  });
});
