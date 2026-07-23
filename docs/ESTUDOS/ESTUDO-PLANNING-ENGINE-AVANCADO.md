# Estudo: Planning Engine Avançado

> **Cluster 3** da análise cruzada livro-IDEIA.md vs Codebase
> Capítulos de referência: 7, 19, 55
> Data: 2026-07-21

---

## 1. Problema

O planejamento atual (`planner-executor.ts`) é linear e raso:
- `decomposeGoal()` divide por sentenças — sem entender dependências reais
- Todos os steps estimam 15min fixos — sem análise de risco ou custo
- Dependências são lineares (step N depende de step N-1)
- Sem fallback, sem replanejamento, sem critérios de aceite por step

## 2. Abordagem

### 2.1 Novo pacote: `packages/planning-engine`

```
planning-engine/
  src/
    types.ts              # Tipos: Plan, PlannedStep, Risk, Criteria
    decomposer.ts         # AdaptiveDecomposer — top-down + bottom-up
    dependency-analyzer.ts # DependencyAnalyzer — grafo de dependências reais
    risk-estimator.ts     # RiskEstimator — risco por step (impacto x probabilidade)
    cost-estimator.ts     # CostEstimator — tokens, tempo, recursos
    fallback-planner.ts   # FallbackPlanner — Plano B para cada step crítico
    replanner.ts          # DynamicReplanner — replaneja quando falha
    planner.ts            # PlanningEngine — fachada principal
    index.ts
```

### 2.2 Componentes

**AdaptiveDecomposer**: top-down (do objetivo para subtarefas) + bottom-up (do código existente para soluções viáveis), combinando ambos.

**DependencyAnalyzer**: constrói grafo de dependências entre steps (não linear), detecta ciclos, sugere paralelização.

**RiskEstimator**: para cada step, calcula risco = impacto × probabilidade, usando fatores como ambiente, arquivos afetados, criticidade.

**CostEstimator**: estima tokens, tempo e recursos por step baseado em tarefas similares anteriores.

**FallbackPlanner**: para steps críticos, gera Plano B automático.

**DynamicReplanner**: quando um step falha, replaneia os steps subsequentes.

### 2.3 Integração

O `PlanningEngine` substituirá o `PlannerExecutorPipeline` no `agent-runtime`, oferecendo uma interface compatível mas com capacidades expandidas.
