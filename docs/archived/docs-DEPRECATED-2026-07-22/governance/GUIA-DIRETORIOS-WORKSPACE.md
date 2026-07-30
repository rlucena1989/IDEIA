# 📂 Guia de Diretórios do Workspace — IDEIA

> **Documento de Referência e Análise de Propósito**
> Data: 2026-07-20
> Finalidade: Explicar o propósito, conteúdo e função de cada diretório principal na raiz do workspace `F:\PROJETOS\ai-devkit-workspace`
> Público-alvo: Auditores externos, novos desenvolvedores,分析istas de arquitetura

---

## Índice

| # | Diretório | Propósito | Tamanho Estimado |
|---|-----------|-----------|-----------------|
| 1 | `.ai/` | Orquestração de agentes de IA | Pequeno (~50 arquivos) |
| 2 | `.github/` | CI/CD e templates GitHub | Pequeno (6 arquivos) |
| 3 | `.kilo/` | Configuração Kilo AI | Pequeno (4 + node_modules) |
| 4 | `docs/` | Documentação completa do projeto | Médio (~100 arquivos) |
| 5 | `scripts/` | Automação PowerShell | Pequeno (8 arquivos) |
| 6 | `mockup/` | Mockups de interface HTML | Mínimo (2 arquivos) |
| 7 | `lib/` | Biblioteca compartilhada | Mínimo (1 arquivo) |
| 8 | `src-gen/` | Código gerado automaticamente | Pequeno (6 arquivos) |
| 9 | `electron-app/` | Aplicação desktop Electron | Pequeno (3 src + node_modules) |
| 10 | `ideia-theia/` | Plugin IDEIA para Theia | Médio (29 src + compilados) |
| 11 | `theia-app/` | Aplicação Theia IDE | Grande (src + lib + binários) |
| 12 | `IDEIA/` | **Projeto Core — Monorepo Principal** | **Muito Grande (4 GB+)** |
| 13 | `legacy/` | Código e documentação legados | Grande (projeto completo) |
| 14 | `ai-devkit-v2/` | Cópia V2 do ecossistema | **Muito Grande (completo)** |
| 15 | `node_modules/` | Dependências npm | Massivo (múltiplas pastas) |

---

## 1. `.ai/` — Orquestração de Agentes de IA

**Propósito:** Diretório de configuração e operação da esteira de agentes de IA que orquestram o desenvolvimento. Contém instruções para cada tipo de agente (analista, arquiteto, DevOps, programador, revisor, testador), políticas de autonomia, contexto de sessão, memória persistente de decisões e padrões, além de relatórios de auditoria gerados automaticamente.

**Subdiretórios principais:**

| Subdiretório | Função |
|-------------|--------|
| `agents/` | Instruções detalhadas para cada perfil de agente IA |
| `audit/` | Manifesto de patches e auditorias aplicadas |
| `bin/` | Hooks Git (pre-commit, post-commit) para Linux |
| `context/` | Estado ativo da sessão atual da IA |
| `governance/` | Registro de documentos e gaps de produção |
| `ide/` | Sessões salvas da IDE |
| `memory/` | Decisões, padrões e contexto persistente do projeto |
| `reports/` | Relatórios de review, supply chain e scorecard |
| `templates/` | Templates de ADR, PR e task |

**Tecnologias:** YAML, JSON, Markdown, JavaScript (`.mjs`), Shell Script

---

## 2. `.github/` — CI/CD GitHub

**Propósito:** Configuração de integração contínua via GitHub Actions, templates de issues e pull requests. Mantém um pipeline de CI único (`ci.yml`) que valida o código, e templates padronizados para contribuições.

**Subdiretórios:**

| Subdiretório | Função |
|-------------|--------|
| `ISSUE_TEMPLATE/` | Templates de bug report e feature request |
| `workflows/` | Pipeline de CI (validação, lint, testes) |

**Tecnologias:** YAML, Markdown

---

## 3. `.kilo/` — Configuração Kilo AI

**Propósito:** Configuração do Kilo AI, ferramenta de assistência que depende de `@theia`, `@modelcontextprotocol`, `zod`, `uuid` e `yaml`. Atua como orquestrador de contexto auxiliar.

**Conteúdo:** 4 arquivos de configuração + `node_modules/` com dependências.

**Tecnologias:** JSON, JavaScript (Node.js), Theia, MCP, Zod

---

## 4. `docs/` — Documentação Completa

**Propósito:** Centro de documentação do projeto. Contém 16 Architecture Decision Records (ADRs), 56 estudos técnicos e estratégicos, 18 documentos de governança, 10 documentos legados do ai-devkit e 5 documentos de documentação para usuário final. Também inclui um dashboard de auditoria em HTML interativo.

**Subdiretórios:**

| Subdiretório | Quantidade | Função |
|-------------|:----------:|--------|
| `adr/` | 16 ADRs | Decisões arquiteturais registradas (Theia, NATS, Mem0, LangGraph, Cedar, Dagger, LLM, ADAPT, OpenTelemetry, Qualidade, Self-Opt, Topologia, Controle, Perfis, Memória, Segurança) |
| `ESTUDOS/` | 56 estudos | Pesquisas técnicas aprofundadas sobre cada camada da arquitetura |
| `governance/` | 18 docs | Políticas, manifestos, auditorias, inventários, compliance |
| `legacy/` | 10 docs | Documentos do projeto ai-devkit original |
| `user/` | 5 docs | Documentação para usuário final (comandos, conceitos, FAQ) |

**Tecnologias:** Markdown, HTML (dashboard interativo)

---

## 5. `scripts/` — Automação PowerShell

**Propósito:** Scripts de automação e verificação do workspace, todos em PowerShell 5.1+ (Windows). Inclui daemon de auditoria contínua, verificador de realidade (reality-check), sincronizador de documentação, verificador pré-voo, linkeditor de pacotes, preparador/publicador de pacotes npm e executor de fases de implementação.

**Arquivos (8):**

| Script | Função |
|--------|--------|
| `audit-daemon.ps1` | Monitor contínuo de drift entre docs e código (background) |
| `executar-fase-0.ps1` | Executa a fase 0 de implementação do projeto |
| `link-packages.ps1` | Cria links simbólicos entre pacotes locais |
| `pre-flight.ps1` | Valida contexto antes de operações críticas (bloqueia se sujo) |
| `prepare-publish.ps1` | Prepara pacotes para publicação no npm |
| `publish-all.ps1` | Publica todos os pacotes no registro npm |
| `reality-check.ps1` | Verifica se a documentação reflete fielmente o código real |
| `sync-docs.ps1` | Sincroniza automaticamente docs com o código implementado |

**Tecnologias:** PowerShell 5.1+

---

## 6. `mockup/` — Mockups HTML

**Propósito:** Contém mockups de interface do usuário para validação visual do produto antes da implementação. Inclui o mockup V2 da interface IDEIA rodando sobre Theia, com widgets, painéis e fluxos simulados.

**Arquivos (2):**

| Arquivo | Função |
|---------|--------|
| `ideia-theia-mockup-v2.html` | Mockup interativo V2 da interface IDEIA-Theia |
| `README.md` | Documentação do mockup |

**Tecnologias:** HTML, CSS, JavaScript

---

## 7. `lib/` — Biblioteca Compartilhada

**Propósito:** Diretório mínimo contendo uma única página HTML frontend compartilhada. É um resquício de estrutura anterior, atualmente com função marginal no ecossistema. O conteúdo funcional real está em `IDEIA/lib/`, `theia-app/lib/` e `IDEIA/electron/lib/`.

**Arquivo:** `frontend/index.html`

**Tecnologias:** HTML

---

## 8. `src-gen/` — Código Gerado

**Propósito:** Código gerado automaticamente pelos geradores de build do Theia. Contém backend (entrypoint + servidor) e frontend (páginas HTML + scripts JS) que servem como scaffolding para a aplicação Theia.

**Estrutura:**

| Subdiretório | Arquivos |
|-------------|----------|
| `backend/` | `main.js`, `server.js` |
| `frontend/` | `index.html`, `index.js`, `secondary-index.js`, `secondary-window.html` |

**Tecnologias:** JavaScript, HTML

---

## 9. `electron-app/` — Aplicação Electron

**Propósito:** Aplicação desktop nativa usando Electron. Contém o processo principal (`main.js`) que gerencia a janela nativa, e o script de preload (`preload.js`) que faz a ponte segura entre o processo renderizador e o Node.js. Inclui um ícone do aplicativo.

**Importante:** Este é um **app wrapper mínimo** — a implementação Electron completa e robusta está em `IDEIA/electron/`.

**Arquivos:**

| Arquivo | Função |
|---------|--------|
| `src/main.js` | Processo principal Electron (gerencia janela, menus, lifecycle) |
| `src/preload.js` | Ponte segura entre renderizador e Node.js (contextBridge) |
| `assets/icon.png` | Ícone do aplicativo |

**Tecnologias:** Electron, JavaScript, Node.js

---

## 10. `ideia-theia/` — Plugin IDEIA para Theia

**Propósito:** Plugin completo da IDEIA para a plataforma Theia. É a peça central de integração IDEIA-Theia, contendo 29 arquivos fonte TypeScript/TSX distribuídos em três camadas:

- **Browser (17 arquivos):** Widgets React (chat, dashboard, diff, arquivos, aprovação, barra de título), contribuições (chat, lifecycle, markers, output, preferências, progresso, statusbar, views), módulo frontend, cliente de serviço, estilos
- **Common (2 arquivos):** Protocolo de comunicação e tipos compartilhados
- **Node (10 arquivos):** Serviços backend (agente, chat, dashboard, memória, tarefas, DAP), configuração de modelo de linguagem, provedor LLM com fallback (Ollama/OpenAI/DeepSeek), validador de output

**Subdiretórios:**

| Subdiretório | Conteúdo |
|-------------|----------|
| `src/browser/` | Widgets e contribuições frontend (React/TSX) |
| `src/common/` | Tipos e protocolo compartilhados |
| `src/node/` | Serviços backend Node.js |
| `lib/` | Código compilado (JS + .d.ts + .js.map) |
| `style/` | Temas e estilos CSS/TS |

**Tecnologias:** TypeScript, React, Theia Platform, Inversify DI, Monaco Editor

---

## 11. `theia-app/` — Aplicação Theia

**Propósito:** Aplicação Theia completa, compilada e pronta para execução. Contém o backend com módulos nativos (drivelist, keytar, watcher, ripgrep), integrações de shell (bash, zsh), suporte a CONPTY no Windows, bundle frontend completo (Monaco Editor), e todo o scaffolding necessário para rodar a IDE Theia.

**Subdiretórios principais:**

| Subdiretório | Função |
|-------------|--------|
| `src/` | Código fonte da aplicação (TypeScript/HTML) |
| `lib/backend/` | Backend compilado com módulos nativos e integrações shell |
| `lib/frontend/` | Frontend compilado (Monaco Editor, bundles) |
| `lib/prebuilds/` | Binários pré-compilados para Windows (CONPTY) |
| `scripts/` | Scripts de inicialização e teste |
| `src-gen/` | Código gerado pelo framework Theia |

**Módulos nativos incluídos:**
- `drivelist.node` — Listagem de unidades de disco
- `keytar.node` — Gerenciamento seguro de credenciais
- `watcher.node` — File watching nativo do SO
- `rg.exe` — Ripgrep (busca ultra-rápida em arquivos)
- `conpty.node` + `conpty.dll` — Console PTY para Windows
- `windows-trash.exe` — Envio para lixeira

**Tecnologias:** TypeScript, Theia Platform, Node.js, CONPTY, Monaco Editor, Bash/Zsh

---

## 12. `IDEIA/` — Projeto Core (Monorepo Principal)

**Propósito:** **Diretório mais importante do workspace.** Contém o monorepo principal da IDEIA com 65 pacotes npm, o aplicativo Theia completo (`apps/ideia-app/`), a aplicação Electron nativa (`electron/`) com instalador Windows já compilado, documentação core, scripts de build e todo o ecossistema de desenvolvimento.

**Subdiretórios principais:**

| Subdiretório | Função |
|-------------|--------|
| `.ai/` | Memória de IA do projeto core |
| `apps/ideia-app/` | Aplicação Theia completa (fonte + compilado + scripts) |
| `docs/` | Documentação core reduzida (governança + estudos de análise) |
| `electron/` | **Aplicação Electron nativa** — contém instalador Windows compilado (IDEIA.exe) |
| `lib/` | Biblioteca compilada compartilhada (backend + frontend) |
| `mockup/` | Mockup V2 (cópia do raiz) |
| `packages/` | **65 pacotes npm** — todo o ecossistema de módulos |
| `scripts/` | Scripts de build do instalador e verificação de migração |
| `src-gen/` | Código gerado pelo Theia (cópia do raiz) |

### 12.1 `IDEIA/packages/` — Os 65 Pacotes do Monorepo

Os pacotes se dividem nas seguintes categorias:

| Categoria | Quantidade | Pacotes |
|-----------|:----------:|---------|
| **Adapters** (13) | 13 | dart, elixir, fastapi, go, haskell, java, kotlin, nestjs, php, ruby, scala, swift, zig |
| **Agentes** (3) | 3 | agent-benchmark, agent-identity, agent-runtime |
| **Core** (10) | 10 | architecture-adr, contracts, core (deprecated), correction-oracle, data-layer, diff-engine, docs-generator, economic-control, execution-layer, external-connectors |
| **Eventos e Mensageria** (1) | 1 | event-bus |
| **Feedback e Memória** (3) | 3 | feedback-pipeline, memory-store, reality-sync |
| **LLM e IA** (3) | 3 | llm-provider, mcp, prompt-security |
| **Observabilidade** (3) | 3 | observability-engine, trace-propagation, trace-registry |
| **Orquestração** (4) | 4 | delivery-orchestrator, workflow-engine, verification-layer, prototyping-engine |
| **Plugin e SDK** (2) | 2 | ideia-plugin (Theia), plugin-sdk |
| **Políticas e Segurança** (5) | 5 | policy-engine, policy-gateway, security-middleware, terminal-sandbox, org-trust |
| **Qualidade e Testes** (5) | 5 | a11y-scanner, contract-cdc, spec-generator, violation-registry, schema-registry |
| **Suporte** (8) | 8 | audit-trail, autonomous-editor, cli, logger, ide-integration, persistent-instructions, requirements-engine, trusted-context |
| **UX e Negócio** (5) | 5 | onboarding-engine, performance-monitor, real-data, resilience-engine, vector-store |

### 12.2 `IDEIA/electron/` — Aplicação Electron Nativa

Contém:
- **`src/`** — Código fonte TypeScript (`main.ts`, `preload.ts`, `installer.ts`)
- **`dist/`** — TypeScript compilado
- **`dist-installer/win-unpacked/`** — **Instalador Windows já compilado** contendo `IDEIA.exe`, DLLs do Electron, 55 locales, e backend Theia empacotado
- **`lib/`** — Biblioteca completa (backend com módulos nativos, frontend, prebuilds CONPTY)

**Tecnologias:** TypeScript, Electron, Node.js, Theia

---

## 13. `legacy/` — Código Legado

**Propósito:** Contém versões anteriores do projeto que foram substituídas. Inclui uma cópia completa do `ai-devkit-setup-v2` (que é o predecessor do `ai-devkit-v2` atual) com 57 pacotes, planos de estudo, scripts de aceleração, templates de projeto em 10 linguagens, extensão VS Code, e documentos de análise de atualizações futuras.

**Subdiretórios:**

| Subdiretório | Função |
|-------------|--------|
| `ai-devkit-setup-v2/` | Cópia completa do projeto predecessor (57 pacotes, 37 planos de estudo, 50+ módulos de aceleração, extensão VS Code, templates) |
| `future-updates-ai-devkit/` | 6 documentos de análise de evolução futura |

**Importante:** Este diretório é **preservado para referência histórica** e não deve ser modificado. Todo desenvolvimento ativo acontece em `IDEIA/` ou `ai-devkit-v2/`.

**Tecnologias:** TypeScript, JavaScript, PowerShell, Bash, Node.js

---

## 14. `ai-devkit-v2/` — Cópia V2 do Ecossistema

**Propósito:** Cópia completa e autônoma do ecossistema AI-Devkit V2. Contém 66 pacotes (mesmos 65 da IDEIA + web-ui + e2e-tests), 16 workflows GitHub Actions, documentação extensa dividida em 7 áreas temáticas, schemas JSON de contratos, 50+ planos de estudo numerados, 50+ módulos de aceleração, 8 templates de prompt do sistema, extensão VS Code completa, testes de integração e performance, e templates de projeto em 10 linguagens.

**Características únicas (não presentes na IDEIA):**

| Componente | Descrição |
|-----------|-----------|
| `packages/web-ui/` | Frontend React+Vite completo (30+ componentes, design system, hooks, temas) |
| `packages/e2e-tests/` | Testes end-to-end com Playwright |
| `.github/workflows/` | 16 workflows de CI/CD (vs 1 na raiz) |
| `contracts/` | Schemas JSON (audit, session, task, workspace) |
| `docs/` | Documentação temática em 7 áreas + 14 estudos com subdiretórios |
| `prompts/` | 8 templates de prompt do sistema |
| `tests/` | Testes de integração e performance separados |
| `policies/` | Políticas de segurança em YAML |

**Tecnologias:** TypeScript, React, Vite, Node.js, Playwright, Theia

---

## 15. `node_modules/` — Dependências npm

**Propósito:** Armazenam as dependências npm do ecossistema. Estão espalhadas em **11 locais diferentes** no workspace:

| Local | Propósito |
|-------|-----------|
| `raiz/node_modules/` | Dependências do workspace npm principal |
| `.kilo/node_modules/` | Dependências do Kilo AI |
| `electron-app/node_modules/` | Dependências do Electron mínimo |
| `ideia-theia/node_modules/` | Dependências do plugin Theia (React, etc.) |
| `theia-app/node_modules/` | Dependências da aplicação Theia |
| `IDEIA/node_modules/` | Dependências do monorepo core |
| `IDEIA/apps/ideia-app/node_modules/` | Dependências da aplicação Theia core |
| `IDEIA/electron/node_modules/` | Dependências do Electron core |
| `IDEIA/electron/electron-app/node_modules/` | Dependências do wrapper Electron |
| `legacy/ai-devkit-setup-v2/node_modules/` | Dependências do legado |
| `ai-devkit-v2/node_modules/` | Dependências do V2 |
| `ai-devkit-v2/vscode-extension/node_modules/` | Dependências da extensão VS Code |

---

## Mapa Conceitual — Relacionamento entre Diretórios

```
                    ┌─────────────────────────────────┐
                    │     ai-devkit-v2/ (V2 ativo)     │
                    │  66 pacotes · Web UI · 16 CIs    │
                    └──────────┬──────────────────────┘
                               │ ancestral
                               ▼
┌───────────────────────────────────────────────────────┐
│           legacy/ (Projeto original preservado)        │
│       ai-devkit-setup-v2 · future-updates             │
└───────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │       IDEIA/ (Core atual)        │
                    │  65 pacotes · Electron · Theia   │
                    └──────────┬──────────────────────┘
                               │ plugin
                               ▼
┌───────────────────────────────────────────────────────┐
│          ideia-theia/ (Plugin Theia)                  │
│   29 sources · Widgets · Serviços · LLM              │
└───────────────────────────────────────────────────────┘
                               │ integra
                               ▼
┌───────────────────────────────────────────────────────┐
│          theia-app/ (Aplicação Theia base)            │
│   Native addons · Shell integration · CONPTY          │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│         electron-app/ (Electron wrapper mínimo)       │
│          main.js + preload.js + icon                  │
└───────────────────────────────────────────────────────┘
                    ↑
┌───────────────────────────────────────────────────────┐
│      IDEIA/electron/ (Electron completo com build)    │
│      TypeScript · Instalador Windows (IDEIA.exe)      │
└───────────────────────────────────────────────────────┘

```

---

## Resumo Executivo

| Diretório | Status | Propósito Principal | Prioridade para Auditoria |
|-----------|--------|-------------------|:-------------------------:|
| `.ai/` | 🟢 Ativo | Orquestração de agentes IA | Média |
| `.github/` | 🟢 Ativo | CI/CD GitHub | Média |
| `.kilo/` | 🟡 Auxiliar | Config Kilo AI | Baixa |
| `docs/` | 🟢 Ativo | Documentação central | **Alta** |
| `scripts/` | 🟢 Ativo | Automação PowerShell | Média |
| `mockup/` | 🟢 Ativo | Mockups de interface | Baixa |
| `lib/` | 🟡 Residual | Biblioteca resquício | Baixa |
| `src-gen/` | 🟡 Gerado | Código gerado | Baixa |
| `electron-app/` | 🟡 Mínimo | Electron wrapper básico | Média |
| `ideia-theia/` | 🟢 Ativo | **Plugin Theia core** | **Alta** |
| `theia-app/` | 🟢 Ativo | **Aplicação Theia base** | **Alta** |
| `IDEIA/` | 🟢 **ATIVO PRINCIPAL** | **Monorepo core (65 pacotes)** | **Crítica** |
| `legacy/` | 🔴 Preservado | Código histórico | Baixa (referência) |
| `ai-devkit-v2/` | 🟡 **Duplicado** | Cópia V2 do ecossistema | **Alta** (comparação) |
| `node_modules/` | 🟡 Runtime | Dependências (11 locais) | Média |
