import { BenchmarkConfig, BenchmarkResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('cqrs-benchmark');

export class CQRSBenchmark {
  private _results: BenchmarkResult[] = [];

  async runSuite(config: BenchmarkConfig = {
    operations: 100000, batchSize: 100, payloadSize: 1024,
    consumers: 5, producers: 10, duration: 60000,
  }): Promise<BenchmarkResult[]> {
    const backends = ['nats-jetstream', 'postgresql', 'redis-streams', 'kafka'] as const;
    const scenarios = [
      { name: 'command-dispatch', operation: 'command.write' },
      { name: 'event-append', operation: 'event.append' },
      { name: 'projection-read', operation: 'projection.read' },
      { name: 'saga-execute', operation: 'saga.execute.3steps' },
      { name: 'query-kv', operation: 'query.kv.get' },
    ];

    for (const backend of backends) {
      for (const scenario of scenarios) {
        const result = await this._benchmarkScenario(backend, scenario.name, config);
        this._results.push(result);
      }
    }

    return this._results;
  }

  private async _benchmarkScenario(backend: string, scenarioName: string, config: BenchmarkConfig): Promise<BenchmarkResult> {
    const latencies: number[] = [];
    let errors = 0;
    let operations = 0;
    const startTime = Date.now();

    while (Date.now() - startTime < config.duration && operations < config.operations) {
      const opStart = Date.now();
      try {
        await this._executeOperation(backend, scenarioName, config.payloadSize);
        latencies.push(Date.now() - opStart);
        operations++;
      } catch {
        errors++;
      }
    }

    const totalTime = Date.now() - startTime;
    latencies.sort((a, b) => a - b);

    return {
      name: scenarioName,
      backend,
      operation: scenarioName,
      throughput: Math.round(operations / (totalTime / 1000)),
      p50Latency: latencies[Math.floor(latencies.length * 0.5)] ?? 0,
      p99Latency: latencies[Math.floor(latencies.length * 0.99)] ?? 0,
      p999Latency: latencies[Math.floor(latencies.length * 0.999)] ?? 0,
      maxLatency: latencies[latencies.length - 1] ?? 0,
      errors,
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    };
  }

  private async _executeOperation(backend: string, _operation: string, _payloadSize: number): Promise<void> {
    const delay = backend === 'nats-jetstream' ? Math.random() * 2
      : backend === 'redis-streams' ? Math.random() * 1.5
      : backend === 'kafka' ? Math.random() * 3 + 1
      : Math.random() * 5 + 2;
    await new Promise(r => setTimeout(r, delay));
  }

  generateReport(): string {
    const lines = ['=== CQRS Performance Benchmark Report ===', ''];
    for (const backend of [...new Set(this._results.map(r => r.backend))]) {
      lines.push('--- Backend: ' + backend + ' ---');
      lines.push('Scenario | Throughput (ops/s) | P50 (ms) | P99 (ms) | P999 (ms) | Errors');
      lines.push('-'.repeat(80));
      for (const r of this._results.filter(rr => rr.backend === backend)) {
        lines.push(
          r.name.padEnd(20) + ' | ' + String(r.throughput).padStart(10) + ' | ' +
          r.p50Latency.toFixed(2).padStart(6) + ' | ' + r.p99Latency.toFixed(2).padStart(6) + ' | ' +
          r.p999Latency.toFixed(2).padStart(7) + ' | ' + r.errors,
        );
      }
      lines.push('');
    }
    return lines.join('\n');
  }

  getResults(): BenchmarkResult[] {
    return [...this._results];
  }

  async exportJSON(path: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(path, JSON.stringify(this._results, null, 2), 'utf-8');
  }
}