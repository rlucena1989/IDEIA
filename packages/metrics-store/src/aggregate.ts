import { createLogger } from '@ideia/logger';
import { MetricsBackend, AggregationType, AggregateResult } from './types';

interface AggregationFunction {
  (values: number[]): number;
}

const AGGREGATORS: Record<AggregationType, AggregationFunction> = {
  avg: (values) => values.reduce((a, b) => a + b, 0) / values.length,
  max: (values) => Math.max(...values),
  min: (values) => Math.min(...values),
  sum: (values) => values.reduce((a, b) => a + b, 0),
  count: (values) => values.length,
  p95: (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.ceil(0.95 * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  },
};

export class AggregateEngine {
  private logger = createLogger('aggregate-engine');

  async queryMetrics(
    backend: MetricsBackend,
    name: string,
    from: number,
    to: number,
    aggregation: AggregationType,
  ): Promise<AggregateResult> {
    if (from >= to) {
      this.logger.warn(`Invalid range: from ${from} >= to ${to}`);
      return { name, from, to, aggregation, value: 0, count: 0 };
    }

    return backend.queryMetrics(name, from, to, aggregation);
  }

  async queryMultiple(
    backend: MetricsBackend,
    queries: Array<{ name: string; from: number; to: number; aggregation: AggregationType }>,
  ): Promise<AggregateResult[]> {
    const results = await Promise.all(
      queries.map(q => this.queryMetrics(backend, q.name, q.from, q.to, q.aggregation))
    );
    return results;
  }

  aggregateValues(values: number[], type: AggregationType): number {
    const fn = AGGREGATORS[type];
    if (!fn) {
      throw new Error(`Unknown aggregation type: ${type}`);
    }
    return fn(values);
  }
}
