# Estudo de Implementação — LangGraph Multiagente (G2)

> **Tipo:** `implementation-study`
> **Status:** `planned`
> **Data:** 2026-07-21
> **Fase:** F2 — ~29h, 12 tarefas
> **Gap:** G2 — AgentRuntime sequencial sem paralelismo

---

## 1. Estado Atual

`packages/agent-runtime/src/` executa agentes sequencialmente:
- `FileSystemStepExecutor` — steps em série
- `agent-coordinator.ts` no CLI — coordenação manual
- Sem paralelismo, sem grafo de execução, sem state machine
- `langgraph-graph.ts` existe mas é stub — `clearTimeout` fix já aplicado (GS37)

## 2. Arquitetura Alvo

```
                ┌──────────────────────┐
                │   Supervisor Agent    │
                │  (LangGraph Graph)   │
                └──────┬───────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
    │ Analyst │  │Program │  │ Reviewer│
    │ Agent   │  │mer Agt │  │ Agent   │
    └─────────┘  └─────────┘  └─────────┘
         │             │             │
    ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
    │  Tester │  │  DevOps │  │ Security│
    │  Agent  │  │  Agent  │  │  Agent  │
    └─────────┘  └─────────┘  └─────────┘
```

## 3. Plano de Implementação

### Etapa 1: Grafo Base (6h)
- Modelar 6 agentes como LangGraph nodes
- Implementar `AgentState` (TypedDict) com mensagens, contexto, decisões
- Conectar nodes em grafo direcionado

### Etapa 2: Supervisor (6h)
- Node supervisor que decide próximo agente
- Roteamento baseado em estado atual
- Handoff entre agentes com contexto preservado

### Etapa 3: Execução Paralela (6h)
- Sub-grafos paralelos para tarefas independentes
- `parallel` node do LangGraph
- Merge de resultados com resolução de conflitos

### Etapa 4: Checkpoint + Retry (4h)
- Checkpoints do LangGraph para resumir execução
- Retry automático em falha de nó
- Timeout por nó com fallback

### Etapa 5: Observabilidade (4h)
- LangSmith tracing
- Métricas por nó (latência, tokens, erros)
- Audit trail de decisões do grafo

### Etapa 6: CLI Integration (3h)
- `IDEIA agent run` → LangGraph execution
- `IDEIA agent status` → visualizar estado do grafo
- `IDEIA agent cancel` → interromper execução

## 4. Dependências

- `langgraph` — npm package (já em node_modules)
- `@langchain/core` — npm package
- `langsmith` — tracing (opcional)
- Graphviz (opcional) — visualização do grafo

## 5. Testes

- Unit: cada node testado isoladamente
- Integration: grafo completo com agentes mockados
- Stress: N agents concorrentes com race detection
- Recovery: checkpoint → crash → resume

## 6. Critérios de Aceitação

- [ ] 6 agentes como LangGraph nodes
- [ ] Supervisor com roteamento dinâmico
- [ ] Execução paralela de sub-grafos
- [ ] Checkpoint + resume em crash
- [ ] CLI integrada (run/status/cancel)
- [ ] LangSmith tracing
