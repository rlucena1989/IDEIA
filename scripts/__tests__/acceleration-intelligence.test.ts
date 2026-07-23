import { analyzeScorecard } from '../acceleration/scorecard-analyzer';
import { analyzeCoverage } from '../acceleration/coverage-analyzer';
import { detectGaps } from '../acceleration/gap-detector';
import { scoreMaturity } from '../acceleration/maturity-scorer';
import { adaptSchedule } from '../acceleration/adaptive-scheduler';
import { decideExecution } from '../acceleration/ai-decision-controller';
import { ScorecardAnalysis, CoverageAnalysis, Gap, HistorySummary, HealthCheckResult, Forecast, PrecisionReport } from '../acceleration/types';

describe('acceleration - scorecard-analyzer', () => {
  it('deve retornar ScorecardAnalysis com score, trend, status', () => {
    const result = analyzeScorecard();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(['up', 'down', 'flat']).toContain(result.trend);
    expect(['good', 'warning', 'critical']).toContain(result.status);
  });
});

describe('acceleration - coverage-analyzer', () => {
  it('deve retornar CoverageAnalysis com total, lines, branches, functions, status', () => {
    const result = analyzeCoverage();
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.lines).toBeGreaterThanOrEqual(0);
    expect(result.branches).toBeGreaterThanOrEqual(0);
    expect(result.functions).toBeGreaterThanOrEqual(0);
    expect(['good', 'warning', 'critical']).toContain(result.status);
  });
});

describe('acceleration - gap-detector', () => {
  it('deve retornar array de gaps', () => {
    const gaps = detectGaps();
    expect(Array.isArray(gaps)).toBe(true);
    for (const g of gaps) {
      expect(g.id).toBeTruthy();
      expect(['low', 'medium', 'high']).toContain(g.severity);
      expect(g.description).toBeTruthy();
    }
  });
});

describe('acceleration - maturity-scorer', () => {
  it('deve calcular score entre 0 e 100', () => {
    const scorecard: ScorecardAnalysis = { score: 85, trend: 'flat', status: 'good' };
    const coverage: CoverageAnalysis = { total: 82, lines: 85, branches: 78, functions: 80, status: 'good' };
    const gaps: Gap[] = [];
    const result = scoreMaturity(scorecard, coverage, gaps);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(['low', 'medium', 'high']).toContain(result.level);
  });

  it('deve reduzir score com gaps', () => {
    const scorecard: ScorecardAnalysis = { score: 85, trend: 'flat', status: 'good' };
    const coverage: CoverageAnalysis = { total: 82, lines: 85, branches: 78, functions: 80, status: 'good' };
    const gaps: Gap[] = [
      { id: 'g1', severity: 'high', description: 'critical gap' },
      { id: 'g2', severity: 'medium', description: 'medium gap' },
    ];
    const withGaps = scoreMaturity(scorecard, coverage, gaps);
    const withoutGaps = scoreMaturity(scorecard, coverage, []);
    expect(withGaps.score).toBeLessThan(withoutGaps.score);
  });
});

describe('acceleration - adaptive-scheduler', () => {
  const healthGood: HealthCheckResult = { healthy: true, reasons: [] };
  const healthBad: HealthCheckResult = { healthy: false, reasons: ['no package.json'] };

  it('deve sugerir deep se saude comprometida', () => {
    const result = adaptSchedule('balanced', { successRate: 1, averageQualityScore: 90, averageDurationMs: 1000, runs: 10 }, healthBad);
    expect(result.suggestedMode).toBe('deep');
    expect(result.reason).toContain('saude');
  });

  it('deve sugerir deep se successRate baixo', () => {
    const history: HistorySummary = { successRate: 0.5, averageQualityScore: 60, averageDurationMs: 5000, runs: 10 };
    const result = adaptSchedule('balanced', history, healthGood);
    expect(result.suggestedMode).toBe('deep');
  });

  it('deve sugerir fast se historico excelente', () => {
    const history: HistorySummary = { successRate: 0.98, averageQualityScore: 90, averageDurationMs: 1000, runs: 10 };
    const result = adaptSchedule('balanced', history, healthGood);
    expect(result.suggestedMode).toBe('fast');
  });

  it('deve manter modo atual se condicoes normais', () => {
    const history: HistorySummary = { successRate: 0.85, averageQualityScore: 80, averageDurationMs: 3000, runs: 3 };
    const result = adaptSchedule('balanced', history, healthGood);
    expect(result.suggestedMode).toBe('balanced');
  });
});

describe('acceleration - ai-decision-controller', () => {
  const forecast: Forecast = { estimatedJobs: 5, estimatedDurationMs: 3500, risk: 'low' };
  const precision: PrecisionReport = { confidence: 0.9, variance: 0.1, stable: true };
  const scorecardGood: ScorecardAnalysis = { score: 90, trend: 'up', status: 'good' };
  const scorecardCritical: ScorecardAnalysis = { score: 40, trend: 'down', status: 'critical' };
  const coverageGood: CoverageAnalysis = { total: 85, lines: 85, branches: 80, functions: 80, status: 'good' };
  const historyGood: HistorySummary = { successRate: 0.95, averageQualityScore: 90, averageDurationMs: 2000, runs: 10 };

  it('deve decidir modo fast em condicoes ideais', () => {
    const result = decideExecution('balanced', forecast, precision, scorecardGood, coverageGood, historyGood);
    expect(result.mode).toBe('fast');
    expect(result.concurrency).toBe(8);
    expect(result.useCache).toBe(true);
  });

  it('deve forcar modo deep se risco alto', () => {
    const highRisk: Forecast = { estimatedJobs: 20, estimatedDurationMs: 14000, risk: 'high' };
    const result = decideExecution('fast', highRisk, precision, scorecardGood, coverageGood, historyGood);
    expect(result.mode).toBe('deep');
    expect(result.concurrency).toBe(2);
  });

  it('deve forcar modo deep se precisao instavel', () => {
    const unstable: PrecisionReport = { confidence: 0.4, variance: 0.3, stable: false };
    const result = decideExecution('fast', forecast, unstable, scorecardGood, coverageGood, historyGood);
    expect(result.mode).toBe('deep');
  });

  it('deve forcar modo deep com concorrencia 1 se scorecard critico', () => {
    const result = decideExecution('balanced', forecast, precision, scorecardCritical, coverageGood, historyGood);
    expect(result.mode).toBe('deep');
    expect(result.concurrency).toBe(1);
  });

  it('deve desabilitar cache se historico de falhas alto', () => {
    const badHistory: HistorySummary = { successRate: 0.3, averageQualityScore: 40, averageDurationMs: 5000, runs: 5 };
    const result = decideExecution('balanced', forecast, precision, scorecardGood, coverageGood, badHistory);
    expect(result.useCache).toBe(false);
  });
});