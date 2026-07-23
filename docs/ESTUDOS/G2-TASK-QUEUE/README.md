# G2 — Task Queue (Fila Assíncrona)

> **Tipo**: `structural-gap`  
> **Status**: ✅ `IMPLEMENTED` — packages/task-queue/ criado em 2026-07-22  
> **Data**: 2026-07-15  
> **Metodologia**: Template Permanente de Análise (Fases 1-4)

---

## Fase 1 — Pesquisa e Fundamentação

### 1.1 Resumo Executivo

Deploy, simulação, self-healing e instalação de software são operações que precisam executar em background sem bloquear o usuário. Atualmente não há fila assíncrona — tudo executa inline no request handler. Um Task Queue resolve: enfileira jobs, executa com paralelismo controlado, retry com backoff, notifica progresso via Event Bus (G1) e persiste estado para resiliência.

**Decisão recomendada**: ✅ FAZER — Score 3.7, prioridade alta.

### 1.2 Pesquisa Acadêmica e de Mercado

- **Padrões**: Command Pattern, Queue-based Load Leveling, Compensating Transaction (Saga), Retry with Exponential Backoff.
- **Concorrentes**: Devin usa fila interna para jobs de deploy em cloud sandbox. Cursor Background Agents rodam em fila com paralelismo. GitHub Actions é o exemplo mais maduro de task queue + workers.
- **Open source**: `bullmq` (Redis-backed, mais maduro), `p-queue` (in-process, leve), `bottleneck` (rate limiter + queue), `kafkajs` (para Kafka), `amqplib` (RabbitMQ).
- **Papers**: "SAGAS" (Garcia-Molina & Salem, 1987) — padrão de transações compensatórias. "Exponential Backoff and Jitter" (AWS Architecture Blog).

### 1.3 Análise Técnica

**Arquitetura proposta**:
```
API Request → TaskQueue.enqueue(job)
  ├── Job serializado (type + payload + config)
  ├── Persistido em memória (in-process) ou Redis (escalável)
  ├── Worker pool executa com paralelismo configurável
  ├── Retry policy: 3 tentativas com backoff exponencial (1s, 4s, 16s)
  ├── Progresso emitido via Event Bus (G1)
  └── Resultado armazenado para consulta posterior
```

**Dependências**: `packages/event-bus/` (G1) para notificações de progresso. Nenhum novo módulo externo no MVP — implementação in-process com `p-queue`.

### 1.4 Riscos e Limitações

- **Perda de jobs**: Sem Redis/persistência externa, jobs são perdidos se o processo morre — aceitável para MVP, mitigado com Redis bullmq na v2.
- **Deadlock**: Jobs que dependem uns dos outros — evitar dependências circulares, usar DAG-based scheduling.
- **Memory**: Jobs acumulados consomem RAM — limite de fila configurável com overflow policy (reject/backpressure).

---

## Fase 2 — Matriz de Viabilidade

| Dimensão | Peso | Nota | Pontos |
|----------|:----:|:----:|:------:|
| **Valor para IDE** | 3 | 4 | 12 |
| **Diferenciação** | 2 | 3 | 6 |
| **Sinergia c/ arquitetura** | 2 | 4 | 8 |
| **Custo-benefício** | 2 | 4 | 8 |
| **Maturidade** | 1 | 3 | 3 |

**Score = (12 + 6 + 8 + 8 + 3) / 10 = 3.7** ✅ FAZER

| Esforço | Semanas | Justificativa |
|:-------:|:-------:|---------------|
| **M** | 3-4 | Novo pacote, depende de G1, 3 integrações |

---

## Fase 3 — Artefatos

### 3.1 TASK-IDE-15 — Task Queue para Jobs Assíncronos

```markdown
# Tarefa — Task Queue Assíncrona

## ID: TASK-IDE-15 | Módulo: task-queue | Tipo: feature

## Objetivo: Implementar fila assíncrona in-process com paralelismo, retry, progresso via Event Bus.

## Dependências
- TASK-IDE-14 (Event Bus) — emitir progresso dos jobs
- TASK-IDE-06 (Contract Types) — tipos de job

## Critérios de aceite
### Subtarefa 15.1 — Core Queue
- [ ] `TaskQueue.enqueue(job: Job)` retorna `jobId`
- [ ] `TaskQueue.getStatus(jobId)` retorna `pending|active|completed|failed`
- [ ] Pool de workers com paralelismo configurável via `concurrency`
- [ ] Retry automático: 3 tentativas, backoff exponencial (1s, 4s, 16s)

### Subtarefa 15.2 — Event Bus Integration
- [ ] Job `enqueued`, `started`, `progress`, `completed`, `failed` emitem eventos
- [ ] `progress(pct, message)` para jobs longos
- [ ] Web UI recebe notificações de progresso em tempo real

### Subtarefa 15.3 — Consumidores iniciais
- [ ] Deploy job (executa scripts de deploy)
- [ ] Simulação job (executa experimentos)
- [ ] Self-healing job (executa diagnóstico e reparo)

## Arquivos que PODEM ser alterados
- `packages/task-queue/src/` (core, worker, job types)
- `packages/contracts/src/jobs/` (tipos de job)
- `packages/cli/src/ide/` (integração WebSocket)

## Riscos
- Jobs podem vazar memória se acumularem — limite máximo configurável
- Dead workers podem travar fila — timeout por job com fallback

## Verificação
- [ ] Testes: enqueue, parallel execution, retry, timeout
- [ ] Teste de stress: 100 jobs concorrentes
```

### 3.2 Contratos

**Contrato: task-queue → event-bus**
- `TaskQueue.emit('job:progress', { jobId, pct, message })`
- `TaskQueue.emit('job:completed', { jobId, result })`
- `TaskQueue.emit('job:failed', { jobId, error })`

**Contrato: api-router → task-queue**
- `TaskQueue.enqueue(job)` substitui execução inline
- `TaskQueue.getJob(jobId)` permite polling de status

### 3.3 CHANGELOG Entry

```markdown
## 2026-07-15 — G2: Task Queue (Fila Assíncrona)

### Arquivos novos
| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `docs/ESTUDOS/G2-TASK-QUEUE/README.md` | Análise completa do gap estrutural |
```

---

## Fase 4 — Ciclo de Vida

```
[CRIAÇÃO] docs/ESTUDOS/G2-TASK-QUEUE/README.md
  │
  ├──> PESQUISA (Fase 1) → Deploy, self-healing, simulação precisam
  │
  ├──> ANÁLISE (Fase 2) → Score 3.7 — ✅ FAZER
  │     │
  │     └──> GERA TAREFA → TASK-IDE-15
  │           │
  │           └──> IMPLEMENTA → Task Queue + 3 consumidores
  │
  └──> REVISÃO PERIÓDICA → a cada 3 meses (próximo: 2026-10-15)
```

---

## Integração com Código (2026-07-22)

**Status:** ✅ **Coberto** (F3 — Deploy e GitOps)

A funcionalidade de fila de tarefas assíncronas foi implementada na **Fase 3 (Delivery Orchestrator e Workflow Engine)**:

| Componente | Package | Status |
|-----------|---------|--------|
| Workflow Engine | `packages/workflow-engine/` | Orquestração com steps, retry, paralelismo |
| Delivery Orchestrator | `packages/delivery-orchestrator/` | Canary 10/50/100%, rollback, quality gates |
| LangGraph Steps | `packages/agent-runtime/` | 8 tipos de step com timeout/retry |

---

## Referências

- "SAGAS" — Garcia-Molina & Salem, 1987
- AWS Architecture Blog — "Exponential Backoff and Jitter"
- `bullmq` (Redis-based queue) — referência para v2
- `p-queue` (in-process queue) — referência para MVP
