import { createEventBus } from '../../packages/event-bus/src/event-bus';

async function benchmarkEventBus() {
  const payloads = [1000, 5000, 10000];

  console.log('\n=== EventBus Throughput Benchmark ===\n');

  const results: Array<{ events: number; timeMs: number; eventsPerSec: number; avgLatencyMs: string }> = [];

  for (const count of payloads) {
    const bus = createEventBus(10000);

    const start = Date.now();
    for (let i = 0; i < count; i++) {
      await bus.emit({ type: 'bench.event', source: 'bench', payload: { i, data: 'x'.repeat(50) } });
    }
    const elapsed = Date.now() - start;
    const throughput = Math.round(count / (elapsed / 1000));
    const avgLatency = (elapsed / count).toFixed(3);

    results.push({ events: count, timeMs: elapsed, eventsPerSec: throughput, avgLatencyMs: avgLatency });
    console.log(`  ${String(count).padStart(5)} events → ${String(elapsed).padStart(6)}ms  ${String(throughput).padStart(8)}/s  ${avgLatency}ms avg`);
  }

  console.log('\n--- Summary ---');
  console.table(results);

  const bus = createEventBus(10000);
  for (let i = 0; i < 10000; i++) {
    await bus.emit({ type: 'bench.event', source: 'bench', payload: { i } });
  }
  console.log(`\nHistory size: ${bus.getHistory().length} (should be 10000)`);
  console.log(`Subscriber count: ${bus.subscriberCount()} (should be 0)`);
}

benchmarkEventBus().catch(console.error);
