# Document Registry — IDEIA Governance

> **Última atualização:** 2026-07-22 — Funcionalidades Implementadas (Gaps G1-G11 resolvidos): Self-Description Manifest, Capability Registry, 9 Context Packs, Zero-to-Deploy Workflow, Desktop Deployment Guide, Blueprint Generator, Tutorial System, Progressive Disclosure, Capability Matching Engine

## Documentos de Governança

| # | Documento | Descrição | Data | Status |
|---|-----------|-----------|------|--------|
| 1 | `docs/governance/MATRIZ-COMPLIANCE-SEGURANCA.md` | Matriz de Compliance Regulatória, Controles de Segurança, OWASP ASVS, Maturidade, Plano de Remediação e Checklist Pré-Produção | 2026-07-17 | ✅ Publicado |
| 2 | `docs/governance/POLITICA-GOVERNANCA-IDEIA.md` | Política de Governança completa: estrutura, autonomia, commits, branches, PRs, releases, segurança, privacidade, conduta e contribuição | 2026-07-17 | ✅ Publicado |
| 3 | `docs/adr/ADR-001-theia-como-plataforma-base.md` | ADR-001: Theia como Plataforma Base | 2026-07-18 | ✅ Aprovado |
| 4 | `docs/adr/ADR-002-nats-jetstream-como-barramento-de-eventos.md` | ADR-002: NATS JetStream como Barramento de Eventos | 2026-07-18 | ✅ Aprovado |
| 5 | `docs/adr/ADR-003-mem0-sqlite-duckdb-como-stack-de-memoria.md` | ADR-003: Mem0 + SQLite + DuckDB como Stack de Memória | 2026-07-18 | ✅ Aprovado |
| 6 | `docs/adr/ADR-004-langgraph-para-orquestracao-multiagente.md` | ADR-004: LangGraph para Orquestração Multiagente | 2026-07-18 | ✅ Aprovado |
| 7 | `docs/adr/ADR-005-cedar-como-policy-engine.md` | ADR-005: Cedar como Policy Engine | 2026-07-18 | ✅ Aprovado |
| 8 | `docs/adr/ADR-006-dagger-github-actions-para-cicd.md` | ADR-006: Dagger + GitHub Actions para CI/CD | 2026-07-18 | ✅ Aprovado |
| 9 | `docs/adr/ADR-007-estrategia-llm-slm-local-api-cloud.md` | ADR-007: Estratégia de LLMs — SLM Local + API Cloud | 2026-07-18 | ✅ Aprovado |
| 10 | `docs/adr/ADR-008-adapt-para-task-decomposition.md` | ADR-008: ADAPT para Task Decomposition | 2026-07-18 | ✅ Aprovado |
| 11 | `docs/adr/ADR-009-opentelemetry-langfuse-para-observabilidade.md` | ADR-009: OpenTelemetry + LangFuse para Observabilidade | 2026-07-18 | ✅ Aprovado |
| 12 | `docs/adr/ADR-010-estrategia-de-qualidade-em-4-gates.md` | ADR-010: Estratégia de Qualidade em 4 Gates | 2026-07-18 | ✅ Aprovado |
| 13 | `docs/ESTUDOS/IDEIA-MASTER.md` | Documento Mestre v2.0 — consolidação de todos os 30 documentos | 2026-07-18 | ✅ Publicado |
| 14 | `AGENTS.md` | Guia do agente com arquitetura, regras, qualidade, estudos e contribuição | 2026-07-18 | ✅ Atualizado |
| 15 | `docs/governance/GAPS-PRODUCAO-IDE.md` | Gap Analysis: 27 gaps catalogados (críticos, altos, médios) para produção e IDE | 2026-07-18 | ✅ Substituído (ver #19 e #30) |
| 16 | `SECURITY.md` | Política de segurança com canal de reporte de vulnerabilidades | 2026-07-18 | ✅ Publicado |
| 17 | `CODE_OF_CONDUCT.md` | Código de Conduta baseado no Contributor Covenant v2.0 | 2026-07-18 | ✅ Publicado |
| 18 | `docs/governance/AUDITORIA-TECNICA-IDEIA.md` | Auditoria Técnica completa: 12 seções, 50+ findings, priorização, quick wins, recomendações estratégicas | 2026-07-18 | ✅ Publicado |
| 19 | `docs/governance/GAPS-PRODUCAO-IDE.md` (atualizado G41-G69) | Gaps expandidos com análise deep-dive de código, 29 novos gaps (G41-G69) documentados | 2026-07-18 | ✅ Atualizado |
| 20 | `docs/ESTUDOS/ESTUDO-INTENSIFICACAO-IMPLEMENTACAO-REAL.md` | Intensificação: análise real vs projetada de 15 packages, scores, soluções prontas | 2026-07-18 | ✅ Publicado |
| 21 | `TASKS-IMPLEMENTACAO-DIRETA.md` (raiz) | Lista de 36 tarefas de implementação direta (34/36 concluídas, 94%) | 2026-07-18 | ✅ Atualizado |
| 22 | `docs/ESTUDOS/TEMPLATE-ANALISE-PERMANENTE.md` | Template obrigatório para estudos: 4 fases, 5 dimensões, score ≥ 3.5 gera task | 2026-07-18 | ✅ Publicado |
| 23 | `ideia-theia/src/node/llm-provider.ts` | LLMProvider Router: Ollama + OpenAI + DeepSeek, fallback automático | 2026-07-18 | ✅ Implementado |
| 24 | `ideia-theia/src/node/output-validator.ts` | Output validation: secrets scan, dangerous patterns, extension validation | 2026-07-18 | ✅ Implementado |
| 25 | `packages/agent-runtime/src/step-executor.ts` | FileSystemStepExecutor: read/write/delete/run/search para agentes | 2026-07-18 | ✅ Implementado |
| 26 | `docs/governance/AUDITORIA-COMPLETA-IDEIA-2026-07-18.md` | Auditoria completa: ~150 itens em 4 categorias, correções aplicadas | 2026-07-18 | ✅ Corrigido |
| 27 | `packages/logger/` | Logger estruturado (@ai-devkit/logger) — substitui console.* em produção | 2026-07-18 | ✅ Implementado |
| 28 | `.github/workflows/ci.yml` | GitHub Actions CI: quality, security, build gates | 2026-07-18 | ✅ Implementado |
| 29 | `.github/dependabot.yml` | Dependabot config para dependências npm | 2026-07-18 | ✅ Implementado |
| 30 | `docs/governance/GAPS-PRODUCAO-IDE.md` (atualizado 70/70) | Todos os 70 gaps resolvidos — G5 LSP, G8 DAP, G25 npm provenance, G27 VS Code extension | 2026-07-18 | ✅ Completo |
| 31 | `packages/ideia-plugin/src/browser/lsp-client.ts` | LSP client: completions, hover, definition, references, signatureHelp, documentSymbol, codeAction, rename | 2026-07-18 | ✅ Implementado |
| 32 | `packages/ideia-plugin/src/browser/dap-client.ts` | DAP client: attach, breakpoints, step, stack, scopes, variables, evaluate | 2026-07-18 | ✅ Implementado |
| 33 | `packages/ideia-plugin/src/browser/DebugPanel.tsx` | Debug UI: controles, stack trace, variáveis, REPL | 2026-07-18 | ✅ Implementado |
| 34 | `packages/contracts/src/schemas.ts` | AdapterConfigSchema + AdapterInterface + validateAdapter Zod | 2026-07-18 | ✅ Implementado |
| 35 | `vscode-extension/` | 51 comandos (expandido de 36) — initProject, generateCode, runAudit, runVerify, checkDrift, showPolicy, etc. | 2026-07-18 | ✅ Expandido |
| 36 | `packages/reality-sync/` | Reality Sync Engine — watcher contínuo (chokidar) que mantém código, docs e manifests alinhados. CLI: `ai-devkit reality-sync start\|sync`. Pre-commit hook incluso. | 2026-07-18 | ✅ Implementado |
| 37 | `docs/ESTUDOS/ESTUDO-SELF-OPTIMIZATION-PANEL-AUTONOMOUS-EVOLUTION.md` | Estudo S23 — Self-Optimization Panel + Autonomous Evolution Engine. Painel de métricas, Technology Radar, Self-Chat, ciclos autônomos de melhoria. 14 tasks geradas. | 2026-07-18 | ✅ Publicado |
| 38 | `docs/ESTUDOS/ESTUDO-COMPLETO-TOPOLOGIA-INTEGRACAO-IDEIA.md` | Topologia completa de integração: 66 packages, 18 contratos C1-C18, 16 eventos, 130+ comandos CLI, 4 stacking profiles, 10 tecnologias prioritárias, 15 áreas de melhoria. | 2026-07-18 | ✅ Publicado |
| 39 | `docs/ESTUDOS/ESTUDO-CONTROLE-SEGURANCA-SINTONIA-IDEIA-IA.md` | Estudo S24 — Controle, Segurança e Sintonia IDEIA↔IA. Autonomy Control Tower, Safety Circuit Breaker, Bidirectional Help Protocol, Usability Profile Engine, Decision Continuity, E-Stop, Rollback. 10 tasks. | 2026-07-18 | ✅ Publicado |
| 40 | `docs/ESTUDOS/ESTUDO-AJUSTES-USUARIO-PERFIS-CONFIGURACAO.md` | Estudo S25 — Ajustes de Usuário, Perfis e Configuração. 5 perfis (Solo Dev, Tech Lead, Automator, Enterprise, Custom), árvore de configuração completa, dashboard web UI, CLI config, adaptação contínua, contexto, políticas de equipe. 10 tasks. | 2026-07-18 | ✅ Publicado |
| 41 | `docs/ESTUDOS/ESTUDO-MELHORIA-USABILIDADE-EXPERIENCIA-USUARIO.md` | Estudo UX — Melhoria de Usabilidade: análise de 27 componentes web UI, 5 canais, 27 problemas identificados, 15 melhorias prioritárias em 3 fases, sistema de notificações, ajuda contextual, shortcut discovery, estados vazios inteligentes | 2026-07-18 | ✅ Publicado |
| 42 | `docs/ESTUDOS/ESTUDO-INTENSIFICACAO-CONSOLIDADA-TODOS-ESTUDOS.md` | Intensificação consolidada: scores de intensidade para 43 estudos, gaps comuns (ADRs, tasks, timelines, testes), plano de ação em 3 fases, auto-intensificação | 2026-07-18 | ✅ Publicado |
| 43 | `docs/adr/ADR-011-self-optimization-panel.md` | ADR-011: Self-Optimization Panel & Autonomous Evolution | 2026-07-18 | ✅ Aprovado |
| 44 | `docs/adr/ADR-012-topologia-integracao.md` | ADR-012: Integration Topology & Contract Architecture | 2026-07-18 | ✅ Aprovado |
| 45 | `docs/adr/ADR-013-controle-sintonia.md` | ADR-013: Control, Safety & IDEIA↔IA Synergy | 2026-07-18 | ✅ Aprovado |
| 46 | `docs/adr/ADR-014-perfis-configuracao.md` | ADR-014: User Profiles & Configuration System | 2026-07-18 | ✅ Aprovado |
| 47 | `docs/adr/ADR-015-memoria-contexto.md` | ADR-015: Memory & Context Architecture | 2026-07-18 | ✅ Aprovado |
| 48 | `docs/adr/ADR-016-seguranca-camadas.md` | ADR-016: Security Layers Architecture | 2026-07-18 | ✅ Aprovado |
| 49 | `docs/governance/TESTES-DOS-ESTUDOS.md` | Definições de testes para 12 estudos score 3: unitários, integração, E2E, aceitação | 2026-07-18 | ✅ Publicado |
| 50 | `TASKS-ESTUDOS-INTENSIFICACAO.md` | Normalização de tasks: TASK-IDEIA-401 a 915 + INT-01 a 08 | 2026-07-18 | ✅ Publicado |
| 51 | `packages/reality-sync/src/initiative-engine.ts` | StudyScanner: scanStudies() — análise automática de profundidade dos estudos | 2026-07-18 | ✅ Implementado |
| 52 | `PLANO-IMPLEMENTACAO-CONSOLIDADO.md` | Plano consolidado com tasks TASK-IDEIA-513 a 604 para todos os 44 estudos, 15 fases, ~180 tasks, ~182 semanas de esforço | 2026-07-18 | ✅ Publicado |
| 53 | `CHANGELOG.md` | Histórico de versões semântico (Keep a Changelog) | 2026-07-18 | ✅ Publicado |
| 54 | `docs/governance/TERMS-OF-SERVICE.md` | Termos de Serviço para uso comercial | 2026-07-18 | ✅ Publicado |
| 55 | `docs/governance/PRIVACY-POLICY.md` | Política de Privacidade (telemetria opt-in, processamento local) | 2026-07-18 | ✅ Publicado |
| 56 | `docs/governance/GUIA-DE-INICIO-RAPIDO.md` | Guia rápido de 5 minutos em português | 2026-07-18 | ✅ Publicado |
| 57 | `docs/governance/GLOSSARIO-IDEIA.md` | Glossário com 40+ termos técnicos (A-X) | 2026-07-18 | ✅ Publicado |
| 58 | `CONTRIBUTING.md` | Guia de contribuição: setup, PRs, commits, testes | 2026-07-18 | ✅ Publicado |
| 59 | `.github/ISSUE_TEMPLATE/bug_report.md` | Template de report de bug | 2026-07-18 | ✅ Publicado |
| 60 | `.github/ISSUE_TEMPLATE/feature_request.md` | Template de solicitação de feature | 2026-07-18 | ✅ Publicado |
| 61 | `.github/ISSUE_TEMPLATE/config.yml` | Config dos templates de issue | 2026-07-18 | ✅ Publicado |
| 62 | `docs/governance/ARBOR-COMPLETA-WORKSPACE.md` | Árvore completa do workspace (15 diretórios) | 2026-07-20 | ✅ Publicado |
| 63 | `docs/governance/GUIA-DIRETORIOS-WORKSPACE.md` | Guia de propósito de cada diretório | 2026-07-20 | ✅ Publicado |
| 64 | `docs/governance/DIFERENCAS-DIRETORIOS-WORKSPACE.md` | Matriz de diferenças entre IDEIA e ai-devkit-v2 | 2026-07-20 | ✅ Publicado |
| 65 | `docs/ESTUDOS/ESTUDO-ANALISE-COMPARATIVA-DEVIN-FACTORY-AGENTES.md` | Estudo comparativo Devin vs IDEIA (12 plataformas) | 2026-07-20 | ✅ Publicado |
| 66 | `docs/governance/RELATORIO-ESTADO-ESTEIRA-2026-07-20.md` | Relatório de estado da esteira tecnológica | 2026-07-20 | ✅ Publicado |
| 67 | `docs/governance/ORGANIZACAO-TAREFAS-SESSAO-2026-07-20.md` | Organização mestra de tarefas da sessão | 2026-07-20 | ✅ Publicado |
| 68 | `docs/governance/AUDITORIA-FUNCIONAL-COMPLETA-2026-07-20.md` | Auditoria funcional com 20 problemas catalogados | 2026-07-20 | ✅ Publicado |

### Sessão 2026-07-21 — Implementações

| # | Documento/Arquivo | Descrição | Data | Status |
|---|-----------|-----------|------|--------|
| 69 | `packages/agent-runtime/src/subgraphs.ts` | 5 subgraphs LangGraph: analyze, plan, execute, review, deploy + pipeline | 2026-07-21 | ✅ Implementado |
| 70 | `packages/agent-runtime/src/yaml-agents.ts` | Loader YAML para agentes customizados | 2026-07-21 | ✅ Implementado |
| 71 | `packages/contracts/src/command-runner.ts` | Utilitário compartilhado: runCommand, runStep, runWithRetry, DEFAULT_QUALITY_GATES | 2026-07-21 | ✅ Implementado |
| 72 | `packages/cli/src/ide/security-middleware.ts` | Rate limiting (token bucket), API key auth, security headers | 2026-07-21 | ✅ Implementado |
| 73 | `packages/cli/src/context-engine/agent-pipeline-bridge.ts` | Bridge PromptPipeline → LangGraph: classifica intenção e roteia para subgraph | 2026-07-21 | ✅ Implementado |
| 74 | `packages/cli/src/ide/api-router.ts` (atualizado) | +4 endpoints (control, self, quality) + /api/routes + health check real | 2026-07-21 | ✅ Atualizado |
| 75 | `vscode-extension/` | VS Code Extension migrada do ai-devkit-v2 (51 comandos, 6 views) | 2026-07-21 | ✅ Migrado |
| 76 | ~~`packages/web-ui/`~~ | ~~Web UI migrada do ai-devkit-v2~~ | 2026-07-20 | ❌ Removido — Theia substitui |
| 77 | `.github/workflows/` (IDEIA/) | 17 workflows GitHub Actions migrados do ai-devkit-v2 | 2026-07-20 | ✅ Migrado |
| 78 | `scripts/reality-check.ps1` (atualizado) | Corrigido para buscar endpoints em cli/src/ide/ e plugin | 2026-07-21 | ✅ Corrigido |
| 79 | `packages/workflow-engine/src/workflow-engine.ts` (atualizado) | Quality gates integrados com gates obrigatórios e status blocked | 2026-07-21 | ✅ Atualizado |
| 80 | `packages/delivery-orchestrator/src/gitops-generator.ts` | Gerador de workflow GitHub Actions + GitOps status | 2026-07-21 | ✅ Implementado |
| 81 | `packages/event-bus/src/` (atualizado) | Todos initialize() offline-resilientes, nats-event-bus com JetStream real | 2026-07-21 | ✅ Atualizado |
| 82 | `packages/cli/src/ecosystem/service-catalog.ts` | Service Catalog com 77 serviços mapeados (GAP Self-Awareness #1) | 2026-07-21 | ✅ Implementado |
| 83 | `packages/cli/templates/.ai/prompts/99-system-self-description.md` | Documento de auto-descrição do ecossistema para LLMs (GAP #2) | 2026-07-21 | ✅ Implementado |
| 84 | `packages/cli/src/ecosystem/self-awareness.ts` | Self-Awareness Module: describeSystem, getCapabilities, etc. (GAP #3) | 2026-07-21 | ✅ Implementado |
| 85 | `packages/cli/src/lifecycle/project-lifecycle-orchestrator.ts` | Lifecycle Orchestrator: 7 fases idea→monitoring (GAP #4) | 2026-07-21 | ✅ Implementado |
| 86 | `packages/cli/src/tutorials/tutorial-system.ts` | Tutorial System: 3 tutoriais + badges + progress (GAP #5) | 2026-07-21 | ✅ Implementado |
| 87 | `packages/cli/src/context-engine/llm-context-builder.ts` | LLM Context Builder: contexto inteligente para LLMs (GAP #6) | 2026-07-21 | ✅ Implementado |
| 88 | `packages/cli/src/ecosystem/capability-discovery.ts` | Dynamic Capability Discovery: auto-descoberta (GAP #7) | 2026-07-21 | ✅ Implementado |
| 89 | `packages/cli/src/ecosystem/__tests__/service-catalog.test.ts` | Testes unitários: Service Catalog (11 testes) | 2026-07-21 | ✅ Implementado |
| 90 | `packages/cli/src/ecosystem/__tests__/self-awareness.test.ts` | Testes unitários: Self-Awareness (12 testes) | 2026-07-21 | ✅ Implementado |
| 91 | `packages/cli/src/ecosystem/__tests__/capability-discovery.test.ts` | Testes unitários: Capability Discovery (7 testes) | 2026-07-21 | ✅ Implementado |
| 92 | `packages/cli/src/lifecycle/__tests__/project-lifecycle-orchestrator.test.ts` | Testes unitários: Lifecycle Orchestrator (13 testes) | 2026-07-21 | ✅ Implementado |
| 93 | `packages/cli/src/tutorials/__tests__/tutorial-system.test.ts` | Testes unitários: Tutorial System (12 testes) | 2026-07-21 | ✅ Implementado |
| 94 | `packages/cli/src/context-engine/__tests__/llm-context-builder.test.ts` | Testes unitários: LLM Context Builder (8 testes) | 2026-07-21 | ✅ Implementado |

### Sessão 2026-07-22 — Funcionalidades Implementadas (Gaps G1-G11 resolvidos)

| # | Documento/Arquivo | Descrição | Data | Status |
|---|-----------|-----------|------|--------|
| 95 | `.ai/context-packs/bugfix@1.0.0.yaml` | Context Pack para correção de bugs (G3/G11) | 2026-07-22 | ✅ Implementado |
| 96 | `.ai/context-packs/refactor@1.0.0.yaml` | Context Pack para refatoração de código (G11) | 2026-07-22 | ✅ Implementado |
| 97 | `.ai/context-packs/documentation@1.0.0.yaml` | Context Pack para geração de documentação (G11) | 2026-07-22 | ✅ Implementado |
| 98 | `.ai/context-packs/performance@1.0.0.yaml` | Context Pack para otimização de performance (G11) | 2026-07-22 | ✅ Implementado |
| 99 | `.ai/context-packs/security-review@1.0.0.yaml` | Context Pack para revisão de segurança (G11) | 2026-07-22 | ✅ Implementado |
| 100 | `.ai/context-packs/migration@1.0.0.yaml` | Context Pack para migração de código/frameworks (G11) | 2026-07-22 | ✅ Implementado |
| 101 | `.ai/context-packs/testing@1.0.0.yaml` | Context Pack para criação/execução de testes (G11) | 2026-07-22 | ✅ Implementado |
| 102 | `.ai/context-packs/deployment@1.0.0.yaml` | Context Pack para deploy de aplicações (G11) | 2026-07-22 | ✅ Implementado |
| 103 | `.ai/context-packs/onboarding@1.0.0.yaml` | Context Pack para onboarding de novos usuários (G11) | 2026-07-22 | ✅ Implementado |
| 104 | `.ai/context-packs/registry.yaml` | Registry centralizado de todos os 11 context packs | 2026-07-22 | ✅ Implementado |
| 105 | `.ai/ideia-manifest.md` | Self-Description Manifest: documento central de apresentação da IDEIA para LLMs externos (G1) | 2026-07-22 | ✅ Implementado |
| 106 | `packages/capability-registry/` | Capability Registry: catálogo programático de capacidades com registry, matcher, resolver e scanner (G2) | 2026-07-22 | ✅ Implementado |
| 107 | `.ai/workflows/zero-to-deploy.md` | Zero-to-Deploy Playbook: fluxo completo em 6 fases da ideia ao deploy local (G4) | 2026-07-22 | ✅ Implementado |
| 108 | `.ai/guides/desktop-deployment.md` | Desktop Deployment Guide: guia prático para deploy local de aplicações (G5) | 2026-07-22 | ✅ Implementado |
| 109 | `packages/cli/src/blueprint-generator/` | Project Blueprint Generator: scaffold completo com estrutura, templates, contratos, ADRs e dependências (G6) | 2026-07-22 | ✅ Implementado |
| 110 | `packages/tutorial-system/` | Interactive Tutorial System: 6 tutoriais guiados com engine, registry, progress tracker e badges (G7) | 2026-07-22 | ✅ Implementado |
| 111 | `.ai/tutorials/tutorial-registry.yaml` | Registry dos 6 tutoriais interativos | 2026-07-22 | ✅ Implementado |
| 112 | `packages/progressive-disclosure/` | Progressive Disclosure System: 4 níveis de usuário, feature flags, level manager, badges e sugestões (G8) | 2026-07-22 | ✅ Implementado |
| 113 | `packages/capability-matcher/` | Capability Matching Engine (implementado como capability-matcher): análise de necessidades, matching semântico, roteamento de agentes/contextos/workflows, 64+ testes (G10) | 2026-07-22 | ✅ Implementado |

## Índice de Estudos

### Estratégicos
| # | Documento | Data |
|---|-----------|------|
| E1 | `docs/ESTUDOS/VISAO-PRODUTO-IDEIA.md` | 2026-07-17 |
| E2 | `docs/ESTUDOS/PLANO-IMPLEMENTACAO-IDEIA-DETALHADO.md` | 2026-07-17 |
| E2v2 | `docs/ESTUDOS/PLANO-IMPLEMENTACAO-IDEIA-DETALHADO-V2.md` | 2026-07-18 |
| E3 | `docs/ESTUDOS/ESTUDO-QUALIDADE-TOTAL-IDEIA.md` | 2026-07-17 |
| E4 | `docs/ESTUDOS/ESTUDO-UX-EXPERIENCIA-USUARIO.md` | 2026-07-18 |
| E5 | `docs/ESTUDOS/ESTUDO-DESKTOP-NATIVE.md` | 2026-07-18 |

### Modulares
| # | Documento | Data |
|---|-----------|------|
| S1 | `docs/ESTUDOS/BARRAMENTO-EVENTOS-MENSAGERIA-DISTRIBUIDA.md` | 2026-07-17 |
| S2 | `docs/ESTUDOS/MEMORIA-E-CONTEXTO-PESQUISA.md` | 2026-07-17 |
| S3 | `docs/ESTUDOS/INTENT-TO-PLAN-RESEARCH.md` | 2026-07-17 |
| S4 | `docs/ESTUDOS/SEGURANCA-PROMPT-GOVERNADOR-AI.md` | 2026-07-17 |
| S5 | `docs/ESTUDOS/ORQUESTRACAO-MULTIAGENTE-DISTRIBUIDA.md` | 2026-07-17 |
| S6 | `docs/ESTUDOS/PIPELINE-VERIFICACAO-QUALIDADE-ENTREGA.md` | 2026-07-17 |
| S7 | `docs/ESTUDOS/ESTUDO-APRENDIZADO-ADAPTATIVO-FEEDBACK-LOOP-EVOLUCAO-CROSS-PROJETO.md` | 2026-07-17 |
| S8 | `docs/ESTUDOS/TECNOLOGIAS-EMERGENTES.md` | 2026-07-17 |
| S9 | `docs/ESTUDOS/MATRIZ-TECNOLOGICA-COMPLETA.md` | 2026-07-17 |
| S9v2 | `docs/ESTUDOS/MATRIZ-TECNOLOGICA-COMPLETA-V2-SUPLEMENTO.md` | 2026-07-18 |
| S10 | `docs/ESTUDOS/ESTUDO-EMPILHAMENTO-CONTRATOS-INTEGRACOES.md` | 2026-07-17 |
| S10v2 | `docs/ESTUDOS/ESTUDO-EMPILHAMENTO-CONTRATOS-INTEGRACOES-V2-SUPLEMENTO.md` | 2026-07-18 |
| S11 | `docs/ESTUDOS/THEIA-IDEIA-RESEARCH.md` | 2026-07-17 |
| S12 | `docs/ESTUDOS/ESTUDO-TESTES-QUALIDADE-AUTOMATIZADA.md` | 2026-07-18 |
| S13 | `docs/ESTUDOS/ESTUDO-PERFORMANCE-ESCALABILIDADE.md` | 2026-07-18 |
| S14 | `docs/ESTUDOS/ESTUDO-AUTENTICACAO-AUTORIZACAO.md` | 2026-07-18 |
| S15 | `docs/ESTUDOS/ESTUDO-CLOUD-INFRAESTRUTURA.md` | 2026-07-18 |
| S16 | `docs/ESTUDOS/ESTUDO-DEPLOY-ENTREGA-CONTINUA.md` | 2026-07-18 |
| S17 | `docs/ESTUDOS/ESTUDO-OBSERVABILIDADE-FULLSTACK.md` | 2026-07-18 |
| S18 | `docs/ESTUDOS/ESTUDO-AI-SAFETY-ALIGNMENT.md` | 2026-07-18 |
| S19 | `docs/ESTUDOS/ESTUDO-ENGENHARIA-PROMPTS-AGENTES.md` | 2026-07-18 |
| S20 | `docs/ESTUDOS/ESTUDO-PLUGINS-ECOSSISTEMA.md` | 2026-07-18 |
| S21 | `docs/ESTUDOS/ESTUDO-TERMINAL-DEBUG.md` | 2026-07-18 |
| S22 | `docs/ESTUDOS/ESTUDO-COLABORACAO-TEMPO-REAL.md` | 2026-07-18 |
| S23 | `docs/ESTUDOS/ESTUDO-SELF-OPTIMIZATION-PANEL-AUTONOMOUS-EVOLUTION.md` | 2026-07-18 |
| T1 | `docs/ESTUDOS/ESTUDO-COMPLETO-TOPOLOGIA-INTEGRACAO-IDEIA.md` | 2026-07-18 |
| S24 | `docs/ESTUDOS/ESTUDO-CONTROLE-SEGURANCA-SINTONIA-IDEIA-IA.md` | 2026-07-18 |
| S25 | `docs/ESTUDOS/ESTUDO-AJUSTES-USUARIO-PERFIS-CONFIGURACAO.md` | 2026-07-18 |
| S26 | `docs/ESTUDOS/ESTUDO-MANIFEST-SELF-DESCRIPTION.md` | 2026-07-18 |
| S27 | `docs/ESTUDOS/ESTUDO-CAPABILITY-REGISTRY.md` | 2026-07-18 |
| S28 | `docs/ESTUDOS/ESTUDO-ZERO-TO-DEPLOY.md` | 2026-07-18 |
| S29 | `docs/ESTUDOS/ESTUDO-BLUEPRINT-SCAFFOLD.md` | 2026-07-18 |
| S30 | `docs/ESTUDOS/ESTUDO-ONBOARDING-TUTORIALS.md` | 2026-07-18 |
| S31 | `docs/ESTUDOS/ESTUDO-EXTERNAL-LLM-INTEGRATION.md` | 2026-07-18 |
| S32 | `docs/ESTUDOS/ESTUDO-API-SDK-ARCHITECTURE.md` | 2026-07-18 |
| S33 | `docs/ESTUDOS/ESTUDO-CONTEXT-PACK-SYSTEM.md` | 2026-07-18 |
| UX | `docs/ESTUDOS/ESTUDO-MELHORIA-USABILIDADE-EXPERIENCIA-USUARIO.md` | 2026-07-18 |
| TPL | `docs/ESTUDOS/TEMPLATE-ANALISE-PERMANENTE.md` | 2026-07-18 |

### Intensificações
| # | Documento | Data |
|---|-----------|------|
| I1 | `docs/ESTUDOS/ESTUDO-INTENSIFICACAO-BLUEPRINTS-IMPLEMENTACAO.md` | 2026-07-18 |
| I2 | `docs/ESTUDOS/ESTUDO-INTENSIFICACAO-BENCHMARKS-DADOS.md` | 2026-07-18 |
| I3 | `docs/ESTUDOS/ESTUDO-INTENSIFICACAO-DEEP-DIVES-TECNICOS.md` | 2026-07-18 |
| I4 | `docs/ESTUDOS/ESTUDO-INTENSIFICACAO-MATRIZ-CROSS-STUDIES.md` | 2026-07-18 |
| I5 | `docs/ESTUDOS/ESTUDO-INTENSIFICACAO-IMPLEMENTACAO-REAL.md` | 2026-07-18 |

### Intensificação Consolidada
| # | Documento | Data |
|---|-----------|------|
| IC | `docs/ESTUDOS/ESTUDO-INTENSIFICACAO-CONSOLIDADA-TODOS-ESTUDOS.md` | 2026-07-18 |

### Estudo de Integração
| # | Documento | Data |
|---|-----------|------|
| INT | `docs/ESTUDOS/ESTUDO-INTEGRACAO-UNIFICADA-IDEIA.md` (v2) | 2026-07-18 |

### Consolidados
| # | Documento | Data |
|---|-----------|------|
| M1 | `docs/ESTUDOS/ESTUDO-COMPLETO-FLUXO-IDEIA-ENTREGA.md` | 2026-07-17 |
| X | `docs/ESTUDOS/IDEIA-MASTER.md` (v2.0) | 2026-07-18 |

### Estudos Complementares
| # | Documento | Descrição | Data |
|---|-----------|-----------|------|
| C1 | `docs/ESTUDOS/RELATORIO-STATUS-IMPLEMENTACAO-2026-07-21.md` | Relatório de status da implementação | 2026-07-21 |
| C2 | `docs/ESTUDOS/RELATORIO-SELF-AWARENESS-GAPS-IDEIA.md` | Relatório de gaps de self-awareness | 2026-07-20 |
| C3 | `docs/ESTUDOS/RELATORIO-GAPS-NAO-COBERTOS-2026-07-21.md` | Gaps não cobertos identificados | 2026-07-21 |
| C4 | `docs/ESTUDOS/ESTUDO-VISAO-COMPLETA-IDEIA-INDUSTRIAL.md` | Visão completa industrial da IDEIA | 2026-07-18 |
| C5 | `docs/ESTUDOS/ESTUDO-VIABILIDADE-MOCKUP-IDENTICO.md` | Viabilidade de mockup idêntico | 2026-07-18 |
| C6 | `docs/ESTUDOS/ESTUDO-TITLEBAR-CUSTOMIZACAO-TOTAL.md` | Customização total da titlebar | 2026-07-18 |
| C7 | `docs/ESTUDOS/ESTUDO-MOCKUP-FRONTEND-IDEIA.md` | Mockup de frontend IDEIA v1 | 2026-07-18 |
| C8 | `docs/ESTUDOS/ESTUDO-MOCKUP-FRONTEND-IDEIA-V2.md` | Mockup de frontend IDEIA v2 | 2026-07-18 |
| C9 | `docs/ESTUDOS/ESTUDO-IMPLEMENTACAO-TECNICA-MOCKUP.md` | Implementação técnica do mockup | 2026-07-18 |
| C10 | `docs/ESTUDOS/ESTUDO-INTEGRACAO-TRIPLA-THEIA-IDEIA-IA.md` | Integração tripla Theia + IDEIA + IA | 2026-07-18 |
| C11 | `docs/ESTUDOS/ESTUDO-INTEGRACAO-THEIA-MOCKUP-FINAL.md` | Integração Theia-Mockup final | 2026-07-18 |
| C12 | `docs/ESTUDOS/ESTUDO-DESCOBERTAS-THEIA-AI-COMPLETO.md` | Descobertas completas do Theia AI | 2026-07-18 |
| C13 | `docs/ESTUDOS/ESTUDO-ANALISE-PROFUNDA-SISTEMA.md` | Análise profunda do sistema | 2026-07-18 |
| C14 | `docs/ESTUDOS/ESTUDO-ANALISE-COMPLETA-CONCORRENCIA-PLANO-COMERCIAL.md` | Análise completa de concorrência e plano comercial | 2026-07-18 |
| C15 | `docs/ESTUDOS/ESTUDO-ALEM-DA-FRONTEIRA-CAPACIDADES-ENTERPRISE.md` | Capacidades enterprise além da fronteira | 2026-07-18 |
| C16 | `docs/ESTUDOS/ESTUDO-ANALISE-COMPARATIVA-DEVIN-FACTORY-AGENTES.md` | Estudo comparativo Devin vs IDEIA (12 plataformas) | 2026-07-18 |
| C17 | `docs/ESTUDOS/ESTUDO-MASTER-CONSOLIDADO-EXECUCAO.md` | Consolidado mestre de execução | 2026-07-18 |
| C18 | `docs/ESTUDOS/ESTUDO-INOVACAO-ROTEIRO-FINAL.md` | Roteiro final de inovação | 2026-07-18 |

## Regras

- Todo novo documento de governança DEVE ser registrado aqui
- Documentos órfãos (não registrados) serão considerados não oficiais
- Atualizações devem incrementar a data e registrar o que mudou
- Todo novo estudo em `docs/ESTUDOS/` deve ser registrado no IDEIA-MASTER.md e neste registry
