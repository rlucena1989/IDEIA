# Plano de Implementação Detalhado — IDEIA

> **6 fases, ~110 tarefas**
> Versão 1 — Plano original de implementação

---

## Fase 1 — Barramento NATS JetStream

**Objetivo:** Substituir EventBus in-memory por NATS JetStream (pub/sub, req/rep, KV, DLQ)

### Tarefas

| #    | Tarefa                                                     | Arquivos                                    | Esforço |
| ---- | ---------------------------------------------------------- | ------------------------------------------- | ------- |
| 1.1  | Instalar NATS server + JetStream client                    | `packages/event-bus/package.json`           | 1h      |
| 1.2  | Criar NATS connection manager (conexão, reconexão, health) | `packages/event-bus/src/nats-connection.ts` | 3h      |
| 1.3  | Migrar EventBus.getBus() para NATS JetStream               | `packages/event-bus/src/event-bus.ts`       | 4h      |
| 1.4  | Implementar streams persistentes (16 tipos de evento)      | `packages/event-bus/src/streams.ts`         | 3h      |
| 1.5  | Implementar DLQ (dead letter queue)                        | `packages/event-bus/src/dlq.ts`             | 2h      |
| 1.6  | Adicionar consumer groups                                  | `packages/event-bus/src/consumers.ts`       | 2h      |
| 1.7  | Migrar todos os publishers/consumers do projeto            | 15+ arquivos em `packages/*/src/`           | 8h      |
| 1.8  | Adicionar testes de integração NATS                        | `packages/event-bus/__tests__/nats.test.ts` | 4h      |
| 1.9  | Health check endpoint                                      | `packages/event-bus/src/health.ts`          | 1h      |
| 1.10 | Docker Compose para NATS dev                               | `docker/nats/docker-compose.yml`            | 1h      |

### Critérios de Verificação

- `docker compose up -d` inicia NATS
- Todos os 16 tipos de evento trafegam via JetStream
- Consumer groups funcionam com entrega at-least-once
- DLQ captura mensagens com falha após 3 retries
- Testes de integração passam

---

## Fase 2 — Orquestração Multiagente LangGraph

**Objetivo:** Substituir AgentRuntime sequencial por LangGraph com grafos direcionados

### Tarefas

| #    | Tarefa                                                                                        | Arquivos                                              | Esforço |
| ---- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| 2.1  | Instalar LangGraph + dependências                                                             | `packages/agent-runtime/package.json`                 | 1h      |
| 2.2  | Criar grafo base do pipeline (analyst→architect→programmer→reviewer→tester→devops→supervisor) | `packages/agent-runtime/src/langgraph-graph.ts`       | 4h      |
| 2.3  | Implementar nós como StateGraph nodes                                                         | `packages/agent-runtime/src/nodes/`                   | 6h      |
| 2.4  | Implementar edge conditions com base em erros                                                 | `packages/agent-runtime/src/edges.ts`                 | 3h      |
| 2.5  | Adicionar paralelismo (reviewer + tester simultâneos)                                         | `packages/agent-runtime/src/parallel.ts`              | 3h      |
| 2.6  | Checkpointing com memória entre execuções                                                     | `packages/agent-runtime/src/checkpoint.ts`            | 3h      |
| 2.7  | Timeout e retry por nó                                                                        | `packages/agent-runtime/src/nodes/node-base.ts`       | 2h      |
| 2.8  | Remover AgentGraph legado                                                                     | `packages/agent-runtime/src/agent-graph.ts` (deletar) | 1h      |
| 2.9  | Migrar testes                                                                                 | `packages/agent-runtime/__tests__/`                   | 4h      |
| 2.10 | Exemplos de grafos customizados                                                               | `packages/agent-runtime/examples/`                    | 2h      |

### Critérios de Verificação

- Grafo executa pipeline completo analyst→supervisor
- Paralerismo funcional (review + test simultâneos)
- Checkpoint persiste estado entre execuções
- Timeout/retry por nó individual
- Testes 100% passando

---

## Fase 3 — Deploy e GitOps

**Objetivo:** Pipeline de entrega automatizada com validação, rollout e rollback

### Tarefas

| #    | Tarefa                                                                 | Arquivos                                             | Esforço |
| ---- | ---------------------------------------------------------------------- | ---------------------------------------------------- | ------- |
| 3.1  | Integrar VerificationLayer no pipeline                                 | `packages/verification-layer/src/integration.ts`     | 3h      |
| 3.2  | Criar DeliveryOrchestrator com stages                                  | `packages/delivery-orchestrator/src/orchestrator.ts` | 4h      |
| 3.3  | Rollout progressivo (canary)                                           | `packages/delivery-orchestrator/src/canary.ts`       | 3h      |
| 3.4  | Rollback automático                                                    | `packages/delivery-orchestrator/src/rollback.ts`     | 2h      |
| 3.5  | Webhook para CI/CD externo                                             | `packages/delivery-orchestrator/src/webhook.ts`      | 2h      |
| 3.6  | CLI commands: `delivery start`, `delivery status`, `delivery rollback` | `packages/cli/src/commands/delivery*.ts`             | 4h      |
| 3.7  | GitHub Actions workflow template                                       | `.github/workflows/deploy.yml`                       | 2h      |
| 3.8  | GitOps sync com Git repository                                         | `packages/delivery-orchestrator/src/gitops.ts`       | 4h      |
| 3.9  | Testes de integração                                                   | `packages/delivery-orchestrator/__tests__/`          | 4h      |
| 3.10 | Documentação do pipeline                                               | `docs/user/delivery-pipeline.md`                     | 2h      |

### Critérios de Verificação

- Pipeline executa verification → build → canary → rollout
- Rollback automático em caso de falha >5%
- CLI commands funcionais
- Webhook integra com GitHub Actions
- Canary deploy com 10/50/100% progressivo

---

## Fase 4 — Data Layer PostgreSQL + pgvector

**Objetivo:** Substituir SQLite por PostgreSQL com suporte a vetores (embeddings)

### Tarefas

| #    | Tarefa                                                  | Arquivos                                        | Esforço |
| ---- | ------------------------------------------------------- | ----------------------------------------------- | ------- |
| 4.1  | Instalar pg + pgvector client                           | `packages/data-layer/package.json`              | 1h      |
| 4.2  | Schema as Code (Zod → SQL DDL)                          | `packages/data-layer/src/schema.ts`             | 4h      |
| 4.3  | Migration runner                                        | `packages/data-layer/src/migrate.ts`            | 3h      |
| 4.4  | Repositórios (MemoryRecord, AuditEntry, Decision, etc.) | `packages/data-layer/src/repositories/`         | 6h      |
| 4.5  | Embedding search com pgvector (similaridade coseno)     | `packages/data-layer/src/vector-search.ts`      | 3h      |
| 4.6  | Migrar MemoryStore de JSON file para PostgreSQL         | `packages/memory-store/src/postgres-adapter.ts` | 4h      |
| 4.7  | Migrar AuditTrail para PostgreSQL                       | `packages/audit-trail/src/postgres-adapter.ts`  | 3h      |
| 4.8  | Connection pool + health check                          | `packages/data-layer/src/connection.ts`         | 2h      |
| 4.9  | Docker Compose para PostgreSQL dev                      | `docker/postgres/docker-compose.yml`            | 1h      |
| 4.10 | Testes de integração com testcontainers                 | `packages/data-layer/__tests__/`                | 4h      |

### Critérios de Verificação

- PostgreSQL inicia via Docker Compose
- Migrations criam schema automaticamente
- CRUD funcional para todas as entidades
- pgvector search com similaridade > 0.9
- MemoryStore e AuditTrail migrados
- Connection pool com max 20 conexões

---

## Fase 5 — Desktop Nativo (Tauri/Electron)

**Objetivo:** Aplicação desktop completa com instalador, atualização automática e performance nativa

### Tarefas

| #    | Tarefa                                   | Arquivos                                | Esforço |
| ---- | ---------------------------------------- | --------------------------------------- | ------- |
| 5.1  | Avaliar Tauri vs Electron vs Theia Cloud | `docs/ESTUDOS/ESTUDO-DESKTOP-NATIVE.md` | 2h      |
| 5.2  | Implementar auto-updater                 | `electron/src/updater.ts`               | 3h      |
| 5.3  | Instalador NSIS completo                 | `electron/electron-builder.yml`         | 3h      |
| 5.4  | Tray icon com comandos rápidos           | `electron/src/tray.ts`                  | 2h      |
| 5.5  | Deep links (ideia://)                    | `electron/src/deeplink.ts`              | 2h      |
| 5.6  | Minimizar para tray                      | `electron/src/main.ts`                  | 1h      |
| 5.7  | Notificações nativas                     | `electron/src/notifications.ts`         | 2h      |
| 5.8  | Menu contextual nativo                   | `electron/src/menu.ts`                  | 2h      |
| 5.9  | Build cross-platform script              | `scripts/build-all-platforms.js`        | 3h      |
| 5.10 | Testes de instalação/desinstalação       | `electron/__tests__/installer.test.ts`  | 3h      |

### Critérios de Verificação

- Instalador gera .exe funcional
- Auto-updater baixa e instala atualizações
- Tray icon com menu funcional
- Deep links abrem na instância correta
- Build em Windows + Linux

---

## Fase 6 — Segurança e Governança

**Objetivo:** Implementar Cedar policies, red teaming automatizado e compliance

### Tarefas

| #    | Tarefa                                               | Arquivos                                                | Esforço |
| ---- | ---------------------------------------------------- | ------------------------------------------------------- | ------- |
| 6.1  | Integrar Cedar policy engine                         | `packages/policy-engine/src/cedar-adapter.ts`           | 4h      |
| 6.2  | Criar 15+ policies (acesso, deploy, dados)           | `policies/*.cedar`                                      | 3h      |
| 6.3  | Migrar PolicyEngine de regex para Cedar              | `packages/policy-engine/src/policy-engine.ts`           | 4h      |
| 6.4  | Auditoria automática de policies                     | `packages/policy-engine/src/audit-policies.ts`          | 2h      |
| 6.5  | Red teaming automatizado (OWASP LLM Top 10)          | `scripts/red-teaming.js`                                | 4h      |
| 6.6  | Output validation avançado (PII, SQL injection, XSS) | `packages/cli/src/hardening/output-validator.ts`        | 3h      |
| 6.7  | Compliance check (LGPD, HIPAA)                       | `packages/policy-engine/src/compliance.ts`              | 3h      |
| 6.8  | Security report dashboard                            | `packages/ideia-plugin/src/browser/security-widget.tsx` | 4h      |
| 6.9  | Testes de penetração automatizados                   | `scripts/security-pentest.js`                           | 4h      |
| 6.10 | Documentação de segurança                            | `docs/user/security.md`                                 | 2h      |

### Critérios de Verificação

- Cedar policies avaliam corretamente (allow/deny)
- PolicyEngine migrado com fallback para regex
- Red teaming detecta todas as 10 categorias OWASP LLM
- Compliance check para LGPD
- Security report exibe score

---

## Resumo de Esforço

| Fase               | Tarefas | Esforço Estimado | Depende de |
| ------------------ | ------- | ---------------- | ---------- |
| F1 — NATS          | 10      | ~29h             | —          |
| F2 — LangGraph     | 10      | ~29h             | —          |
| F3 — Deploy/GitOps | 10      | ~30h             | F1, F2     |
| F4 — PostgreSQL    | 10      | ~31h             | F1         |
| F5 — Desktop       | 10      | ~23h             | —          |
| F6 — Segurança     | 10      | ~33h             | F1, F4     |
| **Total**          | **60**  | **~175h**        |            |

---

## Glossário de Prioridades

- 🔴 **Crítico** — Bloqueia release. Deve ser resolvido antes do próximo deploy.
- 🟠 **Alto** — Bloqueia MVP. Deve ser resolvido antes da próxima sprint.
- 🟡 **Médio** — Bloqueia próxima fase. Pode aguardar a sprint seguinte.
- 🟢 **Baixo** — Melhoria contínua. Pode ser agendado livremente.

> **Documento gerado em 2026-07-20.**  
> **Próxima atualização:** Ao final de cada fase concluída.
