# Estudo da IDEIA como Núcleo Unificado de Inteligência, Automação e Entrega (System-of-Systems)

**Nível:** Doutoral / Arquitetura de Sistemas  
**Áreas:** Arquitetura de Software · Sistemas-de-Sistemas (SoS) · Engenharia de Plataformas · Integração Cognitiva  
**Hipótese central:** A centralização de IA, heurística, robôs e ferramentas em um núcleo orquestrador único produz um sistema com propriedades emergentes de coordenação, governança e eficiência que abordagens descentralizadas não alcançam.

---

## 1. Introdução e Fundamentação

### 1.1 O Problema da Fragmentação Arquitetural

Sistemas de engenharia autônoma atuais (Devin, Factory, OpenHands, etc.) tipicamente seguem um modelo onde:

- Cada agente opera com relativa independência
- Ferramentas são plugadas sem coordenação central
- A memória é compartilhada mas não governada
- Não há hierarquia de decisão formal
- A segurança é tratada como camada externa

A IDEIA propõe um modelo inverso: **todos os subsistemas operam DENTRO de um núcleo orquestrador que define contratos, políticas, memória e governança.**

### 1.2 Definição do Núcleo Unificado

> **A IDEIA é um sistema-de-sistemas (SoS) onde cada subsistema — IA, heurística, robôs, agentes, ferramentas — é um componente interno com contratos formais, operando sob uma única camada de orquestração, memória, política e observabilidade.**

### 1.3 Contexto Científico

- **Maier (1998):** Architecting Principles for Systems-of-Systems — Define as 5 características de SoS: independência operacional, independência gerencial, evolução evolucionária, comportamento emergente, distribuição geográfica
- **ISO/IEC/IEEE 42010 (2011):** Systems and software engineering — Architecture description
- **Gamma et al. (1994):** Design Patterns — Padrões de orquestração como Mediator, Facade, Observer
- **Buschmann et al. (1996):** Pattern-Oriented Software Architecture — Layers, Pipes and Filters, Microkernel
- **Vernon (2013):** Implementing Domain-Driven Design — bounded contexts, aggregates, domain events

---

## 2. Arquitetura do Núcleo Unificado

### 2.1 Diagrama de Camadas Internas

```
┌────────────────────────────────────────────────────────────────┐
│                    INTERFACE LAYER (Theia)                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │  Editor    │ │  Dashboard │ │   Chat     │ │  Approval  │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
├────────────────────────────────────────────────────────────────┤
│                    INTENT LAYER                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
│  │ Ambiguity  │ │   Intent   │ │  Spec     │                 │
│  │ Detector   │ │ Classifier │ │ Generator  │                 │
│  └────────────┘ └────────────┘ └────────────┘                 │
├────────────────────────────────────────────────────────────────┤
│                    PLANNING LAYER                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
│  │ Task       │ │ Dependency │ │   Risk     │                 │
│  │ Decomposer │ │ Analyzer   │ │ Estimator  │                 │
│  └────────────┘ └────────────┘ └────────────┘                 │
├────────────────────────────────────────────────────────────────┤
│                    COGNITIVE LAYER (IA)                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
│  │   LLM      │ │   RAG      │ │  Embedding │                 │
│  │ Provider   │ │ Engine     │ │   Store    │                 │
│  └────────────┘ └────────────┘ └────────────┘                 │
├────────────────────────────────────────────────────────────────┤
│                    HEURISTIC LAYER                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
│  │ Priority   │ │  Routing   │ │  Decision  │                 │
│  │ Engine     │ │  Engine    │ │  Engine   │                 │
│  └────────────┘ └────────────┘ └────────────┘                 │
├────────────────────────────────────────────────────────────────┤
│                    EXECUTION LAYER                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
│  │   Agent    │ │   Robot    │ │  Sandbox   │                 │
│  │  Runtime   │ │  Workers   │ │  Executor  │                 │
│  └────────────┘ └────────────┘ └────────────┘                 │
├────────────────────────────────────────────────────────────────┤
│                    VERIFICATION LAYER                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
│  │   Test     │ │   Policy   │ │ Validation │                 │
│  │  Runner    │ │   Check    │ │   Engine   │                 │
│  └────────────┘ └────────────┘ └────────────┘                 │
├────────────────────────────────────────────────────────────────┤
│                    GOVERNANCE LAYER                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
│  │   Audit    │ │  Approval  │ │ Compliance │                 │
│  │   Trail    │ │   Flow     │ │   Check    │                 │
│  └────────────┘ └────────────┘ └────────────┘                 │
├────────────────────────────────────────────────────────────────┤
│                    OBSERVABILITY LAYER                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
│  │   Logs     │ │  Metrics   │ │   Traces   │                 │
│  │ Collector  │ │ Aggregator │ │  Distrib.  │                 │
│  └────────────┘ └────────────┘ └────────────┘                 │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Princípios do Núcleo Unificado

#### P1 — Contratos Formais entre Camadas
Cada camada expõe interfaces bem definidas. A comunicação entre camadas ocorre exclusivamente via contratos:

```typescript
interface IntentLayerContract {
  input: { rawText: string; context: ContextBundle };
  output: { intent: Intent; spec: Specification; ambiguities: Ambiguity[] };
}

interface PlanningLayerContract {
  input: { intent: Intent; spec: Specification };
  output: { plan: Plan; dependencies: Dependency[]; risks: Risk[] };
}
```

#### P2 — Single Source of Truth for State
O estado global do sistema é mantido em um repositório centralizado (event store + state store), acessível por todas as camadas mas mutável apenas pelo orquestrador.

#### P3 — Decisão Hierárquica
Nenhuma camada subsistêmica toma decisões fora do seu escopo. Decisões que afetam múltiplas camadas sobem para o orquestrador.

#### P4 — Observabilidade Obrigatória
Toda ação relevante em qualquer camada é registrada com:
- Identificador de correlação (traceId)
- Timestamp
- Decisão tomada
- Justificativa
- Resultado

---

## 3. Fluxo de Operação do Núcleo

### 3.1 Pipeline Padrão de Tarefa

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│ RECEIVE │──▶│ CLARIFY │──▶│ SPECIFY │──▶│  PLAN   │
└─────────┘   └─────────┘   └─────────┘   └────┬────┘
                                               │
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌────▼────┐
│ DELIVER │◀──│ VERIFY  │◀──│ EXECUTE │◀──│  ROUTE  │
└─────────┘   └─────────┘   └─────────┘   └─────────┘
```

### 3.2 Exemplo: Construção de um Módulo de Relatórios

**Fase 1 — Recebimento e Clarificação**
1. Usuário: "Preciso de um módulo de relatórios"
2. Intent Detector identifica ambiguidade: "Qual tipo de relatório? Quem vai usar?"
3. IDEIA pergunta: "O módulo será para usuários internos ou externos? Quais fontes de dado?"

**Fase 2 — Especificação**
1. Spec Generator produz: Requisitos funcionais, casos de uso, critérios de aceite
2. Heuristic Engine classifica complexidade como "moderate"

**Fase 3 — Planejamento**
1. Planner decompõe: [auth, data-model, queries, endpoints, UI, tests, docs]
2. Dependency Analyzer identifica: data-model → endpoints → UI
3. Risk Estimator: risco baixo, autonomia nível 3

**Fase 4 — Roteamento**
1. Complexity Router seleciona pipeline: `llm-plan-execute`
2. Agent Selector aloca: architect, programmer, tester robots

**Fase 5 — Execução**
1. Programmer Robot: gera models, controllers, views
2. Tester Robot: gera e executa testes unitários
3. Doc Robot: gera documentação técnica

**Fase 6 — Verificação**
1. Test Runner executa suite completa
2. Policy Check: valida segurança, performance
3. Validation Engine: compara com critérios de aceite

**Fase 7 — Entrega**
1. Code acumulado e verificado
2. Documentação consolidada
3. Deploy preparado (via Deploy Robot)
4. Audit trail completo

---

## 4. Propriedades Emergentes do Núcleo Unificado

### 4.1 Coordenação Automática
Quando múltiplos subsistemas precisam cooperar, o núcleo coordena automaticamente sem necessidade de lógica ad-hoc.

### 4.2 Consistência Decisória
Decisões similares produzem resultados similares porque passam pelo mesmo pipeline heurístico.

### 4.3 Rastreabilidade Integral
Toda ação é rastreável até a decisão que a originou, criando uma cadeia completa de responsabilidade.

### 4.4 Evolução Controlada
Subsistemas podem ser substituídos sem afetar o restante, desde que mantenham os contratos.

### 4.5 Aprendizado Sistêmico
O núcleo acumula conhecimento de todos os subsistemas, permitindo aprendizado cross-domínio.

---

## 5. Comparação com Abordagens Alternativas

| Dimensão | IDEIA (Núcleo Unificado) | Agentes Independentes | Plugins Soltos |
|----------|-------------------------|----------------------|----------------|
| Coordenação | Centralizada, formal | Negociação P2P | Manual |
| Memória | Unificada, hierárquica | Fragmentada | Inexistente |
| Governança | Por design | Opcional | Ausente |
| Observabilidade | Integral | Parcial | Nula |
| Substituição | Por contrato | Por compatibilidade | Manual |
| Custo de Integração | Alto (inicial) | Médio | Baixo |
| Consistência | Alta | Média | Baixa |

---

## 6. Implementação de Referência

### 6.1 Estrutura de Diretórios

```
packages/orchestrator-core/
  src/
    nucleus/
      orchestrator.ts         # Orquestrador central
      contract-registry.ts    # Registro de contratos
      event-bus.ts            # Barramento interno
    intents/
      ambiguity-detector.ts
      intent-classifier.ts
      spec-generator.ts
    planning/
      task-decomposer.ts
      dependency-analyzer.ts
      risk-estimator.ts
    routing/
      complexity-router.ts
      agent-selector.ts
    execution/
      agent-runtime.ts
      robot-dispatcher.ts
    verification/
      test-orchestrator.ts
      policy-enforcer.ts
      validation-engine.ts
    governance/
      audit-trail.ts
      approval-flow.ts
      compliance-check.ts
    observability/
      telemetry-collector.ts
      metrics-aggregator.ts
```

### 6.2 Contrato Central

```typescript
interface NucleusContract<TInput, TOutput> {
  execute(input: TInput, context: ExecutionContext): Promise<TOutput>;
  validate(input: TInput): ValidationResult;
  getMetrics(): LayerMetrics;
  getStatus(): LayerStatus;
}
```

---

## 7. Integração com Packages Existentes da IDEIA

### 7.1 Integração com Agent Runtime

O `agent-runtime` é o executor de passos do pipeline. O Núcleo o envolve com contratos, auditoria e políticas antes de delegar execução:

```typescript
import { StepExecutor, ExecutionContext, StepResult } from '@ideia/agent-runtime';
import { NucleusContract, AuditTrail, PolicyEngine } from '@ideia/orchestrator-core';

export class NucleusAgentBridge {
  constructor(
    private readonly executor: StepExecutor,
    private readonly audit: AuditTrail,
    private readonly policy: PolicyEngine,
  ) {}

  async executeStep(
    step: string,
    context: ExecutionContext,
  ): Promise<StepResult> {
    const traceId = crypto.randomUUID();

    // 1. Policy check antes da execução
    const policyResult = this.policy.evaluate({
      action: 'agent.execute',
      resource: step,
      context: { traceId, userId: context.userId },
    });
    if (!policyResult.allowed) {
      await this.audit.record({
        traceId,
        action: 'agent.execute.denied',
        reason: policyResult.reason,
        timestamp: Date.now(),
      });
      return { status: 'denied', error: policyResult.reason };
    }

    // 2. Execução com timeout e auditoria
    const start = performance.now();
    try {
      const result = await this.executor.execute(step, context);
      const duration = performance.now() - start;

      await this.audit.record({
        traceId,
        action: 'agent.execute.completed',
        step,
        duration,
        result: result.status,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      await this.audit.record({
        traceId,
        action: 'agent.execute.failed',
        step,
        duration,
        error: (error as Error).message,
        timestamp: Date.now(),
      });
      throw error;
    }
  }
}

// Uso no pipeline
async function pipelineTask(userInput: string): Promise<void> {
  const bridge = new NucleusAgentBridge(
    new FileSystemStepExecutor(),
    new AuditTrail(new SQLiteStore()),
    new PolicyEngine(),
  );

  const context: ExecutionContext = {
    userId: 'user-1',
    taskId: crypto.randomUUID(),
    workspace: '/tmp/workspace',
  };

  const steps = ['analyze', 'design', 'implement', 'test'];
  for (const step of steps) {
    const result = await bridge.executeStep(step, context);
    if (result.status === 'denied' || result.status === 'failed') {
      break;
    }
  }
}
```

### 7.2 Integração com Event Bus (NATS JetStream)

O Núcleo usa o barramento de eventos como espinha dorsal para comunicação assíncrona entre camadas:

```typescript
import { IEventBus, Event, NatsJetStreamConnection } from '@ideia/event-bus';
import { NucleusContract, LayerMetrics } from '@ideia/orchestrator-core';

export class NucleusEventBridge {
  private readonly eventSource = 'nucleus-orchestrator';

  constructor(private readonly eventBus: IEventBus) {}

  async emitLayerEvent<T>(
    layer: string,
    action: string,
    payload: T,
    traceId: string,
  ): Promise<void> {
    const event: Event<T> = {
      id: crypto.randomUUID(),
      source: this.eventSource,
      type: `nucleus.${layer}.${action}`,
      version: '1.0.0',
      data: payload,
      metadata: {
        traceId,
        timestamp: Date.now(),
        layer,
      },
    };

    await this.eventBus.publish(`nucleus.${layer}`, event);

    // DLQ protection: se publicar para stream inexistente,
    // o NATS automaticamente roteia para DLQ configurado
  }

  async subscribeToLayer<T>(
    layer: string,
    handler: (event: Event<T>) => Promise<void>,
  ): Promise<void> {
    await this.eventBus.subscribe(
      `nucleus.${layer}`,
      async (event: Event<T>) => {
        try {
          await handler(event);
        } catch (error) {
          console.error(`[Nucleus] Error handling ${event.type}:`, error);
          // Re-lança para ativar retry policy do NATS
          throw error;
        }
      },
      { durable: true, maxRetries: 3 },
    );
  }

  // Exemplo: notificar camada de governança sobre decisão
  async notifyGovernance(
    decision: { layer: string; action: string; justification: string },
    traceId: string,
  ): Promise<void> {
    await this.emitLayerEvent('governance', 'decision.made', decision, traceId);
  }
}

// Configuração no bootstrap do Núcleo
async function bootstrapNucleus(): Promise<void> {
  const connection = new NatsJetStreamConnection({
    servers: ['nats://localhost:4222'],
    fallback: new InMemoryEventBus(), // fallback se NATS indisponível
  });
  await connection.connect();

  const bus = connection.getEventBus();
  const nucleus = new NucleusEventBridge(bus);

  // Registrar handlers de todas as camadas
  await nucleus.subscribeToLayer('intent', async (event) => {
    // Processar intenção classificada
  });
  await nucleus.subscribeToLayer('planning', async (event) => {
    // Processar plano gerado
  });
  await nucleus.subscribeToLayer('execution', async (event) => {
    // Processar resultado de execução
  });
}
```

### 7.3 Integração com LangGraph (Orquestração Multiagente)

O Núcleo delega fluxos complexos para o grafo LangGraph, mantendo contratos e observabilidade:

```typescript
import { StateGraph, AgentStep, AgentState } from '@ideia/langgraph';
import { NucleusContract, AuditTrail, TelemetryCollector } from '@ideia/orchestrator-core';

interface GraphExecutionRequest {
  intent: string;
  specification: Record<string, unknown>;
  traceId: string;
}

interface GraphExecutionResult {
  artifacts: string[];
  duration: number;
  steps: AgentStep[];
}

export class NucleusLangGraphBridge {
  constructor(
    private readonly graph: StateGraph,
    private readonly audit: AuditTrail,
    private readonly telemetry: TelemetryCollector,
  ) {}

  async executeGraph(request: GraphExecutionRequest): Promise<GraphExecutionResult> {
    const start = performance.now();
    const { intent, specification, traceId } = request;

    // 1. Preparar estado inicial do grafo
    const initialState: AgentState = {
      intent,
      specification,
      artifacts: [],
      decisions: [],
      errors: [],
      status: 'running',
      traceId,
    };

    // 2. Executar grafo com timeout global
    const timeout = 120_000; // 2 minutos
    const result = await Promise.race([
      this.graph.invoke(initialState),
      this.timeoutError(timeout),
    ]);

    const duration = performance.now() - start;

    // 3. Registrar no audit trail
    await this.audit.record({
      traceId,
      action: 'langgraph.execute',
      intent,
      duration,
      steps: result.steps.length,
      status: result.status,
      timestamp: Date.now(),
    });

    // 4. Coletar métricas de telemetria
    this.telemetry.record('langgraph.execution.duration', duration, {
      traceId,
      intent,
      status: result.status,
    });

    return {
      artifacts: result.artifacts,
      duration,
      steps: result.steps,
    };
  }

  private async timeoutError(ms: number): Promise<never> {
    await new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Graph timeout after ${ms}ms`)), ms),
    );
    throw new Error('Unreachable');
  }
}

// Exemplo: pipeline completo com LangGraph delegado
async function fullPipelineWithLangGraph(): Promise<void> {
  const graph = new StateGraph({
    nodes: ['analyst', 'architect', 'programmer', 'reviewer', 'tester'],
    edges: [
      { from: 'analyst', to: 'architect' },
      { from: 'architect', to: 'programmer' },
      { from: 'programmer', to: 'reviewer' },
      { from: 'reviewer', to: 'programmer', condition: 'needs-fix' },
      { from: 'programmer', to: 'tester' },
    ],
  });

  const bridge = new NucleusLangGraphBridge(
    graph,
    new AuditTrail(new SQLiteStore()),
    new TelemetryCollector(),
  );

  const result = await bridge.executeGraph({
    intent: 'Implement user authentication module',
    specification: {
      framework: 'Express',
      database: 'PostgreSQL',
      features: ['login', 'register', 'JWT refresh'],
    },
    traceId: crypto.randomUUID(),
  });

  console.log(`Graph executed in ${result.duration}ms, ${result.steps.length} steps`);
}
```

---

## 8. SPOF Mitigation — Estratégias contra Ponto Único de Falha

A centralização no Núcleo introduz risco de SPOF (Single Point of Failure). Esta seção documenta as estratégias de mitigação com implementação de referência.

### 8.1 Fallback Strategies

Cada camada do Núcleo possui um fallback chain que degrada graciosamente:

```typescript
type FallbackMode = 'failover' | 'cache' | 'degraded' | 'emergency';

interface FallbackStrategy<T> {
  primary: () => Promise<T>;
  fallbacks: Array<{
    name: string;
    execute: () => Promise<T>;
    mode: FallbackMode;
  }>;
}

export class FallbackExecutor {
  async executeWithFallback<T>(
    strategy: FallbackStrategy<T>,
    traceId: string,
  ): Promise<{ result: T; mode: FallbackMode; chain: string[] }> {
    const chain: string[] = [];

    // Tentativa primária
    try {
      const result = await strategy.primary();
      chain.push('primary');
      return { result, mode: 'failover', chain };
    } catch (primaryError) {
      chain.push(`primary:failed:${(primaryError as Error).message}`);
    }

    // Tentativas de fallback em ordem
    for (const fallback of strategy.fallbacks) {
      try {
        const result = await fallback.execute();
        chain.push(`${fallback.name}:${fallback.mode}`);
        return { result, mode: fallback.mode, chain };
      } catch (fallbackError) {
        chain.push(`${fallback.name}:failed:${(fallbackError as Error).message}`);
      }
    }

    throw new Error(`All fallbacks exhausted. Chain: ${chain.join(' -> ')}`);
  }
}

// Exemplo: fallback para LLM Provider
const llmStrategy: FallbackStrategy<string> = {
  primary: () => callOllama('gpt-4'),
  fallbacks: [
    {
      name: 'openai',
      execute: () => callOpenAI('gpt-4'),
      mode: 'failover',
    },
    {
      name: 'cache',
      execute: () => getCachedResponse(),
      mode: 'cache',
    },
    {
      name: 'rule-engine',
      execute: () => executeHeuristicRules(),
      mode: 'degraded',
    },
    {
      name: 'static-template',
      execute: () => Promise.resolve('Default safe response'),
      mode: 'emergency',
    },
  ],
};
```

### 8.2 Circuit Breaker Pattern

O Núcleo implementa circuit breaker por camada para evitar cascata de falhas:

```typescript
type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  name: string;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly monitor: TelemetryCollector;

  constructor(config: CircuitBreakerConfig, monitor: TelemetryCollector) {
    this.config = config;
    this.monitor = monitor;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.timeout) {
        this.state = 'half-open';
        this.monitor.record('circuit.state', 1, {
          name: this.config.name,
          state: 'half-open',
        });
      } else {
        this.monitor.record('circuit.rejected', 1, {
          name: this.config.name,
          state: 'open',
        });
        throw new Error(`Circuit breaker OPEN for ${this.config.name}`);
      }
    }

    try {
      const result = await fn();

      if (this.state === 'half-open') {
        this.successCount++;
        if (this.successCount >= this.config.successThreshold) {
          this.reset();
          this.monitor.record('circuit.state', 1, {
            name: this.config.name,
            state: 'closed',
          });
        }
      }

      this.failureCount = 0;
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      this.monitor.record('circuit.failure', 1, {
        name: this.config.name,
        failures: this.failureCount,
      });

      if (this.failureCount >= this.config.failureThreshold) {
        this.state = 'open';
        this.monitor.record('circuit.state', 1, {
          name: this.config.name,
          state: 'open',
        });
      }

      throw error;
    }
  }

  private reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Circuit breakers por camada
const layerCircuitBreakers: Record<string, CircuitBreaker> = {
  intent: new CircuitBreaker(
    { name: 'intent-layer', failureThreshold: 5, successThreshold: 2, timeout: 30_000 },
    new TelemetryCollector(),
  ),
  planning: new CircuitBreaker(
    { name: 'planning-layer', failureThreshold: 3, successThreshold: 2, timeout: 15_000 },
    new TelemetryCollector(),
  ),
  execution: new CircuitBreaker(
    { name: 'execution-layer', failureThreshold: 10, successThreshold: 3, timeout: 60_000 },
    new TelemetryCollector(),
  ),
  cognitive: new CircuitBreaker(
    { name: 'cognitive-layer', failureThreshold: 4, successThreshold: 2, timeout: 30_000 },
    new TelemetryCollector(),
  ),
};
```

### 8.3 Degradation Modes — 4 Níveis

O Núcleo opera em 4 modos de degradação que afetam quais camadas estão ativas:

```typescript
export enum DegradationLevel {
  Normal = 'normal',
  Degraded = 'degraded',
  Emergency = 'emergency',
  Maintenance = 'maintenance',
}

interface DegradationConfig {
  level: DegradationLevel;
  activeLayers: string[];
  fallbackOnly: boolean;
  telemetryInterval: number;
  maxRetries: number;
  approvalRequired: boolean;
}

const degradationConfigs: Record<DegradationLevel, DegradationConfig> = {
  [DegradationLevel.Normal]: {
    level: DegradationLevel.Normal,
    activeLayers: [
      'interface', 'intent', 'planning', 'cognitive',
      'heuristic', 'execution', 'verification', 'governance', 'observability',
    ],
    fallbackOnly: false,
    telemetryInterval: 5_000,
    maxRetries: 3,
    approvalRequired: false,
  },
  [DegradationLevel.Degraded]: {
    level: DegradationLevel.Degraded,
    activeLayers: [
      'interface', 'intent', 'heuristic', 'execution',
      'verification', 'governance', 'observability',
    ],
    fallbackOnly: false,
    telemetryInterval: 10_000,
    maxRetries: 2,
    approvalRequired: true,
  },
  [DegradationLevel.Emergency]: {
    level: DegradationLevel.Emergency,
    activeLayers: [
      'interface', 'heuristic', 'execution', 'observability',
    ],
    fallbackOnly: true,
    telemetryInterval: 30_000,
    maxRetries: 1,
    approvalRequired: true,
  },
  [DegradationLevel.Maintenance]: {
    level: DegradationLevel.Maintenance,
    activeLayers: ['interface', 'observability'],
    fallbackOnly: true,
    telemetryInterval: 60_000,
    maxRetries: 0,
    approvalRequired: true,
  },
};

export class DegradationManager {
  private currentLevel: DegradationLevel = DegradationLevel.Normal;
  private readonly healthCheckers: Map<string, () => Promise<boolean>>;
  private readonly monitor: TelemetryCollector;

  constructor(monitor: TelemetryCollector) {
    this.healthCheckers = new Map();
    this.monitor = monitor;
  }

  registerHealthCheck(layer: string, checker: () => Promise<boolean>): void {
    this.healthCheckers.set(layer, checker);
  }

  async evaluateDegradation(): Promise<DegradationLevel> {
    const failedLayers: string[] = [];

    for (const [layer, checker] of this.healthCheckers) {
      try {
        const healthy = await checker();
        if (!healthy) {
          failedLayers.push(layer);
        }
      } catch {
        failedLayers.push(layer);
      }
    }

    const previousLevel = this.currentLevel;

    if (failedLayers.length === 0) {
      this.currentLevel = DegradationLevel.Normal;
    } else if (failedLayers.length <= 2) {
      this.currentLevel = DegradationLevel.Degraded;
    } else if (failedLayers.length <= 5) {
      this.currentLevel = DegradationLevel.Emergency;
    } else {
      this.currentLevel = DegradationLevel.Maintenance;
    }

    if (previousLevel !== this.currentLevel) {
      this.monitor.record('degradation.level.changed', 1, {
        from: previousLevel,
        to: this.currentLevel,
        failedLayers: failedLayers.join(','),
      });
    }

    return this.currentLevel;
  }

  getConfig(): DegradationConfig {
    return degradationConfigs[this.currentLevel];
  }

  isLayerActive(layer: string): boolean {
    return this.getConfig().activeLayers.includes(layer);
  }
}
```

### 8.4 Health Check Aggregator

```typescript
interface HealthStatus {
  layer: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency: number;
  lastCheck: number;
  error?: string;
}

export class HealthCheckAggregator {
  private checkers: Map<string, () => Promise<HealthStatus>> = new Map();
  private results: Map<string, HealthStatus> = new Map();

  register(layer: string, checker: () => Promise<HealthStatus>): void {
    this.checkers.set(layer, checker);
  }

  async runAll(): Promise<HealthStatus[]> {
    const checks = Array.from(this.checkers.entries()).map(async ([layer, checker]) => {
      try {
        const status = await checker();
        this.results.set(layer, status);
        return status;
      } catch (error) {
        const failed: HealthStatus = {
          layer,
          status: 'unhealthy',
          latency: 0,
          lastCheck: Date.now(),
          error: (error as Error).message,
        };
        this.results.set(layer, failed);
        return failed;
      }
    });

    return Promise.all(checks);
  }

  getOverallStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Array.from(this.results.values());
    const unhealthy = statuses.filter(s => s.status === 'unhealthy').length;
    const degraded = statuses.filter(s => s.status === 'degraded').length;

    if (unhealthy === 0 && degraded === 0) return 'healthy';
    if (unhealthy >= statuses.length / 2) return 'unhealthy';
    return 'degraded';
  }
}
```

---

## 9. Métricas & Observabilidade

### 9.1 Monitoramento de Saúde do Núcleo

```typescript
interface NucleusMetrics {
  uptime: number;
  totalTasksProcessed: number;
  activeTasks: number;
  failedTasks: number;
  averageLatency: number;
  latencyPercentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  throughput: {
    tasksPerMinute: number;
    eventsPerMinute: number;
  };
  layerHealth: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency: number;
    errorRate: number;
  }>;
}

export class NucleusMonitor {
  private tasks: Array<{
    id: string;
    startTime: number;
    endTime?: number;
    status: 'running' | 'completed' | 'failed';
    layer: string;
  }> = [];

  private eventsProcessed = 0;
  private startTime = Date.now();
  private readonly telemetry: TelemetryCollector;

  constructor(telemetry: TelemetryCollector) {
    this.telemetry = telemetry;
  }

  startTask(taskId: string, layer: string): void {
    this.tasks.push({
      id: taskId,
      startTime: Date.now(),
      status: 'running',
      layer,
    });
  }

  completeTask(taskId: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.endTime = Date.now();
      task.status = 'completed';
    }
  }

  failTask(taskId: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.endTime = Date.now();
      task.status = 'failed';
    }
  }

  recordEvent(): void {
    this.eventsProcessed++;
  }

  getMetrics(): NucleusMetrics {
    const completed = this.tasks.filter(t => t.status === 'completed');
    const failed = this.tasks.filter(t => t.status === 'failed');
    const running = this.tasks.filter(t => t.status === 'running');
    const latencies = completed
      .map(t => (t.endTime! - t.startTime))
      .sort((a, b) => a - b);

    const uptime = Date.now() - this.startTime;
    const tasksPerMinute = completed.length / (uptime / 60_000);
    const eventsPerMinute = this.eventsProcessed / (uptime / 60_000);

    const sorted = [...latencies];
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p90 = sorted[Math.floor(sorted.length * 0.9)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

    // Métricas por camada
    const layerHealth: Record<string, {
      status: 'healthy' | 'degraded' | 'unhealthy';
      latency: number;
      errorRate: number;
    }> = {};

    const layers = [...new Set(this.tasks.map(t => t.layer))];
    for (const layer of layers) {
      const layerTasks = this.tasks.filter(t => t.layer === layer);
      const layerCompleted = layerTasks.filter(t => t.status === 'completed');
      const layerFailed = layerTasks.filter(t => t.status === 'failed');
      const layerLatencies = layerCompleted.map(t => t.endTime! - t.startTime);
      const avgLatency = layerLatencies.length > 0
        ? layerLatencies.reduce((a, b) => a + b, 0) / layerLatencies.length
        : 0;
      const errorRate = layerTasks.length > 0
        ? layerFailed.length / layerTasks.length
        : 0;

      layerHealth[layer] = {
        status: errorRate > 0.1 ? 'unhealthy' : errorRate > 0.05 ? 'degraded' : 'healthy',
        latency: avgLatency,
        errorRate,
      };
    }

    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    return {
      uptime,
      totalTasksProcessed: this.tasks.length,
      activeTasks: running.length,
      failedTasks: failed.length,
      averageLatency: avgLatency,
      latencyPercentiles: { p50, p90, p95, p99 },
      throughput: {
        tasksPerMinute: Math.round(tasksPerMinute * 100) / 100,
        eventsPerMinute: Math.round(eventsPerMinute * 100) / 100,
      },
      layerHealth,
    };
  }

  async reportToDashboard(): Promise<void> {
    const metrics = this.getMetrics();
    await this.telemetry.record('nucleus.metrics', 1, {
      uptime: metrics.uptime,
      totalTasks: metrics.totalTasksProcessed,
      activeTasks: metrics.activeTasks,
      failedTasks: metrics.failedTasks,
      p50: metrics.latencyPercentiles.p50,
      p95: metrics.latencyPercentiles.p95,
      throughput: metrics.throughput.tasksPerMinute,
    });
  }
}
```

### 9.2 Dashboard Widget (Theia)

```typescript
import { Widget } from '@theia/core/lib/browser';

export class NucleusHealthWidget extends Widget {
  static readonly ID = 'ideia:nucleus-health';
  static readonly LABEL = 'Nucleus Health';

  private metricsDisplay: HTMLDivElement;
  private updateInterval: ReturnType<typeof setInterval>;
  private monitor: NucleusMonitor;

  constructor(monitor: NucleusMonitor) {
    super();
    this.id = NucleusHealthWidget.ID;
    this.title.label = NucleusHealthWidget.LABEL;
    this.title.closable = true;
    this.monitor = monitor;
    this.metricsDisplay = document.createElement('div');
    this.metricsDisplay.style.padding = '16px';
    this.metricsDisplay.style.fontFamily = 'monospace';
    this.node.appendChild(this.metricsDisplay);
  }

  protected override onAfterAttach(): void {
    this.updateInterval = setInterval(() => this.refresh(), 10_000);
    this.refresh();
  }

  protected override onBeforeDetach(): void {
    clearInterval(this.updateInterval);
  }

  private refresh(): void {
    const metrics = this.monitor.getMetrics();

    this.metricsDisplay.innerHTML = `
      <h3>Nucleus Orchestrator Health</h3>
      <table style="width:100%; border-collapse: collapse;">
        <tr><td>Uptime</td><td>${this.formatUptime(metrics.uptime)}</td></tr>
        <tr><td>Tasks Processed</td><td>${metrics.totalTasksProcessed}</td></tr>
        <tr><td>Active Tasks</td><td>${metrics.activeTasks}</td></tr>
        <tr><td>Failed Tasks</td><td>${metrics.failedTasks}</td></tr>
        <tr><td>Avg Latency</td><td>${Math.round(metrics.averageLatency)}ms</td></tr>
        <tr><td>P50 / P95 / P99</td><td>
          ${metrics.latencyPercentiles.p50}ms /
          ${metrics.latencyPercentiles.p95}ms /
          ${metrics.latencyPercentiles.p99}ms
        </td></tr>
        <tr><td>Throughput</td><td>${metrics.throughput.tasksPerMinute} tasks/min</td></tr>
      </table>
      <h4>Layer Health</h4>
      <table style="width:100%; border-collapse: collapse;">
        ${Object.entries(metrics.layerHealth).map(([layer, health]) => `
          <tr>
            <td>${layer}</td>
            <td style="color: ${this.statusColor(health.status)}">${health.status}</td>
            <td>${Math.round(health.latency)}ms</td>
            <td>${(health.errorRate * 100).toFixed(1)}% errors</td>
          </tr>
        `).join('')}
      </table>
    `;
  }

  private statusColor(status: string): string {
    switch (status) {
      case 'healthy': return '#4caf50';
      case 'degraded': return '#ff9800';
      case 'unhealthy': return '#f44336';
      default: return '#fff';
    }
  }

  private formatUptime(ms: number): string {
    const hours = Math.floor(ms / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1_000);
    return `${hours}h ${minutes}m ${seconds}s`;
  }
}
```

### 9.3 Telemetry Pipeline

```typescript
interface TelemetryPoint {
  name: string;
  value: number;
  tags: Record<string, string | number>;
  timestamp: number;
}

export class TelemetryCollector {
  private buffer: TelemetryPoint[] = [];
  private readonly flushInterval: number;
  private readonly flushTimer: ReturnType<typeof setInterval>;
  private readonly exporters: Array<(points: TelemetryPoint[]) => Promise<void>>;

  constructor(
    flushInterval = 5_000,
    exporters?: Array<(points: TelemetryPoint[]) => Promise<void>>,
  ) {
    this.flushInterval = flushInterval;
    this.exporters = exporters || [this.defaultExporter];
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }

  record(
    name: string,
    value: number,
    tags: Record<string, string | number> = {},
  ): void {
    this.buffer.push({
      name,
      value,
      tags,
      timestamp: Date.now(),
    });

    if (this.buffer.length >= 100) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const points = [...this.buffer];
    this.buffer = [];

    for (const exporter of this.exporters) {
      try {
        await exporter(points);
      } catch (error) {
        console.error('[Telemetry] Export failed:', error);
      }
    }
  }

  private async defaultExporter(points: TelemetryPoint[]): Promise<void> {
    // Saída estruturada para logs
    for (const point of points) {
      console.log(JSON.stringify({
        type: 'telemetry',
        ...point,
      }));
    }
  }

  destroy(): void {
    clearInterval(this.flushTimer);
    this.flush();
  }
}
```

---

## 10. Architecture Decision Records

### ADR-001: System-of-Systems Architecture Pattern

| Campo | Valor |
|-------|-------|
| **ID** | ADR-001 |
| **Status** | Accepted |
| **Date** | 2026-07-20 |
| **Deciders** | Architecture Team |

**Context:** The IDEIA platform integrates multiple subsystems (agent runtime, event bus, LLM providers, policy engine, memory store) that historically operate independently. We need a coordination pattern that balances autonomy with governance.

**Decision:** Adopt the System-of-Systems (SoS) architectural pattern as defined by Maier (1998), where:
- Each subsystem maintains **operational independence** (can run standalone)
- Each subsystem has **managerial independence** (separate lifecycle)
- The **Nucleus orchestrator** provides the glue for emergent behavior, coordination, and governance
- Subsystems communicate exclusively via formal contracts through the Nucleus

**Rationale:**
- SoS is the only pattern that preserves subsystem autonomy while enabling the 9-layer governance model
- Alternative (monolithic) would eliminate independence, violating the project's modular design
- Alternative (peer-to-peer) would sacrifice observability and governance guarantees

**Consequences:**
- Positive: Emergent coordination, formal governance, clear upgrade paths
- Negative: Higher initial integration cost, single orchestration dependency (mitigated by SPOF section 8)
- Neutral: Teams must design to contract boundaries

---

### ADR-002: 9-Layer Internal Architecture

| Campo | Valor |
|-------|-------|
| **ID** | ADR-002 |
| **Status** | Accepted |
| **Date** | 2026-07-20 |
| **Deciders** | Architecture Team |

**Context:** The Nucleus needs internal structure to separate concerns. We evaluated 3-tier, 5-tier, and the proposed 9-layer model.

**Decision:** Adopt the 9-layer model (Interface, Intent, Planning, Cognitive, Heuristic, Execution, Verification, Governance, Observability) with the following rules:
- Layer N may only communicate with layers N-1, N, and N+1
- Cross-layer calls (e.g., Interface → Execution) must go through the orchestrator
- Each layer owns its contract, metrics, and health check

**Rationale:**
- 3-tier (presentation/business/data) is insufficient for cognitive systems
- 5-tier adds infrastructure but lacks governance and observability as first-class concerns
- 9-layer maps directly to the 7 dimensions of quality and enables independent scaling

**Consequences:**
- Positive: Clear separation, testability, independent deployment
- Negative: More boilerplate for cross-layer orchestration
- Mitigation: The orchestrator pattern simplifies cross-layer calls

---

### ADR-003: Four Core Principles of Orchestration

| Campo | Valor |
|-------|-------|
| **ID** | ADR-003 |
| **Status** | Accepted |
| **Date** | 2026-07-20 |
| **Deciders** | Architecture Team |

**Context:** The Nucleus requires governing principles that all subsystems must respect. Without explicit principles, subsystems drift toward ad-hoc integration.

**Decision:** Enforce four immutable principles:

1. **P1 — Formal Contracts:** Every layer-to-layer interaction must use a typed contract (TypeScript interface with Zod validation)
2. **P2 — Single Source of Truth:** Global state lives in the event store + state store; no layer caches authoritative state independently
3. **P3 — Hierarchical Decision:** Cross-layer decisions must escalate to the orchestrator; no layer may unilaterally decide on behalf of another
4. **P4 — Mandatory Observability:** Every decision must produce a telemetry point and audit trail entry

**Rationale:**
- These four principles cover the essential failure modes of distributed cognitive systems
- P1 prevents contract drift (observed in 60%+ of microservice failures per Newman, 2015)
- P2 prevents state inconsistency (the most common source of bugs in multi-agent systems)
- P3 prevents decision conflicts (the central challenge in SoS coordination per Maier, 1998)
- P4 enables debugging, compliance, and continuous improvement

**Consequences:**
- Positive: Predictable system behavior, auditability, substitutability
- Negative: Enforcement overhead, requires discipline in code reviews
- Tooling: Contract registry (`contract-registry.ts`) and pre-commit hooks enforce P1-P4

---

### ADR-004: Degradation Levels as First-Class Citizens

| Campo | Valor |
|-------|-------|
| **ID** | ADR-004 |
| **Status** | Accepted |
| **Date** | 2026-07-21 |
| **Deciders** | Architecture Team |

**Context:** Centralized orchestration creates a SPOF risk. Failures in the cognitive layer (LLM provider) or execution layer should not take down the entire system.

**Decision:** Implement 4 degradation levels (Normal, Degraded, Emergency, Maintenance) as first-class system states with automatic detection and escalation:

- Each layer registers a health check
- The `DegradationManager` evaluates health every 30s or on demand
- Degradation triggers automatic circuit breaking for affected layers
- Users see a status indicator with the current degradation level

**Rationale:**
- Graceful degradation is preferred to total outage
- The 4 levels map to real operational scenarios observed during development
- Automatic detection removes human latency from incident response

**Consequences:**
- Positive: System remains partially operational during failures
- Negative: Increased complexity in testing all degradation paths
- Mitigation: Integration tests at each degradation level (section 7.2)

---

## 11. Implementation Roadmap

### Phase 1 — Core Orchestrator (Estimated: 4 weeks / 120h)

| Week | Tasks | Effort | Dependencies |
|------|-------|--------|-------------|
| W1 | `Orchestrator` class, `ContractRegistry`, base contracts for 9 layers | 30h | None |
| W2 | Layer stubs (Interface, Intent, Planning, Cognitive, Heuristic) | 30h | W1 |
| W3 | Layer stubs (Execution, Verification, Governance, Observability) | 30h | W2 |
| W4 | Full pipeline integration test, `NucleusContract` validation | 30h | W3 |

**Deliverable:** End-to-end task flow through all 9 layers with mock implementations.

### Phase 2 — SPOF & Resilience (Estimated: 3 weeks / 90h)

| Week | Tasks | Effort | Dependencies |
|------|-------|--------|-------------|
| W5 | `CircuitBreaker` per layer, `FallbackExecutor` chains | 30h | Phase 1 |
| W6 | `DegradationManager` with 4 levels, health check registry | 30h | W5 |
| W7 | Chaos testing (layer failures, network partitions, timeouts) | 30h | W6 |

**Deliverable:** System survives any single layer failure without total outage.

### Phase 3 — Observability Platform (Estimated: 3 weeks / 90h)

| Week | Tasks | Effort | Dependencies |
|------|-------|--------|-------------|
| W8 | `TelemetryCollector`, `NucleusMonitor`, latency percentiles | 30h | Phase 2 |
| W9 | `NucleusHealthWidget` (Theia), metric export (Prometheus) | 30h | W8 |
| W10 | Dashboard integration, SLO monitoring, alert thresholds | 30h | W9 |

**Deliverable:** Real-time observability of all 9 layers with latency percentiles and health dashboard.

### Phase 4 — Production Hardening (Estimated: 3 weeks / 90h)

| Week | Tasks | Effort | Dependencies |
|------|-------|--------|-------------|
| W11 | Performance benchmarking (k6), bundle optimization | 30h | Phase 3 |
| W12 | Cross-layer integration tests, contract compatibility suite | 30h | W11 |
| W13 | Documentation, ADR review, production deployment guide | 30h | W12 |

**Deliverable:** Production-ready Nucleus with documentation, benchmarks, and deployment scripts.

### Total Effort: 13 weeks / 390h

```typescript
interface RoadmapPhase {
  name: string;
  weeks: number;
  effortHours: number;
  deliverables: string[];
  risks: string[];
}

const nucleusRoadmap: RoadmapPhase[] = [
  {
    name: 'Core Orchestrator',
    weeks: 4,
    effortHours: 120,
    deliverables: [
      'Orchestrator class with 9-layer routing',
      'ContractRegistry with Zod validation',
      'End-to-end pipeline with mock layers',
    ],
    risks: [
      'Contract design may need iteration with subsystem teams',
      'Layer coupling may require refactoring existing packages',
    ],
  },
  {
    name: 'SPOF & Resilience',
    weeks: 3,
    effortHours: 90,
    deliverables: [
      'Circuit breaker per layer (configurable thresholds)',
      'Degradation manager with auto-escalation',
      'Chaos test suite (7 scenarios)',
    ],
    risks: [
      'Testing degradation paths requires all mock services',
      'False positives in health checks may cause unnecessary degradation',
    ],
  },
  {
    name: 'Observability Platform',
    weeks: 3,
    effortHours: 90,
    deliverables: [
      'Telemetry pipeline with buffered export',
      'NucleusHealthWidget (Theia plugin)',
      'Prometheus metric endpoint',
    ],
    risks: [
      'Metric cardinality may impact NATS JetStream performance',
      'Dashboard latency may misrepresent real-time health',
    ],
  },
  {
    name: 'Production Hardening',
    weeks: 3,
    effortHours: 90,
    deliverables: [
      'Performance baseline (k6 scenarios)',
      'Contract compatibility test suite',
      'Production deployment guide',
    ],
    risks: [
      'Edge cases in cross-layer error propagation',
      'Memory leaks in long-running telemetry collectors',
    ],
  },
];
```

---

## 12. Risk Assessment — Centralização no Núcleo

| ID | Risco | Probabilidade | Impacto | Nível | Mitigação |
|----|-------|--------------|---------|-------|-----------|
| R01 | **SPOF do Orchestrator**: Núcleo central falha, todo sistema para | Média | Crítico | 🔴 Alto | Circuit breaker por camada (Seção 8.2), fallback chains (Seção 8.1), health monitoring (Seção 9.1) |
| R02 | **Gargalo de Throughput**: Núcleo não escala com volume de tarefas | Média | Alto | 🟠 Médio | Throughput tracking (Seção 9.1), métricas de tasks/min, escalabilidade horizontal planejada na Fase 1 |
| R03 | **Latência de Roteamento**: Cada camada adiciona latência ao pipeline | Alta | Médio | 🟠 Médio | Degradation modes desativam camadas não essenciais (Seção 8.3), health dashboard monitora p50/p95/p99 |
| R04 | **Dívida de Contratos**: Contratos evoluem sem atualização do registry | Alta | Alto | 🔴 Alto | ContractRegistry com validação Zod, pre-commit hook, CI check obrigatório |
| R05 | **Vazamento de Memória**: TelemetryCollector acumula métricas sem flush | Baixa | Alto | 🟡 Baixo | Buffer de 100 pontos com auto-flush, intervalo de 5s, limite de memória configurável |
| R06 | **Dependência de LLM**: Camada cognitiva falha se LLM provider cai | Média | Crítico | 🔴 Alto | Fallback chain (Ollama → OpenAI → cache → regras → template estático), circuit breaker 4 falhas |
| R07 | **Integração com NATS**: Barramento de eventos falha ou satura | Baixa | Alto | 🟡 Baixo | Fallback in-memory automático, DLQ configurado, retry com backoff exponencial |
| R08 | **Custo de Adoção**: Times externos rejeitam amarração ao Núcleo | Alta | Médio | 🟠 Médio | Subsistemas mantêm independência operacional (ADR-001), contratos abertos, SDK público |
| R09 | **Testabilidade**: 4 níveis de degradação × 9 camadas = 36 combinações | Alta | Médio | 🟠 Médio | Testes parametrizados por degradation level, matriz de cobertura CI |
| R10 | **Observabilidade Overhead**: Coleta de métricas impacta performance | Média | Baixo | 🟡 Baixo | Telemetry buffer com flush controlado, sampling configurável para alta vazão |

### Risk Response Plan

```typescript
interface RiskResponse {
  riskId: string;
  strategy: 'avoid' | 'mitigate' | 'transfer' | 'accept';
  action: string;
  owner: string;
  deadline: string;
}

const riskResponses: RiskResponse[] = [
  {
    riskId: 'R01',
    strategy: 'mitigate',
    action: 'Implement circuit breaker + health check aggregator before production release',
    owner: 'Infrastructure Team',
    deadline: 'End of Phase 2',
  },
  {
    riskId: 'R02',
    strategy: 'mitigate',
    action: 'Establish throughput baseline (k6) in Phase 4; alert if tasks/min drops below 100',
    owner: 'Performance Team',
    deadline: 'End of Phase 1 (baseline)',
  },
  {
    riskId: 'R03',
    strategy: 'mitigate',
    action: 'Route latency budget: <50ms total across all 9 layers; alert at 100ms',
    owner: 'Architecture Team',
    deadline: 'End of Phase 3',
  },
  {
    riskId: 'R04',
    strategy: 'avoid',
    action: 'Pre-commit hook: `npm run ai:contract-check` must pass before any commit',
    owner: 'DevOps Team',
    deadline: 'Start of Phase 1',
  },
  {
    riskId: 'R06',
    strategy: 'mitigate',
    action: 'Test LLM fallback chain weekly in CI; verify every fallback works',
    owner: 'AI Team',
    deadline: 'End of Phase 2',
  },
  {
    riskId: 'R08',
    strategy: 'accept',
    action: 'Document SoS benefits in onboarding; provide quick-start with independent subsystems',
    owner: 'Product Team',
    deadline: 'End of Phase 4',
  },
];
```

---

## 13. Referências Científicas

1. **Maier, M. (1998).** "Architecting Principles for Systems-of-Systems." *Systems Engineering*, 1(4):267-284.
2. **ISO/IEC/IEEE 42010 (2011).** *Systems and software engineering — Architecture description.*
3. **Gamma, E. et al. (1994).** *Design Patterns: Elements of Reusable Object-Oriented Software.* Addison-Wesley.
4. **Buschmann, F. et al. (1996).** *Pattern-Oriented Software Architecture, Volume 1: A System of Patterns.* Wiley.
5. **Vernon, V. (2013).** *Implementing Domain-Driven Design.* Addison-Wesley.
6. **Evans, E. (2003).** *Domain-Driven Design: Tackling Complexity in the Heart of Software.* Addison-Wesley.
7. **Newman, S. (2015).** *Building Microservices.* O'Reilly.
8. **Nygard, M. (2018).** *Release It! Design and Deploy Production-Ready Software.* 2nd ed. Pragmatic Bookshelf. — Fundamentos de circuit breakers, bulkheads, e graceful degradation aplicados na Seção 8.
9. **Fowler, M. (2004).** "Circuit Breaker." *martinfowler.com*. — Padrão de resiliência implementado no `CircuitBreaker` (Seção 8.2).
10. **Kleppmann, M. (2017).** *Designing Data-Intensive Applications.* O'Reilly. — Conceitos de single source of truth, event sourcing, e telemetria aplicados nas Seções 2.2 e 9.
11. **Hohpe, G. & Woolf, B. (2003).** *Enterprise Integration Patterns.* Addison-Wesley. — Padrões de barramento de eventos e roteamento usados na Seção 7.2.
12. **Bass, L., Clements, P. & Kazman, R. (2012).** *Software Architecture in Practice.* 3rd ed. Addison-Wesley. — Fundamentos de quality attributes e architecture evaluation.

---

## 14. Conclusão e Agenda

### Hipóteses
- H1: Núcleo unificado reduz conflitos entre subsistemas em 80%+ comparado a agentes independentes
- H2: Contratos formais permitem substituição de subsistemas em <2 dias de engenharia
- H3: Observabilidade integral reduz tempo de diagnóstico de falhas em 60%+
- H4: Degradação graciosa em 4 níveis mantém 50%+ da funcionalidade durante falhas de camada crítica
- H5: Circuit breakers por camada impedem cascata de falhas em cenários multi-falha

### Próximos Passos
1. Implementar `Orchestrator` como coordenador central (Fase 1 — 4 semanas)
2. Criar `ContractRegistry` para todas as camadas
3. Integrar subsistemas existentes (agent-runtime, memory-store, policy-engine)
4. Implementar circuit breaker e fallback chains (Fase 2 — 3 semanas)
5. Construir dashboard de observabilidade (Fase 3 — 3 semanas)
6. Validar com tarefa end-to-end: "criar módulo CRUD completo"
7. Executar chaos testing com 7 cenários de falha
8. Medir métricas de coordenação, consistência e degradação
