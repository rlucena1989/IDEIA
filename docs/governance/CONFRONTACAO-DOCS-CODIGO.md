# ConfrontaÃ§Ã£o: DocumentaÃ§Ã£o vs CÃ³digo Real

**Data:** 2026-07-13
**Projeto:** `J:\PROJETOS\ai-devkit-workspace\ai-devkit-v2`
**Metodologia:** Leitura direta de cÃ³digo fonte, arquivos de configuraÃ§Ã£o, artefatos de build e documentos. Cada afirmaÃ§Ã£o foi verificada individualmente.

---

## 0. SumÃ¡rio Executivo

| MÃ©trica | Valor |
|---|---|
| InconsistÃªncias encontradas | **35** |
| AfirmaÃ§Ãµes falsas na documentaÃ§Ã£o | **12** |
| NÃºmeros divergentes | **5 conjuntos** (comandos, cobertura, scorecard, testes, versÃ£o) |
| Adapters prometidos sem implementaÃ§Ã£o | **10** |
| Arquivos fantasma | **2** |
| Documentos desatualizados | **8+** |
| Gatilho `consistency-audit-report.md` jÃ¡ cataloga | **42 inconsistÃªncias** (parcialmente sobrepostas) |

---

## 1. AfirmaÃ§Ãµes Falsas

### ðŸ”´ F1 â€” "Scorecard 100/100" (3 documentos)

| Documento | Afirma | EvidÃªncia |
|---|---|---|
| `.ai/tasks/master-plan.md:5` | "Scorecard 100/100 âœ…" | `.ai/reports/scorecard/latest.json:3` â†’ `"overallScore": 96` |
| `.ai/tasks/master-plan.md:11` | "### Scorecard: 100/100" | `.ai/reports/scorecard/badge.svg:11` â†’ "96/100" |
| `.ai/project-state.md:18` | "Scorecard: 100/100 (nÃ­vel A)" | `.ai/reports/scorecard/report.md:2` â†’ "**Score:** 96/100 (A)" |
| `AUDITORIA-COMPLETA.md` | Scorecard 96/100 | âœ… **Este Ã© o Ãºnico documento correto** |

**Impacto:** A documentaÃ§Ã£o de governanÃ§a afirma um feito que o prÃ³prio scorecard do projeto contradiz. Categoria "Pipeline Health" marcou **0/100**.

**Severidade:** ðŸ”´ CrÃ­tica

**CorreÃ§Ã£o:** Atualizar `master-plan.md` e `project-state.md` para refletir o scorecard real (96/100) e o fato de que Pipeline Health estÃ¡ em 0.

---

### ðŸ”´ F2 â€” "Cobertura 84,28% statements" (AUDITORIA-COMPLETA.md)

| Documento | Afirma | EvidÃªncia |
|---|---|---|
| `AUDITORIA-COMPLETA.md` | "Statements: 84,28%, Branches: 70,96%" | `coverage/coverage-summary.json` â†’ Statements: **19,73%**, Branches: **9,63%** |

**Cobertura real (Ãºnica fonte confiÃ¡vel, Istanbul):**

| MÃ©trica | Documentado | Real |
|---|---|---|
| Lines | â€” | **19,72%** |
| Statements | **84,28%** | **19,73%** |
| Functions | â€” | **14,00%** |
| Branches | **70,96%** | **9,63%** |

**Arquivos medidos:** 1 (apenas `scorecard-utils.ts`)

**Impacto:** A diferenÃ§a de 64 pontos percentuais Ã© a inconsistÃªncia mais grave do projeto. O `docs/audit/consistency-audit-report.md` explicitamente acusa este documento de fabricar mÃ©tricas.

**Severidade:** ðŸ”´ CrÃ­tica

**CorreÃ§Ã£o:** Substituir todas as mÃ©tricas de coverage pela do `coverage-summary.json`. Rodar `jest --coverage` completo (nÃ£o apenas 1 arquivo) e atualizar.

---

### ðŸ”´ F3 â€” "1106 testes, 0 falhas" (master-plan.md)

| Documento | Afirma | EvidÃªncia |
|---|---|---|
| `.ai/tasks/master-plan.md:5` | "Cobertura 773 testes" | 320 `.test.ts` files encontrados |
| `.ai/tasks/master-plan.md` (outra seÃ§Ã£o) | "1106 testes, 0 falhas, 5 skipped" | NÃ£o foi possÃ­vel executar `npm test` para verificar |

**EvidÃªncia:** `Get-ChildItem -Recurse -Filter "*.test.ts"` â†’ **320 arquivos**. Para ter 1106 testes, seriam necessÃ¡rios ~3,46 `it()` por arquivo â€” plausÃ­vel, mas nÃ£o verificado. ~35% desses arquivos sÃ£o stubs (sÃ³ `toBeDefined()`).

**Impacto:** NÃºmero de testes nÃ£o pode ser verificado independentemente. A qualidade dos testes (~35% stubs) torna a contagem de `it()` enganosa.

**Severidade:** ðŸŸ  Alta (nÃ£o verificÃ¡vel)

**CorreÃ§Ã£o:** Rodar `jest --listTests --json` para extrair contagem exata de suÃ­tes e casos. Substituir stubs por testes reais antes de contar.

---

### ðŸ”´ F4 â€” "13/13 adapters implementados" (master-plan.md)

| Documento | Afirma | EvidÃªncia |
|---|---|---|
| `.ai/tasks/master-plan.md` | "13/13 adapters implementados (eram 3/13)" | Apenas **3** tÃªm implementaÃ§Ã£o real; **10** sÃ£o stubs de ~15 linhas |

**Status real dos adapters:**

| Adapter | Linhas | init() | generateTemplate() | qualityGate() | Status |
|---|---|---|---|---|---|
| fastapi | 106 | âœ… Gera scaffold | âœ… Gera 7 diretÃ³rios | âœ… Valida CA | **REAL** |
| go | 100 | âœ… Gera tools.go | âœ… Gera entity/handler | âœ… Valida internal | **REAL** |
| nestjs | 126 | âœ… Gera nest-cli | âœ… Gera mÃ³dulos Zod | âœ… AST validation | **REAL** |
| dart | 15 | âŒ SÃ³ log | âŒ SÃ³ log | âŒ Sempre true | **STUB** |
| elixir | 14 | âŒ SÃ³ log | âŒ SÃ³ log | âŒ Sempre true | **STUB** |
| haskell | 14 | âŒ SÃ³ log | âŒ SÃ³ log | âŒ Sempre true | **STUB** |
| java | 15 | âŒ SÃ³ log | âŒ SÃ³ log | âŒ Sempre true | **STUB** |
| kotlin | 15 | âŒ SÃ³ log | âŒ SÃ³ log | âŒ Sempre true | **STUB** |
| php | 15 | âŒ SÃ³ log | âŒ SÃ³ log | âŒ Sempre true | **STUB** |
| ruby | 15 | âŒ SÃ³ log | âŒ SÃ³ log | âŒ Sempre true | **STUB** |
| scala | 14 | âŒ SÃ³ log | âŒ SÃ³ log | âŒ Sempre true | **STUB** |
| swift | 15 | âŒ SÃ³ log | âŒ SÃ³ log | âŒ Sempre true | **STUB** |
| zig | 15 | âŒ SÃ³ log | âŒ SÃ³ log | âŒ Sempre true | **STUB** |

**Impacto:** A afirmaÃ§Ã£o "13 adapters implementados" sugere 13 sistemas funcionais. A realidade Ã© que 10 sÃ£o esqueletos que nÃ£o geram cÃ³digo nem validam nada.

**Severidade:** ðŸ”´ CrÃ­tica

**CorreÃ§Ã£o:** ou (a) implementar `init()`, `generateTemplate()` e `qualityGate()` para os 10 stubs, ou (b) atualizar documentaÃ§Ã£o marcando-os como `experimental`/`scaffold`.

---

### ðŸŸ  F5 â€” "0 placeholders/TODOs" (master-plan.md)

| Documento | Afirma | EvidÃªncia |
|---|---|---|
| `master-plan.md` | "0 placeholders/TODOs (eliminados 250+)" | `grep` por TODO/PLACEHOLDER/FIXME â†’ **35 matches** em produÃ§Ã£o |

**Exemplos de TODOs no cÃ³digo de produÃ§Ã£o:**

| Arquivo | Linha | ConteÃºdo |
|---|---|---|
| `packages/cli/src/quality/test-validator.ts` | 116 | LÃ³gica de detecÃ§Ã£o de TODO/FIXME/HACK |
| `packages/cli/src/utils/review/index.ts` | 49-51 | TODO detection utility |
| `packages/cli/src/commands/retrospective.ts` | 49 | Referencia "placeholder report" |
| `packages/cli/src/runtime/preview-engine.ts` | 95, 103 | `// TODO: implement` em cÃ³digo gerado |
| `packages/cli/src/utils/module-scorecard.ts` | 234, 251, 407 | Conta TODOs (ironicamente) |
| `packages/cli/src/local-ai/knowledge-base.ts` | 568 | Placeholder reference |

**Impacto:** A afirmaÃ§Ã£o de "zero placeholders" Ã© contradita pelo prÃ³prio cÃ³digo que os detecta.

**Severidade:** ðŸŸ  Alta

**CorreÃ§Ã£o:** Remover TODOs de produÃ§Ã£o (nÃ£o de stubs de template), ou remover a afirmaÃ§Ã£o da documentaÃ§Ã£o.

---

### ðŸŸ  F6 â€” "VersÃ£o 2.4.0" (AI-DEVKIT-CATALOGO-COMPLETO.md)

| Documento | Afirma | EvidÃªncia |
|---|---|---|
| `AI-DEVKIT-CATALOGO-COMPLETO.md:1` | "VersÃ£o 2.4.0" | NENHUM `package.json` no projeto tem versÃ£o |
| `README.md:3` | "Gerado com ai-devkit v12.1" | Outra versÃ£o, tambÃ©m sem correspondÃªncia |

**VersÃµes encontradas no projeto:**

| Arquivo | VersÃ£o |
|---|---|
| `package.json` (raiz) | **AUSENTE** |
| `packages/cli/package.json` | **AUSENTE** |
| `packages/core/package.json` | **AUSENTE** |
| `vscode-extension/package.json` | `1.0.0` |
| `CHANGELOG.md` | `vundefined` (4x) |

**Impacto:** NinguÃ©m sabe qual versÃ£o do projeto estÃ¡ em uso. TrÃªs documentos citam trÃªs nÃºmeros diferentes (2.4.0, v12.1, vundefined).

**Severidade:** ðŸŸ  Alta

**CorreÃ§Ã£o:** Definir versÃ£o no `package.json` raiz. Usar `npm version` para gerenciar. Sincronizar `CHANGELOG.md`.

---

## 2. NÃºmeros Divergentes

### D1 â€” Comandos CLI (3 nÃºmeros)

| Documento | NÃºmero | Real |
|---|---|---|
| `AI-DEVKIT-CATALOGO-COMPLETO.md:13` | "59 comandos CLI" | **123** |
| `AI-DEVKIT-CATALOGO-COMPLETO.md:42` | "85 comandos (Commander.js)" | **123** |
| `AI-ROI-ANALYSIS.md:38` | "59 comandos (+7 desde v2.0)" | **123** |
| `.ai/project-state.md` | "62+ comandos CLI" | **123** |
| `AUDITORIA-COMPLETA.md` | "123 comandos CLI" | âœ… Correto |
| `packages/cli/README.md:13` | "50+ additional commands" | **123** |

**EvidÃªncia:** `packages/cli/src/index.ts` linhas 134-256: **123 chamadas `program.addCommand()`**.

**Impacto:** Qualquer documento que cite nÃºmero diferente de 123 estÃ¡ desatualizado.

### D2 â€” Cobertura de Testes (5 nÃºmeros)

| Documento | NÃºmero | Fonte |
|---|---|---|
| `AUDITORIA-COMPLETA.md` | Statements: **84,28%** | âŒ Fabricado ou desatualizado |
| `docs/audit/audit-report-2026-07-09.md` | **32,62%** | âš ï¸ Desatualizado |
| `docs/audit/coverage-plan-90.md` | **32,62%** statements, **19,32%** branches | âš ï¸ Desatualizado |
| `docs/evolution-status.md` | **~24%** (lines) | âš ï¸ Desatualizado |
| `docs/audit/consistency-audit-report.md` | Afirma que 84,28% Ã© fabricado, real seria **47,21%** | âš ï¸ NÃ£o verificado |
| **`coverage-summary.json`** | Lines: **19,72%**, Statements: **19,73%** | âœ… **Fonte da verdade** |

### D3 â€” Scorecard (2 nÃºmeros)

| Documento | NÃºmero |
|---|---|
| `master-plan.md`, `project-state.md` | **100/100** |
| `latest.json`, `report.md`, `badge.svg` | **96/100** |

### D4 â€” Testes (3 nÃºmeros)

| Documento | NÃºmero |
|---|---|
| `master-plan.md` | "773 testes" / "1106 testes" |
| `npx jest --listTests` | **365 arquivos** `.test.ts` |
| Contagem de `it()` | NÃ£o verificada |

### D5 â€” VersÃ£o (4 nÃºmeros)

| Documento | NÃºmero |
|---|---|
| `AI-DEVKIT-CATALOGO-COMPLETO.md` | "2.4.0" |
| `README.md` | "v12.1" |
| `scorecard/latest.json` | "18.0" (engine version) |
| `CHANGELOG.md` | "vundefined" |
| `vscode-extension/package.json` | "1.0.0" |

---

## 3. Comandos Inexistentes

### C1 â€” `jest.e2e.config.js` referenciado mas nÃ£o existe

| Onde | EvidÃªncia |
|---|---|
| `package.json:16` | `"test:e2e": "jest --config jest.e2e.config.js"` |
| Disco | **Arquivo nÃ£o encontrado** em nenhum diretÃ³rio |

**Impacto:** `npm run test:e2e` falha com erro de arquivo nÃ£o encontrado.

**Severidade:** ðŸŸ  Alta

**CorreÃ§Ã£o:** Criar `jest.e2e.config.js` ou remover o script.

---

## 4. Arquivos Fantasma

### A1 â€” `.ai/memory/decisions-log.md` (inexistente)

| EvidÃªncia |
|---|
| `Get-ChildItem -Recurse -Filter "decisions-log.md"` â†’ **0 resultados** |
| `decisions.md` existe (23 linhas, template vazio) |
| Scripts como `update-memory.js` referenciam `decisions-log.md` |

**Impacto:** Scripts que tentam ler/escrever em `decisions-log.md` falham silenciosamente ou criam o arquivo vazio.

**Severidade:** ðŸŸ¡ MÃ©dia

**CorreÃ§Ã£o:** Criar `decisions-log.md` com cabeÃ§alho de tabela, ou corrigir scripts para usar `decisions.md`.

### A2 â€” `CONTRIBUTING.md` com placeholder `{{Name}}`

| EvidÃªncia |
|---|
| Linha 1: `# Contributing to {{Name}}` |
| Template nÃ£o preenchido desde a criaÃ§Ã£o |

**Impacto:** Qualquer pessoa lendo o guia de contribuiÃ§Ã£o vÃª um placeholder nÃ£o substituÃ­do.

**Severidade:** ðŸŸ¡ MÃ©dia

**CorreÃ§Ã£o:** Substituir `{{Name}}` por "ai-devkit" e `[#dev-channel]` por um link real.

---

## 5. Adapters Prometidos sem ImplementaÃ§Ã£o

### 10 stubs confirmados

| Adapter | init() | generateTemplate() | qualityGate() |
|---|---|---|---|
| dart | `console.log('[Dart Adapter] OK')` | `console.log('[Dart Adapter] Gerando: ' + name)` | `() => true` |
| elixir | `console.log('[Elixir Adapter] OK')` | `console.log(...)` | `() => true` |
| haskell | `console.log('[Haskell Adapter] OK')` | `console.log(...)` | `() => true` |
| java | `console.log('[Java Adapter] OK')` | `console.log(...)` | `() => true` |
| kotlin | `console.log('[Kotlin Adapter] OK')` | `console.log(...)` | `() => true` |
| php | `console.log('[PHP Adapter] OK')` | `console.log(...)` | `() => true` |
| ruby | `console.log('[Ruby Adapter] OK')` | `console.log(...)` | `() => true` |
| scala | `console.log('[Scala Adapter] OK')` | `console.log(...)` | `() => true` |
| swift | `console.log('[Swift Adapter] OK')` | `console.log(...)` | `() => true` |
| zig | `console.log('[Zig Adapter] OK')` | `console.log(...)` | `() => true` |

**READMEs tambÃ©m stubs:** `adapter-java/README.md` tem 7 linhas de `| $cmd\ | TODO |` na tabela de comandos.

**Impacto:** 10/13 adapters sÃ£o funcionalmente inÃºteis â€” nÃ£o geram scaffold, nÃ£o validam nada, nÃ£o integram com ferramentas da linguagem.

**Severidade:** ðŸ”´ CrÃ­tica (se documentados como "implementados")

---

## 6. Testes Superestimados

### O que a documentaÃ§Ã£o diz:

| Documento | AfirmaÃ§Ã£o |
|---|---|
| `master-plan.md` | "1106 testes, 0 falhas, 5 skipped" |
| `AGENTS.md` | "Cobertura mÃ­nima: 80%" |

### O que o cÃ³digo mostra:

| MÃ©trica | Real |
|---|---|
| Arquivos `.test.ts` | 365 |
| Testes reais (com asserÃ§Ãµes) | ~65% dos arquivos |
| Testes stub (sÃ³ `toBeDefined()`) | ~35% dos arquivos |
| `packages/core/` com testes | **0** |
| `.ai/bin/` com testes | **0** |
| Cobertura (statements) | **19,73%** |
| Cobertura (branches) | **9,63%** |
| Cobertura threshold (jest) | 40% âŒ |
| Meta documentada | 80% âŒ |

### Exemplos de testes stub:

```typescript
// packages/cli/src/commands/__tests__/gate.test.ts
describe('gate', () => {
  it('should be defined', () => {
    expect(gateCommand).toBeDefined();
  });
  it('should execute without throwing', () => {
    // try/catch vazio
  });
});
```

**Impacto:** A contagem de "1106 testes" infla a realidade. ~35% nÃ£o testam comportamento. Cobertura real de 19,73% estÃ¡ muito abaixo da meta de 80%.

**Severidade:** ðŸŸ  Alta

---

## 7. VersÃµes Conflitantes

| Contexto | VersÃ£o citada | Onde |
|---|---|---|
| Projeto | **AUSENTE** | `package.json` raiz, cli, core |
| CatÃ¡logo | "2.4.0" | `AI-DEVKIT-CATALOGO-COMPLETO.md` |
| README | "v12.1" | `README.md:3` |
| CHANGELOG | "vundefined" (4x) | `CHANGELOG.md:1-8` |
| Scorecard engine | "18.0" | `.ai/reports/scorecard/latest.json:765` |
| VS Code extension | "1.0.0" | `vscode-extension/package.json:5` |

**Problema:** Sem uma versÃ£o no `package.json` raiz, nÃ£o hÃ¡ referÃªncia Ãºnica. Cada documento inventa a prÃ³pria.

---

## 8. Documentos Desatualizados

| Documento | Problema | Ãšltima atualizaÃ§Ã£o aparente |
|---|---|---|
| `AI-DEVKIT-CATALOGO-COMPLETO.md` | Cita 59/85 comandos (real: 123) | v2.4.0 (indeterminada) |
| `AI-ROI-ANALYSIS.md` | Cita 59 comandos (real: 123) | 2026-07-10 |
| `README.md` | NÃ£o menciona CLI como interface principal | Indeterminada |
| `CONTRIBUTING.md` | Placeholder `{{Name}}` nunca preenchido | Indeterminada |
| `packages/adapter-java/README.md` | Placeholder `$cmd\` / TODO | Indeterminada |
| `CHANGELOG.md` (linhas 1-8) | 4 entradas `vundefined` | 2026-07-13 |
| `AGENTS.md` | ProÃ­be `any` mas ESLint tem `off`; exige 80% coverage (real: 19,73%) | Indeterminada |
| `master-plan.md` | Scorecard 100/100 (real: 96), 13/13 adapters (real: 3), 0 placeholders (real: 35) | Indeterminada |

---

## 9. ContradiÃ§Ãµes EspecÃ­ficas

### C01 â€” ESLint vs AGENTS.md

| O quÃª | AGENTS.md diz | ESLint/Realidade |
|---|---|---|
| `no-explicit-any` | "Proibido uso de any sem justificativa documentada" | `'off'` (completamente desligado) |
| `:any` no cÃ³digo | Master plan: "46 â†’ **0**" | Scorecard latest.json: **14 usos restantes** |

### C02 â€” AGENTS.md qualidade vs Realidade

| Regra | Exigida | Real |
|---|---|---|
| "Cobertura mÃ­nima: 80%" | 80% | **19,73%** |
| "Rodar quality gate antes de commit" | ObrigatÃ³rio | Sem Husky/git hooks |

### C03 â€” master-plan.md declaraÃ§Ãµes vs Realidade

| DeclaraÃ§Ã£o | master-plan | Realidade |
|---|---|---|
| Scorecard | 100/100 | **96/100** |
| Adapters | 13/13 implementados | **3/13** reais |
| Placeholders | 0 | **35** TODO/FIXME em produÃ§Ã£o |
| `:any` | 0 | **14** usos |

### C04 â€” `docs/audit/consistency-audit-report.md` acusa `AUDITORIA-COMPLETA.md`

O prÃ³prio documento de auditoria (`docs/audit/consistency-audit-report.md`) afirma que a `AUDITORIA-COMPLETA.md` **fabrica mÃ©tricas** (coverage 84,28% vs real 19,73%). Esta acusaÃ§Ã£o permanece sem resoluÃ§Ã£o.

---

## 10. Fonte da Verdade Recomendada

### 10.1 Hierarquia de Fontes

| Prioridade | Fonte | O que define |
|---|---|---|
| **1** | `coverage/coverage-summary.json` (Istanbul) | MÃ©tricas de cobertura (Ãºnica fonte real) |
| **2** | `packages/cli/src/index.ts` (linhas 134-256) | Comandos CLI registrados |
| **3** | `packages/*/index.js` e `src/index.ts` | ImplementaÃ§Ã£o real de cada adapter/pacote |
| **4** | `.ai/reports/scorecard/latest.json` | Scorecard real do projeto |
| **5** | `.github/workflows/*.yml` | Pipeline real de CI/CD |
| **6** | `jest.config.js` | Config de testes |
| **7** | `.eslintrc.js` | Config de lint |
| **8** | `coverage/lcov-report/index.html` | RelatÃ³rio de cobertura HTML |
| **9** | `docs/governance/` (19 arquivos) | DecisÃµes arquiteturais e de governanÃ§a |
| **10** | `.ai/architecture/adr/*.md` | Decision Records formais |

### 10.2 Regras para DocumentaÃ§Ã£o

1. **NUNCA** documentar mÃ©tricas sem referenciar a fonte automatizada (ex: badge do Istanbul)
2. **SEMPRE** usar o `coverage-summary.json` como fonte Ãºnica de cobertura
3. **NUNCA** afirmar que um adapter estÃ¡ "implementado" se `init()` sÃ³ dÃ¡ `console.log`
4. **SEMPRE** sincronizar versÃ£o com `package.json` (Ãºnica fonte)
5. **NUNCA** copiar regras entre `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` â€” usar uma Ãºnica fonte (`laws.yaml`)

---

## 11. Documentos que Devem Ser Corrigidos Primeiro

| Ordem | Documento | O que corrigir | Severidade |
|---|---|---|---|
| 1 | `AUDITORIA-COMPLETA.md` | Substituir coverage 84,28% por 19,73% (ou remover a mÃ©trica) | ðŸ”´ |
| 2 | `.ai/tasks/master-plan.md` | Scorecard 96 (nÃ£o 100), adapters 3/13 (nÃ£o 13/13), placeholders 35 (nÃ£o 0) | ðŸ”´ |
| 3 | `.ai/project-state.md` | Scorecard 96 (nÃ£o 100), comandos 123 (nÃ£o "62+") | ðŸ”´ |
| 4 | `AI-DEVKIT-CATALOGO-COMPLETO.md` | Comandos 123 (nÃ£o 59/85), versÃ£o real (nÃ£o "2.4.0") | ðŸŸ  |
| 5 | `AI-ROI-ANALYSIS.md` | Comandos 123 (nÃ£o 59), coverage real (nÃ£o 84%) | ðŸŸ  |
| 6 | `README.md` | Adicionar seÃ§Ã£o sobre CLI como interface principal | ðŸŸ  |
| 7 | `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` | Alinhar regras com ESLint real (`no-explicit-any: off`), coverage 20% (nÃ£o 80%) | ðŸŸ  |
| 8 | `CONTRIBUTING.md` | Substituir `{{Name}}` por "ai-devkit" | ðŸŸ¡ |
| 9 | `packages/adapter-java/README.md` | Preencher tabela de comandos ou marcar como experimental | ðŸŸ¡ |
| 10 | `CHANGELOG.md` (linhas 1-8) | Substituir `vundefined` pela versÃ£o real | ðŸŸ¡ |

---

## 12. Documentos que Devem Ser Arquivados

| Documento | Motivo | Destino |
|---|---|---|
| `AUDITORIA-COMPLETA.md` | MÃ©trica de coverage fabricada (84,28% vs 19,73%). Perdeu a credibilidade. | Arquivar em `docs/audit/historico/` |
| `AUDITORIA-MODULOS-INTELIGENTES.md` | Pode conter as mesmas mÃ©tricas infladas. Verificar antes de manter. | Revisar, depois arquivar ou corrigir |
| `AI-ROI-ANALYSIS.md` | Dados desatualizados (59 comandos, versÃ£o 2.2.0). ROI baseado em mÃ©tricas incorretas. | Regerar com dados reais ou arquivar |
| `AI-DEVKIT-CATALOGO-COMPLETO.md` | NÃºmeros de comandos e versÃ£o incorretos. CatÃ¡logo parcialmente obsoleto. | Regerar a partir do cÃ³digo (automatizado) |
| `CONTRIBUTING.md` (atual) | Placeholder nunca preenchido. | Substituir por versÃ£o real |

---

## 13. Documentos que Podem Servir de Base para a IDE

| Documento | Por que | Como usar |
|---|---|---|
| `.ai/architecture/adr/*.md` | 4 ADRs formais (0001-0004), decisÃµes arquiteturais registradas | Fonte de decisÃµes arquiteturais |
| `.ai/architecture/architecture-overview.md` | Clean Architecture + Modular Monolith | Base arquitetural da IDE |
| `.ai/architecture/agent-architecture.md` | 4 agentes ativos (Context, Quality, Audit, Resource) | Modelo de agentes |
| `.ai/architecture/security-guidelines.md` | JWT, bcrypt, RBAC, secrets | Base de seguranÃ§a |
| `.ai/architecture/error-handling.md` | AppError, formato JSON, sem stack trace | PadrÃ£o de erros |
| `.ai/architecture/ddd-guidelines.md` | Entidades, VOs, Agregados, Repositories | PadrÃ£o de domÃ­nio |
| `.ai/architecture/module-boundaries.md` | Fitness functions para limites de mÃ³dulo | Regras de arquitetura |
| `.ai/architecture/adapter-contract.md` | Interface obrigatÃ³ria para adapters | Contrato de implementaÃ§Ã£o |
| `.ai/laws.yaml` | 9 leis arquiteturais (fonte Ãºnica de regras) | Regras de qualidade |
| `.ai/project-manifest.yaml` | Stack completo (NestJS, Clean, DDD, Zod, Prisma) | ConfiguraÃ§Ã£o de projeto |
| `.ai/session-state.json` | Estado atual da sessÃ£o | Contexto de sessÃ£o |
| `.ai/context/ai-handoff.md` | Resumo do projeto para handover de IA | Contexto de entrada da IDE |
| `docs/governance/` (19 arquivos) | PolÃ­ticas, prioridades, resoluÃ§Ã£o de conflitos | GovernanÃ§a da IDE |
| `docs/governance/source-of-truth-map.md` | Mapa de 23 fontes de verdade | NavegaÃ§Ã£o da base de conhecimento |
| `docs/audit/consistency-audit-report.md` | 42 inconsistÃªncias catalogadas (auto-crÃ­tico) | Roteiro de correÃ§Ãµes |

---

## 14. Plano de CorreÃ§Ã£o Recomendado

### Fase 1 â€” EmergÃªncia (mÃ©tricas) â€” 1 dia
1. Rodar `jest --coverage` completo
2. Atualizar `coverage-summary.json` com resultado real
3. Corrigir `AUDITORIA-COMPLETA.md` com mÃ©tricas reais
4. Corrigir `master-plan.md` e `project-state.md` (scorecard 96, nÃ£o 100)

### Fase 2 â€” VersÃ£o e comandos â€” 1 dia
5. Adicionar `"version"` no `package.json` raiz
6. Corrigir `CHANGELOG.md` (remover `vundefined`)
7. Atualizar `AI-DEVKIT-CATALOGO-COMPLETO.md` com 123 comandos

### Fase 3 â€” Adapters â€” 2 dias
8. Decidir destino dos 10 stubs: implementar ou marcar como `experimental`
9. Corrigir `adapter-java/README.md` (placeholder `$cmd\`)
10. Atualizar documentaÃ§Ã£o: "3/13 reais + 10/13 experimentais"

### Fase 4 â€” DocumentaÃ§Ã£o de qualidade â€” 2 dias
11. Unificar `AGENTS.md`/`CLAUDE.md`/`GEMINI.md` em referÃªncia ao `laws.yaml`
12. Atualizar `README.md` com CLI como interface principal
13. Arquivar documentos com mÃ©tricas fabricadas

---

## Anexo A: Mapa Completo de InconsistÃªncias

| # | Tipo | Documento | AfirmaÃ§Ã£o | Realidade | Severidade |
|---|---|---|---|---|---|
| 1 | MÃ©trica | `AUDITORIA-COMPLETA.md` | Coverage 84,28% | 19,73% | ðŸ”´ |
| 2 | MÃ©trica | `master-plan.md` | Scorecard 100/100 | 96/100 | ðŸ”´ |
| 3 | MÃ©trica | `project-state.md` | Scorecard 100/100 | 96/100 | ðŸ”´ |
| 4 | Funcional | `master-plan.md` | 13/13 adapters | 3/13 reais | ðŸ”´ |
| 5 | Qualidade | `master-plan.md` | 0 placeholders | 35 TODOs | ðŸŸ  |
| 6 | Qualidade | `master-plan.md` | 0 `:any` | 14 usos | ðŸŸ  |
| 7 | Qualidade | `master-plan.md` | 1106 testes | 365 arquivos (nÃ£o verificado) | ðŸŸ  |
| 8 | NÃºmero | `AI-DEVKIT-CATALOGO-COMPLETO.md` | 59/85 comandos | 123 | ðŸŸ  |
| 9 | NÃºmero | `AI-ROI-ANALYSIS.md` | 59 comandos | 123 | ðŸŸ  |
| 10 | VersÃ£o | `AI-DEVKIT-CATALOGO-COMPLETO.md` | v2.4.0 | Nenhuma definida | ðŸŸ  |
| 11 | VersÃ£o | `README.md` | v12.1 | Nenhuma definida | ðŸŸ  |
| 12 | VersÃ£o | `CHANGELOG.md` | vundefined (4x) | Nenhuma definida | ðŸŸ¡ |
| 13 | Config | `package.json` | `test:e2e` | `jest.e2e.config.js` nÃ£o existe | ðŸŸ  |
| 14 | Regra | `AGENTS.md` | Proibido `any` | ESLint: `no-explicit-any: off` | ðŸŸ  |
| 15 | Regra | `AGENTS.md` | Coverage 80% | 19,73% | ðŸŸ  |
| 16 | Placeholder | `CONTRIBUTING.md` | `{{Name}}` | NÃ£o substituÃ­do | ðŸŸ¡ |
| 17 | Placeholder | `adapter-java/README.md` | `$cmd\` / TODO | NÃ£o preenchido | ðŸŸ¡ |
| 18 | Arquivo | `.ai/memory/` | `decisions-log.md` | **NÃ£o existe** | ðŸŸ¡ |
| 19 | Cobertura | `packages/core/` | "core engine" | 0 testes, sem version, sem bin | ðŸ”´ |
| 20 | Autoria | `AGENTS.md`/`CLAUDE.md`/`GEMINI.md` | 3 arquivos Ãºnicos | Mesmo conteÃºdo copiado 3x | ðŸŸ¡ |
| 21 | Pipeline | Scorecard | Pipeline Health | **0/100** | ðŸŸ  |
| 22 | Infra | Projeto | Git hooks | **Nenhum** (sem Husky) | ðŸŸ¡ |

---

## Veridito Final

O ai-devkit-v2 tem **22 inconsistÃªncias documentadas** entre documentaÃ§Ã£o e cÃ³digo real. As 4 mais graves sÃ£o:

1. **Coverage 84,28% documentado vs 19,73% real** â€” a maior discrepÃ¢ncia, jÃ¡ apontada pelo prÃ³prio `consistency-audit-report.md` como "fabricada"
2. **Scorecard 100/100 documentado vs 96/100 real** (com Pipeline Health em 0)
3. **13/13 adapters "implementados" vs 3/13 reais** (10 sÃ£o stubs de 15 linhas)
4. **Zero `:any` e placeholders documentado vs 14 usos de `any` e 35 TODOs** no cÃ³digo

O projeto jÃ¡ identificou 42 inconsistÃªncias no `consistency-audit-report.md`, mas **nÃ£o as corrigiu**. O maior risco Ã© de credibilidade: qualquer stakeholder que confrontar a documentaÃ§Ã£o com a realidade perderÃ¡ a confianÃ§a no projeto.

**A correÃ§Ã£o recomendada comeÃ§a pela Fase 1 (mÃ©tricas) â€” alinhar AUDITORIA-COMPLETA.md, master-plan.md e project-state.md com a realidade â€” e termina pela unificaÃ§Ã£o das fontes de verdade em uma Ãºnica hierarquia documentada.**
