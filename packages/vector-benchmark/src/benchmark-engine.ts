import { createLogger } from '@ideia/logger';
import { BenchmarkResult, BenchmarkConfig, IndexConfig, BenchmarkSuite, VectorPoint, SearchQuery } from './types';

const logger = createLogger('benchmark-engine');

export class BenchmarkEngine {
  run(suite: BenchmarkSuite): BenchmarkResult[] {
    const results: BenchmarkResult[] = [];
    for (const config of suite.configs) {
      const result = this.runSingle(config, suite.data, suite.queries);
      results.push(result);
    }
    logger.info(`Benchmark suite complete`, { name: suite.name, results: results.length });
    return results;
  }

  private runSingle(config: any, data: VectorPoint[], queries: SearchQuery[]): BenchmarkResult {
    const buildStart = Date.now();
    const index = this.buildIndex(config, data);
    const buildTimeMs = Date.now() - buildStart;

    const latencies: number[] = [];
    let correct = 0;

    for (const query of queries) {
      const start = Date.now();
      const results = this.search(index, query);
      latencies.push(Date.now() - start);
      if (results.length > 0) correct++;
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / Math.max(latencies.length, 1);

    return {
      algorithm: config.type as any,
      dimension: config.dimensions,
      datasetSize: data.length,
      buildTime: buildTimeMs,
      buildTimeUnit: 'ms',
      memoryMB: Math.round((data.length * config.dimensions * 4) / 1024 / 1024) as any,
      indexSizeMB: 0,
      queryLatency: {
        p50,
        p95,
        p99,
        avg: avgLatency,
        min: latencies.length > 0 ? latencies[0] : 0,
        max: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
      },
      indexType: config.type,
      recall: {},
      throughput: avgLatency > 0 ? Math.round(1000 / avgLatency) : 0,
      params: {},
      timestamp: new Date(),
    };
  }

  private buildIndex(config: any, data: VectorPoint[]): number[][] {
    return data.map((d) => d.vector);
  }

  private search(index: number[][], query: SearchQuery): number[] {
    const scores = index.map((vec, i) => ({ i, score: this.cosineSimilarity(query.vector, vec) }));
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, query.topK)
      .map((s) => s.i);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0,
      na = 0,
      nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
  }
}
