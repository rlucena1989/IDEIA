# Gap Analysis: Produção + IDE — ai-devkit v2

> **Tipo**: `study`  
> **Status**: `study-only`  
> **Propósito**: Catalogar gaps não mencionados anteriormente, com viabilidade técnica para a IDE.  
> **Data**: 2026-07-15  
> **Base**: Varredura em 4 agentes paralelos (CI/CD, IDE, Segurança, Testes).  

---

## Sumário Executivo

27 gaps identificados, classificados por severidade e viabilidade de endereçamento na IDE.

| Severidade | Qtd | Ação recomendada |
|------------|-----|------------------|
| 🔴 Crítico | 4 | Resolver antes de qualquer distribuição pública |
| 🟠 Alto | 11 | Resolver antes de v1.0 / MVP da IDE |
| 🟡 Médio | 12 | Resolver continuamente (QI) |

**Viabilidade IDE**: 8 gaps são bloqueantes para a IDE ser usável como alternativa real a VS Code/Cursor.  
**Viabilidade distribuição**: 4 gaps bloqueiam `npm publish` e open-source.

---

## 🔴 Críticos (Pré-requisitos para existir como produto)

### G1 — Sem versão em nenhum package.json

| Campo | Valor |
|-------|-------|
| **Severidade** | 🔴 Crítico |
| **Afeta IDE?** | Sim — sem versão, sem release, sem changelog semântico |
| **Esforço** | Baixo (30 min) |
| **Dependências** | Nenhuma |
| **Solução** | `npm version 1.0.0-alpha.0` no root + cada workspace OU adotar `semantic-release` |

24 pacotes, zero versões. `npm publish --workspaces` publica `v0.0.0` ou falha.  
Nenhum `publishConfig.access: public` nos scoped `@ai-devkit/*`.

```bash
# Ação imediata
npm version 1.0.0-alpha.0 --workspaces --include-workspace-root
```

---

### G2 — Nenhum arquivo LICENSE

| Campo | Valor |
|-------|-------|
| **Severidade** | 🔴 Crítico |
| **Afeta IDE?** | Sim — sem licença, sem contribuições |
| **Esforço** | Baixo (15 min) |
| **Dependências** | Decisão do mantenedor (MIT? Apache 2.0? GPL?) |
| **Solução** | Adicionar `LICENSE` (MIT recomendado) + referenciar em todos os `package.json` |

Sem clareza legal sobre uso, modificação ou distribuição. Open-source exige licença.

---

### G3 — `.env` versionado no git

| Campo | Valor |
|-------|-------|
| **Severidade** | 🔴 Crítico |
| **Afeta IDE?** | Não diretamente, mas risco de segurança |
| **Esforço** | Baixo (10 min + rebase) |
| **Dependências** | Nenhuma |
| **Solução** | `git rm --cached .env`, adicionar ao `.gitignore`, criar `.env.example` |

Contém `JWT_SECRET` e `DATABASE_URL` com senha `postgres`. Se valores reais forem colocados, vazam permanentemente no histórico do git.

---

### G4 — Sem SECURITY.md / CODE_OF_CONDUCT.md

| Campo | Valor |
|-------|-------|
| **Severidade** | 🔴 Crítico |
| **Afeta IDE?** | Não diretamente, mas sem canal de reporte de segurança |
| **Esforço** | Baixo (30 min) |
| **Dependências** | Nenhuma |
| **Solução** | Criar `SECURITY.md` com PGP key + contato, criar `CODE_OF_CONDUCT.md` (Contributor Covenant) |

9 workflows de CI, 0 canais de reporte de vulnerabilidade.

---

## 🟠 Altos — IDE (bloqueiam a IDE ser usável)

### G5 — Zero LSP (Language Server Protocol)

| Campo | Valor |
|-------|-------|
| **Severidade** | 🟠 Alto |
| **Afeta IDE?** | **Bloqueante** — sem LSP não há navegação de código |
| **Viabilidade IDE** | Média |
| **Esforço** | 2-4 semanas |
| **Solução curta** | Integrar TypeScript LSP (`ts-lsp` ou `vscode-languageserver`) |
| **Solução longa** | Implementar LSP server customizado + Monaco LSP client |

**O que falta hoje**: `ai-devkit ide` não tem LSP. Monaco editor só tem syntax highlighting.  
**O que não funciona**: go-to-definition, find references, hover info, autocomplete de código (só comandos `ai:`), diagnostics inline (só via TSC/ESLint via API), code actions, rename symbol.  
**O que tem**: Monaco workers para TS/JSON/CSS/HTML apenas para syntax coloring.

**Viabilidade**:  
- `monaco-languageclient` + `typescript-language-server` = integração direta, ~1 semana  
- LSP customizado = mais flexível mas 3-4 semanas  
- **Recomendação**: Integrar `typescript-language-server` via `monaco-languageclient`; depois expandir para JSON/CSS/HTML

**Dependências**: `monaco-languageclient`, `typescript-language-server` (ou próprio).

---

### G6 — Terminal sem PTY (spawn apenas)

| Campo | Valor |
|-------|-------|
| **Severidade** | 🟠 Alto |
| **Afeta IDE?** | **Bloqueante** — terminal não-interativo |
| **Viabilidade IDE** | Alta |
| **Esforço** | 1-2 semanas |
| **Solução** | Substituir `spawn()` por `node-pty` + `xterm.js` no frontend |

**O que não funciona**: `vim`, `htop`, `nano`, `less`, `git log --interactive`. Qualquer comando que precise de TTY.  
**O que funciona**: Comandos simples não-interativos (`ls`, `cat`, `grep`, `node script.js`).

**Viabilidade**:  
- `node-pty` é maduro, cross-platform, 2k+ stars  
- `xterm.js` é padrão da indústria (VS Code usa)  
- Substituição localizada: `terminal-bridge.ts` + `Terminal.tsx`

---

### G7 — File watching por polling (2s)

| Campo | Valor |
|-------|-------|
| **Severidade** | 🟠 Alto |
| **Afeta IDE?** | Sim — degrada experiência em projetos grandes |
| **Viabilidade IDE** | Alta |
| **Esforço** | 3-5 dias |
| **Solução** | Substituir `setInterval(2000)` por `chokidar` (que usa `fs.watch` nativo) |

Projetos com 10k+ arquivos: polling escaneia o workspace inteiro a cada 2 segundos.  
`chokidar` usa `fs.watch`/`kqueue`/`inotify`/`ReadDirectoryChangesW` (nativo do SO).

---

### G8 — Zero DAP (Debug Adapter Protocol)

| Campo | Valor |
|-------|-------|
| **Severidade** | 🟠 Alto |
| **Afeta IDE?** | **Bloqueante** — sem debug, IDE não competitiva |
| **Viabilidade IDE** | Média-Baixa |
| **Esforço** | 4-8 semanas |
| **Solução curta** | Integrar `vscode-js-debug` (VS Code debugger) |
| **Solução longa** | Implementar DAP client + Node.js debug adapter |

Debugging é linha divisória entre "editor" e "IDE".  
Sem DAP, não há: breakpoints, step-over/into/out, watch expressions, call stack, variable inspection.

**Viabilidade**:  
- `vscode-js-debug` é o debugador do VS Code, mas é pesado e atrelado ao VS Code  
- Alternativa: `debugger` + `chrome-devtools-frontend` (mais leve, menos funcional)  
- **Recomendação**: Adiar para v2. MVP da IDE opera sem debug, mas deve ter placeholder/roadmap claro

---

### G9 — Sem Electron / empacotamento desktop

| Campo | Valor |
|-------|-------|
| **Severidade** | 🟠 Alto |
| **Afeta IDE?** | Sim — sem desktop, IDE não substitui VS Code |
| **Viabilidade IDE** | Média |
| **Esforço** | 2-4 semanas |
| **Solução curta** | Electron + React (reaproveitar web-ui existente) |
| **Solução longa** | Tauri (Rust, binário menor, mais seguro) |

Hoje: `ai-devkit ide` sobe servidor HTTP + WebSocket → browser abre.  
Para ser alternativa real: Electron ou Tauri para janela nativa, atalhos de teclado do SO, integração com sistema de arquivos, menu nativo.

**Viabilidade**:  
- O web-ui existente é React → port para Electron é quase trivial (1-2 semanas)  
- Tauri é mais moderno mas exige Rust toolchain  
- **Recomendação**: Electron para MVP desktop; Tauri para v2 (menor footprint)

---

## 🟠 Altos — Engenharia

### G10 — Cobertura real 19.72% (política manda 80%)

| Campo | Valor |
|-------|-------|
| **Severidade** | 🟠 Alto |
| **Afeta IDE?** | Sim — sem cobertura, refatoração da IDE é arriscada |
| **Esforço** | Contínuo (semanas-meses) |
| **Dependências** | Nenhuma |

`jest.config.js` threshold: 40%. AGENTS.md: 80%. Real: 19.72%.  
2 testes quebrados conhecidos. `test:e2e` quebrado (jest.e2e.config.js não existe).

---

### G11 — 13 adaptadores: zero testes

| Campo | Valor |
|-------|-------|
| **Severidade** | 🟠 Alto |
| **Afeta IDE?** | Não diretamente |
| **Esforço** | 1-2 semanas |
| **Dependências** | Nenhuma |

`adapter-fastapi`, `adapter-go`, `adapter-nestjs` etc — todos stubs de 1 arquivo sem teste.

---

### G12 — Sem semantic versioning automation

| Campo | Valor |
|-------|-------|
| **Severidade** | 🟠 Alto |
| **Afeta IDE?** | Sim — releases da IDE manuais e propensos a erro |
| **Viabilidade IDE** | Alta |
| **Esforço** | 1-2 dias |
| **Solução** | Adotar `semantic-release` ou `changesets` |

`release.yml` existe, mas versões são manuais. Sem changelog automático, sem bump semântico.

---

### G13 — Husky / pre-commit hooks: zero

| Campo | Valor |
|-------|-------|
| **Severidade** | 🟠 Alto |
| **Afeta IDE?** | Sim — qualidade não é enforceada |
| **Viabilidade IDE** | Alta |
| **Esforço** | 2-4 horas |
| **Solução** | `husky` + `lint-staged` + `commitlint` em pre-commit hook |

`npm run ai:quality:gate` existe mas é manual. Qualquer commit ignora.

---

## 🟡 Médios — Qualidade de Vida

### G14 — ESLint frouxo (`no-explicit-any: off`)
Anula parcialmente `strict: true` do TS. Sem `eslint-plugin-security`.

### G15 — Sem `.editorconfig` / Prettier
Sem padrão de formatação cross-editor. `.prettierrc` não existe.

### G16 — Sem `.nvmrc` / `.node-version` / `engines`
Nenhum pinning de Node. CI testa 18/20/22 mas local cada dev usa uma versão.

### G17 — CONTRIBUTING.md com `{{Name}}` placeholder
Template nunca preenchido. Aparência amadora.

### G18 — Sem `CODEOWNERS`
Sem auto-assignment de revisores de PR.

### G19 — Sem `FUNDING.yml`
Sem sponsorship (GitHub Sponsors, Ko-fi, Polar).

### G20 — Sem `SUPPORT.md`
Sem documentação de canais de suporte.

### G21 — Sem `.gitattributes`
Sem normalização de line-ending cross-platform. Pode corromper arquivos em contribuições Windows → Linux.

### G22 — Sem testes de performance/benchmark
Nenhum `benchmark.js`, nenhum `tinybench`. Regressões de performance passam despercebidas.

### G23 — Sem mutation testing (Stryker)
Nenhuma verificação de qualidade dos testes. Testes passam mas não necessariamente testam a lógica certa.

### G24 — Sem pre-release / canary publish
Não há como testar publicação antes de tag. `npm publish --dry-run` não usado.

### G25 — Sem npm provenance
Sem `--provenance` no npm publish. Sem assinatura criptográfica dos artefatos publicados.

### G26 — Rotas IDE planejadas vs reais: 7 arquivos em `docs/01-fundamentos/` marcados como `planned` mas existem
Os documentos `VISAO-GERAL-IDE-LOCAL.md`, `PRINCIPIOS-DO-PRODUTO.md`, `MVP-IDE-LOCAL.md` etc. descrevem planos. Precisam ser revisitados vs o que foi realmente implementado.

### G27 — VS Code extension não cobre todos os comandos do CLI
35 comandos registrados vs 129 no CLI. Gap de cobertura de 73%.

---

## Viabilidade por Rota de Implementação

### Rota 1: MVP da IDE (próximo sprint)

| # | Gap | Esforço | Impacto |
|---|-----|---------|---------|
| G1 | version nos packages | 30 min | 🔴 |
| G2 | LICENSE | 15 min | 🔴 |
| G3 | .env tracking | 10 min | 🔴 |
| G4 | SECURITY.md + CODE_OF_CONDUCT | 30 min | 🔴 |
| G13 | Husky pre-commit | 2-4 h | 🟠 |
| G7 | File watching (chokidar) | 3-5 d | 🟠 |
| G6 | PTY terminal | 1-2 sem | 🟠 |
| **Total** | | **~3-4 semanas** | |

### Rota 2: IDE usável (próximos 2-3 meses)

| # | Gap | Esforço | Impacto |
|---|-----|---------|---------|
| G5 | LSP (TypeScript) | 2-4 sem | 🟠 |
| G12 | semantic-release | 1-2 d | 🟠 |
| G9 | Electron | 2-4 sem | 🟠 |
| G10 | Cobertura 80% | contínuo | 🟠 |
| G11 | Testes adapters | 1-2 sem | 🟠 |
| G15 | EditorConfig + Prettier | 1 d | 🟡 |
| G17 | CONTRIBUTING fix | 30 min | 🟡 |
| **Total** | | **~6-12 semanas** | |

### Rota 3: IDE competitiva (v2, 6+ meses)

| # | Gap | Esforço | Impacto |
|---|-----|---------|---------|
| G8 | DAP (debug) | 4-8 sem | 🟠 |
| G22 | Performance benchmarks | 2-3 sem | 🟡 |
| G23 | Mutation testing | 1-2 sem | 🟡 |
| G24 | Canary publish | 1 sem | 🟡 |
| G25 | npm provenance | 1 d | 🟡 |
| **Total** | | **~8-14 semanas** | |

---

## Cross-reference com Tasks Existentes

| Gap | Task Relacionada | Status |
|-----|------------------|--------|
| G6 (PTY) | TASK-QUICK-05 (wizard) | 🔴 Pendente |
| G9 (Electron) | `src/commands/ide.ts` (75 linhas stub) | 🔴 Stub |
| G10 (coverage) | Várias EV tasks | ⚠️ Parcial |
| G13 (pre-commit) | TASK-QUICK-01 (pre-commit hook) | 🔴 Pendente |
| G5 (LSP) | `IDE-READINESS-ASSESSMENT.md` (G5) | 📖 Study |
| G12 (semver) | `.github/workflows/release.yml` | ⚠️ Existe mas incompleto |

---

## Anexo: Comandos de Diagnóstico Rápido

```bash
# Verificar versões nos packages
node -e "const fs=require('fs'); const pkgs=fs.readdirSync('packages').filter(d=>fs.statSync('packages/'+d).isDirectory()); pkgs.forEach(p=>{try{const j=JSON.parse(fs.readFileSync('packages/'+p+'/package.json','utf-8')); if(!j.version) console.log('SEM VERSAO: packages/'+p)}catch{}})"

# Verificar se .env está sendo trackeado
git ls-files .env

# Verificar cobertura real
npx jest --coverage --passWithNoTests 2>&1 | tail -5

# Verificar testes quebrados conhecidos
node -e "const c=require('fs').readFileSync('.ai/bin/run-tests.js','utf-8'); const m=c.match(/BROKEN_TESTS\s*=\s*\[([^\]]+)\]/); if(m) console.log('Quebrados:', m[1])"

# Listar todos os comandos CLI não cobertos pela extension
comm -23 <(ls packages/cli/src/commands/*.ts | sed 's/.*\///' | sed 's/\.ts$//' | sort) <(grep -oP "registerCommand\('ai-devkit\.\K[^']+" vscode-extension/src/commands/index.ts | sort)
```
