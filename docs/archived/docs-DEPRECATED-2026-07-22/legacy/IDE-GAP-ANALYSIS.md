# Análise de Gaps — ai-devkit → IDE Híbrida com Chat

> **Data:** 2026-07-13
> **Propósito:** Mapear o que falta para transformar o ai-devkit em uma IDE completa com chat, editor,
> árvore de arquivos, terminal, diffs e execução assistida.
> **Base:** Análise completa de 98 recursos existentes + gaps identificados nos 3 repositórios.

---

## Sumário

1. [Resumo Executivo](#1-resumo-executivo)
2. [Bloco 1 — Chat Central](#2-bloco-1--chat-central)
3. [Bloco 2 — Editor de Código](#3-bloco-2--editor-de-código)
4. [Bloco 3 — Árvore de Arquivos](#4-bloco-3--árvore-de-arquivos)
5. [Bloco 4 — Terminal Embutido](#5-bloco-4--terminal-embutido)
6. [Bloco 5 — Diff/Patch Viewer](#6-bloco-5--diffpatch-viewer)
7. [Bloco 6 — Execução de Tarefas](#7-bloco-6--execução-de-tarefas)
8. [Bloco 7 — Aprovações](#8-bloco-7--aprovações)
9. [Bloco 8 — Timeline](#9-bloco-8--timeline)
10. [Bloco 9 — Memória](#10-bloco-9--memória)
11. [Bloco 10 — Logs](#11-bloco-10--logs)
12. [Bloco 11 — Multiagente](#12-bloco-11--multiagente)
13. [Bloco 12 — Integração com Outras IAs](#13-bloco-12--integração-com-outras-ias)
14. [Bloco 13 — Gestão de Múltiplos Projetos](#14-bloco-13--gestão-de-múltiplos-projetos)
15. [Plano de Implementação](#15-plano-de-implementação)
16. [Dependências Cruzadas](#16-dependências-cruzadas)
17. [Riscos Globais](#17-riscos-globais)
18. [Estimativa de Esforço](#18-estimativa-de-esforço)

---

## 1. Resumo Executivo

O ai-devkit é **excepcional em backend/governança** mas **tem ~15% do que seria necessário** para uma
IDE funcional. A web-ui existente (~1.450 linhas) é um protótipo bem estruturado, não uma IDE real.

### O que já funciona (pode ser reutilizado)

| Área | Aproveitamento |
|------|----------------|
| Provedores de IA (OpenAI, Anthropic, Google, AWS, Ollama) | 100% — roteador com fallback |
| RAG Engine completo | 100% — chunk, embed, search, rerank |
| Sistema de agentes (types, registry, coordinator, security) | 90% — adaptar para chat |
| Memória operacional (store, patterns, learning) | 100% — reuso direto |
| Fluxo de aprovação (request, grant, deny, audit) | 100% — reuso direto |
| Quality gates, compliance, governance | 100% — reuso direto |
| Planejador de tarefas (TaskSpec, ExecutionPlan) | 100% — reuso direto |
| Gerenciamento de contexto (context-store, token-economy) | 90% — adaptar para chat |
| Stack detector, templates, geradores de código | 100% — reuso direto |
| Snapshot de estado, worktree isolation | 100% — reuso direto |

### O que está completamente ausente

| Área | Status | Esforço |
|------|--------|---------|
| Chat UI (AgentMode.tsx é placeholder de 11 linhas) | ❌ Zero | Alto |
| Streaming de LLMs (todos providers usam `stream: false`) | ❌ Zero | Alto |
| Componente de input de mensagens | ❌ Zero | Médio |
| Renderização de markdown/code blocks | ❌ Zero | Médio |
| File watcher para auto-refresh | ❌ Zero | Médio |
| Git integration (decorations, stage, commit) | ❌ Zero | Alto |
| Search across workspace (Ctrl+Shift+F) | ❌ Zero | Alto |
| Quick open (Ctrl+P) | ❌ Zero | Médio |
| Persistent terminal (xterm.js + PTY) | ❌ Zero | Alto |
| File CRUD (novo, renomear, excluir via UI) | ❌ Zero | Médio |
| Multi-project / multi-root workspace | ❌ Zero | Alto |
| Tema (light/dark), settings UI, status bar | ❌ Zero | Médio |

---

## 2. Bloco 1 — Chat Central

### Status Atual

| Sub-componente | Status | Onde | Linhas |
|----------------|--------|------|--------|
| Provedores de IA (interface + 4 impls + Ollama) | ✅ Funcional | `packages/cli/src/local-ai/providers/` | ~189 |
| Roteador de providers com fallback | ✅ Funcional | `packages/cli/src/local-ai/provider-router.ts` | 1-184 |
| Gerenciamento de contexto (ContextStore) | ✅ Funcional | `packages/cli/src/runtime/context-store.ts` | 1-234 |
| Economia de tokens | ✅ Funcional | `packages/cli/src/runtime/token-economy-engine.ts` | 1-205 |
| Gerenciamento de prompts (versionamento) | ✅ Funcional | `packages/cli/src/commands/prompt.ts` | 1-329 |
| Catálogo de modelos (ModelRegistry) | ✅ Funcional | `packages/cli/src/local-ai/models.ts` | 1-129 |
| Streaming SSE/WebSocket | 🟡 Stub | `packages/cli/src/commands/stream.ts` | 1-148 |
| Chat UI (AgentMode.tsx) | ❌ Placeholder | `packages/web-ui/src/modes/AgentMode.tsx` | 1-11 |
| Tipos de mensagem/conversação | ❌ Ausente | — | — |
| Endpoints de chat no servidor web-ui | ❌ Ausente | `packages/web-ui/server/index.ts` | 281 |
| Renderização de markdown | ❌ Ausente | `packages/web-ui/package.json` | — |
| Streaming token-by-token no frontend | ❌ Ausente | — | — |

### Lacunas Detalhadas

| # | Lacuna | Detalhes |
|---|--------|----------|
| 1 | **Tipos de Chat** | Não existe `ChatMessage`, `Conversation`, `Thread` em lugar nenhum do código |
| 2 | **Streaming nos Providers** | Todos os 5 providers chamam APIs com `stream: false`. Interface `AiProvider` não tem `streamQuery()`. OpenAI, Anthropic, Google, AWS, Ollama precisam de modo streaming |
| 3 | **Servidor SSE real** | `stream.ts` é documentação — não implementa SSE ou WebSocket de verdade. Precisa de servidor HTTP com `text/event-stream` |
| 4 | **Cliente SSE no frontend** | Nenhum código consome SSE. Precisa de `EventSource` ou fetch-based SSE reader |
| 5 | **Chat UI component** | `AgentMode.tsx` é um placeholder de 11 linhas. Precisa: lista de mensagens, bubbles, input, seletor de modelo |
| 6 | **Markdown rendering** | Sem `react-markdown`, `remark`, `rehype` nas dependências |
| 7 | **Code block rendering** | Sem syntax highlighting para blocos de código no chat. Monaco já está disponível mas não integrado ao chat |
| 8 | **Context pinning UI** | `ContextStore` existe em memória mas não tem UI para pin/despin arquivos |
| 9 | **@-mentions** | Sem parsing de @ para arquivos ou agentes |
| 10 | **Slash commands** | Sem parsing de / para comandos no input |
| 11 | **Controles de parâmetros** | Sem UI para temperature, top_p, max_tokens. ModelRouter decidia internamente |
| 12 | **Parada de geração** | Sem `AbortController` exposto ao frontend |
| 13 | **Histórico de conversas** | Sem sidebar de conversas, sem busca no histórico, sem export |

### Dependências

| Dependência | Para quê |
|-------------|----------|
| `react-markdown` + `remark-gfm` + `rehype-highlight` | Renderizar markdown no chat |
| `zustand` ou `valtio` | Estado global do chat (mensagens, conversas, streaming) |
| `uuid` | IDs de mensagens e conversas |
| `date-fns` | Timestamps formatados |
| `event-source-polyfill` | SSE client cross-browser |
| `react-hot-toast` ou similar | Notificações de erros/eventos |

### Ordem Recomendada

1. **Fase 1 — Fundação** (semana 1-2): Adicionar `streamQuery()` à interface `AiProvider`, implementar streaming em OpenAI + Ollama, criar tipo `ChatMessage`
2. **Fase 2 — Servidor** (semana 2-3): Criar endpoints `/api/chat/completions` (streaming) e `/api/conversations` no servidor web-ui
3. **Fase 3 — UI** (semana 3-5): Construir `ChatMessage`, `ChatInput`, `ConversationSidebar`, integrar markdown + code blocks
4. **Fase 4 — Polimento** (semana 5-6): Context pinning, @-mentions, slash commands, parâmetros de modelo

### Complexidade

**Alta** — é o bloco mais complexo porque requer alterações em 3 camadas (providers, servidor, frontend) e envolve streaming em tempo real.

### Risco

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Streaming inconsistente entre providers | Média | Alto | Implementar um provider de cada vez, começando por Ollama (mais simples) |
| Performance de renderização com markdown | Baixa | Médio | Virtualização de mensagens, lazy rendering |
| Custo de tokens sem controle | Média | Alto | Implementar limite de contexto visível e aviso antes de estourar |

---

## 3. Bloco 2 — Editor de Código

### Status Atual

| Sub-componente | Status | Onde | Linhas |
|----------------|--------|------|--------|
| Monaco Editor integrado | ✅ Funcional | `EditorMode.tsx` | 1-110 |
| Syntax highlighting (20 linguagens) | ✅ Parcial | `monaco.ts` | 1-44 |
| Abas de edição (EditorTabs) | ✅ Funcional | `EditorTabs.tsx` | 1-49 |
| Dirty state tracking | ✅ Funcional | `EditorMode.tsx:40` | — |
| Detecção de arquivo binário | ✅ Funcional | `EditorMode.tsx:25-27` | — |
| Minimap | ✅ Funcional | `EditorMode.tsx:98` | — |
| Ctrl+S para salvar | ✅ Funcional | `EditorMode.tsx:94-96` | — |
| Layout automático | ✅ Funcional | `EditorMode.tsx:98` | — |
| Leitura/escrita via API | ✅ Funcional | `server/index.ts` | ~281 |
| **Search across workspace** | ❌ Ausente | — | — |
| **Quick open (Ctrl+P)** | ❌ Ausente | — | — |
| **Git integration (decorations, stage, commit)** | ❌ Ausente | — | — |
| **Problem pane (errors/warnings)** | ❌ Ausente | — | — |
| **Split panes / multi-pane editing** | ❌ Ausente | — | — |
| **Autosave** | ❌ Ausente | — | — |
| **Format on save (Prettier)** | ❌ Ausente | — | — |
| **Breadcrumbs** | ❌ Ausente | — | — |
| **Inlay hints** | ❌ Ausente | — | — |
| **Code lens** | ❌ Ausente | — | — |
| **Large file handling** | ❌ Ausente (trunca em 1MB) | `server/index.ts:201` | — |
| **Status bar (line/col, language, encoding)** | ❌ Ausente | — | — |

### Lacunas Detalhadas

| # | Lacuna | Detalhes |
|---|--------|----------|
| 1 | **Search across workspace** | Monaco `findModel` não é search. Precisa de endpoint de busca full-text + UI dedicada (Ctrl+Shift+F) |
| 2 | **Quick open** | Monaco não tem Ctrl+P nativo. Precisa implementar com `monaco-editor` `addCommand` + file index |
| 3 | **Git decorations** | Explorer não mostra status git (M, A, D, ?). Precisa integração com `simple-git` ou `isomorphic-git` |
| 4 | **Problem pane** | Monaco tem markers (errors/warnings) mas não há painel listando-os. Precisa de `IMarkers` listener + painel dedicado |
| 5 | **Split panes** | EditorMode tem um único `<Editor>`. Precisa de `allotment` ou `react-split` para side-by-side |
| 6 | **Breadcrumbs** | Monaco tem `breadcrumbs` config, mas precisa de UI mostrando `src/components/Button.tsx` |
| 7 | **Status bar** | Não há barra inferior mostrando linha:coluna, linguagem, encoding, branch git |
| 8 | **Language workers** | `monaco.ts` só tem workers para TS/JS/CSS/HTML/JSON. Faltam Python, Go, Rust, Java, Ruby, PHP |
| 9 | **File watcher** | Nenhum componente escuta mudanças no disco. Chokidar existe no CLI mas não na web-ui |
| 10 | **Multi-cursor editing** | Monaco suporta, mas sem UI de configuração |
| 11 | **Code folding** | Monaco suporta, mas sem UI de toggle |
| 12 | **Large file (>1MB)** | Servidor trunca em 1.000.000 chars. Precisa de chunked loading ou warning |

### Dependências

| Dependência | Para quê |
|-------------|----------|
| `allotment` ou `react-split` | Split panes para editor |
| `simple-git` ou `isomorphic-git` | Git integration |
| Monaco language workers adicionais | Python, Go, Rust, Java, Ruby |
| `@monaco-editor/react` (já existe) | Atualizar para última versão |
| `prettier` | Format on save |
| `chokidar` (já existe no CLI) | File watcher |

### Ordem Recomendada

1. **Fase 1** (semana 1-2): File watcher + auto-refresh do explorer, Quick open (Ctrl+P)
2. **Fase 2** (semana 2-4): Search across workspace, Problem pane, Status bar, Breadcrumbs
3. **Fase 3** (semana 4-6): Git integration (decorations → stage → commit), Split panes
4. **Fase 4** (semana 6-8): Format on save, Large file handling, Language workers adicionais

### Complexidade

**Alta** — Search across workspace, Git integration e Split panes são projetos significativos.

### Risco

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Monaco workers aumentam bundle size | Alta | Médio | Lazy loading de workers conforme linguagem |
| Git operations lentas em repositórios grandes | Média | Alto | Execução assíncrona com cache e debounce |
| Split panes quebram layout existente | Média | Alto | Implementar com `allotment` que preserva layout |

---

## 4. Bloco 3 — Árvore de Arquivos

### Status Atual

| Sub-componente | Status | Onde | Linhas |
|----------------|--------|------|--------|
| Tree view com lazy loading | ✅ Funcional | `FileExplorer.tsx` | 1-85 |
| Ícones de diretório/arquivo | ✅ Funcional | `FileExplorer.tsx:52-54` | — |
| Indentação por profundidade | ✅ Funcional | `FileExplorer.tsx:42` | — |
| **File CRUD (novo/renomear/excluir)** | ❌ Ausente | — | — |
| **Context menu** | ❌ Ausente | — | — |
| **Drag & drop** | ❌ Ausente | — | — |
| **Git decorations** | ❌ Ausente | — | — |
| **File filter/search (Ctrl+P)** | ❌ Ausente | — | — |
| **Virtual scroll** | ❌ Ausente (renderiza todos os nós) | `FileExplorer.tsx:58-63` | — |
| **File icons (vscode-icons/codicon)** | ❌ Ausente | — | — |
| **Multi-select** | ❌ Ausente | — | — |
| **Collapsible state persistence** | ❌ Ausente | — | — |
| **Reveal in explorer** | ❌ Ausente | — | — |
| **File watcher / auto-refresh** | ❌ Ausente | — | — |

### Lacunas Detalhadas

| # | Lacuna | Detalhes |
|---|--------|----------|
| 1 | **File CRUD** | Sem endpoints para criar/renomear/excluir. `server/index.ts` só tem `list`, `read`, `write` |
| 2 | **Context menu** | `onContextMenu` não está implementado. Precisa de menu com New File, New Folder, Rename, Delete, Copy Path |
| 3 | **Git decorations** | Explorer não mostra se arquivo foi modified (M), added (A), deleted (D), untracked (?) |
| 4 | **File icons** | Unicode arrows não são suficientes. Precisa de `vscode-icons` ou `codicon` por extensão |
| 5 | **Virtual scroll** | Projetos com >1000 arquivos vão travar. Cada `TreeNode` é um componente React separado |
| 6 | **File watcher** | Se um arquivo é criado/editado externamente (git pull, npm install), explorer não atualiza |
| 7 | **Root path configurável** | `listDir('.')` hardcoded no componente |

### Dependências

| Dependência | Para quê |
|-------------|----------|
| `react-window` ou `react-virtuoso` | Virtual scrolling |
| `@vscode/codicons` ou `react-file-icon` | File type icons |
| `@dnd-kit` ou `react-beautiful-dnd` | Drag & drop |
| `chokidar` (já existe) | File watcher |

### Ordem Recomendada

1. **Fase 1** (semana 1): Endpoints CRUD no servidor + Context menu (New File, New Folder, Rename, Delete)
2. **Fase 2** (semana 1-2): File watcher + auto-refresh, Git decorations básicas
3. **Fase 3** (semana 2-3): File icons por extensão, Virtual scroll para >1000 arquivos
4. **Fase 4** (semana 3-4): Drag & drop, Multi-select, Collapsible state persistence

### Complexidade

**Média** — A maioria das lacunas são adições incrementais sobre a estrutura existente.

### Risco

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| File watcher causa re-render em loop | Média | Médio | Debounce de 300ms, diff de mudanças |
| Drag & drop complexo em tree | Alta | Alto | Implementar após CRUD básico; considerar adiar |
| Virtual scroll quebra lazy loading | Baixa | Médio | `react-virtuoso` já suporta tree loading |

---

## 5. Bloco 4 — Terminal Embutido

### Status Atual

| Sub-componente | Status | Onde | Linhas |
|----------------|--------|------|--------|
| Input de comando + output histórico | ✅ Funcional | `Terminal.tsx` | 1-51 |
| Busy state / loading indicator | ✅ Funcional | `Terminal.tsx:13` | — |
| Auto-scroll em novo output | ✅ Funcional | `Terminal.tsx:19` | — |
| **Persistent shell (PTY)** | ❌ Ausente | — | — |
| **ANSI escape sequence handling** | ❌ Ausente | — | — |
| **xterm.js integration** | ❌ Ausente | — | — |
| **Ctrl+C / process kill** | ❌ Ausente | — | — |
| **Multi-tab terminals** | ❌ Ausente | — | — |
| **Command history (up/down)** | ❌ Ausente | — | — |
| **Clear terminal** | ❌ Ausente | — | — |
| **Output truncation / limits** | ❌ Ausente (memória infinita) | — | — |
| **Exit code display** | ❌ Ausente | — | — |

### Lacunas Detalhadas

| # | Lacuna | Detalhes |
|---|--------|----------|
| 1 | **Persistent shell** | Cada comando spawna um novo processo (`POST /api/shell`). Sem sessão persistent. Precisa de PTY (node-pty) |
| 2 | **ANSI escape codes** | Output de `npm run build` terá escapes raw como `[32m✓[0m`. Precisa de xterm.js que interpreta ANSI |
| 3 | **xterm.js** | Terminal web real com emulação VT100. Substituir o `<div>` atual por `<XTerm>` |
| 4 | **Ctrl+C** | Sem `SIGINT` enviado ao processo. Precisa de `process.kill()` no PTY |
| 5 | **Multi-tab** | Um único terminal. Precisa de gerenciamento de abas com `+` para novo terminal |
| 6 | **Command history** | Input field não escuta ArrowUp/ArrowDown para navegar histórico |
| 7 | **Limite de output** | `history` array cresce sem limite. Precisa de max 1000 linhas com truncation |

### Dependências

| Dependência | Para quê |
|-------------|----------|
| `xterm` + `xterm-addon-fit` | Terminal emulator web |
| `node-pty` | Persistent shell no backend |
| `ws` (WebSocket) | Comunicação bidirecional terminal |
| `@xterm/xterm` (ou similar) | React wrapper para xterm |

### Ordem Recomendada

1. **Fase 1** (semana 1-2): xterm.js no frontend + node-pty no backend via WebSocket (terminal único funcional)
2. **Fase 2** (semana 2): Ctrl+C, command history, output limits
3. **Fase 3** (semana 3): Multi-tab terminals, working directory display, exit code

### Complexidade

**Alta** — xterm.js + node-pty + WebSocket é significativamente mais complexo que o terminal atual.

### Risco

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| node-pty requer build nativo | Alta | Alto | Dockerizar ou usar fallback para shell não-persistente |
| WebSocket reconection | Média | Médio | Implementar auto-reconnect com backoff |
| Performance com output intenso | Baixa | Médio | Buffer de 1000 linhas, throttling de render |

---

## 6. Bloco 5 — Diff/Patch Viewer

### Status Atual

| Sub-componente | Status | Onde | Linhas |
|----------------|--------|------|--------|
| Monaco DiffEditor side-by-side | ✅ Funcional | `DiffViewer.tsx` | 1-81 |
| Color-coded chunks (+/-) | ✅ Funcional | `DiffViewer.tsx` | — |
| Read-only mode | ✅ Funcional | `DiffViewer.tsx:50` | — |
| Fallback inline quando sem original/modified | ✅ Funcional | `DiffViewer.tsx:56-77` | — |
| Patch preview com approve/reject | ✅ Funcional | `PatchPreview.tsx` | 1-205 |
| Risk colors (low→critical) | ✅ Funcional | `PatchPreview.tsx:12-24` | — |
| Quality score | ✅ Funcional | `PatchPreview.tsx:26-31` | — |
| **Inline ↔ side-by-side toggle** | ❌ Ausente | — | — |
| **Word-level diff** | ❌ Ausente (só line-level) | — | — |
| **Diff navigation (next/prev change)** | ❌ Ausente | — | — |
| **Ignore whitespace toggle** | ❌ Ausente | — | — |
| **Collapse/expand chunks** | ❌ Ausente | — | — |
| **Inline editing in diff** | ❌ Ausente (readOnly) | — | — |
| **Comment/annotation system** | ❌ Ausente | — | — |
| **Sticky header** | ❌ Ausente | — | — |
| **Diff statistics bar** | ❌ Ausente | — | — |

### Lacunas Detalhadas

| # | Lacuna | Detalhes |
|---|--------|----------|
| 1 | **Word-level diff** | Monaco `DiffEditor` faz diff por linha. Para ver mudanças dentro da linha, precisa configurar `diffWordHighlight` |
| 2 | **Diff navigation** | Sem botões "Próxima Mudança" / "Mudança Anterior". Monaco tem `next()` e `previous()` no diff editor |
| 3 | **Inline editing** | `readOnly: true` impede ajustes no patch antes de aprovar. Idealmente: modo "edit" que permite modificar o patch |
| 4 | **Annotations** | Não é possível comentar em linhas específicas do diff. Precisa de sistema de gutter comments |
| 5 | **Ignore whitespace** | Monaco DiffEditor tem `ignoreTrimWhitespace` mas não exposto na UI |

### Dependências

Nenhuma nova — Monaco já cobre diffs. Precisa apenas configurar opções existentes.

### Ordem Recomendada

1. **Fase 1** (semana 1-2): Word-level diff, ignore whitespace toggle, diff navigation buttons
2. **Fase 2** (semana 2-3): Inline editing toggle, collapse/expand chunks, sticky header
3. **Fase 3** (semana 3-4): Comment/annotation system, diff statistics bar

### Complexidade

**Baixa** — A maioria das features já existe no Monaco e precisa apenas ser configurada/exposta na UI.

### Risco

Mínimo — Monaco DiffEditor é maduro e estável.

---

## 7. Bloco 6 — Execução de Tarefas

### Status Atual

| Sub-componente | Status | Onde | Linhas |
|----------------|--------|------|--------|
| Task Planner (TaskSpec, ExecutionPlan) | ✅ Funcional | `packages/cli/src/planner/` | 5 arquivos |
| Task Runner (executa backlog YAML) | ✅ Funcional | `packages/cli/src/commands/task-run.ts` | 1-188 |
| Engineer Pipeline (plan→implement→test→fix→review) | ✅ Funcional | `packages/cli/src/commands/engineer.ts` | 1-353 |
| Model Router (rota tarefas para modelo certo) | ✅ Funcional | `packages/cli/src/runtime/model-router.ts` | 1-164 |
| Command Router (dispara comandos por tipo) | ✅ Funcional | `packages/cli/src/planner/command-router.ts` | — |
| Task Validator | ✅ Funcional | `packages/cli/src/planner/task-validator.ts` | — |
| Autonomus Cycles + Self-Correction | ✅ Funcional | `packages/cli/src/autonomous/` | 8 arquivos |
| **Task execution UI (progress, cancel, retry)** | ❌ Ausente | — | — |
| **Visual pipeline builder** | 🟡 Existe mas separado | `packages/web-ui/` (ReactFlow) | — |
| **Task detail view (logs, output)** | ❌ Ausente | — | — |
| **Task search/filter in UI** | ❌ Ausente | — | — |
| **Drag-sort task reordering** | ❌ Ausente | — | — |
| **ETA / estimated time remaining** | ❌ Ausente | — | — |

### Lacunas Detalhadas

| # | Lacuna | Detalhes |
|---|--------|----------|
| 1 | **Task execution UI** | Toda a execução de tarefas é CLI. Precisa de UI com progresso, cancelar, retry, logs |
| 2 | **Integração Visual Pipeline ↔ CLI Tasks** | ReactFlow existe mas não está conectado ao task runner. Pipelines visuais não geram TaskSpec |
| 3 | **Live updates** | TimelineDashboard usa `SAMPLE_DATA` hardcoded. Precisa de WebSocket/SSE para progresso real |
| 4 | **Task detail** | Ao clicar em uma task, deve mostrar: logs, output, erros, tempo de execução, tentativas |
| 5 | **Cancel task** | Engineer pipeline não tem `AbortController` exposto ao usuário |
| 6 | **Task search** | Sem filtro por nome, status, risco, tipo |

### Dependências

| Dependência | Para quê |
|-------------|----------|
| `zustand` | Estado compartilhado de tasks (progresso, status) |
| WebSocket (já planejado para chat) | Live updates de progresso |

### Ordem Recomendada

1. **Fase 1** (semana 1-2): Endpoint `/api/tasks/status` + UI de progresso com cancel/retry
2. **Fase 2** (semana 2-3): Conectar ReactFlow ao task runner, task detail view
3. **Fase 3** (semana 3-4): Task search/filter, drag-sort reordering, ETA

### Complexidade

**Média** — O backend está quase todo pronto. Faltam pontes de comunicação com o frontend.

### Risco

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Engineer pipeline pode rodar por horas | Alta | Alto | Checkpoints a cada etapa, allow pause/resume |
| ReactFlow integração complexa | Média | Alto | Começar com task list simples, depois visual |

---

## 8. Bloco 7 — Aprovações

### Status Atual

| Sub-componente | Status | Onde | Linhas |
|----------------|--------|------|--------|
| Approval Flow (request, grant, deny) | ✅ Funcional | `packages/cli/src/governance/approval-flow.ts` | 1-39 |
| Governance Audit (audit trail) | ✅ Funcional | `packages/cli/src/governance/governance-audit.ts` | 1-20 |
| Governance Policy (policies + rules) | ✅ Funcional | `packages/cli/src/governance/policy-types.ts` | 1-17 |
| Agent Security (11 ações, risco, blocked patterns) | ✅ Funcional | `packages/cli/src/runtime/agent-security.ts` | 1-64 |
| Quality Gate (6 estágios) | ✅ Funcional | `packages/cli/src/commands/gate*.ts` | — |
| Cryptographic Attestations | ✅ Funcional | `packages/cli/src/commands/attest*.ts` | — |
| Compliance Mapping (5 frameworks) | ✅ Funcional | `packages/cli/src/commands/compliance*.ts` | — |
| Governance Compiler (13 formatos) | ✅ Funcional | `packages/cli/src/commands/compile-utils.ts` | 1-605 |
| DecisionHistory component | ✅ Funcional | `DecisionHistory.tsx` | 1-58 |
| **Approve/reject via UI** | ✅ Funcional | `PatchPreview.tsx:146-162` | — |
| **Decision reverting (undo approve)** | ❌ Ausente | — | — |
| **Filter decisions** | ❌ Ausente (só lista todas) | — | — |
| **Export history as JSON/CSV** | ❌ Ausente | — | — |
| **Pagination for large history** | ❌ Ausente | — | — |

### Lacunas Detalhadas

| # | Lacuna | Detalhes |
|---|--------|----------|
| 1 | **Undo approve/reject** | Uma vez aprovado/rejeitado, não há como reverter. `DecisionHistory.tsx` só exibe |
| 2 | **Filter/sort** | `DecisionHistory.tsx` lista tudo. Sem filtro por arquivo, data, resultado |
| 3 | **Export** | Sem botão para exportar histórico como JSON, CSV, ou PDF |
| 4 | **Pagination** | `history.map()` renderiza tudo. Precisa de paginação ou virtual scroll |
| 5 | **Approval modal** | `PatchPreview.tsx` tem `approveAll`/`rejectAll` com reason dialog, mas approval individual precisa de modal dedicado |

### Dependências

Nenhuma nova — tudo pode ser implementado com React puro.

### Ordem Recomendada

1. **Fase 1** (semana 1): Pagination, filter/sort
2. **Fase 2** (semana 1-2): Decision reverting, export JSON/CSV
3. **Fase 3** (semana 2): Approval modal dedicado

### Complexidade

**Baixa** — Sistema de aprovação é maduro, faltam apenas incrementos de UI.

### Risco

Mínimo — aprovações são síncronas e determinísticas.

---

## 9. Bloco 8 — Timeline

### Status Atual

| Sub-componente | Status | Onde | Linhas |
|----------------|--------|------|--------|
| TimelineDashboard (stats cards, timeline, progress bars) | ✅ Funcional | `TimelineDashboard.tsx` | 1-105 |
| Stats: overall progress, active, completed, failed | ✅ Funcional | `TimelineDashboard.tsx:53-68` | — |
| Timeline visualization with status dots | ✅ Funcional | `TimelineDashboard.tsx:78-101` | — |
| Progress bars per task | ✅ Funcional | `TimelineDashboard.tsx:90-96` | — |
| Color-coded status labels | ✅ Funcional | `TimelineDashboard.tsx:23-33` | — |
| **Real data from API** | ❌ Usa SAMPLE_DATA | `DashboardMode.tsx:23-40` | — |
| **Live updates (WebSocket/SSE)** | ❌ Ausente | — | — |
| **Task detail click** | ❌ Ausente | — | — |
| **Task retry** | ❌ Ausente | — | — |
| **Task cancel** | ❌ Ausente | — | — |
| **Task search/filter** | ❌ Ausente | — | — |
| **Task reorder (drag)** | ❌ Ausente | — | — |
| **ETA / estimated time remaining** | ❌ Ausente | — | — |

### Lacunas Detalhadas

| # | Lacuna | Detalhes |
|---|--------|----------|
| 1 | **Real data** | `DashboardMode.tsx` define `SAMPLE_DATA` hardcoded em vez de chamar API |
| 2 | **Live updates** | Sem WebSocket ou SSE. Timeline não atualiza enquanto tasks rodam |
| 3 | **Task detail** | Ao clicar em uma task na timeline, não abre detalhes (logs, output, erros) |
| 4 | **Retry/Cancel** | Tasks falhadas não podem ser retentadas; tasks rodando não podem ser canceladas |
| 5 | **Search/Filter** | Sem busca por nome de task, filtro por status |
| 6 | **Drag reorder** | Não é possível reordenar tasks visualmente |

### Dependências

| Dependência | Para quê |
|-------------|----------|
| WebSocket (já planejado para chat) | Live updates |
| `zustand` (já planejado) | Estado compartilhado |

### Ordem Recomendada

1. **Fase 1** (semana 1): Substituir SAMPLE_DATA por chamada real à API `/api/timeline`
2. **Fase 2** (semana 1-2): Live updates via SSE/WebSocket, task detail on click
3. **Fase 3** (semana 2-3): Retry/Cancel buttons, search/filter, ETA

### Complexidade

**Média** — A UI existe, a estrutura de tasks existe, faltam conectá-las.

### Risco

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Live updates podem ser caros | Média | Médio | Rate limiting de 1s, batch updates |
| ETA impreciso sem histórico | Alta | Baixo | Mostrar "estimating..." até ter dados |

---

## 10. Bloco 9 — Memória

### Status Atual

| Sub-componente | Status | Onde | Linhas |
|----------------|--------|------|--------|
| MemoryRecord + MemoryPattern + LearningRecommendation | ✅ Funcional | `packages/cli/src/memory/memory-types.ts` | 1-46 |
| MemoryStore (CRUD + search) | ✅ Funcional | `packages/cli/src/memory/memory-store.ts` | 1-36 |
| Pattern Detector (frequência de tags) | ✅ Funcional | `packages/cli/src/memory/pattern-detector.ts` | 1-22 |
| Learning Engine (recomendações por confiança) | ✅ Funcional | `packages/cli/src/memory/learning-engine.ts` | 1-11 |
| Policy Adapter (confidence ≥ 0.85 = auto-approve) | ✅ Funcional | `packages/cli/src/memory/policy-adapter.ts` | 1-17 |
| Knowledge Base (8 categorias, tags, status) | ✅ Funcional | `packages/cli/src/knowledge/` | 9 arquivos |
| Hermes Loop (aprendizado entre sessões) | ✅ Funcional | `packages/cli/src/commands/learn.ts` | — |
| Snapshot (estado completo do projeto) | ✅ Funcional | `packages/cli/src/commands/snapshot.ts` | 1-258 |
| Auditoria (AuditTimeline) | ✅ Funcional | `packages/cli/src/local-ai/audit.ts` | — |
| **Memory viewer/editor UI** | ❌ Ausente | — | — |
| **Knowledge browser UI** | ❌ Ausente | — | — |
| **Memory search in IDE** | ❌ Ausente (só CLI) | — | — |
| **Pattern visualization** | ❌ Ausente | — | — |
| **Memory cleanup/compaction UI** | ❌ Ausente | — | — |

### Lacunas Detalhadas

| # | Lacuna | Detalhes |
|---|--------|----------|
| 1 | **Memory UI** | `memory list` e `memory query` existem no CLI mas não têm interface gráfica |
| 2 | **Knowledge browser** | `knowledge query` é CLI. Precisa de UI tipo "Knowledge Graph" ou "Wiki" |
| 3 | **Pattern visualization** | Pattern Detector roda em background mas não mostra resultados visualmente |
| 4 | **Memory cleanup** | Sem interface para limpar/compactar/archivar memoria |
| 5 | **Integração com chat** | Memória deveria alimentar automaticamente o contexto do chat |

### Dependências

| Dependência | Para quê |
|-------------|----------|
| `zustand` | Estado global de memória |
| `d3` ou `vis-network` | Pattern visualization / knowledge graph |

### Ordem Recomendada

1. **Fase 1** (semana 1-2): Memory viewer UI (list, search, delete), integração com chat context
2. **Fase 2** (semana 2-3): Knowledge browser (categorias, tags, search)
3. **Fase 3** (semana 3-4): Pattern visualization, auto-suggest based on patterns

### Complexidade

**Baixa** — Backend está completo. Faltam apenas interfaces de consulta.

### Risco

Mínimo — memória é puramente benefíca; falhas não afetam operação.

---

## 11. Bloco 10 — Logs

### Status Atual

| Sub-componente | Status | Onde | Linhas |
|----------------|--------|------|--------|
| Audit Timeline (append-only com hash) | ✅ Funcional | `packages/cli/src/local-ai/audit.ts` | — |
| Snapshot de estado | ✅ Funcional | `packages/cli/src/commands/snapshot.ts` | 1-258 |
| Governance Audit Entry | ✅ Funcional | `packages/cli/src/governance/governance-audit.ts` | 1-20 |
| DecisionHistory (frontend) | ✅ Funcional | `DecisionHistory.tsx` | 1-58 |
| **Log viewer UI** | ❌ Ausente | — | — |
| **Log levels (info/warn/error/debug)** | ❌ Ausente (só audit) | — | — |
| **Log filter/search** | ❌ Ausente | — | — |
| **Log streaming (tail -f)** | ❌ Ausente | — | — |
| **Log export** | ❌ Ausente | — | — |
| **Log retention/rotation** | ❌ Ausente | — | — |

### Lacunas Detalhadas

| # | Lacuna | Detalhes |
|---|--------|----------|
| 1 | **Log viewer** | Não há um "Output" ou "Console" pane na UI. DecisionHistory só mostra aprovações |
| 2 | **Log levels** | CLI loga com tags `[FE][INFO]`, `[FE][ERROR]` mas não há UI para filtrar por nível |
| 3 | **Log streaming** | `tail -f` não existe na UI. Idealmente: SSE stream de logs |
| 4 | **Log export** | Sem botão de exportar logs como .txt, .json |
| 5 | **Log retention** | Sem política de retenção configurável (dias, tamanho) |

### Dependências

Nenhuma nova — logs são texto simples.

### Ordem Recomendada

1. **Fase 1** (semana 1): Log viewer pane com níveis e busca
2. **Fase 2** (semana 1-2): Log streaming via SSE, export
3. **Fase 3** (semana 2): Log retention/rotation policy

### Complexidade

**Baixa** — Logs são dados estruturados simples.

### Risco

Mínimo.

---

## 12. Bloco 11 — Multiagente

### Status Atual

| Sub-componente | Status | Onde | Linhas |
|----------------|--------|------|--------|
| Agent Types (OperationalAgent, AgentTask, AgentTaskResult) | ✅ Funcional | `packages/cli/src/agents/agent-types.ts` | 1-67 |
| Agent Registry (list, filter por role/status) | ✅ Funcional | `packages/cli/src/agents/agent-registry.ts` | 1-34 |
| Agent Coordinator (atribuição de tarefas) | ✅ Funcional | `packages/cli/src/agents/agent-coordinator.ts` | 1-39 |
| Agent Definitions (can_write, read_paths, write_paths) | ✅ Funcional | `packages/cli/src/commands/agents.ts:12-102` | — |
| Agent Security (11 ações, risco, prompt injection) | ✅ Funcional | `packages/cli/src/runtime/agent-security.ts` | 1-64 |
| Agent Runtime (AgentState, checkpoint, history) | ✅ Funcional | `packages/cli/src/runtime/agent-runtime.ts` | 1-172 |
| Agent Collaboration (multi-agente com Ollama) | ✅ Funcional | `packages/cli/src/local-ai/collaboration.ts` | 1-350 |
| Agent Merge (merge de outputs multi-agente) | ✅ Funcional | `packages/cli/src/agents/agent-merge.ts` | 1-23 |
| **Agent status UI** | ❌ Ausente | — | — |
| **Agent assignment visualization** | ❌ Ausente | — | — |
| **Multi-agent chat view** | ❌ Ausente | — | — |
| **Agent conversation log viewer** | ❌ Ausente (CLI-only) | — | — |

### Lacunas Detalhadas

| # | Lacuna | Detalhes |
|---|--------|----------|
| 1 | **Agent status UI** | `agents list` mostra status no terminal. Precisa de UI com cards coloridos por status |
| 2 | **Agent assignment** | Não há UI mostrando qual agente está fazendo o quê |
| 3 | **Multi-agent chat** | Collaboration.ts orquestra agentes em pipeline, mas não há visualização tipo "chat entre agentes" |
| 4 | **Conversation log** | `agents conversation <id>` é CLI. Precisa de UI com timeline de mensagens entre agentes |

### Dependências

| Dependência | Para quê |
|-------------|----------|
| `zustand` | Estado compartilhado de agentes |
| WebSocket (já planejado) | Live updates de status dos agentes |

### Ordem Recomendada

1. **Fase 1** (semana 1-2): Agent status panel (cards coloridos, indicadores online/offline/busy)
2. **Fase 2** (semana 2-3): Agent assignment visualization, conversation log viewer
3. **Fase 3** (semana 3-4): Multi-agent chat view com timeline de mensagens

### Complexidade

**Média** — Backend maduro, faltam visualizações.

### Risco

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Multi-agent pode ser confuso para o usuário | Alta | Médio | Começar com single-agent chat, depois expandir |
| Performance com N agentes simultâneos | Média | Médio | Rate limiting, fila de mensagens |

---

## 13. Bloco 12 — Integração com Outras IAs

### Status Atual

| Sub-componente | Status | Onde | Linhas |
|----------------|--------|------|--------|
| Governance Compiler (13 formatos) | ✅ Funcional | `packages/cli/src/commands/compile-utils.ts` | 1-605 |
| MCP Server (10 ferramentas) | ✅ Funcional | `packages/cli/src/commands/mcp*.ts` | — |
| Compilador para Claude, Cursor, Copilot, Windsurf, etc. | ✅ Funcional | `packages/cli/src/commands/compile-all.ts` | — |
| Provider Router (4 cloud + Ollama) | ✅ Funcional | `packages/cli/src/local-ai/provider-router.ts` | 1-184 |
| Model Registry | ✅ Funcional | `packages/cli/src/local-ai/models.ts` | 1-129 |
| **IDE-specific config generation UI** | ❌ Ausente | — | — |
| **Cursor/Windsurf custom rules** | 🟡 CLI-only | — | — |
| **Continue.dev config** | 🟡 CLI-only | — | — |

### Lacunas Detalhadas

| # | Lacuna | Detalhes |
|---|--------|----------|
| 1 | **UI for config generation** | `compile all` gera configs para 13 IAs via CLI. Sem UI para selecionar destino e visualizar config |
| 2 | **Live preview of generated rules** | Sem preview before write |
| 3 | **Sync status** | Sem indicador de quais regras estão em sync vs desatualizadas |
| 4 | **Multi-model testing** | Experiment runner existe mas sem UI para A/B test |

### Dependências

Nenhuma nova — tudo já está implementado no CLI.

### Ordem Recomendada

1. **Fase 1** (semana 1): UI de seleção de destino + preview das regras geradas
2. **Fase 2** (semana 1-2): Sync status indicator, diff entre regras atuais e geradas
3. **Fase 3** (semana 2-3): A/B test UI para comparar modelos

### Complexidade

**Baixa** — Apenas wrap de CLI em UI.

### Risco

Mínimo.

---

## 14. Bloco 13 — Gestão de Múltiplos Projetos

### Status Atual

| Sub-componente | Status | Onde | Linhas |
|----------------|--------|------|--------|
| Monorepo detection + sharding | ✅ Funcional | `packages/cli/src/runtime/workspace.ts` | 1-176 |
| Project init wizard | ✅ Funcional | `packages/cli/src/commands/init.ts` | 1-327 |
| Stack detection | ✅ Funcional | `packages/cli/src/commands/detect.ts` | 1-364 |
| Multi-language adapters (13) | ✅ Funcional | `packages/adapter-*/` | — |
| **Multi-root workspace** | ❌ Ausente | — | — |
| **Project browser/selector** | ❌ Ausente | — | — |
| **Recent projects list** | ❌ Ausente | — | — |
| **Project switching** | ❌ Ausente (precisa `cd`) | — | — |
| **Global user settings** | ❌ Ausente (tudo é por projeto) | — | — |
| **Workspace-level .ai/ directory** | ❌ Ausente | — | — |
| **Unified .aiignore consumption** | 🟡 Parcial (existe mas não é lido programaticamente) | — | — |

### Lacunas Detalhadas

| # | Lacuna | Detalhes |
|---|--------|----------|
| 1 | **Multi-root** | Não é possível ter 2+ projetos abertos simultaneamente. CLI opera em `process.cwd()` |
| 2 | **Project browser** | Não há UI para listar, selecionar ou trocar de projeto |
| 3 | **Recent projects** | Nenhuma persistência de projetos recentes |
| 4 | **Global settings** | Config como `~/.ai-devkit/config.json` não existe. Preferências de tema, fontes, etc. são por projeto |
| 5 | **Workspace .ai/** | Um workspace multi-projeto deveria ter `.ai/` compartilhado na raiz |
| 6 | **.aiignore unificado** | Cada componente tem sua própria lista de exclusão hardcoded |

### Dependências

| Dependência | Para quê |
|-------------|----------|
| `conf` ou `env-paths` | Config global do usuário (`~/.config/ai-devkit/`) |
| `zustand` | Estado global de projetos abertos |
| Nenhuma para multi-root (é arquitetural) | — |

### Ordem Recomendada

1. **Fase 1** (semana 1-2): Global user settings (`~/.ai-devkit/config.json`), recent projects list
2. **Fase 2** (semana 2-4): Project browser UI (list + select), project switcher
3. **Fase 3** (semana 4-6): Multi-root workspace (abrir N projetos simultaneamente)
4. **Fase 4** (semana 6-8): Unified `.aiignore`, workspace-level `.ai/`

### Complexidade

**Alta** — Multi-root workspace requer redesign arquitetural significativo.

### Risco

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Multi-root complexidade arquitetural | Alta | Alto | Implementar após single-project estável; usar VS Code como referência |
| Conflitos de contexto entre projetos | Média | Alto | Namespace isolado por projeto no ContextStore |
| Performance com N projetos | Média | Médio | Lazy loading: só indexar projeto ativo |

---

## 15. Plano de Implementação

### Visão Geral — 4 Fases

```
Fase 1 (Semanas 1-4)    → Fundação da IDE
Fase 2 (Semanas 5-10)   → Inteligência + Produtividade
Fase 3 (Semanas 11-16)  → Poder + Colaboração
Fase 4 (Semanas 17-24)  → Escala + Enterprise
```

### Fase 1 — Fundação da IDE (Semanas 1-4)

| Prioridade | Bloco | O que fazer | Esforço |
|------------|-------|-------------|---------|
| 1 | Chat | Streaming em Ollama + OpenAI, tipo ChatMessage, endpoint SSE | Semana 1-2 |
| 2 | Arquivos | Endpoints CRUD + Context menu (New File, Rename, Delete) | Semana 1 |
| 3 | Editor | File watcher + auto-refresh, Quick open (Ctrl+P) | Semana 1-2 |
| 4 | Terminal | xterm.js + node-pty + WebSocket (terminal único funcional) | Semana 2-3 |
| 5 | Chat | Chat UI básica (input, lista de mensagens, markdown) | Semana 3-4 |
| 6 | Aprovações | Pagination, filter/sort no DecisionHistory | Semana 1 |
| 7 | Logs | Log viewer pane com níveis e busca | Semana 1-2 |
| 8 | Projetos | Global user settings, recent projects list | Semana 2-3 |

**Marcos:** Chat funcional com Ollama, terminal real, CRUD de arquivos, log viewer.

### Fase 2 — Inteligência + Produtividade (Semanas 5-10)

| Prioridade | Bloco | O que fazer | Esforço |
|------------|-------|-------------|---------|
| 9 | Chat | Context pinning, @-mentions, slash commands | Semana 5-6 |
| 10 | Editor | Search across workspace, Problem pane, Status bar | Semana 5-7 |
| 11 | Editor | Git integration (decorations, stage, commit) | Semana 7-9 |
| 12 | Terminal | Ctrl+C, command history, multi-tab | Semana 6-7 |
| 13 | Tarefas | UI de progresso com cancel/retry, conectar ReactFlow ao task runner | Semana 7-9 |
| 14 | Timeline | Substituir SAMPLE_DATA por API real, live updates | Semana 5-6 |
| 15 | Memória | Memory viewer UI, integração com chat context | Semana 6-7 |
| 16 | Diff | Word-level diff, ignore whitespace, navigation buttons | Semana 5-6 |
| 17 | Arquivos | Git decorations, file icons, virtual scroll | Semana 8-10 |
| 18 | Projetos | Project browser UI, project switcher | Semana 8-10 |

**Marcos:** Search em workspace, Git integrado, pipeline visual de tarefas, memória ativa.

### Fase 3 — Poder + Colaboração (Semanas 11-16)

| Prioridade | Bloco | O que fazer | Esforço |
|------------|-------|-------------|---------|
| 19 | Editor | Split panes, format on save, breadcrumbs | Semana 11-13 |
| 20 | Chat | Anthropic + Google + AWS streaming, multimodal | Semana 11-12 |
| 21 | Multiagente | Agent status panel, multi-agent chat view | Semana 12-14 |
| 22 | Diff | Inline editing, comment/annotation system | Semana 11-12 |
| 23 | Memória | Knowledge browser, pattern visualization | Semana 13-14 |
| 24 | Tarefas | Task search/filter, drag-sort, ETA | Semana 12-13 |
| 25 | Chat | Conversation branching, search history, export | Semana 14-16 |
| 26 | Logs | Log streaming (tail -f), export, retention | Semana 13-14 |
| 27 | Integração IAs | UI de seleção de destino + preview das regras | Semana 14-15 |

**Marcos:** Split panes, multi-agent colaborativo, multimodal, knowledge graph.

### Fase 4 — Escala + Enterprise (Semanas 17-24)

| Prioridade | Bloco | O que fazer | Esforço |
|------------|-------|-------------|---------|
| 28 | Editor | Large file handling, language workers adicionais | Semana 17-18 |
| 29 | Projetos | Multi-root workspace | Semana 17-20 |
| 30 | Projetos | Unified `.aiignore`, workspace-level `.ai/` | Semana 20-22 |
| 31 | Terminal | Working directory display, exit code, output limits | Semana 17-18 |
| 32 | Arquivos | Drag & drop, multi-select, collapsible state | Semana 18-19 |
| 33 | Aprovações | Decision reverting, export JSON/CSV, modal dedicado | Semana 19-20 |
| 34 | Chat | Temperature/parameter controls, cost tracking | Semana 20-21 |
| 35 | Editor | Inlay hints, code lens, multi-cursor UI | Semana 21-22 |
| 36 | Integração IAs | Sync status, A/B test UI | Semana 22-23 |
| 37 | Memória | Memory cleanup/compaction UI | Semana 23-24 |

**Marcos:** Multi-root workspace, todos os providers streaming, IDE completa.

---

## 16. Dependências Cruzadas

### Blocos que dependem de outros blocos

```
Chat Streaming ← Provider Router + Model Registry (já prontos)
Chat UI ← Tipos de mensagem + SSE server (criar)
Chat Context ← ContextStore + Memory (já prontos)
Search Workspace ← AST Indexer + File watcher (AST existe)
Git Integration ← File watcher + Status bar (criar watcher)
Task UI ← Task Runner + WebSocket (runner pronto)
Agent UI ← Agent Runtime + Collaboration + WebSocket (prontos)
Multi-root ← Global Settings + Project Browser (criar)
```

### Mapa de dependências

```
                                     ┌─────────────────┐
                                     │  Provider Router  │
                                     │  + Model Registry │
                                     └────────┬────────┘
                                              │
              ┌───────────────────────────────┼───────────────────────┐
              │                               │                       │
     ┌────────▼────────┐          ┌───────────▼───────────┐  ┌───────▼────────┐
     │  Agent Runtime   │          │     Chat Backend      │  │  Token Economy  │
     │  + Collaboration │          │  (stream + providers)  │  │  + ContextStore │
     └────────┬────────┘          └───────────┬───────────┘  └───────┬────────┘
              │                               │                       │
     ┌────────▼────────┐          ┌───────────▼───────────┐          │
     │   WebSocket     │◄─────────┤     SSE/WS Server     │          │
     └────────┬────────┘          └───────────┬───────────┘          │
              │                               │                       │
     ┌────────▼────────┐          ┌───────────▼───────────┐          │
     │  Agent UI       │          │     Chat UI           │          │
     │  (status, chat) │          │  (messages, input)    │          │
     └─────────────────┘          └───────────────────────┘          │
                                                                     │
     ┌───────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────┐  ┌────────────┐  ┌───────────┐  ┌────────────┐
│ Editor UI  │  │ FileExpl.  │  │ Terminal  │  │ Tasks UI   │
│ (Monaco)   │  │ (tree)     │  │ (xterm)   │  │ (pipeline) │
└────────────┘  └────────────┘  └───────────┘  └────────────┘
     │               │               │               │
     ▼               ▼               ▼               ▼
┌──────────────────────────────────────────────────────────┐
│                    File Watcher                          │
│            (chokidar + refresh dos componentes)          │
└──────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│                 IO Container (Shell, FS, HTTP)            │
│                  + Git + node-pty                         │
└──────────────────────────────────────────────────────────┘
```

---

## 17. Riscos Globais

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|---------|-----------|
| 1 | **Vício arquitetural no CLI** — código misturado entre CLI e UI | Alta | Alto | Extrair core services para pacote `@ai-devkit/core` compartilhado |
| 2 | **CSS inline em 100% dos componentes** | Já ocorre | Alto | Adotar Tailwind CSS ou CSS Modules gradualmente, componente por componente |
| 3 | **Sem estado global** — raw useState + prop drilling | Já ocorre | Alto | Adotar Zustand; migrar estado uma vez, gradualmente |
| 4 | **10 adapters de linguagem são placeholders** | Certeza | Médio | Implementar sob demanda; foco nos 3 que funcionam (NestJS, FastAPI, Go) |
| 5 | **Sem testes na web-ui** | Certeza | Alto | Adicionar Vitest + React Testing Library antes de refatorações |
| 6 | **node-pty requer build nativo** | Alta | Alto | Dockerizar ou manter fallback shell não-persistente |
| 7 | **Monaco workers aumentam bundle** | Alta | Médio | Lazy loading de workers; CDN para Monaco |
| 8 | **Multi-root workspace complexidade** | Alta | Alto | Implementar após single-project estável; inspiração no VS Code |
| 9 | **Streaming inconsistente entre providers** | Média | Alto | Implementar um provider de cada vez, testando exaustivamente |
| 10 | **Git operations lentas em repositórios grandes** | Média | Alto | Execução assíncrona com cache, debounce, rate limit |
| 11 | **Sem acessibilidade (a11y) — 0 componentes ARIA** | Certeza | Médio | Adicionar aria-* gradualmente; foco em componentes de alto uso primeiro |
| 12 | **Sem i18n — textos misturados PT/EN** | Certeza | Baixo | Adotar i18next após UI estável |

---

## 18. Estimativa de Esforço

### Por Bloco

| Bloco | Backend | Frontend | Integração | Total (dias-homem) |
|-------|---------|----------|------------|-------------------|
| 1 — Chat Central | 10 | 15 | 5 | **30** |
| 2 — Editor de Código | 5 | 20 | 5 | **30** |
| 3 — Árvore de Arquivos | 3 | 10 | 2 | **15** |
| 4 — Terminal Embutido | 5 | 8 | 3 | **16** |
| 5 — Diff/Patch Viewer | 1 | 5 | 1 | **7** |
| 6 — Execução de Tarefas | 3 | 8 | 3 | **14** |
| 7 — Aprovações | 1 | 3 | 1 | **5** |
| 8 — Timeline | 2 | 5 | 2 | **9** |
| 9 — Memória | 2 | 5 | 2 | **9** |
| 10 — Logs | 2 | 3 | 1 | **6** |
| 11 — Multiagente | 3 | 8 | 3 | **14** |
| 12 — Integração com IAs | 2 | 5 | 2 | **9** |
| 13 — Gestão de Projetos | 8 | 10 | 5 | **23** |
| **Arquitetura transversal** (Zustand, Tailwind, tests, router) | — | 15 | 5 | **20** |

### Total Estimado

| Fase | Dias-Homem | Equipe Recomendada | Duração Real |
|------|-----------|-------------------|--------------|
| Fase 1 — Fundação | 45-55 | 2 devs (1 front, 1 fullstack) | ~4 semanas |
| Fase 2 — Inteligência | 60-75 | 2-3 devs | ~6 semanas |
| Fase 3 — Poder | 55-70 | 2-3 devs | ~6 semanas |
| Fase 4 — Escala | 50-65 | 2 devs | ~8 semanas |
| **Total** | **210-265** | **2-3 devs** | **~24 semanas (6 meses)** |

### Por Tipo de Trabalho

| Tipo | % | Dias |
|------|---|------|
| Backend (serviços, APIs, providers) | 25% | ~60 |
| Frontend (componentes, UI, estados) | 50% | ~120 |
| Integração (conectar front + back) | 15% | ~35 |
| Arquitetura (estado, tema, testes, router) | 10% | ~25 |

---

> **Documento gerado em:** 2026-07-13
> **Total de blocos analisados:** 13
> **Total de lacunas identificadas:** ~110
> **Estimativa total:** ~6 meses / 210-265 dias-homem com equipe de 2-3 devs
