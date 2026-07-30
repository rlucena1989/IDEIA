import { ObservabilityEngine, createObservabilityEngine } from '../engine';
import { MetricsCollector } from '../metrics-collector';
import { SloMonitor } from '../slo-monitor';
import { PrometheusExporter } from '../prometheus-exporter';
import { AlertManager } from '../alert-manager';
import { NatsMetrics, SLOStatus, Alert } from '../types';

function createSampleMetrics(overrides?: Partial<NatsMetrics>): NatsMetrics {
  return {
    streams: {
      count: 5,
      totalMessages: 75000,
      totalBytes: 25000000,
      streamsWithDiscards: 1,
      averageMessagesPerStream: 15000,
    },
    consumers: {
      count: 12,
      withLag: 3,
      totalPending: 1500,
      avgAckPending: 12.5,
      redeliveryRate: 0.03,
    },
    dlq: {
      size: 375,
      oldestMessageAge: 3600,
      growthRate: 0.5,
      dlqRate: 0.5,
    },
    latency: {
      p50: 12,
      p90: 35,
      p95: 48,
      p99: 65,
      p999: 120,
    },
    throughput: {
      messagesPerSecond: 2500,
      bytesPerSecond: 800000,
    },
    health: {
      healthy: true,
      connected: true,
      reconnects: 0,
      lastError: null,
      uptime: 86400,
    },
    ...overrides,
  };
}

describe('MetricsCollector', () => {
  it('should collect stream metrics correctly', () => {
    const collector = new MetricsCollector({ streamNames: ['a', 'b', 'c'], consumerNames: ['x', 'y'] });
    const metrics = collector.collect();

    expect(metrics.streams.count).toBe(3);
    expect(metrics.streams.totalMessages).toBe(3 * 15000);
    expect(metrics.streams.averageMessagesPerStream).toBe(15000);
    expect(metrics.streams.streamsWithDiscards).toBe(0);
  });

  it('should detect consumer lag', () => {
    const collector = new MetricsCollector({ streamNames: ['a', 'b'], consumerNames: ['x1', 'x2', 'x3', 'x4'] });
    const metrics = collector.collect();

    expect(metrics.consumers.count).toBe(4);
    expect(metrics.consumers.withLag).toBe(1);
    expect(metrics.consumers.totalPending).toBeGreaterThan(0);
  });

  it('should measure latency percentiles', () => {
    const collector = new MetricsCollector();
    const metrics = collector.collect();

    expect(metrics.latency.p50).toBeLessThanOrEqual(metrics.latency.p90);
    expect(metrics.latency.p90).toBeLessThanOrEqual(metrics.latency.p95);
    expect(metrics.latency.p95).toBeLessThanOrEqual(metrics.latency.p99);
    expect(metrics.latency.p99).toBeLessThanOrEqual(metrics.latency.p999);
  });

  it('should report health status', () => {
    const collector = new MetricsCollector();
    const metrics = collector.collect();

    expect(metrics.health.healthy).toBe(true);
    expect(metrics.health.connected).toBe(true);
    expect(metrics.health.reconnects).toBe(0);
    expect(metrics.health.uptime).toBe(86400);
  });

  it('should calculate throughput after second collect', () => {
    const collector = new MetricsCollector();
    const first = collector.collect();
    expect(first.throughput.messagesPerSecond).toBe(0);

    const second = collector.collect();
    expect(second.throughput.messagesPerSecond).toBeGreaterThanOrEqual(0);
  });
});

describe('SloMonitor', () => {
  it('should return compliant SLOs when metrics are within targets', () => {
    const monitor = new SloMonitor();
    const metrics = createSampleMetrics({ latency: { p50: 10, p90: 20, p95: 30, p99: 40, p999: 50 } });
    const results = monitor.checkSLOs(metrics);

    expect(results.length).toBe(5);
    const latencySlo = results.find((s) => s.name === 'latency_p99');
    expect(latencySlo?.compliant).toBe(true);
  });

  it('should detect SLO violation when latency exceeds threshold', () => {
    const monitor = new SloMonitor();
    const metrics = createSampleMetrics({ latency: { p50: 10, p90: 20, p95: 30, p99: 100, p999: 200 } });
    const results = monitor.checkSLOs(metrics);

    const latencySlo = results.find((s) => s.name === 'latency_p99');
    expect(latencySlo?.compliant).toBe(false);
    expect(latencySlo?.actual).toBe(100);
  });

  it('should calculate burn rate correctly', () => {
    const monitor = new SloMonitor();
    const metrics = createSampleMetrics({ latency: { p50: 10, p90: 20, p95: 30, p99: 75, p999: 150 } });
    const results = monitor.checkSLOs(metrics);

    const latencySlo = results.find((s) => s.name === 'latency_p99');
    expect(latencySlo?.burnRate).toBe(1.5);
  });

  it('should mark throughput SLO as non-compliant when below minimum', () => {
    const monitor = new SloMonitor();
    const metrics = createSampleMetrics({ throughput: { messagesPerSecond: 100, bytesPerSecond: 50000 } });
    const results = monitor.checkSLOs(metrics);

    const throughputSlo = results.find((s) => s.name === 'throughput_min');
    expect(throughputSlo?.compliant).toBe(false);
  });
});

describe('PrometheusExporter', () => {
  it('should export metrics in Prometheus text format', () => {
    const exporter = new PrometheusExporter();
    const metrics = createSampleMetrics();
    const output = exporter.formatMetrics(metrics);

    expect(output).toContain('nats_streams_total');
    expect(output).toContain('nats_messages_total');
    expect(output).toContain('nats_latency_p99');
    expect(output).toContain('nats_throughput_msgs_per_sec');
  });

  it('should include quantile labels on latency metrics', () => {
    const exporter = new PrometheusExporter();
    const metrics = createSampleMetrics();
    const output = exporter.formatMetrics(metrics);

    expect(output).toContain('nats_latency_p99{quantile="0.99"}');
    expect(output).toContain('nats_latency_p50{quantile="0.5"}');
  });

  it('should include all metric categories', () => {
    const exporter = new PrometheusExporter();
    const metrics = createSampleMetrics();
    const output = exporter.formatMetrics(metrics);

    expect(output).toContain('nats_streams_total');
    expect(output).toContain('nats_consumers_total');
    expect(output).toContain('nats_dlq_size');
    expect(output).toContain('nats_latency_p99');
    expect(output).toContain('nats_throughput_msgs_per_sec');
    expect(output).toContain('nats_health_healthy');
    expect(output).toContain('nats_uptime_seconds');
  });

  it('should register and output gauges', () => {
    const exporter = new PrometheusExporter();
    exporter.registerGauge('test_gauge', 'A test gauge');
    exporter.setMetric('test_gauge', 42);
    const output = exporter.formatMetrics(createSampleMetrics());

    expect(output).toContain('# HELP test_gauge A test gauge');
    expect(output).toContain('# TYPE test_gauge gauge');
  });

  it('should end with a newline', () => {
    const exporter = new PrometheusExporter();
    const metrics = createSampleMetrics();
    const output = exporter.formatMetrics(metrics);

    expect(output.endsWith('\n')).toBe(true);
  });
});

describe('AlertManager', () => {
  it('should fire alert when latency exceeds threshold', () => {
    const alertManager = new AlertManager();
    const metrics = createSampleMetrics({ latency: { p50: 10, p90: 20, p95: 30, p99: 200, p999: 300 } });
    const alerts = alertManager.evaluateRules(metrics);

    expect(alerts.length).toBeGreaterThan(0);
    const latencyAlert = alerts.find((a) => a.rule === 'latency_p99');
    expect(latencyAlert).toBeDefined();
    expect(latencyAlert?.severity).toBe('critical');
  });

  it('should respect cooldown period', () => {
    const alertManager = new AlertManager();
    const metrics = createSampleMetrics({ latency: { p50: 10, p90: 20, p95: 30, p99: 200, p999: 300 } });

    const firstBatch = alertManager.evaluateRules(metrics);
    expect(firstBatch.length).toBeGreaterThan(0);

    const secondBatch = alertManager.evaluateRules(metrics);
    expect(secondBatch.length).toBe(0);
  });

  it('should acknowledge an alert', () => {
    const alertManager = new AlertManager();
    const metrics = createSampleMetrics({ latency: { p50: 10, p90: 20, p95: 30, p99: 200, p999: 300 } });

    const alerts = alertManager.evaluateRules(metrics);
    expect(alerts.length).toBeGreaterThan(0);

    const acked = alertManager.acknowledgeAlert(alerts[0].id);
    expect(acked).toBe(true);
    expect(alerts[0].acknowledged).toBe(true);
  });

  it('should resolve an alert', () => {
    const alertManager = new AlertManager();
    const metrics = createSampleMetrics({ latency: { p50: 10, p90: 20, p95: 30, p99: 200, p999: 300 } });

    const alerts = alertManager.evaluateRules(metrics);
    expect(alerts.length).toBeGreaterThan(0);

    const resolved = alertManager.resolveAlert(alerts[0].id);
    expect(resolved).toBe(true);
    expect(alerts[0].resolved).toBe(true);
  });

  it('should return pending alerts', () => {
    const alertManager = new AlertManager();
    const metrics = createSampleMetrics({ latency: { p50: 10, p90: 20, p95: 30, p99: 200, p999: 300 } });

    alertManager.evaluateRules(metrics);
    const pending = alertManager.getPendingAlerts();

    expect(pending.length).toBeGreaterThan(0);
    pending.forEach((a) => {
      expect(a.acknowledged).toBe(false);
      expect(a.resolved).toBe(false);
    });
  });

  it('should return false when acknowledging non-existent alert', () => {
    const alertManager = new AlertManager();
    const result = alertManager.acknowledgeAlert('nonexistent');
    expect(result).toBe(false);
  });
});

describe('ObservabilityEngine', () => {
  it('should collect metrics and produce a snapshot', () => {
    const engine = createObservabilityEngine();
    const snapshot = engine.snapshot();

    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.metrics.streams.count).toBeGreaterThanOrEqual(0);
    expect(snapshot.slos.length).toBe(5);
  });

  it('should export prometheus format', () => {
    const engine = new ObservabilityEngine();
    const metrics = engine.collectMetrics();
    const output = engine.exportPrometheus(metrics);

    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
  });

  it('should evaluate alerts from collected metrics', () => {
    const engine = new ObservabilityEngine();
    const metrics = engine.collectMetrics();
    const alerts = engine.evaluateAlerts(metrics);

    expect(Array.isArray(alerts)).toBe(true);
  });

  it('should return empty alerts initially', () => {
    const engine = new ObservabilityEngine();
    const alerts = engine.getAlerts();

    expect(alerts).toEqual([]);
  });

  it('should support dependency injection of components', () => {
    const customCollector = new MetricsCollector({ streamNames: ['custom'], consumerNames: ['c1'] });
    const customMonitor = new SloMonitor([{ name: 'latency_p99', target: 100, severity: 'warning', window: 60000, burnRate: 1 }]);
    const customExporter = new PrometheusExporter();
    const customAlertManager = new AlertManager();

    const engine = new ObservabilityEngine({
      metricsCollector: customCollector,
      sloMonitor: customMonitor,
      prometheusExporter: customExporter,
      alertManager: customAlertManager,
    });

    const metrics = engine.collectMetrics();
    expect(metrics.streams.count).toBe(1);

    const slos = engine.checkSLOs(metrics);
    expect(slos.length).toBe(1);
  });
});

describe('Health Check', () => {
  it('should report healthy when connection is established', () => {
    const collector = new MetricsCollector();
    const metrics = collector.collect();

    expect(metrics.health.healthy).toBe(true);
    expect(metrics.health.connected).toBe(true);
    expect(metrics.health.lastError).toBeNull();
  });

  it('should report uptime in seconds', () => {
    const collector = new MetricsCollector();
    const metrics = collector.collect();

    expect(metrics.health.uptime).toBeGreaterThan(0);
  });

  it('should have zero reconnects in healthy state', () => {
    const collector = new MetricsCollector();
    const metrics = collector.collect();

    expect(metrics.health.reconnects).toBe(0);
  });
});
