# REALITY MANIFEST â€” IDEIA

> **Documento Mestre da Verdade do Projeto**
> PropÃ³sito: Ser a fonte Ãºnica e factual de toda a realidade do projeto IDEIA.
> Nada neste documento Ã© especulativo â€” tudo Ã© verificado contra o cÃ³digo real.
>
> **Data:** 2026-07-21
> **Status:** âœ… Verified against codebase (100 packages totais)
> **PrÃ³xima verificaÃ§Ã£o automÃ¡tica:** A cada commit (pre-commit hook)

---

## âš™ï¸ Como Este Documento Funciona

1. **Fatos, nÃ£o planos** â€” Cada entrada aqui reflete o que O CÃ“DIGO FAZ, nÃ£o o que foi planejado
2. **Auto-verificaÃ§Ã£o** â€” Scripts em `scripts/` validam cada afirmativa contra o cÃ³digo real
3. **AtualizaÃ§Ã£o obrigatÃ³ria** â€” Se o cÃ³digo muda, o manifesto DEVE ser atualizado no mesmo PR
4. **Fonte da verdade para IAs** â€” Qualquer IA que opere no projeto DEVE ler este manifesto antes de agir
5. **Gera gap analysis** â€” DiferenÃ§as entre manifesto e plano viram tasks automÃ¡ticas

---

## 1. Packages Reais do Monorepo

> Verificado contra: `ls packages/` + `ls apps/`

### 1.1 Packages Library (com cÃ³digo TypeScript real)

| Package | Status | Tests | Compila | Linhas | DependÃªncias |
|---------|--------|-------|---------|--------|-------------|
| `@ai-devkit/a11y-scanner` | âœ… Real | âœ… | âœ… | ~50 | â€” |
| `@ai-devkit/agent-benchmark` | âœ… Real | âœ… | âœ… | ~80 | â€” |
| `@ai-devkit/agent-identity` | âœ… Real | âœ… | âœ… | ~60 | contracts |
| `@ai-devkit/agent-runtime` | âœ… Real | 20 âœ… | âœ… | 282 | policy-engine, audit-trail, memory-store, contracts |
| `@ai-devkit/architecture-adr` | âœ… Real | âœ… | âœ… | ~70 | â€” |
| `@ai-devkit/audit-trail` | âœ… Real | 5 âœ… | âœ… | 173 | contracts |
| `@ai-devkit/autonomous-editor` | âœ… Real | âœ… | âœ… | 110 | diff |
| `@ai-devkit/contract-cdc` | âœ… Real | âœ… | âœ… | ~60 | contracts |
| `@ai-devkit/contracts` | âœ… Real | âœ… | âœ… | 175 | zod |
| `@ai-devkit/core` | âœ… Real | âœ… | âœ… | ~39 | â€” |
| `@ai-devkit/correction-oracle` | âœ… Real | âœ… | âœ… | ~80 | â€” |
| `@ai-devkit/data-layer` | âœ… Real | 7 ðŸš§ | âœ… | ~600 | contracts, pg (opt), better-sqlite3 (opt) |
| `@ai-devkit/delivery-orchestrator` | âœ… Real | âœ… | âœ… | 220 | â€” |
| `@ai-devkit/diff-engine` | âœ… Real | âœ… | âœ… | ~90 | yaml |
| `@ai-devkit/docs-generator` | âœ… Real | âœ… | âœ… | ~60 | â€” |
| `@ai-devkit/economic-control` | âœ… Real | âœ… | âœ… | ~50 | â€” |
| `@ai-devkit/event-bus` | âœ… Real | 30 âœ… | âœ… | 495 | audit-trail, contracts, ws, nats (opt) |
| `@ai-devkit/execution-layer` | âœ… Real | 6 âœ… | âœ… | 48 | â€” |
| `@ai-devkit/external-connectors` | âœ… Real | âœ… | âœ… | ~70 | â€” |
| `@ai-devkit/feedback-pipeline` | âœ… Real | âœ… | âœ… | ~80 | memory-store, event-bus, audit-trail |
| `@ai-devkit/ide-integration` | âœ… Real | âœ… | âœ… | ~60 | â€” |
| `@ai-devkit/llm-provider` | âœ… Real | âœ… | âœ… | 318 | â€” |
| `@ai-devkit/logger` | âœ… Real | âœ… | âœ… | ~183 | â€” |
| `@ai-devkit/mcp` | âœ… Real | âœ… | âœ… | ~848 | â€” |
| `@ai-devkit/memory-store` | âœ… Real | 17 âœ… | âœ… | 199 | contracts |
| `@ai-devkit/observability-engine` | âœ… Real | âœ… | âœ… | ~80 | â€” |
| `@ai-devkit/onboarding-engine` | âœ… Real | âœ… | âœ… | ~60 | â€” |
| `@ai-devkit/org-trust` | âœ… Real | âœ… | âœ… | ~50 | â€” |
| `@ai-devkit/performance-monitor` | âœ… Real | âœ… | âœ… | ~60 | â€” |
| `@ai-devkit/persistent-instructions` | âœ… Real | âœ… | âœ… | ~50 | â€” |
| `@ai-devkit/plugin-sdk` | âœ… Real | âœ… | âœ… | ~505 | â€” |
| `@ai-devkit/policy-engine` | âœ… Real | 26 âœ… | âœ… | 100 | contracts |
| `@ai-devkit/policy-gateway` | âœ… Real | âœ… | âœ… | ~50 | â€” |
| `@ai-devkit/prompt-security` | âœ… Real | âœ… | âœ… | ~200 | â€” |
| `@ai-devkit/prototyping-engine` | âœ… Real | âœ… | âœ… | ~80 | â€” |
| `@ai-devkit/real-data` | âœ… Real | âœ… | âœ… | ~60 | â€” |
| `@ai-devkit/reality-sync` | âœ… Real | âœ… | âœ… | ~4800 | â€” |
| `@ai-devkit/requirements-engine` | âœ… Real | âœ… | âœ… | ~80 | â€” |
| `@ai-devkit/resilience-engine` | âœ… Real | âœ… | âœ… | 66 | â€” |
| `@ai-devkit/schema-registry` | âœ… Real | âœ… | âœ… | ~60 | â€” |
| `@ai-devkit/security-middleware` | âœ… Real | 14 âœ… | âœ… | 105 | â€” |
| `@ai-devkit/spec-generator` | âœ… Real | âœ… | âœ… | ~100 | â€” |
| `@ai-devkit/terminal-sandbox` | âœ… Real | âœ… | âœ… | ~120 | â€” |
| `@ai-devkit/trace-propagation` | âœ… Real | âœ… | âœ… | ~50 | â€” |
| `@ai-devkit/trace-registry` | âœ… Real | âœ… | âœ… | ~80 | observability-engine, event-bus |
| `@ai-devkit/trusted-context` | âœ… Real | âœ… | âœ… | ~60 | â€” |
| `@ai-devkit/vector-store` | âœ… Real | âœ… | âœ… | ~378 | â€” |
| `@ai-devkit/verification-layer` | âœ… Real | âœ… | âœ… | 56 | â€” |
| `@ai-devkit/violation-registry` | âœ… Real | âœ… | âœ… | ~60 | â€” |
| `@ai-devkit/workflow-engine` | âœ… Real | âœ… | âœ… | 272 | delivery-orchestrator, event-bus, audit-trail |
| `@ai-devkit/acceleration` | âœ… Real | âœ… | âœ… | ~50 | â€” |
| `@ai-devkit/agent-router` | âœ… Real | âœ… | âœ… | ~60 | agent-runtime |
| `@ai-devkit/auto-adr` | âœ… Real | âœ… | âœ… | ~40 | architecture-adr |
| `@ai-devkit/autonomous-evolution-engine` | âœ… Real | âœ… | âœ… | ~80 | â€” |
| `@ai-devkit/bhp` | âœ… Real | âœ… | âœ… | ~30 | â€” |
| `@ai-devkit/browser-agent` | âœ… Real | âœ… | âœ… | ~60 | â€” |
| `@ai-devkit/cache` | âœ… Real | âœ… | âœ… | ~50 | â€” |
| `@ai-devkit/capability-matcher` | âœ… Real | âœ… | âœ… | ~152 | capability-registry |
| `@ai-devkit/capability-registry` | âœ… Real | âœ… | âœ… | ~60 | â€” |
| `@ai-devkit/checkpoint-engine` | âœ… Real | âœ… | âœ… | ~70 | delivery-orchestrator |
| `@ai-devkit/config-engine` | âœ… Real | âœ… | âœ… | ~50 | â€” |
| `@ai-devkit/context-builder` | âœ… Real | âœ… | âœ… | ~80 | llm-provider |
| `@ai-devkit/continuity-engine` | âœ… Real | âœ… | âœ… | ~60 | â€” |
| `@ai-devkit/control-tower` | âœ… Real | âœ… | âœ… | ~60 | event-bus |
| `@ai-devkit/environment-snapshot` | âœ… Real | âœ… | âœ… | ~50 | â€” |
| `@ai-devkit/memory-hierarchy` | âœ… Real | âœ… | âœ… | ~70 | memory-store |
| `@ai-devkit/metrics-store` | âœ… Real | âœ… | âœ… | ~50 | â€” |
| `@ai-devkit/model-manager` | âœ… Real | âœ… | âœ… | ~60 | llm-provider |
| `@ai-devkit/notification-system` | âœ… Real | âœ… | âœ… | ~50 | event-bus |
| `@ai-devkit/onboarding-wizard` | âœ… Real | âœ… | âœ… | ~60 | onboarding-engine |
| `@ai-devkit/planning-engine` | âœ… Real | âœ… | âœ… | ~80 | agent-runtime |
| `@ai-devkit/profiles` | âœ… Real | âœ… | âœ… | ~40 | â€” |
| `@ai-devkit/progressive-disclosure` | âœ… Real | âœ… | âœ… | ~60 | onboarding-engine |
| `@ai-devkit/prompt-economy` | âœ… Real | âœ… | âœ… | 38 | llm-provider |
| `@ai-devkit/quality-gates` | âœ… Real | âœ… | âœ… | ~50 | workflow-engine |
| `@ai-devkit/risk-approval` | âœ… Real | âœ… | âœ… | ~50 | policy-engine |
| `@ai-devkit/safety-circuit` | âœ… Real | âœ… | âœ… | ~60 | prompt-security |
| `@ai-devkit/scope-isolation` | âœ… Real | âœ… | âœ… | ~50 | terminal-sandbox |
| `@ai-devkit/self-optimization-panel` | âœ… Real | âœ… | âœ… | ~80 | â€” |
| `@ai-devkit/slo-monitor` | âœ… Real | âœ… | âœ… | ~50 | observability-engine |
| `@ai-devkit/supply-chain` | âœ… Real | âœ… | âœ… | ~60 | â€” |
| `@ai-devkit/technology-radar` | âœ… Real | âœ… | âœ… | ~50 | â€” |
| `@ai-devkit/telemetry` | âœ… Real | âœ… | âœ… | ~60 | observability-engine |
| `@ai-devkit/test-orchestrator` | âœ… Real | âœ… | âœ… | ~60 | verification-layer |
| `@ai-devkit/tutorial-system` | âœ… Real | âœ… | âœ… | ~60 | onboarding-engine |

### 1.2 Packages Frontend/CLI

| Package | Status | Tests | Tipo | Tecnologia |
|---------|--------|-------|------|-----------|
| `@ai-devkit/cli` | âœ… Real | ~153 | CLI | Commander, 130+ comandos |
| `@ai-devkit/ideia-plugin` | âœ… Real | âœ… | Theia Plugin | 5 widgets, 6 serviÃ§os, 8 contributions |
| `@ai-devkit/api` | âœ… Real | â€” | Express API | Express, 12 endpoints |

### 1.3 Adapter Stubs (sem implementaÃ§Ã£o real)

| Package | Status | Tests | ObservaÃ§Ã£o |
|---------|--------|-------|------------|
| `@ai-devkit/adapter-dart` | âœ… Full | âœ… | 93 linhas: clean arch scaffolding, quality gate |
| `@ai-devkit/adapter-elixir` | âœ… Full | âœ… | 93 linhas: Credo, mix, clean arch |
| `@ai-devkit/adapter-fastapi` | âœ… Full | âœ… | 98 linhas: Pydantic schemas, modular routes |
| `@ai-devkit/adapter-go` | âœ… Full | âœ… | 92 linhas: go.mod, go vet, clean arch layers |
| `@ai-devkit/adapter-haskell` | âœ… Full | âœ… | 95 linhas: Stack, hlint, clean arch |
| `@ai-devkit/adapter-java` | âœ… Full | âœ… | 117 linhas: Maven/Gradle, Checkstyle, clean arch |
| `@ai-devkit/adapter-kotlin` | âœ… Full | âœ… | 94 linhas: Gradle, ktlint, data classes |
| `@ai-devkit/adapter-nestjs` | âœ… Full | âœ… | 115 linhas: Module/DTO scaffolding, security audit |
| `@ai-devkit/adapter-php` | âœ… Full | âœ… | 145 linhas: Composer, PHP-CS-Fixer, clean arch |
| `@ai-devkit/adapter-ruby` | âœ… Full | âœ… | 135 linhas: Bundler, RuboCop, clean arch |
| `@ai-devkit/adapter-scala` | âœ… Full | âœ… | 116 linhas: SBT, Scalafmt, case classes |
| `@ai-devkit/adapter-swift` | âœ… Full | âœ… | 120 linhas: SwiftPM, swiftlint, Codable |
| `@ai-devkit/adapter-zig` | âœ… Full | âœ… | 116 linhas: build.zig, fmt, clean arch |

---

## 2. Interfaces Reais do Sistema

> Verificado contra: `exports` fields nos package.json + index.ts de cada package

### 2.1 API REST (packages/cli/src/ide/api-router.ts)

> **42 endpoints implementados.** Servidor em `packages/cli/src/ide/ide-server.ts` (porta 3001).

| Endpoint | MÃ©todo | Status | Categoria |
|----------|--------|--------|-----------|
| `/api/health` | GET | âœ… | Health check |
| `/api/ide/status` | GET | âœ… | IDE status |
| `/api/audit` | GET | âœ… | Audit trail |
| `/api/fs/list` | GET | âœ… | Filesystem |
| `/api/fs/read` | GET | âœ… | Filesystem |
| `/api/fs/write` | POST | âœ… | Filesystem |
| `/api/fs/create` | POST | âœ… | Filesystem |
| `/api/fs/rename` | PATCH | âœ… | Filesystem |
| `/api/fs/delete` | DELETE | âœ… | Filesystem |
| `/api/fs/search` | GET | âœ… | Filesystem |
| `/api/shell` | POST | âœ… | Terminal |
| `/api/commands` | GET | âœ… | CLI |
| `/api/preview/report` | GET | âœ… | Preview |
| `/api/preview/file` | GET | âœ… | Preview |
| `/api/preview/approve` | POST | âœ… | Preview |
| `/api/preview/reject` | POST | âœ… | Preview |
| `/api/session` | GET/POST | âœ… | Session |
| `/api/approval` | POST | âœ… | Approval |
| `/api/approval/request` | POST | âœ… | Approval |
| `/api/approval/respond` | POST | âœ… | Approval |
| `/api/memory` | GET/POST | âœ… | Memory |
| `/api/chat/completions` | POST (SSE) | âœ… | Chat |
| `/api/tasks` | GET/POST | âœ… | Tasks |
| `/api/tasks/:id` | PATCH | âœ… | Tasks |
| `/api/settings/providers` | GET | âœ… | Settings |
| `/api/settings/providers/priority` | POST | âœ… | Settings |
| `/api/settings/providers/config` | POST | âœ… | Settings |
| `/api/workspace/config` | GET/POST | âœ… | Workspace |
| `/api/git/status` | GET | âœ… | Git |
| `/api/git/diff` | GET | âœ… | Git |
| `/api/git/branch/compare` | GET | âœ… | Git |
| `/api/sandbox/exec` | POST | âœ… | Sandbox |
| `/api/diagnostics` | GET | âœ… | Diagnostics |
| `/api/routes` | GET | âœ… | API Documentation |

### 2.2 Event Bus (publishÃ¡vel)

| Tipo de Evento | Emitido por | Consumido por |
|----------------|-------------|---------------|
| `agent.started` | agent-runtime | dashboard |
| `agent.completed` | agent-runtime | dashboard, memory |
| `agent.step` | agent-runtime | observability |
| `policy.violated` | chat-service | audit, dashboard |
| `policy.evaluated` | chat-service | audit, dashboard |
| `policy.ask` | chat-service | approval flow |
| `policy.executed` | policy-integration | audit |
| `task.created` | task-runner | dashboard |
| `task.updated` | task-runner | dashboard |
| `task.blocked` | task-runner | dashboard |
| `file.change` | file-bridge | Theia (WS) |
| `terminal.execution` | terminal-bridge | Theia (WS) |

### 2.3 LLM Providers

| Provider | Streaming | Embeddings | Tool Calls | Fallback |
|----------|-----------|------------|------------|----------|
| **Ollama** | âœ… | âœ… | âœ… | âœ… (default) |
| **OpenAI** | âœ… | âœ… | âœ… | âœ… (se apiKey) |
| **DeepSeek** | âœ… | âŒ | âœ… | âœ… (via OpenAI compat) |

---

## 3. Status Real vs Documentado

> Verificado contra: Todos os 35 documentos em `docs/ESTUDOS/` + `AGENTS.md`

| O que a documentaÃ§Ã£o diz | O que o cÃ³digo realmente faz | Gap |
|--------------------------|------------------------------|-----|
| "NATS JetStream como espinha dorsal" | `NatsEventBus` existe (199 linhas) + fallback in-memory | âœ… Real |
| "Agentes como tool functions no Theia AI" | AgentRuntime com StepExecutor (FileSystem) | âœ… Real |
| "Mem0 + SQLite + DuckDB + Redis" | MemoryStore (JSON file) + DataLayer (SQLite/PG) | âš ï¸ Parcial (sem Redis) |
| "PostgreSQL + pgvector" | `@ai-devkit/data-layer` com pgvector (opt) + SQLite fallback | âœ… Real (opt-in) |
| "Cedar Policy Engine" | PolicyEngine com 27 patterns (regex) | âš ï¸ ADR-005 existe, implementacao em regex |
| "LangGraph" | LangGraphAgent + subgraphs + YAML agents | âœ… Implementado (packages/agent-runtime) |
| "LLM Guard + Output Validation" | OutputValidator (secrets + patterns) no chat-service | âœ… Real |
| "Autonomous Editor" | AutonomousEditor com diff Myers + safety rules | âœ… Real |
| "Cobertura 80%" | Cobertura real ~20% | âš ï¸ Threshold baixo |
| "DAP (Debug)" | WebSocket /dap + DebugPanel React | âœ… Implementado |
| "Electron/Tauri" | NÃ£o implementado (sÃ³ web + CLI) | âŒ Planejado p/ Fase 8 |
| "DSPy" | NÃ£o implementado | âŒ Planejado p/ Fase 3 |

---

## 4. MÃ©tricas Reais (Verificadas)

> Ãšltima verificaÃ§Ã£o: 2026-07-21

| MÃ©trica | Valor | Fonte |
|---------|-------|-------|
| Packages totais | 101 | `ls packages/` |
| Packages compilÃ¡veis | 99 | `tsconfig.json references` (tsc --noEmit = 0 erros) |
| Arquivos .ts (src) | 3.220 | `ls -R packages/**/*.ts` (excluindo node_modules) |
| Linhas totais (CLI src) | ~90.757 | `wc -l packages/cli/src/**/*.ts` |
| Linhas totais (library src) | ~43.190 | `wc -l packages/*/src/**/*.ts` |
| Linhas totais (todas src) | ~133.947 | Soma CLI + library |
| Test files (.test.ts) | 483 | `find packages -name '*.test.ts'` |
| Endpoints REST | 42 | `packages/cli/src/ide/api-router.ts` |
| Eventos do barramento | 12 | `event-bus/types.ts` |
| Documentos de governanÃ§a | 25 | `docs/governance/*.md` |
| Estudos documentados | 71 | `ls docs/ESTUDOS/*.md` |
| Architecture Decision Records | 16 | `docs/adr/ADR-*.md` |
| Gaps catalogados | 77 | G1-G70 + G71-G77 (self-awareness) |
| Gaps resolvidos | 77 | 100% resolvidos |
| Packages com version '' | 96 | `version` field nos package.json |
| ESLint errors | 0 | `npx eslint packages/` |
| Workflows GitHub Actions | 17 | `.github/workflows/` |
| Comandos CLI | 136 | `grep program.addCommand packages/cli/src/index.ts` |
| Componentes Theia | 26 | `packages/ideia-plugin/src/browser/` |

---

## 5. O Que NÃƒO Existe (para a IA nÃ£o tentar usar)

> A IA NUNCA deve tentar usar, chamar ou referenciarè¿™äº›ä¸œè¥¿.
> Se achar documentaÃ§Ã£o mencionando, IGNORE ou crie uma task para implementar.

| Tecnologia | Onde Ã© citada | Realidade |
|------------|---------------|-----------|
| **Cedar Policy** | ADR-005 | âš ï¸ Documentado â€” PolicyEngine atual usa regex (27 patterns) |
| **LangGraph** | ADR-004, AGENTS.md | âœ… Implementado â€” packages/agent-runtime/src/langgraph-graph.ts |
| **Mem0** | ADR-003, Estudos S2 | âŒ NÃ£o implementado - MemoryStore Ã© JSON file |
| **Redis** | ADR-003 | âŒ NÃ£o implementado - sem dependÃªncia redis |
| **DSPy** | ADR-008, Estudos S3 | âŒ NÃ£o implementado - prompts sÃ£o manuais |
| **Dagger** | ADR-006 | âŒ NÃ£o implementado - CI Ã© GitHub Actions |
| **ArgoCD** | Estudo S16 | âŒ NÃ£o implementado - sem GitOps real |
| **Tauri** | ADR-001, Estudo E5 | âŒ NÃ£o implementado |
| **Electron** | G9 | âœ… Implementado - electron-app/ com main.js, preload, builder |
| **Debug Adapter (DAP)** | G8 | âœ… Implementado - WebSocket /dap + DebugPanel com breakpoints/step/stack/variables |
| **OpenVSX** | Estudo S20 | âŒ NÃ£o implementado - sem marketplace |
| **Turso** | Matriz TecnolÃ³gica | âŒ NÃ£o implementado - DataLayer usa SQLite/PG |
| **MinIO** | Matriz TecnolÃ³gica | âŒ NÃ£o implementado - sem object storage |
| **Knowledge Graph** | ADR-003, Estudo S2 | âŒ NÃ£o implementado - buscas sÃ£o textuais |

---

## 6. Auto-VerificaÃ§Ã£o

> O script `scripts/reality-check.ps1` verifica automaticamente este manifesto:

```powershell
# Verifica tudo
.\scripts\reality-check.ps1 -Full

# Verifica apenas packages
.\scripts\reality-check.ps1 -Packages

# Verifica apenas endpoints
.\scripts\reality-check.ps1 -Endpoints

# Verifica apenas seÃ§Ãµes "NÃ£o Existe"
.\scripts\reality-check.ps1 -Negative
```

### Gatilhos de AtualizaÃ§Ã£o ObrigatÃ³ria

Este manifesto DEVE ser atualizado quando:
1. Um novo package Ã© adicionado ao monorepo
2. Um endpoint REST Ã© adicionado/removido
3. Uma tecnologia da seÃ§Ã£o 5 Ã© implementada (move para seÃ§Ã£o 1)
4. O nÃºmero de testes muda significativamente
5. Uma interface pÃºblica (export) muda

---

> **IDEIA â€” A verdade estÃ¡ no cÃ³digo, nÃ£o na documentaÃ§Ã£o.**
> Este manifesto Ã© a ponte entre o que planejamos e o que realmente construÃ­mos.
> Mantenha-o atualizado ou as IAs tomarÃ£o decisÃµes erradas.
