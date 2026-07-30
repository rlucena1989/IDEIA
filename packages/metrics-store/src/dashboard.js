"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsDashboard = void 0;
exports.createMetricsDashboard = createMetricsDashboard;
class MetricsDashboard {
    state;
    refreshTimers = new Map();
    constructor() {
        this.state = {
            widgets: this.getDefaultWidgets(),
            lastRefresh: new Date().toISOString(),
            isRefreshing: false,
        };
    }
    getDefaultWidgets() {
        return [
            {
                id: 'agent-activity',
                title: 'Agent Activity',
                type: 'chart',
                position: { x: 0, y: 0, w: 6, h: 4 },
                refreshInterval: 30000,
                config: {
                    type: 'line',
                    title: 'Agent Requests per Minute',
                    xAxis: 'Time',
                    yAxis: 'Requests',
                    series: [
                        {
                            name: 'Analyst',
                            data: this.generateMockData('analyst'),
                            color: '#3b82f6',
                        },
                        {
                            name: 'Programmer',
                            data: this.generateMockData('programmer'),
                            color: '#10b981',
                        },
                        {
                            name: 'Reviewer',
                            data: this.generateMockData('reviewer'),
                            color: '#f59e0b',
                        },
                    ],
                    showLegend: true,
                    showGrid: true,
                },
            },
            {
                id: 'code-quality',
                title: 'Code Quality Trends',
                type: 'chart',
                position: { x: 6, y: 0, w: 6, h: 4 },
                refreshInterval: 60000,
                config: {
                    type: 'area',
                    title: 'Test Coverage Over Time',
                    xAxis: 'Date',
                    yAxis: 'Coverage %',
                    series: [
                        {
                            name: 'Coverage',
                            data: this.generateMockData('coverage'),
                            color: '#8b5cf6',
                        },
                    ],
                    showLegend: false,
                    showGrid: true,
                },
            },
            {
                id: 'performance',
                title: 'Performance Metrics',
                type: 'chart',
                position: { x: 0, y: 4, w: 6, h: 4 },
                refreshInterval: 30000,
                config: {
                    type: 'bar',
                    title: 'Response Time by Service',
                    xAxis: 'Service',
                    yAxis: 'Time (ms)',
                    series: [
                        {
                            name: 'Response Time',
                            data: this.generateMockData('performance'),
                            color: '#ef4444',
                        },
                    ],
                    showLegend: false,
                    showGrid: true,
                },
            },
            {
                id: 'resource-usage',
                title: 'Resource Usage',
                type: 'chart',
                position: { x: 6, y: 4, w: 6, h: 4 },
                refreshInterval: 15000,
                config: {
                    type: 'line',
                    title: 'CPU & Memory Usage',
                    xAxis: 'Time',
                    yAxis: 'Usage %',
                    series: [
                        {
                            name: 'CPU',
                            data: this.generateMockData('cpu'),
                            color: '#06b6d4',
                        },
                        {
                            name: 'Memory',
                            data: this.generateMockData('memory'),
                            color: '#ec4899',
                        },
                    ],
                    showLegend: true,
                    showGrid: true,
                },
            },
        ];
    }
    generateMockData(type) {
        const data = [];
        const now = Date.now();
        const points = 20;
        for (let i = 0; i < points; i++) {
            const timestamp = new Date(now - (points - i) * 60000).toISOString();
            let value;
            switch (type) {
                case 'analyst':
                    value = Math.floor(Math.random() * 50) + 10;
                    break;
                case 'programmer':
                    value = Math.floor(Math.random() * 80) + 20;
                    break;
                case 'reviewer':
                    value = Math.floor(Math.random() * 40) + 5;
                    break;
                case 'coverage':
                    value = 70 + Math.random() * 25;
                    break;
                case 'performance':
                    value = Math.floor(Math.random() * 500) + 100;
                    break;
                case 'cpu':
                    value = Math.floor(Math.random() * 60) + 20;
                    break;
                case 'memory':
                    value = Math.floor(Math.random() * 50) + 30;
                    break;
                default:
                    value = Math.random() * 100;
            }
            data.push({ timestamp, value });
        }
        return data;
    }
    addWidget(widget) {
        this.state.widgets.push(widget);
    }
    removeWidget(widgetId) {
        this.state.widgets = this.state.widgets.filter(w => w.id !== widgetId);
        this.stopWidgetRefresh(widgetId);
    }
    updateWidget(widgetId, updates) {
        const widget = this.state.widgets.find(w => w.id === widgetId);
        if (widget) {
            Object.assign(widget, updates);
        }
    }
    getWidget(widgetId) {
        return this.state.widgets.find(w => w.id === widgetId);
    }
    getAllWidgets() {
        return [...this.state.widgets];
    }
    startAutoRefresh() {
        for (const widget of this.state.widgets) {
            if (widget.refreshInterval) {
                this.startWidgetRefresh(widget);
            }
        }
    }
    stopAutoRefresh() {
        for (const widget of this.state.widgets) {
            this.stopWidgetRefresh(widget.id);
        }
    }
    startWidgetRefresh(widget) {
        if (!widget.refreshInterval)
            return;
        this.stopWidgetRefresh(widget.id);
        const timer = setInterval(() => {
            this.refreshWidget(widget.id);
        }, widget.refreshInterval);
        this.refreshTimers.set(widget.id, timer);
    }
    stopWidgetRefresh(widgetId) {
        const timer = this.refreshTimers.get(widgetId);
        if (timer) {
            clearInterval(timer);
            this.refreshTimers.delete(widgetId);
        }
    }
    refreshWidget(widgetId) {
        const widget = this.state.widgets.find(w => w.id === widgetId);
        if (!widget || widget.type !== 'chart')
            return;
        const chartConfig = widget.config;
        for (const series of chartConfig.series) {
            const lastValue = series.data[series.data.length - 1]?.value || 0;
            const newValue = Math.max(0, lastValue + (Math.random() - 0.5) * 20);
            series.data.push({
                timestamp: new Date().toISOString(),
                value: newValue,
            });
            if (series.data.length > 50) {
                series.data.shift();
            }
        }
        this.state.lastRefresh = new Date().toISOString();
    }
    refreshAll() {
        for (const widget of this.state.widgets) {
            this.refreshWidget(widget.id);
        }
    }
    destroy() {
        this.stopAutoRefresh();
        this.state.widgets = [];
        this.state.isRefreshing = false;
    }
    getState() {
        return {
            widgets: [...this.state.widgets],
            lastRefresh: this.state.lastRefresh,
            isRefreshing: this.state.isRefreshing,
        };
    }
    getAggregatedCharts() {
        return this.state.widgets
            .filter(w => w.type === 'chart')
            .map(w => w.config);
    }
    getChartTypeOptions() {
        return [
            { value: 'line', label: 'Line Chart', description: 'Show trends over time' },
            { value: 'bar', label: 'Bar Chart', description: 'Compare values across categories' },
            { value: 'area', label: 'Area Chart', description: 'Emphasize magnitude of change' },
            { value: 'pie', label: 'Pie Chart', description: 'Show proportion distribution' },
        ];
    }
    exportConfig() {
        return JSON.stringify(this.state.widgets, null, 2);
    }
    importConfig(configJson) {
        try {
            const widgets = JSON.parse(configJson);
            this.state.widgets = widgets;
            this.startAutoRefresh();
        }
        catch (_err) {
            throw new Error(`Invalid dashboard config`);
        }
    }
}
exports.MetricsDashboard = MetricsDashboard;
function createMetricsDashboard() {
    return new MetricsDashboard();
}
//# sourceMappingURL=dashboard.js.map