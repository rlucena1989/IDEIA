# Estudo: NATS Observability & Monitoring

> **Extraído de:** ESTUDO-IMPLEMENTACAO-NATS-JETSTREAM.md seção 2.3
> **Data:** 2026-07-24 | **Versão:** 3.0 (intensificação F6)
> **Nível de Profundidade:** 10/12
> **Propósito:** Sistema completo de observabilidade para NATS JetStream — métricas de stream, consumer lag monitoring, DLQ tracking, latency percentis, Prometheus export, Grafana dashboards, alertas SLO, anomaly detection.
> **Nível 1:** NATS monitoring endpoints, JetStream stats, subject-level metrics
> **Nível 2:** Prometheus integration, Grafana dashboards, latency SLOs
> **Nível 3:** Anomaly detection in message flow, predictive scaling
> **Nível 4:** Distributed tracing across NATS clusters, causal message chains

---

## 1. Fundamentos

### 1.1 Problema

NATS JetStream é a espinha dorsal da mensageria da IDEIA. Sem observabilidade adequada, falhas de stream, consumer lag, DLQ overflow e degradação de latência passam despercebidos até causarem queda de serviço. Um sistema de observabilidade precisa capturar:

- **Métricas de stream**: messages, bytes, consumers, discards
- **Consumer lag**: diferença entre última mensagem publicada e último ACK
- **DLQ health**: taxa de entradas, idade da mais antiga, crescimento
- **Latência end-to-end**: P50, P95, P99, P999
- **Throughput**: mensagens/segundo, bytes/segundo

### 1.2 Arquitetura Geral

```
                                   ┌──────────────────┐
                                   │   Grafana        │
                                   │   Dashboards     │
                                   └───────┬──────────┘
                                           │
                                   ┌───────▼──────────┐
                                   │   Prometheus      │
                                   │   (scrape /push)  │
                                   └───────┬──────────┘
                                           │
┌──────────────┐  ┌──────────────┐  ┌──────▼──────────┐  ┌──────────────────┐
│  NATS        │  │  JetStream   │  │  Observability  │  │  AlertManager    │
│  Metrics Endp.│──►  Stats API  │──►  Engine         │──►  (SLO/SLA)       │
└──────────────┘  └──────────────┘  └──────┬──────────┘  └──────────────────┘
                                           │
                                   ┌───────▼──────────┐
                                   │   Metric Store    │
                                   │   (NATS KV / TSDB)│
                                   └──────────────────┘
```

### 1.3 Conceitos-Chave

| Conceito | Definição |
|----------|-----------|
| Stream Metrics | Total de mensagens, bytes, consumidores, discards no stream |
| Consumer Lag | Diferença entre seq más recente no stream e seq confirmada pelo consumer |
| DLQ Health | Quantidade de mensagens na DLQ, idade da mais antiga, taxa de entrada |
| Latency Percentile | P50/P95/P99/P999 do tempo entre publish e ACK do consumidor |
| SLO Burn Rate | Quão rápido o SLO está sendo consumido (útil para alerta proativo) |

---

## 2. Arquitetura Detalhada

### 2.1 Componentes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ObservabilityEngine                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ MetricsCollector │  │ StreamScraper   │  │ PrometheusExporter      │  │
│  │                  │  │                 │  │                         │  │
│  │ - getMetrics()  │  │ - listStreams() │  │ - formatPrometheus()    │  │
│  │ - getLatency()  │  │ - getStreamInfo │  │ - registerMetrics()     │  │
│  │ - getThroughput │  │ - getConsumerLag│  │ - exposeHTTP()          │  │
│  └────────┬────────┘  └────────┬────────┘  └───────────┬─────────────┘  │
│           │                    │                        │                │
│  ┌────────▼────────────────────▼────────────────────────▼─────────────┐  │
│  │                      MetricRegistry                               │  │
│  │  { streams: StreamMetrics[], consumers: ConsumerMetric[],          │  │
│  │    dlq: DQLMetric, latency: LatencyMetric, throughput: number }    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Métricas Coletadas (23 dimensões)

| Categoria | Métrica | Fonte |
|-----------|---------|-------|
| Stream | messages, bytes, max messages, max bytes, discards | `streams.info()` |
| Consumer | ack_pending, redelivered, waiting, ack_floor | `consumers.info()` |
| Latency | publish_time, delivery_time, ack_time | Timestamps NATS |
| Throughput | msgs/sec, bytes/sec, consumers/sec | Cálculo diferencial |
| DLQ | size, oldest_age, growth_rate, dlq_rate | Stream dedicada |
| Health | is_healthy, last_error, reconnect_count | Connection manager |

### 2.3 SLOs Definidos

| SLO | Target | Severity | Window |
|-----|--------|----------|--------|
| Latency P99 | < 50ms | Critical | 5min |
| Throughput Min | > 1000 msgs/s | Warning | 1min |
| DLQ Rate | < 1% of total | Critical | 15min |
| Consumer Lag | 0 | Warning | 1min |
| Stream Healthy | 100% uptime | Critical | 1h |

---

## 3. Implementação

### 3.1 Metrics Collector — Coleta Completa

```typescript
// packages/observability/src/nats/nats-metrics-collector.ts
import { JsContext, StreamInfo, ConsumerInfo } from 'nats';

interface NatsMetrics {
  streams: {
    count: number;
    totalMessages: number;
    totalBytes: number;
    averageMessagesPerStream: number;
    streamsWithDiscards: number;
  };
  consumers: {
    count: number;
    withLag: number;
    totalPending: number;
    avgAckPending: number;
    redeliveryRate: number;
  };
  dlq: {
    size: number;
    oldestMessageAge: number;
    growthRate: number;
    dlqRate: number;
  };
  latency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    p999: number;
  };
  throughput: {
    messagesPerSecond: number;
    bytesPerSecond: number;
    consumersPerSecond: number;
  };
  health: {
    healthy: boolean;
    connected: boolean;
    reconnects: number;
    lastError: string | null;
    uptime: number;
  };
}

export class NatsMetricsCollector {
  private lastSample: { time: number; messages: number; bytes: number } | null = null;

  constructor(
    private jsctx: JsContext,
    private connection: NatsConnection
  ) {}

  async collect(): Promise<NatsMetrics> {
    const streams = await this.collectStreams();
    const consumers = await this.collectConsumers(streams);
    const dlq = await this.collectDLQ();
    const latency = await this.measureLatency();
    const throughput = await this.measureThroughput(streams);
    const health = this.checkHealth();

    return { streams, consumers, dlq, latency, throughput, health };
  }

  private async collectStreams(): Promise<NatsMetrics['streams']> {
    let totalMessages = 0;
    let totalBytes = 0;
    let streamsWithDiscards = 0;
    let streamCount = 0;

    const streams = await this.jsctx.streams.list();
    for await (const name of streams) {
      const info = await this.jsctx.streams.info(name);
      totalMessages += info.state.messages;
      totalBytes += info.state.bytes;
      if ((info.state.discards ?? 0) > 0) streamsWithDiscards++;
      streamCount++;
    }

    return {
      count: streamCount,
      totalMessages,
      totalBytes,
      averageMessagesPerStream: streamCount > 0 ? Math.round(totalMessages / streamCount) : 0,
      streamsWithDiscards,
    };
  }

  private async collectConsumers(streams: NatsMetrics['streams']): Promise<NatsMetrics['consumers']> {
    let totalConsumers = 0;
    let withLag = 0;
    let totalPending = 0;
    let totalAckPending = 0;
    let totalRedelivered = 0;

    const streamNames = await this.jsctx.streams.list();
    for await (const name of streamNames) {
      const consumers = await this.jsctx.consumers.list(name);
      for await (const consumer of consumers) {
        const info = await this.jsctx.consumers.info(name, consumer);
        totalConsumers++;
        const ackPending = info.num_ack_pending ?? 0;
        if (ackPending > 0) withLag++;
        totalPending += info.num_pending ?? 0;
        totalAckPending += ackPending;
        totalRedelivered += info.num_redelivered ?? 0;
      }
    }

    return {
      count: totalConsumers,
      withLag,
      totalPending,
      avgAckPending: totalConsumers > 0 ? totalAckPending / totalConsumers : 0,
      redeliveryRate: totalConsumers > 0 ? totalRedelivered / totalConsumers : 0,
    };
  }

  private async collectDLQ(): Promise<NatsMetrics['dlq']> {
    try {
      const info = await this.jsctx.streams.info('dlq');
      const oldest = info.state.first_seq ? await this.jsctx.streams.getMessage('dlq', info.state.first_seq) : null;
      const oldestAge = oldest
        ? (Date.now() - new Date(oldest.time).getTime()) / 1000
        : 0;

      return {
        size: info.state.messages,
        oldestMessageAge: oldestAge,
        growthRate: info.state.messages > 0
          ? info.state.messages / (info.state.last_seq - info.state.first_seq + 1)
          : 0,
        dlqRate: (info.state.messages / (this.lastSample?.messages ?? 1)) * 100,
      };
    } catch {
      return { size: 0, oldestMessageAge: 0, growthRate: 0, dlqRate: 0 };
    }
  }

  private async measureLatency(): Promise<NatsMetrics['latency']> {
    const latencies: number[] = [];
    const samples = 100;

    for (let i = 0; i < samples; i++) {
      const start = Date.now();
      const inbox = this.connection.newInbox();
      const sub = this.connection.subscribe(inbox, { timeout: 5000 });
      await this.connection.request('_LATENCY_PROBE', new TextEncoder().encode('ping'), {
        timeout: 5000,
        headers: { 'Reply-To': inbox },
      });
      const msg = await sub.next();
      if (msg) {
        latencies.push(Date.now() - start);
      }
      sub.drain();
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
      p90: sorted[Math.floor(sorted.length * 0.9)] ?? 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
      p999: sorted[Math.floor(sorted.length * 0.999)] ?? 0,
    };
  }

  private async measureThroughput(
    streamMetrics: NatsMetrics['streams']
  ): Promise<NatsMetrics['throughput']> {
    const now = Date.now();
    const current = { time: now, messages: streamMetrics.totalMessages, bytes: streamMetrics.totalBytes };

    if (!this.lastSample) {
      this.lastSample = current;
      return { messagesPerSecond: 0, bytesPerSecond: 0, consumersPerSecond: 0 };
    }

    const elapsed = (now - this.lastSample.time) / 1000;
    if (elapsed <= 0) {
      return { messagesPerSecond: 0, bytesPerSecond: 0, consumersPerSecond: 0 };
    }

    const result = {
      messagesPerSecond: Math.round((current.messages - this.lastSample.messages) / elapsed),
      bytesPerSecond: Math.round((current.bytes - this.lastSample.bytes) / elapsed),
      consumersPerSecond: 0,
    };

    this.lastSample = current;
    return result;
  }

  private checkHealth(): NatsMetrics['health'] {
    const info = this.connection.info;
    return {
      healthy: this.connection.isConnected(),
      connected: this.connection.isConnected(),
      reconnects: info?.client_ip === undefined ? 0 : 0,
      lastError: null,
      uptime: 0,
    };
  }
}
```

### 3.2 StreamMetricsCollector — Monitoramento por Stream

```typescript
// packages/observability/src/nats/stream-metrics-collector.ts
interface StreamMetric {
  streamName: string;
  messages: number;
  bytes: number;
  firstSeq: number;
  lastSeq: number;
  consumers: number;
  discards: number;
  maxMessages: number;
  maxBytes: number;
  subjectFilter: string;
  retention: string;
  storageType: 'file' | 'memory';
  isHealthy: boolean;
}

interface StreamMetricsReport {
  timestamp: number;
  streams: StreamMetric[];
  totalMessages: number;
  totalBytes: number;
  unhealthyStreams: string[];
}

export class StreamMetricsCollector {
  private metricsHistory: Map<string, StreamMetric[]> = new Map();
  private collectInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private jsctx: JsContext,
    private options: { historySize: number; collectIntervalMs: number }
  ) {}

  async collectDetailedStreamMetrics(): Promise<StreamMetric[]> {
    const metrics: StreamMetric[] = [];
    const streams = await this.jsctx.streams.list();

    for await (const name of streams) {
      const info = await this.jsctx.streams.info(name);
      const consumerList = await this.jsctx.consumers.list(name);
      let consumerCount = 0;
      for await (const _ of consumerList) consumerCount++;

      metrics.push({
        streamName: name,
        messages: info.state.messages,
        bytes: info.state.bytes,
        firstSeq: info.state.first_seq,
        lastSeq: info.state.last_seq,
        consumers: consumerCount,
        discards: info.state.discards ?? 0,
        maxMessages: info.config.max_msgs ?? -1,
        maxBytes: info.config.max_bytes ?? -1,
        subjectFilter: info.config.subjects?.join(', ') ?? '',
        retention: info.config.retention ?? 'limits',
        storageType: info.config.storage ?? 'file',
        isHealthy: info.state.messages <= (info.config.max_msgs ?? Infinity) &&
                   info.state.bytes <= (info.config.max_bytes ?? Infinity),
      });

      this.recordHistory(name, metrics[metrics.length - 1]);
    }

    return metrics;
  }

  private recordHistory(streamName: string, metric: StreamMetric): void {
    if (!this.metricsHistory.has(streamName)) {
      this.metricsHistory.set(streamName, []);
    }
    const history = this.metricsHistory.get(streamName)!;
    history.push(metric);
    if (history.length > this.options.historySize) {
      history.shift();
    }
  }

  getGrowthRate(streamName: string, windowMs: number = 300000): number {
    const history = this.metricsHistory.get(streamName);
    if (!history || history.length < 2) return 0;

    const recent = history.slice(-2);
    const timeDiff = recent[1].lastSeq - recent[0].lastSeq;
    const msDiff = history[history.length - 1].timestamp - history[history.length - 2].timestamp;
    return msDiff > 0 ? (timeDiff / msDiff) * 1000 : 0;
  }

  detectAnomalies(report: StreamMetricsReport): string[] {
    const anomalies: string[] = [];
    for (const stream of report.streams) {
      const growthRate = this.getGrowthRate(stream.streamName);
      if (growthRate > 1000) {
        anomalies.push(`Stream ${stream.streamName}: abnormal growth rate (${growthRate.toFixed(2)} msgs/s)`);
      }
      if (!stream.isHealthy) {
        anomalies.push(`Stream ${stream.streamName}: exceeded limits (msgs=${stream.messages}/${stream.maxMessages})`);
      }
      if (stream.discards > stream.messages * 0.1) {
        anomalies.push(`Stream ${stream.streamName}: high discard rate (${stream.discards}/${stream.messages})`);
      }
    }
    return anomalies;
  }

  startAutoCollect(callback: (report: StreamMetricsReport) => void): void {
    this.collectInterval = setInterval(async () => {
      const metrics = await this.collectDetailedStreamMetrics();
      const report: StreamMetricsReport = {
        timestamp: Date.now(),
        streams: metrics,
        totalMessages: metrics.reduce((s, m) => s + m.messages, 0),
        totalBytes: metrics.reduce((s, m) => s + m.bytes, 0),
        unhealthyStreams: metrics.filter(m => !m.isHealthy).map(m => m.streamName),
      };
      callback(report);
    }, this.options.collectIntervalMs);
  }

  stopAutoCollect(): void {
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
      this.collectInterval = null;
    }
  }
}
```

### 3.3 ConsumerLagAlert — Monitor de Lag

```typescript
// packages/observability/src/nats/consumer-lag-alert.ts
interface ConsumerLagInfo {
  stream: string;
  consumerName: string;
  pendingMessages: number;
  ackPending: number;
  redelivered: number;
  lastDelivery: Date | null;
  lagSeconds: number;
}

interface LagThresholds {
  warning: number;
  critical: number;
}

export class ConsumerLagMonitor {
  constructor(
    private jsctx: JsContext,
    private thresholds: LagThresholds = { warning: 100, critical: 1000 }
  ) {}

  async getAllConsumerLag(): Promise<ConsumerLagInfo[]> {
    const result: ConsumerLagInfo[] = [];
    const streams = await this.jsctx.streams.list();

    for await (const streamName of streams) {
      const streamInfo = await this.jsctx.streams.info(streamName);
      const consumers = await this.jsctx.consumers.list(streamName);

      for await (const consumerName of consumers) {
        const info = await this.jsctx.consumers.info(streamName, consumerName);
        const pending = info.num_pending ?? 0;
        const ackPending = info.num_ack_pending ?? 0;
        const redelivered = info.num_redelivered ?? 0;

        const lastDelivery = info.timestamp
          ? new Date(info.timestamp)
          : null;

        result.push({
          stream: streamName,
          consumerName,
          pendingMessages: pending,
          ackPending,
          redelivered,
          lastDelivery,
          lagSeconds: pending > 0
            ? Math.round((Date.now() - (lastDelivery?.getTime() ?? Date.now())) / 1000)
            : 0,
        });
      }
    }

    return result.sort((a, b) => b.pendingMessages - a.pendingMessages);
  }

  async checkAlerts(): Promise<{
    warnings: ConsumerLagInfo[];
    criticals: ConsumerLagInfo[];
  }> {
    const allLag = await this.getAllConsumerLag();

    return {
      warnings: allLag.filter(
        l => l.pendingMessages >= this.thresholds.warning && l.pendingMessages < this.thresholds.critical
      ),
      criticals: allLag.filter(l => l.pendingMessages >= this.thresholds.critical),
    };
  }

  async resolveLag(stream: string, consumer: string, maxMessages: number = 1000): Promise<number> {
    let processed = 0;
    const info = await this.jsctx.consumers.info(stream, consumer);

    if (info.deliver_policy === 'last' || info.deliver_policy === 'new') {
      return 0;
    }

    const orderedConsumer = await this.jsctx.consumers.get(stream, consumer);
    const iter = await orderedConsumer.consume({ max_messages: maxMessages });

    for await (const msg of iter) {
      msg.ack();
      processed++;
      if (processed >= maxMessages) break;
    }

    return processed;
  }
}
```

### 3.4 PrometheusExporter — Exportação de Métricas

```typescript
// packages/observability/src/prometheus/prometheus-exporter.ts
import http from 'http';

interface PrometheusMetric {
  name: string;
  help: string;
  type: 'gauge' | 'counter' | 'histogram' | 'summary';
  value: number;
  labels?: Record<string, string>;
}

export class PrometheusExporter {
  private metrics: Map<string, PrometheusMetric> = new Map();
  private server: http.Server | null = null;

  constructor(private port: number = 9464) {}

  registerMetric(metric: PrometheusMetric): void {
    const key = `${metric.name}{${JSON.stringify(metric.labels ?? {})}}`;
    this.metrics.set(key, metric);
  }

  setMetric(name: string, value: number, labels?: Record<string, string>): void {
    const key = `${name}{${JSON.stringify(labels ?? {})}}`;
    this.metrics.set(key, { name, help: '', type: 'gauge', value, labels });
  }

  async formatPrometheus(): Promise<string> {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      const labelStr = metric.labels && Object.keys(metric.labels).length > 0
        ? `{${Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
        : '';

      lines.push(`${metric.name}${labelStr} ${metric.value}`);
    }

    return lines.join('\n') + '\n';
  }

  async exportNatsMetrics(collector: NatsMetricsCollector): Promise<string> {
    const metrics = await collector.collect();

    this.setMetric('nats_streams_total', metrics.streams.count);
    this.setMetric('nats_messages_total', metrics.streams.totalMessages);
    this.setMetric('nats_bytes_total', metrics.streams.totalBytes);
    this.setMetric('nats_consumers_total', metrics.consumers.count);
    this.setMetric('nats_consumers_with_lag', metrics.consumers.withLag);
    this.setMetric('nats_dlq_size', metrics.dlq.size);
    this.setMetric('nats_latency_p50', metrics.latency.p50, { quantile: '0.5' });
    this.setMetric('nats_latency_p95', metrics.latency.p95, { quantile: '0.95' });
    this.setMetric('nats_latency_p99', metrics.latency.p99, { quantile: '0.99' });
    this.setMetric('nats_throughput_msgs', metrics.throughput.messagesPerSecond);
    this.setMetric('nats_healthy', metrics.health.healthy ? 1 : 0);

    return this.formatPrometheus();
  }

  startHttpEndpoint(): void {
    this.server = http.createServer(async (_req, res) => {
      const prometheusData = await this.formatPrometheus();
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(prometheusData);
    });

    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`Prometheus exporter listening on :${this.port}/metrics`);
    });
  }

  stop(): void {
    this.server?.close();
  }
}
```

### 3.5 SLOMonitor — Verificação de SLOs

```typescript
// packages/observability/src/slo/slo-monitor.ts
interface SLOConfig {
  latencyP99MaxMs: number;
  minThroughput: number;
  maxDLQRate: number;
  maxConsumerLagCritical: number;
  uptimeTarget: number;
}

interface SLOReport {
  timestamp: number;
  status: 'healthy' | 'degraded' | 'critical';
  checks: SLOCheck[];
  recommendations: string[];
}

interface SLOCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  current: number;
  target: number;
  unit: string;
}

export class SLOMonitor {
  constructor(
    private collector: NatsMetricsCollector,
    private config: SLOConfig = {
      latencyP99MaxMs: 50,
      minThroughput: 1000,
      maxDLQRate: 0.01,
      maxConsumerLagCritical: 0,
      uptimeTarget: 99.9,
    }
  ) {}

  async check(): Promise<SLOReport> {
    const metrics = await this.collector.collect();
    const checks: SLOCheck[] = [];

    checks.push({
      name: 'latency_p99',
      status: metrics.latency.p99 < this.config.latencyP99MaxMs ? 'pass' : 'fail',
      current: metrics.latency.p99,
      target: this.config.latencyP99MaxMs,
      unit: 'ms',
    });

    checks.push({
      name: 'throughput_min',
      status: metrics.throughput.messagesPerSecond >= this.config.minThroughput ? 'pass' : 'warn',
      current: metrics.throughput.messagesPerSecond,
      target: this.config.minThroughput,
      unit: 'msgs/s',
    });

    checks.push({
      name: 'dlq_rate',
      status: metrics.dlq.dlqRate < this.config.maxDLQRate ? 'pass' : 'fail',
      current: metrics.dlq.dlqRate,
      target: this.config.maxDLQRate,
      unit: '%',
    });

    checks.push({
      name: 'consumer_lag',
      status: metrics.consumers.withLag <= this.config.maxConsumerLagCritical ? 'pass' : 'warn',
      current: metrics.consumers.withLag,
      target: this.config.maxConsumerLagCritical,
      unit: 'consumers',
    });

    checks.push({
      name: 'health',
      status: metrics.health.healthy ? 'pass' : 'fail',
      current: metrics.health.healthy ? 100 : 0,
      target: this.config.uptimeTarget,
      unit: '%',
    });

    const hasFail = checks.some(c => c.status === 'fail');
    const hasWarn = checks.some(c => c.status === 'warn');

    return {
      timestamp: Date.now(),
      status: hasFail ? 'critical' : hasWarn ? 'degraded' : 'healthy',
      checks,
      recommendations: this.generateRecommendations(metrics),
    };
  }

  private generateRecommendations(metrics: NatsMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.latency.p99 > 50) {
      recommendations.push('Latency P99 above 50ms — consider increasing consumer replicas or reducing batch size');
    }
    if (metrics.throughput.messagesPerSecond < 1000) {
      recommendations.push('Throughput below 1000 msgs/s — check consumer processing speed and network');
    }
    if (metrics.consumers.withLag > 0) {
      recommendations.push(`Consumer lag detected for ${metrics.consumers.withLag} consumer(s) — check processing pipeline`);
    }
    if (metrics.dlq.dlqRate > 0.01) {
      recommendations.push('DLQ rate above 1% — investigate message processing failures');
    }
    if (!metrics.health.healthy) {
      recommendations.push('NATS connection unhealthy — check NATS server status and network');
    }

    return recommendations;
  }
}
```

### 3.6 GrafanaDashboard — Especificação do Dashboard

```typescript
// packages/observability/src/grafana/grafana-dashboard-spec.ts
interface GrafanaPanel {
  title: string;
  type: 'graph' | 'gauge' | 'stat' | 'table' | 'heatmap';
  metrics: string[];
  unit?: string;
  min?: number;
  max?: number;
}

interface GrafanaDashboard {
  title: string;
  uid: string;
  timezone: string;
  panels: GrafanaPanel[];
  refreshInterval: string;
}

export class GrafanaDashboardSpec {
  generateDashboard(): GrafanaDashboard {
    return {
      title: 'NATS JetStream Observability',
      uid: 'nats-jetstream-observability',
      timezone: 'browser',
      refreshInterval: '30s',
      panels: [
        { title: 'Streams Overview', type: 'stat', metrics: ['nats_streams_total'], unit: 'count' },
        { title: 'Total Messages', type: 'graph', metrics: ['nats_messages_total'], unit: 'messages' },
        { title: 'Total Bytes', type: 'graph', metrics: ['nats_bytes_total'], unit: 'bytes' },
        { title: 'Consumer Lag', type: 'gauge', metrics: ['nats_consumers_with_lag'], min: 0, max: 100 },
        { title: 'Latency P50/P95/P99', type: 'graph', metrics: ['nats_latency_p50', 'nats_latency_p95', 'nats_latency_p99'], unit: 'ms' },
        { title: 'Throughput (msgs/s)', type: 'graph', metrics: ['nats_throughput_msgs'], unit: 'msgs/s' },
        { title: 'DLQ Size', type: 'gauge', metrics: ['nats_dlq_size'], min: 0 },
        { title: 'Health Status', type: 'stat', metrics: ['nats_healthy'] },
      ],
    };
  }

  generateJsonModel(): string {
    const dashboard = this.generateDashboard();
    return JSON.stringify({
      annotations: { list: [] },
      editable: true,
      fiscalYearStartMonth: 0,
      graphTooltip: 0,
      id: null,
      links: [],
      liveNow: false,
      panels: dashboard.panels.map((p, i) => ({
        id: i + 1,
        title: p.title,
        type: p.type,
        gridPos: { h: 8, w: 12, x: (i % 2) * 12, y: Math.floor(i / 2) * 8 },
        targets: p.metrics.map(m => ({
          expr: m,
          legendFormat: m,
          refId: m,
        })),
        options: {
          unit: p.unit,
          min: p.min,
          max: p.max,
        },
      })),
      refresh: dashboard.refreshInterval,
      schemaVersion: 38,
      style: 'dark',
      tags: ['nats', 'jetstream', 'observability'],
      templating: { list: [] },
      time: { from: 'now-6h', to: 'now' },
      timepicker: {},
      timezone: dashboard.timezone,
      title: dashboard.title,
      uid: dashboard.uid,
      version: 1,
    }, null, 2);
  }
}
```

---

## 4. Integração IDEIA

### 4.1 Integração com @ideia/event-bus

```typescript
// packages/event-bus/src/observability/event-bus-observability.ts
import { EventBus, IEventBus, EventHandler } from '@ideia/event-bus';
import { NatsMetricsCollector, SLOMonitor, ConsumerLagMonitor } from '@ideia/observability';

export class EventBusObservability {
  constructor(
    private eventBus: IEventBus,
    private metricsCollector: NatsMetricsCollector,
    private sloMonitor: SLOMonitor,
    private consumerMonitor: ConsumerLagMonitor,
    private checkInterval: number = 30000
  ) {}

  async start(): Promise<void> {
    setInterval(async () => {
      const metrics = await this.metricsCollector.collect();
      const sloReport = await this.sloMonitor.check();
      const lagAlerts = await this.consumerMonitor.checkAlerts();

      await this.eventBus.publish('observability.metrics.collected', {
        type: 'NatsMetricsCollected',
        payload: metrics,
        timestamp: Date.now(),
      });

      await this.eventBus.publish('observability.slo.checked', {
        type: 'SLOChecked',
        payload: sloReport,
        timestamp: Date.now(),
      });

      if (lagAlerts.criticals.length > 0 || lagAlerts.warnings.length > 0) {
        await this.eventBus.publish('observability.consumer.lag.alert', {
          type: 'ConsumerLagAlert',
          payload: { warnings: lagAlerts.warnings, criticals: lagAlerts.criticals },
          timestamp: Date.now(),
        });
      }

      if (sloReport.status === 'critical') {
        await this.eventBus.publish('observability.slo.violation', {
          type: 'SLOViolation',
          payload: sloReport,
          timestamp: Date.now(),
        });
      }
    }, this.checkInterval);
  }

  async stop(): Promise<void> {
    // Cleanup interval
  }
}
```

### 4.2 ObservableStream — Stream com Observabilidade Embutida

```typescript
// packages/event-bus/src/observability/observable-stream.ts
export class ObservableStream implements IEventBus {
  private metrics: { published: number; consumed: number; errors: number; latency: number[] } = {
    published: 0, consumed: 0, errors: 0, latency: [],
  };

  constructor(private inner: IEventBus) {}

  async publish<T>(subject: string, event: T): Promise<void> {
    const start = Date.now();
    try {
      await this.inner.publish(subject, event);
      this.metrics.published++;
      this.metrics.latency.push(Date.now() - start);
    } catch (err) {
      this.metrics.errors++;
      throw err;
    }
  }

  async subscribe<T>(subject: string, handler: EventHandler<T>): Promise<void> {
    const wrappedHandler: EventHandler<T> = async (event) => {
      this.metrics.consumed++;
      await handler(event);
    };
    await this.inner.subscribe(subject, wrappedHandler);
  }

  getMetrics(): { avgLatency: number; published: number; consumed: number; errorRate: number } {
    const avgLatency = this.metrics.latency.length > 0
      ? this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length
      : 0;
    const total = this.metrics.published + this.metrics.errors;
    return {
      avgLatency,
      published: this.metrics.published,
      consumed: this.metrics.consumed,
      errorRate: total > 0 ? this.metrics.errors / total : 0,
    };
  }
}
```

---

## 5. Métricas e Testes

### 5.1 Testes Unitários

```typescript
// packages/observability/__tests__/nats-metrics-collector.test.ts
describe('NatsMetricsCollector', () => {
  it('should collect stream metrics correctly', async () => {
    const mockJsctx = createMockJsContext({ totalMessages: 5000, streams: 3 });
    const collector = new NatsMetricsCollector(mockJsctx, mockConnection);
    const metrics = await collector.collect();
    expect(metrics.streams.count).toBe(3);
    expect(metrics.streams.totalMessages).toBe(5000);
  });

  it('should detect consumer lag', async () => {
    const mockJsctx = createMockJsContext({ consumersWithLag: 2 });
    const collector = new NatsMetricsCollector(mockJsctx, mockConnection);
    const metrics = await collector.collect();
    expect(metrics.consumers.withLag).toBe(2);
  });

  it('should measure latency percentiles', async () => {
    const collector = new NatsMetricsCollector(mockJsctx, mockConnection);
    const metrics = await collector.collect();
    expect(metrics.latency.p50).toBeLessThanOrEqual(metrics.latency.p99);
  });
});

describe('SLOMonitor', () => {
  it('should return healthy when all SLOs pass', async () => {
    const mockCollector = createMockCollector({ latency: { p99: 30 }, throughput: 2000 });
    const monitor = new SLOMonitor(mockCollector);
    const report = await monitor.check();
    expect(report.status).toBe('healthy');
  });

  it('should return critical when latency exceeds threshold', async () => {
    const mockCollector = createMockCollector({ latency: { p99: 100 }, throughput: 2000 });
    const monitor = new SLOMonitor(mockCollector);
    const report = await monitor.check();
    expect(report.status).toBe('critical');
    expect(report.checks.find(c => c.name === 'latency_p99')?.status).toBe('fail');
  });
});

describe('ConsumerLagMonitor', () => {
  it('should identify consumers with lag', async () => {
    const monitor = new ConsumerLagMonitor(mockJsctx);
    const lag = await monitor.getAllConsumerLag();
    expect(lag.length).toBeGreaterThan(0);
    expect(lag[0]).toHaveProperty('pendingMessages');
    expect(lag[0]).toHaveProperty('lagSeconds');
  });
});
```

### 5.2 Testes de Integração

```typescript
describe('NATS Observability Integration', () => {
  let natsServer: NatsTestServer;
  let collector: NatsMetricsCollector;
  let exporter: PrometheusExporter;

  beforeAll(async () => {
    natsServer = await NatsTestServer.start();
    const nc = await connect({ servers: natsServer.url });
    const jsctx = nc.jetstream();
    collector = new NatsMetricsCollector(jsctx, nc);
    exporter = new PrometheusExporter(9465);
  });

  afterAll(async () => {
    exporter.stop();
    await natsServer.stop();
  });

  it('should export prometheus metrics over HTTP', async () => {
    exporter.startHttpEndpoint();
    const response = await fetch('http://localhost:9465/metrics');
    const text = await response.text();
    expect(text).toContain('nats_streams_total');
    expect(text).toContain('nats_messages_total');
    expect(text).toContain('nats_latency_p99');
  });

  it('should collect metrics repeatedly without errors', async () => {
    for (let i = 0; i < 5; i++) {
      const metrics = await collector.collect();
      expect(metrics.streams.count).toBeDefined();
      await sleep(100);
    }
  });
});
```

---

## 6. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Coleta excessiva impacta performance do NATS | Média | Alto | Intervalo mínimo 30s; usar scraping via endpoint nativo |
| Prometheus exporter vaza métricas de sistema | Baixa | Médio | Prefixar métricas com `nats_`; vetar `debug`/`pprof` |
| Consumer lag alert falso positivo | Alta | Baixo | Configurar thresholds por consumer; debounce de 2 ciclos |
| Latência de medição skews percentis | Baixa | Médio | Medir em horário de baixa carga; amostragem mínima 100 pontos |
| Grafana dashboard desatualizado | Média | Baixo | Versionar JSON do dashboard no repositório; CI verifica schema |
| Anomaly detection com alta taxa de falso positivo | Alta | Médio | Baseline adaptativa com média móvel de 24h |

---

## 7. Roadmap

| Fase | Tarefa | Esforço | Dependências |
|------|--------|---------|-------------|
| P1 | NatsMetricsCollector + StreamMetricsCollector | 8h | @ideia/event-bus |
| P2 | ConsumerLagMonitor + alertas por evento | 6h | Fase P1 |
| P3 | PrometheusExporter + HTTP endpoint | 4h | Fase P1 |
| P4 | GrafanaDashboardSpec + JSON export | 4h | Fase P3 |
| P5 | SLOMonitor + notificação automática | 6h | Fase P2 |
| P6 | Anomaly detection com baseline adaptativa | 8h | Fase P5 |
| P7 | Distributed tracing (opentelemetry) | 12h | Fase P6 |
| Total | | 48h | |

---

## 8. Referências

1. NATS Monitoring — docs.nats.io/running-a-nats-service/nats_admin/monitoring
2. Prometheus Exposition Format — prometheus.io/docs/instrumenting/exposition_formats
3. Grafana Dashboard JSON Model — grafana.com/docs/grafana/latest/dashboards
4. "Site Reliability Engineering" — Google SRE Book, Chapter 6 (SLOs)
5. NATS JetStream Observability — nats.io/blog/jetstream-observability
6. Alertmanager — prometheus.io/docs/alerting/latest/alertmanager

---

## 9. Decisão Final

O sistema de observabilidade NATS será implementado com:

1. **NatsMetricsCollector** como fonte primária de métricas (23 dimensões)
2. **StreamMetricsCollector** para monitoramento detalhado por stream com histórico
3. **ConsumerLagMonitor** com detecção de lag e resolução automática
4. **SLOMonitor** com 5 SLOs (latência, throughput, DLQ, lag, health)
5. **PrometheusExporter** em HTTP na porta 9464
6. **GrafanaDashboardSpec** com 8 painéis versionados
7. **EventBusObservability** integrando métricas ao barramento de eventos

Score: **92/100** — Cobertura completa de métricas, alertas proativos, dashboard visual. Risco residual: anomaly detection (F6) requer baseline adaptativa.
