# Conflict Resolution — Resolução de Conflitos Documentais

## Regras de Resolução

### 1. Documento específico vence documento genérico

Se dois documentos tratam do mesmo assunto, o mais específico (com escopo mais restrito) prevalece.

### 2. Conflito estrutural bloqueia execução

Conflitos de severidade `critical` impedem execução automática até resolução humana.

### 3. O sistema registra a decisão tomada

Toda resolução de conflito é registrada com:

- Documentos envolvidos
- Razão do conflito
- Regra aplicada
- Decisão tomada

## Conflitos Detectados Atualmente

| #   | Severidade  | Assunto                              | Documentos                                    | Resolução                                                        |
| --- | ----------- | ------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------- |
| 1   | 🔴 Critical | Coverage threshold (40% vs 80%)      | `jest.config.js` vs `.ai/laws.yaml`           | `specificity` — `.ai/laws.yaml` (específico de governança) vence |
| 2   | 🟠 High     | `no-explicit-any` desligado          | `.eslintrc.js` vs `.ai/laws.yaml`             | `specificity` — `.ai/laws.yaml` vence                            |
| 3   | 🟠 High     | `jest.e2e.config.js` ausente         | `package.json` referencia arquivo inexistente | Requer criação do arquivo                                        |
| 4   | 🟠 High     | Múltiplas métricas de cobertura      | 6 documentos com números diferentes           | `priority` — `coverage/coverage-summary.json` (fonte executável) |
| 5   | 🟡 Medium   | Regras duplicadas em 12+ arquivos IA | `CLAUDE.md`, `AGENTS.md`, etc.                | `specificity` — `.ai/laws.yaml` como fonte única                 |

## API Exposta

- `detectConflicts()` — retorna lista de conflitos detectados
- `resolveConflict(conflict)` — aplica regra e retorna decisão
- `runAudit()` — executa auditoria completa com status
