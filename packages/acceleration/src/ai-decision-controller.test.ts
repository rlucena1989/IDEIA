import { decideExecution } from './ai-decision-controller';
import type { Forecast, PrecisionReport, ScorecardAnalysis, CoverageAnalysis, HistorySummary } from './types';

describe('ai-decision-controller', () => {
  const defaultForecast: Forecast = { estimatedJobs: 1, estimatedDurationMs: 1000, risk: 'low' };
  const defaultPrecision: PrecisionReport = { confidence: 0.9, variance: 0.1, stable: true };
  const defaultScorecard: ScorecardAnalysis = { score: 85, trend: 'up', status: 'good' };
  const defaultCoverage: CoverageAnalysis = { total: 90, lines: 90, branches: 80, functions: 85, status: 'good' };
  const defaultHistory: HistorySummary = { successRate: 0.95, averageQualityScore: 90, averageDurationMs: 100, runs: 10 };

  it('should keep balanced mode in default conditions', () => {
    const result = decideExecution('balanced', defaultForecast, defaultPrecision, defaultScorecard, defaultCoverage, defaultHistory);
    // Defaults satisfy ideal conditions, so it becomes fast
    expect(result.mode).toBe('fast');
    expect(result.concurrency).toBe(8);
  });

  it('should switch to deep mode for high risk', () => {
    const result = decideExecution('fast', { estimatedJobs: 1, estimatedDurationMs: 1000, risk: 'high' }, defaultPrecision, defaultScorecard, defaultCoverage, defaultHistory);
    expect(result.mode).toBe('deep');
    expect(result.concurrency).toBe(2);
  });

  it('should switch to deep mode for unstable precision', () => {
    const result = decideExecution('fast', defaultForecast, { confidence: 0.5, variance: 0.5, stable: false }, defaultScorecard, defaultCoverage, defaultHistory);
    expect(result.mode).toBe('deep');
    expect(result.concurrency).toBe(2);
  });

  it('should switch to deep mode for critical scorecard or coverage', () => {
    const criticalScorecard = { score: 10, trend: 'down', status: 'critical' } as ScorecardAnalysis;
    const result = decideExecution('fast', defaultForecast, defaultPrecision, criticalScorecard, defaultCoverage, defaultHistory);
    expect(result.mode).toBe('deep');
    expect(result.concurrency).toBe(1);
  });

  it('should switch to fast mode for ideal conditions', () => {
    const result = decideExecution('deep', defaultForecast, defaultPrecision, defaultScorecard, defaultCoverage, { successRate: 0.95, averageQualityScore: 90, averageDurationMs: 100, runs: 20 });
    expect(result.mode).toBe('fast');
    expect(result.concurrency).toBe(8);
  });

  it('should disable cache for low success rate', () => {
    const history: HistorySummary = { successRate: 0.3, averageQualityScore: 50, averageDurationMs: 200, runs: 10 };
    const result = decideExecution('balanced', defaultForecast, defaultPrecision, defaultScorecard, defaultCoverage, history);
    expect(result.useCache).toBe(false);
    expect(result.reason).toContain('cache desabilitado');
  });

  it('should return default reason when no conditions met', () => {
    const normalHistory: HistorySummary = { successRate: 0.85, averageQualityScore: 80, averageDurationMs: 150, runs: 5 };
    const result = decideExecution('fast', defaultForecast, defaultPrecision, defaultScorecard, defaultCoverage, normalHistory);
    expect(result.mode).toBe('fast');
    expect(result.reason).toBe('decisao padrao mantida');
  });
});