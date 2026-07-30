import { performance } from 'node:perf_hooks';
import { createLogger } from '@ideia/logger';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface BenchResult {
  name: string;
  ops: number;
  durationMs: number;
  memUsageMb: number;
  timestamp: string;
}

interface BenchSuite {
  name: string;
  run: () => Promise<void> | void;
  iterations?: number;
}

const RESULTS_DIR = join(__dirname, 'results');
const _MEMORY_WARMUP_MS = 500;

function formatOps(ops: number): string {
  if (ops >= 1_000_000) return `${(ops / 1_000_000).toFixed(2)}M ops/s`;
  if (ops >= 1_000) return `${(ops / 1_000).toFixed(2)}K ops/s`;
  return `${ops.toFixed(2)} ops/s`;
}

function formatMemory(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(2)} KB`;
  return `${bytes} B`;
}

function measureMemory(): number {
  return process.memoryUsage().heapUsed;
}

function _sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBenchmark(suite: BenchSuite): Promise<BenchResult> {
  const iterations = suite.iterations ?? 100;
  global.gc?.();

  const memBefore = measureMemory();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await suite.run();
  }
  const end = performance.now();

  const memAfter = measureMemory();
  const durationMs = end - start;
  const ops = (iterations / durationMs) * 1000;
  const memUsageMb = (memAfter - memBefore) / 1_048_576;

  return {
    name: suite.name,
    ops: Math.round(ops * 100) / 100,
    durationMs: Math.round(durationMs * 100) / 100,
    memUsageMb: Math.round(memUsageMb * 100) / 100,
    timestamp: new Date().toISOString(),
  };
}

function loadBaseline(name: string): BenchResult | null {
  const file = join(RESULTS_DIR, `${name.replace(/[^a-z0-9]/gi, '_')}.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function saveResult(result: BenchResult): void {
  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
  const file = join(RESULTS_DIR, `${result.name.replace(/[^a-z0-9]/gi, '_')}.json`);
  writeFileSync(file, JSON.stringify(result, null, 2));
}

// === BENCHMARKS ===

const TTFT_BENCH: BenchSuite = {
  name: 'TTFT',
  iterations: 50,
  run: () => {
    const start = performance.now();
    for (let i = 0; i < 10; i++) {
      JSON.parse('{"test": true, "value": 42, "items": [1,2,3,4,5]}');
    }
    performance.now() - start;
  },
};

const TPS_BENCH: BenchSuite = {
  name: 'TPS',
  iterations: 200,
  run: () => {
    const data = Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}`, active: i % 2 === 0 }));
    const filtered = data.filter(x => x.active);
    const mapped = filtered.map(x => x.value.toUpperCase());
    mapped.reduce((acc, v) => acc + v.length, 0);
  },
};

const MEMORY_BENCH: BenchSuite = {
  name: 'MEMORY',
  iterations: 20,
  run: () => {
    const cache = new Map<string, { data: number[]; meta: string }>();
    for (let i = 0; i < 1000; i++) {
      cache.set(`key-${i}`, { data: Array.from({ length: 100 }, () => Math.random()), meta: `meta-${i}` });
    }
    const total = Array.from(cache.values()).reduce((sum, v) => sum + v.data.reduce((a, b) => a + b, 0), 0);
    cache.clear();
    if (total < 0) throw new Error('unreachable');
  },
};

const JSON_PARSE_BENCH: BenchSuite = {
  name: 'JSON_PARSE',
  iterations: 500,
  run: () => {
    const payload = '{"id":123,"name":"test","tags":["a","b","c"],"nested":{"x":1,"y":2,"z":3}}';
    const parsed = JSON.parse(payload);
    JSON.stringify(parsed);
  },
};

const ASYNC_OPS_BENCH: BenchSuite = {
  name: 'ASYNC_OPS',
  iterations: 100,
  run: async () => {
    const promises = Array.from({ length: 50 }, (_, i) =>
      Promise.resolve(i).then(x => x * 2)
    );
    await Promise.all(promises);
  },
};

const SUITES: BenchSuite[] = [
  TTFT_BENCH,
  TPS_BENCH,
  MEMORY_BENCH,
  JSON_PARSE_BENCH,
  ASYNC_OPS_BENCH,
];

// === MAIN ===

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const compareMode = args.includes('--compare') || args.includes('-c');
  const verbose = args.includes('--verbose') || args.includes('-v');

  logger.info('┌─────────────────────────────────────────────┐');
  logger.info('│  IDEIA Benchmark Suite v1.0                 │');
  console.log('│  Node:', process.version.padEnd(32) + '│');
  console.log('│  Arch:', process.arch.padEnd(34) + '│');
  console.log('│  Platform:', process.platform.padEnd(30) + '│');
  logger.info('└─────────────────────────────────────────────┘\n');

  const results: BenchResult[] = [];

  for (const suite of SUITES) {
    if (verbose) logger.info('  Running ${suite.name} (${suite.iterations} iterations)...');

    const result = await runBenchmark(suite);
    saveResult(result);
    results.push(result);

    const opsFormatted = formatOps(result.ops);
    const memFormatted = formatMemory(result.memUsageMb * 1_048_576);
    const line = `  ${suite.name.padEnd(15)} ${opsFormatted.padEnd(20)} ${result.durationMs.toFixed(0).padStart(6)}ms total  ${memFormatted.padStart(8)}`;

    if (compareMode) {
      const baseline = loadBaseline(suite.name);
      if (baseline) {
        const diff = ((result.ops - baseline.ops) / baseline.ops) * 100;
        const sign = diff >= 0 ? '+' : '';
        const trend = diff > 5 ? '↑' : diff < -5 ? '↓' : '→';
        logger.info('${line}  ${trend} ${sign}${diff.toFixed(1)}% vs baseline');
      } else {
        logger.info('${line}  (no baseline)');
      }
    } else {
      logger.info(line);
    }
  }

  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
  logger.info('\n  Total: ${results.length} benchmarks in ${totalDuration.toFixed(0)}ms');
  logger.info('  Results saved to: ${RESULTS_DIR}\n');

  if (args.includes('--json')) {
    console.log(JSON.stringify(results, null, 2));
  }
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
