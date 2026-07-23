# Planning Flow — Fluxo de Planejamento de Tarefas

## Visão Geral

O planner transforma intenção em planos executáveis, validados e rastreáveis, respeitando a governança documental da Fase 0.

## Arquitetura

```
Intenção (linguagem natural)
    │
    ▼
┌─────────────────┐
│   task-spec.ts   │  → inferTaskType(), createTaskSpec(), validateTaskSpec()
└────────┬────────┘
         │ TaskSpec normalizada
         ▼
┌─────────────────┐
│ task-validator.ts│  → validateTaskContext(), validateTaskScope(),
│                  │     validateDependencies(), validateExecutionMode()
└────────┬────────┘
         │ Contexto validado
         ▼
┌─────────────────┐
│ execution-plan.ts│  → createExecutionPlan(), deriveSteps(),
│                  │     deriveCommands(), deriveCheckpoints()
└────────┬────────┘
         │ Plano concreto
         ▼
┌─────────────────┐
│ command-router.ts│  → routeCommands(), isCommandAllowed()
└────────┬────────┘
         │ Comandos roteados
         ▼
    Execução
```

## Módulos

| Módulo                      | Responsabilidade         | Funções                                                                                             |
| --------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| `planner/types.ts`          | Interfaces e tipos       | `TaskSpec`, `ExecutionPlan`, `ExecutionStep`, `ValidationResult`                                    |
| `planner/task-spec.ts`      | Normalização de intenção | `inferTaskType()`, `createTaskSpec()`, `validateTaskSpec()`                                         |
| `planner/execution-plan.ts` | Geração de plano         | `createExecutionPlan()`, `deriveSteps()`, `deriveCommands()`, `deriveCheckpoints()`                 |
| `planner/command-router.ts` | Roteamento de comandos   | `routeCommands()`, `isCommandAllowed()`                                                             |
| `planner/task-validator.ts` | Validação de contexto    | `validateTaskContext()`, `validateTaskScope()`, `validateDependencies()`, `validateExecutionMode()` |

## Tipos de Tarefa (PlannerTaskType)

| Tipo            | Inferido por          | Comandos Roteados                                                     |
| --------------- | --------------------- | --------------------------------------------------------------------- |
| `execution`     | (default)             | `ai-devkit docs resolve execution`                                    |
| `tests`         | "test", "coverage"    | `ai-devkit test-autonomy gap-prioritize --all`, `npx jest --coverage` |
| `strategy`      | "strategy", "roadmap" | `ai-devkit docs audit`, `ai-devkit docs resolve strategy`             |
| `refactor`      | "refactor", "refator" | `npx tsc --noEmit`                                                    |
| `audit`         | "audit", "auditoria"  | `ai-devkit docs audit`                                                |
| `documentation` | "doc", "document"     | `ai-devkit docs status`                                               |
| `maintenance`   | "maint", "manuten"    | `ai-devkit test-autonomy status`                                      |

## Comandos CLI

```bash
# Criar plano a partir de descrição
ai-devkit plan create "write tests for module X"
ai-devkit plan create "refactor the router" --json
ai-devkit plan create "audit dependencies" --source ".ai/tasks/audit.md" --risk high

# Validar contexto da tarefa ativa
ai-devkit plan validate
ai-devkit plan validate --json

# Status do plano ativo
ai-devkit plan status
ai-devkit plan status --json
```

## Regras

1. **Fonte de verdade**: toda tarefa precisa de `sourceDocument` resolvido pela governança
2. **Bloqueio por contexto**: tarefas sem `context` ou `expectedOutputs` são bloqueadas
3. **Tarefas críticas**: `riskLevel === 'critical'` exige `constraints` explícitas
4. **Aprovação**: `requiresApproval` precisa de `sourceDocument` para auditoria
5. **Comandos restritos**: `strategy` e `audit` não executam `jest` ou `task run`
