import { EventBus } from '../src/event-bus';
import { createLogger } from '@ideia/logger';
const logger = createLogger('benchmark');

function createBenchmarkEvent(size: 'small' | 'medium' | 'large' = 'small') {
  const payload = size === 'small' ? { msg: 'hello' }
    : size === 'medium' ? { msg: 'x'.repeat(1000), data: Array.from({ length: 10 }, (_, i) => ({ id: i, val: 'x'.repeat(100) })) }
    : { msg: 'x'.repeat(10000), data: Array.from({ length: 100 }, (_, i) => ({ id: i, val: 'x'.repeat(100) })) };
  return { type: 'benchmark', source: 'benchmark', payload };
}

interface BenchmarkResult {
  events: number;
  totalTimeMs: number;
  throughput: number;
  avgLatencyUs: number;
  p50Us: number;
  p95Us: number;
  p99Us: number;
}

function benchmark(bus: EventBus, eventCount: number, subscriberCount: number, parallel: boolean): BenchmarkResult {
  bus.setParallelDispatch(parallel);

  for (let i = 0; i < subscriberCount; i++) {
    bus.subscribe('benchmark', async () => {});
  }

  const latencies: number[] = [];
  const start = performance.now();

  for (let i = 0; i < eventCount; i++) {
    const evtStart = performance.now();
    bus.emit(createBenchmarkEvent('small'));
    latencies.push((performance.now() - evtStart) * 1000);
  }

  const totalTimeMs = performance.now() - start;
  const sorted = [...latencies].sort((a, b) => a - b);

  return {
    events: eventCount,
    totalTimeMs: Math.round(totalTimeMs * 100) / 100,
    throughput: Math.round(eventCount / (totalTimeMs / 1000)),
    avgLatencyUs: Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length),
    p50Us: Math.round(sorted[Math.floor(sorted.length * 0.5)]!),
    p95Us: Math.round(sorted[Math.floor(sorted.length * 0.95)]!),
    p99Us: Math.round(sorted[Math.floor(sorted.length * 0.99)]!),
  };
}

async function runBenchmarks() {
  logger.info('=== EventBus Benchmark ===\n');

  const scenarios = [
    { events: 1000, subscribers: 1, parallel: true, label: '1K events, 1 sub, parallel' },
    { events: 1000, subscribers: 1, parallel: false, label: '1K events, 1 sub, sequential' },
    { events: 10000, subscribers: 10, parallel: true, label: '10K events, 10 subs, parallel' },
    { events: 10000, subscribers: 10, parallel: false, label: '10K events, 10 subs, sequential' },
    { events: 100000, subscribers: 10, parallel: true, label: '100K events, 10 subs, parallel' },
  ];

  const results: Array<{ label: string } & BenchmarkResult> = [];

  for (const s of scenarios) {
    const bus = new EventBus(100000);
    const result = benchmark(bus, s.events, s.subscribers, s.parallel);
    results.push({ label: s.label, ...result });
    logger.info('${s.label}:');
    logger.info('  Throughput: ${result.throughput} evt/s');
    logger.info('  Avg: ${result.avgLatencyUs}µs | P50: ${result.p50Us}µs | P95: ${result.p95Us}µs | P99: ${result.p99Us}µs');
    logger.info('  Total: ${result.totalTimeMs}ms\n');
  }

  const parallelResult = results[0]!;
  const sequentialResult = results[1]!;
  const speedup = sequentialResult.throughput > 0 ? parallelResult.throughput / sequentialResult.throughput : 1;
  logger.info('--- Parallel vs Sequential Speedup: ${speedup.toFixed(2)}x ---');
  logger.info('--- Max throughput: ${Math.max(...results.map(r => r.throughput))} evt/s ---\n');

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ results, speedup: Math.round(speedup * 100) / 100 }, null, 2));
  }
}

runBenchmarks().catch(console.error);
