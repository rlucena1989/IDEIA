import { TtftBenchmark, TtftBenchmarkConfig } from './ttft-benchmark';
import { TpsBenchmark, TpsBenchmarkConfig } from './tps-benchmark';
import { MemoryProfiler, MemoryProfilerConfig } from './memory-profiler';
import { HotspotProfiler, HotspotProfilerConfig, ProfiledStep } from './hotspot-profiler';
import { PerformanceScorecard, ScoreBreakdown, RegressionReport } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('agent-benchmark:suite');

export interface ScoreBracket {
  threshold: number;
  score: number;
}

export const SCORE_VALUES: ScoreBracket[] = [
  { threshold: 10, score: 100 },
  { threshold: 20, score: 90 },
  { threshold: 35, score: 75 },
  { threshold: 50, score: 50 },
  { threshold: 75, score: 25 },
  { threshold: 100, score: 10 },
];

export const DEFAULT_BRACKETS = {
  ttft: [
    { threshold: 50, score: 100 },
    { threshold: 100, score: 90 },
    { threshold: 200, score: 75 },
    { threshold: 500, score: 50 },
    { threshold: 1000, score: 25 },
    { threshold: Infinity, score: 10 },
  ] as ScoreBracket[],
  tps: [
    { threshold: 10000, score: 100 },
    { threshold: 5000, score: 90 },
    { threshold: 1000, score: 75 },
    { threshold: 500, score: 50 },
    { threshold: 100, score: 25 },
    { threshold: 0, score: 10 },
  ] as ScoreBracket[],
  memory: [
    { threshold: 50, score: 100 },
    { threshold: 100, score: 90 },
    { threshold: 200, score: 75 },
    { threshold: 500, score: 50 },
    { threshold: 1000, score: 25 },
    { threshold: Infinity, score: 10 },
  ] as ScoreBracket[],
  hotspot: [
    { threshold: 10, score: 100 },
    { threshold: 25, score: 80 },
    { threshold: 50, score: 60 },
    { threshold: 75, score: 40 },
    { threshold: Infinity, score: 20 },
  ] as ScoreBracket[],
};

export interface BenchmarkSuiteConfig {
  ttft?: Partial<TtftBenchmarkConfig>;
  tps?: Partial<TpsBenchmarkConfig>;
  memory?: Partial<MemoryProfilerConfig>;
  hotspot?: Partial<HotspotProfilerConfig>;
  verbose?: boolean;
  scoring?: {
    ttft?: ScoreBracket[];
    tps?: ScoreBracket[];
    memory?: ScoreBracket[];
    hotspot?: ScoreBracket[];
  };
}

export interface SuiteResult {
  scorecard: PerformanceScorecard;
  durationMs: number;
  summary: string;
}

function scoreFromBrackets(value: number, brackets: ScoreBracket[], higherIsBetter: boolean): number {
  if (higherIsBetter) {
    for (const b of brackets) {
      if (value >= b.threshold) return b.score;
    }
  } else {
    for (const b of brackets) {
      if (value <= b.threshold) return b.score;
    }
  }
  return brackets[brackets.length - 1]?.score ?? 0;
}

export function detectSuiteRegression(current: PerformanceScorecard, previous: PerformanceScorecard): RegressionReport {
  const regressions: RegressionReport['regressions'] = [];
  const improved: RegressionReport['improved'] = [];
  const dims: Array<{ dimension: string; current: number; previous: number }> = [];

  if (current.scoreBreakdown && previous.scoreBreakdown) {
    for (const key of ['ttft', 'tps', 'memory', 'hotspot'] as const) {
      const cur = current.scoreBreakdown[key];
      const prev = previous.scoreBreakdown[key];
      if (cur !== undefined && prev !== undefined) {
        dims.push({ dimension: key, current: cur, previous: prev });
      }
    }
  }

  for (const d of dims) {
    const delta = d.current - d.previous;
    const absDelta = Math.abs(delta);
    if (delta < 0) {
      regressions.push({
        dimension: d.dimension,
        before: d.previous,
        after: d.current,
        delta: absDelta,
        severity: absDelta > 10 ? 'fail' : 'warn',
      });
    } else if (delta > 0) {
      improved.push({
        dimension: d.dimension,
        before: d.previous,
        after: d.current,
        delta: absDelta,
      });
    }
  }

  const currentScore = current.overallScore;
  const previousScore = previous.overallScore;
  const delta = currentScore - previousScore;
  const status = delta > 2 ? 'improved' : delta < -2 ? 'regressed' : 'unchanged';

  return { currentScore, previousScore, delta, regressions, improved, status };
}

export class BenchmarkSuite {
  private config: BenchmarkSuiteConfig;
  private brackets: {
    ttft: ScoreBracket[];
    tps: ScoreBracket[];
    memory: ScoreBracket[];
    hotspot: ScoreBracket[];
  };

  constructor(config?: BenchmarkSuiteConfig) {
    this.config = { verbose: false, ...config };
    this.brackets = {
      ttft: config?.scoring?.ttft || DEFAULT_BRACKETS.ttft,
      tps: config?.scoring?.tps || DEFAULT_BRACKETS.tps,
      memory: config?.scoring?.memory || DEFAULT_BRACKETS.memory,
      hotspot: config?.scoring?.hotspot || DEFAULT_BRACKETS.hotspot,
    };
  }

  async runFull(
    label: string,
    executors: {
      ttft?: (i: number) => Promise<{ firstTokenMs: number; totalMs: number; tokens: number }>;
      tps?: (i: number) => Promise<void> | void;
      memorySetup?: () => void;
      memoryOp?: () => void | Promise<void>;
      hotspotSteps?: ProfiledStep[];
    },
  ): Promise<SuiteResult> {
    const start = Date.now();
    const verbose = this.config.verbose;

    if (verbose) logger.info(`\nBenchmarking: ${label}\n`);

    const ttftBench = new TtftBenchmark(this.config.ttft);
    const tpsBench = new TpsBenchmark(this.config.tps);
    const memProfiler = new MemoryProfiler(this.config.memory);
    const hotspotProfiler = new HotspotProfiler(this.config.hotspot);

    const ttftReport = executors.ttft
      ? await ttftBench.run(`${label} TTFT`, executors.ttft, verbose ? s => logger.info(`  TTFT sample ${s.index}: ${s.ttftMs}ms`) : undefined)
      : { operation: `${label} TTFT`, samples: 0, avgTtftMs: 0, p50TtftMs: 0, p95TtftMs: 0, p99TtftMs: 0, minTtftMs: 0, maxTtftMs: 0, avgTotalLatencyMs: 0, avgTokensPerSec: 0 };

    const tpsReport = executors.tps
      ? await tpsBench.run(`${label} TPS`, executors.tps, verbose ? s => logger.info(`  TPS sample ${s.index}: ${s.tps}/s`) : undefined)
      : { operation: `${label} TPS`, samples: 0, totalOps: 0, totalDurationMs: 0, avgTps: 0, peakTps: 0, p50Tps: 0, p95Tps: 0 };

    const memoryReport = executors.memorySetup && executors.memoryOp
      ? await memProfiler.profile(`${label} Memory`, executors.memorySetup, executors.memoryOp, verbose ? s => logger.info(`  Mem sample ${s.index}: ${s.heapUsedMB}MB heap, ${s.rssMB}MB RSS`) : undefined)
      : { label: `${label} Memory`, samples: 0, avgHeapUsedMB: 0, peakHeapUsedMB: 0, avgRssMB: 0, peakRssMB: 0, avgDeltaMB: 0, totalAllocatedMB: 0 };

    const hotspotReport = executors.hotspotSteps
      ? await hotspotProfiler.profile(`${label} Hotspots`, executors.hotspotSteps)
      : { operation: `${label} Hotspots`, totalDurationMs: 0, hotspots: [], recommendations: ['No profiling data'] };

    const ttftScore = ttftReport.samples > 0 ? this.scoreTtft(ttftReport.avgTtftMs) : 0;
    const tpsScore = tpsReport.samples > 0 ? this.scoreTps(tpsReport.avgTps) : 0;
    const memScore = memoryReport.samples > 0 ? this.scoreMemory(memoryReport.avgHeapUsedMB) : 0;
    const hotspotScore = hotspotReport.hotspots.length > 0 ? this.scoreHotspots(hotspotReport.hotspots.map(h => h.share)) : 100;
    const overallScore = Math.round((ttftScore + tpsScore + memScore + hotspotScore) / 4);
    const scoreBreakdown: ScoreBreakdown = { ttft: ttftScore, tps: tpsScore, memory: memScore, hotspot: hotspotScore };

    const scorecard: PerformanceScorecard = {
      ttft: ttftReport as unknown as Record<string, unknown>,
      tps: tpsReport as unknown as Record<string, unknown>,
      memory: memoryReport as unknown as Record<string, unknown>,
      hotspots: hotspotReport as unknown as Record<string, unknown>,
      overallScore,
      scoreBreakdown,
    };

    const durationMs = Date.now() - start;
    const summary = `${label}: Score ${overallScore}/100 | TTFT ${ttftReport.avgTtftMs.toFixed(1)}ms | TPS ${tpsReport.avgTps.toFixed(0)} | Mem ${memoryReport.avgHeapUsedMB.toFixed(0)}MB | ${hotspotReport.hotspots.length} hotspots`;

    if (verbose) logger.info(`\n${summary}\n`);

    return { scorecard, durationMs, summary };
  }

  private scoreTtft(avgMs: number): number {
    return scoreFromBrackets(avgMs, this.brackets.ttft, false);
  }

  private scoreTps(tps: number): number {
    return scoreFromBrackets(tps, this.brackets.tps, true);
  }

  private scoreMemory(mb: number): number {
    return scoreFromBrackets(mb, this.brackets.memory, false);
  }

  private scoreHotspots(shares: number[]): number {
    const maxShare = Math.max(...shares, 0);
    return scoreFromBrackets(maxShare, this.brackets.hotspot, false);
  }
}

export function createBenchmarkSuite(config?: BenchmarkSuiteConfig): BenchmarkSuite {
  return new BenchmarkSuite(config);
}
