# Estudo de Empilhamento Tecnológico, Contratos e Integrações — IDEIA

> **Data:** 2026-07-17 | **Versão:** 1.0
> **Propósito:** Mapear todas as interações entre tecnologias, empilhamento de camadas, contratos de dados e APIs para a plataforma IDEIA (evolução do ai-devkit)
> **Base:** MATRIZ-TECNOLOGICA-COMPLETA.md (65 tecnologias), theia-ideia-research.md, BARRAMENTO-EVENTOS-MENSAGERIA-DISTRIBUIDA.md, MEMORIA-E-CONTEXTO-PESQUISA.md, ESTUDO-COMPLETO-FLUXO-IDEIA-ENTREGA.md

---

## Sumário

1. [Diagrama de Stacking (9+1 Camadas)](#1-diagrama-de-stacking-91-camadas)
2. [Contratos de Integração Detalhados](#2-contratos-de-integração-detalhados)
3. [Empilhamentos Possíveis](#3-empilhamentos-possíveis)
4. [Cruzamentos de Dados (Cross-Data Matrix)](#4-cruzamentos-de-dados-cross-data-matrix)
5. [APIs Mapeadas](#5-apis-mapeadas)
6. [Matriz de Compatibilidade](#6-matriz-de-compatibilidade)
7. [Recomendações de Stacking](#7-recomendações-de-stacking)

---

## 1. Diagrama de Stacking (9+1 Camadas)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ CAMADA 9 — INTERFACE DO USUÁRIO (Desktop + Web)                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────┐  │
│  │ Electron Shell       │  │ Theia Cloud / Browser│  │ CLI (terminal puro)      │  │
│  │ (desktop nativo)     │  │ (web-based)          │  │ (headless, CI/CD)        │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └──────────┬───────────────┘  │
│             │                         │                         │                   │
│             └──────────────┬──────────┘                         │                   │
│                            │                                    │                   │
│  ┌─────────────────────────▼────────────────────────────────────────────────────┐  │
│  │                   Theia Shell — Application Framework                         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │  │
│  │  │ Widget   │ │ Commands │ │Keybinding│ │  Menus   │ │    View System   │   │  │
│  │  │ System   │ │ Registry │ │ Registry │ │ Registry │ │(sidebar,bottom,  │   │  │
│  │  │(Lumino)  │ │          │ │          │ │          │ │    right,main)   │   │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  TECNOLOGIAS: Electron | Theia Platform | Theia Cloud | CLI (Commander.js)          │
│  APIs de Entrada:  DOM Events | IPC (Electron) | stdin/stdout | HTTP Request        │
│  APIs de Saída:    Theia Commands | Widget API | JSON-RPC (frontend→backend)        │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ CAMADA 8 — APRESENTAÇÃO (Web UI)                                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  Monaco   │ │ xterm.js │ │  Chat    │ │  Diff    │ │Dashboard │ │  Flow    │   │
│  │  Editor   │ │ Terminal │ │  Panel   │ │  Viewer  │ │  Panels  │ │  Canvas  │   │
│  └─────┬────┘ └─────┬────┘ └─────┬────┘ └─────┬────┘ └─────┬────┘ └─────┬────┘   │
│        │            │            │            │            │            │         │
│  ┌─────┴────────────┴────────────┴────────────┴────────────┴────────────┴──────┐  │
│  │                           React 18 + Vite 5                                    │  │
│  │  Componentes: EditorMode, ChatMode, TerminalMode, FlowMode, DashboardMode      │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  TECNOLOGIAS: React 18 | Vite 5 | Monaco Editor | xterm.js | ReactFlow |            │
│              CodeMirror | Tailwind | shadcn/ui | @monaco-editor/react               │
│  APIs de Entrada:  User Events (click, keydown) | WebSocket | SSE | LSP             │
│  APIs de Saída:    WebSocket | SSE | fetch | JSON-RPC (Theia)                      │
│                                                                                     │
│  Contrato com Camada 9 (Theia Shell):                                               │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │ Widget lifecycle: onStart() → onActivate() → onFocus() → onBlur() → onClose()│  │
│  │ Command pattern: registerCommand(id, handler) → execute via menu/keyboard     │  │
│  │ View registration: area (left, right, bottom, main), rank, widgetId           │  │
│  │ JSON-RPC: @theia/core/lib/common/messaging → proxy services                  │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ CAMADA 7 — ORQUESTRAÇÃO DE AGENTES                                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                         Orquestrador Principal                                 │  │
│  │  (plano mestre, checkpoints, qualidade, coordenação entre agentes)             │  │
│  └──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬────────────────┘  │
│         │      │      │      │      │      │      │      │      │                   │
│  ┌──────┴┐ ┌──┴───┐ ┌┴─────┐ ┌┴─────┐ ┌┴─────┐ ┌┴────┐ ┌┴────┐ ┌┴────┐ ┌┴──────┐   │
│  │Agente │ │Agente│ │Agente│ │Agente│ │Agente│ │Agente│ │Agente│ │Agente│ │Agente │   │
│  │Arqui- │ │ DB   │ │ Auth │ │ API  │ │ Front│ │Check-│ │Email │ │Testes│ │DevOps │   │
│  │ teto  │ │      │ │      │ │      │ │  end │ │ out  │ │      │ │      │ │       │   │
│  └───────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └───────┘   │
│                                                                                     │
│  TECNOLOGIAS: Agent Runtime | Task Planner | Workflow Engine | Engineer Pipeline |   │
│              LangGraph | CrewAI | AutoGen | MCP | A2A Protocol                      │
│                                                                                     │
│  APIs de Entrada:  Plan | Task | Execute | Evaluate | Approve                       │
│  APIs de Saída:    Result | Artifact | Decision | Report                            │
│                                                                                     │
│  Contratos com Camada 6 (LLMs):                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │ ChatAgent (Theia): id, name, description, languageModelRequirements, prompts  │  │
│  │ ToolProvider: registro de ferramentas para LLM via MCP                        │  │
│  │ AIVariableContribution: variáveis de contexto injetadas no prompt             │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  Contratos com Camada 3 (Event Bus):                                                │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │ agent.task.assigned → { agentId, taskId, plan, context }                      │  │
│  │ agent.task.completed → { agentId, taskId, result, artifacts[] }               │  │
│  │ agent.task.failed → { agentId, taskId, error, attempts }                      │  │
│  │ agent.decision.made → { agentId, decisionId, rationale, alternatives }        │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ CAMADA 6 — INTELIGÊNCIA E COGNIÇÃO                                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                        Provider Router (fallchain)                             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │  │
│  │  │  Ollama  │ │  OpenAI  │ │Anthropic │ │  Google  │ │   OpenRouter     │   │  │
│  │  │ (Local)  │ │ (GPT-4o) │ │ (Claude) │ │ (Gemini) │ │ (200+ modelos)   │   │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Vercel   │ │ LangChain│ │ LangGraph│ │ Semantic │ │ Genkit   │ │  MCP     │   │
│  │ AI SDK   │ │          │ │ (Graphs) │ │  Kernel  │ │ (Google) │ │(Ferra-   │   │
│  │          │ │          │ │          │ │          │ │          │ │ mentas)  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                                                     │
│  TECNOLOGIAS: Provider Router | Ollama | OpenAI | Anthropic | Gemini |               │
│              Vercel AI SDK | LangChain | LangGraph | Semantic Kernel | Genkit | MCP  │
│                                                                                     │
│  APIs de Entrada:  Chat Request | Stream Request | Embed Request | Tool Call        │
│  APIs de Saída:    Stream Chunk | Final Response | Tool Result | Embedding Vector    │
│                                                                                     │
│  Contrato com Camada 5 (Memória):                                                   │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │ Context Assembly: MemoryStore.getRelevant(query) → ContextItem[]             │  │
│  │ RAG Pipeline: embed(query) → vector_search → hybrid_rerank → context_str     │  │
│  │ Working Memory: ContextStore.filterRelevance() → top-k items                  │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  Contrato com Camada 2 (Segurança):                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │ LLM Guard: scan(input) → { valid, risk_score, sanitized }                    │  │
│  │ Policy: evaluate(action, context) → { allowed, reason }                      │  │
│  │ rebuff: detect_injection(prompt) → { injection, confidence, attack_type }    │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ CAMADA 5 — MEMÓRIA E CONHECIMENTO                                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │ Memory Store│  │   Vector    │  │  Knowledge  │  │   Pattern   │               │
│  │ (SQLite +   │  │    Store    │  │    Graph    │  │  Detector   │               │
│  │  JSONL)     │  │ (sqlite-vec)│  │  (Neo4j /   │  │  (LLM +     │               │
│  │             │  │             │  │   GraphRAG)  │  │  heurístico)│               │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │    RAG      │  │  Context    │  │  Learning   │  │  DuckDB     │               │
│  │   Engine    │  │   Store     │  │   Engine    │  │  (Analytics)│               │
│  │(chunk→embed │  │(working mem)│  │ (LLM +      │  │             │               │
│  │ →search→    │  │             │  │  adaptativo)│  │             │               │
│  │ →rerank)    │  │             │  │             │  │             │               │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                                     │
│  TECNOLOGIAS: SQLite + FTS5 | sqlite-vec | Neo4j | DuckDB | Mem0 | Zep | Letta |    │
│              ChromaDB | GraphRAG | Redis | pgvector                                  │
│                                                                                     │
│  APIs de Entrada:  save(record) | load(id) | search(query) | query(filter)          │
│  APIs de Saída:    MemoryRecord | Vector[] | GraphNode | AnalyticsResult            │
│                                                                                     │
│  Contrato com Camada 3 (Event Bus):                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │ memory.record.created → { id, type, namespace, payload, timestamp }          │  │
│  │ memory.record.updated → { id, changes, previous, timestamp }                 │  │
│  │ memory.query.executed → { query, results_count, latency_ms }                 │  │
│  │ pattern.detected → { patternId, type, confidence, entities[] }               │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ CAMADA 4 — EXECUÇÃO E TAREFAS                                                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Task Runner │  │    Docker    │  │   Sandbox    │  │  Workflow Engine     │   │
│  │  (Node.js)   │  │  Container   │  │ (código iso- │  │ (plan→exec→verify→   │   │
│  │              │  │              │  │  lado)       │  │  finish)             │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  node-pty    │  │  LSP Server  │  │  DAP Server  │  │  File System         │   │
│  │  (terminal)  │  │ (type-check, │  │  (debug)     │  │  (watcher, workspace) │   │
│  │              │  │  completions)│  │              │  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                                     │
│  TECNOLOGIAS: Task Runner | Docker | Sandbox | node-pty | LSP | DAP | FileService   │
│              Tree-sitter | Workflow Engine                                           │
│                                                                                     │
│  APIs de Entrada:  execute(task) | spawn(command) | compile(code) | lint(file)      │
│  APIs de Saída:    TaskResult | TerminalOutput | Diagnostics | AST                  │
│                                                                                     │
│  Contrato com Camada 3 (Event Bus):                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │ task.started → { taskId, type, context, timestamp }                          │  │
│  │ task.completed → { taskId, result, exitCode, duration_ms }                   │  │
│  │ task.failed → { taskId, error, stack, stage }                                │  │
│  │ shell.command.executed → { command, cwd, exitCode, output_truncated }        │  │
│  │ file.changed → { path, type, size, hash }                                     │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ CAMADA 3 — MENSAGERIA E EVENTOS                                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                           Event Bus (NATS + JetStream)                         │  │
│  │                                                                               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │  │
│  │  │  Pub/Sub │  │Request-  │  │  Queue   │  │  Stream  │  │  Schema      │  │  │
│  │  │ (topics) │  │  Reply   │  │  Groups  │  │  (JS)    │  │  Registry    │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Audit Trail │  │  Dead Letter │  │  Outbox      │  │  WebSocket Bridge   │   │
│  │  (event      │  │  Queue (DLQ) │  │  Pattern     │  │  (NATS → Browser)   │   │
│  │   sourcing)  │  │              │  │              │  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                                     │
│  TECNOLOGIAS: NATS + JetStream | WebSocket | SSE | Schema Registry |                │
│              Audit Trail | DLQ | Outbox | Saga Pattern                              │
│                                                                                     │
│  APIs de Entrada:  publish(topic, data) | subscribe(topic) | request(topic, data)   │
│  APIs de Saída:    Message | JetStreamMsg | WSMessage | AuditEvent                  │
│                                                                                     │
│  Contrato com Camada 2 (Segurança):                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │ policy.evaluated → { action, subject, resource, decision, timestamp }        │  │
│  │ policy.violated → { action, subject, resource, rule, severity }              │  │
│  │ approval.requested → { flowId, action, context, requestedBy }                │  │
│  │ approval.granted/denied → { flowId, decision, reason, reviewedBy }           │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ CAMADA 2 — SEGURANÇA E GOVERNANÇA                                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Policy Engine│  │ LLM Guard    │  │  rebuff      │  │  Approval Flow      │   │
│  │ (27 patterns)│  │ (PII, jail-  │  │ (prompt      │  │  (request/grant/    │   │
│  │              │  │  break)      │  │  injection)  │  │   deny)             │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  OPA / Cedar │  │ JWT / RBAC   │  │  OAuth2      │  │  OWASP LLM Top 10   │   │
│  │ (policy-as-  │  │ (identidade) │  │  (delegação) │  │  (baseline)          │   │
│  │  code)       │  │              │  │              │  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                                     │
│  TECNOLOGIAS: Policy Engine | LLM Guard | rebuff | OPA | Cedar | JWT | RBAC |       │
│              OAuth2 | OWASP LLM Top 10 | MITRE ATLAS | Garak | PyRIT                │
│                                                                                     │
│  APIs de Entrada:  evaluate(action, context) | scan(input) | check(token)           │
│  APIs de Saída:    Decision | ScanResult | TokenPayload | ViolationReport           │
│                                                                                     │
│  Contrato com Camada 1 (Infra):                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │ audit.event.stored → { eventId, hash, previousHash, payload, timestamp }     │  │
│  │ audit.chain.verified → { valid, brokenLinks[], tampered[] }                  │  │
│  │ identity.authenticated → { userId, roles, token, expiresAt }                 │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ CAMADA 1 — INFRAESTRUTURA E PERSISTÊNCIA                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ PostgreSQL   │  │    SQLite    │  │    DuckDB    │  │      Redis           │   │
│  │ + pgvector   │  │ + FTS5 + vec│  │ (OLAP local) │  │ (cache + sessão)     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │    MinIO     │  │    NATS      │  │  Kubernetes  │  │  OpenTofu            │   │
│  │ (object store)│  │ (JetStream) │  │    / K3s     │  │  (IaC)               │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                                     │
│  TECNOLOGIAS: PostgreSQL | SQLite | DuckDB | Redis | MinIO | NATS | K8s | OpenTofu  │
│              Docker | Podman | Turso | libSQL                                        │
│                                                                                     │
│  APIs de Entrada:  SQL | S3 API | KV Operations | Container API | K8s API          │
│  APIs de Saída:    Records | Objects | Cache Hit/Miss | Pod Status | State          │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ CAMADA 0 — KERNEL E PLATAFORMA (Theia)                                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │                    Eclipse Theia Platform                                      │  │
│  │                                                                               │  │
│  │  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐   │  │
│  │  │    Frontend Process         │  │      Backend Process                 │   │  │
│  │  │  (Browser / Electron)       │  │    (Node.js + Express)               │   │  │
│  │  │                             │  │                                     │   │  │
│  │  │  Monaco Editor              │  │  Language Servers (LSP)             │   │  │
│  │  │  Widget System (Lumino)     │  │  File System (FileService)          │   │  │
│  │  │  Views/Panels               │  │  Plugin Host Process                │   │  │
│  │  │  DI Container (InversifyJS) │  │  Terminal Backend (node-pty)        │   │  │
│  │  │  UI Shell                   │  │  DI Container (InversifyJS)         │   │  │
│  │  └─────────────────────────────┘  └─────────────────────────────────────┘   │  │
│  │                                                                               │  │
│  │  Comunicação: JSON-RPC sobre WebSocket (frontend ↔ backend)                   │  │
│  │  DI Container: InversifyJS (bind, inject, multi-inject)                       │  │
│  │  Extension API: VS Code Extension API (~100%) + Theia Extensions (build-time) │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  TECNOLOGIAS: Eclipse Theia | InversifyJS | JSON-RPC | OpenVSX | Theia Cloud |      │
│              Theia AI (ChatAgent, AIVariable, ToolProvider)                         │
│                                                                                     │
│  APIs de Entrada:  Extension API | DI Container | Contribution Points               │
│  APIs de Saída:    Commands | Widgets | Services | Events                           │
│                                                                                     │
│  Contratos com Camadas Superiores:                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────┐  │
│  │ Module (frontend/backend): { bind, unbind, rebind }                          │  │
│  │ Contribution Points: { Command, Keybinding, Menu, View, Preference }         │  │
│  │ Service Protocol: { path, serviceSymbol, interface } (JSON-RPC)              │  │
│  │ ChatAgent: { id, name, description, languageModelRequirements, prompts }     │  │
│  │ ToolProvider: { tools: [{ name, description, inputSchema }] }                │  │
│  └──────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Contratos de Integração Detalhados

### 2.1 Contratos entre Camadas

#### Camada 0 (Theia) → Camada 8 (Web UI)

```
Canal:      JSON-RPC sobre WebSocket
Serviço:    @theia/core/lib/common/messaging
Protocolo:  Proxy → Service (request/response)
Timeout:    30s (default)
Retry:      N/A (conexão persistente)
Segurança:  Origin validation + Token (se remoto)

Métodos:
  initialize → { capabilities, serverInfo }
  getWorkspace → { roots, folders }
  executeCommand(id, args) → { success, result }
  onDidChangeActiveEditor → { editorUri, language }

Exemplo:
  Frontend → Backend: { method: 'executeCommand', params: ['ideia.generate', { idea: '...' }] }
  Backend → Frontend: { result: { projectPath: '/workspace/project', files: 42 } }
```

#### Camada 8 (Web UI) → Camada 7 (Agentes)

```
Canal:      WebSocket / SSE
Eventos:    chat:message, agent:action, agent:result
Timeout:    N/A (streaming)
Garantia:   at-most-once (UI não crítica)
Schema:
  chat:message → { id, role, content, timestamp, traceId }
  agent:action → { agentId, action, progress, status }
  agent:result → { agentId, result: Artifact | Decision | Report }

Fluxo:
  User input → Chat Panel → SSE → Provider Router → LLM Stream → Chat Panel
  Agent action → Event Bus → WSBroadcast → Dashboard (progress bar)
```

#### Camada 7 (Agentes) → Camada 6 (LLMs)

```
Canal:      Provider Router (TypeScript interface)
Protocolo:  AiProvider.ask() stream/async + AiProvider.embed()
Timeout:    60s (chat), 120s (code gen)
Retry:      3 attempts, exponential backoff (1s, 2s, 4s)
Fallback:   Se OpenAI falha → Anthropic → Ollama

Schema:
  ChatRequest:
    model: string
    messages: [{ role, content }]
    stream: boolean
    options?: { temperature, maxTokens, topP }
  ChatResponse:
    content: string
    finishReason: 'stop' | 'length' | 'tool_calls'
    usage: { promptTokens, completionTokens }

Exemplo:
  Agente → ProviderRouter.ask({ model: 'gpt-4o', stream: true })
    → Ollama.ask() (fallback se offline)
    → Stream<{ content: string, finishReason?: string }>
```

#### Camada 6 (LLMs) → Camada 5 (Memória)

```
Canal:      RAG Pipeline (TypeScript)
Protocolo:  RAGEngine.search(query, options) → ContextItem[]
Timeout:    5s (RAG query)
Cache:      Semantic cache (TTL: 10-30min por categoria)

Schema:
  RAGRequest:
    query: string
    strategy: 'hybrid' | 'semantic' | 'lexical'
    topK: number (default 5)
    category?: 'source' | 'docs' | 'tests' | 'memory'
  RAGResult:
    items: ContextItem[]
    strategy: string
    latencyMs: number

Fluxo:
  LLM precisa de contexto → chama RAGEngine.search() → 
    Vector Store (semantic) + SQLite FTS5 (lexical) →
    Hybrid rerank (RRF) → Retorna ContextItem[] para provider →
    Provider monta contexto para LLM
```

#### Camada 5 (Memória) → Camada 4 (Execução)

```
Canal:      Event Bus (NATS subject: task.*)
Evento:     task.*.{started,completed,failed}
Garantia:   at-least-once
DLQ:        task.dlq
Retry:      3 attempts, exponential backoff

Schema:
  task.started:
    taskId: string (uuid)
    type: 'compile' | 'lint' | 'test' | 'build' | 'deploy'
    context: { projectPath, command, args }
    timestamp: ISO8601
    traceId: string

  task.completed:
    taskId: string
    result: { exitCode, stdout, stderr, artifacts }
    durationMs: number
    timestamp: ISO8601

  task.failed:
    taskId: string
    error: { message, stack, stage }
    attempts: number
    willRetry: boolean
    timestamp: ISO8601
```

#### Camada 4 (Execução) → Camada 3 (Event Bus)

```
Canal:      NATS Client (nats.js) → JetStream
Events:     shell.command.executed, file.changed, task.*
Garantia:   at-least-once
Ordering:   Por partition key (projectId ou agentId)
Retention:  7 dias (JetStream config)

Schema:
  shell.command.executed:
    command: string
    cwd: string
    exitCode: number
    outputTruncated: boolean
    durationMs: number
    timestamp: ISO8601
    traceId: string

  file.changed:
    path: string (relativo ao workspace)
    type: 'created' | 'modified' | 'deleted'
    size: number
    hash: string (SHA-256)
    timestamp: ISO8601
```

#### Camada 3 (Event Bus) → Camada 2 (Segurança)

```
Canal:      NATS Queue Group (policy-consumers)
Eventos:    policy.evaluated, policy.violated, approval.*
Garantia:   exactly-once (com dedup key)
Retry:      5 attempts, backoff (1s, 2s, 4s, 8s, 16s)
DLQ:        policy.dlq

Schema:
  policy.evaluated:
    action: string
    subject: { type: 'user' | 'agent', id: string, roles: string[] }
    resource: { type: string, id: string }
    decision: 'allow' | 'deny' | 'ask'
    rule?: string (qual regra matchou)
    timestamp: ISO8601
    traceId: string

  policy.violated:
    action: string
    subject: { type, id }
    resource: { type, id }
    rule: string (regra violada)
    severity: 'low' | 'medium' | 'high' | 'critical'
    context: any (informação adicional)
    timestamp: ISO8601
```

#### Camada 2 (Segurança) → Camada 1 (Infra)

```
Canal:      Audit Trail (append-only JSONL + HMAC chain)
Protocolo:  File append + Periodic chain verification
Garantia:   written (fim no disco antes de considerar sucesso)
Retention:  90 dias (Free), Ilimitado (Enterprise)

Schema:
  audit.event:
    eventId: string (uuid)
    type: string
    payload: any
    hash: string (SHA-256 do conteúdo)
    previousHash: string (hash do evento anterior no chain)
    timestamp: ISO8601
    traceId: string

  audit.chain.verified:
    valid: boolean
    totalEvents: number
    brokenLinks: { index, expectedHash, actualHash }[]
    tampered: string[]
    verifiedAt: ISO8601
```

---

### 2.2 Contratos entre Tecnologias na Mesma Camada

#### Camada 8: Monaco Editor + LSP

```
Protocolo:  LSP (Language Server Protocol)
Transporte: JSON-RPC 2.0 sobre WebSocket / stdio
Versão:     3.18

Métodos LSP:
  initialize → InitializeResult (capabilities, serverInfo)
  textDocument/completion → CompletionItem[]
  textDocument/definition → Location | Location[]
  textDocument/hover → Hover
  textDocument/documentSymbol → SymbolInformation[]
  textDocument/codeAction → CodeAction[]
  textDocument/formatting → TextEdit[]
  textDocument/references → Location[]
  textDocument/rename → WorkspaceEdit
  textDocument/documentLink → DocumentLink[]

Notificações:
  textDocument/publishDiagnostics → { uri, diagnostics[] }
  textDocument/didOpen → { textDocument }
  textDocument/didChange → { contentChanges }
  textDocument/didSave → { textDocument }
  textDocument/didClose → { textDocument }

Diagnostics Schema:
  {
    uri: string,
    diagnostics: [{
      range: { start: { line, character }, end: { line, character } },
      severity: 1 (Error) | 2 (Warning) | 3 (Info),
      message: string,
      source?: string,
      code?: string | number,
      relatedInformation?: { location, message }[]
    }]
  }
```

#### Camada 8: Monaco Editor + Tree-sitter

```
Protocolo:  AST Provider (TypeScript Interface)
Transporte: In-process (Wasm)

Contrato:
  SyntaxNode:
    type: string
    text: string
    startPosition: { row, column }
    endPosition: { row, column }
    children: SyntaxNode[]
    parent?: SyntaxNode
    named: boolean

  QueryMatch:
    pattern: number
    captures: { name: string, node: SyntaxNode }[]
    
  API:
    parser.setLanguage(Language) → void
    parser.parse(text: string) → Tree
    tree.edit(edit: { startPosition, oldEndPosition, newEndPosition, startIndex, oldEndIndex, newEndIndex }) → void
    query.matches(node: SyntaxNode) → QueryMatch[]
```

#### Camada 8: xterm.js + node-pty

```
Protocolo:  WebSocket (custom)
Transporte: WebSocket (binário, UTF-8)

Contrato:
  Frontend (xterm.js) → Backend (node-pty):
    { type: 'input', data: string }
    { type: 'resize', cols: number, rows: number }
    { type: 'ctrl-c' }

  Backend (node-pty) → Frontend (xterm.js):
    { type: 'output', data: string }
    { type: 'exit', code: number }
    { type: 'error', message: string }

  Backend:
    spawn(file, args, options) → IPty
    pty.write(data) → void
    pty.resize(cols, rows) → void
    pty.onData(callback) → Disposable
    pty.onExit(callback) → Disposable
    pty.kill(signal) → void
```

#### Camada 6: Provider Router + MCP

```
Protocolo:  MCP (Model Context Protocol)
Transporte: JSON-RPC 2.0 sobre stdio (local) ou SSE (remoto)
Versão:     2025-03-26 (draft)

Métodos:
  tools/list → ToolsListResult
    tools: [{ name, description, inputSchema }]
    
  tools/call → CallToolResult
    { tool: string, arguments: { ... } } → { content: [{ type, text }], isError: boolean }
    
  resources/list → ResourcesListResult
    resources: [{ uri, name, description, mimeType }]
    
  resources/read → ReadResourceResult
    { uri: string } → { contents: [{ uri, mimeType, text }] }

  prompts/list → PromptsListResult
    prompts: [{ name, description, arguments: [{ name, description, required }] }]
    
  prompts/get → GetPromptResult
    { name, arguments: { ... } } → { messages: [{ role, content }] }

Headers:
  Authorization: Bearer <token>
  X-Trace-Id: string (opcional)
```

#### Camada 6: LangGraph + CrewAI

```
Protocolo:  Agent-to-Agent (A2A pattern)
Transporte: NATS Request-Reply (para coordenação) + A2A (futuro)

Contrato LangGraph ↔ CrewAI:
  StateGraph:
    nodes: { [key: string]: AgentNode }
    edges: { [source: string]: { target: string, condition?: string } }
    checkpoint: { thread_id, state: any, next: string[] }
    
  AgentNode (LangGraph):
    run(state: State) → Partial<State>
    
  Agent (CrewAI):
    execute(task: Task) → CrewOutput
    Task = { description, expected_output, agent, tools }
    CrewOutput = { raw, json, tasks_output: TaskResult[] }

Padrão de Integração:
  LangGraph state → cria Task para CrewAI → 
  CrewAI executa multi-agente → retorna resultados →
  LangGraph atualiza estado → continua grafo

Exemplo:
  Agent A (LangGraph) → NATS.request('crew.task.create', { task }) → 5s timeout
  CrewAI → NATS.publish('crew.task.result', { taskId, result })
  LangGraph agent consome resultado → decide próximo passo
```

#### Camada 5: DuckDB + SQLite

```
Protocolo:  SQL + sqlite_scanner extension
Transporte: In-process (Node.js addon ou Wasm)

Contrato:
  DuckDB → SQLite (read):
    INSTALL sqlite_scanner;
    LOAD sqlite_scanner;
    SELECT * FROM sqlite_scan('memory.db', 'records');
    
  SQLite → DuckDB (write back):
    DuckDB processa analytics → gera tabela agregada →
    INSERT INTO sqlite_db.analytics_results VALUES (...)

Fluxo típico:
  SQLite stores raw records → DuckDB lê via sqlite_scanner →
  DuckDB executa analytics (aggregations, window functions) →
  Resultado escrito de volta ou servido via API
```

#### Camada 5: Mem0 + Neo4j

```
Protocolo:  Mem0 SDK (REST) + Neo4j Bolt Protocol
Transporte: HTTP (Mem0) + Bolt TCP (Neo4j)

Contrato:
  Mem0 Memory:
    memories: [{ id, content, metadata, user_id, agent_id, session_id }]
    entities: [{ name, type, description }]
    relations: [{ source, target, relation }]
    
  Mem0 add(data):
    { text: string, user_id?: string, metadata?: { entity_type, ... } }
    → { id, text, metadata, timestamp, vector: float[] }
    
  Mem0 search(query):
    { query: string, user_id?: string, agent_id?: string }
    → { results: [{ id, score, text, metadata }] }
    
  Neo4j (backing store):
    Node: { id, labels: ['Entity', 'Memory'], properties }
    Relationship: { type: 'HAS_MEMORY' | 'RELATED_TO', properties }
    Cypher: MATCH (e:Entity {id: $id})-[:HAS_MEMORY]->(m:Memory) RETURN m
```

#### Camada 3: NATS + Schema Registry

```
Protocolo:  NATS Protocol + Schema Registry (event-schema)
Transporte: TCP (NATS) + HTTP (Schema Registry)

Contrato:
  NATS.Message:
    subject: string
    data: Uint8Array (JSON serializado)
    reply?: string (para request-reply)
    headers?: { 'Nats-Msg-Id'?, 'X-Schema-Version'?, ... }
    
  Schema Registry:
    register(schema: { subject, schema, schemaType: 'json' | 'avro' | 'protobuf', version }) → { id }
    validate(subject, version, payload) → { valid, errors }
    resolve(id) → { schema, version, subject }

Padrão de Evolução:
  Evento v1 → Schema Registry registra → Produtor publica com version header →
  Consumidor valida contra schema → Processa ou rejeita →
  Evento v2 (breaking) → Novo subject (event.v2) → Ambos convivem
```

#### Camada 2: OPA + LLM Guard

```
Protocolo:  OPA REST API + LLM Guard SDK
Transporte: HTTP (OPA) + In-process (LLM Guard)

Contrato OPA:
  POST /v1/data/ideia/policy/allow
    input: { action, subject, resource, context }
    → { result: boolean, decision_id: string, explanations: [] }
    
  Regra Rego:
    allow {
      input.action == "agent:execute"
      input.subject.type == "system-agent"
      not input.resource.type in ["network", "keychain"]
    }

Contrato LLM Guard:
  scan(input):
    { prompt: string, scanners: ['jailbreak', 'pii', 'toxicity', 'ban_substrings'] }
    → { valid: boolean, risk_score: float, sanitized_prompt?: string, scanners_results: [...] }
    
  scan_output(output):
    { output: string, scanners: ['toxicity', 'secrets', 'code_safety'] }
    → { valid: boolean, risk_score: float, issues: [...] }
```

#### Camada 1: DuckDB + MinIO

```
Protocolo:  DuckDB parquet scanner + S3 API
Transporte: HTTP (S3) + In-process (DuckDB)

Contrato:
  MinIO → DuckDB:
    CREATE TABLE analytics AS 
    SELECT * FROM read_parquet('s3://bucket/path/*.parquet');
    
  S3 API:
    PutObject(bucket, key, body) → { ETag }
    GetObject(bucket, key) → { Body, ContentType }
    ListObjectsV2(bucket, prefix) → { Contents: [{ Key, Size, LastModified }] }
    
Fluxo:
  Event Bus → Audit Trail (JSONL) → Periodically → Parquet conversion →
  MinIO stores Parquet → DuckDB queries via parquet scanner →
  Analytics dashboard
```

---

### 2.3 Contratos de Dados Compartilhados

#### AgentArtifact

```typescript
interface AgentArtifact {
  id: string
  type: 'code' | 'doc' | 'config' | 'test' | 'diagram' | 'decision' | 'report'
  agentId: string
  taskId: string
  name: string
  description?: string
  content: string | Buffer
  language?: string
  filePath?: string
  metadata: {
    created: ISO8601
    updated: ISO8601
    version: number
    checksum: string  // SHA-256
    size: number
  }
  relations?: {
    dependsOn?: string[]   // artifact IDs
    implements?: string[]  // requirement IDs
    replaces?: string[]    // artifact IDs
  }
  traceId: string
}
```

#### BusEvent

```typescript
interface BusEvent {
  id: string                        // UUID v7 (time-ordered)
  type: EventType                   // "task.started" | "memory.record.created" | etc.
  source: string                    // module/agent que emitiu
  payload: Record<string, unknown>
  timestamp: ISO8601
  traceId: string                   // correlation ID
  causationId?: string              // evento que causou este
  correlationId?: string            // fluxo/processo ao qual pertence
  headers?: {
    'Nats-Msg-Id'?: string          // dedup key
    'X-Schema-Version'?: number
    'X-Retry-Count'?: number
    'X-TTL'?: number                // ms para expirar
  }
}

type EventType =
  | 'task.{started,completed,failed}'
  | 'memory.record.{created,updated,deleted}'
  | 'agent.task.{assigned,completed,failed}'
  | 'agent.decision.{made,approved,rejected}'
  | 'policy.{evaluated,violated}'
  | 'approval.{requested,granted,denied}'
  | 'shell.command.{executed,failed}'
  | 'file.{created,modified,deleted}'
  | 'deploy.{started,completed,failed,rolled_back}'
  | 'cycle.{started,completed,failed}'
  | 'feedback.{submitted,processed}'
  | 'user.{action,message,decision}'
```

#### Decision

```typescript
interface Decision {
  id: string
  type: 'architectural' | 'design' | 'implementation' | 'deploy' | 'risk' | 'policy'
  subject: string                                   // "database choice" | "framework" | etc.
  context: string                                   // descrição do contexto da decisão
  alternatives: Array<{
    name: string
    description: string
    pros: string[]
    cons: string[]
    risk: 'low' | 'medium' | 'high'
  }>
  chosen: string                                    // alternativa escolhida
  rationale: string                                 // justificativa
  madeBy: { type: 'user' | 'agent', id: string }
  approvedBy?: { type: 'user' | 'agent', id: string }
  status: 'pending' | 'approved' | 'rejected' | 'superseded'
  supersededBy?: string                             // decision ID
  relatedArtifacts?: string[]                       // artifact IDs
  tags: string[]
  timestamp: ISO8601
  traceId: string
  effects?: Array<{
    type: 'created' | 'modified' | 'risk' | 'cost'
    description: string
    magnitude: 'low' | 'medium' | 'high'
  }>
}
```

#### Task

```typescript
interface Task {
  id: string
  type: 'compile' | 'lint' | 'test' | 'build' | 'deploy' | 'generate' | 'review' | 'plan'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  priority: 0 | 1 | 2 | 3                          // 0 = critical
  workflowId: string
  agentId?: string
  dependsOn: string[]                               // task IDs
  input: {
    description: string
    context: Record<string, unknown>
    files?: string[]
    params?: Record<string, unknown>
  }
  output?: {
    exitCode: number
    stdout: string
    stderr: string
    artifacts: string[]                             // artifact IDs
    durationMs: number
  }
  error?: {
    message: string
    stack?: string
    stage: string
    recoverable: boolean
  }
  attempts: number
  maxRetries: number
  deadline?: ISO8601
  startedAt?: ISO8601
  completedAt?: ISO8601
  traceId: string
  tags: string[]
}
```

#### Memory

```typescript
interface Memory {
  id: string
  type: 'episodic' | 'semantic' | 'procedural'
  namespace: string                                 // projeto, usuário ou global
  scope: 'session' | 'project' | 'user' | 'global'
  content: string | Record<string, unknown>
  embedding?: Float32Array
  metadata: {
    category: string
    importance: number                              // 0-1
    accessCount: number
    lastAccessed: ISO8601
    validFrom: ISO8601
    validTo?: ISO8601                               // null = sempre válido
    source: string                                  // "user" | "agent" | "system" | "llm"
    confidence: number                              // 0-1
    ttl?: number                                    // ms
  }
  entities?: Array<{ name: string, type: string, role: string }>
  relations?: Array<{ source: string, target: string, type: string }>
  previousVersions?: string[]                        // memory IDs (para temporal tracking)
  supersededBy?: string
  checksum: string
  createdAt: ISO8601
  updatedAt: ISO8601
  traceId: string
}
```

---

## 3. Empilhamentos Possíveis

### 3.1 Theia + ai-devkit + LLMs

```
┌──────────────────────────────────────────────────────────────────────┐
│                       Theia + ai-devkit + LLMs                        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │  Theia Platform (Kernel)                                         ││
│  │  - Extension API (VS Code compatível + Theia Extensions)        ││
│  │  - DI Container (InversifyJS)                                   ││
│  │  - Widget System (Lumino dock panels)                           ││
│  │  - JSON-RPC Frontend/Backend                                    ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                  │                                    │
│  ┌──────────────────────────────┴──────────────────────────────────┐ │
│  │  IDEIA Application Layer                                        │ │
│  │                                                                  │ │
│  │  ChatAgents (Theia AI):                                          │ │
│  │    - ArchitectAgent                                              │ │
│  │    - CoderAgent                                                  │ │
│  │    - ReviewerAgent                                               │ │
│  │                                                                  │ │
│  │  ToolProviders (MCP):                                            │ │
│  │    - FileSystem Tools                                            │ │
│  │    - Shell Tools                                                 │ │
│  │    - Sandbox Tools                                               │ │
│  │                                                                  │ │
│  │  Services:                                                       │ │
│  │    - PolicyService                                               │ │
│  │    - MemoryStore                                                 │ │
│  │    - EventBus                                                    │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                  │                                    │
│  ┌──────────────────────────────┴──────────────────────────────────┐ │
│  │  LLM Providers (via Provider Router)                           │ │
│  │                                                                  │ │
│  │  Ollama (local, offline):                                       │ │
│  │    DeepSeek-Coder-V2, Phi-4, Llama 4, Qwen2.5-Coder            │ │
│  │                                                                  │ │
│  │  Cloud Providers (online, fallback):                            │ │
│  │    OpenAI GPT-4o, Anthropic Claude, Google Gemini               │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Fluxo de Contratos:                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ 1. User envia ideia no ChatWidget                               │ │
│  │ 2. ChatAgent (Theia AI) processa via LanguageModelRegistry      │ │
│  │ 3. Provider Router escolhe LLM (fallchain: Ollama→OpenAI)       │ │
│  │ 4. LLM retorna resposta com tool calls                          │ │
│  │ 5. ChatAgent executa tools via MCP (FS, Shell, Sandbox)         │ │
│  │ 6. Resultado é renderizado no ChatWidget ou Monaco Editor       │ │
│  │ 7. Decisões são registradas no MemoryStore e AuditTrail         │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Benefícios:                                                         │
│  - IDE completa com extensibilidade total                            │
│  - Agentes com integração profunda (DI)                             │
│  - Roda desktop e web (Theia Cloud)                                 │
│  - Ecossistema VS Code Extensions disponível                        │
│  - Offline-first com Ollama                                         │
│                                                                      │
│  Riscos:                                                             │
│  - Curva de aprendizado Theia (Inversify, contribution points)      │
│  - Theia ~150MB (Electron) vs alternativa mais leve                 │
│  - Manutenção de compatibilidade com Theia releases                 │
│  - OpenVSX tem menos extensões que VS Code Marketplace              │
│                                                                      │
│  Mitigações:                                                         │
│  - Fase 1: PoC com Theia Blueprint + 1 agente                       │
│  - Profissional support via EclipseSource                           │
│  - CI/CD para upgrades mensais                                      │
│  - OpenVSX Router para múltiplos registries                         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 NATS + LangGraph + CrewAI

```
┌──────────────────────────────────────────────────────────────────────┐
│                   NATS + LangGraph + CrewAI                           │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │  NATS + JetStream (Backbone de Mensageria)                       ││
│  │                                                                  ││
│  │  Streams:                                                        ││
│  │    graph-events  → LangGraph checkpoints, state changes          ││
│  │    crew-tasks    → tarefas distribuídas entre agentes CrewAI     ││
│  │    agent-comm    → comunicação inter-agente                      ││
│  │    agent-results → resultados de execução                        ││
│  │    orchestrator  → comandos do orquestrador                      ││
│  │                                                                  ││
│  │  Queue Groups:                                                   ││
│  │    langgraph-node → consumidores LangGraph                       ││
│  │    crew-worker    → consumidores CrewAI                          ││
│  │    agent-identity → consumidores individuais                     ││
│  └──────────────────────────────────────────────────────────────────┘│
│                              │                                        │
│  ┌──────────────────────────┴──────────────────────────────────────┐ │
│  │  LangGraph (Orquestrador de Estado)                              │ │
│  │                                                                  │ │
│  │  StateGraph:                                                     │ │
│  │    [PlanAgent] → [DecomposeAgent] → [AssignAgent] →             │ │
│  │                                 → [CrewCoordinator] →           │ │
│  │                                 → [VerifyAgent] → [MergeAgent]  │ │
│  │                                                                  │ │
│  │  Checkpoints via NATS JetStream:                                │ │
│  │    { thread_id, state, next, pending_crews }                    │ │
│  │                                                                  │ │
│  │  Interação com NATS:                                            │ │
│  │    LangGraph node → NATS.publish('crew-tasks.new', task)        │ │
│  │    NATS.subscribe('crew-results.*') → atualiza state            │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                              │                                        │
│  ┌──────────────────────────┴──────────────────────────────────────┐ │
│  │  CrewAI (Definição de Papéis)                                    │ │
│  │                                                                  │ │
│  │  Agents:                                                         │ │
│  │    DB_Architect → role: "Database schema designer"              │ │
│  │    API_Developer → role: "REST API builder"                     │ │
│  │    Frontend_Dev → role: "UI component developer"               │ │
│  │    QA_Engineer → role: "Test writer and executor"              │ │
│  │                                                                  │ │
│  │  Tasks:                                                          │ │
│  │    { agent, description, expected_output, tools }               │ │
│  │                                                                  │ │
│  │  Crews:                                                          │ │
│  │    ImplementationCrew: DB_Architect + API_Developer + QA        │ │
│  │    FrontendCrew: Frontend_Dev + QA                              │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Fluxo de Dados:                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ ProjectPlan → LangGraph.StateGraph                              │ │
│  │   ↓                                                             │ │
│  │ PlanAgent decide próximos passos                                │ │
│  │   ↓ NATS.publish('crew-tasks.new', { crew: 'Impl', agents })   │ │
│  │ CrewAI consome → agents executam em paralelo                    │ │
│  │   ↓ agents se comunicam via NATS (request-reply)                │ │
│  │ CrewAI retorna resultados                                       │ │
│  │   ↓ NATS.publish('crew-results.impl', { artifacts })            │ │
│  │ LangGraph node consome → atualiza state → próximo nó            │ │
│  │   ↓                                                             │ │
│  │ VerifyAgent checa qualidade → MergeAgent integra                │ │
│  │   ↓                                                             │ │
│  │ Resultado final publicado em 'agent-results.final'              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Contratos:                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ NATS → LangGraph:                                               │ │
│  │   subject: langgraph.checkpoint.{save,load}                     │ │
│  │   payload: { thread_id, state: StateGraphState }               │ │
│  │   garantia: exactly-once                                        │ │
│  │                                                                 │ │
│  │ LangGraph → CrewAI:                                             │ │
│  │   subject: crew.task.create                                     │ │
│  │   payload: { crewId, task: Task, context: State }              │ │
│  │   reply: crew.task.result → { taskId, output: CrewOutput }     │ │
│  │   timeout: 120s                                                 │ │
│  │   retry: 2, backoff 5s                                          │ │
│  │                                                                 │ │
│  │ CrewAI → NATS (inter-agent):                                    │ │
│  │   subject: agent.comm.{from}.{to}                               │ │
│  │   payload: { message, context, artifacts }                      │ │
│  │   garantia: at-most-once (mensagens efêmeras)                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Benefícios:                                                         │
│  - Escalabilidade horizontal (CrewAI workers em NATS queue groups)  │
│  - Estado gerenciado pelo LangGraph com checkpoints duráveis        │
│  - Agentes CrewAI focados em papéis específicos                     │
│  - NATS como espinha dorsal de comunicação resiliente               │
│                                                                      │
│  Riscos:                                                             │
│  - LangGraph + CrewAI têm paradigmas diferentes de estado           │
│  - Sobrecarga de coordenação para poucos agentes                    │
│  - Complexidade de debugging (3 sistemas diferentes)                │
│  - Latência adicional (NATS hop entre sistemas)                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.3 DuckDB + SQLite + Mem0

```
┌──────────────────────────────────────────────────────────────────────┐
│                    DuckDB + SQLite + Mem0                             │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │  SQLite + FTS5 + sqlite-vec (Persistência Local, OLTP)          ││
│  │                                                                  ││
│  │  Tabelas:                                                        ││
│  │    memory_records → { id, type, namespace, content, metadata }  ││
│  │    contexts → { id, session_id, content, priority, tokens }     ││
│  │    decisions → { id, subject, choice, rationale, alternatives } ││
│  │    artifacts → { id, type, filepath, checksum, agent_id }      ││
│  │    projects → { id, name, stack, created_at }                  ││
│  │    sessions → { id, project_id, status, context_summary }      ││
│  │                                                                  ││
│  │  FTS5 Virtual Tables:                                           ││
│  │    memory_fts → { content, namespace }                          ││
│  │    code_fts → { filename, content, language }                   ││
│  │                                                                  ││
│  │  sqlite-vec:                                                    ││
│  │    vec_memories → { rowid, embedding }                          ││
│  │    vec0 knn search: SELECT rowid, distance FROM vec_memories    ││
│  │      WHERE embedding MATCH ? AND k = 10                         ││
│  └──────────────────────────────────────────────────────────────────┘│
│                              │                                        │
│  ┌──────────────────────────┴──────────────────────────────────────┐ │
│  │  DuckDB (Analytics, OLAP)                                       │ │
│  │                                                                  │ │
│  │  sqlite_scanner: Ler dados do SQLite como tabelas DuckDB        │ │
│  │  parquet: Exportar resultados para Parquet (MinIO)              │ │
│  │                                                                  │ │
│  │  Queries típicas:                                               │ │
│  │    • Padrões de stack por projeto                               │ │
│  │    • Erros mais frequentes por tipo                             │ │
│  │    • Tempo médio de tarefa por agente                           │ │
│  │    • Evolução de decisões ao longo do tempo                    │ │
│  │    • Correlação entre qualidade de código e escolha de stack    │ │
│  │                                                                  │ │
│  │  Exemplo:                                                        │ │
│  │    SELECT p.name, COUNT(d.id) as decisions,                     │ │
│  │           AVG(CASE WHEN d.chosen = d.alternatives[1].name       │ │
│  │               THEN 1 ELSE 0 END) as adherence                  │ │
│  │    FROM sqlite_scan('ideia.db', 'projects') p                   │ │
│  │    JOIN sqlite_scan('ideia.db', 'decisions') d                  │ │
│  │    ON p.id = d.project_id                                       │ │
│  │    GROUP BY p.name                                               │ │
│  │    ORDER BY decisions DESC                                       │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                              │                                        │
│  ┌──────────────────────────┴──────────────────────────────────────┐ │
│  │  Mem0 (Camada de Memória Gerenciada)                            │ │
│  │                                                                  │ │
│  │  Funções:                                                        │ │
│  │    • Extração automática de fatos do histórico                   │ │
│  │    • Entity resolution (dedup de entidades)                     │ │
│  │    • Memory search com relevância                                │ │
│  │    • Cross-session memory consolidation                         │ │
│  │                                                                  │ │
│  │  Integração com SQLite:                                          │ │
│  │    Mem0.add({ text, user_id })                                  │ │
│  │      → Salva no SQLite (raw) + gera embedding                   │ │
│  │      → Mem0 processa (entity extraction, dedup)                 │ │
│  │      → Atualiza SQLite com entidades + relações                 │ │
│  │                                                                  │ │
│  │  Integração com DuckDB:                                          │ │
│  │    DuckDB lê memórias do SQLite → analytics de padrões          │ │
│  │    DuckDB retorna insights → Mem0.search() refinada             │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Fluxo de Dados:                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Agent executa tarefa                                            │ │
│  │   ↓                                                             │ │
│  │ Resultado → MemoryStore.save(record) em SQLite                 │ │
│  │   ↓                                                             │ │
│  │ Event Bus emite 'memory.record.created'                         │ │
│  │   ↓                                                             │ │
│  │ Mem0 consome evento → extrai entidades → atualiza relações     │ │
│  │   ↓                                                             │ │
│  │ DuckDB (periodicamente):                                        │ │
│  │   sqlite_scanner → analytics → identifica padrões               │ │
│  │   → atualiza LearningEngine                                     │ │
│  │   → gera recomendações                                          │ │
│  │   ↓                                                             │ │
│  │ Próxima tarefa: RAG consulta SQLite (FTS5 + sqlite-vec)        │ │
│  │ + Mem0.search() para contexto                                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Benefícios:                                                         │
│  - Zero dependência externa (tudo embarcado)                        │
│  - SQLite para OLTP (gravações rápidas)                             │
│  - DuckDB para OLAP (analytics 100x mais rápido que SQLite)        │
│  - Mem0 como camada de inteligência sobre os dados                 │
│  - Tudo local = privacidade total                                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.4 OPA/Cedar + LLM Guard + Audit Trail

```
┌──────────────────────────────────────────────────────────────────────┐
│              OPA/Cedar + LLM Guard + Audit Trail                     │
│                                                                      │
│  Fluxo: Input → Policy Check → Safety Scan → Execute → Audit       │
│                                                                      │
│  ┌──────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐      │
│  │Input │────►│  OPA /   │────►│LLM Guard │────►│ Execute  │      │
│  │Agent │     │  Cedar   │     │ + rebuff │     │  Action  │      │
│  │Action │     │ (policy) │     │ (safety) │     │          │      │
│  └──────┘     └──────────┘     └──────────┘     └────┬─────┘      │
│       │              │               │               │            │
│       │              ▼               ▼               ▼            │
│       │        ┌──────────┐     ┌──────────┐     ┌──────────┐      │
│       │        │  Block   │     │Sanitized │     │  Result  │      │
│       │        │  Action  │     │ Content  │     │          │      │
│       │        └──────────┘     └──────────┘     └──────────┘      │
│       │              │               │               │            │
│       └──────────────┴───────────────┴───────────────┘            │
│                            │                                       │
│                            ▼                                       │
│                     ┌──────────────┐                               │
│                     │ Audit Trail  │                               │
│                     │ (JSONL +     │                               │
│                     │  HMAC Chain) │                               │
│                     └──────────────┘                               │
│                                                                      │
│  Contratos Detalhados:                                              │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Etapa 1 — Policy Check (OPA/Cedar):                             │ │
│  │   input: {                                                      │ │
│  │     action: "agent:write_file",                                 │ │
│  │     subject: { type: "agent", id: "agent-coder-1", roles: [...]},│ │
│  │     resource: { type: "file", path: "/project/src/main.ts" },   │ │
│  │     context: { autonomy_level: 2, project_risk: "medium" }      │ │
│  │   }                                                              │ │
│  │   output: {                                                      │ │
│  │     result: true,                                                │ │
│  │     decision_id: "dec-abc123",                                   │ │
│  │     explanations: ["file.write.allowed by rule allow_write"]    │ │
│  │   }                                                              │ │
│  │                                                                  │ │
│  │ Etapa 2 — Safety Scan (LLM Guard + rebuff):                     │ │
│  │   input: {                                                       │ │
│  │     prompt: "create a file with content: ...",                   │ │
│  │     scanners: ['jailbreak', 'pii', 'code_injection',            │ │
│  │                 'secrets', 'toxicity']                           │ │
│  │   }                                                              │ │
│  │   output: {                                                      │ │
│  │     valid: true,                                                 │ │
│  │     risk_score: 0.02,                                            │ │
│  │     scanners_results: {                                          │ │
│  │       jailbreak: { detected: false },                            │ │
│  │       pii: { detected: false },                                  │ │
│  │       code_injection: { detected: false }                        │ │
│  │     }                                                            │ │
│  │   }                                                              │ │
│  │                                                                  │ │
│  │ Etapa 3 — Execute Action:                                       │ │
│  │   Se ambas passam → executa e registra no audit trail           │ │
│  │   Se alguma falha:                                               │ │
│  │     • OPA deny → block + log no audit                           │ │
│  │     • LLM Guard reject → sanitiza e pede aprovação humana       │ │
│  │     • rebuff detect → bloqueia + alerta de segurança            │ │
│  │                                                                  │ │
│  │ Etapa 4 — Audit Trail (append):                                 │ │
│  │   {                                                              │ │
│  │     eventId: "evt-xyz",                                         │ │
│  │     type: "agent:write_file",                                    │ │
│  │     payload: {                                                   │ │
│  │       action: "write_file",                                      │ │
│  │       subject: "agent-coder-1",                                  │ │
│  │       resource: "/project/src/main.ts",                          │ │
│  │       policy_decision: "allow",                                  │ │
│  │       safety_result: { valid: true, risk_score: 0.02 },         │ │
│  │       execution_result: { success: true, size: 1024 },          │ │
│  │       duration_ms: 245                                           │ │
│  │     },                                                           │ │
│  │     hash: "sha256-...",                                          │ │
│  │     previousHash: "sha256-anterior...",                         │ │
│  │     timestamp: "2026-07-17T14:23:01Z"                           │ │
│  │   }                                                              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Benefícios:                                                         │
│  - Defesa em profundidade (policy + safety + audit)                 │
│  - Policy-as-code (OPA Rego) versionável e testável                 │
│  - Audit trail imutável com verificação de integridade              │
│  - Aprovação humana como último nível de segurança                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.5 Dagger + ArgoCD + OpenTofu

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Dagger + ArgoCD + OpenTofu                        │
│                                                                      │
│  Pipeline CI/CD Completo:                                            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │  DEV — Dagger (Pipeline as Code em TypeScript)                   ││
│  │                                                                  ││
│  │  dag = connect() → {                                              ││
│  │    pipeline("ideia-build")                                        ││
│  │      .then(lint)     → dag.container().from("node:20").exec(...) ││
│  │      .then(typecheck) → dag.container().from("node:20")...       ││
│  │      .then(test)      → dag.container().from("node:20")...       ││
│  │      .then(build)     → dag.container().from("node:20")...       ││
│  │      .then(package)   → dag.container().from("scratch")...       ││
│  │      .then(deployStaging) → deploy to K8s via ArgoCD             ││
│  │  }                                                                ││
│  │                                                                  ││
│  │  Vantagens:                                                      ││
│  │    • Pipeline portátil (roda local, CI/CD, cloud)                ││
│  │    • Cache inteligente entre execuções                          ││
│  │    • TypeScript = mesma linguagem do IDEIA                      ││
│  └──────────────────────────────────────────────────────────────────┘│
│                              │                                        │
│  ┌──────────────────────────┴──────────────────────────────────────┐ │
│  │  OPS — OpenTofu (IaC)                                           │ │
│  │                                                                  │ │
│  │  ├── providers/aws/main.tf → VPC, EKS, RDS, ElastiCache         │ │
│  │  ├── providers/vercel/main.tf → Project, Domains, Env Vars      │ │
│  │  ├── modules/k8s/main.tf → Namespace, ServiceAccount, RBAC     │ │
│  │  └── envs/{dev,staging,prod}.tfvars → Environment config       │ │
│  │                                                                  │ │
│  │  Fluxo:                                                          │ │
│  │    tofu init → tofu plan → tofu apply → state stored in S3      │ │
│  │                                                                  │ │
│  │  State Lock: DynamoDB (AWS) ou PostgreSQL                       │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                              │                                        │
│  ┌──────────────────────────┴──────────────────────────────────────┐ │
│  │  GITOPS — ArgoCD (Sincronização Contínua)                       │ │
│  │                                                                  │ │
│  │  Application:                                                    │ │
│  │    source:                                                       │ │
│  │      repoURL: "https://github.com/ideia/project-config"         │ │
│  │      path: "envs/production"                                     │ │
│  │      targetRevision: "main"                                      │ │
│  │    destination:                                                  │ │
│  │      server: "https://kubernetes.prod.svc"                      │ │
│  │      namespace: "ideia-production"                               │ │
│  │    syncPolicy:                                                   │ │
│  │      automated: { prune: true, selfHeal: true }                 │ │
│  │    sync: every 3 minutes                                         │ │
│  │                                                                  │ │
│  │  Fluxo Completo:                                                 │ │
│  │  ┌─────────────────────────────────────────────────────────────┐│ │
│  │  │ 1. Dev faz commit → GitHub → Dagger build + test            ││ │
│  │  │ 2. Dagger.generatedApp → docker build → push to registry    ││ │
│  │  │ 3. Dagger atualiza GitOps repo (new image tag)              ││ │
│  │  │ 4. ArgoCD detecta drift → sync → deploy new version         ││ │
│  │  │ 5. OpenTofu gerencia infra (cluster, DB, cache)             ││ │
│  │  └─────────────────────────────────────────────────────────────┘│ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Contratos:                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Dagger → OpenTofu:                                              │ │
│  │   dagger call tofu-apply --env production                       │ │
│  │   → dag.container().from("opentofu:latest")                      │ │
│  │        .withDirectory("/workspace", src)                         │ │
│  │        .withExec(["tofu", "init"])                                │ │
│  │        .withExec(["tofu", "apply", "-auto-approve"])              │ │
│  │                                                                  │ │
│  │ Dagger → ArgoCD:                                                 │ │
│  │   dagger call argocd-sync --app production                      │ │
│  │   → dag.container().from("argocd:latest")                        │ │
│  │        .withExec(["argocd", "app", "sync", "production"])         │ │
│  │                                                                  │ │
│  │ OpenTofu → ArgoCD:                                               │ │
│  │   OpenTofu gera manifests K8s → commit no GitOps repo →         │ │
│  │   ArgoCD detecta e sincroniza                                    │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Benefícios:                                                         │
│  - Pipeline portátil (Dagger) = dev, CI, cloud com mesmo código     │
│  - GitOps (ArgoCD) = rollback automático, auditoria por commit      │
│  - IaC (OpenTofu) = infra reproduzível, state versionado           │
│  - Cluster self-healing (ArgoCD reconcilia continuamente)          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Cruzamentos de Dados (Cross-Data Matrix)

| Fonte A | Fonte B | Cruzamento | Pipeline | Benefício |
|---------|---------|-----------|----------|-----------|
| **Memory Store** | **Audit Trail** | Decisões + contexto histórico | Memory.query(decisionId) ↔ Audit.query(eventId) | Rastreabilidade completa de cada decisão com contexto |
| **Pattern Detector** | **Knowledge Graph** | Padrões → nós e arestas | Pattern.match() → Neo4j MERGE (node:Pattern, rel:DETECTED_IN) | Visualização de tendências e clusterização de padrões |
| **Feedback Pipeline** | **Learning Engine** | Preferências → recomendações | Feedback.submit() → Learning.adapt() → Policy.update() | Personalização progressiva do comportamento da IDEIA |
| **Workflow Engine** | **Delivery Orchestrator** | Tarefas → releases | Cycle.complete() → Deploy.trigger(releaseNotes) | Rastreabilidade deploy-tarefa (que commit entregou qual feature) |
| **Chat** | **Memory Store** | Perguntas → contexto | Chat.query() → Memory.search() → Context.assemble() | Continuidade de sessão (IDEIA lembra o que foi falado antes) |
| **Risk Engine** | **Code Changes** | Risco por arquivo alterado | Risk.evaluate(files) → Score(risk) por módulo | Prevenção de incidentes (bloqueia deploy de código arriscado) |
| **RAG Engine** | **Knowledge Graph** | Documentação + relações | RAG.search() → Graph.traverse() → Context.enriched() | Documentação viva contextualizada com relações entre artefatos |
| **Event Bus** | **Observability** | Eventos → métricas | NATS stream → OpenTelemetry → Prometheus metrics | Monitoramento em tempo real da saúde do sistema |
| **Provider Router** | **Cost Tracker** | Uso de LLM → custo | Router.ask() → LangFuse.trace(cost) → Budget.check() | Controle de gastos por agente/projeto |
| **Guardrails** | **Audit Trail** | Violações → evidência | Guard.scan() → Violation → Audit.append(proof) | Compliance: cadeia de custódia de incidentes de segurança |
| **Theia Commands** | **Agent Runtime** | Ações do usuário → comandos dos agentes | Command.execute() → Agent.task() → Result | Integração IDE + Agentes (Ctrl+Shift+P executa agente) |
| **LSP Diagnostics** | **Pattern Detector** | Erros de compilação → padrões de erro | LSP.publishDiagnostics() → Pattern.match(diag) → Memory.save | Aprendizado de erros comuns do projeto |
| **Code Churn** | **Quality Gates** | Frequência de mudança → risco de qualidade | Git.churn(files) → QG.check(files) → Merge.block? | Prevenção de merges em arquivos com alta taxa de mudança |
| **Dependency Graph** | **SBOM** | Dependências → vulnerabilidades | DepGraph.scan() → SBOM.match(CVE) → Alert | Supply chain security automatizada |
| **Session Store** | **Memory Store** | Sessão atual → histórico cross-session | Session.active() → Memory.recall(similar) → Context.warm() | Warm start: IDEIA já sabe o contexto ao abrir projeto |
| **Feature Flags** | **Deploy Pipeline** | Flags → rollout gradual | Flag.check() → Deploy.canary(%) → Rollback.on(failure) | Entrega progressiva com zero downtime |
| **User Profile** | **Provider Router** | Preferências → modelo ideal | Profile.preferences → Router.select(model) | Seleção automática do melhor modelo por tarefa |
| **Approval Flow** | **Decision Log** | Aprovações → histórico decisório | Approval.grant → Decision.save → Chain.link | Checkpoint auditável de todas as aprovações humanas |

### Matriz de Correlação de Dados Detalhada

```
                    Memory  Audit  Pattern  Know.   Feedback  Learning  Workflow  Delivery  Chat  Risk  RAG   Event
                    Store   Trail  Detect.  Graph   Pipeline  Engine    Engine    Orc.                    Bus
Memory Store          -      🟢      🟢      🟢       🟢        🟢        🟡        🟡       🟢     🟡    🟢     🟡
Audit Trail           🟢     -       🟡      🟡       🟢        🟡        🟢        🟢       🟡     🟢    🟡     🟢
Pattern Detector      🟢     🟡      -       🟢       🟡        🟢        🟡        🟡       🟡     🟢    🟡     🟡
Knowledge Graph       🟢     🟡      🟢      -        🟡        🟡        🟡        🟡       🟡     🟢    🟢     🟡
Feedback Pipeline     🟢     🟢      🟡      🟡       -         🟢        🟡        🟢       🟡     🟡    🟡     🟢
Learning Engine       🟢     🟡      🟢      🟡       🟢        -         🟡        🟡       🟡     🟢    🟡     🟡
Workflow Engine       🟡     🟢      🟡      🟡       🟡        🟡        -         🟢       🟡     🟡    🟡     🟢
Delivery Orc.         🟡     🟢      🟡      🟡       🟢        🟡        🟢        -        🟡     🟢    🟡     🟢
Chat                  🟢     🟡      🟡      🟡       🟡        🟡        🟡        🟡       -      🟡    🟢     🟡
Risk Engine           🟡     🟢      🟢      🟢       🟡        🟢        🟡        🟢       🟡     -     🟡     🟡
RAG Engine            🟢     🟡      🟡      🟢       🟡        🟡        🟡        🟡       🟢     🟡    -      🟡
Event Bus             🟡     🟢      🟡      🟡       🟢        🟡        🟢        🟢       🟡     🟡    🟡     -

Legenda: 🟢 Alto valor de cruzamento | 🟡 Médio/Baixo | - Não se aplica
```

---

## 5. APIs Mapeadas

| Tecnologia | APIs Expostas | APIs Consumidas | Protocolo |
|-----------|--------------|----------------|-----------|
| **Theia Platform** | Command API, Widget API, Service API, Preference API | Monaco API, LSP, FileService | Inversify DI, JSON-RPC |
| **Monaco Editor** | editor.create(), registerCompletionProvider, registerHoverProvider, IStandaloneCodeEditor | LSP (via providers), Tree-sitter (via AST), Theia editor API | TypeScript Interface |
| **xterm.js** | Terminal.write(), Terminal.onData(), Terminal.fit(), Addon API | WebSocket (node-pty bridge) | EventEmitter |
| **node-pty** | spawn(), write(), resize(), kill(), onData(), onExit() | OS Shell (nativo) | Process IPC |
| **LSP** | textDocument/completion, definition, hover, references, rename, formatting, codeAction | LSP Server (typescript-language-server, pyright, rust-analyzer) | JSON-RPC 2.0 (WebSocket / stdio) |
| **DAP** | launch, attach, setBreakpoints, stackTrace, variables, continue, next, evaluate | DAP Server (node --inspect, debugpy) | JSON-RPC 2.0 |
| **Tree-sitter** | Parser.parse(), Tree.edit(), Query.matches() | Language Grammars (Wasm) | Wasm / N-API |
| **Provider Router** | ask(model, messages, stream), embed(model, text) | Ollama (/api/chat), OpenAI (/v1/chat/completions), Anthropic (/v1/messages), MCP tools | REST / SSE |
| **Ollama** | POST /api/chat, /api/generate, /api/embeddings, /api/tags, /api/pull | Model files (.gguf) | REST (OpenAI-compatible) |
| **OpenAI** | POST /v1/chat/completions, /v1/embeddings, /v1/moderations | — | REST (SSE streaming) |
| **Anthropic** | POST /v1/messages | — | REST (SSE streaming) |
| **Vercel AI SDK** | streamText(), generateText(), streamUI(), tool(), generateObject() | Provider Router (subjacente) | TypeScript SDK |
| **LangGraph** | StateGraph, Node, Edge, Checkpoint, BaseStore | Event Bus (checkpoints), MCP (tools) | Python/TS SDK |
| **CrewAI** | Agent (role, goal, tools), Task (description, expected_output), Crew (agents, tasks) | LangChain (tools), LLM providers | Python SDK |
| **MCP Server** | tools/list, tools/call, resources/list, resources/read, prompts/list, prompts/get | File System, Shell, Sandbox | JSON-RPC 2.0 (stdio / SSE) |
| **A2A Protocol** | POST /a2a/agentCard, /a2a/taskSend, /a2a/taskStream | Agent Registry (descoberta) | REST / SSE |
| **SQLite** | SQL (SELECT, INSERT, UPDATE, DELETE), FTS5, sqlite-vec (vector search) | — | SQL (better-sqlite3 / sql.js) |
| **DuckDB** | SQL (SELECT, aggregation, window), sqlite_scanner, parquet | SQLite (via sqlite_scanner), Event Bus (streams) | SQL (@duckdb/node-api) |
| **Neo4j** | Cypher (MATCH, CREATE, MERGE), Bolt Protocol, GraphQL (@neo4j/graphql) | — | Bolt TCP / HTTP |
| **Mem0** | Memory.add(), Memory.search(), Memory.get(), Memory.delete() | Sqlite/Qdrant (storage), LLM (entity extraction) | REST / Python SDK |
| **NATS + JetStream** | publish(), subscribe(), request(), JetStream: publish(), subscribe(), consumer(), KV store | — | NATS Protocol (TCP) |
| **Schema Registry** | register(schema), validate(subject, version, payload), resolve(id) | Event Bus (validação) | REST / Event |
| **Event Bus** | publish(type, payload), subscribe(type, handler), request(type, payload, timeout) | NATS (backing transport), Schema Registry | TypeScript Interface |
| **WebSocket / SSE** | new WebSocket(url), ws.send(), ws.onmessage(), EventSource(url), es.onmessage() | Event Bus (broker internals) | WebSocket / SSE |
| **Audit Trail** | append(event), query(filter), verifyChain(), replay(from, to) | Event Bus (events source) | File (JSONL) / API |
| **Policy Engine** | evaluate(action, context, subject), checkPermission(), registerPolicy() | Agent Identity (JWT), OPA (sidecar) | REST / TypeScript |
| **OPA / Cedar** | POST /v1/data/{path} (OPA), evaluate({principal, action, resource}) (Cedar) | — | REST / Wasm |
| **LLM Guard** | scan(input, scanners), scan_output(output, scanners) | — | Python SDK / REST |
| **JWT / RBAC / OAuth2** | jwt.sign()/verify(), checkPermission(role, action), OAuth2 endpoints | Agent Identity Service | REST |
| **Agent Runtime** | execute(taskId, plan), registerAgent(agent), getAgentStatus(agentId) | Policy Engine, Memory Store, Event Bus | TypeScript Interface |
| **Task Planner** | plan(idea, context), decompose(plan), generateCheckpoints(plan) | LLM Provider (via Router), Memory Store | TypeScript Interface |
| **Workflow Engine** | startCycle(plan), executeCycle(), getCycleStatus() | Event Bus (cycle events), Task Runner | TypeScript Interface |
| **Delivery Orchestrator** | deploy(project, env), rollback(project, version), release(project) | Workflow Engine, Git, Docker, ArgoCD | REST / CLI |
| **Dagger** | connect(), pipeline(), container().from(), container().exec() | Docker, GitHub Actions | Go SDK (TS bindings) |
| **ArgoCD** | Application CRD, REST API (sync, get, list), gRPC | Kubernetes | REST / gRPC |
| **OpenTofu** | tofu init/plan/apply/destroy, state management | Cloud Providers (AWS, GCP, Azure) | CLI / HCL |
| **Docker** | docker build/run/compose/push/pull, Docker API | Container Registry, K8s | Docker API / CLI |
| **Kubernetes** | kubectl apply/get/delete/logs, K8s API | Docker, ArgoCD, Prometheus | REST / CRDs |
| **Redis** | SET/GET, PUBLISH/SUBSCRIBE, XADD/XREAD, FT.SEARCH, JSON.SET | Event Bus (pub/sub), Memory Store (cache) | RESP (ioredis) |
| **OpenTelemetry** | tracer.startSpan(), span.setAttributes(), meter, logger | Exporter (Prometheus, Jaeger, Loki) | OTLP |
| **LangFuse** | trace(), span(), generation(), score() | OpenTelemetry, LLM providers | REST |
| **Prometheus** | GET /api/v1/query, POST /api/v1/query_range, /metrics | OpenTelemetry (exporter) | HTTP / Pull |
| **Grafana** | POST /api/dashboards/db, Data Sources, Alerting | Prometheus, Loki | REST |
| **Sentry** | init(), captureException(), captureMessage(), startTransaction() | — | REST / SDK |
| **GitHub Actions** | workflow_dispatch, artifacts, status check | Docker, Dagger | YAML / REST API |
| **File Service** | read(uri), write(uri, content), watch(uri), access(uri) | OS File System (Node.js fs) | TypeScript Interface |
| **Sandbox** | execute(code, options), createSandbox(context), destroySandbox() | Docker (container isolado) | REST / Docker API |

---

## 6. Matriz de Compatibilidade

| Tech 1 | Tech 2 | Compatível? | Observação |
|--------|--------|:-----------:|------------|
| Theia | Monaco | ✅ **Nativo** | Theia usa Monaco como editor padrão (mesmo fork do VS Code) |
| Theia | LSP | ✅ **Nativo** | @theia/editor → @theia/monaco → monaco-languageclient → LSP |
| Theia | DAP | ✅ **Nativo** | @theia/debug integra DAP client |
| Theia | xterm.js | ✅ **Nativo** | @theia/terminal integra xterm.js + node-pty |
| Theia | VS Code Extensions | ✅ **Compatível** | OpenVSX + VS Code Extension API (~100% compatível) |
| Theia | InversifyJS | ✅ **Nativo** | Theia usa InversifyJS como DI container |
| Theia | NATS | ✅ **Sim** | Via extensão/adapter (EventBus → NATS bridge) |
| Theia | MCP | ✅ **Sim** | Theia AI ToolProvider + MCP Server |
| Theia | Ollama | ✅ **Sim** | Theia AI LanguageModelRegistry → Provider Router |
| Monaco | LSP | ✅ **Nativo** | monaco-languageclient bridge |
| Monaco | Tree-sitter | ✅ **Sim** | Parsing incremental, AST para AI context |
| Monaco | CodeMirror | ⚠️ **Competem** | Ambos são editores; coexistiria para chat code blocks (CodeMirror leve) |
| xterm.js | node-pty | ✅ **Nativo** | WebSocket bridge + PTY backend |
| LSP | Tree-sitter | ✅ **Complementares** | LSP para recursos de linguagem, TS para AST incremental |
| LangGraph | CrewAI | ⚠️ **Parcial** | Diferentes paradigmas de estado (graph vs role-based) |
| LangGraph | NATS | ✅ **Sim** | Checkpoints via JetStream, comunicação inter-node |
| CrewAI | NATS | ✅ **Sim** | Queue groups para workers, request-reply para tasks |
| DuckDB | SQLite | ✅ **Sim** | sqlite_scanner permite DuckDB ler SQLite diretamente |
| DuckDB | MinIO | ✅ **Sim** | DuckDB lê Parquet do MinIO via s3 scanner |
| SQLite | Mem0 | ✅ **Sim** | SQLite como backing store, Mem0 para extração de entidades |
| Mem0 | Neo4j | ✅ **Sim** | Mem0 usa Neo4j como graph storage (Mem0 Pro) |
| NATS | Kafka | ✅ **Bridge possível** | NATS → Kafka bridge via adaptador (se escala exigir) |
| NATS | Redis | ✅ **Complementares** | NATS mensageria, Redis cache/sessão |
| NATS | Schema Registry | ✅ **Integrável** | Headers NATS com version + Schema Registry validation |
| OPA | NATS | ✅ **Sim** | OPA sidecar ou plugin com NATS para policy distribution |
| OPA | Cedar | ✅ **Substituíveis** | Ambos policy engines; escolha por sintaxe (Rego vs Cedar) |
| OPA | Policy Engine | ✅ **Sim** | OPA como backend do Policy Engine existente |
| LLM Guard | rebuff | ✅ **Complementares** | LLM Guard para PII/jailbreak, rebuff para prompt injection |
| Guardrails | Provider Router | ✅ **Integrável** | Guardrails como middleware antes/depois de LLM calls |
| JWT | OPA | ✅ **Sim** | JWT roles/claims como input para OPA policies |
| JWT | RBAC | ✅ **Nativo** | JWT carrega roles, RBAC verifica permissões |
| ArgoCD | OpenTofu | ✅ **Sim** | OpenTofu provisiona infra, ArgoCD deploya apps |
| ArgoCD | Flagger | ✅ **Sim** | ArgoCD sync + Flagger canary releases |
| Dagger | ArgoCD | ✅ **Sim** | Dagger build → commit GitOps → ArgoCD sync |
| Dagger | GitHub Actions | ✅ **Complementares** | Dagger roda dentro de GitHub Actions |
| OpenTofu | Kubernetes | ✅ **Nativo** | Kubernetes provider para OpenTofu |
| Prometheus | Grafana | ✅ **Nativo** | Grafana datasource = Prometheus |
| OpenTelemetry | LangFuse | ✅ **Sim** | OTel exporter para LangFuse |
| OpenTelemetry | Prometheus | ✅ **Sim** | OTel Collector → Prometheus exporter |
| Neo4j | GraphRAG | ✅ **Sim** | GraphRAG pode usar Neo4j como storage |
| ChromaDB | LangChain | ✅ **Nativo** | LangChain ChromaDB vector store |
| Electron | Theia | ✅ **Nativo** | Electron é o shell padrão do Theia |
| Tauri | Theia | ❌ **Não recomendado** | Theia depende de Node.js backend (Tauri usa Rust) |
| Tauri | Monaco | ✅ **Sim** | Monaco em webview Tauri, sem ecossistema Theia |
| Ollama | Phi-4 | ✅ **Nativo** | phi4/phi4-mini disponível em Ollama |
| Ollama | DeepSeek-Coder-V2 | ✅ **Nativo** | deepseek-coder-v2 em Ollama |
| Ollama | Qwen2.5-Coder | ✅ **Nativo** | qwen2.5-coder em Ollama |
| OpenAI | Vercel AI SDK | ✅ **Nativo** | OpenAI provider nativo no AI SDK |
| Anthropic | MCP | ✅ **Nativo** | Claude tem suporte nativo a MCP tools |
| Gemini | Genkit | ✅ **Nativo** | Genkit é o framework Google para Gemini |
| WebSocket | NATS | ✅ **Bridge** | WSBroadcast como bridge NATS → WebSocket |
| SSE | Provider Router | ✅ **Nativo** | SSE streaming para chat responses |
| Audit Trail | Event Bus | ✅ **Nativo** | Event Bus alimenta Audit Trail |
| Sandbox | Docker | ✅ **Sim** | Sandbox usa Docker para isolamento |
| Task Runner | MCP | ✅ **Sim** | MCP tools como interface entre LLM e Task Runner |

### Matriz de Compatibilidade Visual (por categorias)

```
        Theia  Monaco LSP   xterm  NATS   K8s    DuckDB Neo4j  OPA    MCP    LangG  CrewAI  Redis
Theia     -     ✅    ✅     ✅     ✅     🟡     🟡     🟡     ✅     ✅     🟡     🟡      🟡
Monaco    ✅     -    ✅     ❌     ❌     ❌     ❌     ❌     ❌     ✅     ❌     ❌      ❌
LSP       ✅     ✅    -     ❌     ❌     ❌     ❌     ❌     ❌     🟡     ❌     ❌      ❌
xterm     ✅     ❌    ❌     -     ❌     ❌     ❌     ❌     ❌     ❌     ❌     ❌      ❌
NATS       ✅    ❌    ❌     ❌     -     ✅     ✅     ❌     ✅     ✅     ✅     ✅      ✅
K8s        🟡    ❌    ❌     ❌     ✅     -     ✅     ❌     ✅     ❌     ❌     ❌      ❌
DuckDB     🟡    ❌    ❌     ❌     ✅     ✅     -     ❌     ❌     ❌     ❌     ❌      ❌
Neo4j      🟡    ❌    ❌     ❌     ❌     ❌     ❌     -     ❌     🟡     🟡     ❌      ❌
OPA        ✅    ❌    ❌     ❌     ✅     ✅     ❌     ❌     -      ❌     ❌     ❌      ✅
MCP        ✅    ✅    🟡     ❌     ✅     ❌     ❌     🟡     ❌     -      ✅     ❌      ❌
LangGraph  🟡    ❌    ❌     ❌     ✅     ❌     ❌     🟡     ❌     ✅     -      ⚠️      ❌
CrewAI     🟡    ❌    ❌     ❌     ✅     ❌     ❌     ❌     ❌     ❌     ⚠️      -       ❌
Redis      🟡    ❌    ❌     ❌     ✅     ❌     ❌     ❌     ✅     ❌     ❌     ❌       -

Legenda: ✅ Nativo/Compatível | 🟡 Possível com adapter | ⚠️ Parcial/Competem | ❌ Não se aplica
```

---

## 7. Recomendações de Stacking

### Perfil: Desenvolvedor Solo (MVP)

```
┌──────────────────────────────────────────────────────────────────────┐
│                DESENVOLVEDOR SOLO — MVP RÁPIDO                        │
│                                                                      │
│  Stack: Theia + Ollama + SQLite + NATS (embedded) + DuckDB           │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │ Theia Platform (Kernel + IDE Shell)                              ││
│  │  ├─ Monaco Editor + LSP (TypeScript, Python)                     ││
│  │  ├─ xterm.js + node-pty                                         ││
│  │  └─ Chat Agent (IDEIA Core, 5 agentes)                          ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ Ollama (local LLMs)                                              ││
│  │  ├─ DeepSeek-Coder-V2 (code gen)                                ││
│  │  ├─ Phi-4-mini (edge/offline)                                   ││
│  │  └─ nomic-embed-text (embeddings)                               ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ SQLite + FTS5 + sqlite-vec (persistência única)                  ││
│  │  ├─ Memory Store, Vector Store, Context Store                   ││
│  │  └─ tudo em um arquivo .db                                      ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ NATS (embedded, single-node) + Event Bus                        ││
│  │  ├─ Pub/Sub para eventos internos                               ││
│  │  └─ JetStream para persistência de eventos                     ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ DuckDB (analytics local)                                         ││
│  │  ├─ Lê SQLite via sqlite_scanner                                ││
│  │  └─ Padrões, métricas de produtividade                          ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Custos: $0/mês (tudo local e open-source)                          │
│  Modelos via Ollama: phi4, deepseek-coder-v2, qwen2.5-coder         │
│  Deploy: Manual ou GitHub Actions (gratuito)                        │
│  Segurança: Policy Engine (27 patterns) + Guardrails básicos        │
│  Ideal para: Indie hackers, freelancers, aprendizes                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Perfil: Startup (crescendo)

```
┌──────────────────────────────────────────────────────────────────────┐
│                STARTUP — TIME ENXUTO, CRESCENDO                      │
│                                                                      │
│  Stack: Theia + OpenAI + PostgreSQL + NATS (server) + ArgoCD         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │ Theia Platform (IDE completa)                                    ││
│  │  ├─ Monaco + LSP + DAP (debug integrado)                       ││
│  │  ├─ xterm.js + node-pty + Sandbox (Docker)                      ││
│  │  └─ Chat + Agents (10+ especializados)                           ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ OpenAI (GPT-4o, o1) + Ollama (fallback offline)                 ││
│  │  ├─ GPT-4o para raciocínio principal                            ││
│  │  ├─ o1 para planejamento complexo                               ││
│  │  └─ Ollama como fallback (sem internet)                         ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ PostgreSQL + pgvector (storage unificado)                        ││
│  │  ├─ Relacional: projetos, sessões, decisões                     ││
│  │  ├─ Vetorial: RAG, memória semântica                            ││
│  │  └─ Um banco para tudo                                          ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ NATS (server cluster 3 nós) + JetStream                          ││
│  │  ├─ Event Bus para todos os módulos                             ││
│  │  ├─ Queue Groups para agentes paralelos                         ││
│  │  └─ KV Store para configuração distribuída                     ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ ArgoCD + OpenTofu (GitOps + IaC)                                ││
│  │  ├─ Deploy GitOps para Kubernetes (K3s)                         ││
│  │  ├─ IaC versionada (Vercel + Neon + Stripe)                     ││
│  │  └─ Rollback automático via ArgoCD                              ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ OPA + Guardrails + Audit Trail (segurança)                       ││
│  │  ├─ Policy-as-code (OPA Rego)                                   ││
│  │  ├─ LLM Guard + rebuff (safety)                                 ││
│  │  └─ Audit trail HMAC-chain (compliance)                        ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Custos: $29-199/mês (OpenAI API + Cloud Pro)                       │
│  Modelos: GPT-4o (primário), Ollama (fallback)                      │
│  Deploy: GitOps com ArgoCD + OpenTofu                               │
│  Segurança: OPA + Guardrails + Audit Trail HMAC                    │
│  Ideal para: Startup early-stage, PME com time enxuto               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Perfil: Enterprise (compliance)

```
┌──────────────────────────────────────────────────────────────────────┐
│                ENTERPRISE — COMPLIANCE, ESCALA, GOVERNANÇA           │
│                                                                      │
│  Stack: Theia + Azure OpenAI + Neo4j + Kafka + OPA + ArgoCD + Tofu  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │ Theia Platform + Theia Cloud (desktop + web)                      ││
│  │  ├─ Theia Cloud sobre Kubernetes (auto-scaling)                  ││
│  │  ├─ SSO via Keycloak + OAuth2 + SAML                            ││
│  │  ├─ Multi-workspace com isolamento total                        ││
│  │  └─ Agents customizados + Marketplace privado                    ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ Azure OpenAI + Anthropic (Claude 4) + modelos privados           ││
│  │  ├─ Azure OpenAI (compliance LGPD/HIPAA/SOC2)                   ││
│  │  ├─ Claude 4 para code generation                              ││
│  │  ├─ Modelos fine-tunados privados (via Azure)                   ││
│  │  └─ Roteamento por custo/latência (OpenRouter Enterprise)       ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ Neo4j (knowledge graph) + PostgreSQL + Kafka + MinIO             ││
│  │  ├─ Neo4j: GraphRAG, rastreabilidade completa                   ││
│  │  ├─ PostgreSQL: dados relacionais + pgvector                    ││
│  │  ├─ Kafka: streaming de eventos massivo                         ││
│  │  └─ MinIO: object storage S3 (modelos, snapshots, logs)        ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ OPA + Cedar (dual policy engine) + LLM Guard + Audit Trail       ││
│  │  ├─ OPA para policies gerais (Rego) + Cedar para AWS Verified   ││
│  │  ├─ LLM Guard Enterprise (PII, jailbreak, data leakage)         ││
│  │  ├─ Audit trail criptográfico imutável (chain HMAC)             ││
│  │  └─ Relatórios de compliance automáticos (SOC2, HIPAA, LGPD)    ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ ArgoCD + OpenTofu + Flagger (GitOps + IaC + Canary)             ││
│  │  ├─ GitOps multi-cluster (dev, staging, prod, DR)               ││
│  │  ├─ IaC com OpenTofu (1000+ providers)                          ││
│  │  ├─ Canary deploy com Flagger (métricas Prometheus)             ││
│  │  └─ Feature flags (Unleash) + rollout progressivo               ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ Prometheus + Grafana + Loki + Sentry + LangFuse (observability) ││
│  │  ├─ OpenTelemetry como backbone unificado                       ││
│  │  ├─ Dashboards executivos + técnicos                           ││
│  │  ├─ Alertas com SLOs/SLIs definidos                            ││
│  │  ├─ Cost tracking por agente/projeto (LangFuse)                ││
│  │  └─ Error tracking com Sentry (source maps, releases)          ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Custos: $199-999+/mês (Azure OpenAI + Enterprise + infra)          │
│  Modelos: Azure OpenAI + Claude 4 + modelos privados fine-tunados   │
│  Segurança: OPA + Cedar + LLM Guard + Audit + Garak (red teaming)  │
│  Deploy: GitOps multi-cluster + Canary + Feature Flags             │
│  Compliance: SOC2, HIPAA, LGPD, GDPR (pronto para auditoria)       │
│  Ideal para: Empresas com compliance, times grandes, multi-projeto  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Perfil: Pesquisa & Experimental

```
┌──────────────────────────────────────────────────────────────────────┐
│                PESQUISA — EXPLORAÇÃO DE FRONTEIRA                    │
│                                                                      │
│  Stack: Theia + LangGraph + CrewAI + Mamba-2 + GraphRAG + SSM       │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │ Theia + Theia AI (CODiE Award 2025)                              ││
│  │  ├─ Agentes customizados (Theia Extensions)                     ││
│  │  └─ Experimentos com novos patterns de interação                ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ Mamba-2-Hybrid (SSM) + MCP (ferramentas)                        ││
│  │  ├─ Modelo SSM para contexto muito longo (256K+)               ││
│  │  ├─ 5x mais rápido que Transformer em inference                 ││
│  │  └─ MCP Tools para interação do modelo com IDE                 ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ GraphRAG + Neo4j (conhecimento hierárquico)                      ││
│  │  ├─ Extração de knowledge graph via LLM                         ││
│  │  ├─ Community detection (Leiden) + sumários hierárquicos        ││
│  │  └─ Query local (detalhe) vs global (visão geral)              ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ A2A Protocol + Agentic RAG (comunicação inter-agente)           ││
│  │  ├─ A2A para comunicação direta agente-agente                  ││
│  │  ├─ Agentic RAG com iterações de busca e raciocínio            ││
│  │  └─ Memória auto-gerenciada (Letta/MemGPT pattern)             ││
│  ├──────────────────────────────────────────────────────────────────┤│
│  │ DuckDB + Apache Iceberg + Wasm (analytics + data lake)          ││
│  │  ├─ Iceberg para data lake de eventos (time travel)            ││
│  │  ├─ DuckDB query engine sobre Iceberg                          ││
│  │  └─ Wasm para plugins seguros e parsing eficiente              ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Foco: Pesquisa em novas arquiteturas de agentes                    │
│  Modelos SSM: Mamba-2-Hybrid, arquiteturas não-Transformer          │
│  Protocolos: A2A, MCP, FIPA-ACL (referência acadêmica)              │
│  Memória: GraphRAG, Letta, Mem0, Graphiti (temporal)               │
│  Ideal para: Laboratórios de pesquisa, inovação, exploração        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Perfil: Comparação de Stacks por Dimensão

| Dimensão | Solo (MVP) | Startup | Enterprise | Pesquisa |
|----------|:----------:|:-------:|:----------:|:--------:|
| **Custo mensal** | $0 | $29-199 | $199-999+ | $0-500 |
| **Setup inicial** | 1 dia | 1 semana | 1-4 semanas | 2-5 dias |
| **LLM primário** | Ollama (local) | OpenAI GPT-4o | Azure OpenAI | Mamba-2 (SSM) |
| **LLM fallback** | — | Ollama | Anthropic Claude | Ollama |
| **Armazenamento** | SQLite | PostgreSQL | Neo4j+PG+Kafka | Iceberg+DuckDB |
| **Mensageria** | NATS embarcado | NATS cluster | Kafka | NATS + A2A |
| **Segurança** | Policy Engine | OPA+Guardrails | OPA+Cedar+Audit | OPA |
| **CI/CD** | GitHub Actions | ArgoCD+OpenTofu | ArgoCD+Flagger | Dagger |
| **Observabilidade** | — | Prometheus+Grafana | OTel+Loki+Sentry | LangFuse |
| **Memória** | SQLite+vec | pgvector+Mem0 | Neo4j+GraphRAG | GraphRAG+Letta |
| **Desktop** | Web-only | Theia+Electron | Theia+Theia Cloud | Theia |
| **Extensibilidade** | — | VS Code Ext | Marketplace privado | Theia Extensions |
| **Compliance** | — | Básico | SOC2/HIPAA/LGPD | — |
| **Multi-agente** | 5 fixos | 10+ | Ilimitados | LangGraph+CrewAI |

---

## Apêndice A: Glossário de Contratos

| Termo | Definição |
|-------|-----------|
| **Contrato** | Interface formal entre dois sistemas que define formato, protocolo, garantias e comportamentos esperados |
| **Protocolo** | Regras de comunicação (formato das mensagens, sequência, tratamento de erros) |
| **Schema** | Definição estrutural dos dados que trafegam (TypeScript interface, JSON Schema, Avro, Protobuf) |
| **Garantia** | Nível de entrega: at-most-once, at-least-once, exactly-once |
| **Timeout** | Tempo máximo de espera por uma resposta antes de considerar falha |
| **Retry** | Política de repetição em caso de falha (número de tentativas, backoff) |
| **DLQ** | Dead Letter Queue — fila onde mensagens que excederam retries são isoladas para análise |
| **TraceId** | Identificador único de correlação que atravessa todos os sistemas em um fluxo |
| **Outbox Pattern** | Padrão que garante consistência entre estado e evento (escreve ambos na mesma transação) |
| **Saga** | Sequência de transações locais com compensações em caso de falha |

## Apêndice B: Referências Cruzadas com a Matriz Tecnológica

| Seção deste documento | Referência na Matriz Tecnológica |
|----------------------|----------------------------------|
| 1. Camada 9 — Interface | A1 (Theia), J1 (Electron), J2 (Tauri) |
| 1. Camada 8 — Apresentação | A2 (VS Code API), A3 (Monaco), A4 (CodeMirror), A5 (xterm.js), J4 (React/Vite) |
| 1. Camada 7 — Agentes | B6 (LangChain/LangGraph), B7 (CrewAI), B8 (AutoGen), K1 (MCP), K2 (A2A) |
| 1. Camada 6 — Inteligência | B1-B11 (LLMs e frameworks), K5 (Artefatos), C1-C8 (Modelos) |
| 1. Camada 5 — Memória | D1-D8 (Memória e Conhecimento) |
| 1. Camada 4 — Execução | A6 (node-pty), A7 (LSP), A8 (DAP), A9 (Tree-sitter), G4 (Docker) |
| 1. Camada 3 — Mensageria | E1-E7 (Mensageria e Eventos) |
| 1. Camada 2 — Segurança | F1-F7 (Segurança e Governança) |
| 1. Camada 1 — Infraestrutura | G4-G8 (CI/CD), I1-I4 (Armazenamento) |
| 1. Camada 0 — Kernel | A1 (Theia), J1 (Electron), K4 (Message Patterns) |
| 3. Empilhamentos | Diagrama de Stacking Geral (p.1452), Roadmap de Adoção (p.1610) |
| 4. Cross-Data | Cross-Data Matrix (p.1531) + D1-D8 |
| 5. APIs Mapeadas | APIs e Contratos de cada tecnologia na Matriz |
| 6. Compatibilidade | Conexões e Stacking de cada tecnologia na Matriz |
| 7. Recomendações | Prioridades (P0-P3) e Roadmap de Adoção |

---

> **Documento gerado em:** 2026-07-17
> **Versão:** 1.0
> **Propósito:** Mapeamento completo de empilhamento tecnológico, contratos de integração e APIs para a plataforma IDEIA
> **Tecnologias referenciadas:** 65 (ver MATRIZ-TECNOLOGICA-COMPLETA.md)
> **Contratos definidos:** 20+ entre camadas e intra-camada
> **Schemas de dados compartilhados:** 5 (AgentArtifact, BusEvent, Decision, Task, Memory)
> **Empilhamentos analisados:** 5 (Theia+ai-devkit+LLMs, NATS+LangGraph+CrewAI, DuckDB+SQLite+Mem0, OPA+Guard+Audit, Dagger+ArgoCD+Tofu)
> **Cruzamentos de dados:** 18 pares analisados
> **APIs mapeadas:** 48 tecnologias
> **Pares de compatibilidade:** 60+ analisados
> **Perfis de stacking:** 4 (Solo MVP, Startup, Enterprise, Pesquisa)
