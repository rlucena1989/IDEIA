import { TtftBenchmark } from '../../packages/agent-benchmark/src/ttft-benchmark';
import { TpsBenchmark } from '../../packages/agent-benchmark/src/tps-benchmark';
import { BenchmarkSuite } from '../../packages/agent-benchmark/src/benchmark-suite';

const suite = new BenchmarkSuite({ verbose: true });

async function main() {
  console.log('\n=== Agent Runtime Performance Benchmark ===\n');

  // 1. TTFT — simulated agent execution
  const ttftResult = await suite.runFull('Agent Runtime', {
    ttft: async (_i) => {
      const start = Date.now();
      await new Promise(r => setTimeout(r, 5 + Math.random() * 10));
      const firstTokenMs = Date.now() - start;
      await new Promise(r => setTimeout(r, 10 + Math.random() * 20));
      return { firstTokenMs, totalMs: Date.now() - start, tokens: 20 + Math.floor(Math.random() * 30) };
    },
    tps: async () => {
      await new Promise(r => setTimeout(r, 1));
    },
    memorySetup: () => {
      globalThis.__benchData = Array.from({ length: 10000 }, (_, i) => ({ id: i, data: 'x'.repeat(100) }));
    },
    memoryOp: () => {
      const data = (globalThis as unknown as { __benchData?: Array<{ id: number; data: string }> }).__benchData;
      if (data) {
        const filtered = data.filter(d => d.id % 2 === 0).map(d => d.data.toUpperCase());
        void filtered.length;
      }
    },
    hotspotSteps: [
      { name: 'validate-input', fn: async () => { await new Promise(r => setTimeout(r, 2)); } },
      { name: 'process-task', fn: async () => { await new Promise(r => setTimeout(r, 15)); } },
      { name: 'generate-output', fn: async () => { await new Promise(r => setTimeout(r, 8)); } },
      { name: 'save-results', fn: async () => { await new Promise(r => setTimeout(r, 3)); } },
    ],
  });

  console.log('\n--- Full Scorecard ---');
  console.log(JSON.stringify(ttftResult.scorecard, null, 2));
  console.log(`\nOverall Score: ${ttftResult.scorecard.overallScore}/100`);

  // 2. Standalone TTFT benchmark with more detail
  console.log('\n=== TTFT Detail ===');
  const ttftBench = new TtftBenchmark({ iterations: 100, warmup: 10 });
  const ttftReport = await ttftBench.run('LLM Call Simulation', async () => {
    const start = Date.now();
    await new Promise(r => setTimeout(r, 3 + Math.random() * 15));
    const firstTokenMs = Date.now() - start;
    await new Promise(r => setTimeout(r, 5 + Math.random() * 10));
    return { firstTokenMs, totalMs: Date.now() - start, tokens: 30 + Math.floor(Math.random() * 50) };
  });
  console.log(`  Average TTFT: ${ttftReport.avgTtftMs.toFixed(2)}ms`);
  console.log(`  P95 TTFT: ${ttftReport.p95TtftMs.toFixed(2)}ms`);
  console.log(`  P99 TTFT: ${ttftReport.p99TtftMs.toFixed(2)}ms`);
  console.log(`  Avg Tokens/s: ${ttftReport.avgTokensPerSec.toFixed(0)}`);

  // 3. Standalone TPS benchmark
  console.log('\n=== TPS Detail ===');
  const tpsBench = new TpsBenchmark({ iterations: 20, warmup: 5, batchSize: 500 });
  const tpsReport = await tpsBench.run('Event Emit', async () => {
    await new Promise(r => setTimeout(r, 0.5));
  });
  console.log(`  Average TPS: ${tpsReport.avgTps.toFixed(0)}`);
  console.log(`  Peak TPS: ${tpsReport.peakTps.toFixed(0)}`);
  console.log(`  P95 TPS: ${tpsReport.p95Tps.toFixed(0)}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
