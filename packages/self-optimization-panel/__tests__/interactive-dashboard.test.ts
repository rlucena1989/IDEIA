import { DashboardService } from '../src/dashboard-service';
import { InteractiveDashboard } from '../src/interactive-dashboard';

describe('InteractiveDashboard', () => {
  let dashboard: InteractiveDashboard;
  let service: DashboardService;

  beforeEach(() => {
    service = new DashboardService();
    dashboard = new InteractiveDashboard(service);
  });

  it('refreshes and returns widgets', async () => {
    const widgets = await dashboard.refresh();
    expect(widgets.length).toBeGreaterThanOrEqual(4);
    expect(widgets.some(w => w.type === 'health')).toBe(true);
    expect(widgets.some(w => w.type === 'metrics')).toBe(true);
    expect(widgets.some(w => w.type === 'chart')).toBe(true);
    expect(widgets.some(w => w.type === 'activity')).toBe(true);
  });

  it('sets time range', () => {
    dashboard.setTimeRange('7d');
    const state = dashboard.getState();
    expect(state.timeRange).toBe('7d');
  });

  it('starts and stops auto-refresh', () => {
    dashboard.startAutoRefresh(60000);
    dashboard.stopAutoRefresh();
    expect(dashboard.getWidgets()).toBeDefined();
  });

  it('manages layout', () => {
    const layout = [{ widgetId: 'health', row: 0, col: 0, width: 2, height: 1 }];
    dashboard.updateLayout(layout);
    expect(dashboard.getLayout()).toEqual(layout);
  });

  it('returns health widget with correct data', async () => {
    const widgets = await dashboard.refresh();
    const health = widgets.find(w => w.id === 'system-health');
    expect(health).toBeDefined();
    const data = health!.data as Record<string, unknown>;
    expect(typeof data.overall).toBe('number');
    expect(['improving', 'worsening', 'stable']).toContain(data.trend);
  });

  it('returns metrics widget with key metrics', async () => {
    const widgets = await dashboard.refresh();
    const metrics = widgets.find(w => w.id === 'metrics-summary');
    expect(metrics).toBeDefined();
    const data = metrics!.data as Record<string, unknown>;
    expect(typeof data.coverage).toBe('number');
    expect(typeof data.openGaps).toBe('number');
  });

  it('returns evolution chart with series', async () => {
    const widgets = await dashboard.refresh();
    const chart = widgets.find(w => w.id === 'evolution-chart');
    expect(chart).toBeDefined();
    const data = chart!.data as { series: unknown[] };
    expect(data.series.length).toBeGreaterThanOrEqual(1);
  });
});
