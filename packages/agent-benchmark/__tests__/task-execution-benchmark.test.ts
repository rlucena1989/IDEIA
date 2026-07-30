import { BenchmarkSuite } from '../src/benchmark-suite';
import { HotspotProfiler } from '../src/hotspot-profiler';

describe('Task Execution Time Benchmark', () => {
  it('should measure simple task execution', async () => {
    const suite = new BenchmarkSuite({ verbose: false });
    const result = await suite.runFull('simple-task', {
      ttft: async () => ({ firstTokenMs: 5, totalMs: 20, tokens: 10 }),
      tps: async () => {},
      memorySetup: () => {},
      memoryOp: () => {},
      hotspotSteps: [
        { name: 'parse', fn: async () => { await new Promise(r => setTimeout(r, 2)); } },
        { name: 'execute', fn: async () => { await new Promise(r => setTimeout(r, 5)); } },
        { name: 'format', fn: async () => { await new Promise(r => setTimeout(r, 1)); } },
      ],
    });
    expect(result.scorecard.overallScore).toBeGreaterThanOrEqual(0);
    expect((result.scorecard.hotspots as { hotspots: unknown[] }).hotspots.length).toBe(3);
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it('should measure multi-step workflow', async () => {
    const profiler = new HotspotProfiler({ thresholdPct: 5 });
    const report = await profiler.profile('multi-step-workflow', [
      { name: 'analyze', fn: async () => { await new Promise(r => setTimeout(r, 10)); } },
      { name: 'plan', fn: async () => { await new Promise(r => setTimeout(r, 15)); } },
      { name: 'execute', fn: async () => { await new Promise(r => setTimeout(r, 20)); } },
      { name: 'verify', fn: async () => { await new Promise(r => setTimeout(r, 8)); } },
      { name: 'report', fn: async () => { await new Promise(r => setTimeout(r, 3)); } },
    ]);
    expect(report.hotspots.length).toBe(5);
    expect(report.totalDurationMs).toBeGreaterThan(0);
    const sorted = [...report.hotspots].sort((a, b) => b.durationMs - a.durationMs);
    expect(['execute', 'plan', 'report']).toContain(sorted[0].location);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it('should detect slow tasks as hotspots', async () => {
    const profiler = new HotspotProfiler({ thresholdPct: 20 });
    const report = await profiler.profile('slow-tasks', [
      { name: 'fast-prep', fn: async () => { await new Promise(r => setTimeout(r, 1)); } },
      { name: 'slow-compute', fn: async () => { await new Promise(r => setTimeout(r, 50)); } },
      { name: 'cleanup', fn: async () => { await new Promise(r => setTimeout(r, 1)); } },
    ]);
    const slow = report.hotspots.find(h => h.location === 'slow-compute');
    expect(slow).toBeDefined();
    expect(slow!.share).toBeGreaterThan(65);
    expect(report.recommendations.some(r => r.includes('slow-compute'))).toBe(true);
  });

  it('should benchmark task with varying complexity', async () => {
    const suite = new BenchmarkSuite({ verbose: false });
    const result = await suite.runFull('complexity-variation', {
      ttft: async (i: number) => ({
        firstTokenMs: 10 + i * 2,
        totalMs: 50 + i * 5,
        tokens: 20 + i,
      }),
      tps: async () => {},
      memorySetup: () => {},
      memoryOp: () => {},
      hotspotSteps: [
        { name: 'light', fn: async () => { await new Promise(r => setTimeout(r, 1)); } },
        { name: 'medium', fn: async () => { await new Promise(r => setTimeout(r, 5)); } },
        { name: 'heavy', fn: async () => { await new Promise(r => setTimeout(r, 10)); } },
      ],
    });
    expect(result.scorecard.overallScore).toBeGreaterThan(0);
    expect(result.scorecard.ttft.avgTtftMs).toBeGreaterThan(0);
  });
});
