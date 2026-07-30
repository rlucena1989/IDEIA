import { NatsMetrics } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('prometheus-exporter');

interface PrometheusMetric {
  name: string;
  help: string;
  type: 'gauge' | 'counter' | 'histogram';
  value: number;
  labels?: Record<string, string>;
}

export class PrometheusExporter {
  private metrics: Map<string, PrometheusMetric> = new Map();

  registerGauge(name: string, help: string): void {
    this.metrics.set(name, { name, help, type: 'gauge', value: 0 });
  }

  registerCounter(name: string, help: string): void {
    this.metrics.set(name, { name, help, type: 'counter', value: 0 });
  }

  registerHistogram(name: string, help: string): void {
    this.metrics.set(name, { name, help, type: 'histogram', value: 0 });
  }

  setMetric(name: string, value: number, labels?: Record<string, string>): void {
    const existing = this.metrics.get(name);
    if (existing != null) {
      this.metrics.set(name, { ...existing, value, labels });
    } else {
      this.metrics.set(name, { name, help: '', type: 'gauge', value, labels });
    }
  }

  formatMetrics(metrics: NatsMetrics): string {
    this.setMetric('nats_streams_total', metrics.streams.count);
    this.setMetric('nats_messages_total', metrics.streams.totalMessages);
    this.setMetric('nats_bytes_total', metrics.streams.totalBytes);
    this.setMetric('nats_streams_with_discards', metrics.streams.streamsWithDiscards);
    this.setMetric('nats_consumers_total', metrics.consumers.count);
    this.setMetric('nats_consumers_with_lag', metrics.consumers.withLag);
    this.setMetric('nats_consumers_pending', metrics.consumers.totalPending);
    this.setMetric('nats_dlq_size', metrics.dlq.size);
    this.setMetric('nats_dlq_rate', metrics.dlq.dlqRate);
    this.setMetric('nats_latency_p50', metrics.latency.p50, { quantile: '0.5' });
    this.setMetric('nats_latency_p90', metrics.latency.p90, { quantile: '0.9' });
    this.setMetric('nats_latency_p95', metrics.latency.p95, { quantile: '0.95' });
    this.setMetric('nats_latency_p99', metrics.latency.p99, { quantile: '0.99' });
    this.setMetric('nats_latency_p999', metrics.latency.p999, { quantile: '0.999' });
    this.setMetric('nats_throughput_msgs_per_sec', metrics.throughput.messagesPerSecond);
    this.setMetric('nats_throughput_bytes_per_sec', metrics.throughput.bytesPerSecond);
    this.setMetric('nats_health_healthy', metrics.health.healthy ? 1 : 0);
    this.setMetric('nats_health_connected', metrics.health.connected ? 1 : 0);
    this.setMetric('nats_reconnects_total', metrics.health.reconnects);
    this.setMetric('nats_uptime_seconds', metrics.health.uptime);

    return this.format();
  }

  private format(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      if (metric.help !== '') {
        lines.push(`# HELP ${metric.name} ${metric.help}`);
        lines.push(`# TYPE ${metric.name} ${metric.type}`);
      }

      const labelStr = metric.labels != null && Object.keys(metric.labels).length > 0
        ? `{${Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
        : '';

      lines.push(`${metric.name}${labelStr} ${metric.value}`);
    }

    return lines.join('\n') + '\n';
  }
}
