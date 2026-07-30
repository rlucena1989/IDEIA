# Tasks Detalhadas de Implementação — IDEIA

> **Data:** 2026-07-24  
> **Propósito:** Especificações completas de implementação para todos os grupos de tasks pendentes  
> **Documentos-fonte:** `TASKS-ESTUDOS-INTENSIFICACAO.md`, `docs/ESTUDOS/S23-S25`, `docs/ESTUDOS/T1`, `docs/ESTUDOS/UX`, `docs/governance/v3-migration-plan.md`

---

## Regras Obrigatórias para TODAS as Tasks

1. **`tsc --noEmit` = 0 erros** — não quebrar compilação
2. **Testes existentes devem continuar passando** — rodar antes e depois
3. **Apenas dentro de `IDEIA/`** — nada fora deste diretório
4. **Atualizar** `HANDOFF-NEXT-SESSION.md` + `GAPS-PRODUCAO-IDE.md` + `document-registry.md` ao final
5. **Documentar ADRs** em `docs/adr/` para cada decisão arquitetural relevante
6. **Cross-platform** — Windows PowerShell 5.1+ e Linux bash
7. **CLI auditável** — `--json` e `--verbose` em todo comando novo

---

## S23 — Self-Optimization Panel & Autonomous Evolution Engine

**Fonte:** `docs/ESTUDOS/ESTUDO-SELF-OPTIMIZATION-PANEL-AUTONOMOUS-EVOLUTION.md`  
**Tema:** IDEIA monitorar, analisar e evoluir seu próprio desempenho automaticamente  
**Princípio-chave:** Isolamento absoluto entre "IDEIA Self-Space" e "Project Space"

### 401 — Self-Optimization Panel (React Dashboard)
- **Onde:** Novo diretório `packages/self-optimization-panel/src/browser/` ou extender `packages/ideia-plugin/src/browser/`
- **O que fazer:**
  - Criar widget Theia `IDEIA_SelfOptWidget` com React dashboard
  - Métricas em tempo real: throughput evt/s, latência P50/P95/P99, memória RSS, tempo de resposta LLM
  - Gráficos interativos (Chart.js ou Recharts) para histórico de 1h/6h/24h
  - Cards de ação: "Run Auto-Optimization", "View bottlenecks", "Reset metrics"
  - Conectar ao `metrics-store` package existente em `packages/metrics-store/`
- **Arquivos:**
  - `packages/ideia-plugin/src/browser/ideia-selfopt-widget.tsx` (novo)
  - `packages/ideia-plugin/src/browser/ideia-frontend-module.ts` (registrar widget + view contribution)
  - `packages/ideia-plugin/src/browser/ideia-views-contribution.ts` (adicionar IDEIA_SelfOptViewContribution)
  - `packages/ideia-plugin/src/common/ideia-protocol.ts` (adicionar IDEIA_SELFOPT_SERVICE)
- **Testes:** 1 widget rendering test, 1 service test
- **Dependências:** `metrics-store` (já existe)

### 402 — Autonomous Evolution Engine (Scanner + Analyzer)
- **Onde:** `packages/autonomous-evolution-engine/src/` (já existe — extender)
- **O que fazer:**
  - Implementar `scanPerformanceMetrics()` — lê métricas do `metrics-store`, identifica gargalos
  - Implementar `generateOptimizationPlan()` — propõe mudanças (ex: "aumentar cache TTL", "reduzir subscribers")
  - Implementar `applyOptimization()` — executa mudanças com aprovação (respeita autonomy level)
  - Implementar `rollbackOptimization()` — reverte mudança se impacto negativo
  - Integrar com `safety-circuit` e `checkpoint-engine` para rollback automático
- **Arquivos:**
  - `packages/autonomous-evolution-engine/src/evolution-engine.ts` (refatorar)
  - `packages/autonomous-evolution-engine/src/metrics-scanner.ts` (novo)
  - `packages/autonomous-evolution-engine/src/optimization-applier.ts` (novo)
  - `packages/autonomous-evolution-engine/src/rollback-manager.ts` (novo)
- **Testes:** 4+ (scanner, planner, applier, rollback)
- **Instruções:** Respeitar `autonomy-policy.ts` — N0 só sugere, N3 aplica automaticamente

### 403 — Technology Radar (GitHub/npm/arXiv Scanner)
- **Onde:** `packages/technology-radar/src/` (já existe — extender)
- **O que fazer:**
  - GitHub: implementar `scanGitHubTrends()` via GitHub API (topicos: "ai", "typescript", "developer-tools")
  - npm: implementar `scanNpmTrends()` — packages mais baixados por semana
  - arXiv: implementar `scanArxivPapers()` — papers ML/engenharia de software
  - Consolidar em `TechnologyRadarReport` com score de relevância para IDEIA
  - Armazenar resultados em `memory-store` com TTL de 24h
  - CLI command: `IDEIA radar` com `--source github|npm|arxiv`
- **Arquivos:**
  - `packages/technology-radar/src/github-scanner.ts` (novo)
  - `packages/technology-radar/src/npm-scanner.ts` (novo)
  - `packages/technology-radar/src/arxiv-scanner.ts` (novo)
  - `packages/technology-radar/src/radar-report.ts` (novo)
- **Testes:** 3 (um por scanner) + 1 consolidação
- **Instruções:** Usar rate limiting respeitoso (GitHub API key opcional via env `GITHUB_TOKEN`)

### 404 — IDEIA Self-Chat (Chat sobre a própria IDEIA)
- **Onde:** `packages/self-chat-protocol/src/` (já existe)
- **O que fazer:**
  - Implementar `SelfChatService` que responde perguntas sobre código/packages/arquitetura da IDEIA
  - Usar RAG: indexar todos `docs/ESTUDOS/*.md` + `packages/*/src/**/*.ts` no vector-search
  - Chat widget no Theia com perguntas pré-definidas: "How does EventBus work?", "What packages exist?", "Show me the architecture"
  - Comando CLI: `IDEIA self-chat "how does policy-engine work?"`
- **Arquivos:**
  - `packages/self-chat-protocol/src/self-chat-service.ts` (refatorar)
  - `packages/self-chat-protocol/src/knowledge-indexer.ts` (novo)
  - `packages/ideia-plugin/src/browser/ideia-selfchat-widget.tsx` (novo, opcional)
- **Testes:** 2 (indexer, query)
- **Instruções:** Usar `VectorSearch.buildIndex()` (já implementado) para indexar docs no boot

### 405 — Auto-ADR Generator
- **Onde:** `packages/auto-adr/src/` (já existe)
- **O que fazer:**
  - Implementar `generateADR(decision: string, context: string, options: string[])` → documento ADR formatado
  - Template ADR: Title, Status, Context, Decision, Consequences, Compliance, Date
  - Integrar com git: ao commitar mudança arquitetural, sugerir ADR
  - CLI command: `IDEIA adr create "title"` e `IDEIA adr list`
  - Salvar em `docs/adr/ADR-NNN-title.md`
- **Arquivos:**
  - `packages/auto-adr/src/adr-generator.ts` (refatorar)
  - `packages/auto-adr/src/adr-template.ts` (novo)
  - `packages/auto-adr/src/git-hook.ts` (novo, opcional)
- **Testes:** 2 (generation, template rendering)
- **Instruções:** Formato ADR deve seguir https://adr.github.io/madr/

### 406 — Metrics Store (SQLite/DuckDB)
- **Onde:** `packages/metrics-store/src/` (já existe)
- **O que fazer:**
  - Implementar `storeMetric(name, value, tags)` com timestamp
  - Implementar `queryMetrics(name, from, to, aggregation)` — suporte a avg/max/min/p95
  - Backend SQLite para persistência local (via `better-sqlite3`, já é dependência)
  - Backend DuckDB opcional para análises mais pesadas
  - Auto-prune: deletar métricas com mais de 30 dias
  - CLI command: `IDEIA metrics show [name] --from --to`
- **Arquivos:**
  - `packages/metrics-store/src/store.ts` (refatorar)
  - `packages/metrics-store/src/sqlite-backend.ts` (novo)
  - `packages/metrics-store/src/duckdb-backend.ts` (novo, opcional)
  - `packages/metrics-store/src/pruner.ts` (novo)
- **Testes:** 3 (store, query, prune)
- **Instruções:** `better-sqlite3` já está em `devDependencies` do root

### 407 — Autonomy Levels no Painel
- **Onde:** `packages/ideia-plugin/src/browser/ideia-selfopt-widget.tsx`
- **O que fazer:**
  - Adicionar seletor de autonomy level no Self-Optimization Panel
  - Visual: 5 níveis (N0-N4) com descrição de cada um
  - Ao mudar nível, chamar `autonomy-controller.setLevel()`
  - Mostrar nível atual com destaque visual
- **Dependências:** Task 401 (Self-Optimization Panel)

### 408 — Auto-Rollback Circuit
- **Onde:** `packages/safety-circuit/src/`
- **O que fazer:**
  - Implementar `AutoRollbackCircuit` que monitora métricas pós-mudança
  - Gatilhos: throughput cai >20%, erros sobem >5%, latência dobra
  - Se gatilho disparar: reverte automaticamente e notifica
  - Log no audit-trail com motivo do rollback
  - CLI: `IDEIA safety status` mostra estado do circuit
- **Arquivos:**
  - `packages/safety-circuit/src/auto-rollback.ts` (novo)
  - `packages/safety-circuit/src/metrics-monitor.ts` (novo)
  - `packages/safety-circuit/src/index.ts` (exportar novos tipos)
- **Testes:** 2 (monitor, rollback trigger)

### 409 — PathValidator + Scope Layer (Isolamento)
- **Onde:** `packages/scope-isolation/src/` (já existe)
- **O que fazer:**
  - Implementar `PathValidator.validate(operation, path)` — impede operações fora do escopo
  - Escopos: `project:/` (projeto do usuário), `self:/` (IDEIA), `system:/` (config)
  - Regras: self não escreve em project, project não lê self
  - CLI command: `IDEIA scope check <path>` — testa permissão
  - Integrar com `verification-layer` para validar toda escrita
- **Arquivos:**
  - `packages/scope-isolation/src/path-validator.ts` (novo)
  - `packages/scope-isolation/src/scope-policy.ts` (novo)
  - `packages/scope-isolation/src/index.ts` (export)
- **Testes:** 2 (allow, deny)

### 410 — Project Optimization Panel
- **Onde:** `packages/ideia-plugin/src/browser/`
- **O que fazer:**
  - Widget Theia que analisa o projeto do usuário e sugere otimizações
  - Métricas: tamanho do projeto, número de arquivos, linguagens, dependências desatualizadas
  - Sugestões: "remova 5 dependências não usadas", "atualize TypeScript para 5.x", "refatore 3 arquivos >500 linhas"
  - Usar `packages/heuristic-engine/` para análise
  - Botão "Apply Optimization" com preview das mudanças
- **Arquivos:**
  - `packages/ideia-plugin/src/browser/ideia-projopt-widget.tsx` (novo)
  - `packages/ideia-plugin/src/browser/ideia-frontend-module.ts` (registrar)
- **Testes:** 1 rendering + 1 heuristic
- **Dependências:** `heuristic-engine` (já existe)

### 411 — isolation.yaml Policy + Enforcement
- **Onde:** `packages/scope-isolation/src/`
- **O que fazer:**
  - Definir schema `isolation.yaml` com regras de isolamento:
    ```yaml
    scopes:
      self:
        allow_write: ["self:/config/*", "self:/metrics/*"]
        deny_read: ["project:/secrets/*"]
      project:
        allow_read: ["self:/docs/*"]
    ```
  - Implementar parser YAML → `IsolationPolicy` type
  - Implementar `PolicyEnforcer.enforce(operation, path)` — valida contra policy
  - Carregar `isolation.yaml` do diretório `.ai/` do projeto
  - CLI: `IDEIA isolation validate` — testa policy atual
- **Arquivos:**
  - `packages/scope-isolation/src/policy-parser.ts` (novo)
  - `packages/scope-isolation/src/policy-enforcer.ts` (novo)
  - `packages/scope-isolation/src/index.ts` (export)
- **Testes:** 2 (parse, enforce)

### 412 — Cross-Scope Audit + Violation Registry
- **Onde:** `packages/violation-registry/src/` (já existe)
- **O que fazer:**
  - Implementar `ViolationRegistry` — registro imutável de violações de isolamento
  - Cada violação: timestamp, operation, path, scope, policy rule violated, severity
  - Interface CLI: `IDEIA violations list`, `IDEIA violations show <id>`
  - Webhook opcional para notificar em violações críticas
  - Integrar com `audit-trail` para chain hash
- **Arquivos:**
  - `packages/violation-registry/src/registry.ts` (refatorar)
  - `packages/violation-registry/src/webhook.ts` (novo)
- **Testes:** 2 (registry, audit)

### 413 — Testes de Isolamento (Path Traversal, Dry-Run)
- **Onde:** `packages/scope-isolation/__tests__/`
- **O que fazer:**
  - Testar path traversal: `../../etc/passwd`, `..\..\Windows\System32`
  - Testar dry-run: simular operações sem executar
  - Testar boundary: operações no limite do escopo
  - Testar concorrência: 10 operações simultâneas
- **Arquivos:**
  - `packages/scope-isolation/__tests__/path-traversal.test.ts` (novo)
  - `packages/scope-isolation/__tests__/dry-run.test.ts` (novo)
  - `packages/scope-isolation/__tests__/concurrency.test.ts` (novo)
- **Testes:** 10+ cenários

### 414 — Project Dependency Scanner + Tech Radar
- **Onde:** `packages/technology-radar/src/`
- **O que fazer:**
  - Implementar `scanProjectDependencies()` — lê package.json, Cargo.toml, requirements.txt etc.
  - Cruzar com Tech Radar: "dependency X está no radar como trending"
  - Alertar dependências desatualizadas ou com vulnerabilidades
  - CLI: `IDEIA deps scan`, `IDEIA deps audit`
- **Arquivos:**
  - `packages/technology-radar/src/dep-scanner.ts` (novo)
  - `packages/technology-radar/src/dep-auditor.ts` (novo)
  - `packages/technology-radar/src/index.ts` (export)
- **Testes:** 2 (scan, audit)
- **Instruções:** Usar `npm audit` ou `yarn audit` como backend, parsear output JSON

---

## S24 — Controle, Segurança e Sintonia IDEIA↔IA

**Fonte:** `docs/ESTUDOS/ESTUDO-CONTROLE-SEGURANCA-SINTONIA-IDEIA-IA.md`  
**Tema:** Garantir que autonomia crescente não resulte em perda de controle

### 501 — Autonomy Control Tower (Painel React)
- **Onde:** `packages/control-tower/src/browser/` (já existe — extender)
- **O que fazer:**
  - Criar widget Theia `IDEIA_ControlTowerWidget` com React
  - Mostrar nível atual de autonomia (N0-N4) com slider visual
  - Mostrar histórico de mudanças de nível (últimos 30 dias)
  - Mostrar健康状况 do sistema: agentes ativos, tasks em fila, erros recentes
  - Botão "Emergency Brake" (E-Stop) — desativa autonomia imediatamente
- **Arquivos:**
  - `packages/control-tower/src/browser/control-tower-widget.tsx` (refatorar)
  - `packages/control-tower/src/browser/control-tower-contribution.ts` (refatorar)
  - `packages/control-tower/src/browser/control-tower-styles.ts` (novo)
  - `packages/control-tower/src/common/control-tower-protocol.ts` (novo)
- **Testes:** 1 rendering
- **Dependências:** `autonomy-controller` (já existe)

### 502 — Safety Circuit Breaker (5 Gatilhos)
- **Onde:** `packages/safety-circuit/src/`
- **O que fazer:**
  - Implementar 5 circuit breakers monitorando:
    1. Error rate > 10% nos últimos 5 minutos → break
    2. Throughput < 50% do normal → break
    3. Latência P99 > 10s → break
    4. Memória RSS > 80% do limite → break
    5. Rollback rate > 2 em 1 hora → break
  - Cada breaker tem: `threshold`, `cooldown`, `action` (alert | throttle | stop)
  - Implementar `CircuitBreakerManager` que gerencia todos
  - Integrar com `AutoRollbackCircuit` (task 408)
- **Arquivos:**
  - `packages/safety-circuit/src/circuit-breaker-manager.ts` (novo)
  - `packages/safety-circuit/src/breakers/error-rate.ts` (novo)
  - `packages/safety-circuit/src/breakers/throughput.ts` (novo)
  - `packages/safety-circuit/src/breakers/latency.ts` (novo)
  - `packages/safety-circuit/src/breakers/memory.ts` (novo)
  - `packages/safety-circuit/src/breakers/rollback-rate.ts` (novo)
- **Testes:** 5 (um por breaker) + 1 manager

### 503 — Bidirectional Help Protocol (BHP)
- **Onde:** `packages/bhp/src/` (já existe — 674 LOC)
- **O que fazer:**
  - Implementar protocolo completo bidirecional IDEIA↔IA
  - Mensagens: `help_request`, `help_offer`, `clarification`, `confirmation`, `error_report`
  - Timeout: 30s para resposta, retry 3x, fallback para humano
  - Integrar com `safety-circuit` para detectar loops de ajuda
  - CLI: `IDEIA bhp status`, `IDEIA bhp send <message>`
- **Arquivos:**
  - `packages/bhp/src/protocol.ts` (refatorar)
  - `packages/bhp/src/session-manager.ts` (novo)
  - `packages/bhp/src/timeout-handler.ts` (novo)
  - `packages/bhp/src/bhp-cli.ts` (novo, opcional)
- **Testes:** 3 (protocol, session, timeout)
- **Instruções:** Formato das mensagens deve ser compatível com MCP

### 504 — Usability Profile Engine
- **Onde:** `packages/profiles/src/` (já existe)
- **O que fazer:**
  - Implementar `UsabilityProfile` que detecta padrões de uso
  - Perfis: Beginner (N0) → Expert (N4)
  - Detecção automática: frequência de comandos, erros cometidos, tempo gasto em cada feature
  - Sugerir mudanças de autonomia baseadas no perfil
  - CLI: `IDEIA profile detect`, `IDEIA profile suggest`
- **Arquivos:**
  - `packages/profiles/src/usability-profile.ts` (novo)
  - `packages/profiles/src/profile-detector.ts` (novo)
  - `packages/profiles/src/profile-suggester.ts` (novo)
- **Testes:** 2 (detect, suggest)

### 505 — Decision Continuity Engine
- **Onde:** `packages/continuity-engine/src/` (já existe)
- **O que fazer:**
  - Implementar `DecisionContinuityEngine` — garante que decisões não se percam entre sessões
  - Salvar cada decisão: timestamp, contexto, opções, escolha, justificativa
  - Restaurar contexto ao iniciar nova sessão: "Na sessão anterior você decidiu X"
  - Resumo de continuidade: `IDEIA session summary` mostra o que foi feito e o que estava pendente
  - Integrar com `checkpoint-engine` para snapshots de decisão
- **Arquivos:**
  - `packages/continuity-engine/src/decision-store.ts` (novo)
  - `packages/continuity-engine/src/context-restorer.ts` (novo)
  - `packages/continuity-engine/src/session-summary.ts` (novo)
- **Testes:** 3 (store, restore, summary)
- **Instruções:** Usar `memory-store` para persistência

### 506 — E-Stop + Emergency Rollback
- **Onde:** `packages/safety-circuit/src/`
- **O que fazer:**
  - Implementar `EmergencyStop` — botão/chave que para toda execução autônoma
  - Ao acionar: cancela tasks em andamento, reverte mudanças recentes, para agentes
  - Implementar `EmergencyRollback` — reverte sistema a último checkpoint estável
  - CLI: `IDEIA estop` (confirmação obrigatória), `IDEIA rollback --to <checkpoint>`
  - Log obrigatório no audit-trail com motivo e autor
- **Arquivos:**
  - `packages/safety-circuit/src/emergency-stop.ts` (novo)
  - `packages/safety-circuit/src/emergency-rollback.ts` (novo)
- **Testes:** 2 (stop, rollback)
- **Instruções:** E-Stop deve funcionar mesmo sem rede/NATS (local-only)

### 507 — 7-Layer Safety Architecture
- **Onde:** `packages/safety-circuit/src/` + `packages/policy-engine/src/`
- **O que fazer:**
  - Implementar 7 camadas de segurança:
    1. **Input Validation** — sanitizar entrada do usuário/IA
    2. **Policy Engine** — regras de negócio (já existe)
    3. **Sandbox** — execução isolada (já existe, `vm.Script`)
    4. **Circuit Breaker** — proteção contra loops (task 502)
    5. **Output Validation** — validar saída (já existe, 31 regras PII)
    6. **Audit Trail** — registro imutável (já existe, SHA-256)
    7. **Emergency Stop** — kill switch (task 506)
  - Criar `SafetyArchitecture` que orquestra as 7 camadas
  - Relatório de segurança: `IDEIA safety report` mostra status de cada camada
- **Arquivos:**
  - `packages/safety-circuit/src/safety-architecture.ts` (novo)
  - `packages/safety-circuit/src/safety-report.ts` (novo)
- **Testes:** 1 (architecture orchestration)
- **Instruções:** Camadas já existentes (2, 3, 5, 6) devem ser apenas integradas

### 508 — CLI Commands de Controle
- **Onde:** `packages/cli/src/commands/`
- **O que fazer:**
  - `IDEIA safety status` — mostra estado geral de segurança
  - `IDEIA safety pause [reason]` — pausa execução autônoma
  - `IDEIA safety resume` — retoma execução
  - `IDEIA safety level [N0-N4]` — muda nível de autonomia
  - `IDEIA safety log` — mostra últimas ações de segurança
  - Todos os comandos com `--json` e `--verbose`
- **Arquivos:**
  - `packages/cli/src/commands/safety.ts` (novo)
  - `packages/cli/src/commands/safety-status.ts` (novo, opcional)
- **Testes:** 2 (comandos)

### 509 — Eventos de Controle no EventBus
- **Onde:** `packages/event-bus/src/`
- **O que fazer:**
  - Definir eventos de controle: `safety:breaker_tripped`, `safety:estop`, `safety:level_changed`, `safety:paused`, `safety:resumed`
  - Emitir eventos em cada ação de segurança
  - Subscrever control-tower para mostrar em tempo real
  - Testar: emitir evento de segurança e verificar recebimento
- **Arquivos:**
  - `packages/event-bus/src/types.ts` (adicionar tipos de evento)
  - `packages/event-bus/__tests__/safety-events.test.ts` (novo)
- **Testes:** 2 (tipo, subscription)
- **Instruções:** Seguir padrão `subject.verb` já usado no EventBus

### 510 — Testes de Segurança (Chaos Engineering)
- **Onde:** `tests/security/` (novo diretório)
- **O que fazer:**
  - Teste 1: Simular loop infinito de auto-modificação → breaker deve parar
  - Teste 2: Injetar erro em handler → AE deve detectar e isolar
  - Teste 3: Sobrecarga de eventos (100k em 1s) → circuit breaker deve limitar
  - Teste 4: Path traversal no PathValidator → deve bloquear
  - Teste 5: E-Stop durante operação crítica → deve parar sem corromper
  - Teste 6: Rollback de mudança → estado deve ser restaurado
- **Arquivos:**
  - `tests/security/chaos-auto-modification.ts` (novo)
  - `tests/security/chaos-overload.ts` (novo)
  - `tests/security/chaos-path-traversal.ts` (novo)
  - `tests/security/chaos-estop.ts` (novo)
  - `tests/security/chaos-rollback.ts` (novo)
- **Testes:** 6 cenários de caos
- **Instruções:** Usar `jest --testPathPattern tests/security` para rodar

---

## S25 — Ajustes de Usuário, Perfis e Configuração

**Fonte:** `docs/ESTUDOS/ESTUDO-AJUSTES-USUARIO-PERFIS-CONFIGURACAO.md`  
**Tema:** Sistema de configuração, perfis de usuário e ajustes finos

### 601 — Onboarding Wizard (Web UI + CLI)
- **Onde:** `packages/onboarding-wizard/src/` (já existe) + `packages/ideia-plugin/src/browser/`
- **O que fazer:**
  - Web UI: Wizard passo-a-passo no Theia (bem-vindo → perfil → features → config)
  - CLI: `IDEIA onboarding` — versão terminal do wizard
  - Passos: escolher nome, tipo de projeto, tecnologias, nível de autonomia inicial
  - Ao final: gerar `.ai/config.yaml` personalizado
  - Tutorial pós-onboarding: mostrar 3 ações sugeridas
- **Arquivos:**
  - `packages/onboarding-wizard/src/wizard-web.ts` (refatorar)
  - `packages/onboarding-wizard/src/wizard-cli.ts` (refatorar)
  - `packages/onboarding-wizard/src/config-generator.ts` (novo)
  - `packages/ideia-plugin/src/browser/ideia-onboarding-widget.tsx` (novo)
- **Testes:** 2 (CLI flow, config generation)

### 602 — Configuration Dashboard (Web UI)
- **Onde:** `packages/ideia-plugin/src/browser/`
- **O que fazer:**
  - Widget Theia `IDEIA_ConfigWidget` com formulários visuais (não JSON)
  - Seções: Geral, Agentes, Segurança, Performance, Aparência
  - Cada seção com campos tipados (slider, toggle, select, text)
  - Preview das mudanças antes de salvar
  - Botão "Reset to defaults" por seção
- **Arquivos:**
  - `packages/ideia-plugin/src/browser/ideia-config-widget.tsx` (novo)
  - `packages/ideia-plugin/src/browser/ideia-config-sections.tsx` (novo)
  - `packages/ideia-plugin/src/browser/ideia-frontend-module.ts` (registrar)
  - `packages/config-engine/src/visual-schema.ts` (novo)
- **Testes:** 2 (rendering, schema)

### 603 — CLI Config Commands
- **Onde:** `packages/cli/src/commands/`
- **O que fazer:**
  - `IDEIA config show [key]` — mostra config atual
  - `IDEIA config set <key> <value>` — altera config
  - `IDEIA config reset [key]` — reseta ao default
  - `IDEIA config profile list` — lista perfis disponíveis
  - `IDEIA config profile use <name>` — ativa um perfil
  - `IDEIA config profile create <name> --from <base>` — cria perfil customizado
  - `IDEIA config context` — mostra contexto atual detectado
  - Todos com `--json`
- **Arquivos:**
  - `packages/cli/src/commands/config.ts` (refatorar)
- **Testes:** 2 (show, set, reset, profile)
- **Instruções:** Usar `config-engine` (já existe) como backend

### 604 — Profile System (5 Presets + Custom)
- **Onde:** `packages/profiles/src/`
- **O que fazer:**
  - 5 presets: `beginner`, `developer`, `tech-lead`, `expert`, `maximum-autonomy`
  - Cada preset: nível de autonomia, features ativadas, verbosidade, segurança
  - `ProfileManager` — carrega, ativa, lista perfis
  - Perfil custom: herda de um preset e sobrescreve propriedades
  - Salvar em `~/.ideia/profiles/` ou `.ai/profile.yaml` do projeto
- **Arquivos:**
  - `packages/profiles/src/presets.ts` (novo)
  - `packages/profiles/src/profile-manager.ts` (novo)
  - `packages/profiles/src/profile-serializer.ts` (novo)
- **Testes:** 3 (presets, manager, serialize)

### 605 — Config Validation + Security Rules (R1-R7)
- **Onde:** `packages/config-engine/src/`
- **O que fazer:**
  - Implementar `ConfigValidator` que valida toda configuração contra schema
  - Regras de segurança R1-R7:
    - R1: Não permitir `autonomy > N2` sem `safety-circuit` ativo
    - R2: Não permitir `sandbox: false`
    - R3: Não permitir `audit: disabled`
    - R4: Alertar se `policy-engine` estiver desligado
    - R5: Exigir `output-validation` ativo
    - R6: Verificar `checkpoint-interval` mínimo
    - R7: Validar `isolation-policy` sintática
  - CLI: `IDEIA config validate` — executa todas as regras
- **Arquivos:**
  - `packages/config-engine/src/validator.ts` (novo)
  - `packages/config-engine/src/security-rules.ts` (novo)
- **Testes:** 2 (validator, rules)

### 606 — Adaptive Learning Engine (Suggestions)
- **Onde:** `packages/learning-engine/src/` (talvez novo)
- **O que fazer:**
  - Implementar `AdaptiveLearningEngine` que observa uso e sugere mudanças
  - Exemplos: "Você usa muito o comando X — quer adicionar um alias?", "Você nunca usou safety commands — quer abaixar autonomia?"
  - Algoritmo: contagem de uso por comando/feature, threshold para sugestão
  - Sugestões são salvas em `memory-store` e mostradas no dashboard
  - CLI: `IDEIA suggestions` — lista sugestões atuais
- **Arquivos:**
  - `packages/learning-engine/src/adaptive-engine.ts` (novo)
  - `packages/learning-engine/src/usage-tracker.ts` (novo)
  - `packages/learning-engine/src/suggestion-generator.ts` (novo)
- **Testes:** 2 (tracker, generator)

### 607 — Context Detection + Switching
- **Onde:** `packages/config-engine/src/`
- **O que fazer:**
  - Implementar `ContextDetector` que detecta contexto atual do usuário
  - Contextos: `coding`, `debugging`, `reviewing`, `learning`, `presenting`
  - Detecção por: comandos usados, arquivos abertos, branch atual, hora do dia
  - Ao mudar contexto, sugerir troca de perfil automaticamente
  - CLI: `IDEIA context` — mostra contexto atual
- **Arquivos:**
  - `packages/config-engine/src/context-detector.ts` (novo)
  - `packages/config-engine/src/context-switcher.ts` (novo)
- **Testes:** 2 (detect, switch)

### 608 — Config Versioning + Diff + Rollback
- **Onde:** `packages/config-engine/src/`
- **O que fazer:**
  - Implementar versioning automático de config a cada mudança
  - `config diff <v1> <v2>` — mostra diferenças entre versões
  - `config rollback <v>` — volta a versão anterior
  - Manter últimas 50 versões em `~/.ideia/config-history/`
  - Usar `packages/diff-engine/` para comparar
- **Arquivos:**
  - `packages/config-engine/src/version-manager.ts` (novo)
  - `packages/config-engine/src/config-history.ts` (novo)
- **Testes:** 2 (version, rollback)

### 609 — Export/Import (Compartilhamento)
- **Onde:** `packages/config-engine/src/`
- **O que fazer:**
  - `IDEIA config export [--format json|yaml]` — exporta config atual
  - `IDEIA config import <file>` — importa config de arquivo
  - Validar arquivo importado antes de aplicar
  - Suportar: profile, snippets, keybindings, extensions list
- **Arquivos:**
  - `packages/config-engine/src/config-export.ts` (novo)
  - `packages/config-engine/src/config-import.ts` (novo)
- **Testes:** 2 (export, import + validation)

### 610 — Team/Org Policy Management
- **Onde:** `packages/policy-engine/src/`
- **O que fazer:**
  - Implementar `TeamPolicyManager` que gerencia políticas por equipe
  - Policy server: arquivo `.ai/team-policy.yaml` no repositório
  - Regras de equipe: "devs não podem mudar autonomia > N2", "todos devem ter audit ativo"
  - Override local não permitido para regras de equipe
  - CLI: `IDEIA policy team show`, `IDEIA policy team apply <file>`
- **Arquivos:**
  - `packages/policy-engine/src/team-policy.ts` (novo)
  - `packages/policy-engine/src/team-policy-validator.ts` (novo)
- **Testes:** 2 (policy load, policy enforce)
- **Instruções:** Políticas de equipe sobrescrevem políticas locais

---

## T1 — Topologia de Integração

**Fonte:** `docs/ESTUDOS/ESTUDO-COMPLETO-TOPOLOGIA-INTEGRACAO-IDEIA.md`  
**Tema:** Conectar todos os módulos via contratos, eventos e schemas

### 701 — Schema Registry (C16)
- **Onde:** `packages/schema-registry/src/` (já existe)
- **O que fazer:**
  - Implementar `SchemaRegistry` — registro central de todos os schemas (Zod)
  - Schema ID único por domínio: `event.bus.safety`, `event.bus.chat`, `config.profile`
  - Validação de contrato entre módulos via schema ID
  - Auto-descoberta: scan de `packages/*/src/**/*.ts` por schemas exportados
  - CLI: `IDEIA schema list`, `IDEIA schema validate <id> <data>`
  - Cache LRU de schemas validados
- **Arquivos:**
  - `packages/schema-registry/src/registry.ts` (refatorar)
  - `packages/schema-registry/src/discovery.ts` (novo)
  - `packages/schema-registry/src/validator.ts` (novo)
  - `packages/schema-registry/src/cache.ts` (novo)
- **Testes:** 3 (registry, discover, validate)
- **Instruções:** Schemas podem ser `z.ZodType` ou JSON Schema — suportar ambos

### 702 — Contract Testing — Pact CDC (C17)
- **Onde:** Novo diretório `tests/contract/` + `packages/contract-cdc/src/` (já existe)
- **O que fazer:**
  - Implementar Pact CDC (Consumer-Driven Contracts) entre pares de módulos
  - Pares prioritários: `event-bus → audit-trail`, `agent-runtime → policy-engine`, `cli → agent-runtime`
  - Consumer: define contrato do que espera do provider
  - Provider: verifica se atende ao contrato
  - CI: `npm run test:contract` roda todos os contratos
  - Usar `@pact-foundation/pact-js` como framework
- **Arquivos:**
  - `tests/contract/event-bus-audit.pact.ts` (novo)
  - `tests/contract/agent-runtime-policy.pact.ts` (novo)
  - `tests/contract/cli-agent-runtime.pact.ts` (novo)
  - `packages/contract-cdc/src/pact-provider.ts` (novo)
  - `packages/contract-cdc/src/pact-consumer.ts` (novo)
- **Testes:** 3 pares de contratos
- **Instruções:** Pacto deve ser gerado e verificado em CI; falha bloqueia PR

### 703 — SLO Monitoring (C18)
- **Onde:** `packages/slo-monitor/src/` (já existe)
- **O que fazer:**
  - Implementar `SloMonitor` que monitora SLOs de cada módulo
  - SLOs por módulo: `event-bus: p95<100ms, throughput>500/s`, `agent-runtime: p95<2s`
  - Coletar métricas do `metrics-store` e comparar com SLO
  - Alertar quando SLO está sendo violado (via EventBus)
  - Dashboard: `IDEIA slo status` — verde/amarelo/vermelho por módulo
  - Relatório semanal: `IDEIA slo report --last-week`
- **Arquivos:**
  - `packages/slo-monitor/src/monitor.ts` (refatorar)
  - `packages/slo-monitor/src/slo-definitions.ts` (novo)
  - `packages/slo-monitor/src/alerter.ts` (novo)
  - `packages/slo-monitor/src/reporter.ts` (novo)
- **Testes:** 3 (monitor, alert, report)

### 704 — Self↔Project Isolation (C19)
- **Onde:** `packages/scope-isolation/src/`
- **O que fazer:**
  - Reforçar isolamento IDEIA ↔ Projeto do usuário
  - Self-space: `~/.ideia/`, `.ai/` (config, memória, métricas da IDEIA)
  - Project-space: resto do diretório do usuário
  - Regra: self-space invisível para ferramentas do projeto, project-space não é alterado sem permissão
  - Implementar `IsolationBoundary` que valida toda operação de I/O
- **Arquivos:**
  - `packages/scope-isolation/src/isolation-boundary.ts` (novo)
  - `packages/scope-isolation/__tests__/isolation-boundary.test.ts` (novo)
- **Testes:** 2 (read, write boundaries)

### 705 — Auto-ADR Format (C20)
- **Onde:** `packages/auto-adr/src/`
- **O que fazer:**
  - Implementar formato MADR (Markdown Any Decision Records)
  - Template automático com: Title, Status, Context, Decision, Consequences, Compliance
  - `IDEIA adr init` — cria `docs/adr/` com template
  - `IDEIA adr new "title"` — cria novo ADR numerado
  - `IDEIA adr status <id> [proposed|accepted|deprecated|superseded]`
  - Git hook: ao detectar mudança arquitetural, sugerir `IDEIA adr new`
  - Integrar com `auto-adr` (task 405)
- **Arquivos:**
  - `packages/auto-adr/src/adr-format.ts` (refatorar)
  - `packages/auto-adr/src/adr-cli.ts` (novo)
  - `packages/auto-adr/src/adr-git-hook.ts` (novo)
- **Testes:** 2 (format, CLI)
- **Instruções:** Seguir https://adr.github.io/madr/ — compatível com `adr-tools`

### 706 — Initiative Feedback (C21)
- **Onde:** `packages/initiative-feedback/src/` (já existe)
- **O que fazer:**
  - Implementar `InitiativeFeedback` — coleta feedback sobre ações autônomas
  - Feedback: `thumbs up/down`, `comment`, `suggestion`
  - Associar feedback à iniciativa específica (via ID de execução)
  - Dashboard: mostrar feedback agregado por tipo de iniciativa
  - CLI: `IDEIA feedback send <initiative-id> --rating 4 --comment "ótimo"`
- **Arquivos:**
  - `packages/initiative-feedback/src/feedback-collector.ts` (refatorar)
  - `packages/initiative-feedback/src/feedback-aggregator.ts` (novo)
  - `packages/initiative-feedback/src/feedback-store.ts` (novo)
- **Testes:** 2 (collect, aggregate)

### 707 — Technology Radar API (C22)
- **Onde:** `packages/technology-radar/src/`
- **O que fazer:**
  - Implementar API RESTful para o Technology Radar
  - Endpoints: `GET /api/radar/trends`, `GET /api/radar/categories`, `GET /api/radar/recommendations`
  - Integrar com CLI: `IDEIA radar` → chama API interna
  - Cache de resultados (TTL 24h)
  - Export: `IDEIA radar export --format json|csv`
- **Arquivos:**
  - `packages/technology-radar/src/radar-api.ts` (novo)
  - `packages/technology-radar/src/radar-cache.ts` (novo)
  - `packages/technology-radar/src/radar-export.ts` (novo)
- **Testes:** 2 (API endpoints, cache)

### 708 — Self-Chat Protocol (C23)
- **Onde:** `packages/self-chat-protocol/src/`
- **O que fazer:**
  - Implementar `SelfChatProtocol` — protocolo para chat IDEIA↔IDEIA (em vez de IDEIA↔IA)
  - Comandos: `describe module X`, `what changed since Y`, `show me the architecture`
  - Usar RAG sobre `docs/ESTUDOS/*.md` + `packages/*/src/**/*.ts` (como task 404)
  - CLI: `IDEIA ask "how does the event bus work?"` — responde baseado no código
  - Output: texto puro no terminal, markdown no widget Theia
- **Arquivos:**
  - `packages/self-chat-protocol/src/self-chat.ts` (refatorar)
  - `packages/self-chat-protocol/src/query-engine.ts` (novo)
- **Testes:** 2 (query, response format)
- **Instruções:** Usar `VectorSearch` com IVF index que já implementamos

### 709 — Conectar memory:update → WebSocket
- **Onde:** `packages/memory-store/src/` + `packages/cli/src/`
- **O que fazer:**
  - Quando `memory-store` sofrer update, emitir evento `memory:updated`
  - EventBus → WebSocket → Theia frontend atualiza em tempo real
  - Frontend: MemoryWidget mostra contagem atualizada de records
- **Arquivos:**
  - `packages/memory-store/src/memory-store.ts` (adicionar emit)
  - `packages/cli/src/websocket/ws-broadcast.ts` (adicionar handler)
- **Testes:** 1 (event propagation)
- **Esforço:** 2h

### 710 — Conectar session:created → Observability
- **Onde:** `packages/cli/src/` + `packages/observability-engine/src/`
- **O que fazer:**
  - Ao criar sessão CLI/Theia, emitir `session:created`
  - ObservabilityEngine captura: duração da sessão, comandos executados, erros
  - Métricas enviadas para `metrics-store`
- **Arquivos:**
  - `packages/cli/src/lifecycle/session-manager.ts` (adicionar emit)
  - `packages/observability-engine/src/session-observer.ts` (novo)
- **Testes:** 1 (session tracking)
- **Esforço:** 1h

### 711 — LSP Diagnostics → MemoryStore
- **Onde:** `packages/lsp-integration/src/` + `packages/memory-store/src/`
- **O que fazer:**
  - LSP envia diagnostics para o EventBus
  - MemoryStore armazena diagnostics por arquivo
  - Agrupar por severidade: error > warning > info
  - CLI: `IDEIA diagnostics` — mostra últimos diagnostics
- **Arquivos:**
  - `packages/lsp-integration/src/diagnostics-emitter.ts` (novo)
  - `packages/memory-store/src/diagnostics-store.ts` (novo)
- **Testes:** 1 (store and retrieve)
- **Esforço:** 4h

### 712 — DAP Breakpoints → Persistir
- **Onde:** `packages/debug-service/` + `packages/memory-store/src/`
- **O que fazer:**
  - Quando breakpoint é criado/removido no DAP, salvar em `memory-store`
  - Ao reiniciar sessão de debug, restaurar breakpoints
  - Associar breakpoints ao arquivo e linha
- **Arquivos:**
  - `packages/debug-service/src/breakpoint-persistence.ts` (novo)
- **Testes:** 1 (persist and restore)
- **Esforço:** 4h
- **Prioridade:** P2

### 713 — Chat Decisions → PatternDetector
- **Onde:** `packages/chat-provider/` + `packages/pattern-detector/src/`
- **O que fazer:**
  - Decisões tomadas no chat são enviadas ao PatternDetector
  - PatternDetector analisa padrões recorrentes de decisão
  - Se padrão detectado, sugerir automatização
  - Exemplo: "você sempre roda `test:unit` antes de commit — quer auto-matizar?"
- **Arquivos:**
  - `packages/chat-provider/src/decision-emitter.ts` (novo)
  - `packages/pattern-detector/src/decision-analyzer.ts` (novo)
- **Testes:** 1 (pattern detection)
- **Esforço:** 8h
- **Prioridade:** P2

### 714 — Auto-fix → Auto-ADR
- **Onde:** `packages/auto-fix/` + `packages/auto-adr/src/`
- **O que fazer:**
  - Quando auto-fix é aplicado, gerar ADR automaticamente
  - ADR contém: o que foi corrigido, por que, qual o impacto
  - Salvar em `docs/adr/auto/` (ADRs automáticos)
- **Arquivos:**
  - `packages/auto-fix/src/adr-generator.ts` (novo)
  - `packages/auto-adr/src/auto-adr-integration.ts` (novo)
- **Testes:** 1 (auto ADR generation)
- **Esforço:** 1 semana
- **Prioridade:** P2

### 715 — Project Scanner → Project Panel
- **Onde:** `packages/project-scanner/` + `packages/ideia-plugin/src/browser/`
- **O que fazer:**
  - ProjectScanner escaneia projeto do usuário: estrutura, tecnologias, tamanho
  - Dados enviados ao Project Panel (widget Theia)
  - Panel mostra: visão geral, linguagens, dependências, sugestões
  - Auto-atualizar a cada 30s ou em eventos de mudança
- **Arquivos:**
  - `packages/project-scanner/src/scanner.ts` (refatorar)
  - `packages/ideia-plugin/src/browser/ideia-project-panel.tsx` (novo, ou extender Dashboard)
- **Testes:** 1 (scan and panel update)
- **Esforço:** 2 semanas
- **Prioridade:** P2

---

## UX — Usabilidade

**Fonte:** `docs/ESTUDOS/ESTUDO-MELHORIA-USABILIDADE-EXPERIENCIA-USUARIO.md`  
**Tema:** Melhorar experiência do usuário em todas as interfaces

### 801 — Sistema de Notificações Unificado
- **Onde:** `packages/notification-system/src/` (já existe)
- **O que fazer:**
  - Implementar `NotificationManager` — gerencia notificações de todos os canais
  - Canais: Theia (toast), Electron (native notification), CLI (stdout)
  - Tipos: info, warning, error, success
  - Ações: "View", "Dismiss", "Snooze"
  - Histórico: últimas 100 notificações em `memory-store`
  - Centro de notificações no Theia: `IDEIA_NotificationWidget`
  - Fila de notificações com rate limiting (max 5/min)
- **Arquivos:**
  - `packages/notification-system/src/notification-manager.ts` (refatorar)
  - `packages/notification-system/src/channels/theia-channel.ts` (novo)
  - `packages/notification-system/src/channels/electron-channel.ts` (novo)
  - `packages/notification-system/src/channels/cli-channel.ts` (novo)
  - `packages/notification-system/src/notification-center.ts` (novo)
  - `packages/notification-system/src/rate-limiter.ts` (novo)
  - `packages/ideia-plugin/src/browser/ideia-notification-widget.tsx` (novo)
- **Testes:** 3 (manager, channels, rate-limit)
- **Instruções:** Electron channel usa `Notification` API nativa

### 802 — Ajuda Contextual (F1) com Glossário
- **Onde:** `packages/cli/src/help/` + `packages/ideia-plugin/src/`
- **O que fazer:**
  - F1 no Theia → abre help contextual baseado no widget ativo
  - Glossário de termos IDEIA: `autonomy`, `checkpoint`, `gate`, `scope`, etc.
  - CLI: `IDEIA help <term>` — explica termo específico
  - Integrar com ChatGPT/completion para expandir ajuda quando necessário
- **Arquivos:**
  - `packages/cli/src/help/contextual-help.ts` (novo)
  - `packages/cli/src/help/glossary.ts` (novo)
  - `packages/ideia-plugin/src/browser/ideia-help-contribution.ts` (novo)
- **Testes:** 1 (glossary lookup)

### 803 — Shortcut Discovery (Cheatsheet + Dicas)
- **Onde:** `packages/keybinding-system/src/` + `packages/cli/src/`
- **O que fazer:**
  - Cheatsheet interativo: `Ctrl+Shift+P` → mostra shortcuts disponíveis
  - Dicas na status bar: "Dica: Ctrl+Enter para executar"
  - CLI: `IDEIA shortcuts` — lista todos os shortcuts
  - Adaptar por perfil: beginner vê menos shortcuts que expert
- **Arquivos:**
  - `packages/keybinding-system/src/cheatsheet.ts` (novo)
  - `packages/keybinding-system/src/tip-display.ts` (novo)
  - `packages/cli/src/commands/shortcuts.ts` (novo)
- **Testes:** 1 (cheatsheet generation)

### 804 — Estados Vazios Inteligentes com Ações
- **Onde:** `packages/ideia-plugin/src/browser/`
- **O que fazer:**
  - Substituir "No items" por estados vazios com ação
  - Ex: "Nenhum dashboard configurado → [Create Dashboard]"
  - Ex: "Nenhum agente ativo → [Start Agent]"
  - Ex: "Nenhum resultado de busca → [Try different terms]"
  - Mensagens amigáveis com ícones SVG
- **Arquivos:**
  - `packages/ideia-plugin/src/browser/ideia-empty-state.tsx` (novo)
  - Modificar cada widget para usar `EmptyState` component
- **Testes:** 1 (empty state rendering)

### 805 — Skeleton Loading em Todos os Componentes
- **Onde:** `packages/ideia-plugin/src/browser/`
- **O que fazer:**
  - Criar componente `SkeletonLoader` com animação CSS
  - Aplicar a todos os widgets: Chat, Dashboard, Diff, Studies, Suggestions, etc.
  - Tipos de skeleton: card, list, chart, text
  - Substituir "Loading..." textual por skeleton visual
  - Tempo mínimo de skeleton: 300ms (evita flash)
- **Arquivos:**
  - `packages/ideia-plugin/src/browser/ideia-skeleton.tsx` (novo)
  - Modificar cada widget para usar SkeletonLoader
- **Testes:** 1 (rendering)

### 806 — Auto-save + Undo/Redo para FileExplorer
- **Onde:** `packages/ideia-filesystem/src/` + `packages/ideia-plugin/src/browser/`
- **O que fazer:**
  - Auto-save: salvar arquivo após 2s sem edição
  - Undo/Redo: Ctrl+Z / Ctrl+Shift+Z no FileExplorer
  - Histórico de ações: rename, delete, move, create
  - Limite do histórico: 50 ações
- **Arquivos:**
  - `packages/ideia-filesystem/src/auto-save.ts` (novo)
  - `packages/ideia-filesystem/src/history-manager.ts` (novo)
- **Testes:** 2 (auto-save, undo/redo)

### 807 — Config Visual Completa (não JSON)
- **Onde:** `packages/ideia-plugin/src/browser/`
- **O que fazer:**
  - UI visual para toda configuração (não editar JSON manualmente)
  - Abas: General, Agents, Security, Performance, Appearance, Extensions
  - Cada campo com: label, descrição, input tipado (slider, toggle, select, color picker)
  - Preview: "Show raw config" → JSON editável
  - Search nos campos de config
  - (Relacionado à task 602)
- **Arquivos:**
  - `packages/ideia-plugin/src/browser/ideia-config-widget.tsx` (extender)
  - `packages/ideia-plugin/src/browser/ideia-config-fields.tsx` (novo)
- **Testes:** 1 (visual config rendering)

### 808 — Dashboard com Gráficos Interativos
- **Onde:** `packages/ideia-plugin/src/browser/ideia-dashboard-widget.tsx`
- **O que fazer:**
  - Adicionar gráficos interativos (Chart.js ou Recharts)
  - Gráfico 1: throughput de eventos (linha, última 1h)
  - Gráfico 2: uso de memória (área, última 1h)
  - Gráfico 3: comandos executados (barra, por dia)
  - Gráfico 4: erros vs sucessos (pizza, hoje)
  - Zoom temporal: 1h/6h/24h/7d
  - Auto-refresh a cada 30s
- **Arquivos:**
  - `packages/ideia-plugin/src/browser/ideia-dashboard-widget.tsx` (extender)
  - `packages/ideia-plugin/src/browser/ideia-dashboard-charts.tsx` (novo)
- **Testes:** 1 (charts rendering)
- **Instruções:** Preferir Recharts (já compatível com React 18)

### 809 — Terminal Scrollback Search + Split Panes
- **Onde:** `packages/terminal-sandbox/src/` + `packages/ideia-plugin/src/browser/`
- **O que fazer:**
  - Scrollback search: Ctrl+F no terminal → busca no buffer
  - Split panes: dividir terminal em 2-4 painéis
  - Comando: `IDEIA terminal split [horizontal|vertical]`
  - Indicador visual de qual painel está ativo
- **Arquivos:**
  - `packages/terminal-sandbox/src/scrollback-search.ts` (novo)
  - `packages/ideia-plugin/src/browser/ideia-terminal-widget.tsx` (extender)
- **Testes:** 1 (search)
- **Dependências:** `xterm.js` + `xterm-addon-search` (verificar se já existe)

### 810 — Streaming Chat Cancelável + Histórico
- **Onde:** `packages/ideia-plugin/src/browser/ideia-chat-widget.tsx`
- **O que fazer:**
  - Botão "Cancel" durante streaming (AbortController)
  - Histórico de conversas: salvar em `memory-store`
  - Navegação entre conversas: anterior/próxima
  - Search no histórico: Ctrl+F no chat
  - Exportar conversa: `IDEIA chat export --format json|txt`
- **Arquivos:**
  - `packages/ideia-plugin/src/browser/ideia-chat-widget.tsx` (extender)
  - `packages/ideia-plugin/src/browser/ideia-chat-history.tsx` (novo)
- **Testes:** 2 (cancel, history)

### 811 — Editor JSON Schema-aware para Config
- **Onde:** `packages/ideia-plugin/src/browser/`
- **O que fazer:**
  - Editor JSON no Monaco com autocomplete baseado em schema
  - Schema gerado a partir dos Zod schemas em `contracts/`
  - Validação em tempo real: erros sublinhados no editor
  - Quick-fix: sugere correções para erros comuns
- **Arquivos:**
  - `packages/ideia-plugin/src/browser/ideia-json-editor.tsx` (novo)
  - `packages/ideia-plugin/src/browser/ideia-json-schema-provider.ts` (novo)
- **Testes:** 1 (schema validation)

### 812 — CLI Progress + Dry-run + Tab Completion
- **Onde:** `packages/cli/src/`
- **O que fazer:**
  - Progress bar para operações longas: spinner + mensagem + ETA
  - Dry-run: `IDEIA <cmd> --dry-run` mostra o que faria sem executar
  - Tab completion: `IDEIA completion` gera script para bash/zsh/powershell
- **Arquivos:**
  - `packages/cli/src/utils/progress-bar.ts` (novo)
  - `packages/cli/src/utils/dry-run.ts` (novo)
  - `packages/cli/src/commands/completion.ts` (novo)
- **Testes:** 2 (progress, dry-run)

### 813 — Performance Percebida (Skeleton → Bar → ETA)
- **Onde:** `packages/ideia-plugin/src/browser/`
- **O que fazer:**
  - Skeleton aparece instantaneamente (<100ms)
  - Progress bar substitui skeleton após 2s
  - ETA estimado aparece após 5s
  - Fallback: "Isso está demorando mais que o esperado..." após 10s
  - Aplicar a: chat streaming, dashboard loading, studies loading
- **Arquivos:**
  - `packages/ideia-plugin/src/browser/ideia-progressive-loader.tsx` (novo)
  - Modificar widgets para usar ProgressiveLoader
- **Testes:** 1 (progressive loading states)

### 814 — Atalhos de Teclado Customizáveis
- **Onde:** `packages/keybinding-system/src/` + `packages/ideia-plugin/src/`
- **O que fazer:**
  - GUI para customizar atalhos no Theia
  - `IDEIA shortcuts set <command> <keybinding>`
  - `IDEIA shortcuts reset <command>` — volta ao default
  - Import/export de keybindings (JSON)
  - Validar conflitos: dois comandos não podem ter mesma tecla
- **Arquivos:**
  - `packages/keybinding-system/src/keybinding-customizer.ts` (novo)
  - `packages/keybinding-system/src/keybinding-validator.ts` (novo)
  - `packages/ideia-plugin/src/browser/ideia-keybindings-widget.tsx` (novo)
- **Testes:** 2 (customize, validate)

### 815 — Coachmarks Contextuais Pós-Onboarding
- **Onde:** `packages/onboarding-wizard/src/` + `packages/ideia-plugin/src/browser/`
- **O que fazer:**
  - Coachmarks: dicas visuais sobrepostas à UI
  - Gatilhos: primeiro uso de cada feature
  - Ex: primeiro `IDEIA config` → coachmark "Você pode mudar o perfil aqui"
  - Ex: primeiro dashboard → coachmark "Estas são suas métricas em tempo real"
  - Marcar coachmark como "visto" para não repetir
  - Reset: `IDEIA coachmarks reset`
- **Arquivos:**
  - `packages/onboarding-wizard/src/coachmark-manager.ts` (novo)
  - `packages/onboarding-wizard/src/coachmark-trigger.ts` (novo)
  - `packages/ideia-plugin/src/browser/ideia-coachmark-overlay.tsx` (novo)
- **Testes:** 2 (trigger, dismiss)

---

## S2-S8, S11, M1 — Implementações de Estudos Cross-Cutting

### 901 — VectorSearch — Busca Semântica Completa (S2)
- ⚠️ **JÁ IMPLEMENTADO** no `packages/memory-store/src/vector-search.ts`
- **O que fazer:** Verificar coverage, adicionar testes faltantes, integrar com `memory-store`
- **Testes:** Já existem 76 testes (incluindo IVF)
- **Status:** ✅ Feito

### 902 — PatternDetector — Detecção Cross-Sessão (S2)
- **Onde:** `packages/pattern-detector/src/` (já existe)
- **O que fazer:**
  - Implementar `crossSessionAnalysis()` — analisa padrões entre múltiplas sessões
  - Detectar: comandos repetidos, erros frequentes, padrões de código
  - Salvar padrões em `memory-store` com metadados de sessão
  - Sugerir automação para padrões detectados 3+ vezes
  - CLI: `IDEIA patterns` — mostra padrões detectados
- **Arquivos:**
  - `packages/pattern-detector/src/cross-session.ts` (novo)
  - `packages/pattern-detector/src/pattern-suggester.ts` (novo)
  - `packages/pattern-detector/src/pattern-store.ts` (novo)
- **Testes:** 2 (detection, suggestion)

### 903 — MemoryStore + EventBus (S2)
- **Onde:** `packages/memory-store/src/`
- **O que fazer:**
  - Quando record é adicionado/removido no MemoryStore, emitir eventos
  - Eventos: `memory:record_added`, `memory:record_removed`, `memory:search_performed`
  - Subscrever no EventBus para atualizar cache distribuído
  - Testar: adicionar record → verificar evento recebido
- **Arquivos:**
  - `packages/memory-store/src/memory-store.ts` (adicionar EventBus emit)
  - `packages/memory-store/__tests__/event-bus-integration.test.ts` (novo)
- **Testes:** 1 (event emission)
- **Instruções:** EventBus já está como dependência opcional

### 904 — PromptSecurity — Expandir Regras para 31 Tipos (S4)
- **Onde:** `packages/prompt-security/src/` (já existe)
- **O que fazer:**
  - Expandir de ~15 para 31 tipos de regras de segurança de prompt
  - Novas regras: `jailbreak_encoded`, `role_play`, `system_prompt_leak`, `token_gradual`, `many_shot`
  - Score de risco por prompt (0-100)
  - Modo `--strict` bloqueia prompts com score > 80
  - CLI: `IDEIA prompt check "prompt text"` — analisa e retorna score
- **Arquivos:**
  - `packages/prompt-security/src/rules/` (adicionar 16 novas regras)
  - `packages/prompt-security/src/scorer.ts` (novo)
- **Testes:** 16 (uma por nova regra) + 1 scorer

### 905 — PolicyEngine + Approval Flow (S4)
- **Onde:** `packages/policy-engine/src/`
- **O que fazer:**
  - Integrar PolicyEngine com Approval Flow (3 níveis: dev → tech-lead → security)
  - Ações que exigem aprovação: mudar autonomia > N2, desativar safety, modificar policy
  - Workflow: request → notify → approve/reject → execute
  - CLI: `IDEIA approval request <action>`, `IDEIA approval list`, `IDEIA approval handle <id> --approve|--reject`
  - Dashboard: mostrar aprovações pendentes
  - Timeout: 24h para aprovar, senão rejeita automaticamente
- **Arquivos:**
  - `packages/policy-engine/src/approval-flow.ts` (novo)
  - `packages/policy-engine/src/approval-store.ts` (novo)
  - `packages/cli/src/commands/approval.ts` (novo)
- **Testes:** 3 (flow, store, CLI)
- **Instruções:** Approval Flow já existe parcialmente em `packages/risk-approval/`

### 906 — Audit Trail — Hash Chain Verification (S4)
- **Onde:** `packages/audit-trail/src/`
- **O que fazer:**
  - Implementar `verifyChain()` que percorre audit trail e verifica integridade
  - Implementar `proveEntry(id)` que gera proof de inclusão (Merkle proof)
  - CLI: `IDEIA audit verify [--start <date>]`, `IDEIA audit prove <entry-id>`
  - Export audit trail: `IDEIA audit export --format json|csv`
- **Arquivos:**
  - `packages/audit-trail/src/chain-verifier.ts` (novo)
  - `packages/audit-trail/src/merkle-proof.ts` (novo)
  - `packages/cli/src/commands/audit.ts` (extender)
- **Testes:** 2 (verify, prove)
- **Instruções:** Hash chain SHA-256 já existe — implementar verificação

### 907 — AgentGraph — DAG Execution com Supervisor (S5)
- **Onde:** `packages/agent-graph/src/` ou `packages/langgraph/`
- **O que fazer:**
  - Implementar DAG execution de agentes com supervisor node
  - Nós: `analyst → architect → programmer → reviewer → tester → devops`
  - Supervisor decide: prosseguir, revisar, ou parar
  - Checkpoints após cada nó (usar `checkpoint-engine`)
  - Timeout por nó: 5min default, configurável
  - CLI: `IDEIA graph run <task>`, `IDEIA graph status`, `IDEIA graph visualize`
- **Arquivos:**
  - `packages/agent-graph/src/dag-executor.ts` (novo)
  - `packages/agent-graph/src/supervisor.ts` (novo)
  - `packages/agent-graph/src/graph-visualizer.ts` (novo)
- **Testes:** 3 (DAG, supervisor, checkpoint)
- **Instruções:** Usar `@langchain/langgraph` como base (já é dependência)

### 908 — AgentCoordinator — Task→Agent Matching (S5)
- **Onde:** `packages/agent-runtime/src/` ou novo `packages/agent-coordinator/`
- **O que fazer:**
  - Implementar `AgentCoordinator` que recebe task e encontra melhor agente
  - Matching por: habilidades do agente, carga atual, histórico de sucesso
  - Fallback: se agente primário falha, tenta secundário
  - Load balancing: round-robin entre agentes com mesma skill
  - CLI: `IDEIA agents`, `IDEIA agents assign <task> [--force <agent>]`
- **Arquivos:**
  - `packages/agent-coordinator/src/coordinator.ts` (novo)
  - `packages/agent-coordinator/src/matcher.ts` (novo)
  - `packages/agent-coordinator/src/load-balancer.ts` (novo)
- **Testes:** 3 (matching, fallback, load-balance)

### 909 — Quality Gates — Pipeline Automatizado (S6)
- **Onde:** `packages/quality-gates/src/` (já existe)
- **O que fazer:**
  - Implementar pipeline de quality gates completo: lint → typecheck → test → coverage → build
  - Cada gate com: script, threshold, ação em falha (warn/block)
  - Quality score composto (0-100) com pesos por gate
  - CLI: `IDEIA quality run`, `IDEIA quality score`, `IDEIA quality gates`
  - Auto-fix para gates corrigíveis (lint, format)
- **Arquivos:**
  - `packages/quality-gates/src/pipeline.ts` (refatorar)
  - `packages/quality-gates/src/gates/lint.ts` (novo)
  - `packages/quality-gates/src/gates/typecheck.ts` (novo)
  - `packages/quality-gates/src/gates/test.ts` (novo)
  - `packages/quality-gates/src/gates/coverage.ts` (novo)
  - `packages/quality-gates/src/gates/build.ts` (novo)
  - `packages/quality-gates/src/scorer.ts` (novo)
  - `packages/quality-gates/src/auto-fixer.ts` (novo)
- **Testes:** 4 (pipeline, gates, scorer, fixer)

### 910 — DeliveryOrchestrator — Deploy Executor Real (S6)
- **Onde:** `packages/delivery-orchestrator/src/`
- **O que fazer:**
  - Implementar deploy executor real (GitHub Actions, GitOps)
  - Steps: build → test → tag → push → deploy → verify
  - Suporte a canary: 10% → 50% → 100%
  - Rollback automático se verify falha
  - CLI: `IDEIA deploy start`, `IDEIA deploy status`, `IDEIA deploy rollback`
  - Webhook: notificar quando deploy terminar
- **Arquivos:**
  - `packages/delivery-orchestrator/src/deploy-executor.ts` (refatorar)
  - `packages/delivery-orchestrator/src/canary-deploy.ts` (novo)
  - `packages/delivery-orchestrator/src/rollback.ts` (novo)
  - `packages/delivery-orchestrator/src/webhook.ts` (novo)
- **Testes:** 3 (deploy, canary, rollback)
- **Instruções:** Deploy real depende de CI/CD configurado (task do grupo 🔴 Crítico)

### 911 — FeedbackPipeline — Processamento de Feedback (S7)
- **Onde:** `packages/feedback-pipeline/src/` (já existe)
- **O que fazer:**
  - Implementar pipeline: collect → classify → prioritize → act → verify
  - Classificação: bug, feature, improvement, question
  - Priorização: impacto × esforço (usar matriz 4×4)
  - Agir: criar issue no GitHub, gerar task, ou responder automaticamente
  - Relatório: `IDEIA feedback report` — mostra feedback agregado por semana
- **Arquivos:**
  - `packages/feedback-pipeline/src/classifier.ts` (novo)
  - `packages/feedback-pipeline/src/prioritizer.ts` (novo)
  - `packages/feedback-pipeline/src/action-handler.ts` (novo)
  - `packages/feedback-pipeline/src/reporter.ts` (novo)
- **Testes:** 3 (classify, prioritize, act)

### 912 — PatternDetector — Aprendizado Adaptativo (S7)
- **Onde:** `packages/pattern-detector/src/`
- **O que fazer:**
  - Implementar aprendizado adaptativo: padrões são refinados com uso
  - Feedback loop: padrão sugerido → usuário aceita/rejeita → aprende
  - Se padrão rejeitado 2x, não sugerir novamente
  - Se padrão aceito 3x, automatizar sem perguntar
  - Integrar com `continuity-engine` para manter aprendizado entre sessões
- **Arquivos:**
  - `packages/pattern-detector/src/adaptive-learner.ts` (novo)
  - `packages/pattern-detector/src/feedback-loop.ts` (novo)
- **Testes:** 2 (learn, feedback)

### 913 — TechRadar — GitHub/npm/arXiv Scanners (S8)
- **Onde:** `packages/technology-radar/src/`
- **O que fazer:**
  - Implementar 3 scanners (task 403) — ver detalhes em S23/403
- **Status:** 🔄 Task duplicada com 403. Implementar uma vez.
- **Observação:** Unificar com S23-403 e S23-414

### 914 — Theia BackendModule — Serviços Core (S11)
- **Onde:** `packages/ideia-plugin/src/node/`
- **O que fazer:**
  - Implementar backend services que faltam:
  - `LifecycleService` — gerencia ciclo de vida da IDEIA (start, stop, restart)
  - `HealthService` — health check endpoints
  - `ConfigService` — servir config para frontend
  - `EventBridge` — ponte EventBus ↔ WebSocket para frontend
  - Cada serviço: inversify module, protocol definitions, service implementation
- **Arquivos:**
  - `packages/ideia-plugin/src/node/lifecycle-service.ts` (novo)
  - `packages/ideia-plugin/src/node/health-service.ts` (novo)
  - `packages/ideia-plugin/src/node/config-service.ts` (novo)
  - `packages/ideia-plugin/src/node/event-bridge.ts` (novo)
  - `packages/ideia-plugin/src/node/ideia-backend-module.ts` (refatorar)
  - `packages/ideia-plugin/src/common/ideia-protocol.ts` (adicionar serviços)
- **Testes:** 3 (lifecycle, health, event-bridge)
- **Instruções:** Seguir padrão Inversify dos serviços existentes

### 915 — Macro Fluxo Completo — Teste de Integração (M1)
- **Onde:** `tests/integration/`
- **O que fazer:**
  - Teste E2E completo: ideia → plano → execução → entrega → verificação
  - Cenário: "criar um projeto Node.js com CRUD de usuários"
  - Fluxo: `IDEIA init` → `IDEIA generate crud` → `IDEIA test` → `IDEIA deploy`
  - Verificar: projeto criado, arquivos gerados, testes passam
  - Relatório: `tests/integration/macro-flow.report.md`
- **Arquivos:**
  - `tests/integration/macro-flow.test.ts` (novo)
  - `tests/integration/macro-flow-setup.ts` (novo, helpers)
- **Testes:** 1 (macro flow E2E)
- **Instruções:** Usar diretório temporário para não poluir workspace

---

## V3 — Migration (v2 → v3) ✅ COMPLETO

**Fonte:** `docs/governance/v3-migration-plan.md`  
**Estratégia:** encapsular → abstrair → contratar → migrar por borda  
**Regra:** v2 continua operando durante toda a migração  
**Status:** ✅ **100% implementado — 4 fases concluídas, ~350+ testes novos**

### M1 — Encapsular ✅
- **Esforço:** Alto
- **Risco:** Médio
- **Status:** ✅ Completo
- **O que foi feito:**
  1. **Domain layer criado** em `packages/cli/src/domain/` com **14 use cases puros** (Init, Deploy, Generate, Config, Audit, Quality, Task, Safety, Profile, Plugin, Notification, Coverage, Doc, CoverageService)
  2. **IO abstraído** via `packages/cli/src/io/` com interfaces, implementação real e mock — `getIO()` retorna `{ readFile, writeFile, log, prompt, exit }`
  3. **SettingsStore e StateStore** criados em `packages/cli/src/io/` com persistência JSON
  4. **Schemas tipados** — todos os use cases usam contratos Zod
  5. **124 testes** para domain/ (antes: 0)
  6. **3 arquivos corrompidos** reparados (privacy.ts, plugin-loader.ts, hot-reload.ts — scripts PowerShell injetados)
- **Critério de pronto:** ✅ Nenhum comando chama `fs` ou `path` diretamente
- **Testes:** 124 (antes: 0)

### M2 — Abstrair ✅
- **Esforço:** Alto
- **Risco:** Alto
- **Status:** ✅ Completo
- **O que foi feito:**
  1. **Transport separado do domínio** — `CLIAdapter` em `packages/cli/src/transport/` traduz argv → use case → stdout
  2. **Interfaces de execução** — `TaskEngine` (`task-engine.ts`) e `PlanExecutor` (`plan-executor.ts`) com implementações concretas substituíveis
  3. **Estado persistente com contrato** — `StateStore` com Zod schemas
  4. **Multi-provedor de storage** — `StorageProvider` interface com implementações `InMemoryStorage` e `LocalFileSystemStorage`
  5. **RemoteAdapter** — `packages/cli/src/transport/remote-adapter.ts` com fallback local quando API off
  6. **Planning-service aprimorado** — 7 novos métodos (cancel, fail, list, validate, events, save/load), **30 testes**
  7. **24 testes para remote-adapter**, **24 testes para storage-index**
- **Critério de pronto:** ✅ CLI pode ser substituída por outro transporte sem mudar domínio
- **Testes:** 78 (adapters + execution + storage)

### M3 — Contratar ✅
- **Esforço:** Alto
- **Risco:** Alto
- **Status:** ✅ Completo
- **O que foi feito:**
  1. **Servidor REST implementado** — Fastify em `packages/api-server/` com endpoints:
     - `GET /live`, `/ready`, `/health` — health checks
     - `POST /api/command` — executar comando
     - `POST /api/plan/execute` — executar plano
     - `GET /api/command/list` — listar comandos (13 registrados)
     - `GET /api/status` — status do servidor
     - `GET /api/logs` — logs com filtro nível/módulo
     - `GET /api/config` — configuração
     - `POST /api/privacy/forget` — LGPD/GDPR/HIPAA
     - `GET /api/privacy/status` — status privacidade
  2. **Autenticação** — API key + JWT bearer via `auth.ts`
  3. **Rate limiting** — Token bucket por IP (configurável, 100 req/min default)
  4. **Validação** — Schema validation em todos os POST endpoints
  5. **OpenAPI/Swagger** — `/docs` (Swagger UI) e `/docs/json` (OpenAPI 3.0.3)
  6. **CLI com fallback remoto** — RemoteAdapter comuta entre API e local automaticamente
  7. **SDK de cliente** — `packages/client-sdk/` com 5 métodos tipados:
     - `status()`, `runCommand()`, `executePlan()`, `getLogs()`, `getConfig()`
- **Critério de pronto:** ✅ `IDEIA status` funciona tanto via CLI direta quanto via API
- **Testes:** 15 (server + middleware), 5 (SDK)

### M4 — Migrar Núcleo ✅
- **Esforço:** Alto
- **Risco:** Alto
- **Status:** ✅ Completo
- **O que foi feito:**
  1. **Governance Service** (`packages/governance-service/`) — 3 domínios completos:
     - `GapManager` — CRUD de gaps, 4 severidades, 7 categorias, workflow status, blocking, relatórios
     - `DocumentRegistry` — 6 tipos de documento, 5 status, search por título/descrição/tags
     - `AdrService` — 4 status (proposed/accepted/deprecated/superseded), alternatives, impacto
     - `ComplianceChecker` — 3 verificações automáticas
     - **87 testes** (antes: 6)
  2. **Planning Service** (`packages/planning-service/`) — pipeline de planejamento:
     - Ciclo de vida: draft → active → step-by-step → completed/failed/cancelled
     - Validação de planos, eventos de ciclo de vida, persistência JSON
     - **30 testes** (antes: 4)
  3. **Autonomy Orchestrator** (`packages/autonomy-orchestrator/`) — orquestração de autonomia:
     - 5 níveis (N0-N4), safety circuit, auto-suggest baseado em métricas
     - Histórico de mudanças com triggeredBy (manual/auto/safety)
     - **8 testes**
  4. **Plugin SDK** (`packages/plugin-sdk/`) — SDK formal:
     - Sandboxed execution via `vm.Script` (não `new Function`)
     - 9 hook types, 9 permission types, CJS/ESM loading
     - HotReloader com debounce
     - **21 testes**
- **Critério de pronto:** ✅ v3 pode rodar sem CLI instalada (apenas servidor + cliente)
- **Testes:** 146 (governance 87 + planning 30 + autonomy 8 + plugin-sdk 21)

---

## Pós-v2.2 — Features Deferidas

> **Status:** Aguardando maturidade da arquitetura. Não implementar agora.

### Multi-agent Platform
- **Por que deferido:** Risk 8, dependencies 5, score -39
- **Pré-requisitos:** LangGraph maduro, agent-router estável, NATS JetStream operacional
- **Quando revisitar:** Após v3 M4 estável

### Plugin System
- **Por que deferido:** Risk 5, depende de arquitetura madura
- **Pré-requisitos:** v3 M4 concluído (plugin SDK formal)
- **Quando revisitar:** Após v3

### RAG Engine
- **Por que deferido:** Risk 5, depende de knowledge base sólida
- **Pré-requisitos:** VectorSearch + MemoryStore integrados, documentação completa
- **Quando revisitar:** Após tasks 901-903 concluídas

### AI Engineer
- **Por que deferido:** Risk 7, escopo muito amplo
- **Pré-requisitos:** Agentes especializados funcionais (analyst, architect, programmer, etc.)
- **Quando revisitar:** Após AgentGraph (907) e AgentCoordinator (908)

### Local AI Engine
- **Por que deferido:** Risk 6, alto esforço (8)
- **Pré-requisitos:** Suporte a Ollama + OpenAI + DeepSeek maduro
- **Quando revisitar:** Quando recursos de hardware forem suficientes

### Cognitive Coprocessor
- **Por que deferido:** Risk 6, depende de IA madura
- **Pré-requisitos:** PatternDetector, LearningEngine, AdaptiveEngine operacionais
- **Quando revisitar:** Após S24 tasks concluídas
