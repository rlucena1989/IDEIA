import { BenchmarkSuite, detectSuiteRegression, DEFAULT_BRACKETS } from '../src/benchmark-suite';
import { PerformanceScorecard } from '../src/types';

describe('BenchmarkSuite', () => {
  it('should run full suite and produce scorecard', async () => {
    const suite = new BenchmarkSuite({ verbose: false });
    const result = await suite.runFull('test', {
      ttft: async () => ({ firstTokenMs: 15, totalMs: 100, tokens: 50 }),
      tps: async () => {},
      memorySetup: () => {},
      memoryOp: () => {},
      hotspotSteps: [
        { name: 'step-a', fn: async () => { await new Promise(r => setTimeout(r, 5)); } },
        { name: 'step-b', fn: async () => { await new Promise(r => setTimeout(r, 10)); } },
      ],
    });
    expect(result.scorecard.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.scorecard.overallScore).toBeLessThanOrEqual(100);
    expect(result.scorecard.ttft.avgTtftMs).toBe(15);
    expect(result.scorecard.tps.avgTps).toBeGreaterThan(0);
    expect((result.scorecard.hotspots as { hotspots: unknown[] }).hotspots.length).toBe(2);
    expect(result.summary).toContain('Score');
  });

  it('should handle partial execution', async () => {
    const suite = new BenchmarkSuite();
    const result = await suite.runFull('partial', {});
    expect(result.scorecard.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.scorecard.ttft.samples).toBe(0);
    expect(result.scorecard.tps.samples).toBe(0);
  });

  it('should include score breakdown in report', async () => {
    const suite = new BenchmarkSuite({ verbose: false });
    const result = await suite.runFull('breakdown-test', {
      ttft: async () => ({ firstTokenMs: 30, totalMs: 200, tokens: 100 }),
    });
    expect(result.scorecard.scoreBreakdown).toBeDefined();
    expect(result.scorecard.scoreBreakdown!.ttft).toBeGreaterThan(0);
    expect(result.scorecard.scoreBreakdown!.memory).toBe(0);
  });

  it('should accept custom scoring brackets', async () => {
    const suite = new BenchmarkSuite({
      verbose: false,
      scoring: {
        ttft: [
          { threshold: 200, score: 100 },
          { threshold: 500, score: 50 },
          { threshold: Infinity, score: 0 },
        ],
      },
    });
    const result = await suite.runFull('custom-brackets', {
      ttft: async () => ({ firstTokenMs: 30, totalMs: 100, tokens: 50 }),
    });
    expect(result.scorecard.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.scorecard.ttft.avgTtftMs).toBe(30);
  });

  it('detectSuiteRegression should detect changes', () => {
    const prev: PerformanceScorecard = {
      ttft: { operation: 't', samples: 1, avgTtftMs: 50, p50TtftMs: 50, p95TtftMs: 50, p99TtftMs: 50, minTtftMs: 50, maxTtftMs: 50, avgTotalLatencyMs: 100, avgTokensPerSec: 50 },
      tps: { operation: 't', samples: 1, totalOps: 100, totalDurationMs: 1000, avgTps: 5000, peakTps: 5000, p50Tps: 5000, p95Tps: 5000 },
      memory: { label: 'm', samples: 0, avgHeapUsedMB: 0, peakHeapUsedMB: 0, avgRssMB: 0, peakRssMB: 0, avgDeltaMB: 0, totalAllocatedMB: 0 },
      hotspots: { operation: 'h', totalDurationMs: 0, hotspots: [], recommendations: [] },
      overallScore: 90,
      scoreBreakdown: { ttft: 90, tps: 90, memory: 0, hotspot: 100 },
    };
    const curr: PerformanceScorecard = {
      ttft: { operation: 't', samples: 1, avgTtftMs: 200, p50TtftMs: 200, p95TtftMs: 200, p99TtftMs: 200, minTtftMs: 200, maxTtftMs: 200, avgTotalLatencyMs: 300, avgTokensPerSec: 20 },
      tps: { operation: 't', samples: 1, totalOps: 100, totalDurationMs: 2000, avgTps: 2000, peakTps: 2000, p50Tps: 2000, p95Tps: 2000 },
      memory: { label: 'm', samples: 0, avgHeapUsedMB: 0, peakHeapUsedMB: 0, avgRssMB: 0, peakRssMB: 0, avgDeltaMB: 0, totalAllocatedMB: 0 },
      hotspots: { operation: 'h', totalDurationMs: 0, hotspots: [], recommendations: [] },
      overallScore: 80,
      scoreBreakdown: { ttft: 75, tps: 75, memory: 0, hotspot: 100 },
    };
    const report = detectSuiteRegression(curr, prev);
    expect(report.status).toBe('regressed');
    expect(report.regressions.length).toBeGreaterThan(0);
    expect(report.currentScore).toBe(80);
    expect(report.previousScore).toBe(90);
  });

  it('DEFAULT_BRACKETS should be defined', () => {
    expect(DEFAULT_BRACKETS.ttft.length).toBeGreaterThan(0);
    expect(DEFAULT_BRACKETS.tps.length).toBeGreaterThan(0);
    expect(DEFAULT_BRACKETS.memory.length).toBeGreaterThan(0);
    expect(DEFAULT_BRACKETS.hotspot.length).toBeGreaterThan(0);
  });
});
