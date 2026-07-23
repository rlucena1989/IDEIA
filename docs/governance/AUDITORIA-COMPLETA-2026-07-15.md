# ðŸ“‹ RELATÃ“RIO FINAL DE AUDITORIA â€” AI-Devkit v2

**Data**: 2026-07-15
**Alvo exclusivo**: `J:\PROJETOS\ai-devkit-workspace\ai-devkit-v2`
**Total de itens para correÃ§Ã£o**: 103
**ExcluÃ­dos**: vscode-extension/ e interface legada (fora de escopo)

---

## InstruÃ§Ãµes para a IA de CorreÃ§Ã£o

1. Processar os grupos em ordem (A â†’ O)
2. Cada grupo tem arquivo:linha especÃ­fico e correÃ§Ã£o sugerida
3. ApÃ³s cada grupo, rodar `npm run build` e `npm run ai:quality:gate`
4. Atualizar `CHANGELOG.md` com cada grupo concluÃ­do

---

## ðŸ”´ GRUPO A â€” BLOQUEANTES (Quebram Runtime ou Build)

### A1. `pre-start-context.js` crasha com MODULE_NOT_FOUND
- **Arquivo**: `pre-start-context.js`
- **Linha**: 7
- **Problema**: `require('./lib/common')` â€” diretÃ³rio `lib/` nÃ£o existe na raiz.
- **CorreÃ§Ã£o**: Trocar para `require('./.ai/bin/lib/common')`

### A2. Adapter packages com `"build": "tsc"` sem `tsconfig.json`
- **Arquivos**: `packages/adapter-dart/package.json`, `packages/adapter-fastapi/package.json`, `packages/adapter-nestjs/package.json`, `packages/adapter-go/package.json`
- **Linha**: 8 em cada
- **Problema**: Script `"build": "tsc"` mas sem `tsconfig.json` no pacote.
- **CorreÃ§Ã£o**: Adicionar `tsconfig.json` referenciando `../tsconfig.base.json`

### A3. `jest.e2e.config.js` nÃ£o existe
- **Arquivo**: `package.json`
- **Linha**: 16
- **Problema**: Script `test:e2e` referencia `jest.e2e.config.js` â€” nÃ£o existe.
- **CorreÃ§Ã£o**: Criar o arquivo OU remover o script.

### A4. `.ai/bin/e2e-plan.js` â€” Erro de sintaxe JS
- **Arquivo**: `.ai/bin/e2e-plan.js`
- **Linha**: 56
- **Problema**: `'import request from 'supertest''` â€” aspas simples dentro de aspas simples quebram o array literal.
- **CorreÃ§Ã£o**: Trocar aspas: `` `import request from 'supertest'` ``

### A5. `.ai/bin/migration-plan.js` â€” VÃ­rgulas faltando
- **Arquivo**: `.ai/bin/migration-plan.js`
- **Linhas**: 36, 40, 41, 42
- **Problema**: Arrays literais sem vÃ­rgulas entre elementos.
- **CorreÃ§Ã£o**: Adicionar `,` ao final de cada linha.

### A6. `iniciar.ps1` â€” Port mismatch
- **Arquivo**: `iniciar.ps1`
- **Linhas**: 19, 23
- **Problema**: Sobe servidor na porta 3001 (linha 19) mas abre browser em `http://localhost:5173` (linha 23).
- **CorreÃ§Ã£o**: Trocar `http://localhost:5173` para `http://localhost:3001`.

### A7. `adapter-fastapi/index.js` â€” Comando Python invÃ¡lido
- **Arquivo**: `packages/adapter-fastapi/index.js`
- **Linha**: 76
- **Problema**: `python -m py_compile -x "**/node_modules/**" src/` â€” `py_compile` nÃ£o aceita `-x`.
- **CorreÃ§Ã£o**: Trocar para `python -m py_compile src/`.

### A8. `adapter-dart/index.js` â€” Comando Dart sem argumento
- **Arquivo**: `packages/adapter-dart/index.js`
- **Linha**: 13
- **Problema**: `dart compile exe` sem arquivo alvo.
- **CorreÃ§Ã£o**: Adicionar detecÃ§Ã£o de entry point: `dart compile exe bin/main.dart`.

---

## ðŸ”´ GRUPO B â€” DADOS CORROMPIDOS / PERDA SILENCIOSA

### B1. MemoryStore: `save()` antes de `load()` zera records
- **Arquivo**: `packages/memory-store/src/memory-store.ts`
- **Linha**: 63-64
- **Problema**: `state.records = this.inMemoryRecords` â€” se `load()` nunca foi chamado, records sÃ£o perdidos.
- **CorreÃ§Ã£o**:
  ```typescript
  save(state: MemoryState): void {
    if (!this._loaded) this.load();
    state.records = this.inMemoryRecords;
    // ...
  }
  ```

### B2. MemoryStore: `append()` sem persistÃªncia
- **Arquivo**: `packages/memory-store/src/memory-store.ts`
- **Linha**: 84-86
- **Problema**: `append()` sÃ³ faz push em memÃ³ria. Crash antes de `save()` = perda total.
- **CorreÃ§Ã£o**: Adicionar `save()` automÃ¡tico apÃ³s `append()`.

### B3. AuditTrail: escrita do arquivo inteiro a cada `append()`
- **Arquivo**: `packages/audit-trail/src/audit-trail.ts`
- **Linha**: 26-29
- **Problema**: `load()` lÃª arquivo inteiro â†’ `push()` â†’ `writeFileSync()` escreve tudo. O(n) memÃ³ria.
- **CorreÃ§Ã£o**: Migrar para append-only: `appendFileSync()` em formato JSONL (1 objeto por linha).

### B4. AuditTrail: sem file rotation
- **Arquivo**: `packages/audit-trail/src/audit-trail.ts`
- **Linha**: 29
- **Problema**: Arquivo cresce infinitamente sem max size, rotation, archival.
- **CorreÃ§Ã£o**: Implementar rotation: `if (stats.size > MAX_BYTES) { archive(); createNew(); }`.

### B5. AuditTrail: sem file locking
- **Arquivo**: `packages/audit-trail/src/audit-trail.ts`
- **Linha**: 26-29
- **Problema**: Duas chamadas simultÃ¢neas a `append()` corrompem dados. Segunda `writeFileSync` sobrescreve a primeira.
- **CorreÃ§Ã£o**: Adicionar lock baseado em arquivo OU usar `appendFileSync()`.

### B6. AuditTrail: JSON parse error retorna `[]` silencioso â€” PERDA PERMANENTE
- **Arquivo**: `packages/audit-trail/src/audit-trail.ts`
- **Linha**: 36-38
- **Problema**: `catch { return []; }` â€” arquivo corrompido â†’ retorna `[]`. PrÃ³ximo `append()` sobrescreve com `[newEvent]`, perdendo tudo.
- **CorreÃ§Ã£o**: Renomear arquivo corrompido antes de recriar:
  ```typescript
  catch {
    fs.renameSync(this.filePath, this.filePath + '.corrupted');
    return [];
  }
  ```

---

## ðŸ”´ GRUPO C â€” EVENT-BUS: ERROS ENGOLIDOS E MEMORY LEAKS

### C1. Erros de handler silenciosamente engolidos
- **Arquivo**: `packages/event-bus/src/event-bus.ts`
- **Linha**: 57-59
- **Problema**: `catch { /* handler error swallowed */ }` â€” erro completamente invisÃ­vel.
- **CorreÃ§Ã£o**: `catch (err) { console.error('[EventBus] Handler error:', err); }`

### C2. `stop()` nÃ£o cancela subscription
- **Arquivo**: `packages/event-bus/src/ws-broadcast.ts`
- **Linha**: 67-73
- **Problema**: `stop()` sÃ³ faz `this.subscriptionId = null`. Subscription permanece no EventBus.
- **CorreÃ§Ã£o**: Chamar `EventBus.unsubscribe(this.subscriptionId)` antes de setar null.

### C3. Memory leak de WebSocket clients
- **Arquivo**: `packages/event-bus/src/ws-broadcast.ts`
- **Linha**: 55-58
- **Problema**: Clients que fecharam sem emitir evento acumulam no Set para sempre.
- **CorreÃ§Ã£o**:
  ```typescript
  ws.on('close', () => this.clients.delete(ws));
  ws.on('error', () => this.clients.delete(ws));
  ```

### C4. Sem listener de erro no WebSocketServer
- **Arquivo**: `packages/event-bus/src/ws-broadcast.ts`
- **Linha**: 28-31
- **Problema**: `new WebSocketServer({ port })` sem `'error'` listener. Porta ocupada = crash.
- **CorreÃ§Ã£o**: `this.wss.on('error', (err) => { console.error(err); });`

---

## ðŸ”´ GRUPO D â€” DEPENDÃŠNCIAS FALTANTES

### D1. `packages/contracts/package.json` â€” `zod` ausente
- **Problema**: `schemas.ts:1` importa `z` de `zod`, mas nÃ£o declarado.
- **CorreÃ§Ã£o**: Adicionar `"zod": "^3.22.4"` em `dependencies`.

### D2. `packages/event-bus/package.json` â€” `ws` ausente
- **Problema**: `ws-broadcast.ts:1` importa `WebSocket` de `ws`, nÃ£o declarado.
- **CorreÃ§Ã£o**: Adicionar `"ws": "^8.16.0"` em `dependencies`.

### D3. `packages/agent-runtime/package.json` â€” Zero dependencies
- **Problema**: Importa de `@ideia/policy-engine`, `audit-trail`, `memory-store` sem declarÃ¡-los.
- **CorreÃ§Ã£o**: Adicionar:
  ```json
  "dependencies": {
    "@ideia/policy-engine": "*",
    "@ideia/audit-trail": "*",
    "@ideia/memory-store": "*"
  }
  ```

### D4. `packages/policy-engine/package.json` â€” `@ideia/contracts` ausente
- **CorreÃ§Ã£o**: Adicionar `"@ideia/contracts": "*"` em `dependencies`.

### D5. `packages/audit-trail/package.json` â€” `@ideia/contracts` ausente
- **CorreÃ§Ã£o**: Adicionar `"@ideia/contracts": "*"` em `dependencies`.

---

## ðŸ”´ GRUPO E â€” TASKS E GOVERNANÃ‡A FANTASMA

### E1. `backlog.md` vs `TASK-IDE-01..06` â€” ContradiÃ§Ã£o
- **Arquivo**: `backlog.md` linhas 65-71
- **Problema**: 6 tasks marcadas âœ… (done) mas TODAS subtasks estÃ£o [ ] (unchecked).
- **Arquivos afetados**: `TASK-IDE-01.md` a `TASK-IDE-06.md`
- **CorreÃ§Ã£o**: Auditar cada task, marcar subtasks corretamente, atualizar backlog.

### E2. `backlog.md` vs `TASK-EV-01/02/03/05`
- **Problema**: backlog.md:38 âœ… mas task ALL subtasks [ ].
- **CorreÃ§Ã£o**: Sincronizar.

### E3. DiretÃ³rios inexistentes referenciados como "implementados"
| DiretÃ³rio | Referenciado por | CorreÃ§Ã£o |
|-----------|------------------|----------|
| `.ai/optimizer/` | TASK-EV-01, 02, 05 (22+ refs) | Criar OU remover referÃªncias |
| `.ai/contracts/openapi/` | TASK-IDE-03 | Criar spec OU marcar pendente |
| `.ai/contracts/asyncapi/` | TASK-IDE-04 | Criar spec OU marcar pendente |
| `.ai/performance/` | TASK-IDE-13, master-plan | Criar `budget.yaml` OU remover |
| `.ai/reports/` | enforce-document-flow.js | Criar dir OU corrigir script |
| `.ai/project-control/` | enforce-document-flow.js | Criar dir OU corrigir script |
| `.ai/knowledge/entries/*.yaml` | TASK-GAP-08 (50+ claimed) | Criar entries OU corrigir |

### E4. `master-plan.md` â€” Claim 95% irreal
- **Linha**: 4, 14-17
- **Problema**: "95% tasks implementadas" mas 35+ subtasks IDE desmarcadas, dirs nÃ£o existem.
- **CorreÃ§Ã£o**: Atualizar para % real.

### E5. Task files com referÃªncias a arquivos que nÃ£o existem
| Task | ReferÃªncia | Arquivo real | CorreÃ§Ã£o |
|------|-----------|--------------|----------|
| TASK-EV-01 | `packages/core/src/runtime/agent-state.ts` | `packages/core/` sem `src/` | Atualizar path |
| TASK-EV-02 | `packages/core/src/security/agent-sandbox.ts` | NÃ£o existe | Idem |
| TASK-EV-03 | `packages/core/src/git-provider/` | NÃ£o existe | Idem |
| TASK-EV-04 | `packages/core/src/rag/` | NÃ£o existe (RAG em `cli/src/local-ai/`) | Atualizar path |
| TASK-IDE-09 | `docs/governance/v3-boundaries.md` | NÃ£o existe | Criar ou remover |
| TASK-IDE-11 | `packages/cli/src/quality/contract-audit.ts` | NÃ£o existe | Criar ou remover |
| TASK-IDE-12 | `packages/cli/src/commands/onboarding.ts` (NOVO) | NÃ£o existe | Criar comando |
| TASK-IDE-13 | `.ai/performance/budget.yaml` | NÃ£o existe | Criar |

---

## ðŸŸ  GRUPO F â€” CORE PACKAGES: DESIGN

### F1. MemoryStore sem file locking
- **Arquivo**: `packages/memory-store/src/memory-store.ts`
- **Linhas**: 66-68
- **CorreÃ§Ã£o**: Adicionar `proper-lockfile` OU flock.

### F2. MemoryStore `save()` sÃ­ncrono bloqueia event loop
- **Arquivo**: `packages/memory-store/src/memory-store.ts`
- **Linhas**: 71, 79
- **CorreÃ§Ã£o**: Usar `writeFile` assÃ­ncrono ou debounce.

### F3. MemoryStore `clear()` nÃ£o persiste
- **Arquivo**: `packages/memory-store/src/memory-store.ts`
- **Linhas**: 112-114
- **CorreÃ§Ã£o**: `clear() { this.inMemoryRecords = []; this.save(); }`

### F4. PolicyEngine regex `rm -rf /` muito restritivo
- **Arquivo**: `packages/policy-engine/src/policy.ts`
- **Linha**: 14
- **Problema**: SÃ³ pega `rm -rf /` exato. Falha para `rm -rf /*`, `rm -rf --no-preserve-root`, `rm -rfv /`.
- **CorreÃ§Ã£o**: `rm\s+(-[a-z]*r[a-z]*\s+)?(-[a-z]*f[a-z]*\s+)?\s*\/`

### F5. PolicyEngine sem regras para Windows/cmd inject
- **Arquivo**: `packages/policy-engine/src/policy.ts`
- **Linhas**: 14-21
- **Problema**: Sem regras para `eval`, `exec`, fork bombs, `Remove-Item -Recurse`, `> /dev/sda`.
- **CorreÃ§Ã£o**: Adicionar blocked patterns.

### F6. PolicyEngine `riskLevel` omisso â†’ `'auto'` perigoso
- **Arquivo**: `packages/policy-engine/src/policy.ts`
- **Linha**: 53
- **CorreÃ§Ã£o**: Default para `'ask'`.

### F7. PolicyEngine `evaluateBatch` sem isolamento
- **Arquivo**: `packages/policy-engine/src/policy.ts`
- **Linhas**: 56-58
- **CorreÃ§Ã£o**: `try/catch` por item.

### F8. AgentRuntime `memoryPath` declarado nÃ£o usado
- **Arquivo**: `packages/agent-runtime/src/agent-runtime.ts`
- **Linhas**: 22-26
- **CorreÃ§Ã£o**: Remover parÃ¢metro.

### F9. AgentRuntime `run()` sem error handling
- **Arquivo**: `packages/agent-runtime/src/agent-runtime.ts`
- **Linhas**: 28-61
- **CorreÃ§Ã£o**: `try/catch` com rollback + log.

### F10. AgentRuntime `confirmExecution` sem validaÃ§Ã£o de `actionId`
- **Arquivo**: `packages/agent-runtime/src/agent-runtime.ts`
- **Linhas**: 86-102
- **CorreÃ§Ã£o**: Verificar se `actionId` existe.

---

## ðŸŸ  GRUPO G â€” CLI COMMANDS

### G1. `init.ts:225-227` â€” `return` unreachable apÃ³s `process.exit(1)`
- **CorreÃ§Ã£o**: Remover `return`.

### G2. `verify.ts:45` â€” InvocaÃ§Ã£o recursiva frÃ¡gil
- **CorreÃ§Ã£o**: Usar `process.argv[1]` OU path absoluto do `dist/index.js`.

### G3. `verify.ts:114` â€” `as any` sem justificativa
- **CorreÃ§Ã£o**: Tipar ou adicionar JSDoc.

### G4. `security.ts:129` â€” `opts` implicit `any`
- **CorreÃ§Ã£o**: Tipar com Commander options.

### G5. `security.ts:154-155` â€” `require()` inline
- **CorreÃ§Ã£o**: Mover para top-level `import`.

### G6. `security.ts:194` â€” `console.log()` inconsistente
- **CorreÃ§Ã£o**: Unificar com `deps.printLine`.

### G7. `contract.ts:74,75,116,148,176` â€” `process.exit(1)` sem `finish()`
- **CorreÃ§Ã£o**: Substituir por `finish({ ok: false })`.

### G8. `contract.ts:213` â€” Erro de permissÃ£o engolido
- **CorreÃ§Ã£o**: Logar warning.

### G9. `release.ts:157-161` â€” JSON parse error â†’ version `'0.0.0'`
- **CorreÃ§Ã£o**: Logar warning + abortar.

### G10. `generate.ts:40` â€” Import `getCliVersion` nÃ£o usado
- **CorreÃ§Ã£o**: Remover import.

### G11. `generate.ts:103` â€” MutaÃ§Ã£o global `process.env`
- **CorreÃ§Ã£o**: Usar escopo local.

### G12. `ai.ts:139` â€” `updates as any` sem justificativa
- **CorreÃ§Ã£o**: Tipar corretamente.

### G13. `ai.ts:229` â€” MutaÃ§Ã£o global `process.env.AI_PROVIDER`
- **CorreÃ§Ã£o**: Usar escopo local.

### G14. `ai.ts:243` â€” Unsafe type cast sem validaÃ§Ã£o
- **CorreÃ§Ã£o**: Validar opts antes do cast.

### G15. `ide.ts:46` â€” `fork(__filename)` risco de recursÃ£o
- **CorreÃ§Ã£o**: `if (process.env.AI_DAEMON_CHILD) { ... }`.

### G16. `knowledge.ts:89` â€” ParÃ¢metro `<id>` ignorado
- **CorreÃ§Ã£o**: Usar `id` em `exportEntries()`.

### G17. `knowledge.ts:116` â€” `opts` implicit `any`
- **CorreÃ§Ã£o**: Adicionar type annotation.

### G18. `utils/output.ts:76` â€” `finish()` sempre `process.exit()`
- **CorreÃ§Ã£o**: Tornar `process.exit` opcional via parÃ¢metro `opts.exit = true`.

### G19. `infra/command-runner.ts:8` â€” `catch (error: any)`
- **CorreÃ§Ã£o**: Tipar como `unknown` + type guard.

### G20. `detect.ts:55,57` â€” `elixir` duplicado
- **CorreÃ§Ã£o**: Remover duplicata.

### G21. `detect.ts:277-278` â€” Filtro confuso
- **CorreÃ§Ã£o**: `const mergedLangs = [...new Set(languages)]`.

### G22. `observability.ts:245` â€” Double unsafe cast
- **CorreÃ§Ã£o**: Type guard: `'source' in t ? (t as AutoTraceEntry).source : 'manual'`.

---

## ðŸŸ  GRUPO H â€” .ai/bin SCRIPTS

### H1. `check-boundaries.js:21-29` â€” YAML parsing via regex frÃ¡gil
- **CorreÃ§Ã£o**: Usar `js-yaml` em vez de regex.

### H2. `check-boundaries.js:31-35` â€” Assume `src/modules/` que nÃ£o existe
- **CorreÃ§Ã£o**: Mudar para `packages/*/src/`.

### H3. `gap-check.js:70` â€” `git ls-files .env` crasha sem `.git`
- **CorreÃ§Ã£o**: `if (!fs.existsSync('.git')) return;`.

### H4. `sdk-generate.js:46-53` â€” Escape incorreto de backticks
- **CorreÃ§Ã£o**: Usar `String.raw` ou escape correto.

### H5. Shebang ausente em 3 scripts
- **Arquivos**: `check-health-consistency.js`, `check-portability.js`, `run-prevention-suite.js`
- **CorreÃ§Ã£o**: Adicionar `#!/usr/bin/env node` na linha 1.

### H6. `k8s-docs.js` â€” Stub de 11 linhas
- **CorreÃ§Ã£o**: Implementar ou remover do package.json.

### H7. `gen.js` â€” Wrapper frÃ¡gil
- **CorreÃ§Ã£o**: Passar `process.argv.slice(2)` OU fundir com `generate.js`.

### H8. `enforce-document-flow.js:172-188` â€” Lowercase mismatch
- **CorreÃ§Ã£o**: Extrair ID numÃ©rico: `taskId.match(/\d+/)[0]`.

### H9. `verify.js:8-14` â€” Placeholders incompletos
- **CorreÃ§Ã£o**: Adicionar `TODO|FIXME|{{.*?}}|XXX` Ã  regex.

---

## ðŸŸ  GRUPO I â€” CONFIG E BUILD

### I1. Scripts duplicados no package.json
- `ai:contracts:check` = `ai:contract-check` (`.ai/bin/check-contracts.js`)
- `ai:api:validate` = `ai:openapi-validate` (`.ai/bin/openapi-validate.js`)
- **CorreÃ§Ã£o**: Remover um de cada par.

### I2. `tsconfig.json` â€” 23 de 45 packages nÃ£o compilam
- **Arquivo**: `tsconfig.json` linhas 20-42
- **CorreÃ§Ã£o**: Adicionar todos os packages com `tsconfig.json` Ã s `references`.

### I3. ESLint sem type-aware linting para 45 packages
- **Arquivo**: `.eslintrc.js` linha 3
- **CorreÃ§Ã£o**: `project: ['packages/*/tsconfig.json']`.

### I4. Jest config ignorando dist de outros packages
- **Arquivo**: `jest.config.js` linha 11
- **CorreÃ§Ã£o**: Adicionar `'<rootDir>/packages/*/dist/'` ao `modulePathIgnorePatterns`.

---

## ðŸŸ  GRUPO J â€” DOCUMENTAÃ‡ÃƒO INCONSISTENTE

### J1. VersÃ£o do projeto: 5 fontes conflitantes
| Fonte | Valor | CorreÃ§Ã£o |
|-------|-------|----------|
| `package.json` (root) | AUSENTE | Adicionar `"version": "2.4.0"` |
| `packages/cli/package.json` | AUSENTE | Adicionar versÃ£o |
| `packages/core/package.json` | AUSENTE | Adicionar versÃ£o |
| `CHANGELOG.md` | `vundefined` (4x) | Corrigir para `v2.4.0` |
| `README.md:3` | `v12.1` | Corrigir para `v2.4.0` |

### J2. Cobertura de testes: 3 nÃºmeros diferentes
- `AUDITORIA-COMPLETA.md:39` â€” 84.28% (real: 19.73%)
- `jest.config.js:14` â€” threshold 80% (nÃ£o atingido)
- **CorreÃ§Ã£o**: Atualizar docs com valor real OU aumentar cobertura.

### J3. Documentos redundantes
- `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` â€” 3 cÃ³pias idÃªnticas
- 4+ arquivos `AUDITORIA-*.md` sobrepostos
- 6+ arquivos `IDE-*.md` sobrepostos
- **CorreÃ§Ã£o**: Consolidar.

### J4. `AGENTS.md:9` â€” "Proibido uso de any" mas ESLint tem `no-explicit-any: off`
- **CorreÃ§Ã£o**: Ativar regra ESLint OU atualizar AGENTS.md.

---

## ðŸŸ¡ GRUPO K â€” CORE PACKAGES: MENORES

### K1. `contracts/src/types.ts:6` â€” `ActionType = string` permissivo
- **CorreÃ§Ã£o**: Definir union type.

### K2. `contracts/src/schemas.ts` â€” `Contract.pre()` nÃ£o existe
- **CorreÃ§Ã£o**: Implementar `Contract.pre(schema, data)` que chama `schema.safeParse(data)`.

### K3. `contracts/README.md:16-20` â€” Exemplo `id: 'REQ-001'` falha UUID
- **CorreÃ§Ã£o**: Trocar para `id: '550e8400-e29b-41d4-a716-446655440000'`.

---

## ðŸŸ¡ GRUPO L â€” TESTES

### L1. 56/56 test files em `commands/__tests__/` sÃ£o stubs sem valor
- **Exemplo**: `gate.test.ts` (11 linhas, 2 testes sem asserÃ§Ã£o real)
- **CorreÃ§Ã£o**: Reescrever com asserts reais OU remover.

### L2. `packages/core/` tem ZERO testes
- **CorreÃ§Ã£o**: Adicionar testes.

### L3. `packages/web-ui/` tem ZERO testes
- **CorreÃ§Ã£o**: Adicionar smoke tests.

### L4. `.ai/bin/` â€” 91+ scripts sem cobertura
- **CorreÃ§Ã£o**: Adicionar teste de integraÃ§Ã£o.

### L5. Cobertura real 19.73% vs meta 80%
- **CorreÃ§Ã£o**: Aumentar cobertura OU reduzir threshold.

---

## ðŸŸ¡ GRUPO M â€” IDE/SECURITY

### M1. `health/required-files.ts` â€” Sem runtime executor
- **Problema**: SÃ³ define tipos + constantes. Nenhuma funÃ§Ã£o executa health checks.
- **CorreÃ§Ã£o**: Implementar `runHealthChecks(): HealthReport`.

### M2. `ide/ide-server.ts:171-189` â€” File watcher por polling 2s
- **CorreÃ§Ã£o**: Substituir por `chokidar.watch()`.

### M3. `ide/lsp-bridge.ts:17` â€” Caminho hardcoded
- **CorreÃ§Ã£o**: Usar `require.resolve('typescript-language-server')`.

### M4. `ide/terminal-bridge.ts:28-38` â€” Blocked patterns sÃ³ Unix
- **CorreÃ§Ã£o**: Adicionar blocked patterns para Windows.

### M5. `ide/chat-bridge.ts:77` â€” Acesso a propriedade privada
- **CorreÃ§Ã£o**: Adicionar getter pÃºblico `getMemoryStore()`.

---

## ðŸŸ¡ GRUPO N â€” ADAPTADORES STUB

### N1. 10 de 13 adaptadores sÃ£o stubs
- **Pacotes**: adapter-{dart,fastapi,go,nestjs,haskell,java,kotlin,php,ruby,scala,swift,zig,elixir}
- **EvidÃªncia**: `generateTemplate` retorna sÃ³ o nome, `qualityGate` retorna `true`
- **CorreÃ§Ã£o**: Implementar OU marcar como `"experimental": true`.

---

## ðŸŸ¢ GRUPO O â€” BAIXA PRIORIDADE

### O1. Artefatos Ã³rfÃ£os versionados
- `packages/cli/src/index.ts.no-shebang` â€” 1 linha, nome contradiz conteÃºdo
- `packages/cli/src/index.ts.tmp` â€” 279 linhas, cÃ³pia truncada
- **CorreÃ§Ã£o**: Deletar + adicionar ao `.gitignore`.

### O2. Agent-runtime sem lifecycle
- **CorreÃ§Ã£o**: Adicionar `start()`, `stop()`, `pause()`, `resume()`.

### O3. Event-bus wildcard fire antes dos type-specific
- **CorreÃ§Ã£o**: Documentar ordem ou inverter.

### O4. Tipos nÃ£o usados em contracts
- `ComplexityLevel`, `ResourceTier`, `ExecutionMode`, `MaturityLevel`, `TraceEntityType`
- **CorreÃ§Ã£o**: Remover se nÃ£o usados.

### O5. NPM scripts inconsistentes
- `ai:status`, `check:env`, `ai:quality:gate`, `hardening` â€” 3 padrÃµes
- **CorreÃ§Ã£o**: Unificar para `ai:<area>:<action>`.

### O6. CHANGELOG.md usa `vundefined`
- **CorreÃ§Ã£o**: Substituir por `v2.4.0`.

---

## ðŸ“Š RESUMO

| Grupo | Categoria | Qtd | Dificuldade |
|-------|-----------|:---:|:-----------:|
| A | Bloqueantes (runtime/build crash) | 8 | FÃ¡cil |
| B | Dados corrompidos / perda silenciosa | 6 | MÃ©dia |
| C | Event-bus: erros engolidos + leaks | 4 | MÃ©dia |
| D | DependÃªncias faltantes | 5 | FÃ¡cil |
| E | Tasks e governanÃ§a fantasma | 5 | MÃ©dia |
| F | Core packages: design | 10 | MÃ©dia |
| G | CLI commands | 22 | FÃ¡cil-MÃ©dia |
| H | .ai/bin scripts | 9 | FÃ¡cil |
| I | Config e build | 4 | FÃ¡cil |
| J | DocumentaÃ§Ã£o inconsistente | 4 | FÃ¡cil |
| K | Core packages: menores | 3 | FÃ¡cil |
| L | Testes | 5 | DifÃ­cil |
| M | IDE/Security | 5 | MÃ©dia |
| N | Adaptadores stub | 10 | MÃ©dia-DifÃ­cil |
| O | Baixa prioridade | 6 | FÃ¡cil |
| **Total** | | **103** | |
