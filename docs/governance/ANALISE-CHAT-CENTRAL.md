# AnÃ¡lise â€” Chat Central do AI-Devkit

**Objetivo:** Identificar o que existe e o que falta para o ai-devkit ter um chat central funcional como interface principal da IDE.

**Data:** 2026-07-13
**Base:** Leitura direta de ~200 arquivos entre CLI, Core, Web UI, scripts, providers e dados de runtime.

---

## 0. DiagnÃ³stico da SituaÃ§Ã£o Atual

**O ai-devkit NÃƒO TEM um chat funcional.** Zero. O que existe sÃ£o peÃ§as isoladas e desconectadas:

| O que | Status | Detalhe |
|---|---|---|
| Chat UI (`AgentMode.tsx`) | **Placeholder vazio** | 11 linhas, texto "em breve" |
| Streaming (`commands/stream.ts`) | **Stub documental** | 148 linhas que sÃ³ printam instruÃ§Ãµes |
| Interface do provedor | **Completa** | 5 providers (OpenAI, Anthropic, Google, AWS, Ollama) |
| Multi-turn conversacional | **SÃ³ no Agent Collaboration** | `collaboration.ts` â€” mas apenas Ollama, sem streaming |
| Provedores com streaming | **NENHUM** | Todos usam `stream: false` ou `res.json()` |
| HistÃ³rico de conversa | **Inexistente** | Nenhuma estrutura de mensagens acumuladas |
| RAG | **Completo** | TF-IDF + Neural IVF, chunk/embed/search/rerank/cite |
| Mirror Ledger | **Completo** | Hash-chain imutÃ¡vel de todas as chamadas LLM |
| Experiment/A-B | **Completo** | Multi-modelo paralelo/sequencial |
| Servidor Web UI | **REST only** | Sem SSE, WebSocket ou streaming |
| Contexto operacional | **Completo (TS)** | 8 classes em `context/` â€” mas em memÃ³ria, nÃ£o persiste |
| MemÃ³ria | **Duplicada** | TS classes em `memory/` + scripts em `update-memory.js` â€” desconectadas |
| DecisÃµes | **Fragmentada** | 3 sistemas distintos (CLI traces, decisions-log.md, session-log.md) |
| Planejamento | **Template-only** | 3 passos fixos, sem persistÃªncia |
| AprovaÃ§Ã£o humana | **Em memÃ³ria** | `approval-flow.ts` â€” perdida ao reiniciar |
| Autonomia adaptativa | **Completo** | `autonomy-policy.ts` â€” 3 nÃ­veis, ajuste por confianÃ§a/falha |
| Tool calling | **MCP passivo** | Apenas via JSON-RPC stdio, nÃ£o por LLM |
| MCP Server | **Completo** | 12 ferramentas registradas, chamadas via `spawnSync` |

---

## 1. Arquitetura MÃ­nima do Chat

### 1.1 Estado Atual vs. NecessÃ¡rio

```
ESTADO ATUAL:
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                                                     â”‚
â”‚  AgentMode.tsx â”€â”€â†’ (placeholder vazio)              â”‚
â”‚  stream.ts â”€â”€â†’ (stub que sÃ³ printa)                 â”‚
â”‚  providers/* â”€â”€â†’ query(prompt) â†’ string (stateless) â”‚
â”‚  collaboration.ts â”€â”€â†’ agent messages (Ollama only)  â”‚
â”‚  rag.ts â”€â”€â†’ search â†’ buildRagPrompt()               â”‚
â”‚  mirror/* â”€â”€â†’ recordCall() â†’ ledger (audit)         â”‚
â”‚  memory/* â”€â”€â†’ in-memory (nÃ£o persiste)              â”‚
â”‚  context/* â”€â”€â†’ in-memory (nÃ£o persiste)             â”‚
â”‚  approval-flow.ts â”€â”€â†’ in-memory (nÃ£o persiste)      â”‚
â”‚  planner/* â”€â”€â†’ template 3-passos (nÃ£o persiste)     â”‚
â”‚  decision/* â”€â”€â†’ in-memory traces                    â”‚
â”‚  mcp.ts â”€â”€â†’ JSON-RPC passivo (spawnSync)            â”‚
â”‚                                                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

```
ARQUITETURA NECESSÃRIA:
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                         CHAT UI                            â”‚
â”‚  (React + Monaco + Terminal embutido + Streaming SSE)      â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                     CHAT ORCHESTRATOR                      â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚ Session  â”‚ â”‚ Message  â”‚ â”‚ Context  â”‚ â”‚ Tool Executorâ”‚  â”‚
â”‚  â”‚ Manager  â”‚ â”‚ History  â”‚ â”‚ Builder  â”‚ â”‚ (MCP client) â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚ Memory   â”‚ â”‚ Decision â”‚ â”‚ Planning â”‚ â”‚ Approval     â”‚  â”‚
â”‚  â”‚ Store    â”‚ â”‚ Logger   â”‚ â”‚ Engine   â”‚ â”‚ Gate         â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                   PROVIDER LAYER (com streaming)           â”‚
â”‚  OpenAI(SSE)  Anthropic(SSE)  Google(SSE)  Ollama(stream) â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚              INFRAESTRUTURA EXISTE (REUSAR)                â”‚
â”‚  RAG â”‚ Mirror â”‚ Memory TS â”‚ Context TS â”‚ MCP Server        â”‚
â”‚  Experiments â”‚ Autonomy Policy â”‚ Provider Router           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 1.2 Camadas Propostas

| Camada | Responsabilidade | Aproveitar existente? |
|---|---|---|
| **Chat UI** | React + Monaco + terminal + streaming SSE/WebSocket | âŒ Criar do zero (`AgentMode.tsx` Ã© placeholder) |
| **Chat Orchestrator** | Gerencia sessÃ£o, mensagens, contexto, tools, decisÃµes | âš ï¸ Adaptar de `collaboration.ts` |
| **Session Manager** | Inicia/resume/persiste sessÃµes de chat | âš ï¸ `pre-start-context.js` + `session-state.json` |
| **Message History** | Array crescente de mensagens, persistido a cada turno | âŒ Criar do zero |
| **Context Builder** | Monta contexto das fontes .ai + RAG + git diff | âœ… `rag.ts` + `prompt-engine.js` existem |
| **Tool Executor** | Executa ferramentas via MCP (ou diretamente) | âœ… `mcp.ts` (reformar para async/stream) |
| **Memory Store** | Persiste aprendizado, padrÃµes, liÃ§Ãµes | âš ï¸ `memory/` classes TS existem mas vazam ao reiniciar |
| **Decision Logger** | Registra decisÃµes tomadas no chat | âš ï¸ `decision/` classes TS existem mas nÃ£o persistem |
| **Planning Engine** | Plano dinÃ¢mico (nÃ£o template fixo) | âŒ `planner/` Ã© template 3-passos |
| **Approval Gate** | Pausa para aprovaÃ§Ã£o humana em aÃ§Ãµes de risco | âœ… `approval-flow.ts` + `agent-security.ts` |
| **Provider Layer** | LLMs com streaming SSE | âš ï¸ Providers existem mas sem streaming |

---

## 2. Dados NecessÃ¡rios

### 2.1 Modelo de Dados do Chat (criar)

```typescript
// â”€â”€â”€ Mensagens â”€â”€â”€
interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  
  // Para mensagens do assistente
  streaming?: boolean;
  modelId?: string;
  provider?: string;
  
  // Para chamadas de ferramenta
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  
  // Para rastreamento
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
  parentId?: string;        // encadeamento
  metadata?: Record<string, unknown>;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rejected';
  result?: unknown;
  error?: string;
  approvalRequired?: boolean;
  approved?: boolean;
  startedAt?: string;
  completedAt?: string;
}

// â”€â”€â”€ SessÃ£o â”€â”€â”€
interface ChatSession {
  id: string;
  title: string;
  mode: 'development' | 'security' | 'debugging' | 'planning' | 'review';
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  context: SessionContext;
  decisions: DecisionRecord[];
  checkpoints: Checkpoint[];
  metrics: SessionMetrics;
}

interface SessionContext {
  project: string;
  branch: string;
  activeTask?: string;
  stack: { languages: string[]; frameworks: string[]; packageManager: string };
  contextFiles: string[];        // arquivos relevantes lidos
  ragContext: string[];          // chunks do RAG usados
  handoffSummary: string;        // resumo da sessÃ£o anterior
  mode: string;                  // modo de sessÃ£o
  autonomyLevel: 'autonomous' | 'guided' | 'blocked';
}

// â”€â”€â”€ DecisÃ£o â”€â”€â”€
interface DecisionRecord {
  id: string;
  sessionId: string;
  messageId: string;
  type: 'approval' | 'choice' | 'rejection' | 'delegation';
  description: string;
  options: DecisionOption[];
  selected: string;
  rationale: string;
  timestamp: string;
  approvedBy?: string;         // humano ou 'autonomous'
}

// â”€â”€â”€ Checkpoint â”€â”€â”€
interface Checkpoint {
  id: string;
  sessionId: string;
  phase: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs-decision';
  summary: string;
  timestamp: string;
  decision?: DecisionRecord;
}

// â”€â”€â”€ MÃ©tricas â”€â”€â”€
interface SessionMetrics {
  totalTokensIn: number;
  totalTokensOut: number;
  totalCost: number;
  totalLatency: number;
  toolCallsExecuted: number;
  toolsApproved: number;
  toolsRejected: number;
  errors: number;
}
```

### 2.2 PersistÃªncia (estrutura de diretÃ³rios)

```
.ai/
â”œâ”€â”€ chat/
â”‚   â”œâ”€â”€ sessions/
â”‚   â”‚   â”œâ”€â”€ index.json              â† lista de sessÃµes
â”‚   â”‚   â””â”€â”€ {sessionId}/
â”‚   â”‚       â”œâ”€â”€ session.json        â† ChatSession
â”‚   â”‚       â”œâ”€â”€ messages.jsonl      â† append-only log de mensagens
â”‚   â”‚       â”œâ”€â”€ decisions.jsonl     â† decisÃµes da sessÃ£o
â”‚   â”‚       â”œâ”€â”€ checkpoints.jsonl   â† checkpoints
â”‚   â”‚       â””â”€â”€ metrics.json        â† SessionMetrics
â”‚   â”‚
â”‚   â””â”€â”€ memory/                     â† (jÃ¡ existe, mas integrar!)
â”‚       â”œâ”€â”€ session-log.md
â”‚       â”œâ”€â”€ decisions-log.md
â”‚       â”œâ”€â”€ knowledge-base.json
â”‚       â”œâ”€â”€ lessons-learned.md
â”‚       â””â”€â”€ patterns.json           â† detectados automaticamente
```

### 2.3 Dados que JÃ EXISTEM e devem ser integrados

| Fonte | Formato | Como integrar |
|---|---|---|
| `.ai/session-state.json` | JSON | Alimenta `SessionContext` inicial |
| `.ai/session-mode.json` | JSON | Define `mode` da sessÃ£o |
| `.ai/context/ai-handoff.md` | MD | Resumo da sessÃ£o anterior â†’ `handoffSummary` |
| `.ai/stack.json` | JSON | Alimenta `stack` |
| `.ai/memory/decisions-log.md` | MD | Importar decisÃµes anteriores |
| `.ai/memory/knowledge-base.json` | JSON | Importar aprendizado anterior |
| `.ai/reports/collaboration/*.json` | JSON | Importar sessÃµes de agente como histÃ³rico |
| `.ai/local-ai/rag/vectors.json` | JSON | Fonte do RAG |
| `.ai/local-ai/index/documents.json` | JSON | Ãndice TF-IDF |
| `.ai/reports/local-ai/mirror/ledger.jsonl` | JSONL | Auditoria de chamadas (read-only) |

---

## 3. ServiÃ§os NecessÃ¡rios

### 3.1 ServiÃ§os que JÃ EXISTEM (reusar)

| ServiÃ§o | Arquivo | O que faz | Precisa mudar? |
|---|---|---|---|
| **Provider Router** | `local-ai/provider-router.ts` | Roteia chamadas entre 5 providers + fallback Ollama | Adicionar streaming |
| **RAG Pipeline** | `local-ai/rag.ts` (415 linhas) | Chunk â†’ embed â†’ index â†’ search â†’ rerank â†’ cite | Nada (completo) |
| **IVF Vector Index** | `local-ai/vector-index.ts` | k-means clustering, ANN search | Nada (completo) |
| **Mirror Recorder** | `local-ai/mirror/recorder.ts` | Auditoria imutÃ¡vel de chamadas | Integrar ao `recordCall()` do chat |
| **Experiment Runner** | `local-ai/experiment/runner.ts` | A/B multi-modelo | Nada (completo) |
| **Context Registry** | `context/context-registry.ts` | Gerencia contextos operacionais | Adicionar persistÃªncia |
| **Memory Store** | `memory/memory-store.ts` | Store + pattern detection + learning | Adicionar persistÃªncia |
| **Decision Engine** | `explanation/decision-trace.ts` | Structured decision traces | Adicionar persistÃªncia |
| **Approval Flow** | `governance/approval-flow.ts` | Create + approve/deny requests | Adicionar persistÃªncia |
| **Autonomy Policy** | `runtime/autonomy-policy.ts` | 3 nÃ­veis, ajuste adaptativo | Nada (completo) |
| **Agent Security** | `runtime/agent-security.ts` | 11 aÃ§Ãµes com polÃ­ticas de seguranÃ§a | Nada (completo) |
| **MCP Server** | `commands/mcp.ts` (cli) + `core/bin/mcp-server.js` | 12+ ferramentas via JSON-RPC | Reformar para async streaming |
| **Provider Implementations** | `local-ai/providers/*.ts` | 4 cloud + 1 local | Adicionar streaming SSE |
| **Chunker** | `local-ai/chunker.ts` | Chunk por boundaries | Nada (completo) |
| **Freshness Tracker** | `local-ai/freshness.ts` | TTL cache, reindex parcial | Nada (completo) |
| **Model Registry** | `local-ai/models.ts` + `experiment/registry.ts` | 11 modelos com capabilities | Nada (completo) |
| **Classifier** | `local-ai/classifier.ts` | Classifica tarefas | Nada (completo) |

### 3.2 ServiÃ§os que PRECISAM SER CRIADOS

| ServiÃ§o | Responsabilidade | Prioridade | Complexidade |
|---|---|---|---|
| **ChatSessionManager** | CRUD de sessÃµes, persistÃªncia em disco, index | ðŸ”´ Alta | MÃ©dia |
| **MessageHistory** | Append-only log de mensagens, scroll, search | ðŸ”´ Alta | MÃ©dia |
| **StreamingProvider** | Wrapper SSE sobre cada provider | ðŸ”´ Alta | Alta |
| **ChatOrchestrator** | Loop: user msg â†’ context â†’ tool plan â†’ LLM â†’ response â†’ log | ðŸ”´ Alta | Alta |
| **ConversationSummarizer** | Resume n mensagens para caber no context window | ðŸŸ  MÃ©dia | MÃ©dia |
| **ToolPlanner** | Decide quais ferramentas chamar baseado na mensagem | ðŸŸ  MÃ©dia | Alta |
| **DynamicPlanner** | Plano variÃ¡vel (nÃ£o template 3-passos) | ðŸŸ  MÃ©dia | Alta |
| **PersistenceBridge** | Salva/carrega ContextRegistry, MemoryStore, DecisionEngine | ðŸŸ  MÃ©dia | Baixa |
| **ApprovalPersistence** | Persiste approval requests em disco | ðŸŸ  MÃ©dia | Baixa |
| **SSEServer** | Endpoint de streaming no Web UI server | ðŸŸ  MÃ©dia | MÃ©dia |
| **WebSocketServer** | Canal bidirecional para o chat | ðŸŸ¡ Baixa | MÃ©dia |
| **MemoryConsolidator** | Une TS classes + shell scripts em uma fonte Ãºnica | ðŸŸ¡ Baixa | MÃ©dia |

### 3.3 IntegraÃ§Ãµes com ServiÃ§os Existentes

```
Chat Orchestrator
â”œâ”€â”€ â†’ ProviderRouter (com streaming)
â”œâ”€â”€ â†’ RAG Pipeline (context augmentation)
â”œâ”€â”€ â†’ Mirror Recorder (audit)
â”œâ”€â”€ â†’ ContextRegistry (current operational context)
â”œâ”€â”€ â†’ MemoryStore (past learnings)
â”œâ”€â”€ â†’ AutonomyPolicy (approval gate level)
â”œâ”€â”€ â†’ AgentSecurity (tool validation)
â”œâ”€â”€ â†’ DecisionEngine (log decisions)
â”œâ”€â”€ â†’ ApprovalFlow (human approval)
â”œâ”€â”€ â†’ MCP tools (execute actions)
â”œâ”€â”€ â†’ Planner (task decomposition)
â””â”€â”€ â†’ Snapshot (project state)
```

---

## 4. Fluxos NecessÃ¡rios

### 4.1 Fluxo Principal: Ciclo de Conversa

```
USUÃRIO                    CHAT                        PROVIDER              INFRA
  â”‚                         â”‚                            â”‚                     â”‚
  â”‚  digita mensagem        â”‚                            â”‚                     â”‚
  â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€>â”‚                            â”‚                     â”‚
  â”‚                         â”‚                            â”‚                     â”‚
  â”‚                         â”‚  1. SessionManager.ensure()â”‚                     â”‚
  â”‚                         â”‚  2. MessageHistory.append()â”‚                     â”‚
  â”‚                         â”‚  3. ContextBuilder.build() â”‚                     â”‚
  â”‚                         â”‚    â”œâ”€â”€ project manifest    â”‚                     â”‚
  â”‚                         â”‚    â”œâ”€â”€ stack.json          â”‚                     â”‚
  â”‚                         â”‚    â”œâ”€â”€ git diff (se muda)  â”‚                     â”‚
  â”‚                         â”‚    â”œâ”€â”€ RAG search query    â”‚                     â”‚
  â”‚                         â”‚    â”œâ”€â”€ memory past patternsâ”‚                     â”‚
  â”‚                         â”‚    â”œâ”€â”€ active context      â”‚                     â”‚
  â”‚                         â”‚    â””â”€â”€ handoff summary     â”‚                     â”‚
  â”‚                         â”‚                            â”‚                     â”‚
  â”‚                         â”‚  4. ToolPlanner.analyze()  â”‚                     â”‚
  â”‚                         â”‚    â”œâ”€â”€ precisa executar?   â”‚                     â”‚
  â”‚                         â”‚    â”œâ”€â”€ qual ferramenta?    â”‚                     â”‚
  â”‚                         â”‚    â””â”€â”€ precisa aprovaÃ§Ã£o?  â”‚                     â”‚
  â”‚                         â”‚         â”‚                  â”‚                     â”‚
  â”‚                         â”‚  5. ApprovalGate.check()   â”‚                     â”‚
  â”‚                         â”‚    â””â”€â”€ se risco alto:      â”‚                     â”‚
  â”‚  pede aprovaÃ§Ã£o         â”‚        pausa               â”‚                     â”‚
  â”‚<â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚                            â”‚                     â”‚
  â”‚  aprova                 â”‚                            â”‚                     â”‚
  â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€>â”‚                            â”‚                     â”‚
  â”‚                         â”‚                            â”‚                     â”‚
  â”‚                         â”‚  6. ToolExecutor.run()     â”‚                     â”‚
  â”‚                         â”‚    â”œâ”€â”€ MCP tool call       â”‚                     â”‚
  â”‚                         â”‚    â””â”€â”€ resultado + diff    â”‚                     â”‚
  â”‚                         â”‚                            â”‚                     â”‚
  â”‚                         â”‚  7. Provider.query(stream) â”‚                     â”‚
  â”‚  streaming resposta     â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€>â”‚                     â”‚
  â”‚<â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â”‚â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â”‚                     â”‚
  â”‚                         â”‚                            â”‚                     â”‚
  â”‚                         â”‚  8. MessageHistory.append()â”‚                     â”‚
  â”‚                         â”‚  9. DecisionLogger.log()   â”‚                     â”‚
  â”‚                         â”‚ 10. Mirror.recordCall()    â”‚                     â”‚
  â”‚                         â”‚ 11. MemoryStore.learn()    â”‚                     â”‚
  â”‚                         â”‚ 12. SessionManager.save()  â”‚                     â”‚
  â”‚                         â”‚                            â”‚                     â”‚
```

### 4.2 Fluxo de Streaming (NOVO â€” nÃ£o existe)

```
Provider (ex: OpenAI)
â”‚
â”‚  POST /v1/chat/completions { stream: true }
â”‚
â”‚  SSE: data: {"choices":[{"delta":{"content":"A"}}]}
â”‚  SSE: data: {"choices":[{"delta":{"content":"lgo"}}]}
â”‚  SSE: data: {"choices":[{"delta":{"content":"ritmo"}}]}
â”‚  SSE: data: [DONE]
â”‚
â”œâ”€â”€â†’ Chat Orchestrator (accumula chunks)
â”‚    â”œâ”€â”€â†’ UI via SSE (cada chunk)
â”‚    â””â”€â”€â†’ ao final: MessageHistory.append(completo)
â”‚
â””â”€â”€â†’ Mirror Recorder (ao final)
     promptHash, responseHash, tokens, latency, cost
```

**MudanÃ§as necessÃ¡rias nos providers:**
- `OpenAiProvider.query()` â†’ `queryStream(prompt): AsyncIterable<string>` â€” lÃª `response.body.getReader()` e parseia SSE
- `AnthropicProvider.query()` â†’ mesmo pattern (SSE diferente)
- `GoogleProvider.query()` â†’ `generateContentStream` API
- `OllamaProvider.query()` â†’ mudar `stream: false` para `stream: true` e parsear JSON lines

### 4.3 Fluxo de Planejamento (NOVO â€” substitui template fixo)

```
USUÃRIO: "Implementar CRUD de usuÃ¡rios"
  â”‚
  â–¼
Chat Orchestrator
  â”‚
  â”œâ”€â”€ 1. Classifier.classify() â†’ "feature"
  â”œâ”€â”€ 2. Planner.createPlan()  â†’ [
  â”‚       { step: "Gerar entity User", tool: "generate" },
  â”‚       { step: "Criar DTOs", tool: "dto-generate" },
  â”‚       { step: "Criar use cases", tool: "generate" },
  â”‚       { step: "Criar testes", tool: "test-generate" },
  â”‚       { step: "Validar com quality gate", tool: "verify" }
  â”‚    ]
  â”œâ”€â”€ 3. ApprovalGate.check(plano) â†’ [se risco alto]
  â”œâ”€â”€ 4. ExecuÃ§Ã£o passo-a-passo com checkpoint
  â”‚    â””â”€â”€ Cada passo: tool call â†’ resultado â†’ feedback â†’ prÃ³ximo
  â””â”€â”€ 5. Progresso via SSE para UI
```

### 4.4 Fluxo de AprovaÃ§Ã£o Humana

```
AGENTE QUER EXECUTAR AÃ‡ÃƒO DE RISCO:
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚ write_file â†’ /etc/config.yml â”‚
  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â–¼
  AgentSecurity.validateAction()
  â†’ { allowed: false, requiresApproval: true, riskLevel: 'high' }
         â–¼
  ApprovalFlow.createRequest()
  â†’ { id, action: 'write_file', target: '/etc/config.yml', 
       riskLevel: 'high', reason: 'fora do workspace' }
         â–¼
  AutonomyPolicy.shouldAutoExecute()
  â†’ false (modo 'guided', risco 'high')
         â–¼
  Chat Orchestrator â†’ UI â†’ "âš ï¸ Preciso de aprovaÃ§Ã£o para:
     Escrever em /etc/config.yml. Risco: ALTO. [Aprovar] [Rejeitar] [Modificar]"
         â–¼
  USUÃRIO CLICA "APROVAR"
         â–¼
  ApprovalFlow.approve()
  â†’ grava DecisionRecord
  â†’ ToolExecutor.executa aÃ§Ã£o
  â†’ retorna resultado + diff
```

### 4.5 Fluxo de MemÃ³ria (aprendizado contÃ­nuo)

```
A CADA ITERAÃ‡ÃƒO DE CHAT:
  â”‚
  â”œâ”€â”€ MemoryStore.append({ category: 'failure', desc: 'build quebrou', severity: 'high' })
  â”‚   â””â”€â”€ PatternDetector.detect() â†’ frequÃªncia de tags
  â”‚       â””â”€â”€ LearningEngine.recommend() â†’ "considere rodar lint antes de build"
  â”‚           â””â”€â”€ PolicyAdapter.adapt() â†’ ajusta autonomyLevel
  â”‚
  â”œâ”€â”€ DecisionLogger.log({ type: 'approval', description, options, selected, rationale })
  â”‚
  â””â”€â”€ SessionManager.save()
      â”œâ”€â”€ /sessions/{id}/messages.jsonl  â† append
      â”œâ”€â”€ /sessions/{id}/decisions.jsonl â† append
      â”œâ”€â”€ /sessions/{id}/metrics.json    â† update
      â””â”€â”€ /sessions/index.json           â† update metadata
```

---

## 5. Gaps CrÃ­ticos

### ðŸ”´ Gaps Impeditivos (sem isso o chat nÃ£o funciona)

| # | Gap | O que falta | Arquivos afetados | EsforÃ§o |
|---|---|---|---|---|
| G1 | **Chat UI zero** | `AgentMode.tsx` Ã© placeholder de 11 linhas | `packages/web-ui/src/modes/AgentMode.tsx` | Alto |
| G2 | **Streaming em provedores** | Nenhum provider implementa `stream: true` | `local-ai/providers/openai.ts`, `anthropic.ts`, `google.ts`, `aws.ts`, `ollama.ts` | Alto |
| G3 | **Servidor SSE/WebSocket** | Web UI server nÃ£o tem endpoint de streaming | `packages/web-ui/server/index.ts` | MÃ©dio |
| G4 | **HistÃ³rico de mensagens** | Nenhuma estrutura de `ChatMessage[]` existe | `packages/cli/src/` (criar `chat/`) | MÃ©dio |
| G5 | **PersistÃªncia de sessÃ£o de chat** | SessÃµes existem sÃ³ para colaboraÃ§Ã£o de agentes | Criar `.ai/chat/sessions/` schema | MÃ©dio |
| G6 | **Chat Orchestrator** | NÃ£o existe o loop central userâ†’contextâ†’toolsâ†’LLMâ†’responseâ†’log | Criar mÃ³dulo central | Alto |

### ðŸŸ  Gaps Bloqueadores (comprometem a experiÃªncia)

| # | Gap | O que falta | EsforÃ§o |
|---|---|---|---|
| G7 | **Tool calling por LLM** | Nenhum provider suporta function calling nativo | MÃ©dio |
| G8 | **Planejamento dinÃ¢mico** | `planner/` Ã© template 3-passos fixo, nÃ£o raciocina | Alto |
| G9 | **Memory/Context sem persistÃªncia** | Classes TS em memÃ³ria, perdem tudo ao reiniciar | Baixo |
| G10 | **AprovaÃ§Ã£o sem persistÃªncia** | `approval-flow.ts` perde requisiÃ§Ãµes ao reiniciar | Baixo |
| G11 | **DecisÃµes fragmentadas** | 3 sistemas diferentes, sem integraÃ§Ã£o | MÃ©dio |
| G12 | **Embeddings sÃ³ Ollama** | Nenhum provider cloud de embedding implementado | Baixo |
| G13 | **Token counting por aproximaÃ§Ã£o** | Usa `word.split(/\s+/)` em vez de tokenizer real | Baixo |
| G14 | **Interface `AiProvider` sem streaming** | `query(prompt) â†’ Promise<ProviderResponse>` nÃ£o suporta AsyncIterable | MÃ©dio |

### ðŸŸ¡ Gaps de Qualidade

| # | Gap | O que falta | EsforÃ§o |
|---|---|---|---|
| G15 | **Sem testes no chat** (obviamente â€” nÃ£o existe) | TDD do chat | Alto |
| G16 | **Context Registry nÃ£o lÃª `.ai/context/`** | Classes TS isoladas dos arquivos de runtime | Baixo |
| G17 | **Memory Store nÃ£o lÃª `.ai/memory/`** | Mesmo problema do G16 | Baixo |
| G18 | **Decision Engine nÃ£o escreve em `decisions-log.md`** | Traces ficam em memÃ³ria | Baixo |
| G19 | **`stream.ts` Ã© stub** | Comando CLI de streaming sÃ³ printa instruÃ§Ãµes | Baixo |
| G20 | **Nenhum suporte a multimodal** | Providers nÃ£o enviam imagens, Ã¡udio, etc. | Baixo |

---

## 6. Proposta de MVP do Chat

### 6.1 Escopo MÃ­nimo ViÃ¡vel

O MVP deve entregar **um ciclo completo de conversa funcional** com um provedor, streaming, histÃ³rico e uma ferramenta. Tudo o resto Ã© evoluÃ§Ã£o.

**Estimativa:** 2-3 semanas (1 dev full-time)

### 6.2 O que o MVP faz

```
USUÃRIO                                                    CHAT MVP
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Abre o web-ui                                        â†’ Modo Chat (substitui AgentMode placeholder)
Digita: "Qual o status do projeto?"                  â†’ RAG search nos documentos do projeto
                                                     â†’ Provider: Ollama (local, sem custo)
                                                     â†’ Streaming: resposta token a token via SSE
                                                     â†’ HistÃ³rico: mensagens persistem em .ai/chat/
Digita: "Rode o quality gate"                        â†’ Tool call: executa MCP `run_quality_gate`
                                                     â†’ AprovaÃ§Ã£o: pausa se risco alto
                                                     â†’ Resultado: diff/output exibido no chat
Fecha e reabre                                       â†’ SessÃ£o carregada, contexto retomado
```

### 6.3 Arquivos a Criar/Modificar

```
CRIAR:
  packages/cli/src/chat/
  â”œâ”€â”€ types.ts                    â† ChatMessage, ChatSession, ToolCall, etc.
  â”œâ”€â”€ session-manager.ts          â† CRUD persistido de sessÃµes
  â”œâ”€â”€ message-history.ts          â† append-only log de mensagens
  â”œâ”€â”€ chat-orchestrator.ts        â† loop principal
  â”œâ”€â”€ streaming-provider.ts       â† wrapper AsyncIterable sobre providers
  â”œâ”€â”€ tool-executor.ts            â† executa MCP tools com approval gate
  â””â”€â”€ conversation-summarizer.ts  â† resume para caber no context window

  packages/web-ui/src/
  â”œâ”€â”€ components/chat/
  â”‚   â”œâ”€â”€ ChatPanel.tsx            â† container principal
  â”‚   â”œâ”€â”€ MessageList.tsx          â† scroll infinito de mensagens
  â”‚   â”œâ”€â”€ MessageBubble.tsx        â† mensagem individual (user/assistant/tool)
  â”‚   â”œâ”€â”€ ChatInput.tsx            â† textarea + send + tool selector
  â”‚   â”œâ”€â”€ ToolCallCard.tsx         â† card de tool call (status, result, approve)
  â”‚   â””â”€â”€ StreamingContent.tsx     â† renderiza conteÃºdo streaming em tempo real
  â”œâ”€â”€ hooks/
  â”‚   â”œâ”€â”€ useChat.ts               â† estado do chat (mensagens, streaming, erros)
  â”‚   â””â”€â”€ useSSE.ts               â† conexÃ£o SSE para streaming
  â”œâ”€â”€ lib/
  â”‚   â””â”€â”€ chat-api.ts              â† chamadas REST + SSE para o backend
  â””â”€â”€ modes/AgentMode.tsx          â† SUBSTITUIR placeholder pelo ChatPanel

  packages/web-ui/server/
  â”œâ”€â”€ routes/chat.ts               â† POST /api/chat/send (SSE streaming)
  â”œâ”€â”€ routes/sessions.ts           â† CRUD de sessÃµes
  â””â”€â”€ services/chat-service.ts     â† conecta Web UI ao Chat Orchestrator

MODIFICAR:
  packages/cli/src/local-ai/providers/openai.ts
    â†’ adicionar mÃ©todo queryStream(prompt): AsyncIterable<string>
  packages/cli/src/local-ai/providers/anthropic.ts
    â†’ idem
  packages/cli/src/local-ai/providers/google.ts
    â†’ idem
  packages/cli/src/local-ai/providers/aws.ts
    â†’ idem
  packages/cli/src/local-ai/ollama.ts
    â†’ mudar stream:false para stream:true
  packages/cli/src/local-ai/provider-router.ts
    â†’ adicionar queryWithStreaming()
    â†’ adicionar queryWithTools() (function calling)
  packages/cli/src/commands/stream.ts
    â†’ SUBSTITUIR stub por implementaÃ§Ã£o real
  packages/web-ui/server/index.ts
    â†’ adicionar SSE endpoint + rotas de chat
```

### 6.4 DependÃªncias do MVP

| DependÃªncia | JÃ¡ existe? | Alternativa |
|---|---|---|
| Ollama local | Sim (provider) | Usa como fallback enquanto cloud providers nÃ£o tÃªm streaming |
| RAG pipeline | Completo (415 linhas) | Reuso direto |
| MCP tools | 12 ferramentas | Reuso direto (reformar para async) |
| Approval flow | `approval-flow.ts` (em memÃ³ria) | Adicionar persistÃªncia |
| Agent security | `agent-security.ts` | Reuso direto |
| Autonomy policy | `autonomy-policy.ts` | Reuso direto |
| Mirror ledger | `mirror/recorder.ts` | Reuso direto |
| Provider router | `provider-router.ts` | Modificar para streaming |

### 6.5 Cronograma Sugerido

| Semana | Entrega |
|---|---|
| **1** | `ChatMessage` types + `SessionManager` + `MessageHistory` + persistÃªncia |
| **2** | `StreamingProvider` (todos os providers) + `ChatOrchestrator` (loop bÃ¡sico sem tools) |
| **3** | Chat UI (ChatPanel, MessageList, StreamingContent, useChat, useSSE) + SSE server + integraÃ§Ã£o |

---

## 7. Proposta de EvoluÃ§Ã£o do Chat

### 7.1 Fase 1 â€” MVP (semanas 1-3)

- Chat UI funcional com streaming
- 1 provedor (Ollama local + OpenAI configurÃ¡vel)
- HistÃ³rico de mensagens persistido
- RAG integrado como contexto automÃ¡tico
- 1 ferramenta (quality gate)
- AprovaÃ§Ã£o humana simples (sim/nÃ£o)
- SessÃµes podem ser retomadas

### 7.2 Fase 2 â€” Ferramentas e Planejamento (semanas 4-6)

- Tool calling nativo (function calling da OpenAI/Anthropic)
- Ferramentas MCP auto-descobertas via `tools/list`
- Planejamento dinÃ¢mico (LLM decide os passos, nÃ£o template fixo)
- Checkpoints com rollback
- AprovaÃ§Ã£o por diff (mostra o diff antes de aplicar)
- ExecuÃ§Ã£o de tarefas do backlog via chat (`"execute a prÃ³xima task"`)

### 7.3 Fase 3 â€” MemÃ³ria e DecisÃµes (semanas 7-8)

- PersistenceBridge: une TS classes com arquivos `.ai/`
- Aprendizado automÃ¡tico: padrÃµes â†’ recomendaÃ§Ãµes â†’ ajuste de polÃ­ticas
- Memory consolidator: elimina duplicaÃ§Ã£o entre TS classes e shell scripts
- DecisÃµes unificadas: CLI traces + decisions-log.md + session-log.md = uma fonte
- Lessons learned automaticamente extraÃ­dos de sessÃµes de chat
- Contexto enriquecido com padrÃµes histÃ³ricos do projeto

### 7.4 Fase 4 â€” Multi-Agente e ColaboraÃ§Ã£o (semanas 9-10)

- Chat como interface do multi-agent collaboration (jÃ¡ existe em `collaboration.ts`)
- DelegaÃ§Ã£o de subtarefas para agentes especializados via chat
- Acompanhamento de progresso em tempo real (checkpoints â†’ SSE)
- MÃºltiplos provedores simultÃ¢neos (ex: GPT-4 para planejar, Claude para cÃ³digo)
- A/B testing integrado ao chat (experimenta com 2 modelos, mostra o melhor)

### 7.5 Fase 5 â€” IDE Completa (semanas 11-12)

- Chat + Editor Monaco integrados (diff automÃ¡tico de mudanÃ§as propostas)
- Terminal embutido no chat (executa comandos, mostra output ao vivo)
- Timeline de decisÃµes visÃ­vel no chat
- Preview de mudanÃ§as (diff side-by-side) antes de aplicar
- ExportaÃ§Ã£o de sessÃ£o como documentaÃ§Ã£o (`.md` auto-gerado)

---

## Anexo A: Mapa do que Existe vs. Precisa Existir

| Componente | Existe? | Arquivo(s) | Precisa |
|---|---|---|---|
| **Chat UI (React)** | Placeholder | `AgentMode.tsx` (11 linhas) | Reescrever completamente |
| **Streaming SSE** | Stub | `commands/stream.ts` (148 linhas sÃ³ doc) | Implementar |
| **Provedor OpenAI** | âœ… Completo (sem streaming) | `local-ai/providers/openai.ts` (50 linhas) | + `queryStream()` |
| **Provedor Anthropic** | âœ… Completo (sem streaming) | `local-ai/providers/anthropic.ts` (39 linhas) | + `queryStream()` |
| **Provedor Google** | âœ… Completo (sem streaming) | `local-ai/providers/google.ts` (47 linhas) | + `queryStream()` |
| **Provedor AWS** | âœ… Completo (sem streaming) | `local-ai/providers/aws.ts` (120 linhas) | + `queryStream()` |
| **Ollama** | âœ… Completo (sem streaming) | `local-ai/ollama.ts` (68 linhas) | Mudar `stream:true` |
| **Provider Router** | âœ… Completo | `local-ai/provider-router.ts` (184 linhas) | + `queryWithStreaming()` |
| **Model Registry** | âœ… Completo | `local-ai/models.ts`, `experiment/registry.ts` | Nada |
| **RAG Pipeline** | âœ… Completo | `local-ai/rag.ts` (415 linhas) | Nada |
| **IVF Index** | âœ… Completo | `local-ai/vector-index.ts` | Nada |
| **Embeddings** | âœ… Completo (TF-IDF + Ollama) | `local-ai/embeddings.ts` | + cloud embeddings |
| **Mirror Ledger** | âœ… Completo | `local-ai/mirror/` | Integrar ao chat |
| **Experiment Runner** | âœ… Completo | `local-ai/experiment/runner.ts` | Nada |
| **Context Registry** | âœ… Completo (em memÃ³ria) | `context/context-registry.ts` | + persistÃªncia |
| **Memory Store** | âœ… Completo (em memÃ³ria) | `memory/memory-store.ts` | + persistÃªncia |
| **Decision Engine** | âœ… Completo (em memÃ³ria) | `explanation/decision-trace.ts` | + persistÃªncia |
| **Approval Flow** | âœ… Completo (em memÃ³ria) | `governance/approval-flow.ts` | + persistÃªncia |
| **Autonomy Policy** | âœ… Completo | `runtime/autonomy-policy.ts` | Nada |
| **Agent Security** | âœ… Completo | `runtime/agent-security.ts` | Nada |
| **MCP Tools** | âœ… Completo | `commands/mcp.ts` (cli) + `core/bin/mcp-server.js` | Reformar para async |
| **Planner** | Template 3-passos | `planner/execution-plan.ts` | Reescrever (dinÃ¢mico) |
| **Chat Orchestrator** | âŒ NÃ£o existe | â€” | Criar |
| **ChatSessionManager** | âŒ NÃ£o existe | â€” | Criar |
| **MessageHistory** | âŒ NÃ£o existe | â€” | Criar |
| **Tool Executor** | âŒ NÃ£o existe | â€” | Criar (usar MCP) |
| **SSE Server** | âŒ NÃ£o existe | `web-ui/server/index.ts` | Adicionar |
| **Tool Calling (LLM)** | âŒ NÃ£o existe | â€” | Adicionar aos providers |
| **Multimodal** | âŒ NÃ£o existe | â€” | Futuro |
| **Testes de Chat** | âŒ NÃ£o existe | â€” | TDD |

---

## Anexo B: Pipeline de Dados do Chat (fluxo completo)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   FRONTEND   â”‚     â”‚   WEB UI SERVER  â”‚     â”‚  CHAT ORCHESTRATORâ”‚
â”‚  (React)     â”‚     â”‚   (Express)      â”‚     â”‚  (Node/TS)        â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤     â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤     â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ ChatPanel    â”‚â”€â”€â”€â”€>â”‚ POST /chat/send  â”‚â”€â”€â”€â”€>â”‚ parseIntent()     â”‚
â”‚ MessageList  â”‚     â”‚ { sessionId,     â”‚     â”‚ buildContext()    â”‚
â”‚ ChatInput    â”‚     â”‚   message }       â”‚     â”‚   â”œâ”€ project     â”‚
â”‚ Streaming-   â”‚<â•â•â•â•â”‚ SSE /chat/stream â”‚<â•â•â•â•â”‚   â”œâ”€ git diff     â”‚
â”‚ Content      â”‚     â”‚ (chunks)         â”‚     â”‚   â”œâ”€ RAG search  â”‚
â”‚ ToolCallCard â”‚     â”‚                  â”‚     â”‚   â”œâ”€ memory      â”‚
â”‚ DecisionCard â”‚     â”‚                  â”‚     â”‚   â””â”€ handoff     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â”‚ planTools()      â”‚
                                               â”‚   â”œâ”€ precisa     â”‚
                                               â”‚   â”œâ”€ qual tool   â”‚
                                               â”‚   â””â”€ aprovaÃ§Ã£o?  â”‚
                                               â”‚ executeTools()   â”‚
                                               â”‚   â”œâ”€ MCP call    â”‚
                                               â”‚   â””â”€ diff/result â”‚
                                               â”‚ queryLLM()       â”‚
                                               â”‚   â”œâ”€ streaming   â”‚
                                               â”‚   â””â”€ accumulate  â”‚
                                               â”‚ logAndPersist()  â”‚
                                               â”‚   â”œâ”€ messages    â”‚
                                               â”‚   â”œâ”€ decisions   â”‚
                                               â”‚   â”œâ”€ metrics     â”‚
                                               â”‚   â”œâ”€ mirror      â”‚
                                               â”‚   â””â”€ session     â”‚
                                               â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Resumo Executivo

O ai-devkit tem **90% da infraestrutura necessÃ¡ria** para um chat, mas as peÃ§as estÃ£o soltas:

| O que jÃ¡ existe (reusar) | O que falta (criar) |
|---|---|
| 5 providers de LLM | Streaming em todos os providers |
| RAG completo (chunk â†’ embed â†’ search â†’ cite) | Chat UI (React) |
| Provider Router com fallback | Chat Orchestrator (loop) |
| Mirror Ledger (auditoria) | Session Manager (persistido) |
| MCP Server (12 ferramentas) | Message History (append-only log) |
| Approval Flow + Agent Security | Tool Executor (MCP client) |
| Autonomy Policy adaptativa | SSE Server no Web UI |
| Context Registry (TS classes) | PersistenceBridge (TS â†” disco) |
| Memory Store + Pattern Detection | Tool calling (function calling LLM) |
| Decision Engine + Traces | Tokenizer real |
| Experiment Runner (A/B) | Multimodal |

**O gap real nÃ£o Ã© tÃ©cnico â€” Ã© de orquestraÃ§Ã£o.** Os blocos existem, mas nÃ£o conversam entre si e nÃ£o tÃªm um canal de streaming para o usuÃ¡rio. Um MVP de 3 semanas pode entregar um chat funcional conectando as peÃ§as existentes + criando a UI e o streaming.
