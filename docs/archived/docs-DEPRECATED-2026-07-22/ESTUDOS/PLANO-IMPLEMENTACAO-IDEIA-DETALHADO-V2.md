# Plano de Implementação Detalhado V2 — IDEIA

> **Suplemento de Expansão — Novas Fases 6-9, Expansões Fases 0-5, +103 Tarefas Adicionais**
>
> **Data:** 2026-07-18
> **Versão:** 2.0
> **Baseado em:** V1 (110 tarefas) + 8 novos estudos (UX, Colaboração, Desktop, Plugins, Testes, Infra, Observabilidade, Engenharia de Prompts)
> **Total V1:** 110 tarefas | **Total V2:** +103 tarefas | **Total Geral:** ~213 tarefas
> **Timeline:** 52+ semanas (12 meses)

---

## Sumário

1. [Macro Roadmap V2 (10 Fases)](#1-macro-roadmap-v2-10-fases)
2. [EXPANSÕES FASE 0-5](#2-expansoes-fase-0-5)
   - 2.1 [Expansão Fase 0: Fundação (+8)](#21-expansao-fase-0-fundacao-8)
   - 2.2 [Expansão Fase 1: Infraestrutura (+6)](#22-expansao-fase-1-infraestrutura-6)
   - 2.3 [Expansão Fase 2: Segurança (+5)](#23-expansao-fase-2-seguranca-5)
   - 2.4 [Expansão Fase 3: Multiagente (+5)](#24-expansao-fase-3-multiagente-5)
   - 2.5 [Expansão Fase 4: Pipeline (+5)](#25-expansao-fase-4-pipeline-5)
   - 2.6 [Expansão Fase 5: Aprendizado (+5)](#26-expansao-fase-5-aprendizado-5)
3. [NOVAS FASES 6-9](#3-novas-fases-6-9)
   - 3.1 [Fase 6: UX e Experiência (Semanas 33-40, +15)](#31-fase-6-ux-e-experiencia-semanas-33-40-15)
   - 3.2 [Fase 7: Colaboração em Tempo Real (Semanas 37-44, +12)](#32-fase-7-colaboracao-em-tempo-real-semanas-37-44-12)
   - 3.3 [Fase 8: Desktop Nativo e Distribuição (Semanas 41-48, +10)](#33-fase-8-desktop-nativo-e-distribuicao-semanas-41-48-10)
   - 3.4 [Fase 9: Ecossistema de Plugins (Semanas 45-52, +12)](#34-fase-9-ecossistema-de-plugins-semanas-45-52-12)
4. [NOVAS TAREFAS DE QUALIDADE (+20)](#4-novas-tarefas-de-qualidade-20)
5. [Roadmap Consolidado com Gantt](#5-roadmap-consolidado-com-gantt)
6. [Marcos (Milestones) V2](#6-marcos-milestones-v2)
7. [KPIs Chave](#7-kpis-chave)
8. [Matriz de Riscos V2](#8-matriz-de-riscos-v2)
9. [Dependências entre Fases](#9-dependencias-entre-fases)
10. [Carga por Fase Consolidada](#10-carga-por-fase-consolidada)

---

## 1. Macro Roadmap V2 (10 Fases)

```
FASE 0 ────────────────────────────────────────────────── Semanas 1-4 (15+8 tarefas)
│  FUNDAÇÃO (V1 + Expansão)                               │
│  V1: Chat SSE, File CRUD, Memory, Dashboard,            │
│      Quick Open, Status Bar, Approval, Autonomy         │
│  +V2: Contract Testing, OpenTelemetry, Circuit Breaker, │
│       SLO Dashboards, Schema Registry, Resilience, DR   │
├─────────────────────────────────────────────────────────┤
FASE 1 ────────────────────────────────────────────────── Semanas 5-8 (12+6 tarefas)
│  INFRAESTRUTURA (V1 + Expansão)                         │
│  V1: NATS JetStream, 6 módulos, DLQ, Audit Chain        │
│  +V2: Terraform/OpenTofu IaC, Docker Compose, K3s,      │
│       MinIO, PostgreSQL, Redis                          │
├─────────────────────────────────────────────────────────┤
FASE 2 ───────────────────────────────────────────────── Semanas 9-12 (10+5 tarefas)
│  SEGURANÇA (V1 + Expansão)                              │
│  V1: LLM Guard, Intent Classifier, ADAPT, Output Valid  │
│  +V2: Red Teaming, NeMo Guardrails, Autonomy Policy,    │
│       Audit Chain Produção, CI Security Scanning        │
├─────────────────────────────────────────────────────────┤
FASE 3 ─────────────────────────────────────────────── Semanas 13-20 (10+5 tarefas)
│  MULTIAGENTE (V1 + Expansão)                            │
│  V1: Message Pool, Supervisor/DAG, Pipeline 6, Debate   │
│  +V2: MCP Protocol, A2A Communication, DSPy Pipeline,   │
│       Prompt Templates, Agent Observability             │
├─────────────────────────────────────────────────────────┤
FASE 4 ─────────────────────────────────────────────── Semanas 21-28 (9+5 tarefas)
│  PIPELINE (V1 + Expansão)                               │
│  V1: GitOps, IaC, Feature Flags, Progressive, Terminal  │
│  +V2: Feature Flags LaunchDarkly, Progressive Delivery, │
│       SBOM CI, Contract Verification, Smoke Tests       │
├─────────────────────────────────────────────────────────┤
FASE 5 ─────────────────────────────────────────────── Semanas 29-32 (11+5 tarefas)
│  APRENDIZADO (V1 + Expansão)                            │
│  V1: Reflection, Cross-Project, KG, GraphRAG, Fine-Tune │
│  +V2: Cross-Project Pipeline, RLHF/DPO, Model FT,       │
│       Knowledge Graph Curation, Perf Benchmarking       │
├─────────────────────────────────────────────────────────┤
FASE 6 ─────────────────────────────────────────────── Semanas 33-40 (+15 tarefas)
│  UX E EXPERIÊNCIA         NOVA                          │
│  Design System, WCAG AA, Keyboard Nav, Screen Reader,   │
│  Micro-interactions, Skeleton/Loading/Error, NPS/SUS,   │
│  Time-to-Task Optimization                              │
├─────────────────────────────────────────────────────────┤
FASE 7 ─────────────────────────────────────────────── Semanas 37-44 (+12 tarefas)
│  COLABORAÇÃO EM TEMPO REAL  NOVA                        │
│  Yjs + Monaco, Awareness Protocol, NATS Collaboration,  │
│  Shared Blackboard, Debate Engine, Session Replay,      │
│  Theia Cloud Multi-Instance, Pair Programming AI        │
├─────────────────────────────────────────────────────────┤
FASE 8 ─────────────────────────────────────────────── Semanas 41-48 (+10 tarefas)
│  DESKTOP NATIVO E DISTRIBUIÇÃO  NOVA                    │
│  Tauri v2 Migration, Rust Sidecar, Auto-Update,         │
│  Code Signing, Installers (MSI/DMG/AppImage),           │
│  Package Managers, Platform Optimizations               │
├─────────────────────────────────────────────────────────┤
FASE 9 ─────────────────────────────────────────────── Semanas 45-52 (+12 tarefas)
│  ECOSSISTEMA DE PLUGINS   NOVA                           │
│  Plugin API Design, Plugin Registry, Plugin Lifecycle,  │
│  Sandbox Isolation, OpenVSX Compat, MCP Protocol,       │
│  A2A Protocol, Plugin SDK                               │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Expansões Fase 0-5

### 2.1 Expansão Fase 0: Fundação (+8)

**Foco:** Adicionar camadas de resiliência, observabilidade e contratos à fundação da IDEIA.

---

#### TASK-IDEIA-101: Contract Testing Pipeline (Pact)
- **Fase:** 0-E | **Dependências:** Nenhuma | **Esforço:** 4d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Implementar Pact para contract testing entre módulos. Provider verifica pactos publicados; consumer gera pactos. CI executa `pact test` e publica no Pact Broker.
- **Arquivos:** packages/contract-testing/src/pact-broker.ts, provider-verifier.ts, consumer-generator.ts, .github/workflows/pact.yml
- **Componentes:** contratos entre todos os módulos
- **Critérios:** Pactos gerados automaticamente; verificação em CI; breaking changes detectados e bloqueados

#### TASK-IDEIA-102: OpenTelemetry Auto-Instrumentation
- **Fase:** 0-E | **Dependências:** Nenhuma | **Esforço:** 4d | **Complexidade:** Média | **Risco:** Baixo
- **Descrição:** Adicionar OpenTelemetry SDK com auto-instrumentação para HTTP, gRPC, NATS. Exporters Console, OTLP, Langfuse. Spans com contexto distribuído via W3C TraceContext.
- **Arquivos:** packages/observability/src/opentelemetry/setup.ts, tracing.ts, meter.ts, packages/cli/src/bootstrap/telemetry.ts
- **Componentes:** observability, cli
- **Critérios:** Traces HTTP e NATS; contexto distribuído; export OTLP funcional; overhead < 2%

#### TASK-IDEIA-103: Circuit Breaker Implementation
- **Fase:** 0-E | **Dependências:** Nenhuma | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Implementar circuit breaker (closed/open/half-open) para chamadas LLM, NATS, APIs externas. Threshold 5 falhas consecutivas, half-open timeout 30s.
- **Arquivos:** packages/resilience/src/circuit-breaker.ts, state-machine.ts, packages/cli/src/services/resilience-manager.ts
- **Componentes:** resilience, cli
- **Critérios:** Circuit abre após N falhas; half-open testa recuperação; fallback aciona; métricas expostas

#### TASK-IDEIA-104: SLO Monitoring Dashboards
- **Fase:** 0-E | **Dependências:** 102 | **Esforço:** 3d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Dashboards Grafana para SLOs: latência LLM (< 500ms), uptime (> 99.9%), throughput (> 100 req/s). Alertas por burn rate.
- **Arquivos:** packages/observability/src/dashboards/slo-dashboard.json, slo-alerts.yml, burn-rate.ts
- **Componentes:** observability
- **Critérios:** Dashboards 3 SLOs; alertas configurados; burn rate detection; dados históricos 30d

#### TASK-IDEIA-105: Cross-Data Matrix Implementation
- **Fase:** 0-E | **Dependências:** Nenhuma | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Implementar 18 pares de compatibilidade entre módulos (contratos x dados x eventos). Testes automatizados validam cada par. Matriz publicada como relatório.
- **Arquivos:** packages/contracts/src/matrix/matrix-checker.ts, 18-pairs.ts, matrix-report.ts, packages/cli/src/commands/verify-matrix.ts
- **Componentes:** contracts, cli
- **Critérios:** 18 pares testados; matriz gerada; breaking changes identificados por par

#### TASK-IDEIA-106: Schema Registry — Finalização e Validação Automática
- **Fase:** 0-E | **Dependências:** V1 Task 027 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Baixo
- **Descrição:** Finalizar schema-registry: versão semântica, detecção de breaking changes, validação automática no event bus. Schemas registrados via CLI.
- **Arquivos:** packages/schema-registry/src/schema-evolution.ts, schema-validator.ts, packages/cli/src/commands/schema.ts
- **Componentes:** schema-registry, cli
- **Critérios:** Schemas versionados; breaking changes detectados e bloqueados; validação automática em cada evento

#### TASK-IDEIA-107: Resilience Patterns (Bulkhead, Timeout, Retry)
- **Fase:** 0-E | **Dependências:** 103 | **Esforço:** 4d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Implementar bulkhead (pool separado por módulo/agente), timeout (configurável por operação), retry com jitter. Polly-style policies encadeáveis.
- **Arquivos:** packages/resilience/src/bulkhead.ts, timeout-policy.ts, retry-policy.ts, policy-chain.ts
- **Componentes:** resilience
- **Critérios:** Bulkhead isola falhas entre módulos; timeout interrompe em N ms; retry com jitter exponencial; policies encadeáveis

#### TASK-IDEIA-108: Backup/DR Procedures
- **Fase:** 0-E | **Dependências:** Nenhuma | **Esforço:** 2d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Scripts de backup automático (memory-store, audit-chain, configs). DR: restore point recovery, rollback de schema, replicação cross-region.
- **Arquivos:** packages/cli/src/commands/backup.ts, backup-scheduler.ts, scripts/backup.sh, docs/governance/DR-PROCEDURES.md
- **Componentes:** cli, todos os módulos
- **Critérios:** Backup automático diário; restore funcional; DR documentado e testado trimestralmente

---

### 2.2 Expansão Fase 1: Infraestrutura (+6)

**Foco:** Provisionamento real de infraestrutura como código para ambientes de desenvolvimento, staging e produção.

---

#### TASK-IDEIA-109: Terraform/OpenTofu IaC para Deployments de Referência
- **Fase:** 1-E | **Dependências:** Nenhuma | **Esforço:** 5d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Módulos Terraform/OpenTofu para deploy de referência: VPC, ECS Fargate/EKS, RDS PostgreSQL, ElastiCache Redis, NATS cluster. Outputs para CI/CD.
- **Arquivos:** infrastructure/terraform/modules/vpc/, /ecs/, /rds/, /redis/, /nats/, infrastructure/tofu/stacks/dev/, /staging/, /prod/
- **Componentes:** infraestrutura
- **Critérios:** `tofu init && tofu apply` funcional; 3 ambientes; outputs consumíveis por CI; validação com `tofu validate`

#### TASK-IDEIA-110: Docker Compose para MVP
- **Fase:** 1-E | **Dependências:** Nenhuma | **Esforço:** 2d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Docker Compose com todos os serviços: nats, postgres, redis, minio, ideia-server. Health checks, volumes, networks. Script `docker compose up -d` único.
- **Arquivos:** docker-compose.yml, docker-compose.override.yml, .env.example, docker/ideia-server/Dockerfile
- **Componentes:** infraestrutura
- **Critérios:** `docker compose up -d` sobe tudo; health checks passam; volumes persistentes; override para dev

#### TASK-IDEIA-111: K3s Setup para Startup Profile
- **Fase:** 1-E | **Dependências:** 109 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Single-node K3s cluster para startup profile. Script de bootstrap, Helm charts, ingress Traefik, cert-manager, longhorn storage.
- **Arquivos:** infrastructure/k3s/bootstrap.sh, helm-charts/ideia/, values-dev.yaml, values-prod.yaml
- **Componentes:** infraestrutura
- **Critérios:** K3s bootstraps em < 10 min; Helm deploy funcional; ingress com HTTPS; backup automático

#### TASK-IDEIA-112: MinIO S3-Compatible Storage
- **Fase:** 1-E | **Dependências:** Nenhuma | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Configurar MinIO para artefatos (builds, backups, modelos fine-tuned, audit trail exports). Buckets com policy de acesso. SDK integrado.
- **Arquivos:** packages/storage/src/minio-adapter.ts, bucket-policies.ts, lifecycle-rules.ts, packages/cli/src/commands/storage.ts
- **Componentes:** storage, cli
- **Critérios:** Upload/download funcional; buckets criados automaticamente; lifecycle configurado; policies restritas

#### TASK-IDEIA-113: PostgreSQL Gerenciado (Supabase/Turso)
- **Fase:** 1-E | **Dependências:** Nenhuma | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Adapter para PostgreSQL gerenciado: Supabase (serverless) e Turso (edge). Migrations com drizzle/prisma. Pool de conexões, prepared statements.
- **Arquivos:** packages/database/src/adapters/supabase-adapter.ts, turso-adapter.ts, migrations/, schema.ts, repository-base.ts
- **Componentes:** database, contracts
- **Critérios:** Conexão funcional; migrations automáticas; pool de conexões; fallback para SQLite local

#### TASK-IDEIA-114: Redis para Cache e Pub/Sub
- **Fase:** 1-E | **Dependências:** Nenhuma | **Esforço:** 2d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Configurar Redis para cache de LLM responses, session store, rate limiting, pub/sub complementar. Adapter ioredis.
- **Arquivos:** packages/cli/src/services/redis-manager.ts, cache/redis-cache.ts, session/redis-session.ts, rate-limiter.ts
- **Componentes:** cli, todos os módulos
- **Critérios:** Cache funcional; TTL por tipo; pub/sub operacional; rate limiting; fallback in-memory

---

### 2.3 Expansão Fase 2: Segurança (+5)

**Foco:** Red teaming automatizado, guardrails avançados, política de autonomia implementada, auditoria forense, scanning em CI.

---

#### TASK-IDEIA-115: Red Teaming Pipeline (Garak/PyRIT)
- **Fase:** 2-E | **Dependências:** V1 Task 028 | **Esforço:** 4d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Pipeline automático de red teaming: Garak (LLM vulnerability scanner) + PyRIT (adversarial prompts). 200+ cenários de ataque. Report gerado pós-cada sprint.
- **Arquivos:** packages/security/src/red-team/garak-runner.ts, pyrir-runner.ts, report-generator.ts, .github/workflows/red-team-weekly.yml
- **Componentes:** security, prompt-security
- **Critérios:** 200+ cenários executados semanalmente; detection rate > 90%; FP < 5%; report gerado automaticamente

#### TASK-IDEIA-116: LLM Guardrails Configuration (NeMo/Guardrails AI)
- **Fase:** 2-E | **Dependências:** V1 Task 028 | **Esforço:** 4d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Configurar NeMo Guardrails ou Guardrails AI: guardrails de topical, fact-checking, moderation. Dial flow com regras de negócio. Fallback para scanner regex.
- **Arquivos:** packages/security/src/guardrails/nemo-config.yml, rails/topical.yml, /fact-checking.yml, /moderation.yml, guardrails-runner.ts
- **Componentes:** security, prompt-security
- **Critérios:** Guardrails ativos; dial flow funcional; fact-checking ativo; fallback funcional; latência < 200ms

#### TASK-IDEIA-117: Autonomy Policy Engine Implementation
- **Fase:** 2-E | **Dependências:** V1 Task 015 | **Esforço:** 4d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Implementar policy engine Cedar para autonomia: regras por agente, ação, recurso, contexto. Avaliação em tempo real. Log de todas as decisões.
- **Arquivos:** packages/policy-engine/src/cedar/cedar-adapter.ts, autonomy-policies.cedar, evaluator.ts, decision-log.ts
- **Componentes:** policy-engine, agent-runtime
- **Critérios:** Policy avalia em < 10ms; regras por agente/ação/recurso; log de decisões completo; Cedar como DSL

#### TASK-IDEIA-118: Audit Trail com Hash Chain (Produção)
- **Fase:** 2-E | **Dependências:** V1 Task 025 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Evoluir audit trail para produção: hash chain por namespace, Merkle root em blockchain (opcional), export forense, query temporal, alertas de violação.
- **Arquivos:** packages/audit-trail/src/production/hash-chain-pro.ts, merkle-tree.ts, blockchain-anchor.ts, export.ts
- **Componentes:** audit-trail
- **Critérios:** Hash chain por namespace; export forense em < 5s; Merkle root verificável; alerta em violação

#### TASK-IDEIA-119: Security Scanning em CI (CodeQL, Snyk, Talisman)
- **Fase:** 2-E | **Dependências:** Nenhuma | **Esforço:** 3d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Integrar CodeQL (SAST), Snyk (SCA), Talisman (secrets) no CI. Gate de PR bloqueia se critical/high. Scan semanal completo.
- **Arquivos:** .github/workflows/security-scan.yml, snyk-policy.snyk, .talismanrc, scripts/security-scan.sh
- **Componentes:** CI/CD, todos os módulos
- **Critérios:** CodeQL + Snyk + Talisman em CI; PR bloqueado em critical; scan semanal; zero secrets vazados

---

### 2.4 Expansão Fase 3: Multiagente (+5)

**Foco:** Protocolos padronizados de comunicação entre agentes (MCP, A2A), engenharia de prompts com DSPy, templates de agente, observabilidade multiagente.

---

#### TASK-IDEIA-120: MCP Tool Protocol Support
- **Fase:** 3-E | **Dependências:** V1 Task 038 | **Esforço:** 4d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Implementar servidor MCP (Model Context Protocol) para expor ferramentas IDEIA como tools MCP. Cliente MCP para consumir tools externas. Registry de tools.
- **Arquivos:** packages/mcp/src/server.ts, client.ts, tool-registry.ts, transport/stdio.ts, /sse.ts
- **Componentes:** mcp (novo), agent-runtime
- **Critérios:** Servidor MCP expõe tools; cliente consome tools externas; registry funcional; stdio + SSE transport

#### TASK-IDEIA-121: A2A Agent Communication Protocol
- **Fase:** 3-E | **Dependências:** 120 | **Esforço:** 4d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Implementar A2A (Agent-to-Agent Protocol) inspirado em Google A2A. Task-oriented messaging, capability discovery, streaming results, artifact exchange.
- **Arquivos:** packages/a2a/src/protocol.ts, agent-card.ts, task-message.ts, artifact-stream.ts, discovery.ts
- **Componentes:** a2a (novo), agent-collaboration
- **Critérios:** Agentes se descobrem via A2A Card; tasks delegadas com streaming; artifacts trocados; autenticação entre agentes

#### TASK-IDEIA-122: DSPy Prompt Optimization Pipeline
- **Fase:** 3-E | **Dependências:** Nenhuma | **Esforço:** 5d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Integrar DSPy para otimização automática de prompts: módulos ChainOfThought, ReAct, MultiChainComparison. Pipeline de otimização com datasets de exemplos. Compilação noturna.
- **Arquivos:** packages/prompt-engineering/src/dspy/modules/, optimizer.ts, dataset-collector.ts, compiler.ts, scripts/optimize-nightly.sh
- **Componentes:** prompt-engineering (novo)
- **Critérios:** DSPy modules integrados; otimização noturna; melhoria mensurável em accuracy; fallback para prompts manuais

#### TASK-IDEIA-123: Agent Prompt Templates (7 Tipos)
- **Fase:** 3-E | **Dependências:** V1 Task 041 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Templates de prompt para 7 tipos de agente: Analyst, Architect, Programmer, Reviewer, Tester, DevOps, Debater. Sistema de versionamento e A/B testing de templates.
- **Arquivos:** packages/agent-identity/src/prompts/templates/, template-manager.ts, version-control.ts, ab-test.ts
- **Componentes:** agent-identity, prompt-engineering
- **Critérios:** 7 templates definidos; versionados; A/B testing funcional; métricas de performance por versão

#### TASK-IDEIA-124: Agent Observability (Traces, Metrics, Logs)
- **Fase:** 3-E | **Dependências:** V1 Task 038, 102 | **Esforço:** 4d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Observabilidade completa para agentes: traces (decisões, ferramentas, LLM calls), metrics (latência, tokens, custo), logs (raciocínio, ações). Langfuse + OpenTelemetry.
- **Arquivos:** packages/agent-runtime/src/observability/agent-tracing.ts, agent-metrics.ts, agent-logger.ts, /spans/thought-span.ts, /action-span.ts
- **Componentes:** agent-runtime, observability
- **Critérios:** Traces por decisão; metrics em tempo real; logs pesquisáveis; integração Langfuse; overhead < 3%

---

### 2.5 Expansão Fase 4: Pipeline (+5)

**Foco:** Maturidade do pipeline de entrega com feature flags em produção, progressive delivery canário, SBOM, contratos e pós-deploy.

---

#### TASK-IDEIA-125: Feature Flags (LaunchDarkly/Flagsmith/Unleash)
- **Fase:** 4-E | **Dependências:** V1 Task 050 | **Esforço:** 4d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Adapter multi-provider para feature flags. Targeting por segmento (usuário, % , ambiente). IA cria/gerencia flags para releases. SDK client-side + server-side.
- **Arquivos:** packages/feature-flags/src/adapters/launchdarkly.ts, /flagsmith.ts, /unleash.ts, flag-manager.ts, packages/cli/src/commands/feature-flag.ts
- **Componentes:** feature-flags (novo), cli
- **Critérios:** 3 providers suportados; targeting funcional; SDK client + server; IA cria flags; toggle em tempo real

#### TASK-IDEIA-126: Progressive Delivery (Canary/Blue-Green)
- **Fase:** 4-E | **Dependências:** V1 Task 051 | **Esforço:** 4d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Pipeline canário 1%→5%→25%→50%→100% com auto-promotion baseado em SLOs (latência, erro, throughput). Rollback automático instantâneo. Blue-green com switch DNS.
- **Arquivos:** packages/delivery-orchestrator/src/progressive-v2/canary-pipeline.ts, slo-promoter.ts, rollback-executor.ts, metrics-collector.ts
- **Componentes:** delivery-orchestrator
- **Critérios:** Canary steps automáticos; rollback em SLO breach < 30s; blue-green funcional; métricas em tempo real

#### TASK-IDEIA-127: SBOM Generation em CI Pipeline
- **Fase:** 4-E | **Dependências:** Nenhuma | **Esforço:** 2d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Gerar SBOM (SPDX 2.3) no CI usando CycloneDX + Syft. Publicar em Dependency-Track. Gate: fail se critical CVE. Audit semestral.
- **Arquivos:** .github/workflows/sbom.yml, scripts/sbom-generate.sh, packages/cli/src/commands/sbom.ts
- **Componentes:** CI/CD, cli
- **Critérios:** SBOM gerado a cada build; published no Dependency-Track; gate em critical CVE; formato SPDX 2.3

#### TASK-IDEIA-128: Contract Verification em CI
- **Fase:** 4-E | **Dependências:** 101 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** CI executa verificação de contratos (Pact + OpenAPI + Schema Registry) a cada PR. Relatório de compatibilidade. Breaking changes bloqueiam merge.
- **Arquivos:** .github/workflows/contract-verify.yml, packages/contract-testing/src/ci/verifier.ts, pact-compatibility.ts, openapi-compat.ts
- **Componentes:** contract-testing, CI/CD
- **Critérios:** 3 tipos de contrato verificados; PR bloqueado se breaking change; relatório no PR comment

#### TASK-IDEIA-129: Post-Deploy Smoke Tests
- **Fase:** 4-E | **Dependências:** Nenhuma | **Esforço:** 2d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Smoke tests pós-deploy: health check, E2E crítico, integração com NATS, LLM call, file CRUD. Executados após cada deploy. Rollback automático se smoke fail.
- **Arquivos:** packages/smoke-tests/src/scenarios/health.ts, e2e-critical.ts, nats-check.ts, llm-check.ts, runner.ts, .github/workflows/post-deploy.yml
- **Componentes:** smoke-tests (novo), delivery-orchestrator
- **Critérios:** 5 cenários executados pós-deploy; rollback se falha; report gerado; execução < 2 min

---

### 2.6 Expansão Fase 5: Aprendizado (+5)

**Foco:** Pipeline cross-project robusto, RLHF/DPO para alinhamento, fine-tuning automatizado, curadoria do knowledge graph, benchmarking de performance.

---

#### TASK-IDEIA-130: Cross-Project Learning Pipeline
- **Fase:** 5-E | **Dependências:** V1 Task 058 | **Esforço:** 4d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Pipeline ETL cross-project: extrair padrões de N projetos, transformar em regras generalizáveis, carregar no knowledge graph global. Privacidade com differential privacy.
- **Arquivos:** packages/memory-store/src/cross-project-v2/etl-pipeline.ts, pattern-extractor.ts, privacy-guard.ts, global-graph-loader.ts
- **Componentes:** memory-store
- **Critérios:** ETL processa N projetos; regras generalizadas; differential privacy ativo; sem vazamento cross-namespace

#### TASK-IDEIA-131: RLHF/DPO Feedback Collection
- **Fase:** 5-E | **Dependências:** V1 Task 062 | **Esforço:** 5d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Coleta de feedback humano: preferência entre duas respostas (RLHF) e avaliação direta (DPO). Dashboard de feedback. Dataset exportável para fine-tuning.
- **Arquivos:** packages/feedback-pipeline/src/rlhf/preference-collector.ts, dpo-evaluator.ts, feedback-dashboard.ts, dataset-exporter.ts
- **Componentes:** feedback-pipeline, web-ui
- **Critérios:** Interface de preferência; DPO evaluation; 100+ feedbacks/semana; dataset exportável; dashboard de métricas

#### TASK-IDEIA-132: Model Fine-Tuning Pipeline
- **Fase:** 5-E | **Dependências:** 131, V1 Task 062 | **Esforço:** 5d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Pipeline automatizado de fine-tuning: trigger por dataset size, QLoRA 4-bit, avaliação vs baseline, deploy do adapter. Suporte Ollama + HuggingFace.
- **Arquivos:** packages/memory-store/src/fine-tuning-v2/auto-trigger.ts, qlora-trainer.ts, evaluation-runner.ts, adapter-deployer.ts, scripts/fine-tune-auto.sh
- **Componentes:** memory-store, cli
- **Critérios:** Fine-tuning automático ao atingir N amostras; avaliação vs baseline antes do deploy; adapter deployado em produção; rollback se piora

#### TASK-IDEIA-133: Knowledge Graph Auto-Curation
- **Fase:** 5-E | **Dependências:** V1 Task 060 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Curadoria automática do KG: dedup de nós, merge de relações equivalentes, poda de nós obsoletos, detecção de inconsistências.
- **Arquivos:** packages/memory-store/src/knowledge-graph/curator/dedup.ts, merge-relations.ts, prune-obsolete.ts, inconsistency-detector.ts
- **Componentes:** memory-store
- **Critérios:** Dedup automático; merge de relações; poda semanal; inconsistências reportadas; KG mantém < 10K nós

#### TASK-IDEIA-134: Performance Benchmarking Automation
- **Fase:** 5-E | **Dependências:** Nenhuma | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Baixo
- **Descrição:** Suite de benchmarks automatizados: latência LLM, throughput NATS, tempo de pipeline, tempo de resposta chat. Execução semanal com relatório de regressão.
- **Arquivos:** packages/benchmarking/src/suites/llm-latency.ts, nats-throughput.ts, pipeline-time.ts, chat-response.ts, runner.ts, weekly-report.ts
- **Componentes:** benchmarking (novo), cli
- **Critérios:** Benchmarks executados automaticamente; relatório semanal; regressão detecta > 10% piora; histórico 12 semanas

---

## 3. Novas Fases 6-9

### 3.1 Fase 6: UX e Experiência (Semanas 33-40, +15)

**Foco:** Design system, acessibilidade WCAG AA, navegação por teclado, screen readers, micro-interações, estados de carregamento, métricas de satisfação NPS/SUS, otimização time-to-task.

---

#### TASK-IDEIA-201: Design System Implementation (shadcn/ui Expansion)
- **Fase:** 6 | **Dependências:** Nenhuma | **Esforço:** 5d | **Complexidade:** Alta | **Risco:** Médio
- **Descrição:** Expandir shadcn/ui com componentes customizados IDEIA: CommandPalette, AgentStatusBadge, DiffViewer, ApprovalCard, FileTree, TerminalBlock. Tokens de design, tema claro/escuro, typography scale.
- **Arquivos:** packages/web-ui/src/components/ui/, design-tokens/, themes/, index.ts
- **Componentes:** web-ui
- **Critérios:** 15+ novos componentes; tema claro/escuro; tokens consistentes; tipografia responsiva; dark mode
- **Testes:** Visual regression (Chromatic), Unitário (renderização), Acessibilidade (axe-core)

#### TASK-IDEIA-202: WCAG AA Compliance Audit and Fixes
- **Fase:** 6 | **Dependências:** 201 | **Esforço:** 5d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Auditoria completa WCAG 2.2 AA: 50 critérios testados (Perceivable, Operable, Understandable, Robust). Correções de contraste, foco visível, labels, landmarks, ARIA roles.
- **Arquivos:** packages/web-ui/src/accessibility/audit-report.ts, fixes/, ARIA-mappings.ts, packages/web-ui/src/hooks/useA11y.ts
- **Componentes:** web-ui
- **Critérios:** Score axe-core > 90%; contraste 4.5:1; todos elementos focáveis; ARIA roles corretos; Lighthouse a11y 100
- **Testes:** axe-core automático (CI), Lighthouse CI, Verificação manual de 20 páginas

#### TASK-IDEIA-203: Keyboard Navigation Overhaul
- **Fase:** 6 | **Dependências:** 202 | **Esforço:** 4d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Navegação completa por teclado: Tab/Shift+Tab ordem lógica, Arrow keys em listas/trees, Enter/Space ativa, Escape fecha. Shortcuts consistentes (Ctrl+K busca, Ctrl+` terminal). Focus trap em modais.
- **Arquivos:** packages/web-ui/src/hooks/useKeyboardNav.ts, focus-trap.ts, keyboard-shortcuts.ts, packages/web-ui/src/components/KeyboardShortcutsDialog.tsx
- **Componentes:** web-ui
- **Critérios:** Tab order lógico; todas ações via teclado; shortcuts documentados (Ctrl+/); focus trap modais; < 5 issues axe-core keyboard
- **Testes:** Keyboard E2E (Cypress), axe-core keyboard audit

#### TASK-IDEIA-204: Screen Reader Support
- **Fase:** 6 | **Dependências:** 202 | **Esforço:** 4d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Suporte a leitores de tela (NVDA, JAWS, VoiceOver, Narrator): ARIA live regions para chat streaming, role="log" para terminal, status announcements para operações async, descrições contextuais.
- **Arquivos:** packages/web-ui/src/accessibility/screen-reader/live-region.ts, terminal-aria.ts, chat-aria.ts, notifications-aria.ts
- **Componentes:** web-ui
- **Critérios:** Compatível NVDA + VoiceOver; chat streaming anunciado; terminal com role="log"; status announcements; < 5 issues axe-core
- **Testes:** Testes manuais com NVDA/VoiceOver; axe-core automático

#### TASK-IDEIA-205: Micro-interactions and Animations
- **Fase:** 6 | **Dependências:** 201 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Baixo
- **Descrição:** Animações sutis: hover transitions, page transitions (framer-motion), loading shimmer, success/error toast animations, agent thinking pulse, smooth scroll. prefers-reduced-motion respeitado.
- **Arquivos:** packages/web-ui/src/components/animations/, /transitions.ts, /micro-interactions.ts, hooks/useReducedMotion.ts
- **Componentes:** web-ui
- **Critérios:** Animações < 300ms; prefers-reduced-motion respeitado; sem jank (60fps); todas animações CSS/smooth
- **Testes:** Visual regression, Performance (FPS monitor)

#### TASK-IDEIA-206: Loading/Skeleton/Error States
- **Fase:** 6 | **Dependências:** 201 | **Esforço:** 3d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Estados de loading (skeleton screens), empty states (ilustrações + mensagens), error states (retry button, fallback message). Consistentes em todos os componentes. Offline indicator.
- **Arquivos:** packages/web-ui/src/components/states/LoadingState.tsx, EmptyState.tsx, ErrorState.tsx, OfflineIndicator.tsx, packages/web-ui/src/lib/error-boundary.tsx
- **Componentes:** web-ui
- **Critérios:** Skeleton em todo carregamento > 300ms; empty state contextual; error state com retry; offline indicator; error boundary global

#### TASK-IDEIA-207: Chat Streaming Visual Improvements
- **Fase:** 6 | **Dependências:** 201 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Baixo
- **Descrição:** Token-by-token streaming visual: cursor piscante durante digitação, smooth text appear, diff highlighting em código, tipo de resposta (text/code/plan/diagram).
- **Arquivos:** packages/web-ui/src/components/chat/StreamingText.tsx, CursorPulse.tsx, DiffHighlight.tsx, ResponseTypeIndicator.tsx
- **Componentes:** web-ui
- **Critérios:** Streaming visual suave; diff destacado; tipo de resposta visível; cursor piscante; sem flickering
- **Testes:** Visual regression, Performance (60fps durante streaming)

#### TASK-IDEIA-208: File Explorer UX Improvements
- **Fase:** 6 | **Dependências:** 201 | **Esforço:** 2d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Drag & drop files, file preview (hover), git status colors, collapse/expand animado, search highlight, file type icons, breadcrumbs.
- **Arquivos:** packages/web-ui/src/components/FileExplorer/, DropZone.tsx, FilePreview.tsx, GitStatusBadge.tsx, Breadcrumbs.tsx
- **Componentes:** web-ui
- **Critérios:** Drag & drop funcional; preview hover; git status visível; ícones por tipo; breadcrumbs navegáveis
- **Testes:** E2E (drag-drop), Visual regression

#### TASK-IDEIA-209: Terminal UX Enhancements
- **Fase:** 6 | **Dependências:** V1 Task 052 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Terminal tabs, split panes, search, font ligatures, theme support (solarized/dracula/etc.), copy-on-select, right-click paste, command history search (Ctrl+R style).
- **Arquivos:** packages/web-ui/src/components/terminal/TerminalTabBar.tsx, TerminalSplit.tsx, TerminalSearch.tsx, TerminalTheme.tsx, TerminalConfig.tsx
- **Componentes:** web-ui
- **Critérios:** Múltiplas abas; split vertical/horizontal; search funcional; 5+ themes; Ctrl+R history; copy-on-select
- **Testes:** E2E (multi-tab, split), Visual regression

#### TASK-IDEIA-210: Dashboard Visual Refresh
- **Fase:** 6 | **Dependências:** 201 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Baixo
- **Descrição:** Dashboard com charts (recharts), health score gauge, activity timeline, project stats cards, recent activity feed, customizable widgets. Refresh em tempo real via SSE.
- **Arquivos:** packages/web-ui/src/components/dashboard-v2/, HealthGauge.tsx, ActivityTimeline.tsx, StatsCard.tsx, WidgetGrid.tsx, hooks/useDashboardRealtime.ts
- **Componentes:** web-ui
- **Critérios:** Charts interativos; health gauge animado; timeline atualizada via SSE; widgets customizáveis; performance 60fps

#### TASK-IDEIA-211: NPS/SUS Measurement Infrastructure
- **Fase:** 6 | **Dependências:** Nenhuma | **Esforço:** 2d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Coleta de NPS (0-10: "Recomendaria IDEIA?") e SUS (System Usability Scale, 10 perguntas). Survey in-app pós-task. Dashboard de evolução. Alerta se NPS < 50 ou SUS < 68.
- **Arquivos:** packages/analytics/src/nps/nps-collector.ts, sus-collector.ts, survey-ui.tsx, packages/web-ui/src/components/survey/NPSSurvey.tsx, SUSSurvey.tsx
- **Componentes:** analytics, web-ui
- **Critérios:** Survey pós-task; NPS e SUS coletados; dashboard mensal; alerta em queda; taxa de resposta > 10%

#### TASK-IDEIA-212: Time-to-Task Optimization
- **Fase:** 6 | **Dependências:** Nenhuma | **Esforço:** 4d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Medir e otimizar time-to-task (tempo entre abrir IDEIA e primeira task executada). Análise de funnel: startup → project open → first prompt → first result. Otimizações: lazy loading, preconnect, cache de warm-up, optimistic UI.
- **Arquivos:** packages/analytics/src/time-to-task/funnel-analyzer.ts, warmup-cache.ts, packages/web-ui/src/lib/optimistic-loader.ts, packages/cli/src/services/warmup.ts
- **Componentes:** analytics, web-ui, cli
- **Critérios:** Time-to-task < 5s (target), < 3s (stretch); funnel analytics; warmup cache eficaz; optimistic UI reduz percepção

#### TASK-IDEIA-213: Onboarding Experience (First Run)
- **Fase:** 6 | **Dependências:** 212 | **Esforço:** 4d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Tour interativo no primeiro uso: welcome screen, project setup wizard, first prompt tutorial, sample project auto-open. Progress tracking. Skip option.
- **Arquivos:** packages/web-ui/src/components/onboarding/, WelcomeScreen.tsx, ProjectWizard.tsx, FirstPromptTutorial.tsx, ProgressTracker.tsx
- **Componentes:** web-ui
- **Critérios:** Tour completo em < 5 passos; wizard funcional; tutorial interativo; progresso salvo; skip disponível

#### TASK-IDEIA-214: Theme System (Light/Dark/Custom)
- **Fase:** 6 | **Dependências:** 201 | **Esforço:** 2d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Sistema de temas: light/dark toggle, theme persistence, custom theme via CSS variables, theme marketplace (community themes), syntax highlighting themes.
- **Arquivos:** packages/web-ui/src/themes/, theme-manager.ts, ThemeProvider.tsx, ThemeMarketplace.tsx, syntax-themes.ts
- **Componentes:** web-ui
- **Critérios:** Light + dark + custom; persistência; CSS variables; syntax themes; 3+ themes built-in

#### TASK-IDEIA-215: Responsive Layout for Different Screen Sizes
- **Fase:** 6 | **Dependências:** 201 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Layout responsivo: desktop (painéis lado a lado), tablet (painéis empilháveis), mobile (chat-first). Breakpoints, collapsible panels, min-width constraints.
- **Arquivos:** packages/web-ui/src/layouts/, /responsive/breakpoints.ts, PanelLayout.tsx, MobileChatView.tsx, hooks/useResponsive.ts
- **Componentes:** web-ui
- **Critérios:** Funcional em 1280+ (desktop), 768+ (tablet), 375+ (mobile); painéis colapsáveis; sem overflow horizontal; touch events mobile

---

### 3.2 Fase 7: Colaboração em Tempo Real (Semanas 37-44, +12)

**Foco:** Edição colaborativa multi-cursor com Yjs + Monaco, presença/awareness, eventos NATS para colaboração, quadro compartilhado entre agentes, debate e consenso, replay de sessão, Theia Cloud, pair programming AI.

---

#### TASK-IDEIA-301: Yjs + Monaco Integration for Multi-Cursor
- **Fase:** 7 | **Dependências:** Nenhuma | **Esforço:** 6d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Integrar Yjs com Monaco Editor para edição colaborativa multi-cursor. Cursors de outros usuários visíveis com avatar + nome. OT/CRDT para resolução de conflitos. Undo/redo distribuído.
- **Arquivos:** packages/collaboration/src/yjs/yjs-adapter.ts, monaco-binding.ts, cursor-manager.ts, awareness-manager.ts, undo-manager.ts
- **Componentes:** colaboração (novo), web-ui
- **Critérios:** 2+ usuários editam mesmo arquivo; cursors visíveis em tempo real; resolução de conflitos funcional; undo distribuído; latência < 100ms
- **Testes:** E2E (2 usuários editando simultaneamente), Performance (10 usuários), Resiliência (desconexão/reconexão)

#### TASK-IDEIA-302: Awareness/Presence Protocol
- **Fase:** 7 | **Dependências:** 301 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Protocolo de presença: status (online/away/busy/offline), atividade atual (editando arquivo X), mouse position, user profile (avatar, name, role). Heartbeat 30s. Timeout automático.
- **Arquivos:** packages/collaboration/src/presence/presence-protocol.ts, presence-store.ts, heartbeat.ts, status-manager.ts, packages/web-ui/src/components/colab/PresenceIndicator.tsx
- **Componentes:** colaboração, web-ui
- **Critérios:** Status em tempo real; heartbeat 30s; timeout automático; perfil visível; indicador de atividade
- **Testes:** Unitário (heartbeat, timeout), Integração (presence via NATS), E2E (status visível para outros)

#### TASK-IDEIA-303: NATS-Based Collaboration Events
- **Fase:** 7 | **Dependências:** V1 Task 016, 301 | **Esforço:** 4d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Eventos de colaboração via NATS: cursor.move, file.edit, user.join/leave, session.start/end, agent.collaborate. Schema Registry para cada evento. Replay de sessão.
- **Arquivos:** packages/collaboration/src/events/collab-events.ts, nats-transport.ts, event-replay.ts, schema-registry.ts
- **Componentes:** colaboração, event-bus
- **Critérios:** Eventos NATS para todas ações colaborativas; schemas registrados; replay funcional; latência < 50ms
- **Testes:** Unitário (eventos, schemas), Integração (NATS → evento → consumidor), Performance (1000 eventos/s)

#### TASK-IDEIA-304: Agent Shared Blackboard
- **Fase:** 7 | **Dependências:** V1 Task 038 | **Esforço:** 5d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Shared blackboard entre agentes humanos e AI: canvas compartilhado com artefatos (diagramas, código, decisões, riscos). Atualização em tempo real via NATS. Board persistido.
- **Arquivos:** packages/collaboration/src/blackboard/blackboard.ts, artifact-canvas.ts, realtime-updater.ts, board-persist.ts, packages/web-ui/src/components/colab/BlackboardView.tsx
- **Componentes:** colaboração, agent-collaboration, web-ui
- **Critérios:** Canvas compartilhado; artefatos visíveis em tempo real; persistido; drag & drop; histórico de mudanças
- **Testes:** E2E (2 agentes compartilhando blackboard), Performance (100 artefatos simultâneos)

#### TASK-IDEIA-305: Debate and Consensus Engine
- **Fase:** 7 | **Dependências:** V1 Task 045, 304 | **Esforço:** 5d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Engine de debate para agentes humanos + AI: rounds argumentativos, votação ponderada (expertise weight), consenso automático, fallback para voto humano. Síntese pós-debate.
- **Arquivos:** packages/collaboration/src/debate-v2/debate-engine.ts, argument-round.ts, weighted-vote.ts, consensus-detector.ts, synthesis-generator.ts
- **Componentes:** colaboração, agent-collaboration
- **Critérios:** Agentes humanos + AI debatem; votação ponderada; consenso detectado; síntese gerada; fallback voto humano
- **Testes:** Unitário (votação, consenso), Integração (N agentes debatendo), E2E (humano + AI debatem decisão)

#### TASK-IDEIA-306: Session Replay (Time-Travel)
- **Fase:** 7 | **Dependências:** 303 | **Esforço:** 5d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Replay de sessão completa: timeline de todos os eventos, seek forward/backward, speed control (1x/2x/4x/8x), diff entre instantes, export replay. Inspirado em Replay.io.
- **Arquivos:** packages/collaboration/src/replay/session-recorder.ts, timeline.ts, replay-player.ts, speed-controller.ts, diff-exporter.ts
- **Componentes:** colaboração
- **Critérios:** Sessão gravada integralmente; replay com seek; speed control; diff entre instantes; export funcional
- **Testes:** Unitário (recorder, timeline), Integração (replay fiel ao original), Performance (1h de sessão < 10MB)

#### TASK-IDEIA-307: Theia Cloud Multi-Instance
- **Fase:** 7 | **Dependências:** V1 Task 046 | **Esforço:** 5d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Theia Cloud para múltiplas instâncias: gerenciamento de workspaces, persistence, user sessions, auto-scaling. Integração com hub IDEIA para colaboração cross-instância.
- **Arquivos:** packages/theia-cloud/src/workspace-manager.ts, session-orchestrator.ts, auto-scaler.ts, hub-integration.ts
- **Componentes:** theia-cloud (novo), colaboração
- **Critérios:** Múltiplas instâncias; workspaces persistentes; auto-scaling; integração hub; colaboração cross-instância
- **Testes:** Integração (multi-instância), Performance (10 instâncias simultâneas), E2E (usuário em instância A colabora com B)

#### TASK-IDEIA-308: Pair Programming with AI Agent
- **Fase:** 7 | **Dependências:** 301, 304 | **Esforço:** 6d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Modo pair programming: AI como par (navegador ou motorista). AI sugere código em tempo real, humano aceita/rejeita. Chat lateral com contexto do arquivo. Driver/Navigator alternância.
- **Arquivos:** packages/collaboration/src/pair-programming/pair-session.ts, ai-driver.ts, ai-navigator.ts, suggestion-manager.ts, packages/web-ui/src/components/colab/PairProgrammingView.tsx
- **Componentes:** colaboração, agent-runtime, web-ui
- **Critérios:** AI como driver ou navigator; sugestão em tempo real; aceita/rejeita por atalho; chat lateral; alternância; diff preview
- **Testes:** E2E (humano + AI pair programming), Performance (sugestão < 200ms), UX (satisfação pair)

#### TASK-IDEIA-309: Collaborative Code Review
- **Fase:** 7 | **Dependências:** 301 | **Esforço:** 4d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Revisão colaborativa de código: comentários inline, threads, approve/reject, AI review assist (sugere issues), review checklist, status tracking.
- **Arquivos:** packages/collaboration/src/code-review/inline-comment.ts, review-thread.ts, approval-vote.ts, ai-review-assist.ts, review-status.ts
- **Componentes:** colaboração, agent-runtime, web-ui
- **Critérios:** Comentários inline; threads; approve/reject; AI assist ativo; checklist; status tracking
- **Testes:** E2E (review cycle completo), Integração (AI assist gerando sugestões)

#### TASK-IDEIA-310: Real-Time Project Dashboard
- **Fase:** 7 | **Dependências:** 302, 303 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Dashboard colaborativo em tempo real: quem está online, o que estão editando, atividades recentes, bloqueios, progresso de tasks. Visible a todos no workspace.
- **Arquivos:** packages/web-ui/src/components/colab/RealtimeDashboard.tsx, ActivityFeed.tsx, OnlineUsers.tsx, BlockedFiles.tsx
- **Componentes:** web-ui, colaboração
- **Critérios:** Atualização em tempo real; quem está online visível; bloqueios de arquivo; activity feed; progresso de tasks
- **Testes:** E2E (dashboard reflete ações de outros), Performance (atualização < 100ms)

#### TASK-IDEIA-311: Locking and Conflict Resolution
- **Fase:** 7 | **Dependências:** 301 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Locking otimista (Yjs CRDT) e pessimista (file lock para não-colaborativo). Detecção de conflito, diff 3-way, merge assistido, notificação em conflito.
- **Arquivos:** packages/collaboration/src/locking/optimistic-lock.ts, pessimistic-lock.ts, conflict-detector.ts, three-way-merge.ts, merge-assistant.ts
- **Componentes:** colaboração
- **Critérios:** CRDT resolve conflitos automáticos; pessimistic lock para binários; 3-way merge assistido; notificação em conflito
- **Testes:** Unitário (3-way merge, CRDT conflict), Integração (2 usuários mesmo arquivo), Resiliência (lock timeout)

#### TASK-IDEIA-312: Collaboration Security (AuthZ, Rate Limit)
- **Fase:** 7 | **Dependências:** 302 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Segurança da colaboração: permissões por workspace (owner/editor/viewer), rate limiting de eventos, validação de autenticidade dos eventos (signing), anti-spam, invite links.
- **Arquivos:** packages/collaboration/src/security/permissions.ts, event-rate-limiter.ts, event-signer.ts, invite-manager.ts
- **Componentes:** colaboração, security
- **Critérios:** 3 níveis de permissão; rate limit por usuário; eventos assinados; invite links temporários; anti-spam
- **Testes:** Unitário (permissions, rate limit), Segurança (event spoofing, invite abuse), Performance (rate limit overhead < 1ms)

---

### 3.3 Fase 8: Desktop Nativo e Distribuição (Semanas 41-48, +10)

**Foco:** Migração Electron → Tauri v2, Rust sidecar para backend Node.js, auto-update, code signing, instaladores nativos (MSI/DMG/AppImage), package managers (Chocolatey/Homebrew/Scoop), otimizações de plataforma.

---

#### TASK-IDEIA-401: Tauri v2 Migration (from Electron)
- **Fase:** 8 | **Dependências:** Nenhuma | **Esforço:** 8d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Migrar aplicação desktop de Electron para Tauri v2. Substituir IPC Electron por Tauri commands, adaptar menus e janelas, migrar auto-update, manter funcionalidades de sistema (tray, notifications, file dialogs).
- **Arquivos:** src-tauri/Cargo.toml, src-tauri/src/lib.rs, src-tauri/src/commands/, src-tauri/capabilities/, packages/cli/src/tauri/adapters/, migration-guide.md
- **Componentes:** desktop (tauri)
- **Critérios:** Tauri v2 funcional; todas funcionalidades Electron migradas; bundle size < 15MB (vs Electron 150MB); desempenho > Electron
- **Testes:** E2E (todas funcionalidades desktop), Performance (memória, startup), Plataforma (Windows/Mac/Linux)

#### TASK-IDEIA-402: Rust Sidecar para Node.js Backend
- **Fase:** 8 | **Dependências:** 401 | **Esforço:** 5d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Rust sidecar que gerencia o backend Node.js: health check, restart automático, IPC bridge, resource monitoring, crash recovery. Comunicação via stdin/stdout JSON ou gRPC.
- **Arquivos:** src-tauri/src/sidecar/manager.rs, node-bridge.rs, health-checker.rs, crash-recovery.rs, packages/cli/src/sidecar/bridge.ts
- **Componentes:** desktop (tauri), cli
- **Critérios:** Sidecar gerencia backend; restart automático em crash; health check a cada 5s; IPC funcional; recovery < 2s
- **Testes:** Integração (sidecar ↔ Node.js), Resiliência (crash → restart), Performance (IPC latency < 1ms)

#### TASK-IDEIA-403: Auto-Update Pipeline (Windows/Mac/Linux)
- **Fase:** 8 | **Dependências:** 401 | **Esforço:** 4d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Pipeline de auto-update: Tauri updater + servidor próprio (S3 + update.json). Canais stable/beta/nightly. Rollback automático em falha. Download progressivo. Diferenciais binários.
- **Arquivos:** src-tauri/tauri.conf.json (updater), update-server/server.ts, update.json.template, scripts/upload-update.sh, packages/cli/src/commands/update.ts
- **Componentes:** desktop (tauri), infraestrutura
- **Critérios:** Auto-update funcional Windows/Mac/Linux; 3 canais; rollback automático; download progressivo; verified updates
- **Testes:** E2E (update cycle), Resiliência (rollback em falha), Performance (differential < 50MB)

#### TASK-IDEIA-404: Code Signing for All Platforms
- **Fase:** 8 | **Dependências:** 401 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Alto
- **Descrição:** Configurar code signing: Windows (Azure Key Vault + EV cert), macOS (Apple Developer ID + notarization), Linux (AppImage signing). Pipeline CI com signing automático.
- **Arquivos:** scripts/signing/windows-sign.ps1, macos-sign.sh, linux-sign.sh, .github/workflows/signing.yml, docs/governance/CODE-SIGNING.md
- **Componentes:** CI/CD, desktop (tauri)
- **Critérios:** Windows signed + SmartScreen verified; macOS signed + notarized; Linux AppImage signed; CI signing automático
- **Testes:** Verificação manual (cada plataforma), CI signing validation

#### TASK-IDEIA-405: Installer Packages (MSI, DMG, AppImage)
- **Fase:** 8 | **Dependências:** 401, 404 | **Esforço:** 4d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Instaladores nativos: MSI (WiX Toolset), DMG (create-dmg), AppImage (appimagetool). Instalação silenciosa, desktop shortcut, file association (.ideia), uninstaller, PATH setup.
- **Arquivos:** scripts/installers/windows/Installer.wxs, /macos/create-dmg.sh, /linux/appimage.yml, .github/workflows/installers.yml
- **Componentes:** CI/CD, desktop (tauri)
- **Critérios:** MSI instala/desinstala; DMG arrasta para Applications; AppImage executa; file association .ideia; PATH configurado
- **Testes:** E2E (instalação → uso → desinstalação em cada SO)

#### TASK-IDEIA-406: Package Managers (Chocolatey, Homebrew, Scoop)
- **Fase:** 8 | **Dependências:** 405 | **Esforço:** 3d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Publicar IDEIA em package managers: Chocolatey (Windows), Homebrew (macOS), Scoop (Windows). Scripts de automação. Versionamento. Update automático via CI.
- **Arquivos:** scripts/pkgman/chocolatey/ideia.nuspec, /homebrew/Formula/ideia.rb, /scoop/bucket/ideia.json, .github/workflows/publish-pkgman.yml
- **Componentes:** CI/CD
- **Critérios:** `choco install ideia`; `brew install ideia`; `scoop install ideia`; versionamento correto; CI publica automaticamente

#### TASK-IDEIA-407: Platform-Specific Optimizations (ConPTY, etc.)
- **Fase:** 8 | **Dependências:** 401 | **Esforço:** 4d | **Complexidade:** Alta | **Risco:** Médio
- **Descrição:** Otimizações por plataforma: Windows (ConPTY, WinRT notifications, taskbar progress, JumpList), macOS (NSWindow, Touch Bar, menu bar extra), Linux (DBus, notifications, XDG). Shell detection.
- **Arquivos:** src-tauri/src/platform/windows.rs, /macos.rs, /linux.rs, packages/cli/src/platform/adapters.ts
- **Componentes:** desktop (tauri), cli
- **Critérios:** ConPTY funcional no Windows; notificações nativas; taskbar progress; shell detection automático; Touch Bar atalhos
- **Testes:** E2E (cada funcionalidade na plataforma), Compatibilidade (Windows 10/11, macOS 13+/14+, Ubuntu 22+/Fedora)

#### TASK-IDEIA-408: Tray Application and Global Shortcuts
- **Fase:** 8 | **Dependências:** 401 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** System tray: minimize to tray, tray menu (quick actions, status, recent projects), global shortcuts (Ctrl+Alt+I to open, Ctrl+Alt+Space quick capture). Badge para status.
- **Arquivos:** src-tauri/src/tray.rs, tray-menu.rs, global-shortcuts.rs, packages/cli/src/tray/tray-manager.ts
- **Componentes:** desktop (tauri)
- **Critérios:** Tray funcional nas 3 plataformas; menu com ações rápidas; global shortcuts; badge de status; minimize to tray

#### TASK-IDEIA-409: Filesystem Permissions and Sandbox
- **Fase:** 8 | **Dependências:** 401 | **Esforço:** 2d | **Complexidade:** Baixa | **Risco:** Médio
- **Descrição:** Configurar permissões de filesystem do Tauri v2: escopos de acesso (workspace-only), sandbox de plugins, file dialogs restritos. Respeitar macOS sandbox e Windows/Mac entitlements.
- **Arquivos:** src-tauri/capabilities/fs.json, permissions.json, entitlements/macos/ideia.entitlements, /windows/appxmanifest.xml
- **Componentes:** desktop (tauri)
- **Critérios:** Acesso restrito ao workspace; dialogs bloqueados por escopo; macOS sandbox ok; Windows entitlements ok

#### TASK-IDEIA-410: Desktop Crash Reporting and Telemetry
- **Fase:** 8 | **Dependências:** 401 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Crash reporting nativo: Sentry/Rust panic capture, minidump upload, breadcrumbs, user context. Telemetry: usage stats, performance metrics, opt-in/opt-out. GDPR compliant.
- **Arquivos:** src-tauri/src/telemetry/crash-reporter.rs, minidump-uploader.rs, usage-tracker.rs, packages/cli/src/telemetry/telemetry-manager.ts
- **Componentes:** desktop (tauri), cli
- **Critérios:** Crash report automático; minidump upload; breadcrumbs; telemetry opt-in; GDPR compliant; Sentry dashboard
- **Testes:** E2E (crash simulado → report), Integração (telemetry envio/consulta)

---

### 3.4 Fase 9: Ecossistema de Plugins (Semanas 45-52, +12)

**Foco:** Plugin API completa, registry/ marketplace, lifecycle management, sandbox isolation, OpenVSX compatibilidade, MCP e A2A protocolos, SDK para desenvolvedores.

---

#### TASK-IDEIA-501: Plugin API Design (IDEIA Contribution Points)
- **Fase:** 9 | **Dependências:** Nenhuma | **Esforço:** 6d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Definir e implementar contribution points: views (painéis customizados), commands, providers (LLM, memory, tools), event listeners, menu items, keybindings. TypeScript API com types.
- **Arquivos:** packages/plugin-api/src/contributions/, /view.ts, /command.ts, /provider.ts, /event.ts, /menu.ts, /keybinding.ts, packages/plugin-api/src/index.ts, types.ts
- **Componentes:** plugin-api (novo)
- **Critérios:** 7 contribution points definidos; API TypeScript; documentação gerada automaticamente; exemplos funcionais
- **Testes:** Unitário (cada contribution point), Integração (plugin consumindo API), Exemplo (plugin hello-world)

#### TASK-IDEIA-502: Plugin Registry (npm-based Marketplace)
- **Fase:** 9 | **Dependências:** 501 | **Esforço:** 5d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Registry de plugins npm-based: `@ideia/plugin-*` packages. Search, install from npm, version resolution, dependency management, updates. Nice page com metadados.
- **Arquivos:** packages/plugin-registry/src/registry.ts, npm-adapter.ts, version-resolver.ts, dependency-manager.ts, marketplace-ui.tsx
- **Componentes:** plugin-registry (novo), web-ui
- **Critérios:** Plugin publicado como npm; search por nome/categoria; install via npm; version resolution; dependências gerenciadas
- **Testes:** Integração (npm publish → install), Performance (500 plugins search < 1s)

#### TASK-IDEIA-503: Plugin Lifecycle (Install/Activate/Deactivate/Uninstall)
- **Fase:** 9 | **Dependências:** 501, 502 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Lifecycle completo: install (npm + hooks), activate (onStartup/onCommand/onEvent), deactivate (onSuspend), uninstall (cleanup + rollback). Events de lifecycle.
- **Arquivos:** packages/plugin-runtime/src/lifecycle/installer.ts, activator.ts, deactivator.ts, uninstaller.ts, lifecycle-events.ts
- **Componentes:** plugin-runtime (novo)
- **Critérios:** Instalação com hooks; ativação lazy (onCommand); deactivation graceful; uninstall limpa artefatos; eventos emitidos
- **Testes:** Unitário (cada lifecycle), Integração (install → activate → deactivate → uninstall), Resiliência (falha na instalação)

#### TASK-IDEIA-504: Plugin Isolation (Sandbox with Permissions)
- **Fase:** 9 | **Dependências:** 501 | **Esforço:** 5d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Sandbox para plugins: isolate_vm (Node.js), Web Workers (browser). Permissions declarativas (file:read, file:write, network, llm, exec). Manifest validation. CPU/memory limits.
- **Arquivos:** packages/plugin-runtime/src/sandbox/node-sandbox.ts, browser-sandbox.ts, permission-manager.ts, manifest-validator.ts, resource-limiter.ts
- **Componentes:** plugin-runtime
- **Critérios:** Isolamento por VM/Worker; permissions granulares; manifest obrigatório; CPU/memory limits; violação de permissão bloqueada
- **Testes:** Unitário (permission check, sandbox isolation), Segurança (escape attempt, permission bypass), Performance (overhead < 5%)

#### TASK-IDEIA-505: OpenVSX Compatibility
- **Fase:** 9 | **Dependências:** 501 | **Esforço:** 5d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Adapter para compatibilidade com OpenVSX marketplace. VS Code extension → IDEIA plugin translator. Suporte a contribution points comuns (commands, views, language, debug).
- **Arquivos:** packages/plugin-compat/src/openvsx/adapter.ts, contribution-mapper.ts, extension-converter.ts, openvsx-api.ts
- **Componentes:** plugin-compat (novo)
- **Critérios:** OpenVSX extensions instaláveis; contribution points mapeados; 80%+ extensions comuns funcionais; translator documentado
- **Testes:** Integração (10 extensions OpenVSX → IDEIA), Compatibilidade (commands, views, languages)

#### TASK-IDEIA-506: MCP (Model Context Protocol) Integration
- **Fase:** 9 | **Dependências:** 120 | **Esforço:** 4d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Plugin API para MCP tools: qualquer plugin pode expor tools MCP. Descoberta automática, schema generation, tool execution sandboxed. Cliente MCP para tools externas no plugin.
- **Arquivos:** packages/plugin-api/src/mcp/mcp-tool.ts, schema-generator.ts, mcp-server-plugin.ts, mcp-client-plugin.ts
- **Componentes:** plugin-api, mcp
- **Critérios:** Plugin expõe MCP tool; schema gerado automaticamente; tool executa em sandbox; cliente MCP funcional
- **Testes:** Integração (plugin → MCP → execução), Segurança (sandbox na execução MCP)

#### TASK-IDEIA-507: A2A (Agent-to-Agent Protocol) Support
- **Fase:** 9 | **Dependências:** 121, 501 | **Esforço:** 4d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Plugin API para A2A: plugin pode criar agentes A2A, consumir agentes remotos, publicar agent card. Descoberta, task delegation, streaming results.
- **Arquivos:** packages/plugin-api/src/a2a/agent-card.ts, task-delegation.ts, stream-consumer.ts, discovery-plugin.ts
- **Componentes:** plugin-api, a2a
- **Critérios:** Plugin cria agente A2A; descobre agentes remotos; delega tasks; streaming de resultados; agent card público
- **Testes:** Integração (plugin A ↔ plugin B via A2A), Performance (task delegation < 1s)

#### TASK-IDEIA-508: Plugin Documentation and SDK
- **Fase:** 9 | **Dependências:** 501 | **Esforço:** 4d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** SDK completo: `npm create @ideia/plugin` template, API docs (TypeDoc), exemplos de plugin (hello-world, file-provider, custom-view, LLM provider), guia de publicação, changelog template.
- **Arquivos:** packages/plugin-sdk/, templates/plugin-hello-world/, plugin-file-provider/, plugin-custom-view/, plugin-llm-provider/, docs/PLUGIN-DEVELOPMENT.md, API-REFERENCE.md
- **Componentes:** plugin-sdk (novo)
- **Critérios:** Template funcional; 4 exemplos; TypeDoc gerado; guia de publicação; changelog template; developer experience positiva

#### TASK-IDEIA-509: Plugin Store UI
- **Fase:** 9 | **Dependências:** 502, 503 | **Esforço:** 4d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Interface de marketplace dentro da IDE: browse, search, install, update, uninstall. Ratings, reviews, screenshots. Featured, trending, categories.
- **Arquivos:** packages/web-ui/src/components/plugin-store/, PluginBrowser.tsx, PluginDetails.tsx, PluginManager.tsx, PluginSearch.tsx, hooks/usePluginStore.ts
- **Componentes:** web-ui, plugin-registry
- **Critérios:** Browse/search/install/update/uninstall; ratings + reviews; screenshots; categories; featured e trending; integração com npm registry

#### TASK-IDEIA-510: Plugin Hot-Reload Development Mode
- **Fase:** 9 | **Dependências:** 501, 503 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Modo de desenvolvimento com hot-reload: watch files, recompile on change, reload plugin sem reiniciar IDE. Error overlay. DevTools para debug de plugin.
- **Arquivos:** packages/plugin-dev/src/hot-reload.ts, watcher.ts, compiler.ts, error-overlay.ts, plugin-devtools.ts
- **Componentes:** plugin-dev (novo)
- **Critérios:** Hot-reload em < 1s; erro mostrado em overlay; DevTools funcional; não precisa reiniciar IDE
- **Testes:** E2E (edit → save → reload → funcional), Performance (reload < 1s)

#### TASK-IDEIA-511: Plugin Testing Framework
- **Fase:** 9 | **Dependências:** 501 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Framework de teste para plugins: test runner, mock API (contribution points simulados), integração sandbox, assertion helpers, coverage. `npx @ideia/plugin-test` run.
- **Arquivos:** packages/plugin-test/src/test-runner.ts, mock-api.ts, sandbox-integration.ts, assertion-helpers.ts, coverage-collector.ts
- **Componentes:** plugin-test (novo)
- **Critérios:** Test runner funcional; mock API completa; sandbox integration; assertions helpers; coverage report
- **Testes:** Testes do próprio framework (meta-testes)

#### TASK-IDEIA-512: Plugin Security Audit and Review Process
- **Fase:** 9 | **Dependências:** 504 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Alto
- **Descrição:** Processo de auditoria de segurança para plugins: manifest review, permission analysis, code scan (SAST), dependency audit, runtime behavior analysis. Automated + manual review gate.
- **Arquivos:** packages/plugin-security/src/auditor.ts, manifest-review.ts, permission-analyzer.ts, code-scan.ts, behavior-analyzer.ts, review-workflow.ts
- **Componentes:** plugin-security (novo)
- **Critérios:** Auditoria automática; manifest review; SAST scan; dependency audit; runtime analysis; review workflow documentado
- **Testes:** Segurança (plugin malicioso detectado), Performance (audit < 30s)

---

## 4. Novas Tarefas de Qualidade (+20)

**Foco:** Ampliar qualidade com mutation testing, visual regression, acessibilidade automatizada, performance k6, fuzzing, LLM evaluation, chaos engineering, SLA tracking.

---

#### QA-100: Mutation Testing Pipeline (StrykerJS)
- **Fase:** QA | **Dependências:** Nenhuma | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** StrykerJS para mutation testing: mutantes gerados, teste mata mutante, mutation score > 80% gate. CI executa em PR. Report HTML.
- **Arquivos:** stryker.config.json, .github/workflows/mutation.yml, scripts/mutation-report.sh
- **Critérios:** Mutation score > 80%; gate em PR; report HTML; CI integrado

#### QA-101: Visual Regression Testing (Percy/Chromatic)
- **Fase:** QA | **Dependências:** Fase 6 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Visual regression: Percy para páginas completas, Chromatic (Storybook) para componentes. Snapshots automáticos em PR. Diff visual com aprovação.
- **Arquivos:** .github/workflows/visual-regression.yml, .percy.yml, chromatic.config.ts, packages/web-ui/.storybook/
- **Critérios:** Snapshots em PR; diff visual detectado; aprovação manual; CI integration

#### QA-102: Accessibility Testing (axe-core, Lighthouse)
- **Fase:** QA | **Dependências:** Fase 6 | **Esforço:** 2d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Accessibility testing automatizado: axe-core em testes E2E, Lighthouse CI para páginas. Gate: < 5 violations, Lighthouse a11y > 90.
- **Arquivos:** packages/web-ui/src/test-utils/axe-runner.ts, .github/workflows/a11y.yml, lighthouserc.json
- **Critérios:** axe-core em E2E; Lighthouse CI; < 5 violations gate; report automático

#### QA-103: Performance Benchmarking (k6)
- **Fase:** QA | **Dependências:** Nenhuma | **Esforço:** 4d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** k6 para performance testing: cenários (chat streaming, file CRUD, busca, pipeline). Thresholds: p95 < 500ms, error rate < 1%. Relatório semanal.
- **Arquivos:** packages/performance/k6/scenarios/, chat-stream.js, file-crud.js, search.js, pipeline.js, thresholds.js, .github/workflows/perf-weekly.yml
- **Critérios:** 4 cenários; thresholds definidos; execução semanal; report com histórico; alerta em regressão

#### QA-104: Load Testing Scenarios (10-500 users)
- **Fase:** QA | **Dependências:** QA-103 | **Esforço:** 4d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Load testing: 10/50/100/500 usuários simultâneos. Cenários (chat, file ops, agent pipeline, NATS). Finding breaking point. Auto-scaling validation.
- **Arquivos:** packages/performance/k6/load-test/, 10-users.js, 50.js, 100.js, 500.js, breaking-point.js, .github/workflows/load-test.yml
- **Critérios:** 4 níveis de carga; breaking point identificado; auto-scaling validado; report com recomendações

#### QA-105: LLM Evaluation (RAGAS, DeepEval)
- **Fase:** QA | **Dependências:** V1 Tasks 028-037 | **Esforço:** 4d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Avaliação de LLM: RAGAS (context recall, faithfulness, answer relevancy), DeepEval (GEval, Faithfulness, Hallucination). Dataset de 100+ exemplos. Gate em PR.
- **Arquivos:** packages/evaluation/src/llm/ragas-evaluator.ts, deepeval-evaluator.ts, dataset.ts, eval-runner.ts, .github/workflows/llm-eval.yml
- **Critérios:** 100+ exemplos; RAGAS + DeepEval; PR gate por score; regressão detectada; relatório semanal

#### QA-106: Prompt Injection Testing
- **Fase:** QA | **Dependências:** V1 Task 028 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Alto
- **Descrição:** Testes automatizados de prompt injection: 200+ payloads (direct, indirect, jailbreak, multilingual, encoded). Detection rate target > 95%.
- **Arquivos:** packages/evaluation/src/prompt-injection/payloads.ts, injection-tester.ts, report.ts
- **Critérios:** 200+ payloads; detection rate > 95%; report por categoria; CI weekly; regressão alertada

#### QA-107: Fuzzing (Schemathesis)
- **Fase:** QA | **Dependências:** Nenhuma | **Esforço:** 2d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Fuzzing de APIs REST via Schemathesis: gera inputs aleatórios/edge case, detecta 500 errors, validation failures, timeout. OpenAPI spec necessário.
- **Arquivos:** packages/evaluation/src/fuzzing/schemathesis-runner.ts, api-specs/, .github/workflows/fuzzing.yml
- **Critérios:** Fuzzing semanal; zero 500 errors inesperados; validation failures detectados; report gerado

#### QA-108: Flaky Test Detection
- **Fase:** QA | **Dependências:** Nenhuma | **Esforço:** 2d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Detecção de flaky tests: rerun automático (3x) em PR, histórico de flakiness, mark test as flaky sem bloquear CI, alerta para equipe. Quarantine automático.
- **Arquivos:** packages/evaluation/src/flaky-test/detector.ts, auto-rerun.ts, quarantine-manager.ts, flaky-report.ts
- **Critérios:** Rerun 3x automático; flaky detection report; quarantine automático; histórico de flakiness

#### QA-109: Test Impact Analysis
- **Fase:** QA | **Dependências:** Nenhuma | **Esforço:** 2d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Análise de impacto: mapear arquivos → testes, executar apenas testes afetados por mudanças. Reduz tempo de CI em 60%+. Baseado em dependency graph.
- **Arquivos:** packages/evaluation/src/test-impact/impact-analyzer.ts, dependency-graph.ts, test-selector.ts, ci-integration.ts
- **Critérios:** Test selection reduz CI < 50%; dependency graph preciso; falso negativo < 1%; falso positivo < 5%

#### QA-110: Code Quality Dashboard (SonarQube)
- **Fase:** QA | **Dependências:** Nenhuma | **Esforço:** 3d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** SonarQube para qualidade de código: coverage, code smells, bugs, vulnerabilities, security hotspots. Quality Gate em PR. Histórico. SonarCloud ou self-hosted.
- **Arquivos:** sonar-project.properties, .github/workflows/sonar.yml, packages/cli/src/commands/sonar.ts
- **Critérios:** Coverage report; code smells tracked; quality gate em PR; histórico 30 dias; integration CI

#### QA-111: Security Dashboard (DefectDojo)
- **Fase:** QA | **Dependências:** 119 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** DefectDojo para consolidar findings de segurança: CodeQL, Snyk, Talisman, Red Team, Fuzzing. Import automático. Métricas: MTTR, find rate, severity distribution.
- **Arquivos:** packages/evaluation/src/security/defectdojo-importer.ts, .github/workflows/defectdojo.yml, dashboards/security-metrics.json
- **Critérios:** Findings consolidados em DefectDojo; import automático; MTTR tracking; severity distribution; dashboard

#### QA-112: SLA/SLO Tracking and Reporting
- **Fase:** QA | **Dependências:** 104 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** SLA/SLO tracking automatizado: uptime (99.9%), latência p95 (< 500ms), throughput (> 100 req/s), error rate (< 0.1%). Report mensal. Alerta em burn rate.
- **Arquivos:** packages/observability/src/slo/slo-tracker.ts, burn-rate.ts, monthly-report.ts, alert-manager.ts
- **Critérios:** 4 SLOs tracked; report mensal automático; burn rate alert; dashboard Grafana

#### QA-113: Chaos Engineering Experiments
- **Fase:** QA | **Dependências:** 107 | **Esforço:** 5d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Chaos engineering: experimentos (pod kill, network partition, CPU stress, disk full, NATS fail). Blast radius controlado. Automatic rollback. Report post-mortem.
- **Arquivos:** packages/resilience/src/chaos/experiment-runner.ts, scenarios/, pod-kill.ts, network-partition.ts, cpu-stress.ts, disk-full.ts, nats-fail.ts, blast-radius.ts
- **Componentes:** resilience
- **Critérios:** 5 cenários de caos; blast radius controlado; rollback automático; report post-mortem; execução mensal

#### QA-114: Disaster Recovery Drills
- **Fase:** QA | **Dependências:** 108 | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** DR drills automatizados: restore de backup, failover cross-region, data integrity verification. Trimestral. RTO < 1h, RPO < 15min. Report de conformidade.
- **Arquivos:** packages/resilience/src/dr/drill-runner.ts, restore-test.ts, failover-test.ts, integrity-check.ts, compliance-report.ts
- **Critérios:** RTO < 1h; RPO < 15min; drill trimestral; restore verificado; compliance report

#### QA-115: End-to-End Agent Pipeline Testing
- **Fase:** QA | **Dependências:** V1 Tasks 038-047 | **Esforço:** 4d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** E2E testing do pipeline multiagente: ideia → Analista → Arquiteto → Programador → Revisor → Testador → DevOps → entrega. Valida artefatos em cada estágio. Timeout < 15min.
- **Arquivos:** packages/e2e/src/agent-pipeline/pipeline-test.ts, artifact-validator.ts, timeout-manager.ts
- **Critérios:** Pipeline completo E2E; artefatos válidos em cada estágio; timeout < 15min; report de sucesso/falha

#### QA-116: Chat E2E Test Suite
- **Fase:** QA | **Dependências:** V1 Tasks 001-002 | **Esforço:** 2d | **Complexidade:** Média | **Risco:** Baixo
- **Descrição:** E2E de chat: streaming visível, markdown renderizado, file CRUD via chat, task execution, approval flow, cancelamento, erro recovery, multi-turn conversation.
- **Arquivos:** packages/e2e/src/chat/chat-streaming.ts, chat-file-crud.ts, chat-task.ts, chat-approval.ts, chat-cancel.ts, chat-error.ts, chat-multi-turn.ts
- **Critérios:** 8 cenários E2E; streaming visível; CRUD via chat; task execution; cancelamento funcional; erro recovery

#### QA-117: Cross-Platform Testing Matrix
- **Fase:** QA | **Dependências:** Fase 8 | **Esforço:** 4d | **Complexidade:** Alta | **Risco:** Alto
- **Descrição:** Testes cross-platform: Windows 10/11, macOS 13/14/15, Ubuntu 22.04/24.04, Fedora 40. E2E em CI matrix. Platform-specific features testadas.
- **Arquivos:** .github/workflows/cross-platform.yml, packages/e2e/src/platform/, windows-test.ts, macos-test.ts, linux-test.ts
- **Critérios:** CI matrix com 7 plataformas; E2E passando em todas; platform-specific features ok; report por plataforma

#### QA-118: Documentation Coverage Enforcer
- **Fase:** QA | **Dependências:** Nenhuma | **Esforço:** 2d | **Complexidade:** Baixa | **Risco:** Baixo
- **Descrição:** Enforcer de documentação: cada função pública deve ter JSDoc/TSDoc; cada módulo README; cada ADR documentado; breaking changes com migration guide. Gate em PR.
- **Arquivos:** packages/documentation/src/enforcer/doc-checker.ts, missing-jsdoc.ts, missing-readme.ts, missing-adr.ts
- **Critérios:** 100% funções públicas com JSDoc; 100% módulos com README; ADRs atualizados; PR gate documentation

#### QA-119: Regression Test Suite Automation
- **Fase:** QA | **Dependências:** Todas | **Esforço:** 3d | **Complexidade:** Média | **Risco:** Médio
- **Descrição:** Suite de regressão completa: todos testes unitários, integração, E2E, contract, mutation, visual, accessibility. Execução noturna. Report com diff vs baseline.
- **Arquivos:** .github/workflows/regression-nightly.yml, packages/evaluation/src/regression/regression-runner.ts, diff-reporter.ts
- **Critérios:** Todos os tipos de teste executados; report noturno; diff vs baseline; alerta em regressão

---

## 5. Roadmap Consolidado com Gantt

```
SEMANA     0  4  8  12 16 20 24 28 32 36 40 44 48 52
           │  │  │  │  │  │  │  │  │  │  │  │  │  │
FASE 0     ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (15+8 tarefas)
           │  │  │  │  │  │  │  │  │  │  │  │  │  │
FASE 1     ░░░░██████████░░░░░░░░░░░░░░░░░░░░░░░░░░  (12+6 tarefas)
           │  │  │  │  │  │  │  │  │  │  │  │  │  │
FASE 2     ░░░░░░░░██████████░░░░░░░░░░░░░░░░░░░░░░  (10+5 tarefas)
           │  │  │  │  │  │  │  │  │  │  │  │  │  │
FASE 3     ░░░░░░░░░░░░░░████████████████░░░░░░░░░░  (10+5 tarefas)
           │  │  │  │  │  │  │  │  │  │  │  │  │  │
FASE 4     ░░░░░░░░░░░░░░░░░░░░░░████████████████░░  (9+5 tarefas)
           │  │  │  │  │  │  │  │  │  │  │  │  │  │
FASE 5     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████░░░░  (11+5 tarefas)
           │  │  │  │  │  │  │  │  │  │  │  │  │  │
FASE 6     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████░░  (+15 tarefas)
           │  │  │  │  │  │  │  │  │  │  │  │  │  │
FASE 7     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████  (+12 tarefas)
           │  │  │  │  │  │  │  │  │  │  │  │  │  │
FASE 8     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██████  (+10 tarefas)
           │  │  │  │  │  │  │  │  │  │  │  │  │  │
FASE 9     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████  (+12 tarefas)
           │  │  │  │  │  │  │  │  │  │  │  │  │  │
QA         ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (22+20 QA tasks)
           │  │  │  │  │  │  │  │  │  │  │  │  │  │
MARCOS     M0 M1 M2    M3       M4    M5 M6 M7 M8 M9
```

### Dependências Simplificadas (Graph)

```
F0 ──► F1 ──► F2 ──► F3 ──► F4 ──► F5 ──► F6
                                            │
                                            ├──► F7
                                            │
                                            └──► F8 ──► F9
                                                  │
                                                  └──► QA (contínuo)
```

| Dependência | Descrição |
|:-----------:|-----------|
| F6 → F7 | UX precisa estar estável antes da colaboração visual |
| F5 → F6 | Fase 5 termina antes da Fase 6 começar (resource contention) |
| F6 → F8 | Desktop polishing depende do design system |
| F7 → F8 | Colaboração real-time é suportada, não bloqueante |
| F8 → F9 | Desktop maduro antes do ecossistema de plugins |
| QA contínuo | QA atravessa todas as fases |

---

## 6. Marcos (Milestones) V2

### M6 — UX Excellence (Semana 40)
- **Data-alvo:** Fim da Semana 40
- **Tarefas:** TASK-IDEIA-201 a 215 concluídas
- **Entregáveis:** Design system completo; WCAG AA compliant; keyboard nav; screen reader support; micro-interactions; loading/error states; NPS/SUS dashboard; time-to-task < 5s
- **QA:** QA-100 a QA-102 aprovados
- **Critério de aceite:** axe-core > 90%; Lighthouse a11y 100; NPS > 50; SUS > 68; time-to-task < 5s

### M7 — Colaboração em Tempo Real (Semana 44)
- **Data-alvo:** Fim da Semana 44
- **Tarefas:** TASK-IDEIA-301 a 312 concluídas
- **Entregáveis:** Yjs + Monaco multi-cursor; presence protocol; NATS colab events; shared blackboard; debate engine; session replay; Theia Cloud; pair programming AI
- **QA:** QA-103 a QA-105 aprovados
- **Critério de aceite:** 2+ usuários editando simultaneamente; latência < 100ms; replay fiel; pair programming funcional

### M8 — Desktop Nativo (Semana 48)
- **Data-alvo:** Fim da Semana 48
- **Tarefas:** TASK-IDEIA-401 a 410 concluídas
- **Entregáveis:** Tauri v2; Rust sidecar; auto-update; code signing; MSI/DMG/AppImage; package managers (Chocolatey/Homebrew/Scoop); platform optimizations
- **QA:** QA-106 a QA-111, QA-117 aprovados
- **Critério de aceite:** Bundle < 15MB; auto-update funcional; instaladores OK nas 3 plataformas; package managers publicados

### M9 — Ecossistema de Plugins (Semana 52)
- **Data-alvo:** Fim da Semana 52
- **Tarefas:** TASK-IDEIA-501 a 512 concluídas
- **Entregáveis:** Plugin API (7 contribution points); npm registry; lifecycle (install→uninstall); sandbox isolation; OpenVSX compat; MCP + A2A integration; SDK; Plugin Store UI
- **QA:** QA-112 a QA-119 aprovados
- **Critério de aceite:** Plugin hello-world funcional; 10 plugins publicados; OpenVSX 80% compat; sandbox seguro; SDK publicado

---

## 7. KPIs Chave

| KPI | Target | Frequência | Gate | Responsável |
|:----|:------:|:----------:|:----:|:-----------:|
| Sprint velocity | 6-8 tasks/sprint | Bi-semanal | Sprint | Tech Lead |
| Quality gate pass rate | > 95% | Por PR | PR | QA Lead |
| Test coverage | 20% → 80% | Mensal | Release | QA Lead |
| Documentation coverage | 100% | Por PR | PR | Tech Lead |
| Mutation score | > 80% | Semanal | Release | QA Lead |
| Acessibilidade (axe-core) | < 5 violations | Por PR | PR | UX Lead |
| NPS | > 50 | Mensal | Sprint | Product |
| SUS | > 68 | Mensal | Sprint | Product |
| Time-to-task | < 5s | Semanal | Release | Tech Lead |
| Latência p95 chat | < 500ms | Semanal | Release | Tech Lead |
| Detection rate (injection) | > 95% | Semanal | Release | Security Lead |
| Plugin adoption | 10+ plugins | Trimestral | Release | Product |
| Disaster Recovery RTO | < 1h | Trimestral | Release | Infra Lead |
| Disaster Recovery RPO | < 15min | Trimestral | Release | Infra Lead |
| Uptime | > 99.9% | Mensal | Release | Infra Lead |
| Cross-platform pass rate | 100% | Por PR | PR | QA Lead |

### Evolução de Cobertura por Fase

```
Cobertura %
100│                                            ┌── F9
   │                                            │
80 │                               ┌── F6 ─────┘
   │                               │
60 │                    ┌── F4 ────┤
   │                    │          │
40 │         ┌── F2 ────┤          └── F5
   │         │          │
20 │  F0 ────┤          └── F3
   │         │
0  ├─────────┴──────────────────────────────────────► Fase
   F0  F1   F2   F3   F4   F5   F6   F7   F8   F9
```

---

## 8. Matriz de Riscos V2

### Novos Riscos (Fases 6-9 + Expansões)

| ID | Risco | Prob | Impacto | Severidade | Mitigação | Contingência |
|:--:|-------|:----:|:-------:|:----------:|-----------|--------------|
| R15 | Tauri v2 não suporta feature necessária | Média | Alto | Alto | POC Tauri antes da migração; manter Electron como fallback | Manter Electron como primário, Tauri como experimental |
| R16 | Plugin sandbox pode ser bypassado | Alta | Alto | Crítico | Isolamento em múltiplas camadas (VM + OS); audit de segurança semanal | Plugins com permissão zero por padrão; aprovação manual para permissões altas |
| R17 | Yjs + Monaco performance degrada com N usuários | Média | Alto | Alto | Teste de carga com 10+ usuários; otimização CRDT; WebWorker | Limitar colaboração a 5 usuários simultâneos; fallback para lock pessimista |
| R18 | WCAG AA complexo de implementar retroativamente | Alta | Alto | Alto | Auditoria precoce; componentes com acessibilidade desde início | Priorizar critérios A primeiro; AA como stretch goal sprint |
| R19 | Code signing apple custo elevado | Média | Médio | Médio | Orçamento previsto; EV cert anual | Developer ID sem notarization (warning mas funcional) |
| R20 | Plugin marketplace moderação complexa | Média | Alto | Alto | Automated scanning + community review; policy de conteúdo | Marketplace fechado com aprovação manual inicialmente |
| R21 | OpenVSX compatibilidade parcial | Alta | Médio | Alto | Priorizar contribution points mais comuns; documentar limitações | Wrapper para VS Code extensions como fallback |
| R22 | Auto-update falha em rede corporativa | Média | Médio | Médio | Suporte a proxy; download progressivo; checksum verification | Download manual via website como fallback |
| R23 | Theia Cloud custo de infraestrutura | Alta | Alto | Alto | Auto-scaling agressivo; spot instances; caching | Limitar instâncias simultâneas; tier gratuito restrito |
| R24 | NPS/SUS coleta insuficiente | Média | Baixo | Baixo | Incentivo (feature unlock); survey não intrusivo; < 30s | Coleta trimestral via email se in-app falhar |
| R25 | Cross-platform testing matrix complexa | Alta | Alto | Alto | CI matrix com paralelismo; Docker para Linux; macOS/Windows runners dedicados | Priorizar Linux + Windows; macOS como nice-to-have |
| R26 | RLHF/DPO feedback insuficiente | Alta | Alto | Alto | Gamificação do feedback; feedback implícito (aceitar/rejeitar sugestão) | Usar preferência implícita como proxy; fine-tuning com dados sintéticos |
| R27 | Circuit breaker causa falso positivo | Média | Médio | Médio | Half-open timeout conservador; métricas de falsos positivos | Threshold ajustável por operação; override manual |
| R28 | MCP protocol muda significativamente | Média | Alto | Alto | Abstraction layer; versão específica do protocolo; testes de compatibilidade | Manter versão anterior do adapter; migração documentada |
| R29 | Sidecar Rust complexo de debugar | Alta | Alto | Alto | Logging estruturado; metrics; crash dump automático | Sidecar opcional; fallback Node.js direto |
| R30 | DSPy integration complexidade imprevisível | Alta | Alto | Alto | POC com 3 módulos primeiro; fallback para prompts manuais | Skip DSPy se complexidade > benefício; manter templates manuais |

### Heat Map de Riscos

```
Probabilidade
  Alta   │ R01 R03 R16 R21 R25 R30  │ R15 R20 R23 R26  │ R27 R29
         │                          │                  │
  Média  │ R02 R04 R06 R13 R14 R17  │ R08 R10 R19 R22  │ R05 R07 R09 R11
         │                          │                  │
  Baixa  │ R12 R24                  │ R28              │ R18
         │                          │                  │
         │       Baixo              │     Médio        │    Alto
         │                          │                  │
                               Impacto
```

**Zona Vermelha (Ação Imediata):** R01, R03, R15, R16, R20, R21, R23, R25, R26, R30
**Zona Amarela (Monitorar):** R02, R04, R06, R08, R10, R13, R14, R17, R19, R22, R27, R29
**Zona Verde (Aceitável):** R05, R07, R09, R11, R12, R18, R24, R28

---

## 9. Dependências entre Fases

### Grafo de Dependências V2

```
                  ┌──────────────────────────────────────────────┐
                  │                                              │
FASE 0 ──────────────────────────────────────────────────────┐  │
   │                                                         │  │
   ├──► FASE 1 ──► FASE 2 ──► FASE 3 ──► FASE 4 ──► FASE 5 │  │
   │                                                         │  │
   └──► (Expansões 0-E) ──► (1-E) ──► (2-E) ──► (3-E) ──► (4-E) ──► (5-E)
                                                                    │
                                                                    │
FASE 6 ───────────── FASE 7 ────────────────────────────────────────┤
   │                     │                                          │
   │                     └──► FASE 8 ──► FASE 9                    │
   │                                                                │
   └──────────────────── QA (contínuo) ◄────────────────────────────┘
```

### Tabela de Dependências

| Fase | Depende de | Bloqueante? | Observação |
|:----:|:----------:|:-----------:|------------|
| 0 | — | — | Fundação independente |
| 0-E | 0 | Sim | Expansões dependem da Fase 0 estável |
| 1 | 0 | Sim | NATS precisa de Fase 0 operacional |
| 1-E | 1 | Sim | IaC depende do barramento |
| 2 | 1 | Sim | Segurança depende de infraestrutura |
| 2-E | 2 | Não | Pode ser paralelo com Fase 2 |
| 3 | 2 | Sim | Multiagente depende de segurança |
| 3-E | 3 | Não | Expansão pode ser paralela |
| 4 | 3 | Sim | Pipeline depende de multiagente |
| 4-E | 4 | Não | Expansão pode ser paralela |
| 5 | 4 | Sim | Aprendizado depende de pipeline |
| 5-E | 5 | Não | Expansão pode ser paralela |
| 6 | 5 | Parcial | UX pode começar após Fase 5, mas ideal após Fase 5 completa |
| 7 | 6 | Sim | Colaboração precisa de design system estável |
| 8 | 6, 7 | Parcial | Desktop pode iniciar com Fase 6, mas ideal esperar Fase 7 |
| 9 | 8 | Não | Plugins podem começar antes do desktop estar completo |

---

## 10. Carga por Fase Consolidada

### Tabela de Carga V2

| Fase | Tarefas Técnicas | Tarefas QA | Total | Esforço Total (dias) | Semanas | Dev/semana |
|:----:|:----------------:|:----------:|:-----:|:--------------------:|:-------:|:----------:|
| 0 | 15 | 4 | 19 | 45d | 4 | 3.75 |
| 0-E | 8 | — | 8 | 25d | 4* | 2.0 |
| 1 | 12 | 4 | 16 | 38d | 4 | 3.0 |
| 1-E | 6 | — | 6 | 18d | 4* | 1.5 |
| 2 | 10 | 4 | 14 | 39d | 4 | 2.5 |
| 2-E | 5 | — | 5 | 18d | 4* | 1.25 |
| 3 | 10 | 4 | 14 | 49d | 8 | 1.75 |
| 3-E | 5 | — | 5 | 20d | 8* | 0.625 |
| 4 | 9 | 4 | 13 | 39d | 8 | 1.125 |
| 4-E | 5 | — | 5 | 15d | 8* | 0.625 |
| 5 | 11 | 2 | 13 | 47d | 4+8** | 0.92 |
| 5-E | 5 | — | 5 | 15d | 4* | 1.25 |
| **Sub V1** | **67** | **22** | **89** | **257d** | **40** | **~2.2** |
| 6 | 15 | — | 15 | 48d | 8 | 1.875 |
| 7 | 12 | — | 12 | 51d | 8 | 1.5 |
| 8 | 10 | — | 10 | 38d | 8 | 1.25 |
| 9 | 12 | — | 12 | 49d | 8 | 1.5 |
| **Sub Novas** | **49** | **—** | **49** | **186d** | **12**** | **~4.1** |
| QA New (100-119) | — | 20 | 20 | 58d | Contínuo | — |
| **Total V2** | **68** | **20** | **88** | **301d***** | **52+** | **~2.5** |
| **Geral (V1+V2)** | **135** | **42** | **177** | **558d** | **52+** | **~2.7** |

*\* Executadas em paralelo com a fase base*
*\*\* Fase 5 começa na Semana 29; Novas Fases 6-9 sobrepõem (Semanas 33-52)*
*\*\*\* Dias de esforço estimados, não cronológicos. Equipe paralela reduz tempo real.*

### Distribuição por Tipo de Tarefa

```
Tipo de Tarefa          Quantidade  Percentual
─────────────────────── ──────────  ──────────
Backend / Serviços           52        29%
Frontend / UI                38        21%
Infraestrutura               15         8%
Segurança                    12         7%
Qualidade / Testes           42        24%
Documentação / SDK            8         5%
DevOps / CI/CD               10         6%
─────────────────────── ──────────  ──────────
Total                       177       100%
```

### Alocação de Recursos por Fase (Estimativa)

| Fase | Devs Backend | Devs Frontend | QA | DevOps | Total |
|:----:|:------------:|:-------------:|:--:|:------:|:-----:|
| 0 + 0-E | 3 | 2 | 1 | — | 6 |
| 1 + 1-E | 3 | — | 1 | 1 | 5 |
| 2 + 2-E | 2 | 1 | 1 | — | 4 |
| 3 + 3-E | 3 | 1 | 1 | — | 5 |
| 4 + 4-E | 2 | 1 | 1 | 1 | 5 |
| 5 + 5-E | 2 | — | 1 | — | 3 |
| 6 | 1 | 3 | 1 | — | 5 |
| 7 | 2 | 2 | 1 | — | 5 |
| 8 | 2 | — | 1 | 1 | 4 |
| 9 | 3 | 1 | 1 | — | 5 |

---

## Apêndice A: Glossário de Siglas

| Sigla | Significado |
|:-----:|-------------|
| A2A | Agent-to-Agent Protocol |
| ADAPT | AI-Driven Autonomous Planning & Task decomposition |
| CRDT | Conflict-free Replicated Data Type |
| DLQ | Dead Letter Queue |
| DPO | Direct Preference Optimization |
| DR | Disaster Recovery |
| DSPy | Declarative Self-improving Python (framework de prompts) |
| IaC | Infrastructure as Code |
| KTO | Kahneman-Tversky Optimization |
| MCP | Model Context Protocol |
| MAD | Multi-Agent Debate |
| NPS | Net Promoter Score |
| OT | Operational Transformation |
| POC | Proof of Concept |
| QLoRA | Quantized Low-Rank Adaptation |
| RLHF | Reinforcement Learning from Human Feedback |
| RPO | Recovery Point Objective |
| RTO | Recovery Time Objective |
| SAST | Static Application Security Testing |
| SBOM | Software Bill of Materials |
| SCA | Software Composition Analysis |
| SLO | Service Level Objective |
| SUS | System Usability Scale |
| WCAG | Web Content Accessibility Guidelines |

---

## Apêndice B: Estudos Relacionados

Este V2 é informado pelos seguintes estudos:

| Estudo | Arquivo | Fases Relacionadas |
|--------|---------|:------------------:|
| UX e Experiência | `docs/ESTUDOS/ESTUDO-UX-EXPERIENCIA-USUARIO.md` | 6 |
| Colaboração Tempo Real | `docs/ESTUDOS/ESTUDO-COLABORACAO-TEMPO-REAL.md` | 7 |
| Desktop Nativo | `docs/ESTUDOS/ESTUDO-DESKTOP-NATIVE.md` | 8 |
| Ecossistema Plugins | `docs/ESTUDOS/ESTUDO-PLUGINS-ECOSSISTEMA.md` | 9 |
| Infraestrutura Cloud | `docs/ESTUDOS/ESTUDO-CLOUD-INFRAESTRUTURA.md` | 0-E, 1-E |
| Observabilidade | `docs/ESTUDOS/ESTUDO-OBSERVABILIDADE-FULLSTACK.md` | 0-E |
| Performance e Escalabilidade | `docs/ESTUDOS/ESTUDO-PERFORMANCE-ESCALABILIDADE.md` | QA |
| Testes e Qualidade | `docs/ESTUDOS/ESTUDO-TESTES-QUALIDADE-AUTOMATIZADA.md` | QA |
| Deploy e Entrega Contínua | `docs/ESTUDOS/ESTUDO-DEPLOY-ENTREGA-CONTINUA.md` | 4-E |
| Engenharia de Prompts | `docs/ESTUDOS/ESTUDO-ENGENHARIA-PROMPTS-AGENTES.md` | 3-E |
| AI Safety & Alignment | `docs/ESTUDOS/ESTUDO-AI-SAFETY-ALIGNMENT.md` | 2-E |
| Autenticação e Autorização | `docs/ESTUDOS/ESTUDO-AUTENTICACAO-AUTORIZACAO.md` | 2-E |

---

> **Documento mantido por:** Equipe IDEIA
> **Próxima revisão:** 2026-08-18
> **Status:** ✅ Aprovado
