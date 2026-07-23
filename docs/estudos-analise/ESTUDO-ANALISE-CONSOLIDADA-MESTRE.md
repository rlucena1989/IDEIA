# ESTUDO DE ANÁLISE CONSOLIDADA MESTRE — IDEIA

> **Data:** 2026-07-19
> **Status:** Análise completa — 4 dimensões, 74 descobertas
> **Base:** Código real do plugin Theia (ideia-theia) + pacotes @ai-devkit

---

## Índice de Descobertas

| Categoria              | Total | 🔴 Blocker                                      | 🟠 Critical | 🟡 Moderate | 🔵 Minor |
| ---------------------- | ----- | ----------------------------------------------- | ----------- | ----------- | -------- |
| Contratos & Interfaces | 16    | 3                                               | 3           | 6           | 4        |
| Integração Theia       | 38    | 5                                               | 5           | 9           | 19       |
| Tratamento de Erros    | 20    | 8                                               | 6           | 6           | 0        |
| Fluxo de Dados         | —     | Mapeamento completo de 28 arquivos, 2524 linhas |

---

## 🔴 DESCOBERTAS BLOKER (Devem ser resolvidas ANTES da migração)

### B1 — Protocol Mismatch: Frontend HTTP vs Backend JSON-RPC (Chat)

- **Arquivos:** `ideia-service-client.ts` (frontend) vs `ideia-backend-module.ts` (backend)
- **Problema:** `IDEIA_ChatClient` usa HTTP fetch (`POST /services/ideia-chat/send`, `GET /history`, etc.), enquanto o backend registra `JsonRpcConnectionHandler('/services/ideia-chat')` que espera WebSocket JSON-RPC
- **Impacto:** O ConnectionHandler do backend NUNCA é invocado pelo frontend. Backend e frontend não se comunicam para chat.

### B2 — Custom WebSocket JSON-RPC vs Theia Nativo

- **Arquivo:** `ideia-service-client.ts`
- **Problema:** `PersistentJsonRpcClient` é uma implementação manual de JSON-RPC sobre WebSocket. Theia já fornece `WebSocketConnectionProvider` + `JsonRpcProxyFactory` que fazem isso com suporte a lifecycle, reconexão e segurança.
- **Impacto:** 4 dos 5 service clients ignoram a infraestrutura de comunicação do Theia.

### B3 — AsyncIterable em JSON-RPC não suportado

- **Arquivo:** `ideia-protocol.ts`
- **Problema:** `streamMessage()` retorna `AsyncIterable<SSEEvent>`. JSON-RPC 2.0 (incluindo o do Theia) não suporta streaming de retorno — apenas requisição/resposta.
- **Impacto:** Chamadas RPC para streamMessage falham silenciosamente ou nunca retornam.

### B4 — Electron-only API em contexto Browser

- **Arquivos:** `ideia-frontend-module.ts:93-95`, `ideia-title-bar-widget.ts:3`
- **Problema:** `CustomTitleWidget` e `CustomTitleWidgetFactory` de `@theia/core/lib/electron-browser/` são exclusivos do Electron. O app atual roda em modo browser (`theia start`).
- **Impacto:** Erro em runtime quando o frontend tenta carregar módulos Electron.

### B5 — `backend.ts` é Dead Code

- **Arquivo:** `theia-app/src/backend.ts`
- **Problema:** `backend.ts` carrega módulos manualmente, faltando módulos críticos (logger, editor, filesystem, workspace, terminal, etc.). Não é referenciado por `package.json` scripts.
- **Impacto:** O entry point real é `src-gen/backend/server.js` (gerado). O `backend.ts` customizado nunca roda.

### B6 — ProviderRouter Duplicado com Comportamento Diferente

- **Arquivos:** `ideia-theia/src/node/llm-provider.ts` (próprio) vs `@ai-devkit/llm-provider` (pacote)
- **Problema:** Plugin define seu próprio `ProviderRouter` com `Map<string, Provider>`, enquanto o pacote tem outro com `Provider[]`. `getActive()` do plugin itera priority list; do pacote pega `providers[0]`.
- **Impacto:** Dois routers incompatíveis — se código misturar, comportamento imprevisível.

### B7 — ChatMessage Plugin vs Pacote: Estruturas Incompatíveis

- **Plugin:** `{ id, role, content, timestamp, toolCalls?, metadata? }`
- **Pacote:** `{ role, content, toolCalls? }` (sem id, timestamp, metadata)
- **Impacto:** Cast `messages as devkit.ChatMessage[]` suprime warnings mas perde dados.

### B8 — SSEEvent vs BusEvent: Modelos de Evento Completamente Diferentes

- **Plugin SSEEvent:** `{ type: union de 6, data: unknown }` — sem id, timestamp, source
- **Pacote BusEvent:** `{ id, type, timestamp, source, payload?, metadata? }` — estruturado
- **Impacto:** Impossível correlacionar, tracear ou replays eventos SSE no barramento de eventos.

---

## 🟠 DESCOBERTAS CRÍTICAS

### C1 — Tema IDEIA nunca registrado

- **Arquivo:** `style/ideia-theme.ts`
- `registerIdeiaTheme()` é exportado mas NUNCA chamado. Tema `ideia-dark` não existe em runtime.

### C2 — Comandos Dashboard/Approvals/Diff não registrados

- **Arquivo:** `ideia-chat-contribution.ts`
- `ideia:dashboard`, `ideia:approvals`, `ideia:diff` têm keybindings e menus mas NUNCA `registerCommand()`.

### C3 — Duplicate Styles File

- Dois arquivos idênticos: `style/ideia-styles.ts` e `src/browser/ideia-styles.ts`.

### C4 — Lifecycle WebSocket Duplica Conexão

- `ideia-lifecycle-contribution.ts` abre WebSocket raw separado para `/services/ideia-chat`, concorrendo com o JSON-RPC.

### C5 — `inversify` vs `@theia/core/shared/inversify`

- 3 arquivos importam de `inversify` direto em vez de `@theia/core/shared/inversify`. Pode causar conflito de metadados de decorators.

### C6 — AgentInfo vs AgentIdentity: Estruturas Incompatíveis

- Plugin: `{ id, name, description, status: 3 valores, currentTask?, metrics? }`
- Pacote: `{ id, name, role, permissions, model, mode, status: 5 valores, createdAt, metadata }`
- Nenhum campo de metrics no pacote; nenhum campo de role/permissions/mode no plugin.

### C7 — TaskSpec vs WorkflowTask: Modelos de Tarefa Completamente Diferentes

- Plugin: `{ id, title, description, status: 5 valores, agentId, checkpoints, createdAt }`
- Pacote: `{ id, title, description?, type, priority, status: 5 valores diferentes, phase, agent?, dependencies, complexity, effort, createdAt, updatedAt, metadata }`
- Nenhum campo compatível 1:1 exceto `id`.

### C8 — FileSystemStepExecutor Inacessível

- `@ai-devkit/agent-runtime` tem `FileSystemStepExecutor` concreto mas NÃO o exporta em `index.ts`. Só acessível via import direto de `./step-executor`.

---

## 🟡 DESCOBERTAS MODERADAS

### M1 — `bindViewContribution` redundante

- `ideia-frontend-module.ts:40-42` re-binda Command/Menu/Keybinding manualmente depois de `bindViewContribution` já fazê-lo.

### M2 — IdeiaCustomTitleWidget.WindowService nunca usado

- `WindowService` injetado mas não utilizado.

### M3 — `DockLayout` importado não usado em ChatWidget

### M4 — `crypto.randomUUID()` vs pacote `uuid`

- `ideia-chat-widget.tsx` usa `crypto.randomUUID()` que não existe em Node.js <20. O pacote `uuid` está disponível.

### M5 — Menu path 'ideia' sem label/order definido

- Menu top-level 'IDEIA' sem `order` ou `label` — default será o path literal "ideia".

### M6 — Orphaned SSE generators

- `streamMessage()` não detecta disconexão do cliente. Generator continua rodando, consumindo tokens LLM, mesmo com cliente ausente.

### M7 — Silent partial file application

- `applyChanges()` pega erro por arquivo mas não propaga ao caller. Usuário vê "aprovado" mas alguns arquivos podem não ter sido escritos.

### M8 — Memory store corruption = silent reset

- Se `memory.json` corrompe, `JSON.parse()` falha e store inicia vazio — sem log, sem backup, sem aviso.

### M9 — No atomic writes for memory.json

- Escreve arquivo inteiro em `writeFileSync` sem atomic write. Crash meio da escrita corrompe o arquivo.

### M10 — No concurrency control on approvals

- Duas aprovações simultâneas do mesmo checkpoint podem executar `applyChanges()` duas vezes (race condition).

### M11 — Orphaned pending RPC promises

- WebSocket reconecta, mensagens na fila são reenviadas, mas as que estavam pendentes (já enviadas) ficam órfãs no Map `pending` — memory leak.

### M12 — No timeout on pending RPC calls

- Se WebSocket nunca reconecta, promises pendentes ficam para sempre.

---

## 🔵 DESCOBERTAS MENORES

### m1 — `@ai-devkit/*` → `@ideia/*` renomeação pendente

### m2 — `adaptProvider()` chama `inner.chat()` com `model: ''` (string vazia)

### m3 — Plugin usa `model: 'gpt-4o'` enquanto pacote usa `'gpt-4o-mini'` como default

### m4 — `output-validator.ts` tem 34 extensões allowlist mas `SECRET_PATTERNS` só 7 regex

### m5 — StatusBar polling a cada 5s mesmo quando widget invisível

### m6 — `var(--theia-successForeground)` não existe em todos os temas

### m7 — `import * as devkit` wildcard impede tree-shaking

### m8 — Nenhum `.catch()` em promises — só try/catch

### m9 — SSHEvent.type não inclui 'heartbeat' (type cast forçado)

### m10 — `IdeaRequest` usa `'blocked'|'guided'|'autonomous'` enquanto `Decision` do pacote usa `'auto'|'ask'|'block'`

---

## Matriz de Dependências entre Descobertas

```
B1 (protocol mismatch) ← B3 (AsyncIterable) ← depende de resolver comunicação primeiro
B2 (custom WS) ← depende de B1/B3 resolvidos
B4 (Electron API) ← só relevante se formos para Electron (que é o plano!)
B5 (backend.ts dead code) ← independente, mas precisa decidir entry point
B6 (ProviderRouter duplicado) ← independente
C1 (tema não registrado) ← independente
C2 (comandos não registrados) ← independente
C4 (lifecycle WS duplicado) ← depende de B1 resolução (unificar protocolo)
C5 (inversify vs shared) ← independente, mudança global no tsconfig
M6 (orphaned generators) ← resolver junto com B1 (migrar para SSE próprio)
M8/M9 (memory store) ← independente
M10 (concurrency) ← independente
```

---

## Fluxo de Dados — Pontos de Transformação

### PT1 — Entrada do Usuário → Chat Widget

```
textarea onChange → handleSend() → ChatMessage {id, role, content, timestamp}
→ ChatRequest {conversationId, message, context?}
→ IDEIA_ChatClient.streamMessage() → HTTP POST /services/ideia-chat/stream
```

### PT2 — Stream Request → Theia Backend

```
HTTP POST → Express/Theia router → IDEIA_ChatBackendService.streamMessage()
→ buildSystemPrompt() → buildLLMMessages()
→ providerRouter.getActive().chat(messages)
→ adaptProvider() → devkit.LLMProvider.chat({model:'', messages, stream:true})
```

### PT3 — LLM Response → Tool Calls

```
AsyncIterable<devkit.ChatResponse> → adaptProvider.chat() → AsyncIterable<SSEEvent>
→ parseToolCalls() → regex extração <tool_call>
→ parseCheckpoints() → regex [CHECKPOINT:...]
→ executeToolCall() → taskRunner methods
```

### PT4 — Tool Call → File System

```
executeToolCall(match.name → switch) → taskRunner.readFile()/writeFile()/runCommand()
→ fs.readFileSync / fs.writeFileSync / child_process.execFile
→ retorna {stdout, stderr} ou {error} ou conteúdo
```

### PT5 — Backend → Frontend (SSE Stream)

```
streamMessage() generator → yield SSEEvent → HTTP Response body stream
→ fetch Response.body.getReader() → TextDecoder → split('\n')
→ 'data: ' prefix → JSON.parse → yield SSEEvent to widget
→ handleSSEEvent() → setMessagesState/checkpoints/toolCalls → re-render
```

### PT6 — Aprovação → Policy → File Write

```
User click Approve → handleApprove() → POST /services/ideia-chat/checkpoint/{id}/approve
→ approveCheckpoint() → evaluatePolicy() (pacote @ai-devkit/policy-engine)
→ validateChanges() (output-validator.ts)
→ taskRunner.applyChanges() → fs.writeFileSync → arquivos no workspace
```

### PT7 — RPC Calls (Task/Agent/Memory/Dashboard)

```
Widget → Proxy call → PersistentJsonRpcClient → WebSocket JSON-RPC
→ Theia JsonRpcConnectionHandler → Service Implementation
→ {jsonrpc:'2.0', id, result} via WebSocket → Proxy resolve
```

---

## Análise de Dependências de Build

### Grafo de Compilação (quem depende de quem)

```
@ideia/contracts (zod, dotenv) → raiz de tipos
  ├── @ideia/logger → base de logging
  ├── @ideia/policy-engine → depende de contracts
  │     └── @ideia/policy-gateway → depende de contracts + policy-engine
  ├── @ideia/audit-trail → depende de contracts + logger
  │     └── @ideia/event-bus → depende de audit-trail + contracts + logger
  │           ├── @ideia/memory-store → contracts + logger + event-bus
  │           ├── @ideia/feedback-pipeline → memory-store + event-bus + audit-trail
  │           └── @ideia/ide-integration → event-bus + trace-registry + feedback + policy-gateway
  ├── @ideia/agent-runtime → policy-engine + audit-trail + memory-store + contracts + logger
  │     └── @ideia/workflow-engine → logger (peers: delivery-orchestrator, event-bus, audit-trail)
  ├── @ideia/delivery-orchestrator → standalone
  ├── @ideia/verification-layer → logger
  ├── @ideia/llm-provider → standalone
  ├── @ideia/terminal-sandbox → logger
  ├── @ideia/prompt-security → logger
  └── @ideia/cli → 12 dependências internas (hub central)
```

### Ordem de Build

1. `contracts`, `logger` (sem dependências internas)
2. `policy-engine`, `audit-trail`, `llm-provider`, `delivery-orchestrator`, `terminal-sandbox`
3. `policy-gateway`, `event-bus`, `memory-store`
4. `agent-runtime`, `verification-layer`, `prompt-security`
5. `workflow-engine`, `feedback-pipeline`, `trace-registry`
6. `diff-engine`, `autonomous-editor`, `schema-registry`
7. Demais 45+ pacotes (maioria independentes)
8. `ide-integration` (depende de event-bus, trace-registry, feedback, policy-gateway)
9. `@ideia/plugin` (depende de ~8 packages)
10. `apps/ideia-app` (depende do plugin)

---

## Análise de Empilhamento (Stacking)

### Stack Vertical (da base ao topo)

```
Layer 5: Electron Shell (janela nativa, menu, auto-instalador)
Layer 4: Theia App (bundle, src-gen, esbuild, backend server)
Layer 3: @ideia/plugin (widgets React, serviços, temas)
Layer 2: @ideia/* packages (66 pacotes de domínio/infra)
Layer 1: TypeScript + Node.js + Inversify
```

### Stack Horizontal (comunicação entre módulos)

```
Frontend                    Backend
─────────                   ───────
Widget React  ←──── RPC ───→ Service Implementation
(5 widgets)     (WS JSON-RPC) (5 services + EventBus)
                    │
ChatWidget     ←── SSE ────→ ChatService
(stream)        (HTTP SSE)   (LLM provider + tool execution)
                    │
Lifecycle      ←── WS ─────→ ChatService
(notifications) (raw)        (event push)
                    │
FileWidget     ←── RPC ────→ TaskRunner
                    │
Dashboard      ←── RPC ────→ DashboardService (agrega agents + tasks)
```

### Stack de Eventos (atravessa toda a vertical)

```
EventBus (in-memory, maxHistory=5000)
  │
  ├── agent.started    → ChatService stream
  ├── agent.completed  → AgentService metrics
  ├── task.created     → DashboardService metrics
  ├── policy.evaluated → ChatService approval
  ├── policy.violated  → ChatService rejection
  ├── policy.ask       → ChatService ask UI
  └── task.blocked     → DashboardService metrics
```

---

## Análise Cross-Cutting: O Que Pode Dar Errado

### Combinações de Falha

| Gatilho                 | Efeito Primário             | Efeito Cascade                     | Recuperação                     |
| ----------------------- | --------------------------- | ---------------------------------- | ------------------------------- |
| LLM timeout (120s)      | streamMessage gera erro     | Tool calls não executados          | Usuário vê erro, pode re-tentar |
| Disco cheio             | memory persist falha        | Dados não salvos                   | Silencioso — perda de dados     |
| WebSocket cai           | RPCs falham                 | Tarefa/Dashboard/Memory sem acesso | Reconnect infinito              |
| Ollama reinicia         | ProviderRouter.ollama falha | Fallback pra OpenAI se configurado | Transparente                    |
| 2 approvals simultâneos | applyChanges roda 2x        | Arquivos escritos 2x               | Sem proteção                    |
| Plugin Theia corrompido | Widget não carrega          | Chat/Dashboard/Diff inacessíveis   | Erro de módulo                  |
| Rede cai no meio do SSE | streamMessage aborta        | Erro mostrado ao usuário           | Requer re-envio                 |
| memory.json corrompido  | Load começa vazio           | TODO histórico perdido             | Sem aviso                       |

---

## Resumo: Ações Obrigatórias Antes da Migração

### Must Fix (bloqueiam migração)

1. Unificar protocolo de comunicação (HTTP SSE vs JSON-RPC)
2. Eliminar Custom WebSocket RPC — usar Theia nativo
3. Migrar de browser para Electron (ou compatibilizar)
4. Decidir entry point: `backend.ts` ou `server.js` gerado
5. Alinhar contratos: Plugin ↔ Packages
6. Unificar ProviderRouter (eliminar duplicação)

### Should Fix (risco alto se ignorado)

1. Registrar tema IDEIA na inicialização
2. Registrar comandos faltantes (dashboard, approvals, diff)
3. Eliminar arquivo duplicado de estilos
4. Padronizar imports: `@theia/core/shared/inversify`
5. Adicionar atomicidade no memory store
6. Adicionar controle de concorrência em approvals
7. Propagar erros parciais de applyChanges
8. Limitar reconnect infinito do WebSocket

### Nice to Fix (qualidade de vida)

1. Substituir `crypto.randomUUID()` por `uuid` package
2. Remover dead code (DockLayout import, WindowService)
3. Corrigir menu labels
4. Adicionar logging em parseToolCalls
5. Adicionar timeout em pending RPC calls
6. Cleanup de widget onDetach

---

> **Total de ações identificadas: 28 obrigatórias + 14 recomendadas + 6 opcionais**
> **Cada ação será detalhada no Plano de Execução com arquivos, linhas e dependências.**
