# Estudo: Observabilidade Full-Stack para IDEIA

> **Data:** 2026-07-18
> **Propósito:** Definir estratégia completa de observabilidade para o ecossistema IDEIA — tracing distribuído, métricas, logs, LLM observability, agent observability, alerting e dashboards — usando OpenTelemetry como camada de instrumentação padrão.
> **Base:** ADR-009 (OpenTelemetry + LangFuse), código do observability-engine existente, matriz tecnológica, práticas estado-da-arte 2025-2026

---

## Sumário

1. [OpenTelemetry (OTel)](#1-opentelemetry-otel)
2. [Tracing Distribuído](#2-tracing-distribuído)
3. [Métricas](#3-métricas)
4. [Logging](#4-logging)
5. [LLM Observability](#5-llm-observability)
6. [Agent Observability](#6-agent-observability)
7. [Alerting](#7-alerting)
8. [Dashboards](#8-dashboards)
9. [Implementação no IDEIA](#9-implementação-no-ideia)

---

## 1. OpenTelemetry (OTel)

### 1.1 O que é OpenTelemetry

OpenTelemetry é o padrão CNCF para instrumentação de telemetria. Ele unifica a coleta de **traces**, **métricas** e **logs** em uma única API/SDK, permitindo exportar para qualquer backend compatível com OTLP (OpenTelemetry Protocol).

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Application / Service                             │
│                                                                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                      │
│  │   Tracer   │  │    Meter   │  │  Logger    │                      │
│  │ (Traces)   │  │ (Métricas) │  │  (Logs)    │                      │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘                      │
│         │               │               │                             │
│  ┌──────┴───────────────┴───────────────┴─────┐                       │
│  │         OTel SDK (Node.js)                   │                      │
│  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │                      │
│  └──────────────────────┬──────────────────────┘                      │
│                         │ OTLP (gRPC/HTTP)                            │
└─────────────────────────┼──────────────────────────────────────────────┘
                          │
                          ▼
                 ┌────────────────┐
                 │  OTel Collector │
                 │  (Receivers →   │
                 │   Processors →  │
                 │   Exporters)    │
                 └───────┬────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ LangFuse │  │Prometheus│  │   Loki   │
    │ (Traces  │  │(Metrics) │  │  (Logs)  │
    │  LLM)    │  │          │  │          │
    └──────────┘  └──────────┘  └──────────┘
```

### 1.2 OTel SDK para Node.js

**Setup no agent-runtime:**

```typescript
// packages/observability/src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';

// Auto-instrumentações
import '@opentelemetry/auto-instrumentations-node/register';

export function initializeTelemetry(serviceName: string, environment: string): NodeSDK {
  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
    'service.version': process.env.APP_VERSION || '0.0.0',
    'service.instance.id': process.env.HOSTNAME || 'unknown',
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
      }),
      exportIntervalMillis: 30_000, // 30s
    }),
    logExporter: new OTLPLogExporter({
      url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || 'http://otel-collector:4317',
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-grpc': { enabled: true },
        '@opentelemetry/instrumentation-nats': { enabled: true },
        '@opentelemetry/instrumentation-pino': { enabled: true },
        '@opentelemetry/instrumentation-dns': { enabled: true },
        '@opentelemetry/instrumentation-net': { enabled: true },
      }),
    ],
  });

  sdk.start();
  
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('OTel SDK desligado'))
      .catch(err => console.error('Erro ao desligar OTel:', err));
  });

  return sdk;
}
```

### 1.3 OTel Collector

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  memory_limiter:
    check_interval: 1s
    limit_mib: 500
  attributes:
    actions:
      - key: environment
        value: "${ENVIRONMENT}"
        action: upsert
      - key: datacenter
        value: "${DATACENTER}"
        action: upsert
  resourcedetection:
    detectors: [env, ec2, gcp, azure]
  filter:
    error_mode: ignore
    traces:
      span:
        - 'attributes["http.target"] == "/health"'
        - 'attributes["http.target"] == "/ready"'

exporters:
  otlp/langfuse:
    endpoint: "${LANGFUSE_OTLP_ENDPOINT}"
    headers:
      authorization: "Bearer ${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}"
  
  prometheus:
    endpoint: 0.0.0.0:8889
    namespace: ideia
  
  otlp/tempo:  # Alternativa para tracing geral
    endpoint: "${TEMPO_ENDPOINT}:4317"
  
  loki:
    endpoint: "${LOKI_ENDPOINT}:3100/loki/api/v1/push"
  
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, attributes, batch]
      exporters: [otlp/langfuse, otlp/tempo, debug]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, attributes, batch]
      exporters: [prometheus, debug]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, attributes, batch]
      exporters: [loki, debug]
```

### 1.4 Auto-instrumentação vs Manual

| Abordagem | Prós | Contras | Uso |
|-----------|------|---------|-----|
| **Auto-instrumentação** | Zero código, coverage amplo, manutenção zero | Falta contexto de negócio, sem customização | HTTP, gRPC, DB, filas |
| **Manual (API OTel)** | Contexto de negócio, spans semânticos, atributos custom | Código manual, manutenção evolutiva | Agentes, LLM calls, decisões, domínio |
| **Híbrido** | Balanceado | Requer disciplina | **Recomendado IDEIA** |

### 1.5 Instrumentação Manual para Agentes e LLM

```typescript
// packages/agent-runtime/src/instrumentation.ts
import { trace, Span, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('ideia.agent', '1.0.0');

export async function instrumentedAgentExecute<T>(
  agentId: string,
  taskId: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    'agent.execute',
    { attributes: { agentId, taskId } },
    async (span: Span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

// Uso
const result = await instrumentedAgentExecute(agentId, taskId, async (span) => {
  span.addEvent('agent.thinking', { thought: agent.currentThought });
  span.addEvent('agent.tool_call', { tool: 'code_editor', args: JSON.stringify(args) });
  span.setAttribute('tokens_used', tokens);
  span.setAttribute('llm_model', modelName);
  
  return agent.execute(task);
});
```

---

## 2. Tracing Distribuído

### 2.1 W3C Trace Context

A propagação de contexto segue o padrão W3C Trace Context (`traceparent` e `tracestate` headers):

```
HTTP Request/Response:
  traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
                 │  └──────────┬──────────┘ └──────────┬──────────┘ │
                 │             │                        │            │
                 │        trace_id                  span_id         │
              version                                                  │
                                                                  trace_flags
                                                                  (01=sampled)
```

**Propagação via NATS:**

```typescript
// packages/messaging/src/trace-propagation.ts
import { propagation, context } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { NatsHeaders } from './types';

const propagator = new W3CTraceContextPropagator();

export function injectTraceContext(headers: Record<string, string>): void {
  propagator.inject(context.active(), headers, {
    set: (carrier, key, value) => { carrier[key] = value; },
  });
}

export function extractTraceContext(headers: NatsHeaders): void {
  const extractedContext = propagator.extract(
    context.active(),
    headers,
    {
      get: (carrier, key) => carrier[key] as string,
      keys: (carrier) => Object.keys(carrier),
    }
  );
  context.with(extractedContext, () => {});
}

// Uso no NATS
natsConnection.publish('agent.task.execute', data, {
  headers: injectTraceContext({}),
});
```

### 2.2 Spans por Camada

```
THEIA Cloud                        AGENT Pool                         LLM Service
═══════════════                    ═══════════                        ═══════════

[theia.request]                    [agent.execute]                    [llm.generate]
  │                                  │                                  │
  ├─[theia.auth]                     ├─[agent.think]                    ├─[llm.tokenize]
  ├─[theia.workspace.load]           │   ├─[agent.plan]                 ├─[llm.inference]
  ├─[theia.edit]                     │   └─[agent.decide]              └─[llm.detokenize]
  └─[theia.save]                     │                                  │
                                    ├─[agent.tool]                     NATS
                                    │   ├─[tool.code_read]             ════════
                                    │   ├─[tool.code_write]           
                                    │   └─[tool.exec_command]          [nats.publish]
                                    │                                  [nats.subscribe]
                                    ├─[llm.call]                       [nats.request]
                                    │   └─[llm.generate]              
                                    │       ├─[llm.tokenize]           
                                    │       ├─[llm.inference]          
                                    │       └─[llm.detokenize]         
                                    │                                  
                                    └─[agent.memory.write]             
                                        └─[vector.search]              
```

### 2.3 LangFuse (LLM Tracing)

LangFuse (ADR-009) é o backend primário para tracing de LLM e agentes:

```typescript
// packages/llm-router/src/langfuse-tracing.ts
import Langfuse from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
});

export async function traceLLMCall<T>(
  params: {
    model: string;
    input: string;
    temperature?: number;
    maxTokens?: number;
    agentId: string;
    sessionId: string;
    tags?: string[];
  },
  fn: () => Promise<T>
): Promise<{ result: T; trace: LangfuseTrace }> {
  const trace = langfuse.trace({
    name: 'llm-call',
    sessionId: params.sessionId,
    userId: params.agentId,
    tags: params.tags,
    metadata: { model: params.model },
  });

  const generation = trace.generation({
    name: params.model,
    model: params.model,
    input: params.input,
    modelParameters: {
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    },
    startTime: new Date(),
  });

  try {
    const result = await fn();
    
    generation.end({
      output: typeof result === 'string' ? result : JSON.stringify(result),
      usage: { promptTokens: 150, completionTokens: 200, totalTokens: 350 },
    });

    return { result, trace };
  } catch (error) {
    generation.end({
      level: 'ERROR',
      statusMessage: (error as Error).message,
      endTime: new Date(),
    });
    throw error;
  }
}
```

### 2.4 Jaeger (Distributed Tracing OTel-native)

```yaml
# docker-compose.jaeger.yml
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    environment:
      COLLECTOR_OTLP_ENABLED: "true"
      SPAN_STORAGE_TYPE: "badger"  # File-based, simples
```

**Uso:** Jaeger serve como backend de tracing geral (não LLM-specific), complementando LangFuse. Para cenários de depuração de performance distribuída.

### 2.5 Tempo (Grafana Tracing)

```yaml
# docker-compose.tempo.yml
services:
  tempo:
    image: grafana/tempo:latest
    command: ["-config.file=/etc/tempo.yaml"]
    ports:
      - "3200:3200"   # Query
      - "4317:4317"   # OTLP gRPC
    volumes: [tempo-data:/tmp/tempo]
```

**Vantagem:** Integração nativa com Grafana (explore traces, trace view, service graph). Alternativa a Jaeger quando já usando Grafana stack.

### 2.6 Comparação de Backends de Trace

| Backend | Foco | Storage | Query | Custo | Self-hosted | IDEIA |
|---------|------|---------|-------|-------|-------------|-------|
| **LangFuse** | LLM + Agents | PostgreSQL | SQL + UI | Cloud free tiers | ✅ | **Primário** |
| **Jaeger** | Distributed | Badger/ES/Cassandra | UI + API | $0 | ✅ | **Secundário** |
| **Tempo** | Distributed | S3/GCS/Azure | Grafana native | $0 | ✅ | Alternativo |
| **Zipkin** | Distributed (legacy) | Cassandra/ES | UI simples | $0 | ✅ | Legado |
| **SigNoz** | Full-stack | ClickHouse | OTel-native | $0 (SaaS $19/mês) | ✅ | Alternativa |
| **Datadog APM** | Enterprise | SaaS | Excelente | $$$ | ❌ | Enterprise |
| **New Relic** | Enterprise | SaaS | Bom | $$$ | ❌ | Enterprise |

---

## 3. Métricas

### 3.1 Tipos de Métrica

OpenTelemetry define três tipos fundamentais de métrica:

```typescript
// Métricas no IDEIA
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('ideia.metrics', '1.0.0');

// 1. Counter — incrementa (eventos, erros, tasks)
const tasksCompleted = meter.createCounter('agent.tasks.completed', {
  description: 'Total de tarefas completadas',
});
tasksCompleted.add(1, { agentId: 'agent-1', taskType: 'code-gen' });

// 2. Histogram — distribuição (latência, tokens, custo)
const taskDuration = meter.createHistogram('agent.task.duration_ms', {
  description: 'Duração da tarefa em ms',
  unit: 'ms',
  boundaries: [100, 500, 1000, 5000, 10000, 30000, 60000],
});
taskDuration.record(2345, { agentId: 'agent-1' });

// 3. UpDownCounter — incrementa/decrementa (pool size, filas)
const activeAgents = meter.createUpDownCounter('agent.pool.active', {
  description: 'Número de agentes ativos no pool',
});
activeAgents.add(1); // um agente iniciou
activeAgents.add(-1); // um agente terminou
```

### 3.2 RED Metrics (Rate, Errors, Duration)

```
RED Metrics — ideal para serviços (microserviços, APIs):

┌───────────────────────────────────────────────────────┐
│                    RED Dashboard                       │
│                                                       │
│  Theia API ───────────────────────────────────────    │
│  Rate:    45 req/s    ▲▲▲▲    (↑23% vs last hour)    │
│  Errors:  0.2%        ▼ (0.1% SLO: 1%)              │
│  Duration: P50: 120ms • P95: 450ms • P99: 1200ms     │
│                                                       │
│  Agent Runtime ──────────────────────────────────     │
│  Rate:    12 tasks/s  ▲▲      (45 tasks/min)         │
│  Errors:  3%          ▼▼      (SLO: 5%)              │
│  Duration: P50: 2.3s • P95: 8.1s • P99: 15s          │
│                                                       │
│  NATS Broker ───────────────────────────────────      │
│  Rate:    890 msg/s   ▲▲▲▲    (1.2M msg/min)         │
│  Errors:  0.01%       ●       (SLO: 0.1%)            │
│  Duration: P50: 3ms • P95: 12ms • P99: 45ms          │
└───────────────────────────────────────────────────────┘
```

### 3.3 USE Metrics (Utilization, Saturation, Errors)

```
USE Metrics — ideal para infraestrutura (CPU, memória, disco, rede):

┌────────────────────────────────────────────────────────┐
│                     USE Dashboard                       │
│                                                        │
│  CPU ──────────────────────────────────────────────    │
│  Utilization: 67%   ████████████████████░░░░░░░░░      │
│  Saturation:   2.3  █░░░░░░░░░░ (avg runqueue)        │
│  Errors:       0     ●                                │
│                                                        │
│  Memory ──────────────────────────────────────────     │
│  Utilization: 78%   ████████████████████░░░░░░░░░      │
│  Saturation:         (swap: 0.1%)                     │
│  Errors:             OOM: 0                           │
│                                                        │
│  Disk ────────────────────────────────────────────     │
│  Utilization: 34%   ████████░░░░░░░░░░░░░░░░░░░░░      │
│  Saturation:  12ms  ███░░░░░░ (avg I/O wait)          │
│  Errors:            Disk errors: 0                    │
│                                                        │
│  Network ─────────────────────────────────────────     │
│  Utilization: 22%   █████░░░░░░░░░░░░░░░░░░░░░░░░░     │
│  Saturation:         drops: 0.01%                     │
│  Errors:            CRC errors: 0                     │
└────────────────────────────────────────────────────────┘
```

### 3.4 Métricas de Negócio IDEIA

```promql
# PromQL — Métricas de negócio

# Tasks completadas por hora
sum(rate(ideia_tasks_completed_total[1h]))

# Tempo médio por task (segundos)
avg(ideia_task_duration_seconds)

# Taxa de aprovação (feedback >= 4)
sum(ideia_task_feedback_score_total{score >= 4}) 
  / sum(ideia_task_feedback_score_total)

# Custo de LLM por projeto (último mês)
sum(ideia_llm_cost_total by project)

# Tasks por agente
topk(10, sum(ideia_tasks_completed_total) by (agent_id))

# Usuários ativos (últimos 7 dias)
count(unique(ideia_user_active_last_seen > (time() - 604800)))

# Sessões de workspace (última hora)
sum(rate(ideia_workspace_session_active[1h]))

# Tasks com rollback
sum(ideia_tasks_rollback_total)

# Erro por tipo de task
sum(rate(ideia_tasks_failed_total[1h])) by (task_type)

# Recursos gastos (tokens, tempo)
sum(ideia_llm_tokens_total) by (model)
```

### 3.5 Métricas Técnicas

```promql
# Latência P99 por serviço
histogram_quantile(0.99,
  sum(rate(ideia_http_request_duration_seconds_bucket[5m])) by (le, service)
)

# Throughput (req/s)
sum(rate(ideia_http_requests_total[5m]))

# Error rate (%)
sum(rate(ideia_http_requests_total{status=~"5.."}[5m]))
  / sum(rate(ideia_http_requests_total[5m]))

# Saturação de pool de agentes
avg(ideia_agent_pool_utilization)

# Conexões NATS ativas
ideia_nats_connections_active

# Cache hit ratio (Redis)
rate(ideia_cache_hits_total[5m])
  / (rate(ideia_cache_hits_total[5m]) + rate(ideia_cache_misses_total[5m]))
```

---

## 4. Logging

### 4.1 Pino (Logger Padrão)

Pino é o logger adotado no ai-devkit:

```typescript
// packages/observability/src/logger.ts
import pino from 'pino';
import { context, trace } from '@opentelemetry/api';

export function createLogger(serviceName: string, level = 'info'): pino.Logger {
  return pino({
    level,
    name: serviceName,
    formatters: {
      bindings(bindings) {
        return { ...bindings };
      },
      level(label) {
        return { level: label };
      },
    },
    mixin() {
      const span = trace.getSpan(context.active());
      if (!span) return {};
      
      const spanContext = span.spanContext();
      return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        traceFlags: spanContext.traceFlags,
      };
    },
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['password', 'token', 'apiKey', 'secret', 'authorization'],
      censor: '[REDACTED]',
    },
  });
}

// Uso
const log = createLogger('agent-runtime', process.env.LOG_LEVEL || 'info');

log.info({ agentId, taskId }, 'Iniciando execução de tarefa');
log.debug({ thought: agent.currentThought }, 'Agente pensando');
log.warn({ retryCount: 3 }, 'LLM call retry');
log.error({ err }, 'Falha na execução do agente');
log.fatal({ err: crashError }, 'Crash no agent runtime — reiniciando');
```

### 4.2 Structured JSON Logging

**Formato de log IDEIA:**

```json
{
  "level": "info",
  "time": "2026-07-18T14:23:45.123Z",
  "name": "agent-runtime",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "spanId": "b7ad6b7169203331",
  "msg": "Tarefa completada",
  "agentId": "agent-42",
  "taskId": "task-123",
  "taskType": "code-generation",
  "durationMs": 3423,
  "tokensUsed": 1542,
  "llmModel": "claude-sonnet-4",
  "toolCalls": 3,
  "success": true,
  "userId": "user-abc"
}
```

### 4.3 Log Levels

| Level | Valor | Uso | Exemplo IDEIA |
|-------|-------|-----|--------------|
| **trace** | 10 | Debug detalhado (todos os passos) | `trace` — cada pensamento do agente |
| **debug** | 20 | Informação de desenvolvimento | Eventos de sistema, cache hits |
| **info** | 30 | Operação normal | Task iniciada/completada, deploy |
| **warn** | 40 | Algo inesperado mas recuperável | Retry de LLM, rate limit |
| **error** | 50 | Erro de operação | Falha de task, DB connection |
| **fatal** | 60 | Erro catastrófico | Crash, OOM, panic |

### 4.4 Log Aggregation

**Loki (recomendado — light + Grafana integrado):**

```yaml
# loki-config.yaml
auth_enabled: false
server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
  chunk_idle_period: 30m
  chunk_retain_period: 1m

schema_config:
  configs:
    - from: 2026-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /data/loki/index
    cache_location: /data/loki/cache
  filesystem:
    directory: /data/loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
```

**LogQL queries essenciais:**

```logql
# Ver erros do agent-runtime na última hora
{service="agent-runtime"} |= `"level":"error"` |= `2026-07-18T14`

# Ver traces de um task específico
{service=~"agent-runtime|llm-router|theia-backend"} |= `"taskId":"task-123"`

# Contar erros por serviço (última hora)
sum by(service) (count_over_time({service=~".+"} |= `"level":"error"` [1h]))

# Ver lentidão — logs com duration > 10s
{service="agent-runtime"} | json | durationMs > 10000

# Correlação traceId — logs de todos os serviços para um trace
{service=~".+"} |= `"traceId":"0af7651916cd43dd8448eb211c80319c"`
```

### 4.5 ELK Stack (Alternativa)

```yaml
# docker-compose.elk.yml — Alternativa completa mas pesada
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.14
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes: [es-data:/usr/share/elasticsearch/data]
    ports: ["9200:9200"]

  logstash:
    image: docker.elastic.co/logstash/logstash:8.14
    ports: ["5044:5044", "5000:5000"]
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: docker.elastic.co/kibana/kibana:8.14
    ports: ["5601:5601"]
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
```

**Veredito:** ELK é poderoso mas pesado (>4GB RAM). Para IDEIA, **Loki é preferível** por ser mais leve e integrar com Grafana já existente.

---

## 5. LLM Observability

### 5.1 LangFuse — Visão Detalhada

LangFuse oferece observabilidade específica para LLMs que vai além do OTel genérico:

| Feature | LangFuse | OTel puro | Importância |
|---------|----------|-----------|-------------|
| Token usage tracking | ✅ Nativo | ❌ | Crítico (custo) |
| Cost tracking | ✅ Por modelo | ❌ | Crítico |
| Generation tracing | ✅ Prompt ↔ Response | ❌ | Alto |
| User feedback scores | ✅ Feedback direto | ❌ | Alto |
| Dataset management | ✅ Versionado | ❌ | Médio |
| Playground | ✅ Testar prompts | ❌ | Médio |
| Experiment tracking | ✅ A/B tests | ❌ | Baixo |
| Distributed tracing | ⚠️ Limitado | ✅ Full | Médio |
| Custom metrics | ✅ Scores | ✅ Metrics API | Médio |

### 5.2 Métricas Específicas de LLM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LLM Metrics Dashboard                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TTFT (Time to First Token) ─────────────────────    │
│  P50: 450ms  ████████████████                                          │
│  P95: 1200ms ██████████████████████████████████████                     │
│  P99: 2500ms ██████████████████████████████████████████████████████████  │
│                                                                          │
│  TPS (Tokens per Second) ──────────────────────    │
│  Claude Sonnet:  45 tok/s  ████████████████                            │
│  GPT-4o:         65 tok/s  ██████████████████████                      │
│  Llama 3 70B:    30 tok/s  ██████████                                  │
│  Mistral Large:  55 tok/s  ████████████████████                        │
│                                                                          │
│  Cost ──────────────────────────────────────────    │
│  Hoje:     $12.45 ██████████████                                       │
│  Ontem:    $8.30  ██████████                                           │
│  Semana:   $87.20 ██████████████████████████████████████████            │
│  Mês:      $342.10████████████████████████████████████████████████████  │
│                                                                          │
│  Top Models by Cost ─────────────────────────    │
│  GPT-4o:        $142.30 ███████████████████████████████████████████     │
│  Claude Sonnet: $98.20  ████████████████████████████████                │
│  Claude Haiku:  $45.10  ██████████████                                  │
│  Embeddings:    $12.50  ████                                           │
│                                                                          │
│  Quality Scores ────────────────────────────    │
│  User Feedback:   4.2/5.0 ★★★★☆                                        │
│  Task Completion: 87%   █████████████████████████████░░░░░░░            │
│  Latency Score:   3.8/5.0 ★★★★☆                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Tracing de LLM Call

```typescript
// packages/llm-router/src/observability.ts
import { Langfuse, LangfuseTrace, LangfuseGeneration } from 'langfuse';
import { trace, context } from '@opentelemetry/api';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
});

interface LLMCallParams {
  provider: string;
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  agentId: string;
  sessionId: string;
  taskId: string;
}

interface LLMCallResult {
  completion: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  latencyMs: number;
  cost: number;
}

export async function tracedLLMCall(
  params: LLMCallParams,
  fn: () => Promise<LLMCallResult>
): Promise<LLMCallResult> {
  const startTime = Date.now();
  const otelSpan = trace.getSpan(context.active());
  
  const langfuseTrace: LangfuseTrace = langfuse.trace({
    name: `llm.${params.provider}`,
    sessionId: params.sessionId,
    userId: params.agentId,
    tags: [params.provider, params.model, 'production'],
    metadata: {
      taskId: params.taskId,
      model: params.model,
      provider: params.provider,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    },
  });

  const generation: LangfuseGeneration = langfuseTrace.generation({
    name: `generate.${params.model}`,
    model: params.model,
    modelParameters: {
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    },
    input: [
      { role: 'system', content: params.systemPrompt || '' },
      { role: 'user', content: params.prompt },
    ],
    startTime: new Date(startTime),
  });

  try {
    const result = await fn();
    
    const latencyMs = Date.now() - startTime;
    
    generation.end({
      output: result.completion,
      usage: {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
      },
      metadata: {
        latencyMs,
        cost: result.cost,
        tokenCostPer1K: result.cost / (result.usage.totalTokens / 1000),
      },
    });

    // Atribuir nota de qualidade
    generation.score({
      name: 'latency',
      value: latencyMs < 5000 ? 1 : latencyMs < 15000 ? 0.5 : 0,
      comment: `Latency: ${latencyMs}ms`,
    });

    // Adicionar atributos OTel
    otelSpan?.setAttributes({
      'llm.model': params.model,
      'llm.provider': params.provider,
      'llm.tokens.prompt': result.usage.promptTokens,
      'llm.tokens.completion': result.usage.completionTokens,
      'llm.tokens.total': result.usage.totalTokens,
      'llm.cost': result.cost,
      'llm.latency_ms': latencyMs,
    });

    return result;
  } catch (error) {
    generation.end({
      level: 'ERROR',
      statusMessage: (error as Error).message,
      endTime: new Date(),
    });

    otelSpan?.setStatus({ code: 2, message: (error as Error).message });
    throw error;
  }
}
```

### 5.4 Quality Scores

```typescript
// packages/llm-router/src/scoring.ts

// Score automático — baseado em métricas
export function autoScore(result: LLMCallResult, params: LLMCallParams): number {
  let score = 1;
  
  // Penalidade por latência alta
  if (result.latencyMs > 20000) score -= 0.3;
  else if (result.latencyMs > 10000) score -= 0.1;
  
  // Penalidade por resposta muito curta ou muito longa
  const responseLength = result.completion.length;
  if (responseLength < 10) score -= 0.5;      // Resposta vazia
  else if (responseLength < 50) score -= 0.2; // Resposta muito curta
  
  // Penalidade por zero tokens (falha silenciosa)
  if (result.usage.totalTokens === 0) score -= 0.8;
  
  return Math.max(0, Math.min(1, score));
}

// Score manual — feedback explícito do usuário
export async function recordUserFeedback(
  traceId: string,
  value: number,
  comment?: string
): Promise<void> {
  await langfuse.score({
    traceId,
    name: 'user-feedback',
    value: value / 5, // Normalizar 1-5 para 0-1
    comment,
  });
}
```

---

## 6. Agent Observability

### 6.1 Agent Tracing

Cada execução de agente gera uma árvore de spans:

```typescript
// packages/agent-runtime/src/observability/agent-tracing.ts
import { trace, Span } from '@opentelemetry/api';

const tracer = trace.getTracer('ideia.agent.runtime', '1.0.0');

export async function traceAgentExecution<T>(
  agentId: string,
  task: AgentTask,
  execute: (span: Span) => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan('agent.execute', {
    attributes: {
      'agent.id': agentId,
      'agent.type': task.type,
      'agent.model': task.model,
      'task.id': task.id,
      'task.priority': task.priority,
      'user.id': task.userId,
      'project.id': task.projectId,
    },
  }, async (span: Span) => {
    try {
      span.addEvent('agent.start', {
        'agent.plan': task.plan?.substring(0, 500),
        'agent.tools': JSON.stringify(task.availableTools),
      });

      const result = await execute(span);

      span.setAttribute('agent.tokens_used', result.tokensUsed);
      span.setAttribute('agent.tool_count', result.toolCalls?.length || 0);
      span.setAttribute('agent.completion_status', result.success ? 'success' : 'failed');
      span.setAttribute('agent.duration_ms', result.durationMs);
      span.setAttribute('agent.cost', result.cost);
      
      span.addEvent('agent.complete', {
        'agent.output_length': result.output?.length,
        'agent.cycles': result.cycles,
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      span.recordException(error as Error);
      span.addEvent('agent.error', {
        'error.type': (error as Error).name,
        'error.message': (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### 6.2 Agent Metrics

```typescript
// packages/agent-runtime/src/observability/agent-metrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('ideia.agent.runtime', '1.0.0');

// Métricas de taxa de conclusão
export const tasksStarted = meter.createCounter('agent.tasks.started');
export const tasksCompleted = meter.createCounter('agent.tasks.completed', {
  description: 'Tarefas completadas com sucesso',
});
export const tasksFailed = meter.createCounter('agent.tasks.failed', {
  description: 'Tarefas que falharam',
});
export const tasksRolledBack = meter.createCounter('agent.tasks.rolled_back', {
  description: 'Tarefas com rollback automático',
});

// Métricas de desempenho
export const taskDuration = meter.createHistogram('agent.task.duration_ms', {
  description: 'Duração da tarefa',
  unit: 'ms',
  boundaries: [500, 1000, 3000, 5000, 10000, 20000, 60000],
});
export const toolCallDuration = meter.createHistogram('agent.tool_call.duration_ms', {
  description: 'Duração de cada tool call',
  unit: 'ms',
});
export const llmLatency = meter.createHistogram('agent.llm.latency_ms', {
  description: 'Latência da chamada LLM',
  unit: 'ms',
});

// Métricas de autonomia
export const autonomyViolations = meter.createCounter('agent.autonomy.violations', {
  description: 'Violações de política de autonomia',
});
export const autonomyLevel = meter.createUpDownCounter('agent.autonomy.level', {
  description: 'Nível de autonomia atual do agente',
});

// Métricas de pool
export const activeAgents = meter.createUpDownCounter('agent.pool.active');
export const queuedTasks = meter.createUpDownCounter('agent.queue.length');
export const poolUtilization = meter.createGauge('agent.pool.utilization', {
  description: 'Utilização do pool de agentes (0-1)',
});

// Métricas de custo
export const agentCost = meter.createCounter('agent.cost.total', {
  description: 'Custo total do agente (USD)',
});
```

### 6.3 Agent Logs

Formato de log específico para agentes:

```json
{
  "level": "info",
  "time": "2026-07-18T14:23:45.123Z",
  "name": "agent-runtime",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "spanId": "b7ad6b7169203331",
  "agentId": "agent-42",
  "taskId": "task-123",
  "phase": "thinking",
  "thought": "O usuário pediu para criar uma API REST. Preciso analisar o código existente primeiro.",
  "context": {
    "cycle": 3,
    "maxCycles": 15,
    "remainingTokens": 3200,
    "lastToolResult": "Found 3 route files"
  }
}
```

```json
{
  "level": "info",
  "time": "2026-07-18T14:23:47.456Z",
  "name": "agent-runtime",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "spanId": "c8be7216a8304242",
  "agentId": "agent-42",
  "taskId": "task-123",
  "phase": "tool_call",
  "tool": "code_reader",
  "args": { "path": "/home/project/src/routes/api.ts", "pattern": "rest" },
  "result": { "files": 3, "lines": 245, "success": true }
}
```

### 6.4 Agent Dashboards

**Dashboard Grafana: Agent Overview**

```json
{
  "dashboard": {
    "title": "IDEIA — Agent Runtime",
    "panels": [
      {
        "title": "Active Agents",
        "type": "stat",
        "datasource": "Prometheus",
        "targets": [{
          "expr": "ideia_agent_pool_active",
          "legendFormat": "Agentes ativos"
        }]
      },
      {
        "title": "Tasks Queue",
        "type": "stat",
        "targets": [{
          "expr": "ideia_agent_queue_length",
          "legendFormat": "Fila"
        }]
      },
      {
        "title": "Task Completion Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(ideia_agent_tasks_completed_total[5m])",
            "legendFormat": "Completed"
          },
          {
            "expr": "rate(ideia_agent_tasks_failed_total[5m])",
            "legendFormat": "Failed"
          }
        ]
      },
      {
        "title": "Task Duration (P50/P95/P99)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(ideia_agent_task_duration_ms_bucket[5m])) by (le))",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, sum(rate(ideia_agent_task_duration_ms_bucket[5m])) by (le))",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, sum(rate(ideia_agent_task_duration_ms_bucket[5m])) by (le))",
            "legendFormat": "P99"
          }
        ]
      },
      {
        "title": "Tool Usage Distribution",
        "type": "pie",
        "targets": [{
          "expr": "topk(10, sum(rate(ideia_agent_tool_calls_total[1h])) by (tool))",
          "legendFormat": "{{tool}}"
        }]
      },
      {
        "title": "Cost by Agent",
        "type": "table",
        "targets": [{
          "expr": "topk(10, sum(ideia_agent_cost_total) by (agent_id))",
          "format": "table"
        }]
      },
      {
        "title": "Autonomy Violations",
        "type": "stat",
        "targets": [{
          "expr": "rate(ideia_agent_autonomy_violations_total[1h])",
          "legendFormat": "Violations/h"
        }],
        "color": { "mode": "alert", "thresholds": { "mode": "absolute", "steps": [{ "value": 0, "color": "green" }, { "value": 1, "color": "red" }] } }
      }
    ]
  }
}
```

### 6.5 Estrutura de Observabilidade do Agente

```
Agent Execution
    │
    ├── LangFuse Trace (toda a sessão)
    │   ├── Generation: LLM call #1
    │   ├── Generation: LLM call #2
    │   ├── Score: latency
    │   ├── Score: user_feedback
    │   └── Score: completion_quality
    │
    ├── OTel Spans (árvore detalhada)
    │   ├── [agent.execute] — span raiz
    │   ├── [agent.plan] — planejamento
    │   ├── [agent.think] — raciocínio
    │   ├── [agent.tool.call] — cada ferramenta
    │   ├── [agent.memory.query] — queries de memória
    │   └── [agent.complete] — finalização
    │
    ├── Logs Estruturados (Pino + Loki)
    │   ├── "phase": "thinking" — pensamento detalhado
    │   ├── "phase": "tool_call" — args + resultado
    │   ├── "phase": "error" — erros com stack trace
    │   └── "phase": "complete" — resumo da execução
    │
    └── Métricas (Prometheus)
        ├── agent.tasks.completed (counter por tipo)
        ├── agent.task.duration_ms (histogram)
        ├── agent.cost.total (counter)
        ├── agent.pool.active (updowncounter)
        └── agent.autonomy.violations (counter)
```

---

## 7. Alerting

### 7.1 Alertmanager

```yaml
# alertmanager-config.yaml
route:
  receiver: 'default'
  group_by: ['alertname', 'service', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      repeat_interval: 5m
    - match:
        severity: warning
      receiver: 'slack-warning'
    - match:
        severity: info
      receiver: 'slack-info'

receivers:
  - name: 'default'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.description }}'
  
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - routing_key: '...'
        severity: critical
        description: '{{ .GroupLabels.alertname }}'
  
  - name: 'slack-warning'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#alerts-warning'
  
  - name: 'slack-info'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/...'
        channel: '#alerts-info'
```

### 7.2 Alert Rules por Serviço

```yaml
# prometheus-rules/ideia-alerts.yaml
groups:
  - name: ideia-agent
    rules:
      - alert: HighAgentFailureRate
        expr: |
          rate(ideia_agent_tasks_failed_total[5m])
          / rate(ideia_agent_tasks_started_total[5m])
          > 0.10
        for: 5m
        labels:
          severity: critical
          service: agent-runtime
        annotations:
          summary: "Agent failure rate > 10% for 5 minutes"
          description: "Agent {{ $labels.agent_id }} has {{ $value | humanizePercentage }} failure rate"

      - alert: AgentQueueGrowing
        expr: |
          deriv(ideia_agent_queue_length[10m]) > 0
        for: 15m
        labels:
          severity: warning
          service: agent-runtime
        annotations:
          summary: "Agent queue is growing"
          description: "Queue length: {{ $value | humanizeNumber }}"

      - alert: AgentPoolExhausted
        expr: |
          ideia_agent_pool_active >= ideia_agent_pool_max
        for: 5m
        labels:
          severity: critical
          service: agent-runtime
        annotations:
          summary: "Agent pool exhausted"
          description: "All {{ $value | humanizeNumber }} agents are busy"

  - name: ideia-llm
    rules:
      - alert: HighLLMLatency
        expr: |
          histogram_quantile(0.95,
            sum(rate(ideia_llm_latency_ms_bucket[5m])) by (le, model)
          ) > 15000
        for: 10m
        labels:
          severity: warning
          service: llm-router
        annotations:
          summary: "LLM P95 latency > 15s"
          description: "Model {{ $labels.model }} P95: {{ $value }}ms"

      - alert: LLMBudgetExceeded
        expr: |
          sum(increase(ideia_llm_cost_total[24h])) > 50
        labels:
          severity: warning
          service: llm-router
        annotations:
          summary: "LLM daily budget exceeded $50"
          description: "Cost today: ${{ $value | humanizeNumber }}"

      - alert: LLMErrorRate
        expr: |
          rate(ideia_llm_errors_total[5m])
          / rate(ideia_llm_requests_total[5m])
          > 0.05
        for: 5m
        labels:
          severity: critical
          service: llm-router
        annotations:
          summary: "LLM error rate > 5%"
          description: "Provider {{ $labels.provider }}: {{ $value | humanizePercentage }}"

  - name: ideia-infra
    rules:
      - alert: HighCPUUsage
        expr: |
          (100 - avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])))
          > 85
        for: 10m
        labels:
          severity: warning
          service: infrastructure
        annotations:
          summary: "CPU > 85% for 10 minutes"
          description: "Instance {{ $labels.instance }}: {{ $value | humanizePercentage }}"

      - alert: DiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100
          < 10
        for: 5m
        labels:
          severity: critical
          service: infrastructure
        annotations:
          summary: "Disk space < 10%"
          description: "Instance {{ $labels.instance }}: {{ $value | humanizePercentage }} remaining"

      - alert: NATSConnectionsDropping
        expr: |
          rate(nats_connections_total[5m]) < 0
        for: 3m
        labels:
          severity: critical
          service: nats
        annotations:
          summary: "NATS connections dropping"
          description: "Active connections: {{ $value }}"
```

### 7.3 SLO-Based Alerting (Burn Rate)

```yaml
# prometheus-rules/slo-alerts.yaml
groups:
  - name: ideia-slo
    rules:
      # SLO: 99.5% de tasks completadas com sucesso em 30 dias
      # Burn rate alert: >= 2x erro em 1h (alerta rápido)
      - alert: SLOTaskCompletionRate
        expr: |
          (
            1 - (
              sum(rate(ideia_agent_tasks_failed_total[1h]))
              / sum(rate(ideia_agent_tasks_started_total[1h]))
            )
          ) < 0.99
        for: 5m
        labels:
          severity: critical
          slo: "99.5%"
        annotations:
          summary: "Task completion SLO burn rate critical"
          description: "Current: {{ $value | humanizePercentage }} (SLO: 99.5%)"

      # SLO: 95% de respostas LLM em < 10s
      - alert: SLOLLMLatency
        expr: |
          histogram_quantile(0.95,
            sum(rate(ideia_llm_latency_ms_bucket[30m])) by (le)
          ) > 10000
        for: 15m
        labels:
          severity: warning
          slo: "95% < 10s"
        annotations:
          summary: "LLM latency SLO burn rate"
          description: "P95: {{ $value }}ms (SLO: 10000ms)"
```

### 7.4 On-Call

| Ferramenta | Preço | Integração | Notificações | IDEIA |
|-----------|-------|-----------|-------------|-------|
| **PagerDuty** | $21/user/mês | Nativo Alertmanager | Push, SMS, call | **Principal** (pago) |
| **Opsgenie** | $9/user/mês | Nativo Alertmanager | Push, SMS, call | Alternativa |
| **Grafana OnCall** | $0 (OSS) | Nativo Grafana | Push, Telegram | **Auto-gestionado** |
| **Slack Alerts** | $0 | Webhook | Slack only | Complementar |

**Recomendação:** Grafana OnCall (open source) para MVP/startup, migrar para PagerDuty quando tiver receita ou equipe > 10 pessoas.

### 7.5 Prevenção de Alert Fatigue

**Estratégias:**

1. **Grouping:** Agrupar alertas similares (Alertmanager `group_by`)
2. **Deduplication:** Alertas de mesma causa raiz → 1 notificação
3. **Silencing:** Silenciar alertas conhecidos durante janelas de manutenção
4. **Inhibition:** Se serviço X caiu, inibir alertas de dependentes
5. **Tiering:** Separar alertas por severidade (P0=call, P1=slack, P2=email)

```yaml
# Inibição de alertas
inhibit_rules:
  - source_match:
      severity: critical
      alertname: NATSDown
    target_match:
      severity: warning
    equal: ['service']

  - source_match:
      alertname: AgentPoolExhausted
    target_match_re:
      alertname: 'HighLLM.*'
    equal: ['service']
```

---

## 8. Dashboards

### 8.1 Grafana — Stack Completa

**Arquitetura Grafana:**

```
┌───────────────────────────────────────────────────────────┐
│                      Grafana                               │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │  Overview    │  │  LLM        │  │  Agents      │      │
│  │  Dashboard   │  │  Dashboard  │  │  Dashboard   │      │
│  └──────┬───────┘  └──────┬──────┘  └──────┬──────┘      │
│         │                  │                │              │
│  ┌──────┴───────┐  ┌──────┴──────┐  ┌──────┴──────┐      │
│  │  Infra        │  │  Business   │  │  Deploy      │      │
│  │  Dashboard    │  │  Dashboard  │  │  Dashboard   │      │
│  └──────┬───────┘  └──────┬──────┘  └──────┬──────┘      │
│         │                  │                │              │
└─────────┼──────────────────┼────────────────┼────────────┘
          │                  │                │
          ▼                  ▼                ▼
    ┌──────────┐     ┌──────────┐      ┌──────────┐
    │Prometheus│     │  Loki    │      │  Tempo   │
    │(Metrics) │     │ (Logs)   │      │ (Traces) │
    └──────────┘     └──────────┘      └──────────┘
```

### 8.2 Datadog (SaaS Alternativo)

```yaml
# datadog-agent-config.yaml
api_key: ${DD_API_KEY}
site: datadoghq.com
tags:
  - service:ideia
  - env:production

logs_enabled: true
logs_config:
  container_collect_all: true

apm_config:
  enabled: true
  env: production
  log_injection: true

process_config:
  enabled: true
```

**Prós:** SaaS completo (traces + logs + metrics), correlaciona tudo, fácil setup, suporte enterprise.
**Contras:** Caro para escala ($15/host/mês + $1M logs + $5/span), vendor lock-in.

### 8.3 SigNoz (Open Source, OTel-native)

```yaml
# docker-compose.signoz.yml
services:
  signoz:
    image: signoz/frontend:latest
    ports: ["3301:3301"]
  
  signoz-otel-collector:
    image: signoz/signoz-otel-collector:latest
    ports: ["4317:4317", "4318:4318"]
  
  clickhouse:
    image: clickhouse/clickhouse-server:latest
    volumes: [clickhouse-data:/var/lib/clickhouse]
```

**Prós:** Open source, OTel-nativo, correlaciona traces + logs + metrics, suporta ClickHouse.
**Contras:** Menos maduro que Grafana stack, UI menos polida.

### 8.4 HyperDX (Open Source)

```yaml
# docker-compose.hyperdx.yml
services:
  hyperdx:
    image: hyperdx/hyperdx:latest
    ports: ["8080:8080"]
    depends_on: [opensearch]
  
  opensearch:
    image: opensearchproject/opensearch:latest
```

**Prós:** Open source, foco em developer experience, busca full-text, session replay.
**Contras:** Jovem (menos integrações), ecossistema pequeno.

### 8.5 Comparação de Plataformas

| Plataforma | Traces | Logs | Metrics | LLM OTel | Custo | Self-hosted | Recomendação |
|-----------|--------|------|---------|----------|-------|-------------|-------------|
| **Grafana + Prom + Loki + Tempo** | ✅ | ✅ | ✅ | ✅ Parcial | $0 OSS | ✅ | **IDEIA Stack** |
| **SigNoz** | ✅ | ✅ | ✅ | ✅ OTel | $0 OSS / $19 cloud | ✅ | Alternativa unificada |
| **Datadog** | ✅ | ✅ | ✅ | ✅ | $$$ (~$25/host/mês) | ❌ | Enterprise |
| **New Relic** | ✅ | ✅ | ✅ | ✅ | $$$ | ❌ | Enterprise |
| **HyperDX** | ✅ | ✅ | ✅ | ❌ | $0 OSS | ✅ | Emergente |
| **LangFuse + Grafana** | ✅ LLM | ✅ Loki | ✅ Prom | ✅ LangFuse | $0 (LangFuse OSS) | ✅ | **Primário** |

---

## 9. Implementação no IDEIA

### 9.1 Roadmap de Observabilidade

| Fase | O que implementar | Dependências | Prazo |
|------|------------------|-------------|-------|
| **Fase 0 (MVP)** | Pino logger + stdout JSON + healthcheck | Nenhuma | Semanas 1-2 |
| **Fase 1** | OTel SDK + auto-instrumentação HTTP/gRPC | Fase 0 | Semanas 3-4 |
| **Fase 2** | OTel Collector + Prometheus + Grafana | Fase 1 | Semanas 5-6 |
| **Fase 3** | LangFuse tracing de LLM calls | Fase 2 | Semanas 7-8 |
| **Fase 4** | Log aggregation (Loki) + dashboards | Fase 2-3 | Semanas 9-10 |
| **Fase 5** | Agent tracing + métricas de negócio | Fase 3 | Semanas 11-12 |
| **Fase 6** | Alerting (Alertmanager + Slack/PagerDuty) | Fase 4-5 | Semanas 13-14 |
| **Fase 7** | SLO-based alerting + dashboards de negócio | Fase 6 | Semanas 15-16 |

### 9.2 Implementação por Package

```
packages/
├── observability/
│   ├── src/
│   │   ├── tracing.ts         # OTel SDK setup (NodeSDK)
│   │   ├── logger.ts          # Pino + OTel context injection
│   │   ├── metrics.ts         # Métricas customizadas
│   │   ├── langfuse.ts        # LangFuse client wrapper
│   │   └── index.ts
│   └── package.json
│
├── agent-runtime/
│   └── src/
│       ├── observability/
│       │   ├── agent-tracing.ts   # Span tree de agentes
│       │   ├── agent-metrics.ts   # Métricas RED de agentes
│       │   └── agent-logger.ts    # Logger com contexto de agente
│       └── index.ts
│
├── llm-router/
│   └── src/
│       ├── observability/
│       │   ├── llm-tracing.ts     # LangFuse generation tracing
│       │   ├── llm-cost.ts        # Cost tracking por modelo
│       │   └── llm-scoring.ts     # Quality scores
│       └── index.ts
```

### 9.3 Docker Compose para Observabilidade

```yaml
# docker-compose.observability.yml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"  # OTLP gRPC
      - "4318:4318"  # OTLP HTTP
      - "8889:8889"  # Prometheus metrics
    depends_on: [prometheus, loki, langfuse]

  prometheus:
    image: prom/prometheus:latest
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports: ["9090:9090"]

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    ports: ["3001:3000"]
    depends_on: [prometheus, loki, tempo]

  loki:
    image: grafana/loki:latest
    command: -config.file=/etc/loki/local-config.yaml
    ports: ["3100:3100"]
    volumes: [loki-data:/data/loki]

  tempo:
    image: grafana/tempo:latest
    command: [-config.file=/etc/tempo.yaml]
    volumes:
      - ./tempo.yaml:/etc/tempo.yaml
      - tempo-data:/tmp/tempo
    ports: ["3200:3200"]

  langfuse:
    image: langfuse/langfuse:latest
    environment:
      - DATABASE_URL=postgres://langfuse:langfuse@postgres:5432/langfuse
      - LANGFUSE_ENCRYPTION_KEY=${LANGFUSE_ENCRYPTION_KEY}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=http://localhost:3030
    ports: ["3030:3000"]
    depends_on: [postgres]
```

### 9.4 Pipeline de Observabilidade

```
Agent/Service
    │
    ├── OTel SDK → OTLP (gRPC:4317)
    │     │
    │     ▼
    │   OTel Collector
    │     │
    │     ├── OTLP → LangFuse (LLM traces + scores)
    │     ├── Prometheus → /metrics (HTTP:8889)
    │     │     │
    │     │     └── Prometheus scrape ← Prometheus Server
    │     │           │
    │     │           └── PromQL ← Grafana
    │     │
    │     ├── OTLP → Tempo (distributed traces)
    │     │           │
    │     │           └── TraceQL ← Grafana
    │     │
    │     └── OTLP → Loki (structured logs)
    │                 │
    │                 └── LogQL ← Grafana
    │
    └── Pino Logger → stdout → Docker → Loki
                                     │
                                     └── LogQL ← Grafana
```

### 9.5 Métricas por Estágio do Projeto

| Métrica | MVP (Fase 0) | Startup (Fase 1-3) | Growth (Fase 4-5) | Enterprise (Fase 6-7) |
|---------|-------------|-------------------|-------------------|----------------------|
| **Logs** | stdout JSON | + Loki + Grafana | + LogQL alerts | + Correlation tracing |
| **Métricas** | Health endpoint | + Prometheus + Node Exporter | + RED + USE + Business | + SLO burn rate |
| **Traces** | N/A | + OTel auto-instrumentação | + LangFuse LLM tracing | + Agent spans tree |
| **Alerting** | N/A | + Slack alerts | + Alertmanager + PagerDuty | + Auto-remediation |
| **Dashboards** | N/A | + Grafana infra | + LLM + Agent dashboard | + Business + SLO dashboard |
| **Custo infra** | $0 | ~$10/mês | ~$50/mês | ~$200/mês |

---

## Apêndices

### A. Glossário

| Termo | Definição |
|-------|-----------|
| **OTel** | OpenTelemetry — padrão CNCF para observabilidade |
| **OTLP** | OpenTelemetry Protocol — protocolo para exportar telemetria |
| **Span** | Unidade de trabalho em tracing distribuído (operação individual) |
| **Trace** | Árvore de spans que representa uma requisição completa |
| **RED** | Rate, Errors, Duration — métricas para serviços |
| **USE** | Utilization, Saturation, Errors — métricas para infraestrutura |
| **SLO** | Service Level Objective — meta de qualidade de serviço |
| **SLI** | Service Level Indicator — métrica que mede aderência ao SLO |
| **TTFT** | Time to First Token — latência até primeiro token do LLM |
| **TPS** | Tokens per Second — throughput de geração de tokens |
| **Tempo** | Backend de tracing da Grafana |
| **Loki** | Sistema de agregação de logs da Grafana |
| **Prometheus** | Sistema de métricas time-series |
| **LangFuse** | Plataforma de observabilidade para LLMs |
| **Alertmanager** | Gerenciador de alertas do Prometheus |
| **Pino** | Logger estruturado Node.js (já adotado) |
| **LogQL** | Linguagem de query do Loki |
| **PromQL** | Linguagem de query do Prometheus |
| **TraceQL** | Linguagem de query do Tempo |

### B. Referências

- OpenTelemetry Documentation: https://opentelemetry.io/docs/
- OpenTelemetry Node.js SDK: https://opentelemetry.io/docs/languages/js/
- LangFuse Documentation: https://langfuse.com/docs
- Prometheus Documentation: https://prometheus.io/docs/
- Grafana Documentation: https://grafana.com/docs/
- Loki Documentation: https://grafana.com/docs/loki/
- Tempo Documentation: https://grafana.com/docs/tempo/
- Pino Logger: https://getpino.io/
- ADR-009: OpenTelemetry + LangFuse para Observabilidade: `docs/adr/ADR-009-opentelemetry-langfuse-para-observabilidade.md`
- SigNoz: https://signoz.io/
- HyperDX: https://hyperdx.io/

---

> **Próximo:** Criar package `packages/observability` com OTel SDK + LangFuse + Pino wrapper. Migrar `observability-engine` existente para usar OTel como padrão.
