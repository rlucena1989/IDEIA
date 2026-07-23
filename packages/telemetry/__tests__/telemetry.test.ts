import { HealthAggregator, getHealthAggregator, MetricsExporter, getMetricsExporter, SLOMonitor, getSLOMonitor, OpenTelemetry } from '../src/index';

describe('telemetry', () => {
  test('HealthAggregator can be constructed', () => {
    const h = new HealthAggregator();
    expect(h).toBeDefined();
  });

  test('getHealthAggregator returns instance', () => {
    const h = getHealthAggregator();
    expect(h).toBeDefined();
  });

  test('MetricsExporter can be constructed', () => {
    const m = new MetricsExporter();
    expect(m).toBeDefined();
  });

  test('getMetricsExporter returns instance', () => {
    const m = getMetricsExporter();
    expect(m).toBeDefined();
  });

  test('SLOMonitor can be constructed', () => {
    const s = new SLOMonitor();
    expect(s).toBeDefined();
  });

  test('OpenTelemetry can be constructed', () => {
    const o = new OpenTelemetry();
    expect(o).toBeDefined();
  });
});
