import { createLogger } from '@ideia/logger';
const logger = createLogger('observability-engine:opentelemetry');

export interface OTelExporterConfig {
  endpoint?: string;
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
}

export interface SpanData {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: 'ok' | 'error' | 'warning';
  attributes: Record<string, unknown>;
  events: Array<{ name: string; timestamp: number; attributes?: Record<string, unknown> }>;
}

export interface MetricData {
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram';
  timestamp: number;
  attributes?: Record<string, string>;
}

export interface OTelExporter {
  exportSpans(spans: SpanData[]): Promise<void>;
  exportMetrics(metrics: MetricData[]): Promise<void>;
  shutdown(): Promise<void>;
}

export class ConsoleExporter implements OTelExporter {
  async exportSpans(spans: SpanData[]): Promise<void> {
    for (const span of spans) {
      logger.info('OTel span', {
        traceId: span.traceId,
        spanId: span.spanId,
        parentSpanId: span.parentSpanId,
        name: span.name,
        durationMs: span.durationMs,
        status: span.status,
        attributes: span.attributes,
        events: span.events,
      });
    }
  }

  async exportMetrics(metrics: MetricData[]): Promise<void> {
    for (const metric of metrics) {
      logger.info('OTel metric', {
        name: metric.name,
        value: metric.value,
        type: metric.type,
        timestamp: metric.timestamp,
        attributes: metric.attributes,
      });
    }
  }

  async shutdown(): Promise<void> {}
}

export class HTTPExporter implements OTelExporter {
  private endpoint: string;

  constructor(config: OTelExporterConfig) {
    this.endpoint = config.endpoint ?? 'http://localhost:4318';
  }

  async exportSpans(spans: SpanData[]): Promise<void> {
    try {
      const body = JSON.stringify({ resourceSpans: [{ scopeSpans: [{ spans }] }] });
      await fetch(`${this.endpoint}/v1/traces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    } catch {
      // silently fail — OTel is best-effort
    }
  }

  async exportMetrics(metrics: MetricData[]): Promise<void> {
    try {
      const body = JSON.stringify({ resourceMetrics: [{ scopeMetrics: [{ metrics }] }] });
      await fetch(`${this.endpoint}/v1/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    } catch {
      // silently fail
    }
  }

  async shutdown(): Promise<void> {}
}

export class OTelBridge {
  private exporters: OTelExporter[] = [];
  private spanBuffer: SpanData[] = [];
  private metricBuffer: MetricData[] = [];
  private maxBufferSize = 100;
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private serviceName: string;
  private serviceVersion: string;
  private environment: string;

  constructor(config?: OTelExporterConfig) {
    this.serviceName = config?.serviceName ?? 'ideia';
    this.serviceVersion = config?.serviceVersion ?? '1.0.0';
    this.environment = config?.environment ?? process.env.NODE_ENV ?? 'development';
  }

  addExporter(exporter: OTelExporter): void { this.exporters.push(exporter); }

  start(flushIntervalMs = 5000): void {
    if (this.flushInterval) return;
    this.flushInterval = setInterval(() => this.flush(), flushIntervalMs);
  }

  async stop(): Promise<void> {
    if (this.flushInterval) { clearInterval(this.flushInterval); this.flushInterval = null; }
    await this.flush();
    for (const e of this.exporters) await e.shutdown();
  }

  recordSpan(span: SpanData): void {
    const enriched: SpanData = {
      ...span,
      attributes: {
        ...span.attributes,
        'service.name': this.serviceName,
        'service.version': this.serviceVersion,
        'deployment.environment': this.environment,
      },
    };
    this.spanBuffer.push(enriched);
    if (this.spanBuffer.length >= this.maxBufferSize) this.flush();
  }

  recordMetric(metric: MetricData): void {
    this.metricBuffer.push(metric);
    if (this.metricBuffer.length >= this.maxBufferSize) this.flush();
  }

  private async flush(): Promise<void> {
    if (this.spanBuffer.length === 0 && this.metricBuffer.length === 0) return;

    const spans = [...this.spanBuffer];
    const metrics = [...this.metricBuffer];
    this.spanBuffer = [];
    this.metricBuffer = [];

    for (const exporter of this.exporters) {
      try {
        if (spans.length > 0) await exporter.exportSpans(spans);
        if (metrics.length > 0) await exporter.exportMetrics(metrics);
      } catch {
        // individual exporter failure should not block others
      }
    }
  }

  createSpanExporter(): { export: (span: import('./types').TracerSpan) => void } {
    return {
      export: (span) => {
        this.recordSpan({
          traceId: span.traceId,
          spanId: span.spanId,
          parentSpanId: span.parentSpanId,
          name: span.name,
          startTime: span.startTime,
          endTime: span.endTime,
          durationMs: span.durationMs,
          status: span.status,
          attributes: span.attributes,
          events: span.events.map((e: { name: string; timestamp?: number; attributes?: Record<string, unknown> }) => ({
            name: e.name,
            timestamp: e.timestamp ?? Date.now(),
            attributes: e.attributes,
          })),
        });
      },
    };
  }
}

export function createOTelBridge(config?: OTelExporterConfig): OTelBridge {
  return new OTelBridge(config);
}
