# Estudo Intensificado — Frontend IDEIA v2: Análise de Gap Mockup → Código

> **Data:** 2026-07-18
> **Versão:** 2.0 (intensificada com análise real de 100% dos componentes)
> **Base:** Mockup (1.047 linhas) × web-ui (32 componentes) × Theia (18 widgets) × 35 endpoints
> **Método:** Comparação linha a linha do mockup vs código real vs backend existente

---

## 1. Gap Arquitetural: web-ui vs Mockup

### 1.1 Estrutura de Layout — DIFERENTE

```
web-ui HOJE:                          mockup DESEJADO:
┌────────────────────┐                ┌────────────────────┐
│ Title Bar (simples)│                │ Title Bar (9 menus)│
├────┬─────────┬────┤                ├──┬──────────┬──────┤
│Side│  Main   │Chat│                │Act│ Sidebar  │ Right│
│bar │  Area   │    │                │Bar│+ Main    │ Panel│
│ 3  │ Editor  │    │                │ 9 │+ Bottom  │ 5    │
│tabs│ Preview │    │                │icns│ Terminal │views │
│    │ Dashbrd │    │                │   │          │      │
│    │ Agent   │    │                │   │          │      │
├────┴─────────┴────┤                ├──┴──────────┴──────┤
│ Status Bar        │                │ Status Bar         │
└────────────────────┘                └────────────────────┘
```

**Problema:** web-ui tem 3 sidebar tabs (files/search/git). Mockup tem 9 activity bar icons + sidebar + right panel. São arquiteturas de layout diferentes.

**Solução:** web-ui precisa ser reestruturado para o layout activity-bar:
- Esquerda: Activity Bar vertical (44px) com 9+ ícones
- Centro: Sidebar (explorer/search/git) + Main Area + Bottom Terminal
- Direita: Right Panel (dashboard/studies/approvals/suggestions/agent)

### 1.2 Modos vs Painéis — CONFLITO

| web-ui HOJE | mockup DESEJADO | Ação |
|------------|----------------|------|
| `'editor' | 'preview' | 'dashboard' | 'agent'` (tabs) | Activity bar + Right panel sections | Mudar de "modo tab" para "painéis simultâneos" |
| DashboardMode (full page) | Dashboard (right panel) | Converter de full page → widget |
| AgentMode (full page) | Agent (right panel) | Converter de full page → widget |
| PreviewMode (full page) | Preview (diff over main area) | Manter como overlay |
| ❌ Não tem | Studies (right panel) | **CRIAR** |
| ❌ Não tem | Approvals (right panel) | **CRIAR** (existe como widget Theia) |
| ❌ Não tem | Suggestions (right panel) | **CRIAR** |

### 1.3 Navegação — DIFERENTE

```
web-ui HOJE:                          mockup DESEJADO:
Sidebar tabs:                        Activity Bar:
  📁 Files -> sidebar mostra tree      📁 Files -> abre sidebar
  🔍 Search -> sidebar mostra busca    🔍 Search -> abre sidebar
  ⎇ Git -> sidebar mostra git          ⎇ Git -> abre sidebar
                                       📊 Dashboard -> right panel
                                       📖 Studies -> right panel
                                       ✅ Approvals -> right panel
                                       💡 Suggestions -> right panel
                                       🤖 Agent -> right panel
                                       ▶️ Run -> action
                                       ⚙️ Settings -> modal
```

---

## 2. Análise Componente por Componente

### 2.1 Tabela de Gap — 32 Componentes web-ui vs Mockup

| # | Componente web-ui | Existe? | Mockup tem? | Gap | Ação |
|---|------------------|---------|-------------|-----|------|
| 1 | **AutonomyControlTower.tsx** | ✅ | ❌ | Novo, não no mockup | Manter |
| 2 | **ChatInput.tsx** | ✅ | ✅ | Chat panel input | Alinhar design |
| 3 | **ChatMessage.tsx** | ✅ | ✅ | Bolha de mensagem | Alinhar design |
| 4 | **ChatPanel.tsx** | ✅ | ✅ | Chat IA no right panel | Alinhar |
| 5 | **CommandPalette.tsx** | ✅ | ✅ | Ctrl+Shift+P | Substituir pelo Theia |
| 6 | **ContextPanel.tsx** | ✅ | ❌ | Contexto do projeto | Manter |
| 7 | **DebugPanel.tsx** | ✅ | ❌ | DAP debug UI | **Conectar /dap** |
| 8 | **DecisionCenter.tsx** | ✅ | ❌ | Decisões pendentes | Manter |
| 9 | **DecisionHistory.tsx** | ✅ | ❌ | Histórico | Manter |
| 10 | **DiffViewer.tsx** | ✅ | ✅ | Diff side-by-side | Alinhar com mockup |
| 11 | **EditorTabs.tsx** | ✅ | ✅ | Abas do editor | Alinhar com mockup |
| 12 | **FeedbackDashboard.tsx** | ✅ | ❌ | Feedback | Manter |
| 13 | **FileExplorer.tsx** | ✅ | ✅ | Árvore de arquivos | Substituir pelo Theia |
| 14 | **KanbanBoard.tsx** | ✅ | ❌ | Kanban de tasks | Manter |
| 15 | **OnboardingWizard.tsx** | ✅ | ❌ | Primeiro uso | Manter |
| 16 | **OutlinePanel.tsx** | ✅ | ❌ | Outline do código | Substituir pelo Theia |
| 17 | **PatchPreview.tsx** | ✅ | ✅ | Approve/reject diff | Alinhar |
| 18 | **ProblemsPanel.tsx** | ✅ | ❌ | Problemas do projeto | Substituir pelo Theia |
| 19 | **QualityDashboard.tsx** | ✅ | ❌ | Qualidade | Manter |
| 20 | **QuickActions.tsx** | ✅ | ❌ | Ações rápidas | Manter |
| 21 | **SecurityPanel.tsx** | ✅ | ❌ | Segurança | Manter |
| 22 | **SelfChat.tsx** | ✅ | ❌ | Auto-diálogo da IA | Manter |
| 23 | **SelfOptimizationPanel.tsx** | ✅ | ❌ | Auto-otimização | Manter |
| 24 | **SessionHistory.tsx** | ✅ | ❌ | Histórico de sessões | Manter |
| 25 | **SettingsModal.tsx** | ✅ | ✅ | Configurações | Substituir pelo Theia |
| 26 | **StatusBar.tsx** | ✅ | ✅ | Barra de status | Substituir pelo Theia |
| 27 | **TaskHeader.tsx** | ✅ | ❌ | Cabeçalho de task | Manter |
| 28 | **TaskProgress.tsx** | ✅ | ❌ | Progresso de task | Manter |
| 29 | **TaskTimeline.tsx** | ✅ | ❌ | Timeline | Manter |
| 30 | **Terminal.tsx** | ✅ | ✅ | Terminal xterm.js | Substituir pelo Theia |
| 31 | **TimelineDashboard.tsx** | ✅ | ❌ | Timeline dashboard | Manter |
| 32 | **WorkspaceSelector.tsx** | ✅ | ❌ | Seletor de workspace | Manter |

### 2.2 Componentes que EXISTEM no Mockup mas NÃO no web-ui

| Componente | Prioridade | Esforço | Endpoint necessário |
|-----------|------------|---------|-------------------|
| **StudiesPanel** | 🔴 Alta | 2 dias | `GET /api/studies` |
| **ApprovalsPanel** | 🔴 Alta | 2 dias | `GET /api/approvals` |
| **SuggestionsPanel** | 🔴 Alta | 2 dias | `GET /api/suggestions` |
| **ActivityBar** (9+ ícones) | 🔴 Alta | 1 dia | — (navegação local) |
| **RightPanel** (container) | 🔴 Alta | 1 dia | — (navegação local) |
| **TitleBar** (9 menus) | 🟡 Média | 1 dia | Theia nativo |

### 2.3 Componentes que PODEM ser Substituídos pelo Theia

| Componente web-ui | Theia nativo | Economia |
|------------------|-------------|----------|
| FileExplorer.tsx | Navigator | ~400 linhas eliminadas |
| Terminal.tsx | Terminal | ~200 linhas eliminadas |
| CommandPalette.tsx | Quick Open | ~150 linhas eliminadas |
| SettingsModal.tsx | Preferences | ~200 linhas eliminadas |
| StatusBar.tsx | StatusBar | ~100 linhas eliminadas |
| ProblemsPanel.tsx | Problems | ~150 linhas eliminadas |
| OutlinePanel.tsx | Outline | ~100 linhas eliminadas |
| **Total eliminável** | | **~1.300 linhas** |

---

## 3. Backend: Endpoints Existentes vs Necessários

### 3.1 35 Endpoints Existentes (no CLI `ai-devkit ide`)

```
GET  /api/fs/list        GET  /api/fs/read        POST /api/fs/write
POST /api/fs/create      PATCH /api/fs/rename     DELETE /api/fs/delete
GET  /api/fs/search      POST /api/shell          GET  /api/commands
GET  /api/preview/report GET  /api/preview/file   POST /api/preview/approve
POST /api/preview/reject POST /api/session        GET  /api/session
POST /api/approval/request POST /api/approval/respond
GET  /api/memory         POST /api/memory         GET  /api/ide/status
GET  /api/audit          GET  /api/tasks          POST /api/tasks
PATCH /api/tasks/:id     GET  /api/diagnostics    GET  /api/workspace/config
POST /api/workspace/config GET /api/git/branch/compare
GET  /api/git/status     GET  /api/git/diff       POST /api/sandbox/exec
GET  /api/health         GET  /api/settings/providers
POST /api/settings/providers/priority  POST /api/settings/providers/config
```

### 3.2 8 Endpoints FALTANTES

| Endpoint | Método | Dados que retorna | Prioridade |
|----------|--------|------------------|------------|
| `GET /api/diagnostics` | JSON | `{ tests, coverage, lintErrors, gaps }` | 🔴 Bloqueia Dashboard |
| `GET /api/studies` | JSON | `[{ id, title, status, sources, startedAt }]` | 🔴 Bloqueia Studies |
| `GET /api/studies/search` | JSON | Text search nos estudos | 🟡 |
| `GET /api/approvals` | JSON | `[{ id, title, priority, context, status }]` | 🔴 Bloqueia Approvals |
| `POST /api/approvals/:id/approve` | JSON | Ação de aprovar | 🔴 |
| `POST /api/approvals/:id/reject` | JSON | Ação de rejeitar | 🔴 |
| `GET /api/suggestions` | JSON | `[{ title, description, category, impact, effort }]` | 🔴 Bloqueia Suggestions |
| `ws://host/dap` | WebSocket | DAP debug protocol | 🔴 Bloqueia Debug |

### 3.3 Dados Reais vs Mock no Dashboard

O DashboardMode HOJE já chama API real (`/api/ide/status`). O que precisa mudar:

| Card do Mockup | Fonte HOJE | Fonte DESEJADA | Endpoint |
|---------------|-----------|----------------|----------|
| Tests: 1,247 | ✅ `GET /api/ide/status` | `GET /api/diagnostics` | NOVO |
| Coverage: 87% | ❌ Mock | `GET /api/diagnostics` | NOVO |
| Gaps: 8 (3 critical) | ✅ `GET /api/ide/status` | `GET /api/gaps` | NOVO |
| Tech Debt: 14h | ❌ Mock | Scorecard calculation | NOVO |
| Pipeline: Coder/Security/etc | ❌ Mock | AgentRuntime status | Existe |
| Scope: agents/orchestration/... | ✅ File system | File scan | Existe |

---

## 4. Fluxo de Dados: Mockup → Backend

### 4.1 Diagrama de Dados por Painel

```
DASHBOARD:
  fetch('/api/diagnostics')       → { tests, coverage, lint, gaps }
  fetch('/api/ide/status')         → { agents, pipeline }
  fetch('/api/fs/list?path=.')     → { scope directories }

STUDIES:
  fetch('/api/studies')            → [{ title, status, sources }]
  fetch('/api/studies?q=text')     → filtered results

APPROVALS:
  fetch('/api/approvals')          → [{ id, title, priority, context }]
  POST /api/approvals/:id/approve  → { ok }
  POST /api/approvals/:id/reject   → { ok, reason }

SUGGESTIONS:
  fetch('/api/suggestions')        → [{ title, desc, category, impact, effort }]

DEBUG (DAP):
  ws://host:port/dap               → DAP protocol (breakpoints, stack, variables)

CHAT:
  POST /api/chat/completions       → SSE stream (delta, tool_call, done)
```

### 4.2 Tempo Real (WebSocket)

| Canal | Evento | Painel |
|-------|--------|--------|
| `ws://host:port/ws` | `file:change` | File Explorer |
| | `task:progress` | TaskProgress |
| | `approval:new` | Approvals (atualizar lista) |
| `ws://host:port/pty` | Terminal output | Terminal |
| `ws://host:port/lsp` | LSP messages | Editor |
| `ws://host:port/dap` | DAP messages | DebugPanel |

---

## 5. Recomendações de Melhoria no Processo

### 5.1 O Que Está CERTO e Deve Ser Mantido

| Prática | Por que manter |
|---------|---------------|
| Mockup HTML como fonte de design | Permite iteração rápida sem tocar em código |
| Componentes React em web-ui/ | 32 componentes, 58K linhas, código real |
| API real (sem mocks) | Dashboard já chama `/api/ide/status` real |
| DAP client + DebugPanel existem | 117 + 157 linhas prontas, só falta conectar |
| Theia como shell | 9 menus nativos, activity bar, painéis |
| Separação clara web-ui vs Theia | web-ui = conteúdo, Theia = container |

### 5.2 O Que Precisa MELHORAR

| Problema | Causa | Solução |
|----------|-------|---------|
| **web-ui tem layout diferente do mockup** | web-ui usa sidebar tabs, mockup usa activity bar | Reestruturar App.tsx para layout activity-bar |
| **Modos full-page vs painéis laterais** | web-ui trata dashboard/agent como "modos" que ocupam tela inteira | Converter para widgets que cabem no right panel |
| **5 componentes substituíveis pelo Theia** | web-ui reimplementa FileExplorer, Terminal, CommandPalette, Settings, StatusBar | Delegar para Theia quando em modo Theia |
| **3 painéis não existem** | Studies, Approvals, Suggestions | **CRIAR** a partir do mockup |
| **dap-bridge não conectada** | 215 linhas de bridge + 117 de client + 157 de UI = tudo pronto, sem fio | Adicionar endpoint WebSocket `/dap` |
| **8 endpoints faltando** | Backend não tem rotas para os novos painéis | Adicionar ao `ide-server.ts` ou `apps/api` |
| **Chat usa SSE manual** | web-ui tem SSE streaming, Theia tem `ChatAgentService` nativo | Em modo Theia, usar `@theia/ai-chat` nativo |

### 5.3 Riscos Ocultos

| Risco | Detectado por | Impacto | Mitigação |
|-------|-------------|---------|-----------|
| **web-ui App.tsx tem 483 linhas** | Análise de código | Manutenção difícil | Extrair lógica de estado para hooks |
| **DashboardMode usa dados mock misturados com reais** | Análise visual | Dashboard mostra dados inconsistentes | Consolidar tudo em `/api/diagnostics` |
| **Terminal.tsx + Theia Terminal duplicam** | Análise de componentes | Conflito de portas PTY | Decidir qual terminal usar (Theia) |
| **FileExplorer.tsx + Theia Navigator duplicam** | Análise de componentes | Dois exploradores de arquivo | Decidir qual usar (Theia nativo) |
| **Mockup tem 36 botões mas web-ui tem 0 handlers para 14 deles** | Contagem de ações | Ações de menu não funcionam | Mapear e implementar faltantes |

---

## 6. Plano de Ação Corretivo

### Fase 0 — Correção Imediata (1 dia)
```
1. Conectar DAP bridge ao servidor (/dap WebSocket endpoint)
2. Criar endpoint GET /api/diagnostics (puxar dados do jest, tsc, eslint)
```

### Fase 1 — Componentes Faltantes (3 dias)
```
3. StudiesPanel.tsx (copiar do mockup, adaptar para React, conectar API)
4. ApprovalsPanel.tsx (copiar do mockup, adaptar para React, conectar API)
5. SuggestionsPanel.tsx (copiar do mockup, adaptar para React, conectar API)
```

### Fase 2 — Reestruturação (3 dias)
```
6. App.tsx: mudar de sidebar tabs → activity bar
7. DashboardMode, AgentMode: de full-page → right panel widget
8. FileExplorer, Terminal, Settings: delegar ao Theia
```

### Fase 3 — Backend Faltante (3 dias)
```
9. GET /api/studies + /api/studies/search
10. GET /api/approvals + POST approve/reject
11. GET /api/suggestions
```

---

## 7. Conclusão

### Métricas Finais

| Métrica | Valor |
|---------|-------|
| Componentes web-ui existentes | 32 |
| Componentes que o mockup precisa | 7 novos (Studies, Approvals, Suggestions, ActivityBar, RightPanel, TitleBar) |
| Componentes substituíveis pelo Theia | 8 (FileExplorer, Terminal, CommandPalette, Settings, StatusBar, Problems, Outline, Search) |
| Endpoints existentes | 35 |
| Endpoints necessários | 8 novos |
| Linhas de DAP prontas (não conectadas) | 489 (bridge 215 + client 117 + UI 157) |
| Ações de menu faltando | 14 |
| Dias de implementação | ~10 |

### Ação Mais Urgente

Conectar o **DAP bridge** ao servidor IDE. É o trabalho de maior impacto com menor esforço: 489 linhas de código já escritas que não funcionam por falta de uma conexão WebSocket.
