import { runCiBenchmark, getHistory, saveResult } from '../src/ci-benchmark';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('CiBenchmark', () => {
  beforeEach(async () => {
    const historyFile = path.resolve(process.cwd(), '.benchmark-history.json');
    try { await fs.unlink(historyFile); } catch {}
  });

  it('should run benchmark with default thresholds', async () => {
    const report = await runCiBenchmark({
      outputJson: false,
      failOnThreshold: false,
    });
    expect(report.summary.total).toBeGreaterThan(0);
    expect(report.summary.score).toBeGreaterThanOrEqual(0);
    expect(report.metadata.nodeVersion).toBeDefined();
    expect(report.metadata.platform).toBeDefined();
  });

  it('should include warn/fail gradual thresholds in results', async () => {
    const report = await runCiBenchmark({
      outputJson: false,
      failOnThreshold: false,
      scenarios: ['ttft', 'memory'],
    });
    for (const r of report.results) {
      expect(r.warnThreshold).toBeDefined();
      expect(r.warned).toBeDefined();
    }
  });

  it('should generate markdown report file', async () => {
    const reportFile = path.resolve(process.cwd(), 'test-benchmark-report.md');
    const _report = await runCiBenchmark({
      outputJson: false,
      failOnThreshold: false,
      reportFile,
    });
    const content = await fs.readFile(reportFile, 'utf-8');
    expect(content).toContain('# CI Benchmark Report');
    expect(content).toContain('**Score:**');
    await fs.unlink(reportFile);
  });

  it('saveResult and getHistory should persist results', async () => {
    await saveResult({
      timestamp: new Date().toISOString(),
      commitSha: 'abc123',
      passed: true,
      report: { agentName: 'test', timestamp: new Date().toISOString(), totalScenarios: 0, passed: 0, failed: 0, avgLatency: 0, avgAccuracy: 0, totalCost: 0, results: [], score: 0 },
      thresholds: {
        maxTtftMs: { warn: 200, fail: 300 },
        minTps: { warn: 100, fail: 80 },
        maxMemoryMb: { warn: 200, fail: 256 },
        maxStartupMs: { warn: 2000, fail: 2500 },
        maxBundleKb: { warn: 2000, fail: 2500 },
      },
    });
    const history = await getHistory();
    expect(history.entries.length).toBeGreaterThan(0);
    expect(history.entries[0].commitSha).toBe('abc123');
  });

  it('should use configurable TTFT provider (simulated)', async () => {
    const report = await runCiBenchmark({
      outputJson: false,
      failOnThreshold: false,
      scenarios: ['ttft'],
      ttftProviderUrl: '',
    });
    expect(report.results.length).toBe(1);
    expect(report.results[0].name).toBe('Time to First Token');
    expect(report.results[0].value).toBeGreaterThan(0);
  });
});
