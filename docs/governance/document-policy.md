# Document Policy — Políticas por Tipo de Tarefa

## Propósito

Associar cada tipo de tarefa a um documento primário, fallbacks, regra de conflito e modo de execução.

## Estrutura

```ts
export interface DocumentPolicy {
  taskType: string; // Identificador do tipo de tarefa
  primaryDocument: string; // ID do documento primário
  fallbackDocuments: string[]; // IDs de fallback
  conflictRule: ConflictRule; // specificity | priority | block
  executionMode: ExecutionMode; // read-only | plan-only | execute
  requiresApproval: boolean;
}
```

## Políticas Definidas

| Task Type      | Documento Primário | Regra de Conflito | Modo      | Requer Aprovação |
| -------------- | ------------------ | ----------------- | --------- | ---------------- |
| `execution`    | current-task       | specificity       | execute   | Não              |
| `tests`        | coverage-autonomy  | specificity       | plan-only | Não              |
| `coverage`     | coverage-autonomy  | specificity       | execute   | Não              |
| `strategy`     | master-plan        | priority          | read-only | Sim              |
| `governance`   | laws               | priority          | read-only | Sim              |
| `architecture` | laws               | specificity       | read-only | Sim              |
| `planning`     | backlog            | specificity       | plan-only | Não              |
| `metrics`      | func-metrics       | priority          | read-only | Não              |
| `audit`        | docs/governance    | specificity       | read-only | Sim              |

## Regras de Conflito

| Regra         | Comportamento                                    |
| ------------- | ------------------------------------------------ |
| `specificity` | Documento específico vence genérico              |
| `priority`    | Documento de maior prioridade vence              |
| `block`       | Conflito estrutural bloqueia execução automática |

## Modos de Execução

| Modo        | Permite                             |
| ----------- | ----------------------------------- |
| `read-only` | Consulta apenas                     |
| `plan-only` | Planejamento, sem gerar código      |
| `execute`   | Execução completa (código + testes) |
