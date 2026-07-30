# Estudo de Integração Final — Theia + Mockup + Backend + IA

> **Data:** 2026-07-18
> **Propósito:** Mapear a integração completa entre o mockup IDEIA, as capacidades nativas do Theia 1.73, o backend existente (35 endpoints), e os serviços de IA, criando uma arquitetura onde TUDO é reaproveitável.
> **Decisão:** ✅ A interface da IDEIA SERÁ o mockup. Qualquer UI diferente é descartada. O código do mockup é copiado para o projeto e adaptado.

---

## 1. Decisão Arquitetural

### 1.1 O Que é Descartado

| Componente | Motivo | Substituído por |
|-----------|--------|----------------|
| **App.tsx** (layout sidebar tabs) | Layout difere do mockup (activity bar) | NOVO App.tsx baseado no mockup |
| **DashboardMode.tsx** (full-page) | Mockup tem dashboard como right panel | Widget no right panel |
| **AgentMode.tsx** (full-page) | Mockup tem agent como right panel | Theia ChatAgent |
| **EditorMode.tsx** (wrapper) | Monaco já é gerenciado pelo Theia | Theia Editor + webview |
| **StatusBar.tsx** | Theia tem StatusBar nativo | `@theia/core` StatusBar |
| **CommandPalette.tsx** | Theia tem Quick Open nativo | `@theia/core` QuickOpen |
| **SettingsModal.tsx** | Theia tem Preferences nativo | `@theia/preferences` |
| **FileExplorer.tsx** | Theia tem Navigator nativo | `@theia/navigator` |
| **Terminal.tsx** | Theia tem Terminal nativo | `@theia/terminal` |
| **ProblemsPanel.tsx** | Theia tem Problems nativo | `@theia/core` Problems |
| **OutlinePanel.tsx** | Theia tem Outline nativo | `@theia/editor` Outline |

### 1.2 O Que é MANTIDO e Adaptado

| Componente | Motivo | Ação |
|-----------|--------|------|
| **ChatPanel.tsx** | Theia AI Chat pode substituir parcialmente | Usar `@theia/ai-chat` como base + IDEIA customizations |
| **DebugPanel.tsx** | Theia DAP + DAP bridge | Conectar ao `@theia/debug` |
| **DiffViewer.tsx** | Theia tem Monaco diff | Adaptar para Monaco integrado |
| **PatchPreview.tsx** | Específico do fluxo IDEIA | Manter próprio |
| **DecisionCenter.tsx** | Específico IDEIA | Manter próprio |
| **SelfChat.tsx** | Específico IDEIA (auto-diálogo IA) | Manter próprio |
| **AutonomyControlTower.tsx** | Específico IDEIA | Manter próprio |
| **SelfOptimizationPanel.tsx** | Específico IDEIA | Manter próprio |
| **QualityDashboard.tsx** | Específico IDEIA | Manter próprio |

### 1.3 O Que é COPIADO do Mockup

| Seção do Mockup | Linhas | Ação |
|----------------|--------|------|
| Title Bar (9 menus) | 70 | Copiar HTML → Theia MenuContributions |
| Activity Bar (9+ ícones) | 60 | Copiar HTML → Theia ViewContributions |
| Sidebar (file tree) | 80 | Theia Navigator (não copiar) |
| Editor (tabs + code) | 100 | Theia Monaco (não copiar) |
| Bottom Terminal | 50 | Theia Terminal (não copiar) |
| **Dashboard Panel** | 180 | **Copiar → React component** |
| **Studies Panel** | 100 | **Copiar → React component** |
| **Approvals Panel** | 120 | **Copiar → React component** |
| **Suggestions Panel** | 100 | **Copiar → React component** |
| CSS Theme (variáveis) | 80 | Copiar → `ideia.css` → Theia Theme |

---

## 2. Catálogo de Capacidades Theia 1.73 para Reuso

### 2.1 Theia Core — Infraestrutura da IDE

| Capacidade | Fornece | Como a IDEIA usa | Reuso por Backend | Reuso por IA |
|-----------|---------|-----------------|-------------------|-------------|
| **MenuContribution** | Menus na title bar | File, Edit, View, Go, Run, Terminal, Help, IDEIA | — | — |
| **CommandContribution** | Comandos com atalhos | Ctrl+S (save), Ctrl+Shift+P (prefs) | `POST /api/commands` expõe comandos | IA chama comandos via API |
| **KeybindingContribution** | Atalhos de teclado | F5 (debug), Ctrl+` (terminal) | — | — |
| **ViewContribution** | Painéis na IDE | File Explorer, Search, Git | — | IA abre/fecha painéis |
| **PreferenceService** | Configurações do usuário | Tema, fontes, LLM provider | `GET/POST /api/workspace/config` | IA lê/configura preferências |
| **MessageService** | Notificações toast | "Arquivo salvo" | — | IA envia notificações |
| **StatusBar** | Barra de status inferior | Modo, branch git, erros | `GET /api/ide/status` | IA lê status atual |
| **OpenerService** | Abrir arquivos/URIs | Clique em arquivo abre no editor | — | IA abre arquivos |
| **LabelProvider** | Ícones e nomes de arquivos | Ícones na file tree | — | IA consulta tipo de arquivo |

### 2.2 Theia Editor + Monaco

| Capacidade | Fornece | Reuso por Backend | Reuso por IA |
|-----------|---------|-------------------|-------------|
| **EditorManager** | Abrir/fechar/gerenciar editors | — | IA abre arquivos no editor |
| **EditorCommands** | Save, close, navigate | — | IA executa ações no editor |
| **MonacoEditor** | Editor com syntax highlight | — | IA insere texto |
| **DiffComputer** | Calcular diff entre versões | `GET /api/git/diff` | IA vê diferenças |
| **NavigationService** | Go to definition, references | — | IA navega no código |

### 2.3 Theia AI — Inteligência

| Capacidade | Fornece | Reuso por Backend | Reuso por IA | Substitui o quê no IDEIA |
|-----------|---------|-------------------|-------------|------------------------|
| **LanguageModelService** | Gerenciar modelos LLM | `POST /api/chat/completions` | IA usa o mesmo serviço | Substitui `llm-provider.ts` manual |
| **ChatAgentService** | Registrar agentes de chat | Agentes expostos via API | IA invoca outros agentes | Substitui `AgentRuntime` manual |
| **ChatService** | Chat com streaming SSE | `POST /api/chat/completions` | IA participa do chat | Substitui SSE manual |
| **ToolInvocationRegistry** | Ferramentas que agentes chamam | Tools expostas via API | IA chama tools do sistema | Substitui `executeToolCall()` manual |
| **ChangeSet** | Gerenciar mudanças com undo/redo | `POST /api/fs/write` com versionamento | IA faz alterações com rollback | Substitui `TaskRunner.applyChanges()` |
| **PromptService** | Gerenciar prompts do sistema | Templates de prompt via API | IA recebe prompts otimizados | Substitui `buildSystemPrompt()` manual |
| **VariableService** | Variáveis de contexto | Contexto do projeto via API | IA tem acesso ao contexto | Substitui `buildLLMMessages()` manual |
| **SkillService** | Habilidades dos agentes | Skills expostas via API | IA usa skills como ferramentas | Framework de agentes |
| **ChatSessionStore** | Persistir sessões de chat | Histórico via API | IA resume sessões anteriores | Substitui `Conversation` Map manual |
| **AgentService** | Gerenciar ciclo de vida | `GET /api/agents` | IA monitora outros agentes | Substitui `AgentService` manual |

### 2.4 Theia Terminal

| Capacidade | Fornece | Reuso por Backend | Reuso por IA |
|-----------|---------|-------------------|-------------|
| **TerminalService** | Criar/gerenciar terminais | — | IA executa comandos |
| **TerminalCommands** | Novo terminal, matar terminal | `POST /api/shell` | IA cria terminais |
| **TerminalWidget** | UI do terminal (xterm.js) | — | IA vê output |

### 2.5 Theia File System

| Capacidade | Fornece | Reuso por Backend | Reuso por IA |
|-----------|---------|-------------------|-------------|
| **FileService** | CRUD de arquivos | `GET/POST /api/fs/*` | IA lê/escreve arquivos |
| **FileNavigator** | Árvore de diretórios | — | IA navega no projeto |
| **FileSearchService** | Busca de arquivos | `GET /api/fs/search` | IA encontra arquivos |
| **FileWatcher** | Monitorar mudanças | WebSocket `file:change` | IA reage a mudanças |

### 2.6 Theia Debug (DAP)

| Capacidade | Fornece | Reuso por Backend | Reuso por IA |
|-----------|---------|-------------------|-------------|
| **DebugService** | Gerenciar sessões de debug | `ws://host/dap` | IA inicia/para debug |
| **DebugCommands** | Continue, step, pause | DAP protocol | IA controla execução |
| **DebugWidget** | UI de debug (stack, vars) | — | IA vê estado do debug |
| **BreakpointManager** | Gerenciar breakpoints | DAP protocol | IA adiciona breakpoints |

---

## 3. Arquitetura: Theia como Centro do Ecossistema

### 3.1 Fluxo Unificado

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       THEIA ELECTRON APP                                │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  THEIA SHELL (Native)                                            │   │
│  │                                                                   │   │
│  │  Menus: File Edit Selection View Go Run Terminal Help IDEIA     │   │
│  │  Activity Bar: 9 icons                                           │   │
│  │  Status Bar: branch, errors, mode, LLM provider                  │   │
│  │                                                                   │   │
│  │  ┌────────────┐  ┌──────────────────┐  ┌──────────────────┐    │   │
│  │  │ LEFT PANEL  │  │  MAIN AREA       │  │  RIGHT PANEL     │    │   │
│  │  │ (Theia)     │  │  (Theia Editor)  │  │  (IDEIA Memory)  │    │   │
│  │  │             │  │                  │  │                  │    │   │
│  │  │ Files       │  │ Monaco Editor    │  │ Dashboard       │    │   │
│  │  │ Search      │  │ + Debug          │  │ Studies         │    │   │
│  │  │ Git         │  │ + Diff           │  │ Approvals       │    │   │
│  │  │ Outline     │  │ + Preview        │  │ Suggestions     │    │   │
│  │  │             │  │                  │  │ Agent Chat      │    │   │
│  │  └────────────┘  └──────────────────┘  └──────────────────┘    │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ BOTTOM PANEL                                             │    │   │
│  │  │ Terminal (Theia) │ Problems │ Output │ Debug Console    │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ├────── @theia/ai-core (LanguageModel, ChatAgent, Tool, Variable) ──┤ │
│  ├────── @theia/editor (Monaco) ── @theia/terminal ── @theia/debug ─┤ │
│                                                                         │
│  ├────────────────────── REST API (:3001) ──────────────────────────┤  │
│  │  35 endpoints: fs, shell, git, memory, audit, preview, chat...    │  │
│  ├────────────────────── WebSocket ───────────────────────────────┤  │
│  │  /ws (file:change)  /pty (terminal)  /lsp (LSP)  /dap (debug)   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Expondo Theia como API para Backend e IA

Toda capacidade do Theia deve ser exposta como endpoint REST ou WebSocket, para que:
- O **backend** (apps/api) possa chamar
- A **IA** (agent-runtime, prompt-pipeline) possa usar via ferramentas

| Capacidade Theia | Exposto como | Quem usa |
|-----------------|-------------|----------|
| LanguageModelService | `POST /api/chat/completions` | Chat, IA, Agentes |
| EditorManager | `POST /api/fs/write` + `ws://host/lsp` | IA escreve código |
| FileService | `GET/POST /api/fs/*` | IA lê/escreve |
| TerminalService | `POST /api/shell` + `ws://host/pty` | IA executa comandos |
| DebugService | `ws://host/dap` | IA debuga código |
| ChatSessionStore | `GET /api/chat/history` | IA resume sessões |
| ChangeSet | `POST /api/fs/write` (com diff) | IA com undo |
| PreferenceService | `GET/POST /api/workspace/config` | IA configurada |
| ToolInvocationRegistry | `GET /api/tools` (ferramentas disponíveis) | IA descobre ferramentas |
| AgentService | `GET /api/agents` | IA monitora agentes |

### 3.3 Integração IA ↔ Theia

A IA (agentes) deve poder chamar QUALQUER funcionalidade do Theia via API:

```
IA (agente) → ToolInvocationRegistry → REST API → Theia Service → Result
                                                                       ↓
IA recebe resultado ← API Response ←───────────────┘
```

**Exemplo:** IA quer debugar um arquivo:
```
1. IA decide: "preciso debugar este arquivo"
2. IA chama tool: debug.attach({ file: "server.ts" })
3. ToolInvocationRegistry resolve → POST /api/debug/attach
4. Backend usa DebugService do Theia → attach DAP
5. DAP responde com breakpoints, stack
6. Resultado volta para IA
7. IA analisa o stack e decide próximo passo
```

---

## 4. Plano de Migração: web-ui → Theia + Mockup

### 4.1 O Que Copiar do Mockup

| Seção mockup | Copiar para | Adaptações |
|-------------|------------|------------|
| Title Bar HTML | `ideia-theia/src/browser/ideia-menu-contribution.ts` | Converter para `MenuContribution` do Theia |
| Activity Bar HTML | `ideia-theia/src/browser/ideia-view-contribution.ts` | Converter para `ViewContribution` do Theia |
| Dashboard HTML | `web-ui/src/components/DashboardPanel.tsx` | Adaptar JSX para React com dados reais |
| Studies HTML | `web-ui/src/components/StudiesPanel.tsx` | Adaptar JSX para React |
| Approvals HTML | `web-ui/src/components/ApprovalsPanel.tsx` | Adaptar JSX para React |
| Suggestions HTML | `web-ui/src/components/SuggestionsPanel.tsx` | Adaptar JSX para React |
| CSS Variables | `style/ideia.css` | Adaptar para Theia theme |
| Search Overlay | Theia Quick Open (não copiar) | Usar nativo |

### 4.2 O Que Os Painéis Chamam de API

| Painel | Endpoints Chamados | Resposta Mockup → Real |
|--------|-------------------|----------------------|
| **Dashboard** | `GET /api/diagnostics` | tests: 1.247 → Jest output real |
| | `GET /api/ide/status` | coverage: 87% → `jest --coverage` |
| | | gaps: 8 → GAPS doc parse |
| **Studies** | `GET /api/studies` | Lista de estudos → `docs/ESTUDOS/` scan |
| | `GET /api/studies?q=` | Busca textual |
| **Approvals** | `GET /api/approvals` | Pendências → PolicyEngine + AuditTrail |
| | `POST /api/approvals/:id/approve` | Aprovar → AuditTrail.append |
| | `POST /api/approvals/:id/reject` | Rejeitar → AuditTrail.append |
| **Suggestions** | `GET /api/suggestions` | Sugestões → CorrectionOracle + FeedbackPipeline |
| | `POST /api/suggestions/:id/apply` | Aplicar → AgentRuntime.execute |

### 4.3 O Que os Endpoints Chamam no Theia

| Endpoint | Dados de | Serviço Theia |
|----------|---------|--------------|
| `GET /api/diagnostics` | Jest + TSC output | `FileService` (ler relatórios) |
| `GET /api/studies` | `docs/ESTUDOS/` scan | `FileService` (ler diretório) |
| `GET /api/studies?q=` | Busca textual | `FileSearchService` |
| `GET /api/approvals` | AuditTrail + Checkpoints | `FileService` (ler JSON) |
| `POST /api/approvals/:id/approve` | AuditTrail.append | `FileService` (append JSONL) |
| `GET /api/suggestions` | CorrectionOracle | `AgentService` (analisar) |
| `ws://host/dap` | DAP protocol | `DebugService` |

---

## 5. Estrutura de Diretórios Final

```
ideia-theia/                          ← Plugin Theia
├── src/browser/
│   ├── ideia-menu-contribution.ts   ← 9 menus (copiado do mockup)
│   ├── ideia-view-contribution.ts   ← Activity bar + painéis
│   ├── ideia-chat-widget.tsx        ← Chat (usa @theia/ai-chat)
│   ├── ideia-dashboard-widget.tsx   ← Dashboard panel (from web-ui)
│   ├── ideia-studies-widget.tsx     ← Studies panel (from mockup)
│   ├── ideia-approvals-widget.tsx   ← Approvals panel (from mockup)
│   ├── ideia-suggestions-widget.tsx ← Suggestions panel (from mockup)
│   └── ideia-frontend-module.ts     ← DI container (Inversify)
├── src/node/
│   ├── ideia-backend-module.ts      ← DI container backend
│   └── ideia-api-bridge.ts          ← Ponte: Theia → REST API
└── style/
    └── ideia.css                    ← Tema (copiado do mockup)

web-ui/src/                          ← Componentes React standalone
├── components/
│   ├── DashboardPanel.tsx           ← Copiado do mockup (dados reais)
│   ├── StudiesPanel.tsx             ← Copiado do mockup
│   ├── ApprovalsPanel.tsx           ← Copiado do mockup
│   ├── SuggestionsPanel.tsx         ← Copiado do mockup
│   ├── DecisionCenter.tsx           ← Mantido (específico IDEIA)
│   ├── SelfChat.tsx                 ← Mantido
│   ├── AutonomyControlTower.tsx     ← Mantido
│   └── SelfOptimizationPanel.tsx    ← Mantido
├── lib/
│   ├── api.ts                       ← 35 endpoints REST
│   └── theia-bridge.ts              ← Ponte: web-ui → Theia APIs
└── modes/
    ├── App.tsx                      ← NOVO: layout activity-bar (mockup)
    └── ...

apps/api/src/index.ts                ← Servidor REST único
├── routes/fs.ts                     ← File operations (5 endpoints)
├── routes/shell.ts                  ← Shell command
├── routes/chat.ts                   ← Chat completions (SSE)
├── routes/preview.ts               ← Preview/approve/reject
├── routes/diagnostics.ts           ← NOVO: tests, coverage, gaps
├── routes/studies.ts               ← NOVO: estudos
├── routes/approvals.ts             ← NOVO: approvals
├── routes/suggestions.ts           ← NOVO: suggestions
└── routes/dap.ts                   ← NOVO: DAP WebSocket bridge
```

---

## 6. Resumo de Ações

### O Que FAZER (Prioridade)

| # | Ação | Esforço | Depende de |
|---|------|---------|------------|
| 1 | Copiar CSS do mockup → `style/ideia.css` | 2h | — |
| 2 | Copiar Dashboard, Studies, Approvals, Suggestions do mockup → React | 3 dias | — |
| 3 | Criar endpoints: diagnostics, studies, approvals, suggestions | 2 dias | — |
| 4 | Conectar DAP bridge (`ws://host/dap`) | 4h | — |
| 5 | Reestruturar App.tsx → layout activity-bar (mockup) | 1 dia | #2 |
| 6 | Migrar FileExplorer, Terminal, CommandPalette, etc para Theia nativo | 2 dias | #5 |
| 7 | Conectar web-ui → Theia APIs via `theia-bridge.ts` | 1 dia | #5, #6 |

### O QUE NÃO FAZER

- ❌ Não reescrever componentes que Theia já fornece (FileExplorer, Terminal, Preferences, StatusBar, CommandPalette, Problems, Outline)
- ❌ Não manter App.tsx com layout sidebar tabs (vai ser substituído pelo layout activity-bar)
- ❌ Não criar menus customizados no web-ui (Theia menu system é mais completo)

---

## 7. Conclusão

A integração final segue o princípio:

> **Mockup define a interface. Theia fornece a infraestrutura. Backend expõe como API. IA consome via ferramentas.**

Cada camada tem seu papel:
- **Mockup** → Design visual (copiado para React)
- **Theia** → Shell nativo (menus, painéis, editor, terminal, debug)
- **Backend** → REST API (35+ endpoints)
- **IA** → Consumidora de tudo (via ferramentas + API)
