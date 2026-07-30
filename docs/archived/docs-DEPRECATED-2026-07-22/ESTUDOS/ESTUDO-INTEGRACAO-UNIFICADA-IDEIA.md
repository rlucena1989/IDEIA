# Estudo de Integração Unificada — IDEIA Interface v2

> **Data:** 2026-07-18
> **Versão:** 2.0 (intensificada com dados reais do código)
> **Propósito:** Plano mestre para construir a interface unificada da IDEIA, baseado em análise real do código existente
> **Base:** 66 packages, 392K linhas, 27 componentes web-ui, 35 endpoints REST, Theia 1.73 AI API

---

## 1. Inventário Real do Código

### 1.1 Backend — Duas Opções, Mesma API

```
┌──────────────────────────────────────────────────────────────────────┐
│                      CLI `ai-devkit ide` (:3001)                      │
│                                                                      │
│  🖥️ ide-server.ts      → Express + WebSocket + Static Files          │
│  📡 api-router.ts       → 35 endpoints REST                          │
│  💬 /api/chat/completions → SSE streaming                            │
│  🔌 /ws                 → WebSocket broadcast (file:change, etc)     │
│  🔌 /lsp                → WebSocket LSP relay                        │
│  🔌 /pty                → WebSocket PTY terminal                     │
│  📁 / (static)          → web-ui dist build                          │
│                                                                      │
│  ⚠️ /dap NÃO EXISTE      → DAP bridge (215 linhas) não está         │
│                           conectada ao servidor IDE                   │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                      apps/api (:3002)                                │
│                                                                      │
│  Express server with 15 endpoints (subset do CLI ide)               │
│  ⚠️ MESMA FUNÇÃO que CLI ide, mas em processo separado              │
│  ❌ Sem WebSocket, sem LSP, sem PTY, sem static files               │
└──────────────────────────────────────────────────────────────────────┘
```

**Decisão:** `apps/api` é redundante. O backend único DEVE ser o CLI `ai-devkit ide`.

### 1.2 Frontend — web-ui (58K linhas, 27 componentes)

```
┌──────────────────────────────────────────────────────────────────────┐
│                      web-ui (Vite + React 18)                        │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Sidebar (esquerda)                                          │    │
│  │  ├── FileExplorer.tsx  (árvore + git status)                │    │
│  │  ├── GlobalSearch     (busca full-text)                     │    │
│  │  └── GitPanel         (branch, status, diff)                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Main Area                                                    │    │
│  │  ├── EditorMode    → Monaco Editor + abas                     │    │
│  │  ├── AgentMode     → Painel do agente IA                     │    │
│  │  ├── PreviewMode   → Diff + PatchPreview + approve/reject    │    │
│  │  └── DashboardMode → 7 sub-panéis de métricas                │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Painéis Direitos                                             │    │
│  │  ├── ChatPanel.tsx       → SSE streaming + tool calls        │    │
│  │  ├── DecisionCenter.tsx  → Aprovações pendentes              │    │
│  │  ├── ContextPanel.tsx    → Contexto do projeto               │    │
│  │  ├── QuickActions.tsx    → Ações rápidas                     │    │
│  │  └── TaskTimeline.tsx    → Timeline de tarefas               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Painel Inferior (Terminal)                                   │    │
│  │  ├── Terminal.tsx        → xterm.js + PTY                    │    │
│  │  └── DebugPanel.tsx      → DAP debug UI (stack, vars, REPL)  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  🔌 Chama ~13 endpoints REST + SSE no backend (:3001)               │
│  🔌 DAP client (117 linhas) mas /dap NÃO existe no servidor         │
└──────────────────────────────────────────────────────────────────────┘
```

**Descoberta crítica:** O DebugPanel (157 linhas) e o DAP client (117 linhas) existem no frontend, mas o backend **não expõe o endpoint `/dap`**. A `dap-bridge.ts` (215 linhas) que criamos está no CLI mas não está conectada ao `ide-server.ts`.

### 1.3 Theia Plugin (2.8K linhas, 18 arquivos)

```
┌──────────────────────────────────────────────────────────────────────┐
│                      ideia-theia (plugin Theia 1.73)                 │
│                                                                      │
│  Frontend Widgets:                                                   │
│  ├── ideia-chat-widget.tsx      → Chat com SSE                      │
│  ├── ideia-chat-contribution.ts → Ctrl+Shift+I, menus               │
│  ├── ideia-dashboard-widget.tsx → Dashboard                         │
│  ├── ideia-approval-widget.tsx  → Approval flow                     │
│  ├── ideia-diff-widget.tsx      → Diff viewer                       │
│  └── ideia-file-widget.tsx      → File explorer                     │
│                                                                      │
│  Backend Services:                                                   │
│  ├── ideia-chat-service.ts      → Chat + LLM + ProviderRouter       │
│  ├── ideia-task-service.ts      → File system operations            │
│  ├── ideia-agent-service.ts     → Agent lifecycle                   │
│  ├── ideia-memory-service.ts    → Memory persistence                │
│  ├── ideia-dashboard-service.ts → Dashboard metrics                 │
│  ├── llm-provider.ts            → Ollama + OpenAI + DeepSeek        │
│  └── output-validator.ts        → Secrets scan + dangerous patterns │
│                                                                      │
│  🟢 Compila sem erros (Fase 1 completa)                              │
│  🟢 Build gera 18 JS files (Fase 2.1 completa)                       │
│  ⏳ Falta conectar ao app Theia (Fase 2.2)                           │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.4 Theia 1.73 AI API Discovery

A análise do `@theia/ai-core` e `@theia/ai-chat` revelou estas APIs disponíveis:

| API Theia | Função | Usar para |
|-----------|--------|-----------|
| `LanguageModelService` | Gerenciar modelos de linguagem | Substituir ProviderRouter manual |
| `ChatAgentService` | Registrar agentes de chat | Integrar IDEIA agentes no Theia AI Chat |
| `PromptService` | Gerenciar prompts do sistema | Substituir buildSystemPrompt() manual |
| `ToolInvocationRegistry` | Registrar ferramentas | Substituir executeToolCall() manual |
| `VariableService` | Variáveis de contexto | Substituir buildLLMMessages() manual |
| `SkillService` | Habilidades do agente | Orquestrar steps do plano |
| `ChangeSet` | Gerenciar mudanças de arquivo | Substituir TaskRunner.applyChanges() |
| `ChatSessionStore` | Persistir sessões de chat | Substituir Conversation Map |

**Impacto:** O Theia AI pode SUBSTITUIR significativamente o código manual do plugin. Em vez de gerenciar conversas, LLM providers e tool calls manualmente, podemos usar as APIs nativas do Theia AI.

---

## 2. Plano de Integração Detalhado

### Fase 1 — 🟢 Backend Unificado (1 semana)

#### 1.1 Merge apps/api → CLI ide server

**Estado atual:**
- `apps/api` (porta 3002, 15 endpoints) — Express standalone
- `ai-devkit ide` (porta 3001, 35 endpoints) — Express + WS + LSP + PTY

**Ação:**
```
apps/api/ → deixa de existir como servidor independente
          → vira módulo do CLI: packages/cli/src/ide/api-standalone.ts
          → CLI `ai-devkit ide` é o ÚNICO backend
```

**Arquivos afetados:** `apps/api/src/index.ts` (redirecionar para CLI package), `package.json` root scripts

#### 1.2 Conectar DAP bridge ao servidor

**Estado atual:**
- `dap-bridge.ts` (215 linhas) — bridge DAP completa
- `dap-client.ts` (117 linhas) — cliente WebSocket no web-ui
- `DebugPanel.tsx` (157 linhas) — UI de debug no web-ui
- `/dap` endpoint **NÃO EXISTE** no `ide-server.ts`

**Ação:** Adicionar WebSocket `/dap` endpoint no `ide-server.ts`:
```typescript
// ide-server.ts
import { DAPBridge, createDAPBridge } from './dap-bridge';
const dapBridge = createDAPBridge();
wss.on('connection', (ws, req) => {
  if (req.url === '/dap') {
    // Conectar DAP bridge ao WebSocket
    dapBridge.on('dap:message', (msg) => ws.send(JSON.stringify(msg)));
    ws.on('message', (data) => {
      const { command, args } = JSON.parse(data.toString());
      dapBridge.sendMessage(sessionId, command, args);
    });
  }
});
```

**Arquivos:** `packages/cli/src/ide/ide-server.ts`, `dap-bridge.ts`

#### 1.3 Script de start único

**Ação:**
```bash
npm start  # Inicia CLI ide server na porta 3001
           # Sobe web-ui build
           # WebSocket para terminal/eventos/LSP/DAP
```

### Fase 2 — 🟡 Theia como Shell Desktop (2 semanas)

#### 2.1 Estratégia: Theia EMBUTE web-ui

Em vez de reescrever os 27 componentes do web-ui como widgets Theia, a abordagem é:

```
┌──────────────────────────────────────────────────────────────┐
│                    THEIA ELECTRON APP                         │
│                                                               │
│  ┌──────────────┐  ┌────────────────────────────────────┐   │
│  │ Left Panel    │  │  Main Area (webview de web-ui)     │   │
│  │ (Theia)       │  │                                    │   │
│  │               │  │  http://localhost:3001             │   │
│  │ File Explorer │  │  Monaco + Terminal + Debug + Diff  │   │
│  │ Search        │  │  preview + approve/reject          │   │
│  │ Git           │  │                                    │   │
│  └──────────────┘  └────────────────────────────────────┘   │
│                                                               │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Right Panel (Theia AI)                              │   │
│  │                                                    │   │
│  │  ChatAgent     → Theia AI Chat (nativo)            │   │
│  │  Dashboard     → Widget existente                  │   │
│  │  Approvals     → Widget existente                  │   │
│  │                                                    │   │
│  └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**Por que webview?**
- 27 componentes React existentes não precisam ser reescritos
- web-ui já faz tudo (editor, terminal, debug, diff, git, search)
- Theia fornece o que web-ui NÃO tem: painéis nativos, comandos, preferências
- Baixo risco: web-ui continua funcionando standalone

#### 2.2 Integrar Theia AI Chat

Em vez do widget de chat manual (que faz SSE + parse tool_calls), usar `@theia/ai-chat`:

```typescript
// Usar ChatAgentService do Theia AI
import { ChatAgentService } from '@theia/ai-chat';
import { LanguageModelService } from '@theia/ai-core';

@injectable()
class IDEIA_ChatAgent implements ChatAgent {
  async invoke(request: ChatRequest): Promise<ChatResponse> {
    const provider = this.languageModelService.getLanguageModel('ollama');
    const response = await provider.request(request);
    return response;
  }
}
```

**Benefícios:**
- Theia gerencia o histórico de conversas
- Theia gerencia o streaming
- Suporte nativo a tool calls
- Suporte nativo a mudanças de arquivo (ChangeSet)
- UI de chat nativa do Theia (não precisa do widget React manual)

#### 2.3 Widgets IDEIA nos Painéis

| Widget | Abordagem |
|--------|-----------|
| IDEIA Chat | Substituir por Theia AI Chat (nativo) |
| IDEIA Dashboard | Manter como widget React no painel direito |
| IDEIA Approvals | Manter como widget React no painel direito |
| IDEIA Diff | Substituir por Monaco diff (nativo do Theia) |
| IDEIA File | Substituir por File Explorer (nativo do Theia) |

#### 2.4 Conectar Backend Theia → API REST

Em vez de duplicar services no backend Theia, chamar a API REST:

```typescript
// Backend Theia chama API REST em vez de duplicar lógica
@injectable()
class IDEIA_ChatBackendService {
  async streamMessage(request: ChatRequest): AsyncIterable<SSEEvent> {
    const response = await fetch('http://localhost:3001/api/chat/completions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    // Process SSE stream
  }
}
```

**Arquivos:** `ideia-theia/src/node/` — todos os services podem ser thin clients REST

### Fase 3 — 🔴 Produto Final (2-3 semanas)

#### 3.1 Electron + Theia

```bash
# Empacotar Theia app como Electron
npx theia build          # Build do Theia app
npx electron-builder     # Gera .exe / .dmg / .AppImage
```

**Configuração Electron:**
```json
{
  "build": {
    "appId": "ai.ideia.app",
    "productName": "IDEIA",
    "directories": { "output": "dist" },
    "win": { "target": ["nsis"], "icon": "assets/icon.ico" },
    "mac": { "target": ["dmg"], "icon": "assets/icon.icns" },
    "linux": { "target": ["AppImage"], "icon": "assets/icon.png" }
  }
}
```

#### 3.2 Testes E2E

| Teste | O que verifica | Script |
|-------|---------------|--------|
| Plugin carrega | Theia app inicia sem erros | `test-plugin.ps1` |
| web-ui carrega | webview abre em http://localhost:3001 | Teste manual |
| Chat funciona | Mensagem enviada → resposta recebida | `chat-completions.test.ts` |
| Terminal abre | PTY conecta e executa comando | `terminal.test.ts` |
| LSP responde | Hover info no TypeScript | `lsp.test.ts` |
| DAP conecta | Debug breakpoint → stack aparece | `dap.test.ts` |

---

## 3. Mapa de Integração Completo

### 3.1 Caminhos de Dados

```
Usuário → Theia Electron App
           │
           ├── Left Panel (Theia nativo)
           │     File Explorer → fs API → ai-devkit ide (:3001)
           │     Search        → fs/search → ai-devkit ide
           │     Git           → git/* → ai-devkit ide
           │
           ├── Main Area (webview → web-ui)
           │     Editor Monaco  → local (webview)
           │     Terminal       → /pty WS → ai-devkit ide
           │     Debug Panel    → /dap WS → DAP Bridge → Node Debug
           │     Diff/Approve   → /api/preview/* → ai-devkit ide
           │
           └── Right Panel (Theia AI)
                 Chat Agent     → LanguageModelService → LLM Provider
                 Dashboard      → /api/status → ai-devkit ide
                 Approvals      → /api/audit → ai-devkit ide
```

### 3.2 Tabela de Substituições (web-ui → Theia)

| Funcionalidade | web-ui | Theia | Estratégia |
|---------------|--------|-------|------------|
| Monaco Editor | ✅ EditorMode.tsx | ✅ Nativo | Manter web-ui (webview) |
| File Explorer | ✅ FileExplorer.tsx | ✅ Nativo | Usar Theia nativo no left panel |
| Terminal | ✅ Terminal.tsx (xterm) | ✅ Nativo | Manter web-ui (webview) |
| Chat | ✅ ChatPanel.tsx | ✅ Theia AI Chat | **Migrar** para Theia AI nativo |
| Diff | ✅ DiffViewer.tsx | ✅ Theia diff | Manter web-ui + Theia fallback |
| Debug | ✅ DebugPanel.tsx | ✅ Theia DAP | **Migrar** conectar DAP bridge |
| Git | ✅ GitPanel (inline) | ⚠️ Parcial | Manter web-ui |
| Search | ✅ GlobalSearch (inline) | ✅ Nativo | Usar Theia nativo |
| Preferences | ✅ SettingsModal.tsx | ✅ Nativo | Usar Theia nativo |
| Command Palette | ✅ CommandPalette.tsx | ✅ Nativo | Usar Theia nativo |
| Dashboard | ✅ DashboardMode | ✅ Widget | Manter ambos |
| Approvals | ✅ PatchPreview | ✅ Widget | Manter ambos |

### 3.3 O Que Pode Ser ELIMINADO (Redundâncias)

| Arquivo | Motivo | Substituído por |
|---------|--------|----------------|
| `contacts/` (todo diretório) | Package vazio/sem uso | Remover |
| `apps/api/` | Redundante com CLI ide | Fundir no CLI |
| `ideia-theia/src/node/ideia-chat-service.ts` | Theia AI Chat nativo | `@theia/ai-chat` |
| `ideia-theia/src/node/llm-provider.ts` | Theia LanguageModelService | `@theia/ai-core` |
| `ideia-theia/src/node/ideia-task-service.ts` | API REST faz o mesmo | Chamar REST |
| `ideia-theia/src/node/ideia-memory-service.ts` | API REST faz o mesmo | Chamar REST |
| `ideia-theia/src/node/ideia-agent-service.ts` | Theia ChatAgentService | `@theia/ai-core` |

---

## 4. Cronograma Detalhado

```
Dia 1-2:  F1.1 Merge apps/api → CLI ide
          F1.2 Conectar DAP bridge (/dap WebSocket)
          F1.3 Testar 35 endpoints + 4 WS + 2 LSP/DAP

Dia 3-5:  F2.1 Theia app com webview do web-ui
          F2.2 Integrar Theia AI Chat (LanguageModelService)
          F2.3 Configurar left panel (File Explorer nativo)
          F2.4 Widgets Dashboard + Approvals no right panel
          F2.5 Conectar backend Theia → REST API

Dia 6-10: F3.1 Electron package (Theia + web-ui)
          F3.2 Tema IDEIA (style/ideia.css → Theia)
          F3.3 Testes E2E (plugin, chat, terminal, LSP, DAP)
          F3.4 Testes de performance (carga, memória)
```

---

## 5. Riscos Técnicos (Atualizados)

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| webview CORS/security blocks | Alta | Alto | Configurar proxy reverso no Theia |
| Theia AI Chat API difere da documentação | Média | Alto | Testar com app Theia real |
| DAP bridge timing (connect/disconnect) | Média | Médio | Adicionar testes de timeout |
| web-ui 58K linhas → webview performance | Alta | Médio | Lazy loading + code splitting |
| Theia Electron build falha no Windows | Baixa | Alto | CI matrix com Windows build |

---

## 6. Conclusão

### O Que NÃO Precisa Ser Feito
- **Reescrever web-ui** — os 27 componentes, 58K linhas são reutilizados via webview
- **Reescrever backend** — CLI `ai-devkit ide` com 35 endpoints é suficiente
- **Reimplementar LSP** — Theia já tem nativo
- **Reimplementar DAP** — DAP bridge (215 linhas) + DAP client (117 linhas) estão prontos, só falta conectar

### O Que PRECISA Ser Feito (Prioridade)
1. 🔴 Conectar DAP bridge ao servidor (1 endpoint WebSocket)
2. 🔴 Theia app com webview do web-ui (1 dia)
3. 🟡 Migrar chat manual para Theia AI Chat nativo (2 dias)
4. 🟡 Conectar backend Theia → REST API (1 dia)
5. 🟢 Electron package + testes E2E (3 dias)

### Total: 5-10 dias úteis para MVP funcional
