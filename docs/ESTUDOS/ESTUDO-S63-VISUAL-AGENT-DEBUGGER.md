# ESTUDO S63 -- Visual Agent Debugger & Inspector

> **Arquitetura do primeiro depurador visual bidirecional para agentes de IA: trace, visualize, debug, replay**
> Data: 2026-07-22
> Tipo: study
> Status: complete
> Proposito: Arquitetura completa para um visual agent debugger que permite inspecao passo-a-passo da execucao de agentes, processos de pensamento, tool calls e transicoes de estado

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao completa com roadmap, exemplos e plano de implementacao |

---

## Sumario

1. [Introducao](#1-introducao)
2. [Architecture Overview](#2-architecture-overview)
3. [Agent Execution Trace](#3-agent-execution-trace)
4. [Thought Process Visualization](#4-thought-process-visualization)
5. [State Inspector](#5-state-inspector)
6. [Decision Graph](#6-decision-graph)
7. [Tool Call Inspector](#7-tool-call-inspector)
8. [Replay Engine](#8-replay-engine)
9. [LLM Conversation Viewer](#9-llm-conversation-viewer)
10. [Performance Flamegraph](#10-performance-flamegraph)
11. [Agent Debugger Protocol](#11-agent-debugger-protocol)
12. [Theia Widget Integration](#12-theia-widget-integration)
13. [Comparison with Competitors](#13-comparison-with-competitors)
14. [Code Examples (Comprehensive)](#14-code-examples-comprehensive)
15. [Implementation Roadmap](#15-implementation-roadmap)
16. [Conexoes](#16-conexoes)

---

## 1. Introducao

### 1.1 The Black Box Problem

Todo agente de IA hoje compartilha uma falha fundamental: o usuario nao pode ver o que o agente esta pensando, explorando ou rejeitando em tempo real. O agente opera como uma caixa-preta -- entrada vai, saida vem, e tudo que acontece entre os dois e invisivel.

```
Estado Atual (Todos os Competidores):

  Entrada do Usuario
       |
       v
  +-----------------------+
  |    CAIXA-PRETA        |
  |                       |
  |  (pensamentos,        |
  |   caminhos rejeitados,|
  |   tool calls,         |
  |   conversas LLM,      |
  |   mutacoes de estado) |
  |                       |
  +-----------------------+
       |
       v
  Resultado Final (ou erro)
```

Esta opacidade cria varios problemas criticos:

| Problema | Impacto | Frequencia |
|----------|---------|-----------|
| Usuario nao pode debuggar decisoes erradas | Perda de confianca, retrabalho manual | Toda tarefa falha |
| Sem visibilidade do progresso do agente | Ansiedade, cancelamento prematuro | Toda tarefa longa |
| Alternativas rejeitadas invisiveis | Repeticao de requisitos ruins | Comum |
| Erros de tool call silenciosos | Falhas silenciosas, erros acumulados | Frequente |
| Impossivel fazer replay para inspecionar estado | Zero capacidade de debug | Toda correcao de bug |
| Sem metricas de performance | Impossivel otimizar comportamento do agente | Continuo |

### 1.2 Por que o IDEIA Precisa de um Debugger Visual

O IDEIA opera com agentes autonomos (N0-N4) que tomam decisoes complexas em multiplas etapas. Sem um debugger visual:

- Usuarios N0/N1 nao confiam nas decisoes do agente e micro-gerenciam
- Desenvolvedores N2/N3 nao conseguem depurar loops infinitos ou decisoes erradas
- Arquitetos N4 nao tem visibilidade para melhorar prompts e chains

O Visual Agent Debugger resolve isso instrumentando o Agent Runtime com um protocolo de debug bidirecional completo, permitindo que usuarios vejam TUDO que o agente faz, inspecionem estado em qualquer ponto, replay passo-a-passo e breakpoints em comportamento de agente.

Diferenciais em relacao aos competidores:
- **Devin**: Streaming unidirecional de acoes, sem replay, sem inspecao de estado
- **Cursor**: Barra de status basica ("agent is thinking"), sem debugging
- **Claude AI/Code**: Mostra texto de pensamento, sem replay ou inspecao
- **Factory**: Logs de container apenas, sem debugging estruturado
- **LangSmith/LangFuse**: Traces pos-execucao, sem debug interativo em tempo real

### 1.3 Principios de Design

| Principio | Descricao |
|-----------|-----------|
| Nao-invasivo | Debugger nao altera comportamento do agente -- observador passivo |
| Tempo real | Eventos streamados dentro de 100ms da ocorrencia |
| Completo | Cada acao, pensamento, tool call e mudanca de estado registrados |
| Replayavel | Execucao completa e replayavel forward e backward |
| Exportavel | Traces exportaveis como JSON, HTML ou flamegraph |
| Extensivel | Tipos de eventos customizados e visualizadores via contribuicao |
| Seguro | Acesso requer autenticacao; dados sensiveis mascaraveis |
| Performatico | Suporte a sessoes com milhares de steps sem degradacao |

---

## 2. Architecture Overview

### 2.1 Componentes Principais

O Visual Agent Debugger e composto por 4 camadas principais:

**Agent Execution Tracer**: Responsavel por capturar CADA passo da execucao do agente. Instrumenta o Agent Runtime para interceptar inicio/fim de steps, transicoes, decisoes, alternativas, backtracks e breakpoints.

**Trace Storage**: Armazenamento estruturado de traces usando SQLite com FTS5 para busca textual. Cada sessao gera trace_records, thought_records, state_snapshots, tool_call_records, llm_conversations e perf_metrics.

**Debug Backend**: Servico WebSocket que gerencia sessoes, streama eventos em tempo real, processa replay, avalia breakpoints, exporta traces e indexa para busca textual.

**Debug Frontend**: Conjunto de widgets React/Theia que compoem o painel de debug com DebugPanel, TraceTimeline, DecisionGraph, StateInspector, ToolInspector, LLMConvViewer, Flamegraph e ReplayControls.

### 2.2 Data Flow

```
Agente Inicia Execucao
       |
       v
[Instrumentation Layer intercepta]
       |
       +---> AgentExecutionTracer.record(step)        --> trace.events
       +---> ThoughtRecorder.record(thought)           --> thought.events
       +---> StateSnapshotter.snapshot(state)          --> state.events
       +---> ToolCallRecorder.record(toolCall)         --> tool.events
       +---> LLMConversationRecorder.record(llmCall)   --> llm.events
       +---> PerformanceProfiler.record(perfMetrics)   --> perf.events
       |
       v
[NATS JetStream streama todos os eventos]
       |
       v
[DebugServer processa, armazena, indexa]
       |
       +---> TraceStorage.persist(traceRecord)
       +---> DebugSessionManager.updateSession()
       +---> BreakpointManager.evaluate(step)
       |
       +---> Se breakpoint: DebugServer envia pause + WebSocket breakpoint.hit
       |
       v
[WebSocket empurra para clientes]
       |
       v
[Presentation Layer renderiza em tempo real]
```

### 2.3 Protocolo de Comunicacao (WebSocket JSON-RPC)

Uso JSON-RPC 2.0 sobre WebSocket. Metodos principais:

**Cliente -> Servidor:**
- debug.startSession { agentId, agentType, config }
- debug.stopSession { sessionId }
- debug.pauseSession / debug.resumeSession
- debug.stepOver / debug.stepInto
- debug.addBreakpoint / debug.removeBreakpoint { sessionId, condition }
- debug.getState / debug.getTraces { sessionId, filters }
- debug.searchTraces { sessionId, query }
- debug.replayTo / debug.replayStep { sessionId, targetStep/direction }
- debug.exportTrace { sessionId, format }
- debug.getDecisionGraph / debug.getFlamegraph { sessionId }

**Servidor -> Cliente (notificacoes):**
- debug.event { type, payload }
- debug.stepStarted { stepId, stepNumber, type, timestamp }
- debug.stepCompleted { stepId, result, duration }
- debug.thought { stepId, thought, tokens }
- debug.stateChanged { stepId, state, diffs }
- debug.toolCall { stepId, tool, input, output }
- debug.llmRequest { stepId, messages, response, tokens }
- debug.breakpointHit { stepId, condition, state }
- debug.sessionState { sessionId, status, progress }
- debug.error { sessionId, stepId, error }


---

## 3. Agent Execution Trace

### 3.1 Trace Data Model

```typescript
// agent-debugger/src/types/trace-types.ts

export interface DebugSession {
  id: string; agentId: string; agentType: string;
  startTime: number; endTime?: number;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  config: DebugSessionConfig;
  metrics: SessionMetrics;
  metadata: Record<string, string>;
}

export interface DebugSessionConfig {
  maxSteps: number;
  captureThoughts: boolean;
  captureStateSnapshots: boolean;
  captureToolCalls: boolean;
  captureLLMConversations: boolean;
  capturePerformance: boolean;
  breakpoints: DebugBreakpoint[];
}

export interface SessionMetrics {
  totalSteps: number; totalTokens: number; totalCost: number;
  totalDuration: number; toolCallCount: number; llmCallCount: number;
  errorCount: number; backtrackCount: number;
}

export interface StepTrace {
  id: string; sessionId: string; stepNumber: number;
  parentStepId?: string;
  type: 'plan' | 'execute' | 'think' | 'decide' | 'tool_call' | 'llm_request' | 'sub_agent' | 'wait' | 'error';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'backtracked';
  startTime: number; endTime?: number; duration?: number;
  input?: unknown; output?: unknown; error?: StepError;
  thought?: ThoughtRecord; stateSnapshot?: StateSnapshot;
  toolCalls: ToolCallRecord[]; llmRequests: LLMRequestRecord[];
  children: string[]; metadata: Record<string, unknown>;
}

export interface DebugBreakpoint {
  id: string; sessionId: string;
  condition: BreakpointCondition; enabled: boolean;
  hitCount: number; lastHit?: number;
}

export type BreakpointCondition =
  | { type: 'step_type'; value: string }
  | { type: 'step_number'; value: number }
  | { type: 'tool_name'; value: string }
  | { type: 'state_condition'; expression: string }
  | { type: 'error' }
  | { type: 'custom'; evaluate: string };
```

### 3.2 Trace Events

Cada step gera uma sequencia de eventos:

```
step_start
  +-- thought (0..N)
  +-- tool_call_start (0..N)
  |     +-- tool_result (0..1)
  |     +-- tool_error (0..1)
  +-- llm_request_start (0..N)
  |     +-- llm_response (0..1)
  +-- state_change (0..N)
  +-- decision (0..N)
  +-- error (0..1)
step_end
```

### 3.3 Trace Storage (SQLite)

```sql
CREATE TABLE IF NOT EXISTS debug_sessions (
  id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, agent_type TEXT NOT NULL,
  start_time INTEGER NOT NULL, end_time INTEGER, status TEXT NOT NULL DEFAULT 'running',
  config_json TEXT NOT NULL, metrics_json TEXT NOT NULL, metadata_json TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS step_traces (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL,
  step_number INTEGER NOT NULL, parent_step_id TEXT,
  type TEXT NOT NULL, status TEXT NOT NULL,
  start_time INTEGER NOT NULL, end_time INTEGER, duration INTEGER,
  input_json TEXT, output_json TEXT, error_json TEXT,
  thought_json TEXT, state_snapshot_json TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (session_id) REFERENCES debug_sessions(id)
);

CREATE INDEX idx_traces_session_step ON step_traces(session_id, step_number);

CREATE TABLE IF NOT EXISTS tool_call_records (
  id TEXT PRIMARY KEY, step_id TEXT NOT NULL, session_id TEXT NOT NULL,
  tool_name TEXT NOT NULL, status TEXT NOT NULL,
  input_json TEXT NOT NULL, output_json TEXT, error_json TEXT,
  start_time INTEGER NOT NULL, end_time INTEGER, duration INTEGER
);

CREATE TABLE IF NOT EXISTS llm_conversations (
  id TEXT PRIMARY KEY, step_id TEXT NOT NULL, session_id TEXT NOT NULL,
  role TEXT NOT NULL, content TEXT NOT NULL,
  tokens INTEGER, cost REAL, timestamp INTEGER NOT NULL, message_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS trace_events (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL, step_id TEXT NOT NULL,
  type TEXT NOT NULL, timestamp INTEGER NOT NULL,
  sequence INTEGER NOT NULL, payload_json TEXT NOT NULL
);

-- FTS5 para busca textual
CREATE VIRTUAL TABLE IF NOT EXISTS trace_fts USING fts5(
  session_id, step_id, type, input_json, output_json, error_json, thought_json,
  content='step_traces', content_rowid='rowid'
);
```

### 3.4 TraceCollector Class

```typescript
// agent-debugger/src/tracer/trace-collector.ts

import { v4 as uuidv4 } from 'uuid';

export class TraceCollector {
  private activeSessions = new Map<string, {
    session: DebugSession; currentStep: StepTrace | null; eventSequence: number;
  }>();

  constructor(
    private storage: TraceStorage,
    private eventBus: IEventBus,
    private logger: Logger,
  ) {}

  async startSession(agentId: string, agentType: string, config?: Partial<DebugSessionConfig>): Promise<string> {
    const id = uuidv4();
    const session: DebugSession = {
      id, agentId, agentType, startTime: Date.now(), status: 'running',
      config: { maxSteps: 1000, captureThoughts: true, captureStateSnapshots: true,
                captureToolCalls: true, captureLLMConversations: true, capturePerformance: true,
                breakpoints: config?.breakpoints ?? [] },
      metrics: { totalSteps: 0, totalTokens: 0, totalCost: 0, totalDuration: 0,
                 toolCallCount: 0, llmCallCount: 0, errorCount: 0, backtrackCount: 0 },
      metadata: {},
    };
    await this.storage.createSession(session);
    this.activeSessions.set(id, { session, currentStep: null, eventSequence: 0 });
    return id;
  }

  async startStep(sessionId: string, type: string, input?: unknown, parentStepId?: string): Promise<string> {
    const ctx = this.activeSessions.get(sessionId);
    if (!ctx) throw new Error('Session not found');

    const stepId = uuidv4();
    const stepNumber = ++ctx.session.metrics.totalSteps;
    const trace: StepTrace = {
      id: stepId, sessionId, stepNumber, parentStepId, type: type as any, status: 'running',
      startTime: Date.now(), input, toolCalls: [], llmRequests: [], children: [], metadata: {},
    };
    ctx.currentStep = trace;
    await this.storage.persistStepTrace(trace);
    this.emitEvent(sessionId, 'step_start', { stepId, stepNumber, type, input });
    return stepId;
  }

  async completeStep(sessionId: string, stepId: string, output?: unknown): Promise<void> {
    const ctx = this.activeSessions.get(sessionId);
    if (!ctx) return;

    const now = Date.now();
    const duration = now - (ctx.currentStep?.startTime ?? now);
    const isError = output instanceof Error;
    const updates = {
      status: isError ? 'failed' : 'completed' as const,
      endTime: now, duration,
      output: isError ? undefined : output,
    };
    await this.storage.persistStepTrace({ ...ctx.currentStep!, ...updates });
    ctx.session.metrics.totalDuration += duration;
    if (isError) ctx.session.metrics.errorCount++;
    this.emitEvent(sessionId, 'step_complete', { stepId, status: updates.status, duration });
    ctx.currentStep = null;
  }

  recordThought(sessionId: string, stepId: string, content: string, tokens?: number): void {
    this.emitEvent(sessionId, 'thought', { stepId, content, tokens });
  }

  recordToolCall(sessionId: string, stepId: string, toolName: string, input: unknown): void {
    const ctx = this.activeSessions.get(sessionId);
    if (ctx) ctx.session.metrics.toolCallCount++;
    this.emitEvent(sessionId, 'tool_call', { stepId, toolName, input });
  }

  recordDecision(sessionId: string, stepId: string, choice: string, alternatives: string[]): void {
    this.emitEvent(sessionId, 'decision', { stepId, choice, alternatives });
  }

  recordBacktrack(sessionId: string, fromStep: string, toStep: string, reason: string): void {
    const ctx = this.activeSessions.get(sessionId);
    if (ctx) ctx.session.metrics.backtrackCount++;
    this.emitEvent(sessionId, 'backtrack', { fromStep, toStep, reason });
  }

  private emitEvent(sessionId: string, type: string, payload: Record<string, unknown>): void {
    const ctx = this.activeSessions.get(sessionId);
    if (!ctx) return;
    const event = { id: uuidv4(), sessionId, stepId: ctx.currentStep?.id ?? '', type,
      timestamp: Date.now(), sequence: ++ctx.eventSequence, payload };
    this.storage.persistEvent(event);
    this.eventBus.publish('debug.trace.' + sessionId, event);
  }
}
```


---

## 4. Thought Process Visualization

### 4.1 Chain-of-Thought Tree View

Exibe o raciocinio do agente como uma arvore interativa, onde cada no e um pensamento e as conexoes mostram a sequencia logica.

```
Thought Tree:
  root: "analisar requisitos do usuario"
    |
    +-- "usuario pediu um CRUD de usuarios"
    |     |
    |     +-- "preciso criar model User com campos: id, name, email"
    |     +-- "usar TypeORM para banco relacional"
    |
    +-- "alternativa: usar Prisma em vez de TypeORM"
    |     (rejeitada - equipe ja usa TypeORM)
    |
    +-- "decidir: implementar primeiro backend ou frontend?"
          |
          +-- "backend primeiro - definir API contracts"
```

```typescript
export interface ThoughtNode {
  id: string; stepId: string; parentId?: string;
  content: string;
  type: 'reasoning' | 'analysis' | 'decision' | 'alternative' | 'rejection';
  confidence: number; tokens: number; cost: number;
  timestamp: number; duration: number;
  metadata: { model?: string; temperature?: number; tokensUsed?: number; };
  children: ThoughtNode[];
  accepted?: boolean; rejectionReason?: string;
}

export interface ThoughtTree {
  sessionId: string;
  root: ThoughtNode;
  totalNodes: number; totalTokens: number; totalCost: number;
  averageConfidence: number; branchingFactor: number;
}
```

### 4.2 Token Usage & Cost per Step

Cada pensamento exibe metricas de custo:

```
Step #4: "Implementar rotas de API"
  Tokens de entrada:    1,234
  Tokens de saida:       567
  Custo:               $0.0089
  Modelo:              claude-3.5-sonnet
  Temperatura:         0.3
  Duracao:             2.3s
```

### 4.3 Confidence Scores & Alternative Paths

```typescript
export interface DecisionRecord {
  id: string; stepId: string;
  decision: string; confidence: number;
  alternatives: AlternativePath[];
  selectedAlternative: string; reasoning: string;
  tokensUsed: number; timestamp: number;
}

export interface AlternativePath {
  id: string; description: string; confidence: number;
  estimatedCost: number; estimatedTokens: number;
  pros: string[]; cons: string[];
  explored: boolean; rejectedReason?: string;
}
```

### 4.4 ThoughtTree React Component

```tsx
import React, { useState } from 'react';

export const ThoughtTree: React.FC<{
  root: ThoughtNode; onNodeClick?: (node: ThoughtNode) => void;
  selectedNodeId?: string;
}> = ({ root, onNodeClick, selectedNodeId }) => {
  return (
    <div className="thought-tree" role="tree" aria-label="Chain of Thought">
      <ThoughtTreeNode node={root} depth={0} onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} />
    </div>
  );
};

const ThoughtTreeNode: React.FC<{
  node: ThoughtNode; depth: number;
  onNodeClick?: (node: ThoughtNode) => void; selectedNodeId?: string;
}> = ({ node, depth, onNodeClick, selectedNodeId }) => {
  const [expanded, setExpanded] = useState(true);
  const isSelected = node.id === selectedNodeId;

  const iconMap = { reasoning: '💭', analysis: '🔍', decision: '✅', alternative: '🔄', rejection: '❌' };

  return (
    <div className={`thought-node ${isSelected ? 'selected' : ''}`}
         style={{ marginLeft: depth * 20 }}
         role="treeitem" aria-expanded={expanded}>
      <div className="thought-node__header" onClick={() => { if (node.children.length) setExpanded(!expanded); onNodeClick?.(node); }}>
        <span>{node.children.length ? (expanded ? '▼' : '▶') : '·'}</span>
        <span>{iconMap[node.type]}</span>
        <span>{node.content}</span>
        <span style={{ color: node.confidence > 0.7 ? '#4caf50' : '#f44336' }}>
          {Math.round(node.confidence * 100)}%
        </span>
        <span>{node.tokens}t</span>
        <span>{(node.duration / 1000).toFixed(1)}s</span>
      </div>
      {expanded && node.children.map(child => (
        <ThoughtTreeNode key={child.id} node={child} depth={depth + 1}
          onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} />
      ))}
    </div>
  );
};
```


---

## 5. State Inspector

### 5.1 State Snapshot Model

```typescript
export interface StateSnapshot {
  id: string; sessionId: string; stepId: string;
  stepNumber: number; timestamp: number;
  state: AgentState; previousSnapshotId?: string;
}

export interface AgentState {
  variables: Record<string, unknown>;
  memory: { shortTerm: Record<string, unknown>; longTerm: Record<string, unknown>; workingSet: string[]; };
  context: { currentTask: string; completedTasks: string[]; pendingTasks: string[]; filesModified: string[]; };
  execution: { currentStepType: string; stepDepth: number; maxDepth: number; tokensUsed: number; };
  errors: Array<{ step: number; message: string; recoverable: boolean; }>;
}
```

### 5.2 Diff View (before/after each step)

```typescript
export interface StateDiff {
  path: string;
  type: 'added' | 'removed' | 'changed';
  oldValue?: unknown; newValue?: unknown;
}

export function computeStateDiff(before: Record<string, unknown>, after: Record<string, unknown>, path = ''): StateDiff[] {
  const diffs: StateDiff[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const fullPath = path ? `${path}.${key}` : key;
    if (!(key in before)) {
      diffs.push({ path: fullPath, type: 'added', newValue: after[key] });
    } else if (!(key in after)) {
      diffs.push({ path: fullPath, type: 'removed', oldValue: before[key] });
    } else if (typeof before[key] !== typeof after[key]) {
      diffs.push({ path: fullPath, type: 'changed', oldValue: before[key], newValue: after[key] });
    } else if (typeof before[key] === 'object' && before[key] !== null && after[key] !== null) {
      if (Array.isArray(before[key]) && Array.isArray(after[key])) {
        const maxLen = Math.max(before[key].length, after[key].length);
        for (let i = 0; i < maxLen; i++) {
          const idxPath = `${fullPath}[${i}]`;
          if (i >= before[key].length) diffs.push({ path: idxPath, type: 'added', newValue: after[key][i] });
          else if (i >= after[key].length) diffs.push({ path: idxPath, type: 'removed', oldValue: before[key][i] });
          else if (before[key][i] !== after[key][i])
            diffs.push({ path: idxPath, type: 'changed', oldValue: before[key][i], newValue: after[key][i] });
        }
      } else {
        diffs.push(...computeStateDiff(before[key] as any, after[key] as any, fullPath));
      }
    } else if (before[key] !== after[key]) {
      diffs.push({ path: fullPath, type: 'changed', oldValue: before[key], newValue: after[key] });
    }
  }
  return diffs;
}
```

### 5.3 Variable Watch & Breakpoints

```typescript
export interface VariableWatch {
  id: string; sessionId: string;
  expression: string; label: string;
  currentValue?: unknown; previousValue?: unknown;
  changed: boolean;
}

export interface StateBreakpoint {
  id: string;
  expression: string;
  description: string;
  hitCount: number; enabled: boolean;
}
```

### 5.4 StateInspector widget

```tsx
import React, { useMemo } from 'react';

export const StateInspector: React.FC<{
  currentSnapshot: StateSnapshot | null;
  previousSnapshot: StateSnapshot | null;
  watches: VariableWatch[];
  onAddWatch?: (expr: string, label: string) => void;
  onRemoveWatch?: (id: string) => void;
}> = ({ currentSnapshot, previousSnapshot, watches, onAddWatch, onRemoveWatch }) => {
  const diffs = useMemo(() => {
    if (!currentSnapshot || !previousSnapshot) return [];
    return computeStateDiff(previousSnapshot.state as any, currentSnapshot.state as any);
  }, [currentSnapshot, previousSnapshot]);

  const [watchInput, setWatchInput] = React.useState('');
  const [watchLabel, setWatchLabel] = React.useState('');

  return (
    <div className="state-inspector">
      <h3>State Inspector <span>Step #{currentSnapshot?.stepNumber ?? '-'}</span></h3>
      <div className="state-inspector__diffs">
        <h4>Changes ({diffs.length})</h4>
        {diffs.slice(0, 50).map((d, i) => (
          <div key={i} className={`diff-row diff-row--${d.type}`}>
            <span>{d.type === 'added' ? '🟢' : d.type === 'removed' ? '🔴' : '🟡'}</span>
            <span>{d.path}</span>
            <span>{JSON.stringify(d.oldValue ?? d.newValue)}</span>
          </div>
        ))}
      </div>
      <div className="state-inspector__raw">
        <pre>{JSON.stringify(currentSnapshot?.state ?? {}, null, 2)}</pre>
      </div>
    </div>
  );
};
```


---

## 6. Decision Graph

### 6.1 Graph Data Model

```typescript
export interface DecisionGraphData {
  sessionId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    totalNodes: number; totalEdges: number; depth: number;
    branchingFactor: number; hasLoops: boolean; hasBacktracks: boolean;
  };
}

export interface GraphNode {
  id: string; stepNumber: number; type: string; status: string;
  label: string; description: string;
  duration: number; tokens: number; cost: number; confidence: number;
  depth: number; parentId?: string;
  position?: { x: number; y: number };
  isForkPoint: boolean; isJoinPoint: boolean; isBacktrack: boolean;
}

export interface GraphEdge {
  id: string; source: string; target: string; label: string;
  type: 'forward' | 'backtrack' | 'alternative' | 'fork' | 'join';
  weight: number; dashed?: boolean; color?: string;
}
```

### 6.2 D3.js Interactive Graph

Renderizado usando D3.js com force layout, permitindo zoom, pan, click em nodes para detalhes, highlight do caminho critico e filtro por tipo de step.

### 6.3 Branch Exploration (fork/join visualization)

- **Forks**: Um node se divide em multiplos filhos (decisao com multiplas alternativas)
- **Joins**: Multiplos caminhos convergem para um node
- **Backtracks**: Arestas tracejadas vermelhas indicando retorno a estado anterior
- **Alternativas**: Caminhos explorados mas rejeitados (opacidade reduzida)

### 6.4 DecisionGraph with D3 force layout

```tsx
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export const DecisionGraph: React.FC<{
  data: DecisionGraphData;
  onNodeClick?: (node: GraphNode) => void;
  highlightedNodeId?: string;
  width?: number; height?: number;
}> = ({ data, onNodeClick, highlightedNodeId, width = 800, height = 600 }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.1, 4]).on('zoom', (e) => g.attr('transform', e.transform)) as any);

    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges).id((d: any) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const colorScale = d3.scaleOrdinal()
      .domain(['completed', 'running', 'failed', 'skipped', 'backtracked'])
      .range(['#4caf50', '#2196f3', '#f44336', '#ff9800', '#9c27b0']);

    const edge = g.append('g').selectAll('line').data(data.edges).enter()
      .append('line')
      .attr('stroke', d => d.color ?? (d.type === 'backtrack' ? '#f44336' : '#555'))
      .attr('stroke-width', d => Math.max(1, d.weight * 3))
      .attr('stroke-dasharray', d => d.dashed ? '5,5' : 'none')
      .attr('opacity', 0.6);

    const node = g.append('g').selectAll('g').data(data.nodes).enter()
      .append('g').style('cursor', 'pointer')
      .on('click', (e: any, d: any) => onNodeClick?.(d))
      .call(d3.drag()
        .on('start', (e: any, d: any) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e: any, d: any) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e: any, d: any) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }) as any);

    node.append('circle')
      .attr('r', 10)
      .attr('fill', d => colorScale(d.status) as string)
      .attr('stroke', d => d.id === highlightedNodeId ? '#fff' : '#333')
      .attr('stroke-width', d => d.id === highlightedNodeId ? 3 : 1);

    node.append('text')
      .text(d => d.stepNumber)
      .attr('text-anchor', 'middle').attr('dy', 4)
      .attr('fill', '#fff').attr('font-size', '9px').attr('font-weight', 'bold');

    simulation.on('tick', () => {
      edge.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [data, highlightedNodeId]);

  return <svg ref={svgRef} width={width} height={height} />;
};
```


---

## 7. Tool Call Inspector

### 7.1 Tool Call Timeline

Timeline vertical de tool calls mostrando ordem, duracao, status e dependencias:

```
  [1] readFile ------ 0.3s -- OK -- "src/app.ts"
       |
       +-- [2] parseDependencies -- 1.2s -- OK -- 15 deps found
       |
       +-- [3] analyzeImports -- 0.8s -- OK -- 3 unused imports
              |
              +-- [4] writeFile -- 0.5s -- ERROR -- Permission denied
                     |
                     [5] readFile (retry) -- 0.2s -- OK
                     |
                     [6] writeFile -- 0.4s -- OK -- Fix applied
```

### 7.2 Input/Output JSON Viewer

```tsx
import React, { useMemo, useState } from 'react';

export const ToolInspector: React.FC<{
  toolCalls: ToolCallRecord[];
  selectedToolId?: string;
  onToolSelect?: (id: string) => void;
}> = ({ toolCalls, selectedToolId, onToolSelect }) => {
  const selected = useMemo(() => toolCalls.find(t => t.id === selectedToolId), [toolCalls, selectedToolId]);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    toolCalls.filter(t => t.toolName.toLowerCase().includes(search.toLowerCase())),
    [toolCalls, search]);

  return (
    <div className="tool-inspector">
      <div className="tool-inspector__sidebar">
        <input type="text" placeholder="Search tools..." value={search} onChange={e => setSearch(e.target.value)} />
        {filtered.map(t => (
          <div key={t.id} className={`tool-item ${t.id === selectedToolId ? 'selected' : ''}`}
               onClick={() => onToolSelect?.(t.id)}>
            <span>{t.status === 'success' ? 'OK' : t.status === 'error' ? 'ERR' : '...'}</span>
            <span>{t.toolName}</span>
            <span>{(t.duration ?? 0) / 1000}s</span>
          </div>
        ))}
      </div>
      <div className="tool-inspector__detail">
        {selected ? (
          <div>
            <h3>{selected.toolName} <span>{selected.status}</span></h3>
            <h4>Input</h4>
            <pre>{JSON.stringify(selected.input, null, 2)}</pre>
            <h4>Output</h4>
            <pre>{JSON.stringify(selected.output, null, 2)}</pre>
          </div>
        ) : <div>Select a tool call to inspect</div>}
      </div>
    </div>
  );
};
```

### 7.3 Duration & Status Indicators

```typescript
export interface ToolCallRecord {
  id: string; stepId: string; sessionId: string;
  toolName: string;
  status: 'running' | 'success' | 'error' | 'timeout';
  input: unknown; output?: unknown; error?: string;
  startTime: number; duration: number;
  retryCount: number; parentId?: string; children: string[];
}
```


---

## 8. Replay Engine

### 8.1 Step-by-Step Replay (forward/backward)

Permite navegar pela execucao do agente passo-a-passo, restaurando o estado exato em cada ponto.

```typescript
export type ReplayDirection = 'forward' | 'backward';
export type ReplaySpeed = 0.25 | 0.5 | 1 | 2 | 4;
export type ReplayState = 'stopped' | 'playing' | 'paused' | 'complete';

export interface ReplaySession {
  sessionId: string;
  currentStep: number; totalSteps: number;
  state: ReplayState; speed: ReplaySpeed;
  bookmarks: ReplayBookmark[];
  startTime: number;
}

export interface ReplayBookmark {
  id: string; stepNumber: number; label: string; timestamp: number;
}
```

### 8.2 ReplayEngine Class

```typescript
export class ReplayEngine {
  private activeReplays = new Map<string, ReplaySession>();
  private timers = new Map<string, NodeJS.Timeout>();

  constructor(private storage: TraceStorage, private eventBus: IEventBus) {}

  async startReplay(sessionId: string, startStep = 1): Promise<ReplaySession> {
    const traces = await this.storage.getSessionTraces(sessionId);
    const replay: ReplaySession = {
      sessionId, currentStep: startStep, totalSteps: traces.length,
      state: 'paused', speed: 1, bookmarks: [], startTime: Date.now(),
    };
    this.activeReplays.set(sessionId, replay);
    await this.emitSnapshot(sessionId, startStep);
    return replay;
  }

  async play(sessionId: string): Promise<void> {
    const replay = this.getOrThrow(sessionId);
    replay.state = 'playing';
    this.scheduleNext(sessionId);
  }

  pause(sessionId: string): void {
    const replay = this.activeReplays.get(sessionId);
    if (!replay) return;
    replay.state = 'paused';
    clearTimeout(this.timers.get(sessionId));
    this.timers.delete(sessionId);
  }

  async stepForward(sessionId: string): Promise<void> {
    const replay = this.getOrThrow(sessionId);
    if (replay.currentStep >= replay.totalSteps) { replay.state = 'complete'; return; }
    replay.currentStep++;
    await this.emitSnapshot(sessionId, replay.currentStep);
  }

  async stepBackward(sessionId: string): Promise<void> {
    const replay = this.getOrThrow(sessionId);
    if (replay.currentStep <= 1) return;
    replay.currentStep--;
    await this.emitSnapshot(sessionId, replay.currentStep);
  }

  setSpeed(sessionId: string, speed: ReplaySpeed): void {
    const replay = this.activeReplays.get(sessionId);
    if (!replay) return;
    replay.speed = speed;
    if (replay.state === 'playing') {
      clearTimeout(this.timers.get(sessionId));
      this.scheduleNext(sessionId);
    }
  }

  addBookmark(sessionId: string, label: string): ReplayBookmark {
    const replay = this.getOrThrow(sessionId);
    const bm: ReplayBookmark = { id: 'bm-' + Date.now(), stepNumber: replay.currentStep, label, timestamp: Date.now() };
    replay.bookmarks.push(bm);
    return bm;
  }

  stopReplay(sessionId: string): void {
    clearTimeout(this.timers.get(sessionId));
    this.timers.delete(sessionId);
    this.activeReplays.delete(sessionId);
  }

  private getOrThrow(sessionId: string): ReplaySession {
    const r = this.activeReplays.get(sessionId);
    if (!r) throw new Error('Replay not started: ' + sessionId);
    return r;
  }

  private scheduleNext(sessionId: string): void {
    const replay = this.activeReplays.get(sessionId);
    if (!replay || replay.state !== 'playing') return;
    this.timers.set(sessionId, setTimeout(async () => {
      if (replay.state !== 'playing') return;
      if (replay.currentStep >= replay.totalSteps) { replay.state = 'complete'; return; }
      await this.stepForward(sessionId);
      this.scheduleNext(sessionId);
    }, 1000 / replay.speed));
  }

  private async emitSnapshot(sessionId: string, stepNumber: number): Promise<void> {
    const traces = await this.storage.getSessionTraces(sessionId);
    const trace = traces.find(t => t.stepNumber === stepNumber);
    if (trace) {
      this.eventBus.publish('debug.replay.' + sessionId, { type: 'replay.snapshot', stepNumber, trace });
    }
  }
}
```

### 8.3 ReplayControls Component

```tsx
import React from 'react';

export const ReplayControls: React.FC<{
  currentStep: number; totalSteps: number; state: ReplayState; speed: ReplaySpeed;
  onPlay: () => void; onPause: () => void;
  onStepForward: () => void; onStepBackward: () => void;
  onGoToStart: () => void; onGoToEnd: () => void;
  onSpeedChange: (speed: ReplaySpeed) => void;
}> = ({ currentStep, totalSteps, state, speed, onPlay, onPause, onStepForward, onStepBackward, onGoToStart, onGoToEnd, onSpeedChange }) => {
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
  return (
    <div className="replay-controls">
      <span>Step {currentStep} / {totalSteps}</span>
      <div className="progress-bar"><div style={{ width: progress + '%' }} /></div>
      <div>
        <button onClick={onGoToStart} disabled={currentStep <= 1}>|◀</button>
        <button onClick={onStepBackward} disabled={currentStep <= 1}>◀</button>
        {state === 'playing'
          ? <button onClick={onPause}>⏸</button>
          : <button onClick={onPlay} disabled={state === 'complete'}>▶</button>}
        <button onClick={onStepForward} disabled={currentStep >= totalSteps}>▶</button>
        <button onClick={onGoToEnd} disabled={currentStep >= totalSteps}>▶|</button>
      </div>
      <div>
        {[0.25, 0.5, 1, 2, 4].map(s => (
          <button key={s} onClick={() => onSpeedChange(s as ReplaySpeed)}
                  className={speed === s ? 'active' : ''}>{s}x</button>
        ))}
      </div>
    </div>
  );
};
```

### 8.4 Bookmark & Share URLs

Bookmarks permitem salvar pontos especificos. Cada bookmark gera URL compartilhavel:

```
ideia://debug/session/{sessionId}?step={stepNumber}&bookmark={bookmarkId}
```


---

## 9. LLM Conversation Viewer

### 9.1 Full Message History

Exibe historico completo de mensagens entre agente e LLM: system prompt (expandido), mensagens do usuario, respostas do assistente, tool calls e resultados, tokens e custo por mensagem.

```typescript
export interface LLMConversation {
  id: string; sessionId: string; stepId: string;
  model: string; provider: string;
  totalTokens: number; totalCost: number; duration: number;
  startTime: number; endTime: number;
  messages: LLMMessage[];
  metadata: { temperature?: number; maxTokens?: number; stop?: string[]; };
}

export interface LLMMessage {
  id: string; conversationId: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string; tokens: number; cost: number;
  timestamp: number; index: number;
  toolCallId?: string; toolName?: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown>; }>;
}
```

### 9.2 Token Usage Breakdown per Message

```
Message #3 (Assistant):
  Tokens: 345 | Custo: $0.0052 | Modelo: claude-3.5-sonnet

Conversation Summary:
  System:       1,234 tokens  ($0.0185)
  User:           567 tokens  ($0.0085)
  Assistant:    2,345 tokens  ($0.0352)
  Tool:           123 tokens  ($0.0018)
  Total:        4,269 tokens  ($0.0640)
```

### 9.3 Prompt Template Expansion Viewer

Exibe template antes e depois da expansao de variaveis:

```
Template: "Voce e um assistente especializado em {{language}}."
Expanded: "Voce e um assistente especializado em TypeScript."
```

### 9.4 ConversationViewer Component

```tsx
import React, { useMemo, useState } from 'react';

export const ConversationViewer: React.FC<{
  conversations: LLMConversation[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}> = ({ conversations, selectedId, onSelect }) => {
  const selected = useMemo(() => conversations.find(c => c.id === selectedId), [conversations, selectedId]);

  return (
    <div className="conversation-viewer">
      <div className="conversation-viewer__sidebar">
        <h3>LLM Conversations ({conversations.length})</h3>
        {conversations.map(c => (
          <div key={c.id} className={`conv-item ${c.id === selectedId ? 'selected' : ''}`}
               onClick={() => onSelect?.(c.id)}>
            <div>{c.model}</div>
            <div>{c.totalTokens}t | ${c.totalCost.toFixed(4)}</div>
          </div>
        ))}
      </div>
      <div>
        {selected ? (
          <div>
            <div className="conv-header">
              <h3>{selected.model}</h3>
              <span>{selected.provider}</span>
              <span>{selected.totalTokens}t</span>
              <span>${selected.totalCost.toFixed(4)}</span>
              <span>{(selected.duration / 1000).toFixed(1)}s</span>
            </div>
            {selected.messages.map(msg => (
              <MessageBlock key={msg.id} message={msg} />
            ))}
          </div>
        ) : <div>Select a conversation</div>}
      </div>
    </div>
  );
};

const MessageBlock: React.FC<{ message: LLMMessage }> = ({ message }) => {
  const [expanded, setExpanded] = useState(true);
  const roleColors: Record<string, string> = { system: '#6c5ce7', user: '#0984e3', assistant: '#00b894', tool: '#fdcb6e' };

  return (
    <div style={{ borderLeft: `3px solid ${roleColors[message.role] ?? '#888'}`, margin: '8px 0', padding: '8px' }}>
      <div onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        <span>{expanded ? '▼' : '▶'}</span>
        <strong>{message.role}</strong>
        <span>{message.tokens}t</span>
        <span>${message.cost.toFixed(6)}</span>
        {message.toolName && <span> [{message.toolName}]</span>}
      </div>
      {expanded && (
        <pre style={{ whiteSpace: 'pre-wrap', background: '#1e1e1e', color: '#d4d4d4', padding: '8px', borderRadius: '4px' }}>
          {message.content}
        </pre>
      )}
    </div>
  );
};
```


---

## 10. Performance Flamegraph

### 10.1 Flamegraph Data Model

```typescript
export interface FlamegraphData {
  sessionId: string;
  name: string;
  value: number;
  children: FlamegraphNode[];
  unit: 'ms' | 'tokens' | 'cost';
  totalValue: number;
  startTime: number; endTime: number;
}

export interface FlamegraphNode {
  name: string;
  value: number;
  selfValue: number;
  children: FlamegraphNode[];
  type: 'step' | 'thought' | 'tool_call' | 'llm_request' | 'overhead';
  depth: number;
  metadata?: {
    stepNumber?: number; tokens?: number; cost?: number;
    toolName?: string; model?: string; status?: string;
  };
}

export function buildFlamegraph(traces: StepTrace[]): FlamegraphNode {
  const root: FlamegraphNode = {
    name: 'Agent Execution', value: 0, selfValue: 0,
    children: [], type: 'step', depth: 0,
  };

  for (const trace of traces) {
    const node: FlamegraphNode = {
      name: `${trace.type} #${trace.stepNumber}`,
      value: trace.duration ?? 0,
      selfValue: trace.duration ?? 0,
      children: [], type: trace.type === 'tool_call' ? 'tool_call' : 'step',
      depth: 0, metadata: { stepNumber: trace.stepNumber, status: trace.status },
    };

    for (const toolCall of trace.toolCalls) {
      const toolNode: FlamegraphNode = {
        name: toolCall.toolName, value: toolCall.duration ?? 0,
        selfValue: toolCall.duration ?? 0, children: [], type: 'tool_call', depth: 1,
        metadata: { toolName: toolCall.toolName, status: toolCall.status },
      };
      node.children.push(toolNode);
      node.selfValue -= toolNode.value;
    }

    root.value += node.value;
    root.children.push(node);
  }
  return root;
}
```

### 10.2 SVG Rendering

Flamegraph renderizado como SVG interativo: cada retangulo = um frame, largura = duracao proporcional ao total, cor = tipo de operacao, profundidade = aninhamento.

### 10.3 Flamegraph Component

```tsx
import React, { useRef, useEffect, useState } from 'react';

const FRAME_HEIGHT = 24;
const COLORS: Record<string, string> = {
  step: '#2196f3', thought: '#9c27b0', tool_call: '#ff9800',
  llm_request: '#4caf50', overhead: '#607d8b',
};

export const Flamegraph: React.FC<{
  data: FlamegraphNode; width?: number; height?: number;
  onFrameClick?: (node: FlamegraphNode) => void;
}> = ({ data, width = 800, height = 400, onFrameClick }) => {
  const [focusedNode, setFocusedNode] = useState<FlamegraphNode | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: FlamegraphNode } | null>(null);

  const totalValue = focusedNode?.value ?? data.value;

  const maxDepth = (node: FlamegraphNode): number => {
    if (!node.children.length) return node.depth;
    return Math.max(...node.children.map(maxDepth));
  };
  const depth = focusedNode ? maxDepth(focusedNode) - focusedNode.depth : maxDepth(data);

  const renderNode = (node: FlamegraphNode, x: number, y: number): React.ReactNode[] => {
    const el: React.ReactNode[] = [];
    const nodeWidth = (node.value / totalValue) * width;
    if (nodeWidth < 1) return el;

    el.push(
      <g key={`${node.name}-${y}`}>
        <rect x={x} y={y} width={Math.max(nodeWidth - 1, 0)} height={FRAME_HEIGHT - 1}
          fill={COLORS[node.type] ?? '#888'} opacity={0.9} rx={2} style={{ cursor: 'pointer' }}
          onClick={() => { setFocusedNode(node); onFrameClick?.(node); }}
          onMouseEnter={(e) => {
            const r = (e.target as SVGRectElement).getBoundingClientRect();
            setTooltip({ x: r.left, y: r.top - 30, node });
          }}
          onMouseLeave={() => setTooltip(null)} />
        {nodeWidth > 30 && (
          <text x={x + 4} y={y + FRAME_HEIGHT / 2 + 1} fill="#fff" fontSize={10}
                dominantBaseline="middle">{node.name} ({node.value}ms)</text>
        )}
      </g>
    );

    let childX = x;
    for (const child of node.children) {
      el.push(...renderNode(child, childX, y + FRAME_HEIGHT));
      childX += (child.value / totalValue) * width;
    }
    return el;
  };

  return (
    <div className="flamegraph">
      <div>
        <span>Total: {totalValue}ms | Depth: {depth}</span>
        <button onClick={() => setFocusedNode(null)}>Reset</button>
      </div>
      <svg width={width} height={Math.min((depth + 1) * FRAME_HEIGHT + 40, height)}>
        {renderNode(focusedNode ?? data, 0, 0)}
      </svg>
      {tooltip && (
        <div style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, background: '#333', color: '#fff', padding: '8px', borderRadius: '4px', zIndex: 9999 }}>
          <div>{tooltip.node.name}</div>
          <div>Duration: {tooltip.node.value}ms</div>
          {tooltip.node.metadata?.toolName && <div>Tool: {tooltip.node.metadata.toolName}</div>}
          {tooltip.node.metadata?.model && <div>Model: {tooltip.node.metadata.model}</div>}
        </div>
      )}
    </div>
  );
};
```

### 10.4 Zoom & Pan Interaction

Suporte a scroll para zoom horizontal, click em frame para focar, duplo click para reset, drag para pan.


---

## 11. Agent Debugger Protocol

### 11.1 WebSocket Message Types (JSON-RPC 2.0)

```typescript
export const DEBUG_PROTOCOL_VERSION = '1.0.0';

export interface DebugProtocolRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface DebugProtocolResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown; };
}

export interface DebugProtocolNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

export const DebugErrorCodes = {
  SESSION_NOT_FOUND: -32000,
  SESSION_NOT_RUNNING: -32001,
  STEP_NOT_FOUND: -32002,
  REPLAY_NOT_STARTED: -32003,
  BREAKPOINT_INVALID: -32004,
  UNAUTHORIZED: -32200,
  FORBIDDEN: -32201,
  SESSION_LIMIT_REACHED: -32202,
} as const;
```

### 11.2 Session Management

O DebugServer gerencia o ciclo de vida completo:

```typescript
export class DebugSessionManager {
  private sessions = new Map<string, DebugSessionState>();
  private limits = { maxActiveSessions: 10, maxSessionDuration: 3600000, maxStepsPerSession: 10000 };

  async createSession(params: { agentId: string; agentType: string; config?: Partial<DebugSessionConfig>; }): Promise<DebugSessionState> {
    const activeCount = Array.from(this.sessions.values()).filter(s => s.status === 'running' || s.status === 'paused').length;
    if (activeCount >= this.limits.maxActiveSessions) {
      throw new Error('Max active sessions reached');
    }

    const sessionId = await this.traceCollector.startSession(params.agentId, params.agentType, params.config);
    const state: DebugSessionState = {
      id: sessionId, agentId: params.agentId, agentType: params.agentType,
      startTime: Date.now(), status: 'running', totalSteps: 0, totalDuration: 0,
      totalTokens: 0, totalCost: 0, breakpoints: [], currentStep: 0,
    };
    this.sessions.set(sessionId, state);
    return state;
  }

  async pauseSession(sessionId: string): Promise<void> {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error('Session not found');
    if (s.status !== 'running') throw new Error('Session not running');
    s.status = 'paused';
  }

  async resumeSession(sessionId: string): Promise<void> {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error('Session not found');
    if (s.status !== 'paused') throw new Error('Session not paused');
    s.status = 'running';
  }
}
```

### 11.3 Streaming vs Batch Modes

```typescript
export type DeliveryMode = 'streaming' | 'batch';

export interface SessionConfig {
  deliveryMode: DeliveryMode;
  batchInterval?: number;
  streamingFilters?: string[];
}
```

**Streaming (default):** Eventos enviados em tempo real via WebSocket. Ideal para visualizacao ao vivo.

**Batch:** Eventos armazenados e entregues sob demanda via requisicoes. Ideal para analise pos-execucao e replay.

### 11.4 Authentication & Authorization

```typescript
export interface DebugAuthContext {
  userId: string; roles: string[]; permissions: DebugPermission[]; sessionToken: string;
}

export type DebugPermission =
  | 'debug:session:create' | 'debug:session:read' | 'debug:session:write'
  | 'debug:session:delete' | 'debug:session:pause' | 'debug:session:resume'
  | 'debug:breakpoint:create' | 'debug:breakpoint:delete'
  | 'debug:replay' | 'debug:export' | 'debug:search';

export const DEFAULT_PERMISSIONS: Record<string, DebugPermission[]> = {
  admin: ['debug:session:create', 'debug:session:read', 'debug:session:write',
          'debug:session:delete', 'debug:session:pause', 'debug:session:resume',
          'debug:breakpoint:create', 'debug:breakpoint:delete', 'debug:replay',
          'debug:export', 'debug:search'],
  developer: ['debug:session:create', 'debug:session:read', 'debug:session:write',
              'debug:session:pause', 'debug:session:resume',
              'debug:breakpoint:create', 'debug:breakpoint:delete',
              'debug:replay', 'debug:search'],
  viewer: ['debug:session:read', 'debug:replay', 'debug:search'],
};
```

### 11.5 Debug Server with WebSocket

```typescript
import WebSocket from 'ws';

export class DebugServer {
  private clients = new Map<string, { ws: WebSocket; auth: DebugAuthContext }>();
  private handlers = new Map<string, Function>();

  constructor(
    private sessionManager: DebugSessionManager,
    private traceCollector: TraceCollector,
    private replayEngine: ReplayEngine,
    private eventBus: IEventBus,
    private logger: Logger,
  ) {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.handlers.set('debug.startSession', this.handleStartSession.bind(this));
    this.handlers.set('debug.stopSession', this.handleStopSession.bind(this));
    this.handlers.set('debug.pauseSession', this.handlePauseSession.bind(this));
    this.handlers.set('debug.resumeSession', this.handleResumeSession.bind(this));
    this.handlers.set('debug.stepOver', this.handleStepOver.bind(this));
    this.handlers.set('debug.addBreakpoint', this.handleAddBreakpoint.bind(this));
    this.handlers.set('debug.removeBreakpoint', this.handleRemoveBreakpoint.bind(this));
    this.handlers.set('debug.getState', this.handleGetState.bind(this));
    this.handlers.set('debug.getTraces', this.handleGetTraces.bind(this));
    this.handlers.set('debug.searchTraces', this.handleSearchTraces.bind(this));
    this.handlers.set('debug.replayTo', this.handleReplayTo.bind(this));
    this.handlers.set('debug.replayStep', this.handleReplayStep.bind(this));
    this.handlers.set('debug.exportTrace', this.handleExportTrace.bind(this));
  }

  async handleConnection(ws: WebSocket, auth: DebugAuthContext): Promise<void> {
    const clientId = auth.userId;
    this.clients.set(clientId, { ws, auth });
    this.logger.info('Debug client connected: ' + clientId);

    ws.send(JSON.stringify({
      jsonrpc: '2.0', method: 'debug.connected',
      params: { clientId, protocolVersion: DEBUG_PROTOCOL_VERSION },
    }));

    ws.on('message', async (data) => {
      try {
        const msg: DebugProtocolRequest = JSON.parse(data.toString());
        const handler = this.handlers.get(msg.method);
        if (!handler) {
          ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Method not found' } }));
          return;
        }
        const result = await handler(msg.params ?? {});
        ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }));
      } catch (err: any) {
        ws.send(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32603, message: err.message } }));
      }
    });

    ws.on('close', () => this.clients.delete(clientId));
  }

  // Handlers
  private async handleStartSession(params: any) {
    return this.sessionManager.createSession(params);
  }

  private async handleStopSession(params: any) {
    await this.sessionManager.stopSession(params.sessionId);
    return { success: true };
  }

  private async handlePauseSession(params: any) {
    await this.sessionManager.pauseSession(params.sessionId);
    return { success: true };
  }

  private async handleResumeSession(params: any) {
    await this.sessionManager.resumeSession(params.sessionId);
    return { success: true };
  }

  private async handleStepOver(params: any) {
    return this.replayEngine.stepForward(params.sessionId);
  }

  private async handleAddBreakpoint(params: any) {
    const bp = { id: 'bp-' + Date.now(), sessionId: params.sessionId, condition: params.condition, enabled: true, hitCount: 0 };
    const session = this.sessionManager.getSession(params.sessionId);
    if (session) session.breakpoints.push(bp);
    return bp;
  }

  private async handleRemoveBreakpoint(params: any) {
    const session = this.sessionManager.getSession(params.sessionId);
    if (session) {
      session.breakpoints = session.breakpoints.filter(b => b.id !== params.breakpointId);
    }
    return { success: true };
  }

  private async handleGetState(params: any) { return { state: {}, diff: [] }; }
  private async handleGetTraces(params: any) { return []; }
  private async handleSearchTraces(params: any) { return []; }
  private async handleReplayTo(params: any) { return {}; }
  private async handleReplayStep(params: any) { return {}; }
  private async handleExportTrace(params: any) { return ''; }
}
```


---

## 12. Theia Widget Integration

### 12.1 DebugPanel Widget (Main)

```typescript
// Theia widget contribution
import { injectable, postConstruct, inject } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { CommandService } from '@theia/core';

@injectable()
export class AgentDebugWidget extends ReactWidget {
  static readonly ID = 'agent-debug-widget';
  static readonly LABEL = 'Agent Debugger';

  @inject(CommandService) protected commandService: CommandService;

  @postConstruct()
  protected init(): void {
    this.id = AgentDebugWidget.ID;
    this.title.label = AgentDebugWidget.LABEL;
    this.title.iconClass = 'fa fa-bug';
    this.title.closable = true;
    this.update();
  }

  protected render(): React.ReactElement {
    return <AgentDebugPanel />;
  }
}
```

### 12.2 Tabbed Layout

O DebugPanel usa layout com abas: Timeline, Decision Graph, State, Tools, LLM Conv, Flamegraph, Thoughts.

```tsx
type DebugTab = 'timeline' | 'graph' | 'inspector' | 'tools' | 'llm' | 'flamegraph' | 'thoughts';

const TABS: Array<{ id: DebugTab; label: string; icon: string }> = [
  { id: 'timeline', label: 'Timeline', icon: '⏱' },
  { id: 'graph', label: 'Graph', icon: '🔀' },
  { id: 'inspector', label: 'State', icon: '🔍' },
  { id: 'tools', label: 'Tools', icon: '🔧' },
  { id: 'llm', label: 'LLM', icon: '💬' },
  { id: 'flamegraph', label: 'Flamegraph', icon: '🔥' },
  { id: 'thoughts', label: 'Thoughts', icon: '💭' },
];

export const AgentDebugPanel: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<DebugTab>('timeline');
  const [session, setSession] = React.useState<any>(null);
  const [connected, setConnected] = React.useState(false);
  const wsRef = React.useRef<WebSocket | null>(null);

  React.useEffect(() => {
    const ws = new WebSocket('ws://localhost:4100/debug');
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    wsRef.current = ws;
    return () => ws.close();
  }, []);

  return (
    <div className="debug-panel">
      <div className="debug-panel__toolbar">
        <span style={{ color: connected ? '#4caf50' : '#f44336' }}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
        {session ? (
          <span>Session: {session.id.slice(0, 8)}... | Steps: {session.totalSteps}</span>
        ) : (
          <button onClick={() => {}}>Start Debug Session</button>
        )}
      </div>

      <div className="debug-panel__tabs">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={activeTab === tab.id ? 'tab-active' : ''}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="debug-panel__content">
        {activeTab === 'timeline' && <div>Timeline View</div>}
        {activeTab === 'graph' && <div>Decision Graph</div>}
        {activeTab === 'inspector' && <div>State Inspector</div>}
        {activeTab === 'tools' && <div>Tool Inspector</div>}
        {activeTab === 'llm' && <div>LLM Conversations</div>}
        {activeTab === 'flamegraph' && <div>Flamegraph</div>}
        {activeTab === 'thoughts' && <div>Thought Tree</div>}
      </div>
    </div>
  );
};
```

### 12.3 Command Contributions

```typescript
import { Command, CommandContribution, CommandRegistry } from '@theia/core';

export const DebugCommands = {
  START_DEBUG: { id: 'ideia.debug.start', label: 'Start Agent Debug Session', category: 'Debug' },
  STEP_OVER: { id: 'ideia.debug.stepOver', label: 'Step Over', category: 'Debug' },
  CONTINUE: { id: 'ideia.debug.continue', label: 'Continue', category: 'Debug' },
  STOP: { id: 'ideia.debug.stop', label: 'Stop Debug Session', category: 'Debug' },
  TOGGLE_PANEL: { id: 'ideia.debug.togglePanel', label: 'Toggle Agent Debug Panel', category: 'View' },
  ADD_BP: { id: 'ideia.debug.addBreakpoint', label: 'Add Agent Breakpoint', category: 'Debug' },
};

export class DebugCommandContribution implements CommandContribution {
  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(Command.toLocalizedCommand(DebugCommands.START_DEBUG, DebugCommands.START_DEBUG.label), {
      execute: () => { /* activate widget and start debug */ },
    });
    registry.registerCommand(Command.toLocalizedCommand(DebugCommands.STEP_OVER, DebugCommands.STEP_OVER.label), {
      execute: () => { /* step over current step */ },
    });
    registry.registerCommand(Command.toLocalizedCommand(DebugCommands.CONTINUE, DebugCommands.CONTINUE.label), {
      execute: () => { /* continue execution */ },
    });
    registry.registerCommand(Command.toLocalizedCommand(DebugCommands.STOP, DebugCommands.STOP.label), {
      execute: () => { /* stop debug session */ },
    });
  }
}
```

### 12.4 Keybindings Integration

```typescript
export class DebugKeybindingContribution implements KeybindingContribution {
  registerKeybindings(registry: KeybindingRegistry): void {
    registry.registerKeybinding({ command: 'ideia.debug.togglePanel', keybinding: 'ctrl+shift+d' });
    registry.registerKeybinding({ command: 'ideia.debug.start', keybinding: 'f5' });
    registry.registerKeybinding({ command: 'ideia.debug.stepOver', keybinding: 'f10' });
    registry.registerKeybinding({ command: 'ideia.debug.continue', keybinding: 'f8' });
    registry.registerKeybinding({ command: 'ideia.debug.stop', keybinding: 'shift+f5' });
    registry.registerKeybinding({ command: 'ideia.debug.addBreakpoint', keybinding: 'f9' });
  }
}
```

### 12.5 DI Module

```typescript
import { ContainerModule } from 'inversify';
import { WidgetFactory, CommandContribution, KeybindingContribution } from '@theia/core';
import { AgentDebugWidget } from './agent-debug-widget';
import { DebugCommandContribution } from './debug-commands';
import { DebugKeybindingContribution } from './debug-keybindings';

export default new ContainerModule((bind) => {
  bind(AgentDebugWidget).toSelf();
  bind(WidgetFactory).toDynamicValue(ctx => ({
    id: AgentDebugWidget.ID,
    createWidget: () => ctx.container.get(AgentDebugWidget),
  }));
  bind(CommandContribution).to(DebugCommandContribution).inSingletonScope();
  bind(KeybindingContribution).to(DebugKeybindingContribution).inSingletonScope();
});
```

### 12.6 Agent Debugger DI Container

```typescript
export const TYPES = {
  TraceCollector: Symbol.for('TraceCollector'),
  TraceStorage: Symbol.for('TraceStorage'),
  DebugServer: Symbol.for('DebugServer'),
  DebugSessionManager: Symbol.for('DebugSessionManager'),
  ReplayEngine: Symbol.for('ReplayEngine'),
  BreakpointManager: Symbol.for('BreakpointManager'),
  ExportManager: Symbol.for('ExportManager'),
  SearchIndex: Symbol.for('SearchIndex'),
  EventBus: Symbol.for('EventBus'),
  Logger: Symbol.for('Logger'),
};

export const debugModule = new ContainerModule((bind) => {
  bind(TYPES.TraceCollector).to(TraceCollector).inSingletonScope();
  bind(TYPES.TraceStorage).to(SQLiteTraceStorage).inSingletonScope();
  bind(TYPES.DebugServer).to(DebugServer).inSingletonScope();
  bind(TYPES.DebugSessionManager).to(DebugSessionManager).inSingletonScope();
  bind(TYPES.ReplayEngine).to(ReplayEngine).inSingletonScope();
  bind(TYPES.BreakpointManager).to(BreakpointManager).inSingletonScope();
  bind(TYPES.ExportManager).to(ExportManager).inSingletonScope();
  bind(TYPES.SearchIndex).to(SearchIndex).inSingletonScope();
});
```


---

## 13. Comparison with Competitors

### 13.1 LangFuse

**Foco:** Analytics e observabilidade de LLM em producao
**Modelo:** SaaS, tracing pos-execucao

**Limitacoes (vs IDEIA Debugger):**
- Sem debug interativo em tempo real
- Sem step-through de agente
- Sem replay de execucao
- Sem inspecao de estado do agente
- Sem decision graph
- Sem flamegraph de performance
- Sem breakpoints condicionais

### 13.2 LangSmith

**Foco:** Debug e eval de chains LLM
**Modelo:** SaaS, tracing com spans

**Limitacoes (vs IDEIA Debugger):**
- Sem debug em tempo real
- Visualizacao de arvore, nao de grafo de decisoes
- Sem replay bidirecional
- Sem breakpoints
- Sem flamegraph
- Sem integracao com IDE (Theia)

### 13.3 Arize Phoenix

**Foco:** Observabilidade de LLM com tracing distribuido
**Modelo:** Open source + Cloud

**Limitacoes (vs IDEIA Debugger):**
- Sem step-through debug
- Sem replay engine
- Sem tool call inspector com diffs
- Sem integracao Theia
- Sem visualizacao de pensamentos (chain-of-thought tree)

### 13.4 IDEIA Differentiator

| Capacidade | IDEIA | LangFuse | LangSmith | Phoenix |
|-----------|-------|----------|-----------|---------|
| Step-through debug | ✅ | ❌ | ❌ | ❌ |
| Real-time streaming | ✅ | ❌ | ❌ | ✅ |
| Bidirectional replay | ✅ | ❌ | ❌ | ❌ |
| Decision graph (D3) | ✅ | ❌ | ❌ | ❌ |
| Chain-of-thought tree | ✅ | ❌ | ❌ | ❌ |
| State inspector + diff | ✅ | ❌ | ❌ | ❌ |
| Tool call timeline | ✅ | ✅ | ✅ | ✅ |
| LLM conversation viewer | ✅ | ✅ | ✅ | ✅ |
| Performance flamegraph | ✅ | ❌ | ❌ | ❌ |
| Breakpoints (conditional) | ✅ | ❌ | ❌ | ❌ |
| Theia widget integration | ✅ | ❌ | ❌ | ❌ |
| Export (JSON/HTML) | ✅ | ✅ | ✅ | ✅ |
| FTS5 search | ✅ | ❌ | ✅ | ❌ |
| Authentication | ✅ | ✅ | ✅ | ✅ |


---

## 14. Code Examples (Comprehensive)

### 14.1 Complete TraceCollector Implementation

O TraceCollector completo ja foi apresentado na Secao 3.4. Abaixo a versao com todos os metodos de instrumentation:

```typescript
// agent-debugger/src/tracer/trace-collector.ts

import { v4 as uuidv4 } from 'uuid';
import { injectable, inject } from 'inversify';

@injectable()
export class TraceCollector {
  private sessions = new Map<string, {
    session: DebugSession; currentStep: StepTrace | null; seq: number;
  }>();

  constructor(
    @inject(TYPES.TraceStorage) private storage: TraceStorage,
    @inject(TYPES.EventBus) private eventBus: IEventBus,
    @inject(TYPES.Logger) private logger: Logger,
  ) {}

  async startSession(agentId: string, agentType: string, config?: Partial<DebugSessionConfig>): Promise<string> {
    const id = uuidv4();
    const session: DebugSession = {
      id, agentId, agentType, startTime: Date.now(), status: 'running',
      config: { maxSteps: 1000, captureThoughts: true, captureStateSnapshots: true,
                captureToolCalls: true, captureLLMConversations: true, capturePerformance: true,
                breakpoints: config?.breakpoints ?? [] },
      metrics: { totalSteps: 0, totalTokens: 0, totalCost: 0, totalDuration: 0,
                 toolCallCount: 0, llmCallCount: 0, errorCount: 0, backtrackCount: 0 },
      metadata: {},
    };
    await this.storage.createSession(session);
    this.sessions.set(id, { session, currentStep: null, seq: 0 });
    this.logger.info('Debug session started: ' + id);
    return id;
  }

  async stopSession(sessionId: string, status: SessionStatus = 'completed'): Promise<void> {
    const ctx = this.sessions.get(sessionId);
    if (!ctx) throw new Error('Session not found');
    ctx.session.status = status;
    ctx.session.endTime = Date.now();
    await this.storage.updateSession(sessionId, { status, endTime: ctx.session.endTime, metrics: ctx.session.metrics });
    this.sessions.delete(sessionId);
    this.logger.info('Debug session ended: ' + sessionId);
  }

  async startStep(sessionId: string, type: StepType, input?: unknown, parentStepId?: string): Promise<string> {
    const ctx = this.sessions.get(sessionId);
    if (!ctx || ctx.session.status !== 'running') throw new Error('Invalid session');

    const stepId = uuidv4();
    const stepNumber = ++ctx.session.metrics.totalSteps;
    const trace: StepTrace = {
      id: stepId, sessionId, stepNumber, parentStepId,
      type, status: 'running', startTime: Date.now(), input,
      toolCalls: [], llmRequests: [], children: [], metadata: {},
    };
    ctx.currentStep = trace;
    await this.storage.persistStepTrace(trace);
    this.emit(sessionId, 'step_start', { stepId, stepNumber, type });
    return stepId;
  }

  async completeStep(sessionId: string, stepId: string, output?: unknown): Promise<void> {
    const ctx = this.sessions.get(sessionId);
    if (!ctx) return;
    const now = Date.now();
    const duration = now - (ctx.currentStep?.startTime ?? now);
    const failed = output instanceof Error;
    await this.storage.persistStepTrace({
      ...ctx.currentStep!,
      status: failed ? 'failed' : 'completed',
      endTime: now, duration,
      output: failed ? undefined : output,
      error: failed ? { message: (output as Error).message, code: 'EXECUTION_ERROR', recoverable: false } : undefined,
    });
    ctx.session.metrics.totalDuration += duration;
    if (failed) ctx.session.metrics.errorCount++;
    this.emit(sessionId, 'step_complete', { stepId, status: failed ? 'failed' : 'completed', duration });
    ctx.currentStep = null;
  }

  recordThought(sessionId: string, stepId: string, content: string, tokens?: number): void {
    this.emit(sessionId, 'thought', { stepId, content, tokens });
  }

  recordToolCall(sessionId: string, stepId: string, toolName: string, input: unknown): void {
    const ctx = this.sessions.get(sessionId);
    if (ctx) ctx.session.metrics.toolCallCount++;
    this.emit(sessionId, 'tool_call', { stepId, toolName, input });
  }

  recordToolResult(sessionId: string, stepId: string, output: unknown, duration: number): void {
    this.emit(sessionId, 'tool_result', { stepId, output, duration });
  }

  recordLLMRequest(sessionId: string, stepId: string, messages: any[], model: string): void {
    const ctx = this.sessions.get(sessionId);
    if (ctx) ctx.session.metrics.llmCallCount++;
    this.emit(sessionId, 'llm_request', { stepId, messages, model });
  }

  recordDecision(sessionId: string, stepId: string, choice: string, alternatives: string[]): void {
    this.emit(sessionId, 'decision', { stepId, choice, alternatives });
  }

  recordBacktrack(sessionId: string, fromStep: string, toStep: string, reason: string): void {
    const ctx = this.sessions.get(sessionId);
    if (ctx) ctx.session.metrics.backtrackCount++;
    this.emit(sessionId, 'backtrack', { fromStep, toStep, reason });
  }

  private emit(sessionId: string, type: string, payload: Record<string, unknown>): void {
    const ctx = this.sessions.get(sessionId);
    if (!ctx) return;
    const event = { id: uuidv4(), sessionId, stepId: ctx.currentStep?.id ?? '', type,
      timestamp: Date.now(), sequence: ++ctx.seq, payload };
    this.storage.persistEvent(event).catch(e => this.logger.error('persist failed', e));
    this.eventBus.publish('debug.trace.' + sessionId, event).catch(e => this.logger.error('publish failed', e));
  }
}
```

### 14.2 Debug Backend Server (Express + WebSocket)

```typescript
// agent-debugger/src/server/index.ts

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { Container } from 'inversify';
import { DebugServer } from './debug-server';
import { DebugSessionManager } from './debug-session-manager';
import { TraceCollector } from '../tracer/trace-collector';
import { SQLiteTraceStorage } from '../storage/sqlite-trace-storage';
import { ReplayEngine } from '../replay/replay-engine';
import { debugModule } from '../di/container';

export async function startDebugServer(port = 4100): Promise<void> {
  const container = new Container();
  container.load(debugModule);

  const app = express();
  app.use(express.json());

  // REST endpoints auxiliares
  app.get('/health', (_, res) => res.json({ status: 'ok', service: 'agent-debugger' }));
  app.get('/api/sessions', async (_, res) => {
    const manager = container.get(DebugSessionManager);
    res.json(manager.listSessions());
  });

  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/debug' });

  const debugServer = container.get(DebugServer);

  wss.on('connection', (ws, req) => {
    const token = new URL(req.url ?? '', 'http://localhost').searchParams.get('token');
    const auth: DebugAuthContext = {
      userId: token ?? 'anonymous',
      roles: ['developer'],
      permissions: DEFAULT_PERMISSIONS.developer,
      sessionToken: token ?? '',
    };
    debugServer.handleConnection(ws, auth);
  });

  server.listen(port, () => {
    console.log('Agent Debug Server running on port ' + port);
  });

  return new Promise((resolve) => server.on('close', resolve));
}

// CLI entry point
if (require.main === module) {
  const port = parseInt(process.argv[2] ?? '4100', 10);
  startDebugServer(port).catch(console.error);
}
```

### 14.3 React Debug Panel with Monaco

Exemplo completo de integracao Monaco para visualizacao JSON de tool calls e LLM conversations ja foi mostrado nas secoes 7.4 e 9.4. Abaixo a integracao basica:

```tsx
import Editor from '@monaco-editor/react';

export const JSONViewer: React.FC<{ data: unknown; height?: string }> = ({ data, height = '200px' }) => (
  <Editor
    height={height}
    defaultLanguage="json"
    value={JSON.stringify(data, null, 2)}
    theme="vs-dark"
    options={{
      readOnly: true, minimap: { enabled: false },
      scrollBeyondLastLine: false, fontSize: 12,
      lineNumbers: 'off', folding: true,
    }}
  />
);
```

### 14.4 Theia Contribution Module

```typescript
// packages/ideia-plugin/src/browser/debug/debug-frontend-module.ts

import { ContainerModule, interfaces } from 'inversify';
import { WidgetFactory, CommandContribution, KeybindingContribution } from '@theia/core/lib/browser';
import { AgentDebugWidget } from './agent-debug-widget';
import { DebugCommandContribution } from './debug-commands';
import { DebugKeybindingContribution } from './debug-keybindings';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind(AgentDebugWidget).toSelf();
  bind(WidgetFactory).toDynamicValue((ctx) => ({
    id: AgentDebugWidget.ID,
    createWidget: () => ctx.container.get(AgentDebugWidget),
  }));
  bind(CommandContribution).to(DebugCommandContribution).inSingletonScope();
  bind(KeybindingContribution).to(DebugKeybindingContribution).inSingletonScope();
});
```


---

## 15. Implementation Roadmap

### 15.1 Phase 1 (Week 1-2): Trace Infrastructure

**Pacote:** `packages/agent-debugger`

**Objetivo:** Coletor de traces funcional com armazenamento SQLite

- [ ] Criar pacote `@ideia/agent-debugger` com tsconfig, jest, eslint
- [ ] Implementar modelos de dados (DebugSession, StepTrace, TraceEvent)
- [ ] Implementar SQLiteTraceStorage com schema e indices
- [ ] Implementar FTS5 para busca textual
- [ ] Implementar TraceCollector com todos os metodos de instrumentation
- [ ] Implementar TraceEvent emitter com NATS JetStream
- [ ] Testes unitarios: 100% de cobertura no TraceCollector
- [ ] Testes de integracao: SQLite + FTS5

**Estimativa:** 4 dev-days | **Dependencias:** NATS JetStream, SQLite (better-sqlite3)

### 15.2 Phase 2 (Week 3-4): Debug Protocol & Server

**Objetivo:** Servidor WebSocket com protocolo JSON-RPC 2.0

- [ ] Implementar DebugProtocol types (request, response, notification, errors)
- [ ] Implementar DebugSessionManager com ciclo de vida completo
- [ ] Implementar DebugServer com WebSocket (Express + ws)
- [ ] Implementar autenticacao e autorizacao (token + permissoes)
- [ ] Implementar BreakpointManager (avaliacao de condicoes)
- [ ] Implementar modo streaming vs batch
- [ ] Implementar ExportManager (JSON, HTML, flamegraph)
- [ ] Implementar SearchIndex (FTS5 queries)
- [ ] Testes: server handlers, session lifecycle, breakpoints, auth

**Estimativa:** 5 dev-days | **Dependencias:** Fase 1, Express, ws, uuid

### 15.3 Phase 3 (Week 5-6): React Debug Panel

**Objetivo:** Painel React basico com timeline e state inspector

- [ ] Implementar WebSocketConnection (React hook/class)
- [ ] Implementar DebugPanel container com toolbar e tabs
- [ ] Implementar TraceTimeline (vertical timeline de steps)
- [ ] Implementar StateInspector (arvore de estado + diff view)
- [ ] Implementar ToolInspector (lista + detalhes JSON)
- [ ] Implementar ThoughtTree (arvore de pensamentos)
- [ ] Implementar JSONViewer com Monaco
- [ ] Estilizar com Theia theme variables (CSS custom properties)
- [ ] Testes: componentes React com Jest + React Testing Library

**Estimativa:** 6 dev-days | **Dependencias:** Fase 2, React 18, Monaco Editor React

### 15.4 Phase 4 (Week 7-8): Decision Graph & Replay

**Objetivo:** Grafo de decisoes interativo D3.js + replay engine completo

- [ ] Implementar DecisionGraphData builder a partir de traces
- [ ] Implementar DecisionGraph component com D3.js force layout
- [ ] Implementar interacoes: zoom, pan, click, drag, highlight
- [ ] Implementar ReplayEngine com state machine
- [ ] Implementar ReplayControls componente (play, pause, step, speed)
- [ ] Implementar bookmark system (add, list, goTo)
- [ ] Implementar share URLs para bookmarks
- [ ] Testes: grafo com dados mock, replay edge cases

**Estimativa:** 5 dev-days | **Dependencias:** Fase 3, D3.js v7

### 15.5 Phase 5 (Week 9-10): Theia Widget & Flamegraph

**Objetivo:** Integracao Theia completa + flamegraph de performance

- [ ] Implementar AgentDebugWidget (Theia ReactWidget)
- [ ] Implementar command contributions (Start, Step, Continue, Stop)
- [ ] Implementar keybindings (F5, F8, F9, F10, Shift+F5)
- [ ] Implementar debug-frontend-module com DI bindings
- [ ] Integrar DebugPanel com backend via WebSocket
- [ ] Implementar Flamegraph component (SVG com d3 ou custom)
- [ ] Implementar tooltip no flamegraph com detalhes
- [ ] Implementar LLMConversationViewer com collapsible messages
- [ ] Testes: Theia widget lifecycle, comandos, keybindings

**Estimativa:** 6 dev-days | **Dependencias:** Fase 4, Theia Platform, d3-flame-graph

### 15.6 Phase 6 (Week 11-12): Performance & Polish

**Objetivo:** Otimizacao, busca, exportacao e documentacao

- [ ] Implementar virtual scrolling na Timeline (1000+ steps)
- [ ] Implementar lazy loading de traces grandes
- [ ] Implementar export HTML com template estilizado
- [ ] Implementar export flamegraph SVG
- [ ] Implementar search interface com highlight
- [ ] Implementar filtros por tipo, status, tool name
- [ ] Benchmark: 1000 steps, 5000 tool calls, 100 LLM conversations
- [ ] Documentacao: README, API reference, exemplos
- [ ] Testes E2E com Playwright (Theia + Debug Panel)

**Estimativa:** 5 dev-days | **Dependencias:** Fase 5

### 15.7 Total Effort

| Fase | Descricao | Dev-Days | Dependencias |
|------|-----------|----------|-------------|
| 1 | Trace Infrastructure | 4 | NATS, SQLite |
| 2 | Debug Protocol & Server | 5 | Fase 1 |
| 3 | React Debug Panel | 6 | Fase 2 |
| 4 | Decision Graph & Replay | 5 | Fase 3 |
| 5 | Theia Widget & Flamegraph | 6 | Fase 4, Theia |
| 6 | Performance & Polish | 5 | Fase 5 |
| **Total** | | **31** | |

### Dependencies

| Dependencia | Versao | Uso |
|------------|--------|-----|
| TypeScript | ^5.4 | Linguagem |
| React | ^18.2 | Frontend |
| D3.js | ^7.8 | Decision graph + flamegraph |
| Monaco Editor React | ^4.6 | JSON viewer |
| Express | ^4.18 | HTTP server |
| ws | ^8.16 | WebSocket server |
| better-sqlite3 | ^9.4 | SQLite storage |
| uuid | ^9.0 | IDs |
| inversify | ^6.0 | DI |
| Theia Platform | ^1.45 | Widget integration |
| NATS JetStream | ^2.0 | Event bus |


---

## 16. Conexoes

- **S47 (Theia AI Agents):** Runtime integration para instrumentacao de agentes
- **S38 (Editor Intelligence):** Monaco integration para JSON viewer e syntax highlighting
- **S42 (Theia DI):** Contribution bindings para widgets, comandos e keybindings
- **S54 (Performance):** Flamegraph integration para visualizacao de performance
- **S55 (Resiliencia):** Error tracing e breakpoints para tratamentos de falha
- **S51 (Parallel Agents):** Multi-agent trace visualization no decision graph
- **S39 (Seguranca):** Authentication e authorization para acesso a traces
- **S43 (Output Validation):** Validacao de dados sensiveis em tool calls e LLM conversations
- **S35 (Agent Runtime):** Camada base que o debugger instrumenta
- **S14 (Autenticacao e Autorizacao):** Reuso do sistema de permissoes
- **GAPS-PRODUCAO-IDE.md:** Documentar gaps encontrados durante implementacao
- **Theia Plugin:** `packages/ideia-plugin` contem os widgets e contribuicoes
- **NATS JetStream:** `packages/event-bus` para streaming de eventos de trace
- **Agent Runtime:** `packages/agent-runtime` contem o runtime que sera instrumentado

---

> **Documento completo** -- Visual Agent Debugger & Inspector
> Proximo passo: Implementar Fase 1 (Trace Infrastructure) no pacote `packages/agent-debugger`
