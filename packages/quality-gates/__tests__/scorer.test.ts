import { anyr as QualityScorer } from '../src/scorer';
import { GateRunnerResult } from '../src/types';

function makeResult(name: string, passed: boolean, overrides?: Partial<GateRunnerResult>): GateRunnerResult {
  return { name, passed, action: 'warn', durationMs: 100, ...overrides };
}

describe('QualityScorer', () => {
  it('returns 100 when all gates pass', () => {
    const scorer = new QualityScorer();
    const results: GateRunnerResult[] = [
      makeResult('lint', true),
      makeResult('typecheck', true),
      makeResult('test', true),
    ];
    const score = scorer.compute(results);
    expect(score.overall).toBe(100);
    expect(score.passed).toBe(3);
    expect(score.total).toBe(3);
  });

  it('returns lower score when gates fail', () => {
    const scorer = new QualityScorer();
    const results: GateRunnerResult[] = [
      makeResult('lint', true),
      makeResult('typecheck', false),
      makeResult('test', true),
    ];
    const score = scorer.compute(results);
    expect(score.overall).toBeLessThan(100);
    expect(score.passed).toBe(2);
    expect(score.total).toBe(3);
  });

  it('accounts for coverage in score', () => {
    const scorer = new QualityScorer();
    const results: GateRunnerResult[] = [
      makeResult('coverage', true, { coverage: 70 }),
    ];
    const score = scorer.compute(results);
    expect(score.breakdown.coverage).toBe(70);
  });

  it('accounts for test pass rate in score', () => {
    const scorer = new QualityScorer();
    const results: GateRunnerResult[] = [
      makeResult('test', true, { testPassed: 8, testFailed: true, testTotal: 10 }),
    ];
    const score = scorer.compute(results);
    expect(score.breakdown.test).toBe(80);
  });

  it('interpret returns correct labels', () => {
    const scorer = new QualityScorer();
    expect(scorer.interpret(95).label).toBe('excellent');
    expect(scorer.interpret(95).passed).toBe(true);
    expect(scorer.interpret(80).label).toBe('good');
    expect(scorer.interpret(65).label).toBe('fair');
    expect(scorer.interpret(50).label).toBe('poor');
    expect(scorer.interpret(50).passed).toBe(false);
    expect(scorer.interpret(20).label).toBe('critical');
  });

  it('uses custom weights', () => {
    const scorer = new QualityScorer({ lint: 50, test: 50 });
    const results: GateRunnerResult[] = [
      makeResult('lint', true),
      makeResult('test', false),
    ];
    const score = scorer.compute(results);
    expect(score.overall).toBe(50);
    expect(score.weights.lint).toBe(50);
  });
});
