# Especificação de Contratos de Integração — AI-Devkit v2

> **Documento definitivo de contratos entre todos os componentes da IDE.**
> Cada contrato define: o que um módulo EXPÕE, o que outro CONSUME, e como a comunicação acontece.

---

## 1. Convenções Gerais

### 1.1 Padrão de Nomenclatura

- Contratos entre módulos A e B: `[modulo-a]-to-[modulo-b].md` em `.ai/contracts/`
- Interfaces TypeScript: prefixo `I` opcional, nomes descritivos
- Schemas JSON: minúsculas com hífen (`session.schema.json`)

### 1.2 Envelope de Resposta Padrão (API REST)

```typescript
interface ApiResponse<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
  meta?: {
    timestamp: string;
    duration: number;
    requestId: string;
  };
}
```

### 1.3 Envelope de Evento Padrão (WebSocket)

```typescript
interface WsEvent<T = unknown> {
  type: string; // ex: "file/change", "approval/request"
  data: T;
  timestamp: string;
  origin: string; // ex: "ide-server", "agent-runtime"
}
```

### 1.4 Envelope de Erro Padrão

```typescript
interface ApiError {
  code: string; // ex: "POLICY_BLOCK", "ACTION_REQUIRES_APPROVAL"
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}
```

---

## 2. Contrato: contracts → policy-engine

**Módulo A**: `@ai-devkit/contracts` (tipos base)  
**Módulo B**: `@ai-devkit/policy-engine` (avaliação de políticas)

### O que B importa de A:

```typescript
import { Decision, RiskLevel, ActionType } from '@ai-devkit/contracts';
```

### O que B exporta:

```typescript
interface PolicyInput {
  actionType: ActionType;
  resource?: string;
  riskLevel?: RiskLevel;
}

interface PolicyResult {
  decision: Decision; // 'auto' | 'ask' | 'block'
  reason: string;
}

function evaluatePolicy(input: PolicyInput): PolicyResult;
function evaluateBatch(inputs: PolicyInput[]): PolicyResult[];
```

### Regras de Política Embutidas:

| Padrão                   | Tipo      | Decisão |
| ------------------------ | --------- | ------- |
| `rm -rf /`               | blocked   | `block` |
| `format`, `mkfs`, `dd`   | blocked   | `block` |
| `shutdown`, `reboot`     | high-risk | `ask`   |
| `file.delete`            | high-risk | `ask`   |
| `file.rename`            | medium    | `ask`   |
| `shell.exec` (high-risk) | high-risk | `ask`   |
| `policy.change`          | critical  | `ask`   |
| Outros                   | safe      | `auto`  |

---

## 3. Contrato: contracts → audit-trail

**Módulo A**: `@ai-devkit/contracts` (tipos base)  
**Módulo B**: `@ai-devkit/audit-trail` (log de eventos)

### O que B importa de A:

```typescript
import { Actor, Decision, EventResult } from '@ai-devkit/contracts';
```

### O que B exporta:

```typescript
interface AuditEvent {
  eventId: string; // crypto.randomUUID()
  timestamp: string; // ISO 8601
  actor: Actor; // 'user' | 'system' | 'ai'
  eventType: string; // ex: 'file.write', 'shell.exec', 'policy.evaluate'
  target: string; // recurso alvo (path, command, action)
  decision: Decision | 'approved' | 'rejected';
  result: EventResult; // 'success' | 'failure' | 'pending'
  metadata?: Record<string, unknown>;
}

class AuditTrail {
  constructor(filePath: string);
  append(event: Omit<AuditEvent, 'eventId' | 'timestamp'>): AuditEvent;
  load(): AuditEvent[];
  query(filter: Partial<AuditEvent>): AuditEvent[];
  count(): number;
}
```

---

## 4. Contrato: contracts → memory-store

**Módulo A**: `@ai-devkit/contracts` (tipos base)  
**Módulo B**: `@ai-devkit/memory-store` (persistência)

### Tipos compartilhados (em contracts):

```typescript
type MemoryCategory = 'cycle' | 'failure' | 'recovery' | 'approval' | 'change' | 'trend' | 'policy' | 'agent' | 'decision' | 'chat';

interface MemoryRecord {
  memoryId: string;
  category: MemoryCategory;
  source: string;
  summary: string;
  tags: string[];
  createdAt: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  decision?: string;
  context?: Record<string, unknown>;
}
```

### O que B exporta:

```typescript
interface MemoryState {
  sessionId: string;
  workspaceRoot: string;
  activeTask: string | null;
  preferences: Record<string, unknown>;
  lastDecisions: Array<Record<string, unknown>>;
  context: Record<string, unknown>;
  records: MemoryRecord[];
}

class MemoryStore {
  constructor(filePath: string);
  load(): MemoryState;
  save(state: MemoryState): void;
  pushDecision(state: MemoryState, decision: Record<string, unknown>): void;
  updateContext(state: MemoryState, ctx: Record<string, unknown>): void;
  append(record: Omit<MemoryRecord, 'memoryId' | 'createdAt'>): MemoryRecord;
  list(): MemoryRecord[];
  count(): number;
  remove(memoryId: string): void;
  query(filter: Partial<MemoryRecord>): MemoryRecord[];
}
```

---

## 5. Contrato: agent-runtime → api-router

**Módulo A**: `@ai-devkit/agent-runtime` (orquestrador)  
**Módulo B**: `packages/cli/src/ide/api-router.ts` (roteador HTTP)

### O que B importa de A:

```typescript
import { AgentRuntime, AgentRequest, AgentPlan } from '@ai-devkit/agent-runtime';
```

### O que A exporta:

```typescript
interface AgentRequest {
  message: string; // descrição da intenção do usuário
  actionType: ActionType; // 'file.write', 'shell.exec', etc.
  resource?: string; // path do arquivo, comando, etc.
  riskLevel?: RiskLevel; // 'low' | 'medium' | 'high'
  metadata?: Record<string, unknown>;
}

interface AgentPlan {
  steps: string[]; // plano de ação detalhado
  decision: Decision; // 'auto' | 'ask' | 'block'
  reason: string; // justificativa
  actionId: string; // UUID para rastreamento
}

class AgentRuntime {
  constructor(auditTrail: AuditTrail, memoryStore: MemoryStore, memoryPath: string);
  run(request: AgentRequest): AgentPlan;
  confirmExecution(actionId: string, approved: boolean, reason?: string): void;
}
```

### Fluxo de Integração:

```
api-router recebe requisição HTTP
  → constrói AgentRequest (actionType, resource, riskLevel)
  → chama agentRuntime.run(request)
  → agentRuntime consulta policy-engine
  → agentRuntime retorna AgentPlan { steps, decision, reason, actionId }
  → api-router avalia decision:
      'block' → retorna 403 com reason
      'ask'   → cria approval request, broadcast WS, aguarda
      'auto'  → executa ação via bridge, chama confirmExecution()
  → após execução, agentRuntime registra no audit-trail + memory-store
```

---

## 6. Contrato: api-router → web-ui

**Módulo A**: `packages/cli/src/ide/api-router.ts` (backend)  
**Módulo B**: `packages/web-ui/src/lib/api.ts` (frontend)

### Tipo de Conexão: HTTP REST (JSON) + WebSocket (eventos)

### Endpoints (extraído do OpenAPI):

```
GET    /api/health           → { status: 'ok', timestamp }
GET    /api/ide/status       → { version, session, policy, memoryCount, uptime }
GET    /api/fs/list?path=    → { entries: FsEntry[] }
GET    /api/fs/read?path=    → { content: string, binary: boolean }
POST   /api/fs/write         → body: { path, content } → { ok }
POST   /api/fs/create        → body: { path, type } → { ok }
PATCH  /api/fs/rename        → body: { oldPath, newPath } → { ok }
DELETE /api/fs/delete?path=  → { ok }
GET    /api/fs/search?q=     → { results: string[] }
POST   /api/shell            → body: { command, approved? } → { ok, output, error, code }
GET    /api/session          → { session: IdeSession }
POST   /api/session          → { session: IdeSession }
POST   /api/approval/request → body: { action, reason } → { request: ApprovalRequest }
POST   /api/approval/respond → body: { action, approved, approver } → { result: ApprovalResult }
GET    /api/preview/report   → { report: PreviewReport, changes: PreviewChange[] }
POST   /api/preview/approve  → { ok, decision: 'approved' }
POST   /api/preview/reject   → { ok, decision: 'rejected' }
GET    /api/memory           → { records: MemoryRecord[] }
POST   /api/memory           → body: { category, summary, detail?, tags?, severity? } → { ok }
POST   /api/chat/completions → SSE streaming (text/event-stream)
GET    /api/commands         → { commands: { name, description }[] }
GET    /api/audit            → { events: AuditEvent[], count }
GET    /api/tasks            → { tasks: TaskEntry[] }
POST   /api/tasks            → body: { title } → { taskId }
PATCH  /api/tasks/:id        → body: { status, progress }
GET    /api/settings/providers → { providers: ProviderStatus[] }
POST   /api/settings/providers/priority → body: { priority: string[] }
POST   /api/settings/providers/config → body: { provider, config }
GET    /api/diagnostics      → { problems: Diagnostic[], count, errors, warnings }
GET    /api/workspace/config → { config: AIConfig }
POST   /api/workspace/config → body: { updates } → { config }
GET    /api/git/status       → { branch, ahead, behind, files, isRepo }
GET    /api/git/diff?file=   → { diff: string }
GET    /api/git/branch/compare?branch= → { branch, commits, diffStat }
POST   /api/sandbox/exec     → body: { code, language, timeout? } → SandboxResult
```

### Eventos WebSocket:

```
file/change           → { type, path, timestamp }
terminal/execution    → { command, result, classification }
approval/request      → { action, approvalId, reason, requestedBy }
approval/respond      → { action, approved, approver, decidedAt }
preview/approve       → { file }
preview/reject        → { file, reason }
memory/update         → { category, summary, severity }
task/update           → { id, title, status, progress }
diagnostics/update    → { count, errors, warnings, timestamp }
session/change        → { sessionId, action }
```

---

## 7. Contrato: vscode-extension → CLI

**Módulo A**: `@ai-devkit/cli` (binário CLI)  
**Módulo B**: `vscode-extension/` (extensão VS Code)

### Tipo de Conexão: subprocesso (CLI via shell)

### Comandos e Schemas de Resposta (formato JSON):

```typescript
// ai-devkit --version
interface CliVersionResponse {
  version: string;
}

// ai-devkit status --json
interface CliStatusResponse {
  ok: boolean;
  session: { id: string; policy: string };
  scores: Record<string, number>;
  metrics: Record<string, unknown>;
}

// ai-devkit verify --json
interface CliVerifyResponse {
  ok: boolean;
  violations: Array<{
    file: string;
    line: number;
    message: string;
    severity: 'error' | 'warning';
    rule: string;
  }>;
  score: number;
}

// ai-devkit plan status --json
interface CliPlanResponse {
  tasks: Array<{
    id: string;
    title: string;
    status: 'pending' | 'running' | 'completed' | 'blocked';
    priority: 'high' | 'medium' | 'low';
  }>;
}

// ai-devkit coverage status --json
interface CliCoverageResponse {
  total: number;
  covered: number;
  percentage: number;
  files: Array<{
    path: string;
    coverage: number;
  }>;
}
```

### Padrão de Chamada:

```typescript
interface CliCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

### Fluxo:

```
VS Code command → runAiDevkitCommand(args)
  → child_process.exec(`ai-devkit ${args.join(' ')} --json`)
  → parse stdout como JSON
  → validar com Zod schema
  → tipar como interface específica do comando
```

---

## 8. Contrato: api-router → local-ai (provedores)

**Módulo A**: `packages/cli/src/ide/api-router.ts` (roteador)  
**Módulo B**: `packages/cli/src/local-ai/*` (provedores de IA)

### Interface do Provedor (contrato implementado por todos os providers):

```typescript
interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  region?: string; // AWS Bedrock
}

interface ProviderResponse {
  content: string;
  model: string;
  provider: string;
  latencyMs: number;
  tokens?: number;
}

interface AiProvider {
  name: string;
  query(prompt: string, model: string, config?: ProviderConfig): Promise<ProviderResponse>;
  streamQuery(prompt: string, model: string, onDelta: (chunk: string) => void, config?: ProviderConfig): Promise<ProviderResponse>;
  listModels(): Promise<string[]>;
  healthCheck(): Promise<boolean>;
}
```

### Provedores Implementados:

| Provedor   | Classe               | Modelo Padrão            |
| ---------- | -------------------- | ------------------------ |
| Ollama     | `OllamaProvider`     | llama3.2                 |
| OpenAI     | `OpenAiProvider`     | gpt-4o                   |
| OpenRouter | `OpenRouterProvider` | openai/gpt-4o            |
| Anthropic  | `AnthropicProvider`  | claude-sonnet-4-20250514 |
| Google     | `GoogleProvider`     | gemini-2.0-flash         |
| AWS        | `AwsProvider`        | (configurável)           |

---

## 9. Contrato: api-router → sandbox

**Módulo A**: `packages/cli/src/ide/api-router.ts`  
**Módulo B**: `packages/cli/src/ide/sandbox.ts`

```typescript
interface SandboxRequest {
  code: string;
  language?: 'javascript' | 'typescript' | 'shell';
  timeout?: number; // ms, default 10000
  files?: Record<string, string>;
}

interface SandboxResult {
  ok: boolean;
  output: string;
  error: string;
  durationMs: number;
  memoryMb: number;
}
```

### Restrições do Sandbox:

- Worker thread isolado com `resourceLimits`: maxOldGenerationSizeMb: 64
- Timeout padrão: 10s (configurável até 30s)
- Proibido: `setInterval`, acesso a `fs` nativo, `require` de módulos
- Permitido: `Math`, `JSON`, `Date`, `Array`, `Object`, `String`, `Number`, `Boolean`, `Map`, `Set`, `RegExp`, `Error`
- Shell: executa via `execSync` com timeout

---

## 10. Contrato: api-router → session-manager

**Módulo A**: `packages/cli/src/ide/api-router.ts`  
**Módulo B**: `packages/cli/src/ide/session-manager.ts`

```typescript
interface IdeSession {
  session_id: string; // crypto.randomUUID()
  workspace_root: string; // path absoluto
  policy: 'auto' | 'ask' | 'block'; // modo de autonomia
  active_tasks: string[]; // tarefas em andamento
  memory: {
    last_decisions: string[]; // últimas 100 decisões
    project_context: Record<string, unknown>;
  };
  created_at: string; // ISO 8601
  updated_at: string;
  metadata: Record<string, unknown>;
}

// Métodos do session-manager.ts:
function createSession(root: string): IdeSession;
function saveSession(session: IdeSession): void;
function loadSession(root: string, sessionId: string): IdeSession | null;
function getActiveSession(root: string): IdeSession | null;
function setActiveSession(root: string, sessionId: string): void;
function pushDecision(session: IdeSession, decision: string): void;
function updateContext(session: IdeSession, ctx: Record<string, unknown>): void;
function resolvePolicy(session: IdeSession): 'auto' | 'ask' | 'block';
```

---

## 11. Contrato: api-router → terminal-bridge

**Módulo A**: `packages/cli/src/ide/api-router.ts`  
**Módulo B**: `packages/cli/src/ide/terminal-bridge.ts`

```typescript
interface TerminalResult {
  ok: boolean;
  output: string;
  error: string;
  code: number | null;
  durationMs: number;
}

class TerminalBridge extends EventEmitter {
  constructor(cwd: string);
  execute(command: string, timeoutMs?: number): Promise<TerminalResult>;
  executeHighRisk(command: string, approved: boolean, timeoutMs?: number): Promise<TerminalResult>;
  classifyCommand(command: string): 'safe' | 'high-risk' | 'blocked';
  getHistory(): { command: string; result: TerminalResult }[];
  // Eventos: 'execution' → { command, result, classification }
}
```

---

## 12. Contrato: api-router → file-bridge

**Módulo A**: `packages/cli/src/ide/api-router.ts`  
**Módulo B**: `packages/cli/src/ide/file-bridge.ts`

```typescript
interface FsEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink';
  size: number;
  modifiedAt: string; // ISO 8601
}

interface FileChangeEvent {
  type: 'create' | 'modify' | 'delete';
  path: string;
  timestamp: string;
}

class FileBridge extends EventEmitter {
  constructor(root: string);
  listDir(relPath: string): Promise<FsEntry[]>;
  readFile(relPath: string): Promise<{ content: string; binary: boolean }>;
  writeFile(relPath: string, content: string): Promise<void>;
  createFile(relPath: string): Promise<void>;
  createDir(relPath: string): Promise<void>;
  rename(oldRel: string, newRel: string): Promise<void>;
  delete(relPath: string): Promise<void>;
  searchFiles(pattern: string): Promise<string[]>;
  startWatcher(): void; // polling a cada 2s
  stopWatcher(): void;
  // Eventos: 'change' → FileChangeEvent
}
```

---

## 13. Resumo de Todos os Contratos

| #   | De (exporta)               | Para (importa)                                           | Tipo         | Arquivo de Referência                |
| --- | -------------------------- | -------------------------------------------------------- | ------------ | ------------------------------------ |
| 1   | `@ai-devkit/contracts`     | `@ai-devkit/policy-engine`                               | TS types     | `contracts/src/types.ts`             |
| 2   | `@ai-devkit/contracts`     | `@ai-devkit/audit-trail`                                 | TS types     | `contracts/src/types.ts`             |
| 3   | `@ai-devkit/contracts`     | `@ai-devkit/memory-store`                                | TS types     | `contracts/src/types.ts`             |
| 4   | `@ai-devkit/contracts`     | `@ai-devkit/agent-runtime`                               | TS types     | `contracts/src/types.ts`             |
| 5   | `@ai-devkit/policy-engine` | `agent-runtime`, `api-router`, `apps/api`                | TS class     | `policy-engine/src/policy.ts`        |
| 6   | `@ai-devkit/audit-trail`   | `agent-runtime`, `api-router`, `chat-bridge`, `apps/api` | TS class     | `audit-trail/src/audit-trail.ts`     |
| 7   | `@ai-devkit/memory-store`  | `agent-runtime`, `api-router`, `apps/api`                | TS class     | `memory-store/src/memory-store.ts`   |
| 8   | `@ai-devkit/agent-runtime` | `api-router` (futuro)                                    | TS class     | `agent-runtime/src/agent-runtime.ts` |
| 9   | `cli/ide/api-router`       | `web-ui` (HTTP)                                          | OpenAPI      | `.ai/contracts/openapi/spec.yaml`    |
| 10  | `cli/ide/api-router`       | `web-ui` (WS)                                            | AsyncAPI     | `.ai/contracts/asyncapi/spec.yaml`   |
| 11  | `cli/ide/chat-bridge`      | `web-ui` (SSE)                                           | OpenAPI/SSE  | `chat-bridge.ts`                     |
| 12  | `cli/ide/session-manager`  | `api-router` (TS)                                        | TS functions | `session-manager.ts`                 |
| 13  | `cli/ide/file-bridge`      | `api-router` (TS)                                        | TS class     | `file-bridge.ts`                     |
| 14  | `cli/ide/terminal-bridge`  | `api-router` (TS)                                        | TS class     | `terminal-bridge.ts`                 |
| 15  | `cli/ide/sandbox`          | `api-router` (TS)                                        | TS functions | `sandbox.ts`                         |
| 16  | `cli/ide/approval-flow`    | `api-router` (TS)                                        | TS functions | `governance/approval-flow.ts`        |
| 17  | `cli/local-ai/providers`   | `chat-engine`, `provider-router`                         | TS interface | `local-ai/providers/index.ts`        |
| 18  | `cli` (subprocess)         | `vscode-extension`                                       | stdout JSON  | (schema por comando)                 |
| 19  | `@ai-devkit/diff-engine`   | `api-router` (TS)                                        | TS functions | `diff-engine/src/index.ts`           |
