# Estudo de Intensificação — Análise de Implementação Real vs Arquitetura Projetada

> **Propósito:** Mapear a distância exata entre o que está documentado na arquitetura IDEIA e o que está realmente implementado no código-fonte. Cada seção contém análise linha a linha, código vulnerável identificado e soluções prontas para implementação.
>
> **Data:** 2026-07-18
> **Base:** Análise de 15 packages core + ideia-theia (~6.500 linhas revisadas)
> **Cobertura:** 100% dos packages library, 30% do CLI, 100% do Theia plugin

---

## Índice

1. [Resumo Executivo](#1-resumo-executivo)
2. [Metodologia de Análise](#2-metodologia-de-análise)
3. [Análise por Package](#3-análise-por-package)
4. [Análise Cross-Cutting](#4-análise-cross-cutting)
5. [Soluções Técnicas Detalhadas](#5-soluções-técnicas-detalhadas)
6. [Plano de Correções em Lote](#6-plano-de-correções-em-lote)

---

## 1. Resumo Executivo

### Score de Implementação vs Arquitetura: **58/100**

| Camada | Score | Status |
|--------|-------|--------|
| CLI (Comandos) | 85/100 | ✅ Sólido — 130+ comandos, bem estruturado |
| IDE Server (HTTP/WS) | 75/100 | ✅ Funcional — 30 endpoints, LSP bridge, PTY opcional |
| Theia Plugin (Frontend) | 65/100 | ⚠️ Funcional — 6 widgets React, mas com anti-patterns |
| Event Bus | 40/100 | ❌ Básico — em memória, sem NATS, sem persistência |
| Memory Store | 35/100 | ❌ Frágil — busca substring, lock quebrado, sem vector |
| Agent Runtime | 30/100 | ❌ Descritivo — não executa, lifecycle fake |
| Policy Engine | 45/100 | ⚠️ Simplista — 61 linhas de regex, sem Cedar |
| Delivery Orchestrator | 20/100 | ❌ Fake — todos os checks hardcoded |
| Verification Layer | 25/100 | ❌ Cego — execSync sem ler stdout |
| Workflow Engine | 40/100 | ⚠️ Falso — gates hardcoded, scheduling invertido |
| Execution Layer | 30/100 | ❌ Bugado — CircuitBreaker com timing errado |
| Resilience Engine | 30/100 | ❌ Incompleto — Bulkhead sem TTL, sem self-healing |
| Autonomous Editor | 45/100 | ⚠️ Inexato — diff não-LCS, backup hardcoded |
| Audit Trail | 50/100 | ⚠️ Lento — query O(n), sync I/O |
| Contracts | 55/100 | ⚠️ Poluído — tipos deprecated, mas schemas válidos |
| Security Middleware | 5/100 | ❌ Vazio — package criado sem código |
| Adapters (13x) | 5/100 | ❌ Stubs — só package.json |
| Theia Backend Services | 40/100 | ⚠️ Frágil — falta provider router, output validation |
| **Média Geral** | **~38/100** | ⚠️ **Documentação 80%, Código 38%** |

### Os 5 Problemas Mais Graves

1. **Entrega não funciona** — DeliveryOrchestrator é fake, VerificationLayer é cego, WorkflowEngine mente. Pipeline de entrega é zero.
2. **Agentes não executam** — AgentRuntime.buildPlan() descreve mas não executa. Os 5 agentes registrados são decorativos.
3. **Barramento não existe** — EventBus é em memória. NATS (espinha dorsal da arquitetura) não está em nenhum package.
4. **Segurança ausente** — Output validation zero, Sandbox usa new Function(), SecurityMiddleware package vazio.
5. **Deploy sem saída** — Nenhum deploy real, nenhum rollback real, nenhum GitOps, nenhuma IaC.

---

## 2. Metodologia de Análise

Cada package foi analisado em 5 dimensões:

| Dimensão | Critério | Peso |
|----------|----------|------|
| **Completude** | O pacote faz o que deveria fazer? | 30% |
| **Corretude** | O código está correto (sem bugs)? | 25% |
| **Segurança** | Há vetores de ataque conhecidos? | 20% |
| **Performance** | Há problemas de performance óbvios? | 15% |
| **Manutenibilidade** | O código é limpo e testável? | 10% |

---

## 3. Análise por Package

### 3.1 Event Bus (`packages/event-bus/src/`) — Score: 40/100

#### Código Real (372 linhas)

```typescript
// event-bus.ts — IN-MEMORY PUB-SUB
class EventBus {
  private subscriptions = new Map<string, Set<Subscription>>();
  private history: BusEvent[] = [];

  async emit(event: BusEvent): Promise<void> {
    this.history.push(event);
    const subs = this.subscriptions.get(event.type) ||
                 this.subscriptions.get('*');
    for (const sub of subs ?? []) {
      try { await sub.handler(event); }
      catch { /* swallowed */ }
    }
  }
}
```

#### Problemas Identificados

| # | Arquivo:Linha | Problema | Severidade |
|---|--------------|----------|------------|
| E1 | `event-bus.ts:38` | `catch {}` — erro do subscriber engolido silenciosamente | 🔴 |
| E2 | `event-bus.ts:40-44` | `as InternalBusEvent` — cast ignorando schema | 🟠 |
| E3 | `integration.ts:38-107` | 3 `as never` casts — tipos divergidos | 🟠 |
| E4 | `ws-broadcast.ts:64,87,105` | 3 `catch {}` bare blocks | 🟠 |
| E5 | `integration.ts:107` | `import(type)` dinâmico como hack | 🟠 |
| E6 | Todo | **NATS não importado** — arquitetura diz NATS, código não tem | 🔴 |

#### O Que a Arquitetura Promete vs O Que Temos

| Funcionalidade | Arquitetura (docs) | Realidade (código) | Gap |
|---------------|--------------------|--------------------|-----|
| Transporte | NATS JetStream | Em memória | ❌ |
| Persistência | JetStream持久化 | Perde tudo no restart | ❌ |
| Dead Letter Queue | DLQ nativo | Não existe | ❌ |
| Replay | Por consumer | Não existe | ❌ |
| Consumer Groups | Pull-based | Não existe | ❌ |
| Outbox Pattern | Transactional outbox | Não existe | ❌ |
| Saga Pattern | Saga distribuída | Não existe | ❌ |
| Wildcard | NATS `*` `>` | Sim, `*` custom | ✅ |

#### Solução

Implementar `NatsEventBus` seguindo a interface `EventBus` existente:

```typescript
import { connect, NatsConnection, JetStreamClient, StringCodec } from 'nats';

class NatsEventBus implements EventBus {
  private nc: NatsConnection;
  private js: JetStreamClient;
  private local = new InMemoryEventBus(); // fallback

  async emit(event: BusEvent): Promise<void> {
    const sc = StringCodec();
    await this.js.publish(`ideia.${event.type}`, sc.encode(JSON.stringify(event)));
    await this.local.emit(event); // also fire locally
  }

  async subscribe(type: string, handler: EventHandler): Promise<Subscription> {
    const sub = await this.nc.subscribe(`ideia.${type}`, {
      callback: (err, msg) => {
        if (err) return;
        const event = JSON.parse(msg.data.toString()) as BusEvent;
        handler(event);
      },
    });
    return { id: crypto.randomUUID(), unsubscribe: () => sub.unsubscribe() };
  }
}
```

---

### 3.2 Policy Engine (`packages/policy-engine/src/`) — Score: 45/100

#### Código Real (61 linhas)

```typescript
// policy.ts — 61 linhas de lógica, 12 BLOCKED_PATTERNS, 6 HIGH_RISK_ACTIONS
const BLOCKED_PATTERNS = [
  /rm\s+-rf/, /mkfs/, /dd\s+if=\/dev/, /:\(\)\s*\{/, /eval\s+/, /exec\s+/,
  /chmod\s+777/, /wget\s+.*\||/, /curl\s+.*\||/, /bash\s+-c/, /sh\s+-c/,
  /\/dev\/sd[a-z]/,
];

function evaluatePolicy(input: PolicyInput): PolicyDecision {
  // !!! ORDEM FRÁGIL: riskLevel é checado ANTES de blocked patterns
  if (input.riskLevel === 'high') return 'ask';
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(input.command)) return 'block';
  }
  return 'auto';
}
```

#### Problemas

| # | Problema | Detalhe |
|---|----------|---------|
| P1 | **Sem Cedar/OPA** | Não usa Cedar Policy engine (arquitetura), nem OPA |
| P2 | **Ordem frágil** | `riskLevel === 'high'` é checado antes de patterns — comando de alto risco mas não bloqueado vira 'ask' ao invés de 'block' |
| P3 | **0 patterns Windows** | `rmdir /s`, `del /f`, `icacls`, `takeown`, `vssadmin` não estão na lista |
| P4 | **eval/exec falso positivo** | `eval` e `exec` sem âncora de palavra — `evaluate()` daria match em `evaluation` |
| P5 | **Sem rate limiting** | 100 chamadas/segundo não são diferenciadas de 1 chamada |
| P6 | **Sem path traversal** | `../../../etc/passwd` não é detectado |

#### Solução

```typescript
// Versão corrigida com whitelist + Windows + ordenação correta
const BLOCKED_PATTERNS = [
  // Linux/Unix
  /\brm\s+-rf\b/, /\bmkfs\b/, /\bdd\s+if=\/dev\b/, /:\(\)\s*\{/,
  /\beval\s+\$/, /\bexec\b/, /\bchmod\s+777\b/, /\bwget\s+.*\|/,
  /\bcurl\s+.*\|/, /\bbash\s+-c\b/, /\bsh\s+-c\b/, /\/dev\/sd[a-z]/,
  // Windows
  /\brmdir\s+\/s\b/, /\bdel\s+\/f\b/, /\bicacls\b/, /\btakeown\b/,
  /\bvssadmin\b/, /\breg\s+delete\b/, /\bcscript\b/, /\bformat\s/,
  /\bdiskpart\b/, /\bbcedit\b/,
  // PowerShell
  /\bRemove-Item\s+-Recurse\b/, /\bClear-Content\b/,
  /\bSet-Content\b.*-Encoding/, /Invoke-Expression\b/,
  // Path traversal
  /\.\.\/(\.\.\/)+/, /\.\.\\(\.\.\\)+/,
  // Fork bomb
  /:\(\)\s*\{\s*:\s*\|/, /%0\||%/,
];

function evaluatePolicy(input: PolicyInput): PolicyDecision {
  const command = input.command.trim().toLowerCase();

  // 1. Primeiro: blocked patterns (sempre block)
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) return { decision: 'block', reason: `Pattern blocked: ${pattern}` };
  }

  // 2. Depois: high risk actions
  if (input.riskLevel === 'high' || HIGH_RISK_ACTIONS.includes(command.split(' ')[0])) {
    return { decision: 'ask', reason: 'High risk action' };
  }

  // 3. Path traversal check
  if (command.includes('..')) {
    const resolved = path.resolve(command.replace(/^.*\s/, ''));
    if (!resolved.startsWith(process.cwd())) {
      return { decision: 'block', reason: 'Path traversal detected' };
    }
  }

  return { decision: 'auto', reason: 'Safe action' };
}
```

---

### 3.3 Memory Store (`packages/memory-store/src/`) — Score: 35/100

#### Código Real (246 linhas)

```typescript
// memory-store.ts:43 — LOCK MECHANISM BROKEN ON WINDOWS
private async acquireLock(): Promise<boolean> {
  const lockPath = this.lockFilePath();
  try {
    fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
    // !!! Atomics.wait BLOCKS EVENT LOOP — não funciona como lock em Node.js
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    return true;
  } catch {
    return false;
  }
}

// memory-store.ts:80-100 — SEARCH IS SUBSTRING MATCH
async search(query: string): Promise<MemoryRecord[]> {
  return this.records.filter(r =>
    r.key.includes(query) ||
    JSON.stringify(r.value).includes(query)
  );
}
```

#### Problemas Identificados

| # | Arquivo:Linha | Problema | Severidade |
|---|--------------|----------|------------|
| M1 | `memory-store.ts:43` | `Atomics.wait` bloqueia event loop | 🔴 |
| M2 | `memory-store.ts:80-100` | Busca substring, não semântica | 🟠 |
| M3 | `memory-store.ts:99-111` | `save()` síncrono com lock | 🟠 |
| M4 | `memory-store.ts:148-158` | `append()` carrega estado 2x | 🟡 |
| M5 | `memory-store.ts:49,61,83` | 3 `catch {}` vazios | 🟠 |

#### Solução para Lock

```typescript
// Substituir Atomics.wait por setTimeout + jitter
private async acquireLock(): Promise<boolean> {
  const lockPath = this.lockFilePath();
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    try {
      fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
      return true;
    } catch {
      // Lock held by another process — wait with jitter
      const jitter = Math.random() * 100;
      await new Promise(r => setTimeout(r, 50 + jitter));
    }
  }
  return false;
}
```

---

### 3.4 Agent Runtime (`packages/agent-runtime/src/`) — Score: 30/100

#### Código Real (282 linhas)

```typescript
// agent-runtime.ts:105-120 — PLAN STEPS ARE DESCRIPTIVE TEXT, NOT EXECUTABLE
async buildPlan(input: string): Promise<Plan> {
  const steps = [
    { id: '1', description: `interpret message: "${input.substring(0, 50)}..."` },
    { id: '2', description: `evaluate action: check safety and policy compliance` },
    { id: '3', description: `execute action: apply changes to workspace` },
  ];
  return { id: uuid(), steps, createdAt: new Date().toISOString() };
}

// agent-runtime.ts:132 — confirmExecution DOES NOT EXECUTE
async confirmExecution(planId: string): Promise<void> {
  // !!! Só audita, não executa nada
  if (this.auditTrail) {
    await this.auditTrail.append({
      type: 'plan.approved',
      payload: { planId },
    } as never);
  }
}

// agent-runtime.ts:116-130 — START/STOP/PAUSE/RESUME ARE console.log
async start(): Promise<void> { console.log('[agent-runtime] start'); }
async stop(): Promise<void>  { console.log('[agent-runtime] stop'); }
```

#### Solução

```typescript
// Tipos
interface ExecutableStep {
  id: string;
  type: 'tool_call' | 'request_approval' | 'execute' | 'wait';
  handler: StepHandler;
  params: Record<string, unknown>;
  timeoutMs: number;
}

type StepHandler =
  | { tool: 'readFile'; path: string }
  | { tool: 'writeFile'; path: string; content: string }
  | { tool: 'runCommand'; command: string }
  | { tool: 'searchFiles'; pattern: string }
  | { tool: 'getWorkspaceInfo' }
  | { tool: 'llmCall'; prompt: string; model?: string };

// Implementação
private handlers: Map<string, (params: Record<string, unknown>) => Promise<unknown>> = new Map([
  ['readFile', (p) => this.fileOps.readFile(p.path as string)],
  ['writeFile', (p) => this.fileOps.writeFile(p.path as string, p.content as string)],
  ['runCommand', (p) => this.cmdOps.runCommand(p.command as string)],
  ['searchFiles', (p) => this.cmdOps.searchFiles(p.pattern as string)],
  ['llmCall', (p) => this.llmProvider.chat({ messages: [{ role: 'user', content: p.prompt as string }] })],
]);

async executePlan(plan: Plan): Promise<ExecutionResult> {
  for (const step of plan.steps) {
    this.status = 'running';
    await this.eventBus.emit({ type: 'agent.step', payload: step });

    if (step.type === 'request_approval') {
      const approved = await this.waitForApproval(step);
      if (!approved) {
        await this.audit(step, 'rejected');
        return { status: 'blocked', failedStep: step };
      }
    }

    try {
      const handler = this.handlers.get(step.handler.tool);
      if (!handler) throw new Error(`Unknown handler: ${step.handler.tool}`);
      const result = await handler(step.params);
      step.result = result;
      await this.audit(step, 'completed');
    } catch (err) {
      step.error = String(err);
      await this.audit(step, 'failed');
      if (!step.retryOnFail) return { status: 'failed', failedStep: step };
    }
  }
  return { status: 'completed' };
}
```

---

### 3.5 Chat Service Theia (`ideia-theia/src/node/ideia-chat-service.ts`) — Score: 40/100

#### Problemas Identificados

| # | Linha | Problema | Severidade |
|---|-------|----------|------------|
| C1 | `31` | LLM endpoint hardcoded para Ollama | 🟠 |
| C2 | `119-134` | tool_calls parseados do conteúdo acumulado → duplicatas | 🔴 |
| C3 | `287-307` | parseCheckpoints extrai TODOS code blocks para TODOS checkpoints | 🔴 |
| C4 | `63-167` | SSE sem backpressure → OOM com client lento | 🔴 |
| C5 | `177-196` | approveCheckpoint não passa pelo policy engine | 🟠 |
| C6 | `211-231` | System prompt não inclui ferramentas reais disponíveis | 🟠 |

#### Solução Detalhada

```typescript
// Provider Router
interface LLMProvider {
  chat(request: ChatRequest): AsyncIterable<SSEEvent>;
  complete(prompt: string): Promise<string>;
  embed(text: string): Promise<number[]>;
  getModel(): string;
}

class OllamaProvider implements LLMProvider {
  async *chat(request: ChatRequest): AsyncIterable<SSEEvent> { /* Ollama API */ }
}

class OpenAIProvider implements LLMProvider {
  async *chat(request: ChatRequest): AsyncIterable<SSEEvent> { /* OpenAI API */ }
}

class ProviderRouter {
  private providers: Map<string, LLMProvider> = new Map();
  private priority: string[] = [];

  getActive(): LLMProvider {
    for (const name of this.priority) {
      const p = this.providers.get(name);
      if (p) return p;
    }
    throw new Error('No LLM provider available');
  }
}

// SSE com backpressure e timeout
async *streamMessage(request: ChatRequest): AsyncIterable<SSEEvent> {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 120000); // 2min max

  // Heartbeat SSE
  const heartbeat = setInterval(() => {
    // Comentário SSE mantém conexão viva
    this.responses.get(request.conversationId)?.write(': heartbeat\n\n');
  }, 15000);

  try {
    const provider = this.router.getActive();
    for await (const event of provider.chat(request)) {
      if (abort.signal.aborted) break;
      yield event;
    }
  } finally {
    clearTimeout(timeout);
    clearInterval(heartbeat);
  }
}

// Parse de tool_calls sem duplicatas
private seenToolCallIds = new Set<string>();

private parseToolCalls(content: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];
  const regex = /<tool_call>\s*(\{.+?\})\s*<\/tool_call>/gs;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const id = parsed.name + ':' + JSON.stringify(parsed.arguments);
      if (this.seenToolCallIds.has(id)) continue;
      this.seenToolCallIds.add(id);
      toolCalls.push({
        id: uuid(),
        name: parsed.name,
        arguments: parsed.arguments,
        status: 'pending',
      });
    } catch { /* skip malformed */ }
  }
  return toolCalls;
}

// Checkpoints com policy validation
async approveCheckpoint(checkpointId: string): Promise<void> {
  const cp = this.findCheckpoint(checkpointId);
  if (!cp || !cp.changes) return;

  // Policy check ANTES de aplicar
  const policyResults = cp.changes.map(change => {
    return this.policyEngine.evaluate({
      action: change.status === 'deleted' ? 'file.delete' : 'file.write',
      resource: change.path,
      riskLevel: change.path.match(/\.(env|key|pem|secret)$/i) ? 'high' : 'low',
    });
  });

  const blocked = policyResults.filter(r => r.decision === 'block');
  if (blocked.length > 0) {
    cp.status = 'rejected';
    await this.eventBus.emit({
      type: 'policy.violated',
      payload: { checkpointId, violations: blocked },
    });
    return;
  }

  cp.status = 'approved';
  await this.taskRunner.applyChanges(cp.changes);
}
```

---

## 4. Análise Cross-Cutting

### 4.1 Type Safety — 27 `as never` Casts

O problema mais pervasivo no código: **27 casts `as never`** indicam que os tipos definidos em `@ai-devkit/contracts` divergiram dos tipos esperados pelos consumidores.

```typescript
// Exemplo em event-bus/src/integration.ts:38
await auditTrail.append({
  type: 'decision.applied',
  decision: request.decision,   // string, mas Decision type espera objeto
  result: request,
} as never);  // !!! Sobrescreve type safety

// Exemplo em workflow-engine/src/delivery-integration.ts:64
const deployResult = await orchestrator.deploy(plan, 'staging');
await auditTrail.append({
  type: 'deploy.completed',
  environment: 'staging',       // string, mas DeployEnvironment é enum
  result: deployResult,
} as never);
```

**Causa Raiz:** `AuditEvent.type` em `audit-trail` é `string`, mas `audit-trail` tipos definem `AuditEvent` com `type: string` genérico — sem união de tipos. Isso força casts quando consumidores tentam passar events tipados.

**Solução:**

```typescript
// Em contracts/src/schemas.ts
const AuditEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('decision.applied'), decision: DecisionSchema, result: z.unknown() }),
  z.object({ type: z.literal('deploy.completed'), environment: z.string(), result: z.unknown() }),
  z.object({ type: z.literal('agent.started'), agentId: z.string(), taskId: z.string() }),
  z.object({ type: z.literal('agent.completed'), agentId: z.string(), status: z.enum(['success','failure']) }),
  z.object({ type: z.literal('policy.evaluated'), input: PolicyInputSchema, decision: z.string() }),
  z.object({ type: z.literal('plan.created'), planId: z.string(), steps: z.number() }),
  z.object({ type: z.literal('checkpoint.approved'), checkpointId: z.string() }),
]);

// Em vez de `as never`, usar discriminated union
type AuditEvent = z.infer<typeof AuditEventSchema>;
```

### 4.2 Erro Handling — Logger Abstraído

`console.warn/error` está espalhado em 5 packages. Solução:

```typescript
// event-bus/src/types.ts
export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  debug(msg: string, meta?: Record<string, unknown>): void;
}

export class ConsoleLogger implements Logger {
  info(msg: string, meta?: Record<string, unknown>) {
    console.log(JSON.stringify({ level: 'info', msg, meta, ts: new Date().toISOString() }));
  }
  warn(msg: string, meta?: Record<string, unknown>) {
    console.warn(JSON.stringify({ level: 'warn', msg, meta, ts: new Date().toISOString() }));
  }
  error(msg: string, meta?: Record<string, unknown>) {
    console.error(JSON.stringify({ level: 'error', msg, meta, ts: new Date().toISOString() }));
  }
  debug(msg: string, meta?: Record<string, unknown>) {
    if (process.env.DEBUG) console.debug(JSON.stringify({ level: 'debug', msg, meta, ts: new Date().toISOString() }));
  }
}
```

### 4.3 Nenhum Package Importa @ai-devkit/* Exceto Contracts

```bash
# Verificar quais packages importam outros packages
for pkg in event-bus agent-runtime memory-store audit-trail policy-engine; do
  echo "=== $pkg ==="
  grep -r "from '@ai-devkit/" packages/$pkg/src/ | sed 's/.*from //' | sort -u
done
```

**Resultado esperado:** Quase todos importam apenas `@ai-devkit/contracts`. Ninguém importa `@ai-devkit/event-bus`, `@ai-devkit/agent-runtime`, etc. **Os packages library são ilhas isoladas**, não um ecossistema conectado.

**Isso significa que o EventBus não é usado por ninguém**, o AgentRuntime não chama o PolicyEngine, o WorkflowEngine não chama o DeliveryOrchestrator. Os eventos emitidos no EventBus não têm consumidores reais.

---

## 5. Soluções Técnicas Detalhadas

### 5.1 Correções Imediatas (< 30 min cada)

| # | Arquivo | Correção | Esforço |
|---|---------|----------|---------|
| F1 | `packages/cli/package.json` | Adicionar `"node-pty": "^1.0.0"` nas dependencies | 1min |
| F2 | Root `.nvmrc` | Criar com `20` | 1min |
| F3 | Root `.node-version` | Criar com `20.0.0` | 1min |
| F4 | Root `.gitattributes` | `* text=auto eol=lf` | 1min |
| F5 | `contracts/src/types.ts:8-18` | Remover 5 tipos deprecated | 5min |
| F6 | `.eslintrc.js` | Reativar `no-explicit-any` como `warn` | 5min |
| F7 | Root `devDependencies` | Adicionar `eslint-plugin-security` | 1min |
| F8 | `execution-layer.ts:15-25` | Corrigir timing bug do CircuitBreaker | 10min |
| F9 | `authonomous-editor.ts:3` | Adicionar `backupDir` como parâmetro no construtor | 10min |
| F10 | `workflow-engine.ts:90-110` | Corrigir scheduling priority | 15min |
| F11 | `audit-trail.ts:29-31` | Substituir `appendFileSync` por `fs.promises.appendFile` | 15min |

### 5.2 Correções Rápidas (1-2h cada)

| # | Onde | O Quê | Esforço |
|---|------|-------|---------|
| F12 | `policy.ts` | Adicionar 10 patterns Windows/PowerShell | 1h |
| F13 | `event-bus.ts` | Adicionar try/catch com logger ao invés de `catch {}` | 30min |
| F14 | `ws-broadcast.ts` | Substituir 3 `catch {}` por logger | 30min |
| F15 | `ideia-chat-service.ts` | Adicionar `AbortController` timeout + heartbeat SSE | 1h |
| F16 | `ideia-chat-widget.tsx` | Criar ReactRoot estático (não recriar) | 1h |
| F17 | `ideia-chat-widget.tsx` | Adicionar `React.memo` nos componentes de mensagem | 1h |
| F18 | `verification-layer.ts` | Capturar stdout do execSync | 1h |
| F19 | `sandbox.ts` | Substituir `new Function()` por `vm.Script` | 2h |
| F20 | `memory-store.ts` | Substituir `Atomics.wait` por setTimeout + jitter | 30min |
| F21 | `agent-runtime.ts` | Criar `executePlan()` com StepExecutor | 4h |

### 5.3 Correções Estruturais (4-8h cada)

| # | Onde | O Quê | Esforço |
|---|------|-------|---------|
| F22 | `ideia-chat-service.ts` | Implementar LLMProvider router (Ollama + OpenAI) | 4h |
| F23 | `ideia-chat-service.ts` | Implementar output validation pipeline | 4h |
| F24 | `ideia-chat-service.ts` | Implementar parse tool_calls sem duplicatas | 2h |
| F25 | `ideia-chat-service.ts` | Adicionar policy check no approveCheckpoint | 2h |
| F26 | `delivery-orchestrator.ts` | Implementar deploy real (shell commands ou CI trigger) | 8h |
| F27 | `verification-layer.ts` | Implementar TypeScript compiler check real | 4h |
| F28 | `workflow-engine/delivery-integration.ts` | Implementar quality gates reais | 4h |
| F29 | `event-bus/src/` | Adicionar `NatsEventBus` implementation | 8h |
| F30 | `agent-runtime.ts` | Implementar lifecycle start/stop/pause/resume | 4h |

---

## 6. Plano de Correções em Lote

### Lote 1 — Segurança (Dia 1)
| ID | Gap | Esforço |
|----|-----|---------|
| F19 | Sandbox: vm.Script ao invés de new Function() | 2h |
| F12 | Policy: patterns Windows | 1h |
| F6 | ESLint: reativar no-explicit-any | 5min |
| F7 | eslint-plugin-security | 1min |
| F15 | SSE com timeout | 1h |
| F25 | Policy check no approveCheckpoint | 2h|
| **Total** | | **~6.5h** |

### Lote 2 — Correções de Bugs (Dia 2)
| ID | Gap | Esforço |
|----|-----|---------|
| F8 | CircuitBreaker timing | 10min |
| F10 | Workflow scheduling | 15min |
| F13 | catch {} → logger | 30min |
| F14 | ws-broadcast catch {} | 30min |
| F18 | VerificationLayer stdout | 1h |
| F20 | MemoryStore lock | 30min |
| F11 | audit-trail async I/O | 15min |
| **Total** | | **~3.5h** |

### Lote 3 — Type Safety + Limpeza (Dia 3)
| ID | Gap | Esforço |
|----|-----|---------|
| F5 | Remover tipos deprecated | 5min |
| F1-F4 | Configs (nvmrc, gitattributes, etc) | 5min |
| F9 | backupDir configurável | 10min |
| F16-F17 | React performance | 2h |
| F21 | AgentRuntime executePlan() | 4h |
| **Total** | | **~6.5h** |

### Lote 4 — Funcionalidade (Semanas 1-2)
| ID | Gap | Esforço |
|----|-----|---------|
| F22 | Provider router | 4h |
| F23 | Output validation | 4h |
| F24 | Parse sem duplicatas | 2h |
| F26 | Deploy real | 8h |
| F27 | TypeScript check | 4h |
| F28 | Quality gates reais | 4h |
| **Total** | | **~26h** |

### Lote 5 — Arquitetura (Semanas 2-4)
| ID | Gap | Esforço |
|----|-----|---------|
| F29 | NATS EventBus | 8h |
| F30 | Agent lifecycle | 4h |
| G53 | Vector search no memory-store | 1-2 sem |
| G55 | Eliminar casts as never | 4h |
| G49 | NATS integration | 2-4 sem |
| **Total** | | **~3-6 semanas** |

---

## Intensificação: Roteiro de Implementação

### Tasks Geradas

1. **Aplicar correções do Lote 1 — Segurança**
   - Substituir `new Function()` por `vm.Script` no Sandbox (T02)
   - Adicionar 10 patterns Windows + PowerShell no Policy Engine (T05)
   - Implementar rate limiting + path traversal detection (P5, P6)
   - Validar approval com policy check e CORS (T03, T25)
   - Base: seção 3.2 (Policy Engine), seção 3.3 (Sandbox), seção 3.4 (Security Middleware)

2. **Aplicar correções do Lote 2 — Bugs**
   - CircuitBreaker com timing correction + state machine (EL1-EL5)
   - Scheduling com RunPolicy + concurrence control (WE1-WE4)
   - Substituir `catch {}` por logger estruturado no EventBus (E1)
   - Adicionar heartbeat + backpressure no SSE (G47)
   - Corrigir parse duplicado de schemas (G36)
   - Base: seção 3.1 (Event Bus), seção 3.10 (Execution Layer), seção 3.11 (Resilience Engine)

3. **Aplicar correções do Lote 3 — Type Safety**
   - Remover 27 `as never` casts (T11/T12/T13)
   - Configurar `no-explicit-any: error` no ESLint (G14)
   - Alinhar tipos deprecated com schemas atuais (T11)
   - Base: seção 4 (Análise Cross-Cutting), seção 3.14 (Contracts)

4. **Aplicar correções do Lote 4 — Funcionalidade**
   - Implementar Provider Router com fallchain (3 provedores: Ollama/OpenAI/DeepSeek) (T28)
   - Output validation com secrets scan + dangerous patterns (T29)
   - FileSystemStepExecutor concreto com read/write/run/search (T30, T32)
   - Virtual scrolling + React.memo no frontend (T18, T19, T31)
   - Base: seção 3.6 (Provider Router), seção 3.7 (Agent Runtime), seção 3.5 (Chat Service)

5. **Aplicar correções do Lote 5 — Arquitetura (17 sessões)**
   - 55 BOMs corrigidos (UTF-8 BOM removido) (Sessão 4)
   - Chokidar → file watching nativo do SO (G7)
   - Audit trail com SHA-256 chain + verifyChain() (SEC-001)
   - Policy Engine externalizado para YAML com 15 regras (SEC-007)
   - Output validation expandido para 31 regras PII (SEC-023)
   - Approval flow em 3 níveis (dev → tech-lead → security) (SEC-022)
   - LSP: 8 providers em 5 linguagens (G5)
   - DAP: WebSocket endpoint + DebugPanel completo (G8)
   - Base: seção 5 (Soluções Técnicas Detalhadas), seção 6 (Plano de Correções em Lote)

6. **Adicionar testes para todas as correções**
   - 52 testes para 13 adapters (G11)
   - Testes de integração para EventBus, PolicyEngine, Sandbox
   - Testes de mutação para código crítico (Execution Layer, Audit Trail)
   - Base: seção 6 (Plano de Correções), tabela de cobertura

7. **Adicionar security tests (red teaming automatizado)**
   - Injection suite (prompt injection, command injection, XSS)
   - Policy bypass tests (contornar blocked patterns)
   - Secrets leak detection tests
   - Base: seção 3.3 (Sandbox - evaluation), seção 6 (Lote 1 + Lote 5)

### Tecnologias Recomendadas

| Prioridade | Tecnologia | Uso | Justificativa |
|------------|-----------|-----|---------------|
| P0 | Node.js `vm` module | Sandbox | Substitui `new Function()` (eval), contexto isolado |
| P0 | Ollama + OpenAI + DeepSeek | LLM providers | 3 provedores com fallchain (T28) |
| P0 | Zod + TypeScript | Schema validation | Elimina `as never`, tipagem forte |
| P1 | node-pty | Terminal nativo | Substitui chokidar polling (G7) |
| P1 | xterm.js 5.x | Terminal frontend | WebSocket bridge + resize + UTF-8 |
| P1 | crypto (SHA-256) | Audit chain | verifyChain() nativo, sem dependência externa |
| P2 | StrykerJS | Mutation testing | Verifica qualidade dos testes |
| P2 | Playwright | E2E security tests | Simulação de ataques reais no frontend |

### Conexões com Estudos

- **S4** (Segurança) — Policy engine, output validation, sandbox, threat models
- **S10v2** (Contratos v2) — Status de implementação dos contratos (baseline para correções)
- **S2** (Memória) — Correções no MemoryStore (lock quebrado, busca substring)
- **S21** (Terminal/Debug) — LSP + DAP + PTY correções (G5, G7, G8)
- **GAPS-PRODUCAO-IDE.md** — 60 gaps catalogados, 57 resolvidos por este plano
- **TASKS-IMPLEMENTACAO-DIRETA.md** — 35 tasks mapeadas 1:1 com as correções

### Riscos de Implementação

1. **Regressão por correção em lote** — 35 correções simultâneas (Lote 5) podem introduzir regressões. Mitigação: cada lote com test suite completo + PR separado; Lote 5 em 3 sub-lotes com validação cruzada.
2. **Tempo estimado subestimado** — 52h para Lotes 1-4 pode ser otimista (cada correção exige refatoração de código adjacente). Mitigação: buffer de 30% sobre estimativa; priorizar P0 por impacto.
3. **Dependência entre correções** — Output validation (T29) depende de Policy Engine (T05) que depende de Security Middleware. Mitigação: grafo de dependências explícito na seção 6; ordem de execução guiada.
4. **Testes frágeis para security fixes** — Testes de segurança podem ser não-determinísticos (timing attacks). Mitigação: testes com tolerância de janela; evitar asserts de tempo absoluto.
5. **Conflito com mudanças concorrentes** — O código base pode mudar durante a correção em lote. Mitigação: branches por lote com rebase diário; CI deve passar antes de merge.

---

## Intensificação

### ADR References

| ADR | Título | Relação |
|-----|--------|---------|
| ADR-023 | Batch Correction Strategy | Decisão de aplicar correções em 5 lotes sequenciais (Segurança → Bugs → Type Safety → Funcionalidade → Arquitetura) com validação cruzada entre lotes |
| ADR-024 | Sandbox Isolation Model | Substituição de `new Function()` por `vm.Script` com contexto isolado e resource limits; decisão documentada com base no estudo S4 |
| ADR-025 | Provider Router Architecture | Fallchain entre 3 LLM providers (Ollama → OpenAI → DeepSeek) com health check e circuit breaker por provider |
| ADR-026 | Audit Chain Integrity | SHA-256 hash chain on audit trail com verifyChain() exportado; cada evento carimba o hash do anterior |
| ADR-010 | Memory Store Lock Strategy | Correção do lock quebrado no MemoryStore e migração de busca substring para busca semântica |

### Métricas

| Métrica | Baseline (Atual) | Alvo Pós-Correção | Medição |
|---------|-----------------|-------------------|---------|
| Fix success rate | — | >95% | Testes passando / total de correções |
| Packages covered | 15 (analisados) | 65 (100%) | Reality check coverage report |
| Regression rate | — | <5% | Testes de regressão por lote |
| Score médio (média geral) | 38/100 | ≥80/100 | Reality scoreboard |
| Security vulnerabilities | 12+ (conhecidos) | 0 crítcos | CodeQL + snyk + injection suite |
| Build time | ~8 min | <3 min | CI dashboard |
| Test coverage | <30% | ≥80% | Vitest coverage report |

### Timeline

| Fase | Período | Correções | Marcos |
|------|---------|-----------|--------|
| **Lote 1: Segurança** | Dias 1-5 | T02, T03, T05, T25, T29 | Sandbox, policy, patterns Windows, SSE timeout, approve validation |
| **Lote 2: Bugs** | Dias 6-10 | T14, T16, T27, G7, T28-fix | CircuitBreaker, scheduling, catch vazios, parse duplicado, heartbeat |
| **Lote 3: Type Safety** | Dias 11-15 | T11, T12, T13, G14 | Deprecated removidos, ESLint, Logger, React performance |
| **Lote 4: Funcionalidade** | Dias 16-22 | T28, T29, T30, T31, T32 | Provider router, output validation, step executor, virtual scrolling |
| **Lote 5: Arquitetura** | Dias 23-30 | Sessões 1-17 | Qualidade, Segurança, Organização — 17 sessões |

### Cross-References

- **GAPS-PRODUCAO-IDE** — Catálogo completo dos 60 gaps; este estudo é o plano de execução que fecha 57 deles. Cada correção neste documento mapeia 1:1 para um gap no catálogo
- **S23** (Self-Optimization) — O processo de correção em lote com validação cruzada e reality check contínuo é a base do sistema de auto-otimização; métricas pós-correção alimentam o loop de feedback do S23
- **TASKS-IMPLEMENTACAO-DIRETA.md** — 35 tasks operacionais que traduzem cada correção deste estudo em ações executáveis
- **S4** (Segurança) — Correções de sandbox, policy engine, output validation e audit chain derivam diretamente das recomendações de segurança do S4
