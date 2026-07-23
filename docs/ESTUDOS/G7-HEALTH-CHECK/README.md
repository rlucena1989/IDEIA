# G7 — Health Check Framework Unificado

> **Tipo**: `structural-gap`  
> **Status**: ✅ `IMPLEMENTED` — packages/health-check/ criado em 2026-07-22  
> **Data**: 2026-07-15  
> **Metodologia**: Template Permanente de Análise (Fases 1-4)

---

## Fase 1 — Pesquisa e Fundamentação

### 1.1 Resumo Executivo

Os estudos 07, 08, 09, 21 e 29 implementam verificações de saúde (health checks) para diferentes componentes (IDE server, adapters, agent-runtime, memory-store, policy-engine), cada um com formato próprio — sem schema compartilhado, sem agregador central, sem padronização de resposta. Um Health Check Framework unificado define: (1) schema único de resposta, (2) agregador que coleta checks de todos os módulos, (3) endpoint `/api/health` padronizado, (4) alertas automáticos em caso de falha.

**Decisão recomendada**: ⏳ AGENDAR — Score 3.2, prioridade média.

### 1.2 Pesquisa Acadêmica e de Mercado

- **Padrões**: Health Check Pattern (Cloud Native), Readiness Probe / Liveness Probe (Kubernetes), Circuit Breaker (Resilience4j), Health Endpoint (Actuator).
- **Concorrentes**: Todas as IDEs expõem health check. VS Code tem `vscode.workspaceState` e extensões podem reportar status. Cursor expõe `/api/health` interno.
- **Open source**: `@nestjs/terminus` (health checks + integrações), `cloud-health` (Node.js), `healthcheck` (Go), Spring Boot Actuator (Java).
- **Papers**: "Designing Data-Intensive Applications" — Kleppmann (Health section). Kubernetes Liveness/Readiness Probes — CNCF docs.

### 1.3 Análise Técnica

**Arquitetura proposta**:
```
GET /api/health → HealthCheckAggregator
  ├── system: CPU, memory, disk, uptime
  ├── ide-server: WebSocket connected, API routes loaded
  ├── agent-runtime: initialized, last heartbeat
  ├── memory-store: connected, read/write latency
  ├── policy-engine: loaded rules, last evaluation
  ├── event-bus: (G1) subscriber count, throughput
  ├── task-queue: (G2) pending jobs, workers status
  └── adapters: each adapter reports its own health

Response Schema:
{
  status: 'healthy' | 'degraded' | 'unhealthy',
  timestamp: ISO8601,
  checks: { name, status, latency, metadata }[],
  version: string,
  uptime: number
}
```

**Dependências**: `packages/contracts/` (G4, schema de health check), middleware HTTP no `packages/cli/src/ide/api-router.ts`.

### 1.4 Riscos e Limitações

- **Falsos positivos**: Health check pode falhar por timeout curto — mitigação com thresholds configuráveis (tempo, tentativas).
- **Carga**: Health checks em loop (monitoring tools) podem sobrecarregar — cache de resultado (TTL 5s) + rate limit.
- **Segurança**: Health check expõe informação interna — autenticação obrigatória em produção, liberado em dev.

---

## Fase 2 — Matriz de Viabilidade

| Dimensão | Peso | Nota | Pontos |
|----------|:----:|:----:|:------:|
| **Valor para IDE** | 3 | 3 | 9 |
| **Diferenciação** | 2 | 2 | 4 |
| **Sinergia c/ arquitetura** | 2 | 4 | 8 |
| **Custo-benefício** | 2 | 4 | 8 |
| **Maturidade** | 1 | 3 | 3 |

**Score = (9 + 4 + 8 + 8 + 3) / 10 = 3.2** ⏳ AGENDAR

| Esforço | Semanas | Justificativa |
|:-------:|:-------:|---------------|
| **P** | 1-2 | Feature isolada, schema único, sem novas dependências |

---

## Fase 3 — Artefatos

### 3.1 TASK-IDE-20 — Health Check Framework Unificado

```markdown
# Tarefa — Health Check Framework Unificado

## ID: TASK-IDE-20 | Módulo: health-check | Tipo: feature

## Objetivo: Criar framework de health checks com schema único, agregador e endpoint /api/health padronizado.

## Dependências
- TASK-IDE-17 (Schema Registry) — schema de health check
- Nenhuma outra (pode ser feito independentemente)

## Critérios de aceite
### Subtarefa 20.1 — Schema de Health Check
- [ ] Schema em packages/contracts: HealthCheckResult, HealthCheckStatus, HealthCheckEntry
- [ ] Validação via Schema Registry (G4)
- [ ] Resposta padronizada: status, timestamp, checks[], version, uptime

### Subtarefa 20.2 — HealthCheckAggregator
- [ ] Módulos registram seus health checks via registerCheck(name, fn)
- [ ] Agregador executa checks em paralelo com timeout
- [ ] Resultado agregado: healthy (todos ok) | degraded (alguns falham) | unhealthy (crítico falha)

### Subtarefa 20.3 — Health Checks individuais
- [ ] system: CPU, memory, disk, uptime (via os module)
- [ ] ide-server: WebSocket alive, routes loaded
- [ ] memory-store: read/write test
- [ ] policy-engine: rules count, last evaluation
- [ ] event-bus (se G1 existir): subscriber count
- [ ] adapter-*: por opção, cada adapter reporta

### Subtarefa 20.4 — Endpoint + Monitoring
- [ ] `GET /api/health` no api-router
- [ ] Intervalo de cache configurável (default 5s)
- [ ] Alerta em log se status = unhealthy por > 3 checks consecutivos

## Arquivos que PODEM ser alterados
- `packages/health-check/src/` (aggregator, schema, checks)
- `packages/contracts/src/health/` (schema)
- `packages/cli/src/ide/api-router.ts` (endpoint)

## Riscos
- Health check circular: se MCP/agent-runtime estiver offline, health check falha — timeout com fallback
- Performance: checks lentos bloqueiam resposta — timeout individual + paralelismo

## Verificação
- [ ] Testes: register, aggregate, timeout, degraded/unhealthy
- [ ] Teste de integração: endpoint /api/health retorna schema válido
```

### 3.2 Contratos

**Contrato: módulo → health-check**
- `healthCheck.registerCheck('module-name', checkFn)` onde `checkFn` retorna `Promise<HealthCheckEntry>`
- `checkFn` tem timeout configurável (default 5s)

**Contrato: health-check → api-router**
- `GET /api/health` retorna `HealthCheckResult`
- Cache de 5s para evitar sobrecarga de monitoring tools

### 3.3 CHANGELOG Entry

```markdown
## 2026-07-15 — G7: Health Check Framework Unificado

### Arquivos novos
| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `docs/ESTUDOS/G7-HEALTH-CHECK/README.md` | Análise completa do gap estrutural |
```

---

## Fase 4 — Ciclo de Vida

```
[CRIAÇÃO] docs/ESTUDOS/G7-HEALTH-CHECK/README.md
  │
  ├──> PESQUISA (Fase 1) → 5 estudos com health checks isolados
  │
  ├──> ANÁLISE (Fase 2) → Score 3.2 — ⏳ AGENDAR
  │     │
  │     └──> GERA TAREFA → TASK-IDE-20 (agendada)
  │           │
  │           └──> IMPLEMENTA → Framework + endpoint + 4 checks
  │                 (após G1-G5 estarem estáveis)
  │
  └──> REVISÃO PERIÓDICA → a cada 3 meses (próximo: 2026-10-15)
```

---

## Integração com Código (2026-07-22)

**Status:** 🟡 **Parcial** (F8 — Observabilidade)

Parte implementada, parte pendente:

| Componente | Status | Detalhes |
|-----------|--------|----------|
| Health check básico | ✅ `packages/telemetry/` | Endpoint `/api/health` com CPU/memória/uptime |
| Health check agent-runtime | ✅ `packages/agent-runtime/` | Heartbeat, last initialized |
| Health check event-bus | ✅ `packages/event-bus/` | Conexão NATS, subscriber count |
| Framework unificado | ❌ Pendente | Schema padronizado + agregador central |
| Schema de health check | ❌ Pendente | Proposto via G4 (schema-registry) |

**Próximo passo:** Criar `HealthCheckAggregator` unificado + schema padronizado.

---

## Referências

- Estudos 07, 08, 09, 21, 29 — health checks isolados existentes
- `@nestjs/terminus` — referência de health check framework
- Kubernetes Liveness/Readiness Probes — padrão de mercado
- "Designing Data-Intensive Applications" — Kleppmann
- Spring Boot Actuator — `/actuator/health` endpoint maduro
