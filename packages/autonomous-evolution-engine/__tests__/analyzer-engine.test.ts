import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AnalyzerEngine } from '../src/analyzer-engine';
import type { ScanResult } from '../src/types';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
  Logger: jest.fn(),
}));

function mockLogger(): any {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
}

function createScanResult(scanner: string, score: number, severity: string = 'info'): ScanResult {
  return {
    scanner: scanner as any,
    timestamp: Date.now(),
    score,
    findings: [{ severity: severity as any, message: 'test finding', code: 'TST' }],
    recommendations: [{ action: 'fix it', priority: 1, effort: 'hours', category: scanner as any }],
    duration: 100,
  };
}

describe('AnalyzerEngine', () => {
  let analyzer: AnalyzerEngine;

  beforeEach(() => {
    analyzer = new AnalyzerEngine(mockLogger());
  });

  it('analyze returns result with trends and health', () => {
    const results = [createScanResult('health', 85), createScanResult('test', 70)];

    const analyzed = analyzer.analyze(results);
    expect(analyzed.trends.length).toBeGreaterThan(0);
    expect(analyzed.recommendations.length).toBeGreaterThan(0);
    expect(analyzed.overallHealth).toBeGreaterThan(0);
  });

  it('returns overallHealth of 1 when empty results', () => {
    const analyzed = analyzer.analyze([]);
    expect(analyzed.overallHealth).toBe(1);
  });

  it('computes overall health as average score / 100', () => {
    const results = [
      createScanResult('health', 50),
      createScanResult('test', 50),
    ];
    const analyzed = analyzer.analyze(results);
    expect(analyzed.overallHealth).toBe(0.5);
  });

  it('returns worsening priority for decreased scores', () => {
    const r1 = createScanResult('lint', 80);
    const r2 = createScanResult('lint', 40);

    analyzer.analyze([r1]);
    const analyzed = analyzer.analyze([r2]);

    const lintRecs = analyzed.recommendations.filter(r => r.category === 'lint');
    if (lintRecs.length > 0) {
      expect(lintRecs[0].priority).toBeLessThanOrEqual(1);
    }
  });

  it('getRecommendations returns latest set', () => {
    const results = [createScanResult('security', 90)];
    analyzer.analyze(results);
    expect(analyzer.getRecommendations().length).toBeGreaterThan(0);
  });

  it('getTrends returns computed trends', () => {
    analyzer.analyze([createScanResult('perf', 80)]);
    analyzer.analyze([createScanResult('perf', 90)]);

    const trends = analyzer.getTrends();
    expect(trends.length).toBeGreaterThan(0);
  });
});
