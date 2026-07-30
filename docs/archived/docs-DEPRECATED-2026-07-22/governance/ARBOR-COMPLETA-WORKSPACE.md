# 🌳 Árvore Completa do Workspace — IDEIA

> **Documento de Auditoria e Análise Estrutural**
> Data: 2026-07-20
> Finalidade: Mapeamento exaustivo de todos os diretórios, subdiretórios e arquivos do workspace `F:\PROJETOS\ai-devkit-workspace`
> Tamanho total: ~4,2 GB | Arquivos: ~256.053 (incluindo node_modules) | Diretórios: ~30.795

---

## Sumário

1. [Raiz do Workspace](#1-raiz-do-workspace)
2. [.ai/ — Configuração de IA e Agentes](#2-ai--configuração-de-ia-e-agentes)
3. [.github/ — Configuração GitHub](#3-github--configuração-github)
4. [.kilo/ — Configuração Kilo AI](#4-kilo--configuração-kilo-ai)
5. [docs/ — Documentação](#5-docs--documentação)
6. [scripts/ — Scripts de Automação](#6-scripts--scripts-de-automação)
7. [mockup/ — Mockups HTML](#7-mockup--mockups-html)
8. [lib/ — Biblioteca Compartilhada](#8-lib--biblioteca-compartilhada)
9. [src-gen/ — Código Gerado](#9-src-gen--código-gerado)
10. [electron-app/ — Aplicação Electron](#10-electron-app--aplicação-electron)
11. [ideia-theia/ — Plugin Theia IDEIA](#11-ideia-theia--plugin-theia-ideia)
12. [theia-app/ — Aplicação Theia](#12-theia-app--aplicação-theia)
13. [IDEIA/ — Projeto Core IDEIA](#13-ideia--projeto-core-ideia)
14. [legacy/ — Código Legado](#14-legacy--código-legado)
15. [ai-devkit-v2/ — Cópia V2 do Projeto](#15-ai-devkit-v2--cópia-v2-do-projeto)
16. [node_modules/ — Dependências](#16-node_modules--dependências)

---

## 1. Raiz do Workspace

```
F:\PROJETOS\ai-devkit-workspace\
│
├── .ai/                              → Diretório de configuração de IA (detalhado na seção 2)
├── .editorconfig                     → Configuração de editores (0,2 KB)
├── .env.example                      → Exemplo de variáveis de ambiente (0,4 KB)
├── .git/                             → Repositório Git
├── .gitattributes                    → Atributos Git (0,5 KB)
├── .gitignore                        → Arquivos ignorados pelo Git (0,6 KB)
├── .github/                          → Configurações GitHub Actions (detalhado na seção 3)
├── .kilo/                            → Configuração Kilo AI (detalhado na seção 4)
├── .node-version                     → Versão do Node.js (runtime)
├── .nvmrc                            → Versão do Node.js (nvm)
├── AGENTS.md                         → Regras e arquitetura do sistema (30,7 KB)
├── ai-devkit-v2/                     → Cópia V2 do projeto (detalhado na seção 15)
├── CHANGELOG.md                      → Registro de alterações (5,0 KB)
├── CODE_OF_CONDUCT.md                → Código de conduta (2,4 KB)
├── CONTRIBUTING.md                   → Guia de contribuição (3,0 KB)
├── devenv.md                         → Ambiente de desenvolvimento (3,5 KB)
├── docker-compose.yml                → Orquestração Docker (0,8 KB)
├── docs/                             → Documentação completa (detalhado na seção 5)
├── electron-app/                     → App Electron (detalhado na seção 10)
├── esbuild.mjs                       → Configuração esbuild (0,7 KB)
├── firebase-debug.log                → Log de debug Firebase (0,9 KB)
├── gen-esbuild.browser.mjs           → Gerador de build browser (2,6 KB)
├── gen-esbuild.node.mjs              → Gerador de build node (1,4 KB)
├── GLOSSARIO-IDEIA.md                → Glossário do projeto (17,1 KB)
├── HANDOFF-NEXT-SESSION.md           → Instruções para próxima sessão (2,4 KB)
├── ideia-theia/                      → Plugin Theia IDEIA (detalhado na seção 11)
├── IDEIA/                            → Projeto core (detalhado na seção 13)
├── legacy/                           → Código legado (detalhado na seção 14)
├── lib/                              → Biblioteca compartilhada (detalhado na seção 8)
├── LICENSE                           → Licença do projeto (1,0 KB)
├── mockup/                           → Mockups HTML (detalhado na seção 7)
├── node_modules/                     → Dependências npm
├── package-lock.json                 → Lockfile de dependências (196,3 KB)
├── package.json                      → Configuração do workspace npm (0,8 KB)
├── PLANO-IMPLEMENTACAO-CONSOLIDADO.md → Plano de implementação (10,6 KB)
├── README.md                         → Leia-me do projeto (4,9 KB)
├── sbom.json                         → SBOM - Software Bill of Materials (0,3 KB)
├── scripts/                          → Scripts de automação (detalhado na seção 6)
├── SECURITY.md                       → Política de segurança (1,3 KB)
├── src-gen/                          → Código gerado (detalhado na seção 9)
├── TASKS-ESTUDOS-INTENSIFICACAO.md   → Tasks de estudos (6,2 KB)
├── TASKS-IMPLEMENTACAO-DIRETA.md     → Tasks de implementação (4,1 KB)
├── theia-app/                        → Aplicação Theia (detalhado na seção 12)
```

---

## 2. .ai/ — Configuração de IA e Agentes

```
.ai/
├── autonomy-policy.yaml              → Política de autonomia dos agentes (N0-N4)
├── config.yaml                       → Configuração geral da esteira de IA
├── ESTEIRA-COMPARATIVO.md            → Comparativo entre esteiras de IA
├── ideia-tools.mjs                   → CLI helper da IDEIA (ferramentas)
├── README.md                         → Leia-me do diretório .ai/
│
├── agents/                           → Instruções para cada tipo de agente
│   ├── analyst/
│   │   └── instructions.md           → Instruções para agente analista
│   ├── architect/
│   │   └── instructions.md           → Instruções para agente arquiteto
│   ├── devops/
│   │   └── instructions.md           → Instruções para agente DevOps
│   ├── programmer/
│   │   └── instructions.md           → Instruções para agente programador
│   ├── reviewer/
│   │   └── instructions.md           → Instruções para agente revisor
│   └── tester/
│       └── instructions.md           → Instruções para agente testador
│
├── audit/                            → Auditoria
│   └── PATCH-MANIFEST.md             → Manifesto de patches aplicados
│
├── bin/                              → Scripts de hook Git
│   ├── post-commit.sh                → Hook pós-commit (Linux)
│   ├── pre-commit.sh                 → Hook pré-commit (Linux)
│   └── verify.sh                     → Script de verificação
│
├── context/                          → Contexto de sessão
│   ├── active-files.json             → Arquivos ativos na sessão
│   ├── current-task.json             → Task atual em execução
│   └── session.json                  → Estado da sessão atual
│
├── governance/                       → Governança
│   ├── document-registry.md          → Registro de documentos
│   ├── GAPS-PRODUCAO.md              → Gaps de produção
│   └── checklists/                   → Checklists de qualidade
│       ├── pre-commit.md             → Checklist pré-commit
│       ├── pre-deploy.md             → Checklist pré-deploy
│       └── pre-release.md            → Checklist pré-release
│
├── ide/                              → Sessões da IDE
│   └── sessions/
│       ├── 62bf6725-5c1b-488f-9c31-411ffa4238e2.json  → Sessão UUID
│       └── active.link               → Link para sessão ativa
│
├── memory/                           → Memória persistente da IA
│   ├── decisions.json                → Decisões arquiteturais
│   ├── patterns.json                 → Padrões identificados
│   └── project-context.json          → Contexto do projeto
│
├── reports/                          → Relatórios gerados
│   ├── placeholder-policy-report.json
│   ├── README.md
│   ├── review-1783451578109.md       → Review 1
│   ├── review-1783451578422.md       → Review 2
│   ├── review-1783453200173.md       → Review 3
│   ├── review-1783453287636.md       → Review 4
│   ├── supply-chain-1783453308740.md → Supply chain audit
│   └── scorecard/                    → Scorecard de qualidade
│       ├── badge.svg                 → Badge SVG
│       ├── history.json              → Histórico de scores
│       ├── latest.json               → Último score
│       ├── report.md                 → Relatório do scorecard
│       └── snapshots/
│           └── 2026-07-10-02-11-22.json  → Snapshot de score
│
└── templates/                        → Templates
    ├── adr-template.md               → Template de ADR
    ├── pr-template.md                → Template de PR
    └── task-template.md              → Template de task
```

---

## 3. .github/ — Configuração GitHub

```
.github/
├── dependabot.yml                    → Configuração do Dependabot
├── PULL_REQUEST_TEMPLATE.md          → Template de PR
├── ISSUE_TEMPLATE/                   → Templates de issues
│   ├── bug_report.md                 → Template de report de bug
│   ├── config.yml                    → Configuração de issue templates
│   └── feature_request.md            → Template de requisição de feature
└── workflows/                        → GitHub Actions
    └── ci.yml                        → Pipeline de CI
```

---

## 4. .kilo/ — Configuração Kilo AI

```
.kilo/
├── .gitignore                        → Git ignore do Kilo
├── kilo.json                         → Configuração Kilo
├── package-lock.json                 → Lockfile das dependências Kilo
├── package.json                      → Dependências Kilo (@theia, @modelcontextprotocol, zod, uuid, yaml)
└── node_modules/                     → Dependências instaladas (Theia, MCP, Zod, etc.)
```

---

## 5. docs/ — Documentação

```
docs/
├── audit-dashboard.html              → Dashboard de auditoria (HTML interativo)
├── PLANO-IMPLEMENTACAO-THEIA-MOCKUP.md → Plano de implementação Theia + Mockup
│
├── adr/                              → Architecture Decision Records
│   ├── ADR-001-theia-como-plataforma-base.md
│   ├── ADR-002-nats-jetstream-como-barramento-de-eventos.md
│   ├── ADR-003-mem0-sqlite-duckdb-como-stack-de-memoria.md
│   ├── ADR-004-langgraph-para-orquestracao-multiagente.md
│   ├── ADR-005-cedar-como-policy-engine.md
│   ├── ADR-006-dagger-github-actions-para-cicd.md
│   ├── ADR-007-estrategia-llm-slm-local-api-cloud.md
│   ├── ADR-008-adapt-para-task-decomposition.md
│   ├── ADR-009-opentelemetry-langfuse-para-observabilidade.md
│   ├── ADR-010-estrategia-de-qualidade-em-4-gates.md
│   ├── ADR-011-self-optimization-panel.md
│   ├── ADR-012-topologia-integracao.md
│   ├── ADR-013-controle-sintonia.md
│   ├── ADR-014-perfis-configuracao.md
│   ├── ADR-015-memoria-contexto.md
│   └── ADR-016-seguranca-camadas.md
│
├── ESTUDOS/                          → Estudos técnicos e estratégicos (56 documentos)
│   ├── BARRAMENTO-EVENTOS-MENSAGERIA-DISTRIBUIDA.md
│   ├── ESTUDO-AI-SAFETY-ALIGNMENT.md
│   ├── ESTUDO-AJUSTES-USUARIO-PERFIS-CONFIGURACAO.md
│   ├── ESTUDO-ANALISE-PROFUNDA-SISTEMA.md
│   ├── ESTUDO-APRENDIZADO-ADAPTATIVO-FEEDBACK-LOOP-EVOLUCAO-CROSS-PROJETO.md
│   ├── ESTUDO-AUTENTICACAO-AUTORIZACAO.md
│   ├── ESTUDO-CLOUD-INFRAESTRUTURA.md
│   ├── ESTUDO-COLABORACAO-TEMPO-REAL.md
│   ├── ESTUDO-COMPLETO-FLUXO-IDEIA-ENTREGA.md
│   ├── ESTUDO-COMPLETO-TOPOLOGIA-INTEGRACAO-IDEIA.md
│   ├── ESTUDO-CONTROLE-SEGURANCA-SINTONIA-IDEIA-IA.md
│   ├── ESTUDO-DEPLOY-ENTREGA-CONTINUA.md
│   ├── ESTUDO-DESCOBERTAS-THEIA-AI-COMPLETO.md
│   ├── ESTUDO-DESKTOP-NATIVE.md
│   ├── ESTUDO-EMPILHAMENTO-CONTRATOS-INTEGRACOES-V2-SUPLEMENTO.md
│   ├── ESTUDO-EMPILHAMENTO-CONTRATOS-INTEGRACOES.md
│   ├── ESTUDO-ENGENHARIA-PROMPTS-AGENTES.md
│   ├── ESTUDO-IMPLEMENTACAO-TECNICA-MOCKUP.md
│   ├── ESTUDO-INOVACAO-ROTEIRO-FINAL.md
│   ├── ESTUDO-INTEGRACAO-THEIA-MOCKUP-FINAL.md
│   ├── ESTUDO-INTEGRACAO-TRIPLA-THEIA-IDEIA-IA.md
│   ├── ESTUDO-INTEGRACAO-UNIFICADA-IDEIA.md
│   ├── ESTUDO-INTENSIFICACAO-BENCHMARKS-DADOS.md
│   ├── ESTUDO-INTENSIFICACAO-BLUEPRINTS-IMPLEMENTACAO.md
│   ├── ESTUDO-INTENSIFICACAO-CONSOLIDADA-TODOS-ESTUDOS.md
│   ├── ESTUDO-INTENSIFICACAO-DEEP-DIVES-TECNICOS.md
│   ├── ESTUDO-INTENSIFICACAO-IMPLEMENTACAO-REAL.md
│   ├── ESTUDO-INTENSIFICACAO-MATRIZ-CROSS-STUDIES.md
│   ├── ESTUDO-MASTER-CONSOLIDADO-EXECUCAO.md
│   ├── ESTUDO-MELHORIA-USABILIDADE-EXPERIENCIA-USUARIO.md
│   ├── ESTUDO-MOCKUP-FRONTEND-IDEIA-V2.md
│   ├── ESTUDO-MOCKUP-FRONTEND-IDEIA.md
│   ├── ESTUDO-OBSERVABILIDADE-FULLSTACK.md
│   ├── ESTUDO-PERFORMANCE-ESCALABILIDADE.md
│   ├── ESTUDO-PLUGINS-ECOSSISTEMA.md
│   ├── ESTUDO-QUALIDADE-TOTAL-IDEIA.md
│   ├── ESTUDO-SELF-OPTIMIZATION-PANEL-AUTONOMOUS-EVOLUTION.md
│   ├── ESTUDO-TERMINAL-DEBUG.md
│   ├── ESTUDO-TESTES-QUALIDADE-AUTOMATIZADA.md
│   ├── ESTUDO-TITLEBAR-CUSTOMIZACAO-TOTAL.md
│   ├── ESTUDO-UX-EXPERIENCIA-USUARIO.md
│   ├── ESTUDO-VIABILIDADE-MOCKUP-IDENTICO.md
│   ├── IDEIA-MASTER.md
│   ├── INTENT-TO-PLAN-RESEARCH.md
│   ├── MATRIZ-TECNOLOGICA-COMPLETA-V2-SUPLEMENTO.md
│   ├── MATRIZ-TECNOLOGICA-COMPLETA.md
│   ├── MEMORIA-E-CONTEXTO-PESQUISA.md
│   ├── ORQUESTRACAO-MULTIAGENTE-DISTRIBUIDA.md
│   ├── PIPELINE-VERIFICACAO-QUALIDADE-ENTREGA.md
│   ├── PLANO-IMPLEMENTACAO-IDEIA-DETALHADO-V2.md
│   ├── PLANO-IMPLEMENTACAO-IDEIA-DETALHADO.md
│   ├── SEGURANCA-PROMPT-GOVERNADOR-AI.md
│   ├── TECNOLOGIAS-EMERGENTES.md
│   ├── TEMPLATE-ANALISE-PERMANENTE.md
│   ├── THEIA-IDEIA-RESEARCH.md
│   └── VISAO-PRODUTO-IDEIA.md
│
├── governance/                       → Documentos de governança (18 documentos)
│   ├── ARCHITECTURE-DRIFT-REPORT.md
│   ├── AUDITORIA-COMPLETA-IDEIA-2026-07-18.md
│   ├── AUDITORIA-TECNICA-IDEIA.md
│   ├── document-registry.md
│   ├── DPIA-IDEIA.md
│   ├── GAPS-PRODUCAO-IDE.md
│   ├── GLOSSARIO-IDEIA.md
│   ├── GUIA-DE-INICIO-RAPIDO.md
│   ├── INVENTARIO-ATIVOS.md
│   ├── MATRIZ-COMPLIANCE-SEGURANCA.md
│   ├── PLANO-RESPOSTA-INCIDENTES.md
│   ├── POLITICA-GOVERNANCA-IDEIA.md
│   ├── POLITICA-SEGURANCA.md
│   ├── PRIVACY-POLICY.md
│   ├── REALITY-MANIFEST.md
│   ├── SECRETS-MANAGEMENT.md
│   ├── TERMS-OF-SERVICE.md
│   └── TESTES-DOS-ESTUDOS.md
│
├── legacy/                           → Documentos legados (10 documentos)
│   ├── AI-DEVKIT-REUSE-ANALYSIS.md
│   ├── IDE-GAP-ANALYSIS.md
│   ├── IDE-MVP-DEFINITION.md
│   ├── IDE-plan.md
│   ├── INTELLIGENT-MODULES-ANALYSIS.md
│   ├── MIGRACAO-AI-DEVKIT-PARA-IDEIA.md
│   ├── PLANO-DE-VALIDACAO-MVP.md
│   ├── PLANO-IMPLEMENTACAO-TECNICA-COMPLETO.md
│   ├── ROADMAP-GAP-ANALYSIS.md
│   └── theia-research-report.md
│
└── user/                             → Documentação para usuário final (5 documentos)
    ├── COMANDOS.md
    ├── CONCEITOS.md
    ├── EXEMPLOS.md
    ├── FAQ.md
    └── PRIMEIROS-PASSOS.md
```

---

## 6. scripts/ — Scripts de Automação

```
scripts/
├── audit-daemon.ps1                  → Daemon de auditoria contínua (PowerShell)
├── executar-fase-0.ps1               → Executa a Fase 0 de implementação
├── link-packages.ps1                 → Linka pacotes localmente (npm link)
├── pre-flight.ps1                    → Verificação pré-voo antes de operações
├── prepare-publish.ps1               → Prepara pacotes para publicação
├── publish-all.ps1                   → Publica todos os pacotes
├── reality-check.ps1                 → Verifica se documentação reflete código real
└── sync-docs.ps1                     → Sincroniza documentação com código
```

---

## 7. mockup/ — Mockups HTML

```
mockup/
├── ideia-theia-mockup-v2.html        → Mockup V2 da interface Theia IDEIA
└── README.md                         → Leia-me do mockup
```

---

## 8. lib/ — Biblioteca Compartilhada

```
lib/
└── frontend/
    └── index.html                    → Página HTML frontend simples
```

---

## 9. src-gen/ — Código Gerado

```
src-gen/
├── backend/
│   ├── main.js                       → Entrypoint backend gerado
│   └── server.js                     → Servidor backend gerado
└── frontend/
    ├── index.html                    → Página principal gerada
    ├── index.js                      → Script principal gerado
    ├── secondary-index.js            → Script secundário gerado
    └── secondary-window.html         → Janela secundária gerada
```

---

## 10. electron-app/ — Aplicação Electron

```
electron-app/
├── package.json                      → Configuração do app Electron
├── package-lock.json                 → Lockfile
├── assets/
│   └── icon.png                      → Ícone do aplicativo
├── src/
│   ├── main.js                       → Processo principal Electron
│   └── preload.js                    → Script preload Electron
└── node_modules/                     → Dependências
```

---

## 11. ideia-theia/ — Plugin Theia IDEIA

```
ideia-theia/
├── FLUXO-COMPLETO.md                 → Documentação do fluxo completo
├── package.json                      → Configuração do plugin Theia
├── package-lock.json                 → Lockfile
├── tsconfig.json                     → Configuração TypeScript
│
├── src/                              → Código fonte TypeScript
│   ├── browser/                      → Componentes frontend (browser)
│   │   ├── ideia-approval-widget.tsx       → Widget de aprovação
│   │   ├── ideia-chat-contribution.ts      → Contribuição de chat
│   │   ├── ideia-chat-widget.tsx           → Widget de chat
│   │   ├── ideia-dashboard-widget.tsx      → Widget de dashboard
│   │   ├── ideia-diff-widget.tsx           → Widget de diff
│   │   ├── ideia-file-widget.tsx           → Widget de arquivos
│   │   ├── ideia-frontend-module.ts        → Módulo frontend
│   │   ├── ideia-lifecycle-contribution.ts → Contribuição de ciclo de vida
│   │   ├── ideia-marker-contribution.ts    → Contribuição de marcadores
│   │   ├── ideia-output-contribution.ts    → Contribuição de output
│   │   ├── ideia-preferences-contribution.ts → Contribuição de preferências
│   │   ├── ideia-progress-contribution.ts  → Contribuição de progresso
│   │   ├── ideia-service-client.ts         → Cliente de serviços
│   │   ├── ideia-statusbar-contribution.ts → Contribuição de barra de status
│   │   ├── ideia-styles.ts                 → Estilos
│   │   ├── ideia-title-bar-widget.ts       → Widget de barra de título
│   │   └── ideia-views-contribution.ts     → Contribuição de visões
│   │
│   ├── common/                       → Código compartilhado
│   │   ├── ideia-protocol.ts         → Protocolo de comunicação
│   │   └── ideia-types.ts            → Tipos compartilhados
│   │
│   └── node/                         → Serviços backend (Node.js)
│       ├── dap-setup.ts              → Setup do DAP (Debug Adapter Protocol)
│       ├── ideia-agent-service.ts    → Serviço de agente
│       ├── ideia-backend-module.ts   → Módulo backend
│       ├── ideia-chat-service.ts     → Serviço de chat
│       ├── ideia-dashboard-service.ts → Serviço de dashboard
│       ├── ideia-memory-service.ts   → Serviço de memória
│       ├── ideia-task-service.ts     → Serviço de tarefas
│       ├── language-model-config.ts  → Configuração de modelos de linguagem
│       ├── llm-provider.ts           → Provedor LLM (Ollama, OpenAI, DeepSeek)
│       └── output-validator.ts       → Validador de output
│
├── lib/                              → Código compilado (JS + .d.ts + .js.map)
│   ├── browser/                      → Cópias compiladas dos arquivos em src/browser/
│   ├── common/                       → Cópias compiladas dos arquivos em src/common/
│   └── node/                         → Cópias compiladas dos arquivos em src/node/
│
├── style/                            → Estilos e temas
│   ├── ideia-styles.ts              → Estilos programáticos
│   ├── ideia-theme.ts               → Tema IDEIA
│   └── ideia.css                    → CSS do tema
│
└── node_modules/                     → Dependências
```

---

## 12. theia-app/ — Aplicação Theia

```
theia-app/
├── esbuild.mjs                       → Configuração de build
├── gen-esbuild.browser.mjs           → Gerador de build browser
├── gen-esbuild.node.mjs              → Gerador de build node
├── package.json                      → Configuração da aplicação
├── package-lock.json                 → Lockfile
├── tsconfig.json                     → Configuração TypeScript
│
├── src/                              → Código fonte
│   ├── backend.ts                    → Backend
│   ├── main.ts                       → Entrypoint principal
│   ├── welcome.html                  → Tela de boas-vindas
│   └── backend/
│       └── main.js                   → Backend compilado
│
├── scripts/                          → Scripts auxiliares
│   ├── start-all.js                  → Inicia todos os serviços
│   └── test-plugin.ps1              → Testa o plugin Theia
│
├── lib/                              → Biblioteca compilada
│   ├── backend/
│   │   ├── conpty_console_list_agent.js    → Agente de listagem CONPTY
│   │   ├── ipc-bootstrap.js               → Bootstrap IPC
│   │   ├── main.js                        → Backend principal
│   │   ├── parcel-watcher.js              → Watcher de arquivos (parcel)
│   │   ├── windows-trash.exe              → Utilitário de lixeira Windows
│   │   ├── native/                        → Módulos nativos
│   │   │   ├── drivelist.node             → Listagem de drives
│   │   │   ├── keytar.node                → Gerenciamento de chaves
│   │   │   ├── rg.exe                     → Ripgrep (busca rápida)
│   │   │   └── watcher.node               → File watcher nativo
│   │   ├── shell-integrations/            → Integrações com shell
│   │   │   ├── bash/
│   │   │   │   ├── bash-integration.bash
│   │   │   │   └── command-block-support.bash
│   │   │   └── zsh/
│   │   │       ├── command-block-support.zsh
│   │   │       ├── zsh-integration.zsh
│   │   │       └── zdotdir/
│   │   │           └── source-original.zsh
│   │   └── worker/
│   │       └── conoutSocketWorker.js       → Worker de socket CONOUT
│   │
│   ├── frontend/                     → Frontend compilado
│   │   ├── bundle.css                → CSS do bundle
│   │   ├── bundle.js                 → JS do bundle
│   │   ├── editor.worker.js          → Worker do editor Monaco
│   │   ├── index.html                → Página principal
│   │   ├── secondary-window.css      → CSS da janela secundária
│   │   ├── secondary-window.html     → HTML da janela secundária
│   │   └── secondary-window.js       → JS da janela secundária
│   │
│   └── prebuilds/
│       └── win32-x64/                → Binários pré-compilados (Windows x64)
│           ├── conpty/
│           │   ├── conpty.dll        → DLL do CONPTY
│           │   └── OpenConsole.exe   → Console nativo Windows
│           ├── conpty.node           → Native addon CONPTY
│           └── conpty_console_list.node → Native addon listagem console
│
├── src-gen/                          → Código gerado
│   ├── backend/
│   │   ├── main.js                   → Backend gerado
│   │   └── server.js                 → Servidor gerado
│   └── frontend/
│       ├── index.html                → Frontend gerado
│       ├── index.js                  → Script gerado
│       ├── secondary-index.js        → Script secundário gerado
│       └── secondary-window.html     → Janela secundária gerada
│
└── node_modules/                     → Dependências
```

---

## 13. IDEIA/ — Projeto Core IDEIA

```
IDEIA/
├── .editorconfig                    → Configuração de editores
├── .gitignore                       → Arquivos ignorados
├── .ai/
│   └── memory.json                  → Memória da IA
├── AGENTS.md                        → Regras e arquitetura
├── README.md                        → Leia-me do projeto core
├── PLANO-REESTRUTURACAO-COMPLETO.md → Plano de reestruturação
├── esbuild.mjs                      → Configuração de build
├── gen-esbuild.browser.mjs          → Gerador browser
├── gen-esbuild.node.mjs             → Gerador node
├── package.json                     → Configuração raiz
├── package-lock.json                → Lockfile
├── tsconfig.base.json               → Base TypeScript
├── tsconfig.json                    → Configuração TypeScript
│
├── apps/                            → Aplicações
│   └── ideia-app/                   → Aplicação Theia IDEIA
│       ├── esbuild.mjs
│       ├── gen-esbuild.browser.mjs
│       ├── gen-esbuild.electron.mjs
│       ├── gen-esbuild.node.mjs
│       ├── package.json
│       ├── package-lock.json
│       ├── tsconfig.json
│       ├── scripts/
│       │   ├── start-all.js         → Inicia todos os serviços
│       │   └── test-plugin.ps1     → Testa o plugin
│       ├── src/
│       │   ├── backend.ts           → Backend
│       │   ├── main.ts              → Entrypoint
│       │   ├── welcome.html         → Tela de boas-vindas
│       │   └── backend/
│       │       └── main.js          → Backend compilado
│       ├── src-gen/                 → Código gerado (mesma estrutura do src-gen raiz)
│       └── lib/                     → Biblioteca compilada (mesma estrutura do theia-app/lib/)
│
├── docs/                            → Documentação (estrutura reduzida)
│   ├── adr/                         → Vazio (placeholder)
│   ├── user/                        → Vazio (placeholder)
│   ├── governance/
│   │   ├── document-registry.md
│   │   ├── REALITY-MANIFEST.md
│   │   └── RELATORIO-VALIDACAO-FINAL.md
│   └── estudos-analise/
│       ├── ESTUDO-ANALISE-CONSOLIDADA-MESTRE.md
│       ├── PLANO-EXECUCAO-INTEGRAL.md
│       ├── completude/              → Vazio (placeholder)
│       ├── contratos/               → Vazio (placeholder)
│       ├── erros/                   → Vazio (placeholder)
│       ├── fluxo-dados/             → Vazio (placeholder)
│       ├── integracao/              → Vazio (placeholder)
│       ├── performance/             → Vazio (placeholder)
│       └── seguranca/               → Vazio (placeholder)
│
├── lib/                             → Biblioteca compilada (subset)
│   ├── backend/
│   │   ├── ipc-bootstrap.js
│   │   ├── main.js
│   │   └── native/
│   │       ├── drivelist.node
│   │       ├── keytar.node
│   │       └── watcher.node
│   └── frontend/
│       ├── bundle.css
│       ├── bundle.js
│       ├── index.html
│       ├── secondary-window.css
│       ├── secondary-window.html
│       └── secondary-window.js
│
├── mockup/
│   └── ideia-theia-mockup-v2.html   → Mockup V2 (cópia)
│
├── scripts/
│   ├── build-installer.js           → Build do instalador
│   └── verify-migration.js          → Verificação de migração
│
├── src-gen/                         → Código gerado (mesma estrutura do src-gen raiz)
│
├── electron/                        → App Electron (completo com build)
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── app-build.log
│   ├── test-backend.js
│   ├── assets/
│   │   └── icon.png
│   ├── src/
│   │   ├── installer.ts             → Instalador
│   │   ├── main.ts                  → Processo principal
│   │   └── preload.ts              → Preload
│   ├── dist/                        → TypeScript compilado
│   ├── dist-installer/              → Build do instalador Electron
│   │   └── win-unpacked/            → App descompactado (Windows)
│   │       ├── IDEIA.exe            → Executável principal
│   │       ├── chrome_*.pak         → Recursos Chrome
│   │       ├── *.dll                → DLLs do Electron
│   │       ├── locales/             → 55 arquivos .pak de localização
│   │       └── resources/
│   │           ├── app.asar         → App empacotado
│   │           └── theia-backend/   → Backend Theia incluído no instalador
│   ├── electron-app/                → App Electron wrapper
│   └── lib/                         → Biblioteca (mesma estrutura do theia-app/lib/)
│
├── node_modules/                    → Dependências
│
└── packages/                        → 65 pacotes core do monorepo
    │
    ├── a11y-scanner/               → @ideia/a11y-scanner
    ├── adapter-dart/               → @ideia/adapter-dart
    ├── adapter-elixir/             → @ideia/adapter-elixir
    ├── adapter-fastapi/            → @ideia/adapter-fastapi
    ├── adapter-go/                 → @ideia/adapter-go
    ├── adapter-haskell/            → @ideia/adapter-haskell
    ├── adapter-java/               → @ideia/adapter-java
    ├── adapter-kotlin/             → @ideia/adapter-kotlin
    ├── adapter-nestjs/             → @ideia/adapter-nestjs
    ├── adapter-php/                → @ideia/adapter-php
    ├── adapter-ruby/               → @ideia/adapter-ruby
    ├── adapter-scala/              → @ideia/adapter-scala
    ├── adapter-swift/              → @ideia/adapter-swift
    ├── adapter-zig/                → @ideia/adapter-zig
    ├── agent-benchmark/            → @ideia/agent-benchmark
    ├── agent-identity/             → @ideia/agent-identity
    ├── agent-runtime/              → @ideia/agent-runtime
    ├── architecture-adr/           → @ideia/architecture-adr
    ├── audit-trail/                → @ideia/audit-trail
    ├── autonomous-editor/          → @ideia/autonomous-editor
    ├── cli/                        → @ideia/cli
    ├── contract-cdc/               → @ideia/contract-cdc
    ├── contracts/                  → @ideia/contracts
    ├── core/                       → @ideia/core (deprecated)
    ├── correction-oracle/          → @ideia/correction-oracle
    ├── data-layer/                 → @ideia/data-layer
    ├── delivery-orchestrator/      → @ideia/delivery-orchestrator
    ├── diff-engine/                → @ideia/diff-engine
    ├── docs-generator/             → @ideia/docs-generator
    ├── economic-control/           → @ideia/economic-control
    ├── event-bus/                  → @ideia/event-bus
    ├── execution-layer/            → @ideia/execution-layer
    ├── external-connectors/        → @ideia/external-connectors
    ├── feedback-pipeline/          → @ideia/feedback-pipeline
    ├── ide-integration/            → @ideia/ide-integration
    ├── ideia-plugin/               → @ideia/plugin (plugin Theia)
    ├── llm-provider/               → @ideia/llm-provider
    ├── logger/                     → @ideia/logger
    ├── mcp/                        → @ideia/mcp
    ├── memory-store/               → @ideia/memory-store
    ├── observability-engine/       → @ideia/observability-engine
    ├── onboarding-engine/          → @ideia/onboarding-engine
    ├── org-trust/                  → @ideia/org-trust
    ├── performance-monitor/        → @ideia/performance-monitor
    ├── persistent-instructions/    → @ideia/persistent-instructions
    ├── plugin-sdk/                 → @ideia/plugin-sdk
    ├── policy-engine/              → @ideia/policy-engine
    ├── policy-gateway/             → @ideia/policy-gateway
    ├── prompt-security/            → @ideia/prompt-security
    ├── prototyping-engine/         → @ideia/prototyping-engine
    ├── real-data/                  → @ideia/real-data
    ├── reality-sync/               → @ideia/reality-sync
    ├── requirements-engine/        → @ideia/requirements-engine
    ├── resilience-engine/          → @ideia/resilience-engine
    ├── schema-registry/            → @ideia/schema-registry
    ├── security-middleware/        → @ideia/security-middleware
    ├── spec-generator/             → @ideia/spec-generator
    ├── terminal-sandbox/           → @ideia/terminal-sandbox
    ├── trace-propagation/          → @ideia/trace-propagation
    ├── trace-registry/             → @ideia/trace-registry
    ├── trusted-context/            → @ideia/trusted-context
    ├── vector-store/               → @ideia/vector-store
    ├── verification-layer/         → @ideia/verification-layer
    ├── violation-registry/         → @ideia/violation-registry
    └── workflow-engine/            → @ideia/workflow-engine
```

---

## 14. legacy/ — Código Legado

```
legacy/
│
├── ai-devkit-setup-v2/              → Cópia completa do ai-devkit-v2 (completo)
│   ├── .ai/                         → Configuração de IA
│   ├── .ai-devkit/                  → Configuração do devkit
│   ├── .amazonq/                    → Configuração Amazon Q
│   ├── .cursor/                     → Configuração Cursor IDE
│   ├── .github/                     → GitHub Actions
│   ├── .kilo/                       → Kilo AI
│   ├── .windsurf/                   → Configuração Windsurf
│   ├── coverage/                    → Relatórios de cobertura
│   ├── docs/                        → Documentação
│   ├── node_modules/                → Dependências
│   ├── packages/                    → 57 pacotes (quase mesmo que ai-devkit-v2)
│   ├── plans/                       → Planos de estudos (37 documentos)
│   │   ├── estudos/                 → Estudos técnicos numerados (00-INDICE.md a 37-AI-SCHEDULER.md)
│   │   └── future/                  → Planos futuros (f00 a f30)
│   ├── prompts/                     → Templates de prompts
│   ├── scripts/                     → Scripts de aceleração, auditoria, teste
│   │   ├── acceleration/            → 50+ módulos (engine, optimizer, planner, executor, etc.)
│   │   ├── audit/                   → Scripts de auditoria
│   │   ├── __tests__/               → Testes dos scripts
│   │   └── evolve-metrics/          → Métricas de evolução
│   ├── src/                         → Código fonte de qualidade
│   │   └── quality/                 → contract-audit, coverage-report, flow-audit, scorecard
│   ├── templates/                   → Templates de projeto (10 linguagens)
│   └── vscode-extension/            → Extensão VS Code (src/ + dist/)
│
├── future-updates-ai-devkit/        → Documentos de atualizações futuras
│   ├── ai-pre-process.md            → Pré-processamento de IA
│   ├── expert-smart-updates.md      → Atualizações inteligentes
│   ├── GAP-ANALYSIS-II.md           → Análise de gaps V2
│   ├── master-audit-max.md          → Auditoria máxima
│   ├── smart-opt-p2.md              → Otimização inteligente P2
│   └── smart-optimization.md        → Otimização inteligente
```

---

## 15. ai-devkit-v2/ — Cópia V2 do Projeto

```
ai-devkit-v2/
├── .ai/                              → Configuração de IA
├── .ai-devkit/                       → Configuração do devkit
├── .amazonq/                         → Configuração Amazon Q
├── .changeset/                       → Changesets para versionamento
├── .cursor/                          → Configuração Cursor IDE
├── .github/                          → GitHub (16 workflows, templates, configs)
│   ├── ISSUE_TEMPLATE/
│   ├── workflows/                    → 16 workflows (ci, cd, release, security, codeql, etc.)
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── CODEOWNERS
│   ├── FUNDING.yml
│   ├── copilot-instructions.md
│   └── ai-instructions.md
├── .husky/                           → Git hooks
├── .infra/                           → Configuração de infraestrutura
├── .kilo/                            → Kilo AI
├── .metrics/                         → Métricas
├── .windsurf/                        → Configuração Windsurf
├── apps/                             → Aplicações
│   └── api/                          → API server (src/routes/approve.ts)
├── contracts/                        → Schemas JSON (audit, session, task, workspace)
├── coverage/                         → Relatórios de cobertura
├── dist/                             → Código compilado
├── docs/                             → Documentação detalhada
│   ├── 01-fundamentos/               → Fundamentos
│   ├── 02-arquitetura/               → Arquitetura
│   ├── 03-roadmap/                   → Roadmap
│   ├── 04-operacao/                  → Operação
│   ├── 05-ias/                       → IAs
│   ├── 06-execucao/                  → Execução
│   ├── 07-consolidacao/              → Consolidação
│   ├── api/                          → OpenAPI, AsyncAPI
│   ├── audit/                        → Relatórios de auditoria
│   ├── ESTUDOS/                      → 14 estudos com subdiretórios
│   │   ├── G1-EVENT-BUS/ a G7-HEALTH-CHECK/ → 7 gaps
│   │   └── OP1- a OP7- → 7 oportunidades
│   └── governance/                   → 30+ documentos de governança
├── memory/                           → Persistência de memória
├── packages/                         → 66 pacotes (mesmos 65 da IDEIA + web-ui + e2e-tests)
├── plans/                            → 50+ planos de estudo numerados
│   ├── estudos/                      → 00-INDICE.md a 60-TESTES-CARGA-IDE.md
│   └── future/                       → Planos futuros
├── policies/                         → Políticas (security.policy.yaml)
├── prompts/                          → 8 templates de prompt do sistema
├── scripts/                          → Scripts de automação
│   ├── acceleration/                 → 50+ módulos de aceleração
│   ├── audit/                        → Scripts de auditoria
│   ├── benchmark/                    → Benchmarks (audit-trail, event-bus, policy)
│   ├── evolve-metrics/              → Métricas
│   └── __tests__/                    → Testes dos scripts
├── src/                              → Código fonte de qualidade
│   └── quality/                      → contract-audit, coverage-report, flow-audit, scorecard
├── templates/                        → Templates de projeto (10 linguagens)
├── tests/                            → Testes de integração e performance
├── vscode-extension/                 → Extensão VS Code
├── node_modules/                     → Dependências
├── package.json, tsconfig.json, etc. → Configs raiz
├── README.md, AGENTS.md, CHANGELOG.md → Documentação raiz
├── CLAUDE.md, GEMINI.md              → Configs para IAs específicas
├── CLI entrypoints (cli-entry.mjs, start-ide.js, etc.)
└── Scripts de instalação (iniciar.bat, iniciar.ps1, install-*.ps1)
```

---

## 16. node_modules/ — Dependências

> Nota: `node_modules/` existe em múltiplos locais. Abaixo os locais identificados:

```
/ai-devkit-workspace/node_modules/                    → Dependências raiz do workspace npm
/ai-devkit-workspace/.kilo/node_modules/              → Dependências do Kilo AI
/ai-devkit-workspace/electron-app/node_modules/       → Dependências do Electron app
/ai-devkit-workspace/ideia-theia/node_modules/        → Dependências do plugin Theia
/ai-devkit-workspace/theia-app/node_modules/          → Dependências da aplicação Theia
/ai-devkit-workspace/IDEIA/node_modules/              → Dependências do projeto core
/ai-devkit-workspace/IDEIA/apps/ideia-app/node_modules/ → Dependências da app Theia
/ai-devkit-workspace/IDEIA/electron/node_modules/     → Dependências do Electron core
/ai-devkit-workspace/IDEIA/electron/electron-app/node_modules/ → Dependências do wrapper Electron
/ai-devkit-workspace/legacy/ai-devkit-setup-v2/node_modules/  → Dependências do legado
/ai-devkit-workspace/ai-devkit-v2/node_modules/       → Dependências do V2
/ai-devkit-workspace/ai-devkit-v2/vscode-extension/node_modules/ → Dependências da extensão VS Code
```

---

## Legenda de Estrutura de Pacote (padrão)

A maioria dos 65 pacotes em `IDEIA/packages/` segue esta estrutura:

```
<nome-pacote>/
├── package.json              → Nome, versão, dependências (@ideia/<nome>)
├── README.md                 → Documentação do pacote
├── tsconfig.json             → Configuração TypeScript
├── jest.config.js            → Configuração de testes
├── tsconfig.tsbuildinfo      → Build incremental
├── src/                      → Código fonte TypeScript
│   ├── index.ts              → Entrypoint
│   ├── <modulo>.ts           → Implementação principal
│   └── types.ts              → Definições de tipos
├── dist/                     → Código compilado
│   ├── index.js              → JS compilado
│   ├── index.d.ts            → Declarações de tipo
│   ├── index.js.map          → Source map
│   └── ...                   → Demais arquivos compilados
└── __tests__/                → Testes unitários
    └── <modulo>.test.ts      → Teste
```

---

## Estatísticas Gerais

| Métrica | Valor |
|---------|-------|
| Diretórios raiz | 15 diretórios principais |
| Total de arquivos (excl. node_modules) | ~1.200+ |
| Total de arquivos (incl. node_modules) | ~256.053 |
| Total de diretórios | ~30.795 |
| Tamanho total | ~4,2 GB |
| Pacotes no monorepo | 65 (IDEIA) + 66 (ai-devkit-v2) + 57 (legacy) |
| Documentos de estudo | 56 (workspace raiz) + 50+ (ai-devkit-v2) + 37 (legacy) |
| ADRs | 16 |
| Documentos de governança | 18 (raiz) + 30+ (ai-devkit-v2) + 3 (IDEIA) |
| Scripts PowerShell | 8 (raiz) + 2 (IDEIA) |
| Componentes React frontend | 30+ (ai-devkit-v2/web-ui) |
| Arquivos fonte Theia Plugin | 29 (17 browser + 2 common + 10 node) |
| Agentes de IA configurados | 6 (analyst, architect, devops, programmer, reviewer, tester) |
