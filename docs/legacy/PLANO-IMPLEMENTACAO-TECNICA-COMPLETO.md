# Plano de Implementação Técnica — IDEIA

> **Data:** 2026-07-18
> **Propósito:** Mapear TODO estudo em tarefas acionáveis de implementação
> **Total de tarefas:** 143 tarefas derivadas de 27 estudos
> **Estimativa total:** ~320h de desenvolvimento

---

## Sumário

1. [Núcleo (S1-S3, S5)](#1-nucleo-s1-s3-s5)
2. [Qualidade e Testes (E3, S12, S13)](#2-qualidade-e-testes-e3-s12-s13)
3. [Segurança e Governança (S4, S18, S14)](#3-seguranca-e-governanca-s4-s18-s14)
4. [Infraestrutura e Cloud (S6, S15, S16, I1, I2)](#4-infraestrutura-e-cloud-s6-s15-s16-i1-i2)
5. [Observabilidade (S17)](#5-observabilidade-s17)
6. [UX e Interface (E4, E5, S11, S21, S22)](#6-ux-e-interface-e4-e5-s11-s21-s22)
7. [IA e Agentes (S3, S7, S8, S19)](#7-ia-e-agentes-s3-s7-s8-s19)
8. [Ecossistema (S20, S9, S10)](#8-ecossistema-s20-s9-s10)
9. [Documentação e Estudos (E1, E2, M1, I3, I4, I5)](#9-documentacao-e-estudos)
10. [Qualidade Transversal](#10-qualidade-transversal)

---

## 1. Núcleo (S1-S3, S5)

### S1 — Barramento de Eventos (Event Bus)

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| S1-T01 | **Integrar NatsEventBus no EventBus atual** — Substituir in-memory EventBus pelo NatsEventBus com fallback automático | 4h | NatsEventBus criado | P0 |
| S1-T02 | **Implementar Dead Letter Queue** — Eventos que falham após retry vão para DLQ com metadados de erro | 4h | S1-T01 | P1 |
| S1-T03 | **Implementar Outbox Pattern** — Eventos são escritos primeiro num log, depois publicados (garantia exactly-once) | 6h | S1-T01 | P1 |
| S1-T04 | **Schema Registry para eventos** — Validar schemas no publish e subscribe via Schema Registry | 4h | S1-T01 | P1 |
| S1-T05 | **Implementar replay de eventos** — Capacidade de re-processar histórico do JetStream | 3h | S1-T01 | P2 |
| S1-T06 | **Consumer groups para workers** — Distribuir processamento entre múltiplas instâncias | 3h | S1-T01 | P2 |
| S1-T07 | **Implementar KV Store** — Usar NATS KV para config/state compartilhado entre processos | 2h | S1-T01 | P2 |
| S1-T08 | **Dashboard de eventos** — Visualizar throughput, latência, DLQ, consumer lag | 4h | S1-T01 | P2 |

### S2 — Memória e Contexto (Memory Store)

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| S2-T01 | **Integrar VectorSearch ao MemoryStore** — Substituir substring search por hybrid search com embeddings | 4h | VectorSearch criado | P0 |
| S2-T02 | **Conectar LLMProvider.embed() ao VectorSearch** — Embeddings reais via Ollama/OpenAI | 3h | S2-T01, LLMProvider | P0 |
| S2-T03 | **Persistência do VectorSearch** — Salvar/carregar índices vetoriais em disco | 2h | S2-T01 | P1 |
| S2-T04 | **Implementar Mem0-style memory** — Memória gerenciada com importância, resumo e consolidação | 8h | S2-T01 | P1 |
| S2-T05 | **Graph Memory (Knowledge Graph)** — Conectar decisões como nós e arestas (Neo4j ou implementation própria) | 12h | S2-T01 | P2 |
| S2-T06 | **RAG Engine integrado** — Retrieval-Augmented Generation para contexto do projeto | 6h | S2-T01, LLMProvider | P1 |
| S2-T07 | **Context compression** — Summarização automática de contexto para caber no window do LLM | 4h | S2-T06 | P2 |
| S2-T08 | **SQLite+FTS5 para busca textual** — Full-text search como fallback quando embeddings não disponíveis | 3h | — | P1 |

### S3 — Intenção → Plano (Intent to Plan)

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| S3-T01 | **Implementar Intent Classifier** — Substituir switch-case de 6 palavras por classificação semântica via LLM | 8h | LLMProvider | P0 |
| S3-T02 | **Entity Extraction** — Extrair stack, domínio, requisitos implícitos da descrição do usuário | 4h | S3-T01 | P1 |
| S3-T03 | **Task Decomposition (ADAPT-style)** — Decompor requisitos em tasks ordenáveis com dependências | 8h | S3-T01 | P1 |
| S3-T04 | **Plano Mestre com checkpoints** — Gerar plano de implementação com milestones e approval gates | 6h | S3-T03 | P1 |
| S3-T05 | **Risk Assessment** — Identificar riscos técnicos no plano gerado | 4h | S3-T04 | P2 |

### S5 — Orquestração Multiagente (Multi-agent)

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| S5-T01 | **Integrar LangGraph** — Substituir AgentRuntime linear por grafo de estados LangGraph | 16h | — | P1 |
| S5-T02 | **Criar Agent Pool** — Pool de agentes especializados (Analyst, Architect, Programmer, Reviewer, Tester, DevOps) | 8h | S5-T01 | P1 |
| S5-T03 | **Implementar Supervisor Agent** — Agente que coordena, resolve conflitos e decide próximos passos | 8h | S5-T02 | P1 |
| S5-T04 | **Shared Blackboard** — Memória compartilhada entre agentes para contexto comum | 4h | S5-T02 | P2 |
| S5-T05 | **Debate & Consensus Engine** — Agentes debatem decisões conflitantes e chegam a consenso | 8h | S5-T03 | P2 |
| S5-T06 | **Implementar A2A Protocol** — Agent-to-Agent communication via NATS | 6h | S5-T01 | P2 |

---

## 2. Qualidade e Testes (E3, S12, S13)

### E3 — Qualidade Total

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| E3-T01 | **Implementar 4 Quality Gates automatizados** — Commit (pre-commit), PR (status checks), Release (full suite), Sprint (trimestral) | 8h | — | P0 |
| E3-T02 | **Dashboard de qualidade** — Visualizar score por dimensão (código, segurança, perf, UX, integração, resiliência, dados) | 6h | E3-T01 | P1 |
| E3-T03 | **Elevar coverage threshold** — 20% → 40% → 60% progressivamente | Contínuo | — | P1 |
| E3-T04 | **Implementar mutation testing** — StrykerJS para validar qualidade dos testes | 4h | Jest configurado | P2 |

### S12 — Testes Automatizados

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| S12-T01 | **Contract Testing (Pact)** — Implementar consumer-driven contracts para APIs REST e eventos | 8h | — | P1 |
| S12-T02 | **E2E com Playwright** — Fluxos completos de usuário no frontend | 6h | Web UI | P1 |
| S12-T03 | **Testes de LLM (RAGAS/DeepEval)** — Avaliar qualidade, consistência e segurança das respostas do LLM | 6h | LLMProvider | P2 |
| S12-T04 | **Visual regression (Percy/Chromatic)** — Detectar regressões visuais no frontend | 4h | Web UI | P2 |
| S12-T05 | **Fuzzing de API (Schemathesis)** — Testar endpoints com entradas aleatórias | 3h | API endpoints | P2 |

### S13 — Performance

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| S13-T01 | **Implementar k6 load testing** — Cenários de carga para chat streaming, agent tasks, file operations | 6h | — | P1 |
| S13-T02 | **Performance budget CI** — Falhar build se TTFT > 500ms, TPS < 50, latência LSP > 200ms | 4h | S13-T01 | P1 |
| S13-T03 | **Benchmark contínuo** — Coletar métricas de performance a cada release | 3h | S13-T01 | P2 |
| S13-T04 | **Capacity planning** — Modelo de crescimento com projeções de custo por usuário | 4h | — | P2 |

---

## 3. Segurança e Governança (S4, S18, S14)

### S4 — Segurança e Governança

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| S4-T01 | **Implementar NeMo Guardrails** — Colibri de segurança para entradas/saídas do LLM | 8h | PromptSecurity | P1 |
| S4-T02 | **Implementar Cedar Policy Engine** — Políticas RBAC/ABAC para ações de agentes | 8h | PolicyEngine | P1 |
| S4-T03 | **CI/CD Security Scanning** — CodeQL + Snyk + TruffleHog em todo PR | 4h | CI pipeline | P0 |

### S18 — AI Safety

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| S18-T01 | **Autonomy Policy Engine** — Implementar níveis N0-N4 com regras por operação | 6h | PolicyEngine | P0 |
| S18-T02 | **Red Teaming automatizado** — Garak + PyRIT para testar jailbreaks e injection | 8h | LLMProvider | P1 |
| S18-T03 | **Output validation pipeline** — Integrar validateGeneratedCode() no fluxo de checkpoint | 3h | PromptSecurity | P0 |
| S18-T04 | **Audit hash chain em produção** — Verificação criptográfica do audit trail | 4h | AuditTrail | P1 |
| S18-T05 | **Emergency stop (kill switch)** — Botão que interrompe todas as ações autônomas | 2h | — | P1 |

### S14 — Autenticação

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| S14-T01 | **Implementar Auth0/Clerk** — Autenticação OAuth2 + OIDC | 8h | — | P1 |
| S14-T02 | **RBAC multi-tenant** — Controle de acesso baseado em papéis por workspace/projeto | 6h | S14-T01 | P1 |
| S14-T03 | **WebAuthn / Passkeys** — Autenticação sem senha | 4h | S14-T01 | P2 |
| S14-T04 | **MFA/TOTP** — Autenticação de múltiplos fatores | 3h | S14-T01 | P2 |

---

## 4. Infraestrutura e Cloud (S6, S15, S16, I1, I2)

### S6 + S16 — Pipeline e Deploy

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| INFRA-T01 | **Docker Compose full stack** — 15 serviços (NATS, PostgreSQL, MinIO, Redis, Ollama, etc.) | 4h | — | P0 |
| INFRA-T02 | **GitHub Actions CI/CD** — 5 workflows (CI, CD Staging, CD Production, Security Scan, Release) | 8h | — | P0 |
| INFRA-T03 | **Feature Flags (Unleash/Flagsmith)** — Liberação gradual de funcionalidades | 6h | — | P1 |
| INFRA-T04 | **Progressive Delivery** — Canary (2%→10%→50%→100%) com rollback automático | 8h | INFRA-T02 | P1 |
| INFRA-T05 | **Terraform/OpenTofu modules** — IaC para deploy em cloud (AWS/GCP) | 8h | — | P1 |
| INFRA-T06 | **K3s cluster setup** — Kubernetes leve para startup profile | 6h | INFRA-T05 | P2 |

### S15 — Cloud

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| CLOUD-T01 | **PostgreSQL + pgvector** — Setup de banco com extensão vetorial | 4h | — | P1 |
| CLOUD-T02 | **MinIO S3** — Armazenamento de artefatos e objetos | 3h | — | P1 |
| CLOUD-T03 | **Redis cache** — Caching de sessão, rate limiting, pub/sub | 3h | — | P1 |
| CLOUD-T04 | **Backup/DR automation** — Backup automático com RPO/RTO definidos | 4h | CLOUD-T01 | P2 |

### I1 — Blueprints

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| I1-T01 | **Implementar k6 scripts** — 4 cenários de load test (chat, agent, files, mixed) | 4h | — | P2 |
| I1-T02 | **Configurar OpenTelemetry Collector** — Pipeline de traces, métricas e logs | 4h | — | P1 |
| I1-T03 | **Pact Broker setup** — Contract testing entre serviços | 3h | — | P2 |

---

## 5. Observabilidade (S17)

### S17 — Observabilidade Full-Stack

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| OBS-T01 | **Configurar OpenTelemetry SDK** — Auto-instrumentação Node.js + manual para agentes | 6h | ObservabilityEngine | P1 |
| OBS-T02 | **Prometheus + Grafana** — Coleta de métricas + dashboards | 6h | OBS-T01 | P1 |
| OBS-T03 | **Loki para logs** — Agregação de logs estruturados | 4h | OBS-T01 | P1 |
| OBS-T04 | **LangFuse tracing** — Tracing de LLM calls (custos, latência, qualidade) | 4h | OBS-T01 | P1 |
| OBS-T05 | **Dashboards de agente** — Visualizar decisões, ferramentas, resultados dos agentes | 4h | OBS-T02 | P2 |
| OBS-T06 | **Alerting** — Alertas baseados em SLO (error budget burn rate) | 4h | OBS-T02 | P2 |

---

## 6. UX e Interface (E4, E5, S11, S21, S22)

### E4 — UX

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| UX-T01 | **Design System** — Implementar tokens, componentes base, temas claro/escuro | 8h | React | P1 |
| UX-T02 | **WCAG AA compliance** — Auditoria + correções de acessibilidade | 12h | UX-T01 | P1 |
| UX-T03 | **Keyboard navigation** — Atalhos de teclado, foco gerenciado, skip links | 4h | UX-T01 | P1 |
| UX-T04 | **Micro-interações** — Loading skeletons, animações, transições | 6h | UX-T01 | P2 |
| UX-T05 | **NPS/SUS measurement** — Coleta de feedback de experiência do usuário | 3h | — | P2 |

### E5 — Desktop

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| DSK-T01 | **Empacotar Electron** — Reaproveitar web-ui existente como Electron app | 8h | Web UI | P1 |
| DSK-T02 | **Auto-update** — electron-updater para Windows, macOS, Linux | 4h | DSK-T01 | P1 |
| DSK-T03 | **Code signing** — Assinatura de binários para distribuição | 3h | DSK-T01 | P1 |
| DSK-T04 | **Instaladores** — MSI (Windows), DMG (macOS), AppImage (Linux) | 6h | DSK-T02 | P1 |
| DSK-T05 | **Tauri v2 migration** — Migrar de Electron para Tauri (Rust) | 16h | DSK-T01 | P2 |

### S11 — Theia

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| THEIA-T01 | **Integrar Theia Platform** — Substituir Monaco standalone por Theia como base | 20h | — | P2 |
| THEIA-T02 | **Widgets IDEIA no Theia** — Chat, Dashboard, Diff como widgets Theia | 12h | THEIA-T01 | P2 |
| THEIA-T03 | **Theia AI Integration** — Agentes como tool functions do Theia AI | 8h | THEIA-T01 | P2 |

### S21 — Terminal

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| TERM-T01 | **PTY completo** — Substituir spawn() por node-pty com xterm.js | 4h | node-pty | P0 |
| TERM-T02 | **LSP Integration** — TypeScript LSP + Monaco Language Client | 8h | Monaco | P0 |
| TERM-T03 | **DAP Integration** — Debug Adapter Protocol para Node.js/Python | 12h | — | P1 |
| TERM-T04 | **Task Runner** — tasks.json + problem matchers | 4h | Terminal | P1 |
| TERM-T05 | **Agent-Terminal integração** — Agente pode executar comandos e analisar output | 4h | TERM-T01 | P2 |

### S22 — Colaboração

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| COL-T01 | **Yjs + Monaco** — Edição colaborativa multi-cursor | 8h | Monaco | P2 |
| COL-T02 | **Shared blackboard** — Quadro compartilhado entre agentes e humanos | 6h | NATS | P2 |
| COL-T03 | **Session replay** — Time-travel debug de sessões colaborativas | 8h | COL-T01 | P2 |
| COL-T04 | **Presence protocol** — Ver quem está online e o que está editando | 3h | COL-T01 | P2 |

---

## 7. IA e Agentes (S3, S7, S8, S19)

### S3 — Intenção → Plano (continuação)

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| IA-T01 | **ADAPT Task Decomposition** — Implementar decomposição hierárquica de tarefas | 8h | S3-T01 | P1 |

### S7 — Aprendizado Adaptativo

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| S7-T01 | **Feedback Pipeline** — Coletar feedback do usuário sobre resultados dos agentes | 4h | FeedbackPipeline | P1 |
| S7-T02 | **Cross-project learning** — Memória entre projetos (padrões, decisões, riscos) | 8h | S2-T04 | P2 |
| S7-T03 | **RLHF/DPO feedback** — Coleta de preferências para fine-tuning | 12h | S7-T01 | P2 |
| S7-T04 | **Pattern Detector** — Detectar padrões recorrentes no código do projeto | 6h | S2-T01 | P2 |
| S7-T05 | **Adaptive Autonomy** — Aumentar nível de autonomia baseado em confiança acumulada | 6h | S18-T01 | P2 |

### S8 — Tecnologias Emergentes

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| S8-T01 | **DuckDB integração** — Analytics de performance, custos e métricas da IDE | 4h | — | P2 |
| S8-T02 | **Wasm sandbox** — Execução de código em WebAssembly (seguro, rápido) | 8h | — | P2 |
| S8-T03 | **GraphRAG** — RAG com conhecimento grafo para respostas mais precisas | 8h | S2-T05 | P2 |

### S19 — Engenharia de Prompts

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| S19-T01 | **Implementar DSPy** — Compilação e otimização automática de prompts | 8h | LLMProvider | P2 |
| S19-T02 | **Prompt templates por agente** — Templates curados para Analyst, Architect, Programmer etc. | 6h | S5-T02 | P1 |
| S19-T03 | **Context window management** — Budget de tokens, sliding window, summarization | 4h | S2-T07 | P1 |

---

## 8. Ecossistema (S20, S9, S10)

### S20 — Plugins

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| PLG-T01 | **Plugin API** — Interface completa com contribution points | 8h | — | P2 |
| PLG-T02 | **Plugin sandbox** — Isolamento de plugins com permissões | 6h | PLG-T01 | P2 |
| PLG-T03 | **Plugin registry (npm-based)** — Marketplace de plugins | 8h | PLG-T01 | P2 |
| PLG-T04 | **MCP Protocol support** — Model Context Protocol para tools de LLM | 4h | PLG-T01 | P1 |
| PLG-T05 | **OpenVSX compat** — Compatibilidade com extensões VS Code | 12h | PLG-T01 | P2 |
| PLG-T06 | **Plugin lifecycle** — Install, activate, deactivate, uninstall com hooks | 4h | PLG-T01 | P2 |

### S9 — Matriz Tecnológica

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| S9-T01 | **Adotar tecnologias P0** — Implementar tecnologias classificadas como P0 na matriz | Contínuo | — | P0 |
| S9-T02 | **Runbooks operacionais** — Procedimentos para cada componente core | 8h | — | P2 |

### S10 — Contratos

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| S10-T01 | **Implementar SLOs** — Service Level Objectives por camada (latência, throughput, disponibilidade) | 6h | — | P1 |
| S10-T02 | **Contract testing CI** — Verificar contratos em todo PR via Pact | 4h | — | P1 |
| S10-T03 | **Schema Registry (NATS)** — Registro centralizado de schemas com validação | 4h | NATS | P1 |

---

## 9. Documentação e Estudos

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| DOC-T01 | **Atualizar estudos com decisões de implementação** — Marcar o que foi implementado vs o que é plano | 4h | — | P1 |
| DOC-T02 | **Criar runbooks operacionais** — Procedimentos para deploy, rollback, backup, recovery | 6h | — | P2 |
| DOC-T03 | **Criar playbooks de segurança** — Resposta a incidentes, análise de vulnerabilidades | 4h | — | P2 |

---

## 10. Qualidade Transversal

| ID | Tarefa | Esforço | Dependência | Prioridade |
|----|--------|---------|-------------|------------|
| QLT-T01 | **ESLint config hardening** — Reativar regras desligadas, adicionar security, import, unicorn | 4h | — | P1 |
| QLT-T02 | **Husky + lint-staged + commitlint** — Quality gates no commit | 2h | — | P0 |
| QLT-T03 | **Cobertura mínima 40%** — Adicionar testes nos pacotes com cobertura baixa | 20h | — | P1 |
| QLT-T04 | **Flaky test detection** — CI detecta e reporta testes instáveis | 3h | Jest | P2 |

---

## Resumo de Esforço

| Área | Tarefas | Estimativa |
|------|---------|------------|
| Núcleo (S1-S3, S5) | 25 | ~95h |
| Qualidade (E3, S12, S13) | 14 | ~56h |
| Segurança (S4, S18, S14) | 11 | ~56h |
| Infraestrutura (S6, S15, S16, I1) | 13 | ~55h |
| Observabilidade (S17) | 6 | ~28h |
| UX/Interface (E4, E5, S11, S21, S22) | 18 | ~130h |
| IA e Agentes (S3, S7, S8, S19) | 12 | ~82h |
| Ecossistema (S20, S9, S10) | 10 | ~58h |
| Documentação | 3 | ~14h |
| Qualidade Transversal | 4 | ~29h |
| **Total** | **143** | **~320h** |

## Prioridades Recomendadas

### Sprint 1 (P0 — 8 tasks)
1. S1-T01: Integrar NatsEventBus ← já temos o código
2. S2-T01: Integrar VectorSearch ao MemoryStore ← já temos o código
3. S2-T02: Conectar LLMProvider.embed() ao VectorSearch
4. S3-T01: Implementar Intent Classifier
5. TERM-T01: PTY completo com node-pty
6. TERM-T02: LSP Integration (TypeScript)
7. QLT-T02: Husky + lint-staged + commitlint
8. S18-T03: Output validation pipeline no checkpoint

### Sprint 2 (P1 — 10 tasks)
1. S1-T02: Dead Letter Queue
2. S2-T03: Persistência VectorSearch
3. S4-T01: NeMo Guardrails
4. INFRA-T01: Docker Compose
5. INFRA-T02: GitHub Actions CI/CD
6. OBS-T01: OpenTelemetry SDK
7. UX-T01: Design System
8. S19-T02: Prompt templates por agente
9. S10-T02: Contract testing CI
10. S4-T03: CI/CD Security Scanning

### Sprint 3+ (P1/P2 restantes)
Priorizar por dependências: infra → segurança → observabilidade → UX
