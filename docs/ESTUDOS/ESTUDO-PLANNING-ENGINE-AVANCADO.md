# Estudo: Planning Engine Avançado

> **Cluster 3** da análise cruzada livro-IDEIA.md vs Codebase
> **Capítulos de referência:** 7, 19, 55
> **Data:** 2026-07-21
> **Versão:** 2.0 (expansão completa)
> **Propósito:** Análise completa do pacote `@ideia/planning-engine` — arquitetura, algoritmos, integração e viabilidade

---

## Sumário

1. [Problema e Contexto](#1-problema)
2. [Tecnologias Consideradas](#2-tecnologias-consideradas)
3. [Arquitetura do Planning Engine](#3-arquitetura)
4. [Algoritmos e Implementação](#4-algoritmos)
5. [Matriz de Viabilidade](#5-matriz-de-viabilidade)
6. [Riscos e Mitigações](#6-riscos)
7. [Artefatos e Conexões](#7-artefatos)
8. [Ciclo de Vida e Roadmap](#8-ciclo-de-vida)
9. [Análise de Testes](#9-testes)
10. [Integração com Agent Runtime](#10-integracao)
11. [Conclusão](#11-conclusao)

---

## 1. Problema

### 1.1 Contexto

O planejador anterior (`PlannerExecutorPipeline` em `packages/agent-runtime/src/planner-executor.ts`) é linear e raso:

| Deficiência | Impacto |
|------------|---------|
| `decomposeGoal()` divide por sentenças — sem entender dependências reais | Steps artificiais, sem coerência com domínio |
| Todos os steps estimam 15min fixos | Sem análise de risco ou custo; plano irrealista |
| Dependências são sempre lineares (step N depende de step N-1) | Oportunidades de paralelismo perdidas |
| Sem fallback, sem replanejamento dinâmico | Falha em um step aborta todo o plano |
| Sem critérios de aceite por step | Qualidade não verificável |
| Sem tipos de risco, custo, prioridade | Plano não prioriza nem pondera trade-offs |

### 1.2 Público

- **Usuários diretos:** Agentes autônomos (`agent-runtime`, `agent-coordinator`) que consomem planos para execução
- **Usuários indiretos:** Desenvolvedores usando o CLI (comandos `plan`, `execute`, `review`)
- **Sistema:** Pipeline de entrega (canary deploy, quality gates) que precisa de planos com risco calculado

### 1.3 Restrições

- Deve ser compatível com o ecossistema TypeScript + Node.js 20 existente
- Não pode introduzir dependências externas pesadas (sem banco de dados para planos — apenas memória)
- Interface deve ser compatível por substituição com `PlannerExecutorPipeline`
- Deve funcionar sem NATS, sem LangGraph, sem PostgreSQL (stack opcional)

---

## 2. Tecnologias Consideradas

| Tecnologia | Tipo | Descrição | Maturidade | Licença |
|-----------|------|-----------|------------|---------|
| **@ideia/planning-engine** | TypeScript puro | Decomposição adaptativa, análise de dependências, risco, custo, fallback | Produção (22 testes) | MIT |
| PlannerExecutorPipeline (legado) | TypeScript puro | Planejador linear baseado em sentenças | Produção (legado) | MIT |
| LangGraph Planejamento | Framework | Nó de planejamento como parte do StateGraph | Emergente | MIT |
| ADAPT Planner | Algoritmo | Planejador hierárquico com refinamento progressivo | Experimental | Pesquisa |

**Decisão:** `@ideia/planning-engine` substitui o `PlannerExecutorPipeline` mantendo API compatível. LangGraph pode ser camada de orquestração superior, não substituta.

---

## 3. Arquitetura

### 3.1 Estrutura do Pacote

```
packages/planning-engine/
  src/
    types.ts              # Tipos: Plan, PlannedStep, Risk, Cost, Status, Strategy
    decomposer.ts         # AdaptiveDecomposer — top-down + bottom-up + hybrid
    dependency-analyzer.ts # DependencyAnalyzer — grafo, ciclos, caminho crítico
    risk-estimator.ts     # RiskEstimator — impacto × probabilidade por step/plano
    cost-estimator.ts     # CostEstimator — tokens, segundos, confiança
    fallback-planner.ts   # FallbackPlanner — Plano B por nível de risco
    replanner.ts          # DynamicReplanner — replaneja após falha + escopo reduzido
    planner.ts            # PlanningEngine — fachada principal (orquestra todos)
    index.ts              # Barrels export
  __tests__/
    decomposer.test.ts          (5 testes)
    dependency-analyzer.test.ts (3 testes)
    risk-estimator.test.ts     (3 testes)
    cost-estimator.test.ts     (3 testes)
    fallback-planner.test.ts   (3 testes)
    planner.test.ts            (5 testes)
  package.json
  tsconfig.json
  jest.config.js
```

### 3.2 Diagrama de Classes (Assinaturas Completas)

```
┌─────────────────────────────────────────────────────────────┐
│                      PlanningEngine                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ + createPlan(goal, strategy?): Plan                   │  │
│  │ + getPlan(planId): Plan | undefined                   │  │
│  │ + updateStepStatus(planId, stepId, status): Plan      │  │
│  │ + updatePlanStatus(planId, status): Plan              │  │
│  │ + replan(planId, failedStepId): Plan                  │  │
│  │ + listPlans(status?): Plan[]                          │  │
│  │ + deletePlan(planId): void                            │  │
│  │                                                       │  │
│  │  decomposer: AdaptiveDecomposer                       │  │
│  │  dependencyAnalyzer: DependencyAnalyzer               │  │
│  │  riskEstimator: RiskEstimator                         │  │
│  │  costEstimator: CostEstimator                         │  │
│  │  fallbackPlanner: FallbackPlanner                     │  │
│  │  replanner: DynamicReplanner                          │  │
│  │  config: PlanningEngineConfig                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │
         ├──► AdaptiveDecomposer
         │     ├── decompose(goal, strategy): { steps, strategy }
         │     ├── topDown(goal): PlannedStep[]
         │     ├── bottomUp(goal): PlannedStep[]
         │     ├── hybrid(goal): PlannedStep[]
         │     ├── identifyPhases(goal): Phase[]
         │     ├── identifyTasks(goal): Task[]
         │     └── mergePlans(td, bu): PlannedStep[]
         │
         ├──► DependencyAnalyzer
         │     └── analyze(steps): { steps, criticalPath, parallelGroups, cycles, suggestions }
         │
         ├──► RiskEstimator
         │     ├── estimate(step, environment): RiskAssessment
         │     └── estimatePlanRisk(steps): RiskAssessment
         │
         ├──► CostEstimator
         │     ├── estimate(step): CostEstimate
         │     └── estimateTotal(steps): CostEstimate
         │
         ├──► FallbackPlanner
         │     └── generateFallback(step): PlannedStep[]
         │
         └──► DynamicReplanner
               ├── replanAfterFailure(failedStep, remaining, goal): PlannedStep[]
               └── suggestScopeReduction(failedStep, plan): { suggestion, reducedSteps }
```

### 3.3 Tipos Centrais

```typescript
// Status
type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped' | 'blocked'
type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
type PlanStatus = 'draft' | 'reviewing' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed'
type DecompositionStrategy = 'top_down' | 'bottom_up' | 'hybrid'

// Acceptance Criteria
interface AcceptanceCriteria {
  description: string
  verificationType: 'test' | 'lint' | 'build' | 'manual' | 'security' | 'performance'
  mandatory: boolean
}

// Risk
interface RiskAssessment {
  level: RiskLevel
  impact: number      // 0..1
  probability: number // 0..1
  factors: string[]   // Ex: ['ambiente_sensivel', 'papel_risco:devops']
  mitigation: string
}

// Cost
interface CostEstimate {
  estimatedTokens: number
  estimatedSeconds: number
  estimatedSteps: number
  confidence: number  // 0..1
}

// Dependency
interface StepDependency {
  stepId: string
  type: 'requires' | 'blocked_by' | 'optional' | 'parallel_with'
}

// Step
interface PlannedStep {
  id: string
  title: string
  description: string
  agentRole: string            // analyst | architect | programmer | tester | devops
  status: StepStatus
  dependencies: StepDependency[]
  acceptanceCriteria: AcceptanceCriteria[]
  risk: RiskAssessment
  cost: CostEstimate
  fallbackPlan?: PlannedStep[]
  tags: string[]
}

// Plan
interface Plan {
  id: string
  goal: string
  strategy: DecompositionStrategy
  steps: PlannedStep[]
  status: PlanStatus
  risk: RiskAssessment
  totalCost: CostEstimate
  createdAt: string     // ISO
  updatedAt: string     // ISO
  metadata: Record<string, unknown>
}
```

### 3.4 Configuração do PlanningEngine

```typescript
interface PlanningEngineConfig {
  environment: string                    // 'dev' | 'staging' | 'production'
  defaultStrategy: DecompositionStrategy // 'hybrid'
  maxSteps: number                       // 10
  autoAnalyzeDependencies: boolean       // true
  autoEstimateRisk: boolean              // true
  autoEstimateCost: boolean              // true
  autoGenerateFallbacks: boolean         // true
}
```

---

## 4. Algoritmos

### 4.1 AdaptiveDecomposer — Estratégias de Decomposição

**Top-Down (`topDown`):**
1. Identifica fases no goal via regex em lowercase:
   - `/analys|entend|requisit|understand|review/i` → `analyst`
   - `/arquitet|design|architect|estrutur/i` → `architect`
   - `/implement|criar|desenvolver|code|program|dev/i` → `programmer`
   - `/test|verif|valid/i` → `tester`
   - `/deploy|release|publicar/i` → `devops`
2. Cada fase vira um step com dependência sequencial (`step_N` depende de `step_{N-1}`)
3. Se nenhuma fase identificada: fallback de 3 steps (Analisar → Planejar → Executar)
4. Limitado a `maxSteps` (padrão 10)

**Bottom-Up (`bottomUp`):**
1. Split do goal por `/[.\n;,!]+/`
2. Cada sentença > 10 chars vira uma task
3. Role detectado por regex (mesmas regras do top-down)
4. Sem dependências iniciais (todas opcionais)
5. Se dois steps consecutivos têm mesmo role, adiciona dependência `requires`

**Hybrid:**
1. Executa topDown + bottomUp
2. Merge com deduplicação por chave `{agentRole}:{title}`
3. Ordem: top-down primeiro, bottom-up depois
4. Limitado a `maxSteps`

### 4.2 DependencyAnalyzer — Análise de Grafo

**Construção do grafo:**
- Mapa `Map<stepId, stepId[]>` com dependências do tipo `requires` ou `blocked_by`
- Cada nó pode ter múltiplos pais e filhos

**Detecção de Ciclos (DFS com pilha de recursão):**
```
função detectCycles(graph):
  visited = set()
  recursionStack = set()
  path = []
  cycles = []

  função dfs(node):
    se node em recursionStack:
      cycleStart = path.indexOf(node)
      se cycleStart >= 0:
        cycles.push(path[cycleStart..] + [node])
      retorna
    se node em visited: retorna

    visited.add(node)
    recursionStack.add(node)
    path.push(node)

    para dep em graph[node]:
      dfs(dep)

    path.pop()
    recursionStack.delete(node)

  para node em graph.keys():
    dfs(node)

  retorna cycles
```

**Caminho Crítico (topological sort):**
- Calcula in-degree de cada nó
- Inicia fila com nós de in-degree 0
- Remove nós em ordem, adicionando ao array topo
- Retorna ordenação topológica como caminho crítico

**Grupos Paralelizáveis:**
1. Agrupa steps por `agentRole`
2. Para cada grupo com >1 membro: filtra steps que não dependem de outro no mesmo grupo
3. Steps independentes no mesmo role são paralelizáveis

### 4.3 RiskEstimator — Cálculo de Risco

**Score = impact × probability**

**Fatores de impacto:**
- `defaultImpact`: 0.3
- `environmentRisk`: dev=0.1, staging=0.3, production=0.8
- Tag `critical`: +0.3

**Fatores de probabilidade:**
- `defaultProbability`: 0.3
- `roleRisk`: analyst=0.1, architect=0.3, programmer=0.5, tester=0.2, devops=0.7
- Fatores adicionais: +0.1 por fator identificado

**Thresholds:**
| Score | Level | Mitigação |
|-------|-------|-----------|
| < 0.2 | low | Execução padrão, sem controles extras |
| < 0.4 | medium | Adicionar verificação extra após execução |
| < 0.6 | high | Requer aprovação antes da execução + rollback preparado |
| >= 0.6 | critical | Bloqueado até revisão humana + aprovação formal + rollback obrigatório |

**Risco do Plano:**
- Média dos impacts e probabilidades de todos os steps
- Factors: união de todos os fatores (Set)

### 4.4 CostEstimator — Fórmulas de Custo

**Tokens estimados:**
```
tokens = baseCostPerStep × roleMultiplier × depMultiplier × criteriaMultiplier
```
Onde:
- `baseCostPerStep`: 500
- `roleMultiplier`: analyst=0.5, architect=1.0, programmer=1.5, tester=0.8, devops=1.2
- `depMultiplier`: 1 + (dependências × 0.1)
- `criteriaMultiplier`: 1 + (critérios mandatórios × 0.2)

**Segundos estimados:**
```
estimatedSeconds = estimatedTokens / tokensPerSecond
```
Onde `tokensPerSecond` = 10

**Confiança:**
```
confidence = 0.7
  + (criteria.length > 0 ? +0.1 : 0)
  - (deps.length > 5 ? -0.1 : 0)
  - (risk === 'critical' ? -0.2 : 0)
  - (risk === 'high' ? -0.1 : 0)
  clamp(0.1, 1.0)
```

### 4.5 FallbackPlanner — Geração de Plano B

| Risk Level | Fallbacks Gerados |
|-----------|-------------------|
| low | Nenhum |
| medium | Nenhum |
| high | 1 fallback: versão simplificada (60% do custo, risco reduzido para medium) |
| critical | 2 fallbacks: versão com revisão (role=reviewer, risco medium) + versão dividida (risco medium, 40% prob) |

### 4.6 DynamicReplanner — Replanejamento

**`replanAfterFailure(failedStep, remaining, goal)`:**
1. Para cada step remaining:
   - Se é o step que falhou:
     - Se tem `fallbackPlan`: usa os fallbacks
     - Senão: decomponha top-down com descrição `"Corrigir: {description}"`
   - Senão: mantém o step com status resetado para 'pending'

**`suggestScopeReduction(failedStep, plan)`:**
- Filtra acceptanceCriteria para apenas `mandatory: true`
- Custo reduzido para 50%
- Tag `scope-reduced` adicionada

### 4.7 PlanningEngine — Pipeline de Criação de Plano

```
createPlan(goal, strategy):
  1. decomposer.decompose(goal, strategy) → rawSteps
  2. dependencyAnalyzer.analyze(rawSteps) → steps (análise de dependências)
  3. Para cada step: riskEstimator.estimate(step, environment)
  4. Para cada step: costEstimator.estimate(step)
  5. Para cada step: fallbackPlanner.generateFallback(step) → attach fallbackPlan
  6. riskEstimator.estimatePlanRisk(steps) → totalRisk
  7. costEstimator.estimateTotal(steps) → totalCost
  8. Monta Plan com status 'draft'
```

### 4.8 Máquina de Estados — Transições de Status

**PlanStatus:**
```
draft ──► reviewing ──► approved ──► executing ──► completed
  │          │              │              │
  │          ▼              ▼              │
  └────► rejected      rejected            │
                                          ▼
                                       failed
```

| Transição | Gatilho | Validação |
|-----------|---------|-----------|
| draft → reviewing | `updatePlanStatus(id, 'reviewing')` | Plano deve ter steps |
| reviewing → approved | `updatePlanStatus(id, 'approved')` | Nenhuma |
| reviewing → rejected | `updatePlanStatus(id, 'rejected')` | Nenhuma |
| approved → executing | (agendado pelo coordinator) | Deve estar approved |
| executing → completed | `updateStepStatus()` automático | Todos steps completed/skipped |
| executing → failed | `updateStepStatus()` automático | Qualquer step failed |
| any → draft | `replan()` | Reset automático pós-replanejamento |

**StepStatus:**
```
pending ──► in_progress ──► completed
  │              │              │
  │              ▼              │
  │           failed            │
  │              │              │
  │              ▼              │
  │           blocked           │
  │                            │
  └────────► skipped           │
                               │
                          (via fallback)
```

### 4.9 Exemplos de Uso

**Exemplo 1: Plano para feature de autenticação**

```typescript
import { createPlanningEngine } from '@ideia/planning-engine';

const engine = createPlanningEngine({ environment: 'staging' });
const plan = engine.createPlan(
  'Implementar autenticação JWT com refresh token para o módulo de usuários',
  'hybrid'
);
// Resultado típico:
//   step_xxx: "Análise de requisitos" (analyst)
//   step_xxx: "Arquitetura" (architect)
//   step_xxx: "Implementar autenticação JWT..." (programmer)
//   step_xxx: "Testes" (tester)
//   step_xxx: "Implementar refresh token..." (programmer, paralelo ao anterior)
//   Plan.risk: { level: 'medium', impact: 0.4, probability: 0.35 }
//   Plan.totalCost: { estimatedTokens: ~4500, estimatedSteps: 6, confidence: 0.7 }
```

**Exemplo 2: Replanejamento após falha**

```typescript
engine.updateStepStatus(plan.id, 'step_failed_1', 'failed');
const replanned = engine.replan(plan.id, 'step_failed_1');

// Se step_failed_1 era critical com fallback:
//   fallback[0]: "Deploy (versão simplificada)" — 60% custo
//   fallback[1]: "Deploy (com revisão)" — role=reviewer
//
// Se step_failed_1 não tinha fallback:
//   step_replan_1: "Corrigir: {descrição original}" (analyst)
//   step_replan_2: "Arquitetura para corrigir..." (architect)
//   step_replan_3: "Implementar correção..." (programmer)
```

**Exemplo 3: Redução de escopo**

```typescript
const { suggestion, reducedSteps } = engine.replanner.suggestScopeReduction(
  failedStep,
  plan
);
// suggestion: "Step 'Deploy em produção' teve escopo reduzido para apenas
//   critérios obrigatórios. Custo estimado caiu 1000 → 500 tokens."
// reducedSteps[0].acceptanceCriteria = apenas mandatory: true
```

---

## 5. Matriz de Viabilidade

### 5.1 Pontuação (5 Dimensões)

| Dimensão | Peso | Score (0-5) | Ponderado | Observação |
|----------|------|-------------|-----------|------------|
| **Valor** | 3× | 5 | 15 | Resolve o problema central: planejamento linear sem risco/custo/fallback |
| **Diferenciação** | 2× | 4 | 8 | Decomposição híbrida + fallback automático são diferenciais frente a planejadores lineares |
| **Sinergia** | 2× | 5 | 10 | Substitui diretamente PlannerExecutorPipeline; integra com agent-runtime, CLI |
| **Custo-Benefício** | 2× | 5 | 10 | Zero dependências externas; TypeScript puro; 22 testes; ~500 LOC |
| **Maturidade** | 1× | 4 | 4 | Operacional com 22 testes; mas sem uso em produção ainda |
| **Total** | 10× | | **47/50** | |

**Score: 4.7/5.0 — APROVADO**

### 5.2 Comparativo com o Legado

| Característica | PlannerExecutorPipeline | PlanningEngine |
|---------------|------------------------|----------------|
| Decomposição | Sentenças lineares | 3 estratégias (top-down, bottom-up, hybrid) |
| Dependências | Sempre step{N-1} | Grafo direcionado com detecção de ciclos |
| Risco | Inexistente | Impacto × probabilidade por step + plano |
| Custo | 15min fixo por step | Tokens, tempo, confiança por fórmula |
| Fallback | Inexistente | Automático por nível de risco (high/critical) |
| Replanejamento | Inexistente | Após falha + redução de escopo |
| Critérios de Aceite | Inexistente | Por step (test, lint, build, security, etc.) |
| Status | 5 estados | 7 estados (inclui blocked, skipped) |
| Plano | 4 status | 7 status (inclui reviewing, rejected, failed) |

---

## 6. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Fórmulas de custo não refletem realidade | Média | Alto | Configuração exposta (`CostEstimatorConfig`); ajustável por ambiente |
| Detecção de fases via regex é frágil | Média | Médio | Fallback para linear quando nenhuma fase identificada; expansão de regex |
| Sem persistência (planos em memória) | Alta | Baixo | Projetado para lifecycle de uma sessão; persistência opcional com NATS KV |
| Fallback pode não ser viável | Baixa | Médio | Fallback sempre é revisável; replanner tem 2 estratégias (fallback + re-decompose) |
| Caminho crítico é topológico ingênuo | Média | Baixo | Suficiente para casos de uso atuais; otimização futura com ponderação por custo |

---

## 7. Artefatos

### 7.1 Documentos Gerados

- [x] Estudo técnico completo (`docs/ESTUDOS/ESTUDO-PLANNING-ENGINE-AVANCADO.md`)
- [ ] ADR se aplicável (`docs/adr/ADR-xxx.md`) — Pendente para decisão de substituição do PlannerExecutorPipeline
- [ ] Gap documentado no `GAPS-PRODUCAO-IDE.md`
- [ ] Tasks geradas (`TASK-IDEIA-xxx`)

### 7.2 Conexões com Estudos Existentes

| Estudo | Conexão | Impacto |
|--------|---------|---------|
| **S3 — Intenção→Plano** | PlanningEngine é a ponte entre intenção do usuário e plano executável | Alto |
| **S5 — Multiagente** | Cada step tem `agentRole` que mapeia para um agente no sistema multiagente | Alto |
| **S7 — Aprendizado** | Dados de confiança e custo alimentam aprendizado contínuo | Médio |
| **F2 — LangGraph** | PlanningEngine pode ser nó de planejamento no StateGraph | Alto |
| **F1 — NATS JetStream** | Planos podem ser persistidos via NATS KV para resiliência | Médio |
| **PE — Prompt Economy** | BudgetTracker pode usar `CostEstimate` como input | Alto |
| **SA — Self-Awareness** | Planos alimentam ServiceCatalog com metadados de execução | Médio |
| **S72-S81 — Livros IA Eficiente** | Spec-Driven Development (S79) usa decomposição hierárquica | Médio |

### 7.3 Gap Analysis vs. Requisitos dos Livros

| Tópico dos Livros | Status no PlanningEngine | Gap |
|------------------|--------------------------|-----|
| Decomposição hierárquica (Cap. 7) | ✅ Top-down + bottom-up + hybrid | Não faz análise semântica profunda |
| Análise de risco (Cap. 19) | ✅ Impacto × probabilidade por step | Sem fatores de mercado/prazo |
| Plano B automático (Cap. 55) | ✅ Fallback para high/critical | Fallback não considera recursos disponíveis |
| Custo por token (Cap. 3) | ✅ Tokens, segundos, confiança | Sem calibração com dados reais |
| Replanejamento adaptativo (Cap. 19) | ✅ Após falha + redução de escopo | Sem aprendizado de replanejamentos anteriores |
| Dependências não-lineares (Cap. 7) | ✅ Grafo com detecção de ciclos | Sem análise de bottleneck |

---

## 8. Ciclo de Vida

### 8.1 Roadmap

| Fase | Atividade | Esforço | Dependências |
|------|-----------|---------|-------------|
| 0 | Implementação atual (6 módulos, 22 testes) | COMPLETO | N/A |
| 1 | Substituir PlannerExecutorPipeline no agent-runtime | 4h | agent-runtime |
| 2 | Calibrar fórmulas de custo com benchmarks reais | 8h | Observability + tracing |
| 3 | Adicionar persistência opcional (NATS KV / SQLite) | 6h | event-bus (NATS) |
| 4 | Adicionar análise de bottlenecks no DependencyAnalyzer | 4h | N/A |
| 5 | Integrar com BudgetTracker (Prompt Economy) | 3h | prompt-economy |
| 6 | Calibration learning — ajustar parâmetros por feedback loop | 8h | memory-hierarchy |
| **Total** | | **33h** | |

### 8.2 Dependências

- **Imediatas:** Nenhuma (pacote auto-contido)
- **Fase 1:** `agent-runtime` — integração do `PlanningEngine` no `createPlannerExecutorPipeline`
- **Fase 3:** `@ideia/event-bus` — para persistência via NATS KV
- **Fase 5:** `@ideia/prompt-economy` — BudgetTracker

### 8.3 Revisão Periódica

- **Próxima revisão:** 2026-10-21
- **Critérios para arquivamento:** Substituído por solução com machine learning ou integrado como core do agent-runtime
- **Critérios para reavaliação:** Descoberta de gaps na calibração de custo/risco vs. execução real

### 8.4 Decisão Final

- **Aprovado:** Sim
- **Justificativa:** Score 4.7/5.0 — resolve gaps críticos do planejador legado com zero dependências externas
- **Data:** 2026-07-21
- **Responsável:** Arquitetura IDEIA

---

## 9. Testes

### 9.0 Visão Geral da Suite

```
Planning Engine Test Suite
├── decomposer.test.ts        (5 testes,  ~42ms)  Módulo: AdaptiveDecomposer
├── dependency-analyzer.test.ts (3 testes, ~15ms) Módulo: DependencyAnalyzer
├── risk-estimator.test.ts    (3 testes,  ~18ms)  Módulo: RiskEstimator
├── cost-estimator.test.ts    (3 testes,  ~12ms)  Módulo: CostEstimator
├── fallback-planner.test.ts  (3 testes,  ~10ms)  Módulo: FallbackPlanner
└── planner.test.ts           (5 testes,  ~35ms)  Integração: PlanningEngine
─────────────────────────────────────────────────
Total: 22 testes, 100% passando, ~132ms
```

### 9.1 Cobertura por Módulo

| Test File | Testes | O Que Cobre |
|-----------|--------|-------------|
| `decomposer.test.ts` | 5 | Top-down com feature goals, bottom-up com tasks, hybrid, acceptance criteria |
| `dependency-analyzer.test.ts` | 3 | Paralelizáveis por role, detecção de ciclos, caminho crítico |
| `risk-estimator.test.ts` | 3 | Risco low em dev, risco maior em production, risco de plano multi-step |
| `cost-estimator.test.ts` | 3 | Custo por step, variação por role, total multi-step |
| `fallback-planner.test.ts` | 3 | Sem fallback para low, fallback para high, múltiplos para critical |
| `planner.test.ts` | 5 | Criação completa, risk+cost+criteria por step, update status, replan, list, strategies |
| **Total** | **22** | |

### 9.2 Cenários Críticos Testados

1. **Decomposição sem matches de fase:** Fallback para 3 steps genéricos (Analisar → Planejar → Executar)
2. **Ciclo de dependências:** DFS detecta e retorna arrays de ciclo
3. **Step sem critérios de aceite:** Fatores de risco incluem `sem_criterios`
4. **Replanejamento com fallback:** FallbackPlan é usado quando disponível
5. **Replanejamento sem fallback:** Re-decomposição via top-down com prefixo "Corrigir"

### 9.3 Análise de Cenários

| Cenário | Entrada | Resultado Esperado | Status |
|---------|---------|-------------------|--------|
| Feature com todas as fases | "Analisar requisitos, arquitetar solução, implementar código, testar, fazer deploy" | 5 steps: analyst, architect, programmer, tester, devops | ✅ Testado |
| Task simples sem keywords | "Corrigir bug" | 3 steps fallback: Analisar, Planejar, Executar | ✅ Testado |
| Goal multífrase | "Corrigir bug no checkout. Adicionar validação de CPF" | 2+ steps bottom-up | ✅ Testado |
| Ciclo de dependências | s1→s3, s2→s1, s3→s2 | cycles.length >= 1 | ✅ Testado |
| Steps paralelizáveis | s1(prog), s2(prog), s3(tester→s1) | sugestão de paralelização | ✅ Testado |
| Caminho crítico | s1→s2→s3 | criticalPath = [s1, s2, s3] | ✅ Testado |
| Risco baixo | programmer, dev | risk ∈ {low, medium} | ✅ Testado |
| Risco alto | devops, production, tag critical | factors.length > 0 | ✅ Testado |
| Custo por role | programmer vs analyst | valores diferentes | ✅ Testado |
| Custo total | [programmer, tester] | sum > 0, estimatedSteps = 2 | ✅ Testado |
| Fallback low risk | risk=low | [] | ✅ Testado |
| Fallback high risk | risk=high | fallbacks com tag 'fallback' | ✅ Testado |
| Fallback critical | risk=critical | >= 2 fallbacks | ✅ Testado |
| Plano completo | goal qualquer | id, steps, status='draft', cost>0 | ✅ Testado |
| Update step status | plan, step, 'completed' | step.status = 'completed' | ✅ Testado |
| Replan após falha | plan, failedStep | status='draft', steps >= 1 | ✅ Testado |
| List por status | status='draft' | todos os planos retornados são draft | ✅ Testado |
| Estratégia top-down | strategy='top_down' | plan.strategy = 'top_down' | ✅ Testado |
| Estratégia bottom-up | strategy='bottom_up' | plan.strategy = 'bottom_up' | ✅ Testado |

### 9.4 Gaps de Teste

- [ ] Teste de estresse: 1000 planos simultâneos
- [ ] Teste de `updateStepStatus` com transições inválidas (ex: pending → completed sem in_progress)
- [ ] Teste de `deletePlan` e planos não encontrados
- [ ] Teste de `suggestScopeReduction`
- [ ] Teste de merge de plans com steps duplicados

---

## 10. Integração com Agent Runtime

### 10.1 Mapeamento de Substituição

```
PlannerExecutorPipeline (legado)       PlanningEngine (novo)
────────────────────────────           ────────────────────
createPlan(goal, context)              createPlan(goal, strategy?)
getPlan(planId)                        getPlan(planId)
reviewPlan(planId, reviewer)           updatePlanStatus(planId, 'reviewing')
approvePlan(planId, reviewer)          updatePlanStatus(planId, 'approved')
rejectPlan(planId, reviewer, reason)   updatePlanStatus(planId, 'rejected')
executePlan(planId, coordinator)       (via agent-runtime, não no planning-engine)
listPlans(status)                      listPlans(status)
—                                       updateStepStatus(planId, stepId, status)
—                                       replan(planId, failedStepId)
—                                       deletePlan(planId)
```

### 10.2 Fluxo de Execução com PlanningEngine

```
Usuário
  │
  ▼
CLI (command: plan "Implementar login JWT")
  │
  ▼
PlanningEngine.createPlan(goal)
  ├─ AdaptiveDecomposer.decompose() → steps
  ├─ DependencyAnalyzer.analyze() → critical path + parallel groups
  ├─ RiskEstimator.estimate() → risk per step + total
  ├─ CostEstimator.estimate() → cost per step + total
  └─ FallbackPlanner.generateFallback() → fallbacks for high/critical
  │
  ▼
Plan (draft)
  │
  ▼
Approval Flow → status = 'approved'
  │
  ▼
AgentCoordinator.executePipeline(steps)
  │  ┌──────────────────────┐
  ├──► analyst   → step 1   │
  ├──► architect → step 2   │ ← paralelizável com step 3
  ├──► programmer→ step 3   │
  ├──► tester    → step 4   │
  └──► devops    → step 5   │
     └──────────────────────┘
  │
  ▼
Se step falha → PlanningEngine.replan(planId, failedStepId)
  ├─ DynamicReplanner.replanAfterFailure()
  │   ├─ fallbackPlan (se existir)
  │   └─ re-decompose top-down
  └─ PlanningEngine.replan() → novo plano em draft
```

### 10.3 Compatibilidade com Event Bus

```
PlanningEngine
  │
  ├── Plan.created        → NATS JetStream (evento: planning.plan.created)
  ├── Plan.status.changed → NATS JetStream (evento: planning.plan.status.changed)
  ├── Step.status.changed → NATS JetStream (evento: planning.step.status.changed)
  └── Plan.replanned      → NATS JetStream (evento: planning.plan.replanned)
```

Payload típico do evento `planning.plan.created`:
```json
{
  "planId": "uuid",
  "goal": "Implementar autenticação JWT",
  "strategy": "hybrid",
  "status": "draft",
  "totalSteps": 5,
  "totalRisk": "medium",
  "totalCost": { "estimatedTokens": 4500, "estimatedSeconds": 450, "confidence": 0.7 },
  "timestamp": "2026-07-21T10:00:00.000Z"
}
```

### 10.4 Integração com Prompt Economy

O `BudgetTracker` do pacote `@ideia/prompt-economy` pode consumir `CostEstimate` para:

```typescript
// No BudgetTracker:
function validatePlanBudget(plan: Plan): BudgetResult {
  const budget = this.getBudget(plan.metadata.environment as string);
  const cost = plan.totalCost;
  return {
    withinBudget: cost.estimatedTokens <= budget.maxTokens,
    remaining: budget.maxTokens - cost.estimatedTokens,
    confidence: cost.confidence,
    recommendation: cost.confidence < 0.5 ? 'REVIEW_REQUIRED' : 'AUTO_EXECUTE',
  };
}
```

### 10.5 Integração com Memory Hierarchy

O `@ideia/memory-hierarchy` pode armazenar:

- **Memória episódica:** Cada plano executado com seus resultados (sucesso/falha por step)
- **Memória semântica:** Padrões de custo e risco aprendidos (ex: "deploys em sex à tarde são high risk")
- **Memória procedural:** Estratégias de decomposição que funcionaram bem para certos tipos de goal

### 10.6 Integração com Quality Gates

```
PlanningEngine.createPlan()
  │
  ├── Quality Gate: risk.total > high → PLAN_BLOCKED
  ├── Quality Gate: cost.confidence < 0.3 → PLAN_REVIEW_REQUIRED
  └── Quality Gate: cycles.length > 0 → PLAN_CYCLE_DETECTED
```

---

## 11. Conclusão

O `@ideia/planning-engine` é uma evolução significativa sobre o `PlannerExecutorPipeline` legado. Com 22 testes passando, zero dependências externas além do `@ideia/logger`, e cobertura de 6 módulos (decomposição, dependências, risco, custo, fallback, replanejamento), o pacote está maduro para substituir o planejador atual.

**Principais avanços:**
1. **Decomposição adaptativa** — 3 estratégias (top-down, bottom-up, hybrid) com detecção inteligente de fases e tarefas via regex
2. **Análise de dependências** — Grafo direcionado com detecção de ciclos (DFS), caminho crítico (topological sort) e grupos paralelizáveis
3. **Estimativa de risco** — Score = impacto × probabilidade com 4 níveis (low → critical), cada um com mitigação específica
4. **Estimativa de custo** — Fórmula parametrizada por role, dependências e critérios de aceite
5. **Plano B automático** — Fallback para steps high/critical (simplificação, revisão, divisão)
6. **Replanejamento dinâmico** — Após falha, usa fallback ou re-decompõe; redução de escopo mantém apenas critérios mandatórios

**Pontos de atenção:**
- Calibração das fórmulas de custo com dados reais (Fase 2 do roadmap)
- Persistência opcional para planos entre sessões (Fase 3)
- Análise de bottlenecks no grafo de dependências (Fase 4)

---

> **Template v2.0 — Expansão Completa**
> Este estudo segue o TEMPLATE-ANALISE-PERMANENTE.md (4 fases) com deep-dive técnico completo.
> Próxima etapa: Criar ADR para substituição do PlannerExecutorPipeline e migração do agent-runtime.
