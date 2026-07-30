import { MetricEntry, AggregateResult, AggregationType, MetricsBackend } from './types';
export declare class DuckDbBackend implements MetricsBackend {
    private logger;
    private available;
    private db;
    private dbPath;
    constructor(dbPath?: string);
    private initialize;
    isAvailable(): boolean;
    record(category: string, key: string, value: number, tags?: Record<string, string>): Promise<void>;
    query(category: string, from?: number, to?: number): Promise<MetricEntry[]>;
    queryMetrics(name: string, from: number, to: number, aggregation: AggregationType): Promise<AggregateResult>;
    listCategories(): Promise<string[]>;
    getTotalMetrics(): Promise<number>;
    private aggregate;
    private percentile;
    private loadFromDisk;
    private persistToDisk;
}
//# sourceMappingURL=duckdb-backend.d.ts.map