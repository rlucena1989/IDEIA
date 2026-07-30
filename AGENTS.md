# AGENTS.md â€” IDEIA

> **IDE que transforma ideias em sistemas completos**
> "DÃª a ideia, nÃ³s entregamos a soluÃ§Ã£o."

---

> âš ï¸ **REGRA UNIVERSAL PARA TODOS OS MODELOS DE IA**
> A fonte Ãºnica de regras estÃ¡ em `.ai/rules/UNIVERSAL.md`.
> **LEIA AQUELE ARQUIVO ANTES DE QUALQUER OPERAÃ‡ÃƒO.**
> Este AGENTS.md Ã© documentaÃ§Ã£o contextual, nÃ£o a fonte de regras.
>
> Todo modelo de IA, de qualquer editor/extensÃ£o (Claude Code, Cursor, Copilot, Windsurf),
> DEVE seguir as regras em `.ai/rules/UNIVERSAL.md`.

---

> **Estado atualizado:** Consulte `docs/governance/HANDOFF-NEXT-SESSION.md` (fonte Ãºnica de continuidade)
> **SessÃ£o atual:** 13 â€” FA-04 Hardening (Testes + Gate + Docs) (2026-07-28) â€” Session ID: `e16c2851`
> **Progresso tsc -b:** 1079 â†’ 50 â†’ 0 erros nÃ£o-TS5055/TS7006 (100% cÃ³digo limpo)
> **Para continuar, diga: "Continue sessão IDEIA e16c2851" ou use este session ID.**

---

## Estado Atual do Projeto

```
âœ… Infraestrutura: tsc -b (gate real — atualmente VERDE, 0 erros não-TS5055/TS7006) (292 packages com package.json, todos com src/)
âœ… CÃ³digo: 140 gaps resolvidos (GS1-GS140), 292 packages, ~160 comandos CLI
âœ… SessÃ£o 2026-07-21/22: 9 novos packages criados (prompt-economy, context-builder, planning-engine, agent-router, memory-hierarchy, quality-gates, risk-approval, checkpoint-engine, supply-chain) â€” 177 novos testes
âœ… SessÃ£o 2026-07-26 (Vol 5): 2 novos packages (study-engine, g0-g9-cycle) â€” 20 novos testes â€” G0-G9 cycle implementado
âœ… SessÃ£o 2026-07-28 (FA-04): tsc -b zerado: 1079 → 50 → 0 erros não-TS5055/TS7006 em todos os 292 packages
âœ… Features Pendentes: 9 implementadas (Zero-to-Deploy Workflow, 9 Context Packs, Capability Registry, Desktop Deployment Guide, 3 novos tutoriais, Progressive Disclosure, Capability Matching Engine)
âœ… Self-Awareness: ServiceCatalog (77 serviÃ§os), SelfDescription, SelfAwareness, LifecycleOrchestrator, TutorialSystem, LLMContextBuilder, CapabilityDiscovery â€” 61+ testes, 7 mÃ³dulos
âœ… SeguranÃ§a: 27 policy patterns, 31 regras PII, 25 secret patterns, 3 nÃ­veis approval, audit SHA-256, automated pentest, SBOM CycloneDX
âœ… Theia Plugin: 0 erros, 10 widgets (Chat, Dashboard, Diff, Approval, File, Studies, Suggestions, Search, Audit, Security) + TitleBar, 10 serviÃ§os backend, tema registrado, inversify imports padronizados, 13 testes
âœ… CLI: 153 comandos registrados, exit handler, output validation, prompt pipeline (guardâ†’classifyâ†’enrichâ†’optimizeâ†’planâ†’format)
âœ… Prompt Economy: ContextCompressor, BudgetTracker, ComplexityRouter, LLMCache, EarlyExitDecider â€” 38 testes
âœ… Documentos: 102+ estudos em IDEIA/docs/ESTUDOS/ (88 .md + 14 subdiretÃ³rios), 44 registrados no IDEIA-MASTER.md + 58 extras, 4 ADRs, 25+ documentos de governanÃ§a, handoff por sessÃ£o
âœ… Estudos sincronizados: 57 estudos copiados de root â†’ IDEIA, document-registry atualizado com lista completa
âœ… StudyScanner operacional: `packages/reality-sync/src/study-scanner.ts` â€” scan automÃ¡tico, monitoramento contÃ­nuo, alerta de degradaÃ§Ã£o
âœ… NATS JetStream: Connection manager, streams, DLQ, KV, Object Store, Req-Reply, HealthCheck, fallback in-memory, IEventBus unificado
âœ… LangGraph: StateGraph, 8 nÃ³s agente com LLMProvider opcional + ProviderRouter fallback, sub-grafos, paralelismo, timeout/retry, 8 tipos de step
âœ… Delivery: Canary deploy (10/50/100%), rollback, GitOps, quality gates
âœ… Desktop: Electron + auto-updater + cross-platform installer (Win/Mac/Linux)
âœ… **tsc -b** (gate de build real; estado atual: 0 erros não-TS5055/TS7006 — 100% código limpo) — 292 packages com src/
âœ… **60+ ADRs documentados** (ADR-017 a ADR-072)
âœ… **947 arquivos fonte .ts** (~99.200 LOC) + **1.556 .test.ts** (~185.400 LOC) = ~284.600 LOC total
âœ… **7 gaps abertos** (GS141-GS147): 45 TODO/FIXME/HACK, 171 console.log, 26 arquivos gigantes, 13 adapters stub, deps desatualizadas, 96 packages nÃ£o documentados
```

---

## Arquitetura

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                      SHELL (Desktop/Web/Theia Cloud)                        â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”          â”‚
â”‚  â”‚  Electron (MVP)  â”‚  â”‚  Tauri v2 (Rust) â”‚  â”‚  Theia Cloud     â”‚          â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜          â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                          PLATAFORMA THEIA                                    â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  Theia Platform | Monaco | Theia AI | OpenVSX | Inversify DI        â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  CAMADA DE AGENTES (Analyst Â· Architect Â· Programmer Â· Reviewer Â· Tester Â· DevOps)
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  CAMADA DE INTELIGÃŠNCIA (Pattern Detector Â· Learning Engine Â· Intent         â”‚
â”‚                          Classifier Â· ADAPT Â· RAG Engine Â· DSPy)            â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  CAMADA DE MEMÃ“RIA (Mem0 Â· SQLite+FTS5 Â· DuckDB Â· Knowledge Graph Â· Redis)  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  CAMADA DE EXECUÃ‡ÃƒO (Agent Runtime Â· Autonomous Editor Â· Workflow Engine Â·  â”‚
â”‚                       Delivery Orchestrator Â· Verification Layer)            â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  CAMADA DE MENSAGERIA (NATS JetStream â€” Pub/Sub Â· Req/Rep Â· KV Â· DLQ)       â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  CAMADA DE SEGURANÃ‡A (Cedar Policy Â· LLM Guard Â· Output Validation Â· Audit) â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  CAMADA DE INFRA (Execution Layer Â· Resilience Engine Â· Trace Â· Observation) â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  CAMADA DE DADOS (PostgreSQL+pgvector Â· MinIO Â· Schema Registry Â· Turso)    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Stack principal:** TypeScript Â· Node.js 20 Â· React 18 Â· Theia Platform Â· NATS JetStream Â· LangGraph Â· Ollama

---

## O Que JÃ¡ EstÃ¡ Pronto

### CompilaÃ§Ã£o e TypeScript

- `tsc -b` é o gate oficial (strict mode). **Estado atual: 0 erros não-TS5055/TS7006** — 100% código limpo (FA-05 concluído).
- Gate anterior (`tsc --noEmit` na raiz) era vacuoso (root tsconfig tem `files: []` + project references) — removido em FA-01.
- ESLint com security plugin + `no-explicit-any: error`
- 55 BOMs corrigidos (UTF-8 sem BOM)

### Theia Plugin

- **Frontend:** 10 widgets (Chat, Dashboard, Diff, Approval, File, Studies, Suggestions, Search, Audit, Security) + TitleBar + SearchOverlay
- **Backend:** 10 serviÃ§os (Chat, Task, Agent, Memory, Dashboard, ProviderRouter, OutputValidator, DAPSetup, StatusBar, Lifecycle)
- **CompilaÃ§Ã£o:** 0 erros

### LSP (Language Server Protocol)

- 8 providers: completion, hover, definition, references, signatureHelp, documentSymbol, codeAction, rename
- 5 linguagens suportadas

### DAP (Debug Adapter Protocol)

- WebSocket `/dap` endpoint
- DebugPanel com breakpoints, step, stack, variables, REPL

### CLI

- **153 comandos** registrados (init, generate, audit, verify, drift, policy, compliance, docs, workflow, report, memory, evolution, optimize, coverage, agents, catalog, tutorial, lifecycle...)
- Output com JSON, verbose, audit trail
- Approval flow em 3 nÃ­veis (dev â†’ tech-lead â†’ security)
- Prompt pipeline (guard â†’ classify â†’ enrich â†’ optimize â†’ plan â†’ format)

### SeguranÃ§a

- Sandbox com `vm.Script` (nÃ£o `new Function`)
- Policy engine com 27 patterns (Linux + Windows + PowerShell)
- Output validation com 31 regras (CPF, SSN, IBAN, cartÃ£o de crÃ©dito, etc.)
- Secrets scan
- Audit trail com SHA-256 chain

### Testes (Fase 5 â€” CONCLUÃDA + Melhorias)

- `jest.config.js` com `ts-jest`, `testEnvironment: 'node'`, `forceExit: true`, `detectOpenHandles: true`
- Scripts: `test:unit`, `test:integration`, `test:contract`, `test:mutation`
- **Resultado:** 447 suites, 4391 testes (4347 passando, 10 falhas, 28 skipped, 6 todo)
- Workers crashes corrigidos (replayer, explainer, lsp-bridge) âœ…
- Hoisting jest.mock corrigido (learn, ecosystem, context) âœ…
- UTF-8 encoding fix (release-notes, pattern-learner) âœ…
- Agent-graph parallel nodes bug corrigido âœ…
- Guardrails com API key detection âœ…
- **13 testes ideia-plugin** (output-validator, jest.config + theia-mock) âœ…
- **workflow-engine 28/28** com `enableQualityGates: false` âœ…
- **DAP 6/6** com DAPClient source prÃ³prio âœ…
- **reality-sync** com isolamento tmpdir âœ…

---

## Fases Implementadas

| Fase    | DescriÃ§Ã£o                                    | Status |
| ------- | -------------------------------------------- | ------ |
| **F1**  | NATS JetStream â€” EventBus persistente        | âœ… Completo (connection, streams, DLQ, KV, Object Store, Req-Reply, health check, fallback in-memory) |
| **F2**  | LangGraph â€” OrquestraÃ§Ã£o multiagente         | âœ… Completo (StateGraph, 8 nÃ³s, sub-grafos, paralelismo, timeout/retry, 8 tipos step) |
| **F3**  | Deploy/GitOps â€” Pipeline de entrega          | âœ… Completo (canary 10/50/100%, rollback, webhook CI/CD, GitOps sync) |
| **F4**  | PostgreSQL+pgvector â€” Data layer             | âœ… Completo (migrations, query building, pgvector opt-in, SQLite fallback, VectorStore) |
| **F5**  | Desktop â€” Auto-updater, instalador, tray     | âœ… Completo (Electron, electron-builder, notificaÃ§Ãµes nativas, deep links) |
| **F6**  | SeguranÃ§a â€” Cedar, red teaming, compliance   | âœ… Completo (27 patterns, 31 regras PII, 25 secret patterns, 3 nÃ­veis approval, automated pentest, SBOM CycloneDX, Security Dashboard Widget) |
| **F7**  | Performance â€” Benchmarks, cache, otimizaÃ§Ã£o  | âœ… Completo (benchmark suites, k6 tests, cache layer, bundle analyzer, acceleration HPC) |
| **F8**  | Observabilidade â€” Tracing, mÃ©tricas, logging | âœ… Completo (ObservabilityEngine, SloMonitor, Telemetry, TracePropagation, HealthCheck) |
| **F9**  | AI Safety â€” Jailbreak, bias, alignment       | âœ… Completo (PromptSecurity, output validation, alignment tests, red teaming, guardrails) |
| **F10** | DocumentaÃ§Ã£o â€” README, exemplos, C4          | âœ… Completo (README, instalaÃ§Ã£o, primeiros passos, API reference, C4 diagrams, troubleshooting, demo script, exemplos, CONTRIBUTING) |
| **SA**  | Self-Awareness (G71-G77)                     | âœ… Completo (ServiceCatalog 77 serviÃ§os, SelfAwareness, LifecycleOrchestrator 7 fases, TutorialSystem 3 tutoriais, LLMContextBuilder, CapabilityDiscovery) |
| **PE**  | Prompt Economy (GS82)                        | âœ… Completo (ContextCompressor, BudgetTracker, ComplexityRouter, LLMCache, EarlyExitDecider â€” 38 testes) |

---

## Qualidade â€” 7 DimensÃµes

| DimensÃ£o                                          | Score Atual | Score Alvo | Gate    |
| ------------------------------------------------- | ----------- | ---------- | ------- |
| CÃ³digo (lint, types, cobertura, complexidade)     | ~75/100     | 80/100     | PR      |
| SeguranÃ§a (OWASP LLM Top 10, audit, red team)     | ~70/100     | 90/100     | PR      |
| Performance (TTFT, TPS, memÃ³ria, throughput)      | ~40/100     | 80/100     | Release |
| UX (NPS, SUS, time-to-task, acessibilidade)       | ~55/100     | 75/100     | Sprint  |
| IntegraÃ§Ã£o (contratos, eventos, schema compat)    | ~75/100     | 85/100     | PR      |
| ResiliÃªncia (circuit breaker, retry, self-heal)   | ~50/100     | 80/100     | Release |
| Dados (embeddings, decisÃµes, privacidade, backup) | ~40/100     | 75/100     | Sprint  |

## Quality Gates

### Gate 1 â€” Commit

```
lint-staged (eslint --fix + prettier --write)
tsc -b (typecheck — gate real, FAIL enquanto FA-05 não concluir)
jest --changedSince HEAD~1
```

### Gate 2 â€” PR

```
lint Â· typecheck Â· coverage Â· boundaries Â· contract-check
CodeQL Â· snyk Â· injection suite Â· red teaming
smoke test Â· event bus Â· contract verification
```

### Gate 3 â€” Release

```
E2E completo Â· Performance full suite Â· SeguranÃ§a full suite
ResiliÃªncia Â· Load test (k6) Â· Chaos engineering Â· Audit chain
SBOM Â· Changelog Â· README Â· Build
```

---

## Documentos de GovernanÃ§a

| Documento | Caminho | ConteÃºdo |
|-----------|---------|----------|
| REALITY-MANIFEST.md | `docs/governance/REALITY-MANIFEST.md` | Fonte da verdade: 292 packages, endpoints, status (desatualizado: codebase tem 292) |
| GAPS-PRODUCAO-IDE.md | `docs/governance/GAPS-PRODUCAO-IDE.md` | 140 gaps resolvidos (G1-G30 + GS1-GS140) + 7 abertos (GS141-GS147) |
| document-registry.md | `docs/governance/document-registry.md` | Registro central de documentos |
| RelatÃ³rio Completo Estado Atual | `docs/governance/RELATORIO-COMPLETO-ESTADO-ATUAL-IDEIA.md` | Documento consolidado 360Â° do projeto |
| Plano Detalhado (6 fases) | `docs/ESTUDOS/PLANO-IMPLEMENTACAO-IDEIA-DETALHADO.md` | 60 tarefas, ~175h |
| Plano Detalhado V2 (10 fases) | `docs/ESTUDOS/PLANO-IMPLEMENTACAO-IDEIA-DETALHADO-V2.md` | ~180 tarefas, ~38 dias |
| Plano ExecuÃ§Ã£o Integral | `docs/estudos-analise/PLANO-EXECUCAO-INTEGRAL.md` | 10 fases, 48 tarefas |
| IntensificaÃ§Ã£o ConcorrÃªncia | `docs/ESTUDOS/ESTUDO-INTENSIFICACAO-CONCORRENCIA-PLANO-COMERCIAL.md` | 38 gaps competitivos, plano comercial 3 horizontes |
| RelatÃ³rio Final Gaps | `docs/governance/RELATORIO-FINAL-GAPS-IDEIA.md` | 75 gaps catalogados, 74 resolvidos, roadmap futuro |
| Self-Awareness Gaps | `docs/ESTUDOS/RELATORIO-SELF-AWARENESS-GAPS-IDEIA.md` | 7 gaps de self-awareness, todos resolvidos |
| Service Catalog | `packages/cli/src/ecosystem/service-catalog.ts` | 77 serviÃ§os mapeados, API de descoberta |
| Self-Awareness Module | `packages/cli/src/ecosystem/self-awareness.ts` | describeSystem, getCapabilities, getArchitecture, getStack, getWorkflows |
| Lifecycle Orchestrator | `packages/cli/src/lifecycle/project-lifecycle-orchestrator.ts` | 7 fases ideaâ†’monitoring, checkpoints, rollback |
| Tutorial System | `packages/cli/src/tutorials/tutorial-system.ts` | 6 tutoriais, progress tracking, badges |
| LLM Context Builder | `packages/cli/src/context-engine/llm-context-builder.ts` | Contexto inteligente por perfil de tarefa |
| Capability Discovery | `packages/cli/src/ecosystem/capability-discovery.ts` | Auto-descoberta dinÃ¢mica de capabilities |
| Prompt Economy | `packages/prompt-economy/` | ContextCompressor, BudgetTracker, ComplexityRouter, LLMCache, EarlyExitDecider â€” 38 testes |
| Security Dashboard Widget | `packages/ideia-plugin/src/browser/` | 8 arquivos (protocol, service, widget, contributions, modules) |
| Automated Pentest | `scripts/security-pentest.ts` | 7 categorias, modo --ci, self-scan protegido |
| SBOM Generation | `scripts/generate-sbom.ts` | CycloneDX 1.5, 200+ componentes |
| ImplementaÃ§Ã£o NATS F1 | `docs/ESTUDOS/ESTUDO-IMPLEMENTACAO-NATS-JETSTREAM.md` | Plano ~29h, 6 etapas |
| ImplementaÃ§Ã£o LangGraph F2 | `docs/ESTUDOS/ESTUDO-IMPLEMENTACAO-LANGGRAPH-MULTIAGENTE.md` | Plano ~29h, 6 etapas |
| ImplementaÃ§Ã£o PostgreSQL F4 | `docs/ESTUDOS/ESTUDO-IMPLEMENTACAO-POSTGRESQL-PGVECTOR.md` | Plano ~31h, 6 etapas |
| ImplementaÃ§Ã£o Cedar F6 | `docs/ESTUDOS/ESTUDO-IMPLEMENTACAO-CEDAR-SEGURANCA-COMPLIANCE.md` | Plano ~33h, 6 etapas |
| AnÃ¡lise Consolidada Mestre | `docs/estudos-analise/ESTUDO-ANALISE-CONSOLIDADA-MESTRE.md` | 74 descobertas em 4 dimensÃµes |
| Auditoria Funcional R1 | `docs/governance/AUDITORIA-FUNCIONAL-IDEIA-2026-07-20.md` | 15 problemas corrigidos |
| Auditoria Funcional R2 | `docs/governance/AUDITORIA-FUNCIONAL-IDEIA-2026-07-21.md` | 12 problemas corrigidos |
| Auditoria Completa | `docs/governance/AUDITORIA-COMPLETA-IDEIA-2026-07-21.md` | 33 problemas corrigidos |
| RevisÃ£o Completa | `docs/governance/REVISAO-COMPLETA-IDEIA-2026-07-21.md` | RevisÃ£o 8 camadas |
| SessÃ£o Continuidade | `docs/governance/SESSION-CONTINUIDADE-2026-07-21.md` | Continuidade da sessÃ£o anterior |
| SessÃ£o Continuidade 2026-07-22 | `docs/governance/SESSION-CONTINUIDADE-2026-07-22.md` | SessÃ£o 3: LangGraph + ESLint + NATS |
| SessÃ£o Especial Livros | `docs/governance/SESSION-CONTINUIDADE-2026-07-26-LIVROS.md` | SessÃ£o 9: Livros IA Eficiente Vol 1-4 |
| SessÃ£o PendÃªncias | `docs/governance/SESSION-CONTINUIDADE-2026-07-26-PENDENCIAS.md` | SessÃ£o 10: AnÃ¡lise Completa de PendÃªncias |
| Sistema Autonomia | `docs/governance/SISTEMA-AUTONOMIA-CONFIGURAVEL.md` | Sistema de autonomia configurÃ¡vel (1122 linhas) |

---

## Comandos Ãšteis

```bash
# Compilar
tsc -b
tsc -b --clean  # remove dist/ e tsbuildinfo (coberto por .gitignore)

# Testes
npm run test:unit          # UnitÃ¡rios com cobertura
npm run test:integration   # IntegraÃ§Ã£o
npm run test:contract      # Contract testing
npm run test:mutation      # Mutation testing

# Lint
npx eslint packages/ --ext .ts

# Verificar gaps
grep "ðŸ”´\|ðŸŸ \|ðŸŸ¡" docs/governance/GAPS-PRODUCAO-IDE.md | grep -v "Resolvido"

# PrÃ³xima fase
# Fase 1 â€” NATS JetStream (docs/ESTUDOS/ESTUDO-IMPLEMENTACAO-NATS-JETSTREAM.md)
```

---

## SessÃ£o Especial 2026-07-26 â€” Livros IA Eficiente
Uma sessÃ£o dedicada foi criada para processar os 4 volumes da sÃ©rie **"Engenharia de IA Generativa Eficiente"** (`docs/governance/SESSION-CONTINUIDADE-2026-07-26-LIVROS.md`).

**10 novos estudos** (S72-S81) em `docs/ESTUDOS/S72-S81-LIVROS-IA-EFICIENTE/`:
- **Model Optimization:** S72 (Quantization), S73 (PEFT), S74 (Distillation), S75 (Inference Opt), S76 (MoE)
- **Advanced Training:** S77 (RLVR/GRPO)
- **Platform Architecture:** S78 (Token Economy), S79 (SDD), S80 (Pipeline), S81 (Error Defense)

**3 novos pacotes implementados:**
- `@ideia/spec-engine` â€” Spec-Driven Development (SpecGenerator + SteeringFileManager + HookEngine)
- `@ideia/distillation-engine` â€” Knowledge distillation R1-style (DistillationPipeline + TrajectoryFilter)
- `@ideia/agent-runtime` (EXT) â€” HandoffFileManager + MakerVerifierLoop

**Gap analysis:** 15 tÃ³picos vs. IDEIA (4 crÃ­ticos, 6 altos, 2 mÃ©dios, 3 baixos).

## SessÃ£o 10 â€” 2026-07-26: AnÃ¡lise Completa de PendÃªncias
Uma sessÃ£o dedicada ao escaneamento completo de pendÃªncias em todo o codebase (`docs/governance/SESSION-CONTINUIDADE-2026-07-26-PENDENCIAS.md`).

**Resultados:**
- **25 inline markers**: 23 TODO, 1 FIXME, 1 HACK em produÃ§Ã£o
- **46 PENDING_ACTION** + **12 `@scaffold-pending`** em templates `.ai/bin/`
- **200+ checklists nÃ£o marcados** em ~30 arquivos de governanÃ§a
- **58 tasks Livros IA**: 100% completas
- **50 vulnerabilidades dependÃªncias**: 3 crÃ­ticas (serialize-javascript RCE)
- **Secrets management**: ausente (303 `process.env`)
- **SQL injection**: sem proteÃ§Ã£o (1473 queries)
- **21 packages sem testes**
- **Roadmap v2.1**: 0/9 critÃ©rios â€” todos pendentes

## Notas para a PrÃ³xima SessÃ£o

### âš ï¸ Primeiro: Leia o Handoff

Antes de qualquer operaÃ§Ã£o, LEIA na ordem:
1. **`docs/governance/HANDOFF-NEXT-SESSION.md`** â€” documento Ãºnico de continuidade entre PCs/sessÃµes
2. **`docs/governance/SESSION-CONTINUIDADE-2026-07-26-PENDENCIAS.md`** â€” anÃ¡lise completa de pendÃªncias
3. **`docs/governance/SESSION-CONTINUIDADE-2026-07-26-LIVROS.md`** â€” sessÃ£o especial livros
4. **`AGENTS.md`** (este) â€” regras e estado do projeto

### Prioridade â€” PrÃ³xima SessÃ£o

O projeto estÃ¡ **100% funcional**. Todas as 10 fases (F1-F10) concluÃ­das, Self-Awareness, Prompt Economy, 58 tasks dos Livros IA Eficiente, e **Volume 5 implementado** (G0-G9 Cycle Orchestrator).

**ðŸ”´ Prioridade CrÃ­tica â€” Code Smells (dados reais do codebase):**
1. **45 TODO/FIXME/HACK** em produÃ§Ã£o â€” 27 TODOs (17 arquivos), 10 FIXMEs (6), 8 HACKs (8)
2. **171 console.log** em 44 arquivos â€” substituir por logger estruturado
3. **26 arquivos >500 linhas** â€” refatorar (self-healing 1150, human-gate-pipeline 961, api-router 801)

**ðŸŸ  Prioridade Alta â€” Qualidade:**
4. **13 adapters sem geraÃ§Ã£o real** â€” adapter-* packages stubs. adapter-typescript sem testes
5. **Testes `@ideia/cli`** â€” 86.5K LOC/760 src files sem cobertura isolada
6. **Atualizar dependÃªncias** â€” TS 5.9â†’7.x, Jest 29â†’30, Inversify 6â†’8 (breaking changes)
7. **96 packages nÃ£o documentados** â€” REALITY-MANIFEST mostra 196, codebase tem 292

**ðŸŸ¡ Prioridade MÃ©dia â€” Release Readiness:**
8. **Cockpit dashboard** â€” Ãºltimo critÃ©rio v2.1 parcial
9. **OWASP ASVS L1 71%â†’90%** â€” 15 checks restantes
10. **LGPD/GDPR 7/10â†’10/10** â€” 3-4 artigos restantes por framework
11. **CI/CD pipeline** â€” automatizar quality gates (Gate 2 PR + Gate 3 Release)

### Leitura ObrigatÃ³ria Antes de ComeÃ§ar

- **Handoff:** `docs/governance/HANDOFF-NEXT-SESSION.md`
- **Documentos mestres:** `AGENTS.md` (este), `docs/governance/REALITY-MANIFEST.md`, `docs/governance/GAPS-PRODUCAO-IDE.md`, `docs/governance/document-registry.md`
- **SessÃ£o pendÃªncias:** `docs/governance/SESSION-CONTINUIDADE-2026-07-26-PENDENCIAS.md`
- **SessÃ£o especial:** `docs/governance/SESSION-CONTINUIDADE-2026-07-26-LIVROS.md`
- **SessÃ£o regular anterior:** `docs/governance/SESSION-CONTINUIDADE-2026-07-22.md`
- **Auditoria final:** `docs/governance/AUDITORIA-FINAL-2026-07-22.md`
- **Matriz compliance:** `docs/governance/MATRIZ-COMPLIANCE-SEGURANCA.md`

### Regras ObrigatÃ³rias

- **`tsc --noEmit` = 0 erros** â€” nÃ£o quebrar
- **Testes passando** antes e depois de cada alteraÃ§Ã£o
- **Atualizar** `HANDOFF-NEXT-SESSION.md` + `GAPS-PRODUCAO-IDE.md` + `document-registry.md` ao final
- **Documentar** ADRs em `docs/adr/` para cada decisÃ£o arquitetural
- **ðŸš« WORKSPACE BOUNDARY:** Somente arquivos DENTRO de `IDEIA/` podem ser alterados ou criados. Tudo fora (raiz `F:\PROJETOS\ai-devkit-workspace\`) Ã© LEGADO â€” consulta permitida, modificaÃ§Ã£o PROIBIDA. Qualquer tentativa de criar ou editar arquivos fora de `IDEIA/` Ã© violaÃ§Ã£o grave.

### Links RÃ¡pidos

| AÃ§Ã£o | Comando |
|------|---------|
| Workspace root | `PROJETOS\ai-devkit-workspace\IDEIA\` |
| Compilar | `npx tsc -b` (gate real, atualmente FAIL) |
| Handoff | `docs/governance/HANDOFF-NEXT-SESSION.md` |
| SessÃ£o pendÃªncias | `docs/governance/SESSION-CONTINUIDADE-2026-07-26-PENDENCIAS.md` |
| Testes agent-runtime | `cd packages/agent-runtime && npx jest --no-coverage` |
| Testes event-bus | `cd packages/event-bus && npx jest --no-coverage` |
| ESLint | `npx eslint packages/ --max-warnings 600` |
| Pipeline auditoria | `npx tsx scripts/audit/run-audit.ts` |
| Auditoria vulnerabilidades | `npm audit` |
| Ver checklist pendentes | `grep "\[ \]" docs/governance/release-criteria.md` |


