import { MetricsStore } from '@ideia/metrics-store';
import { ControlTower } from '@ideia/control-tower';
import { DashboardService } from './dashboard-service';
import { HealthData, MetricsSummary, EvolutionDataPoint, ActivityEntry, DashboardWidget, MetricCard } from './types';

import { createLogger } from '@ideia/logger';

export type RenderWidget = (widget: DashboardWidget) => string;

export interface ChartSeries {
  label: string;
  data: Array<{ timestamp: string; value: number }>;
  color: string;
}

export interface InteractiveDashboardState {
  widgets: DashboardWidget[];
  layout: Array<{ widgetId: string; row: number; col: number; width: number; height: number }>;
  refreshIntervalMs: number;
  timeRange: '1h' | '24h' | '7d' | '30d' | 'all';
}

const log = createLogger('self-optimization-panel:interactive-dashboard');

export class InteractiveDashboard {
  private dashboardService: DashboardService;
  private metricsStore?: MetricsStore;
  private controlTower?: ControlTower;
  private state: InteractiveDashboardState;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    dashboardService: DashboardService,
    metricsStore?: MetricsStore,
    controlTower?: ControlTower,
  ) {
    this.dashboardService = dashboardService;
    this.metricsStore = metricsStore;
    this.controlTower = controlTower;
    this.state = {
      widgets: [],
      layout: [],
      refreshIntervalMs: 30000,
      timeRange: '24h',
    };
  }

  setTimeRange(range: InteractiveDashboardState['timeRange']): void {
    this.state.timeRange = range;
  }

  addWidget(widget: DashboardWidget): void {
    this.state.widgets.push(widget);
    this.state.layout.push({
      widgetId: widget.id,
      row: this.state.layout.length,
      col: 0,
      width: widget.size === 'full' ? 12 : widget.size === 'large' ? 8 : widget.size === 'medium' ? 6 : 4,
      height: 2,
    });
  }

  removeWidget(widgetId: string): void {
    this.state.widgets = this.state.widgets.filter(w => w.id !== widgetId);
    this.state.layout = this.state.layout.filter(l => l.widgetId !== widgetId);
  }

  updateWidget(widgetId: string, updates: Partial<DashboardWidget>): void {
    const widget = this.state.widgets.find(w => w.id === widgetId);
    if (widget) Object.assign(widget, updates);
  }

  reorderWidget(widgetId: string, row: number, col: number): void {
    const item = this.state.layout.find(l => l.widgetId === widgetId);
    if (item) {
      item.row = row;
      item.col = col;
    }
  }

  async refresh(): Promise<DashboardWidget[]> {
    const health = this.dashboardService.getHealth();
    const metrics = this.dashboardService.getMetrics();
    const evolution = this.dashboardService.getEvolutionData();
    const activity = this.dashboardService.getRecentActivity();
    const healthScore = this.dashboardService.calculateHealthScore();
    const panelMetrics = this.dashboardService.getPanelMetrics();
    const autonomyCard = this.dashboardService.getAutonomyLevelCard();

    const widgets: DashboardWidget[] = [
      this.createHealthWidget(health),
      this.createMetricsWidget(metrics),
      this.createEvolutionChart(evolution),
      this.createActivityWidget(activity),
      {
        id: 'health-score',
        type: 'health',
        title: 'Health Score',
        size: 'small',
        data: { value: healthScore, label: healthScore >= 80 ? 'Good' : healthScore >= 60 ? 'Fair' : 'Needs Attention' },
        category: 'system',
        trend: health.trend,
      },
      {
        id: 'autonomy-level',
        type: 'autonomy',
        title: `Autonomy: ${autonomyCard.current}`,
        size: 'small',
        data: autonomyCard,
        category: 'evolution',
        sparklineData: [autonomyCard.progress],
      },
      {
        id: 'panel-metrics',
        type: 'metrics',
        title: 'Project Metrics',
        size: 'medium',
        data: { cards: panelMetrics },
        category: 'metrics',
      },
    ];

    const controlTowerStatus = this.controlTower?.getStatus();
    if (controlTowerStatus) {
      widgets.push({
        id: 'control-status',
        type: 'health',
        title: 'Control Tower Status',
        size: 'small',
        data: controlTowerStatus,
        category: 'system',
      });
    }

    this.state.widgets = widgets;
    return widgets;
  }

  startAutoRefresh(intervalMs?: number): void {
    if (this.refreshTimer) return;
    const ms = intervalMs ?? this.state.refreshIntervalMs;
    this.refreshTimer = setInterval(() => {
      this.refresh().catch(err => log.error('Dashboard auto-refresh failed', err));
    }, ms);
  }

  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  getWidgets(): DashboardWidget[] {
    return [...this.state.widgets];
  }

  getLayout(): InteractiveDashboardState['layout'] {
    return [...this.state.layout];
  }

  updateLayout(layout: InteractiveDashboardState['layout']): void {
    this.state.layout = layout;
  }

  getState(): InteractiveDashboardState {
    return { ...this.state };
  }

  private createHealthWidget(health: HealthData): DashboardWidget {
    return {
      id: 'system-health',
      type: 'health',
      title: 'System Health',
      size: 'medium',
      data: {
        overall: health.overall,
        trend: health.trend,
        categories: health.categories,
        label: health.overall >= 80 ? 'Good' : health.overall >= 60 ? 'Fair' : 'Needs Attention',
        color: health.overall >= 80 ? 'green' : health.overall >= 60 ? 'yellow' : 'red',
      },
      category: 'system',
      trend: health.trend,
    };
  }

  private createMetricsWidget(metrics: MetricsSummary): DashboardWidget {
    return {
      id: 'metrics-summary',
      type: 'metrics',
      title: 'Key Metrics',
      size: 'medium',
      data: {
        openGaps: metrics.gapCount.open,
        resolvedGaps: metrics.gapCount.resolved,
        coverage: metrics.testCoverage,
        llmResponse: metrics.llmResponseTimeMs,
        autoCorrections: metrics.autoCorrectionCount,
      },
    };
  }

  getChartTypes(): string[] {
    return ['line', 'bar', 'pie', 'area', 'doughnut'];
  }

  toChartJsConfig(widget: DashboardWidget): Record<string, unknown> {
    const data = widget.data as { series?: ChartSeries[]; labels?: string[]; values?: number[] } | undefined;
    if (!data) return {};
    if (widget.type === 'chart' && (widget.title === 'Category Distribution' || widget.title?.includes('Distribution'))) {
      const labels = data.series?.[0]?.data.map(d => d.timestamp) ?? data.labels ?? [];
      const values = data.series?.[0]?.data.map(d => d.value) ?? data.values ?? [];
      return {
        type: 'pie',
        data: { labels, datasets: [{ data: values, backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'] }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
      };
    }
    if (widget.title?.includes('Comparative')) {
      const labels = data.series?.[0]?.data.map(d => d.timestamp) ?? data.labels ?? [];
      const values = data.series?.[0]?.data.map(d => d.value) ?? data.values ?? [];
      return {
        type: 'bar',
        data: { labels, datasets: [{ label: widget.title, data: values, backgroundColor: '#9C27B0' }] },
        options: { responsive: true, scales: { y: { beginAtZero: true } } },
      };
    }
    return {};
  }

  getDashboardLayout(): Array<{ widgetId: string; row: number; col: number; width: number; height: number }> {
    return this.state.layout.map(l => ({ ...l }));
  }

  private createEvolutionChart(data: EvolutionDataPoint[]): DashboardWidget {
    const series: ChartSeries[] = [
      {
        label: 'Health',
        data: data.map(d => ({ timestamp: d.timestamp, value: d.health })),
        color: '#4CAF50',
      },
      {
        label: 'Coverage',
        data: data.map(d => ({ timestamp: d.timestamp, value: d.coverage })),
        color: '#2196F3',
      },
    ];

    return {
      id: 'evolution-chart',
      type: 'chart',
      title: 'Evolution Over Time',
      size: 'large',
      data: { series, timeRange: this.state.timeRange },
    };
  }

  private createActivityWidget(activity: ActivityEntry[]): DashboardWidget {
    return {
      id: 'recent-activity',
      type: 'activity',
      title: 'Recent Activity',
      size: 'small',
      data: activity.slice(0, 10),
    };
  }
}
