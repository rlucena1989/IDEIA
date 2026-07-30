# Plano de Implementação Detalhado — IDEIA

> **Transformação do ai-devkit em IDEIA — IDE que parte de uma ideia e entrega sistemas completos com máxima autonomia**
>
> **Data:** 2026-07-17
> **Versão:** 1.0
> **Baseado em:** 8 estudos modulares (ESTUDO-COMPLETO-FLUXO-IDEIA-ENTREGA, BARRAMENTO-EVENTOS, INTENT-TO-PLAN, SEGURANCA-PROMPT, ORQUESTRACAO-MULTIAGENTE, PIPELINE-VERIFICACAO-QUALIDADE, APRENDIZADO-ADAPTATIVO, MEMORIA-E-CONTEXTO)
> **Total de tarefas:** 67 tarefas técnicas + 22 tarefas de qualidade + 21 QA = **110 tarefas**

---

## Sumário

1. [Macro Roadmap (6 Fases)](#1-macro-roadmap-6-fases)
2. [Tarefas Detalhadas por Fase](#2-tarefas-detalhadas-por-fase)
3. [Tarefas de Qualidade (Quality Assurance)](#3-tarefas-de-qualidade-quality-assurance)
4. [Marcos (Milestones)](#4-marcos-milestones)
5. [Gestão de Riscos do Plano](#5-gestao-de-riscos-do-plano)

---

## 1. Macro Roadmap (6 Fases)

```
FASE 0 ───────────────────────────────────────────────────── Semanas 1-4
│  FUNDAÇÃO IDEIA              │  15 tarefas técnicas + 4 QA          │
│  Chat streaming SSE, File    │  Núcleo da IDE funcional             │
│  CRUD, Memory Context,       │  Dashboard real, Quick Open          │
│  Dashboard, Status Bar       │  Quality gates iniciais              │
├──────────────────────────────┴──────────────────────────────────────┤
FASE 1 ───────────────────────────────────────────────────── Semanas 5-8
│  INFRAESTRUTURA E CONEXÃO    │  12 tarefas técnicas + 4 QA          │
│  NATS JetStream, 6 módulos   │  Event bus maduro, memória          │
│  conectados, DLQ, Outbox     │  persistente, audit hash chain      │
├──────────────────────────────┴──────────────────────────────────────┤
FASE 2 ──────────────────────────────────────────────────── Semanas 9-12
│  SEGURANÇA E INTELIGÊNCIA    │  10 tarefas técnicas + 4 QA          │
│  LLM Guard, Intent Classifier│  Segurança real, inteligência       │
│  ADAPT decomposition, Output │  LLM-based em todos os módulos      │
│  Validation                  │                                      │
├──────────────────────────────┴──────────────────────────────────────┤
FASE 3 ─────────────────────────────────────────────────── Semanas 13-20
│  MULTIAGENTE                 │  10 tarefas técnicas + 3 QA          │
│  Agent Collaboration,        │  Orquestração multiagente,          │
│  Message Pool, Supervisor,   │  Pipeline 6 agentes, LangGraph      │
│  Debate, Theia               │                                      │
├──────────────────────────────┴──────────────────────────────────────┤
FASE 4 ─────────────────────────────────────────────────── Semanas 21-28
│  PIPELINE DE ENTREGA         │  9 tarefas técnicas + 3 QA           │
│  GitOps, IaC, Feature Flags, │  Entrega automatizada, terminal     │
│  Progressive Delivery,       │  real, observabilidade              │
│  xterm.js + node-pty         │                                      │
├──────────────────────────────┴──────────────────────────────────────┤
FASE 5 ─────────────────────────────────────────────────── Semanas 29-40
│  APRENDIZADO E EXCELÊNCIA    │  11 tarefas técnicas + 4 QA          │
│  Cross-project learning,     │  Autonomia adaptativa, fine-tuning  │
│  Knowledge Graph, Reflection,│  GraphRAG, analytics                │
│  DuckDB, Fine-tuning         │                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tarefas Detalhadas por Fase

---

### FASE 0 — Fundação IDEIA (Semanas 1-4)

**Foco:** Construir o núcleo da IDE com chat streaming, file CRUD, integração memory→chat, dashboard real, Quick Open, Status Bar, e quality gates iniciais.

---

#### TASK-IDEIA-001: Chat Streaming SSE — Backend
- **Fase:** 0 | **Dependências:** Nenhuma | **Esforço:** 4 dias | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Implementar SSE endpoint POST /api/chat/stream que retorna 	ext/event-stream com chunks da resposta LLM. Adicionar streamQuery() na interface ProviderRouter. Implementar cancelamento via AbortController.
- **Arquivos:** packages/cli/src/ide/api-router.ts, packages/cli/src/local-ai/providers/, packages/contracts/src/, packages/web-ui/src/lib/api.ts
- **Componentes:** cli, web-ui, contracts, local-ai
- **Critérios:** SSE retorna chunks; cancelamento funcional; fallback non-streaming; latência first-token < 500ms
- **Testes:** Unitário (streamQuery), Integração (SSE endpoint), E2E (chat streaming visível)

#### TASK-IDEIA-002: Chat UI Component (ChatMessage + ChatInput)
- **Fase:** 0 | **Dependências:** 001 | **Esforço:** 5 dias | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Criar componentes React: ChatMessage (markdown + syntax highlight + diffs + approval), ChatInput (textarea multiline, Ctrl+Enter), ChatContainer (scroll automático, loading). Substituir AgentMode esqueleto.
- **Arquivos:** packages/web-ui/src/components/chat/ChatMessage.tsx, ChatInput.tsx, ChatContainer.tsx, ChatHistory.tsx, packages/web-ui/src/App.tsx
- **Componentes:** web-ui
- **Critérios:** Markdown renderizado; input expande; scroll automático; Ctrl+Enter envia; loading animation; histórico preservado na sessão
- **Testes:** Unitário (renderização), Integração (input→message), E2E (conversa completa)

#### TASK-IDEIA-003: File CRUD Endpoints (POST/PATCH/DELETE)
- **Fase:** 0 | **Dependências:** Nenhuma | **Esforço:** 3 dias | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Implementar REST endpoints: POST /api/fs/write, PATCH /api/fs/rename, DELETE /api/fs/delete. Validação anti-path-traversal, backup automático pré-sobrescrita.
- **Arquivos:** packages/cli/src/ide/api-router.ts, packages/cli/src/ide/file-bridge.ts, packages/contracts/src/types.ts, packages/web-ui/src/lib/api.ts
- **Componentes:** cli, web-ui, contracts
- **Critérios:** CRUD funcional; path traversal bloqueado; backup .ai/backups/ criado
- **Testes:** Unitário (validação path), Integração (CRUD HTTP), Segurança (path traversal attempts)

#### TASK-IDEIA-004: Context Menu na Árvore de Arquivos
- **Fase:** 0 | **Dependências:** 003 | **Esforço:** 3 dias | **Complexidade:** Média | **Risco:** Baixo
- **Descrição:** Context menu no FileExplorer: Novo Arquivo, Nova Pasta, Renomear, Deletar, Duplicar, Copiar Path. Atalhos F2 (rename), Delete (confirmação).
- **Arquivos:** packages/web-ui/src/components/FileExplorer.tsx, ContextMenu.tsx, hooks/useFileActions.ts
- **Componentes:** web-ui
- **Critérios:** Clique direito abre menu; ações executam CRUD; inline rename; confirmação deleção
- **Testes:** Unitário (ações disparam chamadas), E2E (criar→renomear→deletar via menu)

#### TASK-IDEIA-005: File Watcher Nativo (chokidar + SSE)
- **Fase:** 0 | **Dependências:** Nenhuma | **Esforço:** 3 dias | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Substituir polling 2s por chokidar. Propagar eventos (add/change/unlink) via SSE. Debounce 300ms, ignorar node_modules/.git/dist.
- **Arquivos:** packages/cli/src/ide/file-bridge.ts, pi-router.ts, packages/web-ui/src/hooks/useFileWatcher.ts
- **Componentes:** cli, web-ui
- **Critérios:** Mudanças aparecem em < 500ms; node_modules ignorado; debounce funcional; fallback polling 2s
- **Testes:** Unitário (detecção), Integração (SSE events), Performance (1000 arquivos)

#### TASK-IDEIA-006: Memory -> Chat Context Integration
- **Fase:** 0 | **Dependências:** Nenhuma | **Esforço:** 3 dias | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Integrar PatternDetector + MemoryStore + ContextStore no fluxo do chat. Antes de cada LLM call, consultar memória por decisões relevantes, padrões, preferências. Montar contexto formatado como system prompt.
- **Arquivos:** packages/cli/src/memory/context-store.ts, memory-store.ts, chat/context-builder.ts (novo)
- **Componentes:** cli (memory/, chat/)
- **Critérios:** Contexto da memória incluído a cada prompt; limite 128K tokens respeitado; fallback silencioso
- **Testes:** Unitário (context-builder), Integração (chat→memory→resposta), Performance (< 200ms)

#### TASK-IDEIA-007: Substituir SAMPLE_DATA no Dashboard
- **Fase:** 0 | **Dependências:** Nenhuma | **Esforço:** 3 dias | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Substituir dados mockados por métricas reais: arquivos, commits, tasks, health score, cobertura. Conectar a observability-engine, memory-store, git.
- **Arquivos:** packages/web-ui/src/components/Dashboard.tsx, hooks/useDashboardData.ts, packages/cli/src/ide/api-router.ts, services/dashboard-service.ts
- **Componentes:** web-ui, cli
- **Critérios:** Dashboard com dados reais; health score real; atualização a cada 30s
- **Testes:** Unitário (dashboard-service), Integração (endpoint), E2E (sem SAMPLE_DATA)

#### TASK-IDEIA-008: Quick Open (Ctrl+P)
- **Fase:** 0 | **Dependências:** Nenhuma | **Esforço:** 4 dias | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Modal de busca: fuzzy match em arquivos (fuse.js), comandos i:, ações recentes. Navegação por teclado. Integrar com Monaco.
- **Arquivos:** packages/web-ui/src/components/QuickOpen.tsx, hooks/useQuickOpen.ts, packages/cli/src/ide/api-router.ts, services/command-registry.ts
- **Componentes:** web-ui, cli
- **Critérios:** Ctrl+P abre; fuzzy match em 10K+ arquivos < 2s; Enter abre no editor; Escape fecha
- **Testes:** Unitário (fuzzy matching), Integração (busca), E2E (Ctrl+P→digitar→Enter)

#### TASK-IDEIA-009: Status Bar
- **Fase:** 0 | **Dependências:** Nenhuma | **Esforço:** 2 dias | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Status Bar inferior: branch git, problemas (ESLint/TS), modo autonomia, LLM ativo, health score. Itens clicáveis abrem painéis.
- **Arquivos:** packages/web-ui/src/components/StatusBar.tsx, StatusBarItem.tsx, hooks/useStatusBar.ts
- **Componentes:** web-ui, cli
- **Critérios:** Mostra branch, problemas, autonomia; clica nos itens abre painéis; SSE atualiza em tempo real
- **Testes:** Unitário (renderização), Integração (endpoint /api/status)

#### TASK-IDEIA-010: Chat -> Task Runner Pipeline
- **Fase:** 0 | **Dependências:** 001, 002 | **Esforço:** 4 dias | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Conectar Chat ao task-run.ts: chat detecta intenção de execução ("roda os testes"), chama taskRunner.run(), retorna resultado no chat.
- **Arquivos:** packages/cli/src/chat/chat-task-bridge.ts (novo), commands/task-run.ts, chat/chat-handler.ts, chat/intent-router.ts
- **Componentes:** cli (chat/, commands/)
- **Critérios:** "roda os testes" executa task; resultado retorna no chat; erro capturado e exibido
- **Testes:** Unitário (intent-router), Integração (chat→task-run), E2E (comando via chat)

#### TASK-IDEIA-011: Chat -> Engineer Pipeline
- **Fase:** 0 | **Dependências:** 001, 002 | **Esforço:** 4 dias | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Conectar Chat ao engineer.ts: usuário descreve mudança, sistema planeja, implementa, testa, abre PR. Pipeline: Chat→Intent→Plan→Engineer→Review→PR.
- **Arquivos:** packages/cli/src/chat/chat-engineer-bridge.ts (novo), commands/engineer.ts, untime/phase-orchestrator.ts
- **Componentes:** cli (chat/, commands/, runtime/)
- **Critérios:** Chat entende "adiciona rota de login" e executa; progresso reportado; diff preview no chat; PR criado
- **Testes:** Unitário (parse intenção), Integração (chat→engineer), E2E (feature completa via chat)

#### TASK-IDEIA-012: Provider Router — Streaming Support
- **Fase:** 0 | **Dependências:** Nenhuma | **Esforço:** 3 dias | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Adicionar streamQuery() à interface LLMProvider. Implementar em Ollama, OpenAI, Anthropic, Gemini. Cancelamento, backpressure, fallback non-streaming.
- **Arquivos:** packages/cli/src/local-ai/providers/provider-interface.ts, ollama-provider.ts, openai-provider.ts, nthropic-provider.ts, gemini-provider.ts, provider-router.ts
- **Componentes:** cli (local-ai/)
- **Critérios:** Todos providers suportam streamQuery(); cancelamento interrompe; fallback automático
- **Testes:** Unitário (AsyncGenerator), Integração (cada provider), Resiliência (cancelamento)

#### TASK-IDEIA-013: Quality Gates Iniciais (lint, test, build)
- **Fase:** 0 | **Dependências:** Nenhuma | **Esforço:** 3 dias | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Configurar gates mínimos: ESLint zero errors, Jest 100% pass, TypeScript compila. Integrar com gate runner + husky pré-commit. Adicionar ao i-devkit verify.
- **Arquivos:** packages/cli/src/utils/gate/stages.ts, commands/verify.ts, .husky/pre-commit, package.json
- **Componentes:** cli, root config
- **Critérios:** lint = 0 errors; test = 100% pass; build = compilação limpa; husky trava se falha
- **Testes:** Verificação manual, hook pré-commit

#### TASK-IDEIA-014: Approval Flow — Checkpoint de Plano
- **Fase:** 0 | **Dependências:** 006 | **Esforço:** 3 dias | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Estender approval-flow.ts para checkpoints de plano (intent, domain, spec, plan, execution). Aprovação parcial, persistência em memory-store.
- **Arquivos:** packages/cli/src/governance/approval-flow.ts, pprove.ts, packages/contracts/src/types.ts, packages/web-ui/src/components/ApprovalPanel.tsx
- **Componentes:** cli, web-ui, contracts
- **Critérios:** Checkpoint gera requisição; aprovação parcial funciona; decisões persistem
- **Testes:** Unitário (approval-flow), Integração (approval→persistência), E2E (fluxo completo)

#### TASK-IDEIA-015: Autonomy Policy — Níveis Funcionais
- **Fase:** 0 | **Dependências:** Nenhuma | **Esforço:** 2 dias | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Ativar níveis de autonomia (blocked/guided/autonomous) no autonomy-policy.ts. Comando i-devkit autonomy set <level>. Visível na Status Bar.
- **Arquivos:** packages/cli/src/runtime/autonomy-policy.ts, commands/autonomy.ts, packages/web-ui/src/components/StatusBar.tsx
- **Componentes:** cli, web-ui
- **Critérios:** Blocked bloqueia escrita; guided requer aprovação; autonomous executa com notificação
- **Testes:** Unitário (cada nível), Integração (autonomy→execution)

---

### FASE 1 — Infraestrutura e Conexão (Semanas 5-8)

**Foco:** Event bus persistente com NATS JetStream, conectar 6 módulos órfãos, DLQ + Retry + Outbox, memória cross-session, audit hash chain.

---

#### TASK-IDEIA-016: NATS JetStream Integration
- **Fase:** 1 | **Dependências:** Nenhuma | **Esforço:** 5 dias | **Complexidade:** Média | **Risco:** Alto
- **Descrição:** Integrar NATS JetStream como backend persistente do Event Bus. Adapter EventBusNatsAdapter. Suporte a pub/sub, consumer groups, replay, exactly-once. Fallback in-memory quando NATS offline.
- **Arquivos:** packages/event-bus/src/nats-adapter.ts, event-bus.ts, 	ypes.ts, packages/contracts/src/event-types.ts, packages/cli/src/services/nats-manager.ts
- **Componentes:** event-bus, contracts, cli
- **Critérios:** Pub/sub persistente; consumer groups; replay por sequence; fallback in-memory; NATS 15MB binary
- **Testes:** Unitário (adapter), Integração (pub/sub JetStream), Resiliência (fallback), Performance (10K msg/s)

#### TASK-IDEIA-017: Conectar feedback-pipeline ao Event Bus
- **Fase:** 1 | **Dependências:** 016 | **Esforço:** 2 dias | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Adicionar event-bus no feedback-pipeline. Consumir cycle.completed, deploy.failed. Emitir feedback.submitted, recommendation.generated.
- **Arquivos:** packages/feedback-pipeline/src/index.ts, eedback-processor.ts, package.json
- **Componentes:** eedback-pipeline, event-bus
- **Critérios:** Consome eventos de ciclo; emite feedback.submitted; erros vão para DLQ
- **Testes:** Integração (evento→feedback→recomendação), Resiliência (DLQ)

#### TASK-IDEIA-018: Conectar delivery-orchestrator ao Event Bus
- **Fase:** 1 | **Dependências:** 016 | **Esforço:** 2 dias | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Adicionar event-bus no delivery-orchestrator. Emitir deploy.started/completed/failed. Consumir cycle.completed para deploy automático.
- **Arquivos:** packages/delivery-orchestrator/src/index.ts, orchestrator.ts, package.json
- **Componentes:** delivery-orchestrator, event-bus
- **Critérios:** Deploy events emitidos; consome cycle.completed; estado traçável via eventos
- **Testes:** Integração (ciclo→deploy), Resiliência (falha→deploy.failed)

#### TASK-IDEIA-019: Conectar workflow-engine ao Event Bus
- **Fase:** 1 | **Dependências:** 016 | **Esforço:** 2 dias | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Conectar workflow-engine. Emitir cycle.started/completed, task.assigned/completed. Consumir requirement.created.
- **Arquivos:** packages/workflow-engine/src/index.ts, workflow.ts, package.json
- **Componentes:** workflow-engine, event-bus
- **Critérios:** Workflow events emitidos; consome requirement.created; estado recuperável via replay
- **Testes:** Integração (requirement→workflow→eventos), Resiliência (checkpoint)

#### TASK-IDEIA-020: Conectar memory-store ao Event Bus
- **Fase:** 1 | **Dependências:** 016 | **Esforço:** 2 dias | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** memory-store como consumidor passivo de todos os eventos. Cada evento vira MemoryRecord. Histórico reconstruível via replay.
- **Arquivos:** packages/memory-store/src/index.ts, memory-store.ts, package.json
- **Componentes:** memory-store, event-bus
- **Critérios:** Consome todos eventos; cada evento vira record; histórico reconstruível
- **Testes:** Integração (evento→record), Performance (10K eventos/min)

#### TASK-IDEIA-021: Conectar trace-registry ao Event Bus
- **Fase:** 1 | **Dependências:** 016 | **Esforço:** 2 dias | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** trace-registry como consumidor passivo. Mantém grafo causal entre eventos (requisição→PRD→código→teste→deploy).
- **Arquivos:** packages/trace-registry/src/index.ts, 	race-graph.ts, package.json
- **Componentes:** 	race-registry, event-bus
- **Critérios:** Grafo causal construído; consulta: \"quais arquivos para este requisito?\"
- **Testes:** Integração (eventos→grafo), Consulta (rastreabilidade)

#### TASK-IDEIA-022: Conectar policy-engine ao Event Bus
- **Fase:** 1 | **Dependências:** 016 | **Esforço:** 2 dias | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** policy-engine audita todos os eventos. Emitir policy.evaluated, policy.violated. Consumir eventos de ciclo para avaliação automática.
- **Arquivos:** packages/policy-engine/src/index.ts, policy-evaluator.ts, package.json
- **Componentes:** policy-engine, event-bus
- **Critérios:** Audita eventos de ciclo; emite policy.evaluated/violated; violações registradas
- **Testes:** Integração (evento→policy→resultado), Segurança (violação detectada)

#### TASK-IDEIA-023: DLQ + Retry + Outbox Pattern
- **Fase:** 1 | **Dependências:** 016 | **Esforço:** 4 dias | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Implementar: DLQ (mensagens exauridas), Retry (backoff 1s/2s/4s/8s/16s), Outbox (estado+evento mesma transação). Idempotency key.
- **Arquivos:** packages/event-bus/src/retry-policy.ts, dead-letter-queue.ts, outbox-pattern.ts, 
ats-adapter.ts
- **Componentes:** event-bus, contracts
- **Critérios:** Retry com backoff; DLQ isola falhas; outbox garante consistência; idempotency key
- **Testes:** Unitário (backoff), Integração (retry→DLQ), Resiliência (outbox crash recovery)

#### TASK-IDEIA-024: Cross-Session Memory Persistence (JSONL)
- **Fase:** 1 | **Dependências:** Nenhuma | **Esforço:** 3 dias | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Converter MemoryStore para JSONL append-only. Salvar em .ai/memory/records.jsonl. Load on startup. valid_at/invalid_at temporal.
- **Arquivos:** packages/memory-store/src/memory-store.ts, 	ypes.ts, index.ts, packages/cli/src/memory/context-store.ts
- **Componentes:** memory-store, cli (memory/)
- **Critérios:** Persiste em JSONL; dados sobrevivem restart; append-only; temporal tracking
- **Testes:** Unitário (JSONL append/load/query), Integração (memory→disco→memory), Resiliência (corrupção)

#### TASK-IDEIA-025: Cryptographic Audit Hash Chain
- **Fase:** 1 | **Dependências:** Nenhuma | **Esforço:** 3 dias | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Adicionar hash chain ao audit-trail. Entry[N] = {data, timestamp, hash(Entry[N-1]), signature}. Comando udit-trail verify detecta violação.
- **Arquivos:** packages/audit-trail/src/audit-trail.ts, chain-verifier.ts, 	ypes.ts, packages/cli/src/commands/audit.ts
- **Componentes:** udit-trail, cli
- **Critérios:** Hash chain imutável; verify detecta qualquer alteração; performance 10K entries < 500ms
- **Testes:** Unitário (hash chain), Segurança (tampering detection), Performance (10K entries)

#### TASK-IDEIA-026: Agent Registry Integration
- **Fase:** 1 | **Dependências:** 016 | **Esforço:** 3 dias | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Criar agent-registry package. Registro com nome, papel, capacidades, status. Descoberta via event-bus. Integrar com agent-identity para RBAC.
- **Arquivos:** packages/agent-registry/src/ (novo), packages/agent-identity/src/index.ts, packages/agent-runtime/src/index.ts
- **Componentes:** gent-registry (novo), gent-identity, gent-runtime
- **Critérios:** Agentes registram-se; descoberta via event-bus; RBAC por papel
- **Testes:** Unitário (registro, descoberta), Integração (agent-runtime→registry→event-bus)

#### TASK-IDEIA-027: Schema Registry — Terminar e Integrar
- **Fase:** 1 | **Dependências:** 016 | **Esforço:** 2 dias | **Complexidade:** Média | **Risco:** Baixo
- **Descrição:** Finalizar schema-registry: registrar esquemas, validar eventos, detectar breaking changes. Integrar com event-bus para validação automática.
- **Arquivos:** packages/schema-registry/src/index.ts, schema-validator.ts, schema-evolution.ts, packages/event-bus/src/nats-adapter.ts
- **Componentes:** schema-registry, event-bus
- **Critérios:** Schemas versionados; eventos validados contra schema; breaking changes bloqueados
- **Testes:** Unitário (validação, breaking change), Integração (schema-registry→event-bus)
### FASE 2 - SEGURANCA E INTELIGENCIA (Semanas 9-12)

**Foco:** Prompt injection scanning, output validation, LLM nos modulos de pattern detection e learning, intent classifier LLM-based, ADAPT decomposition.

#### TASK-IDEIA-028: Prompt Injection Scanner (LLM Guard)- Fase: 2 | Dep: Nenhuma | Esforco: 5d | Complex: Media | Risco: Alto- Descricao: Integrar LLM Guard. Substituir 10 regex superficiais. Scanners: injection, jailbreak, sensitive info. Middleware scan antes do LLM.- Arquivos: packages/prompt-security/src/scanner.ts, injection-detector.ts, jailbreak-detector.ts- Componentes: prompt-security, cli- Criterios: Detection rate > 90%; FP < 5%; latencia < 100ms; fallback regex- Testes: Unitario (cada scanner), Integracao (scanner->bloqueio), Seguranca (PINT benchmark)

#### TASK-IDEIA-029: Output Validation (Schema + PII + Safety)- Fase: 2 | Dep: Nenhuma | Esforco: 4d | Complex: Media | Risco: Alto- Descricao: Schema validation + PII scan + Safety scan. Mascaramento automatico.- Arquivos: packages/prompt-security/src/output-validator.ts, schema-validator.ts, pii-scanner.ts- Componentes: prompt-security, cli- Criterios: Output validado; PII mascarado; comandos perigosos bloqueados; latencia < 200ms- Testes: Unitario (schema, PII, safety), Integracao, Seguranca

#### TASK-IDEIA-030: LLM no Pattern Detector- Fase: 2 | Dep: 012 | Esforco: 4d | Complex: Media | Risco: Medio- Descricao: Substituir heuristica por LLM-based pattern detection. Identifica padroes semanticos. Fallback heuristico.- Arquivos: packages/memory-store/src/pattern-detector.ts, llm-pattern-detector.ts- Componentes: memory-store, cli- Criterios: LLM identifica padroes semanticos; fallback heuristico; padroes armazenados- Testes: Unitario (LLM detection), Integracao (LLM->pattern->memory)

#### TASK-IDEIA-031: LLM no Learning Engine- Fase: 2 | Dep: 012, 030 | Esforco: 3d | Complex: Media | Risco: Medio- Descricao: Substituir heuristica por LLM-based recomendacao. Recomendacoes adaptativas baseadas em padroes.- Arquivos: packages/memory-store/src/learning-engine.ts, llm-learning-engine.ts- Componentes: memory-store, cli- Criterios: LLM gera recomendacoes; fallback preservado; recomendacoes armazenadas- Testes: Unitario (LLM recommendation), Integracao (patterns->learning->recommendation)

#### TASK-IDEIA-032: Intent Classifier LLM-Based- Fase: 2 | Dep: 012 | Esforco: 4d | Complex: Media | Risco: Medio- Descricao: Substituir switch-case 6 palavras por LLM classification. Identifica tipo, entidades, parametros. Fallback keyword.- Arquivos: packages/cli/src/planner/intent-classifier.ts, intent-types.ts, entity-extractor.ts- Componentes: cli (planner/)- Criterios: Accuracy > 85%; entidades extraidas; latencia < 1s- Testes: Unitario (50 prompts), Integracao (intent->planner->workflow), Performance

#### TASK-IDEIA-033: Task Decomposition ADAPT-Style- Fase: 2 | Dep: 032 | Esforco: 5d | Complex: Alta | Risco: Alto- Descricao: Plano inicial 3-5 steps, verifica executabilidade, decompoe recursivamente. Fallback progressivo (CoT, P&S, ReAct). DAG.- Arquivos: packages/cli/src/planner/adapt-decomposer.ts, plan.ts, execution-plan.ts- Componentes: cli (planner/), workflow-engine- Criterios: Plano 3-5 steps; decomposicao recursiva; profundidade max 3; DAG funcional- Testes: Unitario (decomposicao, DAG), Integracao (ADAPT->workflow), Performance (< 3s)

#### TASK-IDEIA-034: Feedback Pipeline com LLM Real- Fase: 2 | Dep: 012 | Esforco: 4d | Complex: Media | Risco: Medio- Descricao: Substituir mapeamento deterministico por LLM. Tres niveis: linha, modulo, projeto.- Arquivos: packages/feedback-pipeline/src/feedback-processor.ts, llm-analyzer.ts- Componentes: feedback-pipeline, memory-store- Criterios: LLM analisa feedback; 3 niveis implementados; fallback heuristico- Testes: Unitario (LLM analysis), Integracao (feedback->LLM->recommendation)

#### TASK-IDEIA-035: Cognitive Coprocessor como Hub Central- Fase: 2 | Dep: 012, 032 | Esforco: 4d | Complex: Alta | Risco: Alto- Descricao: Integrar Coprocessor (8 estagios) como hub: intencao passa antes do planner; plano passa antes de executar.- Arquivos: packages/cli/src/cognitive-coprocessor/index.ts, normalize.ts, validate.ts, simulate.ts- Componentes: cli (cognitive-coprocessor/, planner/)- Criterios: Intencao passa pelo coprocessor; plano validado; simulacao antes da execucao- Testes: Unitario (cada estagio), Integracao, Performance (< 5s)

#### TASK-IDEIA-036: Plan-and-Solve Prompting Dinamico- Fase: 2 | Dep: 033 | Esforco: 3d | Complex: Media | Risco: Medio- Descricao: Prompt adaptativo: Generated Knowledge, few-shot, restricoes do policy engine.- Arquivos: packages/cli/src/planner/plan-prompt-builder.ts, knowledge-retriever.ts- Componentes: cli (planner/), policy-engine- Criterios: Prompt inclui conhecimento; few-shot incluido; template adaptavel- Testes: Unitario (prompt builder), Comparacao vs template estatico

#### TASK-IDEIA-037: Security Middleware - Defense in Depth- Fase: 2 | Dep: 028, 029 | Esforco: 3d | Complex: Media | Risco: Baixo- Descricao: Middleware chain: input scan -> sanitizacao -> execution -> output validation -> audit. Configuravel.- Arquivos: packages/security-middleware/src/middleware-chain.ts, types.ts- Componentes: security-middleware, cli (chat/, runtime/)- Criterios: Middleware chain processa input; output validation; cada camada configuravel; latencia < 300ms- Testes: Unitario (cada camada), Integracao (chat + middleware), Performance

### FASE 3 - MULTIAGENTE (Semanas 13-20)
**Foco:** Agent Collaboration, Message Pool, Supervisor + DAG, pipeline 6 agentes, LangGraph, debate, Theia.

#### TASK-IDEIA-038: Agent Collaboration - Message Pool
- Fase: 3 | Dep: 016, 026 | Esforco: 5d | Complex: Alta | Risco: Alto
- Descricao: Shared Message Pool (MetaGPT-style). Agentes publicam artefatos (PRD, arquitetura, codigo, testes). Subscricao por tipo. Schemas de artefato. Ciclo draft->review->approved.
- Arquivos: packages/agent-collaboration/src/ (novo pacote), message-pool.ts, artifact-schema.ts, subscription-filter.ts
- Componentes: agent-collaboration (novo), contracts
- Criterios: Agentes publicam artefatos; subscricao por tipo; ciclo de vida; schemas validam conteudo
- Testes: Unitario (publish, subscribe, filter), Integracao (agentes->pool->agentes), Performance (100 msg/s)

#### TASK-IDEIA-039: Multi-Agent Coordination (Supervisor + DAG)
- Fase: 3 | Dep: 038 | Esforco: 6d | Complex: Alta | Risco: Alto
- Descricao: Orquestrador hibrido: supervisor coordena decomposicao e alocacao; DAG gerencia fluxo entre agentes. Deadlock detection, retry, consolidacao. Inspirado LangGraph + SPOQ.
- Arquivos: packages/agent-collaboration/src/orchestrator.ts, dag-scheduler.ts, task-allocator.ts, deadlock-detector.ts
- Componentes: agent-collaboration, agent-runtime
- Criterios: Supervisor coordena N agentes; DAG gerencia fluxo; deadlock detectado; retry automatico
- Testes: Unitario (DAG scheduler, deadlock), Integracao (supervisor->agent pool), Resiliencia (falha->retry)

#### TASK-IDEIA-040: Pipeline Multiagente Completo (6 Agentes)
- Fase: 3 | Dep: 038, 039 | Esforco: 6d | Complex: Alta | Risco: Alto
- Descricao: Pipeline 6 agentes: Analista->Arquiteto->Programador->Revisor->Testador->DevOps. Validation gates duais (SPOQ-style). HITL em qualquer gate.
- Arquivos: packages/agent-collaboration/src/pipeline/ (analista-agent.ts, arquiteto-agent.ts, programador-agent.ts, revisor-agent.ts, testador-agent.ts, devops-agent.ts, pipeline-runner.ts, validation-gate.ts)
- Componentes: agent-collaboration, agent-runtime
- Criterios: Pipeline completo end-to-end; cada agente produz artefato validado; gate antes/depois de cada agente; pipeline pausavel
- Testes: Unitario (cada agente), Integracao (pipeline completo), E2E (ideia->sistema), Performance (< 15 min)

#### TASK-IDEIA-041: Agent Role Definitions
- Fase: 3 | Dep: 026 | Esforco: 4d | Complex: Media | Risco: Medio
- Descricao: Definir 6 papeis: identidade, ferramentas, artefatos I/O, criterios qualidade. SOP prompt por papel. Integrar RBAC.
- Arquivos: packages/agent-identity/src/roles.ts, role-schemas.ts, role-tools.ts, packages/agent-collaboration/src/pipeline/role-sops.ts
- Componentes: agent-identity, agent-registry, agent-collaboration
- Criterios: 6 papeis definidos; SOP para cada papel; ferramentas restritas por papel; RBAC integrado
- Testes: Unitario (cada papel, ferramentas, permissoes), Integracao (papel X so acessa ferramentas X)

#### TASK-IDEIA-042: Agent Runtime - Suporte a Sub-Agentes
- Fase: 3 | Dep: 026 | Esforco: 3d | Complex: Media | Risco: Medio
- Descricao: Evoluir agent-runtime para sub-agentes e delegacao com attenuation. Sub-agente herda permissoes limitadas.
- Arquivos: packages/agent-runtime/src/index.ts, delegation.ts, agent-session.ts, types.ts
- Componentes: agent-runtime
- Criterios: Agente cria sub-agente; sub-agente herda permissoes atenuadas; reporta resultado ao pai
- Testes: Unitario (delegacao, attenuation), Integracao (agente pai->sub-agente->resultado)

#### TASK-IDEIA-043: Shared Certified Repository (RTADev-style)
- Fase: 3 | Dep: 038 | Esforco: 4d | Complex: Alta | Risco: Medio
- Descricao: Artefatos so entram no contexto compartilhado apos verificacao de alinhamento (consenso ou policy). Previne propagacao de erros.
- Arquivos: packages/agent-collaboration/src/certified-repo.ts, alignment-verifier.ts, packages/memory-store/src/index.ts
- Componentes: agent-collaboration, memory-store
- Criterios: Artefato certificado antes de entrar; consenso N-agentes ou policy validation; certified artifacts imutaveis
- Testes: Unitario (alignment verification), Integracao (message pool -> certified repo -> agentes)

#### TASK-IDEIA-044: LangGraph Integration (ou adapter)
- Fase: 3 | Dep: 039 | Esforco: 5d | Complex: Alta | Risco: Alto
- Descricao: Avaliar e integrar LangGraph como runtime de orquestracao. State persistence, HITL interrupt(), checkpointing, replay.
- Arquivos: packages/agent-collaboration/src/langgraph-adapter.ts, orchestrator.ts, docs/ESTUDOS/ORQUESTRACAO-LANGGRAPH.md
- Componentes: agent-collaboration
- Criterios: LangGraph funcional ou adapter; checkpointing automatico; HITL com interrupt(); replay de estado
- Testes: Integracao (LangGraph + agent-collaboration), Resiliencia (checkpoint + recovery)

#### TASK-IDEIA-045: Multi-Agent Debate para Decisoes Críticas
- Fase: 3 | Dep: 038 | Esforco: 4d | Complex: Alta | Risco: Alto
- Descricao: MAD para decisoes criticas (arquitetura, aceite, seguranca). Agentes debatem com argumentos, convergem por consenso/votacao. So para alto risco.
- Arquivos: packages/agent-collaboration/src/debate/debate-orchestrator.ts, debate-round.ts, consensus.ts
- Componentes: agent-collaboration, contracts
- Criterios: 2+ agentes debatem; consenso ou votacao; so para alto risco; sycophancy detection
- Testes: Unitario (debate round, consenso), Integracao (debate->decisao), Performance (3 agentes < 30s)

#### TASK-IDEIA-046: Theia Platform Integration (Avaliacao)
- Fase: 3 | Dep: 001 a 009 | Esforco: 5d | Complex: Alta | Risco: Alto
- Descricao: Avaliar integracao Eclipse Theia. POC com chat no Theia. Decidir: adotar Theia ou manter web-ui customizada.
- Arquivos: docs/ESTUDOS/THEIA-INTEGRATION.md, packages/ide-integration/src/
- Componentes: web-ui, ide-integration
- Criterios: POC Theia com chat; analise esforco vs beneficio; decisao documentada
- Testes: POC funcional; comparacao performance web-ui vs Theia

#### TASK-IDEIA-047: Model Routing (Agente Complexo vs Simples)
- Fase: 3 | Dep: 041 | Esforco: 3d | Complex: Media | Risco: Medio
- Descricao: Roteamento inteligente: planejamento usa modelo grande, exploracao usa modelo pequeno, formatacao usa regras. SPOQ-style stratification.
- Arquivos: packages/agent-runtime/src/model-router.ts, types.ts, packages/cli/src/local-ai/provider-router.ts, packages/agent-collaboration/src/task-difficulty.ts
- Componentes: agent-runtime, cli (local-ai/), agent-collaboration
- Criterios: Planejamento usa modelo grande; exploracao usa modelo pequeno; custo rastreado; fallback se falha
- Testes: Unitario (model router), Integracao (agente->modelo correto), Performance (custo reduzido)

### FASE 4 - PIPELINE DE ENTREGA (Semanas 21-28)
**Foco:** GitOps (ArgoCD/Flux), IaC (Terraform/OpenTofu), Feature flags (Unleash/Flagsmith), Progressive delivery (canary, blue-green), xterm.js + node-pty terminal.

#### TASK-IDEIA-048: GitOps Template Generator (ArgoCD/Flux)
- Fase: 4 | Dep: Nenhuma | Esforco: 5d | Complex: Alta | Risco: Alto
- Descricao: Gerador de templates GitOps. ArgoCD Application + ApplicationSet + Kustomize overlays. Flux Kustomization + HelmRelease. Multi-ambiente. Comando ai-devkit gitops generate.
- Arquivos: packages/delivery-orchestrator/src/gitops/argocd-generator.ts, flux-generator.ts, templates/, types.ts, packages/cli/src/commands/gitops.ts
- Componentes: delivery-orchestrator, cli, contracts
- Criterios: Manifests ArgoCD e Flux validos; multi-ambiente; health checks; dry-run validation
- Testes: Unitario (geracao manifests), Integracao (gitops generate -> validacao), E2E (deploy via GitOps)

#### TASK-IDEIA-049: IaC Generation (Terraform/OpenTofu)
- Fase: 4 | Dep: 048 | Esforco: 5d | Complex: Alta | Risco: Alto
- Descricao: Gerador de IaC: stack detection (linguagem, framework, banco) -> infra completa (VPC, ECS/EKS, RDS, IAM). OpenTofu recomendado.
- Arquivos: packages/delivery-orchestrator/src/iac/tofu-generator.ts, terraform-generator.ts, stack-detector.ts, templates/, packages/cli/src/commands/iac.ts
- Componentes: delivery-orchestrator, cli
- Criterios: Stack detection correta; IaC passa terraform validate; OpenTofu + Terraform suportados
- Testes: Unitario (stack detection, templates), Integracao (generate -> validate), E2E (deploy via OpenTofu)

#### TASK-IDEIA-050: Feature Flags (Unleash/Flagsmith)
- Fase: 4 | Dep: 048 | Esforco: 4d | Complex: Media | Risco: Medio
- Descricao: Adapter Unleash e Flagsmith. Comando ai-devkit feature-flag create. Targeting por %, usuario, ambiente. IA cria flags para liberacao gradual.
- Arquivos: packages/delivery-orchestrator/src/feature-flags/unleash-adapter.ts, flagsmith-adapter.ts, packages/cli/src/commands/feature-flag.ts
- Componentes: delivery-orchestrator, cli
- Criterios: Flag criada via CLI; targeting funcional; IA cria flag automaticamente; estado consultavel via API
- Testes: Unitario (flag creation, targeting), Integracao (unleash/flagsmith adapter), E2E (flag ativa/desativa feature)

#### TASK-IDEIA-051: Progressive Delivery (Canary + Blue-Green)
- Fase: 4 | Dep: 048, 050 | Esforco: 5d | Complex: Alta | Risco: Alto
- Descricao: Templates canary (Flagger/Argo Rollouts) e blue-green. Pipeline 1% -> 5% -> 25% -> 100%. Auto-promotion baseado em SLOs. Rollback automatico.
- Arquivos: packages/delivery-orchestrator/src/progressive/canary-generator.ts, blue-green-generator.ts, auto-promoter.ts, metrics-analyzer.ts, packages/cli/src/commands/progressive.ts
- Componentes: delivery-orchestrator, cli
- Criterios: Canary steps configuravel; blue-green funcional; auto-promotion por metricas; rollback em SLO breach
- Testes: Unitario (canary steps, metrics), Integracao (deploy -> canary -> promotion), E2E (canary release), Resiliencia (rollback)

#### TASK-IDEIA-052: xterm.js + node-pty Terminal
- Fase: 4 | Dep: Nenhuma | Esforco: 5d | Complex: Alta | Risco: Alto
- Descricao: Substituir terminal div por xterm.js + node-pty. WebSocket + PTY. ANSI rendering, Ctrl+C SIGINT, multiplas abas, buffer 1000 linhas, fallback REST.
- Arquivos: packages/web-ui/src/components/Terminal.tsx, TerminalTab.tsx, packages/cli/src/ide/terminal-bridge.ts, api-router.ts
- Componentes: web-ui, cli (ide/)
- Criterios: Shell real (bash/pwsh); Ctrl+C envia SIGINT; ANSI renderizado; multiplas abas; fallback REST; funciona Windows
- Testes: Unitario (PTY session), Integracao (WebSocket -> PTY -> shell), E2E (comando via terminal), Resiliencia (fallback)

#### TASK-IDEIA-053: Observabilidade do Sistema Entregue
- Fase: 4 | Dep: Nenhuma | Esforco: 4d | Complex: Media | Risco: Medio
- Descricao: Estender observability-engine para sistema entregue. Templates OpenTelemetry + Grafana/Prometheus/Loki. Comando ai-devkit observability generate.
- Arquivos: packages/observability-engine/src/generator.ts, templates/otel-collector.yml, grafana-dashboard.json, prometheus-rules.yml
- Componentes: observability-engine, cli
- Criterios: ai-devkit observability generate produz configs validos; OTel collector; Grafana dashboard; alertas Prometheus
- Testes: Unitario (template rendering), Integracao (generate -> validacao)

#### TASK-IDEIA-054: Pipeline Generation AI-driven
- Fase: 4 | Dep: 048, 049 | Esforco: 5d | Complex: Alta | Risco: Alto
- Descricao: IA detecta stack e gera pipeline completo: GitHub Actions, Dockerfile multi-stage, K8s manifests, ArgoCD, OpenTofu. Dry-run validation. PR com ADR.
- Arquivos: packages/delivery-orchestrator/src/pipeline/pipeline-generator.ts, stack-detector.ts, templates/, packages/cli/src/commands/pipeline.ts
- Componentes: delivery-orchestrator, cli
- Criterios: Stack detection correta; pipeline gerado CI + CD completo; Dockerfile multi-stage; PR aberto com ADR
- Testes: Unitario (stack detection, templates), Integracao (generate -> dry-run), E2E (pipeline deploya app exemplo)

#### TASK-IDEIA-055: Environment Promotion Workflow
- Fase: 4 | Dep: 048, 051 | Esforco: 3d | Complex: Media | Risco: Medio
- Descricao: Workflow dev -> staging -> prod. Quality gates em cada etapa. Approval humano para prod. Rollback automatico se gate falha.
- Arquivos: packages/delivery-orchestrator/src/promotion/promotion-workflow.ts, environment-gate.ts, packages/cli/src/commands/promote.ts
- Componentes: delivery-orchestrator, cli
- Criterios: dev->staging automatico; staging->prod requer approval; rollback automatico em falha; historico auditavel
- Testes: Unitario (promotion workflow, gates), Integracao (promotion end-to-end), Resiliencia (rollback)

#### TASK-IDEIA-056: Secrets Management Templates
- Fase: 4 | Dep: 049 | Esforco: 3d | Complex: Media | Risco: Medio
- Descricao: Templates SOPS, external-secrets, Vault. Comando ai-devkit secrets setup. IA detecta quando secrets sao necessarios.
- Arquivos: packages/delivery-orchestrator/src/secrets/sops-template.ts, external-secrets-template.ts, vault-template.ts, packages/cli/src/commands/secrets.ts
- Componentes: delivery-orchestrator, cli
- Criterios: Templates gerados; nenhum secret em texto claro; integracao IaC
- Testes: Unitario (template generation), Seguranca (nenhum secret em texto claro)

### FASE 5 - APRENDIZADO E EXCELENCIA (Semanas 29-40)
**Foco:** Cross-project learning, adaptive autonomy, Knowledge Graph + GraphRAG, reflection system, fine-tuning pipeline, DuckDB analytics.

#### TASK-IDEIA-057: Reflection System (Reflexion-style)
- Fase: 5 | Dep: 024, 012 | Esforco: 5d | Complex: Media | Risco: Medio
- Descricao: Ciclo Reflexion: Actor gera, Evaluator avalia, Self-Reflection critica, Memoria episodica armazena. Agente reflete sobre erros/acertos e armazena licoes.
- Arquivos: packages/memory-store/src/reflection/reflection-loop.ts, actor.ts, evaluator.ts, self-reflection.ts, episodic-memory.ts
- Componentes: memory-store, cli (agent-runtime)
- Criterios: Actor executa; Evaluator avalia; Self-reflection critica; licao armazenada; iteracao ate N tentativas
- Testes: Unitario (cada estagio), Integracao (reflection -> memory -> proxima execucao), Performance (< 5s)

#### TASK-IDEIA-058: Cross-Project Pattern Learning
- Fase: 5 | Dep: 024, 030, 031 | Esforco: 6d | Complex: Alta | Risco: Alto
- Descricao: CrossProjectLearner consolida padroes de multiplos projetos. Identifica regularidades e gera recomendacoes para novos projetos. Privacidade entre namespaces.
- Arquivos: packages/memory-store/src/cross-project/cross-project-learner.ts, pattern-consolidator.ts, cross-recommender.ts
- Componentes: memory-store, cli (memory/)
- Criterios: Padroes consolidados entre projetos; recomendacoes geradas; projeto novo recebe sugestoes; isolamento privacidade
- Testes: Unitario (consolidacao, recomendacoes), Integracao (3 projetos -> learner -> projeto 4), Privacidade (isolamento)

#### TASK-IDEIA-059: Adaptive Autonomy (Bayesian Confidence)
- Fase: 5 | Dep: 058 | Esforco: 5d | Complex: Alta | Risco: Alto
- Descricao: Bayesian confidence estimation por categoria de acao. Autonomia se ajusta baseada em historico de acerto/erro. Niveis: blocked (<30%), guided (30-70%), autonomous (70-90%), full (>90%).
- Arquivos: packages/cli/src/runtime/adaptive-autonomy.ts, autonomy-policy.ts, packages/memory-store/src/learning-engine.ts
- Componentes: cli (runtime/), memory-store, contracts
- Criterios: Confianca por categoria; autonomia ajustavel; queda em erros recentes; 4 niveis com thresholds config; dashboard
- Testes: Unitario (Bayesian confidence, threshold), Integracao (autonomy -> execution -> feedback -> update), Simulacao (erros -> queda)

#### TASK-IDEIA-060: Knowledge Graph Interno
- Fase: 5 | Dep: 024 | Esforco: 6d | Complex: Alta | Risco: Alto
- Descricao: KG conectando: requisitos -> modulos -> arquivos -> decisoes -> riscos. JSON graph inicio, FalkorDB para escala. Consulta multi-hop.
- Arquivos: packages/memory-store/src/knowledge-graph/graph-store.ts, falkordb-adapter.ts (opcional), graph-query.ts, types.ts
- Componentes: memory-store, contracts
- Criterios: KG conecta requisitos -> codigo -> decisoes; consulta multi-hop funcional; analise de impacto; JSON graph ate 10K nos
- Testes: Unitario (graph operations), Integracao (memory -> graph -> consulta), Performance (query multi-hop < 100ms)

#### TASK-IDEIA-061: Light GraphRAG
- Fase: 5 | Dep: 060 | Esforco: 5d | Complex: Alta | Risco: Alto
- Descricao: Light GraphRAG sobre KG: entity extraction via LLM, community detection, sumarizacao. Para perguntas multi-hop que RAG puro nao responde bem.
- Arquivos: packages/local-ai/src/rag/graphrag/graph-rag.ts, entity-extractor.ts, community-detector.ts, community-summarizer.ts
- Componentes: local-ai, memory-store
- Criterios: Entity extraction do codigo; community detection; GraphRAG > RAG puro em multi-hop; custo < 2x RAG
- Testes: Unitario (entity extraction, community), Integracao (GraphRAG pipeline), Comparacao (GraphRAG vs RAG puro)

#### TASK-IDEIA-062: Fine-Tuning Pipeline (KTO + QLoRA)
- Fase: 5 | Dep: 034 | Esforco: 6d | Complex: Alta | Risco: Alto
- Descricao: Coletar feedback binario -> dataset KTO -> QLoRA fine-tuning. Adaptadores LoRA por projeto/equipe. Pipeline noturno automatico.
- Arquivos: packages/memory-store/src/fine-tuning/dataset-collector.ts, kto-trainer.ts, lora-adapter-manager.ts, packages/cli/src/commands/fine-tune.ts, scripts/fine-tune-pipeline.sh
- Componentes: memory-store, cli
- Criterios: Dataset coletado do feedback; KTO training funcional; adaptadores por projeto; cache; pipeline noturno; aceitacao > 70%
- Testes: Unitario (dataset, KTO loss), Integracao (feedback -> dataset -> fine-tune -> evaluation), Performance (< 1h QLoRA)

#### TASK-IDEIA-063: DuckDB Analytics Local
- Fase: 5 | Dep: 024 | Esforco: 3d | Complex: Baixa | Risco: Baixo
- Descricao: Integrar DuckDB para analytics local sobre memoria, eventos, auditoria. SQL direto em JSONL/CSV. Comandos ai-devkit analytics query e dashboard.
- Arquivos: packages/cli/src/commands/analytics.ts, analytics/duckdb-connector.ts, analytics/queries/, packages/memory-store/src/analytics/duckdb-view.ts
- Componentes: cli, memory-store
- Criterios: DuckDB consulta stores via SQL; ai-devkit analytics query funciona; dashboards pre-definidos; embedded (sem servidor)
- Testes: Unitario (DuckDB queries), Integracao (analytics query -> resultado), Performance (100K registros < 1s)

#### TASK-IDEIA-064: In-Context Learning com Few-shot Automatico
- Fase: 5 | Dep: 024, 030 | Esforco: 3d | Complex: Media | Risco: Baixo
- Descricao: Busca exemplos relevantes do projeto via embeddings semanticos e inclui no prompt. Estilo se adapta automaticamente ao projeto.
- Arquivos: packages/cli/src/memory/few-shot-selector.ts, context-store.ts, packages/memory-store/src/vector-store.ts
- Componentes: cli (memory/, chat/), memory-store
- Criterios: Few-shot selecionado por similaridade; incluido no prompt automaticamente; estilo adaptado; max 4 exemplos
- Testes: Unitario (few-shot selection), Integracao (few-shot -> prompt -> geracao), Comparacao (com vs sem few-shot)

#### TASK-IDEIA-065: Active Learning - Pedir Feedback Quando Inseguro
- Fase: 5 | Dep: 059 | Esforco: 3d | Complex: Media | Risco: Baixo
- Descricao: Sistema pede feedback humano quando confianca < threshold. Threshold adaptativo baseado em Bayesian confidence.
- Arquivos: packages/cli/src/runtime/active-learning.ts, adaptive-autonomy.ts, governance/approval-flow.ts, packages/web-ui/src/components/FeedbackRequest.tsx
- Componentes: cli (runtime/, governance/), web-ui
- Criterios: Feedback solicitado quando confianca baixa; threshold adaptativo; feedback especifico; resposta armazenada como aprendizado
- Testes: Unitario (trigger, threshold), Integracao (confianca baixa -> feedback -> resposta -> aprendizado)

#### TASK-IDEIA-066: Curriculum Learning - Dificuldade Progressiva
- Fase: 5 | Dep: 058 | Esforco: 2d | Complex: Media | Risco: Baixo
- Descricao: Ordenar tarefas por dificuldade crescente. Projetos simples primeiro, depois logicas complexas, depois multi-servico. Perfil calculado automaticamente.
- Arquivos: packages/memory-store/src/curriculum/difficulty-profiler.ts, curriculum-scheduler.ts, packages/onboarding-engine/src/index.ts
- Componentes: memory-store, onboarding-engine
- Criterios: Tarefas classificadas por dificuldade; sistema sugere projetos progressivamente complexos; perfil automatico
- Testes: Unitario (difficulty profiler, scheduling), Integracao (curriculum -> onboarding -> projeto)

#### TASK-IDEIA-067: Semantic Caching para LLM Calls
- Fase: 5 | Dep: Nenhuma | Esforco: 3d | Complex: Media | Risco: Baixo
- Descricao: Cache semantico: query similar (cosine > 0.95) retorna resposta cacheada. TTL por tipo. Reduz latencia 40-60% e custo API.
- Arquivos: packages/cli/src/local-ai/semantic-cache.ts, packages/memory-store/src/vector-store.ts, packages/cli/src/local-ai/provider-router.ts
- Componentes: cli (local-ai/), memory-store
- Criterios: Cache com threshold 0.95; TTL por tipo; hit rate reportado; invalidacao em mudanca; latencia hit < 50ms
- Testes: Unitario (similarity, cache hit/miss), Integracao (cache -> LLM provider -> hit), Performance (hit rate > 30%)
## SECAO 3 - QUALITY ASSURANCE (22 Tarefas)

### QA por Fase
Cada fase possui tarefas de QA para garantir qualidade continua. As tarefas abaixo sao executadas em paralelo com cada fase.

#### FASE 0 - QA (Semanas 1-4)
**Tarefas executadas em paralelo com TASK-IDEIA-001 a 015.**

#### QA-001: Testes Unitarios - Componentes Core
- Fase: QA-0 | Dep: 001-009 | Esforco: 3d | Complex: Baixa | Risco: Baixo
- Descricao: Testes unitarios para todos os componentes da Fase 0: FileManager, MemoryStore, WorkflowEngine, PipelineManager, Chat SSE, Dashboard, QuickOpen, StatusBar. Cobertura minima 70%.
- Criterios: coverage.js > 70%; testes passando; CI integrado
- Componentes: file-crud, memory-store, workflow-engine, pipeline-manager, web-ui, cli (chat/, dashboard/)

#### QA-002: Testes de Integracao - Conexao entre Modulos
- Fase: QA-0 | Dep: 001-009 | Esforco: 3d | Complex: Media | Risco: Medio
- Descricao: Testes de integracao entre modulos: FileManager -> MemoryStore, Chat -> WorkflowEngine, Dashboard -> PipelineManager. Modular sync/async.
- Criterios: Testes de integracao passam; comunicacao sync e async funcional
- Componentes: interfaces e conexoes entre modulos

#### QA-003: Testes de Estresse - File Watcher + Memory
- Fase: QA-0 | Dep: 005, 006 | Esforco: 2d | Complex: Media | Risco: Medio
- Descricao: Estresse com 10K eventos/s, 1000 arquivos simultaneos, 1M linhas. Verificar memory leak e performance.
- Criterios: File Watcher processa 10K/s sem backlog; memoria estavel; output validation nao vaza
- Componentes: file-watcher, memory-store

#### QA-004: Testes de Aceitacao (Fase 0)
- Fase: QA-0 | Dep: 001-009 + QA-001 a 003 | Esforco: 2d | Complex: Baixa | Risco: Baixo
- Descricao: Validar criterios de aceitacao de todas as tarefas da Fase 0. Checklist por tarefa.
- Criterios: 100% dos criterios de aceitacao validados; relatorio gerado
- Componentes: Todos da Fase 0

#### FASE 1 - QA (Semanas 5-8)
**Tarefas executadas em paralelo com TASK-IDEIA-016 a 027.**

#### QA-005: Testes de Resiliencia - NATS + Event Bus
- Fase: QA-1 | Dep: 016, 017 | Esforco: 3d | Complex: Alta | Risco: Alto
- Descricao: Queda de no, perda de mensagem, restart consumer, rede instavel, backpressure. Verificar DLQ, retry e dedup.
- Criterios: NATS sobrevive queda de 1 no; mensagens nao perdem; DLQ captura falhas; retry backoff exponencial
- Componentes: event-bus (nats)

#### QA-006: Testes de Carga - 6 Modulos Conectados
- Fase: QA-1 | Dep: 017 | Esforco: 3d | Complex: Alta | Risco: Alto
- Descricao: Carga com 6 modulos publicando simultaneamente. 100 msg/s cada. Verificar latencia media, throughput e perda.
- Criterios: Latencia media < 10ms; throughput 600 msg/s total; zero perda em regime; backpressure drop 0.1% max
- Componentes: event-bus, todos modulos

#### QA-007: Testes de Auditoria - Hash Chain
- Fase: QA-1 | Dep: 020 | Esforco: 2d | Complex: Media | Risco: Medio
- Descricao: Verificar integridade da hash chain: auditoria de 1000 eventos, detectar adulteracao, verificar merkle root.
- Criterios: Hash chain valida; adulteracao detectavel; merkle root consistente
- Componentes: audit-chain

#### QA-008: Testes de Aceitacao (Fase 1)
- Fase: QA-1 | Dep: 016-027 + QA-005 a 007 | Esforco: 2d | Complex: Baixa | Risco: Baixo
- Descricao: Validar criterios de aceitacao de todas as tarefas da Fase 1.
- Criterios: 100% dos criterios validados; relatorio gerado
- Componentes: Todos da Fase 1

#### FASE 2 - QA (Semanas 9-12)
**Tarefas executadas em paralelo com TASK-IDEIA-028 a 037.**

#### QA-009: Testes de Seguranca - LLM Guard
- Fase: QA-2 | Dep: 028, 029 | Esforco: 4d | Complex: Alta | Risco: Alto
- Descricao: 100 prompts de ataque (injection, jailbreak, leakage). Verificar detection rate, FP rate e latencia.
- Criterios: Detection rate > 90%; FP < 5%; latencia < 100ms; PINT benchmark
- Componentes: prompt-security

#### QA-010: Testes de Performance - Planner LLM
- Fase: QA-2 | Dep: 032, 033 | Esforco: 3d | Complex: Media | Risco: Medio
- Descricao: 50 prompts de diferentes complexidades. Verificar accuracy do intent classifier, decomposicao e tempo total.
- Criterios: Intent accuracy > 85%; decomposicao < 3s; latencia total < 5s
- Componentes: cli (planner/)

#### QA-011: Testes de Integracao - Seguranca + Planner
- Fase: QA-2 | Dep: 028, 032, 037 | Esforco: 3d | Complex: Alta | Risco: Medio
- Descricao: Prompt malicioso -> LLM Guard -> intent -> planner -> output validation. Verificar bloqueio em cada etapa.
- Criterios: Prompt malicioso bloqueado no input scan; output validation bloqueia saida perigosa; middleware chain intacta
- Componentes: prompt-security, cli (planner/), security-middleware

#### QA-012: Testes de Aceitacao (Fase 2)
- Fase: QA-2 | Dep: 028-037 + QA-009 a 011 | Esforco: 2d | Complex: Baixa | Risco: Baixo
- Descricao: Validar criterios de aceitacao de todas as tarefas da Fase 2.
- Criterios: 100% dos criterios validados; relatorio gerado
- Componentes: Todos da Fase 2

#### FASE 3 - QA (Semanas 13-20)
**Tarefas executadas em paralelo com TASK-IDEIA-038 a 047.**

#### QA-013: Testes de Coordenacao - Multi-Agente
- Fase: QA-3 | Dep: 039, 040 | Esforco: 4d | Complex: Alta | Risco: Alto
- Descricao: 3 cenario: 2 agentes, 4 agentes, 6 agentes. Verificar DAG scheduling, deadlock detection, alocacao e convergencia.
- Criterios: DAG executa em paralelo; deadlock detectado em < 1s; pipeline 6 agentes completo; artefatos validados
- Componentes: agent-collaboration (orchestrator, pipeline)

#### QA-014: Testes de Debate - MAD
- Fase: QA-3 | Dep: 045 | Esforco: 3d | Complex: Alta | Risco: Alto
- Descricao: 3 cenarios de debate: consenso rapido, divergencia, sycophancy. Verificar convergencia e qualidade da decisao.
- Criterios: Consenso alcancado em < 5 rounds; sycophancy detectado; decisao documentada
- Componentes: agent-collaboration (debate/)

#### QA-015: Testes de Integracao - Pipeline + Theia
- Fase: QA-3 | Dep: 046 | Esforco: 2d | Complex: Media | Risco: Medio
- Descricao: Verificar POC Theia com chat e pipeline. Relatorio de decisao.
- Criterios: POC funcional; relatorio de decisao Theia vs web-ui; recomendacao documentada
- Componentes: ide-integration, web-ui

#### QA-016: Testes de Aceitacao (Fase 3)
- Fase: QA-3 | Dep: 038-047 + QA-013 a 015 | Esforco: 2d | Complex: Baixa | Risco: Baixo
- Descricao: Validar criterios de aceitacao de todas as tarefas da Fase 3.
- Criterios: 100% dos criterios validados; relatorio gerado
- Componentes: Todos da Fase 3

#### FASE 4 - QA (Semanas 21-28)
**Tarefas executadas em paralelo com TASK-IDEIA-048 a 056.**

#### QA-017: Testes de Entrega - GitOps + IaC
- Fase: QA-4 | Dep: 048, 049 | Esforco: 4d | Complex: Alta | Risco: Alto
- Descricao: Deploy de app exemplo: stack detection -> IaC generate -> GitOps generate -> apply -> verify. Incluir dry-run e validacao.
- Criterios: Stack detection correta; IaC passa terraform validate; GitOps deploya app; health checks passam
- Componentes: delivery-orchestrator

#### QA-018: Testes de Progressive Delivery
- Fase: QA-4 | Dep: 051 | Esforco: 3d | Complex: Alta | Risco: Alto
- Descricao: Canary 1% -> 5% -> 25% -> 100%. Simular SLO breach e verificar rollback. Blue-green switch.
- Criterios: Canary promove corretamente; rollback em SLO breach < 1min; blue-green switch < 10s
- Componentes: delivery-orchestrator (progressive/)

#### QA-019: Testes de Terminal
- Fase: QA-4 | Dep: 052 | Esforco: 2d | Complex: Media | Risco: Medio
- Descricao: Comandos shell, Ctrl+C, abas multiplas, ANSI, redimensionamento. Testar em Windows e Linux.
- Criterios: Shell funcional; Ctrl+C envia SIGINT; ANSI renderizado; abas independentes; fallback REST
- Componentes: web-ui (Terminal), cli (ide/)

#### QA-020: Testes de Aceitacao (Fase 4)
- Fase: QA-4 | Dep: 048-056 + QA-017 a 019 | Esforco: 2d | Complex: Baixa | Risco: Baixo
- Descricao: Validar criterios de aceitacao de todas as tarefas da Fase 4.
- Criterios: 100% dos criterios validados; relatorio gerado
- Componentes: Todos da Fase 4

#### FASE 5 - QA (Semanas 29-40)
**Tarefas executadas em paralelo com TASK-IDEIA-057 a 067.**

#### QA-021: Testes de Aprendizado Cross-Projeto
- Fase: QA-5 | Dep: 058, 059 | Esforco: 4d | Complex: Alta | Risco: Alto
- Descricao: 3 projetos de treino -> learner -> 1 projeto novo. Verificar recomendacoes, autonomia adaptativa e privacidade.
- Criterios: Recomendacoes uteis; autonomia ajustada corretamente; privacidade entre namespaces mantida
- Componentes: memory-store (cross-project, adaptive-autonomy)

#### QA-022: Testes de Aceitacao Final (Fase 5)
- Fase: QA-5 | Dep: 057-067 + QA-021 | Esforco: 2d | Complex: Baixa | Risco: Baixo
- Descricao: Validar criterios de aceitacao de todas as tarefas da Fase 5. Validar integracao de todo o sistema.
- Criterios: 100% dos criterios validados; E2E completo ideia->sistema funcional; relatorio final gerado
- Componentes: Todos os modulos
## SECAO 4 - MILESTONES

### M0 - Fundacao IDEIA (Semana 4)
**Data-alvo:** Fim da Semana 4
**Tarefas:** TASK-IDEIA-001 a 015 concluidas
**Entregaveis:** Chat SSE funcional; File CRUD; Memory Store operacional; Dashboard real com metricas; Quick Open; Status Bar; Pipeline Manager com Task/Engineer agents; Provider streaming; Quality gates; Approval flow; Autonomy policy baseline
**QA:** QA-001 a QA-004 aprovados
**Criterio de aceite:** IDEIA aceita prompt, decompoe em tarefas, executa pipeline basico com approval humano, mantem estado em memoria

### M1 - Barramento e Governanca (Semana 8)
**Data-alvo:** Fim da Semana 8
**Tarefas:** TASK-IDEIA-016 a 027 concluidas
**Entregaveis:** NATS JetStream; 6 modulos conectados via event bus; DLQ/Retry/Outbox; Memoria JSONL com formatacao padrao; Audit hash chain; Agent Registry; Schema Registry
**QA:** QA-005 a QA-008 aprovados
**Criterio de aceite:** Eventos fluem entre modulos via NATS; auditoria criptografica funcional; agentes e schemas registrados e consultaveis

### M2 - Seguranca e Inteligencia (Semana 12)
**Data-alvo:** Fim da Semana 12
**Tarefas:** TASK-IDEIA-028 a 037 concluidas
**Entregaveis:** LLM Guard (input/output); LLM-based pattern detector e learning engine; Intent classifier LLM; ADAPT decomposition; Feedback pipeline LLM; Cognitive Coprocessor 8 estagios; Plan-and-Solve prompting; Security middleware
**QA:** QA-009 a QA-012 aprovados
**Criterio de aceite:** Prompt injection bloqueado; intencao detectada com >85% accuracy; plano decomposto em 3-5 steps; coprocessor valida antes da execucao

### M3 - Multiagente Operacional (Semana 20)
**Data-alvo:** Fim da Semana 20
**Tarefas:** TASK-IDEIA-038 a 047 concluidas
**Entregaveis:** Message Pool; Supervisor + DAG orchestrator; Pipeline 6 agentes; Agent role definitions; Sub-agent runtime; Certified repository; LangGraph adapter; Multi-agent debate; Theia POC; Model routing
**QA:** QA-013 a QA-016 aprovados
**Criterio de aceite:** Pipeline 6 agentes completa end-to-end; debate funcional; certified repo evita propagacao de erros; decisao Theia documentada

### M4 - Pipeline de Entrega (Semana 28)
**Data-alvo:** Fim da Semana 28
**Tarefas:** TASK-IDEIA-048 a 056 concluidas
**Entregaveis:** GitOps templates (ArgoCD/Flux); IaC (Terraform/OpenTofu); Feature flags (Unleash/Flagsmith); Progressive delivery (canary + blue-green); xterm.js + node-pty terminal; Observabilidade; Pipeline AI-driven; Environment promotion; Secrets management
**QA:** QA-017 a QA-020 aprovados
**Criterio de aceite:** App exemplo deployada via GitOps + IaC; canary com rollback funcional; terminal real; observabilidade ativa; pipeline gerado por IA

### M5 - Aprendizado e Excelencia (Semana 40)
**Data-alvo:** Fim da Semana 40
**Tarefas:** TASK-IDEIA-057 a 067 concluidas
**Entregaveis:** Reflection system; Cross-project learning; Adaptive autonomy; Knowledge Graph; Light GraphRAG; Fine-tuning KTO + QLoRA; DuckDB analytics; In-context learning; Active learning; Curriculum learning; Semantic caching
**QA:** QA-021 a QA-022 aprovados
**Criterio de aceite:** Sistema aprende entre projetos; autonomia adaptativa por confianca; KG consultavel; fine-tuning funcional; analytics via DuckDB; E2E completo
## SECAO 5 - GESTAO DE RISCOS

### Matriz de Riscos

| ID | Risco | Probabilidade | Impacto | Severidade | Mitigacao | Contingencia |
|----|-------|:------------:|:-------:|:----------:|-----------|--------------|
| R01 | NATS JetStream complexidade de configuracao | Alta | Alto | Critico | POC NATS na Semana 4; config basica primeiro, tuning depois | Usar NATS embedded (nats-server embutido) se configuracao complexa |
| R02 | Pipeline 6 agentes nao converge | Media | Alto | Alto | LangGraph adapter como fallback; timeout por agente; HITL como saida | Debate MAD para desbloquear; supervisor override manual |
| R03 | LLM Guard detection rate baixo | Alta | Alto | Critico | Benchmark PINT antes de integrar; fallback regex sempre ativo | Usar 2 scanners em paralelo (LLM Guard + custom); ensemble |
| R04 | Cognitive Coprocessor lento demais | Media | Medio | Medio | Timeout por estagio (500ms); cache de resultados intermediarios; paralelismo | Pular estagios validacao/simulacao em modo "turbo" |
| R05 | Fine-tuning nao melhora performance | Alta | Alto | Alto | Baseline antes do fine-tune; comparacao A/B; KTO vs DPO vs SFT | Usar adapter LoRA por projeto sem fine-tune completo |
| R06 | Knowledge Graph cresce sem controle | Media | Medio | Medio | Tamanho max 10K nos; TTL por no; compressao periodica; archive | Migrar para FalkorDB; sharding por namespace |
| R07 | DuckDB performance deteriora | Baixa | Baixo | Baixo | Particionamento por mes/namespace; indices; compressao ZSTD | Arquivos separados por projeto; parallel queries |
| R08 | Theia integration custo proibitivo | Media | Alto | Alto | POC na Semana 12; PO aprova antes de continuar; alternativa web-ui | Manter web-ui como primario; Theia como opcional |
| R09 | Feature flag provider mudanca de preco | Baixa | Medio | Baixo | Abstracao por adapter; Unleash open-source como default | Migrar para Flagsmith self-hosted; ou Unleash Community |
| R10 | Cross-project learning viola privacidade | Baixa | Alto | Alto | Namespaces estritos; auditoria de acesso; opt-in por projeto; criptografia | Nao compartilhar dados brutos; apenas padroes anonimizados |
| R11 | Semantic cache serve resposta errada | Media | Alto | Alto | Threshold minimo 0.95; validacao de tipo de resposta; TTL curto | Cache desligavel; fallback sempre consulta LLM real |
| R12 | Active learning frustra usuario | Media | Medio | Medio | Feedback solicitado no max 1x por sessao; threshold adaptativo; UI nao intrusiva | Modo "silencioso" sem solicitacao de feedback |
| R13 | LangGraph dependencia externa | Media | Alto | Alto | Abstracao por adapter; fallback para orquestrador proprio | Supervisor-only mode sem LangGraph |
| R14 | Multi-agent debate causa loop infinito | Media | Medio | Medio | Max rounds (5); timeout por round; supervisor force-decide | Modo automacao direta sem debate para baixo risco |

### Tabela de Carga por Fase

| Fase | Tarefas Dev | Tarefas QA | Total | Esforco Total | Semanas | Dev/semana |
|:----:|:-----------:|:----------:|:-----:|:-------------:|:-------:|:----------:|
| 0 | 15 | 4 | 19 | 45d | 4 | 3.75 |
| 1 | 12 | 4 | 16 | 38d | 4 | 3.0 |
| 2 | 10 | 4 | 14 | 39d | 4 | 2.5 |
| 3 | 10 | 4 | 14 | 49d | 8 | 1.75 |
| 4 | 9 | 4 | 13 | 39d | 8 | 1.125 |
| 5 | 11 | 2 | 13 | 47d | 12 | 0.92 |
| **Total** | **67** | **22** | **89** | **257d** | **40** | **~2.2** |

### Roadmap Consolidado

```
Semana 0-4    [FASE 0 - FUNDACAO] ################ 19 tarefas (45d)
Semana 5-8    [FASE 1 - BARRAMENTO] ############### 16 tarefas (38d)
Semana 9-12   [FASE 2 - SEGURANCA/INTEL] ########## 14 tarefas (39d)
Semana 13-20  [FASE 3 - MULTIAGENTE] ############## 14 tarefas (49d)
Semana 21-28  [FASE 4 - ENTREGA] ################## 13 tarefas (39d)
Semana 29-40  [FASE 5 - APRENDIZADO] ############## 13 tarefas (47d)
```

### Dependencias entre Fases

```
FASE 0 ---------------------------
   |                               \
FASE 1 ---> FASE 2 --> FASE 3 --> FASE 4 --> FASE 5
                                        \        |
                                         ----> FASE 5
```
