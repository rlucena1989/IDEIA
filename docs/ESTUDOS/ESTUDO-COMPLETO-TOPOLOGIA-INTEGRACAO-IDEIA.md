# Estudo Topologia de Integração & Empilhamento IDEIA

> **Tipo:** `study`
> **Status:** `draft`
> **Data:** 2026-07-18
> **Propósito:** Mapear COMPLETAMENTE toda a topologia de integração da IDEIA — cada pacote, cada interface, cada evento, cada fluxo, cada contrato, cada combinação possível. Serve como mapa definitivo para IAs e desenvolvedores entenderem como tudo se conecta.

---

## 1. Topologia de Pacotes (66 Packages)

### 1.1 Mapa de Dependências entre Packages

```
CONTRACTS ──┬── LOGGER ──┬── EVENT-BUS ──┬── AUDIT-TRAIL
            │            │               ├── POLICY-ENGINE
            │            │               ├── MEMORY-STORE
            │            │               ├── FEEDBACK-PIPELINE
            │            │               └── TRACE-REGISTRY
            │            │
            ├── POLICY-ENGINE ──┬── POLICY-GATEWAY ──┬── SECURITY-MIDDLEWARE
            │                   │                    └── PROMPT-SECURITY
            │                   └── AGENT-RUNTIME
            │
            ├── AGENT-RUNTIME ──┬── MCP
            │                   ├── AGENT-IDENTITY
            │                   ├── WORKFLOW-ENGINE
            │                   └── AUTONOMOUS-EDITOR
            │
            ├── LLM-PROVIDER ──┬── MEMORY-STORE
            │                  └── PROMPT-SECURITY
            │
            ├── MEMORY-STORE ──┬── VECTOR-STORE
            │                  ├── DATA-LAYER
            │                  └── AUDIT-TRAIL
            │
            ├── WORKFLOW-ENGINE ──┬── DELIVERY-ORCHESTRATOR
            │                     └── FEEDBACK-PIPELINE
            │
            ├── CLI ──┬── REALITY-SYNC
            │         ├── IDE-SERVER (LSP, DAP, PTY, Chat, FileBridge)
            │         ├── WEB-UI
            │         └── 13 ADAPTERS (polyglot)
            │
            ├── AUTONOMOUS-EDITOR ──┬── DIFF-ENGINE
            │                       └── VERIFICATION-LAYER
            │
            ├── OBSERVABILITY-ENGINE ──┬── TRACE-PROPAGATION
            │                          └── ECONOMIC-CONTROL
            │
            ├── EXECUTION-LAYER ──┬── RESILIENCE-ENGINE
            │                     └── TERMINAL-SANDBOX
            │
            ├── TRACE-REGISTRY ──┬── TRACE-PROPAGATION
            │                    └── FEEDBACK-PIPELINE
            │
            ├── 13 ADAPTERS (independentes)
            ├── 4 FUNCIONAIS (init, audit, docs, requirements...)
            └── 2 UI (web-ui, a11y-scanner)
```

### 1.2 Tráfego por Tipo de Conexão

| Tipo | Protocolo/Formato | Onde é usado | Latência esperada |
|------|-------------------|--------------|-------------------|
| **JSON-RPC 2.0** | WebSocket | Theia frontend↔backend, LSP | <10ms |
| **REST/HTTP** | HTTP 1.1/2 | API endpoints, LLM providers | <100ms (local), <2s (externo) |
| **Event Bus** | In-memory / NATS | Pub/sub entre todos os packages | <1ms (mem), <5ms (NATS) |
| **SSE Streaming** | HTTP + text/event-stream | Chat, agent actions | <50ms (first byte) |
| **WebSocket** | WS full-duplex | PTY terminal, file watcher, LSP, DAP | <5ms |
| **stdio** | Pipe | LSP bridge, DAP bridge, MCP tools | <1ms |
| **File I/O** | fs (read/write) | MemoryStore, AuditTrail, AutonomousEditor | <1ms (SSD) |
| **SQL** | SQLite, DuckDB, PostgreSQL | DataLayer, MemoryStore analytics | <10ms (local), <50ms (PG) |
| **CLI** | stdin/stdout | 130+ comandos ai-devkit | <500ms |
| **Git** | execFile | diff-engine, delivery-orchestrator | <100ms |
| **YAML/JSON** | Parse/stringify | PolicyEngine, SchemaRegistry, Configs | <5ms |

---

## 2. Matriz de Integração (66×66)

### 2.1 Conexões Críticas (devem existir sempre)

| Origem | Destino | Contrato | Tráfego | Prioridade |
|--------|---------|----------|---------|------------|
| CLI | PolicyEngine | `evaluatePolicy(input)` | Request/Reply | P0 |
| CLI | EventBus | `eventBus.emit()` / `subscribe()` | Pub/Sub | P0 |
| AgentRuntime | LLMProvider | `provider.chat(messages)` | Stream | P0 |
| AgentRuntime | MemoryStore | `store.search()` / `store.append()` | Request/Reply | P0 |
| AgentRuntime | PolicyEngine | `evaluatePolicy()` | Request/Reply | P0 |
| AgentRuntime | AuditTrail | `auditTrail.append()` | Append | P0 |
| WorkflowEngine | DeliveryOrch | `createRelease()` / `deploy()` | Request/Reply | P0 |
| WorkflowEngine | EventBus | `workflow.completed` | Event | P0 |
| EventBus | AuditTrail | `auditTrail.append()` | Append | P0 |
| EventBus | MemoryStore | `store.pushDecision()` | Append | P0 |
| IDE-Server | LSP-Bridge | JSON-RPC 2.0 over WebSocket | Stream | P0 |
| IDE-Server | DAP-Bridge | JSON-RPC 2.0 over WebSocket | Stream | P0 |
| IDE-Server | FileBridge | chokidar events → WebSocket | Event | P0 |
| RealitySync | Manifest/Sync | `syncManifest()` / `syncGaps()` | File I/O | P0 |
| InitiativeEngine | FS | `file:create/write/delete` | File I/O | P0 |
| AutonomousEditor | DiffEngine | `diffLines()` / `deepDiff()` | Request/Reply | P1 |
| Observability | TracePropagation | W3C TraceContext | Header propagation | P1 |
| EconomicControl | Observability | Cost records | Append | P1 |
| CorrectionOracle | AutonomousEditor | Fix suggestions | Request/Reply | P2 |

### 2.2 Conexões por Eventos (16 tipos)

| Evento | Publisher | Subscribers (esperados) | Subscribers (reais) |
|--------|-----------|------------------------|---------------------|
| `policy.evaluated` | AgentRuntime | AuditTrail, MemoryStore, EventBus | AuditTrail ✅ |
| `policy.violated` | AgentRuntime | AuditTrail, SecurityMiddleware | AuditTrail ✅ |
| `policy.ask` | AgentRuntime | Chat UI, Approval Flow | Chat UI ✅ |
| `policy.executed` | AgentRuntime | AuditTrail, MemoryStore | AuditTrail ✅ |
| `cycle.completed` | AutonomousEngine | MemoryStore, FeedbackPipeline | MemoryStore ✅ |
| `feedback.submitted` | FeedbackPipeline | MemoryStore, LearningEngine | MemoryStore ✅ |
| `task.created` | WorkflowEngine | TraceRegistry, AgentRuntime | TraceRegistry ✅ |
| `trace.linked` | TraceRegistry | ObservabilityEngine | Observability ✅ |
| `workflow.completed` | WorkflowEngine | DeliveryOrchestrator, AuditTrail | DeliveryOrch ✅ |
| `agent.action` | AgentRuntime | AuditTrail | AuditTrail ✅ |
| `file:change` | FileBridge | WebSocket clients | WebSocket ✅ |
| `terminal:execution` | TerminalBridge | WebSocket clients | WebSocket ✅ |
| `memory:update` | MemoryStore | WebSocket, Chat | — ❌ |
| `session:created` | IDE Server | Observability, MemoryStore | — ❌ |
| `self.scan.complete` | InitiativeEngine | Self-Panel | — ❌ (S23) |
| `project.scan.complete` | ProjectScanner | Project-Panel | — ❌ (S23) |

### 2.3 Conexões CLI (130+ comandos → packages)

| Grupo de Comandos | Package Alvo | Total | Exemplos |
|------------------|-------------|-------|----------|
| **Core** | AgentRuntime, PolicyEngine | 25 | `verify`, `audit`, `compliance`, `security` |
| **AI/LLM** | LLMProvider, PromptSecurity | 12 | `ai`, `prompt`, `rag`, `engineer` |
| **IDE** | IDE-Server (LSP, DAP, PTY, File) | 8 | `ide`, `preview`, `mcp` |
| **Delivery** | DeliveryOrchestrator, WorkflowEngine | 15 | `release`, `pipeline`, `deploy` |
| **Data/Memory** | MemoryStore, AuditTrail | 12 | `memory`, `trace`, `knowledge` |
| **Evolution** | AutonomousEditor, EvolutionEngine | 18 | `evolve`, `adapt`, `optimize`, `recover` |
| **Governance** | PolicyEngine, ArchitectureADR | 15 | `policy`, `governance`, `scorecard` |
| **Polyglot** | 13 Adapters | 5 | `adapter`, `detect`, `init` |
| **Sync** | RealitySync | 5 | `reality-sync` (start/sync/scan/heal/config) |

---

## 3. Contratos Cross-Layer (18 Contratos C1-C18)

### 3.1 Status de Implementação

| ID | Contrato | Origem → Destino | Status | Resiliência |
|----|----------|-------------------|--------|-------------|
| C1 | JSON-RPC Frontend↔Backend | Theia ↔ Server | 🟡 Partial | CB+BH+RT |
| C2 | Chat SSE Streaming | ChatService ↔ Client | ✅ Feito | RT+Fallback |
| C3 | Agent Action Streaming | AgentRuntime ↔ UI | ✅ Feito | CB+BH+RT+FL |
| C4 | RAG Pipeline | MemoryStore ↔ LLM | 🟡 Partial | RT+CB |
| C5 | LSP Protocol | Monaco ↔ LspBridge | ✅ Feito | RT+CB |
| C6 | DAP Protocol | Monaco ↔ DapBridge | ✅ Feito | RT+CB |
| C7 | PTY Terminal | xterm.js ↔ node-pty | ✅ Feito | RT+FL |
| C8 | Audit Trail | Todos → AuditTrail | ✅ Feito | CB+BH+RT+FL |
| C9 | Policy Engine | Todos → PolicyEngine | ✅ Feito | CB+BH+RT |
| C10 | Memory Store | Agentes → MemoryStore | 🟡 Partial | RT+CB |
| C11 | Event Bus | Todos ↔ EventBus | ✅ Feito | CB+BH+RT+DLQ |
| C12 | File Watching | FileBridge → WebSocket | ✅ Feito | RT+FL |
| C13 | CI/CD Pipeline | Workflow → Delivery | ✅ Feito | CB+BH+RT |
| C14 | DuckDB ↔ SQLite | DataLayer ↔ Memory | 🟡 Partial | RT+CB |
| C15 | Provider Router | CLI → LLMs | ✅ Feito | RT+CB+FL |
| C16 | Schema Registry | Packages ↔ Registry | 🔴 Não feito | — |
| C17 | Contract Testing (CDC) | Provider ↔ Consumer | 🔴 Não feito | — |
| C18 | SLO Monitoring | Todos → Observability | 🔴 Não feito | — |

### 3.2 Padrões de Resiliência por Contrato

| Sigla | Padrão | Implementado em |
|-------|--------|-----------------|
| **CB** | Circuit Breaker | ExecutionLayer (full), PolicyGateway (parcial) |
| **BH** | Bulkhead | ResilienceEngine (full) |
| **RT** | Retry (exponential backoff) | ExecutionLayer (full) |
| **FL** | Fallback (cache, stale, degraded) | ResilienceEngine (full) |
| **DLQ** | Dead Letter Queue | EventBus (full) |
| **SG** | Saga | EventBus (full) |
| **OT** | Outbox | EventBus (full) |
| **TO** | Timeout | Em todos os HTTP/WS clients |

---

## 4. Fluxos de Dados Completos

### 4.1 Fluxo: Chat → Agente → Ação

```
User → Web UI (chat)
  → IDE Server (SSE /api/chat/completions)
    → ChatBridge
      → AgentRuntime.run(request)
        → PolicyEngine.evaluatePolicy(action) [classifica: auto/ask/block]
        → MemoryStore.load() [contexto]
        → LLMProvider.chat(messages) [streaming]
          → SSE events: {delta, tool_call, checkpoint, done}
            → parseToolCalls() → executeToolCall()
              → FileSystemStepExecutor.read/write/delete/run
            → parseCheckpoints() → approveCheckpoint()
              → PolicyEngine.evaluatePolicy(change)
              → validateChanges() (output-validation)
              → TaskRunner.applyChanges()
        → MemoryStore.pushDecision() [aprendizado]
        → AuditTrail.append() [rastreabilidade]
```

### 4.2 Fluxo: Código → LSP → Diagnóstico → Memória

```
File change (chokidar)
  → Monaco Editor (textDocument/didChange)
    → LspClient (WebSocket)
      → LspBridge (JSON-RPC 2.0)
        → typescript-language-server (stdio)
          → textDocument/publishDiagnostics
            → LspBridge → WebSocket → Monaco
              → setModelMarkers() [inline diagnostics]
                → (futuro: MemoryStore.store(diagnostic))
                  → (futuro: PatternDetector.detect(issue patterns))
```

### 4.3 Fluxo: Workflow → Quality Gates → Deploy

```
WorkflowEngine.start(workflow)
  → Step execution (DAG ordenado)
  → WorkflowEngine.complete(workflow)
    → DeliveryIntegration.completeWorkflowWithDelivery()
      → Quality Gates (lint, test, build, security, architecture)
        → DeliveryOrchestrator.createRelease(version, env, artifacts)
          → DeliveryOrchestrator.deploy(version, env, artifacts)
            → (futuro: DeployExecutor real)
              → EventBus.emit('workflow.completed')
                → AuditTrail.append()
```

### 4.4 Fluxo: Scan → Detectar → Corrigir → Verificar (Initiative)

```
InitiativeEngine.runCycle()
  → scanAll() [15 scanners]
    → scanMissingVersions(), scanMissingLicense(), scanEnvTracked()...
  → canAutoFix() [policy check]
  → executePlan(plan)
    → applyFix(file:create/write/delete/shell:exec/config:update)
  → scanAll() [verificação]
  → emit('initiative:cycle') → RealitySyncDaemon
    → syncManifest() + syncGaps() + syncRegistry()
```

### 4.5 Fluxo: IDE Server → Múltiplos WebSockets

```
ide-server.ts (porta 3001)
  ├── /ws → EventBus broadcast (file:change, terminal:execution)
  ├── /lsp → LspBridge → typescript-language-server
  ├── /dap → DapBridge → Node.js debugger
  ├── /pty → TerminalBridge → node-pty (shell)
  ├── /api/* → ApiRouter (30+ REST endpoints)
  └── /api/chat/completions → ChatBridge → SSE streaming
```

---

## 5. Tecnologias com Gap de Integração

### 5.1 Não implementadas mas com score ≥ 3.5 (prioritárias)

| Tecnologia | Score | Onde se encaixa | Contrato |
|-----------|-------|-----------------|----------|
| **NATS JetStream (produção)** | 4.7 | Substituir EventBus in-memory | C11 |
| **Tree-sitter** | 4.5 | Parsing de código para LSP/context | C5 |
| **PostgreSQL + pgvector** | 4.2 | Memória persistente + busca vetorial | C10, C4 |
| **Neo4j (Knowledge Graph)** | 4.0 | Relações entre artefatos | C10 |
| **Redis (cache + sessão)** | 3.8 | Cache de contexto, sessões | C10 |
| **Mem0 / Zep** | 3.7 | Memória gerenciada cross-sessão | C10 |
| **OpenRouter (fallback)** | 3.7 | Provider Router multi-provedor | C15 |
| **OPA/Cedar (policy)** | 3.5 | Policy-as-code estruturado | C9 |

### 5.2 Contratos não implementados (C16, C17, C18)

| Contrato | Descrição | Esforço | Impacto |
|----------|-----------|---------|---------|
| **C16 — Schema Registry** | Versionamento de schemas, detecção de breaking changes, compatibilidade | 2 sem | Alto — base para C17 |
| **C17 — Contract Testing (CDC)** | Pact CDC entre packages, verificação automática em PRs | 3 sem | Alto — qualidade de integração |
| **C18 — SLO Monitoring** | Métricas de latência, disponibilidade, throughput por contrato | 2 sem | Médio — observabilidade |

### 5.3 Eventos não conectados (gaps)

| Evento | Publisher | Deveria conectar | Benefício |
|--------|-----------|-----------------|-----------|
| `memory:update` | MemoryStore | WebSocket, Chat | UI reage a mudanças de memória |
| `session:created` | IDE Server | Observability, MemoryStore | Rastreamento de sessão |
| `self.scan.complete` | InitiativeEngine | Self-Panel | Painel atualiza em tempo real |
| `project.scan.complete` | ProjectScanner | Project-Panel | Painel do projeto atualiza |

---

## 6. Stacking Profiles (Combinações Completas)

### Profile 1: Solo Dev (Mínimo Viável)

```
React/Vite UI → CLI → Ollama (local) → SQLite → EventBus (mem) → File System
```
- **Latência:** <50ms médio
- **Setup:** 5 minutos
- **Custo:** $0/mês
- **Pacotes:** 15 core (ignora NATS, PG, Redis, 13 adapters)

### Profile 2: Startup (Produto)

```
Web UI + Electron → CLI → Ollama + OpenAI → SQLite + DuckDB → NATS (single node) → File System + S3
```
- **Latência:** <100ms local, <2s LLM
- **Setup:** 30 minutos
- **Custo:** ~$50/mês (OpenAI API)
- **Pacotes:** 35 core + 5 adapters

### Profile 3: Enterprise (Escala)

```
Theia + Web UI + Desktop → CLI → Ollama + OpenAI + Anthropic → PostgreSQL + pgvector + Redis + DuckDB + Neo4j → NATS Cluster (3 nós) → MinIO → K8s
```
- **Latência:** ~200ms médio
- **Setup:** 2 dias
- **Custo:** ~$500-2000/mês
- **Pacotes:** 66 (todos)

### Profile 4: Multiagente Autônomo

```
Profile 3 + LangGraph + CrewAI + A2A + MCP + Self-Panel + Technology Radar + Auto-ADR
```
- **Autonomia:** Nível 4 (total)
- **Setup:** 1 semana
- **Custo:** ~$2000-5000/mês
- **Nota:** Perfil do S23 — a IDEIA evolui a si mesma

---

## 7. Matriz de Contratos por Perfil

| Contrato | Solo | Startup | Enterprise | Multiagente |
|----------|------|---------|------------|-------------|
| C1 JSON-RPC | — | — | ✅ | ✅ |
| C2 Chat SSE | ✅ | ✅ | ✅ | ✅ |
| C3 Agent Stream | ✅ | ✅ | ✅ | ✅ |
| C4 RAG Pipeline | 🟡 SQLite | ✅ DuckDB | ✅ PG+vec | ✅ PG+vec+KG |
| C5 LSP | ✅ | ✅ | ✅ | ✅ |
| C6 DAP | ✅ | ✅ | ✅ | ✅ |
| C7 PTY | ✅ | ✅ | ✅ | ✅ |
| C8 Audit | 🟡 JSONL | ✅ JSONL+Hash | ✅ +NATS | ✅ +NATS |
| C9 Policy | 🟡 YAML | ✅ YAML | ✅ +OPA | ✅ +OPA |
| C10 Memory | 🟡 JSON | ✅ SQLite | ✅ PG+Redis | ✅ +Neo4j+Mem0 |
| C11 Event Bus | 🟡 Mem | ✅ Mem | ✅ NATS | ✅ NATS Cluster |
| C12 File Watch | ✅ | ✅ | ✅ | ✅ |
| C13 CI/CD | — | ✅ GH Actions | ✅ +ArgoCD | ✅ +Dagger |
| C14 DuckDB/SQLite | — | ✅ | ✅ | ✅ |
| C15 Provider | 🟡 Ollama | ✅ Ollama+OpenAI | ✅ 3 providers | ✅ 5+ providers |
| C16 Schema Registry | — | — | 🟡 | ✅ |
| C17 Contract Testing | — | — | 🟡 | ✅ |
| C18 SLO Monitoring | — | — | 🟡 | ✅ |

---

## 8. Oportunidades de Melhoria (Adicionar à Esteira)

### 8.1 Tecnologias com score ≥ 3.5 (do Technology Radar)

| Tecnologia | Score | Prioridade | Contrato Afetado | Esforço |
|-----------|-------|------------|------------------|---------|
| **Tree-sitter** | 4.5 | P0 | C5 (LSP) | 2-3 sem |
| **PostgreSQL + pgvector** | 4.2 | P0 | C4, C10 | 2 sem |
| **Schema Registry (C16)** | 4.0 | P0 | C16 | 2 sem |
| **Contract Testing (C17)** | 3.8 | P1 | C17 | 3 sem |
| **Redis** | 3.8 | P1 | C10 | 1 sem |
| **SLO Monitoring (C18)** | 3.7 | P1 | C18 | 2 sem |
| **Mem0** | 3.7 | P1 | C10 | 2 sem |
| **OPA/Cedar** | 3.5 | P2 | C9 | 2 sem |
| **OpenRouter** | 3.7 | P2 | C15 | 1 sem |
| **NATS (produção)** | 4.7 | P0 | C11 | 1 sem |

### 8.2 Integrações que conectariam gaps atuais

| Gap | Solução | Contrato | Esforço |
|-----|---------|----------|---------|
| `memory:update` não notifica UI | MemoryStore emitir evento `memory:update` via EventBus | C11 | 2h |
| `session:created` não rastreado | IDE Server emitir `session:created` | C11 | 1h |
| LSP diagnostics → MemoryStore | Listener no EventBus para `textDocument/publishDiagnostics` | C5 + C10 | 4h |
| DAP breakpoints → persistir | MemoryStore salvar breakpoints entre sessões | C6 + C10 | 4h |
| Chat decisions → PatternDetector | FeedbackPipeline alimentar PatternDetector | C2 + C10 | 8h |
| Auto-fix → Auto-ADR | InitiativeEngine gerar ADR após cada fix | S23 | 1 sem |
| Project scanner → Project Panel | ProactiveInitiativeEngine conectar ao web-ui | S23 | 2 sem |

### 8.3 Contratos novos recomendados

| ID | Contrato | Descrição | Prioridade |
|----|----------|-----------|------------|
| C19 | **Self ↔ Project Isolation** | PathValidator, scope enforcement, cross-scope audit | P0 ⛔ |
| C20 | **Auto-ADR Format** | Geração automática de ADRs para decisões autônomas | P1 |
| C21 | **Initiative Feedback** | Resultados de auto-fix → FeedbackPipeline → melhoria contínua | P2 |
| C22 | **Technology Radar API** | Scanner de GitHub/npm/papers → Matriz → Recomendação | P1 |
| C23 | **Self-Chat Protocol** | Chat sobre a própria IDEIA (contexto especial) | P1 |

---

## 9. Tráfego por Camada (Estimativas para Perfil Enterprise)

| Camada | Tráfego/dia | Pico | Storage | 
|--------|-------------|------|---------|
| Event Bus (NATS) | 1M+ msgs | 500/s | 500MB/dia (log) |
| LSP (diagnósticos) | 50K requests | 100/s | — |
| DAP (debug) | 1K sessões | 50/s | 100MB/sessão (mem) |
| PTY (terminal) | 500 sessões | 30/s | — |
| Chat/LLM | 10K msgs | 50/s | 1M tokens/h |
| Audit Trail | 100K eventos | 200/s | 50MB/dia |
| Memory Store | 50K ops | 100/s | 200MB/dia |
| File Watching | 10K eventos | 200/s | — |
| HTTP API | 100K requests | 300/s | — |
| CLI | 5K execuções | 50/s | — |

---

## 10. Plano de Ação (Ordem Recomendada)

### Fase 0 — Essencial (1-2 semanas)
1. Conectar `memory:update` + `session:created` eventos
2. Schema Registry (C16) — base para todos os outros contratos
3. Self/Project Isolation (C19) — segurança

### Fase 1 — Qualidade (2-3 semanas)
4. Contract Testing (C17) — Pact CDC entre packages core
5. SLO Monitoring (C18) — métricas por contrato
6. Conectar LSP diagnostics → MemoryStore

### Fase 2 — Performance (2-3 semanas)
7. PostgreSQL + pgvector (C4, C10)
8. Redis cache (C10)
9. NATS produção (C11)

### Fase 3 — Autonomia (4-6 semanas)
10. Tree-sitter (C5)
11. OPA/Cedar (C9)
12. Mem0 (C10)
13. Technology Radar API (C22)
14. Self-Chat Protocol (C23)
15. Auto-ADR Format (C20)

---

---

## 11. Intensificação: Padrões de Interconexão para Máxima Velocidade

Para que TUDO seja executado com máxima precisão e velocidade, cada padrão de interconexão abaixo deve ser implementado.

### 11.1 Padrão: Cache de Contexto (Redis)

```
Qualquer operação → verifica Redis primeiro
  → Cache hit: <1ms (vs 10-100ms sem cache)
  → Cache miss: executa operação + popula cache
  → TTL adaptativo baseado em frequência de acesso
```

**Onde aplicar:** LSP results, policy decisions, LLM responses, scan results, ADR lookups

### 11.2 Padrão: Streaming Paralelo (NATS + WebSocket)

```
Scanner Pool → NATS JetStream (persistente)
  → Queue Group: Self-Panel (prioridade alta)
  → Queue Group: MemoryStore (aprendizado)
  → Queue Group: AuditTrail (rastreabilidade)
  → WebSocket: UI (tempo real)
```

**Latência:** 2-5ms por broadcast paralelo (vs 10-50ms serial)

### 11.3 Padrão: Result Cache por Scanner

```
Scanner X roda → resultado armazenado em:
  → MemoryStore (cache local, TTL 5min)
  → DuckDB (analytics, persistente)
  → Resultado disponível para QUALQUER consumidor
  → Sem re-scan se TTL válido
```

**Economia:** 70-90% menos scans repetidos

### 11.4 Padrão: Chain de Contratos (Pipeline)

```
Contrato A → Contrato B → Contrato C → Resultado
  → Cada contrato valida E transforma
  → Se um falha, chain interrompe com diagnóstico
  → Se todos passam, resultado é garantido
```

**Onde aplicar:** Approval flow, deployment pipeline, auto-fix verification

### 11.5 Padrão: Event Sourcing (Audit Trail como Fonte da Verdade)

```
Toda operação → AuditTrail.append(evento)
  → Evento é a ÚNICA fonte da verdade
  → Qualquer estado pode ser reconstruído replayando eventos
  → Memória, decisões, métricas são DERIVADAS do audit trail
```

**Benefício:** Zero perda de estado, rastreabilidade completa, debug infinito

### 11.6 Padrão: Feedforward (Predição de Próximo Passo)

```
Scanner detecta issue → Analyzer PREDIZ próximo issue relacionado
  → Planner inclui ambos no mesmo ciclo
  → Executor aplica juntos (economia de ciclos)
```

**Onde aplicar:** Auto-fix em lote, dependências de pacotes, migrações

### 11.7 Padrão: Contratos Vivos (Self-Healing Contracts)

```
Contrato C1-C18 é verificado a cada 5 minutos
  → Se violado: alerta + diagnóstico
  → Se quebrado: rollback automático para última versão estável
  → Se degradado: modo degraded com fallback
  → Se recuperado: volta ao normal + notificação
```

### 11.8 Padrão: MCP como Hub de Ferramentas

```
Qualquer componente pode EXPOR ferramentas via MCP
  → LSP, DAP, FileSystem, Git, Terminal, Policy
  → Qualquer agente/IA pode CONSUMIR ferramentas via MCP
  → Catálogo dinâmico: tools/list, tools/call
```

**Integração:** MCPRegistry (já existe) + MCPBridge (conectar a todos os packages)

### 11.9 Matriz de Velocidade: Antes vs Depois

| Operação | Sem malha | Com malha | Ganho |
|----------|-----------|-----------|-------|
| Auto-fix (scan→fix→verify) | ~5s | ~217ms | **23×** |
| Self-Chat pesquisa tecnologia | ~60s | ~12s | **5×** |
| Cycle completo | ~30s | ~1.3s | **23×** |
| LSP diagnóstico | ~200ms | ~5ms (cache) | **40×** |
| Policy decision | ~50ms | ~2ms (cache) | **25×** |
| Deploy pipeline | ~30min | ~5min | **6×** |
| Technology Radar scan | ~24h (manual) | ~10s | **8640×** |

---

## 12. Meta-Sistema: Auto-Intensificação de Estudos

A IDEIA deve ser capaz de intensificar seus próprios estudos automaticamente:

### 12.1 Ciclo de Auto-Intensificação

```
1. Study Scanner (todo estudo tem metadados: conexões, gaps, score)
2. Analyzer detecta estudos com baixa pontuação de interconexão
3. Intensifier gera perguntas de aprofundamento:
   - "Este estudo se conecta com S23? Como?"
   - "Quais contratos C1-C18 são relevantes?"
   - "Quais packages são impactados?"
4. Auto-Research: busca em estudos existentes por conexões
5. Update: adiciona seção de intensificação ao estudo
6. Verify: malha de conexão melhorou?
```

### 12.2 Métricas de Intensificação

| Métrica | Fórmula | Alvo |
|---------|---------|------|
| **Índice de Conexão** | conexões_reais / conexões_possíveis | > 0.8 |
| **Profundidade** | níveis_de_impacto_analisados | > 3 |
| **Velocidade** | tempo_estimado_de_execucao | < template |
| **Precisão** | tasks_geradas_uteis / total_gerado | > 0.7 |
| **Interdisciplinaridade** | estudos_conectados / total_estudos | > 0.5 |

### 12.3 Gatilhos de Auto-Intensificação

| Gatilho | Ação | Prioridade |
|---------|------|------------|
| Novo estudo criado | Escanear conexões com todos os 40 estudos existentes | Imediato |
| Nova tecnologia adicionada | Reavaliar 20 estudos mais próximos | Diário |
| Score de intensificação < 0.5 | Gerar tarefa de aprofundamento | Semanal |
| Três ou mais estudos conectados | Criar seção cross-study consolidada | Mensal |
| Contrato C1-C18 muda | Reavaliar todos os estudos impactados | Imediato |

### 12.4 Arquitetura do Meta-Sistema

```
┌──────────────────────────────────────────────────────────────┐
│              META-INTENSIFIER ENGINE                          │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ Study    │→│ Analyzer │→│ Generator│→│ Verifier     │ │
│  │ Scanner  │  │ Engine   │  │ Engine   │  │ Engine       │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │
│       │              │             │              │           │
│       ▼              ▼             ▼              ▼           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ 40 docs  │  │ Conexões │  │ Seções   │  │ Malha        │ │
│  │ ESTUDOS/ │  │ Matrix   │  │novas     │  │ melhorou?    │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## Documentos Gerados

- [x] Estudo: `docs/ESTUDOS/ESTUDO-COMPLETO-TOPOLOGIA-INTEGRACAO-IDEIA.md`
- [x] Intensificação: 9 padrões de interconexão para velocidade máxima (seção 11)
- [x] Meta-sistema de auto-intensificação de estudos (seção 12)
- [x] Matriz de Velocidade: ganhos de 5× a 8640× (seção 11.9)
- [ ] ADR: `docs/adr/ADR-012-topologia-integracao.md` (pendente)
- [ ] Tasks: TASK-IDEIA-TOP-01 a TASK-IDEIA-TOP-15
- [ ] Conexões com estudos: S1-S23, E1-E5, M1, X, S23 intensificado

---

## Intensificação

### Riscos Detalhados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:------------:|:-------:|-----------|
| **Contract versions drift** — Diferentes packages implementam versões diferentes de um contrato | Média | Alto | Schema Registry como fonte única; CI detecta drift; contrato imutável após aprovação |
| **New package breaks topology** — Package adicionado sem atualizar o mapa de dependências | Alta | Médio | Pre-commit hook valida topology map; gerador automático de dependências no build |
| **C16-C18 remain unimplemented** — Contratos críticos nunca saem do papel | Alta | Alto | Tasks no PLANO com deadline; gate de release exige C1-C18 implementados |
| **Integration deadlock** — Dois contratos dependem um do outro circularmente | Baixa | Crítico | Dependency graph validation no CI; circular dependency detector |

### Métricas de Sucesso

| Métrica | Atual | Target | Ferramenta |
|---------|:-----:|:------:|-----------|
| Contracts implemented (C1-C18) | 15/18 (83%) | 18/18 (100%) | Contract registry audit |
| Integration coverage % | ~60% | ≥95% | Integration test coverage report |
| Avg latency per contract | N/A | ≤5ms | Performance benchmark |
| Topology map accuracy | ~70% | 100% | Auto-generated vs declared map diff |

### Timeline

| Fase | Semanas | Entregas |
|------|:-------:|----------|
| **Phase 1: C16 + C19** | 1-3 | Implementar contrato C16 (Isolamento), C19 (Scope Isolation); atualizar contract registry |
| **Phase 2: C17 + C18** | 4-6 | Implementar C17 (Resilience), C18 (Observation); testes de integração para todos os 18 contratos |
| **Phase 3: C20-C23 + remaining connections** | 7-10 | C20-C23 (novos contratos); conectar packages faltantes; validação de stacking profiles |

### Plano de Testes

| Tipo | Escopo | Ferramenta |
|------|--------|-----------|
| **Unit** | Schema validation para cada contrato; parser do topology map; validação de dependência circular | Vitest |
| **Integration** | Cada contract flow (requisição → resposta); stacking profile topológico; event bus routing | Vitest + NATS |
| **E2E** | Stacking profiles completos (dev/test/prod); conexão de novo package; topology map auto-gerado | Playwright |

### Conexões com Estudos

| Estudo | Conexão |
|--------|---------|
| **S23 — Self-Optimization** | ScannerPool se conecta aos 66 packages via contratos mapeados aqui |
| **S24 — Controle e Segurança** | Contratos C8 (Audit Trail) e C9 (Policy Engine) são interfaces de segurança |
| **S25 — Perfis** | Config integration com todos os packages reusa a topologia |
| **S1 — Barramento** | Event Bus é a espinha dorsal de todos os contratos |
| **INT — Intensificação** | Este estudo é alvo de intensificação para score ≥ 4 |
