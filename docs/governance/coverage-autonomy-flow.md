# Coverage Autonomy Flow — Autonomia de Testes e Cobertura

## Visão Geral

O sistema de autonomia de testes lê métricas de cobertura, identifica gaps relevantes, classifica por severidade e gerencia um ciclo de reparo auditável.

## Arquitetura

```
coverage-summary.json (Jest)
    │
    ▼
┌──────────────────────┐
│  coverage-reader.ts   │  → readCoverageReport(), summarizeCoverage(),
│                       │     extractFileSummaries()
└────────┬─────────────┘
         │ CoverageReport normalizada
         ▼
┌──────────────────────┐
│ test-quality-         │
│ classifier.ts        │  → classifyTestGap(), isCosmetic(), isCriticalCoverage()
└────────┬─────────────┘
         │ Gaps classificados por severidade
         ▼
┌──────────────────────┐
│  gap-prioritizer.ts   │  → scoreGap(), prioritizeGaps(), rankBySeverity()
└────────┬─────────────┘
         │ Gaps ordenados por prioridade
         ▼
┌──────────────────────┐
│  test-repair-loop.ts  │  → runRepairLoop(), repairSingleGap(),
│                       │     validateAfterRepair(), shouldContinueLoop()
└────────┬─────────────┘
         │ Status do ciclo
         ▼
┌──────────────────────┐
│  status.ts            │  → buildAutonomyStatus(), saveAutonomyStatus(),
│                       │     loadAutonomyStatus()
└──────────────────────┘
```

## Módulos

| Módulo                                | Responsabilidade        | Funções                                                                                 |
| ------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| `coverage/types.ts`                   | Interfaces              | `CoverageReport`, `CoverageGap`, `AutonomyStatus`, `GapSeverity`                        |
| `coverage/coverage-reader.ts`         | Leitura de relatórios   | `readCoverageReport()`, `summarizeCoverage()`, `extractFileSummaries()`                 |
| `coverage/gap-prioritizer.ts`         | Priorização de gaps     | `scoreGap()`, `prioritizeGaps()`, `rankBySeverity()`                                    |
| `coverage/test-quality-classifier.ts` | Classificação semântica | `classifyTestGap()`, `isCosmetic()`, `isCriticalCoverage()`                             |
| `coverage/test-repair-loop.ts`        | Ciclo de reparo         | `runRepairLoop()`, `repairSingleGap()`, `validateAfterRepair()`, `shouldContinueLoop()` |
| `coverage/status.ts`                  | Persistência de estado  | `buildAutonomyStatus()`, `saveAutonomyStatus()`, `loadAutonomyStatus()`                 |

## Severidade de Gaps

| Severidade  | Pontuação | Critérios                         |
| ----------- | --------- | --------------------------------- |
| `critical`  | 100       | auth, execução crítica, data loss |
| `important` | 70        | core, regression, command         |
| `optional`  | 40        | (padrão)                          |
| `cosmetic`  | 10        | nice to have, visual              |

## Comandos CLI

```bash
# Auditar cobertura atual
ai-devkit coverage audit
ai-devkit coverage audit --json

# Listar gaps priorizados
ai-devkit coverage gaps
ai-devkit coverage gaps --severity critical
ai-devkit coverage gaps --json

# Executar ciclo de reparo
ai-devkit coverage repair
ai-devkit coverage repair -n 5
ai-devkit coverage repair --json

# Status da autonomia
ai-devkit coverage status
ai-devkit coverage status --json
```

## Regras

1. **Cobertura não é objetivo isolado** — gaps são classificados por valor semântico, não apenas percentual
2. **Gap útil vence gap cosmético** — módulo central com 60% pode ser mais importante que periférico com 85%
3. **Repair loop só com validação** — cada ciclo valida compilação e comportamento
4. **Estado é persistente** — `./ai-devkit/autonomy-status.json` salva o ciclo atual
5. **Meta padrão: 20%** — alinhado às leis arquiteturais (`./ai/laws.yaml`)
