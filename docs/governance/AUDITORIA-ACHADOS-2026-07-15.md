# ðŸš¨ RELATÃ“RIO DE AUDITORIA CONSOLIDADO â€” 2026-07-15 (v2)

**Alvo:** `J:\PROJETOS\ai-devkit-workspace\ai-devkit-v2\`
**PropÃ³sito:** Auditoria exaustiva â€” cÃ³digo, arquitetura, dependÃªncias, scripts, testes, documentaÃ§Ã£o

> InstruÃ§Ãµes para a IA corretora: Cada achado tem arquivo:linha exato. Corrija na ordem de severidade (ðŸ”´ â†’ ðŸŸ  â†’ ðŸŸ¡ â†’ ðŸŸ¢). Atualize o CHANGELOG.md apÃ³s cada correÃ§Ã£o. Rode `npm run build` e `npm run ai:quality:gate` ao final.

---

## ðŸ”´ CRÃTICOS (31 itens â€” quebram produÃ§Ã£o ou impedem deploy)

### C1. Build `npm run build` â€” Timeout (120s+)
- **Arquivo:** `package.json:8`
- **Problema:** 22 comandos `npx tsc -b` em cadeia sequencial + `vite build`. `cd ..\..` Ã© Windows-only.
- **SoluÃ§Ã£o:** Usar `npm run build --workspaces` ou script com `process.execPath`.

### C2. tsconfig.json vs Build Script â€” 28 entradas dessincronizadas
- **Arquivos:** `tsconfig.json:20-42` vs `package.json:8`
- **14 compilados mas NÃƒO no tsconfig:** `event-bus`, `policy-gateway`, `trace-registry`, `feedback-pipeline`, `ide-integration`, `requirements-engine`, `spec-generator`, `agent-identity`, `prompt-security`, `delivery-orchestrator`, `workflow-engine`, `schema-registry`, `external-connectors`, `a11y-scanner`
- **14 no tsconfig mas NÃƒO no build:** Todos os 13 adapters + `apps/api`

### C3. Adapter Packages â€” Duas ImplementaÃ§Ãµes Concorrentes (Dual API)
- **Arquivos:** Todos os 13 `packages/adapter-*/`
- `index.js` (runtime real, API A) vs `src/index.ts` (dead code, API B). APIs diferentes. Tipos enganosos.

### C4. adapter-scala â€” Linguagem Errada
- **Arquivo:** `packages/adapter-scala/adapter.json`
- `"language": "java"` â†’ deveria ser `"scala"`.

### C5. Todos os 37 pacotes sem `license`
- Root + todos `packages/*/package.json`

### C6. 2 pacotes sem `version`
- `packages/a11y-scanner/package.json`, `packages/external-connectors/package.json`

### C7. 15 pacotes sem `types`/`typings`
- 13 adapters + `packages/cli/package.json` + `packages/core/package.json`

### C8. npm Audit â€” 1 vulnerabilidade High (`ws`)
- `npm audit fix` resolve.

### C9. ~200+ `process.exit()` calls â€” impossÃ­vel testar unitariamente
- `packages/cli/src/utils/output.ts:76` â€” `finish()` chama `process.exit()` unconditionally, usado por 25+ comandos
- `packages/cli/src/commands/backup.ts:20,23,42,45`
- `packages/cli/src/commands/features.ts:37,61,85`
- `packages/cli/src/commands/init.ts:226,324`
- `packages/cli/src/commands/agent.ts:54,80,111,136,161,185` â€” 6 calls
- `packages/cli/src/commands/evolve.ts:52,88,123,164,193,235,266,308,334` â€” 9 calls
- `packages/cli/src/commands/context.ts:64,95,124,156,185,212,238,264` â€” 8 calls
- Dezenas mais em `agents.ts`, `approve.ts`, `archive.ts`, `authority.ts`, `autonomy.ts`, etc.
- **SoluÃ§Ã£o:** Substituir por `process.exitCode = code` + retorno de erro, exceto no entrypoint `index.ts`.

### C10. Hardcoded `npx.cmd` â€” quebra em Linux/Mac (5 ocorrÃªncias)
- `packages/cli/src/commands/scorecard-utils.ts:142,143,144,729`
- `packages/cli/src/commands/scorecard-evaluators.ts:283`
- `.ai/bin/run-tests.js:53,97`
- **SoluÃ§Ã£o:** Usar `process.platform === 'win32' ? 'npx.cmd' : 'npx'`.

### C11. Mixed CommonJS `require()` e ESM `import` â€” 50+ ocorrÃªncias
- `packages/cli/src/commands/backup.ts:14,39` â€” `require(bkpPath)` para dynamic loading
- `packages/cli/src/commands/security.ts:154,155` â€” `require('fs')` inline
- `packages/cli/src/commands/acceleration.ts:42,49,77,101,110`
- `packages/cli/src/commands/observability.ts:154`
- `packages/cli/src/commands/doctor.ts:26`
- `packages/cli/src/commands/compile-utils.ts:565`
- `packages/cli/src/commands/scorecard-evaluators.ts:249,283`
- `packages/cli/src/commands/scorecard-utils.ts:544,616,634`
- `packages/cli/src/commands/verify.ts:110`
- `packages/cli/src/commands/orchestrate.ts:278`
- `packages/cli/src/commands/workflow.ts:16,22`
- `packages/cli/src/ide/terminal-bridge.ts:125`
- `packages/cli/src/ide/sandbox.ts:30,40`
- `packages/cli/src/runtime/adapter-runtime.ts:336`

### C12. 22 declaraÃ§Ãµes de dependÃªncia faltando em 7 pacotes
**Pacotes que importam `@ideia/*` mas NÃƒO declaram em package.json:**

| Pacote | Deps faltando |
|--------|--------------|
| `apps/api` | `@ideia/audit-trail`, `@ideia/memory-store`, `@ideia/policy-engine` |
| `audit-trail` | `@ideia/contracts` |
| `policy-engine` | `@ideia/contracts` |
| `agent-runtime` | `@ideia/contracts`, `@ideia/policy-engine`, `@ideia/audit-trail`, `@ideia/memory-store` |
| `policy-gateway` | `@ideia/contracts`, `@ideia/policy-engine` |
| `ide-integration` | `@ideia/event-bus`, `@ideia/trace-registry`, `@ideia/feedback-pipeline`, `@ideia/policy-gateway` |
| `cli` | `@ideia/diff-engine`, `@ideia/memory-store`, `@ideia/audit-trail`, `@ideia/agent-runtime`, `@ideia/contracts` |

**Deps de terceiros tambÃ©m faltando:**
- `packages/contracts` â€” `zod` (usado em schemas.ts, nÃ£o declarado)
- `packages/event-bus` â€” `ws` (usado em ws-broadcast.ts, nÃ£o declarado)
- `packages/web-ui` â€” `@xterm/xterm`, `@xterm/addon-fit` (usados em Terminal.tsx, nÃ£o declarados)

### C13. Testes de integraÃ§Ã£o usam path relativo entre pacotes
- `tests/integration/fluxo-completo.test.ts:11-14` â€” importa `../../packages/.../src/...` em vez de `@ideia/*`
- `packages/agent-runtime/__tests__/agent-runtime.test.ts:5-6` â€” importa `../../audit-trail/src/...` e `../../memory-store/src/...`

### C14. `check-generated-code-risk.js` sÃ³ escaneia `src/` (no root), nunca `packages/`
- **Arquivo:** `.ai/bin/check-generated-code-risk.js:31`
- `walk(path.join(ROOT, 'src'))` â€” `src/` no root sÃ³ tem `src/quality/`. CÃ³digo real estÃ¡ em `packages/`. **Check Ã© effectively no-op.**

### C15. `check-package-scripts.js` regex nÃ£o capta `npx tsx` nem `node --import`
- **Arquivo:** `.ai/bin/check-package-scripts.js:28`
- `/\bnode\s+([^\s&|]+\.js)\b/g` â€” ignora `npx tsx script.ts`, `node --import tsx/esm script.mjs`, `tsx script.ts`

### C16. Nested `node_modules` e `package-lock.json` quebram hoisting do workspace
- `packages/core/node_modules/`, `packages/cli/node_modules/`, `packages/web-ui/node_modules/`
- `packages/core/package-lock.json`

### C17. `packages/diff-engine` â€” Zero testes (0% cobertura)
- Nenhum diretÃ³rio `__tests__/`, nenhum `jest.config.js`. Pacote de infraestrutura crÃ­tica sem testes.

### C18. Hardcoded `node` em vez de `process.execPath`
- `.ai/bin/check-all.js:29` â€” `spawnSync('node', [fullPath], ...)` â†’ deveria ser `process.execPath`

### C19. `console.log` bypassa logging utility â€” quebra LLM mode
- `packages/cli/src/commands/backup.ts:15-19,22,41,44` â€” todo output usa `console.log`
- `packages/cli/src/commands/audit-ledger.ts:15-26`
- `packages/cli/src/commands/agents.ts:201-371`
- `packages/cli/src/commands/security.ts` â€” uso extensivo
- `packages/cli/src/commands/ai.ts:85,100-101,258-261,289-295,350,354,363,371`

### C20. Stale/orphan `.ts` files no src/ sÃ£o compilados
- `packages/cli/src/index.ts.tmp` (279 linhas, versÃ£o stale faltando 5 comandos)
- `packages/cli/src/index.ts.no-shebang` (fragmento)
- Como `tsconfig.json` usa `"include": ["src"]`, esses arquivos .ts serÃ£o compilados.

### C21. Hardcoded monorepo path â€” quebra se CLI for instalado como pacote
- `packages/cli/src/commands/workflow.ts:16` â€” `path.join(__dirname, '..', '..', '..', '..', 'packages', 'web-ui', 'dist')`

### C22. `prove.ts` assume execuÃ§Ã£o de `dist/`
- `packages/cli/src/commands/prove.ts:141-142` â€” `path.join(__dirname, "../index.js")` â€” durante dev com ts-node, nÃ£o existe.

### C23. `utils/version.ts` â€” `__dirname` frÃ¡gil em bundle
- `packages/cli/src/utils/version.ts` â€” `path.resolve(__dirname, "../../package.json")` quebra em esbuild/pkg.

### C24. `utils/template.ts` â€” 5 candidatos a path por tentativa
- `packages/cli/src/utils/template.ts:9-15` â€” 5 paths resolvidos de `__dirname`. FrÃ¡gil.

### C25. `.ai/bin/check-template-consistency.js` requer build prÃ©vio
- `check-template-consistency.js:20-27` â€” `process.exit(1)` se `dist/templates/.ai` nÃ£o existir.
- Bloqueia quality gates em fresh clone.

### C26. `packages/cli/package.json` â€” `@types/ws` em `dependencies` (deveria ser devDependencies)
- `packages/cli/package.json:35`

### C27. `packages/cli/package.json` â€” `ws` Ã© dependÃªncia Ã³rfÃ£ (nÃ£o importada em nenhum source)
- `packages/cli/package.json:38`

### C28. `packages/event-bus/src/ws-broadcast.ts:68-72` â€” Dead code
- Bloco `stop()` tenta `require('./event-bus').EventBus` e nÃ£o faz nada com o resultado.

### C29. `packages/agent-runtime/src/agent-runtime.ts:22-26` â€” ParÃ¢metro redundante
- Construtor recebe `memoryStore: MemoryStore` (jÃ¡ tem seu prÃ³prio path) E `memoryPath: string`. `memoryPath` nunca Ã© usado diretamente.

### C30. Duplicate 'elixir' em linguagem detection
- `packages/cli/src/commands/detect.ts:53 e 57` â€” entrada duplicada faz `detect.ts:214-215` pushar 'elixir' duas vezes.

### C31. `packages/core` â€” Sem `src/`, `tsconfig` compila zero arquivos .ts
- `packages/core/tsconfig.json` com `"include": ["index.js", "bin"]` e `"allowJs": true`
- Script `"build": "tsc"` nÃ£o produz output Ãºtil (zero inputs .ts)

---

## ðŸŸ  ALTOS (20 itens â€” degradam qualidade ou podem quebrar em edge cases)

### H1. master-plan.md â€” 5 ContradiÃ§Ãµes Internas
| Linha | AlegaÃ§Ã£o | Realidade |
|-------|----------|-----------|
| 11 | Scorecard 100/100 âœ… | Linha 479: ðŸ”´ |
| 29 | `:any` zerado (46â†’0) | 23 `as any` em comandos |
| 30 | Placeholders/TODOs: 0 | 3+ TODO reais + 11 PENDING_ACTION + 5 @scaffold-pending |
| 16 | GIT-004: âœ… | Linha 482: ðŸ”´ |
| 97 | F10: âœ… TODOS CONCLUIDOS | Linhas 446-457: todos `[ ]` |

### H2. TASK-EV-18 â€” ContradiÃ§Ã£o Total
- `done.md:100-111` afirma completo; `TASK-EV-18.md:14-38` critÃ©rios desmarcados; `master-plan.md:446-457` todos `[ ]`.

### H3. TASK-EV-15/16/17 â€” Status ContraditÃ³rio
- `.md` files dizem "Pendente", `current-task.md` diz "OK".

### H4. TASK-ROADMAP-01 a 04 â€” CÃ³digo existe, critÃ©rios desmarcados, backlog errado
- `check-all.js` (101 linhas), `build-context.js` (120 linhas), `run-agent.js` (179 linhas) existem.
- `backlog.md:5-6` diz "codigo nao encontrado" â€” FALSO.
- CritÃ©rios de aceite em todas as 4 tasks estÃ£o `[ ]` desmarcados.

### H5. Portability Check â€” 11 ViolaÃ§Ãµes de `rm -rf`
- `.ai/tasks/TASK-IDE-09-security-boundaries.md`
- `docs/02-arquitetura/CAMADA-DE-EXECUCAO-SEGURA.md`
- `docs/ESTUDOS/CONTRATOS-INTEGRACAO.md`
- `docs/ESTUDOS/REFERENCIA-RAPIDA.md`
- `esteira-tecnologica.md`
- `SECURITY-GOVERNANCE-ASSESSMENT.md`
- `SISTEMA-AUTONOMIA-CONFIGURAVEL.md`
- `packages/ide-integration/__tests__/ide-integration.test.ts`
- `packages/policy-engine/__tests__/policy.test.ts`
- `packages/policy-gateway/__tests__/gateway.test.ts`
- `packages/prompt-security/__tests__/prompt-security.test.ts`

### H6. 19 Pacotes sem README
`a11y-scanner`, `agent-identity`, `agent-runtime`, `audit-trail`, `contracts`, `delivery-orchestrator`, `diff-engine`, `event-bus`, `external-connectors`, `feedback-pipeline`, `ide-integration`, `memory-store`, `policy-engine`, `policy-gateway`, `prompt-security`, `requirements-engine`, `schema-registry`, `spec-generator`, `trace-registry`, `workflow-engine`

### H7. `isLLMMode()` lÃª env var em toda chamada de output â€” sem cache
- `packages/cli/src/utils/output.ts:4` â€” `process.env.AI_LLM_MODE` verificado a cada printHeader/printLine/printResult/printSummary/finish.

### H8. `path` imports inconsistentes â€” falta `node:` prefix
- `packages/cli/src/commands/backup.ts:2` â€” `import path from "path"` (sem `node:`)
- `packages/cli/src/commands/audit-ledger.ts:2` â€” idem

### H9. ADR-0002 (NestJS) â€” NÃ£o Implementado
- Projeto usa TypeScript CLI vanilla, nÃ£o NestJS.

### H10. `signer.ts` nÃ£o existe â€” TASK-F4-01 referencia arquivo ausente
- `TASK-F4-01-crypto-attestations.md:42` referencia `attestations/signer.ts` â€” sÃ³ `chain.ts` existe.

### H11. Cobertura de branches (70.96%) abaixo do threshold (76%)
- `jest.config.js:14` â€” threshold global: lines 80, branches 76. Real: branches 70.96%.

### H12. ai-handoff.md Desatualizado
- `.ai/context/ai-handoff.md:10` â€” "5 packages" â†’ hoje 38
- `.ai/context/ai-handoff.md:14` â€” "87 scripts" â†’ hoje 97
- `.ai/context/ai-handoff.md:18` â€” "TS, Python, Go" â†’ hoje 13 adapters

### H13. Root `tsconfig.json:paths` â€” CLI-specific no root
- `"@/*": ["packages/cli/src/*"]` â€” polui namespace global.

### H14. `check-all.js` usa `'node'` hardcoded
- `.ai/bin/check-all.js:29` â€” `spawnSync('node', ...)` â†’ `process.execPath`

### H15. `check-health-consistency.js` â€” Recursion guard via env var Ã© frÃ¡gil
- `.ai/bin/check-health-consistency.js:41-49`

### H16. `check-design-system.js` â€” `EXIT_CODE=N` nÃ£o padrÃ£o
- `.ai/bin/check-design-system.js:107,110`

### H17. `.ai/bin/README.md` referencia `autonomous-loop.js` que nÃ£o existe
- `.ai/bin/README.md:19` â€” o arquivo real Ã© `packages/core/bin/ai-runner.js`

### H18. Emoji inconsistente no output do CLI
- Alguns comandos usam `printLine()` com emoji, outros `console.log()` sem.

### H19. `packages/core/package.json` â€” Sem campo `"bin"` declarando CLI entry points
- `bin/cli.js` existe mas nÃ£o Ã© publicÃ¡vel como comando.

### H20. Nenhum pacote tem `dist/` â€” build nunca foi rodado
- Nenhum `packages/*/dist/index.js` existe. Todos os `"build": "tsc"` scripts nunca foram executados.

---

## ðŸŸ¡ MÃ‰DIOS (12 itens â€” problemas de governanÃ§a, estilo, boas prÃ¡ticas)

### M1. CHANGELOG.md â€” 2.301 linhas sem padrÃ£o consistente
### M2. Web-UI tsconfig com `../../node_modules/`
- `packages/web-ui/tsconfig.json:24-25` â€” caminho frÃ¡gil para monaco-editor.

### M3. Root `"type": "commonjs"` inconsistente com scripts ESM
- `package.json:3` â€” vÃ¡rios scripts usam `npx tsx` (ESM), root Ã© CommonJS.

### M4. ai-devkit-remediation-plan.md â€” Drive Letter Errada
- `E:\PROJETOS\...` â†’ `J:\PROJETOS\...` (linha 9)

### M5. coverage-90-plan.md â€” MÃ©tricas Obsoletas
- "Coverage 32.62%" â€” hoje 84%+.

### M6. 91 scripts npm sem categorizaÃ§Ã£o no package.json
### M7. `packages/core` â€” `"main": "index.js"` inconsistente com resto (que usa `"dist/index.js"`)
### M8. Nenhum comando CLI tem flag `--json` (exceto `features list`)
### M9. `utils/version.ts` â€” catch vazio engole erro de leitura do package.json
### M10. Testes do event-bus usam `require()` misturado com `import`
- `packages/event-bus/__tests__/event-bus.test.ts:101,108-109`

### M11. `packages/cli/src/runtime/preview-engine.ts` â€” TODO real em produÃ§Ã£o
- Linhas 41, 49: `// TODO: implement`

### M12. `packages/spec-generator/src/test-stub-generator.ts:86` â€” TODO real em stub
- `expect(true).toBe(true); // TODO: ${text}`

---

## ðŸŸ¢ BAIXOS (5 itens â€” cosmÃ©ticos ou sugestÃµes)

### L1. Adapter READMEs â€” tom inconsistente (portuguÃªs/inglÃªs entre adapters)
### L2. Uma-liner functions com verbose `{ return x }` em vez de concise `=> x`
### L3. `packages/cli/tsconfig.json` usa CommonJS â€” impede tree-shaking nos 127 comandos
### L4. `packages/core` nÃ£o tem diretÃ³rio `src/` â€” quebra padrÃ£o do monorepo
### L5. `packages/core/bin/*.js` tem shebang `#!/usr/bin/env node` desnecessÃ¡rio em libs (mas inofensivo)

---

## ðŸ“Š SUMÃRIO

| Severidade | Count | MudanÃ§a em relaÃ§Ã£o Ã  v1 |
|-----------|-------|------------------------|
| ðŸ”´ CRÃTICO | 31 | +23 (novos achados de cÃ³digo: process.exit, npx.cmd, deps faltando, etc.) |
| ðŸŸ  ALTO | 20 | +5 (isLLMMode sem cache, path sem node:, signer.ts, coverage threshold, dist/ nunca buildado) |
| ðŸŸ¡ MÃ‰DIO | 12 | +4 (web-ui paths, type commonjs, core main, flag --json) |
| ðŸŸ¢ BAIXO | 5 | 0 (mantido) |

**Total de problemas: 68** (submitidos para verificaÃ§Ã£o e correÃ§Ã£o pela IA corretora)

---

## ðŸ“‹ INSTRUÃ‡Ã•ES DE VERIFICAÃ‡ÃƒO PÃ“S-CORREÃ‡ÃƒO

```powershell
# 1. CompilaÃ§Ã£o
npm run build

# 2. Testes
npm test

# 3. Quality gates
npm run ai:quality:gate

# 4. Portabilidade
npm run ai:check:portability

# 5. Health check
npm run ai:check:health

# 6. Verificar se `process.exit` foi removido (deve retornar 0)
Select-String -Path "packages\cli\src\commands\*.ts" -Pattern "process\.exit\(" | Measure-Object -Line
# Deve ser 0 ou apenas no entrypoint index.ts

# 7. Verificar se `npx.cmd` foi substituÃ­do
Select-String -Path "packages\cli\src" -Pattern "npx\.cmd" | Measure-Object -Line
# Deve ser 0

# 8. Verificar se deps foram declaradas
Get-ChildItem packages/*/package.json | ForEach-Object {
    $pkg = Get-Content $_ | ConvertFrom-Json
    if (-not $pkg.dependencies) { Write-Warning "$_ sem dependencies" }
}
```
