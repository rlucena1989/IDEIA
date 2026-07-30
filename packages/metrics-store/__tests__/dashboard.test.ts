import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { MetricsDashboard, createMetricsDashboard, DashboardWidget } from '../src/dashboard';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

describe('MetricsDashboard', () => {
  let dashboard: MetricsDashboard;

  beforeEach(() => {
    dashboard = new MetricsDashboard();
  });

  it('initializes with default widgets', () => {
    const state = dashboard.getState();
    expect(state.widgets.length).toBeGreaterThan(0);
    expect(state.isRefreshing).toBe(false);
    expect(state.lastRefresh).toBeDefined();
  });

  it('adds a new widget', () => {
    const widget: DashboardWidget = {
      id: 'custom-widget',
      title: 'Custom Metric',
      type: 'metric',
      config: { label: 'Test', value: 42, unit: '%' },
      position: { x: 0, y: 8, w: 3, h: 2 },
    };

    dashboard.addWidget(widget);
    const retrieved = dashboard.getWidget('custom-widget');
    expect(retrieved).toBeDefined();
    expect(retrieved!.title).toBe('Custom Metric');
  });

  it('removes a widget by id', () => {
    const initialCount = dashboard.getAllWidgets().length;
    dashboard.removeWidget('agent-activity');
    expect(dashboard.getAllWidgets().length).toBe(initialCount - 1);
    expect(dashboard.getWidget('agent-activity')).toBeUndefined();
  });

  it('updates an existing widget', () => {
    dashboard.updateWidget('agent-activity', { title: 'Updated Activity' });
    const widget = dashboard.getWidget('agent-activity');
    expect(widget!.title).toBe('Updated Activity');
  });

  it('does nothing when updating non-existent widget', () => {
    expect(() => dashboard.updateWidget('nonexistent', { title: 'New' })).not.toThrow();
  });

  it('starts and stops auto refresh', () => {
    dashboard.startAutoRefresh();
    dashboard.stopAutoRefresh();
    const state = dashboard.getState();
    expect(state.lastRefresh).toBeDefined();
  });

  it('refreshAll updates all widgets', () => {
    dashboard.refreshAll();
    const state = dashboard.getState();
    expect(state.lastRefresh).toBeDefined();
  });

  it('returns clone of all widgets from getAllWidgets', () => {
    const widgets = dashboard.getAllWidgets();
    widgets.pop();
    expect(dashboard.getAllWidgets().length).toBeGreaterThan(widgets.length);
  });

  it('exports config as JSON string', () => {
    const config = dashboard.exportConfig();
    expect(typeof config).toBe('string');
    const parsed = JSON.parse(config);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('imports config from JSON string', () => {
    const newWidget: DashboardWidget = {
      id: 'imported',
      title: 'Imported Widget',
      type: 'status',
      config: {
        items: [{ name: 'Service', status: 'healthy', lastUpdated: new Date().toISOString() }],
      },
      position: { x: 0, y: 0, w: 6, h: 3 },
    };
    const imported = [newWidget];
    dashboard.importConfig(JSON.stringify(imported));
    expect(dashboard.getWidget('imported')).toBeDefined();
    expect(dashboard.getAllWidgets().length).toBe(1);
  });

  it('throws on invalid import JSON', () => {
    expect(() => dashboard.importConfig('invalid json')).toThrow();
  });

  it('createMetricsDashboard factory works', () => {
    const d = createMetricsDashboard();
    expect(d).toBeInstanceOf(MetricsDashboard);
  });
});
