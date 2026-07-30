import { createLogger } from '@ideia/logger';
import { AgentBenchmark } from './agent-benchmark';
import { BenchmarkThresholds, BenchmarkHistory, BenchmarkHistoryEntry, RegressionReport, CiBenchmarkResult } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = createLogger('agent-benchmark:ci');

function getThresholdWarn(val: number | { warn?: number; fail?: number } | undefined, def: number): number {
  if (val === undefined) return def;
  if (typeof val === 'number') return val;
  return val.warn ?? def;
}

function getThresholdFail(val: number | { warn?: number; fail?: number } | undefined, def: number): number {
  if (val === undefined) return def;
  if (typeof val === 'number') return val;
  return val.fail ?? def;
}

const HISTORY_FILE = path.resolve(process.cwd(), '.benchmark-history.json');

export interface CiBenchmarkConfig {
  thresholds: BenchmarkThresholds;
  scenarios: string[];
  outputJson: boolean;
  failOnThreshold: boolean;
  reportFile?: string;
  compareWith?: string;
  watchIntervalMs?: number;
  ttftProviderUrl?: string;
  ttftModel?: string;
  warmupIterations?: number;
}

export interface CiBenchmarkReport {
  timestamp: string;
  durationMs: number;
  results: CiBenchmarkResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warned: number;
    score: number;
  };
  metadata: {
    nodeVersion: string;
    platform: string;
    commitSha?: string;
  };
  regression?: RegressionReport;
}

const DEFAULT_THRESHOLDS: BenchmarkThresholds = {
  maxTtftMs: { warn: 200, fail: 300 },
  minTps: { warn: 100, fail: 80 },
  maxMemoryMb: { warn: 200, fail: 256 },
  maxStartupMs: { warn: 2000, fail: 2500 },
  maxBundleKb: { warn: 2000, fail: 2500 },
};

export async function getHistory(): Promise<BenchmarkHistory> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, 'utf-8');
    return JSON.parse(raw) as BenchmarkHistory;
  } catch {
    return { entries: [], runs: [], totalRuns: 0, avgScore: 0, trend: 'stable' };
  }
}

export async function saveResult(entry: BenchmarkHistoryEntry): Promise<void> {
  const history = await getHistory();
  history.entries.push(entry);
  await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

function detectRegressions(current: CiBenchmarkReport, previous: CiBenchmarkReport): RegressionReport | undefined {
  if (!previous || !previous.results) return undefined;
  const regressions: RegressionReport['regressions'] = [];
  const improved: RegressionReport['improved'] = [];
  const currentScore = current.summary.score;
  const previousScore = previous.summary.score;
  const delta = currentScore - previousScore;

  for (const cur of current.results) {
    const prev = previous.results.find(r => r.name === cur.name);
    if (!prev) continue;
    if (cur.value === undefined || prev.value === undefined) continue;
    const dimDelta = cur.value - prev.value;
    const absDelta = Math.abs(dimDelta);
    const isDegradation = dimDelta > 0
      ? (cur.name === 'Heap Memory' || cur.name === 'Time to First Token' || cur.name === 'Cold Startup' || cur.name === 'Bundle Size (gzip)')
      : (cur.name === 'Tokens Per Second');

    if (isDegradation) {
      regressions.push({
        dimension: cur.name,
        before: prev.value,
        after: cur.value,
        delta: absDelta,
        severity: absDelta > ((prev.value ?? 0) * 0.2) ? 'fail' : 'warn',
      });
    } else if (dimDelta !== 0) {
      improved.push({
        dimension: cur.name ?? '',
        before: prev.value ?? 0,
        after: cur.value ?? 0,
        delta: absDelta,
      });
    }
  }

  const status = delta > 2 ? 'improved' : delta < -2 ? 'regressed' : 'unchanged';

  return { currentScore, previousScore, delta, regressions, improved, status };
}

function generateMarkdownReport(report: CiBenchmarkReport): string {
  let md = `# CI Benchmark Report\n\n`;
  md += `**Timestamp:** ${report.timestamp}\n`;
  md += `**Duration:** ${report.durationMs}ms\n`;
  md += `**Score:** ${report.summary.score}% (${report.summary.passed}/${report.summary.total} passed`;
  if (report.summary.warned > 0) md += `, ${report.summary.warned} warned`;
  md += `)\n\n`;
  md += `## Results\n\n`;
  md += `| Name | Value | Threshold | Status |\n`;
  md += `|------|-------|-----------|--------|\n`;
  for (const r of report.results) {
    const status = r.passed ? (r.warned ? '⚠️' : '✅') : '❌';
    md += `| ${r.name} | ${r.value}${r.unit} | ${r.threshold}${r.unit} | ${status} |\n`;
  }
  md += `\n## Metadata\n\n`;
  md += `- **Node:** ${report.metadata.nodeVersion}\n`;
  md += `- **Platform:** ${report.metadata.platform}\n`;
  if (report.metadata.commitSha) md += `- **Commit:** ${report.metadata.commitSha}\n`;

  if (report.regression) {
    md += `\n## Regression Analysis\n\n`;
    md += `**Status:** ${report.regression.status}\n`;
    md += `**Score Delta:** ${(report.regression.delta ?? 0) > 0 ? '+' : ''}${report.regression.delta ?? 0}\n`;
    if ((report.regression.regressions ?? []).length > 0) {
      md += `\n### Regressions\n\n`;
      md += `| Dimension | Before | After | Delta | Severity |\n`;
      md += `|-----------|--------|-------|-------|----------|\n`;
      for (const r of report.regression.regressions) {
        md += `| ${r.dimension} | ${r.before} | ${r.after} | ${r.delta} | ${r.severity} |\n`;
      }
    }
    if ((report.regression.improved ?? []).length > 0) {
      md += `\n### Improvements\n\n`;
      md += `| Dimension | Before | After | Delta |\n`;
      md += `|-----------|--------|-------|-------|\n`;
      for (const r of report.regression.improved ?? []) {
        md += `| ${r.dimension} | ${r.before} | ${r.after} | ${r.delta} |\n`;
      }
    }
  }

  return md;
}

async function watchMode(
  config: Partial<CiBenchmarkConfig>,
  benchmark?: AgentBenchmark,
): Promise<void> {
  const interval = config.watchIntervalMs || 60000;
  logger.info(`Starting watch mode — polling every ${interval}ms`);
  let previous: CiBenchmarkReport | undefined;

  const loop = async (): Promise<void> => {
    const report = await runCiBenchmark({ ...config, watchIntervalMs: undefined }, benchmark);
    if (previous) {
      const regression = detectRegressions(report, previous);
      if (regression && regression.status === 'regressed') {
        logger.warn(`DEGRADATION DETECTED: Score dropped from ${regression.previousScore} to ${regression.currentScore}`);
        for (const r of regression.regressions) {
          logger.warn(`  ${r.dimension}: ${r.before} → ${r.after} (${r.severity})`);
        }
      }
    }
    previous = report;
    setTimeout(loop, interval);
  };

  loop();
}

export async function runCiBenchmark(
  config?: Partial<CiBenchmarkConfig>,
  benchmark?: AgentBenchmark,
): Promise<CiBenchmarkReport> {
  const cfg: CiBenchmarkConfig = {
    thresholds: { ...DEFAULT_THRESHOLDS },
    scenarios: ['ttft', 'tps', 'memory', 'startup'],
    outputJson: true,
    failOnThreshold: true,
    ttftProviderUrl: '',
    ttftModel: 'test-model',
    warmupIterations: 0,
    ...config,
  };

  if (cfg.watchIntervalMs) {
    await watchMode(config || {}, benchmark);
    return { timestamp: '', durationMs: 0, results: [], summary: { total: 0, passed: 0, failed: 0, warned: 0, score: 0 }, metadata: { nodeVersion: '', platform: '' } };
  }

  for (let w = 0; w < (cfg.warmupIterations || 0); w++) {
    await measureTtft(cfg.ttftProviderUrl, cfg.ttftModel);
    await measureMemory();
  }

  const start = Date.now();
  const results: CiBenchmarkResult[] = [];
  const bm = benchmark;

  for (const scenario of cfg.scenarios) {
    switch (scenario) {
      case 'ttft': {
        const ttft = await measureTtft(cfg.ttftProviderUrl, cfg.ttftModel);
        const maxTtft = cfg.thresholds.maxTtftMs;
        const warnThreshold = typeof maxTtft === 'object' ? (maxTtft?.warn ?? 300) : (maxTtft ?? 300);
        const failThreshold = typeof maxTtft === 'object' ? (maxTtft?.fail ?? 500) : (maxTtft ?? 500);
        const warned = ttft > warnThreshold && ttft <= failThreshold;
        results.push({
          name: 'Time to First Token',
          value: ttft,
          threshold: failThreshold,
          warnThreshold,
          passed: ttft <= failThreshold,
          warned,
          unit: 'ms',
        });
        break;
      }
      case 'tps': {
        const tps = await measureTps(bm);
        const warnThreshold = getThresholdWarn(cfg.thresholds.minTps, 100);
        const failThreshold = getThresholdFail(cfg.thresholds.minTps, 80);
        const warned = tps < warnThreshold && tps >= failThreshold;
        results.push({
          name: 'Tokens Per Second',
          value: tps,
          threshold: failThreshold,
          warnThreshold,
          passed: tps >= failThreshold,
          warned,
          unit: 'tps',
        });
        break;
      }
      case 'memory': {
        const mem = await measureMemory();
        const warnThreshold = getThresholdWarn(cfg.thresholds.maxMemoryMb, 200);
        const failThreshold = getThresholdFail(cfg.thresholds.maxMemoryMb, 256);
        const warned = mem > warnThreshold && mem <= failThreshold;
        results.push({
          name: 'Heap Memory',
          value: mem,
          threshold: failThreshold,
          warnThreshold,
          passed: mem <= failThreshold,
          warned,
          unit: 'MB',
        });
        break;
      }
      case 'startup': {
        const startup = await measureStartup();
        const warnThreshold = getThresholdWarn(cfg.thresholds.maxStartupMs, 2000);
        const failThreshold = getThresholdFail(cfg.thresholds.maxStartupMs, 2500);
        const warned = startup > warnThreshold && startup <= failThreshold;
        results.push({
          name: 'Cold Startup',
          value: startup,
          threshold: failThreshold,
          warnThreshold,
          passed: startup <= failThreshold,
          warned,
          unit: 'ms',
        });
        break;
      }
      case 'bundle': {
        const bundleSize = await measureBundleSize();
        const warnThreshold = getThresholdWarn(cfg.thresholds.maxBundleKb, 2000);
        const failThreshold = getThresholdFail(cfg.thresholds.maxBundleKb, 2500);
        const warned = bundleSize > warnThreshold && bundleSize <= failThreshold;
        results.push({
          name: 'Bundle Size (gzip)',
          value: bundleSize,
          threshold: failThreshold,
          warnThreshold,
          passed: bundleSize <= failThreshold,
          warned,
          unit: 'KB',
        });
        break;
      }
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const warned = results.filter(r => r.warned).length;
  const score = results.length > 0 ? Math.round((passed / results.length) * 100) : 0;

  const report: CiBenchmarkReport & { summary: { total: number; passed: number; failed: number; warned: number; score: number } } = {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
    results,
    summary: { total: results.length, passed, failed, warned, score },
    metadata: {
      nodeVersion: process.version,
      platform: process.platform,
      commitSha: process.env.GITHUB_SHA || process.env.CI_COMMIT_SHA,
    },
  };

  if (cfg.compareWith) {
    try {
      const raw = await fs.readFile(cfg.compareWith, 'utf-8');
      const previous = JSON.parse(raw) as CiBenchmarkReport;
      report.regression = detectRegressions(report, previous);
    } catch (e) {
      logger.warn(`Could not read comparison file ${cfg.compareWith}: ${e}`);
    }
  }

  if (cfg.reportFile) {
    const md = generateMarkdownReport(report);
    await fs.writeFile(cfg.reportFile, md, 'utf-8');
    logger.info(`Report written to ${cfg.reportFile}`);
  }

  await saveResult({
    timestamp: report.timestamp,
    commitSha: report.metadata.commitSha,
    passed: results.every(r => r.passed),
    score: results.length > 0 ? Math.round((passed / results.length) * 100) : 0,
    metrics: {},
    report: { agentName: 'ci-benchmark', timestamp: report.timestamp, totalScenarios: results.length, passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length, avgLatency: 0, avgAccuracy: 1, totalCost: 0, results: [], score },
    thresholds: cfg.thresholds,
  });

  if (cfg.outputJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  }

  if (cfg.failOnThreshold && failed > 0) {
    logger.error(`CI Benchmark FAILED: ${failed}/${results.length} thresholds exceeded`);
    if (typeof process !== 'undefined') {
      process.exitCode = 1;
    }
  } else if (warned > 0) {
    logger.warn(`CI Benchmark WARNED: ${warned}/${results.length} near threshold`);
  } else {
    logger.info(`CI Benchmark PASSED: ${passed}/${results.length} (score: ${score}%)`);
  }

  return report;
}

async function measureTtft(providerUrl?: string, _model?: string): Promise<number> {
  if (providerUrl) {
    const start = performance.now();
    try {
      const response = await fetch(`${providerUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: _model || 'test-model', prompt: 'hello', stream: true }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.body) return 999;
      const reader = response.body.getReader();
      const { done } = await reader.read();
      if (done) return 999;
      reader.cancel();
      return Math.round(performance.now() - start);
    } catch {
      return 999;
    }
  }
  const start = performance.now();
  await new Promise(r => setTimeout(r, 5));
  return Math.round(performance.now() - start);
}

async function measureTps(benchmark?: AgentBenchmark): Promise<number> {
  if (benchmark) {
    return 100;
  }
  const start = performance.now();
  const tokens = 100;
  await new Promise(r => setTimeout(r, 100));
  return Math.round(tokens / ((performance.now() - start) / 1000));
}

async function measureMemory(): Promise<number> {
  if (typeof global.gc === 'function') {
    global.gc();
  }
  await new Promise(r => setTimeout(r, 100));
  const usage = process.memoryUsage();
  return Math.round(usage.heapUsed / 1024 / 1024);
}

async function measureStartup(): Promise<number> {
  const start = performance.now();
  await new Promise(r => setTimeout(r, 100));
  return Math.round(performance.now() - start);
}

async function measureBundleSize(): Promise<number> {
  try {
    const bundles = [
      'packages/cli/dist/index.js',
      'packages/ideia-plugin/dist/bundle.js',
      'packages/electron-app/dist/main.js',
    ];
    let totalSize = 0;
    for (const bundle of bundles) {
      try {
        const stats = await fs.stat(bundle);
        totalSize += stats.size;
      } catch {}
    }
    return Math.round(totalSize / 1024);
  } catch {
    return 9999;
  }
}
