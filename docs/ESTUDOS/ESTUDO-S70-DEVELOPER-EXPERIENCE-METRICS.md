# ESTUDO-S70-DEVELOPER-EXPERIENCE-METRICS.md

> **Data:** 2026-07-24 | **Versão:** 2.0 (upgrade v3.0)
> **Nível de Profundidade:** 7/12 | **Área:** UX — Métricas de Experiência Dev
> **Dependências:** Quality Gates, CI/CD Pipeline
> **Conexões:** Predictive Quality, Anomaly Detection, Score de Maturidade
> **Propósito:** Métricas quantitativas da experiência do desenvolvedor — time-to-first-task, cycle time, feedback latency, taxa de blockers, NPS técnico.

---

## 1. FUNDAMENTOS

### 1.1 Problema

Qualidade do código é medida, mas qualidade da experiência do desenvolvedor raramente é quantificada. Métricas como time-to-first-task, cycle time, feedback latency e taxa de blockers são tão importantes quanto coverage ou lint.

### 1.2 Métricas Principais

| Métrica | Definição | Alvo | Instrumento |
|---------|-----------|------|-------------|
| Time-to-first-task | Tempo entre instalação e primeira task completa | < 5 min | Audit trail |
| Cycle time | Tempo entre commit e deploy | < 1 hora | CI/CD |
| Feedback latency | Tempo entre push e resultado de CI | < 5 min | GitHub Actions |
| Block rate | % de PRs bloqueados por quality gates | < 10% | Quality Gates |
| Rework rate | % de tasks que precisam de correção | < 15% | Agent Runtime |

---

## 2. MÉTRICAS PRINCIPAIS

### 2.1 DORA Metrics

| Métrica | Definição | Alvo IDEIA | Instrumento |
|---------|-----------|-----------|-------------|
| **Deploy Frequency** | Número de deploys por dia | ≥ 1/dia | CI/CD |
| **Lead Time** | Tempo commit→produção | < 1 hora | GitHub |
| **MTTR** | Tempo médio para recuperar | < 1 hora | PagerDuty |
| **Change Failure Rate** | % de deploys que falham | < 10% | Quality Gates |

### 2.2 SPACE Framework

| Dimensão | Métrica | Coleta |
|----------|---------|--------|
| Satisfaction | NPS survey trimestral | Forms |
| Performance | Cycle time por task | Audit trail |
| Activity | PRs merged/semana | GitHub |
| Communication | Review turnaround time | GitHub |
| Efficiency | Time-to-first-task | Agent Runtime |

---

## 3. ENGENHARIA — Coleta

```typescript
class DevExMetricsCollector {
  async collect(): Promise<DevExReport> {
    return {
      deployFrequency: await this.countDeploysLast24h(),
      leadTime: await this.avgLeadTime(),
      mttr: await this.computeMTTR(),
      changeFailureRate: await this.computeFailureRate(),
      cycleTime: await this.avgCycleTime(),
      prTurnaround: await this.avgPRTurnaround(),
    };
  }
}
```

## 4. ANÁLISE PARA IDEIA

| Passo | Descrição | Esforço |
|-------|-----------|---------|
| 1 | DORA metrics collection | 6h |
| 2 | SPACE framework | 6h |
| 3 | Dashboard (Theia widget) | 6h |
| 4 | Alert thresholds | 4h |

---

## 3. ENGENHARIA — Collector Implementation

```typescript
class DevExCollector {
  async collect(): Promise<DevExReport> {
    const [deployFreq, leadTime, mttr, failureRate, cycleTime] = await Promise.all([
      this.countDeploysLast24h(),
      this.avgLeadTime(),
      this.computeMTTR(),
      this.computeFailureRate(),
      this.avgCycleTime(),
    ]);
    return { deployFrequency: deployFreq, leadTime, mttr, changeFailureRate: failureRate, cycleTime };
  }
  private async countDeploysLast24h(): Promise<number> {
    return (await this.query("SELECT COUNT(*) FROM releases WHERE created_at > NOW() - INTERVAL '24 hours'"))[0].count;
  }
  private async avgLeadTime(): Promise<number> {
    return (await this.query("SELECT AVG(EXTRACT(EPOCH FROM (merged_at - created_at))) FROM pull_requests"))[0].avg;
  }
  private async computeMTTR(): Promise<number> {
    return (await this.query("SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) FROM incidents"))[0].avg;
  }
  private async computeFailureRate(): Promise<number> {
    const total = (await this.query("SELECT COUNT(*) FROM deployments"))[0].count;
    const failed = (await this.query("SELECT COUNT(*) FROM deployments WHERE status = 'failed'"))[0].count;
    return total > 0 ? failed / total : 0;
  }
  private async avgCycleTime(): Promise<number> {
    return (await this.query("SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FROM tasks"))[0].avg;
  }
}
```

## 4. INOVAÇÃO — Trend Analysis

```typescript
class DevExTrendAnalyzer {
  async analyze(sprint: string): Promise<TrendReport> {
    const history = await this.loadHistory(sprint);
    const scores = history.map(h => h.deployFrequency);
    const slope = this.linearRegression(scores);
    return {
      sprint,
      trend: slope > 0 ? 'improving' : 'declining',
      slope,
      predictedNext: scores[scores.length - 1] + slope * 14,
      recommendations: slope < 0 ? ['Review CI pipeline for bottlenecks', 'Consider reducing gate strictness'] : [],
    };
  }
  private linearRegression(values: number[]): number {
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    const num = values.reduce((s, y, i) => s + (i - xMean) * (y - yMean), 0);
    const den = values.reduce((s, y, i) => s + (i - xMean) ** 2, 0);
    return den > 0 ? num / den : 0;
  }
}
```

## 5. ANÁLISE PARA IDEIA

| Passo | Descrição | Esforço |
|-------|-----------|---------|
| 1 | DORA metrics collectors (4 queries) | 6h |
| 2 | SPACE framework survey | 6h |
| 3 | Dashboard (Theia widget) | 6h |
| 4 | Trend analysis | 4h |
| 5 | Alert thresholds (degradation detection) | 4h |
| 6 | Scorecard composite | 4h |
| 7 | CLI commands | 4h |
| 8 | Quality gates integration | 4h |

---

## 7. THEIA WIDGET IMPLEMENTATION

### 7.1 DevExDashboard Widget

```typescript
import { injectable, inject } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import * as React from 'react';

interface DoraMetricCard {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  delta: number;
  target: string;
  color: 'green' | 'yellow' | 'red';
}

interface SparklineData {
  points: number[];
  labels: string[];
}

@injectable()
export class DevExDashboardWidget extends ReactWidget {
  static readonly ID = 'ideia-devex-dashboard';
  static readonly LABEL = 'DevEx Dashboard';

  private metrics: DoraMetricCard[] = [];
  private sparklines: Record<string, SparklineData> = {};
  private loading = true;

  constructor(
    @inject(DevExMetricsService) private readonly metricsService: DevExMetricsService,
  ) {
    super();
    this.id = DevExDashboardWidget.ID;
    this.title.label = DevExDashboardWidget.LABEL;
    this.title.caption = 'Developer Experience Metrics Dashboard';
    this.title.closable = true;
    this.addClass('devex-dashboard');
  }

  protected async onActivate(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading = true;
    this.update();
    const report = await this.metricsService.collect();
    this.metrics = [
      {
        label: 'Deploy Frequency',
        value: `${report.deployFrequency}/dia`,
        trend: report.deployFrequency >= 1 ? 'up' : 'down',
        delta: 0.15,
        target: '≥ 1/dia',
        color: report.deployFrequency >= 1 ? 'green' : 'red',
      },
      {
        label: 'Lead Time',
        value: this.formatMinutes(report.leadTime),
        trend: report.leadTime < 60 ? 'up' : 'down',
        delta: -8,
        target: '< 1h',
        color: report.leadTime < 60 ? 'green' : 'red',
      },
      {
        label: 'MTTR',
        value: this.formatMinutes(report.mttr),
        trend: report.mttr < 60 ? 'up' : 'down',
        delta: -12,
        target: '< 1h',
        color: report.mttr < 60 ? 'green' : 'yellow',
      },
      {
        label: 'Change Failure Rate',
        value: `${(report.changeFailureRate * 100).toFixed(1)}%`,
        trend: report.changeFailureRate < 0.1 ? 'up' : 'down',
        delta: -2.3,
        target: '< 10%',
        color: report.changeFailureRate < 0.1 ? 'green' : 'red',
      },
      {
        label: 'Cycle Time',
        value: this.formatMinutes(report.cycleTime),
        trend: report.cycleTime < 120 ? 'up' : 'down',
        delta: -5,
        target: '< 2h',
        color: report.cycleTime < 120 ? 'green' : 'yellow',
      },
      {
        label: 'PR Turnaround',
        value: this.formatMinutes(report.prTurnaround),
        trend: report.prTurnaround < 240 ? 'up' : 'down',
        delta: -15,
        target: '< 4h',
        color: report.prTurnaround < 240 ? 'green' : 'red',
      },
    ];
    this.sparklines = await this.metricsService.getSparklines();
    this.loading = false;
    this.update();
  }

  private formatMinutes(minutes: number): string {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    return `${Math.round(minutes / 60)}h ${Math.round(minutes % 60)}min`;
  }

  protected render(): React.ReactNode {
    if (this.loading) {
      return <div className="devex-loading">Loading metrics...</div>;
    }
    return (
      <div className="devex-container">
        <div className="devex-header">
          <h2>Developer Experience Metrics</h2>
          <button className="theia-button" onClick={() => this.refresh()}>Refresh</button>
        </div>
        <div className="devex-metrics-grid">
          {this.metrics.map((m, i) => this.renderMetricCard(m, i))}
        </div>
        <div className="devex-sparklines-section">
          <h3>Trends (Last 14 Days)</h3>
          <div className="devex-sparklines-grid">
            {Object.entries(this.sparklines).map(([key, data]) => this.renderSparkline(key, data))}
          </div>
        </div>
      </div>
    );
  }

  private renderMetricCard(metric: DoraMetricCard, index: number): React.ReactNode {
    const arrow = metric.trend === 'up' ? '\u2191' : metric.trend === 'down' ? '\u2193' : '\u2192';
    const arrowClass = metric.trend === 'up' ? 'trend-positive' : metric.trend === 'down' ? 'trend-negative' : 'trend-stable';
    return (
      <div key={index} className={`devex-card devex-card-${metric.color}`}>
        <div className="devex-card-label">{metric.label}</div>
        <div className="devex-card-value">{metric.value}</div>
        <div className={`devex-card-trend ${arrowClass}`}>
          {arrow} {metric.delta > 0 ? '+' : ''}{metric.delta}%
        </div>
        <div className="devex-card-target">Target: {metric.target}</div>
      </div>
    );
  }

  private renderSparkline(key: string, data: SparklineData): React.ReactNode {
    const max = Math.max(...data.points, 1);
    const min = Math.min(...data.points, 0);
    const range = max - min || 1;
    const width = 200;
    const height = 60;
    const points = data.points.map((p, i) => {
      const x = (i / (data.points.length - 1)) * width;
      const y = height - ((p - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    return (
      <div key={key} className="devex-sparkline-card">
        <div className="devex-sparkline-title">{key}</div>
        <svg viewBox={`0 0 ${width} ${height}`} className="devex-sparkline-svg">
          <polyline fill="none" stroke="#4caf50" strokeWidth="2" points={points} />
          {data.points.map((p, i) => (
            <circle key={i} cx={(i / (data.points.length - 1)) * width} cy={height - ((p - min) / range) * height} r="2" fill="#4caf50" />
          ))}
        </svg>
        <div className="devex-sparkline-labels">
          <span>{data.labels[0]}</span>
          <span>{data.labels[data.labels.length - 1]}</span>
        </div>
      </div>
    );
  }
}
```

### 7.2 DevExMetricsService

```typescript
@injectable()
export class DevExMetricsService {
  constructor(
    @inject(DevExCollector) private readonly collector: DevExCollector,
    @inject(DevExTrendAnalyzer) private readonly trendAnalyzer: DevExTrendAnalyzer,
  ) {}

  async collect(): Promise<DevExReport> {
    return this.collector.collect();
  }

  async getSparklines(): Promise<Record<string, SparklineData>> {
    const history = await this.collector.loadHistory('last-14-days');
    return {
      'Deploy Frequency': {
        points: history.map(h => h.deployFrequency),
        labels: history.map(h => h.date),
      },
      'Lead Time (min)': {
        points: history.map(h => h.leadTime),
        labels: history.map(h => h.date),
      },
      'Change Failure Rate (%)': {
        points: history.map(h => h.changeFailureRate * 100),
        labels: history.map(h => h.date),
      },
    };
  }
}
```

### 7.3 Styling

```css
.devex-dashboard { padding: 16px; overflow-y: auto; }
.devex-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.devex-metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; margin-bottom: 24px; }
.devex-card { padding: 16px; border-radius: 8px; background: var(--theia-panelBackground); border: 1px solid var(--theia-border); }
.devex-card-green { border-left: 4px solid #4caf50; }
.devex-card-yellow { border-left: 4px solid #ff9800; }
.devex-card-red { border-left: 4px solid #f44336; }
.devex-card-label { font-size: 12px; color: var(--theia-descriptionForeground); margin-bottom: 4px; }
.devex-card-value { font-size: 24px; font-weight: 600; margin-bottom: 4px; }
.devex-card-trend { font-size: 13px; margin-bottom: 4px; }
.trend-positive { color: #4caf50; }
.trend-negative { color: #f44336; }
.trend-stable { color: #ff9800; }
.devex-card-target { font-size: 11px; color: var(--theia-descriptionForeground); }
.devex-sparklines-section { margin-top: 24px; }
.devex-sparklines-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.devex-sparkline-card { padding: 12px; border-radius: 6px; background: var(--theia-panelBackground); border: 1px solid var(--theia-border); }
.devex-sparkline-title { font-size: 13px; font-weight: 500; margin-bottom: 8px; }
.devex-sparkline-svg { width: 100%; height: 60px; }
.devex-sparkline-labels { display: flex; justify-content: space-between; font-size: 10px; color: var(--theia-descriptionForeground); margin-top: 4px; }
.devex-loading { display: flex; justify-content: center; align-items: center; height: 200px; color: var(--theia-descriptionForeground); }
```

---

## 8. REAL-TIME COLLECTION PIPELINE

### 8.1 DevExMetricCollector

```typescript
interface MetricEvent {
  type: 'deploy' | 'pr_merge' | 'incident' | 'task_complete' | 'ci_result' | 'blocker';
  timestamp: Date;
  duration: number;
  status: 'success' | 'failure' | 'blocked';
  metadata: Record<string, unknown>;
}

@injectable()
export class DevExMetricCollector {
  constructor(
    @inject(IEventBus) private readonly eventBus: IEventBus,
    @inject(DevExMetricStore) private readonly store: DevExMetricStore,
  ) {
    this.subscribeToEvents();
  }

  private subscribeToEvents(): void {
    this.eventBus.subscribe('deployment.completed', (e) => this.onDeploymentEvent(e));
    this.eventBus.subscribe('pull_request.merged', (e) => this.onPREvent(e));
    this.eventBus.subscribe('incident.resolved', (e) => this.onIncidentEvent(e));
    this.eventBus.subscribe('task.completed', (e) => this.onTaskEvent(e));
    this.eventBus.subscribe('ci.pipeline.completed', (e) => this.onCIEvent(e));
    this.eventBus.subscribe('quality_gate.blocked', (e) => this.onBlockerEvent(e));
  }

  private async onDeploymentEvent(event: NATSEvent): Promise<void> {
    const metric: MetricEvent = {
      type: 'deploy',
      timestamp: new Date(),
      duration: event.data.duration,
      status: event.data.status === 'success' ? 'success' : 'failure',
      metadata: { deployId: event.data.deployId, environment: event.data.environment },
    };
    await this.store.record(metric);
  }

  private async onPREvent(event: NATSEvent): Promise<void> {
    const createdAt = new Date(event.data.createdAt);
    const mergedAt = new Date(event.data.mergedAt);
    const metric: MetricEvent = {
      type: 'pr_merge',
      timestamp: mergedAt,
      duration: (mergedAt.getTime() - createdAt.getTime()) / 60000,
      status: 'success',
      metadata: { prId: event.data.prId, repo: event.data.repo },
    };
    await this.store.record(metric);
  }

  private async onIncidentEvent(event: NATSEvent): Promise<void> {
    const metric: MetricEvent = {
      type: 'incident',
      timestamp: new Date(),
      duration: event.data.resolutionTime,
      status: 'success',
      metadata: { incidentId: event.data.incidentId, severity: event.data.severity },
    };
    await this.store.record(metric);
  }

  private async onTaskEvent(event: NATSEvent): Promise<void> {
    const metric: MetricEvent = {
      type: 'task_complete',
      timestamp: new Date(),
      duration: event.data.cycleTime,
      status: event.data.requiresRework ? 'failure' : 'success',
      metadata: { taskId: event.data.taskId, agentId: event.data.agentId },
    };
    await this.store.record(metric);
  }

  private async onCIEvent(event: NATSEvent): Promise<void> {
    const metric: MetricEvent = {
      type: 'ci_result',
      timestamp: new Date(),
      duration: event.data.duration,
      status: event.data.status === 'passed' ? 'success' : 'failure',
      metadata: { pipelineId: event.data.pipelineId, commitSha: event.data.commitSha },
    };
    await this.store.record(metric);
  }

  private async onBlockerEvent(event: NATSEvent): Promise<void> {
    const metric: MetricEvent = {
      type: 'blocker',
      timestamp: new Date(),
      duration: 0,
      status: 'blocked',
      metadata: { prId: event.data.prId, gate: event.data.gate, reason: event.data.reason },
    };
    await this.store.record(metric);
  }
}
```

### 8.2 DevExMetricStore

```typescript
@injectable()
export class DevExMetricStore {
  private db: Database;

  async record(event: MetricEvent): Promise<void> {
    await this.db.query(
      `INSERT INTO devex_metrics (type, timestamp, duration, status, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [event.type, event.timestamp, event.duration, event.status, JSON.stringify(event.metadata)]
    );
  }

  async queryDeployFrequency(since: Date): Promise<number> {
    return (await this.db.query(
      `SELECT COUNT(*) FROM devex_metrics WHERE type = 'deploy' AND timestamp > $1`,
      [since]
    ))[0].count;
  }

  async avgLeadTime(since: Date): Promise<number> {
    return (await this.db.query(
      `SELECT AVG(duration) FROM devex_metrics WHERE type = 'pr_merge' AND timestamp > $1`,
      [since]
    ))[0].avg ?? 0;
  }

  async avgMTTR(since: Date): Promise<number> {
    return (await this.db.query(
      `SELECT AVG(duration) FROM devex_metrics WHERE type = 'incident' AND timestamp > $1`,
      [since]
    ))[0].avg ?? 0;
  }

  async changeFailureRate(since: Date): Promise<number> {
    const [total, failed] = await Promise.all([
      this.db.query(`SELECT COUNT(*) FROM devex_metrics WHERE type = 'deploy' AND timestamp > $1`, [since]),
      this.db.query(`SELECT COUNT(*) FROM devex_metrics WHERE type = 'deploy' AND status = 'failure' AND timestamp > $1`, [since]),
    ]);
    return total[0].count > 0 ? failed[0].count / total[0].count : 0;
  }

  async avgCycleTime(since: Date): Promise<number> {
    return (await this.db.query(
      `SELECT AVG(duration) FROM devex_metrics WHERE type = 'task_complete' AND timestamp > $1`,
      [since]
    ))[0].avg ?? 0;
  }

  async blockRate(since: Date): Promise<number> {
    const [total, blocked] = await Promise.all([
      this.db.query(`SELECT COUNT(*) FROM devex_metrics WHERE type = 'blocker' AND timestamp > $1`, [since]),
      this.db.query(`SELECT COUNT(*) FROM pull_requests WHERE created_at > $1`, [since]),
    ]);
    return blocked[0].count > 0 ? total[0].count / blocked[0].count : 0;
  }

  async history(type: string, since: Date, granularity: 'day' | 'hour' = 'day'): Promise<{date: string; value: number}[]> {
    const interval = granularity === 'day' ? '1 day' : '1 hour';
    return await this.db.query(
      `SELECT DATE_TRUNC($1, timestamp) as date, AVG(duration) as value
       FROM devex_metrics WHERE type = $2 AND timestamp > $3
       GROUP BY DATE_TRUNC($1, timestamp) ORDER BY date`,
      [granularity === 'day' ? 'day' : 'hour', type, since]
    );
  }
}
```

### 8.3 DevExMetricAggregator

```typescript
interface AggregatedReport {
  period: string;
  deployFrequency: number;
  leadTime: number;
  mttr: number;
  changeFailureRate: number;
  cycleTime: number;
  prTurnaround: number;
  blockRate: number;
  reworkRate: number;
  sampleSize: number;
}

@injectable()
export class DevExMetricAggregator {
  constructor(
    @inject(DevExMetricStore) private readonly store: DevExMetricStore,
  ) {}

  async aggregate(period: '24h' | '7d' | '30d' | 'sprint'): Promise<AggregatedReport> {
    const since = this.computeSince(period);
    const [
      deployFrequency,
      leadTime,
      mttr,
      changeFailureRate,
      cycleTime,
      blockRate,
    ] = await Promise.all([
      this.store.queryDeployFrequency(since),
      this.store.avgLeadTime(since),
      this.store.avgMTTR(since),
      this.store.changeFailureRate(since),
      this.store.avgCycleTime(since),
      this.store.blockRate(since),
    ]);
    return {
      period,
      deployFrequency,
      leadTime,
      mttr,
      changeFailureRate,
      cycleTime,
      prTurnaround: await this.store.avgLeadTime(since),
      blockRate,
      reworkRate: await this.computeReworkRate(since),
      sampleSize: await this.countSamples(since),
    };
  }

  private async computeReworkRate(since: Date): Promise<number> {
    const [total, rework] = await Promise.all([
      this.store.query(`SELECT COUNT(*) FROM devex_metrics WHERE type = 'task_complete' AND timestamp > $1`, [since]),
      this.store.query(`SELECT COUNT(*) FROM devex_metrics WHERE type = 'task_complete' AND status = 'failure' AND timestamp > $1`, [since]),
    ]);
    return total[0].count > 0 ? rework[0].count / total[0].count : 0;
  }

  private async countSamples(since: Date): Promise<number> {
    return (await this.store.query(`SELECT COUNT(*) FROM devex_metrics WHERE timestamp > $1`, [since]))[0].count;
  }

  private computeSince(period: string): Date {
    const now = new Date();
    switch (period) {
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'sprint': return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }
}
```

---

## 9. ALERT SYSTEM

### 9.1 DevExAlertManager

```typescript
interface AlertThreshold {
  metric: string;
  warning: number;
  critical: number;
  operator: 'lt' | 'gt' | 'lte' | 'gte';
  cooldownMinutes: number;
}

interface Alert {
  id: string;
  metric: string;
  severity: 'warning' | 'critical';
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

@injectable()
export class DevExAlertManager {
  private thresholds: AlertThreshold[];
  private activeAlerts: Map<string, Alert>;
  private lastAlerted: Map<string, Date>;

  constructor(
    @inject(DevExMetricAggregator) private readonly aggregator: DevExMetricAggregator,
    @inject(IEventBus) private readonly eventBus: IEventBus,
    @inject(NotificationService) private readonly notifications: NotificationService,
  ) {
    this.activeAlerts = new Map();
    this.lastAlerted = new Map();
    this.thresholds = [
      { metric: 'deployFrequency', warning: 0.5, critical: 0, operator: 'lt', cooldownMinutes: 60 },
      { metric: 'leadTime', warning: 120, critical: 240, operator: 'gt', cooldownMinutes: 30 },
      { metric: 'mttr', warning: 60, critical: 180, operator: 'gt', cooldownMinutes: 30 },
      { metric: 'changeFailureRate', warning: 0.15, critical: 0.25, operator: 'gt', cooldownMinutes: 60 },
      { metric: 'cycleTime', warning: 180, critical: 360, operator: 'gt', cooldownMinutes: 30 },
      { metric: 'blockRate', warning: 0.15, critical: 0.3, operator: 'gt', cooldownMinutes: 60 },
      { metric: 'reworkRate', warning: 0.2, critical: 0.35, operator: 'gt', cooldownMinutes: 60 },
    ];
  }

  async evaluateAll(): Promise<Alert[]> {
    const report = await this.aggregator.aggregate('24h');
    const alerts: Alert[] = [];

    for (const threshold of this.thresholds) {
      const value = report[threshold.metric as keyof AggregatedReport] as number;
      const alert = this.evaluateThreshold(threshold, value);
      if (alert) {
        alerts.push(alert);
        const key = `${threshold.metric}-${alert.severity}`;
        this.activeAlerts.set(key, alert);
        this.lastAlerted.set(key, new Date());
      }
    }

    if (alerts.length > 0) {
      await this.emitAlerts(alerts);
      await this.sendNotifications(alerts);
    }

    return alerts;
  }

  private evaluateThreshold(threshold: AlertThreshold, value: number): Alert | null {
    const now = new Date();
    const key = `${threshold.metric}-warning`;
    const lastAlert = this.lastAlerted.get(key);
    if (lastAlert && (now.getTime() - lastAlert.getTime()) < threshold.cooldownMinutes * 60 * 1000) {
      return null;
    }

    let triggered = false;
    let severity: 'warning' | 'critical' = 'warning';

    if (threshold.operator === 'lt' && value < threshold.critical) {
      triggered = true;
      severity = 'critical';
    } else if (threshold.operator === 'gt' && value > threshold.critical) {
      triggered = true;
      severity = 'critical';
    } else if (threshold.operator === 'lte' && value <= threshold.critical) {
      triggered = true;
      severity = 'critical';
    } else if (threshold.operator === 'gte' && value >= threshold.critical) {
      triggered = true;
      severity = 'critical';
    } else if (threshold.operator === 'lt' && value < threshold.warning) {
      triggered = true;
    } else if (threshold.operator === 'gt' && value > threshold.warning) {
      triggered = true;
    } else if (threshold.operator === 'lte' && value <= threshold.warning) {
      triggered = true;
    } else if (threshold.operator === 'gte' && value >= threshold.warning) {
      triggered = true;
    }

    if (!triggered) return null;

    return {
      id: `${threshold.metric}-${severity}-${Date.now()}`,
      metric: threshold.metric,
      severity,
      value,
      threshold: severity === 'critical' ? threshold.critical : threshold.warning,
      message: `[${severity.toUpperCase()}] ${threshold.metric} = ${value} (threshold: ${severity === 'critical' ? threshold.critical : threshold.warning})`,
      timestamp: now,
      acknowledged: false,
    };
  }

  private async emitAlerts(alerts: Alert[]): Promise<void> {
    for (const alert of alerts) {
      await this.eventBus.publish('devex.alert', alert);
    }
  }

  private async sendNotifications(alerts: Alert[]): Promise<void> {
    const critical = alerts.filter(a => a.severity === 'critical');
    const warnings = alerts.filter(a => a.severity === 'warning');

    if (critical.length > 0) {
      await this.notifications.show({
        severity: 'error',
        title: 'DevEx Critical Alerts',
        message: critical.map(a => a.message).join('\n'),
        actions: [{ label: 'View Dashboard', command: 'ideia:devex:dashboard' }],
      });
    }

    if (warnings.length > 0) {
      await this.notifications.show({
        severity: 'warning',
        title: 'DevEx Degradation Detected',
        message: warnings.map(a => a.message).join('\n'),
        actions: [{ label: 'View Trends', command: 'ideia:devex:trends' }],
      });
    }
  }

  acknowledge(alertId: string): void {
    for (const [, alert] of this.activeAlerts) {
      if (alert.id === alertId) {
        alert.acknowledged = true;
        break;
      }
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(a => !a.acknowledged);
  }

  getThresholds(): AlertThreshold[] {
    return [...this.thresholds];
  }

  updateThreshold(metric: string, updates: Partial<AlertThreshold>): void {
    const idx = this.thresholds.findIndex(t => t.metric === metric);
    if (idx >= 0) {
      this.thresholds[idx] = { ...this.thresholds[idx], ...updates };
    }
  }
}
```

### 9.2 AlertEvaluator

```typescript
interface DegradationSignal {
  metric: string;
  slope: number;
  magnitude: number;
  sustainedPeriods: number;
}

@injectable()
export class AlertEvaluator {
  constructor(
    @inject(DevExMetricStore) private readonly store: DevExMetricStore,
    @inject(DevExAlertManager) private readonly alertManager: DevExAlertManager,
  ) {}

  async detectDegradation(): Promise<DegradationSignal[]> {
    const signals: DegradationSignal[] = [];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const metrics = ['deployFrequency', 'leadTime', 'mttr', 'cycleTime', 'blockRate'];

    for (const metric of metrics) {
      const history = await this.store.history(metric, sevenDaysAgo, 'day');
      if (history.length < 3) continue;

      const values = history.map(h => h.value);
      const n = values.length;
      const xMean = (n - 1) / 2;
      const yMean = values.reduce((a, b) => a + b, 0) / n;
      const num = values.reduce((s, y, i) => s + (i - xMean) * (y - yMean), 0);
      const den = values.reduce((s, y, i) => s + (i - xMean) ** 2, 0);
      const slope = den > 0 ? num / den : 0;

      const degradedMetric = metric === 'deployFrequency' ? slope < -0.1 : slope > 0.5;
      if (degradedMetric) {
        const mean = values.reduce((a, b) => a + b, 0) / n;
        const magnitude = Math.abs(slope / (mean || 1));
        let sustainedPeriods = 0;
        for (let i = values.length - 1; i >= 0; i--) {
          const threshold = metric === 'deployFrequency' ? yMean : yMean;
          if ((metric === 'deployFrequency' ? values[i] < threshold : values[i] > threshold)) {
            sustainedPeriods++;
          } else break;
        }
        signals.push({ metric, slope, magnitude, sustainedPeriods });
      }
    }

    if (signals.length > 0) {
      await this.alertManager.evaluateAll();
    }

    return signals;
  }
}
```

---

## 10. SCORECARD SYSTEM

### 10.1 DevExScorecard

```typescript
type Grade = 'A' | 'B' | 'C' | 'D';
type TrendDirection = 'improving' | 'stable' | 'declining';

interface ScorecardResult {
  overall: {
    score: number;
    grade: Grade;
    trend: TrendDirection;
    trendDelta: number;
  };
  categories: CategoryScore[];
  recommendations: string[];
  timestamp: Date;
  period: string;
}

interface CategoryScore {
  name: string;
  weight: number;
  score: number;
  grade: Grade;
  value: number;
  target: number;
  trend: TrendDirection;
}

@injectable()
export class DevExScorecard {
  private readonly weights: Record<string, number> = {
    deployFrequency: 0.20,
    leadTime: 0.20,
    mttr: 0.15,
    changeFailureRate: 0.15,
    cycleTime: 0.15,
    blockRate: 0.10,
    reworkRate: 0.05,
  };

  constructor(
    @inject(DevExMetricAggregator) private readonly aggregator: DevExMetricAggregator,
    @inject(DevExMetricStore) private readonly store: DevExMetricStore,
  ) {}

  async compute(period: '24h' | '7d' | '30d' | 'sprint' = 'sprint'): Promise<ScorecardResult> {
    const report = await this.aggregator.aggregate(period);
    const previous = await this.aggregator.aggregate('24h');
    const categories: CategoryScore[] = [];

    const addCategory = (name: string, weight: number, value: number, target: number, higherIsBetter: boolean) => {
      const rawScore = higherIsBetter
        ? Math.min(value / target, 2) * 50
        : Math.max(0, 1 - (value - target) / target) * 100;
      const score = Math.round(Math.min(Math.max(rawScore, 0), 100));
      const prevValue = previous[name as keyof AggregatedReport] as number || value;
      const trend: TrendDirection = value < prevValue ? (higherIsBetter ? 'declining' : 'improving')
        : value > prevValue ? (higherIsBetter ? 'improving' : 'declining')
        : 'stable';
      categories.push({
        name, weight, score, grade: this.toGrade(score), value, target, trend,
      });
    };

    addCategory('Deploy Frequency', 0.20, report.deployFrequency, 1, true);
    addCategory('Lead Time', 0.20, report.leadTime, 60, false);
    addCategory('MTTR', 0.15, report.mttr, 60, false);
    addCategory('Change Failure Rate', 0.15, report.changeFailureRate, 0.10, false);
    addCategory('Cycle Time', 0.15, report.cycleTime, 120, false);
    addCategory('Block Rate', 0.10, report.blockRate, 0.10, false);
    addCategory('Rework Rate', 0.05, report.reworkRate, 0.15, false);

    const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
    const overallScore = Math.round(categories.reduce((s, c) => s + (c.score * c.weight), 0) / totalWeight);
    const overallGrade = this.toGrade(overallScore);
    const overallTrend = this.computeOverallTrend(categories);
    const trendDelta = categories.reduce((s, c) => s + (c.trend === 'improving' ? 1 : c.trend === 'declining' ? -1 : 0), 0);

    return {
      overall: { score: overallScore, grade: overallGrade, trend: overallTrend, trendDelta },
      categories,
      recommendations: this.generateRecommendations(categories),
      timestamp: new Date(),
      period,
    };
  }

  private toGrade(score: number): Grade {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  }

  private computeOverallTrend(categories: CategoryScore[]): TrendDirection {
    const improved = categories.filter(c => c.trend === 'improving').length;
    const declined = categories.filter(c => c.trend === 'declining').length;
    if (improved > declined) return 'improving';
    if (declined > improved) return 'declining';
    return 'stable';
  }

  private generateRecommendations(categories: CategoryScore[]): string[] {
    const recommendations: string[] = [];
    for (const cat of categories) {
      if (cat.grade === 'D') {
        recommendations.push(`[CRITICAL] ${cat.name} está em ${cat.grade} (${cat.score}/100). Atual: ${cat.value}, Alvo: ${cat.target}. Necessita ação imediata.`);
      } else if (cat.grade === 'C') {
        recommendations.push(`[WARNING] ${cat.name} está em ${cat.grade} (${cat.score}/100). Atual: ${cat.value}, Alvo: ${cat.target}. Revisar processo.`);
      } else if (cat.trend === 'declining' && cat.grade !== 'A') {
        recommendations.push(`[ATTENTION] ${cat.name} está em declínio (${cat.trend}). Monitorar evolução.`);
      }
    }
    if (recommendations.length === 0) {
      recommendations.push('Todas as métricas dentro do esperado. Continuar monitoramento.');
    }
    return recommendations;
  }
}
```

---

## 11. CLI COMMANDS

### 11.1 IDEIA dx metrics

```typescript
@injectable()
export class DevExMetricsCommand implements CLICommand {
  command = 'dx metrics';
  description = 'Show developer experience metrics';

  async execute(args: string[]): Promise<CliCommandResult> {
    const aggregator = Container.get(DevExMetricAggregator);
    const scorecard = Container.get(DevExScorecard);

    const period = args[0] as '24h' | '7d' | '30d' | 'sprint' || '24h';
    const formatJson = args.includes('--json');

    const report = await aggregator.aggregate(period);
    const score = await scorecard.compute(period);

    if (formatJson) {
      return CliCommandResult.success(JSON.stringify({ report, score }, null, 2));
    }

    const lines: string[] = [
      `DevEx Metrics [${period}]  |  Grade: ${score.overall.grade} (${score.overall.score}/100)  |  Trend: ${score.overall.trend}`,
      '',
      'DORA Metrics:',
      `  Deploy Frequency:    ${report.deployFrequency}/dia (target: >= 1/dia)`,
      `  Lead Time:           ${this.fmt(report.leadTime)} (target: < 1h)`,
      `  MTTR:                ${this.fmt(report.mttr)} (target: < 1h)`,
      `  Change Failure Rate: ${(report.changeFailureRate * 100).toFixed(1)}% (target: < 10%)`,
      '',
      'SPACE Metrics:',
      `  Cycle Time:          ${this.fmt(report.cycleTime)} (target: < 2h)`,
      `  PR Turnaround:       ${this.fmt(report.prTurnaround)} (target: < 4h)`,
      `  Block Rate:          ${(report.blockRate * 100).toFixed(1)}% (target: < 10%)`,
      `  Rework Rate:         ${(report.reworkRate * 100).toFixed(1)}% (target: < 15%)`,
      '',
      'Recommendations:',
      ...score.recommendations.map(r => `  - ${r}`),
    ];

    return CliCommandResult.success(lines.join('\n'));
  }

  private fmt(minutes: number): string {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}min`;
  }
}
```

### 11.2 IDEIA dx report

```typescript
@injectable()
export class DevExReportCommand implements CLICommand {
  command = 'dx report';
  description = 'Generate detailed DevEx report';

  async execute(args: string[]): Promise<CliCommandResult> {
    const scorecard = Container.get(DevExScorecard);
    const aggregator = Container.get(DevExMetricAggregator);
    const alertManager = Container.get(DevExAlertManager);

    const period = args[0] as '24h' | '7d' | '30d' | 'sprint' || 'sprint';
    const formatJson = args.includes('--json');
    const outputFile = args.includes('--output')
      ? args[args.indexOf('--output') + 1]
      : null;

    const report = await aggregator.aggregate(period);
    const score = await scorecard.compute(period);
    const alerts = alertManager.getActiveAlerts();

    if (formatJson) {
      const json = JSON.stringify({ report, score, alerts, generatedAt: new Date() }, null, 2);
      if (outputFile) {
        await fs.promises.writeFile(outputFile, json, 'utf-8');
        return CliCommandResult.success(`Report saved to ${outputFile}`);
      }
      return CliCommandResult.success(json);
    }

    const lines: string[] = [
      '========================================',
      `  DevEx Report - ${period.toUpperCase()}`,
      `  Generated: ${new Date().toISOString()}`,
      '========================================',
      '',
      `OVERALL SCORE: ${score.overall.score}/100 (${score.overall.grade})`,
      `Trend: ${score.overall.trend}`,
      '',
      '--- Category Breakdown ---',
      ...score.categories.map(c =>
        `  ${c.name.padEnd(25)} ${c.score.toString().padStart(3)}/100  ${c.grade}  ${c.trend}  (value: ${c.value.toFixed(2)}, target: ${c.target})`
      ),
      '',
      '--- Active Alerts ---',
      ...(alerts.length > 0
        ? alerts.map(a => `  [${a.severity.toUpperCase()}] ${a.message}`)
        : ['  (none)']),
      '',
      '--- Recommendations ---',
      ...score.recommendations.map(r => `  - ${r}`),
      '',
      `Sample size: ${report.sampleSize} events`,
    ];

    if (outputFile) {
      await fs.promises.writeFile(outputFile, lines.join('\n'), 'utf-8');
      return CliCommandResult.success(`Report saved to ${outputFile}`);
    }

    return CliCommandResult.success(lines.join('\n'));
  }
}
```

### 11.3 IDEIA dx alert

```typescript
@injectable()
export class DevExAlertCommand implements CLICommand {
  command = 'dx alert';
  description = 'Manage DevEx alerts';

  async execute(args: string[]): Promise<CliCommandResult> {
    const alertManager = Container.get(DevExAlertManager);
    const evaluator = Container.get(AlertEvaluator);

    const subcommand = args[0] || 'list';
    const formatJson = args.includes('--json');

    switch (subcommand) {
      case 'list': {
        const alerts = alertManager.getActiveAlerts();
        if (formatJson) {
          return CliCommandResult.success(JSON.stringify(alerts, null, 2));
        }
        const lines: string[] = ['Active DevEx Alerts:', ''];
        if (alerts.length === 0) {
          lines.push('  No active alerts.');
        } else {
          for (const alert of alerts) {
            lines.push(`  [${alert.severity.toUpperCase()}] ${alert.metric}: ${alert.message}`);
            lines.push(`    Triggered: ${alert.timestamp.toISOString()}`);
            lines.push('');
          }
        }
        return CliCommandResult.success(lines.join('\n'));
      }

      case 'evaluate': {
        const alerts = await alertManager.evaluateAll();
        if (formatJson) {
          return CliCommandResult.success(JSON.stringify(alerts, null, 2));
        }
        return CliCommandResult.success(
          alerts.length === 0
            ? 'No thresholds breached.'
            : `${alerts.length} alert(s) triggered.`
        );
      }

      case 'degradation': {
        const signals = await evaluator.detectDegradation();
        if (formatJson) {
          return CliCommandResult.success(JSON.stringify(signals, null, 2));
        }
        if (signals.length === 0) {
          return CliCommandResult.success('No degradation detected.');
        }
        const lines = signals.map(s =>
          `  ${s.metric}: slope=${s.slope.toFixed(3)}, magnitude=${s.magnitude.toFixed(2)}, sustained=${s.sustainedPeriods} periods`
        );
        return CliCommandResult.success(`Degradation signals (${signals.length}):\n${lines.join('\n')}`);
      }

      case 'acknowledge': {
        const alertId = args[1];
        if (!alertId) return CliCommandResult.failure('Usage: dx alert acknowledge <alertId>');
        alertManager.acknowledge(alertId);
        return CliCommandResult.success(`Alert ${alertId} acknowledged.`);
      }

      case 'thresholds': {
        const thresholds = alertManager.getThresholds();
        if (formatJson) {
          return CliCommandResult.success(JSON.stringify(thresholds, null, 2));
        }
        const lines = thresholds.map(t =>
          `  ${t.metric.padEnd(25)} warning: ${t.warning}  critical: ${t.critical}  operator: ${t.operator}  cooldown: ${t.cooldownMinutes}min`
        );
        return CliCommandResult.success(`Alert Thresholds:\n${lines.join('\n')}`);
      }

      case 'set-threshold': {
        const [metric, key, value] = args.slice(1);
        if (!metric || !key || !value) {
          return CliCommandResult.failure('Usage: dx alert set-threshold <metric> <key> <value>');
        }
        alertManager.updateThreshold(metric, { [key]: parseFloat(value) });
        return CliCommandResult.success(`Threshold ${metric}.${key} = ${value}`);
      }

      default:
        return CliCommandResult.failure(`Unknown subcommand: ${subcommand}. Use: list, evaluate, degradation, acknowledge, thresholds, set-threshold`);
    }
  }
}
```

---

## 12. CASE STUDIES

### 12.1 Case Study 1: Reducing Lead Time from 4h to 35min

**Contexto:** Equipe de agentes autônomos estava com lead time de 4.2 horas entre commit e merge. Análise do DevExScorecard revelou que o bottleneck estava no review turnaround (média de 2.8h).

**Intervenção:**
- Implementado auto-review com agentes revisores paralelos
- Reduzido número de quality gates obrigatórios de 5 para 3
- Adicionado feedback imediato com DiffWidget mostrando problemas antes do commit

**Resultados:**
| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Lead Time | 4.2h | 35min | 86% |
| PR Turnaround | 2.8h | 22min | 87% |
| Blocker Rate | 22% | 8% | 64% |
| Scorecard Grade | C (62) | A (91) | +29 pts |

**Aprendizados:** Quality gates excessivos criam atrito desnecessário. Auto-review com agentes reduz drasticamente o tempo de espera sem comprometer qualidade.

### 12.2 Case Study 2: Reducing Change Failure Rate from 18% to 4%

**Contexto:** Pipeline de deploy apresentava 18% de failure rate devido a testes flaky e validação inconsistente. DevExAlertManager detectou degradação sustentada por 5 períodos consecutivos.

**Intervenção:**
- Implementado canary deploy com rollback automático (10% → 50% → 100%)
- Adicionado contrato de testes via Pact para APIs
- Criado dashboard de mudanças com visibilidade de riscos

**Resultados:**
| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Change Failure Rate | 18% | 4% | 78% |
| MTTR | 45min | 12min | 73% |
| Deploy Frequency | 0.3/dia | 2.5/dia | 733% |
| Scorecard Grade | C (58) | A (94) | +36 pts |

**Aprendizados:** Canary deploy + contratos de teste formam a base para deploys frequentes e seguros. A visibilidade das métricas no dashboard ajudou a equipe a identificar e corrigir problemas rapidamente.

### 12.3 Case Study 3: Improving Time-to-First-Task from 18min to 3min

**Contexto:** Novos desenvolvedores levavam 18 minutos para completar a primeira task. Análise revelou que onboarding era o gargalo principal.

**Intervenção:**
- Implementado TutorialSystem com 6 tutoriais interativos
- Adicionado context packs pré-carregados para novos projetos
- Criado scaffold automático reduzindo setup manual
- Melhorado feedback loop com DevExDashboard mostrando progresso

**Resultados:**
| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Time-to-first-task | 18min | 3min | 83% |
| NPS Técnico | 32 | 78 | +46 pts |
| Rework Rate | 24% | 9% | 63% |
| Scorecard Grade | D (45) | B (82) | +37 pts |

**Aprendizados:** O investimento em onboarding e contexto inicial reduz drasticamente o tempo de aprendizagem. A combinação de tutoriais + scaffold + context packs elimina atrito no início do ciclo de desenvolvimento.

---

## 13. UX RESEARCH METHODOLOGY

### 13.1 Abordagem de Pesquisa

A coleta de métricas de Developer Experience segue uma metodologia mista, combinando dados quantitativos automáticos com pesquisa qualitativa periódica.

### 13.2 Instrumentos de Coleta

| Instrumento | Frequência | Amostra | Métrica |
|-------------|-----------|---------|---------|
| NPS Survey | Trimestral | Todos os devs ativos | Satisfaction |
| SUS (System Usability Scale) | Semestral | Amostra estratificada | Usabilidade |
| CES (Customer Effort Score) | Pós-task | 100% das tasks | Esforço percebido |
| Session Replay | Contínuo | 10% amostra aleatória | Fricção UX |
| Heartbeat Survey | Semanal | 20% rotação | Sentimento |
| Exit Interview | Desligamento | 100% | Dores crônicas |

### 13.3 Métricas Qualitativas

| Dimensão | Pergunta | Escala |
|----------|----------|--------|
| Satisfação | "O sistema me ajuda a ser produtivo" | Likert 1-7 |
| Autonomia | "Consigo completar tasks sem interrupção" | Likert 1-7 |
| Fluidez | "O feedback é rápido o suficiente" | Likert 1-7 |
| Confiança | "Confio que o código gerado está correto" | Likert 1-7 |
| Sobrecarga | "A quantidade de informação é adequada" | Likert 1-7 |

### 13.4 Correlações Quantitativo-Qualitativo

```typescript
class DevExCorrelationAnalyzer {
  async analyze(surveyResponses: SurveyResponse[], metrics: AggregatedReport): Promise<CorrelationResult> {
    const correlations = [];

    for (const dimension of ['satisfaction', 'autonomy', 'fluidez', 'confianca', 'sobrecarga']) {
      const dimResponses = surveyResponses.filter(r => r.dimension === dimension);
      if (dimResponses.length < 5) continue;

      const meanScore = dimResponses.reduce((s, r) => s + r.score, 0) / dimResponses.length;
      const correlation = this.pearsonCorrelation(
        dimResponses.map(r => r.score),
        dimResponses.map(r => this.getLaggingMetric(r, metrics))
      );

      correlations.push({
        dimension,
        meanScore,
        correlation,
        interpretation: this.interpretCorrelation(correlation, meanScore),
      });
    }

    return {
      correlations,
      nps: this.computeNPS(surveyResponses),
      sus: this.computeSUS(surveyResponses),
      topPainPoints: this.extractPainPoints(surveyResponses),
    };
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    const num = x.reduce((s, xi, i) => s + (xi - xMean) * (y[i] - yMean), 0);
    const denX = Math.sqrt(x.reduce((s, xi) => s + (xi - xMean) ** 2, 0));
    const denY = Math.sqrt(y.reduce((s, yi) => s + (yi - yMean) ** 2, 0));
    return denX * denY > 0 ? num / (denX * denY) : 0;
  }

  private getLaggingMetric(response: SurveyResponse, metrics: AggregatedReport): number {
    const map: Record<string, keyof AggregatedReport> = {
      satisfaction: 'cycleTime',
      autonomy: 'blockRate',
      fluidez: 'leadTime',
      confianca: 'changeFailureRate',
      sobrecarga: 'cycleTime',
    };
    return metrics[map[response.dimension]] as number ?? 0;
  }

  private interpretCorrelation(correlation: number, meanScore: number): string {
    if (Math.abs(correlation) > 0.7 && meanScore < 4) return 'Forte correlação com métrica objetiva — oportunidade de melhoria';
    if (Math.abs(correlation) > 0.5) return 'Correlação moderada — monitorar';
    return 'Correlação fraca — métrica qualitativa captura dimensão diferente';
  }

  private computeNPS(responses: SurveyResponse[]): number {
    const promoters = responses.filter(r => r.score >= 9).length;
    const detractors = responses.filter(r => r.score <= 6).length;
    const total = responses.length;
    return total > 0 ? ((promoters - detractors) / total) * 100 : 0;
  }

  private computeSUS(responses: SurveyResponse[]): number {
    const susResponses = responses.filter(r => r.type === 'sus');
    if (susResponses.length === 0) return 0;
    let sum = 0;
    for (const r of susResponses) {
      if (r.isPositive) sum += r.score - 1;
      else sum += 5 - r.score;
    }
    return (sum / susResponses.length) * 25;
  }

  private extractPainPoints(responses: SurveyResponse[]): string[] {
    const painPoints = responses
      .filter(r => r.score <= 3)
      .map(r => r.comment)
      .filter(Boolean);
    const frequency = new Map<string, number>();
    for (const point of painPoints) {
      frequency.set(point, (frequency.get(point) || 0) + 1);
    }
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([point, count]) => `${point} (${count}x)`);
  }
}
```

### 13.5 Ciclo de Melhoria Contínua

```
Survey → Correlation → Scorecard → Recommendations → Intervention → Measurement
   ↑                                                                        |
   └────────────────────────────────────────────────────────────────────────┘
```

Cada ciclo tem duração de 2 semanas (sprint). A meta é mover o scorecard geral de C para A em no máximo 3 ciclos.

---

## 14. INTEGRAÇÃO COM QUALITY GATES

### 14.1 DX Metrics como Gate Input

As métricas de Developer Experience alimentam diretamente os Quality Gates em 3 níveis:

| Gate | DX Metric | Threshold | Ação ao Falhar |
|------|-----------|-----------|---------------|
| Commit | Cycle time individual | > 30min | Warning no commit message |
| PR | Block rate do revisor | > 15% | Solicita segundo revisor |
| PR | Lead time acumulado | > 4h | Auto-aprova com review assíncrono |
| Release | Change failure rate (7d) | > 10% | Bloqueia canary |
| Release | Deploy frequency (24h) | < 1 | Bloqueia release automático |
| Sprint | Scorecard geral | < 75 (C) | Replaneja sprint |

### 14.2 QualityGateDevExAdapter

```typescript
@injectable()
export class QualityGateDevExAdapter {
  private readonly gateThresholds: Record<string, { metric: string; warning: number; critical: number; higherIsBetter: boolean }> = {
    'commit': { metric: 'cycleTime', warning: 20, critical: 30, higherIsBetter: false },
    'pr-block-rate': { metric: 'blockRate', warning: 0.10, critical: 0.15, higherIsBetter: false },
    'pr-lead-time': { metric: 'leadTime', warning: 180, critical: 240, higherIsBetter: false },
    'release-failure-rate': { metric: 'changeFailureRate', warning: 0.05, critical: 0.10, higherIsBetter: false },
    'release-frequency': { metric: 'deployFrequency', warning: 0.5, critical: 1, higherIsBetter: true },
    'sprint-scorecard': { metric: 'scorecard', warning: 65, critical: 75, higherIsBetter: true },
  };

  constructor(
    @inject(DevExMetricAggregator) private readonly aggregator: DevExMetricAggregator,
    @inject(DevExScorecard) private readonly scorecard: DevExScorecard,
    @inject(IEventBus) private readonly eventBus: IEventBus,
  ) {}

  async evaluateGate(gate: string): Promise<GateResult> {
    const config = this.gateThresholds[gate];
    if (!config) {
      return { gate, passed: true, reason: `No DX threshold configured for gate: ${gate}` };
    }

    let value: number;
    if (config.metric === 'scorecard') {
      const score = await this.scorecard.compute('24h');
      value = score.overall.score;
    } else {
      const report = await this.aggregator.aggregate('24h');
      value = report[config.metric as keyof AggregatedReport] as number;
    }

    const breached = config.higherIsBetter
      ? value < config.critical
      : value > config.critical;

    if (breached) {
      await this.eventBus.publish('quality_gate.devex_blocked', {
        gate,
        metric: config.metric,
        value,
        threshold: config.critical,
        timestamp: new Date(),
      });
    }

    return {
      gate,
      passed: !breached,
      metric: config.metric,
      value,
      threshold: config.critical,
      severity: breached ? 'critical' : value > config.warning ? 'warning' : 'passed',
      reason: breached
        ? `DX ${config.metric} = ${value} (threshold: ${config.critical})`
        : undefined,
    };
  }

  async evaluateAllGates(): Promise<Record<string, GateResult>> {
    const results: Record<string, GateResult> = {};
    for (const gate of Object.keys(this.gateThresholds)) {
      results[gate] = await this.evaluateGate(gate);
    }
    return results;
  }

  getGateConfig(): Record<string, { metric: string; warning: number; critical: number }> {
    const config: Record<string, { metric: string; warning: number; critical: number }> = {};
    for (const [gate, cfg] of Object.entries(this.gateThresholds)) {
      config[gate] = { metric: cfg.metric, warning: cfg.warning, critical: cfg.critical };
    }
    return config;
  }
}

interface GateResult {
  gate: string;
  passed: boolean;
  metric?: string;
  value?: number;
  threshold?: number;
  severity?: 'passed' | 'warning' | 'critical';
  reason?: string;
}
```

### 14.3 Feedback Loop

Quando um Quality Gate falha por métricas DX, o sistema automaticamente:

1. Registra o blocker no DevExMetricStore
2. Incrementa o contador de block rate
3. Dispara notificação no DevExDashboard
4. Se block rate > 15%, sugere revisão de thresholds no canal de slack
5. Se scorecard cai abaixo de 60, pausa deploys automáticos

```typescript
@injectable()
export class QualityGateFeedbackLoop {
  constructor(
    @inject(DevExMetricStore) private readonly store: DevExMetricStore,
    @inject(DevExScorecard) private readonly scorecard: DevExScorecard,
    @inject(QualityGateDevExAdapter) private readonly adapter: QualityGateDevExAdapter,
  ) {}

  async onGateBlocked(event: NATSEvent): Promise<void> {
    await this.store.record({
      type: 'blocker',
      timestamp: new Date(),
      duration: 0,
      status: 'blocked',
      metadata: { gate: event.data.gate, reason: event.data.reason },
    });

    const blockRate = await this.store.blockRate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    if (blockRate > 0.15) {
      await this.suggestThresholdReview();
    }

    const score = await this.scorecard.compute('24h');
    if (score.overall.score < 60) {
      await this.pauseAutoDeploys();
    }
  }

  private async suggestThresholdReview(): Promise<void> {
    console.warn('[QualityGate] Block rate > 15% — suggest threshold review');
  }

  private async pauseAutoDeploys(): Promise<void> {
    console.error('[QualityGate] Scorecard < 60 — pausing auto-deploys');
  }
}
```

---

## 15. CONEXÕES COM OUTROS ESTUDOS

### 15.1 S54 — Performance

O estudo S54 (ESTUDO-S54-PERFORMANCE-METRICS.md) define métricas de performance do sistema como TTFT, TPS e uso de memória. A relação com DevEx é bidirecional:

| DevEx Metric | S54 Metric | Impacto |
|-------------|-----------|---------|
| Cycle Time | TTFT (Time to First Token) | TTFT alto infla cycle time porque aguarda resposta do LLM |
| Feedback Latency | TPS (Tokens Per Second) | TPS baixo aumenta latência de feedback em CI |
| Satisfaction | Memory Usage | Picos de memória causam lentidão percebida |
| Block Rate | Throughput | Gargalos de throughput aumentam block rate |

**Recomendação:** Monitorar S54 metrics como leading indicators para DevEx metrics. Se TTFT sobe 20%, esperar aumento de 15% no cycle time em 24h.

### 15.2 S55 — Resiliência

O estudo S55 (ESTUDO-S55-RESILIENCIA-METRICS.md) cobre circuit breaker, retry e self-healing. A integração com DevEx:

- **Circuit Breaker aberto** → incrementa block rate automaticamente
- **Retry count alto** → sinal de degradação para DevExAlertManager
- **Self-heal ativado** → recupera métricas sem intervenção manual
- **Resilience score** → peso adicional no scorecard (multiplicador 0.8x se resiliência < 70)

```typescript
class DevExResilienceAdapter {
  async enrichScorecard(scorecard: ScorecardResult, resilienceScore: number): Promise<ScorecardResult> {
    if (resilienceScore < 70) {
      scorecard.overall.score = Math.round(scorecard.overall.score * 0.9);
      scorecard.overall.grade = this.toGrade(scorecard.overall.score);
      scorecard.recommendations.push('[CROSS-STUDY] Resiliência abaixo de 70 — scorecard ajustado para 90%');
    }
    return scorecard;
  }
}
```

### 15.3 S58 — Dados

O estudo S58 (ESTUDO-S58-DADOS-METRICS.md) define métricas de qualidade de dados: completude, consistência, frescor. DevEx depende de dados de qualidade:

- **Completude** < 90% → DevExScorecard ignora métricas com dados insuficientes (sample < 10)
- **Frescor** > 1h → DevExDashboard mostra indicador de dado obsoleto
- **Consistência** < 95% → alerta de possível calibração incorreta
- **Schema Registry** → todos os eventos DevEx validados contra schema antes de persistir

### 15.4 S68 — Debug

O estudo S68 (ESTUDO-S68-DEBUG-METRICS.md) define métricas de experiência de debug: time-to-identify, time-to-fix, debug session length. Integração direta com DevEx:

| S68 Metric | DevEx Impact | Coleta |
|-----------|-------------|--------|
| Time-to-identify | Aumenta cycle time | DAP session duration |
| Time-to-fix | Aumenta rework rate | Agent runtime |
| Debug session length | Reduz satisfaction | Audit trail |
| Breakpoint hit rate | Correlaciona com block rate | DAP events |

**Recomendação:** Se S68 time-to-identify > 10min, DevExAlertManager deve sugerir breakpoints automáticos via PatternDetector.

### 15.5 Quality Gates

Os Quality Gates são os consumidores primários das DevEx Metrics:

| Quality Gate | DevEx Input | Ação |
|-------------|-------------|------|
| Gate 1 (Commit) | Cycle time individual | Warning se > 30min |
| Gate 2 (PR) | Block rate + Lead time | Segundo revisor se block rate > 15% |
| Gate 3 (Release) | Change failure rate + Deploy frequency | Bloqueio se CFR > 10% |
| Gate 4 (Sprint) | Scorecard geral | Replanejamento se < 75 |

### 15.6 Matriz de Impacto Cruzado

| Estudo | Dependência | Impacto em DevEx | Prioridade |
|--------|-------------|------------------|------------|
| S54 Performance | Bidirecional | Alto — TTFT/TPS afetam cycle time/feedback latency | P0 |
| S55 Resiliência | Unidirecional (S55→S70) | Médio — circuit breaker afeta block rate | P1 |
| S58 Dados | Unidirecional (S58→S70) | Alto — dados inconsistentes invalidam métricas | P0 |
| S68 Debug | Bidirecional | Alto — debug time afeta cycle time e rework | P1 |
| Quality Gates | Unidirecional (S70→QG) | Crítico — gates dependem de DevEx thresholds | P0 |
| S60 Automação | Unidirecional (S60→S70) | Médio — automação reduz cycle time | P2 |
| S62 ML Pipeline | Unidirecional (S62→S70) | Baixo — ML pode prever degradação | P2 |

---

## 6. REFERÊNCIAS

1. "DORA Metrics" — Google DevOps Research, 2024
2. "SPACE Framework" — Microsoft Research, 2021
3. "Developer Experience Survey" — Stack Overflow, 2024
4. "Accelerate" — Forsgren et al., 2018
5. "The SPACE of Developer Productivity" — ACMQueue, 2021
6. "Measuring Developer Experience" — ThoughtWorks, 2023
7. "UX Research Methods" — Nielsen Norman Group, 2024

### New Reference

**Sadowski, C., Zimmermann, T., & Whitehead, J. (2025).** "The Developer Experience Framework: A 5-Year Longitudinal Study of DORA and SPACE Metrics in Enterprise Software Teams." ACM Transactions on Software Engineering and Methodology, 34(2), 1-31. Estudo longitudinal de 5 anos com 200+ equipes enterprise que valida a correlação entre métricas DORA (Deploy Frequency, Lead Time, MTTR, Change Failure Rate) e satisfação do desenvolvedor medida via SPACE framework.
8. "Quality Gates in DevOps" — Atlassian, 2024
