# Intensificação F4: Roadmaps para Fechamento de Métricas S54/S55/S58

> **Data:** 2026-07-25
> **Propósito:** Roadmaps acionáveis para elevar as 3 métricas com maior gap — Performance, Dados e Resiliência
> **Dimensões Alvo:** Performance (40→80), Dados (40→75), Resiliência (50→80)
> **Template:** v2.0 — 5 fases, 6 dimensões analíticas
> **Versão:** 2.0 — Intensificação completa com código, testes, eventos NATS, CLI e riscos

| Versão | Data | Autor | Descrição |
|--------|------|-------|-----------|
| 1.0 | 2026-07-24 | IDEIA Architecture Team | Roadmap original — 119 linhas, tabelas de ações |
| 2.0 | 2026-07-25 | IDEIA Architecture Team | Intensificação completa — fundamentos, arquitetura TypeScript, testes, eventos NATS, CLI, cross-study, riscos, KPIs |

---

## Sumário

1. [Fundamentos](#1-fundamentos)
2. [Estado Atual Detalhado](#2-estado-atual-detalhado)
3. [Arquitetura do Sistema de Métricas](#3-arquitetura-do-sistema-de-métricas)
4. [Performance — S54](#4-performance--s54)
5. [Dados — S58](#5-dados--s58)
6. [Resiliência — S55/S64](#6-resiliência--s55s64)
7. [Cross-Study Integration](#7-cross-study-integration)
8. [NATS Events](#8-nats-events)
9. [CLI Integration](#9-cli-integration)
10. [Testes](#10-testes)
11. [Métricas de Sucesso Expandidas](#11-métricas-de-sucesso-expandidas)
12. [Riscos](#12-riscos)

---

## 1. Fundamentos

### 1.1 Problem Context

A IDEIA possui 7 dimensões de qualidade definidas no modelo E3 (Qualidade Total). Três delas — Performance (40/100), Dados (40/100) e Resiliência (50/100) — estão significativamente abaixo das metas (80/100, 75/100, 80/100 respectivamente). Essas 3 dimensões representam o maior risco para a qualidade percebida pelo usuário e para a adoção em cenários enterprise.

O gap combinado de ~115 pontos percentuais precisa ser endereçado de forma coordenada, pois as três dimensões compartilham dependências: performance afeta a experiência de resiliência (timeouts, backpressure), dados fornecem a base para decisões resilientes (backup, WAL), e resiliência garante que otimizações de performance não introduzam fragilidade.

### 1.2 Glossário

| Termo | Definição |
|-------|-----------|
| TTFT | Time to First Token — latência entre envio do prompt e recebimento do primeiro token |
| TPS | Tokens Per Second — taxa de geração de saída do LLM |
| P99 | 99º percentil — valor abaixo do qual 99% das observações se encontram |
| RPO | Recovery Point Objective — perda máxima aceitável de dados (em tempo) |
| RTO | Recovery Time Objective — tempo máximo aceitável para recuperação |
| WAL | Write-Ahead Log — log de transações pré-escrita para integridade |
| MRR | Mean Reciprocal Rank — métrica de qualidade de recuperação (embeddings) |
| NDCG | Normalized Discounted Cumulative Gain — métrica de ranking |
| SLO | Service Level Objective — alvo de nível de serviço |
| Burn Rate | Taxa de consumo do error budget (% por dia/semana) |
| Half-Open | Estado de circuit breaker que testa recuperação |
| Bulkhead | Padrão de isolamento de recursos por domínio de falha |
| DR | Disaster Recovery — plano de recuperação de desastres |
| PII | Personally Identifiable Information — dados pessoais sensíveis |

### 1.3 Architecture Overview

O Sistema de Métricas Unificado integra as três dimensões em uma arquitetura comum:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      METRICS TRACKING SYSTEM                                │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │ Performance      │  │ Data Health      │  │ Resilience                  │ │
│  │ Monitor          │  │ Dashboard        │  │ Dashboard                   │ │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘ │
│           │                    │                          │                │
│           ▼                    ▼                          ▼                │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    Metrics Aggregator Core                           │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │  │
│  │  │ Collector    │ │ Calculator   │ │ Alert Engine │ │ Exporter   │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│           │                    │                          │                │
│           ▼                    ▼                          ▼                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │ NATS JetStream   │  │ SQLite + DuckDB │  │ OpenTelemetry + Prometheus │ │
│  │ (event bus)      │  │ (persistence)   │  │ (export)                   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │ CLI Interface   │  │ Theia Widgets   │  │ CI/GitHub Actions           │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Princípios de Design

1. **Unified Collection** — Todas as métricas (performance, dados, resiliência) fluem pelo mesmo pipeline de coleta
2. **Event-Driven** — Métricas são eventos NATS, permitindo replay, audit trail e processamento assíncrono
3. **Auto-Diagnóstico** — O sistema detecta regressões automaticamente e gera alertas
4. **Self-Service CLI** — Todas as operações de métricas expostas via comandos CLI com `--json` e `--verbose`
5. **Composable** — Cada subsistema pode ser usado independentemente (ex: só data health sem performance)
6. **Budget-Driven** — Toda métrica tem um budget definido; violações geram alertas e bloqueiam CI/CD

---

## 2. Estado Atual Detalhado

### 2.1 Performance — S54 (40/100)

| Subdimensão | Score | Gap | Target | Package de Referência | Instrumento |
|------------|-------|-----|--------|----------------------|-------------|
| Bundle size (4.6MB gzip) | 45 | 2.1MB acima | < 2.5MB | packages/build | webpack-bundle-analyzer |
| Startup time (5.8s cold) | 35 | 3.8s acima | < 2.0s | packages/shell-layout | StartupProfiler |
| LLM TTFT (640ms cloud) | 40 | 440ms acima | < 200ms | packages/llm-provider | LLMClient benchmark |
| Search P99 (680ms) | 30 | 580ms acima | < 100ms | packages/search-scm-task | BenchmarkRunner |
| Memory idle (410MB) | 50 | 210MB acima | < 200MB | packages/cli | Clinic.js |
| LSP hover P99 (520ms) | 35 | 420ms acima | < 100ms | packages/lsp-bridge | OpenTelemetry |
| Event delivery P99 (18ms) | 55 | 13ms acima | < 5ms | packages/event-bus | NATS monitor |
| Build time (128s) | 40 | 83s acima | < 45s | root monorepo | Turborepo |

**Análise de gargalos por camada:**

```
Camada           Gargalo Principal                    Impacto
Agent Layer      ModelRouter sem cache                +300ms TTFT
Intelligence     LLM client sem keep-alive            +180ms conexão
Memory           Monaco text models não dispostos     +12MB retidos
Execution        Widgets carregados eager             +1.2s startup
Message Bus      Sem HTTP/2 pool                      +50ms latência
Security         Sem impacto perf                     OK
Infrastructure   esbuild não usado para dev           +80s build
Data             Search index não persistido          +400ms search
```

**Referências no código:**
- packages/cli/src/resilience/circuit-breaker.ts — breaker simples sem half-open
- packages/cli/src/performance/ — diretório existe mas vazio (sem implementação real)
- packages/benchmark/src/ — benchmarks existem mas não rodam em CI
- packages/agent-benchmark/ — benchmark de agentes parcial

### 2.2 Dados — S58 (40/100)

| Subdimensão | Score | Gap | Target | Package de Referência | Instrumento |
|------------|-------|-----|--------|----------------------|-------------|
| Backup & DR | 15 | 60 abaixo | 75 | packages/data-layer | BackupManager |
| Data Lineage | 10 | 60 abaixo | 70 | packages/audit-trail | DataLineageTracker |
| Privacy & Compliance | 30 | 50 abaixo | 80 | packages/privacy | PII scanner |
| Data Retention | 25 | 50 abaixo | 75 | packages/data-layer | RetentionEnforcer |
| Embeddings Quality | 55 | 25 abaixo | 80 | packages/vector-store | EmbeddingEvaluator |
| Decision Persistence | 50 | 35 abaixo | 85 | packages/decision-store | DecisionStore |
| Data Validation | 30 | 40 abaixo | 70 | packages/data-layer | DataValidator |
| Data Catalog | 20 | 50 abaixo | 70 | packages/schema-registry | DataCatalogAPI |
| Monitoring & Metrics | 25 | 45 abaixo | 70 | packages/observability | DataHealthDashboard |

**Criticidade por ativo de dados:**

| Ativo | Armazenamento | Tamanho Est. | Backup | Retenção | Risco |
|-------|--------------|-------------|--------|----------|-------|
| Decisões de agentes | SQLite (memória + arquivo) | ~50 MB | Nenhum | Nenhuma | Perda total em crash |
| Embeddings | SQLite + JSON | ~200 MB | Nenhum | Nenhuma | Rebuild caro (horas) |
| Logs de eventos | Memória (NATS KV mirror) | ~100 MB | Nenhum | Nenhuma | Perda de audit trail |
| Config de usuário | ~/.ideia/config.json | ~1 MB | Nenhum | Nenhuma | Config perdida |
| Audit trail | SQLite | ~10 MB | Nenhum | Nenhuma | Violação compliance |
| Índice de workspace | SQLite + JSON | ~50 MB | Nenhum | Nenhuma | Rebuild custoso |
| Cache LLM | SQLite | ~100 MB | Nenhum | Nenhuma | Perda aceitável |
| Telemetria | JSON files | ~20 MB | Nenhum | Nenhuma | Perda aceitável |

**Referências no código:**
- packages/data-layer/src/ — esquema básico, sem backup ou retenção
- packages/audit-trail/src/chain.ts — SHA-256 chain existe mas não integrado com decisões
- packages/privacy/src/output-validator.ts — 31 padrões PII mas só em output, não em stored data
- packages/vector-store/src/ — TF-IDF + nomic-embed-text sem avaliação de qualidade

### 2.3 Resiliência — S55/S64 (50/100)

| Subdimensão | Score | Gap | Target | Package de Referência | Instrumento |
|------------|-------|-----|--------|----------------------|-------------|
| Health Check System | 20 | 60 abaixo | 80 | packages/resilience-v2 | HealthCheckAggregator |
| Self-Healing | 25 | 55 abaixo | 80 | packages/resilience-v2 | SelfHealingEngine |
| Chaos Engineering | 10 | 60 abaixo | 70 | packages/resilience-v2 | ChaosExperimentRunner |
| Circuit Breaker (1 breaker) | 45 | 25 abaixo | 5 breakers | packages/resilience-engine | CircuitBreakerRegistry |
| Error Budget | 15 | 60 abaixo | 75 | packages/slo-monitor | ErrorBudgetCalculator |
| Graceful Degradation | 30 | 50 abaixo | 80 | packages/resilience-v2 | DegradationManager |
| Graceful Shutdown | 40 | 40 abaixo | 80 | packages/resilience-v2 | GracefulShutdownHandler |
| Retry & Backoff | 35 | 45 abaixo | 80 | packages/resilience-v2 | RetryManager |
| Disaster Recovery | 10 | 70 abaixo | 80 | packages/resilience-v2 | DR config |
| Data Resilience | 20 | 60 abaixo | 80 | packages/resilience-v2 | WAL + validation |

**Mapeamento de módulos existentes vs. necessários:**

```
packages/cli/src/resilience/
  circuit-breaker.ts     Básico (sem half-open, sem métricas)
  failure-types.ts       Adequado
  failure-detector.ts    Básico (sem heurística)
  fallback-policy.ts     Parcial
  recovery-plan.ts       Parcial
  recovery-engine.ts     Stub (não executa nada)
  repair-coordinator.ts  Funcional
  resilience-report.ts   Adequado

packages/resilience-v2/     Package alvo para novas implementações

---

## 3. Arquitetura do Sistema de Métricas

### 3.1 Interfaces Core

```typescript
// packages/metrics-core/src/interfaces.ts

export interface MetricSample {
  name: string;
  value: number;
  unit: 'ms' | 's' | 'MB' | 'KB' | 't/s' | 'fps' | 'percent' | 'count';
  tags: Record<string, string>;
  timestamp: string;
  source: string;
}

export interface MetricBudget {
  name: string;
  metricName: string;
  max?: number;
  min?: number;
  unit: string;
  severity: 'error' | 'warning';
  description: string;
}

export interface MetricSnapshot {
  name: string;
  samples: MetricSample[];
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  stddev: number;
  count: number;
  budget?: {
    passed: boolean;
    current: number;
    threshold: number;
    severity: 'error' | 'warning';
  };
}

export interface MetricsReport {
  timestamp: string;
  duration: number;
  snapshots: MetricSnapshot[];
  budgets: { passed: number; failed: number; total: number };
  environment: { platform: string; nodeVersion: string; cpu: string; memory: string };
}

export interface MetricsExporter {
  export(snapshot: MetricSnapshot): Promise<void>;
  exportReport(report: MetricsReport): Promise<void>;
}

export interface MetricsAlert {
  id: string;
  metricName: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: string;
  source: string;
}
```

### 3.2 MetricsCollector

```typescript
// packages/metrics-core/src/collector.ts

import { MetricSample, MetricSnapshot, MetricBudget } from './interfaces';
import { EventEmitter } from 'events';

export class MetricsCollector extends EventEmitter {
  private store = new Map<string, MetricSample[]>();
  private budgets = new Map<string, MetricBudget>();
  private maxSamplesPerMetric = 10000;
  private retentionMs = 3600000;

  constructor(private options?: { maxSamples?: number; retentionMs?: number }) {
    super();
    if (options?.maxSamples) this.maxSamplesPerMetric = options.maxSamples;
    if (options?.retentionMs) this.retentionMs = options.retentionMs;
  }

  record(metric: Omit<MetricSample, 'timestamp'>): void {
    const sample: MetricSample = { ...metric, timestamp: new Date().toISOString() };
    if (!this.store.has(metric.name)) this.store.set(metric.name, []);
    const samples = this.store.get(metric.name)!;
    samples.push(sample);
    this.prune(metric.name);
    this.emit('sample', sample);
  }

  recordMultiple(metrics: Omit<MetricSample, 'timestamp'>[]): void {
    for (const m of metrics) this.record(m);
  }

  registerBudget(budget: MetricBudget): void {
    this.budgets.set(budget.name, budget);
  }

  getSnapshot(name: string): MetricSnapshot {
    const samples = this.store.get(name) ?? [];
    if (samples.length === 0) {
      return { name, samples: [], mean: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0, stddev: 0, count: 0 };
    }
    const values = samples.map(s => s.value).sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    const budget = this.checkBudget(name, mean);
    return {
      name, samples, mean,
      p50: values[Math.floor(values.length * 0.5)] ?? 0,
      p95: values[Math.floor(values.length * 0.95)] ?? 0,
      p99: values[Math.floor(values.length * 0.99)] ?? 0,
      min: values[0] ?? 0,
      max: values[values.length - 1] ?? 0,
      stddev: Math.sqrt(variance),
      count: values.length,
      budget,
    };
  }

  getAllSnapshots(): MetricSnapshot[] {
    return Array.from(this.store.keys()).map(n => this.getSnapshot(n));
  }

  generateReport(): MetricsReport {
    const snapshots = this.getAllSnapshots();
    const budgeted = snapshots.filter(s => s.budget);
    return {
      timestamp: new Date().toISOString(),
      duration: 0,
      snapshots,
      budgets: {
        passed: budgeted.filter(b => b.budget!.passed).length,
        failed: budgeted.filter(b => !b.budget!.passed).length,
        total: budgeted.length,
      },
      environment: {
        platform: process.platform,
        nodeVersion: process.version,
        cpu: process.arch,
        memory: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
      },
    };
  }

  reset(): void { this.store.clear(); }

  private prune(name: string): void {
    const samples = this.store.get(name);
    if (!samples) return;
    const cutoff = Date.now() - this.retentionMs;
    this.store.set(name, samples.filter(s => new Date(s.timestamp).getTime() > cutoff).slice(-this.maxSamplesPerMetric));
  }

  private checkBudget(name: string, value: number): MetricSnapshot['budget'] {
    for (const [, budget] of this.budgets) {
      if (budget.metricName === name) {
        const passed = budget.max !== undefined ? value <= budget.max : budget.min !== undefined ? value >= budget.min : true;
        return { passed, current: value, threshold: budget.max ?? budget.min ?? 0, severity: budget.severity };
      }
    }
    return undefined;
  }
}
```

### 3.3 AlertEngine

```typescript
// packages/metrics-core/src/alert-engine.ts

import { MetricsCollector } from './collector';
import { MetricsAlert } from './interfaces';

interface AlertRule {
  name: string; metricName: string;
  condition: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold: number; severity: MetricsAlert['severity'];
  message: string; cooldownMs: number; enabled: boolean;
}

export class AlertEngine {
  private rules: AlertRule[] = [];
  private lastFired = new Map<string, number>();
  private alertHistory: MetricsAlert[] = [];
  private maxHistory = 1000;

  constructor(private collector: MetricsCollector) {}

  addRule(rule: AlertRule): void { this.rules.push(rule); }

  evaluate(): MetricsAlert[] {
    const alerts: MetricsAlert[] = [];
    const snapshots = this.collector.getAllSnapshots();

    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      const snapshot = snapshots.find(s => s.name === rule.metricName);
      if (!snapshot || snapshot.count === 0) continue;

      const value = snapshot.mean;
      const triggered = ({ gt: value > rule.threshold, lt: value < rule.threshold, gte: value >= rule.threshold, lte: value <= rule.threshold, eq: value === rule.threshold })[rule.condition];
      if (!triggered) continue;
      if (Date.now() - (this.lastFired.get(rule.name) ?? 0) < rule.cooldownMs) continue;

      const alert: MetricsAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        metricName: rule.metricName, severity: rule.severity,
        message: rule.message.replace('{value}', value.toString()).replace('{threshold}', rule.threshold.toString()),
        currentValue: value, threshold: rule.threshold,
        timestamp: new Date().toISOString(), source: 'AlertEngine',
      };

      this.lastFired.set(rule.name, Date.now());
      this.alertHistory.push(alert);
      if (this.alertHistory.length > this.maxHistory) this.alertHistory.shift();
      alerts.push(alert);
    }
    return alerts;
  }

  getHistory(): MetricsAlert[] { return this.alertHistory; }
  clearHistory(): void { this.alertHistory = []; }
}
```

### 3.4 NatsMetricsExporter

```typescript
// packages/metrics-core/src/exporters/nats-exporter.ts

import { MetricsExporter, MetricSnapshot, MetricsReport } from '../interfaces';
import { EventBus } from '@ideia/event-bus';

export class NatsMetricsExporter implements MetricsExporter {
  constructor(private eventBus: EventBus, private prefix: string = 'metrics') {}

  async export(snapshot: MetricSnapshot): Promise<void> {
    await this.eventBus.publish(`${this.prefix}.snapshot`, {
      name: snapshot.name, mean: snapshot.mean, p50: snapshot.p50,
      p95: snapshot.p95, p99: snapshot.p99, count: snapshot.count,
      budget: snapshot.budget, timestamp: new Date().toISOString(),
    });
  }

  async exportReport(report: MetricsReport): Promise<void> {
    await this.eventBus.publish(`${this.prefix}.report`, {
      timestamp: report.timestamp, duration: report.duration,
      snapshots: report.snapshots.map(s => ({ name: s.name, mean: s.mean, p95: s.p95, p99: s.p99, count: s.count })),
      budgets: report.budgets, environment: report.environment,
    });
  }
}
```

### 3.5 PrometheusMetricsExporter

```typescript
// packages/metrics-core/src/exporters/prometheus-exporter.ts

import { MetricsExporter, MetricSnapshot, MetricsReport } from '../interfaces';

export class PrometheusMetricsExporter implements MetricsExporter {
  private registry = new Map<string, number>();

  async export(snapshot: MetricSnapshot): Promise<void> {
    const name = `ideia_${snapshot.name.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    this.registry.set(`${name}_mean`, snapshot.mean);
    this.registry.set(`${name}_p50`, snapshot.p50);
    this.registry.set(`${name}_p95`, snapshot.p95);
    this.registry.set(`${name}_count`, snapshot.count);
  }

  async exportReport(report: MetricsReport): Promise<void> {
    for (const snap of report.snapshots) await this.export(snap);
  }

  getPrometheusFormat(): string {
    let output = '';
    for (const [name, value] of this.registry) output += `# TYPE ${name} gauge\n${name} ${value}\n`;
    return output;
  }
  reset(): void { this.registry.clear(); }
}
```

### 3.6 ScoreCalculator

```typescript
// packages/metrics-core/src/score-calculator.ts

export interface SubDimensionScore {
  name: string; current: number; target: number; gap: number;
  status: 'critical' | 'high' | 'medium' | 'low';
}
export interface DimensionScore {
  name: string; current: number; target: number; gap: number; weight: number;
  subdimensions: SubDimensionScore[];
}
export interface UnifiedScoreReport {
  overall: number; overallTarget: number; dimensions: DimensionScore[]; timestamp: string;
}

export class ScoreCalculator {
  private readonly weights: Record<string, number> = {
    performance: 0.25, data: 0.20, resilience: 0.20,
    code: 0.15, security: 0.10, ux: 0.05, integration: 0.05,
  };

  calculate(scores: Record<string, DimensionScore>): UnifiedScoreReport {
    let weightedSum = 0, weightSum = 0, targetSum = 0, targetWeightSum = 0;
    const dimensions: DimensionScore[] = [];

    for (const [key, dim] of Object.entries(scores)) {
      const weight = this.weights[key] ?? 0.10;
      weightedSum += dim.current * weight;
      targetSum += dim.target * weight;
      weightSum += weight;
      targetWeightSum += weight;
      dimensions.push(dim);
    }

    return {
      overall: weightSum > 0 ? Math.round(weightedSum / weightSum) : 0,
      overallTarget: targetWeightSum > 0 ? Math.round(targetSum / targetWeightSum) : 0,
      dimensions, timestamp: new Date().toISOString(),
    };
  }

  assessSubDimension(current: number, target: number): SubDimensionScore['status'] {
    const ratio = current / Math.max(target, 1);
    if (ratio < 0.5) return 'critical';
    if (ratio < 0.7) return 'high';
    if (ratio < 0.9) return 'medium';
    return 'low';
  }
}
```

---

## 4. Performance — S54 (40/100 → 80/100)

### 4.1 Roadmap: Fase P1 — Quick Wins (Semanas 1-2, 56h)

| Passo | Ação | Package | Esforço | Impacto | Score Pós |
|-------|------|---------|---------|---------|-----------|
| P1.1 | Code splitting granular por widget | packages/shell-layout | 4h | -30% bundle (4.6→3.2MB) | 45→52 |
| P1.2 | Lazy loading de providers LLM | packages/llm-provider | 3h | -20% startup (5.8→4.6s) | 35→45 |
| P1.3 | Cache de busca c/ inverted index | packages/search-scm-task | 6h | -60% search P99 (680→270ms) | 30→48 |
| P1.4 | Streaming de inicialização | packages/cli | 8h | -40% perceived startup | 35→50 |
| P1.5 | Pool de conexões LLM keep-alive | packages/llm-integration | 4h | -30% TTFT (640→450ms) | 40→50 |
| P1.6 | sideEffects:false em todos packages | packages/* | 4h | -200KB bundle | 45→48 |
| P1.7 | Remover barrel imports (37) | packages/* | 6h | -420KB bundle | 48→55 |
| P1.8 | Substituir lodash/moment | packages/* | 4h | -820KB bundle | 55→58 |
| P1.9 | ripgrep como search default | packages/search-scm-task | 3h | -300ms search | 48→55 |
| P1.10 | Fix leak Monaco text models | packages/editor | 4h | -12MB heap | 50→55 |
| P1.11 | CSS optimization c/ purgecss | packages/* | 4h | -310KB bundle | 58→60 |
| P1.12 | Benchmark contínuo via CI | CI pipeline | 6h | Monitoramento | — |

**CA P1:** Bundle < 3.2MB gzip · Startup < 4.0s · TTFT < 450ms · Search < 300ms · Score >= 60/100

### 4.2 Roadmap: Fase P2 — Otimização Arquitetural (Semanas 3-6, 80h)

| Passo | Ação | Package | Esforço | Impacto |
|-------|------|---------|---------|---------|
| P2.1 | Cache semântico LLM (threshold 0.92) | packages/llm-cache | 12h | -60% TTFT cache hit |
| P2.2 | Sistema multi-level cache (L1 LRU, L2 SQLite) | packages/cache | 16h | Cobertura geral |
| P2.3 | Virtual scrolling (file tree, search) | packages/core-ui | 10h | DOM < 50 nós |
| P2.4 | Monaco config adaptativa por file size | packages/editor | 8h | Scroll FPS 42→55 |
| P2.5 | Limites memória workers (256MB) | packages/agent-runtime | 4h | Crash prevention |
| P2.6 | Request batching LLM (50ms, max 8) | packages/llm-integration | 8h | -200ms TTFT multi-turn |
| P2.7 | Search index pré-construído FTS5 | packages/search-scm-task | 10h | Search P99 270→150ms |
| P2.8 | HTTP/2 + connection pooling | packages/network | 4h | -50ms latência API |
| P2.9 | WeakRef caches p/ tokens/grammars | packages/editor | 4h | -20MB heap |
| P2.10 | esbuild p/ dev builds | packages/build | 8h | Build 128s→5s |

**CA P2:** Bundle < 2.8MB · Startup < 3.0s · TTFT < 300ms · Search < 150ms · Memory < 300MB · Score >= 72/100

### 4.3 Roadmap: Fase P3 — Deep Optimization (Semanas 7-10, 77h)

| Passo | Ação | Package | Esforço | Score Pós |
|-------|------|---------|---------|-----------|
| P3.1 | Adaptive model selection | packages/llm-integration | 8h | 65→70 |
| P3.2 | Streaming search results | packages/search-scm-task | 6h | 65→70 |
| P3.3 | Document segmentation >1MB | packages/editor | 8h | 60→70 |
| P3.4 | Diff optimization chunk-based | packages/editor | 6h | 60→68 |
| P3.5 | Object pooling | packages/core | 6h | 62→68 |
| P3.6 | Debounced resize manager | packages/core-ui | 3h | 62→65 |
| P3.7 | Passive event listeners | packages/core | 2h | 62→65 |
| P3.8 | Progressive widget rendering | packages/shell-layout | 6h | 65→72 |
| P3.9 | CSS containment + will-change | packages/core-ui | 3h | 65→68 |
| P3.10 | Performance dashboard widget | packages/ideia-plugin | 8h | Dashboard |
| P3.11 | Budget alerting system | packages/performance-monitor | 4h | Monitoring |
| P3.12 | Predictive prefetching | packages/acceleration | 6h | 68→72 |
| P3.13 | Brotli fine-tuning level 11 | packages/build | 2h | 68→72 |
| P3.14 | Turborepo remote caching | packages/* | 4h | 55→72 |
| P3.15 | Regression detection (t-test) | packages/benchmark | 5h | CI gate |

**CA P3 (80/100):** Bundle gzip < 2.5MB · brotli < 1.8MB · Startup < 2.0s · TTFT < 200ms · Search < 100ms · Memory < 200MB · Scroll >= 55fps · Build < 45s

### 4.4 Implementação: CacheManager

```typescript
// packages/cache/src/cache-manager.ts

import { LRUCache } from 'lru-cache';

type CacheLevel = 'memory' | 'disk' | 'network';

interface CacheConfig {
  level: CacheLevel; ttlMs: number; maxSize: number; namespace: string;
}

interface CacheEntry<T> {
  value: T; expiresAt: number; hash: string;
}

export class CacheManager {
  private memoryCaches = new Map<string, LRUCache<string, CacheEntry<unknown>>>();
  private diskCaches = new Map<string, Map<string, CacheEntry<unknown>>>();
  private configs = new Map<string, CacheConfig>();

  registerNamespace(config: CacheConfig): void {
    this.configs.set(config.namespace, config);
    if (config.level === 'memory') {
      this.memoryCaches.set(config.namespace, new LRUCache({ max: config.maxSize, ttl: config.ttlMs }));
    } else {
      this.diskCaches.set(config.namespace, new Map());
    }
  }

  async get<T>(namespace: string, key: string): Promise<T | undefined> {
    const config = this.configs.get(namespace);
    if (!config) return undefined;

    if (config.level === 'memory') {
      const entry = this.memoryCaches.get(namespace)?.get(key) as CacheEntry<T> | undefined;
      if (!entry || Date.now() > entry.expiresAt) { this.memoryCaches.get(namespace)?.delete(key); return undefined; }
      return entry.value;
    }
    const entry = this.diskCaches.get(namespace)?.get(key) as CacheEntry<T> | undefined;
    if (!entry || Date.now() > entry.expiresAt) { this.diskCaches.get(namespace)?.delete(key); return undefined; }
    return entry.value;
  }

  async set<T>(namespace: string, key: string, value: T, ttlOverride?: number): Promise<void> {
    const config = this.configs.get(namespace);
    if (!config) return;
    const entry: CacheEntry<T> = { value, expiresAt: Date.now() + (ttlOverride ?? config.ttlMs), hash: '' };
    if (config.level === 'memory') {
      this.memoryCaches.get(namespace)?.set(key, entry as CacheEntry<unknown>);
    } else {
      this.diskCaches.get(namespace)?.set(key, entry as CacheEntry<unknown>);
    }
  }

  async invalidate(namespace: string, key?: string): Promise<void> {
    const config = this.configs.get(namespace);
    if (!config) return;
    if (key) {
      if (config.level === 'memory') this.memoryCaches.get(namespace)?.delete(key);
      else this.diskCaches.get(namespace)?.delete(key);
    } else {
      if (config.level === 'memory') this.memoryCaches.get(namespace)?.clear();
      else this.diskCaches.get(namespace)?.clear();
    }
  }

  async getStats(namespace: string): Promise<{ size: number; hits: number; misses: number }> {
    const config = this.configs.get(namespace);
    if (!config) return { size: 0, hits: 0, misses: 0 };
    if (config.level === 'memory') {
      const c = this.memoryCaches.get(namespace);
      return { size: c?.size ?? 0, hits: c?.hits ?? 0, misses: c?.misses ?? 0 };
    }
    return { size: this.diskCaches.get(namespace)?.size ?? 0, hits: 0, misses: 0 };
  }
}
```

### 4.5 Config Schema Zod — Performance

```typescript
// packages/performance-monitor/src/schemas.ts

import { z } from 'zod';

export const PerformanceBudgetSchema = z.object({
  id: z.string(), metric: z.string(),
  max: z.number().optional(), min: z.number().optional(),
  unit: z.string(), severity: z.enum(['error', 'warning']),
  description: z.string(), enabled: z.boolean().default(true),
});

export const PerformanceConfigSchema = z.object({
  budgets: z.array(PerformanceBudgetSchema),
  alerting: z.object({
    cooldownMs: z.number().default(300000),
    channels: z.array(z.enum(['console', 'nats', 'theia', 'slack'])).default(['console']),
  }),
  sampling: z.object({
    intervalMs: z.number().default(30000),
    maxSamples: z.number().default(10000),
    retentionMs: z.number().default(3600000),
  }),
});
```

---

## 5. Dados — S58 (40/100 → 75/100)

### 5.1 Roadmap: Fase D1 — Assessment & Quick Wins (Semanas 1-2, 40h)

| Passo | Ação | Esforço | Score Pós |
|-------|------|---------|-----------|
| D1.1 | Auditoria completa de todos os data stores | 8h | 40→42 |
| D1.2 | WAL mode obrigatório em todas SQLite | 4h | 40→45 |
| D1.3 | Script de backup manual (wal-g style) | 6h | 42→45 |
| D1.4 | Schema Registry atualizado com todos data types | 6h | 30→40 |
| D1.5 | PII scan em stored data (reuso 31 patterns) | 8h | 42→48 |
| D1.6 | Métricas básicas de data health (coleta) | 4h | 42→48 |
| D1.7 | Data classification tagging inicial | 4h | 42→48 |

**Score pós-D1:** >= 48/100

### 5.2 Roadmap: Fase D2 — Backup & Lineage (Semanas 3-6, 80h)

| Passo | Ação | Esforço | Score Pós |
|-------|------|---------|-----------|
| D2.1 | Backup automático WAL streaming + snapshot diário | 16h | 48→55 |
| D2.2 | Backup S3/MinIO com criptografia AES-256-GCM | 8h | 55→58 |
| D2.3 | Restore testing automation (semanal) | 6h | 58→60 |
| D2.4 | Audit chain com proveniência de decisões SHA-256 | 12h | 55→60 |
| D2.5 | Decision provenance model + store | 12h | 60→63 |
| D2.6 | Event sourcing p/ agent actions (append-only) | 10h | 63→65 |
| D2.7 | Lineage visualization (graph output) | 6h | 65→66 |
| D2.8 | Retention policy enforcement automático | 10h | 66→68 |

### 5.3 Roadmap: Fase D3 — Quality & Validation (Semanas 7-10, 80h)

| Passo | Ação | Esforço | Score Pós |
|-------|------|---------|-----------|
| D3.1 | Pipeline de validação Zod unificado | 12h | 68→70 |
| D3.2 | Bad data quarantine com auto-repair | 8h | 70→72 |
| D3.3 | Pipeline de anonimização (PII→hash) | 10h | 70→72 |
| D3.4 | Avaliador de qualidade de embeddings | 8h | 72→73 |
| D3.5 | Auto model selector (voyage-code-2) | 6h | 73→74 |
| D3.6 | Decision replay capability | 10h | 74→75 |
| D3.7 | Data quality metrics dashboard | 8h | 74→75 |
| D3.8 | GDPR/LGPD deletion request handler | 8h | 75→75 |
| D3.9 | Data portability API (JSON/NDJSON) | 6h | 75→75 |
| D3.10 | Data catalog + discovery API | 10h | 75→75 |

### 5.4 Implementação: BackupManager

```typescript
// packages/data-layer/src/backup/backup-manager.ts

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { EventBus } from '@ideia/event-bus';

export interface BackupManifest {
  id: string; type: 'full' | 'incremental' | 'wal';
  timestamp: string; source: string; size: number;
  checksum: string; encrypted: boolean; files: string[];
  parentBackupId?: string;
}

export class BackupManager {
  constructor(
    private config: { localPath: string; retention: { localMaxCount: number } },
    private eventBus: EventBus
  ) {}

  async createFullBackup(sources: string[]): Promise<BackupManifest> {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const backupDir = path.join(this.config.localPath, id);
    await fs.mkdir(backupDir, { recursive: true });

    const files: string[] = [];
    for (const source of sources) {
      const dest = path.join(backupDir, path.basename(source));
      await fs.cp(source, dest, { recursive: true, force: true });
      files.push(dest);
    }

    const manifest: BackupManifest = {
      id, type: 'full', timestamp, source: sources.join(','),
      size: await this.calcDirSize(backupDir),
      checksum: crypto.createHash('sha256').update(files.join('|')).digest('hex'),
      encrypted: false, files,
    };

    await this.writeManifest(backupDir, manifest);
    await this.eventBus.publish('data.backup.completed', { id, type: 'full', size: manifest.size, timestamp });
    await this.pruneOld();
    return manifest;
  }

  async restore(backupId: string, targetDir: string): Promise<void> {
    const manifest = await this.loadManifest(backupId);
    if (!(await this.verifyIntegrity(backupId))) throw new Error(`Integrity check failed for ${backupId}`);
    for (const file of manifest.files) {
      await fs.cp(file, path.join(targetDir, path.basename(file)), { force: true });
    }
    if (manifest.type === 'incremental' && manifest.parentBackupId) {
      const parent = await this.loadManifest(manifest.parentBackupId);
      for (const file of parent.files) {
        if (!manifest.files.includes(file)) await fs.cp(file, path.join(targetDir, path.basename(file)), { force: true });
      }
    }
    await this.eventBus.publish('data.restore.completed', { backupId, targetDir, timestamp: new Date().toISOString() });
  }

  async verifyIntegrity(backupId: string): Promise<boolean> {
    try {
      const m = await this.loadManifest(backupId);
      for (const f of m.files) {
        const hash = crypto.createHash('sha256').update(await fs.readFile(f)).digest('hex');
        if (m.files.length === 1 && m.checksum !== hash) return false;
      }
      return true;
    } catch { return false; }
  }

  async listBackups(): Promise<BackupManifest[]> {
    const dir = await fs.readdir(this.config.localPath);
    const manifests: BackupManifest[] = [];
    for (const entry of dir) {
      try {
        manifests.push(JSON.parse(await fs.readFile(path.join(this.config.localPath, entry, 'manifest.json'), 'utf-8')));
      } catch { /* skip */ }
    }
    return manifests.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private async calcDirSize(dir: string): Promise<number> {
    let total = 0;
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      if (e.isFile()) total += (await fs.stat(path.join(dir, e.name))).size;
      else if (e.isDirectory()) total += await this.calcDirSize(path.join(dir, e.name));
    }
    return total;
  }

  private async writeManifest(dir: string, m: BackupManifest): Promise<void> {
    await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(m, null, 2));
  }

  private async loadManifest(id: string): Promise<BackupManifest> {
    return JSON.parse(await fs.readFile(path.join(this.config.localPath, id, 'manifest.json'), 'utf-8'));
  }

  private async pruneOld(): Promise<void> {
    const toRemove = (await this.listBackups()).slice(this.config.retention.localMaxCount);
    for (const m of toRemove) await fs.rm(path.join(this.config.localPath, m.id), { recursive: true, force: true });
  }
}
```

### 5.5 Implementação: DataLineageTracker

```typescript
// packages/data-layer/src/lineage/data-lineage-tracker.ts

import * as crypto from 'node:crypto';
import { EventBus } from '@ideia/event-bus';

export interface LineageBlock {
  index: number; timestamp: string; eventType: string;
  agentId: string; correlationId: string;
  data: Record<string, unknown>;
  prevHash: string | null; hash: string; nonce: number;
}

export interface LineageGraph {
  nodes: Array<{ id: string; type: string; timestamp: string; agentId: string; depth: number; summary: string }>;
  edges: Array<{ from: string; to: string; type: string }>;
}

interface LineageStore {
  append(block: LineageBlock): Promise<void>;
  getChain(agentId: string): Promise<LineageBlock[]>;
  getByCorrelationId(correlationId: string): Promise<LineageBlock[]>;
  getLatest(agentId: string): Promise<LineageBlock | null>;
}

export class DataLineageTracker {
  constructor(private store: LineageStore, private eventBus: EventBus, private difficulty = 4) {}

  async record(event: { agentId: string; correlationId: string; eventType: string; data: Record<string, unknown> }): Promise<LineageBlock> {
    const latest = await this.store.getLatest(event.agentId);
    const block = await this.mineBlock({
      index: latest ? latest.index + 1 : 0, timestamp: new Date().toISOString(),
      eventType: event.eventType, agentId: event.agentId,
      correlationId: event.correlationId, data: event.data,
      prevHash: latest?.hash ?? null, hash: '', nonce: 0,
    });
    await this.store.append(block);
    await this.eventBus.publish('data.lineage.block', { agentId: event.agentId, correlationId: event.correlationId, index: block.index, hash: block.hash });
    return block;
  }

  async verifyChain(agentId: string): Promise<{ valid: boolean; brokenIndex: number | null; verifiedBlocks: number }> {
    const chain = await this.store.getChain(agentId);
    for (let i = 0; i < chain.length; i++) {
      if (chain[i].hash !== this.calcHash(chain[i])) return { valid: false, brokenIndex: i, verifiedBlocks: i };
      if (i > 0 && chain[i].prevHash !== chain[i - 1].hash) return { valid: false, brokenIndex: i, verifiedBlocks: i };
    }
    return { valid: true, brokenIndex: null, verifiedBlocks: chain.length };
  }

  async getLineageGraph(correlationId: string): Promise<LineageGraph> {
    const blocks = await this.store.getByCorrelationId(correlationId);
    const nodes = blocks.map((b, i) => ({ id: b.hash.slice(0, 12), type: b.eventType, timestamp: b.timestamp, agentId: b.agentId, depth: i, summary: `${b.agentId}: ${b.eventType}` }));
    const edges: LineageGraph['edges'] = [];
    for (let i = 1; i < nodes.length; i++) edges.push({ from: nodes[i - 1].id, to: nodes[i].id, type: 'next' });
    return { nodes, edges };
  }

  private async mineBlock(b: Omit<LineageBlock, 'hash'> & { hash: string }): Promise<LineageBlock> {
    const prefix = '0'.repeat(this.difficulty);
    let nonce = 0;
    while (true) {
      const hash = this.calcHash({ ...b, nonce } as LineageBlock);
      if (hash.startsWith(prefix)) return { ...b, hash, nonce };
      if (++nonce > 1_000_000) throw new Error('Failed to mine block');
    }
  }

  private calcHash(b: LineageBlock): string {
    return crypto.createHash('sha256').update([b.index, b.prevHash ?? '', b.timestamp, b.eventType, b.agentId, b.correlationId, JSON.stringify(b.data), b.nonce].join('|')).digest('hex');
  }
}
```

### 5.6 Config Schema Zod — Data Governance

```typescript
// packages/data-layer/src/schemas.ts

import { z } from 'zod';

export const BackupConfigSchema = z.object({
  localPath: z.string(), retentionLocalMaxCount: z.number().default(7),
  scheduleFull: z.string().default('0 2 * * *'),
});

export const RetentionPolicySchema = z.object({
  tier: z.enum(['ephemeral', 'operational', 'analytical', 'archival']),
  ttlMs: z.number(), onExpiry: z.enum(['delete', 'archive', 'compress', 'notify']),
});

export const EmbeddingConfigSchema = z.object({
  primaryModel: z.string().default('voyage-code-2'),
  fallbackModel: z.string().default('nomic-embed-text'),
  minPrecisionAt5: z.number().min(0).max(1).default(0.80),
  maxLatencyMs: z.number().default(150),
  evaluationIntervalMs: z.number().default(86400000),
});

export const DataGovernanceConfigSchema = z.object({
  backup: BackupConfigSchema,
  retention: z.array(RetentionPolicySchema),
  embeddings: EmbeddingConfigSchema,
  piiScanEnabled: z.boolean().default(true),
  lineageEnabled: z.boolean().default(true),
  validationEnabled: z.boolean().default(true),
  complianceRegulations: z.array(z.enum(['gdpr', 'lgpd', 'soc2'])).default(['gdpr', 'lgpd']),
});
```

---

## 6. Resiliência — S55/S64 (50/100 → 80/100)

### 6.1 Roadmap: Fase R1 — Foundation (Semanas 1-4, 100h)

| Passo | Ação | Esforço | Score Pós |
|-------|------|---------|-----------|
| R1.1 | Circuit breaker v2: HALF_OPEN + thresholds + metrics | 16h | 50→55 |
| R1.2 | Per-service breakers (NATS, FS, LLM, Search, Git) | 8h | 55→58 |
| R1.3 | RetryManager com backoff + jitter + error classification | 16h | 55→60 |
| R1.4 | RetryBudget com sliding window (max 20% retries) | 6h | 58→60 |
| R1.5 | Health check system (liveness, readiness, startup, deep) | 16h | 55→62 |
| R1.6 | HealthCheckAggregator com dependency awareness | 12h | 62→65 |
| R1.7 | GracefulShutdown com stage sequence (30s total) | 12h | 60→65 |
| R1.8 | ErrorBudgetCalculator com 5 SLOs | 12h | 62→65 |
| R1.9 | Bulkhead isolation per service group (5 pools) | 12h | 65→67 |
| R1.10 | Graceful degradation manager (read-only, offline) | 10h | 65→68 |

**Score pós-R1:** >= 68/100

### 6.2 Roadmap: Fase R2 — Self-Healing (Semanas 5-7, 80h)

| Passo | Ação | Esforço | Score Pós |
|-------|------|---------|-----------|
| R2.1 | SelfHealingEngine com policy evaluation + cooldown | 20h | 68→70 |
| R2.2 | Healing actions (restart, reconnect, cache clear) | 16h | 70→73 |
| R2.3 | Healing policies per service (LLM, NATS, FS, Agent, EventBus) | 12h | 73→75 |
| R2.4 | Escalation integration (log, page, ticket, degrade) | 8h | 73→75 |
| R2.5 | Healing audit trail com SHA-256 chain | 8h | 75→76 |
| R2.6 | Verification after healing (health check re-evaluation) | 6h | 75→77 |
| R2.7 | Feature-level degradation toggle system | 10h | 75→77 |

### 6.3 Roadmap: Fase R3 — Chaos Engineering (Semanas 8-10, 80h)

| Passo | Ação | Esforço | Score Pós |
|-------|------|---------|-----------|
| R3.1 | ChaosExperimentRunner com abort control + blast radius | 16h | 77→78 |
| R3.2 | Fault injection: process_kill, network_latency, disk_full | 16h | 78→79 |
| R3.3 | Fault injection: provider_timeout, provider_error, event_drop | 12h | 79→80 |
| R3.4 | Blast radius control + production guard | 8h | 79→80 |
| R3.5 | Automated chaos experiments in staging | 12h | 80→80 |
| R3.6 | CI resilience gate (90% pass rate required) | 8h | 80→80 |
| R3.7 | Resilience score calculation from test results | 8h | 80→80 |

### 6.4 Implementação: SelfHealingEngine

```typescript
// packages/resilience-v2/src/self-healing-engine.ts

import { HealthCheckAggregator } from './health-aggregator';
import { CircuitBreakerV2 } from './circuit-breaker-v2';
import { EventBus } from '@ideia/event-bus';

export type HealingAction = 'restart_service' | 'clear_cache' | 'reconnect_provider'
  | 'rollback_state' | 'failover_replica' | 'recycle_connection'
  | 'trigger_gc' | 'flush_buffers' | 'reload_config';

export interface HealingPolicy {
  service: string; failurePatterns: string[]; action: HealingAction;
  cooldownMs: number; maxAttempts: number; requiresApproval: boolean;
  onEscalation: 'page' | 'log' | 'ticket' | 'degraded';
}

export interface HealingAttempt {
  timestamp: string; service: string; failureId: string; action: HealingAction;
  attempt: number; result: 'success' | 'failed' | 'escalated' | 'cooldown';
  durationMs: number; verificationStatus: 'passed' | 'failed' | 'pending';
}

export class SelfHealingEngine {
  private policies: HealingPolicy[] = [];
  private attemptHistory: HealingAttempt[] = [];
  private cooldownMap = new Map<string, number>();
  private attemptCounters = new Map<string, number>();

  constructor(
    private healthAggregator: HealthCheckAggregator,
    private circuitBreaker: CircuitBreakerV2,
    private eventBus: EventBus
  ) {}

  registerPolicy(p: HealingPolicy): void { this.policies.push(p); }

  async evaluateAndHeal(failureId: string, service: string, error: string): Promise<HealingAttempt> {
    const policy = this.policies.find(p => p.service === service && p.failurePatterns.some(fp => error.includes(fp)));
    if (!policy) return this.record({ timestamp: new Date().toISOString(), service, failureId, action: 'reload_config' as HealingAction, attempt: 0, result: 'escalated', durationMs: 0, verificationStatus: 'failed' });

    if (Date.now() - (this.cooldownMap.get(service) ?? 0) < policy.cooldownMs) {
      return this.record({ timestamp: new Date().toISOString(), service, failureId, action: policy.action, attempt: 0, result: 'cooldown', durationMs: 0, verificationStatus: 'pending' });
    }

    const attemptKey = `${service}:${failureId}`;
    const attemptCount = this.attemptCounters.get(attemptKey) ?? 0;
    if (attemptCount >= policy.maxAttempts) {
      await this.eventBus.publish('resilience.healing.escalation', { service, failureId, action: policy.action });
      return this.record({ timestamp: new Date().toISOString(), service, failureId, action: policy.action, attempt: attemptCount, result: 'escalated', durationMs: 0, verificationStatus: 'failed' });
    }

    const startTime = Date.now();
    try {
      await this.eventBus.publish(`resilience.healing.${policy.action}`, { service, timestamp: new Date().toISOString() });
      await new Promise(r => setTimeout(r, 2000));
      const recovered = this.healthAggregator.getAggregateReport().entries.find(e => e.service === service)?.status === 'healthy';

      if (recovered) { this.circuitBreaker.reset(service); this.cooldownMap.set(service, Date.now()); }
      else { this.attemptCounters.set(attemptKey, attemptCount + 1); this.cooldownMap.set(service, Date.now()); }

      const attempt: HealingAttempt = { timestamp: new Date().toISOString(), service, failureId, action: policy.action, attempt: attemptCount + 1, result: recovered ? 'success' : 'failed', durationMs: Date.now() - startTime, verificationStatus: recovered ? 'passed' : 'failed' };
      await this.eventBus.publish('resilience.healing.attempt', attempt);
      return this.record(attempt);
    } catch {
      this.attemptCounters.set(attemptKey, attemptCount + 1);
      return this.record({ timestamp: new Date().toISOString(), service, failureId, action: policy.action, attempt: attemptCount + 1, result: 'failed', durationMs: Date.now() - startTime, verificationStatus: 'failed' });
    }
  }

  getHistory(): HealingAttempt[] { return this.attemptHistory; }

  getStats() {
    return {
      total: this.attemptHistory.length,
      success: this.attemptHistory.filter(h => h.result === 'success').length,
      failed: this.attemptHistory.filter(h => h.result === 'failed').length,
      escalated: this.attemptHistory.filter(h => h.result === 'escalated').length,
    };
  }

  private record(a: HealingAttempt): HealingAttempt { this.attemptHistory.push(a); return a; }
}
```

### 6.5 Config Schema Zod — Resilience

```typescript
// packages/resilience-v2/src/schemas.ts

import { z } from 'zod';

export const CircuitBreakerConfigSchema = z.object({
  name: z.string(), failureThreshold: z.number().min(1).max(100).default(5),
  successThreshold: z.number().min(1).max(100).default(3),
  halfOpenMaxRequests: z.number().min(1).max(20).default(3),
  timeoutMs: z.number().min(100).max(300000).default(30000),
  windowSizeMs: z.number().min(1000).max(600000).default(60000),
  minimumRequests: z.number().min(1).max(1000).default(10),
});

export const ResilienceConfigSchema = z.object({
  circuitBreakers: z.array(CircuitBreakerConfigSchema).default([
    { name: 'llm-provider', failureThreshold: 3, timeoutMs: 60000, windowSizeMs: 120000 },
    { name: 'nats-jetstream', failureThreshold: 5, timeoutMs: 15000, windowSizeMs: 60000 },
    { name: 'filesystem', failureThreshold: 8, timeoutMs: 10000, windowSizeMs: 30000 },
    { name: 'search-engine', failureThreshold: 5, timeoutMs: 30000, windowSizeMs: 60000 },
    { name: 'git-service', failureThreshold: 4, timeoutMs: 30000, windowSizeMs: 60000 },
  ]),
  healthCheck: z.object({ intervalMs: z.number().default(15000), cacheTTLMs: z.number().default(5000) }),
  errorBudget: z.object({ windowMs: z.number().default(2592000000), greenThreshold: z.number().min(0).max(1).default(0.5), yellowThreshold: z.number().min(0).max(1).default(0.8) }),
  shutdown: z.object({ totalTimeoutMs: z.number().default(30000), forceKillAfterTimeout: z.boolean().default(true) }),
  chaos: z.object({ enabled: z.boolean().default(false), maxDurationMs: z.number().default(300000), maxIntensity: z.number().min(0).max(1).default(0.8), requireApproval: z.boolean().default(true), autoRollback: z.boolean().default(true) }),
});
```

---

## 7. Cross-Study Integration

### 7.1 Matriz de Integração S54/S55/S58 com Ecossistema

| Estudo | S54 (Performance) | S55 (Resilience) | S58 (Data) |
|--------|------------------|-----------------|-----------|
| S1 (Event Bus) | Event bus latency budgets | Circuit breaker NATS, DLQ + retry | Event sourcing, lineage tracking |
| S4 (Security) | No perf impact | Healing requires security approval | PII scan em stored data |
| S13 (Performance) | — | Bulkhead isolation, timeout config | Embedding perf, query latency |
| S17 (Observability) | OTel spans, perf dashboard | Health metrics, CB metrics | Data dashboard, data score trend |
| S31 (LLM) | Connection pool, TTFT opt | LLM fallback chain, CB | LLM cache, decision store |
| S35 (FS/Workspace) | File index perf, search perf | FS read-only mode, FS health | BackupManager, workspace backup |
| S42 (Theia DI) | Lazy widget loading | Health dashboard widget | Data catalog widget |
| S45 (Workspace) | Cache prewarming | Workspace health check | Retention per workspace |
| S51 (Parallel Agents) | Request batching for LLM | Agent bulkhead, crash recovery | Decision store per agent |
| S56 (UX) | Perceived perf, TTFT visible | Degradation UI, offline indicator | Data transparency, privacy notice |
| S57 (Competitive) | Benchmark vs VSCode/Cursor | DR vs Cursor, uptime vs comp | Data export vs competitive parity |
| S65 (Enterprise Compliance) | Performance SLA, budgets | Availability SLO, error budget | GDPR/LGPD/SOC2, data governance |

### 7.2 Shared Components

| Componente | S54 | S55 | S58 | Package |
|-----------|-----|-----|-----|---------|
| MetricsCollector | Performance samples | Health check metrics | Data quality metrics | packages/metrics-core |
| AlertEngine | Budget violations | Error budget alerts | Data health alerts | packages/metrics-core |
| EventBus (NATS) | Perf events | Resilience events | Data lineage events | packages/event-bus |
| CLI Commands | IDEIA perf | IDEIA resilience | IDEIA data | packages/cli |
| Theia Widgets | PerformanceDashboard | HealthDashboard | DataHealthDashboard | packages/ideia-plugin |

### 7.3 Dependências entre Roadmaps

```
S58 BackupManager --- fornece WAL --> S55 Data Resilience
S55 SelfHealing  --- restart agents --> S54 Performance (pós-recuperação)
S54 CacheManager --- cache warming --> S58 Embedding cache
S54 Benchmark    --- dados de perf --> S55 Budget thresholds
S55 HealthCheck  --- status services --> S54 Startup profiling
S58 DataLineage  --- audit chain ----> S55 Healing audit trail
```

### 7.4 Riscos de Integração

| Risco | Estudos Afetados | Mitigação |
|-------|-----------------|-----------|
| Performance monitoring adiciona overhead | S54, S17 | Sampling adaptativo, batch export |
| Healing actions resetam caches de perf | S55, S54 | Warming automático pós-heal |
| Backup durante pico degrada performance | S58, S54 | Backup agendado janela noturna |
| Chaos experiments disparam healings falsos | S55 | Modo não-interferência em experimentos |
| PII scan aumenta latência de write | S58, S54 | Scan assíncrono em fila separada |

---

## 8. NATS Events

### 8.1 Subjects

```typescript
// packages/metrics-core/src/events.ts

export const MetricsEventSubjects = {
  PERF_BUNDLE_COMPUTED: 'perf.bundle.computed',
  PERF_STARTUP_MEASURED: 'perf.startup.measured',
  PERF_TTFT_MEASURED: 'perf.ttft.measured',
  PERF_SEARCH_MEASURED: 'perf.search.measured',
  PERF_MEMORY_MEASURED: 'perf.memory.measured',
  PERF_SCROLL_FPS: 'perf.scroll.fps',
  PERF_BUDGET_VIOLATED: 'perf.budget.violated',
  PERF_REGRESSION_DETECTED: 'perf.regression.detected',
  PERF_BENCHMARK_COMPLETED: 'perf.benchmark.completed',
  DATA_BACKUP_COMPLETED: 'data.backup.completed',
  DATA_BACKUP_FAILED: 'data.backup.failed',
  DATA_RESTORE_COMPLETED: 'data.restore.completed',
  DATA_LINEAGE_BLOCK: 'data.lineage.block',
  DATA_LINEAGE_VERIFIED: 'data.lineage.verified',
  DATA_RETENTION_PURGED: 'data.retention.purged',
  DATA_VALIDATION_FAILED: 'data.validation.failed',
  DATA_PII_DETECTED: 'data.pii.detected',
  DATA_DELETION_REQUESTED: 'data.deletion.requested',
  DATA_SCORE_UPDATED: 'data.score.updated',
  DATA_HEALTH_ALERT: 'data.health.alert',
  RESILIENCE_HEALTH_STATUS: 'resilience.health.status',
  RESILIENCE_BREAKER_TRIP: 'resilience.breaker.trip',
  RESILIENCE_BREAKER_RESET: 'resilience.breaker.reset',
  RESILIENCE_BREAKER_STATE_CHANGE: 'resilience.breaker.state_change',
  RESILIENCE_HEALING_ATTEMPT: 'resilience.healing.attempt',
  RESILIENCE_HEALING_ESCALATION: 'resilience.healing.escalation',
  RESILIENCE_CHAOS_EXPERIMENT: 'resilience.chaos.experiment',
  RESILIENCE_CHAOS_RESULT: 'resilience.chaos.result',
  RESILIENCE_ERROR_BUDGET: 'resilience.error_budget.state',
  RESILIENCE_GRACEFUL_SHUTDOWN: 'resilience.graceful_shutdown',
  RESILIENCE_MODE_CHANGED: 'resilience.mode.changed',
} as const;
```

### 8.2 Schemas Zod

```typescript
// packages/metrics-core/src/event-schemas.ts

import { z } from 'zod';

export const PerfBundleComputedSchema = z.object({
  size: z.number(), threshold: z.number(), unit: z.string(),
  chunk: z.string(), compression: z.enum(['gzip', 'brotli', 'uncompressed']),
});

export const PerfTTFTMeasuredSchema = z.object({
  provider: z.string(), model: z.string(),
  ttftMs: z.number(), totalMs: z.number(),
  tokensPerSecond: z.number(), cached: z.boolean(),
});

export const PerfBudgetViolatedSchema = z.object({
  budgetId: z.string(), metric: z.string(),
  current: z.number(), threshold: z.number(),
  unit: z.string(), severity: z.enum(['error', 'warning']),
});

export const DataBackupCompletedSchema = z.object({
  id: z.string(), type: z.enum(['full', 'incremental', 'wal']),
  size: z.number(), timestamp: z.string(),
  checksum: z.string(), durationMs: z.number(), encrypted: z.boolean(),
});

export const DataLineageBlockSchema = z.object({
  agentId: z.string(), correlationId: z.string(),
  index: z.number(), hash: z.string(),
  prevHash: z.string().nullable(), timestamp: z.string(), eventType: z.string(),
});

export const DataPIIDetectedSchema = z.object({
  pattern: z.string(), severity: z.enum(['low', 'medium', 'high', 'critical']),
  location: z.string(), detectedAt: z.string(),
  action: z.enum(['blocked', 'masked', 'logged', 'quarantined']),
});

export const DataScoreUpdatedSchema = z.object({
  score: z.number(), previousScore: z.number(),
  dimensions: z.record(z.number()), timestamp: z.string(),
});

export const ResilienceHealthStatusSchema = z.object({
  service: z.string(), type: z.enum(['liveness', 'readiness', 'startup', 'dependency', 'deep']),
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string(), durationMs: z.number(),
});

export const ResilienceBreakerTripSchema = z.object({
  breaker: z.string(), reason: z.string(),
  failureCount: z.number(), threshold: z.number(),
  timestamp: z.string(), state: z.enum(['open', 'half_open']),
});

export const ResilienceHealingAttemptSchema = z.object({
  timestamp: z.string(), service: z.string(), failureId: z.string(),
  action: z.string(), attempt: z.number(),
  result: z.enum(['success', 'failed', 'escalated', 'cooldown']),
  durationMs: z.number(), verificationStatus: z.enum(['passed', 'failed', 'pending']),
});

export const ResilienceErrorBudgetSchema = z.object({
  slo: z.string(), targetPercent: z.number(),
  totalBudgetMs: z.number(), consumedMs: z.number(),
  remainingMs: z.number(), consumptionPercent: z.number(),
  burnRatePerDay: z.number(), status: z.enum(['green', 'yellow', 'red']),
});
```

### 8.3 Configuração Stream NATS

```typescript
// packages/metrics-core/src/nats-streams.ts

export const MetricsStreamConfig = {
  name: 'METRICS', subjects: ['perf.>', 'data.>', 'resilience.>'],
  maxMessages: 100000, maxBytes: 500 * 1024 * 1024,
  retention: 'interest' as const, maxAge: 7 * 24 * 3600 * 1000, storage: 'file' as const,
};

export const MetricsDLQConfig = {
  name: 'METRICS_DLQ', subjects: ['metrics.dlq.>'],
  maxMessages: 10000, maxAge: 30 * 24 * 3600 * 1000,
};
```

---

## 9. CLI Integration

### 9.1 Interface de Comandos

```
IDEIA perf                        — Performance metrics dashboard
IDEIA perf benchmark              — Run benchmark suites
IDEIA perf benchmark --suite startup|llm|search|memory|bundle
IDEIA perf budget                 — Check performance budgets
IDEIA perf budget --ci            — CI mode (exit 1 on violation)
IDEIA perf report                 — Generate performance report
IDEIA perf report --json          — JSON output
IDEIA perf history                — Historical trends

IDEIA data                        — Data health dashboard
IDEIA data backup create          — Create full backup
IDEIA data backup list            — List backups
IDEIA data backup restore <id>    — Restore from backup
IDEIA data lineage verify         — Verify chain integrity
IDEIA data validate               — Run data validation
IDEIA data retention enforce      — Enforce retention policies
IDEIA data score                  — Show data score
IDEIA data export <type>          — Export data (gdpr portability)

IDEIA resilience                  — Resilience dashboard
IDEIA resilience health           — Show health check status
IDEIA resilience circuit          — Show circuit breaker states
IDEIA resilience circuit reset <n> — Reset circuit breaker
IDEIA resilience healing history  — Show healing history
IDEIA resilience healing stats    — Show healing statistics
IDEIA resilience error-budget     — Show error budget states
IDEIA resilience chaos run <name> — Run chaos experiment
IDEIA resilience chaos abort <n>  — Abort chaos experiment
IDEIA resilience mode set <mode>  — Set system mode
```

### 9.2 Comandos CLI Implementation

```typescript
// packages/cli/src/commands/perf-commands.ts

import { CliCommand, CliCommandResult } from '../core/command';

export class PerfBudgetCommand implements CliCommand {
  name = 'perf budget'; description = 'Check performance budgets';
  async execute(args: { ci?: boolean }): Promise<CliCommandResult> {
    return CliCommandResult.success({ message: 'Budgets checked', data: {} });
  }
}

// packages/cli/src/commands/data-commands.ts

export class DataBackupCommand implements CliCommand {
  name = 'data backup'; description = 'Manage data backups';
  async execute(args: { action: string; id?: string }): Promise<CliCommandResult> {
    switch (args.action) {
      case 'create': return CliCommandResult.success({ message: 'Backup created' });
      case 'list': return CliCommandResult.success({ message: 'Backups listed', data: [] });
      case 'restore': return CliCommandResult.success({ message: `Backup ${args.id} restored` });
      default: return CliCommandResult.failure({ message: `Unknown action: ${args.action}` });
    }
  }
}

export class DataScoreCommand implements CliCommand {
  name = 'data score'; description = 'Show data health score';
  async execute(args: { json?: boolean }): Promise<CliCommandResult> {
    return CliCommandResult.success({ message: 'Data score calculated', data: { score: 42 } });
  }
}

// packages/cli/src/commands/resilience-commands.ts

export class ResilienceHealthCommand implements CliCommand {
  name = 'resilience health'; description = 'Show health check status';
  async execute(args: { watch?: boolean }): Promise<CliCommandResult> {
    return CliCommandResult.success({ message: 'Health status retrieved', data: { overall: 'healthy' } });
  }
}

export class ResilienceCircuitCommand implements CliCommand {
  name = 'resilience circuit'; description = 'Manage circuit breakers';
  async execute(args: { action: string; name?: string }): Promise<CliCommandResult> {
    if (args.action === 'reset' && args.name) return CliCommandResult.success({ message: `Circuit breaker ${args.name} reset` });
    return CliCommandResult.success({ message: 'Circuit breaker states', data: [] });
  }
}

export class ResilienceChaosCommand implements CliCommand {
  name = 'resilience chaos'; description = 'Manage chaos experiments';
  async execute(args: { action: string; name?: string }): Promise<CliCommandResult> {
    switch (args.action) {
      case 'list': return CliCommandResult.success({ message: 'Experiments listed', data: [] });
      case 'run': return CliCommandResult.success({ message: `Experiment ${args.name} started` });
      case 'abort': return CliCommandResult.success({ message: `Experiment ${args.name} aborted` });
      default: return CliCommandResult.failure({ message: `Unknown action: ${args.action}` });
    }
  }
}
```

---

## 10. Testes

### 10.1 MetricsCollector

```typescript
// packages/metrics-core/__tests__/collector.test.ts

import { MetricsCollector } from '../src/collector';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;
  beforeEach(() => { collector = new MetricsCollector({ maxSamples: 100, retentionMs: 3600000 }); });
  afterEach(() => { collector.reset(); });

  it('should record a metric sample', () => {
    collector.record({ name: 'test.metric', value: 42, unit: 'ms', tags: {}, source: 'test' });
    expect(collector.getSnapshot('test.metric').count).toBe(1);
    expect(collector.getSnapshot('test.metric').mean).toBe(42);
  });

  it('should compute percentiles', () => {
    for (let i = 1; i <= 100; i++) collector.record({ name: 'latency', value: i, unit: 'ms', tags: {}, source: 'test' });
    const s = collector.getSnapshot('latency');
    expect(s.p50).toBe(50); expect(s.p95).toBe(95); expect(s.p99).toBe(99);
  });

  it('should check max budget', () => {
    collector.registerBudget({ name: 'latency-budget', metricName: 'api.latency', max: 200, unit: 'ms', severity: 'error', description: 'Under 200ms' });
    collector.record({ name: 'api.latency', value: 150, unit: 'ms', tags: {}, source: 'test' });
    expect(collector.getSnapshot('api.latency').budget!.passed).toBe(true);
    collector.record({ name: 'api.latency', value: 250, unit: 'ms', tags: {}, source: 'test' });
    expect(collector.getSnapshot('api.latency').budget!.passed).toBe(false);
  });

  it('should generate a report', () => {
    collector.record({ name: 'a', value: 1, unit: 'ms', tags: {}, source: 'test' });
    collector.record({ name: 'b', value: 2, unit: 'MB', tags: {}, source: 'test' });
    expect(collector.generateReport().snapshots.length).toBe(2);
  });
});
```

### 10.2 AlertEngine

```typescript
// packages/metrics-core/__tests__/alert-engine.test.ts

import { MetricsCollector } from '../src/collector';
import { AlertEngine } from '../src/alert-engine';

describe('AlertEngine', () => {
  let collector: MetricsCollector, engine: AlertEngine;
  beforeEach(() => { collector = new MetricsCollector(); engine = new AlertEngine(collector); });

  it('should trigger alert when threshold exceeded', () => {
    engine.addRule({ name: 'hl', metricName: 'm', condition: 'gt', threshold: 500, severity: 'warning', message: 'High: {value}ms', cooldownMs: 0, enabled: true });
    collector.record({ name: 'm', value: 600, unit: 'ms', tags: {}, source: 'test' });
    expect(engine.evaluate().length).toBe(1);
  });

  it('should respect cooldown', () => {
    engine.addRule({ name: 'r', metricName: 'm', condition: 'gt', threshold: 100, severity: 'warning', message: 'A', cooldownMs: 5000, enabled: true });
    collector.record({ name: 'm', value: 200, unit: 'ms', tags: {}, source: 'test' });
    expect(engine.evaluate().length).toBe(1);
    expect(engine.evaluate().length).toBe(0);
  });

  it('should maintain history', () => {
    engine.addRule({ name: 'r', metricName: 'm', condition: 'gt', threshold: 100, severity: 'warning', message: 'A', cooldownMs: 0, enabled: true });
    collector.record({ name: 'm', value: 200, unit: 'ms', tags: {}, source: 'test' });
    engine.evaluate();
    expect(engine.getHistory().length).toBe(1);
  });
});
```

### 10.3 BackupManager

```typescript
// packages/data-layer/__tests__/backup/backup-manager.test.ts

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { BackupManager } from '../../src/backup/backup-manager';

describe('BackupManager', () => {
  let tmpDir: string, dataDir: string, backupDir: string, manager: BackupManager;
  const mockBus = { publish: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bkp-'));
    dataDir = path.join(tmpDir, 'data'); backupDir = path.join(tmpDir, 'bkps');
    await fs.mkdir(dataDir, { recursive: true }); await fs.mkdir(backupDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, 'f1.txt'), 'c1'); await fs.writeFile(path.join(dataDir, 'f2.txt'), 'c2');
    manager = new BackupManager({ localPath: backupDir, retention: { localMaxCount: 7 } }, mockBus as any);
  });

  afterEach(async () => { await fs.rm(tmpDir, { recursive: true, force: true }); });

  it('should create full backup', async () => {
    const m = await manager.createFullBackup([dataDir]);
    expect(m.type).toBe('full'); expect(m.files.length).toBeGreaterThan(0);
    expect(mockBus.publish).toHaveBeenCalledWith('data.backup.completed', expect.any(Object));
  });

  it('should verify integrity', async () => {
    expect(await manager.verifyIntegrity((await manager.createFullBackup([dataDir])).id)).toBe(true);
  });

  it('should detect corruption', async () => {
    const m = await manager.createFullBackup([dataDir]);
    await fs.writeFile(path.join(backupDir, m.id, m.files[0]), 'corrupted');
    expect(await manager.verifyIntegrity(m.id)).toBe(false);
  });

  it('should restore from backup', async () => {
    const m = await manager.createFullBackup([dataDir]);
    const restoreDir = path.join(tmpDir, 'restore');
    await fs.mkdir(restoreDir, { recursive: true });
    await manager.restore(m.id, restoreDir);
    expect(await fs.readFile(path.join(restoreDir, 'f1.txt'), 'utf-8')).toBe('c1');
  });
});
```

### 10.4 SelfHealingEngine

```typescript
// packages/resilience-v2/__tests__/self-healing-engine.test.ts

import { SelfHealingEngine } from '../src/self-healing-engine';

describe('SelfHealingEngine', () => {
  let engine: SelfHealingEngine;
  const mockHealth = { getAggregateReport: jest.fn().mockReturnValue({ overall: 'healthy', entries: [{ service: 'llm-provider', status: 'healthy' }], degradedCount: 0, unhealthyCount: 0, healthyCount: 1, lastUpdated: '', dependencyChain: [] }) };
  const mockBreaker = { reset: jest.fn() };
  const mockBus = { publish: jest.fn().mockResolvedValue(undefined) };

  beforeEach(() => {
    engine = new SelfHealingEngine(mockHealth as any, mockBreaker as any, mockBus as any);
    engine.registerPolicy({ service: 'llm-provider', failurePatterns: ['connection_refused', 'timeout'], action: 'reconnect_provider', cooldownMs: 1000, maxAttempts: 3, requiresApproval: false, onEscalation: 'log' });
  });

  it('should attempt healing on matching failure', async () => {
    const r = await engine.evaluateAndHeal('f1', 'llm-provider', 'connection_refused');
    expect(r.action).toBe('reconnect_provider');
    expect(mockBus.publish).toHaveBeenCalledWith('resilience.healing.attempt', expect.any(Object));
  });

  it('should respect cooldown', async () => {
    await engine.evaluateAndHeal('f1', 'llm-provider', 'connection_refused');
    expect((await engine.evaluateAndHeal('f2', 'llm-provider', 'connection_refused')).result).toBe('cooldown');
  });

  it('should escalate after max attempts', async () => {
    mockHealth.getAggregateReport.mockReturnValue({ overall: 'unhealthy', entries: [{ service: 'llm-provider', status: 'unhealthy' }], degradedCount: 0, unhealthyCount: 1, healthyCount: 0, lastUpdated: '', dependencyChain: [['llm-provider']] });
    await engine.evaluateAndHeal('fx', 'llm-provider', 'timeout');
    await engine.evaluateAndHeal('fx', 'llm-provider', 'timeout');
    await engine.evaluateAndHeal('fx', 'llm-provider', 'timeout');
    expect((await engine.evaluateAndHeal('fx', 'llm-provider', 'timeout')).result).toBe('escalated');
  });
});
```

### 10.5 DataLineageTracker

```typescript
// packages/data-layer/__tests__/lineage/data-lineage-tracker.test.ts

import { DataLineageTracker } from '../../src/lineage/data-lineage-tracker';

describe('DataLineageTracker', () => {
  const chainStore = new Map<string, any[]>();
  const store = {
    append: jest.fn().mockImplementation((b: any) => { const a = chainStore.get(b.agentId) ?? []; a.push(b); chainStore.set(b.agentId, a); }),
    getChain: jest.fn().mockImplementation((id: string) => chainStore.get(id) ?? []),
    getByCorrelationId: jest.fn().mockImplementation((cid: string) => { const r: any[] = []; for (const [, v] of chainStore) r.push(...v.filter((b: any) => b.correlationId === cid)); return r; }),
    getLatest: jest.fn().mockImplementation((id: string) => { const a = chainStore.get(id) ?? []; return a.length ? a[a.length - 1] : null; }),
  };
  const bus = { publish: jest.fn().mockResolvedValue(undefined) };

  let tracker: DataLineageTracker;
  beforeEach(() => { chainStore.clear(); tracker = new DataLineageTracker(store as any, bus as any, 1); });

  it('should record a lineage block', async () => {
    const b = await tracker.record({ agentId: 'analyst', correlationId: 'c1', eventType: 'analysis', data: { file: 'login.ts' } });
    expect(b.index).toBe(0); expect(b.hash).toBeTruthy();
  });

  it('should chain blocks', async () => {
    const b1 = await tracker.record({ agentId: 'prog', correlationId: 'c1', eventType: 'read', data: {} });
    const b2 = await tracker.record({ agentId: 'prog', correlationId: 'c1', eventType: 'write', data: {} });
    expect(b2.prevHash).toBe(b1.hash);
  });

  it('should verify chain', async () => {
    await tracker.record({ agentId: 'rev', correlationId: 'c1', eventType: 'start', data: {} });
    await tracker.record({ agentId: 'rev', correlationId: 'c1', eventType: 'end', data: {} });
    expect((await tracker.verifyChain('rev')).valid).toBe(true);
  });

  it('should detect tampering', async () => {
    await tracker.record({ agentId: 't', correlationId: 'c1', eventType: 'a', data: {} });
    chainStore.get('t')[0].data.tampered = true;
    expect((await tracker.verifyChain('t')).valid).toBe(false);
  });

  it('should generate graph', async () => {
    await tracker.record({ agentId: 'a1', correlationId: 'g1', eventType: 'e1', data: {} });
    await tracker.record({ agentId: 'a1', correlationId: 'g1', eventType: 'e2', data: {} });
    expect((await tracker.getLineageGraph('g1')).nodes.length).toBe(2);
  });
});
```

### 10.6 Integration Test

```typescript
// packages/metrics-core/__tests__/integration.test.ts

import { MetricsCollector } from '../src/collector';
import { AlertEngine } from '../src/alert-engine';
import { ScoreCalculator, DimensionScore } from '../src/score-calculator';

describe('Metrics Integration', () => {
  it('should measure, alert, and score end-to-end', () => {
    const c = new MetricsCollector(); const a = new AlertEngine(c); const s = new ScoreCalculator();
    c.record({ name: 'startup.cold', value: 5800, unit: 'ms', tags: {}, source: 'benchmark' });
    c.record({ name: 'bundle.gzip', value: 4.6, unit: 'MB', tags: {}, source: 'analyzer' });
    c.registerBudget({ name: 's-b', metricName: 'startup.cold', max: 2000, unit: 'ms', severity: 'error', description: 'desc' });
    a.addRule({ name: 's-alert', metricName: 'startup.cold', condition: 'gt', threshold: 2000, severity: 'critical', message: 'Slow', cooldownMs: 300000, enabled: true });
    expect(c.generateReport().budgets.failed).toBeGreaterThan(0);
    expect(a.evaluate().length).toBeGreaterThan(0);

    const dim: DimensionScore = { name: 'perf', current: 40, target: 80, gap: 40, weight: 0.25, subdimensions: [{ name: 'startup', current: 35, target: 80, gap: 45, status: 'critical' }] };
    expect(s.calculate({ performance: dim }).overall).toBeDefined();
  });

  it('should show improvement after optimizations', () => {
    const s = new ScoreCalculator();
    const before = s.calculate({ performance: { name: 'p', current: 40, target: 80, gap: 40, weight: 0.25, subdimensions: [{ name: 'b', current: 45, target: 80, gap: 35, status: 'critical' }] } });
    const after = s.calculate({ performance: { name: 'p', current: 80, target: 80, gap: 0, weight: 0.25, subdimensions: [{ name: 'b', current: 80, target: 80, gap: 0, status: 'low' }] } });
    expect(after.overall).toBeGreaterThan(before.overall);
    expect(after.overall).toBe(80);
  });
});
```

---

## 11. Métricas de Sucesso Expandidas

### 11.1 KPIs por Dimensão

| Dimensão | KPI | Atual | Alvo P1 | Alvo P2 | Alvo Final |
|----------|-----|-------|---------|---------|------------|
| **Performance** | Bundle size (gzip) | 4.6 MB | < 3.2 MB | < 2.8 MB | < 2.5 MB |
| | Startup cold | 5.8 s | < 4.0 s | < 3.0 s | < 2.0 s |
| | TTFT cloud | 640 ms | < 450 ms | < 300 ms | < 200 ms |
| | Search P99 | 680 ms | < 300 ms | < 150 ms | < 100 ms |
| | Memory idle | 410 MB | < 350 MB | < 300 MB | < 200 MB |
| | Build time | 128 s | < 90 s | < 60 s | < 45 s |
| | **Score** | **40/100** | **60/100** | **72/100** | **80/100** |
| **Dados** | Backup RPO | > 24h | < 6h | < 1h | < 5min |
| | Backup RTO | > 4h | < 2h | < 30min | < 15min |
| | Lineage coverage | 0% | 50% | 80% | 100% |
| | Validation pass rate | 0% | — | > 99% | > 99.5% |
| | Embedding MRR | 0.48 | — | > 0.65 | > 0.75 |
| | PII scan | output only | stored 50% | stored 100% | stored 100% |
| | **Score** | **40/100** | **48/100** | **68/100** | **75/100** |
| **Resiliência** | Health checks | 0 | 3 | 5 | 5 |
| | Circuit breakers | 1 | 3 | 5 | 5 |
| | Self-healing success | 0% | — | 50% | 80% |
| | Chaos experiments | 0 | 0 | 5 | 12+ |
| | CI resilience gate | none | — | basic | 90% pass |
| | **Score** | **50/100** | **68/100** | **77/100** | **80/100** |

### 11.2 Impacto no Score Global

| Dimensão | Peso | Atual | Meta | Contribuição Atual | Contribuição Meta |
|----------|------|-------|------|-------------------|------------------|
| Código | 15% | 75 | 80 | 11.25 | 12.00 |
| Segurança | 10% | 70 | 90 | 7.00 | 9.00 |
| Performance | 25% | 40 | 80 | 10.00 | 20.00 |
| UX | 15% | 55 | 75 | 8.25 | 11.25 |
| Integração | 15% | 75 | 85 | 11.25 | 12.75 |
| Resiliência | 10% | 50 | 80 | 5.00 | 8.00 |
| Dados | 10% | 40 | 75 | 4.00 | 7.50 |
| **Total** | **100%** | | | **56.75** | **80.50** |

---

## 12. Riscos

### 12.1 Risk Matrix

| # | Risco | Dimensão | Prob | Impacto | Mitigação |
|---|-------|----------|------|---------|-----------|
| R01 | Tree-shaking quebra funcionalidade | Perf | Média | Alto | Test coverage em paths críticos |
| R02 | Semantic cache stale results | Perf | Média | Médio | TTL + confidence threshold 0.92 |
| R03 | Virtual scrolling quebra a11y | Perf | Baixa | Alto | Preserve focus, aria attributes |
| R04 | Memory opt causa GC thrashing | Perf | Média | Médio | Monitor GC, tune pool sizes |
| R05 | Performance regression não detectada | Perf | Baixa | Alto | t-test + CI gate |
| R06 | Ground truth embeddings pequeno | Dados | Média | Alto | Synthetic data + cross-validation |
| R07 | PII false positives stored data | Dados | Média | Alto | Gradual rollout + manual review |
| R08 | Backup storage costs above budget | Dados | Baixa | Médio | Tiered backup, local non-critical |
| R09 | Data catalog stale | Dados | Média | Baixo | Automated scanning, TTL per entry |
| R10 | Self-healing causa mais dano | Resilience | Média | Crítico | Cooldown, approval, verification |
| R11 | Chaos experiments afetam produção | Resilience | Baixa | Crítico | Network isolation, blast radius |
| R12 | Circuit breaker nunca recupera | Resilience | Média | Alto | Half-open probing, timeout reset |
| R13 | Retry storm amplifica carga | Resilience | Média | Alto | Retry budget 20%, jitter, CB |
| R14 | DR failover perde dados async | Resilience | Baixa | Alto | Semi-sync replication, WAL PITR |
| R15 | Error budget bloqueia emergency fix | Resilience | Média | Médio | Manual override com approval |

### 12.2 Heat Map

```
    Prob
    Alta      R10
              R01 R06 R07 R12 R13
    Média     R02 R04 R09 R15
              R03 R05 R08 R11 R14
    Baixa
       +--------------------------------
         Baixo    Médio     Alto    Crítico
                          Impacto
```

### 12.3 Planos de Contingência

| Risco | Gatilho | Ação | Resp. |
|-------|---------|------|-------|
| R01 | Build falha após sideEffects:false | Reverter, identificar barrel import culpado | Build Team |
| R06 | MRR < 0.50 | Usar text-embedding-3-large fallback | ML Team |
| R07 | FP > 1% | Desligar scan automático, revisar patterns | Security |
| R10 | Sistema degrada pós-heal | Kill switch self-healing, rollback manual | Platform |
| R11 | Blast radius vaza | Network policy enforcement | DevOps |
| R12 | HALF_OPEN > 5 ciclos | Alert PagerDuty, override manual | Platform |
| R13 | Retry ratio > 30% | Desligar retries, ativar degraded mode | Platform |

---

## Appendices

### A: Performance Budgets Completos

| ID | Métrica | Budget | Unidade | Gate |
|----|---------|--------|---------|------|
| P01 | Bundle size (gzip) | < 2.5 | MB | PR |
| P02 | Bundle size (brotli) | < 1.8 | MB | PR |
| P03 | Startup time (cold) | < 2.0 | s | Release |
| P04 | Startup time (warm) | < 1.0 | s | Release |
| P05 | TTFT (Cloud) | < 200 | ms | Release |
| P06 | TTFT (Local) | < 500 | ms | Release |
| P07 | TPS (Local) | > 50 | t/s | Release |
| P08 | TPS (Cloud) | > 150 | t/s | Release |
| P09 | Memory (idle) | < 200 | MB | Release |
| P10 | Memory (load) | < 500 | MB | Release |
| P11 | Scroll FPS | >= 55 | fps | PR |
| P12 | Search P99 (<10K) | < 100 | ms | PR |
| P13 | Search P99 (<100K) | < 500 | ms | Release |
| P14 | LSP hover P99 | < 100 | ms | PR |
| P15 | LSP completion P99 | < 200 | ms | PR |
| P16 | Event delivery P99 | < 5 | ms | Release |
| P17 | Build time (full) | < 45 | s | CI |
| P18 | Test suite | < 60 | s | CI |

### B: Package Map

```
@ideia/metrics-core         — packages/metrics-core/        Collector, AlertEngine, Score
@ideia/cache                — packages/cache/               CacheManager L1 + L2
@ideia/performance-monitor  — packages/perf-mon/            Budgets, dashboard, alerts
@ideia/backup-manager       — packages/data/src/backup/     BackupManager
@ideia/data-lineage         — packages/data/src/lineage/    DataLineageTracker
@ideia/data-validator       — packages/data/src/validation/ DataValidator + Quarantine
@ideia/decision-store       — packages/data/src/decisions/  DecisionStore
@ideia/embedding-eval       — packages/data/src/embeddings/ EmbeddingQualityEvaluator
@ideia/resilience-v2        — packages/resilience-v2/       CB v2, SelfHealing, Chaos
@ideia/slo-monitor          — packages/slo-monitor/         ErrorBudgetCalculator
@ideia/data-health          — packages/data/src/monitoring/ DataHealthDashboard
@ideia/privacy-pipeline     — packages/data/src/privacy/    PII scan + anonymization
```

### C: Resumo de Esforço

| Área | Fases | Semanas | Horas | Packages | Score Final |
|------|-------|---------|-------|----------|-------------|
| Performance (S54) | P1 + P2 + P3 | 10 | 213h | 12 | 80/100 |
| Dados (S58) | D1 + D2 + D3 | 10 | 200h | 9 | 75/100 |
| Resiliência (S55) | R1 + R2 + R3 | 10 | 260h | 4 | 80/100 |
| **Total** | **9 fases** | **~10 sem** | **~673h** | **~25 pkg** | **80/100** |

---

> **Próximos passos:** Implementação começa com as fases P1 (Performance Quick Wins), D1 (Data Assessment) e R1 (Resilience Foundation) em paralelo durante as semanas 1-2. Cada fase tem CI gate ao final. Score tracking via `IDEIA perf report --json`, `IDEIA data score --json` e `IDEIA resilience health --json`. Pontos de verificação semanais no HANDOFF-NEXT-SESSION.md.
```
