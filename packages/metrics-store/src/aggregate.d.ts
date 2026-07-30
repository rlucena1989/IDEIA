import { MetricsBackend, AggregationType, AggregateResult } from './types';
export declare class AggregateEngine {
    private logger;
    queryMetrics(backend: MetricsBackend, name: string, from: number, to: number, aggregation: AggregationType): Promise<AggregateResult>;
    queryMultiple(backend: MetricsBackend, queries: Array<{
        name: string;
        from: number;
        to: number;
        aggregation: AggregationType;
    }>): Promise<AggregateResult[]>;
    aggregateValues(values: number[], type: AggregationType): number;
}
//# sourceMappingURL=aggregate.d.ts.map