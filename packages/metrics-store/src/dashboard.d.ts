export interface ChartDataPoint {
    timestamp: string;
    value: number;
    label?: string;
}
export interface ChartSeries {
    name: string;
    data: ChartDataPoint[];
    color?: string;
}
export interface ChartConfig {
    type: 'line' | 'bar' | 'area' | 'pie';
    title: string;
    xAxis?: string;
    yAxis?: string;
    series: ChartSeries[];
    showLegend?: boolean;
    showGrid?: boolean;
}
export interface DashboardWidget {
    id: string;
    title: string;
    type: 'chart' | 'metric' | 'table' | 'status';
    config: ChartConfig | MetricConfig | TableConfig | StatusConfig;
    position: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    refreshInterval?: number;
}
export interface MetricConfig {
    label: string;
    value: number;
    unit?: string;
    trend?: 'up' | 'down' | 'stable';
    trendValue?: number;
    target?: number;
}
export interface TableConfig {
    columns: Array<{
        key: string;
        label: string;
    }>;
    rows: Array<Record<string, string | number>>;
    sortable?: boolean;
    pagination?: boolean;
}
export interface StatusConfig {
    items: Array<{
        name: string;
        status: 'healthy' | 'warning' | 'error' | 'unknown';
        message?: string;
        lastUpdated: string;
    }>;
}
export interface DashboardState {
    widgets: DashboardWidget[];
    lastRefresh: string;
    isRefreshing: boolean;
}
export declare class MetricsDashboard {
    private state;
    private refreshTimers;
    constructor();
    private getDefaultWidgets;
    private generateMockData;
    addWidget(widget: DashboardWidget): void;
    removeWidget(widgetId: string): void;
    updateWidget(widgetId: string, updates: Partial<DashboardWidget>): void;
    getWidget(widgetId: string): DashboardWidget | undefined;
    getAllWidgets(): DashboardWidget[];
    startAutoRefresh(): void;
    stopAutoRefresh(): void;
    private startWidgetRefresh;
    private stopWidgetRefresh;
    private refreshWidget;
    refreshAll(): void;
    destroy(): void;
    getState(): DashboardState;
    getAggregatedCharts(): ChartConfig[];
    getChartTypeOptions(): Array<{
        value: string;
        label: string;
        description: string;
    }>;
    exportConfig(): string;
    importConfig(configJson: string): void;
}
export declare function createMetricsDashboard(): MetricsDashboard;
//# sourceMappingURL=dashboard.d.ts.map