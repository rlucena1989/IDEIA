# Plano de Migração: ai-devkit → IDEIA

> **Data:** 2026-07-17
> **Versão:** 1.0
> **Base:** IDEIA-MASTER.md · PLANO-IMPLEMENTACAO-IDEIA-DETALHADO.md (110 tasks) · MATRIZ-TECNOLOGICA-COMPLETA.md (65 tecnologias)
> **Escopo:** 60 packages existentes → 28 módulos estratégicos IDEIA

---

## Índice

1. [Mapeamento Módulo-a-Módulo](#1-mapeamento-módulo-a-módulo)
2. [Tabela de Compatibilidade Retroativa](#2-tabela-de-compatibilidade-retroativa)
3. [Estratégia de Migração](#3-estratégia-de-migração)
4. [Dependências entre Migrações](#4-dependências-entre-migrações)
5. [Risco por Módulo](#5-risco-por-módulo)
6. [Cronograma Consolidado](#6-cronograma-consolidado)

---

## 1. Mapeamento Módulo-a-Módulo

### 1.1 event-bus (in-memory → NATS JetStream)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `event-bus` |
| **Pacote** | `packages/event-bus/` |
| **Status atual** | Implementado (in-memory, pub/sub síncrono, histórico array maxHistory 1000, 4 arquivos) |
| **Papel no IDEIA** | Backbone de mensageria: NATS JetStream persistente, pub/sub, req/rep, KV, Object Store, DLQ, Outbox |
| **Mudanças necessárias** | Substituir EventBus class por NatsAdapter; adicionar retry policy, DLQ, outbox pattern, consumer groups, replay |
| **Tecnologia alvo** | `nats.js` (npm nats package), NATS JetStream (~20MB binary) |
| **Contratos afetados** | `EventBus.emit()`, `.subscribe()` mudam de sync para async/pub/sub baseado em stream |
| **Dependências** | schema-registry (validação), audit-trail (consumidor) |
| **Prioridade** | 5 — P0 crítico, espinha dorsal |
| **Tarefa relacionada** | TASK-IDEIA-016 (NATS), TASK-IDEIA-023 (DLQ+Retry+Outbox) |

### 1.2 memory-store (in-memory → Mem0 + SQLite + DuckDB)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `memory-store` |
| **Pacote** | `packages/memory-store/` |
| **Status atual** | Implementado (in-memory, JSON append-only, 2 arquivos) |
| **Papel no IDEIA** | Memória e conhecimento: Mem0 (cross-session), SQLite+FTS5 (busca textual), DuckDB (analytics), Knowledge Graph |
| **Mudanças necessárias** | Adicionar SQLite com FTS5; DuckDB OLAP; adapter Mem0; KG interno; cross-project learning; fine-tuning |
| **Tecnologia alvo** | `better-sqlite3`, `@duckdb/node-api`, Mem0 API, sqlite-vec, Neo4j (opcional) |
| **Contratos afetados** | `MemoryStore.store()/query()` — assinatura permanece, backend muda |
| **Dependências** | event-bus (consumidor passivo), pattern-detector (dentro do pacote) |
| **Prioridade** | 5 — P0, base do contexto do chat |
| **Tarefa relacionada** | TASK-IDEIA-006, 020, 024, 057-064 |

### 1.3 feedback-pipeline (heurístico → LLM real)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `feedback-pipeline` |
| **Pacote** | `packages/feedback-pipeline/` |
| **Status atual** | Implementado (mapeamento determinístico, 3 arquivos) |
| **Papel no IDEIA** | Análise de feedback 3 níveis (linha, módulo, projeto) via LLM; recomendações adaptativas |
| **Mudanças necessárias** | Substituir lógica heurística por análise LLM; conectar event-bus; 3 níveis de análise; fallback heurístico |
| **Tecnologia alvo** | Provider Router (LLM já existente), event-bus (NATS) |
| **Contratos afetados** | `FeedbackProcessor.process()` — retorno enriquecido com análise LLM |
| **Dependências** | event-bus (TASK-IDEIA-017), memory-store |
| **Prioridade** | 3 — Fase 2 |
| **Tarefa relacionada** | TASK-IDEIA-017 (conexão event-bus), TASK-IDEIA-034 (LLM real) |

### 1.4 pattern-detector (heurístico → LLM-based)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | Integrado em `memory-store` |
| **Pacote** | `packages/memory-store/src/` |
| **Status atual** | Esqueleto (lógica heurística simples, não isolado) |
| **Papel no IDEIA** | Detecção semântica de padrões via LLM; identifica padrões de código, decisões, erros recorrentes |
| **Mudanças necessárias** | Extrair para módulo próprio; substituir heurística por classificação LLM; fallback heurístico; SQLite |
| **Tecnologia alvo** | Provider Router (LLM), SQLite+FTS5 |
| **Contratos afetados** | `PatternDetector.detect()` — assinatura similar, impl LLM |
| **Dependências** | memory-store, local-ai (Provider Router) |
| **Prioridade** | 3 — Fase 2 |
| **Tarefa relacionada** | TASK-IDEIA-030 (LLM no Pattern Detector) |

### 1.5 learning-engine (heurístico → LLM-based)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | Integrado em `memory-store` |
| **Pacote** | `packages/memory-store/src/` |
| **Status atual** | Esqueleto (heurística simples) |
| **Papel no IDEIA** | Recomendações adaptativas via LLM baseadas em padrões detectados |
| **Mudanças necessárias** | Substituir lógica por LLM; conectar pattern-detector; fallback preservado |
| **Tecnologia alvo** | Provider Router, memory-store |
| **Contratos afetados** | `LearningEngine.recommend()` — retorno enriquecido |
| **Dependências** | pattern-detector (1.4), memory-store |
| **Prioridade** | 3 — Fase 2 |
| **Tarefa relacionada** | TASK-IDEIA-031 (LLM no Learning Engine) |

### 1.6 policy-engine (custom → Cedar)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `policy-engine` |
| **Pacote** | `packages/policy-engine/` |
| **Status atual** | Implementado (27 patterns regex, evaluatePolicy/evaluateBatch, 2 arquivos) |
| **Papel no IDEIA** | Avaliação de políticas com Cedar: policy-as-code formal; entidades, ações, contextos |
| **Mudanças necessárias** | Adicionar adapter Cedar WASM; manter fallback custom; integrar event-bus |
| **Tecnologia alvo** | Cedar (`@cedar-policy/cedar-wasm`), OPA/Rego como alternativa |
| **Contratos afetados** | `PolicyInput` muda de `{actionType, resource, riskLevel}` para `{principal, action, resource, context}` |
| **Dependências** | event-bus (TASK-IDEIA-022), agent-identity (entidades) |
| **Prioridade** | 4 — P1 essencial segurança |
| **Tarefa relacionada** | TASK-IDEIA-022 (conexão event-bus), TASK-IDEIA-037 (security middleware) |

### 1.7 agent-runtime (single → multi-agent)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `agent-runtime` |
| **Pacote** | `packages/agent-runtime/` |
| **Status atual** | Implementado (single agent, 2 arquivos) |
| **Papel no IDEIA** | Runtime multiagente: sub-agentes, delegação com attenuation, model routing, session management |
| **Mudanças necessárias** | Suporte a sub-agentes (delegação com attenuation); model routing (grande/pequeno); agent-registry |
| **Tecnologia alvo** | Provider Router (model routing), agent-registry (novo), LangGraph (opcional) |
| **Contratos afetados** | `AgentRuntime.execute()` — suporte a delegação; AgentSession estendido |
| **Dependências** | agent-identity, agent-registry (TASK-IDEIA-026), event-bus |
| **Prioridade** | 4 — Fase 3 |
| **Tarefa relacionada** | TASK-IDEIA-026, 042 (sub-agentes), 047 (model routing) |

### 1.8 agent-identity (RBAC → expandido)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `agent-identity` |
| **Pacote** | `packages/agent-identity/` |
| **Status atual** | Esqueleto (RBAC básico, 3 arquivos) |
| **Papel no IDEIA** | 6 papéis de agente (Analista, Arquiteto, Programador, Revisor, Testador, DevOps); SOP, ferramentas restritas |
| **Mudanças necessárias** | Definir 6 papéis com identidade, ferramentas, artefatos I/O, critérios qualidade; SOP por papel |
| **Tecnologia alvo** | JWT, RBAC, OAuth2 (futuro) |
| **Contratos afetados** | `AgentRole` (name, permissions, tools, sopPrompt); RoleAssignment |
| **Dependências** | agent-runtime, agent-registry |
| **Prioridade** | 4 — Fase 3 |
| **Tarefa relacionada** | TASK-IDEIA-041 (Agent Role Definitions) |

### 1.9 autonomous-editor (manter + expandir)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `autonomous-editor` |
| **Pacote** | `packages/autonomous-editor/` |
| **Status atual** | Implementado (3 arquivos: autonomous-editor.ts, index.ts, types.ts) |
| **Papel no IDEIA** | Edição autônoma com LSP integration, diff preview, safety checks, approval flow |
| **Mudanças necessárias** | Integrar LSP para validação pós-edição; expandir diff engine; segurança via policy-engine |
| **Tecnologia alvo** | LSP (Monaco providers), diff-engine (existente), policy-engine |
| **Contratos afetados** | `AutonomousEditor.edit()` — validação LSP pós-edição |
| **Dependências** | verification-layer, policy-engine, event-bus |
| **Prioridade** | 3 — melhorias contínuas |
| **Tarefa relacionada** | TASK-IDEIA-011 (Chat→Engineer) |

### 1.10 correction-oracle (manter + expandir)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `correction-oracle` |
| **Pacote** | `packages/correction-oracle/` |
| **Status atual** | Implementado (3 arquivos) |
| **Papel no IDEIA** | Correção autônoma pós-falha; integrado verification-layer + agente Revisor |
| **Mudanças necessárias** | Conectar verification-layer para correção automática; integrar event-bus |
| **Tecnologia alvo** | Provider Router (LLM sugestões), verification-layer |
| **Contratos afetados** | `CorrectionOracle.suggest()` — pipeline expandido |
| **Dependências** | verification-layer, event-bus, pattern-detector |
| **Prioridade** | 2 — Fase 3 |
| **Tarefa relacionada** | TASK-IDEIA-040 (Pipeline multiagente) |

### 1.11 verification-layer (manter + expandir)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `verification-layer` |
| **Pacote** | `packages/verification-layer/` |
| **Status atual** | Implementado (3 arquivos) |
| **Papel no IDEIA** | Quality gates: syntax→lint→typecheck→test→build→security; snapshots; self-heal |
| **Mudanças necessárias** | Pipeline 6 gates; snapshots por checkpoint; self-heal em falha; integração event-bus |
| **Tecnologia alvo** | GitHub Actions, Dagger (futuro), event-bus |
| **Contratos afetados** | `VerificationLayer.verify()` — pipeline multi-gate |
| **Dependências** | execution-layer, event-bus, correction-oracle |
| **Prioridade** | 3 — Fase 3 |
| **Tarefa relacionada** | TASK-IDEIA-013 (Quality Gates), 040 (Pipeline multiagente) |

### 1.12 workflow-engine (manter + conectar)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `workflow-engine` |
| **Pacote** | `packages/workflow-engine/` |
| **Status atual** | Implementado (3 arquivos) |
| **Papel no IDEIA** | Orquestração: emite cycle.started/completed, task.assigned/completed; consome requirement.created |
| **Mudanças necessárias** | Conectar event-bus; integrar agent-runtime para task assignment; ADAPT decomposition |
| **Tecnologia alvo** | event-bus (NATS), agent-runtime |
| **Contratos afetados** | `WorkflowEngine.start()` — fluxo orientado a eventos |
| **Dependências** | event-bus (TASK-IDEIA-019), agent-runtime |
| **Prioridade** | 4 — Fase 1 |
| **Tarefa relacionada** | TASK-IDEIA-019 (conexão event-bus), 033 (ADAPT) |

### 1.13 delivery-orchestrator (manter + GitOps)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `delivery-orchestrator` |
| **Pacote** | `packages/delivery-orchestrator/` |
| **Status atual** | Implementado (3 arquivos) |
| **Papel no IDEIA** | Entrega automatizada: GitOps (ArgoCD/Flux), IaC (OpenTofu), Progressive Delivery, Feature Flags |
| **Mudanças necessárias** | Gerador GitOps; gerador IaC; adapter feature flags; progressive delivery; AI-driven pipeline |
| **Tecnologia alvo** | ArgoCD, Flux, OpenTofu, Flagger, Unleash |
| **Contratos afetados** | `DeliveryOrchestrator.deploy()` — pipeline GitOps |
| **Dependências** | event-bus (TASK-IDEIA-018), verification-layer, workflow-engine |
| **Prioridade** | 3 — Fase 4 |
| **Tarefa relacionada** | TASK-IDEIA-018, 048-056 |

### 1.14 audit-trail (manter + hash chain)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `audit-trail` |
| **Pacote** | `packages/audit-trail/` |
| **Status atual** | Implementado (3 arquivos + pendencia-store.ts) |
| **Papel no IDEIA** | Ledger imutável com hash chain: cada entrada linkada hash(N-1); verify detecta violação |
| **Mudanças necessárias** | Hash chain SHA-256; comando `audit-trail verify`; integração event-bus |
| **Tecnologia alvo** | Node.js crypto (SHA-256), event-bus |
| **Contratos afetados** | `AuditEntry` — campos `hash`, `previousHash`, `signature` |
| **Dependências** | event-bus (consumidor), schema-registry |
| **Prioridade** | 4 — P1 Fase 1 |
| **Tarefa relacionada** | TASK-IDEIA-025 (Hash Chain) |

### 1.15 execution-layer (manter)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `execution-layer` |
| **Pacote** | `packages/execution-layer/` |
| **Status atual** | Implementado (3 arquivos) |
| **Papel no IDEIA** | Execução segura: sandbox, resource limits, timeout, isolation |
| **Mudanças necessárias** | Expandir sandbox (container-based); terminal-sandbox; policy enforcement |
| **Tecnologia alvo** | terminal-sandbox, Docker (opcional), policy-engine |
| **Contratos afetados** | `ExecutionLayer.execute()` — sandbox mode |
| **Dependências** | policy-engine, resilience-engine |
| **Prioridade** | 2 — manutenção |
| **Tarefa relacionada** | — |

### 1.16 resilience-engine (manter)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `resilience-engine` |
| **Pacote** | `packages/resilience-engine/` |
| **Status atual** | Implementado (3 arquivos) |
| **Papel no IDEIA** | Circuit breaker, retry, timeout, bulkhead |
| **Mudanças necessárias** | Conectar event-bus para notificações de falha; métricas p/ observability-engine |
| **Tecnologia alvo** | event-bus, observability-engine |
| **Contratos afetados** | `ResilienceEngine.config()` — eventos de estado |
| **Dependências** | observability-engine, event-bus |
| **Prioridade** | 2 — manutenção |
| **Tarefa relacionada** | — |

### 1.17 observability-engine (manter + OTel)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `observability-engine` |
| **Pacote** | `packages/observability-engine/` |
| **Status atual** | Implementado (telemetria custom, 3 arquivos) |
| **Papel no IDEIA** | Observabilidade OTel: traces, métricas, logs; LangFuse (custo LLM), Prometheus, Grafana |
| **Mudanças necessárias** | Substituir telemetria custom por SDK OTel; export OTLP; LangFuse tracing; dashboards |
| **Tecnologia alvo** | `@opentelemetry/sdk-node`, LangFuse, Prometheus, Grafana |
| **Contratos afetados** | `ObservabilityEngine.trace()` — interface OTel-native (quebra) |
| **Dependências** | trace-propagation, event-bus |
| **Prioridade** | 3 — P1 Fase 4 |
| **Tarefa relacionada** | TASK-IDEIA-053 (Observabilidade) |

### 1.18 economic-control (manter)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `economic-control` |
| **Pacote** | `packages/economic-control/` |
| **Status atual** | Implementado (3 arquivos) |
| **Papel no IDEIA** | Controle de custos LLM: budget tracking, token counting, cost attribution |
| **Mudanças necessárias** | Conectar LangFuse p/ custo real; integrar model routing |
| **Tecnologia alvo** | LangFuse (cost tracking), Provider Router |
| **Contratos afetados** | `EconomicControl.trackUsage()` — métricas enriquecidas |
| **Dependências** | observability-engine, agent-runtime |
| **Prioridade** | 2 — manutenção |
| **Tarefa relacionada** | TASK-IDEIA-047 (Model Routing) |

### 1.19 trusted-context (manter)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `trusted-context` |
| **Pacote** | `packages/trusted-context/` |
| **Status atual** | Implementado (3 arquivos) |
| **Papel no IDEIA** | Contexto confiável para decisões IA; proveniência e integridade |
| **Mudanças necessárias** | Integração audit-trail (hash chain) para verificação de integridade |
| **Tecnologia alvo** | audit-trail, schema-registry |
| **Contratos afetados** | `TrustedContext.verify()` — verificação hash |
| **Dependências** | audit-trail, schema-registry |
| **Prioridade** | 2 — manutenção |
| **Tarefa relacionada** | — |

### 1.20 persistent-instructions (manter)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `persistent-instructions` |
| **Pacote** | `packages/persistent-instructions/` |
| **Status atual** | Implementado (3 arquivos) |
| **Papel no IDEIA** | Instruções persistentes entre sessões; injetadas no contexto LLM |
| **Mudanças necessárias** | Persistência SQLite; versionamento de instruções |
| **Tecnologia alvo** | SQLite (memory-store) |
| **Contratos afetados** | `PersistentInstructions.getActive()` — consulta SQLite |
| **Dependências** | memory-store |
| **Prioridade** | 2 — melhoria |
| **Tarefa relacionada** | — |

### 1.21 requirements-engine (manter)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `requirements-engine` |
| **Pacote** | `packages/requirements-engine/` |
| **Status atual** | Implementado (3 arquivos) |
| **Papel no IDEIA** | Engenharia de requisitos assistida por IA; user stories, critérios de aceite |
| **Mudanças necessárias** | Conectar intent classifier + ADAPT decomposer; integrar workflow-engine |
| **Tecnologia alvo** | Provider Router (LLM), workflow-engine |
| **Contratos afetados** | `RequirementsEngine.generate()` — integração com plano |
| **Dependências** | workflow-engine, event-bus |
| **Prioridade** | 2 — melhoria |
| **Tarefa relacionada** | TASK-IDEIA-032 (Intent Classifier) |

### 1.22 violation-registry (manter)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `violation-registry` |
| **Pacote** | `packages/violation-registry/` |
| **Status atual** | Implementado (3 arquivos) |
| **Papel no IDEIA** | Registro central de violações de política, segurança e qualidade |
| **Mudanças necessárias** | Conectar audit-trail + policy-engine; notificações via event-bus |
| **Tecnologia alvo** | event-bus, audit-trail |
| **Contratos afetados** | `ViolationRegistry.report()` — evento emitido |
| **Dependências** | policy-engine, audit-trail, event-bus |
| **Prioridade** | 2 — melhoria |
| **Tarefa relacionada** | — |

### 1.23 trace-propagation (manter + LangFuse)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `trace-propagation` |
| **Pacote** | `packages/trace-propagation/` |
| **Status atual** | Implementado (3 arquivos) |
| **Papel no IDEIA** | Propagação W3C TraceContext; OpenTelemetry + LangFuse |
| **Mudanças necessárias** | Contexto OTel; export LangFuse; correlação event-bus |
| **Tecnologia alvo** | `@opentelemetry/api`, LangFuse SDK |
| **Contratos afetados** | `TracePropagation.inject()/extract()` — contexto enriquecido |
| **Dependências** | observability-engine, event-bus |
| **Prioridade** | 3 — P1 |
| **Tarefa relacionada** | TASK-IDEIA-053 (Observabilidade) |

### 1.24 trace-registry (manter)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `trace-registry` |
| **Pacote** | `packages/trace-registry/` |
| **Status atual** | Implementado (3 arquivos) |
| **Papel no IDEIA** | Grafo causal: requisito→PRD→código→teste→deploy |
| **Mudanças necessárias** | Conectar event-bus (TASK-IDEIA-021); construir grafo causal; consultas rastreabilidade |
| **Tecnologia alvo** | event-bus (NATS) |
| **Contratos afetados** | `TraceRegistry.query()` — consulta por grafo |
| **Dependências** | event-bus, memory-store |
| **Prioridade** | 3 — Fase 1 |
| **Tarefa relacionada** | TASK-IDEIA-021 (conexão event-bus) |

### 1.25 schema-registry (manter + NATS)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `schema-registry` |
| **Pacote** | `packages/schema-registry/` |
| **Status atual** | Implementado (3 arquivos) |
| **Papel no IDEIA** | Schemas versionados; validação automática de eventos; breaking changes detection |
| **Mudanças necessárias** | Finalizar; integrar event-bus p/ validação automática |
| **Tecnologia alvo** | event-bus (NATS), JSON Schema / Zod |
| **Contratos afetados** | `SchemaRegistry.validate()` — validação automática pub/sub |
| **Dependências** | event-bus (TASK-IDEIA-027), contracts |
| **Prioridade** | 4 — Fase 1 |
| **Tarefa relacionada** | TASK-IDEIA-027 (Schema Registry) |

### 1.26 contract-cdc (manter)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `contract-cdc` |
| **Pacote** | `packages/contract-cdc/` |
| **Status atual** | Implementado (3 arquivos) |
| **Papel no IDEIA** | Consumer-Driven Contracts: compatibilidade consumidores/provedores |
| **Mudanças necessárias** | Conectar schema-registry + event-bus |
| **Tecnologia alvo** | event-bus, schema-registry |
| **Contratos afetados** | `ContractCDC.validate()` — validação contra schemas |
| **Dependências** | schema-registry, event-bus |
| **Prioridade** | 2 — melhoria |
| **Tarefa relacionada** | — |

### 1.27 web-ui (adaptar para Theia)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `web-ui` |
| **Pacote** | `packages/web-ui/` |
| **Status atual** | Implementado (React 18 + Vite 5, Monaco Editor, terminal div) |
| **Papel no IDEIA** | Theia Platform shell + Monaco Editor + xterm.js + Chat + Dashboard |
| **Mudanças necessárias** | POC Theia; xterm.js+node-pty; chat+dashboard+status bar como widgets Theia; LSP |
| **Tecnologia alvo** | Theia Platform, Monaco Editor, xterm.js, React (widget Theia) |
| **Contratos afetados** | Toda UI refatorada para Theia extension/widget system |
| **Dependências** | cli (backend), event-bus (SSE), LSP |
| **Prioridade** | 4 — P0 |
| **Tarefa relacionada** | TASK-IDEIA-001 a 009, 046 (Theia), 052 (terminal) |

### 1.28 cli (manter + Theia)

| Campo | Valor |
|-------|-------|
| **Módulo atual** | `cli` |
| **Pacote** | `packages/cli/` |
| **Status atual** | Implementado (130+ comandos, 30+ subdiretórios) |
| **Papel no IDEIA** | Backend da IDE + API Router + MCP Server + Provider Router + Task Runner |
| **Mudanças necessárias** | Theia command wrapper; SSE streaming; chokidar file watcher; streaming providers |
| **Tecnologia alvo** | Theia Command API, SSE, chokidar, Provider Router |
| **Contratos afetados** | Comandos CLI → Theia commands (wrapper); API Router mantido |
| **Dependências** | Todos os pacotes |
| **Prioridade** | 5 — P0 |
| **Tarefa relacionada** | TASK-IDEIA-001 a 015 (Fase 0) |

---

## 2. Tabela de Compatibilidade Retroativa

| Funcionalidade ai-devkit | Compatível IDEIA? | Adaptação necessária | Risco |
|--------------------------|-------------------|---------------------|-------|
| Event Bus in-memory | Parcial | NATS adapter + fallback in-memory | Alto |
| Memory Store in-memory | Parcial | SQLite + DuckDB + Mem0; interface mantida | Médio |
| Pattern Detector heurístico | Sim (fallback) | LLM + fallback heurístico | Médio |
| Learning Engine heurístico | Sim (fallback) | LLM + fallback | Médio |
| Policy Engine custom (27 patterns) | Parcial (50%) | Cedar adapter + fallback; contratos mudam | Alto |
| Agent Runtime single | Não | Multi-agente + sub-agentes quebra compatibilidade | Alto |
| Agent Identity RBAC | Parcial | 6 papéis novos estendem | Baixo |
| Autonomous Editor | Sim | Melhorias incrementais | Baixo |
| Correction Oracle | Sim | Pipeline expandido | Baixo |
| Verification Layer | Sim | Pipeline multi-gate | Médio |
| Workflow Engine | Sim | Conexão event-bus aditiva | Baixo |
| Delivery Orchestrator | Sim | GitOps/IaC adicionam | Médio |
| Audit Trail | Sim | Hash chain aditiva | Baixo |
| Execution Layer | Sim | Sandbox expandido | Baixo |
| Resilience Engine | Sim | Conectividade event-bus | Baixo |
| Observability Engine | Parcial | OTel quebra interface atual | Alto |
| Economic Control | Sim | LangFuse aditivo | Baixo |
| Trusted Context | Sim | Melhorias incrementais | Baixo |
| Persistent Instructions | Sim | SQLite adiciona | Baixo |
| Requirements Engine | Sim | Conexão planner aditiva | Baixo |
| Violation Registry | Sim | Notificações event-bus | Baixo |
| Trace Propagation | Parcial | Contexto OTel expandido | Médio |
| Trace Registry | Sim | Grafo causal aditivo | Baixo |
| Schema Registry | Parcial | Validação automática | Médio |
| Contract CDC | Sim | Integração aditiva | Baixo |
| CLI Commands | Sim | Theia wrapper adiciona | Baixo |
| Web UI (React + Monaco) | Parcial | Theia shell + React widgets | Alto |
| MCP Tools (14 tools) | Sim | Mantido como está | Baixo |
| Provider Router (Ollama, OpenAI) | Sim | Streaming adicionado | Baixo |
| Prompt Security | Parcial | LLM Guard substitui regex; fallback | Alto |
| Projects (adapter-*) | Sim | Mantidos como adapters | Baixo |
| Diff Engine | Sim | Mantido | Baixo |

---

## 3. Estratégia de Migração

### Abordagem: Strangler Fig + Coexistência Gradual

**Recomendação: Strangler Fig** — cada módulo antigo é gradualmente envolvido pelo novo até que o antigo possa ser removido. Período de coexistência planejado de 12 semanas (Fases 0-2).

### Fases da Estratégia

| Fase | Ação | Duração | Coexistência |
|------|------|---------|-------------|
| **Pré-migração** | Auditoria dependências; baseline testes; snapshot contratos | 1 semana | 100% ai-devkit |
| **Fase 0** | Fundação: CLI backbone; web-ui melhorada; memory+chat; streaming | 4 semanas | 100% ai-devkit (adições) |
| **Fase 1** | Infra: NATS paralelo ao event-bus in-memory; módulos conectados via ambos | 4 semanas | 70/30 (ai-devkit/IDEIA) |
| **Fase 2** | Segurança+Inteligência: LLM-based + fallback heurístico | 4 semanas | 50/50 |
| **Fase 3** | Multiagente: novos agentes + runtime antigo p/ compatibilidade | 8 semanas | 30/70 |
| **Fase 4** | Entrega: GitOps/IaC novos; delivery antigo mantido | 8 semanas | 20/80 |
| **Fase 5** | Aprendizado: todos novos; sistema antigo desligado | 12 semanas | 0/100 |
| **Pós-migração** | Remoção código legado; validação final; docs | 2 semanas | 100% IDEIA |

### Decisões Arquiteturais

1. **NATS adaptado, não substituído imediatamente**: EventBus existente recebe `NatsAdapter` opcional. Se NATS offline, fallback in-memory. Zero downtime.
2. **LLM com fallback heurístico**: Todo módulo que migra mantém fallback. Se LLM falha (timeout/erro/custo), volta ao comportamento antigo.
3. **Theia como shell, web-ui como widget**: web-ui (React + Monaco) empacotada como widget Theia. Sem reescrever toda UI.
4. **Cedar coexiste com policy custom**: policy-engine recebe adapter Cedar; se indisponível, engine custom opera.

### Validação Pós-Migração

1. **Regressão**: Suite completa ai-devkit passa 100%
2. **Contrato**: Contract-CDC verifica compatibilidade entre versões
3. **Observação**: 2 semanas ambos sistemas rodando; comparar métricas
4. **Quality gates**: `ai-devkit verify` + novos gates IDEIA
5. **Auditoria**: Hash chain verifica integridade dados migrados

---

## 4. Dependências entre Migrações

### Grafo de Dependências

```
FASE 0 (Semanas 1-4)
├── cli (backbone, API router, SSE streaming)
│   └── contracts (tipos compartilhados)
├── web-ui (chat, file explorer, dashboard, status bar, quick open)
├── local-ai (provider router + streaming)
│   └── memory-store (context builder)
├── memory-store (chat context integration)
└── autonomous-editor (chat→engineer pipeline)

FASE 1 (Semanas 5-8) ← REQUER FASE 0
├── event-bus (NATS JetStream) ← REQUER contracts, schema-registry
│   ├── feedback-pipeline ──────────────────┐
│   ├── delivery-orchestrator ──────────────┤
│   ├── workflow-engine ────────────────────┤ REQUER event-bus
│   ├── memory-store ───────────────────────┘
│   ├── trace-registry ────────────────────┐
│   ├── policy-engine ─────────────────────┤
│   └── agent-registry (novo) ────────────┘
├── audit-trail (hash chain)
├── schema-registry ← REQUER event-bus
└── agent-identity (expandido)

FASE 2 (Semanas 9-12) ← REQUER FASE 0-1
├── prompt-security (LLM Guard) ← REQUER local-ai
│   └── security-middleware
├── memory-store/pattern-detector (LLM) ← REQUER local-ai
├── memory-store/learning-engine (LLM) ← REQUER pattern-detector
├── cli/planner (intent classifier, ADAPT) ← REQUER local-ai
├── feedback-pipeline (LLM) ← REQUER local-ai
├── cognitive-coprocessor ← REQUER planner
└── policy-engine → Cedar ← REQUER event-bus (paralelo)

FASE 3 (Semanas 13-20) ← REQUER FASE 0-2
├── agent-collaboration (novo) ← REQUER event-bus
│   ├── message pool
│   ├── orchestrator (supervisor + DAG)
│   ├── pipeline 6 agentes
│   ├── debate (MAD)
│   ├── certified repository
│   └── LangGraph adapter
├── agent-runtime (sub-agentes) ← REQUER agent-identity
├── agent-registry (ampliado)
├── autonomous-editor (expandido) ← REQUER verification-layer
├── correction-oracle (expandido) ← REQUER verification-layer
├── verification-layer (expandido) ← REQUER execution-layer
├── model routing ← REQUER local-ai
└── Theia POC ← REQUER web-ui

FASE 4 (Semanas 21-28) ← REQUER FASE 0-3
├── delivery-orchestrator (GitOps, IaC) ← REQUER event-bus
├── terminal (xterm.js + node-pty) ← REQUER web-ui
├── observability-engine (OTel, LangFuse) ← REQUER event-bus
└── feature flags + progressive delivery ← REQUER delivery-orchestrator

FASE 5 (Semanas 29-40) ← REQUER FASE 0-4
├── memory-store/reflection ← REQUER local-ai
├── memory-store/cross-project ← REQUER pattern-detector, learning-engine
├── memory-store/knowledge-graph ← REQUER memory-store
├── memory-store/fine-tuning ← REQUER feedback-pipeline
├── cli/analytics (DuckDB) ← REQUER memory-store
├── adaptive-autonomy ← REQUER cross-project
└── semantic caching ← REQUER local-ai, memory-store
```

### Path Crítico

```
contracts → cli + web-ui + local-ai → event-bus → agent-collaboration → delivery-orchestrator
```

Qualquer atraso em contracts, event-bus ou agent-collaboration impacta todas as fases seguintes.

---

## 5. Risco por Módulo

### Matriz de Risco

| Módulo | Risco Técnico | Risco Regressão | Risco Compatibilidade | Risco Total |
|--------|:------------:|:--------------:|:--------------------:|:----------:|
| event-bus → NATS | Alto | Alto | Alto | **Crítico** |
| memory-store → SQLite | Médio | Médio | Baixo | **Médio** |
| pattern-detector → LLM | Médio | Médio | Baixo | **Médio** |
| learning-engine → LLM | Médio | Médio | Baixo | **Médio** |
| policy-engine → Cedar | Alto | Alto | Médio | **Alto** |
| agent-runtime → multi | Alto | Alto | Alto | **Crítico** |
| agent-identity → 6 papéis | Baixo | Baixo | Baixo | **Baixo** |
| autonomous-editor | Baixo | Baixo | Baixo | **Baixo** |
| correction-oracle | Médio | Baixo | Baixo | **Baixo** |
| verification-layer | Médio | Médio | Baixo | **Médio** |
| workflow-engine | Baixo | Baixo | Baixo | **Baixo** |
| delivery-orchestrator | Alto | Médio | Médio | **Alto** |
| audit-trail → hash chain | Médio | Médio | Baixo | **Médio** |
| execution-layer | Baixo | Médio | Baixo | **Baixo** |
| resilience-engine | Baixo | Baixo | Baixo | **Baixo** |
| observability-engine → OTel | Alto | Alto | Alto | **Crítico** |
| economic-control | Baixo | Baixo | Baixo | **Baixo** |
| trusted-context | Baixo | Baixo | Baixo | **Baixo** |
| persistent-instructions | Baixo | Baixo | Baixo | **Baixo** |
| requirements-engine | Baixo | Baixo | Baixo | **Baixo** |
| violation-registry | Baixo | Baixo | Baixo | **Baixo** |
| trace-propagation → OTel | Médio | Médio | Médio | **Médio** |
| trace-registry | Baixo | Baixo | Baixo | **Baixo** |
| schema-registry | Médio | Médio | Médio | **Médio** |
| contract-cdc | Baixo | Baixo | Baixo | **Baixo** |
| web-ui → Theia | Alto | Alto | Alto | **Crítico** |
| cli → Theia wrapper | Médio | Médio | Baixo | **Médio** |

### Riscos por Categoria

| Risco | Prob. | Impacto | Mitigação |
|-------|:----:|:-------:|-----------|
| NATS JetStream complexo configurar | Alta | Alto | Docker Compose; fallback in-memory; POC pré-Fase 1 |
| Pipeline multiagente não converge | Média | Alto | LangGraph adapter; timeout; HITL saída emergência |
| Theia integration custo inviável | Média | Alto | POC Semana 12; web-ui mantida como fallback |
| OTel quebra observabilidade existente | Alta | Alto | Adaptador OTel + backend custom paralelo; migração gradual |
| LLM Guard detection rate baixo | Alta | Alto | Benchmark PINT; fallback regex; ensemble 2+ scanners |
| Cedar policy complexidade | Média | Alto | Fallback custom; políticas simples primeiro |
| Cross-project viola privacidade | Baixa | Alto | Namespaces estritos; opt-in; padrões anonimizados |
| Fine-tuning não melhora | Alta | Médio | Baseline antes; LoRA por projeto; fallback sem fine-tune |

---

## 6. Cronograma Consolidado

| Fase | Módulos Migrados | Semanas | Tarefas |
|:----:|-----------------|:-------:|:-------:|
| **0** | cli, web-ui, local-ai, memory-store, autonomous-editor | 1-4 | 15 técnicas + 4 QA |
| **1** | event-bus, audit-trail, schema-registry, agent-registry + 6 conexões | 5-8 | 12 técnicas + 4 QA |
| **2** | prompt-security, pattern-detector, learning-engine, feedback-pipeline, planner, coprocessor, policy-engine | 9-12 | 10 técnicas + 4 QA |
| **3** | agent-collaboration, agent-runtime, agent-identity, verification, correction, debate, LangGraph, Theia | 13-20 | 10 técnicas + 3 QA |
| **4** | delivery-orchestrator, observability, trace-propagation, terminal, feature flags | 21-28 | 9 técnicas + 3 QA |
| **5** | reflection, cross-project, knowledge-graph, fine-tuning, DuckDB, adaptive autonomy, semantic cache | 29-40 | 11 técnicas + 2 QA |

**Total: 67 tarefas técnicas + 22 QA = 110 tarefas · 40 semanas**

---

> **Documento gerado em:** 2026-07-17
> **Próximo passo:** Iniciar Fase 0 (TASK-IDEIA-001 a 015)
