# Propostas Detalhadas â€” v2.1 e v2.2

## v2.1 Propostas

### P1 â€” CLI Consolidation (F04) `[score: 21]`
**Status:** Parcial (domain/doc-service + domain/coverage-service existem)

Completar a migraÃ§Ã£o de todos os comandos pÃºblicos para o padrÃ£o `CliCommandResult`:
- `success(data, message)` e `failure(message, code)` em toda a CLI
- Remover `console.log` direto dos comandos â€” usar o IO layer
- Garantir que `--json` funcione em todos os comandos

**Arquivos:** `packages/cli/src/commands/*.ts`, `packages/cli/src/types/cli-result.ts`

---

### P2 â€” Governance Docs (registry + resolver + policy) `[score: 23]`
**Status:** Completo (4 mÃ³dulos em `governance/`)

Manter e auditar periodicamente. Adicionar:
- Auto-registro de novos documentos
- ValidaÃ§Ã£o de integridade do registry

**Arquivos:** `packages/cli/src/governance/*.ts`

---

### P3 â€” Coverage Reader `[score: 23]`
**Status:** Completo

Manter. Garantir que lÃª corretamente relatÃ³rios `lcov.info` e `coverage-final.json`.
Adicionar fallback para `clover.xml`.

**Arquivos:** `packages/cli/src/coverage/coverage-reader.ts`

---

### P4 â€” Autonomy Status Persistence `[score: 39]`
**Status:** Parcial (`coverage/status.ts` existe)

Completar a persistÃªncia:
- Salvar estado em `.ai-devkit/autonomy-status.json`
- Recuperar entre sessÃµes da CLI
- Exibir no cockpit da extensÃ£o
- Adicionar `lastRunAt`, `currentFocus`, `nextAction`, `blocked`, `reason`

**Arquivos:** `packages/cli/src/coverage/status.ts`, `vscode-extension/src/services/cliBridge.ts`

---

### P5 â€” IO Isolation (F04) `[score: 24]`
**Status:** Parcial (`io/` interfaces existem)

Garantir que todos os mÃ³dulos usam `getIO()` em vez de `fs`/`path` direto.
MÃ³dulos crÃ­ticos: `coverage/`, `planner/`, `governance/`, `commands/`.

**Arquivos:** `packages/cli/src/io/interfaces.ts`, `packages/cli/src/io/real.ts`

---

### P6 â€” Extension Cockpit (F05) `[score: 13]`
**Status:** Completo (StatusProvider + MetricsProvider + commands)

Manter. Adicionar refresh automÃ¡tico mais rÃ¡pido (30s em vez de 60s).
Garantir que os providers mostram dados reais da CLI.

**Arquivos:** `vscode-extension/src/views/*.ts`

---

### P7 â€” Audit System `[score: 18]`
**Status:** Completo (`commands/audit.ts`, `commands/audit-ledger.ts`)

Manter. Integrar com o sistema de governanÃ§a para detectar conflitos.

---

### P8 â€” Contract Validation `[score: 17]`
**Status:** Completo (`contracts/` validator + linter + differ + generator)

Manter. Garantir que roda no quality gate.

---

### P9 â€” Scorecard System `[score: 17]`
**Status:** Completo (`commands/scorecard.ts`)

Manter. Integrar com o cockpit da extensÃ£o.

---

### P10 â€” Planning System (F02) `[score: 16]`
**Status:** Completo

Manter. Garantir que `plan create â†’ validate â†’ status` funciona sem falhas.

---

## v2.2 Propostas

### P11 â€” Gap Prioritizer `[score: 17]`
**Status:** Parcial (`coverage/gap-prioritizer.ts` existe)

Melhorar:
- Pesos ajustÃ¡veis por severidade
- IntegraÃ§Ã£o com histÃ³rico de reparos anteriores
- SugestÃ£o de ordem de reparo baseada em impacto real

**Arquivos:** `packages/cli/src/coverage/gap-prioritizer.ts`

---

### P12 â€” Test Quality Classifier `[score: 17]`
**Status:** Parcial (`coverage/test-quality-classifier.ts` existe)

Melhorar:
- ClassificaÃ§Ã£o alÃ©m de keyword matching
- DetecÃ§Ã£o de testes duplicados
- SugestÃ£o de remoÃ§Ã£o de testes cosmÃ©ticos

**Arquivos:** `packages/cli/src/coverage/test-quality-classifier.ts`

---

### P13 â€” Test Repair Loop `[score: 10]`
**Status:** Parcial (`coverage/test-repair-loop.ts` existe)

Completar:
- Gerar/adjustar testes automaticamente
- Validar ciclo pÃ³s-reparo
- Repetir atÃ© cobertura bater alvo ou estagnar
- Logging detalhado do ciclo

**Arquivos:** `packages/cli/src/coverage/test-repair-loop.ts`

---

### P14 â€” Pattern Learning `[score: 5]`
**Status:** Parcial (`runtime/pattern-learner.ts` + `pattern-observer.ts` existem)

Ativar:
- DetecÃ§Ã£o automÃ¡tica de padrÃµes no cÃ³digo
- Registro no pattern-registry
- SugestÃ£o de refatoraÃ§Ã£o baseada em padrÃµes detectados

**Arquivos:** `packages/cli/src/runtime/pattern-learner.ts`

---

### P15 â€” MCP Server `[score: 5]`
**Status:** Parcial (`commands/mcp.ts` existe)

Completar:
- Servidor MCP rodando como comando `ai-devkit mcp`
- Ferramentas expostas: `search_docs`, `run_command`, `get_status`
- IntegraÃ§Ã£o com VS Code via extensÃ£o

**Arquivos:** `packages/cli/src/commands/mcp.ts`
