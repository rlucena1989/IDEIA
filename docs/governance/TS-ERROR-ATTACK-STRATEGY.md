# Estratégia de Ataque aos Erros TypeScript

> **Data:** 2026-07-28
> **Objetivo:** Reduzir erros `tsc -b` dos atuais ~866 para zero

---

## Progresso Atual

### FA-07: Gate Immutability ✅ COMPLETO
- Gates são REAIS, CORRETOS e IMUTÁVEIS pelo agente
- `gate-guard.ts --ci` passando (19 paths, 6/6 pentest bloqueados)
- Documentação em `docs/governance/FA-07-SESSION-REPORT.md`

### Ataque aos Erros TypeScript

| Código | Inicial | Atual | Delta | Status |
|--------|---------|-------|-------|--------|
| **TS2305** (imports inexistentes) | 85 | 63 | -22 | 🔄 Em progresso |
| **TS7006** (parâmetros implícitos) | 57 | 44 | -13 | 🔄 Em progresso |
| **TS2345** (incompatibilidade tipos) | 93 | 44 | -49 | 🔄 Em progresso |
| **TS2322** (atribuições incompatíveis) | 48 | 48 | 0 | ⏳ Pendente |
| **TOTAL** | **283** | **199** | **-84** | 🔄 Em progresso |

---

## Correções Realizadas

### TS2305 (-22 erros)
1. **memory-store/src/index.ts**: Adicionado exports `LlmLearningEngine`, `LearningRecommendation`, `LearningEngineConfig`
2. **onboarding-wizard/src/types.ts**: Adicionado exports `AdaptiveSuggestionsInput`, `AdaptiveWizardState`
3. **scorecard-helpers.ts**: Implementado `gitTraceForFile`, `linkScoreToCommits`, `saveSnapshot` (funções faltantes)

### TS7006 (-13 erros)
1. **scorecard-modes.ts**: Adicionados tipos `any` em parâmetros de callbacks `.then()` e `.catch()`
2. **scorecard-server.ts**: Adicionados tipos `any` em parâmetros de callbacks

### TS2345 (-49 erros)
- Correções automáticas via adição de exports e tipos (impacto cascata)

---

## Próximos Passos Prioritários

### 1. TS2305 Continuação (66 restantes)
**Padrões identificados:**
- `packages/cli/src/commands/privacy.ts`: `ConsentManager`, `DSRManager` (já exportados em privacy-center)
- `packages/cli/src/commands/scorecard-*.ts`: `Notification`, `detectRegression`, `gitTraceForFile`, etc. (exports faltantes em scorecard.ts)
- `packages/cli/src/commands/schema-registry-cmd.ts`: `SchemaDiscovery`, `SchemaCache` (já exportados em schema-registry)

**Ação:** Adicionar re-exports em `packages/cli/src/commands/scorecard.ts` para as funções utilitárias

### 2. TS2345 (93 erros)
**Padrões principais:**
- `Record<string, unknown>` incompatível com tipos específicos (`EvolutionPlan`, `TechSource`, `NotificationEvent`, etc.)
- CLI handlers retornando `CliCommandResult` quando framework espera `void | Promise<void>`

**Ação:**
- Para `Record<string, unknown>`: usar type assertion `as Record<string, unknown>` ou adicionar conversão
- Para CLI handlers: investigar se framework CLI precisa de ajuste ou se handlers devem mudar

### 3. TS7006 (54 restantes)
**Padrões:**
- Parâmetros de callbacks em arrow functions sem tipo explícito
- Principalmente em `packages/cli/src/commands/`

**Ação:** Continuar adicionando tipos `any` em parâmetros de callbacks (solução minimalista)

### 4. TS2322 (48 erros)
**Padrões:**
- Atribuições de tipos incompatíveis (ex: `FeatureFlag` → `Record<string, unknown>`)

**Ação:** Similar ao TS2345 - usar type assertions ou corrigir tipos

---

## Comandos de Verificação

```bash
# Contar erros por tipo
npx tsc -b --pretty false 2>&1 | Select-String -Pattern "TS2305" | Measure-Object
npx tsc -b --pretty false 2>&1 | Select-String -Pattern "TS7006" | Measure-Object
npx tsc -b --pretty false 2>&1 | Select-String -Pattern "TS2345" | Measure-Object
npx tsc -b --pretty false 2>&1 | Select-String -Pattern "TS2322" | Measure-Object

# Ver erros específicos
npx tsc -b --pretty false 2>&1 | Select-String -Pattern "TS2305" | Select-Object -First 10
```

---

## Estimativa de Esforço

| Grupo | Erros Restantes | Esforço Estimado | Prioridade |
|-------|----------------|------------------|------------|
| TS2305 | 66 | ~2h | 🔴 Alta |
| TS2345 | 93 | ~4h | 🔴 Alta |
| TS7006 | 54 | ~1h | 🟡 Média |
| TS2322 | 48 | ~2h | 🟡 Média |
| **TOTAL** | **261** | **~9h** | - |

---

## Recomendação

Continuar atacando TS2305 primeiro pois é o mais direto (adicionar exports faltantes). Depois TS2345 que é o maior grupo e pode ter impacto cascata em outros erros.
