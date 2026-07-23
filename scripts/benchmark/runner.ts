/**
 * benchmark/runner.ts — Benchmark runner
 *
 * Usage: npx tsx scripts/benchmark/runner.ts
 *
 * Adicione novos benchmarks em scripts/benchmark/<nome>.bench.ts
 * e importe-os aqui. Cada benchmark usa `tinybench` (Bench + Task).
 */

import { Bench } from 'tinybench';
import { auditTrailBench } from './audit-trail.bench';
import { policyBench } from './policy.bench';
import { eventBusBench } from './event-bus.bench';

async function main() {
  console.log('\n\x1b[1mIDEIA Benchmark Suite\x1b[0m\n');
  console.log(`Started: ${new Date().toISOString()}\n`);

  const suites = [
    { name: 'Audit Trail', bench: auditTrailBench },
    { name: 'Policy Engine', bench: policyBench },
    { name: 'Event Bus', bench: eventBusBench },
  ];

  for (const suite of suites) {
    console.log(`\x1b[36m═══ ${suite.name} ═══\x1b[0m`);
    const bench = new Bench({ time: 1000, iterations: 100 });
    suite.bench(bench);
    await bench.run();
    console.table(
      bench.tasks.map(t => ({
        name: t.name,
        'ops/sec': Math.round(t.result?.hz || 0).toLocaleString(),
        'margin (%)': t.result?.rme?.toFixed(2) || 'N/A',
        'samples': t.result?.samples?.length || 0,
      }))
    );
  }
}

main().catch(console.error);
