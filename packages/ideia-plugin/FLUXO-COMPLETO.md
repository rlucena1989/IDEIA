# Fluxo Completo: Ideia → Sistema

## Arquitetura de Plugins Theia para o IDEIA

### Estrutura de Diretórios

```
ideia-theia/
├── package.json                          ← Plugin Theia (theiaExtensions)
├── tsconfig.json                         ← TypeScript config (experimentalDecorators)
├── src/
│   ├── browser/
│   │   ├── ideia-chat-widget.tsx         ← Widget React do Chat
│   │   ├── ideia-chat-contribution.ts    ← Commands, Menus, Keybindings
│   │   ├── ideia-file-widget.tsx         ← File explorer com diff tree
│   │   ├── ideia-diff-widget.tsx         ← Diff viewer side-by-side
│   │   ├── ideia-approval-widget.tsx     ← Approval panel centralizado
│   │   ├── ideia-dashboard-widget.tsx    ← Dashboard com métricas
│   │   ├── ideia-service-client.ts       ← Frontend JSON-RPC/SSE clients
│   │   └── ideia-frontend-module.ts      ← ContainerModule frontend (Inversify)
│   ├── common/
│   │   ├── ideia-protocol.ts             ← Interfaces de serviço e paths
│   │   └── ideia-types.ts               ← Tipos compartilhados
│   └── node/
│       ├── ideia-backend-module.ts       ← ContainerModule backend (Inversify)
│       ├── ideia-chat-service.ts         ← Chat + SSE streaming + LLM
│       ├── ideia-task-service.ts         ← Task runner + file system
│       ├── ideia-agent-service.ts        ← Agent lifecycle management
│       ├── ideia-memory-service.ts       ← Memory store persistente
│       └── ideia-dashboard-service.ts    ← Dashboard metrics aggregation
└── style/
    └── ideia.css                         ← Tema e animações IDEIA
```

## Fluxo Passo a Passo

````
┌─────────────────────────────────────────────────────────────────────────┐
│  1. Usuário abre Theia → Plugin IDEIA carrega                          │
│                                                                         │
│     Theia lê package.json → theiaExtensions                             │
│       ├── Frontend: Inversify DI registra widgets, comandos, serviços   │
│       └── Backend:  Inversify DI registra services, JSON-RPC handlers   │
│                                                                         │
│     Resultado: Ctrl+Shift+I → Chat Widget aparece no painel direito    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  2. Widget de Chat aparece no painel direito                           │
│                                                                         │
│     ideia-frontend-module.ts:                                           │
│       bind(ViewContribution).to(IDEIA_ChatContribution)                 │
│       bind(WidgetFactory).toDynamicValue({ id: 'ideia:chat' })         │
│                                                                         │
│     O AbstractViewContribution registra automaticamente:                │
│       - Toggle view no painel direito                                   │
│       - Comando ideia:chat                                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  3. Usuário digita "quero um CRUD de usuários"                        │
│                                                                         │
│     ideia-chat-widget.tsx:                                              │
│       1. Cria ChatMessage { role: 'user', content }                    │
│       2. Renderiza no scroll                                            │
│       3. Chama chatService.streamMessage(request)                       │
│       4. Abre fetch POST para /services/ideia-chat/stream              │
│       5. Inicia leitura do body como SSE (text/event-stream)           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  4. Frontend envia para Backend via HTTP POST + SSE                    │
│                                                                         │
│     ideia-service-client.ts (IDEIA_ChatClient):                         │
│       POST /services/ideia-chat/stream                                  │
│       Content-Type: application/json                                    │
│       Body: { conversationId, message, context }                        │
│                                                                         │
│     Response: text/event-stream (SSE)                                   │
│       data: {"type":"message","data":"I'll create..."}                 │
│       data: {"type":"tool_call","data":{...}}                           │
│       data: {"type":"checkpoint","data":{...}}                         │
│       data: [DONE]                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  5. Backend chama ai-devkit ProviderRouter → LLM                       │
│                                                                         │
│     ideia-chat-service.ts (IDEIA_ChatBackendService):                   │
│       1. Build system prompt com contexto do workspace                  │
│       2. Monta array de mensagens (system + history + user)            │
│       3. Fetch para LLM endpoint (Ollama/OpenAI/DeepSeek)             │
│       4. Lê resposta como stream de chunks JSON                        │
│       5. Para cada chunk:                                               │
│          a. Extrai texto → yield SSEEvent { type: 'message' }          │
│          b. Parseia <tool_call> tags → yield SSEEvent { type:          │
│             'tool_call' }                                              │
│          c. Parseia [CHECKPOINT:...] → yield SSEEvent { type:          │
│             'checkpoint' }                                             │
│       6. Salva mensagens no histórico da conversação                   │
│       7. Emite eventos no EventBus (agent.started, agent.completed)    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  6. Streaming volta para Frontend via SSE                              │
│                                                                         │
│     Frontend (IDEIA_ChatWidget):                                        │
│       for await (const event of chatService.streamMessage(request)) {  │
│         switch (event.type) {                                          │
│           case 'message':   → append text to last assistant message    │
│           case 'tool_call': → show tool call status in message         │
│           case 'checkpoint':→ add to approval panel + inline buttons   │
│           case 'error':     → show error state                         │
│           case 'done':      → finalize, stop loading                   │
│         }                                                              │
│       }                                                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  7. LLM gera plano com checkpoints                                    │
│                                                                         │
│     Exemplo de saída da LLM:                                           │
│                                                                         │
│     I'll create a complete User CRUD system.                           │
│                                                                         │
│     [CHECKPOINT:approval:Create Project Structure:Initialize the       │
│      project with NestJS, TypeORM, PostgreSQL]                          │
│                                                                         │
│     ```backend/src/users/user.entity.ts                                │
│     @Entity() export class User { ... }                                │
│     ```                                                                │
│                                                                         │
│     [CHECKPOINT:approval:Implement CRUD Endpoints:Create users         │
│      controller, service, DTOs, and validation]                         │
│                                                                         │
│     Each checkpoint requires user approval before execution.           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  8. Checkpoints aparecem no Approval Widget                            │
│                                                                         │
│     ideia-approval-widget.tsx:                                          │
│       Cada checkpoint vira um card com:                                 │
│       ┌──────────────────────────────────────────────────┐             │
│       │  Create Project Structure                        │             │
│       │  Initialize with NestJS, TypeORM, PostgreSQL     │             │
│       │  ┌────────┐  ┌────────┐                         │             │
│       │  │Approve │  │ Reject │                         │             │
│       │  └────────┘  └────────┘                         │             │
│       │  ~ backend/src/users/user.entity.ts               │             │
│       │  + backend/src/users/users.controller.ts          │             │
│       └──────────────────────────────────────────────────┘             │
│                                                                         │
│     Inline no Chat Widget também mostra botões Approve/Reject          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  9. Usuário aprova → Backend chama TaskRunner                         │
│                                                                         │
│     ideia-chat-service.ts:                                              │
│       approveCheckpoint(id):                                            │
│         1. Marca checkpoint como 'approved'                             │
│         2. Extrai FileChanges do checkpoint                             │
│         3. Chama taskRunner.applyChanges(changes)                       │
│         4. Emite evento 'policy.evaluated' no EventBus                  │
│                                                                         │
│     ideia-task-service.ts (IDEIA_TaskRunner):                           │
│       applyChanges(changes):                                            │
│         for each FileChange:                                            │
│           added:    fs.writeFileSync(targetPath, content)               │
│           modified: fs.writeFileSync(targetPath, content)               │
│           deleted:  fs.unlinkSync(targetPath)                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  10. Resultado aparece no Diff Widget + File Explorer atualiza         │
│                                                                         │
│     ideia-diff-widget.tsx:                                              │
│       Side-by-side diff viewer:                                         │
│       ┌──────────────┐  ┌──────────────┐                               │
│       │   Original    │  │   Modified   │                               │
│       │               │  │               │                              │
│       │  (old code)   │  │  (new code)  │                              │
│       │               │  │               │                              │
│       └──────────────┘  └──────────────┘                               │
│                                                                         │
│     ideia-file-widget.tsx:                                              │
│       ├─ src/                          ← NEW (highlighted)             │
│       │  ├─ users/                     ← NEW                           │
│       │  │  ├─ user.entity.ts          ← NEW [NEW]                     │
│       │  │  ├─ users.controller.ts     ← NEW [NEW]                     │
│       │  │  └─ users.service.ts        ← NEW [NEW]                     │
│       │  └─ app.module.ts              ← MOD [MOD]                     │
│       └─ ...                                                            │
└─────────────────────────────────────────────────────────────────────────┘
````

## Diagrama de Componentes

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                             THEIA FRONTEND (Browser)                            │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  ideia-frontend-module.ts (ContainerModule)                              │   │
│  │                                                                          │   │
│  │  bind(ViewContribution).to(IDEIA_ChatContribution)                       │   │
│  │  bind(CommandContribution).to(IDEIA_ChatContribution)                    │   │
│  │  bind(WidgetFactory).to(IDEIA_ChatWidget)                                │   │
│  │                                                                          │   │
│  │  ┌───────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │   │
│  │  │ IDEIA_ChatWidget  │  │ IDEIA_DiffWidget  │  │ IDEIA_ApprovalWidget │  │   │
│  │  │ (React + SSE)     │  │ (Side-by-side)    │  │ (Checkpoint Cards)   │  │   │
│  │  └────────┬──────────┘  └──────────────────┘  └──────────────────────┘  │   │
│  │           │                                                               │   │
│  │  ┌───────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │   │
│  │  │ IDEIA_Dashboard   │  │ IDEIA_FileWidget  │  │ ideia-service-client │  │   │
│  │  │ (Metrics Display) │  │ (Diff Tree)       │  │ (HTTP + SSE + RPC)   │  │   │
│  │  └───────────────────┘  └──────────────────┘  └──────────┬───────────┘  │   │
│  └──────────────────────────────────────────────────────────┼──────────────┘   │
│                                                              │                   │
│                               JSON-RPC / HTTP SSE / WebSocket                    │
│                                                              │                   │
└──────────────────────────────────────────────────────────────┼──────────────────┘
                                                               │
                                                               ▼
┌──────────────────────────────────────────────────────────────┼──────────────────┐
│                             THEIA BACKEND (Node.js)          │                   │
│                                                              │                   │
│  ┌──────────────────────────────────────────────────────────┼───────────────┐   │
│  │  ideia-backend-module.ts (ContainerModule)               │               │   │
│  │                                                          │               │   │
│  │  bind(ConnectionHandler).to(JsonRpcConnectionHandler)    │               │   │
│  │                                                          │               │   │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐  │               │   │
│  │  │ IDEIA_ChatBackend   │  │ IDEIA_TaskRunner         │  │               │   │
│  │  │ - SSE Streaming     │  │ - File System Operations │  │               │   │
│  │  │ - LLM Integration   │  │ - Shell Command Exec     │  │               │   │
│  │  │ - Tool Calls        │  │ - Task Lifecycle         │  │               │   │
│  │  │ - Checkpoints       │  │                          │  │               │   │
│  │  └────────┬────────────┘  └──────────┬───────────────┘  │               │   │
│  │           │                          │                   │               │   │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐  │               │   │
│  │  │ IDEIA_AgentBackend  │  │ IDEIA_MemoryBackend      │  │               │   │
│  │  │ - Agent Registry    │  │ - Persistent Store       │  │               │   │
│  │  │ - Lifecycle Mgr     │  │ - Search (keyword)       │  │               │   │
│  │  │ - Metrics           │  │ - Auto-persist to JSON   │  │               │   │
│  │  └─────────────────────┘  └──────────────────────────┘  │               │   │
│  │                                                          │               │   │
│  │  ┌──────────────────────────────────────────────────┐    │               │   │
│  │  │ EventBus (@ai-devkit/event-bus)                  │    │               │   │
│  │  │ - task.created, agent.started, policy.evaluated   │    │               │   │
│  │  └──────────────────────────────────────────────────┘    │               │   │
│  └──────────────────────────────────────────────────────────┘               │   │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Padrões de Injeção de Dependência (Inversify)

### Frontend (browser/ideia-frontend-module.ts)

```typescript
// Services (clients HTTP/SSE)
bind(IDEIA_ChatService).to(IDEIA_ChatClient).inSingletonScope();
bind(IDEIA_TaskService).to(IDEIA_TaskClient).inSingletonScope();

// Widgets
bind(IDEIA_ChatWidget).toSelf().inSingletonScope();
bind(WidgetFactory).toDynamicValue((ctx) => ({
  id: IDEIA_ChatWidget.ID,
  createWidget: () => ctx.container.get(IDEIA_ChatWidget),
}));

// Contributions (automatically collected)
bind(ViewContribution).to(IDEIA_ChatContribution);
bind(CommandContribution).to(IDEIA_ChatContribution);
```

### Backend (node/ideia-backend-module.ts)

```typescript
// Core services
bind(EventBus)
  .toDynamicValue(() => createEventBus(5000))
  .inSingletonScope();
bind(IDEIA_ChatService).to(IDEIA_ChatBackendService).inSingletonScope();
bind(IDEIA_TaskService).to(IDEIA_TaskRunner).inSingletonScope();

// JSON-RPC Connection Handlers
bind(ConnectionHandler).toDynamicValue(
  (ctx) => new JsonRpcConnectionHandler('/services/ideia-chat', () => ctx.container.get(IDEIA_ChatService)),
);
```

## Eventos do Barramento

| Evento             | Disparado por         | Consumido por                      |
| ------------------ | --------------------- | ---------------------------------- |
| `agent.started`    | ChatService           | Dashboard (atualiza status)        |
| `agent.completed`  | ChatService           | Dashboard, AgentService (métricas) |
| `task.created`     | TaskRunner            | Dashboard (nova task na lista)     |
| `task.updated`     | TaskRunner            | FileWidget, DiffWidget             |
| `task.blocked`     | TaskRunner            | ApprovalWidget                     |
| `policy.evaluated` | ChatService (approve) | Dashboard (histórico)              |
| `policy.violated`  | ChatService (reject)  | Dashboard (histórico)              |

## Pontos de Extensão Theia Utilizados

| Ponto                    | Classe                   | Uso                                        |
| ------------------------ | ------------------------ | ------------------------------------------ |
| `ViewContribution`       | `IDEIA_ChatContribution` | Widget de chat no painel direito           |
| `CommandContribution`    | `IDEIA_ChatContribution` | Comandos ideia:chat, ideia:dashboard, etc. |
| `KeybindingContribution` | `IDEIA_ChatContribution` | Ctrl+Shift+I, Ctrl+Shift+D                 |
| `MenuContribution`       | `IDEIA_ChatContribution` | Menu IDEIA, context menu                   |
| `WidgetFactory`          | factories no módulo      | Criação sob demanda de widgets             |
| `ConnectionHandler`      | backend module           | JSON-RPC sobre WebSocket                   |
| `Command`                | commands registrados     | Atalhos e palette de comandos              |
| `MessageService`         | widgets                  | Notificações toast                         |
