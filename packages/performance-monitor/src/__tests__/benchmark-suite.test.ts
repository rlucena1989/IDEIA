import { BenchmarkSuite } from '../benchmark-suite';

describe('BenchmarkSuite', () => {
  let suite: BenchmarkSuite;

  beforeEach(() => {
    suite = new BenchmarkSuite();
  });

  it('should run a single benchmark', async () => {
    suite.register({
      name: 'test',
      fn: () => {},
      iterations: 10,
    });
    const results = await suite.runAll();
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('test');
    expect(results[0].iterations).toBe(10);
    expect(results[0].durationMs).toBeGreaterThanOrEqual(0);
    expect(results[0].opsPerSecond).toBeGreaterThanOrEqual(0);
  });

  it('should run multiple benchmarks', async () => {
    suite.register({ name: 'a', fn: () => {}, iterations: 5 });
    suite.register({ name: 'b', fn: () => {}, iterations: 5 });
    suite.register({ name: 'c', fn: () => {}, iterations: 5 });

    const results = await suite.runAll();
    expect(results).toHaveLength(3);
    expect(results.map(r => r.name)).toEqual(['a', 'b', 'c']);
  });

  it('should handle async functions', async () => {
    suite.register({
      name: 'async-test',
      fn: async () => { await Promise.resolve(); },
      iterations: 5,
    });
    const results = await suite.runAll();
    expect(results[0].name).toBe('async-test');
  });

  it('should provide percentiles', async () => {
    suite.register({ name: 'p-test', fn: () => {}, iterations: 10 });
    const results = await suite.runAll();
    expect(results[0].percentiles.p50).toBeGreaterThanOrEqual(0);
    expect(results[0].percentiles.p95).toBeGreaterThanOrEqual(results[0].percentiles.p50);
    expect(results[0].percentiles.p99).toBeGreaterThanOrEqual(results[0].percentiles.p95);
  });

  it('should measure memory delta', async () => {
    suite.register({ name: 'mem-test', fn: () => {}, iterations: 5 });
    const results = await suite.runAll();
    expect(typeof results[0].memoryDeltaMB).toBe('number');
  });

  it('should compare with baseline', async () => {
    const current = [{
      name: 'test', durationMs: 100, opsPerSecond: 10, memoryDeltaMB: 1,
      percentiles: { p50: 10, p95: 15, p99: 20 },
      iterations: 10, timestamp: new Date().toISOString(),
    }];
    const comparisons = await suite.compareWithBaseline(current);
    expect(comparisons).toHaveLength(1);
    expect(comparisons[0].status).toBe('new');
    expect(comparisons[0].baseline).toBeNull();
  });

  it('should detect regression against baseline', async () => {
    const current = [{
      name: 'test', durationMs: 200, opsPerSecond: 5, memoryDeltaMB: 1,
      percentiles: { p50: 20, p95: 30, p99: 40 },
      iterations: 10, timestamp: new Date().toISOString(),
    }];
    const baseline = [{
      name: 'test', durationMs: 100, opsPerSecond: 10, memoryDeltaMB: 1,
      percentiles: { p50: 10, p95: 15, p99: 20 },
      iterations: 10, timestamp: new Date().toISOString(),
    }];
    // Write baseline to temp file
    const fs = await import('node:fs');
    const tmpPath = 'baseline-test.json';
    fs.writeFileSync(tmpPath, JSON.stringify(baseline));
    const comparisons = await suite.compareWithBaseline(current, tmpPath);
    fs.unlinkSync(tmpPath);
    expect(comparisons[0].status).toContain('regression');
    expect(comparisons[0].regression).toBeGreaterThan(10);
  });
});
