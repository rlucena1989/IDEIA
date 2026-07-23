# 99 — IDEIA System Self-Description

> **Propósito:** Documento estruturado para consumo por LLMs externos.
> Descreve completamente o ecossistema IDEIA: arquitetura, stack, packages, workflows e princípios.
> Mantenha sincronizado com REALITY-MANIFEST.md e o Service Catalog.

---

## 1. Visão Geral

**Nome:** IDEIA  
**Tagline:** "Dê a ideia, nós entregamos a solução."  
**Descrição:** IDE que transforma ideias em sistemas completos — orquestração multiagente, pipeline de delivery, automação de deploy, segurança integrada e auto-descrição para LLMs.  
**Stack principal:** TypeScript · Node.js 20 · React 18 · Theia Platform · NATS JetStream · LangGraph · Ollama

---

## 2. Arquitetura em Camadas

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SHELL (Desktop/Web/Theia Cloud)                                             │
│  Electron · Tauri v2 (planejado) · Theia Cloud                               │
├──────────────────────────────────────────────────────────────────────────────┤
│  PLATAFORMA THEIA                                                             │
│  Theia Platform · Monaco Editor · Theia AI · OpenVSX · Inversify DI          │
├──────────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE AGENTES                                                            │
│  Analyst · Architect · Programmer · Reviewer · Tester · DevOps               │
├──────────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE INTELIGÊNCIA                                                       │
│  Pattern Detector · Learning Engine · Intent Classifier · RAG Engine · ADAPT │
├──────────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE MEMÓRIA                                                            │
│  MemoryStore · Knowledge Graph · Context Engine · VectorStore                 │
├──────────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE EXECUÇÃO                                                           │
│  Agent Runtime · Autonomous Editor · Workflow Engine · Delivery Orchestrator │
├──────────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE MENSAGERIA                                                         │
│  Event Bus · NATS JetStream · Pub/Sub · Req/Rep · KV · DLQ                   │
├──────────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE SEGURANÇA                                                          │
│  Policy Engine · LLM Guard · Output Validation · Audit Trail · Safety Circuit│
├──────────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE INFRAESTRUTURA                                                     │
│  Execution Layer · Resilience Engine · Trace · Observability Engine           │
├──────────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE DADOS                                                              │
│  Data Layer (PG+pgvector) · Schema Registry · Vector Store · Metrics Store    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Princípios Arquiteturais

1. **Clean Architecture** — domínio não importa infraestrutura; use cases testáveis isoladamente
2. **Domain-Driven Design** — entidades, value objects, agregados, domain events
3. **Contratos explícitos** — todo DTO validado com `Contract.pre()`; schemas no Schema Registry
4. **Event-Driven** — todo evento cruza o barramento de mensagens; sem chamadas diretas entre módulos
5. **Security by Design** — policy engine, output validation, audit chain, sandbox execution
6. **Self-Awareness** — o sistema descreve a si mesmo, suas capabilities e seu estado programaticamente

---

## 3. Stack Tecnológico

| Categoria | Tecnologias |
|-----------|-------------|
| Linguagens | TypeScript · JavaScript · Node.js 20 |
| Frameworks | React 18 · Theia Platform · Express · Commander |
| Bancos | PostgreSQL+pgvector · SQLite · JSON File |
| Mensageria | NATS JetStream · In-Memory EventBus · WebSocket |
| AI/ML | LangGraph · Ollama · OpenAI · DeepSeek · RAG Engine |
| Infraestrutura | Docker · GitHub Actions · Docker Compose |
| IDE | Theia · Monaco · LSP · DAP |

---

## 4. Packages (86+)

### Principais (library)

| Package | Descrição | Capabilities |
|---------|-----------|--------------|
| agent-runtime | Multi-agent orchestration (LangGraph) | agent-orchestration, state-graph, sub-graph, parallel-execution |
| event-bus | Event bus (in-memory + NATS) | pub-sub, req-rep, kv-store, dlq, consumer-groups |
| delivery-orchestrator | Deployment orchestration | deploy, rollback, backup, quality-gates |
| workflow-engine | Workflow/sprint management | workflow-management, sprint-management, quality-gates |
| policy-engine | Security policy engine | policy-evaluation, compliance-checking, pattern-matching |
| memory-store | Memory + knowledge graph | memory-persistence, knowledge-graph, entity-extraction |
| audit-trail | Audit with SHA-256 chain | audit-logging, hash-chain, tamper-detection |
| llm-provider | LLM provider abstraction | llm-completion, streaming, embeddings, tool-calls |
| schema-registry | Zod schema management | schema-management, versioning, compatibility-check |
| mcp | Model Context Protocol | mcp-server, mcp-client, tool-registration |

### CLI e Frontend

| Package | Descrição |
|---------|-----------|
| cli | Main CLI (130+ comandos, prompt pipeline, approval flow) |
| ideia-plugin | Theia IDE plugin (8 widgets, 6 serviços backend, 8 contributions) |
| api | Express REST API (42 endpoints) |

### Adapters (13 linguagens)

Dart · Elixir · FastAPI · Go · Haskell · Java · Kotlin · NestJS · PHP · Ruby · Scala · Swift · Zig

---

## 5. Workflows Multi-Agent

### Zero to Deploy (Idea → Analysis → Architecture → Implementation → Testing → Deployment → Monitoring)

1. **Idea** — Conceptualize and define the project idea, goals, and scope *(Analyst)*
2. **Analysis** — Analyze requirements, constraints, dependencies *(Analyst)*
3. **Architecture** — Design system architecture, component breakdown *(Architect)*
4. **Implementation** — Implement code, tests, and documentation *(Programmer)*
5. **Testing** — Run automated tests, quality gates, security scans *(Tester, Reviewer)*
6. **Deployment** — Deploy with health checks and rollback capability *(DevOps)*
7. **Monitoring** — Monitor system health, performance, and usage *(DevOps)*

### Other Workflows

- **Bug Fix:** Report → Analyze → Fix → Test → Review → Deploy
- **Feature Implementation:** Spec → Architecture → Implement → Review → Test → Deploy
- **Security Audit:** Scan → Analyze → Report → Fix → Verify
- **Performance Optimization:** Profile → Analyze → Optimize → Benchmark → Verify

---

## 6. Capacidades Principais (por Categoria)

| Categoria | Capacidades |
|-----------|-------------|
| Orquestração | agent-orchestration, workflow-management, sprint-management, state-graph |
| Inteligência | llm-completion, intent-classification, prompt-pipeline, embeddings |
| Memória | memory-persistence, knowledge-graph, context-management, vector-indexing |
| Execução | deploy, rollback, command-execution, sandbox, file-editing |
| Segurança | policy-evaluation, compliance-checking, audit-logging, output-validation |
| Integração | rest-api, third-party-integration, plugin-sdk, mcp-server |
| UX/UI | ide-integration, widget-rendering, notification, guided-setup |
| Infraestrutura | distributed-tracing, metrics-collection, health-checks, logging |
| Dados | schema-management, database-access, similarity-search, contract-testing |

---

## 7. CLI Commands (130+)

Principais comandos organizados por categoria:

| Categoria | Comandos |
|-----------|----------|
| Projeto | init · generate · wizard · status · doctor |
| Agentes | agent · agents · orchestrate · pipeline |
| Qualidade | audit · verify · test · coverage · gate |
| Deploy | deploy · release · rollback · pipeline · snapshot |
| Segurança | policy · security · compliance · approve |
| Contexto | context · memory · knowledge · explain |
| Evolução | evolve · learn · adaptive · optimize |
| Documentação | docs · plan · spec · consolidate |

---

## 8. Quality Gates

### Gate 1 — Commit
lint-staged · tsc --noEmit · jest --changedSince

### Gate 2 — PR
lint · typecheck · coverage · boundaries · contract-check · CodeQL · injection suite

### Gate 3 — Release
E2E · Performance · Security · Resiliência · Load test · Chaos engineering · SBOM

### Gate 4 — Sprint (trimestral)
NPS · Bug count · Technical debt · Coverage · Velocity · Mutation score

---

## 9. Segurança e Governança

- **Sandbox:** `vm.Script` com contexto isolado (não `new Function`)
- **Policy Engine:** 27 patterns de segurança (Linux + Windows + PowerShell)
- **Output Validation:** 31 regras (CPF, SSN, IBAN, cartão de crédito, secrets)
- **Audit Trail:** SHA-256 hash chain com verificação de integridade
- **Approval Flow:** 3 níveis (dev → tech-lead → security)
- **LLM Guard:** Detecção de injection, jailbreak, prompt leak

---

## 10. Testes e Qualidade

- **Framework:** Jest + ts-jest
- **Tipos:** Unitários · Integração · Contrato (Pact) · Mutação (Stryker) · Performance (k6)
- **Cobertura:** 30% atual → 50% (meta Fase 0) → 80% (v1.0)
- **CI/CD:** GitHub Actions com matrix (ubuntu + windows)
- **Estudos:** 35+ documentos de research em `docs/ESTUDOS/`

---

## 11. Exemplos de Uso

### Exemplo 1: Novo Projeto
```bash
ideia init meu-projeto
ideia idea "criar um sistema de e-commerce"
# IDEIA guia: Analysis → Architecture → Implementation → Testing → Deploy
```

### Exemplo 2: Bug Fix
```bash
ideia audit
ideia fix "corrigir erro de autenticação"
# IDEIA orquestra: Analyze → Fix → Test → Review → Deploy
```

### Exemplo 3: Pipeline Completo
```bash
ideia pipeline create --from-idea "api de pagamentos"
ideia pipeline run
# IDEIA executa todo o lifecycle automaticamente
```

---

## 12. Documentos Relacionados

- `REALITY-MANIFEST.md` — Fonte da verdade do projeto
- `GAPS-PRODUCAO-IDE.md` — Gaps catalogados
- `Service Catalog` — Catálogo completo de serviços e capabilities
- `AGENTS.md` — Regras de arquitetura para IAs
- `ESTUDOS/` — 35+ estudos técnicos
- `docs/adr/` — Architecture Decision Records
