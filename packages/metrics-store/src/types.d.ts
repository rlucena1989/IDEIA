export interface MetricEntry {
    key: string;
    value: number;
    tags?: Record<string, string>;
    timestamp: number;
}
export interface MetricQuery {
    category: string;
    from?: number;
    to?: number;
}
export interface MetricsSummary {
    totalEntries: number;
    categories: Record<string, number>;
    oldestEntry: number;
    newestEntry: number;
    storagePath: string;
}
export interface TrendResult {
    category: string;
    key: string;
    values: number[];
    timestamps: number[];
    min: number;
    max: number;
    avg: number;
    slope: number;
}
export type AggregationType = 'avg' | 'max' | 'min' | 'p95' | 'sum' | 'count';
export interface AggregateResult {
    name: string;
    from: number;
    to: number;
    aggregation: AggregationType;
    value: number;
    count: number;
}
export interface MetricsBackend {
    record(category: string, key: string, value: number, tags?: Record<string, string>): Promise<void>;
    query(category: string, from?: number, to?: number): Promise<MetricEntry[]>;
    queryMetrics(name: string, from: number, to: number, aggregation: AggregationType): Promise<AggregateResult>;
    prune(olderThan: number): Promise<number>;
    close(): Promise<void>;
    listCategories?(): Promise<string[]>;
    getTotalMetrics?(): Promise<number>;
}
export interface DashboardMetricCard {
    label: string;
    value: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
    unit?: string;
}
//# sourceMappingURL=types.d.ts.map