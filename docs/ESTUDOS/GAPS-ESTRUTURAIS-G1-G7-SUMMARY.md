# GAPS ESTRUTURAIS G1-G7 — Summary Consolidado

> **Data**: 2026-07-15  
> **Metodologia**: Template Permanente de Análise (Fases 1-4)  
> **Origem**: Meta-análise de gaps estruturais no ecossistema AI-Devkit v2

---

## Tabela Consolidada

| ID  | Gap                                     | Score |    Decisão    | Esforço | Semanas |   Task ID   |  Prioridade   |
| :-: | :-------------------------------------- | :---: | :-----------: | :-----: | :-----: | :---------: | :-----------: |
| G1  | Event Bus / Pub-Sub                     |  4.0  |   ✅ FAZER    |    M    |   3-4   | TASK-IDE-14 |  🔴 Crítica   |
| G2  | Task Queue (Fila Assíncrona)            |  3.7  |   ✅ FAZER    |    M    |   3-4   | TASK-IDE-15 |  🔴 Crítica   |
| G3  | Policy Gateway Centralizado             |  4.3  |   ✅ FAZER    |    M    |   3-4   | TASK-IDE-16 |  🔴 Crítica   |
| G4  | Schema Registry / Catálogo de Contratos |  3.9  |   ✅ FAZER    |    M    |   3-4   | TASK-IDE-17 |  🔴 Crítica   |
| G5  | Feedback→Recomendações→Memória Pipeline |  3.8  |   ✅ FAZER    |    M    |   4-5   | TASK-IDE-18 |    🟠 Alta    |
| G6  | Geração de Código a partir de SpecAST   |  2.9  | 🔍 INVESTIGAR |    L    |   5-8   | TASK-IDE-19 | 🟡 Investigar |
| G7  | Health Check Framework Unificado        |  3.2  |  ⏳ AGENDAR   |    P    |   1-2   | TASK-IDE-20 |   🟢 Média    |

---

## Dependências Entre Gaps

```
G4 — Schema Registry (fundação)
  ├──▶ G1 — Event Bus (tipos de evento)
  ├──▶ G2 — Task Queue (tipos de job)
  ├──▶ G3 — Policy Gateway (schemas de policy)
  ├──▶ G5 — Feedback Pipeline (schemas de feedback)
  └──▶ G7 — Health Check (schema de health check)

G1 — Event Bus (infraestrutura)
  ├──▶ G2 — Task Queue (notificações de progresso)
  ├──▶ G3 — Policy Gateway (eventos de decisão)
  ├──▶ G5 — Feedback Pipeline (eventos de feedback)
  └──▶ G7 — Health Check (heartbeat dos módulos)
```

**Ordem de implementação recomendada**:

1. **G4** (Schema Registry) — fundação: tipos compartilhados
2. **G1** (Event Bus) — infraestrutura: comunicação entre módulos
3. **G3** (Policy Gateway) — governança: centraliza autorização
4. **G2** (Task Queue) — execução: jobs assíncronos
5. **G5** (Feedback Pipeline) — aprendizado: loop de feedback
6. **G7** (Health Check) — observabilidade: monitoramento
7. **G6** (Codegen SpecAST) — investigação paralela

---

## Scorecard

| Métrica                          |    Valor    |
| -------------------------------- | :---------: |
| Total de gaps identificados      |      7      |
| Score médio dos gaps             |    3.56     |
| ✅ FAZER (critico + alta)        |      5      |
| ⏳ AGENDAR                       |      1      |
| 🔍 INVESTIGAR                    |      1      |
| Esforço total estimado (semanas) |    22-31    |
| Dependências entre gaps          | 12 conexões |

---

## Gráfico de Decisão

```
Score ≥ 4.0 ─── G3 (4.3), G1 (4.0) ─── FAZER imediato
     │
Score 3.5-3.9 ─ G4 (3.9), G5 (3.8), G2 (3.7) ─── FAZER após críticos
     │
Score 3.0-3.4 ─ G7 (3.2) ─── AGENDAR (após estágio estável)
     │
Score 2.5-2.9 ─ G6 (2.9) ─── INVESTIGAR (protótipo + relatório)
```

---

## Alocação Recomendada (Sprints)

|       Sprint        | Gaps | Tasks       | Foco                                   |
| :-----------------: | :--- | :---------- | :------------------------------------- |
| Sprint 1 (sem 1-2)  | G4   | TASK-IDE-17 | Schema Registry + tipos compartilhados |
| Sprint 2 (sem 3-4)  | G1   | TASK-IDE-14 | Event Bus + middleware pipeline        |
| Sprint 3 (sem 5-6)  | G3   | TASK-IDE-16 | Policy Gateway + migração clientes     |
| Sprint 4 (sem 7-8)  | G2   | TASK-IDE-15 | Task Queue + 3 consumidores            |
| Sprint 5 (sem 9-10) | G5   | TASK-IDE-18 | Feedback Pipeline (MVP)                |
|  Sprint 6 (sem 11)  | G7   | TASK-IDE-20 | Health Check Framework                 |
|      Paralelo       | G6   | TASK-IDE-19 | Investigação de codegen                |

---

## Riscos Globais

| Risco                                   | Impacto | Mitigação                                                  |
| :-------------------------------------- | :-----: | :--------------------------------------------------------- |
| Dependência cruzada entre gaps          |  Alto   | Seguir ordem recomendada estritamente                      |
| Sobrecarga da equipe (22-31 sem)        |  Alto   | Paralelizar G6 (investigação) com sprints iniciais         |
| Breaking changes nos módulos existentes |  Médio  | Migration gradual com fallback, testes A/B                 |
| Baixa adoção dos novos contratos        |  Médio  | Code review obrigatório para novos módulos usarem registry |

---

## Tarefas Geradas

| Task        | Gap | Nome                         | Arquivo-alvo                                 |
| :---------- | :-: | :--------------------------- | :------------------------------------------- |
| TASK-IDE-14 | G1  | Event Bus Unificado          | `.ai/tasks/TASK-IDE-14-event-bus.md`         |
| TASK-IDE-15 | G2  | Task Queue Assíncrona        | `.ai/tasks/TASK-IDE-15-task-queue.md`        |
| TASK-IDE-16 | G3  | Policy Gateway Centralizado  | `.ai/tasks/TASK-IDE-16-policy-gateway.md`    |
| TASK-IDE-17 | G4  | Schema Registry / Catálogo   | `.ai/tasks/TASK-IDE-17-schema-registry.md`   |
| TASK-IDE-18 | G5  | Feedback Pipeline            | `.ai/tasks/TASK-IDE-18-feedback-pipeline.md` |
| TASK-IDE-19 | G6  | Investigação Codegen SpecAST | `.ai/tasks/TASK-IDE-19-codegen-spec.md`      |
| TASK-IDE-20 | G7  | Health Check Framework       | `.ai/tasks/TASK-IDE-20-health-check.md`      |

---

---

## Status de Integração com o Código (2026-07-22)

> Os 7 gaps estruturais foram analisados durante F1-F10. Abaixo o status real de cada um.

| ID  | Gap                         | Decisão       | Package(s) Correlatos                              | Status da Implementação                                  | Fase |
| :-: | :-------------------------- | :-----------: | :------------------------------------------------- | :------------------------------------------------------- | :--: |
| G1  | Event Bus / Pub-Sub         | ✅ FAZER      | `packages/event-bus/` (NATS JetStream + in-memory) | ✅ Implementado — F1 (NATS JetStream) completo           | F1   |
| G2  | Task Queue                  | ✅ FAZER      | `packages/task-queue/`                                | ✅ Implementado — TaskQueue com retry, backoff, prioridade | F3   |
| G3  | Policy Gateway              | ✅ FAZER      | `packages/policy-gateway/`, `policy-engine/`       | ✅ Implementado — PolicyEngine 27 patterns + gateway     | F6   |
| G4  | Schema Registry             | ✅ FAZER      | `packages/schema-registry/`, `contracts/`          | ✅ Implementado — schema-registry + contratos Zod        | F6   |
| G5  | Feedback Pipeline           | ✅ FAZER      | `packages/feedback-pipeline/`                      | ✅ Implementado — feedback → análise → recomendações     | F10  |
| G6  | Codegen SpecAST             | 🔍 INVESTIGAR | —                                                  | ❌ Não iniciado — requer avaliação de maturidade        | —    |
| G7  | Health Check Framework      | ⏳ AGENDAR    | `packages/health-check/`                           | ✅ Implementado — HealthCheckAggregator + 4 checks + endpoint + 11 tests | F8   |

> **Nota:** G6 (Codegen SpecAST) permanece em investigação. G7 implementado como `packages/health-check/` com aggregator, system checks e endpoint.

---

## Referências

- `docs/ESTUDOS/TEMPLATE-ANALISE-PERMANENTE.md` — template usado
- `docs/ESTUDOS/G1-EVENT-BUS/README.md` — estudo completo G1
- `docs/ESTUDOS/G2-TASK-QUEUE/README.md` — estudo completo G2
- `docs/ESTUDOS/G3-POLICY-GATEWAY/README.md` — estudo completo G3
- `docs/ESTUDOS/G4-SCHEMA-REGISTRY/README.md` — estudo completo G4
- `docs/ESTUDOS/G5-FEEDBACK-PIPELINE/README.md` — estudo completo G5
- `docs/ESTUDOS/G6-CODEGEN-SPECAST/README.md` — estudo completo G6
- `docs/ESTUDOS/G7-HEALTH-CHECK/README.md` — estudo completo G7
- `docs/ESTUDOS/MALHA-DE-INTEGRACAO.md` — mapa de integrações existentes
- `docs/ESTUDOS/CONTRATOS-INTEGRACAO.md` — contratos formais entre módulos
