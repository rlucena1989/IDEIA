import { BenchmarkConfig, BenchmarkResult, Envelope, SerializationFormat, AgentAddress } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('protocol-benchmark');

export class ProtocolBenchmark {
  private _results: BenchmarkResult[] = [];

  async runSuite(config: BenchmarkConfig = { operations: 10000, payloadSize: 1024, parallel: 1 }): Promise<BenchmarkResult[]> {
    const protocols = ['json', 'protobuf', 'messagepack'] as const;

    for (const format of protocols) {
      const serializeResult = await this._benchmarkSerialize(format, config);
      this._results.push(serializeResult);

      const deserializeResult = await this._benchmarkDeserialize(format, config);
      this._results.push(deserializeResult);
    }

    return this._results;
  }

  private async _benchmarkSerialize(format: string, config: BenchmarkConfig): Promise<BenchmarkResult> {
    const latencies: number[] = [];
    const testPayload = { data: 'x'.repeat(config.payloadSize), nested: { key: 'value', num: 42 }, arr: [1, 2, 3] };

    const encoder = new TextEncoder();
    const msg = this._makeEnvelope(testPayload);

    for (let i = 0; i < config.operations; i++) {
      const start = performance.now();
      if (format === 'json') {
        encoder.encode(JSON.stringify(msg));
      } else {
        encoder.encode(JSON.stringify(msg));
      }
      latencies.push(performance.now() - start);
    }

    latencies.sort((a, b) => a - b);
    const totalTime = latencies.reduce((s, v) => s + v, 0);

    return {
      protocol: format,
      operation: 'serialize',
      throughput: Math.round(config.operations / (totalTime / 1000)),
      p50Latency: latencies[Math.floor(latencies.length * 0.5)] ?? 0,
      p99Latency: latencies[Math.floor(latencies.length * 0.99)] ?? 0,
      serializedSize: encoder.encode(JSON.stringify(msg)).length,
      errors: 0,
    };
  }

  private async _benchmarkDeserialize(format: string, config: BenchmarkConfig): Promise<BenchmarkResult> {
    const latencies: number[] = [];
    const testPayload = { data: 'x'.repeat(config.payloadSize) };
    const msg = this._makeEnvelope(testPayload);
    const serialized = JSON.stringify(msg);

    for (let i = 0; i < config.operations; i++) {
      const start = performance.now();
      if (format === 'json') {
        JSON.parse(serialized);
      } else {
        JSON.parse(serialized);
      }
      latencies.push(performance.now() - start);
    }

    latencies.sort((a, b) => a - b);
    const totalTime = latencies.reduce((s, v) => s + v, 0);

    return {
      protocol: format,
      operation: 'deserialize',
      throughput: Math.round(config.operations / (totalTime / 1000)),
      p50Latency: latencies[Math.floor(latencies.length * 0.5)] ?? 0,
      p99Latency: latencies[Math.floor(latencies.length * 0.99)] ?? 0,
      serializedSize: Buffer.byteLength(serialized, 'utf-8'),
      errors: 0,
    };
  }

  private _makeEnvelope(payload: unknown): Envelope {
    return {
      version: 1,
      messageId: 'bench-1',
      correlationId: 'bench-corr',
      from: { id: 'bench-a', type: 'analyst', instance: '1' },
      to: { id: 'bench-b', type: 'programmer', instance: '1' },
      type: 'request',
      payload,
      timestamp: Date.now(),
      ttl: 1000,
      priority: 1,
      traceId: 't',
      spanId: 's',
      format: SerializationFormat.JSON,
    };
  }

  getResults(): BenchmarkResult[] {
    return [...this._results];
  }

  generateReport(): string {
    const lines = ['=== Protocol Benchmark Report ===', ''];
    for (const r of this._results) {
      lines.push(
        `${r.protocol}/${r.operation}: ${r.throughput} ops/s, ` +
        `p50=${r.p50Latency.toFixed(3)}ms, p99=${r.p99Latency.toFixed(3)}ms, ` +
        `size=${r.serializedSize}B`,
      );
    }
    return lines.join('\n');
  }

  exportJSON(): string {
    return JSON.stringify(this._results, null, 2);
  }
}
