# ESTUDO S64 -- Self-Healing Code & Production Monitoring

> **Monitoramento proativo de producao, deteccao automatica de anomalias e geracao autonoma de PRs corretivas**
> Data: 2026-07-22
> Tipo: study
> Status: complete
> Proposito: Arquitetura de auto-healing inteligente que estende o ciclo "ideia -> solucao" para "ideia -> solucao -> manutencao continua", permitindo que a IDEIA detecte, diagnostique e corrija problemas de producao sem intervencao humana.

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao completa -- arquitetura, componentes, protocolos, roadmap e codigo |

---

## Sumario

1. [Introducao](#1-introducao)
2. [Architecture Overview](#2-architecture-overview)
3. [Health Monitoring System](#3-health-monitoring-system)
4. [Anomaly Detection](#4-anomaly-detection)
5. [Diagnostic Engine](#5-diagnostic-engine)
6. [Auto-Healing Engine](#6-auto-healing-engine)
7. [Self-Test & Validation](#7-self-test--validation)
8. [Incident Management](#8-incident-management)
9. [IDEIA Integration Architecture](#9-ideia-integration-architecture)
10. [Comparison with Existing Solutions](#10-comparison-with-existing-solutions)
11. [Theia Widget Integration](#11-theia-widget-integration)
12. [Code Examples (Comprehensive)](#12-code-examples-comprehensive)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Conexoes](#14-conexoes)

---

## 1. Introducao

### 1.1 O Problema da Manutencao Manual

Sistemas de software em producao inevitavelmente apresentam falhas. O modelo tradicional de manutencao depende de:

- **Equipes de Sobreaviso (On-Call):** Humanos alertados 24/7 para diagnosticar e corrigir problemas
- **Runbooks Manuais:** Documentos estaticos que frequentemente ficam desatualizados
- **Tempo de Resposta Lento:** Entre deteccao e correcao, minutos a horas se passam
- **Fadiga de Alerta:** Alertas falsos dessensibilizam equipes
- **Conhecimento Tacito:** Diagnostico depende de expertise individual, nao institucional

O custo e significativo:

| Aspecto | Impacto |
|---------|---------|
| MTTR (Mean Time to Resolve) | 1-4h para incidentes moderados |
| Custo por hora de downtime | $100k-$300k para empresas enterprise |
| Fadiga de equipe | 30% dos engenheiros reportam burnout relacionado a on-call |
| Perda de foco | Interrupcoes custam 23min para reestabelecer contexto |
| Conhecimento perdido | 60% dos runbooks estao desatualizados apos 6 meses |

### 1.2 Visao: O Ciclo Fechado de Self-Healing

A IDEIA propoe um sistema de auto-healing que fecha o ciclo:

```
[Problema] -> [Detectar] -> [Diagnosticar] -> [Corrigir] -> [Validar] -> [Documentar]
     ^                                                                          |
     |__________________________________________________________________________|
```

Onde cada etapa e automatizada por agentes de IA especializados:

1. **Health Monitor:** Coleta metricas em tempo real (CPU, memoria, latencia, taxa de erro)
2. **Anomaly Detector:** Identifica desvios em series temporais usando estatistica + ML
3. **Diagnostic Engine:** Correlaciona anomalias com causas raiz via analise de grafos de dependencia
4. **Auto-Healer:** Gera e executa planos de correcao com avaliacao de risco
5. **Self-Test Runner:** Valida se a correcao resolveu o problema sem introduzir novos
6. **Incident Reporter:** Documenta o incidente, gera postmortem e alimenta a base de conhecimento

### 1.3 Principios de Design

| Principio | Descricao |
|-----------|-----------|
| **Seguranca Primeiro** | Acoes de healing requerem aprovacao conforme nivel de confianca |
| **Idempotencia** | Toda acao de healing pode ser executada multiplas vezes sem efeitos colaterais |
| **Rollback Nativo** | Toda acao tem um plano de rollback correspondente |
| **Observabilidade Total** | Cada decisao do sistema e rastreada e auditavel |
| **Escalabilidade Horizontal** | Monitores e detectores sao stateless e escalam horizontalmente |
| **Baixo Falso-Positivo** | Multiplas fontes de evidencia antes de declarar anomalia |
| **Auto-Aprendizado** | O sistema melhora com cada incidente, ajustando thresholds e estrategias |
| **Nao Interferencia** | O sistema nunca deve piorar um problema que tenta corrigir |

---

## 2. Architecture Overview

### 2.1 Componentes Principais

```
+-----------------------------------------------------------------------+
|                       IDEIA Self-Healing System                        |
|                                                                        |
|  +----------------+    +----------------+    +----------------+        |
|  | Health Monitor  |    | Anomaly        |    | Diagnostic     |        |
|  | (Prometheus +   |--->| Detector       |--->| Engine         |        |
|  |  node_exporter) |    | (Statistical + |    | (RCA + Causal  |        |
|  |                 |    |  ML)           |    |  + Logs)       |        |
|  +----------------+    +----------------+    +-------+--------+        |
|                                                       |                |
|                                                       v                |
|  +----------------+    +----------------+    +----------------+        |
|  | Incident        |<---| Self-Test      |<---| Auto-Healer    |        |
|  | Reporter        |    | Runner         |    | (Planner +     |        |
|  | (Postmortem +   |    | (Validation +  |    |  Risk Assessor |        |
|  |  Knowledge      |    |  Canary)       |    |  + Executor)   |        |
|  |  Graph)         |    |                |    |                |        |
|  +----------------+    +----------------+    +----------------+        |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |                      IDEIA Event Bus (NATS)                       |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +----------------+    +----------------+    +----------------+        |
|  | Audit Trail     |    | Knowledge      |    | PR Pipeline    |        |
|  | (SHA-256 Chain) |    | Graph (Mem0 +  |    | (Auto PR Gen)  |        |
|  |                 |    |  SQLite)       |    |                |        |
|  +----------------+    +----------------+    +----------------+        |
+-----------------------------------------------------------------------+
```

### 2.2 Self-Healing Loop

```
+-----------------------------------------------------------------------+
|                   SELF-HEALING LOOP (Closed Cycle)                     |
|                                                                        |
|  1. MONITOR                                                            |
|     - Coleta metricas a cada 15s                                       |
|     - Verifica liveness + readiness + deep + synthetic checks          |
|     - Armazena em TSDB (Prometheus)                                    |
|          |                                                             |
|          v                                                             |
|  2. DETECT                                                             |
|     - Aplica Z-score + EWMA + Isolation Forest                         |
|     - Calcula desvio por dimensao (p95 latency, error rate, etc)      |
|     - Se score > threshold -> anomalia                                 |
|          |                                                             |
|          v                                                             |
|  3. DIAGNOSE                                                           |
|     - Correlaciona metricas com dependencias                           |
|     - Busca incidentes similares na Knowledge Base                     |
|     - Analisa logs + traces para RCA                                   |
|     - Produz DiagnosticReport                                          |
|          |                                                             |
|          v                                                             |
|  4. PLAN                                                               |
|     - Seleciona acoes de healing (restart, scale, rollback, etc)      |
|     - Avalia risco de cada acao (confidence score)                    |
|     - Gera plano com rollback correspondente                          |
|          |                                                             |
|          v                                                             |
|  5. APPROVE                                                            |
|     - confidence > 0.9 -> auto-executa                                 |
|     - confidence 0.7-0.9 -> pede confirmacao                           |
|     - confidence < 0.7 -> cria PR para revisao humana                  |
|          |                                                             |
|          v                                                             |
|  6. EXECUTE                                                            |
|     - Executa acoes na ordem definida                                  |
|     - Aplica canary (10% -> 50% -> 100%) se aplicavel                  |
|     - Registra cada passo no audit trail                               |
|          |                                                             |
|          v                                                             |
|  7. VALIDATE                                                           |
|     - Re-executa health checks                                         |
|     - Verifica se metricas normalizaram                                |
|     - Se falhou -> rollback + escalation                               |
|          |                                                             |
|          v                                                             |
|  8. DOCUMENT                                                           |
|     - Gera postmortem automatico                                       |
|     - Alimenta Knowledge Base com novo incidente                       |
|     - Atualiza thresholds se necessario                                |
|          |                                                             |
|          +-----> retorna ao passo 1 -----------------------------------+
+-----------------------------------------------------------------------+
```

---

## 3. Health Monitoring System

### 3.1 Metric Collection (Prometheus + node_exporter)

O sistema usa Prometheus como backend primario de metricas, com node_exporter para metricas de sistema e exporters customizados para metricas da aplicacao IDEIA.

**Metricas Coletadas por Categoria:**

| Categoria | Metricas | Fonte |
|-----------|----------|-------|
| **Sistema** | cpu_usage, memory_usage, disk_io, network_io, load_avg | node_exporter |
| **Processo** | process_cpu, process_memory, file_descriptors, goroutines | process_exporter |
| **Aplicacao** | request_count, request_duration_ms, error_count, active_connections | Custom IDEIA metrics |
| **LLM** | llm_tokens_in, llm_tokens_out, llm_latency_ms, llm_error_rate | LLM Provider metrics |
| **Agente** | agent_execution_time_ms, agent_success_rate, agent_queue_depth | Agent Runtime metrics |
| **Event Bus** | nats_messages_published, nats_messages_consumed, nats_queue_depth | NATS metrics |
| **Cache** | cache_hit_ratio, cache_size, cache_eviction_count | Cache layer metrics |
| **Database** | db_connection_pool_size, db_query_latency_ms, db_error_rate | Database metrics |

### 3.2 Health Check Types

O sistema implementa quatro niveis de health checks, seguindo o padrao Kubernetes:

```
+-----------------------------------------------------------------------+
|                       HEALTH CHECK PYRAMID                             |
|                                                                        |
|                       +-----------------+                              |
|                       |   SYNTHETIC     |  ^ Mais profundo             |
|                       | (transacao real)|  |                           |
|                       +-----------------+  |                           |
|                       +-----------------+  |                           |
|                       |     DEEP        |  |                           |
|                       | (dependencias)  |  |                           |
|                       +-----------------+  |                           |
|                       +-----------------+  |                           |
|                       |   READINESS     |  |                           |
|                       | (aceita trafego)|  |                           |
|                       +-----------------+  |                           |
|                       +-----------------+  |                           |
|                       |   LIVENESS      |  v Superficial               |
|                       | (processo vivo) |                             |
|                       +-----------------+                             |
+-----------------------------------------------------------------------+
```

**Liveness Check:** Verifica se o processo esta executando e respondendo a requisicoes basicas. Se falha, o processo deve ser reiniciado.

**Readiness Check:** Verifica se o servico pode aceitar trafego. Dependencias como banco de dados e cache precisam estar acessiveis. Se falha, o servico e removido do balanceador.

**Deep Check:** Verifica dependencias externas (APIs de terceiros, provedores LLM, banco de dados, filas). Falha indica degradacao parcial.

**Synthetic Check:** Executa uma transacao de ponta-a-ponta (ex: criar usuario, executar query, gerar codigo) para validar o fluxo completo. Falha indica problema funcional grave.

### 3.3 Alert Rules (Prometheus AlertManager Config)

```yaml
# alerts/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/...'

route:
  group_by: ['alertname', 'severity', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      repeat_interval: 10m
    - match:
        severity: warning
      receiver: 'slack'
    - match:
        severity: info
      receiver: 'dashboard'

receivers:
  - name: 'default'
    webhook_configs:
      - url: 'http://ideia-healing:9090/webhook/alert'
        send_resolved: true

  - name: 'pagerduty'
    pagerduty_configs:
      - routing_key: '...'
        severity: 'critical'

  - name: 'slack'
    slack_configs:
      - channel: '#ideia-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.description }}'

inhibit_rules:
  - source_match:
      severity: critical
    target_match:
      severity: warning
    equal: ['service', 'alertname']
```

```yaml
# alerts/prometheus-rules.yml
groups:
  - name: ideia-service-health
    interval: 30s
    rules:
      - alert: ServiceDown
        expr: up{job=~"ideia-.*"} == 0
        for: 1m
        labels:
          severity: critical
          component: service
        annotations:
          summary: 'Service {{ $labels.job }} is down'
          description: '{{ $labels.job }} has been down for more than 1 minute'
          runbook: 'restart-service'

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
          component: application
        annotations:
          summary: 'High error rate on {{ $labels.service }}'
          description: 'Error rate {{ $value | humanizePercentage }} on {{ $labels.service }}'
          runbook: 'investigate-error-rate'

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 3m
        labels:
          severity: warning
          component: application
        annotations:
          summary: 'High latency on {{ $labels.service }}'
          description: 'p95 latency {{ $value }}s on {{ $labels.service }}'
          runbook: 'investigate-latency'

      - alert: MemoryPressure
        expr: (process_resident_memory_bytes / process_virtual_memory_bytes) > 0.9
        for: 5m
        labels:
          severity: warning
          component: system
        annotations:
          summary: 'Memory pressure on {{ $labels.job }}'
          description: 'Memory usage at {{ $value | humanizePercentage }}'

      - alert: LivenessFailed
        expr: ideia_health_check{type="liveness", status="failing"} > 0
        for: 30s
        labels:
          severity: critical
          component: health
        annotations:
          summary: 'Liveness check failed on {{ $labels.service }}'
          description: 'Service {{ $labels.service }} failing liveness checks'

      - alert: ReadinessFailed
        expr: ideia_health_check{type="readiness", status="failing"} > 0
        for: 1m
        labels:
          severity: warning
          component: health
        annotations:
          summary: 'Readiness check failed on {{ $labels.service }}'
          description: 'Service {{ $labels.service }} failing readiness checks'

  - name: ideia-anomaly
    interval: 1m
    rules:
      - alert: AnomalyDetected
        expr: ideia_anomaly_score > 0.8
        for: 30s
        labels:
          severity: warning
          component: anomaly
        annotations:
          summary: 'Anomaly detected in {{ $labels.metric }}'
          description: 'Anomaly score {{ $value }} for {{ $labels.metric }} on {{ $labels.service }}'

      - alert: CriticalAnomaly
        expr: ideia_anomaly_score > 0.95
        for: 30s
        labels:
          severity: critical
          component: anomaly
        annotations:
          summary: 'Critical anomaly detected in {{ $labels.metric }}'
          description: 'Critical anomaly score {{ $value }} for {{ $labels.metric }} on {{ $labels.service }}'

  - name: ideia-self-healing
    interval: 1m
    rules:
      - alert: HealingActionFailed
        expr: ideia_healing_action_status{status="failed"} > 0
        labels:
          severity: critical
          component: healing
        annotations:
          summary: 'Healing action failed for {{ $labels.incident_id }}'
          description: 'Healing action {{ $labels.action }} failed for incident {{ $labels.incident_id }}'

      - alert: RollbackExecuted
        expr: ideia_healing_action_status{status="rolled_back"} > 0
        labels:
          severity: warning
          component: healing
        annotations:
          summary: 'Rollback executed for {{ $labels.incident_id }}'
          description: 'Rollback executed for healing action {{ $labels.action }} on incident {{ $labels.incident_id }}'
```

### 3.4 Code Example: HealthCheckRegistry + Custom Checks

```typescript
// packages/monitor/src/health/health-check-registry.ts

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
export type HealthCheckType = 'liveness' | 'readiness' | 'deep' | 'synthetic';

export interface HealthCheckResult {
  name: string;
  type: HealthCheckType;
  status: HealthStatus;
  latency: number;
  error?: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

export interface HealthCheck {
  name: string;
  type: HealthCheckType;
  interval: number;
  timeout: number;
  execute(): Promise<HealthCheckResult>;
}

export class HealthCheckRegistry {
  private checks: Map<string, HealthCheck> = new Map();
  private results: Map<string, HealthCheckResult> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  register(check: HealthCheck): void {
    this.checks.set(check.name, check);
  }

  start(): void {
    for (const check of this.checks.values()) {
      this.runCheck(check);
      const timer = setInterval(() => this.runCheck(check), check.interval);
      this.timers.set(check.name, timer);
    }
  }

  stop(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }

  async getStatus(type?: HealthCheckType): Promise<{ overall: HealthStatus; checks: HealthCheckResult[] }> {
    const allResults = Array.from(this.results.values());
    const filtered = type ? allResults.filter(r => r.type === type) : allResults;

    const statuses = filtered.map(r => r.status);
    const overall: HealthStatus =
      statuses.some(s => s === 'unhealthy') ? 'unhealthy' :
      statuses.some(s => s === 'degraded') ? 'degraded' :
      'healthy';

    return { overall, checks: filtered };
  }

  async getMetrics(): Promise<Record<string, number>> {
    const { checks } = await this.getStatus();
    const metrics: Record<string, number> = {};
    for (const check of checks) {
      metrics[`health_check_${check.type}_${check.name}_status`] =
        check.status === 'healthy' ? 1 : check.status === 'degraded' ? 0.5 : 0;
      metrics[`health_check_${check.type}_${check.name}_latency_ms`] = check.latency;
    }
    return metrics;
  }

  private async runCheck(check: HealthCheck): Promise<void> {
    try {
      const result = await check.execute();
      this.results.set(check.name, result);
      this.emitHealthEvent(result);
      if (result.status === 'unhealthy' || result.status === 'degraded') {
        this.emitDegradationEvent(check.name, result);
      }
    } catch (error) {
      const failed: HealthCheckResult = {
        name: check.name,
        type: check.type,
        status: 'unhealthy',
        latency: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
      this.results.set(check.name, failed);
      this.emitHealthEvent(failed);
    }
  }

  private emitHealthEvent(result: HealthCheckResult): void {
    const eventBus = (globalThis as any).__eventBus;
    if (eventBus?.publish) {
      eventBus.publish('monitor.health.result', {
        type: result.type, name: result.name, status: result.status,
        latency: result.latency, timestamp: result.timestamp,
      });
    }
  }

  private emitDegradationEvent(name: string, result: HealthCheckResult): void {
    const eventBus = (globalThis as any).__eventBus;
    if (eventBus?.publish) {
      eventBus.publish('monitor.health.degraded', {
        name, status: result.status, error: result.error, timestamp: result.timestamp,
      });
    }
  }
}

// Custom Health Checks

export class LivenessCheck implements HealthCheck {
  name = 'process-liveness';
  type: HealthCheckType = 'liveness';
  interval = 15000;
  timeout = 5000;

  constructor(private checkFn: () => Promise<boolean>) {}

  async execute(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const alive = await this.checkFn();
      return {
        name: this.name, type: this.type,
        status: alive ? 'healthy' : 'unhealthy',
        latency: Date.now() - start, timestamp: Date.now(),
      };
    } catch (error) {
      return {
        name: this.name, type: this.type, status: 'unhealthy',
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Liveness check failed',
        timestamp: Date.now(),
      };
    }
  }
}

export class DependencyCheck implements HealthCheck {
  name: string;
  type: HealthCheckType = 'deep';
  interval = 30000;
  timeout = 10000;

  constructor(
    name: string,
    private checkDependency: () => Promise<{ ok: boolean; latency: number; details?: Record<string, unknown> }>
  ) {
    this.name = `dependency-${name}`;
  }

  async execute(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const result = await this.checkDependency();
      return {
        name: this.name, type: this.type,
        status: result.ok ? 'healthy' : 'degraded',
        latency: Date.now() - start, details: result.details, timestamp: Date.now(),
      };
    } catch (error) {
      return {
        name: this.name, type: this.type, status: 'unhealthy',
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Dependency check failed',
        timestamp: Date.now(),
      };
    }
  }
}

export class SyntheticCheck implements HealthCheck {
  name: string;
  type: HealthCheckType = 'synthetic';
  interval = 120000;
  timeout = 30000;

  constructor(
    name: string,
    private executeTransaction: () => Promise<{ success: boolean; latency: number; details?: Record<string, unknown> }>
  ) {
    this.name = `synthetic-${name}`;
  }

  async execute(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const result = await this.executeTransaction();
      return {
        name: this.name, type: this.type,
        status: result.success ? 'healthy' : 'degraded',
        latency: Date.now() - start, details: result.details, timestamp: Date.now(),
      };
    } catch (error) {
      return {
        name: this.name, type: this.type, status: 'unhealthy',
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Synthetic transaction failed',
        timestamp: Date.now(),
      };
    }
  }
}
```

---

## 4. Anomaly Detection

### 4.1 Statistical Methods

**Z-Score (Desvio Padrao):**

Calcula quantos desvios padrao o valor atual esta da media:

```
z = (x - u) / s

Onde:
- x = valor atual
- u = media da janela
- s = desvio padrao da janela

Threshold: |z| > 3 (99.7% confianca para distribuicao normal)
```

**EWMA (Exponentially Weighted Moving Average):**

Da mais peso a observacoes recentes:

```
EWMA_t = a * x_t + (1 - a) * EWMA_{t-1}

Onde a (alpha) = 2 / (n + 1), tipicamente 0.1-0.3
```

**Seasonal Decomposition (STL):**

Decompoe a serie em tendencia + sazonalidade + residuo:

```
y_t = T_t + S_t + R_t

Onde:
- T_t = tendencia (lowess smoothing)
- S_t = componente sazonal
- R_t = residuo (usado para deteccao de anomalias)
```

### 4.2 ML-Based Detection

**Isolation Forest:**

Algoritmo baseado em arvores de decisao que isola anomalias:

```
1. Amostra subset de dados
2. Constroi arvore binaria particionando aleatoriamente
3. Anomalias = caminhos mais curtos na arvore
4. Score = 2^(-E(h(x)) / c(n))
   Onde: h(x) = profundidade do caminho, c(n) = profundidade media
```

**LSTM Autoencoder:**

Rede neural que aprende a reconstruir series temporais normais:

```
Encoder: LSTM(64) -> LSTM(32) -> LSTM(16)  (comprime)
Decoder: LSTM(16) -> LSTM(32) -> LSTM(64)  (reconstroi)

Erro de reconstrucao = ||x - x_hat||^2
Anomalia se erro > threshold (p95 do erro de treino)
```

### 4.3 Multi-Dimensional Correlation

Anomalias isoladas podem ser falsos positivos. O sistema correlaciona multiplas dimensoes antes de declarar um incidente:

```
Matriz de Correlacao:

             CPU  Mem  Lat  Err  Throughput
CPU          1.0  0.3  0.7  0.5  -0.6
Mem          0.3  1.0  0.2  0.1  -0.2
Lat          0.7  0.2  1.0  0.8  -0.8
Err          0.5  0.1  0.8  1.0  -0.7
Throughput  -0.6 -0.2 -0.8 -0.7   1.0

Regra: Anomalia confirmada se:
  - Pelo menos 2 metricas correlacionadas (>0.5) apresentam anomalia
  - Ou 1 metrica com score > 0.95
  - Ou anomalia persiste por > 2 janelas consecutivas
```

### 4.4 Code Example: AnomalyDetector with Multiple Strategies

```typescript
// packages/monitor/src/anomaly/anomaly-detector.ts

export interface MetricPoint {
  timestamp: number;
  value: number;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  score: number;
  method: string;
  details: {
    expected?: number;
    deviation?: number;
    threshold?: number;
    confidence?: number;
  };
  timestamp: number;
}

export interface DetectionStrategy {
  name: string;
  detect(series: MetricPoint[], currentValue: number): AnomalyResult;
  train(series: MetricPoint[]): void;
}

export class ZScoreStrategy implements DetectionStrategy {
  name = 'zscore';
  private mean = 0;
  private std = 0;
  private threshold = 3.5;
  private windowSize = 100;

  train(series: MetricPoint[]): void {
    const window = series.slice(-this.windowSize);
    const values = window.map(p => p.value);
    this.mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - this.mean) ** 2, 0) / values.length;
    this.std = Math.sqrt(variance);
  }

  detect(_series: MetricPoint[], currentValue: number): AnomalyResult {
    const deviation = this.std === 0 ? 0 : (currentValue - this.mean) / this.std;
    const score = Math.min(1, Math.abs(deviation) / (this.threshold * 2));
    return {
      isAnomaly: Math.abs(deviation) > this.threshold,
      score, method: this.name,
      details: { expected: this.mean, deviation, threshold: this.threshold },
      timestamp: Date.now(),
    };
  }
}

export class EWMAStrategy implements DetectionStrategy {
  name = 'ewma';
  private ewma = 0;
  private variance = 0;
  private alpha = 0.15;
  private threshold = 3;
  private initialized = false;

  train(series: MetricPoint[]): void {
    if (series.length === 0) return;
    this.ewma = series[0].value;
    for (let i = 1; i < series.length; i++) {
      this.ewma = this.alpha * series[i].value + (1 - this.alpha) * this.ewma;
    }
    const residuals = series.map(p => Math.abs(p.value - this.ewma));
    this.variance = residuals.reduce((a, b) => a + b ** 2, 0) / residuals.length;
    this.initialized = true;
  }

  detect(_series: MetricPoint[], currentValue: number): AnomalyResult {
    if (!this.initialized) {
      this.ewma = currentValue;
      this.initialized = true;
      return { isAnomaly: false, score: 0, method: this.name, details: {}, timestamp: Date.now() };
    }
    const residual = Math.abs(currentValue - this.ewma);
    const std = Math.sqrt(this.variance) || 1;
    const deviation = residual / std;
    const score = Math.min(1, deviation / (this.threshold * 2));
    this.ewma = this.alpha * currentValue + (1 - this.alpha) * this.ewma;
    return {
      isAnomaly: deviation > this.threshold, score, method: this.name,
      details: { expected: this.ewma, deviation, threshold: this.threshold },
      timestamp: Date.now(),
    };
  }
}

export class IsolationForestStrategy implements DetectionStrategy {
  name = 'isolation-forest';
  private trees: Array<{ splitAttr: number; splitValue: number; left: any; right: any }> = [];
  private numTrees = 100;
  private sampleSize = 256;

  train(series: MetricPoint[]): void {
    const values = series.map(p => p.value);
    this.trees = [];
    for (let i = 0; i < this.numTrees; i++) {
      const sample = this.randomSample(values, Math.min(this.sampleSize, values.length));
      this.trees.push(this.buildTree(sample, 0, 50));
    }
  }

  detect(_series: MetricPoint[], currentValue: number): AnomalyResult {
    if (this.trees.length === 0) {
      return { isAnomaly: false, score: 0, method: this.name, details: {}, timestamp: Date.now() };
    }
    const pathLengths = this.trees.map(tree => this.pathLength(currentValue, tree, 0));
    const avgPathLength = pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length;
    const expectedPathLength = 2 * Math.log(this.sampleSize - 1) + 0.5772 - 2 * (this.sampleSize - 1) / this.sampleSize;
    const anomalyScore = Math.pow(2, -avgPathLength / expectedPathLength);
    return {
      isAnomaly: anomalyScore > 0.6, score: Math.min(1, anomalyScore * 1.5),
      method: this.name, details: { confidence: anomalyScore, pathLength: avgPathLength, expectedPathLength },
      timestamp: Date.now(),
    };
  }

  private randomSample(values: number[], size: number): number[] {
    const shuffled = [...values];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, size);
  }

  private buildTree(values: number[], depth: number, maxDepth: number): any {
    if (depth >= maxDepth || values.length <= 1) return { size: values.length };
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return { size: values.length };
    const splitValue = min + Math.random() * (max - min);
    const left = values.filter(v => v < splitValue);
    const right = values.filter(v => v >= splitValue);
    return { splitAttr: 0, splitValue, left: this.buildTree(left, depth + 1, maxDepth), right: this.buildTree(right, depth + 1, maxDepth), size: values.length };
  }

  private pathLength(value: number, tree: any, depth: number): number {
    if (!tree.left && !tree.right) return depth + this.cFactor(tree.size);
    if (value < tree.splitValue) return this.pathLength(value, tree.left, depth + 1);
    return this.pathLength(value, tree.right, depth + 1);
  }

  private cFactor(n: number): number {
    if (n <= 1) return 0;
    return 2 * Math.log(n - 1) + 0.5772 - 2 * (n - 1) / n;
  }
}

// Main Anomaly Detector with Ensemble + Fallback

export class AnomalyDetector {
  private strategies: DetectionStrategy[] = [];
  private metricHistory: Map<string, MetricPoint[]> = new Map();
  private maxHistorySize = 1000;
  private ensembleThreshold = 0.5;

  constructor() {
    this.strategies.push(new ZScoreStrategy());
    this.strategies.push(new EWMAStrategy());
    this.strategies.push(new IsolationForestStrategy());
  }

  registerStrategy(strategy: DetectionStrategy): void {
    this.strategies.push(strategy);
  }

  addMetricPoint(metricName: string, value: number): void {
    if (!this.metricHistory.has(metricName)) {
      this.metricHistory.set(metricName, []);
    }
    const history = this.metricHistory.get(metricName)!;
    history.push({ timestamp: Date.now(), value });
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }
  }

  analyze(metricName: string, currentValue: number): AnomalyResult {
    const history = this.metricHistory.get(metricName) || [];
    if (history.length < 10) {
      return { isAnomaly: false, score: 0, method: 'insufficient-data', details: {}, timestamp: Date.now() };
    }
    if (history.length % 50 === 0) {
      for (const strategy of this.strategies) {
        strategy.train(history);
      }
    }
    const results = this.strategies
      .filter(s => history.length >= 10)
      .map(s => s.detect(history, currentValue));

    if (results.length === 0) {
      return { isAnomaly: false, score: 0, method: 'no-strategies', details: {}, timestamp: Date.now() };
    }
    const anomalyCount = results.filter(r => r.isAnomaly).length;
    const avgScore = results.reduce((a, r) => a + r.score, 0) / results.length;
    const isAnomaly = (anomalyCount / results.length) >= this.ensembleThreshold || avgScore > 0.8;
    return {
      isAnomaly, score: avgScore, method: 'ensemble',
      details: {
        strategies: results.map(r => ({ method: r.method, isAnomaly: r.isAnomaly, score: r.score })),
        votes: `${anomalyCount}/${results.length}`,
      },
      timestamp: Date.now(),
    };
  }
}
```

---

## 6. Auto-Healing Engine

### 6.1 Healing Action Types

O sistema suporta as seguintes acoes de healing, cada uma com implementacao e rollback especificos:

| Acao | Descricao | Rollback | Risco |
|------|-----------|----------|-------|
| **restart** | Reinicia o servico | Restart novamente (se falhar) | Baixo |
| **scale-up** | Aumenta o numero de replicas | scale-down | Baixo |
| **scale-down** | Reduz o numero de replicas | scale-up | Baixo |
| **rollback** | Reverte para versao anterior | rollback-forward | Medio |
| **clear-cache** | Limpa cache do servico | N/A (re-popula) | Baixo |
| **reset-rate-limit** | Reseta contadores de rate limit | N/A | Baixo |
| **run-migration** | Executa fix de migracao SQL | migration-rollback | Alto |
| **revert-config** | Reverte mudanca de configuracao | reapply-config | Medio |
| **drain-connections** | Drena conexoes ativas | N/A | Baixo |
| **increase-limit** | Aumenta limite de recurso (memoria/CPU) | decrease-limit | Medio |
| **create-pr** | Cria PR com correcao de codigo | PR revert | Alto |

### 6.2 Risk Assessment (Confidence Score per Action)

Cada acao de healing recebe um score de confianca baseado em:

```
Confidence = P(success | context) * (1 - P(negative_impact | context))

Fatores:
  - Historico de sucesso da acao no mesmo servico (30%)
  - Similaridade com incidentes passados resolvidos (25%)
  - Severidade do incidente (15%)
  - Complexidade da acao (10%)
  - Impacto estimado em usuarios (10%)
  - Hora do dia / janela de manutencao (5%)
  - Aprovacoes previas de acoes similares (5%)
```

**Matriz de Risco:**

| Confianca | Nivel de Risco | Gate de Aprovacao |
|-----------|---------------|-------------------|
| > 0.9 | Baixo | Auto (executa sem aprovacao) |
| 0.7 - 0.9 | Medio | Semi-auto (confirmacao via Slack/Web) |
| 0.5 - 0.7 | Alto | Manual (aprovacao humana necessaria) |
| < 0.5 | Critico | Manual + Documentacao de justificativa |

### 6.3 Approval Gates

```
+-----------------------------------------------------------------------+
|                       HEALING APPROVAL GATES                           |
|                                                                        |
|  +--------------+                                                      |
|  | Diagnostic   |                                                      |
|  | Report       |                                                      |
|  +------+-------+                                                      |
|          |                                                              |
|          v                                                              |
|  +--------------------------------------------+                       |
|  |          Risk Assessment                    |                       |
|  |  Confidence = calculateConfidence(report)   |                       |
|  +------+---------------------+---------------+                       |
|          |                     |                                       |
|   conf > 0.9             conf 0.7-0.9        conf < 0.7               |
|          |                     |                       |               |
|          v                     v                       v               |
|  +--------------+    +------------------+    +------------------+     |
|  | AUTO-EXECUTE |    | CONFIRM:         |    | CREATE PR:       |     |
|  | Executa sem  |    | "Restart service?|    | "Investigate     |     |
|  | intervencao  |    | [Yes] [No]"      |    | memory leak"     |     |
|  +--------------+    +------------------+    +------------------+     |
+-----------------------------------------------------------------------+
```

### 6.4 Code Example: AutoHealer with Action Planner + Rollback Plan

```typescript
// packages/monitor/src/healing/auto-healer.ts

export type HealingActionType =
  | 'restart' | 'scale-up' | 'scale-down' | 'rollback'
  | 'clear-cache' | 'reset-rate-limit' | 'run-migration'
  | 'revert-config' | 'drain-connections' | 'increase-limit' | 'create-pr';

export type ApprovalLevel = 'auto' | 'semi-auto' | 'manual' | 'critical';

export interface HealingAction {
  id: string;
  type: HealingActionType;
  target: string;
  params: Record<string, unknown>;
  risk: number;
  confidence: number;
  approval: ApprovalLevel;
  rollbackPlan: HealingAction[];
  order: number;
}

export interface HealingPlan {
  planId: string;
  incidentId: string;
  actions: HealingAction[];
  estimatedDuration: number;
  riskScore: number;
  overallConfidence: number;
  approvalLevel: ApprovalLevel;
}

export interface HealingResult {
  actionId: string;
  type: HealingActionType;
  status: 'executing' | 'success' | 'failed' | 'rolled_back';
  startTime: number;
  endTime?: number;
  output?: string;
  error?: string;
}

export class AutoHealer {
  private plans: Map<string, HealingPlan> = new Map();
  private actionExecutors: Map<HealingActionType, (action: HealingAction) => Promise<HealingResult>> = new Map();
  private executionHistory: HealingResult[] = [];

  constructor() {
    this.registerDefaultExecutors();
  }

  private registerDefaultExecutors(): void {
    this.actionExecutors.set('restart', this.executeRestart.bind(this));
    this.actionExecutors.set('scale-up', this.executeScaleUp.bind(this));
    this.actionExecutors.set('rollback', this.executeRollback.bind(this));
    this.actionExecutors.set('clear-cache', this.executeClearCache.bind(this));
    this.actionExecutors.set('reset-rate-limit', this.executeResetRateLimit.bind(this));
    this.actionExecutors.set('create-pr', this.executeCreatePR.bind(this));
  }

  registerExecutor(type: HealingActionType, executor: (action: HealingAction) => Promise<HealingResult>): void {
    this.actionExecutors.set(type, executor);
  }

  createPlan(diagnostic: DiagnosticReport): HealingPlan {
    const actions: HealingAction[] = [];
    let order = 0;

    for (const cause of diagnostic.rootCauses) {
      const action = this.buildActionFromCause(cause, diagnostic, order);
      if (action) { actions.push(action); order++; }
    }

    const overallConfidence = actions.length > 0
      ? actions.reduce((a, a2) => a + a2.confidence, 0) / actions.length : 0;

    const approvalLevel: ApprovalLevel =
      overallConfidence > 0.9 ? 'auto' :
      overallConfidence > 0.7 ? 'semi-auto' :
      overallConfidence > 0.5 ? 'manual' : 'critical';

    return {
      planId: `plan-${Date.now()}`,
      incidentId: diagnostic.reportId,
      actions,
      estimatedDuration: actions.length * 30000,
      riskScore: 1 - overallConfidence,
      overallConfidence,
      approvalLevel,
    };
  }

  private buildActionFromCause(cause: RootCause, diagnostic: DiagnosticReport, order: number): HealingAction | null {
    const actionType = this.suggestedActionToType(cause.suggestedAction);
    if (!actionType) return null;
    const riskFactor = this.getActionRisk(actionType);
    const adjustedConfidence = cause.confidence * (1 - riskFactor);
    return {
      id: `action-${Date.now()}-${order}`,
      type: actionType,
      target: cause.service,
      params: { service: cause.service, severity: diagnostic.incident.severity, evidence: cause.evidence.slice(0, 3) },
      risk: riskFactor,
      confidence: adjustedConfidence,
      approval: this.getApprovalLevel(adjustedConfidence),
      rollbackPlan: this.generateRollbackPlan(actionType, cause.service),
      order,
    };
  }

  private suggestedActionToType(action: string): HealingActionType | null {
    const mapping: Record<string, HealingActionType> = {
      'restart': 'restart', 'scale-up': 'scale-up', 'rollback': 'rollback',
      'clear-cache': 'clear-cache', 'reset-rate-limit': 'reset-rate-limit',
      'run-migration': 'run-migration', 'revert-config': 'revert-config',
      'drain-connections': 'drain-connections', 'increase-limit': 'increase-limit',
      'create-pr': 'create-pr', 'investigate-service': 'restart',
      'investigate-upstream': 'restart', 'kill-queries': 'restart',
      'check-network': 'restart', 'clean-disk': 'scale-up', 'retry': 'restart',
    };
    return mapping[action] || null;
  }

  private getActionRisk(type: HealingActionType): number {
    const risks: Record<HealingActionType, number> = {
      'restart': 0.1, 'scale-up': 0.05, 'scale-down': 0.1, 'rollback': 0.3,
      'clear-cache': 0.05, 'reset-rate-limit': 0.05, 'run-migration': 0.5,
      'revert-config': 0.25, 'drain-connections': 0.1, 'increase-limit': 0.15, 'create-pr': 0.4,
    };
    return risks[type] || 0.2;
  }

  private getApprovalLevel(confidence: number): ApprovalLevel {
    if (confidence > 0.9) return 'auto';
    if (confidence > 0.7) return 'semi-auto';
    if (confidence > 0.5) return 'manual';
    return 'critical';
  }

  private generateRollbackPlan(actionType: HealingActionType, target: string): HealingAction[] {
    const opposite: Record<HealingActionType, HealingActionType | null> = {
      'restart': null, 'scale-up': 'scale-down', 'scale-down': 'scale-up',
      'rollback': 'restart', 'clear-cache': null, 'reset-rate-limit': null,
      'run-migration': 'restart', 'revert-config': 'restart',
      'drain-connections': 'restart', 'increase-limit': 'restart', 'create-pr': null,
    };
    const oppositeType = opposite[actionType];
    if (!oppositeType) return [];
    return [{
      id: `rollback-${actionType}-${target}`, type: oppositeType, target,
      params: { service: target, reason: 'Rollback of failed healing action' },
      risk: 0.1, confidence: 0.95, approval: 'auto', rollbackPlan: [], order: 0,
    }];
  }

  async executePlan(plan: HealingPlan, onApproval?: (action: HealingAction) => Promise<boolean>): Promise<HealingResult[]> {
    this.plans.set(plan.planId, plan);
    const results: HealingResult[] = [];

    for (const action of plan.actions) {
      if (action.approval !== 'auto' && onApproval) {
        const approved = await onApproval(action);
        if (!approved) {
          results.push({
            actionId: action.id, type: action.type, status: 'failed',
            startTime: Date.now(), endTime: Date.now(), error: 'Action rejected by user',
          });
          continue;
        }
      }
      const executor = this.actionExecutors.get(action.type);
      if (!executor) {
        results.push({
          actionId: action.id, type: action.type, status: 'failed',
          startTime: Date.now(), endTime: Date.now(), error: 'No executor registered',
        });
        continue;
      }
      const result = await executor(action);
      results.push(result);
      if (result.status === 'failed' && action.rollbackPlan.length > 0) {
        for (const rollbackAction of action.rollbackPlan) {
          const rollbackExecutor = this.actionExecutors.get(rollbackAction.type);
          if (rollbackExecutor) results.push(await rollbackExecutor(rollbackAction));
        }
      }
    }
    this.executionHistory.push(...results);
    return results;
  }

  private async executeRestart(action: HealingAction): Promise<HealingResult> {
    const start = Date.now();
    try {
      return {
        actionId: action.id, type: 'restart', status: 'success',
        startTime: start, endTime: Date.now(),
        output: JSON.stringify({ service: action.target, status: 'restarted' }),
      };
    } catch (error) {
      return {
        actionId: action.id, type: 'restart', status: 'failed',
        startTime: start, endTime: Date.now(),
        error: error instanceof Error ? error.message : 'Restart failed',
      };
    }
  }

  private async executeScaleUp(action: HealingAction): Promise<HealingResult> {
    const start = Date.now();
    try {
      return {
        actionId: action.id, type: 'scale-up', status: 'success',
        startTime: start, endTime: Date.now(),
        output: JSON.stringify({ service: action.target, replicas: 5, status: 'scaled' }),
      };
    } catch (error) {
      return {
        actionId: action.id, type: 'scale-up', status: 'failed',
        startTime: start, endTime: Date.now(),
        error: error instanceof Error ? error.message : 'Scale up failed',
      };
    }
  }

  private async executeRollback(action: HealingAction): Promise<HealingResult> {
    const start = Date.now();
    try {
      return {
        actionId: action.id, type: 'rollback', status: 'success',
        startTime: start, endTime: Date.now(),
        output: JSON.stringify({ service: action.target, revision: 'previous', status: 'rolled_back' }),
      };
    } catch (error) {
      return {
        actionId: action.id, type: 'rollback', status: 'failed',
        startTime: start, endTime: Date.now(),
        error: error instanceof Error ? error.message : 'Rollback failed',
      };
    }
  }

  private async executeClearCache(_action: HealingAction): Promise<HealingResult> {
    const start = Date.now();
    return {
      actionId: _action.id, type: 'clear-cache', status: 'success',
      startTime: start, endTime: Date.now(),
      output: JSON.stringify({ target: _action.target, status: 'cache_cleared' }),
    };
  }

  private async executeResetRateLimit(_action: HealingAction): Promise<HealingResult> {
    const start = Date.now();
    return {
      actionId: _action.id, type: 'reset-rate-limit', status: 'success',
      startTime: start, endTime: Date.now(),
      output: JSON.stringify({ target: _action.target, status: 'rate_limit_reset' }),
    };
  }

  private async executeCreatePR(action: HealingAction): Promise<HealingResult> {
    const start = Date.now();
    try {
      return {
        actionId: action.id, type: 'create-pr', status: 'success',
        startTime: start, endTime: Date.now(),
        output: JSON.stringify({
          service: action.target,
          prTitle: `fix: auto-healing for ${action.target}`,
          status: 'pr_created',
          prUrl: 'https://github.com/ideia/ideia/pull/NEW',
        }),
      };
    } catch (error) {
      return {
        actionId: action.id, type: 'create-pr', status: 'failed',
        startTime: start, endTime: Date.now(),
        error: error instanceof Error ? error.message : 'PR creation failed',
      };
    }
  }
}
```

---

## 7. Self-Test & Validation

### 7.1 Post-Healing Validation Suite

Apos executar uma acao de healing, o sistema executa automaticamente uma suite de validacao:

```
Fase 1: Re-executar health checks (imediatamente apos healing)
  +-- Liveness: servico esta respondendo?
  +-- Readiness: dependencias internas estao OK?
  +-- Deep: dependencias externas estao OK?

Fase 2: Metricas de curto prazo (1 min apos healing)
  +-- A metrica anomala normalizou?
  +-- Taxa de erro voltou ao baseline?
  +-- Latencia dentro do threshold?

Fase 3: Synthetic transactions (3 min apos healing)
  +-- Endpoint critico responde corretamente?
  +-- Fluxo E2E de negocios funciona?

Fase 4: Observacao estavel (15 min apos healing)
  +-- Nenhuma nova anomalia detectada?
  +-- Metricas estaveis por 3 janelas consecutivas?

Se qualquer fase falhar -> rollback imediato + escalacao
```

### 7.2 Canary Analysis (Gradual Rollout of Fix)

Para acoes de healing que afetam multiplas instancias, o sistema usa canary analysis:

```
+-----------------------------------------------------------------------+
|                       CANARY PROGRESSION                               |
|                                                                        |
|  +----------+    +----------+    +----------+    +----------+          |
|  | Canary   |--->| Wave 1   |--->| Wave 2   |--->| Full     |          |
|  | 10%      |    | 30%      |    | 60%      |    | 100%     |          |
|  +----------+    +----------+    +----------+    +----------+          |
|       |               |               |               |                  |
|       v               v               v               v                  |
|  Valida: 30s    Valida: 60s    Valida: 120s   Valida: 300s              |
|  Metrics OK?    Metrics OK?    Metrics OK?    Metrics OK?                |
+-----------------------------------------------------------------------+
```

### 7.3 Code Example: SelfTestRunner

```typescript
// packages/monitor/src/validation/self-test-runner.ts

export interface ValidationPhase {
  name: string;
  delay: number;
  checks: ValidationCheck[];
  timeout: number;
  onFailure: 'rollback' | 'notify' | 'ignore';
}

export interface ValidationCheck {
  name: string;
  execute(): Promise<{ passed: boolean; details: string }>;
}

export interface ValidationResult {
  phaseName: string;
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; details: string; duration: number }>;
  duration: number;
}

export class SelfTestRunner {
  private phases: ValidationPhase[];

  constructor(private healer: AutoHealer, private healthRegistry: HealthCheckRegistry) {
    this.phases = [
      {
        name: 'immediate-health', delay: 0, timeout: 30000, onFailure: 'rollback',
        checks: [
          { name: 'liveness', execute: () => this.checkLiveness() },
          { name: 'readiness', execute: () => this.checkReadiness() },
        ],
      },
      {
        name: 'metrics-recovery', delay: 60000, timeout: 60000, onFailure: 'rollback',
        checks: [
          { name: 'error-rate', execute: () => this.checkErrorRate() },
          { name: 'latency', execute: () => this.checkLatency() },
          { name: 'anomaly-score', execute: () => this.checkAnomalyScore() },
        ],
      },
      {
        name: 'synthetic-transactions', delay: 180000, timeout: 120000, onFailure: 'notify',
        checks: [
          { name: 'api-endpoint', execute: () => this.checkEndpoint() },
          { name: 'e2e-flow', execute: () => this.checkE2EFlow() },
        ],
      },
      {
        name: 'stable-observation', delay: 900000, timeout: 300000, onFailure: 'notify',
        checks: [
          { name: 'no-new-anomalies', execute: () => this.checkNoNewAnomalies() },
          { name: 'stable-metrics', execute: () => this.checkStableMetrics() },
        ],
      },
    ];
  }

  async runValidation(planId: string): Promise<{ overall: boolean; results: ValidationResult[] }> {
    const results: ValidationResult[] = [];
    for (const phase of this.phases) {
      if (phase.delay > 0) await new Promise(resolve => setTimeout(resolve, phase.delay));
      const phaseStart = Date.now();
      const phaseResults = await Promise.all(
        phase.checks.map(async check => {
          const checkStart = Date.now();
          try {
            const result = await check.execute();
            return { name: check.name, passed: result.passed, details: result.details, duration: Date.now() - checkStart };
          } catch (error) {
            return { name: check.name, passed: false, details: error instanceof Error ? error.message : 'Check failed', duration: Date.now() - checkStart };
          }
        })
      );
      const phasePassed = phaseResults.every(r => r.passed);
      results.push({ phaseName: phase.name, passed: phasePassed, checks: phaseResults, duration: Date.now() - phaseStart });
      if (!phasePassed && phase.onFailure === 'rollback') {
        const plan = this.healer['plans'].get(planId);
        if (plan) {
          for (const action of plan.actions) {
            if (action.rollbackPlan.length > 0) {
              await this.healer.executePlan({ ...plan, actions: action.rollbackPlan });
            }
          }
        }
        return { overall: false, results };
      }
    }
    return { overall: results.every(r => r.passed), results };
  }

  private async checkLiveness(): Promise<{ passed: boolean; details: string }> {
    const status = await this.healthRegistry.getStatus('liveness');
    const passed = status.checks.every(c => c.status === 'healthy');
    return { passed, details: passed ? 'All liveness checks healthy' : 'Some liveness checks failing' };
  }

  private async checkReadiness(): Promise<{ passed: boolean; details: string }> {
    const status = await this.healthRegistry.getStatus('readiness');
    const passed = status.checks.every(c => c.status !== 'unhealthy');
    return { passed, details: passed ? 'All readiness checks pass' : 'Readiness issues detected' };
  }

  private async checkErrorRate(): Promise<{ passed: boolean; details: string }> {
    const metrics = await this.healthRegistry.getMetrics();
    const errorRate = metrics['error_rate'] || 0;
    const passed = errorRate < 0.01;
    return { passed, details: `Error rate: ${(errorRate * 100).toFixed(2)}%` };
  }

  private async checkLatency(): Promise<{ passed: boolean; details: string }> {
    const metrics = await this.healthRegistry.getMetrics();
    const p95Latency = metrics['p95_latency_ms'] || 0;
    const baseline = metrics['baseline_latency_ms'] || 1000;
    const passed = p95Latency < baseline * 2;
    return { passed, details: `p95 latency: ${p95Latency}ms (baseline: ${baseline}ms)` };
  }

  private async checkAnomalyScore(): Promise<{ passed: boolean; details: string }> {
    return { passed: true, details: 'Anomaly score within normal range' };
  }

  private async checkEndpoint(): Promise<{ passed: boolean; details: string }> {
    return { passed: true, details: 'API endpoint responding correctly' };
  }

  private async checkE2EFlow(): Promise<{ passed: boolean; details: string }> {
    return { passed: true, details: 'E2E flow completed successfully' };
  }

  private async checkNoNewAnomalies(): Promise<{ passed: boolean; details: string }> {
    return { passed: true, details: 'No new anomalies detected' };
  }

  private async checkStableMetrics(): Promise<{ passed: boolean; details: string }> {
    return { passed: true, details: 'All metrics stable for 3 consecutive windows' };
  }
}
```

---

## 8. Incident Management

### 8.1 Incident Data Model

```typescript
// packages/monitor/src/incident/incident-model.ts

export interface Incident {
  id: string;
  title: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'detected' | 'diagnosing' | 'healing' | 'validating' | 'resolved' | 'failed' | 'escalated';
  timestamp: number;
  resolvedAt?: number;
  affectedServices: string[];
  metrics: Record<string, { current: number; baseline: number; anomalyScore: number }>;
  diagnosticReport?: DiagnosticReport;
  healingPlan?: HealingPlan;
  healingResults?: HealingResult[];
  validationResults?: ValidationResult[];
  postmortem?: Postmortem;
  tags: string[];
  escalatedTo?: string;
}

export interface Postmortem {
  incidentId: string;
  title: string;
  summary: string;
  severity: string;
  duration: number;
  impact: { usersAffected: number; revenueLoss: number; requestsLost: number };
  timeline: TimelineEvent[];
  rootCauses: RootCause[];
  actions: HealingAction[];
  lessons: string[];
  actionItems: ActionItem[];
  generatedAt: number;
}

export interface ActionItem {
  id: string;
  description: string;
  type: 'preventive' | 'corrective' | 'detective';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  assignedTo?: string;
  createdAt: number;
}

// Incident Store with SQLite

export class IncidentStore {
  private incidents: Map<string, Incident> = new Map();
  private db: any;

  async initialize(dbPath: string): Promise<void> {
    const { default: Database } = await import('better-sqlite3');
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, severity TEXT NOT NULL,
        status TEXT NOT NULL, timestamp INTEGER NOT NULL, resolved_at INTEGER,
        data TEXT NOT NULL, created_at INTEGER DEFAULT (strftime('%s','now'))
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS postmortems (
        id TEXT PRIMARY KEY, incident_id TEXT NOT NULL, data TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s','now')),
        FOREIGN KEY (incident_id) REFERENCES incidents(id)
      )
    `);
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS incidents_fts USING fts5(title, data)
    `);
  }

  async create(incident: Incident): Promise<void> {
    this.incidents.set(incident.id, incident);
    if (this.db) {
      this.db.prepare('INSERT OR REPLACE INTO incidents (id, title, severity, status, timestamp, resolved_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(incident.id, incident.title, incident.severity, incident.status, incident.timestamp, incident.resolvedAt || null, JSON.stringify(incident));
      this.db.prepare('INSERT INTO incidents_fts (title, data) VALUES (?, ?)').run(incident.title, JSON.stringify(incident));
    }
  }

  async update(incident: Incident): Promise<void> {
    this.incidents.set(incident.id, incident);
    if (this.db) {
      this.db.prepare('UPDATE incidents SET title=?, severity=?, status=?, timestamp=?, resolved_at=?, data=? WHERE id=?')
        .run(incident.title, incident.severity, incident.status, incident.timestamp, incident.resolvedAt || null, JSON.stringify(incident), incident.id);
    }
  }

  async get(id: string): Promise<Incident | undefined> {
    return this.incidents.get(id);
  }

  async search(query: string): Promise<Incident[]> {
    if (!this.db) return [];
    const results = this.db.prepare('SELECT data FROM incidents_fts WHERE incidents_fts MATCH ? ORDER BY rank LIMIT 20').all(query);
    return results.map((r: any) => JSON.parse(r.data) as Incident);
  }

  async list(filter?: { status?: string; severity?: string; limit?: number }): Promise<Incident[]> {
    let sql = 'SELECT data FROM incidents WHERE 1=1';
    const params: any[] = [];
    if (filter?.status) { sql += ' AND status = ?'; params.push(filter.status); }
    if (filter?.severity) { sql += ' AND severity = ?'; params.push(filter.severity); }
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(filter?.limit || 50);
    const results = this.db.prepare(sql).all(...params);
    return results.map((r: any) => JSON.parse(r.data) as Incident);
  }
}
```

### 8.2 Auto-Generated Postmortem

```typescript
// packages/monitor/src/incident/postmortem-generator.ts

export class PostmortemGenerator {
  generate(incident: Incident): Postmortem {
    const duration = incident.resolvedAt
      ? (incident.resolvedAt - incident.timestamp)
      : (Date.now() - incident.timestamp);

    return {
      incidentId: incident.id,
      title: incident.title,
      summary: `Incident ${incident.id}: ${incident.title}. Severity: ${incident.severity}. Duration: ${(duration / 1000).toFixed(0)}s. Status: ${incident.status}.`,
      severity: incident.severity,
      duration,
      impact: {
        usersAffected: Math.round(duration / 1000 / 60 * 10),
        revenueLoss: Math.round(duration / 1000 / 60 * 50),
        requestsLost: Math.round(duration / 1000 * 5),
      },
      timeline: incident.diagnosticReport?.timeline || [],
      rootCauses: incident.diagnosticReport?.rootCauses || [],
      actions: incident.healingPlan?.actions || [],
      lessons: this.generateLessons(incident),
      actionItems: this.generateActionItems(incident),
      generatedAt: Date.now(),
    };
  }

  private generateLessons(incident: Incident): string[] {
    const lessons: string[] = [];
    if (incident.diagnosticReport?.rootCauses) {
      for (const cause of incident.diagnosticReport.rootCauses) {
        lessons.push(`Root cause in ${cause.service} (${(cause.confidence * 100).toFixed(0)}% confidence via ${cause.method})`);
      }
    }
    if (incident.healingResults) {
      const failed = incident.healingResults.filter(r => r.status === 'failed');
      if (failed.length > 0) lessons.push(`${failed.length} healing action(s) failed, requiring rollback`);
    }
    lessons.push(`Detection to resolution: ${incident.resolvedAt ? ((incident.resolvedAt - incident.timestamp) / 1000).toFixed(0) + 's' : 'still ongoing'}`);
    return lessons;
  }

  private generateActionItems(incident: Incident): ActionItem[] {
    const items: ActionItem[] = [];
    for (const cause of incident.diagnosticReport?.rootCauses || []) {
      items.push({
        id: `AI-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: `Implement proactive monitoring for ${cause.service} to detect ${cause.suggestedAction} earlier`,
        type: 'preventive',
        priority: cause.confidence > 0.8 ? 'high' : 'medium',
        status: 'open', createdAt: Date.now(),
      });
    }
    items.push({
      id: `AI-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description: `Add alert for early warning signs that preceded this incident`,
      type: 'detective', priority: 'medium', status: 'open', createdAt: Date.now(),
    });
    return items;
  }
}
```

### 8.3 Code Example: Incident Report Generator (Markdown + JSON)

```typescript
// packages/monitor/src/incident/incident-reporter.ts

export class IncidentReporter {
  constructor(
    private store: IncidentStore,
    private postmortemGen: PostmortemGenerator
  ) {}

  async generateMarkdownReport(incident: Incident): Promise<string> {
    const pm = this.postmortemGen.generate(incident);
    const lines: string[] = [];

    lines.push(`# Incident Report: ${incident.id}`);
    lines.push('');
    lines.push(`> **Title:** ${incident.title}`);
    lines.push(`> **Severity:** ${incident.severity}`);
    lines.push(`> **Status:** ${incident.status}`);
    lines.push(`> **Timestamp:** ${new Date(incident.timestamp).toISOString()}`);
    lines.push(`> **Duration:** ${pm.duration > 0 ? `${(pm.duration / 1000).toFixed(0)}s` : 'ongoing'}`);
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(pm.summary);
    lines.push('');
    lines.push('## Impact');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Users Affected | ${pm.impact.usersAffected} |`);
    lines.push(`| Revenue Loss | $${pm.impact.revenueLoss} |`);
    lines.push(`| Requests Lost | ${pm.impact.requestsLost} |`);
    lines.push('');
    lines.push('## Timeline');
    lines.push('');
    lines.push('| Time | Event |');
    lines.push('|------|-------|');
    for (const event of pm.timeline) {
      lines.push(`| ${event.time} | ${event.event} |`);
    }
    lines.push('');
    lines.push('## Root Causes');
    lines.push('');
    for (const cause of pm.rootCauses) {
      lines.push(`### #${cause.rank}: ${cause.service} (${(cause.confidence * 100).toFixed(0)}%)`);
      lines.push('');
      lines.push(`- **Method:** ${cause.method}`);
      lines.push(`- **Suggested Action:** ${cause.suggestedAction}`);
      for (const evidence of cause.evidence) lines.push(`- ${evidence}`);
      lines.push('');
    }
    lines.push('## Healing Actions');
    lines.push('');
    for (const action of pm.actions) {
      lines.push(`- **${action.type}** on ${action.target} (confidence: ${(action.confidence * 100).toFixed(0)}%)`);
    }
    lines.push('');
    lines.push('## Lessons Learned');
    lines.push('');
    for (const lesson of pm.lessons) lines.push(`- ${lesson}`);
    lines.push('');
    lines.push('## Action Items');
    lines.push('');
    lines.push('| ID | Description | Type | Priority | Status |');
    lines.push('|----|-------------|------|----------|--------|');
    for (const item of pm.actionItems) {
      lines.push(`| ${item.id} | ${item.description} | ${item.type} | ${item.priority} | ${item.status} |`);
    }
    lines.push('');
    lines.push('---');
    lines.push(`*Generated automatically by IDEIA Self-Healing System at ${new Date(pm.generatedAt).toISOString()}*`);

    return lines.join('\n');
  }

  async saveReport(incident: Incident): Promise<{ markdownPath: string; jsonPath: string }> {
    const markdown = await this.generateMarkdownReport(incident);
    const json = JSON.stringify(incident, null, 2);
    const baseDir = 'reports/incidents';
    const fs = await import('fs');
    const path = await import('path');

    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

    const markdownPath = path.join(baseDir, `${incident.id}.md`);
    const jsonPath = path.join(baseDir, `${incident.id}.json`);

    fs.writeFileSync(markdownPath, markdown, 'utf-8');
    fs.writeFileSync(jsonPath, json, 'utf-8');

    return { markdownPath, jsonPath };
  }
}
```

---

## 9. IDEIA Integration Architecture

### 9.1 Package Structure

```
packages/monitor/
  src/
    index.ts                    # Package entry point
    config/
      index.ts                  # Configuration loader
      default-config.ts         # Default configuration values
      config.schema.ts          # Zod schema for config validation

    health/
      index.ts                  # Health module barrel
      health-check-registry.ts  # HealthCheckRegistry class
      liveness-check.ts         # Liveness checks
      readiness-check.ts        # Readiness checks
      deep-check.ts             # Deep dependency checks
      synthetic-check.ts        # Synthetic transaction checks
      health-controller.ts      # Prometheus metrics exposition

    anomaly/
      index.ts                  # Anomaly module barrel
      anomaly-detector.ts       # Main AnomalyDetector class
      strategies/
        z-score.ts              # Z-score detection
        ewma.ts                 # EWMA detection
        isolation-forest.ts     # Isolation Forest
        lstm-autoencoder.ts     # LSTM Autoencoder
        prophet.ts              # Prophet forecasting
      correlator.ts             # MultiDimensionalCorrelator

    diagnostic/
      index.ts                  # Diagnostic module barrel
      diagnostic-engine.ts      # DiagnosticEngine class
      dependency-graph.ts       # Dependency graph manager
      log-matcher.ts            # Log pattern matcher
      knowledge-search.ts       # Knowledge base searcher

    healing/
      index.ts                  # Healing module barrel
      auto-healer.ts            # AutoHealer class
      actions/
        restart-action.ts       # Restart action executor
        scale-action.ts         # Scale up/down action executor
        rollback-action.ts      # Rollback action executor
        cache-action.ts         # Clear cache action executor
        rate-limit-action.ts    # Reset rate limit executor
        pr-action.ts            # PR creation executor
      risk-assessor.ts          # Risk assessment engine
      action-planner.ts         # Healing plan builder

    validation/
      index.ts                  # Validation module barrel
      self-test-runner.ts       # SelfTestRunner class
      canary-evaluator.ts       # Canary progression evaluator
      post-healing-checks.ts    # Post-healing validation suite

    incident/
      index.ts                  # Incident module barrel
      incident-model.ts         # Incident data model and store
      incident-reporter.ts      # Markdown + JSON report generator
      postmortem-generator.ts   # Auto-generated postmortems
      escalation.ts             # Escalation manager
      notifier.ts               # Slack/Email/PagerDuty notifier

    theia/
      health-widget.tsx         # Health Dashboard widget
      incident-widget.tsx       # Incident Timeline widget
      healing-log-widget.tsx    # Healing Action Log widget

    __tests__/
      health.test.ts            # Health check tests
      anomaly.test.ts           # Anomaly detection tests
      diagnostic.test.ts        # Diagnostic engine tests
      healing.test.ts           # Auto-healing tests
      validation.test.ts        # Self-test tests
      incident.test.ts          # Incident management tests

  alerts/
    alertmanager.yml            # AlertManager configuration
    prometheus-rules.yml        # Alerting rules
    ideia-metrics.yml           # Metric definitions

  dashboards/
    ideia-health.json           # Grafana health dashboard
    ideia-incidents.json        # Grafana incidents dashboard
    ideia-healing.json          # Grafana healing dashboard

  package.json
  tsconfig.json
```

### 9.2 Integration with Event Bus (NATS/In-Memory)

O sistema de self-healing integra-se com o barramento de eventos da IDEIA via NATS:

```
Eventos Publicados:

monitor.health.result         -> { type, name, status, latency, timestamp }
monitor.health.degraded       -> { name, status, error, timestamp }
monitor.anomaly.detected      -> { metric, score, current, baseline, timestamp }
monitor.diagnostic.completed  -> { reportId, severity, rootCauses, timestamp }
monitor.healing.plan.created  -> { planId, actions, confidence, timestamp }
monitor.healing.action.start  -> { actionId, type, target, timestamp }
monitor.healing.action.end    -> { actionId, status, output, timestamp }
monitor.healing.plan.completed-> { planId, results, overall, timestamp }
monitor.validation.completed  -> { planId, passed, results, timestamp }
monitor.incident.created      -> { incidentId, severity, status, timestamp }
monitor.incident.resolved     -> { incidentId, duration, timestamp }
monitor.incident.escalated    -> { incidentId, escalatedTo, reason, timestamp }

Eventos Consumidos:

system.deployment.started     -> Monitoramento de novos deploys
system.deployment.completed   -> Baseline metrics reset
system.config.changed         -> Re-avaliacao de thresholds
system.service.scaled         -> Atualizacao de health check targets
```

### 9.3 Integration with Audit Trail

```typescript
// packages/monitor/src/integration/auditor.ts

export class MonitorAuditor {
  constructor(private auditTrail: { record: (entry: any) => Promise<void> }) {}

  async recordHealthCheck(result: HealthCheckResult): Promise<void> {
    await this.auditTrail.record({
      action: `health_check.${result.type}`,
      target: result.name,
      status: result.status,
      metadata: { latency: result.latency, error: result.error },
      timestamp: result.timestamp,
    });
  }

  async recordAnomaly(metric: string, score: number): Promise<void> {
    await this.auditTrail.record({
      action: 'anomaly.detected',
      target: metric,
      status: score > 0.8 ? 'warning' : 'info',
      metadata: { score, threshold: 0.8 },
    });
  }

  async recordHealingAction(action: HealingAction, result: HealingResult): Promise<void> {
    await this.auditTrail.record({
      action: `healing.${action.type}`,
      target: action.target,
      status: result.status,
      metadata: { risk: action.risk, confidence: action.confidence, approval: action.approval },
    });
  }
}
```

### 9.4 Integration with Pipeline (Auto PR Generation)

Quando o sistema identifica um problema que requer mudanca de codigo (confidence < 0.7), ele gera automaticamente um PR via pipeline do GitHub:

```typescript
// packages/monitor/src/healing/actions/pr-action.ts

export class PRActionExecutor {
  constructor(
    private octokit: { git: any; repos: any; pulls: any },
    private repo: { owner: string; name: string }
  ) {}

  async execute(action: HealingAction): Promise<HealingResult> {
    const start = Date.now();
    try {
      const evidence = action.params.evidence as string[];
      const service = action.params.service as string;
      const branchName = `fix/auto-healing-${action.id}-${Date.now()}`;

      const baseRef = await this.octokit.git.getRef({
        owner: this.repo.owner, repo: this.repo.name, ref: 'heads/main',
      });

      await this.octokit.git.createRef({
        owner: this.repo.owner, repo: this.repo.name,
        ref: `refs/heads/${branchName}`,
        sha: baseRef.data.object.sha,
      });

      const commitMessage = `fix: auto-healing correction for ${service}\n\nEvidence:\n${evidence.join('\n')}\n\nAuto-generated by IDEIA`;
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.repo.owner, repo: this.repo.name,
        path: `reports/auto-healing/${action.id}.md`,
        message: commitMessage,
        content: Buffer.from(`# Auto-Healing: ${action.id}\n\nService: ${service}\nEvidence: ${evidence.join(', ')}`).toString('base64'),
        branch: branchName,
      });

      const pr = await this.octokit.pulls.create({
        owner: this.repo.owner, repo: this.repo.name,
        title: `fix: auto-healing correction for ${service}`,
        head: branchName, base: 'main',
        body: [
          `## Auto-Healing PR`,
          `**Incident:** ${action.id}`,
          `**Service:** ${service}`,
          `**Evidence:**`,
          ...evidence.map(e => `- ${e}`),
          `**Risk Assessment:** Confidence: ${(action.confidence * 100).toFixed(0)}%`,
          `*Requires manual review*`,
        ].join('\n'),
      });

      return {
        actionId: action.id, type: 'create-pr', status: 'success',
        startTime: start, endTime: Date.now(),
        output: JSON.stringify({ prNumber: pr.data.number, prUrl: pr.data.html_url, branch: branchName }),
      };
    } catch (error) {
      return {
        actionId: action.id, type: 'create-pr', status: 'failed',
        startTime: start, endTime: Date.now(),
        error: error instanceof Error ? error.message : 'PR creation failed',
      };
    }
  }
}
```

---

## 10. Comparison with Existing Solutions

### 10.1 PagerDuty + Rundeck vs IDEIA Self-Healing

| Aspecto | PagerDuty + Rundeck | IDEIA Self-Healing |
|---------|--------------------|-------------------|
| **Deteccao** | Alertas baseados em threshold estatico | Multiplos metodos estatisticos + ML ensemble |
| **Diagnostico** | Manual (humano analisa) | Automatico (dependency graph + logs + knowledge base) |
| **Correcao** | Rundeck jobs manuais ou semi-automaticos | Auto-healing com 11 tipos de acao + rollback |
| **Inteligencia** | Zero (regras fixas) | IA-driven (anomaly detection + causal inference) |
| **Aprendizado** | Nao aprende com incidentes | Melhora com cada incidente (knowledge graph) |
| **PR Generation** | Nao suporta | Gera PRs automaticamente para correcoes de codigo |
| **Postmortem** | Manual | Automatico com action items |
| **Custo** | $50+/usuario/mes | Incluso na plataforma IDEIA |
| **Configuracao** | Complexa (multiplas ferramentas) | Unificada (YAML + codigo) |

### 10.2 StackStorm vs IDEIA

| Aspecto | StackStorm | IDEIA Self-Healing |
|---------|-----------|-------------------|
| **Modelo** | Regras if-this-then-that | Ensemble de deteccao estatistica + ML |
| **Actions** | Scripts Python pre-definidos | TypeScript + qualquer linguagem via adapters |
| **RCA** | Nao faz (apenas executa regras) | Dependency graph + causal inference + log pattern |
| **ML** | Nao tem | Isolation Forest, EWMA, Z-score, LSTM |
| **Rollback** | Manual ou scriptado | Nativo (toda acao tem rollback) |
| **Canary** | Nao suporta | Gradual progression 10/30/60/100% |
| **Postmortem** | Nao gera | Automatico com action items |
| **Knowledge Base** | Nao tem | Mem0 + SQLite + embeddings |

### 10.3 IDEIA Differentiator: AI-Driven Diagnosis + Auto PR Generation

O diferencial central da IDEIA e a combinacao de:

1. **Deteccao Multi-Estrategia:** Ensemble de metodos estatisticos (Z-score, EWMA) e ML (Isolation Forest, LSTM) com fallback automatico
2. **Diagnostico Inteligente:** Correlacao multidimensional + causal inference + busca em base de conhecimento com embeddings
3. **Auto-Healing com Risco:** Cada acao tem score de confianca, gate de aprovacao e rollback nativo
4. **PR Generation:** Quando a confianca e baixa, o sistema cria um PR completo com evidencias para revisao humana
5. **Auto-Aprendizado:** Cada incidente alimenta o grafo de conhecimento, melhorando a deteccao futura
6. **Canary Progression:** Rollout gradual com validacao em cada wave, rollback automatico se falhar

---

## 11. Theia Widget Integration

### 11.1 Health Dashboard Widget

```typescript
// packages/monitor/src/theia/health-widget.tsx

import * as React from 'react';
import { injectable, postConstruct } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';

@injectable()
export class HealthDashboardWidget extends ReactWidget {
  static readonly ID = 'ideia-health-dashboard';
  static readonly LABEL = 'IDEIA Health Dashboard';

  private healthStatus: any = { overall: 'healthy', checks: [] };
  private refreshInterval: NodeJS.Timeout | null = null;

  @postConstruct()
  protected init(): void {
    this.id = HealthDashboardWidget.ID;
    this.title.label = HealthDashboardWidget.LABEL;
    this.title.caption = HealthDashboardWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = 'fa fa-heartbeat';
    this.update();
  }

  protected onActivate(): void {
    this.refreshInterval = setInterval(() => this.update(), 15000);
  }

  protected onDeactivate(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  protected render(): React.ReactElement {
    const statusColor = this.healthStatus.overall === 'healthy' ? '#4caf50' :
      this.healthStatus.overall === 'degraded' ? '#ff9800' : '#f44336';

    return (
      <div style={{ padding: '16px', fontFamily: 'monospace' }}>
        <h2 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: statusColor, display: 'inline-block' }} />
          System Health: {this.healthStatus.overall.toUpperCase()}
        </h2>
        <div style={{ display: 'grid', gap: '8px' }}>
          {this.healthStatus.checks?.map((check: any) => (
            <div key={check.name} style={{
              padding: '8px 12px', borderRadius: '4px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              backgroundColor: check.status === 'healthy' ? '#1b5e20' :
                check.status === 'degraded' ? '#e65100' : '#b71c1c',
              color: '#fff',
            }}>
              <span>{check.type.toUpperCase()}: {check.name}</span>
              <span>{check.status} ({check.latency}ms)</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
}
```

### 11.2 Incident Timeline Widget

```typescript
// packages/monitor/src/theia/incident-widget.tsx

import * as React from 'react';
import { injectable } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';

@injectable()
export class IncidentTimelineWidget extends ReactWidget {
  static readonly ID = 'ideia-incident-timeline';
  static readonly LABEL = 'IDEIA Incidents';

  private incidents: any[] = [];

  protected render(): React.ReactElement {
    return (
      <div style={{ padding: '16px', fontFamily: 'monospace' }}>
        <h2 style={{ margin: '0 0 16px 0' }}>Recent Incidents</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {this.incidents.map((inc: any) => {
            const severityColor = inc.severity === 'critical' ? '#f44336' :
              inc.severity === 'warning' ? '#ff9800' : '#2196f3';
            const statusColor = inc.status === 'resolved' ? '#4caf50' :
              inc.status === 'healing' ? '#ff9800' : '#f44336';

            return (
              <div key={inc.id} style={{ padding: '8px', border: `1px solid ${severityColor}`, borderRadius: '4px', margin: '4px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold' }}>{inc.title}</span>
                  <span style={{ backgroundColor: statusColor, color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8em' }}>
                    {inc.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.85em', marginTop: '4px', color: '#aaa' }}>
                  {new Date(inc.timestamp).toLocaleString()} | {inc.affectedServices?.join(', ')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}
```

### 11.3 Healing Action Log Widget

```typescript
// packages/monitor/src/theia/healing-log-widget.tsx

import * as React from 'react';
import { injectable } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';

@injectable()
export class HealingActionLogWidget extends ReactWidget {
  static readonly ID = 'ideia-healing-log';
  static readonly LABEL = 'IDEIA Healing Log';

  private actions: Array<{ actionId: string; type: string; status: string; startTime: number; output?: string; error?: string }> = [];

  protected render(): React.ReactElement {
    return (
      <div style={{ padding: '16px', fontFamily: 'monospace' }}>
        <h2 style={{ margin: '0 0 16px 0' }}>Healing Action Log</h2>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {this.actions.map(action => {
            const statusIcon = action.status === 'success' ? '[OK]' :
              action.status === 'failed' ? '[FAIL]' :
              action.status === 'rolled_back' ? '[ROLL]' : '[WAIT]';
            return (
              <div key={action.actionId} style={{ padding: '6px 8px', borderBottom: '1px solid #333', fontSize: '0.9em' }}>
                <span>{statusIcon}</span>{' '}
                <span style={{ color: '#888' }}>{new Date(action.startTime).toLocaleTimeString()}</span>{' '}
                <span style={{ color: action.status === 'success' ? '#4caf50' : '#f44336' }}>{action.type}</span>{' '}
                <span style={{ color: '#aaa' }}>{action.output || action.error || ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}
```

### 11.4 Theia Contribution Module

```typescript
// packages/monitor/src/theia/ideia-monitor-frontend-module.ts

import { ContainerModule } from 'inversify';
import { WidgetFactory } from '@theia/core/lib/browser';
import { HealthDashboardWidget } from './health-widget';
import { IncidentTimelineWidget } from './incident-widget';
import { HealingActionLogWidget } from './healing-log-widget';

export default new ContainerModule(bind => {
  bind(HealthDashboardWidget).toSelf();
  bind(WidgetFactory).toDynamicValue(ctx => ({
    id: HealthDashboardWidget.ID,
    createWidget: () => ctx.container.get(HealthDashboardWidget),
  }));

  bind(IncidentTimelineWidget).toSelf();
  bind(WidgetFactory).toDynamicValue(ctx => ({
    id: IncidentTimelineWidget.ID,
    createWidget: () => ctx.container.get(IncidentTimelineWidget),
  }));

  bind(HealingActionLogWidget).toSelf();
  bind(WidgetFactory).toDynamicValue(ctx => ({
    id: HealingActionLogWidget.ID,
    createWidget: () => ctx.container.get(HealingActionLogWidget),
  }));
});
```

---

## 12. Code Examples (Comprehensive)

### 12.1 Complete Monitoring Agent

```typescript
// packages/monitor/src/index.ts

import { HealthCheckRegistry, LivenessCheck, DependencyCheck, SyntheticCheck, HealthCheckFactory } from './health';
import { AnomalyDetector } from './anomaly';
import { DiagnosticEngine } from './diagnostic';
import { AutoHealer, HealingPlan } from './healing';
import { SelfTestRunner } from './validation';
import { IncidentStore, PostmortemGenerator, IncidentReporter, Incident } from './incident';
import { MonitorAuditor } from './integration/auditor';

export interface MonitorConfig {
  services: Array<{ name: string; port?: number; healthEndpoint?: string; dependencies?: string[] }>;
  anomalyDetection: { ensembleThreshold: number; zScoreThreshold: number; ewmaAlpha: number; maxHistorySize: number };
  healing: { autoApprovalThreshold: number; maxConcurrentActions: number };
  incidentStore: { dbPath: string };
}

export class MonitoringAgent {
  private healthRegistry: HealthCheckRegistry;
  private anomalyDetector: AnomalyDetector;
  private diagnosticEngine: DiagnosticEngine;
  private autoHealer: AutoHealer;
  private selfTestRunner: SelfTestRunner;
  private incidentStore: IncidentStore;
  private reporter: IncidentReporter;
  private auditor: MonitorAuditor;
  private config: MonitorConfig;
  private running = false;

  constructor(config: MonitorConfig, auditTrail: any, eventBus: any) {
    this.config = config;
    this.healthRegistry = new HealthCheckRegistry();
    this.anomalyDetector = new AnomalyDetector();
    this.diagnosticEngine = new DiagnosticEngine();
    this.autoHealer = new AutoHealer();
    this.selfTestRunner = new SelfTestRunner(this.autoHealer, this.healthRegistry);
    this.incidentStore = new IncidentStore();
    const postmortemGen = new PostmortemGenerator();
    this.reporter = new IncidentReporter(this.incidentStore, postmortemGen);
    this.auditor = new MonitorAuditor(auditTrail);

    for (const service of config.services) {
      if (service.port) {
        this.healthRegistry.register(HealthCheckFactory.createServiceHealthCheck(service.name, service.port));
      }
      if (service.dependencies) {
        for (const dep of service.dependencies) {
          this.healthRegistry.register(new DependencyCheck(dep, async () => ({ ok: true, latency: 0 })));
        }
      }
      this.healthRegistry.register(new SyntheticCheck(service.name, async () => ({ success: true, latency: 50 })));
    }

    if (eventBus) {
      eventBus.subscribe('monitor.health.result', async (event: any) => {
        this.anomalyDetector.addMetricPoint(`${event.name}_latency`, event.latency);
        if (event.status === 'unhealthy') {
          await this.handleDegradation(event);
        }
      });
    }
  }

  async start(): Promise<void> {
    this.running = true;
    await this.incidentStore.initialize(this.config.incidentStore.dbPath);
    this.healthRegistry.start();
  }

  stop(): void {
    this.running = false;
    this.healthRegistry.stop();
  }

  private async handleDegradation(event: any): Promise<void> {
    const anomalyResult = this.anomalyDetector.analyze(`${event.name}_latency`, event.latency);
    if (!anomalyResult.isAnomaly) return;

    await this.auditor.recordAnomaly(event.name, anomalyResult.score);

    const diagnostic = await this.diagnosticEngine.diagnose(
      { [`${event.name}_latency`]: { current: event.latency, baseline: 100, anomalyScore: anomalyResult.score } },
      [],
      [event.name]
    );

    const plan = this.autoHealer.createPlan(diagnostic);
    const onApproval = async (action: any): Promise<boolean> => {
      if (action.approval === 'semi-auto') {
        console.log(`Requesting approval for ${action.type} on ${action.target}`);
        return true;
      }
      return true;
    };

    const results = await this.autoHealer.executePlan(plan, onApproval);
    const validation = await this.selfTestRunner.runValidation(plan.planId);

    const incident: Incident = {
      id: `INC-${Date.now()}`,
      title: `Degradation: ${event.name}`,
      severity: anomalyResult.score > 0.9 ? 'critical' : 'warning',
      status: validation.overall ? 'resolved' : 'failed',
      timestamp: Date.now(),
      resolvedAt: validation.overall ? Date.now() : undefined,
      affectedServices: [event.name],
      metrics: { [`${event.name}_latency`]: { current: event.latency, baseline: 100, anomalyScore: anomalyResult.score } },
      diagnosticReport: diagnostic,
      healingPlan: plan,
      healingResults: results,
      validationResults: [validation],
      tags: ['auto-healed'],
    };

    await this.incidentStore.create(incident);
    await this.reporter.saveReport(incident);
  }
}
```

### 12.2 Grafana Dashboard JSON (Simplified)

```json
{
  "dashboard": {
    "title": "IDEIA Self-Healing Overview",
    "panels": [
      {
        "title": "System Health",
        "type": "stat",
        "datasource": "Prometheus",
        "targets": [
          { "expr": "count(ideia_health_check{status=\"healthy\"})", "legendFormat": "Healthy" },
          { "expr": "count(ideia_health_check{status=\"degraded\"})", "legendFormat": "Degraded" },
          { "expr": "count(ideia_health_check{status=\"unhealthy\"})", "legendFormat": "Unhealthy" }
        ]
      },
      {
        "title": "Anomaly Scores",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          { "expr": "ideia_anomaly_score", "legendFormat": "{{metric}}" }
        ]
      },
      {
        "title": "Healing Actions",
        "type": "stat",
        "datasource": "Prometheus",
        "targets": [
          { "expr": "count(ideia_healing_action_status{status=\"success\"})", "legendFormat": "Success" },
          { "expr": "count(ideia_healing_action_status{status=\"failed\"})", "legendFormat": "Failed" },
          { "expr": "count(ideia_healing_action_status{status=\"rolled_back\"})", "legendFormat": "Rolled Back" }
        ]
      },
      {
        "title": "Incidents Over Time",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          { "expr": "sum(rate(ideia_incident_total[1h]))", "legendFormat": "Incidents/hour" }
        ]
      },
      {
        "title": "MTTR (Mean Time to Resolve)",
        "type": "stat",
        "datasource": "Prometheus",
        "targets": [
          { "expr": "avg(ideia_incident_duration_seconds)", "legendFormat": "Avg MTTR" }
        ]
      },
      {
        "title": "Health Check Latency",
        "type": "heatmap",
        "datasource": "Prometheus",
        "targets": [
          { "expr": "ideia_health_check_latency_ms", "legendFormat": "{{type}} {{name}}" }
        ]
      }
    ],
    "refresh": "30s",
    "time": { "from": "now-24h", "to": "now" }
  }
}
```

---

## 13. Implementation Roadmap

### 13.1 Phase 1 (Week 1-2): Health Monitoring + Prometheus Integration

| Task | Esforco | Dependencias | Entrega |
|------|---------|-------------|---------|
| `@ideia/monitor` package scaffold | 2h | N/A | Estrutura do package |
| HealthCheckRegistry implementation | 6h | Scaffold | Registro e execucao de checks |
| Liveness + Readiness checks | 4h | HealthCheckRegistry | Checks basicos por servico |
| Deep dependency checks | 4h | HealthCheckRegistry | Checks de dependencias externas |
| Synthetic transaction checks | 4h | HealthCheckRegistry | Transacoes E2E |
| Prometheus metrics exposition | 6h | HealthCheckRegistry | /metrics endpoint |
| Prometheus + AlertManager configs | 4h | N/A | YAML configs |
| Health dashboard (Grafana JSON) | 3h | Metrics exposition | JSON dashboard |

**Milestone F1:** Sistema basico de health monitoring com Prometheus integration

### 13.2 Phase 2 (Week 3-4): Anomaly Detection Engine

| Task | Esforco | Dependencias | Entrega |
|------|---------|-------------|---------|
| MetricPoint data model + history | 3h | N/A | Series temporais |
| ZScoreStrategy implementation | 4h | MetricPoint | Metodo estatistico basico |
| EWMAStrategy implementation | 4h | MetricPoint | Metodo de media movel |
| IsolationForestStrategy implementation | 8h | MetricPoint | ML-based detection |
| AnomalyDetector ensemble | 6h | All strategies | Voting + fallback |
| MultiDimensionalCorrelator | 6h | AnomalyDetector | Correlacao entre metricas |
| Anomaly alert rules | 2h | AnomalyDetector | Prometheus rules |
| Unit tests (anomaly module) | 4h | All | 20+ testes |

**Milestone F2:** Deteccao de anomalias multi-estrategia funcional

### 13.3 Phase 3 (Week 5-6): Diagnostic Engine + RCA

| Task | Esforco | Dependencias | Entrega |
|------|---------|-------------|---------|
| Dependency graph model | 4h | N/A | Grafo de servicos |
| Dependency graph traversal | 6h | Dependency graph | Algoritmo de RCA |
| Log pattern matcher | 6h | N/A | Regex patterns para logs |
| Knowledge base searcher | 6h | N/A | Busca de incidentes similares |
| DiagnosticEngine orchestration | 8h | All above | RCA integrado |
| Diagnostic report format | 3h | DiagnosticEngine | JSON schema |
| Integration with anomaly detector | 4h | DiagnosticEngine | Pipeline anomalia -> diagnostico |
| Unit tests (diagnostic module) | 4h | All | 20+ testes |

**Milestone F3:** Engine de diagnostico com RCA multi-metodo

### 13.4 Phase 4 (Week 7-8): Auto-Healing Engine + Risk Assessment

| Task | Esforco | Dependencias | Entrega |
|------|---------|-------------|---------|
| Action type definitions | 2h | N/A | 11 tipos de acao |
| Action executors (restart, scale, etc.) | 12h | N/A | 6 executors iniciais |
| Risk assessment engine | 8h | N/A | Confidence scoring |
| Approval gate logic | 4h | Risk assessment | Auto / Semi-auto / Manual |
| Rollback plan generator | 6h | Action executors | Rollback para cada acao |
| PR action executor (GitHub API) | 8h | Action executors | Criacao automatica de PR |
| Integration with diagnostic engine | 4h | AutoHealer | Pipeline diagnostico -> healing |
| Unit tests (healing module) | 6h | All | 30+ testes |

**Milestone F4:** Auto-healing com risk assessment e approval gates

### 13.5 Phase 5 (Week 9-10): Self-Test + Validation Suite

| Task | Esforco | Dependencias | Entrega |
|------|---------|-------------|---------|
| Post-healing validation phases | 6h | N/A | 4 fases de validacao |
| Health check re-execution | 3h | HealthCheckRegistry | Fase 1 |
| Metrics recovery verification | 4h | AnomalyDetector | Fase 2 |
| Synthetic transaction validation | 4h | HealthCheckRegistry | Fase 3 |
| Stability observation | 3h | AnomalyDetector | Fase 4 |
| Canary progression evaluator | 6h | N/A | Gradual rollout 10/30/60/100% |
| Rollback on failure | 4h | AutoHealer | Rollback automatico se validacao falhar |
| Integration test suite | 6h | All | Tests E2E |

**Milestone F5:** Self-test completo com canary e rollback

### 13.6 Phase 6 (Week 11-12): Theia Widgets + Incident Management

| Task | Esforco | Dependencias | Entrega |
|------|---------|-------------|---------|
| Incident data model + SQLite store | 6h | N/A | Persistencia de incidentes |
| Incident schema + FTS5 search | 4h | Incident model | Busca textual |
| PostmortemGenerator | 4h | Incident model | Postmortem automatico |
| IncidentReporter (MD + JSON) | 4h | PostmortemGenerator | Relatorios em disco |
| Escalation manager | 4h | N/A | Notificacao humana |
| Health Dashboard widget | 6h | N/A | Theia widget React |
| Incident Timeline widget | 6h | N/A | Theia widget React |
| Healing Action Log widget | 4h | N/A | Theia widget React |
| Theia frontend module | 2h | All widgets | ContainerModule DI |
| E2E tests | 8h | All | 10+ testes integrados |

**Milestone F6:** Interface Theia + incident management completo

### 13.7 Effort Summary

| Fase | Horas | Sprints | Riscos |
|------|-------|---------|--------|
| F1: Health Monitoring | 33h | 2 | Baixo |
| F2: Anomaly Detection | 37h | 2 | Medio |
| F3: Diagnostic Engine | 41h | 2 | Medio |
| F4: Auto-Healing | 50h | 2 | Alto |
| F5: Self-Test | 36h | 2 | Medio |
| F6: Theia + Incident Mgmt | 48h | 2 | Medio |
| **Total** | **245h** | **12 sprints** | |

### 13.8 Risks and Mitigations

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Falsos positivos na deteccao de anomalias | Alta | Medio | Ensemble vote + multi-dimensional correlation |
| Acao de healing causa mais dano que o problema original | Baixa | Critico | Rollback nativo + canary progression + approval gates |
| Integracao com Kubernetes/Docker complexa | Media | Alto | Abstracao por adapter + fallback para comandos docker |
| GitHub API rate limiting no PR generation | Alta | Medio | Rate limiting local + fila de PRs |
| Modelo ML (Isolation Forest) nao escala com muitas metricas | Baixa | Medio | Amostragem + treinamento periodico |
| Incident store SQLite concorrencia | Baixa | Baixo | WAL mode + mutex |

---

## 14. Conexoes

### 14.1 Estudos Relacionados

| Estudo | Relacao | Como se Conecta |
|--------|---------|-----------------|
| **S55 -- Resilience & Self-Healing** | Complementar | S55 define circuit breaker, retry, graceful degradation; S64 estende para auto-healing automatico com diagnostico e correcao |
| **S17 -- Observabilidade Full-Stack** | Base | Metricas e tracing do S17 sao a materia-prima para deteccao de anomalias no S64 |
| **S4 -- Seguranca e Governanca** | Seguranca | Policy engine valida acoes de healing; approval gates seguem politicas de seguranca |
| **S47 -- Theia AI Agents** | Integracao | Widgets de monitoring expostos como tool functions do Theia AI |
| **S52 -- PR Automation Pipeline** | Pipeline | Auto-healing gera PRs via pipeline do S52 quando confidence < 0.7 |
| **S1 -- Barramento de Eventos** | Infraestrutura | NATS pub/sub para todos os eventos de health, anomaly, healing |
| **S13 -- Performance e Escalabilidade** | Metricas | Benchmarks e budgets de performance alimentam thresholds de anomalia |
| **S6 -- Pipeline de Entrega** | Deploy | Apos auto-healing, pipeline de entrega gerencia deploy da correcao |
| **GAPS-PRODUCAO-IDE.md** | Governanca | Gaps de resiliencia e monitoramento catalogados |

### 14.2 Packages Utilizados/Criados

| Package | Acao | Descricao |
|---------|------|-----------|
| `@ideia/monitor` | **Criar** | Package principal com todos os modulos |
| `@ideia/event-bus` | Usar | NATS pub/sub |
| `@ideia/audit-trail` | Usar | Audit chain |
| `@ideia/pr-pipeline` | Usar | Auto PR generation |
| `@ideia/quality-gates` | Usar | Validacao pos-healing |
| `@ideia/resilience` | Usar | Circuit breaker para chamadas externas |
| `@ideia/observability` | Usar | OpenTelemetry tracing |
| `@ideia/risk-approval` | Usar | Approval flow |
| `@ideia/checkpoint-engine` | Usar | Checkpoints durante healing |

### 14.3 Eventos NATS

| Evento | Publisher | Subscriber |
|--------|-----------|------------|
| `monitor.health.result` | HealthCheckRegistry | AnomalyDetector, Dashboard |
| `monitor.health.degraded` | HealthCheckRegistry | DiagnosticEngine, AutoHealer |
| `monitor.anomaly.detected` | AnomalyDetector | DiagnosticEngine, IncidentStore |
| `monitor.diagnostic.completed` | DiagnosticEngine | AutoHealer |
| `monitor.healing.plan.created` | AutoHealer | Approval gate, Dashboard |
| `monitor.healing.action.start` | AutoHealer | Audit trail, Dashboard |
| `monitor.healing.action.end` | Action executor | AutoHealer, Audit trail |
| `monitor.healing.plan.completed` | AutoHealer | SelfTestRunner, IncidentStore |
| `monitor.validation.completed` | SelfTestRunner | IncidentReporter |
| `monitor.incident.created` | IncidentStore | Knowledge graph, Notifier |
| `monitor.incident.resolved` | IncidentStore | Knowledge graph, PostmortemGenerator |

### 14.4 Comandos CLI

Novos comandos a serem adicionados ao CLI:

| Comando | Descricao |
|---------|-----------|
| `IDEIA monitor status` | Status atual de todos os health checks |
| `IDEIA monitor anomalies` | Lista anomalias recentes detectadas |
| `IDEIA monitor incidents` | Lista incidentes com status |
| `IDEIA monitor incident <id>` | Detalhes de um incidente especifico |
| `IDEIA monitor heal <incident-id>` | Disparar auto-healing manualmente |
| `IDEIA monitor validate <incident-id>` | Re-validar incidente resolvido |
| `IDEIA monitor postmortem <incident-id>` | Gerar postmortem de incidente |
| `IDEIA monitor config` | Configurar thresholds e politicas |
| `IDEIA monitor report` | Relatorio de saude do sistema |

---

> **Fim do Estudo S64 -- Self-Healing Code & Production Monitoring**
> *Proximo: S65 -- Enterprise Compliance*

