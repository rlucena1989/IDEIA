# Auditoria Documental Completa â€” ai-devkit v2

> Gerada em: 2026-07-15 | Total arquivos .md: ~483 | Tasks: 88 | RedundÃ¢ncias detectadas: 12 | Conflitos: 5+

---

## SumÃ¡rio

1. [Status Real de ImplementaÃ§Ã£o das Tasks](#1-status-real-de-implementacao-das-tasks)
2. [RedundÃ¢ncias Confirmadas](#2-redundancias-confirmadas)
3. [Conflitos e InconsistÃªncias](#3-conflitos-e-inconsistencias)
4. [Documentos Ã“rfÃ£os ou DispensÃ¡veis](#4-documentos-orfaos-ou-dispensaveis)
5. [Plano de ReconciliaÃ§Ã£o](#5-plano-de-reconciliacao)
6. [Nova Estrutura-Alvo](#6-nova-estrutura-alvo)

---

## 1. Status Real de ImplementaÃ§Ã£o das Tasks

### 1.1 F2â€“F8, GAP, QUICK, HPC, SCORECARD â€” 98% IMPLEMENTADAS

| SÃ©rie | Total | Implementadas | Parciais | Planejadas |
|-------|-------|---------------|----------|------------|
| F2 (MCP, CI, Skills, Templates) | 4 | 4 | â€” | â€” |
| F3 (Hooks, Roles, Hermes, Drift, Audit, Scorecard) | 6 | 6 | â€” | â€” |
| F4 (Crypto, Plugin, Security, Compliance, Marketplace) | 5 | 5 | â€” | â€” |
| F5 (Local AI Engine, Violation, Security, Embeddings) | 4 | 4 | â€” | â€” |
| F6 (VSCode Scaffold, Diagnostics, Taskgraph) | 3 | 3 | â€” | â€” |
| F7 (Generators: feature, CRUD, integration, enterprise) | 4 | 4 | â€” | â€” |
| F8 (Contract, CI/CD, Performance, Ecosystem) | 4 | 4 | â€” | â€” |
| GAP (04â€“10: review, supply-chain, barriers, gate, KB, multi-model, routing) | 7 | 7 | â€” | â€” |
| QUICK (01â€“06: hook, llm, modes, detect, wizard, retro) | 6 | 6 | â€” | â€” |
| HPC-01 (high-precision calc) | 1 | 1 | â€” | â€” |
| SCORECARD-A | 1 | 1 | â€” | â€” |
| **Subtotal** | **45** | **45 (100%)** | **0** | **0** |

**ConclusÃ£o:** F2â€“F8, GAP, QUICK, HPC, SCORECARD estÃ£o 100% implementados com cÃ³digo existente. As tasks que os descrevem estÃ£o desatualizadas (marcam subtarefas como pendentes mesmo com cÃ³digo pronto).

### 1.2 EV (Evolution) â€” 37% IMPLEMENTADAS, 53% PARCIAIS, 10% PLANEJADAS

| Task | Status Real | CÃ³digo Existente | Documento Desatualizado? |
|------|-------------|------------------|--------------------------|
| EV-00 overview | PLANEJADA | N/A (meta-doc) | â€” |
| EV-01 agent-runtime | âœ… IMPLEMENTADA | `runtime/agent-runtime.ts` | NÃ£o |
| EV-02 agent-security | âœ… IMPLEMENTADA | `runtime/agent-security.ts` | NÃ£o |
| EV-03 git-integration | âš ï¸ PARCIAL | `runtime/git-provider.ts` | Sim (subtarefas 3.2â€“3.3 marcam como pendentes mas cÃ³digo existe) |
| EV-04 rag-industrial | âš ï¸ PARCIAL | `local-ai/rag.ts` (nÃ£o em `packages/core/src/rag/` como o doc especifica) | Sim (caminho real diverge do planejado) |
| EV-05 test-repair-loop | âš ï¸ PARCIAL | `runtime/test-loop.ts` + `commands/test-loop.ts` | Sim (scripts `analyze-failure.js`, `auto-fix.js` nÃ£o encontrados) |
| EV-06 product-telemetry | âš ï¸ PARCIAL | `runtime/telemetry.ts` | Sim (dashboard nÃ£o verificado) |
| EV-07 plugin-ecosystem | âš ï¸ PARCIAL | `runtime/plugin-sdk.ts` | Sim (contratos em core/plugin/ nÃ£o existem) |
| EV-08 ux-operation | âœ… IMPLEMENTADA | `runtime/preview-engine.ts` | NÃ£o |
| EV-09 backlog-infra | âš ï¸ PARCIAL | `commands/task-run.ts` | Sim (schemas em core/ nÃ£o existem) |
| EV-10 budget-execution | âœ… IMPLEMENTADA | `runtime/budget.ts` | NÃ£o |
| EV-11 redundancy-detection | âœ… IMPLEMENTADA | `runtime/duplication.ts` | NÃ£o |
| EV-12 task-classification | âœ… IMPLEMENTADA | `runtime/classifier.ts` | NÃ£o |
| EV-13 pattern-learning | âœ… IMPLEMENTADA | `runtime/pattern-learner.ts` | NÃ£o |
| EV-14 optimizer-orchestration | âœ… IMPLEMENTADA | `runtime/pipeline-orchestrator.ts` | NÃ£o |
| EV-15 aceleracao-IA | âš ï¸ PARCIAL | `scripts/acceleration/` (60+ arquivos) | **Sim** â€” doc diz "Pendente" mas cÃ³digo existe |
| EV-16 metricas-scorecard | âš ï¸ PARCIAL | scorecard-analyzer, coverage-analyzer, etc. | **Sim** â€” doc diz "Pendente" mas cÃ³digo existe |
| EV-17 coparticipativo | âš ï¸ PARCIAL | classifier, estimator, predictor, precision | **Sim** â€” doc diz "Pendente" mas cÃ³digo existe |
| EV-18 autonomous-flow | âœ… IMPLEMENTADA | checkpoint-manager, phase-orchestrator, decision-center, autonomy-policy | Parcial (marcas pendentes mas cÃ³digo existe) |

### 1.3 ROADMAP â€” 75% NÃƒO IMPLEMENTADAS

| Task | Status | EvidÃªncia |
|------|--------|-----------|
| ROADMAP-01 design-system | âš ï¸ PARCIAL | `tokens.json` + scanner existem, mas CLI `design` tem subtarefas desmarcadas |
| ROADMAP-02 check-all | âŒ PLANEJADA | `check-all.js` nÃ£o encontrado, 0 subtarefas marcadas |
| ROADMAP-03 build-context | âŒ PLANEJADA | `build-context.js` e `run-agent.js` nÃ£o encontrados |
| ROADMAP-04 design-cli | âŒ PLANEJADA | `commands/design.ts` existe mas 0 subtarefas marcadas |

**AtenÃ§Ã£o:** o `backlog.md` marca ROADMAP-01 a 04 como `[x]` concluÃ­das, mas a realidade Ã© que 3 das 4 nÃ£o tÃªm cÃ³digo.

---

## 2. RedundÃ¢ncias Confirmadas

### ðŸ”´ DUPLICAÃ‡Ã•ES EXATAS (mesmo arquivo em 2 locais)

| # | Arquivo | Local 1 | Local 2 | AÃ§Ã£o |
|---|---------|---------|---------|------|
| 1 | `FUNCIONALIDADES_V2_ROADMAP.md` | `plans/` | `docs/governance/` | Remover de `plans/` |
| 2 | `FUNCIONALIDADES_V2_PROPOSALS.md` | `plans/` | `docs/governance/` | Remover de `plans/` |
| 3 | `FUNCIONALIDADES_V2_METRICS.md` | `plans/` | `docs/governance/` | Remover de `plans/` |
| 4 | `FUNCIONALIDADES_V2_MATRIX.md` | `plans/` | `docs/governance/` | Remover de `plans/` |

### ðŸŸ¡ FUNCIONALIDADES_ANALISE_COMPLETA â€” 3 VARIANTES

| # | Arquivo | AÃ§Ã£o |
|---|---------|------|
| 5 | `plans/FUNCIONALIDADES_ANALISE_COMPLETA.md` | Manter como canÃ´nico |
| 6 | `plans/FUNCIONALIDADES_ANALISE_COMPLETA_FINAL.md` | Unificar com o canÃ´nico e remover |
| 7 | `plans/FUNCIONALIDADES_ANALISE_COMPLETA_FULL.md` | Unificar com o canÃ´nico e remover |

### ðŸŸ¡ IDE PLANS â€” 7 ARQUIVOS SOBREPOSTOS

| # | Arquivo | ConteÃºdo | AÃ§Ã£o |
|---|---------|----------|------|
| 8 | `IDE-dev.md` | EvoluÃ§Ã£o IDE Local | Consolidar em `docs/03-roadmap/FASE-*.md` |
| 9 | `IDE-dev2.md` | ContinuaÃ§Ã£o IDE | Consolidar |
| 10 | `IDE-plan-2.md` | Plano IDE 2 | Consolidar |
| 11 | `IDE-plan-3.md` | Plano IDE 3 | Consolidar |
| 12 | `IDE-avanÃ§os.md` | AvanÃ§os IDE | Consolidar |
| 13 | `IDE-integracao-back-front.md` | IntegraÃ§Ã£o back/front | Mover para `docs/02-arquitetura/` |
| 14 | `IDE-READINESS-ASSESSMENT.md` | Assessment IDE | Mover para `docs/01-fundamentos/` |

### ðŸŸ¡ AUDITORIAS NA RAIZ â€” 3 ARQUIVOS

| # | Arquivo | AÃ§Ã£o |
|---|---------|------|
| 15 | `AUDITORIA-COMPLETA.md` | Mover para `docs/audit/` |
| 16 | `AUDITORIA-MODULOS-INTELIGENTES.md` | Mover para `docs/audit/` |
| 17 | `AUDITORIA-TECNICA-REAL-2026-07-13.md` | Mover para `docs/audit/` |

---

## 3. Conflitos e InconsistÃªncias

### ðŸ”´ CRÃTICOS

| # | Conflito | Detalhes |
|---|----------|----------|
| C1 | **master-plan.md auto-contraditÃ³rio** | Diz "âœ… TODAS AS FRENTES CONCLUÃDAS" e "Scorecard 100/100" na seÃ§Ã£o inicial, mas nas seÃ§Ãµes seguintes lista dezenas de itens ðŸ”´ e o prÃ³prio scorecard como ðŸ”´. A seÃ§Ã£o "CritÃ©rios de ConclusÃ£o" mostra 100/100 como pendente. |
| C2 | **backlog.md vs realidade** | Marca ROADMAP-01 a 04 como `[x]` concluÃ­dos, mas 3/4 nÃ£o tÃªm cÃ³digo implementado. |
| C3 | **current-task.md desatualizado** | Diz que a tarefa atual Ã© RAG-CP integration (13/07), mas ignora 88 tasks e todo o roadmap de evoluÃ§Ã£o. |
| C4 | **document-registry.md vs realidade** | Registry lista 17 documentos; projeto tem ~483 arquivos .md. A maioria nÃ£o estÃ¡ catalogada. |

### ðŸŸ  ALTOS

| # | Conflito | Detalhes |
|---|----------|----------|
| C5 | **Cobertura: 6 fontes diferentes** | `jest.config.js` (80%), `.ai/laws.yaml` (80%), `master-plan.md` (84%), scorecard (96/100 mas metrics mostram 19%), `coverage/coverage-summary.json` (19.72%), `docs/evolution-status.md` (~24%). Cada um puxa de fonte diferente. |
| C6 | **EV-15/16/17 tasks vs cÃ³digo** | Tasks marcam como "Pendente" mas `scripts/acceleration/` tem 60+ arquivos de cÃ³digo. |
| C7 | **source-of-truth-map.md referÃªncias invÃ¡lidas** | `plans/coverage-autonomy-procedure.md` referenciado mas deveria estar em `docs/governance/`. `.ai-devkit/coverage-dashboard.md` pode nÃ£o existir mais. |

### ðŸŸ¡ MÃ‰DIOS

| # | Conflito | Detalhes |
|---|----------|----------|
| C8 | **document-policy.md subutilizado** | Define 8 task types, mas nÃ£o hÃ¡ mecanismo que force IAs a consultÃ¡-lo. |
| C9 | **56 review-*.md auto-gerados** | 56 arquivos em `.ai/reports/` poluem o repositÃ³rio sem valor histÃ³rico real. |
| C10 | **`plans/estudos/` vs `.ai/`** | Estudos em `plans/estudos/` (49 arquivos) duplicam conceitos abordados em `.ai/research/`, `.ai/roadmap/`. |

---

## 4. Documentos Ã“rfÃ£os ou DispensÃ¡veis

| Arquivo | Problema | AÃ§Ã£o |
|---------|----------|------|
| `.ai/reports/review-*.md` | 56 auto-generated, sem valor histÃ³rico | Manter apenas Ãºltimos 5, remover 51 |
| `.ai/context/cache/latest-context.md` | Cache auto-gerado | Adicionar ao `.gitignore` |
| `.ai/optimizer/runtime/latest-context.md` | Cache auto-gerado | Adicionar ao `.gitignore` |
| `.ai/optimizer/runtime/latest-summary.md` | Cache auto-gerado | Adicionar ao `.gitignore` |
| `.ai/reports/review-*.md` | Auto-gerado | Adicionar ao `.gitignore` |
| `.ai/context/ai-handoff-compact.md` | VersÃ£o compacta do handoff | Unificar com `ai-handoff.md` |
| `plans/devkit-adjustments-f04.md` (raiz) | Duplicado de `plans/future/devkit-adjustments-f04.md` | Remover duplicata |
| `plans/FUNCIONALIDADES_V2_FRONTMATTER.md` | Fragmento de anÃ¡lise | Mover para `docs/estudos/` |
| `plans/FUNCIONALIDADES_V2_CONCLUSION.md` | Fragmento de anÃ¡lise | Mover para `docs/estudos/` |
| `plans/FUNCIONALIDADES_V2_APPENDIX.md` | Fragmento de anÃ¡lise | Mover para `docs/estudos/` |

---

## 5. Plano de ReconciliaÃ§Ã£o

### Fase 1 â€” Remover Duplicatas (imediato)

```powershell
# Remover FUNCIONALIDADES_V2 duplicados de plans/ (manter em docs/governance/)
Remove-Item "plans/FUNCIONALIDADES_V2_ROADMAP.md"
Remove-Item "plans/FUNCIONALIDADES_V2_PROPOSALS.md"
Remove-Item "plans/FUNCIONALIDADES_V2_METRICS.md"
Remove-Item "plans/FUNCIONALIDADES_V2_MATRIX.md"

# Remover devkit-adjustments-f04.md duplicado
Remove-Item "plans/devkit-adjustments-f04.md"

# Unificar ai-handoff (manter o completo, remover o compacto)
Remove-Item ".ai/context/ai-handoff-compact.md"
```

### Fase 2 â€” Mover para Locais CanÃ´nicos

```powershell
# Auditorias para docs/audit/
Move-Item "AUDITORIA-COMPLETA.md" "docs/audit/AUDITORIA-COMPLETA.md"
Move-Item "AUDITORIA-MODULOS-INTELIGENTES.md" "docs/audit/AUDITORIA-MODULOS-INTELIGENTES.md"
Move-Item "AUDITORIA-TECNICA-REAL-2026-07-13.md" "docs/audit/AUDITORIA-TECNICA-REAL-2026-07-13.md"

# IDE docs para docs/
Move-Item "IDE-integracao-back-front.md" "docs/02-arquitetura/IDE-integracao-back-front.md"
Move-Item "IDE-READINESS-ASSESSMENT.md" "docs/01-fundamentos/IDE-READINESS-ASSESSMENT.md"

# Fragmentos FUNCIONALIDADES para docs/estudos/
Move-Item "plans/FUNCIONALIDADES_V2_FRONTMATTER.md" "docs/estudos/"
Move-Item "plans/FUNCIONALIDADES_V2_CONCLUSION.md" "docs/estudos/"
Move-Item "plans/FUNCIONALIDADES_V2_APPENDIX.md" "docs/estudos/"

# Plans de autonomia para docs/governance/
Move-Item "plans/coverage-autonomy-procedure.md" "docs/governance/"
Move-Item "plans/govern-autonomy.md" "docs/governance/"
Move-Item "plans/multicontexto.md" "docs/estudos/"
Move-Item "plans/teste-autonomy.md" "docs/governance/"

# Documentos root especÃ­ficos
Move-Item "SECURITY-GOVERNANCE-ASSESSMENT.md" "docs/governance/"
Move-Item "esteira-tecnologica.md" "docs/02-arquitetura/"
Move-Item "ANALISE-CHAT-CENTRAL.md" "docs/estudos/"
```

### Fase 3 â€” Unificar IDE Plans

Os 7 arquivos IDE-*.md na raiz devem ser consolidados em:
- `docs/01-fundamentos/VISAO-IDE-LOCAL.md` â€” visÃ£o geral
- `docs/03-roadmap/ROADMAP-IDE-LOCAL.md` â€” roadmap unificado

ConteÃºdo jÃ¡ existe em `docs/01-fundamentos/` e `docs/03-roadmap/`. Os IDE-*.md root podem ser removidos apÃ³s verificaÃ§Ã£o cruzada.

### Fase 4 â€” Corrigir InconsistÃªncias

1. **master-plan.md**: Remover seÃ§Ã£o "âœ… TODAS AS FRENTES CONCLUÃDAS" do topo. Manter apenas matriz de status real. Ou substituir por referÃªncia ao scorecard.
2. **backlog.md**: Corrigir marcaÃ§Ã£o de ROADMAP-02 a 04 de `[x]` para `[ ]`.
3. **current-task.md**: Substituir conteÃºdo estÃ¡tico por referÃªncia dinÃ¢mica ao `scorecard report`.
4. **document-registry.md**: Expandir para todos os documentos ativos.
5. **source-of-truth-map.md**: Atualizar caminhos (ex: `plans/coverage-autonomy-procedure.md` â†’ `docs/governance/coverage-autonomy-procedure.md`).

### Fase 5 â€” Limpeza de Lixo

```powershell
# Remover 51/56 review reports (manter Ãºltimos 5)
$reviews = Get-ChildItem ".ai/reports/review-*.md" | Sort-Object LastWriteTime -Descending
$reviews | Select-Object -Skip 5 | Remove-Item

# Adicionar caches ao .gitignore
"# Auto-generated caches`n.ai/reports/review-*.md`n.ai/context/cache/`n.ai/optimizer/runtime/" | Add-Content ".gitignore"
```

---

## 6. Nova Estrutura-Alvo

```
ai-devkit-v2/
â”œâ”€â”€ .ai/                          â† GovernanÃ§a IA (tasks, templates, policies)
â”‚   â”œâ”€â”€ tasks/                    â† Tasks ativas (88 arquivos, manter)
â”‚   â”œâ”€â”€ templates/                â† Templates (manter)
â”‚   â”œâ”€â”€ policies/                 â† PolÃ­ticas (manter)
â”‚   â”œâ”€â”€ quality/                  â† Gates (manter)
â”‚   â”œâ”€â”€ laws.yaml                 â† Leis (manter)
â”‚   â”œâ”€â”€ project-manifest.yaml     â† Manifesto (manter)
â”‚   â”œâ”€â”€ prompts/                  â† 28 prompts (manter)
â”‚   â””â”€â”€ ... (demais subdirs)
â”‚
â”œâ”€â”€ docs/                         â† DocumentaÃ§Ã£o unificada
â”‚   â”œâ”€â”€ 01-fundamentos/           â† VisÃ£o, MVP, escopo, princÃ­pios
â”‚   â”œâ”€â”€ 02-arquitetura/           â† Arquitetura (incl. IDE integraÃ§Ã£o, esteira)
â”‚   â”œâ”€â”€ 03-roadmap/               â† Roadmaps (IDE, funcionalidades)
â”‚   â”œâ”€â”€ 04-operacao/              â† Fluxos operacionais
â”‚   â”œâ”€â”€ 05-ias/                   â† InstruÃ§Ãµes para IAs
â”‚   â”œâ”€â”€ 06-execucao/              â† Modelos de execuÃ§Ã£o
â”‚   â”œâ”€â”€ 07-consolidacao/          â† SumÃ¡rios consolidados
â”‚   â”œâ”€â”€ audit/                    â† RelatÃ³rios de auditoria
â”‚   â”œâ”€â”€ estudos/                  â† Estudos tÃ©cnicos (movidos de plans/estudos/ + fragmentos)
â”‚   â””â”€â”€ governance/               â† REGISTRY, source-of-truth, policies, conflict-resolution
â”‚
â”œâ”€â”€ plans/                        â† Manter APENAS f*.md e devkit-adjustments*.md
â”‚   â”œâ”€â”€ f13.md .. f30.md          â† Plans de implementaÃ§Ã£o
â”‚   â”œâ”€â”€ devkit-adjustments-f*.md  â† Ajustes
â”‚   â”œâ”€â”€ ACTION-PLAN-AUTOMATION.md
â”‚   â”œâ”€â”€ ai-devkit-evolution.md
â”‚   â”œâ”€â”€ assisted-autonomy.md
â”‚   â”œâ”€â”€ demand-generation.md
â”‚   â””â”€â”€ estudos/                  â† Manter (49 estudos)
â”‚
â”œâ”€â”€ prompts/                      â† Prompts de sistema (manter)
â”œâ”€â”€ (demais dirs de cÃ³digo)       â† packages/, scripts/, etc.
```

---

## ApÃªndice A: Checklist para VerificaÃ§Ã£o Futura

Sempre que este documento for consultado, executar:

```powershell
# 1. Verificar se hÃ¡ duplicatas
Get-ChildItem -Recurse -Filter "*.md" | Group-Object Name | Where-Object Count -gt 1

# 2. Verificar se document-registry estÃ¡ completo
$registryCount = (Get-Content "docs/governance/document-registry.md" | Select-String "\| \`" | Measure-Object).Count
$actualDocs = (Get-ChildItem -Recurse -Filter "*.md" | Where-Object { $_.FullName -notmatch 'node_modules|\.git|dist' }).Count
Write-Host "Registry: $registryCount / Real: $actualDocs"

# 3. Rodar enforce-document-flow
node .ai/bin/enforce-document-flow.js
```
