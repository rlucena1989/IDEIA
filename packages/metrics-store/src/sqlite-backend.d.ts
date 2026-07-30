import { MetricEntry, AggregateResult, AggregationType, MetricsBackend } from './types';
export declare class SqliteBackend implements MetricsBackend {
    private storageDir;
    private cache;
    private logger;
    constructor(storageDir?: string);
    record(category: string, key: string, value: number, tags?: Record<string, string>): Promise<void>;
    query(category: string, from?: number, to?: number): Promise<MetricEntry[]>;
    queryMetrics(name: string, from: number, to: number, aggregation: AggregationType): Promise<AggregateResult>;
    prune(olderThan: number): Promise<number>;
    close(): Promise<void>;
    private flushCategory;
    private loadCategory;
    private aggregate;
}
//# sourceMappingURL=sqlite-backend.d.ts.map