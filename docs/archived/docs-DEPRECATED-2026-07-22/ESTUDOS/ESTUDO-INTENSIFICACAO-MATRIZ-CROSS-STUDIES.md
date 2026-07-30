# Matriz de Integração Cross-Studies — IDEIA v2.0

> **"Mapeamento completo de todas as conexões entre os 30 estudos do ecossistema IDEIA"**
>
> **Data:** 2026-07-18
> **Versão:** 2.0
> **Base:** 30 documentos estratégicos + modulares + consolidados
> **Total de pares analisados:** 435 (C(30,2)), sendo 50 pares críticos detalhados

---

## Sumário

1. [Matriz Cross-Reference Completa (30×30)](#1-matriz-cross-reference-completa-30x30)
2. [Top 50 Pares de Integração Detalhados](#2-top-50-pares-de-integração-detalhados)
3. [Diagramas de Fluxo de Dados Cross-Studies](#3-diagramas-de-fluxo-de-dados-cross-studies)
4. [Registro de Componentes Compartilhados](#4-registro-de-componentes-compartilhados)
5. [Grafo de Dependências de Implementação](#5-grafo-de-dependências-de-implementação)
6. [Estratégias de Teste Cross-Study](#6-estratégias-de-teste-cross-study)
7. [Observabilidade Através dos Estudos](#7-observabilidade-através-dos-estudos)

---

## 1. Matriz Cross-Reference Completa (30×30)

### Legenda

| Símbolo | Significado |
|---------|-------------|
| ██ | Conexão crítica — dados, eventos, contratos e dependência bidirecional |
| ▓▓ | Conexão forte — compartilham APIs, eventos ou componentes |
| ▒▒ | Conexão moderada — interface indireta via barramento ou camada intermediária |
| ░░ | Conexão fraca — compartilham princípios ou dependem indiretamente |
| ·· | Conexão nula ou irrelevante |
| ∞ | Autoconexão (diagonal) |

### Estrutura da Matriz

Os 30 estudos organizados em 3 blocos:

**Bloco E (Estratégicos):** E1, E2, E2v2, E3, E4, E5
**Bloco S (Modulares):** S1-S22
**Bloco M/X (Consolidados):** M1, X

```
       E1  E2 E2v2 E3  E4  E5  S1  S2  S3  S4  S5  S6  S7  S8  S9 S9v2 S10 S10v2 S11 S12 S13 S14 S15 S16 S17 S18 S19 S20 S21 S22  M1   X
       ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
E1   │  ∞  ▓▓  ▓▓  ▒▒  ▓▓  ▒▒  ▒▒  ▓▓  ██  ▒▒  ██  ▒▒  ▓▓  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▓▓  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▓▓  ▒▒  ▒▒  ▒▒  ██  ██
E2   │ ▓▓   ∞  ██  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▓▓  ▒▒  ▓▓  ▓▓  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▓▓  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ██  ██
E2v2 │ ▓▓  ██   ∞  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▓▓  ▒▒  ▓▓  ▓▓  ▒▒  ▓▓  ▓▓  ▓▓  ▓▓  ▓▓  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▓▓  ▒▒  ▒▒  ▓▓  ▒▒  ▒▒  ▒▒  ██  ██
E3   │ ▒▒  ▒▒  ▒▒   ∞  ▒▒  ░░  ▒▒  ░░  ░░  ▓▓  ▒▒  ██  ░░  ░░  ▒▒  ▒▒  ▒▒  ▓▓  ░░  ██  ▓▓  ▒▒  ░░  ▓▓  ▒▒  ▒▒  ░░  ░░  ░░  ░░  ██  ██
E4   │ ▓▓  ▒▒  ▒▒  ▒▒   ∞  ▓▓  ░░  ▒▒  ▒▒  ░░  ▒▒  ░░  ▒▒  ░░  ░░  ░░  ░░  ░░  ▓▓  ▒▒  ▒▒  ▒▒  ░░  ░░  ░░  ░░  ▒▒  ▒▒  ▓▓  ▓▓  ▓▓  ▓▓
E5   │ ▒▒  ▒▒  ▒▒  ░░  ▓▓   ∞  ░░  ▒▒  ░░  ▒▒  ▒▒  ▒▒  ░░  ░░  ░░  ░░  ░░  ░░  ██  ▒▒  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ░░  ▓▓  ▒▒  ▒▒  ▓▓
       ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
S1   │ ▒▒  ▒▒  ▒▒  ▒▒  ░░  ░░   ∞  ▓▓  ▓▓  ██  ██  ▓▓  ▒▒  ▒▒  ▒▒  ▒▒  ██  ██  ▓▓  ▒▒  ▒▒  ▒▒  ▒▒  ▓▓  ██  ▒▒  ▒▒  ▒▒  ▓▓  ▓▓  ██  ██
S2   │ ▓▓  ▒▒  ▒▒  ░░  ▒▒  ▒▒  ▓▓   ∞  ██  ▒▒  ██  ▒▒  ██  ▓▓  ▒▒  ▒▒  ▓▓  ▓▓  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▓▓  ▒▒  ▓▓  ▒▒  ▒▒  ▒▒  ██  ██
S3   │ ██  ▓▓  ▓▓  ░░  ▒▒  ░░  ▓▓  ██   ∞  ▒▒  ██  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▓▓  ▓▓  ▒▒  ▒▒  ▒▒  ░░  ░░  ▒▒  ▒▒  ░░  ██  ░░  ░░  ░░  ██  ██
S4   │ ▒▒  ▒▒  ▒▒  ▓▓  ░░  ▒▒  ██  ▒▒  ▒▒   ∞  ██  ██  ▒▒  ▒▒  ▒▒  ▒▒  ▓▓  ▓▓  ▒▒  ▓▓  ▒▒  ██  ▒▒  ██  ▒▒  ██  ▓▓  ▒▒  ▒▒  ▒▒  ██  ██
S5   │ ██  ▓▓  ▓▓  ▒▒  ▒▒  ▒▒  ██  ██  ██  ██   ∞  ▓▓  ▓▓  ▒▒  ▒▒  ▒▒  ██  ██  ▓▓  ▓▓  ▒▒  ▒▒  ▒▒  ▒▒  ▓▓  ▓▓  ██  ▒▒  ▒▒  ▓▓  ██  ██
S6   │ ▒▒  ▓▓  ▓▓  ██  ░░  ▒▒  ▓▓  ▒▒  ▒▒  ██  ▓▓   ∞  ▒▒  ▒▒  ▒▒  ▒▒  ▓▓  ▓▓  ▒▒  ██  ██  ▒▒  ██  ██  ██  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ██  ██
S7   │ ▓▓  ▒▒  ▒▒  ░░  ▒▒  ░░  ▒▒  ██  ▒▒  ▒▒  ▓▓  ▒▒   ∞  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ░░  ░░  ▒▒  ▓▓  ▒▒  ▓▓  ░░  ░░  ░░  ██  ██
S8   │ ▒▒  ▒▒  ▓▓  ░░  ░░  ░░  ▒▒  ▓▓  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒   ∞  ██  ██  ▓▓  ▓▓  ▓▓  ▒▒  ▒▒  ░░  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ░░  ▒▒  ██
S9   │ ▒▒  ▒▒  ▓▓  ▒▒  ░░  ░░  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ██   ∞  ██  ██  ██  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ░░  ░░  ▒▒  ██
S9v2 │ ▒▒  ▒▒  ▓▓  ▒▒  ░░  ░░  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ██  ██   ∞  ██  ██  ▒▒  ▒▒  ▓▓  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ░░  ░░  ▒▒  ██
S10  │ ▒▒  ▒▒  ▓▓  ▒▒  ░░  ░░  ██  ▓▓  ▓▓  ▓▓  ██  ▓▓  ▒▒  ▓▓  ██  ██   ∞  ██  ██  ██  ▓▓  ▓▓  ▓▓  ▓▓  ▓▓  ▓▓  ▓▓  ▓▓  ▒▒  ▒▒  ██  ██
S10v2│ ▒▒  ▒▒  ▓▓  ▓▓  ░░  ░░  ██  ▓▓  ▓▓  ▓▓  ██  ▓▓  ▒▒  ▓▓  ██  ██  ██   ∞  ██  ██  ▓▓  ▓▓  ▓▓  ▓▓  ▓▓  ▓▓  ▓▓  ▓▓  ▒▒  ▒▒  ██  ██
S11  │ ▓▓  ▒▒  ▒▒  ░░  ▓▓  ██  ▓▓  ▒▒  ▒▒  ▒▒  ▓▓  ▒▒  ▒▒  ▓▓  ▒▒  ▒▒  ██  ██   ∞  ▒▒  ▒▒  ▓▓  ▒▒  ▒▒  ▒▒  ▒▒  ▓▓  ██  ▓▓  ▓▓  ▓▓  ██
S12  │ ▒▒  ▒▒  ▒▒  ██  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▓▓  ▓▓  ██  ▒▒  ▒▒  ▒▒  ▒▒  ██  ██  ▒▒   ∞  ▓▓  ▒▒  ▒▒  ▓▓  ▓▓  ▓▓  ▒▒  ▒▒  ▒▒  ▒▒  ██  ██
S13  │ ▒▒  ▒▒  ▒▒  ▓▓  ▒▒  ░░  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ██  ▒▒  ▒▒  ▒▒  ▓▓  ▓▓  ▓▓  ▒▒  ▓▓   ∞  ▒▒  ██  ██  ▓▓  ▒▒  ░░  ░░  ░░  ░░  ▒▒  ██
S14  │ ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ░░  ▒▒  ▒▒  ░░  ██  ▒▒  ▒▒  ░░  ░░  ▒▒  ▒▒  ▓▓  ▓▓  ▓▓  ▒▒  ▒▒   ∞  ▒▒  ▒▒  ▒▒  ██  ▒▒  ▒▒  ░░  ▒▒  ▒▒  ██
S15  │ ▒▒  ▒▒  ▒▒  ░░  ░░  ░░  ▒▒  ▒▒  ░░  ▒▒  ▒▒  ██  ░░  ▒▒  ▒▒  ▒▒  ▓▓  ▓▓  ▒▒  ▒▒  ██  ▒▒   ∞  ██  ██  ▒▒  ░░  ░░  ░░  ░░  ██  ██
S16  │ ▒▒  ▓▓  ▓▓  ▓▓  ░░  ░░  ▓▓  ▒▒  ▒▒  ██  ▒▒  ██  ▒▒  ▒▒  ▒▒  ▒▒  ▓▓  ▓▓  ▒▒  ▓▓  ██  ▒▒  ██   ∞  ██  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ██  ██
S17  │ ▒▒  ▒▒  ▒▒  ▒▒  ░░  ░░  ██  ▓▓  ▒▒  ▒▒  ▓▓  ██  ▓▓  ▒▒  ▒▒  ▒▒  ▓▓  ▓▓  ▒▒  ▓▓  ▓▓  ▒▒  ██  ██   ∞  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ██  ██
S18  │ ▒▒  ▒▒  ▒▒  ▒▒  ░░  ░░  ▒▒  ▒▒  ░░  ██  ▓▓  ▒▒  ▒▒  ▒▒  ▒▒  ▒▒  ▓▓  ▓▓  ▒▒  ▓▓  ▒▒  ██  ▒▒  ▒▒  ▒▒   ∞  ██  ▒▒  ░░  ░░  ██  ██
S19  │ ▓▓  ▒▒  ▓▓  ░░  ▒▒  ░░  ▒▒  ▓▓  ██  ▓▓  ██  ▒▒  ▓▓  ▒▒  ▒▒  ▒▒  ▓▓  ▓▓  ▓▓  ▒▒  ░░  ▒▒  ░░  ▒▒  ▒▒  ██   ∞  ▒▒  ▒▒  ▒▒  ██  ██
S20  │ ▒▒  ▒▒  ▒▒  ░░  ▒▒  ░░  ▒▒  ▒▒  ░░  ▒▒  ▒▒  ▒▒  ░░  ▒▒  ▒▒  ▒▒  ▓▓  ▓▓  ██  ▒▒  ░░  ▒▒  ░░  ▒▒  ▒▒  ▒▒  ▒▒   ∞  ▒▒  ▒▒  ▒▒  ██
S21  │ ▒▒  ▒▒  ▒▒  ░░  ▓▓  ▓▓  ▓▓  ▒▒  ░░  ▒▒  ▒▒  ▒▒  ░░  ▒▒  ░░  ░░  ▒▒  ▒▒  ▓▓  ▒▒  ░░  ░░  ░░  ▒▒  ▒▒  ░░  ▒▒  ▒▒   ∞  ▒▒  ▒▒  ██
S22  │ ▒▒  ▒▒  ▒▒  ░░  ▓▓  ▒▒  ▓▓  ▒▒  ░░  ▒▒  ▓▓  ▒▒  ░░  ░░  ░░  ░░  ▒▒  ▒▒  ▓▓  ▒▒  ░░  ▒▒  ░░  ▒▒  ▒▒  ░░  ▒▒  ▒▒  ▒▒   ∞  ▒▒  ██
       ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
M1   │ ██  ██  ██  ██  ▓▓  ▒▒  ██  ██  ██  ██  ██  ██  ██  ▒▒  ▒▒  ▒▒  ██  ██  ▓▓  ██  ▒▒  ▒▒  ██  ██  ██  ██  ██  ▒▒  ▒▒  ▒▒   ∞  ██
X    │ ██  ██  ██  ██  ▓▓  ▓▓  ██  ██  ██  ██  ██  ██  ██  ██  ██  ██  ██  ██  ██  ██  ██  ██  ██  ██  ██  ██  ██  ██  ██  ██  ██   ∞
```

### Total de Conexões por Estudo

| Estudo | Críticas (██) | Fortes (▓▓) | Moderadas (▒▒) | Fracas (░░) | Score |
|--------|:----------:|:---------:|:-----------:|:---------:|:-----:|
| X (Mestre) | 29 | 0 | 0 | 0 | 145 |
| M1 (Fluxo) | 18 | 2 | 8 | 1 | 107 |
| S5 (Multiagente) | 14 | 7 | 7 | 1 | 96 |
| S10 (Stacking) | 13 | 12 | 4 | 0 | 95 |
| S10v2 (Stacking v2) | 13 | 12 | 4 | 0 | 95 |
| S1 (Eventos) | 8 | 9 | 8 | 4 | 66 |
| S4 (Segurança) | 8 | 8 | 7 | 6 | 61 |
| S6 (Pipeline) | 8 | 7 | 9 | 5 | 60 |
| S2 (Memória) | 6 | 10 | 8 | 5 | 60 |
| S3 (Intenção) | 6 | 9 | 8 | 6 | 57 |
| S11 (Theia) | 4 | 11 | 8 | 6 | 55 |
| S17 (Observabilidade) | 4 | 10 | 11 | 4 | 53 |
| S19 (Prompts) | 5 | 8 | 9 | 7 | 52 |
| E1 (Visão) | 4 | 10 | 11 | 4 | 51 |
| S12 (Testes) | 3 | 10 | 9 | 7 | 48 |
| S7 (Aprendizado) | 3 | 9 | 9 | 8 | 45 |
| S18 (AI Safety) | 4 | 6 | 10 | 9 | 42 |
| S13 (Performance) | 3 | 7 | 11 | 8 | 40 |
| S16 (Deploy) | 4 | 6 | 11 | 8 | 40 |
| S8 (Emergentes) | 2 | 10 | 9 | 8 | 39 |
| S14 (Auth) | 3 | 6 | 11 | 9 | 38 |
| S9 (Matriz) | 3 | 8 | 9 | 9 | 38 |
| S9v2 (Matriz v2) | 3 | 8 | 9 | 9 | 38 |
| S15 (Cloud) | 2 | 6 | 13 | 8 | 35 |
| E2 (Plano v1) | 2 | 12 | 13 | 2 | 35 |
| E2v2 (Plano v2) | 2 | 16 | 11 | 0 | 33 |
| E3 (Qualidade) | 2 | 7 | 10 | 10 | 32 |
| S20 (Plugins) | 1 | 5 | 11 | 12 | 28 |
| E4 (UX) | 1 | 7 | 10 | 11 | 27 |
| S21 (Terminal) | 1 | 4 | 11 | 13 | 24 |
| S22 (Colaboração) | 1 | 5 | 8 | 15 | 24 |
| E5 (Desktop) | 1 | 4 | 10 | 14 | 23 |

---

## 2. Top 50 Pares de Integração Detalhados

### S1 (Eventos) ↔ S5 (Multiagente)

**APIs Compartilhadas:** NATS JetStream topics (`agent.*`, `task.*`, `memory.*`)
**Data Flow:** S5 → S1 (pub), S1 → S5 (sub)
**Eventos:** `AgentTaskCreated`, `AgentTaskCompleted`, `AgentError`, `AgentDecision`, `AgentHeartbeat`
**Contratos:** `BusEvent` schema, `Task` schema, `AgentArtifact` schema, `AgentState` schema
**Implementação:** S1 deve estar funcional antes de S5 — pré-requisito estrutural (Fase 1 → Fase 3)
**Testes:** Consumer-driven contracts para cada tipo de evento; teste de throughput para tópicos de agente
**Observabilidade:** Traces com `spanId=causationId` cross-agent; métricas de agente/evento/tópico; latência P95 de entrega

### S3 (Intenção) ↔ S5 (Multiagente)

**APIs Compartilhadas:** `Plan` schema, `TaskDecomposition` schema, `IntentClassification` result
**Data Flow:** S3 → S5 (plano mestre e tarefas decompostas)
**Eventos:** `plan.created`, `plan.approved`, `task.assigned`, `task.decomposed`
**Contratos:** `Plan` (`{id, steps[], dependencies[], risk[]}`), `TaskDecomposition`, `AgentAssignment`
**Implementação:** S3 (Intent Classifier + ADAPT) antes de S5 (multiagente); S3 alimenta S5 com planos executáveis
**Testes:** Teste de fidelidade (plano gerado = execução real); teste de decomposição (100% tasks covered)
**Observabilidade:** Tempo de decomposição; taxa de tarefas rejeitadas por agentes; acurácia de classificação

### S5 (Multiagente) ↔ S10/S10v2 (Stacking)

**APIs Compartilhadas:** `AgentArtifact`, `AgentNode` (LangGraph), `CrewOutput`, `CrewTask`
**Data Flow:** S5 ↔ S10 (contratos entre agentes e camadas)
**Contratos:** `StateGraph` schema, `AgentNode` interface, `CrewTask` schema
**Implementação:** S10 define contratos que S5 implementa; S10v2 adiciona SLOs e circuit breakers
**Testes:** Contract testing Pact entre agentes; validação de schema em cada handoff
**Observabilidade:** SLO violation tracking; circuit breaker events; ratio de handoffs com sucesso

### S1 (Eventos) ↔ S2 (Memória)

**APIs Compartilhadas:** `MemoryRecord` schema, `MemoryEvent` schema
**Data Flow:** S2 → S1 (pub), S1 → S2 (sub) — memória notifica eventos, event bus distribui
**Eventos:** `memory.record.created`, `memory.record.updated`, `memory.record.deleted`, `memory.query.executed`
**Contratos:** `Memory` schema (`{id, type, namespace, content, embedding, metadata}`)
**Implementação:** S1 (NATS) como backbone para distribuir mudanças de memória entre agentes e sessões
**Testes:** Teste de consistência eventual; teste de replay (memória restaurada de eventos)
**Observabilidade:** Latência de propagação de memória; cache hit ratio; embedding drift tracking

### S4 (Segurança) ↔ S5 (Multiagente)

**APIs Compartilhadas:** `PolicyEngine` (`evaluate(action, context)`), `LLM Guard` (`scan(input/output)`)
**Data Flow:** S5 → S4 (pré-check), S4 → S5 (autorização/bloqueio)
**Eventos:** `policy.evaluated`, `policy.violated`, `approval.requested`, `approval.granted`
**Contratos:** `PolicyDecision` (`{allowed, reason, rule}`), `SafetyResult` (`{valid, risk_score}`)
**Implementação:** S4 wrappa cada ação de agente (policy check + safety scan + output validation)
**Testes:** Red teaming contra agentes; injection suite cross-agent; policy bypass testing
**Observabilidade:** Violação por agente/tipo; tempo de avaliação de política; approval rate

### S2 (Memória) ↔ S3 (Intenção)

**APIs Compartilhadas:** `MemoryStore.search(query)`, `PatternDetector.match()`
**Data Flow:** S3 → S2 (salva intenções/planos), S2 → S3 (recupera contexto/histórico)
**Contratos:** `ContextItem` (`{id, content, relevance, timestamp}`), `MemoryQuery` (`{query, topK}`)
**Implementação:** S2 fornece contexto histórico para S3 classificar intenções; S3 armazena planos em S2
**Testes:** Teste de relevância (top-K retorna itens corretos); teste de recall cross-session
**Observabilidade:** Hit rate de contexto; tempo de retrieval; itens por sessão

### S3 (Intenção) ↔ S19 (Prompts)

**APIs Compartilhadas:** `PromptTemplate` schema, `PromptChain` schema
**Data Flow:** S19 → S3 (templates e cadeias de prompt para classificação e decomposição)
**Contratos:** `PromptTemplate` (`{agent, role, system_prompt, few_shot_examples}`)
**Implementação:** S19 define templates de prompt que S3 usa para intent classification + ADAPT decomposition
**Testes:** Prompt regression testing; few-shot coverage; hallucination rate por template
**Observabilidade:** Eficácia do prompt por template; taxa de sucesso na primeira tentativa

### S5 (Multiagente) ↔ S6 (Pipeline)

**APIs Compartilhadas:** `Task` schema, `QualityGate` result, `DeployArtifact` schema
**Data Flow:** S5 → S6 (artefatos revisados e testados), S6 → S5 (feedback de qualidade/bloqueio)
**Eventos:** `verification.started`, `verification.completed`, `gate.passed`, `gate.failed`
**Contratos:** `VerificationResult` (`{taskId, passed, gates[]}`), `GateStatus` (`{gate, status, details}`)
**Implementação:** S5 produz código/testes → S6 executa quality gates → S5 corrige se falha
**Testes:** Pipeline E2E (agente → commit → gate → correção → aprovação)
**Observabilidade:** Gate pass rate por agente; tempo de ciclo (code → gate pass); correções por falha

### S1 (Eventos) ↔ S17 (Observabilidade)

**APIs Compartilhadas:** `BusEvent` com `traceId`, `causationId`, `correlationId`
**Data Flow:** S1 → S17 (todos os eventos são instrumentados)
**Contratos:** `TraceContext` (W3C `traceparent`/`tracestate`), `OTelSpan` attributes
**Implementação:** S1 injecta trace context em toda mensagem NATS; S17 consome eventos como spans
**Testes:** Teste de propagação W3C; teste de causalidade; teste de bagagem
**Observabilidade:** Toda a telemetria cruza S17 → LangFuse/Prometheus/Loki

### S4 (Segurança) ↔ S6 (Pipeline)

**APIs Compartilhadas:** `SecurityGate` schema, `VulnerabilityReport` schema
**Data Flow:** S4 → S6 (scans de segurança como gates do pipeline)
**Eventos:** `security.scan.started`, `security.scan.completed`, `vulnerability.found`
**Contratos:** `SecurityGateResult` (`{gate, passed, vulnerabilities[], severity}`)
**Implementação:** S4 fornece scanners (SAST, dependency, prompt injection) como gates do S6
**Testes:** Security gate blocking test; false positive/negative rate
**Observabilidade:** Vulnerability density; gate pass rate por severidade; MTTR para vuln fix

### S2 (Memória) ↔ S5 (Multiagente)

**APIs Compartilhadas:** `MemoryStore.save/load/search`, `PatternDetector.match`
**Data Flow:** S5 → S2 (agentes salvam decisões e artefatos), S2 → S5 (contexto para agentes)
**Eventos:** `memory.record.created`, `pattern.detected`, `context.assembled`
**Contratos:** `Memory` schema, `ContextAssembly` schema
**Implementação:** S5 agentes consultam S2 para contexto; S2 persiste artefatos gerados por S5
**Testes:** Teste de consistência (agente salva → agente recupera); teste de relevância
**Observabilidade:** Memórias por agente; taxa de reuso de memória; cache hit/miss

### S2 (Memória) ↔ S7 (Aprendizado)

**APIs Compartilhadas:** `LearningRecord`, `FeedbackItem`, `Preference` schema
**Data Flow:** S2 → S7 (dados históricos para aprendizado), S7 → S2 (modelos ajustados e preferências)
**Contratos:** `Feedback` (`{id, action, outcome, userRating, agentId}`), `Learning` (`{pattern, confidence}`)
**Implementação:** S7 consome memórias de S2 para detectar padrões cross-projeto; S7 atualiza S2 com novo conhecimento
**Testes:** Cross-project pattern detection test; feedback cycle accuracy
**Observabilidade:** Padrões por projeto; learn rate; feedback-to-action ratio

### S5 (Multiagente) ↔ S7 (Aprendizado)

**APIs Compartilhadas:** `AgentFeedback`, `PerformanceMetric` schema
**Data Flow:** S5 → S7 (métricas de performance de agentes), S7 → S5 (ajustes de comportamento)
**Contratos:** `AgentPerformance` (`{agentId, taskType, successRate, avgDuration}`)
**Implementação:** S7 analisa padrões de S5 para otimizar orquestração; S5 aplica ajustes de autonomia
**Testes:** A/B test com/sem aprendizado; autonomia adaptativa test
**Observabilidade:** Performance delta por agente; autonomia level over time

### S4 (Segurança) ↔ S18 (AI Safety)

**APIs Compartilhadas:** `OWASP_LLM_Checklist`, `RedTeamReport`, `SafetyPolicy`
**Data Flow:** S18 → S4 (diretrizes de segurança), S4 → S18 (resultados de monitoramento)
**Contratos:** `SafetyAudit` (`{model, test, passed, severity}`), `AlignmentScore`
**Implementação:** S18 define políticas de AI safety que S4 implementa como regras de Policy Engine
**Testes:** OWASP LLM Top 10 full suite; red teaming contínuo via Garak/PyRIT
**Observabilidade:** Safety score por dimensão; incident frequency; alignment drift

### S1 (Eventos) ↔ S4 (Segurança)

**APIs Compartilhadas:** NATS Queue Group (`policy-consumers`), `SecurityEvent` schema
**Data Flow:** S1 → S4 (eventos para avaliação), S4 → S1 (decisões publicadas)
**Eventos:** `policy.evaluated`, `policy.violated`, `approval.requested`, `approval.granted/denied`
**Contratos:** `PolicyEvent` (`{action, subject, resource, decision}`)
**Implementação:** S1 rota eventos críticos para consumidores de segurança (queue group dedicado)
**Testes:** Security event ordering test; DLQ for failed policy evaluations
**Observabilidade:** Policy evaluation latency; violation rate; approval response time

### S11 (Theia) ↔ S5 (Multiagente)

**APIs Compartilhadas:** `ChatAgent` (Theia AI), `ToolProvider` (MCP), `AIVariable`, `LanguageModelRegistry`
**Data Flow:** S11 → S5 (UI dispara agentes), S5 → S11 (resultados renderizados)
**Contratos:** Theia `ChatAgent` interface (`{id, name, languageModelRequirements, prompts}`)
**Implementação:** S5 agentes são registrados como ChatAgents no Theia; S11 provê UI para interação
**Testes:** Theia extension integration test; ChatAgent → AgentRuntime flow
**Observabilidade:** Comandos Theia por agente; UI response time; agent start time

### S11 (Theia) ↔ E5 (Desktop)

**APIs Compartilhadas:** Electron IPC, Theia Shell API, Window/View registration
**Data Flow:** E5 → S11 (platforma desktop), S11 → E5 (extensões e views)
**Contratos:** `WindowConfig`, `ViewRegistration`, `TheiaAppConfig`
**Implementação:** E5 Electron/Tauri host Theia; Theia platform S11 roda como aplicação desktop
**Testes:** Desktop integration (MSI/DMG); auto-update; window management
**Observabilidade:** Crash rate por plataforma; startup time; memory footprint

### S5 (Multiagente) ↔ S19 (Prompts)

**APIs Compartilhadas:** `PromptTemplate`, `AgentPrompt`, `PromptChain` schema
**Data Flow:** S19 → S5 (templates de prompt por agente), S5 → S19 (feedback de eficácia)
**Contratos:** `AgentPrompt` (`{agentId, role, systemPrompt, fewShot, tools}`)
**Implementação:** S19 define engenharia de prompt que cada agente em S5 utiliza; templates versionados
**Testes:** Prompt regression; A/B test de prompt variations; hallucination per template
**Observabilidade:** Prompt efficacy score; template utilization rate; success rate por role

### S6 (Pipeline) ↔ S16 (Deploy)

**APIs Compartilhadas:** `DeploymentStatus`, `ReleaseArtifact`, `GitOpsManifest`
**Data Flow:** S6 → S16 (artefatos aprovados), S16 → S6 (status de deploy)
**Eventos:** `deploy.started`, `deploy.completed`, `deploy.failed`, `deploy.rolled_back`
**Contratos:** `Deployment` (`{id, env, version, status, rollout_percentage}`)
**Implementação:** S6 quality gates → S16 GitOps (ArgoCD/Flux) + progressive delivery
**Testes:** Canary deployment test; rollback test; zero-downtime deployment
**Observabilidade:** Deploy frequency; MTTR; change failure rate; rollout progress

### S6 (Pipeline) ↔ S17 (Observabilidade)

**APIs Compartilhadas:** `PipelineMetric`, `GateResult`, `OTelSpan`
**Data Flow:** S6 → S17 (eventos de pipeline viram métricas), S17 → S6 (alerts disparam gates)
**Eventos:** `pipeline.stage.started`, `pipeline.stage.completed`, `gate.alert`
**Contratos:** `PipelineSpan` (`{stage, duration, status, gates}`)
**Implementação:** S6 instrumenta cada stage do pipeline com OTel; S17 monitora saúde e alerta
**Testes:** Pipeline observability E2E; alerta → auto-rollback
**Observabilidade:** Pipeline dashboard; stage duration trends; gate failure rate

### S5 (Multiagente) ↔ S22 (Colaboração)

**APIs Compartilhadas:** `AgentMessage` (colab), `SharedBlackboard`, `SessionState`
**Data Flow:** S5 → S22 (agentes publicam no blackboard), S22 → S5 (eventos de colaboração)
**Contratos:** `SharedItem` (`{id, type, content, owner, version}`), `AgentPresence`
**Implementação:** S5 agentes usam S22 blackboard compartilhado para debate e consenso
**Testes:** Multi-agent debate E2E; conflict resolution test; handoff protocol
**Observabilidade:** Debate rounds; consensus time; conflicts resolved

### S1 (Eventos) ↔ S11 (Theia)

**APIs Compartilhadas:** WebSocket Bridge (NATS → Browser), SSE events
**Data Flow:** S1 → S11 (eventos do backend para frontend Theia)
**Eventos:** `ws.bridge.message`, `theia.command.executed`, `editor.file.changed`
**Contratos:** `WSMessage` (`{type, payload, traceId}`), `SSEEvent`
**Implementação:** NATS WebSocket bridge conecta S1 ao frontend Theia; eventos fluem em tempo real
**Testes:** WebSocket reconnection; event ordering; message delivery guarantee
**Observabilidade:** WS connection count; event throughput; bridge latency

### S2 (Memória) ↔ S19 (Prompts)

**APIs Compartilhadas:** `ContextVariable`, `MemoryInjectedPrompt`
**Data Flow:** S2 → S19 (memória → variáveis de contexto), S19 → S2 (prompts usam memória)
**Contratos:** `AIVariable` (Theia), `ContextInjection` (`{slot, source, transform}`)
**Implementação:** S19 templates injetam variáveis que S2 preenche com contexto relevante
**Testes:** Context injection accuracy; memory → prompt fidelity
**Observabilidade:** Variable fill rate; context relevance score; token savings

### S6 (Pipeline) ↔ S12 (Testes)

**APIs Compartilhadas:** `TestSuite`, `TestResult`, `CoverageReport`
**Data Flow:** S6 → S12 (pipe executa suites), S12 → S6 (resultados e métricas)
**Contratos:** `TestSuiteResult` (`{suite, passed, failed, coverage, duration}`)
**Implementação:** S12 define suites que S6 executa como gates; testes unitários, integração, E2E, contrato, mutação
**Testes:** Teste dos próprios testes; mutation testing dos gates
**Observabilidade:** Coverage trends; test flakiness rate; suite duration

### S4 (Segurança) ↔ S14 (Auth)

**APIs Compartilhadas:** `JWT`, `RBACContext`, `CedarPolicy`, `OAuth2Token`
**Data Flow:** S14 → S4 (identidade/autorização), S4 → S14 (auditoria de acesso)
**Contratos:** `AuthContext` (`{userId, roles, permissions, token}`), `PolicyRequest`
**Implementação:** S14 provê identidade; S4 avalia políticas baseadas em identidade + ação + recurso
**Testes:** RBAC matrix test; privilege escalation test; token validation
**Observabilidade:** Auth failures; policy deny rate; access pattern anomalies

### S10/S10v2 (Stacking) ↔ S17 (Observabilidade)

**APIs Compartilhadas:** `ContractSLO`, `MetricDefinition`, `OTelMetric`
**Data Flow:** S10 → S17 (SLOs e métricas), S17 → S10 (violações de SLO disparam ações)
**Contratos:** `SLO` (`{contract, metric, threshold, window}`), `SLOViolation`
**Implementação:** S10v2 define SLOs por contrato; S17 monitora e alerta quando violados
**Testes:** SLO violation detection test; SLO burn rate alerting
**Observabilidade:** SLO dashboard; burn rate; error budget remaining

### S1 (Eventos) ↔ S22 (Colaboração)

**APIs Compartilhadas:** NATS JetStream streams para colaboração, `ColabEvent` schema
**Data Flow:** S1 (backbone) → S22 (distribui eventos entre participantes)
**Eventos:** `colab.session.joined`, `colab.session.left`, `colab.cursor.moved`, `colab.edit.applied`
**Contratos:** `ColabEvent` (`{sessionId, userId, type, payload, timestamp}`)
**Implementação:** S1 NATS JetStream serve como backbone pub/sub para sessões colaborativas S22
**Testes:** Multi-user conflict test; session replay; latency under load
**Observabilidade:** Participants per session; edit conflict rate; collaboration latency

### S3 (Intenção) ↔ S4 (Segurança)

**APIs Compartilhadas:** `IntentSecurityScan` schema
**Data Flow:** S3 → S4 (intenção é escaneada antes da execução)
**Contratos:** `ClassifiedIntent` → segurança avalia risco antes de permitir plano
**Implementação:** Toda intenção de S3 passa pelo S4 antes de virar plano executável
**Testes:** Injection via intent; intent-based policy bypass
**Observabilidade:** Blocked intents; risk score por tipo de intenção; false positive rate

### S5 (Multiagente) ↔ S18 (AI Safety)

**APIs Compartilhadas:** `SafetyConstraint`, `AgentBehaviorPolicy`
**Data Flow:** S18 → S5 (restrições de safety), S5 → S18 (logs de comportamento)
**Contratos:** `SafetyRule` (`{agentType, action, constraint, severity}`)
**Implementação:** S18 safety policies são aplicadas como constraints no runtime de S5
**Testes:** Safety constraint enforcement; autonomy level boundary test
**Observabilidade:** Safety violation per agent; autonomy level distribution

### S6 (Pipeline) ↔ S13 (Performance)

**APIs Compartilhadas:** `BenchmarkSuite`, `PerformanceTestResult`
**Data Flow:** S13 → S6 (benchmarks como gates), S6 → S13 (metrics de performance em pipeline)
**Contratos:** `BenchmarkResult` (`{suite, metric, value, threshold, passed}`)
**Implementação:** S13 benchmarks (TTFT, TPS, throughput) são integrados como gates no S6
**Testes:** Performance gate regression; benchmark flakiness
**Observabilidade:** Performance trend; TTFT/TPS over releases; budget tracking

### S11 (Theia) ↔ S20 (Plugins)

**APIs Compartilhadas:** `ExtensionAPI`, `OpenVSX`, `PluginHost`, `ContributionPoints`
**Data Flow:** S20 → S11 (plugins estendem Theia), S11 → S20 (APIs para extensão)
**Contratos:** VS Code Extension API (~100% compat), Theia Extension API, `PluginManifest`
**Implementação:** S20 marketplace plugins são carregados no runtime Theia S11
**Testes:** Extension compatibility matrix; plugin isolation test; API coverage
**Observabilidade:** Plugin crash rate; extension count; API usage frequency

### S11 (Theia) ↔ S21 (Terminal)

**APIs Compartilhadas:** `TerminalWidget`, `node-pty` process, `xterm.js` addons
**Data Flow:** S21 → S11 (terminal integrado como widget Theia)
**Contratos:** `TerminalService` (`{spawn, write, resize, onData, onExit}`)
**Implementação:** S21 terminal backend (node-pty) integrado como serviço Theia; xterm.js como widget
**Testes:** Terminal integration; PTY lifecycle; LSP + terminal coordination
**Observabilidade:** Terminal sessions; command frequency; PTY crash rate

### S4 (Segurança) ↔ S7 (Aprendizado)

**APIs Compartilhadas:** `SecurityFeedback`, `AttackPattern`
**Data Flow:** S4 → S7 (incidentes de segurança como aprendizado), S7 → S4 (modelos de detecção)
**Contratos:** `SecurityIncident` (`{type, vector, severity, mitigation}`)
**Implementação:** S4 incidentes alimentam S7 para melhorar detecção; S7 atualiza modelos de S4
**Testes:** Security learning effectiveness; adaptive detection improvement
**Observabilidade:** Detection rate improvement; false positive reduction; learning curve

### S5 (Multiagente) ↔ S17 (Observabilidade)

**APIs Compartilhadas:** `AgentSpan`, `AgentMetric`, `LLMCallSpan`
**Data Flow:** S5 → S17 (traces de agentes), S17 → S5 (métricas de performance)
**Contratos:** `TraceContext` (W3C propagado via NATS headers)
**Implementação:** S5 instrumenta cada ação de agente com spans OTel; S17 agrega e correlaciona
**Testes:** Agent trace E2E; causation chain validation
**Observabilidade:** Agent execution dashboard; LLM cost per agent; success rate por task type

### S1 (Eventos) ↔ S10 (Stacking)

**APIs Compartilhadas:** NATS Schema Registry, Event Schemas das 9 camadas
**Data Flow:** S1 é espinha dorsal de S10; toda comunicação inter-camadas passa pelo event bus
**Contratos:** Todos os schemas de evento entre camadas (ver seção 2 de S10)
**Implementação:** S1 NATS é a implementação da camada de mensageria definida em S10
**Testes:** Cross-layer contract test; schema compatibility inter-camadas
**Observabilidade:** Cross-layer latency; schema evolution tracking; event type distribution

### S2 (Memória) ↔ S4 (Segurança)

**APIs Compartilhadas:** `MemorySecurityScan`, `AuditMemoryQuery`
**Data Flow:** S2 → S4 (memórias escaneadas), S4 → S2 (resultados de scan armazenados)
**Contratos:** `MemoryScanResult` (`{memoryId, threats[], risk_score}`)
**Implementação:** S4 escaneia memórias armazenadas em S2 para detectar dados sensíveis
**Testes:** PII detection in memory; memory poisoning detection
**Observabilidade:** Memory scan coverage; sensitive data found; sanitization rate

### S5 (Multiagente) ↔ S12 (Testes)

**APIs Compartilhadas:** `TestGenerator` (agente Tester), `TestSuite`, `TestResult`
**Data Flow:** S5 (Tester agent) → S12 (executa testes), S12 → S5 (resultados)
**Contratos:** `TestCase` (`{id, description, input, expected, type}`)
**Implementação:** Agente Tester (S5) gera testes → S12 executa e valida → feedback para S5
**Testes:** Test generation quality; mutation testing dos testes gerados
**Observabilidade:** Test coverage; test generation rate; false negative/positive

### S6 (Pipeline) ↔ S15 (Cloud)

**APIs Compartilhadas:** `K8sManifest`, `DockerImage`, `CloudResource`
**Data Flow:** S6 → S15 (deploy config), S15 → S6 (infra status)
**Contratos:** `InfraConfig` (`{provider, resources, networking, secrets}`)
**Implementação:** S6 pipeline gera manifests que S15 aplica na cloud; S15 feedback decide rollback
**Testes:** Cloud provisioning test; multi-cloud compatibility
**Observabilidade:** Cloud cost per deployment; resource utilization; provisioning time

### S1 (Eventos) ↔ S3 (Intenção)

**APIs Compartilhadas:** `IntentEvent`, `PlanEvent` schemas
**Data Flow:** S3 → S1 (publica intenções/planos), S1 → S3 (eventos de outros módulos)
**Eventos:** `intent.classified`, `plan.created`, `plan.decomposed`, `plan.approved`
**Contratos:** `IntentEvent` (`{intentType, confidence, entities[]}`)
**Implementação:** S3 publica eventos de intenção no bus; S5, S2, S4 consomem
**Testes:** Intent event ordering; plan event completeness
**Observabilidade:** Intent volume por tipo; plan-to-execution ratio; confidence distribution

### S6 (Pipeline) ↔ S7 (Aprendizado)

**APIs Compartilhadas:** `PipelineFeedback`, `QualityTrend`
**Data Flow:** S6 → S7 (métricas de pipeline), S7 → S6 (recomendações de otimização)
**Contratos:** `PipelineInsight` (`{stage, pattern, recommendation, impact}`)
**Implementação:** S7 analisa falhas frequentes em gates do S6 para sugerir correções preventivas
**Testes:** Pipeline optimization effectiveness; false recommendation rate
**Observabilidade:** Gate fail patterns; recommendation adoption rate; pipeline duration trend

### S6 (Pipeline) ↔ S8 (Emergentes)

**APIs Compartilhadas:** `SLMProvider`, `WasmRuntime`
**Data Flow:** S8 → S6 (novas tecnologias no pipeline), S6 → S8 (validação prática)
**Contratos:** `TechnologyAdapter` (`{technology, version, status}`)
**Implementação:** S8 tecnologias (DuckDB, Wasm, SLMs) são integradas ao pipeline S6 como ferramentas
**Testes:** Technology compatibility matrix; pipeline adaptation test
**Observabilidade:** Technology adoption rate; pipeline flexibility score

### S2 (Memória) ↔ S8 (Emergentes)

**APIs Compartilhadas:** `DuckDB` analytics, `GraphRAG` pipeline
**Data Flow:** S8 → S2 (novos storage engines), S2 → S8 (dados para inovação)
**Contratos:** `StorageAdapter` (`{engine, capabilities, limits}`)
**Implementação:** S8 avalia DuckDB, GraphRAG, CAG → implementa em S2 como evolução
**Testes:** Storage engine benchmark; migration test (sqlite → duckdb)
**Observabilidade:** Storage performance by engine; query latency; memory usage

### S5 (Multiagente) ↔ S11 (Theia)

**APIs Compartilhadas:** `ChatAgent` (Theia AI), `ToolProvider` (MCP), `AIVariable`
**Data Flow:** S11 → S5 (UI triggers), S5 → S11 (result streaming)
**Contratos:** `TheiaChatAgent` interface, `TheiaToolProvider` interface
**Implementação:** S5 agentes são ChatAgents Theia; MCP tools são ToolProviders
**Testes:** ChatAgent → agent handoff; tool call chain
**Observabilidade:** ChatAgent invocations; tool usage frequency; handoff success

### S4 (Segurança) ↔ S17 (Observabilidade)

**APIs Compartilhadas:** `SecurityEvent`, `AuditSpan`, `SecurityMetric`
**Data Flow:** S4 → S17 (eventos de segurança), S17 → S4 (alertas/anomalias)
**Contratos:** `SecurityOTelSpan` (`{spanId, securityEvent, severity, mitigation}`)
**Implementação:** S4 emite spans OTel para cada decisão de segurança; S17 correlaciona
**Testes:** Security alert E2E; anomaly detection precision
**Observabilidade:** Security dashboard; threat detection rate; response time

### E1 (Visão) ↔ S3 (Intenção)

**APIs Compartilhadas:** `AutonomyLevel` (N0-N4), `UserJourney`
**Data Flow:** E1 → S3 (níveis de autonomia guiam classificação), S3 → E1 (valida a visão)
**Contratos:** `AutonomyPolicy` (`{level, constraints, capabilities}`)
**Implementação:** E1 define N0-N4 que S3 implementa como níveis de classificação de intenção
**Testes:** Autonomy level boundary test; user journey completion
**Observabilidade:** Autonomy distribution; N-level progress over time

### E3 (Qualidade) ↔ S12 (Testes)

**APIs Compartilhadas:** `QualityGate`, `TestSuite`, `CoverageThreshold`
**Data Flow:** E3 → S12 (definições de qualidade), S12 → E3 (resultados e métricas)
**Contratos:** `GateDefinition` (`{name, type, threshold, action}`)
**Implementação:** E3 define os 4 quality gates que S12 implementa como suítes de teste
**Testes:** Gate effectiveness; coverage quality; mutation score
**Observabilidade:** Quality score por dimensão; gate pass rate; coverage trend

### E4 (UX) ↔ S11 (Theia)

**APIs Compartilhadas:** `WidgetConfig`, `ViewLayout`, `CommandPalette`
**Data Flow:** E4 → S11 (design system), S11 → E4 (feedback de UX)
**Contratos:** `TheiaWidget` (`{id, area, rank, commands}`), `DesignToken`
**Implementação:** E4 design system é implementado como widgets e views Theia (S11)
**Testes:** WCAG AA compliance; NPS/SUS/CES measurement
**Observabilidade:** Time-to-task; error rate; task completion

### S6 (Pipeline) ↔ S11 (Theia)

**APIs Compartilhadas:** `TaskRunner`, `LSPServer`, `DAPServer`
**Data Flow:** S11 → S6 (comandos do editor disparam pipeline), S6 → S11 (resultados no editor)
**Contratos:** `PipelineCommand` (`{type, args, workspace}`)
**Implementação:** S6 pipeline pode ser disparado do Theia via comandos; resultados aparecem como diagnósticos
**Testes:** Pipeline-trigger from IDE; result display in editor
**Observabilidade:** Pipeline triggers from IDE; IDE-to-pipeline latency

### S17 (Observabilidade) ↔ S22 (Colaboração)

**APIs Compartilhadas:** `ColabMetric`, `SessionTrace`
**Data Flow:** S22 → S17 (métricas de colaboração), S17 → S22 (performance insights)
**Contratos:** `ColabOTelSpan` (`{sessionId, participants[], operations, latency}`)
**Implementação:** S22 instrumenta operações colaborativas com spans OTel; S17 monitora
**Testes:** Collaboration performance under load; geo-distributed latency
**Observabilidade:** Real-time collaboration dashboard; conflict rate; session health

### S10 (Stacking) ↔ S11 (Theia)

**APIs Compartilhadas:** `TheiaService`, `InversifyBinding`, `ContributionPoint`
**Data Flow:** S10 → S11 (arquitetura em camadas), S11 → S10 (serviços Theia como camada 0)
**Contratos:** Theia `Module` (`{bind, unbind, rebind}`), `ServiceProtocol`
**Implementação:** S10 camada 0 (Kernel) é o Theia; camadas superiores usam DI do Theia
**Testes:** DI container integration; cross-layer service resolution
**Observabilidade:** DI resolution time; service dependency graph

### S5 (Multiagente) ↔ S21 (Terminal)

**APIs Compartilhadas:** `ShellCommand`, `TerminalSession`, `node-pty`
**Data Flow:** S5 → S21 (agentes executam comandos), S21 → S5 (resultados)
**Contratos:** `ShellExecution` (`{command, cwd, env, timeout}`)
**Implementação:** Agentes S5 usam terminal S21 para executar comandos; output parseado como artefatos
**Testes:** Command execution sandbox; permission boundary; timeout handling
**Observabilidade:** Command execution rate; success/fail ratio; avg duration

### S2 (Memória) ↔ S17 (Observabilidade)

**APIs Compartilhadas:** `MemoryTracer`, `QuerySpan`
**Data Flow:** S2 → S17 (toda query de memória é traceada)
**Contratos:** `MemoryQuerySpan` (`{queryType, latency, results, cacheHit}`)
**Implementação:** S2 instrumenta cada operação (save, load, search, query) como spans OTel
**Testes:** Memory trace completeness; causality chain (query → result → usage)
**Observabilidade:** Memory dashboard; query latency P50/P95/P99; cache efficiency

### E1 (Visão) ↔ S19 (Prompts)

**APIs Compartilhadas:** `PromptStrategy`, `AgentRole` (Analyst, Architect, Programmer, etc.)
**Data Flow:** E1 → S19 (papéis de agente da visão), S19 → E1 (prompts validados)
**Contratos:** `AgentPromptTemplate` (`{role, systemPrompt, tools, autonomyLevel}`)
**Implementação:** E1 define papéis (Analista, Arquiteto, Programador, Revisor, DevOps) que S19 materializa como prompts
**Testes:** Role consistency; prompt-role alignment
**Observabilidade:** Prompt effectiveness por role; role switching frequency

---

## 3. Diagramas de Fluxo de Dados Cross-Studies

### Flow A: Ideia → Sistema (Macro Fluxo Completo)

```
USER
  │
  │  "Crie um SaaS de assinaturas"
  ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  E1 (Visão) — Recebe ideia bruta                                          │
│  ├── Define nível de autonomia (N0-N4)                                    │
│  ├── Mapeia jornada do usuário (7 momentos)                               │
│  └── Qualidade esperada (7 dimensões)                                     │
└───────────────────────────────────┬────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  S19 (Prompts) — Prepara engenharia de prompt                             │
│  ├── Seleciona template por papel (Analyst, Architect, etc.)              │
│  ├── Injeta memória de sessões anteriores (via S2)                        │
│  └── Monta cadeia de prompts (system → few-shot → task)                   │
└───────────────────────────────────┬────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  S3 (Intenção→Plano) — Classifica e decompõe                              │
│  ├── Intent Classifier: "criar_projeto" | "editar" | "refatorar"          │
│  ├── ADAPT decomposition: módulos, dependências, riscos                   │
│  ├── Gera Plano Mestre com checkpoints                                    │
│  ├── Publica 'plan.created' no Event Bus (S1)                             │
│  └── Armazena plano em Memory Store (S2)                                  │
└───────────────────────────────────┬────────────────────────────────────────┘
                                    │
                                    ▼
                       ┌───────────────────────┐
                       │   S4 (Segurança)      │
                       │  Policy evaluation     │
                       │  Prompt injection scan │
                       │  Autonomy check        │
                       └───────┬───────────────┘
                               │ ALLOW
                               ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  S5 (Multiagente) — Orquestra execução                                    │
│  ├── LangGraph StateGraph: plan → design → code → test → deploy          │
│  ├── Agents: Architect → Programmer → Reviewer → Tester → DevOps         │
│  ├── Comunicação via NATS (S1) request-reply                              │
│  ├── Agentes consultam memória (S2) para contexto                         │
│  ├── A2A protocol + MCP tools                                             │
│  └── Publica eventos 'agent.*' no barramento (S1)                        │
└───────────────────────┬───────────────────┬───────────────┬────────────────┘
                        │                   │               │
                        ▼                   ▼               ▼
               ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
               │   S11 (Theia)│   │  S2 (Memória)│   │  S1 (Eventos)│
               │ UI streaming │   │ Persiste      │   │ DLQ, Replay  │
               │ Monaco edit  │   │ artefatos     │   │ Audit trail  │
               └──────────────┘   └──────────────┘   └──────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  S6 (Pipeline) — Verifica qualidade                                       │
│  ├── Quality Gate 1: lint + typecheck                                     │
│  ├── Quality Gate 2: test + coverage                                      │
│  ├── Quality Gate 3: security + perf                                      │
│  ├── Quality Gate 4: contract check (S10v2 SLOs)                         │
│  ├── Self-heal em falha                                                   │
│  └── Publica 'gate.*' eventos no barramento                              │
└───────────────────────┬────────────────────────────────────────────────────┘
                        │ PASS
                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  S16 (Deploy) — Entrega progressiva                                       │
│  ├── Feature flags (S6)                                                   │
│  ├── IaC via OpenTofu (S15 Cloud)                                         │
│  ├── GitOps via ArgoCD/Flux (S16)                                         │
│  ├── Canary deploy + rollback                                             │
│  └── Publica 'deploy.*' eventos                                           │
└───────────────────────┬────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  S17 (Observabilidade) — Monitora tudo                                    │
│  ├── OpenTelemetry collector recebe traces, metrics, logs                 │
│  ├── LangFuse para LLM observability                                      │
│  ├── Prometheus + Grafana dashboards                                      │
│  ├── Alertas baseados em SLOs (S10v2)                                    │
│  └── Feedback para S7 (Aprendizado)                                      │
└───────────────────────┬────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  S7 (Aprendizado) — Melhora contínua                                      │
│  ├── Cross-project pattern detection                                      │
│  ├── Reflection: aprende com erros                                        │
│  ├── Adaptive autonomy: mais confiança → mais autonomia                   │
│  ├── Feedback pipeline: usuário avalia resultado                          │
│  └── Atualiza S2 (memória), S19 (prompts), S4 (políticas)               │
└────────────────────────────────────────────────────────────────────────────┘
```

### Flow B: Chat Streaming

```
S11 (Theia)                       S1 (NATS)                     S5 (Agentes)
────────────────────────────────────────────────────────────────────────────────
User digita
  │
  ▼
[ChatWidget] ───WebSocket──→ [WS Bridge] ───NATS──→ [Chat Agent (Theia AI)]
  │                             │                       │
  │                             │                  S19: Prompt Template
  │                             │                  S2: Context from Memory
  │                             │                  S4: Security scan
  │                             │                       │
  │                             │                  Provider Router → LLM
  │                             │                       │
  │                             │               Stream de tokens
  │                             │                       │
  │◄────SSE stream──────────────┼───────────────────────┘
  │                             │
  ▼                             │
Renderiza markdown              │
Code blocks                     │
Diff preview                    │
  │                             │
  └── Aprova/Action ──────────NATS──→ [Agent Runtime] executa tarefa
                                         │
                                    S6: Quality Gate
                                    S4: Policy Check
                                         │
                                    Resultado
                                         │
◄────────────────────────────────────NATS── Result streaming
```

### Flow C: Deploy Automatizado

```
S5 (DevOps Agent)          S6 (Pipeline)             S16 (Deploy)
─────────────────────────────────────────────────────────────────────────────
  │                           │                          │
  │── 'deploy.start' pub ──►  │                          │
  │                           ├── QG Lint ──── pass ──►  │
  │                           ├── QG Type ──── pass ──►  │
  │                           ├── QG Test ─── pass ──►   │
  │                           ├── QG Sec ───── pass ──►  │
  │                           │                          │
  │◄── feedback ──────────────┤                          │
  │                           │── Dagger Build ──────►    │
  │                           │   ├── docker build        │
  │                           │   ├── push registry       │
  │                           │   └── update GitOps repo  │
  │                           │                          │
  │                           │                          ├── ArgoCD sync
  │                           │                          ├── Canary 10%
  │                           │                          ├── Monitor S17
  │                           │                          ├── Canary 50%
  │                           │                          ├── Full rollout
  │                           │                          └── 'deploy.done' pub
  │                           │                              │
  │◄───────────────────────────────────────────────────────┘
  │
  ├── Publica métricas no S17
  └── Atualiza S2 com aprendizado do deploy
```

### Flow D: Erro/Rollback

```
S5 (Agente)           S6 (Pipeline)          S1 (Eventos)          S17 (Obs)
────────────────────────────────────────────────────────────────────────────────
  │                       │                       │                    │
  │── code.gen ──────────►│                       │                    │
  │                       ├── QG Lint ── FAIL     │                    │
  │                       │  'gate.failed' pub ───┼────►              │
  │                       │                       │              Alerta gerado
  │◄── self-heal ─────────┤                       │                    │
  │   corrige erro        │                       │                    │
  │── code.fix ──────────►│                       │                    │
  │                       ├── QG Lint ── pass     │                    │
  │                       ├── QG Test ── FAIL     │                    │
  │                       │  'gate.failed' pub ───┼────►              │
  │                       │                       │              Rollback acionado
  │                       ├── Estado anterior     │                    │
  │                       │── checkp.rollback ──► │                    │
  │                       │                       │                    │
  │◄── evento rollback ───┼───────────────────────┘                    │
  │                       │                                       Métrica registrada
  │── Aprende ───────────► S7: Reflection sobre o erro               │
  │   Evita repetir       │                                       Dashboard atualizado
  │                       │                                            │
  └── Atualiza S2 ───────► memory.store(error, context)              │
```

### Flow E: Aprendizado Cross-Projeto

```
S2 (Memória)                  S7 (Learning Engine)          S5 (Agentes)
────────────────────────────────────────────────────────────────────────────────
Projeto A concluído
  │                                │                              │
  ├── memory.decisions ──────────► │                              │
  ├── memory.patterns ───────────►│                              │
  ├── memory.feedback ───────────►│                              │
  │                                │                              │
  │                                ├── Cross-project analysis     │
  │                                ├── Pattern detection (LLM)    │
  │                                ├── Cluster por domínio        │
  │                                ├── Identifica best practices  │
  │                                │                              │
  │                                │── Atualiza S2: KG ────────►  │
  │                                │   newNode:Pattern            │
  │                                │   newRel:APPLIES_TO          │
  │                                │                              │
  │                                │── Atualiza S19: ────────►    │
  │◄── context enriquecido ───────┤   Prompt templates           │
  │    para Projeto B             │   Few-shot examples          │
  │                                │                              │
  │                                │── Atualiza S4: ────────►    │
  │                                │   Policy refinements        │
  │                                │                              │
  │                                │                              │
Projeto B inicia                   │                              │
  │                                │                              │
  └── context.warm (S3) ──────────►                              │
       S3 recupera padrões ────────────────────────────────────► │
       de Projeto A                                                │
       melhores práticas                                           │
       decisões anteriores                                         │
```

---

## 4. Registro de Componentes Compartilhados

### 4.1 AgentArtifact

```typescript
interface AgentArtifact {
  id: string                    // UUID v7
  type: 'code' | 'doc' | 'config' | 'test' | 'diagram' | 'decision' | 'report' | 'spec' | 'architecture'
  agentId: string
  taskId: string
  name: string
  description?: string
  content: string | Buffer
  language?: string
  filePath?: string
  metadata: {
    created: ISO8601
    updated: ISO8601
    version: number
    checksum: string            // SHA-256
    size: number
    status: 'draft' | 'review' | 'approved' | 'rejected' | 'done'
  }
  relations?: {
    dependsOn?: string[]
    implements?: string[]
    replaces?: string[]
    supersededBy?: string
  }
  risk?: RiskAssessment
  traceId: string
}

// Estudos consumidores:
// S5 (Multiagente)    — produção e consumo primário
// S1 (Eventos)        — transporte via NATS (artifact.created/updated/approved)
// S2 (Memória)        — persistência e indexação
// S6 (Pipeline)       — verificação de qualidade nos artefatos
// S10 (Stacking)      — contrato de dados entre camadas 7→4→1
// S11 (Theia)         — exibição no editor e diff viewer
// S17 (Observabilidade) — tracing de criação/modificação de artefatos
// S3 (Intenção)       — plano gera artefatos de especificação
```

### 4.2 BusEvent (Event Envelope)

```typescript
interface BusEvent {
  id: string                    // UUID v7 (time-ordered)
  type: EventType
  source: string                // module/agent que emitiu
  payload: Record<string, unknown>
  timestamp: ISO8601
  traceId: string               // W3C trace context
  causationId?: string          // evento que causou este
  correlationId?: string        // fluxo/processo
  headers?: {
    'Nats-Msg-Id'?: string      // dedup key
    'X-Schema-Version'?: number
    'X-Retry-Count'?: number
    'X-TTL'?: number
  }
}

type EventType =
  | 'task.{started,completed,failed}'
  | 'memory.record.{created,updated,deleted}'
  | 'agent.task.{assigned,completed,failed}'
  | 'agent.decision.{made,approved,rejected}'
  | 'policy.{evaluated,violated}'
  | 'approval.{requested,granted,denied}'
  | 'shell.command.{executed,failed}'
  | 'file.{created,modified,deleted}'
  | 'deploy.{started,completed,failed,rolled_back}'
  | 'cycle.{started,completed,failed}'
  | 'feedback.{submitted,processed}'
  | 'user.{action,message,decision}'
  | 'intent.{classified,decomposed}'
  | 'plan.{created,approved,rejected}'
  | 'gate.{passed,failed}'
  | 'colab.{joined,left,edit,conflict}'
  | 'plugin.{installed,uninstalled,errored}'
  | 'security.{scan,incident,alert}'

// Estudos consumidores:
// S1 (Eventos)        — definição e transporte (dono)
// S5 (Multiagente)    — emissão e consumo de eventos de agente
// S2 (Memória)        — consumo de memory.* eventos
// S4 (Segurança)      — consumo de policy.* e approval.* eventos
// S6 (Pipeline)       — consumo de gate.* e task.* eventos
// S17 (Observabilidade) — consumo de todos os eventos para tracing
// S10 (Stacking)      — contratos de evento entre camadas
// S10v2 (Stacking v2) — SLOs por tipo de evento
// S12 (Testes)        — contract testing de eventos
// S22 (Colaboração)   — colab.* eventos
```

### 4.3 Task

```typescript
interface Task {
  id: string
  type: 'compile' | 'lint' | 'test' | 'build' | 'deploy' | 'generate' | 'review' | 'plan' | 'design' | 'refactor'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  priority: 0 | 1 | 2 | 3
  workflowId: string
  agentId?: string
  dependsOn: string[]
  input: {
    description: string
    context: Record<string, unknown>
    files?: string[]
    params?: Record<string, unknown>
  }
  output?: {
    exitCode: number
    stdout: string
    stderr: string
    artifacts: string[]
    durationMs: number
    qualityScore?: number
  }
  error?: {
    message: string
    stack?: string
    stage: string
    recoverable: boolean
  }
  attempts: number
  maxRetries: number
  deadline?: ISO8601
  startedAt?: ISO8601
  completedAt?: ISO8601
  traceId: string
  tags: string[]
  autonomyLevel: 0 | 1 | 2 | 3 | 4
}

// Estudos consumidores:
// S3 (Intenção)       — decomposição em tasks
// S5 (Multiagente)    — execução das tasks
// S4 (Segurança)      — policy evaluation por task
// S1 (Eventos)        — task.* eventos
// S2 (Memória)        — persistência de task history
// S6 (Pipeline)       — tasks como stages do pipeline
// S10 (Stacking)      — schema entre camadas 7-4
// S7 (Aprendizado)    — análise de padrões de task
// S17 (Observabilidade) — métricas de execução
```

### 4.4 Decision

```typescript
interface Decision {
  id: string
  type: 'architectural' | 'design' | 'implementation' | 'deploy' | 'risk' | 'policy' | 'intent'
  subject: string
  context: string
  alternatives: Array<{
    name: string
    description: string
    pros: string[]
    cons: string[]
    risk: 'low' | 'medium' | 'high'
    estimatedEffort?: string
  }>
  chosen: string
  rationale: string
  madeBy: { type: 'user' | 'agent', id: string }
  approvedBy?: { type: 'user' | 'agent', id: string }
  status: 'pending' | 'approved' | 'rejected' | 'superseded'
  supersededBy?: string
  relatedArtifacts?: string[]
  tags: string[]
  timestamp: ISO8601
  traceId: string
  effects?: Array<{
    type: 'created' | 'modified' | 'risk' | 'cost'
    description: string
    magnitude: 'low' | 'medium' | 'high'
  }>
}

// Estudos consumidores:
// S3 (Intenção)       — geração de decisões de design
// S5 (Multiagente)    — agentes tomam decisões
// S4 (Segurança)      — auditoria de decisões
// S2 (Memória)        — persistência para aprendizado futuro
// S1 (Eventos)        — agent.decision.* eventos
// S6 (Pipeline)       — decisões afetam quality gates
// S10 (Stacking)      — contrato entre agentes
// S7 (Aprendizado)    — análise de qualidade das decisões
// S17 (Observabilidade) — tracing de decisões
```

### 4.5 Memory (MemoryRecord)

```typescript
interface Memory {
  id: string
  type: 'episodic' | 'semantic' | 'procedural'
  namespace: string
  scope: 'session' | 'project' | 'user' | 'global'
  content: string | Record<string, unknown>
  embedding?: Float32Array
  metadata: {
    category: string
    importance: number
    accessCount: number
    lastAccessed: ISO8601
    validFrom: ISO8601
    validTo?: ISO8601
    source: 'user' | 'agent' | 'system' | 'llm'
    confidence: number
    ttl?: number
  }
  entities?: Array<{ name: string, type: string, role: string }>
  relations?: Array<{ source: string, target: string, type: string }>
  previousVersions?: string[]
  supersededBy?: string
  checksum: string
  createdAt: ISO8601
  updatedAt: ISO8601
  traceId: string
}

// Estudos consumidores:
// S2 (Memória)        — dono do schema (store, index, search)
// S1 (Eventos)        — memory.* eventos
// S3 (Intenção)       — recuperação de contexto
// S5 (Multiagente)    — agentes salvam/recuperam memória
// S7 (Aprendizado)    — análise cross-project
// S4 (Segurança)      — scan de memórias
// S17 (Observabilidade) — tracing de queries
// S19 (Prompts)       — injeção de memória como contexto
// S11 (Theia)         — memory viewer widget
```

### 4.6 TraceContext (W3C)

```typescript
// Header traceparent: "00-trace_id-span_id-01"
// Header tracestate: "ideia=version,agent_id,autonomy_level"

interface TraceContext {
  version: string               // "00"
  traceId: string               // 32 hex chars (16 bytes)
  spanId: string                // 16 hex chars (8 bytes)
  traceFlags: string            // "01" = sampled
  tracestate?: {
    serviceVersion?: string
    agentId?: string
    autonomyLevel?: 0|1|2|3|4
    sourceStudy?: string
    causationChain?: string[]
  }
}

// Estudos consumidores:
// S17 (Observabilidade) — dono (OTel SDK)
// S1 (Eventos)        — propagação via NATS headers
// S5 (Multiagente)    — spans de agente
// S6 (Pipeline)       — spans de pipeline
// S2 (Memória)        — spans de query
// S4 (Segurança)      — spans de policy/audit
// S7 (Aprendizado)    — correlação de spans com outcomes
// S22 (Colaboração)   — spans de sessão
// S10v2 (Stacking)    — SLO tracing
```

### 4.7 PolicyDecision

```typescript
interface PolicyDecision {
  action: string
  subject: {
    type: 'user' | 'agent' | 'system'
    id: string
    roles: string[]
    autonomyLevel: 0|1|2|3|4
  }
  resource: {
    type: string
    id: string
    path?: string
  }
  context: {
    projectId?: string
    stage: string
    riskScore?: number
  }
  decision: 'allow' | 'deny' | 'ask'
  rule?: string
  explanations?: string[]
  decisionId: string
  timestamp: ISO8601
  traceId: string
}

// Estudos consumidores:
// S4 (Segurança)      — dono (Policy Engine)
// S5 (Multiagente)    — toda ação de agente passa por policy
// S1 (Eventos)        — policy.* eventos
// S6 (Pipeline)       — gates de segurança
// S14 (Auth)          — identidade e RBAC
// S18 (AI Safety)     — políticas de safety
// S2 (Memória)        — persistência de decisões
// S17 (Observabilidade) — tracing de policy
// S7 (Aprendizado)    — refinamento de políticas
```

### 4.8 ContractSLO

```typescript
interface ContractSLO {
  contractId: string            // referência ao contrato em S10
  metric: string                // "latency.p95" | "throughput" | "error_rate"
  threshold: number
  window: string                // "5m" | "1h" | "24h"
  severity: 'warning' | 'critical'
  action: 'alert' | 'block' | 'rollback'
  status: 'met' | 'violated' | 'breached'
  burnRate: number              // % do budget consumido
  remainingBudget: number
  lastCheck: ISO8601
  traceId: string
}

// Estudos consumidores:
// S10v2 (Stacking v2) — definição (dono)
// S17 (Observabilidade) — monitoramento
// S5 (Multiagente)    — SLOs de comunicação entre agentes
// S6 (Pipeline)       — SLOs de quality gates
// S1 (Eventos)        — eventos de violação
// S12 (Testes)        — contract testing com SLOs
// S13 (Performance)   — thresholds de performance
```

### 4.9 Session

```typescript
interface Session {
  id: string
  projectId: string
  userId: string
  status: 'active' | 'paused' | 'closed'
  startedAt: ISO8601
  lastActivity: ISO8601
  context: {
    memoryIds: string[]
    activeArtifacts: string[]
    currentTask?: string
    autonomyLevel: 0|1|2|3|4
  }
  participants: Array<{
    id: string
    type: 'user' | 'agent'
    role: string
    joinedAt: ISO8601
  }>
  colabState?: {
    ydocState: string           // Yjs encoded state
    awareness: any
    cursorPositions: Array<{ userId: string, position: any }>
  }
  metadata: {
    totalCommands: number
    totalTokens: number
    totalDuration: number
  }
  traceId: string
}

// Estudos consumidores:
// S22 (Colaboração)   — dono (multi-user sessions)
// S11 (Theia)         — sessão do editor
// S2 (Memória)        — contexto da sessão
// S5 (Multiagente)    — agentes na sessão
// S7 (Aprendizado)    — padrões por sessão
// S17 (Observabilidade) — métricas de sessão
// S4 (Segurança)      — controle de acesso à sessão
```

### 4.10 QualityGateResult

```typescript
interface QualityGateResult {
  gateName: string
  stage: 'lint' | 'typecheck' | 'test' | 'security' | 'perf' | 'contract' | 'build'
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
  score: number                 // 0-100
  threshold: number
  details: Array<{
    check: string
    passed: boolean
    message: string
    severity: 'error' | 'warning' | 'info'
    location?: { file: string, line?: number }
  }>
  metrics: {
    duration: number
    itemsChecked: number
    itemsFailed: number
  }
  timestamp: ISO8601
  traceId: string
  triggeredBy: string           // agentId | 'pipeline' | 'manual'
}

// Estudos consumidores:
// E3 (Qualidade)      — definição dos gates
// S6 (Pipeline)       — execução (dono operacional)
// S12 (Testes)        — implementação das suites
// S13 (Performance)   — gates de performance
// S4 (Segurança)      — gates de segurança
// S5 (Multiagente)    — agentes recebem feedback
// S17 (Observabilidade) — dashboards de qualidade
// S7 (Aprendizado)    — padrões de falha
// S10v2 (Stacking)    — SLOs dos gates
```

---

## 5. Grafo de Dependências de Implementação

### 5.1 Grafo de Dependências Diretas

```
FASE 0 (Semanas 1-4) — Fundação:
  S11 (Theia) ──────────────────────────────────────┐
  S19 (Prompts) ────────────────────────────────────┤
    ↓                                                │
  S3 (Intenção) ──── depende de ──── S19             │
    ↓                                                 │
  S2 (Memória) ──── depende de ──── S11 (persistir)─┘
    ↓
  S1 (Eventos) ──── depende de ──── S2 (persistir eventos)

FASE 1 (Semanas 5-8) — Infraestrutura:
  S4 (Segurança) ──── depende de ──── S1 (eventos de policy)
    ↓                    depende de ──── S14 (Auth) [Fase 2]
  S14 (Auth) ──── pode ser paralelo a S4

FASE 2 (Semanas 9-12) — Inteligência:
  S5 (Multiagente) ──── depende de ──── S1 (comunicação)
                         depende de ──── S3 (planos)
                         depende de ──── S2 (contexto)
                         depende de ──── S4 (segurança)
                         depende de ──── S19 (prompts)

FASE 3 (Semanas 13-20) — Pipeline:
  S6 (Pipeline) ──── depende de ──── S5 (artefatos)
                      depende de ──── S4 (gates de segurança)
                      depende de ──── S12 (Testes) [Fase 1+]
                      depende de ──── S13 (Performance) [Fase 2+]
    ↓
  S16 (Deploy) ──── depende de ──── S6 (artefatos aprovados)
                     depende de ──── S15 (Cloud) [Fase 2+]

FASE 4 (Semanas 21-28) — Aprendizado:
  S7 (Aprendizado) ──── depende de ──── S2 (dados históricos)
                         depende de ──── S5 (performance de agentes)
                         depende de ──── S6 (dados de pipeline)
    ↓
  S18 (AI Safety) ──── depende de ──── S7 (modelos de segurança)
                        depende de ──── S4 (políticas)

FASE 5 (Semanas 29-36) — UX e Colaboração:
  S22 (Colaboração) ──── depende de ──── S1 (NATS pub/sub)
                          depende de ──── S11 (Theia multi-instance)
    ↓
  S20 (Plugins) ──── depende de ──── S11 (Theia extension API)
                      depende de ──── S5 (agent API para plugins)

FASE 6 (Semanas 37-44) — Desktop e Terminal:
  E5 (Desktop) ──── depende de ──── S11 (Theia app)
                     depende de ──── S21 (Terminal)
  S21 (Terminal) ──── depende de ──── S11 (Theia widget)

FASE 7+ (Semanas 45-52) — Ecossistema:
  S20 (Plugins) ──── roda continuamente após S11 + S5 estáveis
  S8 (Emergentes) ──── explora novas tecnologias continuamente
```

### 5.2 Grafo Textual (ASCII)

```
                         ┌──────────┐
                         │  S11     │
                         │ (Theia)  │
                         └────┬─────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  S19     │   │  E5      │   │  S20     │
        │ (Prompts)│   │(Desktop) │   │ (Plugins)│
        └────┬─────┘   └──────────┘   └──────────┘
             │
             ▼
       ┌──────────┐     ┌──────────┐
       │  S3      │◄────│  S2      │
       │(Intenção)│     │(Memória) │
       └────┬─────┘     └────┬─────┘
            │                │
            ▼                │
       ┌──────────┐          │
       │  S1      │◄─────────┘
       │(Eventos) │
       └────┬─────┘
            │
     ┌──────┼──────┐
     │      │      │
     ▼      ▼      ▼
┌────────┐ ┌────┐ ┌────┐
│  S4    │ │S14 │ │S22 │
│(Seg.) │ │Auth│ │Colab│
└───┬────┘ └────┘ └────┘
    │
    ▼
┌──────────┐
│  S5      │
│(Multiag.)│
└────┬─────┘
     │
     ▼
┌──────────┐     ┌──────────┐
│  S6      │◄────│  S12     │
│(Pipeline)│     │ (Testes) │
└────┬─────┘     └──────────┘
     │
     ├──────────────────┐
     │                  │
     ▼                  ▼
┌──────────┐     ┌──────────┐
│  S16     │     │  S13     │
│ (Deploy) │     │(Perf.)   │
└────┬─────┘     └──────────┘
     │
     ▼
┌──────────┐
│  S15     │
│ (Cloud)  │
└──────────┘

┌──────────┐     ┌──────────┐
│  S7      │◄────│  S2/S5   │
│(Aprend.) │     │ /S6      │
└────┬─────┘     └──────────┘
     │
     ▼
┌──────────┐
│  S18     │
│(AI Safe) │
└──────────┘

┌──────────┐
│  S8      │
│(Emerg.)  │── Explora e alimenta todos os estudos
└──────────┘

┌──────────┐     ┌──────────┐
│  S9      │     │ S9v2     │
│(Matriz)  │────►│ (Matriz  │── Documentam todas as tecnologias
└──────────┘     │   v2)    │
                 └──────────┘

┌──────────┐     ┌──────────┐
│  S10     │     │ S10v2    │
│(Stacking)│────►│ (Stack.  │── Contratos e SLOs entre todos
└──────────┘     │   v2)    │
                 └──────────┘
```

### 5.3 Critical Path (Caminho Crítico)

```
S11 → S19 → S3 → S1 → S4 → S5 → S6 → S16 → S15
  │      │     │     │     │     │     │      │
  │      │     │     │     │     │     │      └── Cloud/Infra
  │      │     │     │     │     │     └── Deploy progressivo
  │      │     │     │     │     └── Pipeline + Gates
  │      │     │     │     └── Segurança
  │      │     │     └── Event Bus
  │      │     └── Intent → Plan
  │      └── Prompt Engineering
  └── Theia Platform
```

Qualquer atraso em S11, S3, S1, S4 ou S5 bloqueia toda a cadeia. Estes são os **estudos críticos** que devem ser priorizados no roadmap.

---

## 6. Estratégias de Teste Cross-Study

### 6.1 S1 ↔ S5 (Event Bus + Multiagente)

| Tipo | Abordagem | Ferramenta | Cenário |
|------|-----------|------------|---------|
| **Contrato** | CDC para cada tipo de evento (agent.*, task.*) | Pact JS | Produtor S5 → Consumidor S1; Consumidor S5 → Produtor S1 |
| **Integração** | NATS JetStream cluster local + agentes mock | Testcontainers + Jest | 3 agentes publicam e consomem 1000 eventos/s; verificar ordering e dedup |
| **E2E** | Chat → Intenção → Agente → Evento → Resultado | Playwright + custom | Usuário envia "crie uma API REST"; verificar sequência de eventos no bus |
| **Performance** | Throughput de eventos por agente | k6 + NATS benchmark | 10 agentes × 50 msg/s; latência P95 < 10ms |
| **Segurança** | Injeção de eventos maliciosos | Custom security suite | Evento com payload adulterado; DLQ captura; auditoria registra |

### 6.2 S3 ↔ S5 (Intenção + Multiagente)

| Tipo | Abordagem | Ferramenta | Cenário |
|------|-----------|------------|---------|
| **Contrato** | Plan → Task schema validação | Zod + Pact | Plano gerado por S3 respeita schema que S5 consome |
| **Integração** | Intent → Decompose → Assign → Execute | Jest + LangGraph | Classificador identifica "refatorar" → ADAPT decompõe → agentes executam |
| **E2E** | Pipeline completo de intenção | Playwright | Usuário: "adicione autenticação JWT"; verificar tasks no board |
| **Performance** | Decomposição sob carga | k6 | 100 intenções simultâneas; tempo médio de decomposição < 5s |
| **Segurança** | Intent injection | Red teaming | Prompt malicioso classificado como "explorar"; policy bloqueia |

### 6.3 S5 ↔ S6 (Multiagente + Pipeline)

| Tipo | Abordagem | Ferramenta | Cenário |
|------|-----------|------------|---------|
| **Contrato** | Artifact schema entre agentes e gates | Pact | Agente produz artefato → gate consome e valida |
| **Integração** | Code → Lint → Test → Build → Gate | Dagger + Jest | Agente gera código → pipeline executa gates → corrige se falha |
| **E2E** | Agente → Gate → Correção → Aprovação | Playwright | Agente gera código com bug → gate detecta → agente corrige → gate passa |
| **Performance** | Pipeline throughput | k6 | 10 artefatos simultâneos; tempo de gate < 30s |
| **Segurança** | Código malicioso no artefato | OWASP ZAP + Garak | Agente injeta código malicioso → gate de segurança bloqueia |

### 6.4 S4 ↔ S5 (Segurança + Multiagente)

| Tipo | Abordagem | Ferramenta | Cenário |
|------|-----------|------------|---------|
| **Contrato** | Policy schema + SafetyResult | Pact | Toda ação de agente produz PolicyDecision válida |
| **Integração** | Action → PolicyCheck → SafetyScan → Execute | Jest + OPA | Agente tenta escrever em /etc/passwd → policy deny → audit registra |
| **E2E** | Ação bloqueada → aprovação humana → executada | Playwright | Agente quer acessar rede → policy 'ask' → user aprova → executa |
| **Performance** | Policy evaluation throughput | k6 | 1000 req/s de policy check; latência < 5ms |
| **Segurança** | Policy bypass | Red teaming | Tentativas de contornar policy engine; injection via agent context |

### 6.5 S2 ↔ S5 (Memória + Multiagente)

| Tipo | Abordagem | Ferramenta | Cenário |
|------|-----------|------------|---------|
| **Contrato** | Memory schema + ContextItem | Pact | Agente salva → recupera memory record consistente |
| **Integração** | Agente → save → load → contexto de nova tarefa | Jest + SQLite | Agente salva decisão de arquitetura → segundo agente recupera |
| **E2E** | Sessão 1: decisão → Sessão 2: contexto recuperado | Playwright | Usuário toma decisão na sessão 1 → sessão 2 IDEIA lembra |
| **Performance** | Retrieval sob carga | k6 | 1000 queries simultâneas; P99 < 100ms |
| **Segurança** | Memory poisoning | Red teaming | Dados maliciosos inseridos na memória → detecção de anomalia |

### 6.6 S2 ↔ S7 (Memória + Aprendizado)

| Tipo | Abordagem | Ferramenta | Cenário |
|------|-----------|------------|---------|
| **Contrato** | LearningRecord → Memory | Pact | Padrão detectado por S7 persiste em S2 com schema correto |
| **Integração** | Memory stream → pattern detection → knowledge graph update | Jest + Neo4j | 1000 memórias → S7 detecta padrões → S2 atualiza KG |
| **E2E** | Cross-project learning | Playwright | Projeto A: prefere Express → Projeto B: IDEIA sugere Express |
| **Performance** | Pattern detection throughput | k6 | 10000 memórias; detecção em < 60s |
| **Segurança** | Pattern poisoning | Red teaming | Padrões falsos injetados → detecção de anomalia |

### 6.7 S1 ↔ S17 (Eventos + Observabilidade)

| Tipo | Abordagem | Ferramenta | Cenário |
|------|-----------|------------|---------|
| **Contrato** | BusEvent + TraceContext | Pact + OTel | Todo evento NATS carrega tracecontext válido |
| **Integração** | Event → OTel span → LangFuse trace | Jest + OTel SDK | Evento publicado → span criado → visível no LangFuse |
| **E2E** | Causation chain | Playwright | Evento A causa B que causa C; trace mostra causationId chain |
| **Performance** | Tracing overhead | k6 | 10000 eventos/s; tracing overhead < 5% |
| **Segurança** | Trace poisoning | Red teaming | TraceID adulterado → detecção de anomalia |

### 6.8 S6 ↔ S16 (Pipeline + Deploy)

| Tipo | Abordagem | Ferramenta | Cenário |
|------|-----------|------------|---------|
| **Contrato** | DeployArtifact → GitOps manifest | Pact + ArgoCD | Artefato do pipeline gera manifest válido para ArgoCD |
| **Integração** | Gate pass → Dagger build → ArgoCD sync | Dagger + k8s mock | Gate passa → build → push → sync → deploy |
| **E2E** | Canary deploy + rollback | Playwright + k8s | Deploy canary 10% → métricas S17 OK → 100% → rollback se falha |
| **Performance** | Deploy time under load | k6 | 10 deploys simultâneos; tempo < 5min |
| **Segurança** | Deploy poisoning | Red teaming | Artefato adulterado → signature verification falha |

### 6.9 S11 ↔ S5 (Theia + Multiagente)

| Tipo | Abordagem | Ferramenta | Cenário |
|------|-----------|------------|---------|
| **Contrato** | ChatAgent → AgentRuntime interface | Pact + Theia test | ChatAgent (Theia) invoca AgentRuntime com schema correto |
| **Integração** | Chat → Agent → Tool → Result → UI | Theia extension test | Usuário digita comando → agente executa → resultado no chat |
| **E2E** | IDEIA command flow | Playwright + Theia | Ctrl+Shift+P → "criar função" → agente gera → diff aparece |
| **Performance** | UI responsiveness | k6 + Lighthouse | Agent response renderizado em < 100ms |
| **Segurança** | Theia command injection | Red teaming | Comando malicioso via chat → policy bloqueia |

### 6.10 S4 ↔ S6 ↔ S16 (Security + Pipeline + Deploy)

| Tipo | Abordagem | Ferramenta | Cenário |
|------|-----------|------------|---------|
| **Contrato** | SecurityGate → PipelineGate → DeployGate | Pact | Saída de S4 é entrada para S6 gates que bloqueiam S16 |
| **Integração** | Security scan → gate fail → pipeline halt | Jest + OPA | S4 detecta vuln crítica → S6 gate falha → S16 não executa |
| **E2E** | Security → Block → Fix → Deploy | Playwright | Scan detecta secret no código → bloqueia → dev corrige → deploy |
| **Performance** | Security scan throughput | k6 | 1000 arquivos; scan completo < 60s |
| **Segurança** | Supply chain attack | Red teaming | Dependência maliciosa → SBOM detecta → gate bloqueia |

---

## 7. Observabilidade Através dos Estudos

### 7.1 Propagação de Contexto Trace

```
W3C Trace Context flui através de todos os estudos:

S11 (Theia)
  │
  │ JSON-RPC (traceparent header)
  ▼
S3 (Intenção)
  │
  │ NATS (traceparent + tracestate headers)
  ▼
S4 (Segurança)
  │
  │ NATS (traceparent header)
  ▼
S5 (Multiagente)
  │
  │ LangGraph checkpoint (traceId no state)
  │ MCP request (traceparent header)
  │ A2A message (traceparent header)
  ▼
S6 (Pipeline)
  │
  │ Dagger pipeline (traceparent propagado)
  │ GitHub Actions (tracestate: ideia)
  ▼
S16 (Deploy)
  │
  │ ArgoCD sync (traceId na annotation)
  │ Canary metrics (traceId no label)
  ▼
S17 (Observabilidade)
  │
  │ OTel Collector → LangFuse / Prometheus / Loki
  │
  ▼
Dashboard Grafana (traceId link entre todos os spans)
```

### 7.2 Métricas Compartilhadas

| Nome da Métrica | Estudos | Tipo | Descrição | Labels |
|----------------|---------|------|-----------|--------|
| `ideia.event.throughput` | S1, S17 | Counter | Eventos/s por tópico | topic, source, status |
| `ideia.event.latency` | S1, S17 | Histogram | Latência P50/P95/P99 | topic, consumer |
| `ideia.agent.task.duration` | S5, S17 | Histogram | Duração de task por agente | agent_id, task_type, status |
| `ideia.agent.task.success` | S5, S7, S17 | Counter | Tasks por resultado | agent_id, task_type, autonomy_level |
| `ideia.agent.llm.cost` | S5, S17, S9v2 | Counter | Tokens e custo por agente | agent_id, model, provider |
| `ideia.memory.query.latency` | S2, S17 | Histogram | Latência de retrieval | store_type, hit, strategy |
| `ideia.memory.cache.ratio` | S2, S17 | Gauge | Cache hit/miss ratio | store_type |
| `ideia.security.policy.latency` | S4, S17 | Histogram | Tempo de avaliação | policy_type, decision |
| `ideia.security.violations` | S4, S18, S17 | Counter | Violações por severidade | severity, rule, agent_id |
| `ideia.pipeline.gate.duration` | S6, S17 | Histogram | Duração por gate | gate_name, status |
| `ideia.pipeline.gate.passrate` | S6, E3, S17 | Gauge | % de passagem | gate_name, stage |
| `ideia.deploy.frequency` | S16, S17 | Counter | Deploys por ambiente | env, status, strategy |
| `ideia.deploy.duration` | S16, S17 | Histogram | Tempo de deploy | env, strategy |
| `ideia.colab.session.active` | S22, S17 | Gauge | Sessões ativas | participants |
| `ideia.colab.edit.conflict` | S22, S17 | Counter | Conflitos de edição | document |
| `ideia.slo.violations` | S10v2, S17 | Counter | Violações de SLO | contract_id, metric, severity |
| `ideia.learning.patterns` | S7, S17 | Counter | Padrões detectados | type, confidence |
| `ideia.theia.commands` | S11, S17 | Counter | Comandos executados | command, source |
| `ideia.plugin.errors` | S20, S17 | Counter | Erros de plugin | plugin_id, error_type |
| `ideia.terminal.sessions` | S21, S17 | Gauge | Sessões de terminal ativas | |

### 7.3 Log Correlation

```json
// Log padrão (JSON) com campos de correlação cross-study:
{
  "timestamp": "2026-07-18T14:30:00.123Z",
  "level": "info",
  "service": "agent-runtime",
  "traceId": "0af7651916cd43dd8448eb211c80319c",
  "spanId": "b7ad6b7169203331",
  "causationId": "8c3a1f9e2d4b6a7c",
  "study": "S5",
  "studyPair": "S5↔S1",
  "eventType": "agent.task.completed",
  "agentId": "architect-1",
  "taskId": "task-42",
  "autonomyLevel": 2,
  "durationMs": 15234,
  "sloStatus": "met",
  "contractVersion": "2.1",
  "payload": {
    "artifactCount": 3,
    "qualityScore": 0.92
  }
}
```

### 7.4 Dashboards por Cross-Study Flow

#### Dashboard A: Fluxo de Ideia (E1 → S3 → S5 → S6 → S16)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FLUXO IDEIA → SISTEMA                                  [Última hora] [Hoje] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Intenções   Planos      Tasks        Gates      Deploys      Duração      │
│  ┌───────┐   ┌───────┐   ┌───────┐   ┌──────┐   ┌───────┐   ┌──────────┐ │
│  │  42   │   │  38   │   │ 156   │   │ 89%  │   │  12   │   │  avg 24m │ │
│  │ /hora │   │ aceitos│   │ exec. │   │ pass  │   │ /dia  │   │  ideia→  │ │
│  └───────┘   └───────┘   └───────┘   └──────┘   └───────┘   │ deploy   │ │
│                                                              └──────────┘ │
│                                                                             │
│  Gargalos │  S3 (Intenção): ████████░░ 82% accuracy                       │
│           │  S5 (Agentes):  ██████░░░░ 65% first-pass                      │
│           │  S6 (Gates):    █████████░ 89% pass rate                       │
│                                                                             │
│  Timeline │  ┌─────────────────────────────────────────────────────┐      │
│  (fluxo)   │  │ ● ● ● ●   ● ● ●   ● ● ● ● ●   ● ● ●   ●          │      │
│            │  │ Intenção  Plano   Tasks     Gates  Deploy           │      │
│            │  └─────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Dashboard B: Saúde do Sistema Multiagente (S5)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SAÚDE MULTIAGENTE                                       [Time range: 1h]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Agent      Tasks   Success   Avg Dur   Tokens   Cost   SLO Status         │
│  ───────    ─────   ───────   ───────   ──────   ────   ──────────         │
│  Architect   12      92%       3.2m     12.4K    $0.08  ████████░░ 80%     │
│  Programmer  84      78%       8.7m     89.2K    $0.52  ██████░░░░ 62%     │
│  Reviewer    67      95%       1.2m     18.7K    $0.11  █████████░ 88%     │
│  Tester      91      88%       5.4m     34.1K    $0.21  ████████░░ 76%     │
│  DevOps      23      100%      2.1m      8.3K    $0.05  ██████████ 95%     │
│                                                                             │
│  Latência inter-agente │  ┌──────────────────────────────────────┐        │
│                        │  │ P50: 12ms  P95: 45ms  P99: 120ms    │        │
│                        │  └──────────────────────────────────────┘        │
│                                                                             │
│  Fila NATS │  agent.tasks: ████░░░░░░ 120 pending (4.2K/s)                │
│            │  agent.results: ██░░░░░░░░ 45 pending (3.8K/s)               │
│            │  DLQ: ░░░░░░░░░░ 3 messages (0.01%)                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Dashboard C: Qualidade e Pipeline (E3 → S6 → S12 → S13)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ QUALIDADE TOTAL IDEIA                               [7 dimensões em time] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  7 Dimensões                           Score    Target     Gate             │
│  ──────────────────────────            ─────    ───────    ──────           │
│  ██████████░░ Código       80/100      80      80/100     ✅ PR             │
│  ████████░░░░ Segurança    68/100      68      90/100     ❌ Release        │
│  ██████░░░░░░ Performance  54/100      54      80/100     ❌ Release        │
│  █████████░░░ UX           72/100      72      75/100     ❌ Sprint         │
│  ██████████░░ Integração   78/100      78      85/100     ❌ PR             │
│  ███████░░░░░ Resiliência  62/100      62      80/100     ❌ Release        │
│  ████████░░░░ Dados        70/100      70      75/100     ❌ Sprint         │
│                                                                             │
│  Quality Gates (últimas 24h)                                               │
│  Gate 1 (Commit):  ██████████ 98% pass (245/250)                           │
│  Gate 2 (PR):      ████████░░ 82% pass (41/50)                            │
│  Gate 3 (Release): ███████░░░ 67% pass (4/6)                              │
│  Gate 4 (Sprint):  ████████░░ 75% pass (3/4)                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Dashboard D: Observabilidade Cross-Study (S17 + todos)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ OBSERVABILIDADE FULL-STACK                  [Trace: 0af7...0319c]          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Timeline Cross-Study:                                                      │
│  ─────────────────────                                                      │
│                                                                             │
│  S11[Chat] ──▶ S3[Intent] ──▶ S4[Policy] ──▶ S5[Agent] ──▶ S6[Gate] ──▶   │
│    12ms          340ms          8ms            12.5s          4.2s          │
│    └─────────────┴──────────────┴──────────────┴──────────────┴────...      │
│                                                                             │
│  Causation Chain:                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ user.message (S11) → intent.classified (S3) → plan.created (S3)   │    │
│  │ → policy.evaluated (S4) → agent.task.assigned (S5) → ...          │    │
│  │ → gate.passed (S6) → deploy.started (S16) → deploy.completed (S16)│    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  SLOs do Fluxo:                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ Contrato            Métrica         Threshold   Atual     Status   │    │
│  │ intent→plan         latency.p95     < 5s        1.2s      ✅      │    │
│  │ plan→agent          latency.p95     < 2s        0.8s      ✅      │    │
│  │ agent→gate          latency.p95     < 30s       18.4s     ✅      │    │
│  │ gate→deploy         latency.p95     < 60s       42.1s     ✅      │    │
│  │ ideia→entrega       total.p95       < 30min     24.3m     ✅      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Anexo A: Índice de Conexões por Estudo

| Estudo | Conexões Críticas (██) | Principais Pares |
|--------|:---------------------:|-------------------|
| E1 | 4 | S3 (Intenção), S5 (Multiagente), M1, X |
| E2 | 2 | E2v2, M1, X |
| E2v2 | 2 | E2, M1, X |
| E3 | 2 | S6 (Pipeline), S12 (Testes) |
| E4 | 1 | S11 (Theia) |
| E5 | 1 | S11 (Theia) |
| S1 | 8 | S4, S5, S10, S10v2, S17, S2, S22, M1 |
| S2 | 6 | S3, S5, S7, S1, E1, S19 |
| S3 | 6 | S5, S2, S19, S1, E1, M1 |
| S4 | 8 | S5, S6, S1, S14, S18, S19, E3, S16 |
| S5 | 14 | S1, S2, S3, S4, S6, S7, S10, S10v2, S11, S18, S19, S22, E1, M1 |
| S6 | 8 | S4, S5, S12, S15, S16, S17, S13, S1 |
| S7 | 3 | S2, S5, S17 |
| S8 | 2 | S9, S9v2 |
| S9 | 3 | S9v2, S10, S10v2 |
| S9v2 | 3 | S9, S10, S10v2 |
| S10 | 13 | S1, S5, S10v2, S11, S12, S9, S9v2, S14, S15, S16, S17, S18, S19 |
| S10v2 | 13 | S1, S5, S10, S11, S12, S9, S9v2, S14, S15, S16, S17, S18, S19 |
| S11 | 4 | S5, S20, E5, S10 |
| S12 | 3 | S6, E3, S10 |
| S13 | 3 | S6, S15, S16 |
| S14 | 3 | S4, S18, S10 |
| S15 | 2 | S6, S16 |
| S16 | 4 | S6, S15, S17, S4 |
| S17 | 4 | S1, S5, S6, S16 |
| S18 | 4 | S4, S5, S14, S19 |
| S19 | 5 | S3, S5, S2, S4, S18 |
| S20 | 1 | S11 |
| S21 | 1 | S11 |
| S22 | 1 | S5 |
| M1 | 18 | Todos os estudos-chave |
| X | 29 | Todos os 29 estudos |

---

## Anexo B: Matriz de Compatibilidade de Schemas

```
                 AgentArtifact  BusEvent  Task  Decision  Memory  TraceCtx  Policy  SLO  Session  GateResult
                 ────────────  ────────  ────  ────────  ──────  ────────  ──────  ───  ───────  ──────────
AgentArtifact        ──          ✅       ✅     ✅       ✅       ✅        ✅      ░░    ░░       ✅
BusEvent             ✅           ──      ✅     ✅       ✅       ✅        ✅      ✅    ✅       ✅
Task                 ✅          ✅       ──     ✅       ✅       ✅        ✅      ░░    ✅       ✅
Decision             ✅          ✅       ✅     ──       ✅       ✅        ✅      ░░    ░░       ░░
Memory               ✅          ✅       ✅     ✅       ──       ✅        ░░      ░░    ✅       ░░
TraceCtx             ✅          ✅       ✅     ✅       ✅       ──        ✅      ✅    ✅       ✅
Policy               ✅          ✅       ✅     ✅       ░░       ✅        ──      ░░    ░░       ✅
SLO                  ░░          ✅       ░░     ░░       ░░       ✅        ░░      ──    ░░       ✅
Session              ░░          ✅       ✅     ░░       ✅       ✅        ░░      ░░    ──       ░░
GateResult           ✅          ✅       ✅     ░░       ░░       ✅        ✅      ✅    ░░       ──

✅ = Schemas compartilham campos/tipos diretamente
░░ = Schemas são independentes mas referenciam-se via IDs
```

---

## Anexo C: Matriz de Service Dependencies

```
                S1   S2   S3   S4   S5   S6   S7   S11  S14  S16  S17  S19  S22
                ──  ───  ───  ───  ───  ───  ───  ───  ───  ───  ───  ───  ───
NATS/JetStream  [X]   R    R    R    R    R    R    R         R    R         R
MemoryStore      P   [X]   R    R    R         R    R                       R
IntentRouter     P    P   [X]              R              R                  R
PolicyEngine     P    P    P   [X]   R    R         R                       R
AgentRuntime     P    P    P    P   [X]   P    P    R                       P    R
Pipeline         P         P    P    P   [X]        R              R         R
LearningEngine   P    P         P    P    P   [X]                              
Theia Platform   P    P    P    P    P    P    P   [X]       P         P    P
AuthService      P              P                             [X]              
DeployOrch       P    P         P    P    P              P   [X]   R         
OTel SDK         P    P    P    P    P    P    P    P    P    P   [X]   P    P
PromptEngine     P    P    P    P    P                             [X]        
ColabService     P                             R    P         P         P   [X]

[X] = Dono do serviço
 P  = Provider (publica/expõe)
 R  = Requester (consome/chama)
```

---

> **Documento gerado em:** 2026-07-18
> **Versão:** 2.0
> **Estudos integrados:** 30/30
> **Pares analisados:** 435
> **Pares detalhados:** 50
> **Componentes compartilhados:** 10 interfaces/schemas
> **Fluxos cross-study:** 5 diagramas completos
> **Estratégias de teste:** 10 pontos críticos
> **Métricas de observabilidade:** 20 métricas compartilhadas
