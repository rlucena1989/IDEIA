# Plano de Implementação Detalhado — IDEIA V2

> **10 fases, 115 tarefas**
> Versão expandida com infraestrutura, observabilidade e AI Safety
> **Ecosystema atual:** 100+ packages, 29 referenciados neste plano

---

## Fase 1 — Barramento NATS JetStream

**Objetivo:** Substituir EventBus in-memory por NATS JetStream

### Tarefas (mesmas do V1 + adicionais)

| #    | Tarefa                                  | Arquivos                                    | Prioridade |
| ---- | --------------------------------------- | ------------------------------------------- | ---------- |
| 1.1  | Instalar NATS server + JetStream client | `packages/event-bus/package.json`           | 🔴         |
| 1.2  | NATS connection manager                 | `packages/event-bus/src/nats-connection.ts` | 🔴         |
| 1.3  | Migrar EventBus.getBus()                | `packages/event-bus/src/event-bus.ts`       | 🔴         |
| 1.4  | Streams persistentes (16 tipos)         | `packages/event-bus/src/streams.ts`         | 🔴         |
| 1.5  | DLQ (dead letter queue)                 | `packages/event-bus/src/dlq.ts`             | 🟠         |
| 1.6  | Consumer groups                         | `packages/event-bus/src/consumers.ts`       | 🟠         |
| 1.7  | Key-Value store via NATS KV             | `packages/event-bus/src/kv-store.ts`        | 🟠         |
| 1.8  | Object store via NATS                   | `packages/event-bus/src/object-store.ts`    | 🟡         |
| 1.9  | Request-Reply pattern                   | `packages/event-bus/src/req-reply.ts`       | 🟡         |
| 1.10 | Migrar publishers legados               | 15+ arquivos                                | 🔴         |
| 1.11 | Testes de integração                    | `packages/event-bus/__tests__/nats.test.ts` | 🔴         |
| 1.12 | Docker Compose                          | `docker/nats/docker-compose.yml`            | 🔴         |
| 1.13 | Health check endpoint                   | `packages/event-bus/src/health.ts`          | 🟢         |

---

## Fase 2 — Orquestração Multiagente LangGraph

**Objetivo:** AgentRuntime sequencial → LangGraph StateGraph

| #    | Tarefa                                         | Arquivos                                            | Prioridade |
| ---- | ---------------------------------------------- | --------------------------------------------------- | ---------- |
| 2.1  | Instalar LangGraph                             | `packages/agent-runtime/package.json`               | 🔴         |
| 2.2  | Grafo base do pipeline                         | `packages/agent-runtime/src/langgraph-graph.ts`     | 🔴         |
| 2.3  | Nós Analyst → Supervisor como StateGraph nodes | `packages/agent-runtime/src/nodes/`                 | 🔴         |
| 2.4  | Edge conditions                                | `packages/agent-runtime/src/edges.ts`               | 🔴         |
| 2.5  | Paralelismo reviewer/tester                    | `packages/agent-runtime/src/parallel.ts`            | 🟠         |
| 2.6  | Checkpointing                                  | `packages/agent-runtime/src/checkpoint.ts`          | 🟠         |
| 2.7  | Timeout/retry por nó                           | `packages/agent-runtime/src/nodes/node-base.ts`     | 🟠         |
| 2.8  | Sub-grafos (analisa → planeja → executa)       | `packages/agent-runtime/src/subgraphs/`             | 🟡         |
| 2.9  | Agentes customizados via YAML                  | `packages/agent-runtime/src/custom-agent-loader.ts` | 🟡         |
| 2.10 | Remover AgentGraph legado                      | `packages/agent-runtime/src/agent-graph.ts`         | 🟠         |
| 2.11 | Migrar testes                                  | `packages/agent-runtime/__tests__/`                 | 🔴         |
| 2.12 | Exemplos de grafos                             | `packages/agent-runtime/examples/`                  | 🟢         |

---

## Fase 3 — Deploy e GitOps

**Objetivo:** Pipeline de entrega automatizada

| #    | Tarefa                                  | Arquivos                                              | Prioridade |
| ---- | --------------------------------------- | ----------------------------------------------------- | ---------- |
| 3.1  | VerificationLayer no pipeline           | `packages/verification-layer/src/integration.ts`      | 🔴         |
| 3.2  | DeliveryOrchestrator com stages         | `packages/delivery-orchestrator/src/orchestrator.ts`  | 🔴         |
| 3.3  | Rollout progressivo (canary 10/50/100%) | `packages/delivery-orchestrator/src/canary.ts`        | 🟠         |
| 3.4  | Rollback automático                     | `packages/delivery-orchestrator/src/rollback.ts`      | 🔴         |
| 3.5  | Webhook CI/CD                           | `packages/delivery-orchestrator/src/webhook.ts`       | 🟠         |
| 3.6  | CLI commands                            | `packages/cli/src/commands/delivery*.ts`              | 🔴         |
| 3.7  | GitHub Actions workflow                 | `.github/workflows/deploy.yml`                        | 🟠         |
| 3.8  | GitOps sync                             | `packages/delivery-orchestrator/src/gitops.ts`        | 🟠         |
| 3.9  | Métricas de deploy                      | `packages/delivery-orchestrator/src/metrics.ts`       | 🟡         |
| 3.10 | Rollback automático por health check    | `packages/delivery-orchestrator/src/auto-rollback.ts` | 🟡         |
| 3.11 | Slack/email notifications               | `packages/delivery-orchestrator/src/notifications.ts` | 🟢         |
| 3.12 | Testes de integração                    | `packages/delivery-orchestrator/__tests__/`           | 🔴         |
| 3.13 | Documentação                            | `docs/user/delivery-pipeline.md`                      | 🟢         |

---

## Fase 4 — Data Layer PostgreSQL + pgvector

**Objetivo:** SQLite → PostgreSQL com busca vetorial

| #    | Tarefa                      | Arquivos                                                | Prioridade |
| ---- | --------------------------- | ------------------------------------------------------- | ---------- |
| 4.1  | Instalar pg + pgvector      | `packages/data-layer/package.json`                      | 🔴         |
| 4.2  | Schema as Code (Zod → DDL)  | `packages/data-layer/src/schema.ts`                     | 🔴         |
| 4.3  | Migration runner            | `packages/data-layer/src/migrate.ts`                    | 🔴         |
| 4.4  | Repositórios CRUD           | `packages/data-layer/src/repositories/`                 | 🔴         |
| 4.5  | Embedding search (pgvector) | `packages/data-layer/src/vector-search.ts`              | 🔴         |
| 4.6  | Migrar MemoryStore          | `packages/memory-store/src/postgres-adapter.ts`         | 🔴         |
| 4.7  | Migrar AuditTrail           | `packages/audit-trail/src/postgres-adapter.ts`          | 🔴         |
| 4.8  | Connection pool             | `packages/data-layer/src/connection.ts`                 | 🔴         |
| 4.9  | Backup automático (pg_dump) | `packages/data-layer/src/backup.ts`                     | 🟠         |
| 4.10 | Read replicas               | `packages/data-layer/src/replicas.ts`                   | 🟡         |
| 4.11 | Migrar DecisionCache        | `packages/data-layer/src/repositories/decision-repo.ts` | 🟠         |
| 4.12 | Docker Compose              | `docker/postgres/docker-compose.yml`                    | 🔴         |
| 4.13 | Testes com testcontainers   | `packages/data-layer/__tests__/`                        | 🔴         |
| 4.14 | Benchmark vs SQLite         | `docs/benchmarks/postgres-vs-sqlite.md`                 | 🟢         |

---

## Fase 5 — Desktop Nativo

**Objetivo:** Aplicação desktop com instalador e auto-update

| #    | Tarefa                    | Arquivos                                | Prioridade |
| ---- | ------------------------- | --------------------------------------- | ---------- |
| 5.1  | Avaliar Electron vs Tauri | `docs/ESTUDOS/ESTUDO-DESKTOP-NATIVE.md` | 🟠         |
| 5.2  | Auto-updater              | `electron/src/updater.ts`               | 🔴         |
| 5.3  | Instalador NSIS           | `electron/electron-builder.yml`         | 🔴         |
| 5.4  | Tray icon                 | `electron/src/tray.ts`                  | 🟠         |
| 5.5  | Deep links                | `electron/src/deeplink.ts`              | 🟡         |
| 5.6  | Minimizar para tray       | `electron/src/main.ts`                  | 🟢         |
| 5.7  | Notificações nativas      | `electron/src/notifications.ts`         | 🟠         |
| 5.8  | Menu contextual           | `electron/src/menu.ts`                  | 🟢         |
| 5.9  | Build cross-platform      | `scripts/build-all-platforms.js`        | 🔴         |
| 5.10 | Testes de instalação      | `electron/__tests__/installer.test.ts`  | 🟠         |
| 5.11 | Code signing              | `electron/code-sign.ts`                 | 🟠         |

---

## Fase 6 — Segurança e Governança

**Objetivo:** Cedar policies, red teaming, compliance

| #    | Tarefa                         | Arquivos                                                | Prioridade |
| ---- | ------------------------------ | ------------------------------------------------------- | ---------- |
| 6.1  | Cedar adapter                  | `packages/policy-engine/src/cedar-adapter.ts`           | 🔴         |
| 6.2  | 5+ Cedar policies              | `policies/*.cedar.json`                                 | 🟠         |
| 6.3  | Migrar PolicyEngine            | `packages/policy-engine/src/policy-engine.ts`           | 🔴         |
| 6.4  | Auditoria de policies          | `packages/policy-engine/src/audit-policies.ts`          | 🟠         |
| 6.5  | Red teaming (OWASP LLM Top 10) | `scripts/red-teaming.js`                                | 🔴         |
| 6.6  | Output validation avançado     | `packages/cli/src/hardening/output-validator.ts`        | 🔴         |
| 6.7  | Compliance (LGPD, HIPAA)       | `packages/policy-engine/src/compliance.ts`              | 🟠         |
| 6.8  | Security dashboard widget      | `packages/ideia-plugin/src/browser/security-widget.tsx` | 🟡         |
| 6.9  | Pentest automatizado           | `scripts/security-pentest.js`                           | 🟠         |
| 6.10 | Secrets scanning               | `packages/cli/src/hardening/secrets-scanner.ts`         | 🟠         |
| 6.11 | SBOM generation                | `scripts/sbom.js`                                       | 🟡         |
| 6.12 | Documentação                   | `docs/user/security.md`                                 | 🟢         |

---

## Fase 7 — Performance e Escalabilidade

**Objetivo:** Benchmarks, otimização e carga

| #    | Tarefa                                | Arquivos                                | Prioridade |
| ---- | ------------------------------------- | --------------------------------------- | ---------- |
| 7.1  | Benchmark suite (TTFT, TPS, memória)  | `packages/cli/benchmarks/`              | 🔴         |
| 7.2  | Load test com k6                      | `scripts/k6/`                           | 🔴         |
| 7.3  | Cache layer (Redis ou NATS KV)        | `packages/cache/`                       | 🟠         |
| 7.4  | Streaming optimization (backpressure) | `packages/cli/src/streaming/`           | 🟠         |
| 7.5  | Bundle size optimization              | `apps/ideia-app/esbuild.mjs`            | 🟡         |
| 7.6  | Lazy loading de widgets               | `packages/ideia-plugin/src/browser/`    | 🟡         |
| 7.7  | Memory profiling                      | `scripts/memory-profile.js`             | 🟠         |
| 7.8  | Database query optimization           | `packages/data-layer/src/repositories/` | 🟠         |
| 7.9  | Connection pooling tuning             | `packages/data-layer/src/connection.ts` | 🟢         |
| 7.10 | CDN para assets estáticos             | `scripts/deploy-cdn.js`                 | 🟢         |

---

## Fase 8 — Observabilidade Full-Stack

**Objetivo:** Tracing, métricas, logging estruturado

| #    | Tarefa                                  | Arquivos                                             | Prioridade |
| ---- | --------------------------------------- | ---------------------------------------------------- | ---------- |
| 8.1  | OpenTelemetry setup                     | `packages/telemetry/src/opentelemetry.ts`            | 🔴         |
| 8.2  | Distributed tracing (NATS → Agent → DB) | `packages/telemetry/src/tracing.ts`                  | 🔴         |
| 8.3  | Métricas (prometheus)                   | `packages/telemetry/src/metrics.ts`                  | 🔴         |
| 8.4  | Logging estruturado (structured JSON)   | `packages/logger/src/structured-logger.ts`           | 🔴         |
| 8.5  | Grafana dashboard                       | `docker/grafana/dashboards/ideia-dashboard.json`     | 🟠         |
| 8.6  | Alertas (CPU >80%, erro >5%)            | `docker/alertmanager/config.yml`                     | 🟠         |
| 8.7  | Health check aggregator                 | `packages/telemetry/src/health.ts`                   | 🟠         |
| 8.8  | SLA/SLO tracking                        | `packages/telemetry/src/slo.ts`                      | 🟡         |
| 8.9  | Audit log viewer                        | `packages/ideia-plugin/src/browser/audit-widget.tsx` | 🟡         |
| 8.10 | Docker Compose monitoring stack         | `docker/monitoring/docker-compose.yml`               | 🟠         |

---

## Fase 9 — AI Safety e Alignment

**Objetivo:** Garantias de segurança e alinhamento de IA

| #    | Tarefa                                             | Arquivos                                           | Prioridade |
| ---- | -------------------------------------------------- | -------------------------------------------------- | ---------- |
| 9.1  | Output validator com jailbreak detection           | `packages/cli/src/hardening/jailbreak-detector.ts` | 🔴         |
| 9.2  | Prompt guard (injection prevention)                | `packages/cli/src/guardrails/prompt-guard.ts`      | 🔴         |
| 9.3  | Content policy filter                              | `packages/cli/src/guardrails/content-filter.ts`    | 🔴         |
| 9.4  | Model router com safety score                      | `packages/llm-provider/src/safety-router.ts`       | 🟠         |
| 9.5  | Human-in-the-loop obrigatório para ações críticas  | `packages/agent-runtime/src/human-loop.ts`         | 🟠         |
| 9.6  | Audit chain para decisões de IA                    | `packages/audit-trail/src/ai-decisions.ts`         | 🟠         |
| 9.7  | Bias detection em outputs                          | `packages/cli/src/hardening/bias-detector.ts`      | 🟡         |
| 9.8  | Rate limiting por usuário/modelo                   | `packages/cli/src/middleware/rate-limit.ts`        | 🟠         |
| 9.9  | Testes de alinhamento (reward hacking, sycophancy) | `scripts/alignment-tests.js`                       | 🟡         |
| 9.10 | Documentação AI Safety                             | `docs/user/ai-safety.md`                           | 🟢         |

---

## Fase 10 — Documentação e Onboarding

**Objetivo:** Documentação completa, exemplos e onboarding

| #     | Tarefa                      | Arquivos                        | Prioridade |
| ----- | --------------------------- | ------------------------------- | ---------- |
| 10.1  | README principal atualizado | `README.md`                     | 🔴         |
| 10.2  | Guia de instalação          | `docs/user/instalacao.md`       | 🔴         |
| 10.3  | Guia de primeiros passos    | `docs/user/primeiros-passos.md` | 🔴         |
| 10.4  | API Reference               | `docs/user/api-reference/`      | 🟠         |
| 10.5  | Exemplos de uso             | `examples/`                     | 🟠         |
| 10.6  | Guia de contribuição        | `CONTRIBUTING.md`               | 🟢         |
| 10.7  | Arquitetura (C4 diagrams)   | `docs/architecture/`            | 🟠         |
| 10.8  | Troubleshooting guide       | `docs/user/troubleshooting.md`  | 🟢         |
| 10.9  | Video demo script           | `docs/marketing/demo-script.md` | 🟢         |
| 10.10 | Website / landing page      | `site/` (repo separado)         | 🟢         |

---

## Matriz de Dependências

```
Fase 1 (NATS) ──────────────────────────────────────┐
                                                     │
Fase 2 (LangGraph) ──────────────────────────────┐   │
                                                 │   │
Fase 3 (Deploy/GitOps) ←────── F2 ──────────────┤   │
                                                 │   │
Fase 4 (PostgreSQL) ←────────── F1 ──────────────┼───┤
                                                 │   │
Fase 5 (Desktop) ────────────────────────────────┤   │
                                                 │   │
Fase 6 (Segurança) ←──────────── F1, F4 ─────────┘   │
                                                      │
Fase 7 (Performance) ←───── F1, F2, F4, F5 ──────────┤
                                                      │
Fase 8 (Observabilidade) ←── F1, F4 ─────────────────┤
                                                      │
Fase 9 (AI Safety) ←──── F2, F3, F6 ─────────────────┤
                                                      │
Fase 10 (Docs) ←─────── F1-F9 ───────────────────────┘
```

---

## Timeline Estimada

| Fase                 | Dias | Complexidade  | Riscos                    | Pode paralelizar com |
| -------------------- | ---- | ------------- | ------------------------- | -------------------- |
| F1 — NATS            | 5    | 🔴 Muito Alta | Quebra de compatibilidade | —                    |
| F2 — LangGraph       | 5    | 🔴 Muito Alta | Mudança de arquitetura    | —                    |
| F3 — Deploy/GitOps   | 4    | 🟠 Alta       | Integração externa        | —                    |
| F4 — PostgreSQL      | 5    | 🔴 Muito Alta | Migração de dados         | —                    |
| F5 — Desktop         | 4    | 🟠 Alta       | Build cross-platform      | —                    |
| F6 — Segurança       | 4    | 🟠 Alta       | Falsos positivos          | F5                   |
| F7 — Performance     | 3    | 🟡 Média      | Nanotimizações            | F5, F6               |
| F8 — Observabilidade | 3    | 🟡 Média      | Stack complexa            | F7                   |
| F9 — AI Safety       | 3    | 🟠 Alta       | Subjetividade             | F8                   |
| F10 — Docs           | 2    | 🟢 Baixa      | Nenhum                    | F9                   |

**Total estimado:** 38 dias úteis (~8 semanas)

---

## Métricas de Sucesso (pós-implementação)

| Métrica                   | Atual      | Alvo v1.0 | Fase |
| ------------------------- | ---------- | --------- | ---- |
| Linter + Typecheck        | ✅ (0 err) | ✅        | —    |
| Testes unitários passando | ~4350      | 100%      | F7   |
| Packages totais           | 100        | —         | —    |
| Packages compiláveis      | 100/100    | 100%      | —    |
| Cobertura de código       | ~30%       | 80%       | F7   |
| Latência TTFT             | <500ms     | <500ms    | F7   |
| Throughput mensagens/s    | >1000/s    | >1000/s   | F1   |
| NPS                       | —          | ≥75       | F10  |
| Segurança (OWASP)         | ~70/100    | 90/100    | F6   |
| Build time                | ~3min      | <2min     | F7   |

---

> **Documento gerado em 2026-07-20.**  
> **Última atualização:** 2026-07-22  
> **Status:** F1 ✅ · F2 ✅ · F3 ✅ · F4 ✅ · F5 ✅ · F6 ✅ · F7 ✅ · F8 ✅ · F9 ✅ · F10 ✅  
> **Projeto completo — 10 fases finalizadas.**  
> **Total de packages:** 100+ (29 diretos deste plano + 14 adicionais + 57+ complementares)
> 
> ---
> 
> ### Pacotes Adicionais (pós-F10)
> 
> Estes 14 packages foram criados após a conclusão das 10 fases principais, expandindo o ecossistema:
> 
> | Package | Função | Testes |
> |---------|--------|--------|
> | `@ideia/prompt-economy` | Economia de tokens — ContextCompressor, BudgetTracker, LLMCache, EarlyExitDecider | 38 |
> | `@ideia/context-builder` | Construção de contexto inteligente | — |
> | `@ideia/planning-engine` | Motor de planejamento avançado | — |
> | `@ideia/agent-router` | Roteamento de agentes por especialidade | — |
> | `@ideia/memory-hierarchy` | Hierarquia de memória (curto/médio/longo prazo) | — |
> | `@ideia/quality-gates` | Portões de qualidade automatizados | — |
> | `@ideia/risk-approval` | Aprovação baseada em risco | — |
> | `@ideia/checkpoint-engine` | Engine de checkpoints com rollback | — |
> | `@ideia/supply-chain` | Cadeia de suprimentos de dependências | — |
> | `@ideia/capability-matcher` | Matching semântico de capacidades | — |
> | `@ideia/capability-registry` | Registro de capacidades do sistema | — |
> | `@ideia/progressive-disclosure` | Revelação progressiva de funcionalidades | — |
> | `@ideia/tutorial-system` | Sistema interativo de tutoriais (engine + registry + tracker + renderer) | — |
> | `@ideia/cli` (integrado) | 6 tutoriais, comandos de self-awareness, catalog | 177+ novos |
