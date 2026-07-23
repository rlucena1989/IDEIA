# Plano de Correção e Expansão — AI-Devkit

Monorepo em `D:\PROJETOS\ai-devkit-workspace\ai-devkit` com npm workspaces (`packages/*`).

| Pacote                     | Língua                | Função                 |
| -------------------------- | --------------------- | ---------------------- |
| `packages/core`            | JavaScript (CommonJS) | 9 scripts CLI (engine) |
| `packages/cli`             | TypeScript → CommonJS | 12 comandos CLI        |
| `packages/adapter-nestjs`  | JavaScript            | Adapter NestJS         |
| `packages/adapter-go`      | JavaScript            | Adapter Go (stub)      |
| `packages/adapter-fastapi` | JavaScript            | Adapter FastAPI (stub) |

## Regras de conduta (vinculantes)

| Regra                           | Descrição                                                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Outputs literais obrigatórios   | Todo comando shell deve ter seu output colado na íntegra — sem resumos, sem "output foi mascarado porque não houve match". Incluir sempre `; echo "EXIT=$?"` ao final.                                 |
| Exit code no log de smoke test  | A última linha de execução do gerador de smoke-test-final.log ANTES de qualquer resposta no chat deve ser `echo "EXIT_CODE=$?" >> smoke-test-final.log`. Comprovar com `tail -3 smoke-test-final.log`. |
| Números de rodada frescos       | Não reciclar números de rodadas ou patches de execuções anteriores. Cada execução gera seus próprios identificadores do zero.                                                                          |
| Validação por `cat` de arquivos | Toda tarefa de criação/modificação de arquivo deve ser validada com `cat` (ou `cat -n`) do resultado final.                                                                                            |

## Decisões de design

| Decisão                                  | Escolha                                                  |
| ---------------------------------------- | -------------------------------------------------------- |
| Commander version                        | Padronizar `^10.0.0` (atualizar core)                    |
| `ai-runner.js` stub                      | Implementar POST funcional para API OpenAI-compatible    |
| `.cursorrules`                           | Adicionar ao `.gitignore`                                |
| Script Windows                           | Criar `run-full-verification.ps1`                        |
| `require()` literais                     | Mover para `import` no topo; dinâmicos mantêm inline     |
| Binário duplicado                        | Remover `"bin"` do core; CLI é entrypoint oficial        |
| CI sem `ai-devkit init`                  | Adicionar `init --yes --force` nos workflows             |
| `ts-morph` no adapter-nestjs             | Adicionar ao `package.json`                              |
| `@ai-devkit/core` como dep do CLI        | Adicionar ao `package.json` do CLI                       |
| `audit.ts:44` parênteses                 | Adicionar parênteses explícitos (readability)            |
| README placeholder                       | Corrigir título na raiz                                  |
| `context.ts` path                        | `require.resolve('@ai-devkit/core/...')` + fallback      |
| `no-console` ESLint                      | Override para `packages/cli/src/commands/**/*.ts`        |
| Root scripts                             | Usa `node packages/cli/dist/index.js` ao invés de global |
| Smoke test                               | Criar `jest.config.js` + testar version + template dir   |
| T4 vs T19 verify/prove                   | Combinar: `process.cwd()` após imports                   |
| `if (false)` mortos                      | Remover blocos (desativados intencionalmente)            |
| `00-INSTRUCOES.md` / `PATCH-MANIFEST.md` | Remover (stale/incompleto)                               |
| `copy.ts:40` `if (true)`                 | Remover (bloco sempre executa)                           |
| CRUD generator                           | Self-contained, com `--dry-run` e `--force`              |
| Component generator                      | React + Vue + Angular, templates `.hbs`                  |
| Test generator                           | Jest, análise por regex de exports                       |
| API client generator                     | fetch nativo, TypeScript, OpenAPI 3                      |
| Event generator                          | Custom EventBus com tipagem genérica                     |
| Template sync workflow                   | Criar em `.ai/`, rodar `npm run templates:sync`          |
| `audit/backup/` com `.git/` aninhado     | Adicionar ao `.gitignore`                                |

## Fluxo de trabalho da Fase 8

```
1. Criar/modificar scripts em .ai/bin/ e .ai/generators/templates/
2. Rodar `npm run templates:sync` (copia .ai/ → packages/cli/templates/.ai/)
3. Rodar `npm run build` (tsc + copy-templates.js → dist/templates/)
```

---

## Fase 1 — Limpeza e infraestrutura

### Tarefa 1 — `.gitignore` e `.aiignore`

**`.gitignore`:**

```
*.bak
.cursorrules
.ai/audit/test-runs/
.ai/audit/backup/
smoke-test-final.log
packages/core/package-lock.json
```

**`.aiignore`:**

```
audit/test-runs/
audit/backup/
```

**Validação:** `cat .gitignore; echo "---"; cat .aiignore`

---

### Tarefa 2 — Remover `.env` do versionamento

`git rm --cached .env` se rastreado. Deletar `.env`. Manter `.env.example`.

---

### Tarefa 3 — Limpar lixo

Remover `tsconfig.json.bak`, `.cursorrules`, `smoke-test-final.log`.

---

### Tarefa 4 — Remover logs do template `.ai/`

Deletar `prove-*.log` de `.ai/audit/test-runs/` e `packages/cli/templates/.ai/audit/test-runs/`. Manter `.gitkeep`.

---

### Tarefa 5 — Nome no `package.json` raiz

`package.json:2`: `"[nome-do-projeto]"` → `"@ai-devkit/monorepo"`.

**Validação:** `cat package.json | Select-String '"name"' | head -1`

---

### Tarefa 6 — README.md raiz

`README.md:1`: `# [Nome do Projeto]` → `# AI-Devkit Monorepo`.

---

## Fase 2 — Dependências

### Tarefa 7 — Commander `^10.0.0`

`packages/core/package.json:11`: `"^9.5.0"` → `"^10.0.0"`. Rodar `npm install`.

---

### Tarefa 8 — Remover bin do core

`packages/core/package.json:6-8`: Remover bloco `"bin"`.

---

### Tarefa 9 — `js-yaml` no core

`packages/core/package.json`: Adicionar `"js-yaml": "^4.1.0"`.

---

### Tarefa 10 — `ts-morph` no adapter-nestjs

`packages/adapter-nestjs/package.json`: Adicionar `"ts-morph": "^28.0.0"`.

---

### Tarefa 11 — `@ai-devkit/core` como dep do CLI

`packages/cli/package.json`: Adicionar `"@ai-devkit/core": "^1.0.0"`.

---

## Fase 3 — Documentação e lint

### Tarefa 12 — READMEs dos adapters

Expandir descrições: NestJS (módulos, DTOs, contratos), Go (experimental, detect), FastAPI (experimental, detect).

---

### Tarefa 13 — Marca de stub nos adapters

Adicionar JSDoc `ADAPTER EXPERIMENTAL — Funcionalidade limitada a detect. qualityGate() retorna false.` em Go e FastAPI.

---

### Tarefa 14 — ESLint: `no-console` override

`.eslintrc.js`:

```js
overrides: [{ files: ['packages/cli/src/commands/**/*.ts'], rules: { 'no-console': 'off' } }];
```

---

### Tarefa 15 — Root package.json path local

`package.json:76`: `"ai:quality:gate": "npm run ai:prevention && ai-devkit verify"` → `"ai:quality:gate": "npm run ai:prevention && node packages/cli/dist/index.js verify"`

---

## Fase 4 — Correções de código

### Tarefa 16 — `if (true)` morto em `copy.ts`

`packages/cli/src/utils/copy.ts:40`: remover `if (true) { }`, manter bloco interno (backup + copy). O condicional é sempre verdadeiro e não tem função.

---

### Tarefa 17 — `process.exit` em `status.ts`

`packages/cli/src/commands/status.ts:73-77`: Trocar `if + exit(1) + log` por `if-else`:

```typescript
if (finalHealth < 85) {
  console.log('⚠️ Projeto abaixo do nível recomendado de saúde.');
  process.exit(1);
} else {
  console.log('✅ Projeto em bom estado.');
}
```

---

### Tarefa 18 — Parênteses em `audit.ts:44`

Adicionar parênteses explícitos: `(stdout && stdout.includes(...)) || status` (clarity, comportamento inalterado).

---

### Tarefa 19 — Caminhos `../../../../` → `process.cwd()` (mesclada com Tarefa 20 para verify/prove)

| Arquivo             | Antes                                                        | Depois                                                                                                                |
| ------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `verify.ts:1`       | `require('../../../../.ai/bin/ledger.js')` antes dos imports | Remover L1. Adicionar após imports: `const { appendEntry } = require(path.join(process.cwd(), '.ai/bin/ledger.js'));` |
| `prove.ts:1`        | idem                                                         | idem                                                                                                                  |
| `audit-ledger.ts:8` | `path.resolve(__dirname, "../../../../")`                    | `path.join(process.cwd(), ".ai/bin/ledger.js")`                                                                       |
| `backup.ts:8,29`    | `path.resolve(__dirname, ...)`                               | `path.join(process.cwd(), ...)`                                                                                       |

**Ordem:** Tarefa 19 ANTES de Tarefa 20 (verify/probe trocam de literal para dinâmico).

---

### Tarefa 20 — `require()` / `import` misturados

| Arquivo              | Ação                                                                           |
| -------------------- | ------------------------------------------------------------------------------ |
| `audit.ts:21`        | `import { spawnSync } from "node:child_process"` no topo. Remover `require()`. |
| `audit-ledger.ts:10` | Manter inline (dinâmico).                                                      |
| `backup.ts:10,31`    | Manter inline (dinâmico).                                                      |
| `doctor.ts:15`       | `import { execSync } from "node:child_process"` no topo.                       |
| `context.ts:10`      | Manter inline (dinâmico).                                                      |
| `prove.ts:37`        | `import os from "node:os"` no topo. Remover `require("os")`.                   |

---

### Tarefa 21 — `context.ts` com fallback para `@ai-devkit/core`

1. Tentar `require.resolve('@ai-devkit/core/bin/v3-engines/ast-slicer')`
2. Fallback: `path.join(process.cwd(), 'packages/core/bin/v3-engines/ast-slicer.js')`
3. Se ambos falharem, retornar `""`

**Pré-requisito:** Tarefa 11.

---

### Tarefa 22 — TypeScript strict errors

| Arquivo                 | Erro                                             | Correção               |
| ----------------------- | ------------------------------------------------ | ---------------------- |
| `report.ts:6`           | `options`, `copyResult`, `scriptResult` sem tipo | `Record<string,any>`   |
| `package-json.ts:12,46` | `pkg` sem tipo                                   | `Record<string, any>`  |
| `init.ts:12`            | `ALLOWED_FLAVORS as any`                         | `as readonly string[]` |
| `init.ts:94`            | `catch (error)` sem tipo                         | `error: unknown`       |
| `copy.ts:62`            | `catch (err)` sem tipo                           | `err: unknown`         |

---

## Fase 5 — Testes e automação

### Tarefa 23 — Criar `jest.config.js` na raiz

Criar `jest.config.js`:

```js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/packages/*/src/**/*.test.ts'],
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
};
```

**Motivo:** Root `package.json` tem `jest@^29.7.0` e `ts-jest@^29.1.2` instalados mas não há nenhum `jest.config.js` — `npm test` falharia.

---

### Tarefa 24 — Smoke test mínimo

`packages/cli/src/__tests__/smoke.test.ts`:

```typescript
import { getCliVersion } from '../utils/version';
import fs from 'node:fs';
import path from 'node:path';

describe('AI-Devkit CLI', () => {
  it('getCliVersion deve retornar uma string', () => {
    const version = getCliVersion();
    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);
  });

  it('template directory deve existir', () => {
    const templateDir = path.resolve(__dirname, '../../templates/.ai');
    expect(fs.existsSync(templateDir)).toBe(true);
  });
});
```

**Pré-requisito:** Tarefa 23 (jest.config.js).

---

### Tarefa 25 — `ai-runner.js` funcional

`packages/core/bin/ai-runner.js`: POST para API OpenAI-compatible. `OPENAI_API_KEY` obrigatório, `OPENAI_BASE_URL` configurável. Ler `.ai/context/ai-handoff.md` + `.ai/project-manifest.yaml`.

---

## Fase 6 — CI/CD

### Tarefa 26 — GitHub Actions workflows

- `ci.yml`: Adicionar `npm run build` + `init --yes --force` antes dos gates
- `ai-quality-gate.yml`: Remover `ai:prevention` (duplicado)
- `release.yml`: Adicionar build + init antes de `ai:release`

---

### Tarefa 27 — `run-full-verification.ps1`

PowerShell script com `step()` function: build → prevention → checks → CLI commands. Log em `.ai/audit/smoke-test-final.log`.

**Exit code requirement:** A última linha de execução do script (antes de qualquer saída/resposta no chat) DEVE ser:

```powershell
echo "EXIT_CODE=$LASTEXITCODE" | Out-File -FilePath $logFile -Append
```

Comprovar rodando: `Get-Content .ai/audit/smoke-test-final.log -Tail 3` → deve mostrar literalmente `EXIT_CODE=0` ou `EXIT_CODE=1`.

---

## Fase 7 — Remediação de check scripts

### Tarefa 28 — Remover `if (false)` em `check-empty-or-decorative-files.js`

Remover bloco `if (false) { findings.push(...) }` (linhas 55-61). Manter demais verificações.

Aplicar em `.ai/bin/` e rodar `npm run templates:sync`.

---

### Tarefa 29 — Remover `if (false)` em `check-package-scripts.js`

Remover bloco `if (false) { findings.push(...) }` (linhas 32-34). Manter verificação de `|| true`.

Aplicar em `.ai/bin/` e rodar `npm run templates:sync`.

---

### Tarefa 30 — Remover artefatos stale

Remover de `.ai/` (depois rodar `templates:sync`):

- `.ai/00-INSTRUCOES.md`
- `.ai/audit/PATCH-MANIFEST.md`
- `.ai/bin/generate-patch-manifest.js`

**⚠️ Scripts dependentes que precisam de atualização:**

1. **`.ai/bin/run-prevention-suite.js:16`** — Remover a linha:

   ```js
   ".ai/bin/generate-patch-manifest.js",
   ```

   do array `checks`.

2. **`.ai/bin/check-orphan-scripts.js`** — Este script depende do `PATCH-MANIFEST.md` para validar scripts órfãos. Como o manifesto será removido, o script precisa ser simplificado para apenas listar scripts órfãos sem exigir documentação em manifesto. Alternativa: remover as linhas 32-48 (bloco do manifesto) e substituir por `process.exit(1)` com listagem simples.

**Validação:**

- `cat .ai/bin/run-prevention-suite.js | Select-String "generate-patch-manifest"` → vazio
- `cat .ai/bin/check-orphan-scripts.js` → sem referência a `PATCH-MANIFEST.md`

---

## Fase 8 — Novos geradores

**Fluxo:** Criar em `.ai/bin/` e `.ai/generators/templates/` → `npm run templates:sync` → `npm run build`.

Cada gerador segue:

- Script em `.ai/bin/` (cópia em `packages/cli/templates/.ai/bin/` via sync)
- Help via `--help` (padrão `lib/common.js`)
- Templates `.hbs` em `.ai/generators/templates/` para conteúdo grande
- Helpers: `toPascalCase`, `toCamelCase`, `toKebabCase` de `helpers/naming`
- Saída: TypeScript (`.ts`). `--out` default: `src/`
- Se arquivo já existe: pula (exceto `crud-generate.js` com `--force`)

---

### Tarefa 31 — Gerador CRUD completo

**Arquivo:** `.ai/bin/crud-generate.js` (~300-400 linhas)

**Uso:** `node .ai/bin/crud-generate.js <EntityName> [--module <name>] [--dry-run] [--force]`

**Flags:** `--dry-run` (só log), `--force` (sobrescrever). Default: skip se existir.

**Arquivos gerados (ex: `--module users --entity User`):**

```
src/modules/users/domain/entities/User.ts
src/modules/users/domain/repositories/IUserRepository.ts
src/modules/users/infrastructure/repositories/UserRepository.ts
src/modules/users/application/dtos/CreateUserInput.ts
src/modules/users/application/dtos/UpdateUserInput.ts
src/modules/users/application/dtos/UserResponse.ts
src/modules/users/application/usecases/CreateUserUseCase.ts
src/modules/users/application/usecases/GetUserUseCase.ts
src/modules/users/application/usecases/UpdateUserUseCase.ts
src/modules/users/application/usecases/DeleteUserUseCase.ts
src/modules/users/application/usecases/ListUsersUseCase.ts
src/modules/users/presentation/controllers/UserController.ts
src/modules/users/presentation/routes.ts
```

**13 arquivos.** Use cases: Create, GetById, Update, Delete, List (paginação). Input/Output tipados com AppError.

---

### Tarefa 32 — Gerador de componente frontend

**Arquivos:**

- `.ai/bin/component-generate.js` (~250 linhas)
- `.ai/generators/templates/component/react.tsx.hbs`
- `.ai/generators/templates/component/vue.vue.hbs`
- `.ai/generators/templates/component/angular-component.ts.hbs`
- `.ai/generators/templates/component/angular-module.ts.hbs`
- `.ai/generators/templates/component/style.css.hbs`

**Uso:** `node .ai/bin/component-generate.js <Name> [--framework react|vue|angular] [--out <dir>]`

**Default:** framework=react, out=src/components/

| Framework | Arquivos                                                                                |
| --------- | --------------------------------------------------------------------------------------- |
| React     | `<Name>.tsx`, `<Name>.module.css`, `<Name>.test.tsx`                                    |
| Vue       | `<Name>.vue` (SFC), `<Name>.test.ts`                                                    |
| Angular   | `<name>.component.ts`, `.html`, `.css`, `.module.ts`, `.spec.ts` (em `src/app/<name>/`) |

---

### Tarefa 33 — Gerador de testes

**Arquivo:** `.ai/bin/test-generate.js` (~200 linhas)

**Uso:** `node .ai/bin/test-generate.js <path/to/file.ts> [--type unit|integration]`

**Análise:** Regex para `export function`, `export class`, `export const`, `export default`. Ignora interfaces/types.

**Saída:** `__tests__/<filename>.test.ts` no mesmo diretório do arquivo.

---

### Tarefa 34 — Gerador de API client

**Arquivos:**

- `.ai/bin/api-client-generate.js` (~400 linhas)
- `.ai/generators/templates/api-client/client.ts.hbs`
- `.ai/generators/templates/api-client/types.ts.hbs`

**Uso:** `node .ai/bin/api-client-generate.js <spec.yaml|json> [--name <name>] [--out <dir>]`

**Comportamento:**

1. Parsear spec (js-yaml → YAML, JSON.parse → JSON). Validar OpenAPI 3.0.
2. Resolver `$ref` simples (`#/components/schemas/X`). Ignorar refs externas e circulares.
3. Gerar interfaces TypeScript para schemas.
4. Gerar funções para cada operação (`GET /users` → `getUsers(params?)`).
5. Classe `ApiClient`: `setToken()`, `setApiKey()`, `get<T>()`, `post<T>()`, etc. `ApiError` class. `fetch` nativo.

---

### Tarefa 35 — Gerador de eventos/handlers

**Arquivos:**

- `.ai/bin/event-generate.js` (~200 linhas)
- `.ai/generators/templates/event/event.ts.hbs`
- `.ai/generators/templates/event/handler.ts.hbs`

**Uso:** `node .ai/bin/event-generate.js <EventName> [--module <name>] [--handler] [--listener]`

**Gera:**

1. Classe do evento com `eventName` static + payload tipado
2. (`--handler`) Interface `IEventHandler<T>` + implementação
3. (`--listener`) Registro no EventBus
4. `EventBus.ts` (se não existir): singleton, `register()`, `emit()`

---

## Ordem de execução

```
 Fase 1 — Limpeza
  1. Tarefa  1 — .gitignore/.aiignore
  2. Tarefa  2 — .env
  3. Tarefa  3 — lixo (bak, cursorrules, log)
  4. Tarefa  4 — logs de teste no template
  5. Tarefa  5 — package.json raiz (nome)
  6. Tarefa  6 — README.md raiz

 Fase 2 — Dependências
  7. Tarefa  7 — commander versão
  8. Tarefa  8 — remover bin do core
  9. Tarefa  9 — js-yaml no core
 10. Tarefa 10 — ts-morph no adapter-nestjs
 11. Tarefa 11 — @ai-devkit/core como dep do CLI

 Fase 3 — Doc e lint
 12. Tarefa 12 — READMEs dos adapters
 13. Tarefa 13 — stub mark nos adapters
 14. Tarefa 14 — eslint no-console override
 15. Tarefa 15 — root package.json path local

 Fase 4 — Correções de código
 16. Tarefa 16 — if(true) morto em copy.ts
 17. Tarefa 17 — status.ts if-else
 18. Tarefa 18 — audit.ts parênteses
 19. Tarefa 19 — caminhos ../../../
 20. Tarefa 20 — require/import misturados
 21. Tarefa 21 — context.ts fallback
 22. Tarefa 22 — TypeScript strict errors

 Fase 5 — Testes
 23. Tarefa 23 — jest.config.js na raiz
 24. Tarefa 24 — smoke test mínimo
 25. Tarefa 25 — ai-runner.js funcional

 Fase 6 — CI/CD
 26. Tarefa 26 — CI workflows
 27. Tarefa 27 — run-full-verification.ps1

 Fase 7 — Check scripts
 28. Tarefa 28 — if(false) em check-empty-or-decorative-files.js
 29. Tarefa 29 — if(false) em check-package-scripts.js
 30. Tarefa 30 — remover INSTRUCOES.md + PATCH-MANIFEST.md + generate-patch-manifest.js

 Fase 8 — Geradores (.ai/ → templates:sync → build)
 31. Tarefa 31 — crud-generate.js
 32. Tarefa 32 — component-generate.js
 33. Tarefa 33 — test-generate.js
 34. Tarefa 34 — api-client-generate.js
 35. Tarefa 35 — event-generate.js
```

---

## Validação (23 passos)

1. `git status` — sem `*.bak`, `.env`, `.cursorrules`, `*.log`, `prove-*.log`, `00-INSTRUCOES.md`, `PATCH-MANIFEST.md`
2. `cat .gitignore; echo "---"; cat .aiignore` — Tarefa 1 completa
3. `cat package.json | Select-String '"name"'` — mostra `"@ai-devkit/monorepo"`
4. `npm install` — zero erros (commander ^10.0.0, js-yaml, ts-morph)
5. `npx tsc --noEmit --strict -p packages/cli/tsconfig.json` — zero erros
6. `cd packages/cli && npm run build` — compilação + templates OK
7. `npm run lint` — zero erros (no-console off para commands/)
8. `npm test` — smoke test passa (jest.config.js na raiz)
9. `node packages/cli/dist/index.js --help` — CLI funcional
10. `node packages/cli/dist/index.js status` — sem process.exit prematuro
11. `node packages/cli/dist/index.js init --yes --force` — `.ai/` limpo
12. `node packages/core/bin/ai-runner.js` — sem API key, erro claro
13. `packages/core/package.json` sem `"bin"`
14. `.gitignore` contém `.ai/audit/backup/`
15. `node .ai/bin/crud-generate.js User --dry-run` — log, nenhum arquivo
16. `node .ai/bin/crud-generate.js User --module users --force` — 13 arquivos
17. `node .ai/bin/component-generate.js Button --framework react` — 3 arquivos
18. `node .ai/bin/component-generate.js Header --framework vue` — 2 arquivos
19. `node .ai/bin/component-generate.js Login --framework angular` — 5 arquivos
20. `node .ai/bin/test-generate.js some/File.ts` — teste gerado
21. `node .ai/bin/api-client-generate.js spec.yaml --name MyApi` — 2 arquivos
22. `node .ai/bin/event-generate.js UserCreated --module users --handler --listener` — 3+ arquivos
23. `node .ai/bin/check-empty-or-decorative-files.js` — sem falsos positivos
24. `node .ai/bin/check-package-scripts.js` — sem falsos positivos
25. `jest.config.js` existe na raiz com `testMatch` apontando para `packages/*/src/**/*.test.ts`
26. `Get-Content .ai/audit/smoke-test-final.log -Tail 3` — mostra `EXIT_CODE=0` ou `EXIT_CODE=1` como última linha (Correção #1)
27. `Select-String -Path .ai/bin/run-prevention-suite.js -Pattern "generate-patch-manifest"` — vazio; `Select-String -Path .ai/bin/check-orphan-scripts.js -Pattern "PATCH-MANIFEST"` — vazio (Correção #2)

---

## Riscos e mitigações

| Risco                                                  | Impacto | Mitigação                              |
| ------------------------------------------------------ | ------- | -------------------------------------- |
| `process.cwd()` falha em subdiretório                  | Alto    | Documentar execução da raiz            |
| `templates:sync` sobrescreve template sem warning      | Médio   | Sempre rodar sync após mexer em `.ai/` |
| CRUD `--force` remove alterações manuais               | Médio   | `--dry-run` primeiro                   |
| `api-client-generate.js` `$ref` circular               | Médio   | Ignorar refs externas                  |
| Test generator regex perde exports complexos           | Baixo   | Documentar limitação                   |
| Jest sem config prévia — `npm test` falha antes da T23 | Baixo   | Ordem explícita T23 → T24              |
| `audit/backup/` `.git/` aninhado                       | Baixo   | `.gitignore` previne tracking          |
