import { computeDelta } from './delta-engine';
import { EngineReport, EngineMode } from './types';

describe('delta-engine', () => {
  const createReport = (partial: Partial<EngineReport>): EngineReport => ({
    startedAt: '2024-01-01T00:00:00Z',
    finishedAt: '2024-01-01T01:00:00Z',
    mode: 'balanced' as EngineMode,
    forecast: { estimatedJobs: 1, estimatedDurationMs: 100, risk: 'low' },
    precision: { confidence: 0.8, variance: 0.15, stable: true },
    quality: { approved: true, score: 90, reasons: [] },
    scorecard: { score: 90, trend: 'up', status: 'good' },
    coverage: { total: 100, lines: 90, branches: 80, functions: 85, status: 'good' },
    gaps: [],
    maturity: { score: 8, level: 'high' },
    history: { successRate: 1, averageQualityScore: 90, averageDurationMs: 100, runs: 1 },
    results: [],
    totalDurationMs: 1000,
    success: true,
    ...partial
  });

  describe('computeDelta', () => {
    it('should handle null previous report', () => {
      const current = createReport({});
      const result = computeDelta(null, current);
      expect(result.summary).toBe("primeira execucao — sem delta anterior");
      expect(result.successChanged).toBe(false);
    });

    it('should calculate quality delta', () => {
      const previous = createReport({ quality: { approved: true, score: 85, reasons: [] } });
      const current = createReport({ quality: { approved: true, score: 90, reasons: [] } });
      const result = computeDelta(previous, current);
      expect(result.qualityDelta).toBe(5);
    });

    it('should calculate duration delta', () => {
      const previous = createReport({ totalDurationMs: 1000 });
      const current = createReport({ totalDurationMs: 1500 });
      const result = computeDelta(previous, current);
      expect(result.durationDelta).toBe(500);
    });

    it('should detect mode change', () => {
      const previous = createReport({ mode: 'fast' });
      const current = createReport({ mode: 'balanced' });
      const result = computeDelta(previous, current);
      expect(result.modeChanged).toBe(true);
    });

    it('should detect success change', () => {
      const previous = createReport({ success: true });
      const current = createReport({ success: false });
      const result = computeDelta(previous, current);
      expect(result.successChanged).toBe(true);
    });

    it('should include duration when delta > 1000ms', () => {
      const previous = createReport({ totalDurationMs: 1000 });
      const current = createReport({ totalDurationMs: 3000 });
      const result = computeDelta(previous, current);
      expect(result.summary).toContain('duracao +2s');
    });

it('should generate summary with changes', () => {
        const previous = createReport({ quality: { approved: true, score: 85, reasons: [] } });
        const current = createReport({ quality: { approved: true, score: 90, reasons: [] }, mode: 'balanced' });
        const result = computeDelta(previous, current);
        expect(result.summary).toContain('qualidade +5');
      });

    it('should handle negative quality delta', () => {
      const previous = createReport({ quality: { approved: true, score: 90, reasons: [] } });
      const current = createReport({ quality: { approved: true, score: 80, reasons: [] } });
      const result = computeDelta(previous, current);
      expect(result.qualityDelta).toBe(-10);
    });
  });
});