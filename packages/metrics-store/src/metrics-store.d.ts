import { EventBus } from '@ideia/event-bus';
import { Logger } from '@ideia/logger';
import { MetricEntry, MetricsSummary, TrendResult, MetricsBackend, DashboardMetricCard } from './types';
export declare class MetricsStore {
    private bus;
    private logger;
    private storageDir;
    private cache;
    private ttlMs;
    private backend;
    constructor(bus: EventBus, logger: Logger, options?: {
        storageDir?: string;
        ttlMs?: number;
        backend?: MetricsBackend;
    });
    record(category: string, key: string, value: number, tags?: Record<string, string>): Promise<void>;
    query(category: string, from?: number, to?: number): Promise<MetricEntry[]>;
    getTrend(category: string, key: string, window?: number): Promise<TrendResult>;
    getLatest(category: string): Promise<MetricEntry | undefined>;
    getSummary(): Promise<MetricsSummary>;
    cleanup(): Promise<number>;
    getDashboardMetrics(): Promise<DashboardMetricCard[]>;
    private flushCategory;
    private loadCategory;
}
//# sourceMappingURL=metrics-store.d.ts.map