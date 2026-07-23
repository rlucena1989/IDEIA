# 🔍 Matriz de Diferenças entre Diretórios do Workspace — IDEIA

> **Documento de Análise Comparativa e Auditoria de Duplicidade**
> Data: 2026-07-20
> Finalidade: Identificar, catalogar e analisar todas as diferenças entre diretórios principais do workspace `F:\PROJETOS\ai-devkit-workspace`
> Público-alvo: Auditores externos, arquitetos responsáveis pela consolidação

---

## Sumário das Comparações

| Comparação | Objetos | Tipo |
|:-----------|---------|:----:|
| [C1](#c1-ideia-vs-ai-devkit-v2) | `IDEIA/` ⟷ `ai-devkit-v2/` | ⚠️ Duplicidade crítica |
| [C2](#c2-ideia-vs-legacy) | `IDEIA/` ⟷ `legacy/` | 📜 Evolução histórica |
| [C3](#c3-ideia-theia-vs-ideiapackagesideia-plugin) | `ideia-theia/` ⟷ `IDEIA/packages/ideia-plugin/` | 🔄 Sincronização de plugin |
| [C4](#c4-theia-app-vs-ideiaappsdeia-app) | `theia-app/` ⟷ `IDEIA/apps/ideia-app/` | 🔄 Aplicação Theia duplicada |
| [C5](#c5-electron-app-vs-ideiaelectron) | `electron-app/` ⟷ `IDEIA/electron/` | ⚖️ Electron mínimo vs completo |
| [C6](#c6-docs-vs-ideiadocs-vs-ai-devkit-v2docs) | `docs/` ⟷ `IDEIA/docs/` ⟷ `ai-devkit-v2/docs/` | 📚 Dispersão documental |
| [C7](#c7-scripts-vs-ideiascripts-vs-ai-devkit-v2scripts) | `scripts/` ⟷ `IDEIA/scripts/` ⟷ `ai-devkit-v2/scripts/` | ⚙️ Scripts fragmentados |
| [C8](#c8-src-gen-vs-ideiasrc-gen) | `src-gen/` ⟷ `IDEIA/src-gen/` | 📋 Código gerado idêntico |
| [C9](#c9-lib-vs-idealib) | `lib/` ⟷ `IDEIA/lib/` | 📦 Biblioteca divergente |
| [C10](#c10-packages-ideia-vs-packages-ai-devkit-v2-vs-packages-legacy) | `IDEIA/packages/` ⟷ `ai-devkit-v2/packages/` ⟷ `legacy/packages/` | 📦 Tríade de pacotes |

---

## C1: IDEIA/ vs ai-devkit-v2/

> **⚠️ CRÍTICO — Duas bases de código ativas com alto grau de sobreposição**

### Visão Geral

| Aspecto | `IDEIA/` | `ai-devkit-v2/` |
|---------|----------|-----------------|
| Status declarado | **Projeto core ativo** | Cópia V2 do ecossistema |
| Pacotes | 65 | 66 (inclui web-ui + e2e-tests) |
| Electron | ✅ Completo com instalador | ❌ Não possui |
| Theia App | ✅ apps/ideia-app/ | ❌ Não possui |
| Web UI | ❌ Não possui | ✅ packages/web-ui/ (30+ componentes) |
| E2E Tests | ❌ Não possui | ✅ packages/e2e-tests/ |
| GitHub Workflows | 1 (ci.yml) | 16 workflows |
| Documentação | Reduzida (governança + análise) | Extensa (7 áreas temáticas) |
| VS Code Extension | ❌ Não possui | ✅ vscode-extension/ |
| Tamanho | ~2 GB (com node_modules) | ~2 GB (com node_modules) |

### Matriz de Pacotes: Presente/Ausente

| Pacote | IDEIA/ | ai-devkit-v2/ |
|--------|:------:|:-------------:|
| a11y-scanner | ✅ | ✅ |
| adapter-dart | ✅ | ✅ |
| adapter-elixir | ✅ | ✅ |
| adapter-fastapi | ✅ | ✅ |
| adapter-go | ✅ | ✅ |
| adapter-haskell | ✅ | ✅ |
| adapter-java | ✅ | ✅ |
| adapter-kotlin | ✅ | ✅ |
| adapter-nestjs | ✅ | ✅ |
| adapter-php | ✅ | ✅ |
| adapter-ruby | ✅ | ✅ |
| adapter-scala | ✅ | ✅ |
| adapter-swift | ✅ | ✅ |
| adapter-zig | ✅ | ✅ |
| agent-benchmark | ✅ | ✅ |
| agent-identity | ✅ | ✅ |
| agent-runtime | ✅ | ✅ |
| architecture-adr | ✅ | ✅ |
| audit-trail | ✅ | ✅ |
| autonomous-editor | ✅ | ✅ |
| cli | ✅ | ✅ |
| contract-cdc | ✅ | ✅ |
| contracts | ✅ | ✅ |
| core | ✅ | ✅ |
| correction-oracle | ✅ | ✅ |
| data-layer | ✅ | ✅ |
| delivery-orchestrator | ✅ | ✅ |
| diff-engine | ✅ | ✅ |
| docs-generator | ✅ | ✅ |
| e2e-tests | ❌ | ✅ **Único** |
| economic-control | ✅ | ✅ |
| event-bus | ✅ | ✅ |
| execution-layer | ✅ | ✅ |
| external-connectors | ✅ | ✅ |
| feedback-pipeline | ✅ | ✅ |
| ide-integration | ✅ | ✅ |
| llm-provider | ✅ | ✅ |
| logger | ✅ | ✅ |
| mcp | ✅ | ✅ |
| memory-store | ✅ | ✅ |
| observability-engine | ✅ | ✅ |
| onboarding-engine | ✅ | ✅ |
| org-trust | ✅ | ✅ |
| performance-monitor | ✅ | ✅ |
| persistent-instructions | ✅ | ✅ |
| plugin-sdk | ✅ | ✅ |
| policy-engine | ✅ | ✅ |
| policy-gateway | ✅ | ✅ |
| prompt-security | ✅ | ✅ |
| prototyping-engine | ✅ | ✅ |
| real-data | ✅ | ✅ |
| reality-sync | ✅ | ✅ |
| requirements-engine | ✅ | ✅ |
| resilience-engine | ✅ | ✅ |
| schema-registry | ✅ | ✅ |
| security-middleware | ✅ | ✅ |
| spec-generator | ✅ | ✅ |
| terminal-sandbox | ✅ | ✅ |
| trace-propagation | ✅ | ✅ |
| trace-registry | ✅ | ✅ |
| trusted-context | ✅ | ✅ |
| vector-store | ✅ | ✅ |
| verification-layer | ✅ | ✅ |
| violation-registry | ✅ | ✅ |
| web-ui | ❌ | ✅ **Único** |
| workflow-engine | ✅ | ✅ |
| ideia-plugin (Theia) | ✅ | ❌ |

### Diferenças Estruturais Importantes

| Característica | `IDEIA/` | `ai-devkit-v2/` | Impacto |
|---------------|:--------:|:---------------:|---------|
| Electron completo | ✅ | ❌ | IDEIA pode ser distribuído como app desktop |
| Web UI React | ❌ | ✅ | ai-devkit-v2 tem interface web, IDEIA não |
| VS Code Extension | ❌ | ✅ | ai-devkit-v2 integrável com VS Code |
| Plugin Theia | ✅ | ❌ | IDEIA integrável com Theia, ai-devkit-v2 não |
| Theia App | ✅ | ❌ | IDEIA tem IDE própria |
| CLI templates massivos | ❌ | ✅ | ai-devkit-v2 tem 80+ scripts e templates |
| Instalador Windows | ✅ | ❌ | IDEIA já tem IDEIA.exe compilado |
| 16 workflows CI | ❌ | ✅ | ai-devkit-v2 tem automação mais robusta |
| Memória de IA | `.ai/memory.json` | `memory/` (completo) | ai-devkit-v2 tem persistência mais elaborada |

### Conclusão C1

**Risco:** 🔴 **ALTO** — `IDEIA/` e `ai-devkit-v2/` são forks ou cópias divergentes do mesmo projeto. Possuem bases de código que compartilham ~98% dos pacotes, mas com diferenças críticas:
- `IDEIA/` evoluiu para o ecossistema Theia (plugin, app, electron)
- `ai-devkit-v2/` evoluiu para o ecossistema web (React+Vite) + VS Code

**Recomendação:** Consolidação urgente. Unificar os 67 pacotes únicos em um único monorepo, mantendo:
- Plugin Theia + Theia App (da IDEIA)
- Web UI React (do ai-devkit-v2)
- Electron (da IDEIA)
- VS Code Extension (do ai-devkit-v2)
- 16 workflows CI (do ai-devkit-v2)

---

## C2: IDEIA/ vs legacy/

> **📜 EVOLUÇÃO — legacy/ é o ancestral direto do ecossistema atual**

### Visão Geral

| Aspecto | `IDEIA/` | `legacy/` |
|---------|----------|-----------|
| Propósito | Projeto core atual | Projeto predecessor preservado |
| Pacotes | 65 | 57 (em ai-devkit-setup-v2/packages/) |
| Electron | ✅ Completo com instalador | ❌ |
| Theia Plugin | ✅ | ❌ |
| Web UI | ❌ | Sim, mas mais simples |
| VS Code Extension | ❌ | ✅ (em ai-devkit-setup-v2) |
| Scripts de aceleração | ❌ | ✅ (50+ módulos) |
| Planos de estudo | 2 documentos | 37 documentos numerados |
| Templates CLI | ❌ | ✅ (massivos) |
| Status | 🟢 Em desenvolvimento ativo | 🔴 Preservado, não modificado |

### Pacotes Presentes na IDEIA mas AUSENTES no legacy

| Pacote | Ausente em legacy/ |
|--------|:------------------:|
| agent-runtime | ❌ |
| audit-trail | ❌ |
| cli (versão atual) | ❌ (versão diferente) |
| data-layer | ❌ |
| ideia-plugin | ❌ |
| policy-engine | ❌ |
| reality-sync | ❌ |
| security-middleware | ❌ |

### Pacotes Presentes no legacy mas AUSENTES na IDEIA

| Pacote | Presente em legacy/ |
|--------|:-------------------:|
| agents | ✅ (não existe na IDEIA) |
| api | ✅ |
| backlog | ✅ |
| generators | ✅ |
| git | ✅ |
| hooks | ✅ |
| integrations | ✅ |
| knowledge | ✅ |
| local-ai | ✅ |
| optimizer | ✅ |
| patterns | ✅ |
| permissions | ✅ |
| pipelines | ✅ |
| plans | ✅ |
| policies | ✅ |
| product | ✅ |
| project-templates | ✅ |
| protocols | ✅ |
| quality | ✅ |
| release | ✅ |
| reports | ✅ |
| research | ✅ |
| reviews | ✅ |
| roadmap | ✅ |
| rules | ✅ |
| sdk | ✅ |
| security | ✅ |
| site | ✅ |
| specs | ✅ |
| tasks | ✅ |
| technologies | ✅ |
| testing | ✅ |
| workflows | ✅ |

> **Nota:** Muitos desses pacotes "ausentes" podem ter sido renomeados, consolidados ou movidos para dentro do pacote `cli/` na IDEIA. O cli/ da IDEIA é significativamente mais enxuto que o cli/ do legacy, que contém templates massivos.

### Conclusão C2

**Risco:** 🟡 **MÉDIO** — legacy/ é uma mina de ouro de templates, planos e scripts que não foram migrados para a IDEIA. O `plans/estudos/` com 37 documentos numerados e os `scripts/acceleration/` com 50+ módulos são ativos de alto valor não reaproveitados.

**Recomendação:** Auditar o conteúdo do `legacy/ai-devkit-setup-v2/` e migrar seletivamente:
- Templates de projeto (10 linguagens) → `IDEIA/packages/cli/templates/`
- Planos de estudo → `docs/ESTUDOS/`
- Scripts de aceleração → `IDEIA/scripts/` ou `IDEIA/packages/`

---

## C3: ideia-theia/ vs IDEIA/packages/ideia-plugin/

> **🔄 SINCRONIZAÇÃO — O mesmo plugin Theia existe em dois locais**

### Visão Geral

| Aspecto | `ideia-theia/` | `IDEIA/packages/ideia-plugin/` |
|---------|---------------|-------------------------------|
| Propósito | Plugin Theia standalone | Plugin Theia no monorepo |
| Versão | Standalone | Package @ideia/plugin |
| Fontes browser | 17 arquivos | **21 arquivos** (+4) |
| Fontes common | 2 arquivos | 2 arquivos |
| Fontes node | 10 arquivos | 10 arquivos |
| Tema/Estilo | `style/` com 3 arquivos | `style/` com 3 arquivos |

### Arquivos EXTRAS no ideia-plugin (não presentes em ideia-theia/)

| Arquivo Extra | Função |
|---------------|--------|
| `src/browser/ideia-search-overlay.tsx` | Overlay de busca |
| `src/browser/ideia-studies-widget.tsx` | Widget de estudos |
| `src/browser/ideia-suggestions-widget.tsx` | Widget de sugestões |
| `src/browser/ideia-theme-registration.ts` | Registro de tema |
| `lib/browser/ideia-css-injector.*` | Injetor de CSS |

### Arquivos FALTANDO no ideia-plugin (presentes em ideia-theia/)

| Arquivo Ausente | Impacto |
|-----------------|---------|
| `src/browser/ideia-approval-widget.tsx` | Sem widget de aprovação |
| `src/browser/ideia-chat-contribution.ts` | Ausente (pode ter sido renomeado) |
| `src/browser/ideia-marker-contribution.ts` | Ausente (pode ter sido renomeado) |

### Conclusão C3

**Risco:** 🟠 **ALTO** — Os dois plugins divergiram. O `ideia-plugin/` no monorepo tem **mais funcionalidades** (search overlay, studies widget, suggestions widget, theme registration, CSS injector) mas perdeu alguns arquivos de contribuição que existem no `ideia-theia/` standalone. **Não é possível determinar qual é a versão mais recente sem comparar hash por hash.**

**Recomendação:** Designar `IDEIA/packages/ideia-plugin/` como a fonte oficial e eliminar `ideia-theia/` raiz, ou vice-versa. Migrar funcionalidades faltantes.

---

## C4: theia-app/ vs IDEIA/apps/ideia-app/

> **🔄 APLICAÇÃO THEIA DUPLICADA — mesma base em dois locais**

### Visão Geral

| Aspecto | `theia-app/` (raiz) | `IDEIA/apps/ideia-app/` |
|---------|--------------------|------------------------|
| Propósito | Aplicação Theia base | Aplicação Theia do core |
| Estrutura | Essencialmente idêntica | Essencialmente idêntica |
| Scripts | `scripts/start-all.js`, `test-plugin.ps1` | `scripts/start-all.js`, `test-plugin.ps1` |
| Gen build | esbuild.mjs, gen-esbuild.*.mjs | esbuild.mjs, gen-esbuild.*.mjs (+ electron) |
| Lib | `lib/` completa | `lib/` idêntica |

### Diferenças

| Aspecto | `theia-app/` (raiz) | `IDEIA/apps/ideia-app/` |
|---------|--------------------|------------------------|
| Build Electron | ❌ | ✅ `gen-esbuild.electron.mjs` |
| Atualização | Provavelmente desatualizado | Provavelmente mais recente |

### Conclusão C4

**Risco:** 🟡 **MÉDIO** — Duas cópias da mesma aplicação Theia. A versão em `IDEIA/apps/ideia-app/` tem um build script para Electron adicional. A versão raiz provavelmente é um resquício anterior à criação do monorepo IDEIA/.

**Recomendação:** Remover `theia-app/` da raiz e manter apenas `IDEIA/apps/ideia-app/` como fonte oficial.

---

## C5: electron-app/ vs IDEIA/electron/

> **⚖️ ELECTRON — Mínimo vs Completo**

### Visão Geral

| Aspecto | `electron-app/` (raiz) | `IDEIA/electron/` |
|---------|-----------------------|-------------------|
| Propósito | Wrapper Electron mínimo | App Electron completo |
| Linguagem | JavaScript | TypeScript (+ compilado) |
| Fontes | main.js, preload.js | main.ts, preload.ts, installer.ts |
| Instalador | ❌ | ✅ dist-installer/win-unpacked/IDEIA.exe |
| Módulos nativos | ❌ | ✅ drivelist, keytar, watcher, conpty |
| Lib backend | ❌ | ✅ lib/backend/ completa |
| Lib frontend | ❌ | ✅ lib/frontend/ (Monaco) |
| Tamanho | ~50 MB | ~500 MB+ |
| Build | ❌ | ✅ dist/ + dist-installer/ |

### Conclusão C5

**Risco:** 🟢 **BAIXO** — `electron-app/` da raiz é um wrapper mínimo provavelmente usado para testes rápidos. `IDEIA/electron/` é a implementação completa e oficial. A diferença é proposital e não conflitante.

**Recomendação:** Manter ambos, mas documentar que `electron-app/` é para testes rápidos e `IDEIA/electron/` é a versão de produção.

---

## C6: docs/ vs IDEIA/docs/ vs ai-devkit-v2/docs/

> **📚 DISPERSÃO DOCUMENTAL — Três centros de documentação independentes**

### Comparação Quantitativa

| Categoria | `docs/` (raiz) | `IDEIA/docs/` | `ai-devkit-v2/docs/` |
|-----------|:--------------:|:-------------:|:--------------------:|
| ADRs | **16** (completos) | 0 (vazio) | Não tem ADR dir. |
| Estudos | **56** (completos) | 2 (análise) | 14 + 50+ em plans/ |
| Governança | **18** (completos) | **3** (resumido) | **30+** (extenso) |
| User docs | **5** (completos) | 0 (vazio) | 0 |
| Legado | **10** (completos) | 0 | 0 |
| Fundamentos | 0 | 0 | ✅ 7 áreas temáticas |
| Planos de estudo | 0 | 0 | **50+** numerados |
| APIs | 0 | 0 | OpenAPI + AsyncAPI |
| Auditoria | 0 | 0 | ✅ Relatórios |

### Análise de Sobreposição

| Documento | `docs/` | `IDEIA/docs/` | `ai-devkit-v2/docs/` |
|-----------|:-------:|:-------------:|:--------------------:|
| document-registry.md | ✅ governace/ | ✅ governance/ | ✅ governance/ |
| REALITY-MANIFEST.md | ✅ governace/ | ✅ governance/ | ✅ governance/ |
| GAPS-PRODUCAO-IDE.md | ✅ governace/ | ❌ | ✅ governance/ |
| AUDITORIA-COMPLETA-IDEIA... | ✅ governace/ | ❌ | ❌ |

### Conclusão C6

**Risco:** 🔴 **ALTO** — A documentação está fragmentada em três locais com conteúdo diferente, e nenhum deles é completo. O `docs/` raiz tem os ADRs e estudos, `IDEIA/docs/` tem apenas governança resumida, e `ai-devkit-v2/docs/` tem governança extensa e planos de estudo não presentes nos outros.

**Recomendação:** Unificar toda a documentação em `docs/` (raiz), tornando-o o centro único e canônico. Migrar:
- `IDEIA/docs/governance/` → `docs/governance/`
- `ai-devkit-v2/docs/` → `docs/` (todo o conteúdo temático e de auditoria)
- `ai-devkit-v2/plans/` → `docs/ESTUDOS/`
- `ai-devkit-v2/contracts/` → `docs/api/`

---

## C7: scripts/ vs IDEIA/scripts/ vs ai-devkit-v2/scripts/

> **⚙️ SCRIPTS FRAGMENTADOS — Automação em três silos**

### Comparação

| Tipo | `scripts/` (raiz) | `IDEIA/scripts/` | `ai-devkit-v2/scripts/` |
|------|:-----------------:|:----------------:|:-----------------------:|
| Total | **8** scripts | **2** scripts | **50+** scripts |
| Linguagem | PowerShell | JavaScript | TypeScript/JavaScript |
| Propósito | Auditoria e sync | Build e migração | Aceleração, auditoria, benchmark |
| Subdiretórios | 0 | 0 | ✅ acceleration/ (50+ módulos) |
| | | | ✅ audit/ |
| | | | ✅ benchmark/ |
| | | | ✅ evolve-metrics/ |
| | | | ✅ __tests__/ |

### Análise de Funções

| Função | `scripts/` (raiz) | `IDEIA/scripts/` | `ai-devkit-v2/scripts/` |
|--------|:-----------------:|:----------------:|:-----------------------:|
| Reality check | ✅ reality-check.ps1 | ❌ | ❌ |
| Sync docs | ✅ sync-docs.ps1 | ❌ | ❌ |
| Pre-flight | ✅ pre-flight.ps1 | ❌ | ❌ |
| Audit daemon | ✅ audit-daemon.ps1 | ❌ | ❌ |
| Publish npm | ✅ publish-all.ps1 | ❌ | ❌ |
| Build installer | ❌ | ✅ build-installer.js | ❌ |
| Verify migration | ❌ | ✅ verify-migration.js | ❌ |
| Aceleração (50+) | ❌ | ❌ | ✅ |
| Auditoria | ❌ | ❌ | ✅ |
| Benchmark | ❌ | ❌ | ✅ |
| Métricas | ❌ | ❌ | ✅ |
| Canary publish | ❌ | ❌ | ✅ |
| Compliance | ❌ | ❌ | ✅ |
| Threat intel | ❌ | ❌ | ✅ |
| SLO tracking | ❌ | ❌ | ✅ |

### Conclusão C7

**Risco:** 🟡 **MÉDIO** — scripts/ raiz tem funcionalidades de auditoria/sync que não existem no ai-devkit-v2, enquanto ai-devkit-v2 tem 50+ scripts de automação que não existem nos outros locais. IDEIA/scripts/ é mínimo e específico.

**Recomendação:** Consolidar toda a automação em `scripts/` (raiz), migrando os scripts do ai-devkit-v2 e os da IDEIA para lá, e removendo os outros dois diretórios.

---

## C8: src-gen/ vs IDEIA/src-gen/

> **📋 CÓDIGO GERADO — Conteúdo idêntico**

### Comparação

| Arquivo | `src-gen/` (raiz) | `IDEIA/src-gen/` |
|---------|:-----------------:|:----------------:|
| backend/main.js | ✅ | ✅ |
| backend/server.js | ✅ | ✅ |
| frontend/index.html | ✅ | ✅ |
| frontend/index.js | ✅ | ✅ |
| frontend/secondary-index.js | ✅ | ✅ |
| frontend/secondary-window.html | ✅ | ✅ |

**Diferença:** NENHUMA. Os arquivos são idênticos em ambos os locais.

### Conclusão C8

**Risco:** 🟢 **BAIXO** — Duplicação inócua de código gerado. Ambos são gerados pelo mesmo framework Theia e podem ser removidos de um dos locais sem impacto funcional.

**Recomendação:** Manter `src-gen/` apenas na raiz e remover de `IDEIA/`, ou vice-versa.

---

## C9: lib/ vs IDEIA/lib/

> **📦 BIBLIOTECA — Conjuntos divergentes**

### Comparação

| Arquivo | `lib/` (raiz) | `IDEIA/lib/` |
|---------|:-------------:|:------------:|
| frontend/index.html | ✅ | ✅ |
| backend/ipc-bootstrap.js | ❌ | ✅ |
| backend/main.js | ❌ | ✅ |
| backend/native/drivelist.node | ❌ | ✅ |
| backend/native/keytar.node | ❌ | ✅ |
| backend/native/watcher.node | ❌ | ✅ |
| frontend/bundle.css | ❌ | ✅ |
| frontend/bundle.js | ❌ | ✅ |
| frontend/secondary-window.css | ❌ | ✅ |
| frontend/secondary-window.html | ❌ | ✅ |
| frontend/secondary-window.js | ❌ | ✅ |

### Conclusão C9

**Risco:** 🟢 **BAIXO** — `lib/` raiz é um resquício com apenas 1 arquivo. `IDEIA/lib/` é a biblioteca real e completa. Não há conflito.

**Recomendação:** Remover `lib/` da raiz.

---

## C10: Pacotes — IDEIA vs ai-devkit-v2 vs legacy

> **📦 TRÍADE DE PACOTES — Três universos de pacotes npm com sobreposição massiva**

### Visão Geral dos Três Conjuntos

| Conjunto | Localização | Qtde | Status |
|----------|------------|:----:|--------|
| **A** | `IDEIA/packages/` | **65** | 🟢 Ativo (core) |
| **B** | `ai-devkit-v2/packages/` | **66** | 🟡 Duplicado ativo |
| **C** | `legacy/ai-devkit-setup-v2/packages/` | **57** | 🔴 Preservado |

### Diagrama de Venn

```
                    ┌───────────────────┐
                    │     IDEIA (65)    │
                    │                   │
                    │  ideia-plugin     │
                    └──────┬────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
     ┌──────────────┐ ┌──────────┐ ┌──────────────┐
     │  COMUM (56)  │ │ COMUM   │ │   legacy     │
     │              │ │ (54)    │ │   (57)       │
     │              │ │         │ │              │
     └──────────────┘ └──────────┘ └──────────────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────┴────────────┐
                    │  ai-devkit-v2     │
                    │     (66)          │
                    │  web-ui           │
                    │  e2e-tests        │
                    └───────────────────┘
```

### Pacotes Exclusivos de Cada Conjunto

| Pacote | IDEIA (A) | ai-devkit-v2 (B) | legacy (C) |
|--------|:---------:|:----------------:|:----------:|
| ideia-plugin (Theia) | ✅ **Exclusivo** | ❌ | ❌ |
| web-ui | ❌ | ✅ **Exclusivo** | ❌ |
| e2e-tests | ❌ | ✅ **Exclusivo** | ❌ |
| agent-runtime | ✅ (com C) | ✅ (com C) | ❌ |
| audit-trail | ✅ (com C) | ✅ (com C) | ❌ |
| data-layer | ✅ (com C) | ✅ (com C) | ❌ |
| policy-engine | ✅ (com C) | ✅ (com C) | ❌ |
| reality-sync | ✅ (com C) | ✅ (com C) | ❌ |
| security-middleware | ✅ (com C) | ✅ (com C) | ❌ |
| agents | ❌ | ❌ | ✅ **Exclusivo** |
| api | ❌ | ❌ | ✅ **Exclusivo** |
| backlog | ❌ | ❌ | ✅ **Exclusivo** |
| generators | ❌ | ❌ | ✅ **Exclusivo** |
| git/hooks | ❌ | ❌ | ✅ **Exclusivo** |
| knowledge | ❌ | ❌ | ✅ **Exclusivo** |
| local-ai | ❌ | ❌ | ✅ **Exclusivo** |
| optimizer | ❌ | ❌ | ✅ **Exclusivo** |
| patterns | ❌ | ❌ | ✅ **Exclusivo** |
| permissions | ❌ | ❌ | ✅ **Exclusivo** |
| pipelines/plans/policies | ❌ | ❌ | ✅ **Exclusivo** |
| product/protocols | ❌ | ❌ | ✅ **Exclusivo** |
| quality/release/reports | ❌ | ❌ | ✅ **Exclusivo** |
| research/reviews/roadmap | ❌ | ❌ | ✅ **Exclusivo** |
| rules/sdk/security/site | ❌ | ❌ | ✅ **Exclusivo** |
| specs/tasks/technologies | ❌ | ❌ | ✅ **Exclusivo** |
| testing/workflows | ❌ | ❌ | ✅ **Exclusivo** |

> **Nota:** Muitos dos pacotes "exclusivos" do legacy podem ter sido consolidados dentro do pacote `cli/` na IDEIA e ai-devkit-v2, que contém templates e geradores. É necessária auditoria linha a linha para confirmar.

### Matriz de Maturidade dos Pacotes (estimada)

| Nível | Descrição | IDEIA | ai-devkit-v2 | legacy |
|-------|-----------|:-----:|:------------:|:------:|
| 🟢 Completo | `package.json` + `src/` + `dist/` + `__tests__/` | ~38 pacotes | ~38 pacotes | ~25 pacotes |
| 🟡 Parcial | `package.json` + `src/` + `__tests__/` (sem dist/) | ~15 pacotes | ~15 pacotes | ~20 pacotes |
| 🔵 Stub | adapter-* com estrutura mínima | ~12 pacotes | ~12 pacotes | ~12 pacotes |

### Conclusão C10

**Risco:** 🔴 **CRÍTICO** — Três conjuntos de pacotes com:
- **56 pacotes comuns** entre IDEIA e ai-devkit-v2 (precisam ser reconciliados)
- **~30 pacotes exclusivos do legacy** (precisam ser avaliados para migração)
- **3 pacotes exclusivos** entre IDEIA e ai-devkit-v2 (devem ser preservados)
- Nenhum dos três conjuntos é completo ou autoritativo

**Recomendação:** 
1. Eleger `IDEIA/packages/` como a fonte canônica
2. Migrar `web-ui` e `e2e-tests` do ai-devkit-v2 para IDEIA
3. Auditar os ~30 pacotes exclusivos do legacy e migrar seletivamente
4. Reconciliar diferenças nos 56 pacotes comuns (comparar src/ linha a linha)
5. Remover `ai-devkit-v2/packages/` e `legacy/ai-devkit-setup-v2/packages/` após consolidação

---

## Resumo Consolidado de Riscos

| # | Comparação | Risco | Prioridade | Ação Recomendada |
|:-:|-----------|:----:|:----------:|-----------------|
| C1 | IDEIA/ vs ai-devkit-v2/ | 🔴 **Crítico** | **Imediata** | Consolidar os dois projetos |
| C2 | IDEIA/ vs legacy/ | 🟡 Médio | Curto prazo | Migrar templates e planos |
| C3 | ideia-theia/ vs ideia-plugin/ | 🟠 **Alto** | **Imediata** | Unificar plugin Theia |
| C4 | theia-app/ vs apps/ideia-app/ | 🟡 Médio | Curto prazo | Remover theia-app/ raiz |
| C5 | electron-app/ vs IDEIA/electron/ | 🟢 Baixo | Monitorar | Documentar diferença |
| C6 | docs/ vs IDEIA/docs/ vs v2/docs/ | 🔴 **Crítico** | **Imediata** | Unificar documentação |
| C7 | scripts/ vs x3 | 🟡 Médio | Curto prazo | Consolidar scripts |
| C8 | src-gen/ duplicado | 🟢 Baixo | Longo prazo | Remover duplicata |
| C9 | lib/ vs IDEIA/lib/ | 🟢 Baixo | Longo prazo | Remover lib/ raiz |
| C10 | Pacotes x3 | 🔴 **Crítico** | **Imediata** | Unificar monorepo |

---

## Plano de Ação Recomendado

### Fase 1 — Imediata (Riscos Críticos)
1. **C1 + C10:** Consolidar IDEIA/ e ai-devkit-v2/ em um único monorepo
2. **C3:** Unificar ideia-theia/ e IDEIA/packages/ideia-plugin/
3. **C6:** Unificar toda documentação em docs/ (raiz)

### Fase 2 — Curto Prazo (Riscos Médios)
4. **C2:** Migrar templates e planos do legacy para a IDEIA
5. **C4:** Remover theia-app/ raiz
6. **C7:** Consolidar scripts em scripts/ (raiz)

### Fase 3 — Longo Prazo (Riscos Baixos)
7. **C5:** Documentar diferença electron-app/
8. **C8:** Remover src-gen/ duplicado
9. **C9:** Remover lib/ raiz

---

## Apêndice: Comandos para Verificação

```bash
# Comparar ideia-theia/ vs IDEIA/packages/ideia-plugin/
diff -rq ideia-theia/src IDEIA/packages/ideia-plugin/src --exclude=node_modules

# Comparar theia-app/ vs IDEIA/apps/ideia-app/
diff -rq theia-app/src IDEIA/apps/ideia-app/src --exclude=node_modules

# Comparar electron-app/ vs IDEIA/electron/
diff -rq electron-app/src IDEIA/electron/electron-app/src --exclude=node_modules

# Listar diferenças de packages entre IDEIA e ai-devkit-v2
comm -12 <(ls IDEIA/packages/) <(ls ai-devkit-v2/packages/ | sort)  # comuns
comm -23 <(ls IDEIA/packages/) <(ls ai-devkit-v2/packages/ | sort)  # só na IDEIA
comm -13 <(ls IDEIA/packages/) <(ls ai-devkit-v2/packages/ | sort)  # só no v2
```

---

*Documento gerado para fins de auditoria externa. Este documento deve ser revisado sempre que houver alteração estrutural no workspace.*
