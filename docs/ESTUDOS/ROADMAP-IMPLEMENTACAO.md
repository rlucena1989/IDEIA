# Roadmap de Implementação — Mapa de Dependências das 7 Oportunidades

> **Data**: 2026-07-15 | **Horizonte**: ~14 semanas (3 fases)

---

## Grafo de Dependências

```
            ┌──────────────────────────────────────────────────────────┐
            │                     FASE 1 (semanas 1-3)                │
            │                    FUNDAÇÃO ──── P                       │
            └──────────────────────────────────────────────────────────┘
                               │           │           │
                   ┌───────────┘           │           └───────────┐
                   ▼                       ▼                       ▼
            ┌──────────────┐      ┌──────────────┐      ┌──────────────────┐
            │   OP-2 UTA   │      │   OP-1 ACP   │      │  OP-5 Confidence │
            │  Score 4.4   │      │  Score 4.7   │      │   Score 4.1      │
            │  P (1-2 sem) │      │  P (2-3 sem) │      │   P (2-3 sem)    │
            │  TASK-IDE-15 │─────▶│  TASK-IDE-14 │      │   TASK-IDE-18    │
            └──────┬───────┘      └──────┬────────┘      └────────┬─────────┘
                   │                     │                         │
                   │       ┌─────────────┘                         │
                   │       │              ┌────────────────────────┘
                   │       │              │
                   ▼       ▼              ▼
            ┌──────────────────────────────────────────────────────────┐
            │                     FASE 2 (semanas 4-8)                │
            │                   INTEGRAÇÃO ──── M                      │
            └──────────────────────────────────────────────────────────┘
                   │           │                         │
         ┌─────────┘           │           ┌─────────────┘
         ▼                     ▼           ▼
  ┌──────────────┐    ┌────────────────┐    ┌──────────────────────┐
  │ OP-3 Memory  │    │ OP-6 Autonomous│    │  OP-7 Engineering    │
  │   Graph      │    │ Loop w/Checkpt │    │    Feedback Loop     │
  │ Score 4.2    │    │   Score 4.2    │    │     Score 3.9        │
  │ M (4-6 sem)  │    │   M (3-4 sem)  │    │     M (3-4 sem)      │
  │ TASK-IDE-16  │    │  TASK-IDE-19   │◀───│    TASK-IDE-20       │
  └──────┬───────┘    └───────┬────────┘    └──────────┬───────────┘
         │                    │                         │
         │                    │           ┌─────────────┘
         │                    │           │
         ▼                    ▼           ▼
            ┌──────────────────────────────────────────────────────────┐
            │                   FASE 3 (semanas 9+)                  │
            │                  AVANÇADO ──── L                        │
            └──────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                            ┌────────────────────┐
                            │   OP-4 Self-Debug  │
                            │    Stack ⏳        │
                            │   Score 3.3        │
                            │   L (6-8 sem)      │
                            │   TASK-IDE-17      │
                            └────────────────────┘
```

---

## Matriz de Dependências

| Opportunity | Depends On | Blocked By | Unlocks |
|:------------|:-----------|:-----------|:--------|
| **OP-2 UTA** | — | — | OP-1, OP-5, OP-6 |
| **OP-1 ACP** | OP-2 | OP-2 | OP-3 |
| **OP-5 Confidence** | OP-2 | OP-2 | OP-6, OP-7 |
| **OP-3 Memory Graph** | OP-1 | OP-1 | OP-7 |
| **OP-6 Checkpoint** | OP-2, OP-5 | OP-2 (crítico), OP-5 | OP-7, OP-4 |
| **OP-7 Feedback** | OP-3, OP-5, OP-6 | OP-3, OP-6 (crítico) | OP-4 |
| **OP-4 Debug Stack** | OP-1, OP-6, OP-7 | OP-1, OP-6, OP-7 | — (terminal) |

> **Caminho crítico**: OP-2 → OP-1 → OP-3 → OP-7 → OP-4 (5 elos)
> **Gargalo**: OP-2 UTA (bloqueia 3 oportunidades)

---

## Cronograma Detalhado

### Fase 1 — Fundação (Semanas 1-3)

| Semana | OP | Atividade | Marcos |
|:------:|:--:|:----------|:-------|
| 1 | OP-2 | UTA registry + descoberta | `GET /tools` funcional |
| 2 | OP-1 | Schema ACP + orquestrador | Payload ACP gerado em <1s |
| 2 | OP-5 | Classificador semântico | Acurácia ≥85% |
| 3 | OP-1 | Compressão + cache ACP | ACP completo + integrado CLI |
| 3 | OP-5 | Consensus engine + guardrails | Threshold 80% rejeita ≥90% erros |

**Gates**: OP-2 funcional (semana 1) para liberar OP-1 e OP-5.

### Fase 2 — Integração (Semanas 4-8)

| Semana | OP | Atividade | Marcos |
|:------:|:--:|:----------|:-------|
| 4-5 | OP-3 | Crawler dos 5 silos + engine | Grafo indexa todos os silos |
| 4-5 | OP-6 | Checkpoint manager + diff | Chain de 50 checkpoints <500ms |
| 6 | OP-3 | Query layer + visualização | Query <100ms, viz 10K nodos |
| 6-7 | OP-7 | Orquestrador + pattern DB | Ciclo completo <2 min |
| 7 | OP-6 | Autonomous loop + preview | 10 ações consecutivas sem falha |
| 8 | OP-7 | Scheduler + dashboard | Dashboard com métricas de aprendizado |

**Gates**: OP-3 e OP-6 funcionais (semana 6) para liberar OP-7.

### Fase 3 — Avançado (Semanas 9+)

| Semana | OP | Atividade | Marcos |
|:------:|:--:|:----------|:-------|
| 9-10 | OP-4 | DAP bridge (Python, Node, Go) | Breakpoints funcionais |
| 11-12 | OP-4 | AI Debug Agent | Identifica causa raiz 70% |
| 13-14 | OP-4 | Sandbox + terminal debug | Correções em sandbox <5s |

**Gates**: OP-4 inicia apenas quando OP-1, OP-6 e OP-7 estiverem estáveis.

---

## Marcos do Roadmap

| Marco | Data Alvo | Descrição | Critério de Sucesso |
|:-----:|:---------:|:-----------|:-------------------|
| M1 | Semana 1 | UTA Discovery funcional | `GET /tools` retorna ≥190 tools |
| M2 | Semana 3 | ACP + Confidence prontos | Payload <10KB comprimido, threshold funciona |
| M3 | Semana 6 | Memory Graph + Checkpoint OK | Crawler indexa 5 silos, chain 50 checkpoints |
| M4 | Semana 8 | Feedback Loop operacional | Ciclo completo <2 min, padrões aprendidos |
| M5 | Semana 14 | Debug Stack funcional | Debug em 3 linguagens, IA debug agent ≥70% |

---

## Análise de Riscos do Roadmap

| Risco | Probabilidade | Impacto | Mitigação |
|:------|:-------------:|:-------:|:----------|
| OP-2 atrasa (bloqueia 3 OPs) | Média | Crítico | MVP de UTA em 1 semana (só registry) |
| OP-5 classificador impreciso | Alta | Médio | Heurísticas fallback + feedback loop |
| OP-3 crawler lento | Média | Médio | Amostragem + indexação incremental |
| OP-7 loop infinito | Baixa | Médio | Limite de 3 iterações + timeout |
| OP-4 DAP incompatível | Alta | Alto | Fallback LSP-only + bridge adaptável |

---

## Visão Consolidada

```
FASE 1 (3 sem) ──┬── OP-2 UTA ──────── Descoberta de Tools
                  ├── OP-1 ACP ──────── Contexto Unificado
                  └── OP-5 Confidence ─ Guardião de Qualidade
                         │
FASE 2 (5 sem) ──┬── OP-3 Memory Graph ── Memória de Engenharia
                  ├── OP-6 Autonomous Loop ── Execução Segura
                  └── OP-7 Feedback Loop ──── Aprendizado Contínuo
                         │
FASE 3 (6 sem) ──└── OP-4 Debug Stack ──── Debug Inteligente

TOTAL: 14 semanas → 3 Fases → 7 OPs → 8 Sprints → ~180h
```

---

## Referências

- `docs/ESTUDOS/7-OPORTUNIDADES-ESTRATEGICAS-SUMMARY.md`
- `docs/ESTUDOS/OP1-AI-CONTEXT-PROTOCOL/README.md`
- `docs/ESTUDOS/OP2-UNIFIED-TOOL-API/README.md`
- `docs/ESTUDOS/OP3-AI-MEMORY-GRAPH/README.md`
- `docs/ESTUDOS/OP4-SELF-DEBUGGING-STACK/README.md`
- `docs/ESTUDOS/OP5-CONFIDENCE-ENGINE/README.md`
- `docs/ESTUDOS/OP6-AUTONOMOUS-LOOP-CHECKPOINT/README.md`
- `docs/ESTUDOS/OP7-ENGINEERING-FEEDBACK-LOOP/README.md`

---

## Histórico de Revisões

| Data | Versão | Mudança |
|------|:------:|---------|
| 2026-07-15 | 1.0 | Criação — roadmap de implementação com grafo de dependências |
