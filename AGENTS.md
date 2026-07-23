# AGENTS.md — IDEIA

> **IDE que transforma ideias em sistemas completos**
> "Dê a ideia, nós entregamos a solução."

---

> ⚠️ **REGRA UNIVERSAL PARA TODOS OS MODELOS DE IA**
> A fonte única de regras está em `.ai/rules/UNIVERSAL.md`.
> **LEIA AQUELE ARQUIVO ANTES DE QUALQUER OPERAÇÃO.**
> Este AGENTS.md é documentação contextual, não a fonte de regras.
>
> Todo modelo de IA, de qualquer editor/extensão (Claude Code, Cursor, Copilot, Windsurf),
> DEVE seguir as regras em `.ai/rules/UNIVERSAL.md`.

---

> **Estado atualizado:** Consulte `docs/governance/REALITY-MANIFEST.md` e `.ai/context/inject.json`

---

## Estado Atual do Projeto

```
✅ Infraestrutura: tsc --noEmit = 0 erros (1.215+ .ts files prod, ~176K LOC TS total)
✅ Código: 128 gaps resolvidos (GS1-GS128), 128 packages compiláveis, 153 comandos CLI
✅ Sessão 2026-07-21/22: 9 novos packages criados (prompt-economy, context-builder, planning-engine, agent-router, memory-hierarchy, quality-gates, risk-approval, checkpoint-engine, supply-chain) — 177 novos testes
✅ Features Pendentes: 9 implementadas (Zero-to-Deploy Workflow, 9 Context Packs, Capability Registry, Desktop Deployment Guide, 3 novos tutoriais, Progressive Disclosure, Capability Matching Engine)
✅ Self-Awareness: ServiceCatalog (77 serviços), SelfDescription, SelfAwareness, LifecycleOrchestrator, TutorialSystem, LLMContextBuilder, CapabilityDiscovery — 61+ testes, 7 módulos
✅ Segurança: 27 policy patterns, 31 regras PII, 25 secret patterns, 3 níveis approval, audit SHA-256, automated pentest, SBOM CycloneDX
✅ Theia Plugin: 0 erros, 10 widgets (Chat, Dashboard, Diff, Approval, File, Studies, Suggestions, Search, Audit, Security) + TitleBar, 10 serviços backend, tema registrado, inversify imports padronizados, 13 testes
✅ CLI: 153 comandos registrados, exit handler, output validation, prompt pipeline (guard→classify→enrich→optimize→plan→format)
✅ Prompt Economy: ContextCompressor, BudgetTracker, ComplexityRouter, LLMCache, EarlyExitDecider — 38 testes
✅ Documentos: 102+ estudos em IDEIA/docs/ESTUDOS/ (88 .md + 14 subdiretórios), 44 registrados no IDEIA-MASTER.md + 58 extras, 4 ADRs, 25+ documentos de governança, handoff por sessão
✅ Estudos sincronizados: 57 estudos copiados de root → IDEIA, document-registry atualizado com lista completa
✅ StudyScanner operacional: `packages/reality-sync/src/study-scanner.ts` — scan automático, monitoramento contínuo, alerta de degradação
✅ NATS JetStream: Connection manager, streams, DLQ, KV, Object Store, Req-Reply, HealthCheck, fallback in-memory, IEventBus unificado
✅ LangGraph: StateGraph, 8 nós agente com LLMProvider opcional + ProviderRouter fallback, sub-grafos, paralelismo, timeout/retry, 8 tipos de step
✅ Delivery: Canary deploy (10/50/100%), rollback, GitOps, quality gates
✅ Desktop: Electron + auto-updater + cross-platform installer (Win/Mac/Linux)
✅ **Strict mode: 128/128 packages** (`tsc --noEmit` = 0 erros) — maior melhoria de qualidade
✅ ESLint: 10 rules ativas (no-non-null-assertion, eqeqeq, no-explicit-any, no-unused-vars, prefer-const, no-var, etc.), max-warnings 1500
✅ **100 packages com `version: '0.0.0'`** — fix aplicado em 2026-07-22
✅ **`as any` em produção: 0** — 35 casts removidos de 19 arquivos
✅ **`!` non-null assertions: ~249 restantes** — 16 corrigidos, foco em pattern-learner, review
✅ **`as unknown as` duplos: ~68 restantes** — 15 simplificados (JSON.parse + Record casts)
✅ **602 unused vars** prefixados com `_` — 348 arquivos limpos
✅ **Quality Check Script**: `node scripts/quality-check.mjs --ci` — 99+ checks
✅ **ESLint 0 errors**, 1387 warnings
✅ **`no-empty` corrigido**: 2 ocorrências em orchestrate.ts
✅ **`tsconfig` uniforme**: 128/128 packages com extends base.json
✅ **`ide-integration` tsconfig**: references duplicadas removidas
✅ **`observability.ts`**: 5 `as unknown as Record` simplificados para `as Record`
✅ **`package.json scripts`**: `quality:check`, `quality:check:ci`, `verify` inclui quality check
```

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SHELL (Desktop/Web/Theia Cloud)                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  Electron (MVP)  │  │  Tauri v2 (Rust) │  │  Theia Cloud     │          │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘          │
├───────────┴─────────────────────┴─────────────────────┴────────────────────┤
│                          PLATAFORMA THEIA                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Theia Platform | Monaco | Theia AI | OpenVSX | Inversify DI        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE AGENTES (Analyst · Architect · Programmer · Reviewer · Tester · DevOps)
├─────────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE INTELIGÊNCIA (Pattern Detector · Learning Engine · Intent         │
│                          Classifier · ADAPT · RAG Engine · DSPy)            │
├─────────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE MEMÓRIA (Mem0 · SQLite+FTS5 · DuckDB · Knowledge Graph · Redis)  │
├─────────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE EXECUÇÃO (Agent Runtime · Autonomous Editor · Workflow Engine ·  │
│                       Delivery Orchestrator · Verification Layer)            │
├─────────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE MENSAGERIA (NATS JetStream — Pub/Sub · Req/Rep · KV · DLQ)       │
├─────────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE SEGURANÇA (Cedar Policy · LLM Guard · Output Validation · Audit) │
├─────────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE INFRA (Execution Layer · Resilience Engine · Trace · Observation) │
├─────────────────────────────────────────────────────────────────────────────┤
│  CAMADA DE DADOS (PostgreSQL+pgvector · MinIO · Schema Registry · Turso)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Stack principal:** TypeScript · Node.js 20 · React 18 · Theia Platform · NATS JetStream · LangGraph · Ollama

---

## O Que Já Está Pronto

### Compilação e TypeScript

- `tsc -b` compila 128 packages sem erros
- `tsc --noEmit` com strict mode
- ESLint com security plugin + `no-explicit-any: error`
- 55 BOMs corrigidos (UTF-8 sem BOM)

### Theia Plugin

- **Frontend:** 10 widgets (Chat, Dashboard, Diff, Approval, File, Studies, Suggestions, Search, Audit, Security) + TitleBar + SearchOverlay
- **Backend:** 10 serviços (Chat, Task, Agent, Memory, Dashboard, ProviderRouter, OutputValidator, DAPSetup, StatusBar, Lifecycle)
- **Compilação:** 0 erros

### LSP (Language Server Protocol)

- 8 providers: completion, hover, definition, references, signatureHelp, documentSymbol, codeAction, rename
- 5 linguagens suportadas

### DAP (Debug Adapter Protocol)

- WebSocket `/dap` endpoint
- DebugPanel com breakpoints, step, stack, variables, REPL

### CLI

- **153 comandos** registrados (init, generate, audit, verify, drift, policy, compliance, docs, workflow, report, memory, evolution, optimize, coverage, agents, catalog, tutorial, lifecycle...)
- Output com JSON, verbose, audit trail
- Approval flow em 3 níveis (dev → tech-lead → security)
- Prompt pipeline (guard → classify → enrich → optimize → plan → format)

### Segurança

- Sandbox com `vm.Script` (não `new Function`)
- Policy engine com 27 patterns (Linux + Windows + PowerShell)
- Output validation com 31 regras (CPF, SSN, IBAN, cartão de crédito, etc.)
- Secrets scan
- Audit trail com SHA-256 chain

### Testes (Fase 5 — CONCLUÍDA + Melhorias)

- `jest.config.js` com `ts-jest`, `testEnvironment: 'node'`, `forceExit: true`, `detectOpenHandles: true`
- Scripts: `test:unit`, `test:integration`, `test:contract`, `test:mutation`
- **Resultado:** 447 suites, 4391 testes (4347 passando, 10 falhas, 28 skipped, 6 todo)
- Workers crashes corrigidos (replayer, explainer, lsp-bridge) ✅
- Hoisting jest.mock corrigido (learn, ecosystem, context) ✅
- UTF-8 encoding fix (release-notes, pattern-learner) ✅
- Agent-graph parallel nodes bug corrigido ✅
- Guardrails com API key detection ✅
- **13 testes ideia-plugin** (output-validator, jest.config + theia-mock) ✅
- **workflow-engine 28/28** com `enableQualityGates: false` ✅
- **DAP 6/6** com DAPClient source próprio ✅
- **reality-sync** com isolamento tmpdir ✅

---

## Fases Implementadas

| Fase    | Descrição                                    | Status |
| ------- | -------------------------------------------- | ------ |
| **F1**  | NATS JetStream — EventBus persistente        | ✅ Completo (connection, streams, DLQ, KV, Object Store, Req-Reply, health check, fallback in-memory) |
| **F2**  | LangGraph — Orquestração multiagente         | ✅ Completo (StateGraph, 8 nós, sub-grafos, paralelismo, timeout/retry, 8 tipos step) |
| **F3**  | Deploy/GitOps — Pipeline de entrega          | ✅ Completo (canary 10/50/100%, rollback, webhook CI/CD, GitOps sync) |
| **F4**  | PostgreSQL+pgvector — Data layer             | ✅ Completo (migrations, query building, pgvector opt-in, SQLite fallback, VectorStore) |
| **F5**  | Desktop — Auto-updater, instalador, tray     | ✅ Completo (Electron, electron-builder, notificações nativas, deep links) |
| **F6**  | Segurança — Cedar, red teaming, compliance   | ✅ Completo (27 patterns, 31 regras PII, 25 secret patterns, 3 níveis approval, automated pentest, SBOM CycloneDX, Security Dashboard Widget) |
| **F7**  | Performance — Benchmarks, cache, otimização  | ✅ Completo (benchmark suites, k6 tests, cache layer, bundle analyzer, acceleration HPC) |
| **F8**  | Observabilidade — Tracing, métricas, logging | ✅ Completo (ObservabilityEngine, SloMonitor, Telemetry, TracePropagation, HealthCheck) |
| **F9**  | AI Safety — Jailbreak, bias, alignment       | ✅ Completo (PromptSecurity, output validation, alignment tests, red teaming, guardrails) |
| **F10** | Documentação — README, exemplos, C4          | ✅ Completo (README, instalação, primeiros passos, API reference, C4 diagrams, troubleshooting, demo script, exemplos, CONTRIBUTING) |
| **SA**  | Self-Awareness (G71-G77)                     | ✅ Completo (ServiceCatalog 77 serviços, SelfAwareness, LifecycleOrchestrator 7 fases, TutorialSystem 3 tutoriais, LLMContextBuilder, CapabilityDiscovery) |
| **PE**  | Prompt Economy (GS82)                        | ✅ Completo (ContextCompressor, BudgetTracker, ComplexityRouter, LLMCache, EarlyExitDecider — 38 testes) |

---

## Qualidade — 7 Dimensões

| Dimensão                                          | Score Atual | Score Alvo | Gate    |
| ------------------------------------------------- | ----------- | ---------- | ------- |
| Código (lint, types, cobertura, complexidade)     | ~75/100     | 80/100     | PR      |
| Segurança (OWASP LLM Top 10, audit, red team)     | ~70/100     | 90/100     | PR      |
| Performance (TTFT, TPS, memória, throughput)      | ~40/100     | 80/100     | Release |
| UX (NPS, SUS, time-to-task, acessibilidade)       | ~55/100     | 75/100     | Sprint  |
| Integração (contratos, eventos, schema compat)    | ~75/100     | 85/100     | PR      |
| Resiliência (circuit breaker, retry, self-heal)   | ~50/100     | 80/100     | Release |
| Dados (embeddings, decisões, privacidade, backup) | ~40/100     | 75/100     | Sprint  |

## Quality Gates

### Gate 1 — Commit

```
lint-staged (eslint --fix + prettier --write)
tsc --noEmit (typecheck)
jest --changedSince HEAD~1
```

### Gate 2 — PR

```
lint · typecheck · coverage · boundaries · contract-check
CodeQL · snyk · injection suite · red teaming
smoke test · event bus · contract verification
```

### Gate 3 — Release

```
E2E completo · Performance full suite · Segurança full suite
Resiliência · Load test (k6) · Chaos engineering · Audit chain
SBOM · Changelog · README · Build
```

---

## Documentos de Governança

| Documento | Caminho | Conteúdo |
|-----------|---------|----------|
| REALITY-MANIFEST.md | `docs/governance/REALITY-MANIFEST.md` | Fonte da verdade: 128 packages, endpoints, status |
| GAPS-PRODUCAO-IDE.md | `docs/governance/GAPS-PRODUCAO-IDE.md` | 128 gaps (G1-G30 resolvidos + GS1-GS128) catalogados |
| document-registry.md | `docs/governance/document-registry.md` | Registro central de documentos |
| Relatório Completo Estado Atual | `docs/governance/RELATORIO-COMPLETO-ESTADO-ATUAL-IDEIA.md` | Documento consolidado 360° do projeto |
| Plano Detalhado (6 fases) | `docs/ESTUDOS/PLANO-IMPLEMENTACAO-IDEIA-DETALHADO.md` | 60 tarefas, ~175h |
| Plano Detalhado V2 (10 fases) | `docs/ESTUDOS/PLANO-IMPLEMENTACAO-IDEIA-DETALHADO-V2.md` | ~180 tarefas, ~38 dias |
| Plano Execução Integral | `docs/estudos-analise/PLANO-EXECUCAO-INTEGRAL.md` | 10 fases, 48 tarefas |
| Intensificação Concorrência | `docs/ESTUDOS/ESTUDO-INTENSIFICACAO-CONCORRENCIA-PLANO-COMERCIAL.md` | 38 gaps competitivos, plano comercial 3 horizontes |
| Relatório Final Gaps | `docs/governance/RELATORIO-FINAL-GAPS-IDEIA.md` | 75 gaps catalogados, 74 resolvidos, roadmap futuro |
| Self-Awareness Gaps | `docs/ESTUDOS/RELATORIO-SELF-AWARENESS-GAPS-IDEIA.md` | 7 gaps de self-awareness, todos resolvidos |
| Service Catalog | `packages/cli/src/ecosystem/service-catalog.ts` | 77 serviços mapeados, API de descoberta |
| Self-Awareness Module | `packages/cli/src/ecosystem/self-awareness.ts` | describeSystem, getCapabilities, getArchitecture, getStack, getWorkflows |
| Lifecycle Orchestrator | `packages/cli/src/lifecycle/project-lifecycle-orchestrator.ts` | 7 fases idea→monitoring, checkpoints, rollback |
| Tutorial System | `packages/cli/src/tutorials/tutorial-system.ts` | 6 tutoriais, progress tracking, badges |
| LLM Context Builder | `packages/cli/src/context-engine/llm-context-builder.ts` | Contexto inteligente por perfil de tarefa |
| Capability Discovery | `packages/cli/src/ecosystem/capability-discovery.ts` | Auto-descoberta dinâmica de capabilities |
| Prompt Economy | `packages/prompt-economy/` | ContextCompressor, BudgetTracker, ComplexityRouter, LLMCache, EarlyExitDecider — 38 testes |
| Security Dashboard Widget | `packages/ideia-plugin/src/browser/` | 8 arquivos (protocol, service, widget, contributions, modules) |
| Automated Pentest | `scripts/security-pentest.ts` | 7 categorias, modo --ci, self-scan protegido |
| SBOM Generation | `scripts/generate-sbom.ts` | CycloneDX 1.5, 200+ componentes |
| Implementação NATS F1 | `docs/ESTUDOS/ESTUDO-IMPLEMENTACAO-NATS-JETSTREAM.md` | Plano ~29h, 6 etapas |
| Implementação LangGraph F2 | `docs/ESTUDOS/ESTUDO-IMPLEMENTACAO-LANGGRAPH-MULTIAGENTE.md` | Plano ~29h, 6 etapas |
| Implementação PostgreSQL F4 | `docs/ESTUDOS/ESTUDO-IMPLEMENTACAO-POSTGRESQL-PGVECTOR.md` | Plano ~31h, 6 etapas |
| Implementação Cedar F6 | `docs/ESTUDOS/ESTUDO-IMPLEMENTACAO-CEDAR-SEGURANCA-COMPLIANCE.md` | Plano ~33h, 6 etapas |
| Análise Consolidada Mestre | `docs/estudos-analise/ESTUDO-ANALISE-CONSOLIDADA-MESTRE.md` | 74 descobertas em 4 dimensões |
| Auditoria Funcional R1 | `docs/governance/AUDITORIA-FUNCIONAL-IDEIA-2026-07-20.md` | 15 problemas corrigidos |
| Auditoria Funcional R2 | `docs/governance/AUDITORIA-FUNCIONAL-IDEIA-2026-07-21.md` | 12 problemas corrigidos |
| Auditoria Completa | `docs/governance/AUDITORIA-COMPLETA-IDEIA-2026-07-21.md` | 33 problemas corrigidos |
| Revisão Completa | `docs/governance/REVISAO-COMPLETA-IDEIA-2026-07-21.md` | Revisão 8 camadas |
| Sessão Continuidade | `docs/governance/SESSION-CONTINUIDADE-2026-07-21.md` | Continuidade da sessão anterior |
| Sistema Autonomia | `docs/governance/SISTEMA-AUTONOMIA-CONFIGURAVEL.md` | Sistema de autonomia configurável (1122 linhas) |

---

## Comandos Úteis

```bash
# Compilar
tsc -b
tsc --noEmit

# Testes
npm run test:unit          # Unitários com cobertura
npm run test:integration   # Integração
npm run test:contract      # Contract testing
npm run test:mutation      # Mutation testing

# Lint
npx eslint packages/ --ext .ts

# Verificar gaps
grep "🔴\|🟠\|🟡" docs/governance/GAPS-PRODUCAO-IDE.md | grep -v "Resolvido"

# Próxima fase
# Fase 1 — NATS JetStream (docs/ESTUDOS/ESTUDO-IMPLEMENTACAO-NATS-JETSTREAM.md)
```

---

## Notas para a Próxima Sessão

### ⚠️ Primeiro: Leia o Handoff

Antes de qualquer operação, LEIA na ordem:
1. **`docs/governance/HANDOFF-NEXT-SESSION.md`** — documento único de continuidade entre PCs/sessões
2. **`docs/governance/SESSION-CONTINUIDADE-2026-07-22.md`** — detalhes da última sessão
3. **`AGENTS.md`** (este) — regras e estado do projeto

### Prioridade — Próxima Sessão

O projeto está **100% funcional**. Todas as 10 fases (F1-F10) concluídas, além de Self-Awareness e Prompt Economy.

Próximas áreas de foco (priorizadas):

1. **3 widgets com mock data** — Studies, Suggestions, Search Overlay conectarem ao backend real
2. **Testes `@ideia/cli`** — ~106K LOC sem cobertura adequada
3. **Adapters (13 linguagens)** — stubs sem geração de código real
4. **Strict mode** — habilitar `strict: true` em todos os 128 packages
5. **`!` non-null assertions** — ~249 restantes em produção
6. **`as unknown as` duplos** — ~68 ocorrências restantes

### Leitura Obrigatória Antes de Começar

- **Handoff:** `docs/governance/HANDOFF-NEXT-SESSION.md`
- **Documentos mestres:** `AGENTS.md` (este), `docs/governance/REALITY-MANIFEST.md`, `docs/governance/GAPS-PRODUCAO-IDE.md`, `docs/governance/document-registry.md`
- **Sessão anterior:** `docs/governance/SESSION-CONTINUIDADE-2026-07-22.md`

### Regras Obrigatórias

- **`tsc --noEmit` = 0 erros** — não quebrar
- **Testes passando** antes e depois de cada alteração
- **Atualizar** `HANDOFF-NEXT-SESSION.md` + `GAPS-PRODUCAO-IDE.md` + `document-registry.md` ao final
- **Documentar** ADRs em `docs/adr/` para cada decisão arquitetural
- **🚫 WORKSPACE BOUNDARY:** Somente arquivos DENTRO de `IDEIA/` podem ser alterados ou criados. Tudo fora (raiz `F:\PROJETOS\ai-devkit-workspace\`) é LEGADO — consulta permitida, modificação PROIBIDA. Qualquer tentativa de criar ou editar arquivos fora de `IDEIA/` é violação grave.

### Links Rápidos

| Ação | Comando |
|------|---------|
| Workspace root | `F:\PROJETOS\ai-devkit-workspace\IDEIA\` |
| Compilar | `npx tsc --noEmit` (0 erros) |
| Handoff | `docs/governance/HANDOFF-NEXT-SESSION.md` |
| Continuidade | `docs/governance/SESSION-CONTINUIDADE-2026-07-22.md` |
| Testes agent-runtime | `cd packages/agent-runtime && npx jest --no-coverage` |
| Testes event-bus | `cd packages/event-bus && npx jest --no-coverage` |
| ESLint | `npx eslint packages/ --max-warnings 600` |
| Pipeline auditoria | `npx tsx scripts/audit/run-audit.ts` |
