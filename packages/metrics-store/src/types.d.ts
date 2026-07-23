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
//# sourceMappingURL=types.d.ts.map