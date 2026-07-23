# Estudo: Roteamento Inteligente de Agentes — Complexidade, Estratégias e Implementação

> **Propósito:** Arquitetura completa de roteamento de agentes na IDEIA, cobrindo estratégias de routing, balanceamento de carga, fallback, descoberta de capacidades e escalabilidade.
> **Data:** 2026-07-22
> **Versão:** 1.0

| Versao | Data | Autor | Descricao |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versao completa com arquitetura, estrategias e roadmap |

---

## Sumário

1. [Introdução e Fundamentos](#1-introdução-e-fundamentos)
2. [Modelos de Roteamento](#2-modelos-de-roteamento)
3. [Arquitetura do Agent Router](#3-arquitetura-do-agent-router)
4. [Capability Registry](#4-capability-registry)
5. [Embedding-Based Matching](#5-embedding-based-matching)
6. [LLM Judge](#6-llm-judge)
7. [Load Balancing & Concurrency](#7-load-balancing--concurrency)
8. [Fallback Strategies](#8-fallback-strategies)
9. [Observabilidade](#9-observabilidade)
10. [Implementação na IDEIA](#10-implementação-na-ideia)
11. [Código Fonte Completo](#11-código-fonte-completo)
12. [Implementation Roadmap](#12-implementation-roadmap)
13. [Conexões com Estudos Existentes](#13-conexões-com-estudos-existentes)

---

## 1. Introdução e Fundamentos

### 1.1 O Problema do Roteamento de Agentes

A IDEIA opera um ecossistema com 121+ packages compiláveis, 153 comandos CLI, 77 serviços mapeados no ServiceCatalog e uma camada de agentes composta por 7 papéis distintos (analyst, architect, programmer, reviewer, tester, devops, supervisor). Cada agente possui capacidades específicas, diferentes níveis de confiança por domínio e requisitos de ferramentas variados.

O problema central do roteamento de agentes pode ser expresso pela equação de complexidade:

```
Complexidade = O(n) agentes × O(m) ferramentas × O(k) contextos × O(p) níveis de autonomia
```

Onde:
- **n**: número de agentes disponíveis (cresce com novos papéis e especializações)
- **m**: número de ferramentas que cada agente pode invocar (cresce com o ecossistema)
- **k**: variações de contexto (projeto, histórico, ambiente, preferências do usuário)
- **p**: níveis de autonomia (N0 a N5, cada um com pipeline diferente)

**Cenário típico:** Um request chega com o intento "implementar autenticação JWT no módulo de usuários". O router precisa decidir:

1. Qual agente deve lidar com isso? O architect para planejar? O programmer para codificar? Ambos?
2. Em que nível de complexidade? (N2 = tarefa simples com 2 agentes, ou N4 = multiagente paralelo?)
3. Qual o orçamento de tokens? (4K para N2, 15K para N4)
4. Precisa de aprovação humana? (N5 exige approval, N2 não)

A decisão errada pode resultar em:
- **Sub-roteamento**: agente sem ferramentas necessárias → falha ou retrabalho
- **Super-roteamento**: usar LLM caro para tarefa trivial → desperdício de tokens e latência
- **Deadlock**: agentes esperando uns pelos outros sem coordenação
- **Loop infinito**: re-roteamento sem critério de parada

### 1.2 Taxonomia de Roteamento

O roteamento de agentes pode ser classificado em três eixos ortogonais:

#### 1.2.1 Estático vs. Dinâmico

| Característica | Roteamento Estático | Roteamento Dinâmico |
|---------------|-------------------|-------------------|
| Definição | Hardcoded (ex: "todo request SQL vai para o DBAgent") | Descoberta em tempo real (ex: "agentes com capability 'database' disponíveis") |
| Tabela de rotas | Fixa, definida em config | Mutável, atualizada por heartbeats |
| Resiliência | Baixa (falha de um agente quebra a rota) | Alta (descoberta contorna falhas) |
| Performance | ~0ms overhead | ~5-50ms overhead (descoberta) |
| Exemplo IDEIA | `RouteSelector` com pipelines fixos N0-N5 | `CapabilityRegistryService` com busca dinâmica |

#### 1.2.2 Síncrono vs. Assíncrono

| Característica | Roteamento Síncrono | Roteamento Assíncrono |
|---------------|--------------------|---------------------|
| Bloqueante | Sim (request espera) | Não (request entra em fila) |
| Latência percebida | Imediata | Dependente da fila |
| Complexidade | Baixa | Média (requer fila, callback/polling) |
| Ideal para | Tarefas rápidas (< 1s) | Tarefas longas (> 5s) |
| Gestão de backpressure | Limitada | Robusta (fila + DLQ) |

O `AgentRouter` atual na IDEIA opera predominantemente de forma síncrona, mas a integração com NATS JetStream (Fase 1) permitirá roteamento assíncrono via filas.

#### 1.2.3 Centralizado vs. Descentralizado

| Característica | Centralizado | Descentralizado |
|---------------|-------------|----------------|
| Ponto único de decisão | Sim (Router Core) | Não (cada agente decide) |
| Consistência | Alta (visão global) | Eventual (visão local) |
| Single point of failure | Sim | Não |
| Exemplo | HAProxy, Kong | Gossip protocol, Swarm |
| Ideal para | Até ~100 agentes | Centenas+ agentes |

A IDEIA adota um modelo **centralizado com fallback descentralizado**: o `AgentRouter` é o entry point padrão, mas agentes podem rotear entre si via protocolo ponto-a-ponto em cenários de degradação.

### 1.3 Por que a IDEIA Precisa Disso

**1.3.1 121+ Packages, Múltiplos Agentes**

O ecossistema IDEIA já possui agentes especializados:
- `agent-runtime` — 7 nós (analyst, architect, programmer, reviewer, tester, devops, supervisor) com LangGraph
- `agent-router` — ComplexityClassifier + RouteSelector + ConsensusEngine + FusionEngine
- `agent-identity` — identidade e autenticação de agentes
- `agent-benchmark` — benchmarking de performance de agentes
- `browser-agent` — agente de navegação web

Cada um com capacidades, ferramentas e domínios distintos. Sem roteamento inteligente, a decisão de qual agente usar é manual ou baseada em regras fixas.

**1.3.2 Theia AI Agents**

O plugin Theia da IDEIA expõe 10 widgets e 10 serviços backend. Os Theia AI Agents precisam rotear tools entre si. Por exemplo:
- Chat widget → roteia para o `analyst` agent
- Diff widget → roteia para o `reviewer` agent
- Dashboard widget → agrega dados de múltiplos agentes

O `ProviderRouter` já existente em `packages/ideia-plugin/src/browser/` faz roteamento entre providers de LLM (Ollama, OpenAI, DeepSeek). O Agent Router estende este conceito para todos os agentes.

**1.3.3 Níveis de Autonomia (N0-N5)**

O sistema de autonomia configurável define 6 níveis:

| Nível | Descrição | Agentes | Aprovação |
|-------|-----------|---------|-----------|
| N0 | Resposta direta | Nenhum | Não |
| N1 | Execução simples | programmer | Não |
| N2 | Execução com análise | analyst + programmer | Não |
| N3 | Execução com testes | analyst + architect + programmer + tester | Não |
| N4 | Execução paralela | + reviewer | Não |
| N5 | Execução completa | + devops + supervisor | Sim (humana) |

Cada nível exige um pipeline de roteamento diferente: número de agentes, paralelismo, orçamento de tokens, estágios.

**1.3.4 O Custo do Roteamento Ineficiente**

Dados reais da IDEIA:

| Cenário | Roteamento Ótimo | Sub-roteamento | Custo do Erro |
|---------|-----------------|----------------|---------------|
| Query simples (SELECT) | N0 (500 tokens) | N3 (8000 tokens) | 16x mais tokens |
| Refatoração crítica | N4 (15000 tokens) | N1 (2000 tokens) | Retrabalho, perda de contexto |
| Deploy em produção | N5 (25000 tokens) | N2 (4000 tokens) | Risco de falha em produção |

O `ComplexityClassifier` atual calcula um score de 0-140 baseado em 8 critérios (fileCount, riskLevel, estimatedSteps, requiresHistoricalContext, environmentSensitivity, dependencies, hasExternalAPI, hasDatabase, hasUI) para determinar o nível ótimo.

---

## 2. Modelos de Roteamento

### 2.1 Roteamento Baseado em Regras

O modelo mais simples: decisões baseadas em condições if/else sobre metadados do request.

**Mecanismo:**

```
SE intent contém "database" → rotear para DBAgent
SE domínio = "frontend" → rotear para FEAgent
SE nível = "N0" → resposta direta
SE risco = "critical" → forçar N5 com aprovação
```

**Implementação atual na IDEIA — `complexity-classifier.ts`:**

O `ComplexityClassifier` usa regras ponderadas para classificar a tarefa:

```typescript
classify(criteria: ComplexityCriteria): ClassificationResult {
  let score = 0;
  if (criteria.fileCount >= 20) score += 40;
  if (criteria.riskLevel === 'critical') score += 40;
  if (criteria.estimatedSteps >= 15) score += 30;
  // ... mais regras

  if (score >= 90) level = 'N5';
  else if (score >= 70) level = 'N4';
  else if (score >= 50) level = 'N3';
  else if (score >= 30) level = 'N2';
  else if (score >= 10) level = 'N1';
  else level = 'N0';

  return { level, reasons, confidence, estimatedTokens };
}
```

**Prós:**
- Simples e previsível
- Auditável (cada decisão tem razão documentada)
- Latência < 1ms
- Fácil de debugar

**Contras:**
- Não escala (cada novo agente exige novas regras)
- Não aprende com o tempo
- Match exato, sem semântica
- Thresholds arbitrários (score 90 para N5)

### 2.2 Roteamento Baseado em Capacidades

Cada agente publica suas capacidades (tools, domains, confidence) em um registry central. O router consulta o registry para fazer match com o request.

**Modelo de dados — `capability.ts`:**

```typescript
interface Capability {
  id: string;
  name: string;
  description: string;
  category: 'agent' | 'tool' | 'context-pack' | 'adapter';
  version: string;
  status: 'active' | 'deprecated' | 'experimental' | 'draft';
  inputs: CapabilityInput[];
  outputs: CapabilityOutput[];
  tags: string[];
  metadata: {
    embedding?: number[];
    maturity?: number;
    package?: string;
  };
}
```

**Mecanismo de match — `SemanticCapabilityMatcher`:**

```typescript
async match(request: MatchRequest): Promise<CapabilityMatch[]> {
  const candidates = await this.registry.list({
    category: request.category,
    tags: request.tags,
    status: 'active'
  });

  for (const cap of candidates) {
    let score = 0;
    score += textSimilarity(request.text, cap.name + ' ' + cap.description) * 0.40;
    score += tagMatchScore(request.tags, cap.tags) * 0.25;
    score += typeMatchScore(request.inputTypes, cap.inputs) * 0.20;
    score += versionCheck(cap.version, request.versionMin) * 0.15;
    scored.push({ capability: cap, score, matchReasons });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}
```

**Prós:**
- Descoberta dinâmica (agentes novos são encontrados automaticamente)
- Match multi-dimensional (texto + tags + tipos + versão)
- Resiliente a falhas (registry pode ter fallback)

**Contras:**
- Latência ~5ms (consulta ao registry)
- Depende da qualidade dos metadados publicados
- Match puramente lexical (textSimilarity usa Jaccard)

### 2.3 Roteamento Baseado em Embeddings

Request convertido em embedding via modelo de texto (text-embedding-3-small, all-MiniLM-L6-v2). Similaridade de cosseno com embeddings das capacidades dos agentes.

**Pipeline:**

```
Request → "implementar autenticação JWT"
    ↓
Texto limpo (stop words removidas, normalizado)
    ↓
Modelo de embedding → vector [1536 dimensions]
    ↓
Cosine similarity com vectors das capabilities
    ↓
Top-K agentes com score > threshold
```

**Vantagens sobre match lexical:**
- Matching semântico: "JWT" ≈ "token-based auth" mesmo sem overlap lexical
- Generalização: entende paráfrases e sinônimos
- Ideal para linguagem natural (intenção do usuário)

**Desvantagens:**
- Latência ~50ms (geraçãode embedding + busca)
- Custo operacional (chamada ao modelo de embedding)
- Dependência de modelo externo ou local

### 2.4 Roteamento Baseado em LLM Judge

Usa um LLM (modelo mais caro) como árbitro final. Recebe o request + lista de candidatos + contexto e decide o melhor agente.

**Quando usar:**
- Cenários ambíguos onde os modelos anteriores divergem
- Tarefas de alta prioridade (priority > 5)
- Casos complexos com múltiplos match próximos

**Custo:**
- Latência: ~500ms-2s
- Tokens: 500-2000 por decisão
- Monetário: ~$0.001-0.01 por decisão (GPT-4)

### 2.5 Roteamento Híbrido (Cascata)

O modelo recomendado para a IDEIA: uma cascata de estratégias, onde cada estágio filtra e refina, e só o necessário chega ao estágio mais caro.

```
┌────────────────────────────────────────────────────────────────┐
│                      ROUTER PIPELINE                          │
│                                                                │
│  Request                                                     │
│    │                                                          │
│    ▼                                                          │
│  ┌──────────┐                                                 │
│  │  Rule    │──→ 1 match? ──→ RoutingDecision (rule)          │
│  │  Filter  │                                                 │
│  └────┬─────┘                                                 │
│       │ múltiplos candidatos                                   │
│       ▼                                                        │
│  ┌──────────────┐                                             │
│  │  Capability  │──→ confidence > 0.9? ──→ RoutingDecision   │
│  │  Match       │     (capability)                            │
│  └──────┬───────┘                                             │
│         │ < 0.9                                                │
│         ▼                                                      │
│  ┌────────────────┐                                           │
│  │  Embedding     │──→ confidence > 0.85? ──→ RoutingDecision │
│  │  Similarity    │     (embedding)                           │
│  └───────┬────────┘                                           │
│          │ < 0.85                                              │
│          ▼                                                     │
│  ┌──────────────┐   priority > 5?                             │
│  │  LLM Judge   │──→ sim ──→ RoutingDecision (llm)           │
│  └──────┬───────┘   não                                       │
│         ▼                                                     │
│  ┌──────────────┐                                             │
│  │  Fallback    │──→ RoundRobin ou DefaultAgent               │
│  │  (round-robin)│                                             │
│  └──────────────┘                                             │
└────────────────────────────────────────────────────────────────┘
```

**Implementação conceitual do pipeline:**

```typescript
async route(request: RoutingRequest): Promise<RoutingDecision> {
  const start = Date.now();

  const candidates = await this.ruleFilter(request);
  if (candidates.length === 1) {
    return this.buildDecision(candidates[0], 'rule', start);
  }

  const capMatch = await this.capabilityMatch(request, candidates);
  if (capMatch && capMatch.confidence > 0.9) {
    return this.buildDecision(capMatch.agentId, 'capability', start);
  }

  const embMatch = await this.embeddingMatch(request, candidates);
  if (embMatch && embMatch.confidence > 0.85) {
    return this.buildDecision(embMatch.agentId, 'embedding', start);
  }

  if (request.priority > 5) {
    const llmDecision = await this.llmJudge(request, candidates);
    if (llmDecision) {
      return this.buildDecision(llmDecision.agentId, 'llm', start);
    }
  }

  return this.fallbackRoute(candidates, start);
}
```

### 2.6 Tabela Comparativa

| Estratégia | Precisão | Latência | Escalabilidade | Complexidade | Custo por Decisão |
|-----------|----------|----------|----------------|--------------|-------------------|
| Regras | Baixa (~60%) | < 1ms | Alta (O(1)) | Baixa | ~0 |
| Capacidades | Média (~75%) | < 5ms | Alta (O(log n)) | Média | ~0 |
| Embeddings | Alta (~85%) | ~50ms | Média (O(n)) | Alta | ~$0.0001 |
| Híbrida (Cascata) | Muito Alta (~92%) | ~50-100ms | Média | Muito Alta | ~$0.0001-0.001 |
| LLM Judge | Máxima (~97%) | ~500ms-2s | Baixa (O(1) caro) | Extrema | ~$0.001-0.01 |

**Recomendação para IDEIA:** Híbrida como default, com LLM Judge apenas para requests de prioridade > 5.

---

## 3. Arquitetura do Agent Router

### 3.1 Componentes

O Agent Router da IDEIA é composto por 6 módulos principais:

```
┌──────────────────────────────────────────────────────────────┐
│                    AGENT ROUTER                               │
│                                                              │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  Router Core  │──│ Capability     │──│ Embedding        │  │
│  │  (pipeline)   │  │ Registry       │  │ Matcher          │  │
│  └──────┬───────┘  └────────────────┘  └──────────────────┘  │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  LLM Judge   │──│ Load Balancer  │──│ Fallback Manager  │  │
│  │  (decisão)   │  │ (concurrency)  │  │ (escalation)      │  │
│  └──────────────┘  └────────────────┘  └──────────────────┘  │
│                                                              │
│  ┌──────────────┐                                             │
│  │  Metrics     │  (Prometheus + OpenTelemetry)                │
│  │  Collector   │                                             │
│  └──────────────┘                                             │
└──────────────────────────────────────────────────────────────┘
```

#### 3.1.1 Router Core

O orquestrador principal. Recebe o `RoutingRequest`, executa o pipeline de roteamento em estágios e retorna um `RoutingDecision`.

Responsabilidades:
- Coordenar a execução dos estágios (rule → capability → embedding → llm → fallback)
- Coletar métricas de latência por estágio
- Aplicar timeouts (default 120s)
- Registrar decisões no audit trail

#### 3.1.2 Capability Registry

Catálogo central de todos os agentes e suas capacidades. Baseado no `CapabilityRegistryService` existente em `packages/capability-registry/`.

Responsabilidades:
- CRUD de capabilities (register, update, deprecate, remove)
- Cache com TTL de 60s
- Indexação textual para search
- Emissão de eventos no barramento (NATS)

#### 3.1.3 Embedding Matcher

Motor de similaridade semântica. Converte o request em embedding e compara com as capabilities.

Responsabilidades:
- Geração de embeddings (via API ou modelo local)
- Indexação vetorial (FAISS ou HNSW)
- Busca por similaridade (cosine, dot product)
- Threshold tuning (default 0.85)

#### 3.1.4 LLM Judge

Decisor final para casos complexos. Usa LLM externo para decidir o melhor agente.

Responsabilidades:
- Prompt engineering para decisão estruturada
- JSON mode para output padronizado
- Retry + fallback (se LLM falhar)
- Rate limiting (evitar custos excessivos)

#### 3.1.5 Load Balancer

Gerencia concorrência entre agentes.

Responsabilidades:
- Distribuição de requests (round-robin, least-connections, weighted)
- Rate limiting por agente
- Circuit breaker (agentes com falha)
- Queue management (backlog)

#### 3.1.6 Fallback Manager

Estratégias quando nenhum match é encontrado ou quando há falha.

Responsabilidades:
- No-match fallback (default agent, suggest new agent)
- Timeout fallback (degradação de autonomia)
- Error fallback (retry, circuit breaker, human intervention)
- Degradation fallback (reduzir nível N)

#### 3.1.7 Metrics Collector

Observabilidade de todas as decisões de roteamento.

Responsabilidades:
- Métricas Prometheus (decision count, latency, confidence, strategy distribution)
- Distributed tracing (OpenTelemetry)
- Decision audit log (SHA-256 chain)
- Health check endpoints

### 3.2 Data Flow Diagram

```
RoutingRequest
│
│ {
│   intent: "implementar autenticação JWT no módulo users",
│   context: { project: "api-gateway", language: "typescript" },
│   requiredTools: ["file-write", "npm-install"],
│   priority: 7
│ }
│
▼
┌─────────────────┐
│  1. VALIDATE    │ ← Zod schema validation (ZOD)
│  RoutingRequest │
└────────┬────────┘
         │ valid
         ▼
┌─────────────────┐
│  2. CLASSIFY    │ ← ComplexityClassifier (N0-N5)
│  complexity     │
└────────┬────────┘
         │ level: N3 (score: 62)
         ▼
┌─────────────────┐
│  3. FILTER      │ ← Rule-based: risk=medium, env=staging → N3 ok
│  rules          │
└────────┬────────┘
         │ candidates: [analyst, architect, programmer, tester]
         ▼
┌─────────────────┐
│  4. CAPABILITY  │ ← SemanticCapabilityMatcher
│  MATCH          │
└────────┬────────┘
         │ best: programmer (confidence: 0.88) < 0.9 threshold
         ▼
┌─────────────────┐
│  5. EMBEDDING   │ ← Similarity search
│  MATCH          │
└────────┬────────┘
         │ best: architect (confidence: 0.91) > 0.85 → DECISION
         ▼
RoutingDecision
│
│ {
│   agentId: "architect-01",
│   confidence: 0.91,
│   strategy: "embedding",
│   latency: 47,
│   pipeline: { level: "N3", requiredAgents: [...], ... }
│ }
│
▼
┌─────────────────┐
│  6. EXECUTE     │ ← AgentRuntime executa o pipeline
│  pipeline N3    │
└─────────────────┘
```

### 3.3 Interfaces TypeScript

```typescript
// === Core Types ===

export type RoutingStrategy = 'rule' | 'capability' | 'embedding' | 'llm' | 'fallback';

export interface AgentDescriptor {
  id: string;
  name: string;
  role: AgentRole;
  domain: string[];
  tools: ToolDescriptor[];
  confidence: Record<string, number>;
  maxConcurrency: number;
  currentLoad: number;
  status: 'active' | 'degraded' | 'circuit-open' | 'offline';
}

export interface ToolDescriptor {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  costPerCall: number;
}

export interface RoutingRequest {
  id: string;
  intent: string;
  context: Record<string, unknown>;
  requiredTools?: string[];
  priority: number;
  maxLatency?: number;
  autonomyLevel?: ComplexityLevel;
}

export interface RoutingDecision {
  id: string;
  requestId: string;
  agentId: string;
  confidence: number;
  strategy: RoutingStrategy;
  pipeline: RoutePipeline;
  latency: number;
  timestamp: string;
  stages: StageResult[];
}

interface StageResult {
  strategy: RoutingStrategy;
  latency: number;
  candidates: string[];
  decision: string | null;
}

// === Load Balancer Types ===

export type BalancingStrategy = 'round-robin' | 'least-connections' | 'weighted';

export interface BalancerConfig {
  strategy: BalancingStrategy;
  weights: Record<string, number>;
  maxQueueSize: number;
  rateLimitPerAgent: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetTimeout: number;
}

// === Fallback Types ===

export type FallbackStrategy = 'default-agent' | 'degrade-level' | 'human-intervention' | 'suggest-new' | 'retry';

export interface FallbackConfig {
  noMatchAction: FallbackStrategy;
  timeoutAction: FallbackStrategy;
  errorAction: FallbackStrategy;
  maxRetries: number;
  escalationDelay: number;
  defaultAgentId: string;
}

// === Metrics Types ===

export interface RouterMetrics {
  totalDecisions: number;
  strategyDistribution: Record<RoutingStrategy, number>;
  avgLatencyByStrategy: Record<RoutingStrategy, number>;
  confidenceAvg: number;
  fallbackRate: number;
  circuitBreakerTrips: number;
}
```

### 3.4 Router Pipeline Implementation

```typescript
import { v4 as uuidv4 } from 'uuid';
import { EventBus } from '@ideia/event-bus';
import { CapabilityRegistryService } from '@ideia/capability-registry';
import { Logger } from '@ideia/shared';

export class AgentRouter {
  private readonly logger = new Logger('AgentRouter');

  constructor(
    private readonly capabilityRegistry: CapabilityRegistryService,
    private readonly embeddingMatcher: EmbeddingMatcher,
    private readonly llmJudge: LLMJudge,
    private readonly loadBalancer: LoadBalancer,
    private readonly fallbackManager: FallbackManager,
    private readonly metrics: MetricsCollector,
    private readonly eventBus: EventBus,
    private readonly config: RouterConfig,
  ) {}

  async route(request: RoutingRequest): Promise<RoutingDecision> {
    const start = Date.now();
    const stages: StageResult[] = [];
    const requestId = request.id || uuidv4();

    this.logger.info(`Routing request ${requestId}: "${request.intent.substring(0, 80)}..."`);

    // Stage 1: Rule-based filter
    const stage1Start = Date.now();
    const candidates = await this.ruleFilter(request);
    stages.push({
      strategy: 'rule',
      latency: Date.now() - stage1Start,
      candidates: candidates.map(a => a.id),
      decision: candidates.length === 1 ? candidates[0].id : null,
    });

    if (candidates.length === 1) {
      return this.finalize(requestId, request, candidates[0], 'rule', stages, start);
    }

    // Stage 2: Capability match
    const stage2Start = Date.now();
    const capMatches = await this.capabilityMatch(request, candidates);
    stages.push({
      strategy: 'capability',
      latency: Date.now() - stage2Start,
      candidates: capMatches.map(m => m.agentId),
      decision: capMatches.length > 0 && capMatches[0].confidence > 0.9 ? capMatches[0].agentId : null,
    });

    if (capMatches.length > 0 && capMatches[0].confidence > 0.9) {
      const agent = candidates.find(a => a.id === capMatches[0].agentId);
      if (agent) return this.finalize(requestId, request, agent, 'capability', stages, start);
    }

    // Stage 3: Embedding similarity
    const stage3Start = Date.now();
    const embMatches = await this.embeddingMatcher.match(request, candidates);
    stages.push({
      strategy: 'embedding',
      latency: Date.now() - stage3Start,
      candidates: embMatches.map(m => m.agentId),
      decision: embMatches.length > 0 && embMatches[0].confidence > 0.85 ? embMatches[0].agentId : null,
    });

    if (embMatches.length > 0 && embMatches[0].confidence > 0.85) {
      const agent = candidates.find(a => a.id === embMatches[0].agentId);
      if (agent) return this.finalize(requestId, request, agent, 'embedding', stages, start);
    }

    // Stage 4: LLM Judge (apenas para prioridade alta)
    if (request.priority >= this.config.llmJudgeMinPriority) {
      const stage4Start = Date.now();
      const llmDecision = await this.llmJudge.decide(request, candidates);
      stages.push({
        strategy: 'llm',
        latency: Date.now() - stage4Start,
        candidates: candidates.map(a => a.id),
        decision: llmDecision?.agentId ?? null,
      });

      if (llmDecision) {
        const agent = candidates.find(a => a.id === llmDecision.agentId);
        if (agent) return this.finalize(requestId, request, agent, 'llm', stages, start);
      }
    }

    // Fallback: round-robin
    const fallbackAgent = await this.fallbackManager.resolve(request, candidates);
    return this.finalize(requestId, request, fallbackAgent, 'fallback', stages, start);
  }

  private async ruleFilter(request: RoutingRequest): Promise<AgentDescriptor[]> {
    const allAgents = await this.capabilityRegistry.getAgents();
    return allAgents.filter(agent => {
      if (agent.status === 'offline' || agent.status === 'circuit-open') return false;
      if (agent.currentLoad >= agent.maxConcurrency) return false;
      if (request.requiredTools?.length) {
        const agentTools = new Set(agent.tools.map(t => t.id));
        return request.requiredTools.every(t => agentTools.has(t));
      }
      return true;
    });
  }

  private async capabilityMatch(
    request: RoutingRequest,
    candidates: AgentDescriptor[],
  ): Promise<Array<{ agentId: string; confidence: number }>> {
    const results: Array<{ agentId: string; confidence: number }> = [];
    for (const agent of candidates) {
      let maxConfidence = 0;
      for (const [domain, conf] of Object.entries(agent.confidence)) {
        const similarity = this.textSimilarity(request.intent, domain);
        const score = similarity * conf;
        if (score > maxConfidence) maxConfidence = score;
      }
      if (maxConfidence > 0) {
        results.push({ agentId: agent.id, confidence: maxConfidence });
      }
    }
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  private async finalize(
    requestId: string,
    request: RoutingRequest,
    agent: AgentDescriptor,
    strategy: RoutingStrategy,
    stages: StageResult[],
    start: number,
  ): Promise<RoutingDecision> {
    const decision: RoutingDecision = {
      id: uuidv4(),
      requestId,
      agentId: agent.id,
      confidence: stages[stages.length - 1].decision === agent.id
        ? 1.0 : stages.find(s => s.decision === agent.id) ? 0.9 : 0.7,
      strategy,
      pipeline: this.buildPipeline(request, agent),
      latency: Date.now() - start,
      timestamp: new Date().toISOString(),
      stages,
    };

    this.metrics.recordDecision(decision);
    await this.emitDecisionEvent(decision);

    return decision;
  }

  private buildPipeline(request: RoutingRequest, agent: AgentDescriptor): RoutePipeline {
    const level = request.autonomyLevel ?? this.classifyPriority(request.priority);
    return getPipelineForLevel(level);
  }

  private classifyPriority(priority: number): ComplexityLevel {
    if (priority >= 9) return 'N5';
    if (priority >= 7) return 'N4';
    if (priority >= 5) return 'N3';
    if (priority >= 3) return 'N2';
    if (priority >= 1) return 'N1';
    return 'N0';
  }

  private textSimilarity(a: string, b: string): number {
    const aWords = new Set(a.toLowerCase().split(/\W+/));
    const bWords = new Set(b.toLowerCase().split(/\W+/));
    let intersection = 0;
    for (const w of aWords) if (bWords.has(w)) intersection++;
    const union = aWords.size + bWords.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  private async emitDecisionEvent(decision: RoutingDecision): Promise<void> {
    await this.eventBus.publish('router.decision', {
      type: 'routing-decision',
      decision,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 4. Capability Registry

### 4.1 Data Model

O `CapabilityRegistryService` já implementado em `packages/capability-registry/` usa o seguinte modelo de dados:

```typescript
interface Capability {
  id: string;
  name: string;
  description: string;
  category: CapabilityCategory;   // 'agent' | 'tool' | 'context-pack' | 'adapter' | 'registry' | ...
  subcategory: string;
  version: string;
  status: CapabilityStatus;       // 'active' | 'deprecated' | 'experimental' | 'draft'
  createdAt: string;
  updatedAt: string;
  dependsOn: CapabilityDependency[];
  inputs: CapabilityInput[];
  outputs: CapabilityOutput[];
  examples: CapabilityExample[];
  tags: string[];
  metadata: {
    author?: string;
    package?: string;
    sourceFile?: string;
    since?: string;
    maturity?: number;            // 0-100
    tags: string[];
    keywords: string[];
    links: Record<string, string>;
    embedding?: number[];         // para similarity search
  };
}
```

### 4.2 Agent Registration/Deregistration

O registro de agentes segue o padrão:

```typescript
class CapabilityRegistryService {
  private store: Map<string, Capability> = new Map();
  private cache: Map<string, { cap: Capability; ts: number }> = new Map();
  private listeners: Array<(event: RegistryEvent) => void> = [];

  async register(cap: Capability): Promise<RegistryEvent> {
    const existing = this.store.get(cap.id);
    if (existing) return this.update(cap.id, cap);
    this.store.set(cap.id, {
      ...cap,
      createdAt: cap.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const event: RegistryEvent = {
      type: 'registered',
      capability: cap,
      timestamp: new Date().toISOString(),
    };
    this.emit(event);
    return event;
  }

  async remove(id: string): Promise<void> {
    this.store.delete(id);
    this.cache.delete(id);
    this.emit({
      type: 'removed',
      capability: { id } as Capability,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Para roteamento de agentes, estendemos com:**

```typescript
interface AgentRegistration {
  agent: AgentDescriptor;
  capabilities: string[];  // IDs de capabilities
  healthCheckEndpoint?: string;
  heartbeatInterval: number;  // ms
}

// Auto-registro via evento NATS
await eventBus.subscribe('agent.heartbeat', async (msg) => {
  const { agentId, status, load } = msg.data;
  const agent = await registry.getAgent(agentId);
  if (agent) {
    agent.currentLoad = load;
    agent.status = status === 'healthy' ? 'active' : 'degraded';
    await registry.updateAgent(agentId, agent);
    cache.set(agentId, agent, 30_000);
  } else {
    logger.warn(`Heartbeat from unknown agent: ${agentId}`);
  }
});
```

### 4.3 Health Checks & Heartbeat

Cada agente envia heartbeats periódicos para o registry:

```
Agent ─── heartbeat { agentId, status, load, timestamp } every 30s
        │
        ▼
Registry ─── atualiza status
        │
        ▼
Se 3 heartbeats perdidos → status = 'offline'
Se 5 heartbeats perdidos → status = 'circuit-open'
```

```typescript
class HealthCheckMonitor {
  private missedHeartbeats: Map<string, number> = new Map();
  private readonly MAX_MISSED = 3;

  constructor(private registry: ICapabilityRegistry) {
    setInterval(() => this.check(), 30_000);
  }

  private async check(): Promise<void> {
    const agents = await this.registry.getAgents();
    for (const agent of agents) {
      if (agent.status === 'offline') continue;
      const missed = (this.missedHeartbeats.get(agent.id) || 0) + 1;
      this.missedHeartbeats.set(agent.id, missed);
      if (missed >= this.MAX_MISSED) {
        await this.registry.updateAgentStatus(agent.id, 'offline');
        logger.warn(`Agent ${agent.id} marked offline after ${missed} missed heartbeats`);
      }
    }
  }

  recordHeartbeat(agentId: string): void {
    this.missedHeartbeats.set(agentId, 0);
  }
}
```

### 4.4 Versioning of Capabilities

Capabilities seguem versionamento semântico (MAJOR.MINOR.PATCH):

- **MAJOR**: mudança incompatível na interface do agente
- **MINOR**: nova capability adicionada
- **PATCH**: correção ou melhoria sem mudança de interface

```typescript
interface VersionConstraint {
  minVersion: string;
  maxVersion?: string;
  compatibleVersions?: string[];
}

async matchWithVersion(
  request: MatchRequest,
  versionConstraint?: VersionConstraint,
): Promise<CapabilityMatch[]> {
  const matches = await this.match(request);
  if (!versionConstraint) return matches;

  return matches.filter(m => {
    const capVersion = m.capability.version;
    if (versionConstraint.minVersion) {
      if (!this.gte(capVersion, versionConstraint.minVersion)) return false;
    }
    if (versionConstraint.maxVersion) {
      if (!this.lte(capVersion, versionConstraint.maxVersion)) return false;
    }
    return true;
  });
}

private gte(v1: string, v2: string): boolean {
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a !== b) return a > b;
  }
  return true;
}

private lte(v1: string, v2: string): boolean {
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a !== b) return a < b;
  }
  return true;
}
```

### 4.5 Code Example: CapabilityRegistry com CRUD + Event Bus

```typescript
import { EventBus, IEventBus } from '@ideia/event-bus';
import { z } from 'zod';
import { Logger } from '@ideia/shared';

const CapabilitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(['agent', 'tool', 'context-pack', 'adapter', 'registry', 'workflow',
    'observation', 'memory', 'pipeline', 'integration']),
  subcategory: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  status: z.enum(['active', 'deprecated', 'experimental', 'draft']),
  tags: z.array(z.string()),
  metadata: z.object({
    embedding: z.array(z.number()).optional(),
    maturity: z.number().min(0).max(100).optional(),
    package: z.string().optional(),
    tags: z.array(z.string()),
    keywords: z.array(z.string()),
    links: z.record(z.string()),
  }),
});

export class CapabilityRegistry {
  private logger = new Logger('CapabilityRegistry');
  private store = new Map<string, Capability>();
  private cache = new Map<string, { value: Capability; expires: number }>();
  private readonly CACHE_TTL = 60_000;

  constructor(private eventBus: IEventBus) {
    this.eventBus.subscribe('capability.*', async (msg) => {
      this.logger.info(`Event received: ${msg.subject}`);
      const event = msg.data as RegistryEvent;
      if (event.type === 'removed') {
        this.store.delete(event.capability.id);
      } else {
        this.store.set(event.capability.id, event.capability);
      }
      this.cache.delete(event.capability.id);
    });
  }

  async register(input: unknown): Promise<RegistryEvent> {
    const cap = CapabilitySchema.parse(input);
    const existing = this.store.get(cap.id);
    if (existing) return this.update(cap.id, cap);

    cap.createdAt = cap.createdAt || new Date().toISOString();
    cap.updatedAt = new Date().toISOString();
    this.store.set(cap.id, cap);

    const event: RegistryEvent = {
      type: 'registered',
      capability: cap,
      timestamp: new Date().toISOString(),
    };

    await this.eventBus.publish('capability.registered', event);
    return event;
  }

  async update(id: string, partial: Partial<Capability>): Promise<RegistryEvent> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Capability ${id} not found`);

    const validated = CapabilitySchema.partial().parse(partial);
    const updated: Capability = { ...existing, ...validated, updatedAt: new Date().toISOString() };
    this.store.set(id, updated);
    this.cache.delete(id);

    const event: RegistryEvent = {
      type: 'updated',
      capability: updated,
      timestamp: updated.updatedAt,
    };

    await this.eventBus.publish('capability.updated', event);
    return event;
  }

  async deprecate(id: string): Promise<RegistryEvent> {
    return this.update(id, { status: 'deprecated' });
  }

  async remove(id: string): Promise<void> {
    this.store.delete(id);
    this.cache.delete(id);
    await this.eventBus.publish('capability.removed', {
      type: 'removed',
      capability: { id } as Capability,
      timestamp: new Date().toISOString(),
    });
  }

  async get(id: string): Promise<Capability | null> {
    const cached = this.cache.get(id);
    if (cached && Date.now() < cached.expires) return cached.value;

    const cap = this.store.get(id) || null;
    if (cap) this.cache.set(id, { value: cap, expires: Date.now() + this.CACHE_TTL });
    return cap;
  }

  async list(query?: CapabilityQuery): Promise<Capability[]> {
    let caps = Array.from(this.store.values());
    if (query) {
      if (query.category) caps = caps.filter(c => c.category === query.category);
      if (query.subcategory) caps = caps.filter(c => c.subcategory === query.subcategory);
      if (query.status) caps = caps.filter(c => c.status === query.status);
      if (query.tags?.length) caps = caps.filter(c =>
        query.tags.some(t => c.tags.includes(t)),
      );
    }
    return caps;
  }

  async search(text: string, limit = 20): Promise<Capability[]> {
    const q = text.toLowerCase();
    return Array.from(this.store.values())
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q)),
      )
      .slice(0, limit);
  }
}
```

---

## 5. Embedding-Based Matching

### 5.1 Embedding Generation

A geração de embeddings pode ser feita via:
1. **API externa**: OpenAI text-embedding-3-small (1536 dimensões, $0.02/1M tokens)
2. **Modelo local**: all-MiniLM-L6-v2 via Transformers.js (384 dimensões, gratuito)
3. **Modelo local**: BGE-small-en-v1.5 via Ollama (384 dimensões, gratuito)

```typescript
interface EmbeddingProvider {
  generate(text: string): Promise<number[]>;
  dimensions: number;
  modelName: string;
}

class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions = 1536;
  readonly modelName = 'text-embedding-3-small';

  async generate(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: this.modelName,
      }),
    });

    const data = await response.json();
    return data.data[0].embedding;
  }
}

class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions = 384;
  readonly modelName = 'all-MiniLM-L6-v2';

  async generate(text: string): Promise<number[]> {
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'all-minilm',
        prompt: text,
      }),
    });

    const data = await response.json();
    return data.embedding;
  }
}
```

### 5.2 Similarity Search

**Cosine Similarity:**

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vectors must have same dimensions');

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

**FAISS Integration (via wasm):**

```typescript
interface FaissIndex {
  add(vectors: number[][]): void;
  search(query: number[], k: number): Promise<Array<{ index: number; score: number }>>;
  save(): Uint8Array;
  load(data: Uint8Array): void;
}

class FaissEmbeddingIndex {
  private index: FaissIndex | null = null;
  private idMap: Map<number, string> = new Map();  // index position → agent/capability id
  private reverseMap: Map<string, number> = new Map();

  async initialize(dimensions: number): Promise<void> {
    // Inicializa índice FAISS (via @tensorflow/tfjs ou faiss-node)
    this.index = await createFaissIndex(dimensions, 'IP');  // Inner Product
  }

  async addItem(id: string, vector: number[]): Promise<void> {
    const position = this.idMap.size;
    this.idMap.set(position, id);
    this.reverseMap.set(id, position);
    this.index!.add([vector]);
  }

  async search(queryVector: number[], k = 5): Promise<Array<{ id: string; score: number }>> {
    const results = await this.index!.search(queryVector, k);
    return results
      .filter(r => r.score > 0)
      .map(r => ({
        id: this.idMap.get(r.index) ?? 'unknown',
        score: r.score,
      }));
  }

  async removeItem(id: string): Promise<void> {
    // FAISS não suporta remoção direta; rebuild
    const position = this.reverseMap.get(id);
    if (position === undefined) return;
    this.idMap.delete(position);
    this.reverseMap.delete(id);
  }
}
```

### 5.3 Threshold Tuning

O threshold de confiança para considerar um match válido deve ser calibrado:

```typescript
interface ThresholdConfig {
  capabilityMatch: number;    // 0.9
  embeddingMatch: number;     // 0.85
  llmMinConfidence: number;   // 0.7
  fallbackThreshold: number;  // 0.0
}

class ThresholdTuner {
  private decisionHistory: Array<{
    strategy: RoutingStrategy;
    confidence: number;
    success: boolean;
  }> = [];

  recordDecision(decision: RoutingDecision, success: boolean): void {
    this.decisionHistory.push({
      strategy: decision.strategy,
      confidence: decision.confidence,
      success,
    });

    // Ajustar thresholds a cada 1000 decisões
    if (this.decisionHistory.length % 1000 === 0) {
      this.tune();
    }
  }

  private tune(): void {
    for (const strategy of ['capability', 'embedding'] as RoutingStrategy[]) {
      const decisions = this.decisionHistory.filter(d => d.strategy === strategy);
      if (decisions.length < 100) continue;

      // Encontrar threshold que maximiza F1
      const thresholds = Array.from({ length: 20 }, (_, i) => (i + 1) * 0.05);
      let bestF1 = 0;
      let bestThreshold = 0;

      for (const t of thresholds) {
        const tp = decisions.filter(d => d.confidence >= t && d.success).length;
        const fp = decisions.filter(d => d.confidence >= t && !d.success).length;
        const fn = decisions.filter(d => d.confidence < t && d.success).length;
        const precision = tp / (tp + fp) || 0;
        const recall = tp / (tp + fn) || 0;
        const f1 = 2 * (precision * recall) / (precision + recall) || 0;

        if (f1 > bestF1) {
          bestF1 = f1;
          bestThreshold = t;
        }
      }

      logger.info(`Tuned ${strategy} threshold to ${bestThreshold} (F1: ${bestF1.toFixed(3)})`);
    }
  }
}
```

### 5.4 Code Example: EmbeddingMatcher with FAISS/HNSW

```typescript
export class EmbeddingMatcher {
  private index: FaissEmbeddingIndex;
  private provider: EmbeddingProvider;

  constructor(
    private registry: CapabilityRegistryService,
    provider?: EmbeddingProvider,
  ) {
    this.provider = provider ?? new LocalEmbeddingProvider();
    this.index = new FaissEmbeddingIndex();
  }

  async initialize(): Promise<void> {
    await this.index.initialize(this.provider.dimensions);
    const capabilities = await this.registry.list({ status: 'active' });

    for (const cap of capabilities) {
      if (cap.metadata.embedding) {
        await this.index.addItem(cap.id, cap.metadata.embedding);
      } else {
        const embedding = await this.provider.generate(
          `${cap.name} ${cap.description} ${cap.tags.join(' ')}`,
        );
        await this.index.addItem(cap.id, embedding);
        await this.registry.update(cap.id, {
          metadata: { ...cap.metadata, embedding },
        });
      }
    }

    logger.info(`Embedding index initialized with ${capabilities.length} capabilities`);
  }

  async match(
    request: RoutingRequest,
    candidates: AgentDescriptor[],
    threshold = 0.85,
  ): Promise<Array<{ agentId: string; confidence: number }>> {
    const queryEmbedding = await this.provider.generate(
      `${request.intent} ${Object.values(request.context).join(' ')}`,
    );

    const searchResults = await this.index.search(queryEmbedding, candidates.length * 2);

    // Mapear capability IDs para agentes
    const capabilityToAgent = new Map<string, string>();
    for (const agent of candidates) {
      for (const capId of agent.capabilities ?? []) {
        capabilityToAgent.set(capId, agent.id);
      }
    }

    // Agrupar scores por agente
    const agentScores = new Map<string, number[]>();
    for (const result of searchResults) {
      const agentId = capabilityToAgent.get(result.id);
      if (agentId) {
        const scores = agentScores.get(agentId) ?? [];
        scores.push(result.score);
        agentScores.set(agentId, scores);
      }
    }

    return Array.from(agentScores.entries())
      .map(([agentId, scores]) => ({
        agentId,
        confidence: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .filter(m => m.confidence >= threshold)
      .sort((a, b) => b.confidence - a.confidence);
  }

  async updateAgentEmbedding(agentId: string, text: string): Promise<void> {
    const embedding = await this.provider.generate(text);
    await this.index.addItem(agentId, embedding);
  }
}
```

---

## 6. LLM Judge

### 6.1 Quando Usar o LLM Judge

O LLM Judge é o recurso mais caro do pipeline de roteamento e deve ser usado criteriosamente:

| Cenário | Usar LLM Judge? | Motivo |
|---------|-----------------|--------|
| Prioridade baixa (1-3) | Não | Fallback round-robin é suficiente |
| Prioridade média (4-6) | Não | Embedding match resolve |
| Prioridade alta (7-8) | Sim | Precisão justifica custo |
| Prioridade crítica (9-10) | Sim | Decisão errada pode causar dano |
| Embedding ambíguo (0.7-0.85) | Sim | Conflito entre duas opções próximas |
| Nenhum match | Não | Fallback, não LLM |

### 6.2 Prompt Template for Routing Decision

```typescript
const ROUTING_DECISION_PROMPT = `Você é um roteador de agentes de IA. Sua tarefa é escolher o melhor agente para executar uma requisição.

## Request
Intento: {intent}
Contexto: {context}
Ferramentas necessárias: {requiredTools}
Prioridade: {priority}

## Agentes Disponíveis
{agents}

## Regras
1. Escolha o agente cujas capacidades mais se alinham com o intento
2. Considere a confiança do agente no domínio relevante
3. Prefira agente especializado a agente generalista
4. Se nenhum agente é adequado, responda com "agentId": "none"
5. Responda APENAS com JSON válido no formato especificado

## Formato de Resposta
{
  "agentId": "string",
  "confidence": number (0.0-1.0),
  "reasoning": "string",
  "alternativeAgents": ["string"]
}`;
```

### 6.3 Structured Output (JSON Mode)

```typescript
interface LLMJudgeResult {
  agentId: string;
  confidence: number;
  reasoning: string;
  alternativeAgents: string[];
}

class LLMJudge {
  private readonly DECISION_SCHEMA = {
    type: 'object',
    properties: {
      agentId: { type: 'string' },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      reasoning: { type: 'string' },
      alternativeAgents: { type: 'array', items: { type: 'string' } },
    },
    required: ['agentId', 'confidence', 'reasoning'],
  };

  constructor(
    private llmProvider: LLMProvider,
    private config: { model: string; maxTokens: number; temperature: number },
    private eventBus: IEventBus,
  ) {}

  async decide(
    request: RoutingRequest,
    candidates: AgentDescriptor[],
  ): Promise<LLMJudgeResult | null> {
    const start = Date.now();

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const prompt = this.buildPrompt(request, candidates);
        const response = await this.llmProvider.complete({
          model: this.config.model,
          messages: [{ role: 'user', content: prompt }],
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature,
          responseFormat: { type: 'json_object' },
        });

        const result = JSON.parse(response.content) as LLMJudgeResult;

        if (!result.agentId || result.confidence === undefined) {
          throw new Error('Invalid LLM response structure');
        }

        const latency = Date.now() - start;

        await this.eventBus.publish('router.llm-judge', {
          type: 'llm-judge-decision',
          requestId: request.id,
          latency,
          agentId: result.agentId,
          confidence: result.confidence,
          cost: this.estimateCost(response),
        });

        logger.info(`LLM Judge decided: ${result.agentId} (${(result.confidence * 100).toFixed(1)}%) in ${latency}ms`);

        return result;

      } catch (error) {
        logger.warn(`LLM Judge attempt ${attempt + 1} failed: ${error}`);
        if (attempt < 2) {
          await sleep(1000 * (attempt + 1));  // backoff
        }
      }
    }

    logger.error('LLM Judge failed after 3 attempts');
    return null;
  }

  private buildPrompt(request: RoutingRequest, candidates: AgentDescriptor[]): string {
    const agentsStr = candidates.map((a, i) =>
      `[${i + 1}] ID: ${a.id}\n  Role: ${a.role}\n  Domains: ${a.domain.join(', ')}\n  Confiança: ${JSON.stringify(a.confidence)}\n  Load: ${a.currentLoad}/${a.maxConcurrency}`,
    ).join('\n\n');

    return ROUTING_DECISION_PROMPT
      .replace('{intent}', request.intent)
      .replace('{context}', JSON.stringify(request.context))
      .replace('{requiredTools}', (request.requiredTools ?? []).join(', '))
      .replace('{priority}', String(request.priority))
      .replace('{agents}', agentsStr);
  }

  private estimateCost(response: LLMResponse): number {
    const inputTokens = response.usage?.promptTokens ?? 0;
    const outputTokens = response.usage?.completionTokens ?? 0;
    const inputCost = (inputTokens / 1_000_000) * 2.50;   // GPT-4o: $2.50/1M input
    const outputCost = (outputTokens / 1_000_000) * 10.00; // GPT-4o: $10.00/1M output
    return inputCost + outputCost;
  }
}
```

### 6.4 Cost vs. Accuracy Tradeoffs

| Modelo | Custo Input (1M tokens) | Custo Output (1M tokens) | Latência Média | Precisão |
|--------|----------------------|-----------------------|----------------|----------|
| GPT-4o | $2.50 | $10.00 | ~500ms | 97% |
| GPT-4o-mini | $0.15 | $0.60 | ~200ms | 93% |
| Claude 3.5 Sonnet | $3.00 | $15.00 | ~600ms | 96% |
| DeepSeek V3 | $0.27 | $1.10 | ~300ms | 91% |
| Ollama (local) | $0.00 | $0.00 | ~2s | 85% |

**Estratégia de custo para IDEIA:**
- 95% das decisões: Híbrida (rule + capability + embedding) → custo ~$0.0001
- 4% das decisões: LLM Judge com GPT-4o-mini → custo ~$0.001
- 1% das decisões: LLM Judge com GPT-4o → custo ~$0.005
- **Custo médio por decisão: ~$0.00015**

### 6.5 Code Example: LLM Judge com Retry + Fallback

```typescript
import { LLMProvider, ProviderRouter } from '@ideia/llm-provider';
import { Logger } from '@ideia/shared';

interface LLMJudgeConfig {
  primaryModel: string;
  fallbackModel: string;
  maxRetries: number;
  timeout: number;
  costLimit: number;  // $ por decisão
}

export class LLMJudgeWithFallback {
  private logger = new Logger('LLMJudge');

  constructor(
    private providerRouter: ProviderRouter,
    private config: LLMJudgeConfig,
    private metrics: MetricsCollector,
  ) {}

  async decide(
    request: RoutingRequest,
    candidates: AgentDescriptor[],
  ): Promise<LLMJudgeResult | null> {
    const models = [this.config.primaryModel, this.config.fallbackModel];

    for (const model of models) {
      const start = Date.now();
      for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
        try {
          const result = await this.tryDecide(request, candidates, model);

          const latency = Date.now() - start;
          this.metrics.recordLLMJudge({
            model,
            success: true,
            latency,
            confidence: result.confidence,
            cost: this.estimateCost(model, result),
          });

          return result;

        } catch (error) {
          this.logger.warn(`LLM Judge ${model} attempt ${attempt + 1} failed: ${error}`);
          this.metrics.recordLLMJudge({
            model,
            success: false,
            latency: Date.now() - start,
            confidence: 0,
            cost: 0,
          });

          if (attempt < this.config.maxRetries - 1) {
            await sleep(1000 * Math.pow(2, attempt));  // exponential backoff
          }
        }
      }
    }

    this.logger.error('All LLM Judge attempts failed');
    return null;
  }

  private async tryDecide(
    request: RoutingRequest,
    candidates: AgentDescriptor[],
    model: string,
  ): Promise<LLMJudgeResult> {
    const prompt = this.buildPrompt(request, candidates);

    const response = await this.providerRouter.route({
      model,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 500,
      temperature: 0.1,
      responseFormat: { type: 'json_object' },
    }, {
      timeout: this.config.timeout,
      costLimit: this.config.costLimit,
    });

    return this.parseResponse(response.content);
  }

  private parseResponse(content: string): LLMJudgeResult {
    // Sanitizar: remover markdown fences se houver
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Tentar extrair JSON de dentro do texto
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      parsed = JSON.parse(jsonMatch[0]);
    }

    if (!parsed.agentId || typeof parsed.confidence !== 'number') {
      throw new Error('Missing required fields in LLM response');
    }

    return {
      agentId: parsed.agentId as string,
      confidence: parsed.confidence as number,
      reasoning: (parsed.reasoning as string) ?? '',
      alternativeAgents: (parsed.alternativeAgents as string[]) ?? [],
    };
  }

  private buildPrompt(request: RoutingRequest, candidates: AgentDescriptor[]): string {
    return ROUTING_DECISION_PROMPT
      .replace('{intent}', request.intent)
      .replace('{context}', JSON.stringify(request.context))
      .replace('{requiredTools}', (request.requiredTools ?? []).join(', '))
      .replace('{priority}', String(request.priority))
      .replace('{agents}', JSON.stringify(candidates.map(a => ({
        id: a.id,
        role: a.role,
        domains: a.domain,
        confidence: a.confidence,
        load: `${a.currentLoad}/${a.maxConcurrency}`,
        tools: a.tools.map(t => t.name),
      })), null, 2));
  }

  private estimateCost(model: string, result: LLMJudgeResult): number {
    const costs: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 2.50, output: 10.00 },
      'gpt-4o-mini': { input: 0.15, output: 0.60 },
      'claude-3.5-sonnet': { input: 3.00, output: 15.00 },
      'deepseek-chat': { input: 0.27, output: 1.10 },
    };

    const c = costs[model] ?? { input: 1.00, output: 4.00 };
    // Estimativa grosseira: ~500 tokens input, ~100 tokens output
    return (500 / 1_000_000) * c.input + (100 / 1_000_000) * c.output;
  }
}
```

---

## 7. Load Balancing & Concurrency

### 7.1 Round-Robin vs. Least-Connections vs. Weighted

| Estratégia | Mecanismo | Ideal para | Limitação |
|-----------|-----------|------------|-----------|
| Round-Robin | Distribui igualmente round-robin | Agentes homogêneos | Ignora carga atual |
| Least-Connections | Roteia para agente com menos conexões | Agentes heterogêneos | Overhead de monitoramento |
| Weighted | Distribui proporcional ao peso | Agentes com capacidades diferentes | Peso fixo, não dinâmico |

**Código do Load Balancer:**

```typescript
export type BalancerStrategy = 'round-robin' | 'least-connections' | 'weighted';

export class LoadBalancer {
  private roundRobinIndex = 0;

  constructor(private config: BalancerConfig) {}

  async selectAgent(
    candidates: AgentDescriptor[],
    strategy?: BalancerStrategy,
  ): Promise<AgentDescriptor> {
    const s = strategy ?? this.config.strategy;

    switch (s) {
      case 'round-robin':
        return this.roundRobin(candidates);
      case 'least-connections':
        return this.leastConnections(candidates);
      case 'weighted':
        return this.weighted(candidates);
      default:
        return this.roundRobin(candidates);
    }
  }

  private roundRobin(candidates: AgentDescriptor[]): AgentDescriptor {
    const available = candidates.filter(a => a.currentLoad < a.maxConcurrency);
    if (available.length === 0) throw new Error('No agents available');

    const index = this.roundRobinIndex % available.length;
    this.roundRobinIndex = (this.roundRobinIndex + 1) % available.length;
    return available[index];
  }

  private leastConnections(candidates: AgentDescriptor[]): AgentDescriptor {
    return candidates
      .filter(a => a.currentLoad < a.maxConcurrency)
      .sort((a, b) => a.currentLoad / a.maxConcurrency - b.currentLoad / b.maxConcurrency)[0];
  }

  private weighted(candidates: AgentDescriptor[]): AgentDescriptor {
    const available = candidates.filter(a => a.currentLoad < a.maxConcurrency);
    if (available.length === 0) throw new Error('No agents available');

    const totalWeight = available.reduce((sum, a) => sum + (this.config.weights[a.id] ?? 1), 0);
    let random = Math.random() * totalWeight;

    for (const agent of available) {
      const weight = this.config.weights[agent.id] ?? 1;
      random -= weight;
      if (random <= 0) return agent;
    }

    return available[available.length - 1];
  }
}
```

### 7.2 Rate Limiting por Agente

```typescript
interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxConcurrentRequests: number;
  burstSize: number;
}

class AgentRateLimiter {
  private requestTimestamps: Map<string, number[]> = new Map();
  private concurrentCount: Map<string, number> = new Map();

  constructor(private config: RateLimitConfig) {}

  async acquire(agentId: string): Promise<boolean> {
    // Verificar concorrência
    const current = this.concurrentCount.get(agentId) ?? 0;
    if (current >= this.config.maxConcurrentRequests) {
      return false;
    }

    // Verificar rate por minuto
    const now = Date.now();
    const timestamps = this.requestTimestamps.get(agentId) ?? [];
    const recent = timestamps.filter(t => now - t < 60_000);

    if (recent.length >= this.config.maxRequestsPerMinute + this.config.burstSize) {
      return false;
    }

    // Permitir
    recent.push(now);
    this.requestTimestamps.set(agentId, recent);
    this.concurrentCount.set(agentId, current + 1);

    return true;
  }

  release(agentId: string): void {
    const current = this.concurrentCount.get(agentId) ?? 0;
    this.concurrentCount.set(agentId, Math.max(0, current - 1));
  }

  getCurrentLoad(agentId: string): number {
    return this.concurrentCount.get(agentId) ?? 0;
  }
}
```

### 7.3 Circuit Breaker

```typescript
export type BreakerState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  failureThreshold: number;     // failures before open
  successThreshold: number;     // successes before close
  resetTimeout: number;         // ms before half-open
  halfOpenMaxRequests: number;
}

export class CircuitBreaker {
  private state: BreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private halfOpenRequests = 0;

  constructor(
    private agentId: string,
    private config: CircuitBreakerConfig,
    private eventBus: IEventBus,
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.transitionTo('half-open');
      } else {
        throw new CircuitBreakerOpenError(this.agentId);
      }
    }

    if (this.state === 'half-open') {
      if (this.halfOpenRequests >= this.config.halfOpenMaxRequests) {
        throw new CircuitBreakerOpenError(this.agentId);
      }
      this.halfOpenRequests++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo('closed');
      }
    }
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'closed' && this.failureCount >= this.config.failureThreshold) {
      this.transitionTo('open');
    }

    if (this.state === 'half-open') {
      this.transitionTo('open');
    }
  }

  private async transitionTo(newState: BreakerState): Promise<void> {
    const oldState = this.state;
    this.state = newState;
    this.successCount = 0;
    this.halfOpenRequests = 0;

    logger.warn(`Circuit breaker for agent ${this.agentId}: ${oldState} → ${newState}`);

    await this.eventBus.publish('router.circuit-breaker', {
      type: 'circuit-breaker-transition',
      agentId: this.agentId,
      oldState,
      newState,
      timestamp: new Date().toISOString(),
    });
  }

  getState(): BreakerState {
    return this.state;
  }
}

class CircuitBreakerOpenError extends Error {
  constructor(agentId: string) {
    super(`Circuit breaker open for agent ${agentId}`);
    this.name = 'CircuitBreakerOpenError';
  }
}
```

### 7.4 Queue Management

```typescript
interface QueueItem {
  request: RoutingRequest;
  resolve: (decision: RoutingDecision) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: number;
}

export class RequestQueue {
  private queues: Map<string, QueueItem[]> = new Map();
  private processing = new Set<string>();

  constructor(
    private router: AgentRouter,
    private config: { maxQueueSize: number; maxWaitTime: number },
  ) {}

  async enqueue(agentId: string, request: RoutingRequest): Promise<RoutingDecision> {
    return new Promise((resolve, reject) => {
      const queue = this.queues.get(agentId) ?? [];
      if (queue.length >= this.config.maxQueueSize) {
        reject(new Error(`Queue full for agent ${agentId}`));
        return;
      }

      queue.push({
        request,
        resolve,
        reject,
        timestamp: Date.now(),
        priority: request.priority,
      });

      this.queues.set(agentId, queue);

      if (!this.processing.has(agentId)) {
        this.processQueue(agentId);
      }
    });
  }

  private async processQueue(agentId: string): Promise<void> {
    this.processing.add(agentId);

    while (true) {
      const queue = this.queues.get(agentId) ?? [];
      if (queue.length === 0) break;

      // Priority ordering
      queue.sort((a, b) => b.priority - a.priority);

      const item = queue.shift()!;

      const waitTime = Date.now() - item.timestamp;
      if (waitTime > this.config.maxWaitTime) {
        item.reject(new Error(`Request ${item.request.id} expired in queue`));
        continue;
      }

      try {
        const decision = await this.router.route(item.request);
        item.resolve(decision);
      } catch (error) {
        item.reject(error);
      }
    }

    this.processing.delete(agentId);
  }
}
```

### 7.5 Code Example: LoadBalancer with Weighted Distribution

```typescript
import { EventBus } from '@ideia/event-bus';

interface WeightedBalancerConfig {
  defaultWeight: number;
  adjustByLoad: boolean;
  loadSensitivity: number;  // 0-1, how much load affects effective weight
  rebalanceInterval: number;
}

export class WeightedLoadBalancer {
  private currentLoads: Map<string, number> = new Map();
  private weights: Map<string, number> = new Map();
  private rebalanceTimer: NodeJS.Timeout | null = null;

  constructor(
    private registry: CapabilityRegistryService,
    private config: WeightedBalancerConfig,
    private eventBus: EventBus,
  ) {
    this.startRebalanceLoop();
  }

  setWeight(agentId: string, weight: number): void {
    this.weights.set(agentId, weight);
  }

  getEffectiveWeight(agentId: string): number {
    const baseWeight = this.weights.get(agentId) ?? this.config.defaultWeight;
    if (!this.config.adjustByLoad) return baseWeight;

    const load = this.currentLoads.get(agentId) ?? 0;
    const loadFactor = 1 - (load * this.config.loadSensitivity);
    return Math.max(0.1, baseWeight * loadFactor);
  }

  async select(agents: AgentDescriptor[]): Promise<AgentDescriptor> {
    const available = agents.filter(a => a.status === 'active');
    if (available.length === 0) throw new Error('No active agents');

    const totalWeight = available.reduce(
      (sum, a) => sum + this.getEffectiveWeight(a.id), 0,
    );

    let random = Math.random() * totalWeight;
    for (const agent of available) {
      random -= this.getEffectiveWeight(agent.id);
      if (random <= 0) return agent;
    }

    return available[available.length - 1];
  }

  recordLoad(agentId: string, load: number): void {
    this.currentLoads.set(agentId, load);
  }

  private startRebalanceLoop(): void {
    this.rebalanceTimer = setInterval(async () => {
      await this.rebalance();
    }, this.config.rebalanceInterval);
  }

  private async rebalance(): Promise<void> {
    const agents = await this.registry.getAgents();
    for (const agent of agents) {
      const effectiveWeight = this.getEffectiveWeight(agent.id);
      const avgLoad = agent.currentLoad / agent.maxConcurrency;

      if (avgLoad > 0.8 && effectiveWeight > 0.1) {
        const newWeight = this.weights.get(agent.id) ?? this.config.defaultWeight;
        this.weights.set(agent.id, newWeight * 0.9);
        logger.info(`Reduced weight for ${agent.id}: ${effectiveWeight.toFixed(2)} → ${(newWeight * 0.9).toFixed(2)}`);
      }

      if (avgLoad < 0.3) {
        const newWeight = this.weights.get(agent.id) ?? this.config.defaultWeight;
        this.weights.set(agent.id, Math.min(10, newWeight * 1.1));
      }
    }
  }

  destroy(): void {
    if (this.rebalanceTimer) clearInterval(this.rebalanceTimer);
  }
}
```

---

## 8. Fallback Strategies

### 8.1 No-match Fallback

Quando nenhum agente corresponde ao request:

| Estratégia | Descrição | Quando usar |
|-----------|-----------|-------------|
| Default Agent | Roteia para agente generalista padrão | Sempre disponível |
| Suggest New | Cria task para registrar nova capability | Match parcial mas insuficiente |
| Human Intervention | Notifica humano para decisão | Prioridade alta |
| Decompose | Tenta decompor o request em sub-tarefas | Request complexo sem match único |

### 8.2 Timeout Fallback

Quando o roteamento excede o tempo limite:

```
TimeoutPolicy:
  stages:
    - timeout: 100ms  → degrade para rule-only
    - timeout: 500ms  → degrade para round-robin
    - timeout: 2000ms → degrade para default agent
```

### 8.3 Error Fallback

Quando o agente selecionado falha:

```
ErrorFallbackChain:
  1. Retry (até 3x, com backoff exponencial)
  2. Circuit breaker (se falhas consecutivas)
  3. Alternative agent (segundo melhor match)
  4. Degrade autonomy (reduzir nível N)
  5. Human intervention
```

### 8.4 Degradation Fallback

Reduzir autonomia quando as condições não são ideais:

```typescript
const DEGRADATION_MAP: Record<string, string> = {
  'N5': 'N4',   // remove supervisor + approval
  'N4': 'N3',   // remove parallel execution
  'N3': 'N2',   // remove tester
  'N2': 'N1',   // remove analyst
  'N1': 'N0',   // direct response
};
```

### 8.5 Code Example: FallbackManager with Escalation Chain

```typescript
export type FallbackAction =
  | { type: 'retry'; maxRetries: number; delay: number }
  | { type: 'alternative'; agentId: string }
  | { type: 'degrade'; targetLevel: ComplexityLevel }
  | { type: 'human'; notifyChannels: string[] }
  | { type: 'default'; agentId: string };

interface EscalationStep {
  condition: (error: Error, context: FallbackContext) => boolean;
  action: FallbackAction;
}

interface FallbackContext {
  request: RoutingRequest;
  candidates: AgentDescriptor[];
  selectedAgent?: AgentDescriptor;
  error?: Error;
  attempts: number;
  startTime: number;
}

export class FallbackManager {
  private escalationChain: EscalationStep[];

  constructor(
    private router: AgentRouter,
    private registry: CapabilityRegistryService,
    private eventBus: IEventBus,
    private config: FallbackConfig,
    private metrics: MetricsCollector,
  ) {
    this.escalationChain = this.buildEscalationChain();
  }

  async resolve(
    request: RoutingRequest,
    candidates: AgentDescriptor[],
  ): Promise<AgentDescriptor> {
    const context: FallbackContext = {
      request,
      candidates,
      attempts: 0,
      startTime: Date.now(),
    };

    for (const step of this.escalationChain) {
      if (context.attempts >= this.config.maxRetries) break;

      try {
        const result = await this.tryFallbackAction(step.action, context);
        if (result) return result;
      } catch (error) {
        context.error = error as Error;
        context.attempts++;
      }
    }

    // Último recurso: agente padrão
    return this.getDefaultAgent();
  }

  private buildEscalationChain(): EscalationStep[] {
    return [
      {
        condition: () => true,
        action: { type: 'retry', maxRetries: 2, delay: 1000 },
      },
      {
        condition: (err) => err.name === 'CircuitBreakerOpenError',
        action: { type: 'alternative', agentId: '' },  // será preenchido
      },
      {
        condition: (err, ctx) => ctx.attempts >= 3,
        action: {
          type: 'degrade',
          targetLevel: this.getDegradedLevel(ctx.request.autonomyLevel ?? 'N3'),
        },
      },
      {
        condition: (err, ctx) => Date.now() - ctx.startTime > 10_000,
        action: {
          type: 'human',
          notifyChannels: ['console', 'event-bus'],
        },
      },
    ];
  }

  private async tryFallbackAction(
    action: FallbackAction,
    context: FallbackContext,
  ): Promise<AgentDescriptor | null> {
    switch (action.type) {
      case 'retry': {
        logger.info(`Fallback retry ${context.attempts + 1}/${action.maxRetries}`);
        await sleep(action.delay * Math.pow(2, context.attempts));
        const decision = await this.router.route(context.request);
        const agent = context.candidates.find(a => a.id === decision.agentId);
        if (agent) return agent;
        return null;
      }

      case 'alternative': {
        const candidates = await this.registry.getAgents();
        const alternative = candidates
          .filter(a => a.id !== context.selectedAgent?.id && a.status === 'active')
          .sort((a, b) => (b.confidence['general'] ?? 0) - (a.confidence['general'] ?? 0))[0];
        if (alternative) return alternative;
        return null;
      }

      case 'degrade': {
        logger.warn(`Degrading autonomy from ${context.request.autonomyLevel} to ${action.targetLevel}`);
        const degradedRequest: RoutingRequest = {
          ...context.request,
          autonomyLevel: action.targetLevel,
        };
        const decision = await this.router.route(degradedRequest);
        const agent = context.candidates.find(a => a.id === decision.agentId);
        if (agent) return agent;
        return null;
      }

      case 'human': {
        logger.warn('Human intervention required — no automatic fallback available');
        await this.eventBus.publish('router.human-intervention', {
          type: 'human-intervention-required',
          request: context.request,
          attempts: context.attempts,
          timestamp: new Date().toISOString(),
        });
        return null;
      }

      case 'default':
        return context.candidates.find(a => a.id === action.agentId) ?? null;

      default:
        return null;
    }
  }

  private getDegradedLevel(current: ComplexityLevel): ComplexityLevel {
    const levels: ComplexityLevel[] = ['N0', 'N1', 'N2', 'N3', 'N4', 'N5'];
    const idx = levels.indexOf(current);
    if (idx <= 0) return 'N0';
    return levels[idx - 1];
  }

  private async getDefaultAgent(): Promise<AgentDescriptor> {
    const agent = await this.registry.get(this.config.defaultAgentId);
    if (!agent) throw new Error('No default agent configured');
    return agent;
  }
}
```

---

## 9. Observabilidade

### 9.1 Routing Metrics (Prometheus)

```typescript
interface RouterMetricsData {
  decisionsTotal: number;
  decisionsByStrategy: Record<RoutingStrategy, number>;
  decisionsByAgent: Record<string, number>;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  confidenceAvg: number;
  fallbackRate: number;
  circuitBreakerTrips: number;
  llmJudgeCost: number;
}

class PrometheusMetricsCollector implements MetricsCollector {
  private metrics: RouterMetricsData;
  private latencies: number[] = [];
  private readonly MAX_HISTORY = 10_000;

  constructor() {
    this.metrics = this.initializeMetrics();
  }

  recordDecision(decision: RoutingDecision): void {
    this.metrics.decisionsTotal++;
    this.metrics.decisionsByStrategy[decision.strategy] =
      (this.metrics.decisionsByStrategy[decision.strategy] ?? 0) + 1;
    this.metrics.decisionsByAgent[decision.agentId] =
      (this.metrics.decisionsByAgent[decision.agentId] ?? 0) + 1;

    this.latencies.push(decision.latency);
    if (this.latencies.length > this.MAX_HISTORY) {
      this.latencies.shift();
    }

    this.metrics.latencyP50 = this.percentile(this.latencies, 50);
    this.metrics.latencyP95 = this.percentile(this.latencies, 95);
    this.metrics.latencyP99 = this.percentile(this.latencies, 99);

    if (decision.strategy === 'fallback') {
      this.metrics.fallbackRate =
        (this.metrics.decisionsByStrategy['fallback'] ?? 0) / this.metrics.decisionsTotal;
    }

    const totalConfidence = this.metrics.confidenceAvg * (this.metrics.decisionsTotal - 1) + decision.confidence;
    this.metrics.confidenceAvg = totalConfidence / this.metrics.decisionsTotal;
  }

  recordCircuitBreakerTrip(agentId: string): void {
    this.metrics.circuitBreakerTrips++;
  }

  recordLLMJudge(data: { model: string; success: boolean; latency: number; confidence: number; cost: number }): void {
    if (data.success) {
      this.metrics.llmJudgeCost += data.cost;
    }
  }

  getMetrics(): RouterMetricsData {
    return { ...this.metrics };
  }

  getPrometheusMetrics(): string {
    return [
      `# HELP router_decisions_total Total routing decisions`,
      `# TYPE router_decisions_total counter`,
      `router_decisions_total ${this.metrics.decisionsTotal}`,
      ``,
      `# HELP router_decisions_by_strategy Decisions by strategy`,
      `# TYPE router_decisions_by_strategy gauge`,
      ...Object.entries(this.metrics.decisionsByStrategy).map(
        ([s, c]) => `router_decisions_by_strategy{strategy="${s}"} ${c}`,
      ),
      ``,
      `# HELP router_latency_milliseconds Routing latency`,
      `# TYPE router_latency_milliseconds gauge`,
      `router_latency_p50{quantile="0.5"} ${this.metrics.latencyP50}`,
      `router_latency_p95{quantile="0.95"} ${this.metrics.latencyP95}`,
      `router_latency_p99{quantile="0.99"} ${this.metrics.latencyP99}`,
      ``,
      `# HELP router_confidence_avg Average confidence`,
      `# TYPE router_confidence_avg gauge`,
      `router_confidence_avg ${this.metrics.confidenceAvg.toFixed(3)}`,
      ``,
      `# HELP router_fallback_rate Ratio of fallback decisions`,
      `# TYPE router_fallback_rate gauge`,
      `router_fallback_rate ${this.metrics.fallbackRate.toFixed(4)}`,
      ``,
      `# HELP router_circuit_breaker_trips_total Circuit breaker trips`,
      `# TYPE router_circuit_breaker_trips_total counter`,
      `router_circuit_breaker_trips_total ${this.metrics.circuitBreakerTrips}`,
      ``,
      `# HELP router_llm_judge_cost_total LLM judge cost in USD`,
      `# TYPE router_llm_judge_cost_total counter`,
      `router_llm_judge_cost_total ${this.metrics.llmJudgeCost.toFixed(6)}`,
    ].join('\n');
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const sortedCopy = [...sorted].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sortedCopy.length) - 1;
    return sortedCopy[Math.max(0, index)];
  }

  private initializeMetrics(): RouterMetricsData {
    return {
      decisionsTotal: 0,
      decisionsByStrategy: { rule: 0, capability: 0, embedding: 0, llm: 0, fallback: 0 },
      decisionsByAgent: {},
      latencyP50: 0,
      latencyP95: 0,
      latencyP99: 0,
      confidenceAvg: 0,
      fallbackRate: 0,
      circuitBreakerTrips: 0,
      llmJudgeCost: 0,
    };
  }
}
```

### 9.2 Distributed Tracing (OpenTelemetry)

```typescript
import { trace, context, Span, SpanStatusCode } from '@opentelemetry/api';

export class RouterTracer {
  private tracer = trace.getTracer('agent-router');

  async traceRoute<T>(
    request: RoutingRequest,
    fn: (span: Span) => Promise<T>,
  ): Promise<T> {
    return this.tracer.startActiveSpan(
      'router.route',
      { attributes: { 'request.id': request.id, 'request.priority': request.priority } },
      async (span: Span) => {
        try {
          const result = await fn(span);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
          span.recordException(error as Error);
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  async traceStage<T>(
    stageName: string,
    fn: () => Promise<T>,
  ): Promise<{ result: T; latency: number }> {
    const start = Date.now();
    return this.tracer.startActiveSpan(
      `router.stage.${stageName}`,
      async (span: Span) => {
        try {
          const result = await fn();
          span.setStatus({ code: SpanStatusCode.OK });
          return { result, latency: Date.now() - start };
        } catch (error) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }
}
```

### 9.3 Decision Audit Log

Cada decisão de roteamento é registrada no audit trail com hash SHA-256:

```typescript
import { createHash } from 'crypto';

interface AuditEntry {
  id: string;
  timestamp: string;
  request: {
    id: string;
    intent: string;
    priority: number;
  };
  decision: {
    agentId: string;
    strategy: RoutingStrategy;
    confidence: number;
    latency: number;
  };
  previousHash: string;
  hash: string;
}

export class DecisionAuditLogger {
  private chain: AuditEntry[] = [];
  private readonly CHAIN_FILE = 'router-audit-chain.jsonl';

  constructor(private eventBus: IEventBus) {
    this.eventBus.subscribe('router.decision', async (msg) => {
      await this.logDecision(msg.data.decision);
    });
  }

  async logDecision(decision: RoutingDecision): Promise<void> {
    const previousHash = this.chain.length > 0
      ? this.chain[this.chain.length - 1].hash
      : '0000000000000000000000000000000000000000000000000000000000000000';

    const entry: AuditEntry = {
      id: decision.id,
      timestamp: decision.timestamp,
      request: {
        id: decision.requestId,
        intent: '',  // preenchido pelo caller
        priority: 0,
      },
      decision: {
        agentId: decision.agentId,
        strategy: decision.strategy,
        confidence: decision.confidence,
        latency: decision.latency,
      },
      previousHash,
      hash: '',
    };

    entry.hash = this.computeHash(entry);
    this.chain.push(entry);

    // Persistir
    await this.appendToChainFile(entry);
  }

  verifyChain(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const computedHash = this.computeHash(this.chain[i]);
      if (computedHash !== this.chain[i].hash) return false;
      if (this.chain[i].previousHash !== this.chain[i - 1].hash) return false;
    }
    return true;
  }

  private computeHash(entry: AuditEntry): string {
    const data = `${entry.id}|${entry.timestamp}|${entry.decision.agentId}|${entry.decision.strategy}|${entry.decision.confidence}|${entry.previousHash}`;
    return createHash('sha256').update(data).digest('hex');
  }

  private async appendToChainFile(entry: AuditEntry): Promise<void> {
    const line = JSON.stringify(entry) + '\n';
    await appendFile(this.CHAIN_FILE, line);
  }
}
```

### 9.4 Dashboard (Grafana)

**Métricas-chave para o dashboard de roteamento:**

| Painel | Métrica | Fonte | Tipo |
|--------|---------|-------|------|
| Decisões por minuto | `rate(router_decisions_total[1m])` | Prometheus | Time series |
| Estratégia de roteamento | `router_decisions_by_strategy` | Prometheus | Stacked bar |
| Latência P50/P95/P99 | `router_latency_p50/95/99` | Prometheus | Time series |
| Confiança média | `router_confidence_avg` | Prometheus | Gauge |
| Taxa de fallback | `router_fallback_rate` | Prometheus | Gauge |
| Circuit breaker trips | `rate(router_circuit_breaker_trips_total[5m])` | Prometheus | Time series |
| Custo LLM Judge | `rate(router_llm_judge_cost_total[1h])` | Prometheus | Time series |
| Agentes por status | `count by (status) (agent_status)` | Registry | Pie chart |
| Health check fail rate | `rate(health_check_failures[5m])` | Prometheus | Time series |

**Exemplo de dashboard JSON (Grafana):**

```json
{
  "title": "Agent Router Dashboard",
  "panels": [
    {
      "title": "Decisions per Minute",
      "type": "graph",
      "targets": [{
        "expr": "rate(router_decisions_total[1m])",
        "legendFormat": "{{strategy}}"
      }]
    },
    {
      "title": "Strategy Distribution",
      "type": "piechart",
      "targets": [{
        "expr": "router_decisions_by_strategy",
        "legendFormat": "{{strategy}}"
      }]
    },
    {
      "title": "Latency Percentiles",
      "type": "graph",
      "targets": [
        { "expr": "router_latency_p50", "legendFormat": "P50" },
        { "expr": "router_latency_p95", "legendFormat": "P95" },
        { "expr": "router_latency_p99", "legendFormat": "P99" }
      ]
    },
    {
      "title": "LLM Judge Cost (USD/h)",
      "type": "graph",
      "targets": [{
        "expr": "rate(router_llm_judge_cost_total[1h]) * 3600",
        "legendFormat": "$/h"
      }]
    }
  ]
}
```

### 9.5 Code Example: Metrics + Tracing Integration

```typescript
import { trace, context, Span } from '@opentelemetry/api';
import { Counter, Histogram, Gauge, Registry } from 'prom-client';

export class ObservabilityIntegration {
  private promRegistry = new Registry();

  // Métricas Prometheus
  private decisionsCounter: Counter<string>;
  private latencyHistogram: Histogram<string>;
  private confidenceGauge: Gauge<string>;
  private fallbackCounter: Counter<string>;

  // OpenTelemetry
  private tracer = trace.getTracer('agent-router');

  constructor() {
    this.decisionsCounter = new Counter({
      name: 'router_decisions_total',
      help: 'Total routing decisions',
      labelNames: ['strategy', 'agent_id'],
      registers: [this.promRegistry],
    });

    this.latencyHistogram = new Histogram({
      name: 'router_latency_milliseconds',
      help: 'Routing latency in ms',
      labelNames: ['strategy'],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2000],
      registers: [this.promRegistry],
    });

    this.confidenceGauge = new Gauge({
      name: 'router_confidence_avg',
      help: 'Average routing confidence',
      registers: [this.promRegistry],
    });

    this.fallbackCounter = new Counter({
      name: 'router_fallback_total',
      help: 'Fallback decisions',
      labelNames: ['reason'],
      registers: [this.promRegistry],
    });
  }

  async recordWithTrace<T>(
    request: RoutingRequest,
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.tracer.startActiveSpan(
      'router.request',
      {
        attributes: {
          'request.id': request.id,
          'request.priority': request.priority,
          'request.intent': request.intent.substring(0, 100),
        },
      },
      async (span: Span) => {
        try {
          const result = await fn();
          span.setStatus({ code: 1 }); // OK
          return result;
        } catch (error) {
          span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
          span.recordException(error as Error);
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  recordDecision(decision: RoutingDecision): void {
    this.decisionsCounter.inc({
      strategy: decision.strategy,
      agent_id: decision.agentId,
    });

    this.latencyHistogram.observe(
      { strategy: decision.strategy },
      decision.latency,
    );

    this.confidenceGauge.set(decision.confidence);

    if (decision.strategy === 'fallback') {
      this.fallbackCounter.inc({ reason: 'no-match' });
    }
  }

  getPrometheusMetrics(): Promise<string> {
    return this.promRegistry.metrics();
  }
}
```

---

## 10. Implementação na IDEIA

### 10.1 Package Structure

O `packages/agent-router` existente será estendido com os novos módulos de roteamento inteligente:

```
packages/agent-router/
  __tests__/
    router.test.ts              # Testes do pipeline completo
    route-selector.test.ts      # Testes do RouteSelector
    fusion-engine.test.ts       # Testes do FusionEngine
    consensus-engine.test.ts    # Testes do ConsensusEngine
    complexity-classifier.test.ts  # Testes do ComplexityClassifier
    capability-match.test.ts    # NOVOS testes de capability matching
    embedding-matcher.test.ts   # NOVOS testes de embedding
    llm-judge.test.ts           # NOVOS testes de LLM Judge
    load-balancer.test.ts       # NOVOS testes de load balancing
    fallback-manager.test.ts    # NOVOS testes de fallback
  src/
    index.ts                    # Exporta tudo
    types.ts                    # Tipos existentes (ComplexityLevel, etc.)
    router.ts                   # AgentRouter existente + pipeline híbrido
    route-selector.ts           # RouteSelector existente
    complexity-classifier.ts    # ComplexityClassifier existente
    consensus-engine.ts         # ConsensusEngine existente
    fusion-engine.ts            # FusionEngine existente
    core/
      router-pipeline.ts        # NOVO: pipeline de roteamento híbrido
      routing-request.ts        # NOVO: validação Zod de RoutingRequest
    registry/
      agent-capability-bridge.ts  # NOVO: bridge entre CapabilityRegistry e agent-router
      agent-registrar.ts          # NOVO: auto-registro de agentes
    matchers/
      rule-matcher.ts           # NOVO: filtragem baseada em regras
      capability-matcher.ts     # NOVO: match baseado em capabilities
      embedding-matcher.ts      # NOVO: match baseado em embeddings
    judge/
      llm-judge.ts              # NOVO: LLM Judge com retry + fallback
      prompts.ts                # NOVO: templates de prompt
    balancing/
      load-balancer.ts          # NOVO: weighted/round-robin/least-connections
      rate-limiter.ts           # NOVO: rate limiting por agente
      circuit-breaker.ts        # NOVO: circuit breaker
      request-queue.ts          # NOVO: fila de requests
    fallback/
      fallback-manager.ts       # NOVO: gerenciamento de fallback
      escalation-chain.ts       # NOVO: cadeia de escalação
    metrics/
      metrics-collector.ts      # NOVO: métricas Prometheus
      tracing.ts                # NOVO: OpenTelemetry tracing
      audit-logger.ts           # NOVO: audit trail com hash chain
      dashboard.ts              # NOVO: definição Grafana dashboard
```

### 10.2 Integração com o Código Existente

**10.2.1 Integração com `packages/agent-runtime/`**

O `AgentRuntime` existente (7 nós LangGraph) consumirá as decisões do `AgentRouter`:

```typescript
// packages/agent-runtime/src/agent-orchestrator.ts
import { AgentRouter } from '@ideia/agent-router';

export class AgentOrchestrator {
  constructor(private router: AgentRouter) {}

  async execute(request: RoutingRequest): Promise<ExecutionResult> {
    // 1. Router decide qual agente pipeline usar
    const decision = await this.router.route(request);

    // 2. Executa o pipeline do nível de autonomia decidido
    const pipeline = this.buildPipeline(decision.pipeline);
    return pipeline.execute(request.context);
  }

  private buildPipeline(pipeline: RoutePipeline): ExecutionPipeline {
    // Mapeia RoutePipeline para nós LangGraph
    return new ExecutionPipeline({
      agents: pipeline.requiredAgents,
      parallel: pipeline.parallelAgents,
      stages: pipeline.stages,
    });
  }
}
```

**10.2.2 Integração com `packages/capability-registry/`**

```typescript
// packages/agent-router/src/registry/agent-capability-bridge.ts
import { CapabilityRegistryService, Capability } from '@ideia/capability-registry';

export class AgentCapabilityBridge {
  constructor(private registry: CapabilityRegistryService) {}

  async registerAgentAsCapability(agent: AgentDescriptor): Promise<void> {
    const cap: Capability = {
      id: `agent:${agent.id}`,
      name: agent.name,
      description: `Agent with role ${agent.role} covering domains: ${agent.domain.join(', ')}`,
      category: 'agent',
      subcategory: agent.role,
      version: '1.0.0',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dependsOn: [],
      inputs: [],
      outputs: [],
      examples: [],
      tags: [...agent.domain, agent.role],
      metadata: {
        tags: agent.domain,
        keywords: agent.domain,
        links: {},
        package: agent.id,
        maturity: 50,
      },
    };

    await this.registry.register(cap);
  }

  async syncAgentsToRegistry(agents: AgentDescriptor[]): Promise<void> {
    for (const agent of agents) {
      await this.registerAgentAsCapability(agent);
    }
  }
}
```

**10.2.3 Integração com Event Bus (NATS)**

```typescript
// Eventos publicados pelo Agent Router
const ROUTER_EVENTS = {
  'router.decision': 'Decisão de roteamento tomada',
  'router.circuit-breaker': 'Transição de estado do circuit breaker',
  'router.llm-judge': 'Decisão do LLM Judge',
  'router.human-intervention': 'Requisição de intervenção humana',
  'router.health-check': 'Health check de agentes',
};

// Eventos consumidos pelo Agent Router
const AGENT_EVENTS = {
  'agent.heartbeat': 'Heartbeat de agente',
  'agent.register': 'Registro de novo agente',
  'agent.deregister': 'Remoção de agente',
  'agent.capability.updated': 'Atualização de capability',
};
```

**10.2.4 Integração com Theia Plugin**

O `ProviderRouter` existente em `packages/ideia-plugin/src/browser/` será estendido:

```typescript
// packages/ideia-plugin/src/browser/agent-router-service.ts
@injectable()
export class AgentRouterService {
  @inject(AgentRouter)
  private router: AgentRouter;

  async routeAgentTask(task: AgentTask): Promise<AgentResult> {
    const request: RoutingRequest = {
      id: task.id,
      intent: task.description,
      context: { project: task.project, language: task.language },
      requiredTools: task.requiredTools,
      priority: task.priority,
    };

    const decision = await this.router.route(request);
    return this.executeWithAgent(decision.agentId, task);
  }
}
```

### 10.3 Dependências Novas

```json
{
  "dependencies": {
    "@ideia/capability-registry": "*",
    "@ideia/event-bus": "*",
    "@ideia/llm-provider": "*",
    "@ideia/shared": "*",
    "@opentelemetry/api": "^1.8.0",
    "@opentelemetry/sdk-trace-node": "^1.19.0",
    "prom-client": "^15.1.0",
    "uuid": "^9.0.0",
    "zod": "^3.22.0"
  }
}
```

---

## 11. Código Fonte Completo

### 11.1 Complete AgentRouter Class

```typescript
import { EventBus } from '@ideia/event-bus';
import { CapabilityRegistryService } from '@ideia/capability-registry';
import { Logger } from '@ideia/shared';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const RoutingRequestSchema = z.object({
  id: z.string().optional(),
  intent: z.string().min(1).max(2000),
  context: z.record(z.unknown()).default({}),
  requiredTools: z.array(z.string()).optional(),
  priority: z.number().min(0).max(10).default(3),
  maxLatency: z.number().positive().optional(),
  autonomyLevel: z.enum(['N0', 'N1', 'N2', 'N3', 'N4', 'N5']).optional(),
});

export class AgentRouter {
  private logger = new Logger('AgentRouter');
  private config: RouterConfig;

  constructor(
    private capabilityRegistry: CapabilityRegistryService,
    private embeddingMatcher: EmbeddingMatcher,
    private llmJudge: LLMJudgeWithFallback,
    private loadBalancer: WeightedLoadBalancer,
    private fallbackManager: FallbackManager,
    private metrics: ObservabilityIntegration,
    private eventBus: EventBus,
    private tracer: RouterTracer,
    config?: Partial<RouterConfig>,
  ) {
    this.config = {
      llmJudgeMinPriority: 6,
      embeddingThreshold: 0.85,
      capabilityThreshold: 0.9,
      maxCandidates: 10,
      defaultLevel: 'N2',
      ...config,
    };
  }

  async route(input: unknown): Promise<RoutingDecision> {
    const parsed = RoutingRequestSchema.parse(input);
    const request: RoutingRequest = {
      id: parsed.id ?? uuidv4(),
      intent: parsed.intent,
      context: parsed.context,
      requiredTools: parsed.requiredTools,
      priority: parsed.priority,
      autonomyLevel: parsed.autonomyLevel,
    };

    return this.tracer.traceRoute(request, async (span) => {
      const start = Date.now();
      const stages: StageResult[] = [];

      span.setAttribute('request.id', request.id);
      span.setAttribute('request.priority', request.priority);

      try {
        const decision = await this.executePipeline(request, stages, start);

        this.metrics.recordDecision(decision);
        await this.emitDecisionEvent(decision);

        return decision;

      } catch (error) {
        this.logger.error(`Routing failed for ${request.id}: ${error}`);

        const fallbackDecision = await this.handleRoutingError(request, error as Error, start);
        return fallbackDecision;
      }
    });
  }

  private async executePipeline(
    request: RoutingRequest,
    stages: StageResult[],
    start: number,
  ): Promise<RoutingDecision> {
    const candidates = await this.tracer.traceStage('rule-filter', async () => {
      return this.ruleFilter(request);
    });

    stages.push({
      strategy: 'rule',
      latency: Date.now() - start,
      candidates: candidates.map(a => a.id),
      decision: candidates.length === 1 ? candidates[0].id : null,
    });

    if (candidates.length === 1) {
      return this.buildDecision(request, candidates[0], 'rule', stages, start);
    }

    const { result: capMatches, latency: capLatency } = await this.tracer.traceStage(
      'capability-match',
      async () => this.capabilityMatch(request, candidates),
    );

    stages.push({
      strategy: 'capability',
      latency: capLatency,
      candidates: capMatches.map(m => m.agentId),
      decision: capMatches.length > 0 && capMatches[0].confidence > this.config.capabilityThreshold
        ? capMatches[0].agentId : null,
    });

    if (capMatches.length > 0 && capMatches[0].confidence > this.config.capabilityThreshold) {
      const agent = candidates.find(a => a.id === capMatches[0].agentId);
      if (agent) return this.buildDecision(request, agent, 'capability', stages, start);
    }

    const { result: embMatches, latency: embLatency } = await this.tracer.traceStage(
      'embedding-match',
      async () => this.embeddingMatcher.match(request, candidates),
    );

    stages.push({
      strategy: 'embedding',
      latency: embLatency,
      candidates: embMatches.map(m => m.agentId),
      decision: embMatches.length > 0 && embMatches[0].confidence > this.config.embeddingThreshold
        ? embMatches[0].agentId : null,
    });

    if (embMatches.length > 0 && embMatches[0].confidence > this.config.embeddingThreshold) {
      const agent = candidates.find(a => a.id === embMatches[0].agentId);
      if (agent) return this.buildDecision(request, agent, 'embedding', stages, start);
    }

    if (request.priority >= this.config.llmJudgeMinPriority) {
      const llmStart = Date.now();
      const llmResult = await this.llmJudge.decide(request, candidates);

      stages.push({
        strategy: 'llm',
        latency: Date.now() - llmStart,
        candidates: candidates.map(a => a.id),
        decision: llmResult?.agentId ?? null,
      });

      if (llmResult) {
        const agent = candidates.find(a => a.id === llmResult.agentId);
        if (agent) return this.buildDecision(request, agent, 'llm', stages, start, llmResult.confidence);
      }
    }

    const fallbackAgent = await this.fallbackManager.resolve(request, candidates);
    return this.buildDecision(request, fallbackAgent, 'fallback', stages, start);
  }

  private async ruleFilter(request: RoutingRequest): Promise<AgentDescriptor[]> {
    const agents = await this.capabilityRegistry.list({ category: 'agent', status: 'active' });
    const agentMap = new Map<string, AgentDescriptor>();

    for (const cap of agents) {
      const agentId = cap.metadata.package ?? cap.id.replace('agent:', '');
      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, {
          id: agentId,
          name: cap.name,
          role: cap.subcategory as AgentRole,
          domain: cap.tags,
          tools: [],
          confidence: {},
          maxConcurrency: 5,
          currentLoad: 0,
          status: 'active',
        });
      }
    }

    return Array.from(agentMap.values()).filter(agent => {
      if (agent.status === 'offline' || agent.status === 'circuit-open') return false;
      if (request.requiredTools?.length) {
        const agentToolIds = new Set(agent.tools.map(t => t.id));
        return request.requiredTools.every(t => agentToolIds.has(t));
      }
      return true;
    });
  }

  private async capabilityMatch(
    request: RoutingRequest,
    candidates: AgentDescriptor[],
  ): Promise<Array<{ agentId: string; confidence: number }>> {
    const results: Array<{ agentId: string; confidence: number }> = [];
    const intentWords = new Set(request.intent.toLowerCase().split(/\W+/));

    for (const agent of candidates) {
      let maxScore = 0;
      for (const domain of agent.domain) {
        const domainWords = new Set(domain.toLowerCase().split(/\W+/));
        let intersection = 0;
        for (const w of intentWords) if (domainWords.has(w)) intersection++;
        const score = intersection / Math.max(intentWords.size, domainWords.size);
        const weightedScore = score * (agent.confidence[domain] ?? 0.5);
        if (weightedScore > maxScore) maxScore = weightedScore;
      }
      if (maxScore > 0) results.push({ agentId: agent.id, confidence: maxScore });
    }

    return results.sort((a, b) => b.confidence - a.confidence).slice(0, this.config.maxCandidates);
  }

  private buildDecision(
    request: RoutingRequest,
    agent: AgentDescriptor,
    strategy: RoutingStrategy,
    stages: StageResult[],
    start: number,
    confidenceOverride?: number,
  ): RoutingDecision {
    return {
      id: uuidv4(),
      requestId: request.id!,
      agentId: agent.id,
      confidence: confidenceOverride ?? stages[stages.length - 1].decision === agent.id ? 0.95 : 0.8,
      strategy,
      pipeline: getPipelineForLevel(request.autonomyLevel ?? this.config.defaultLevel),
      latency: Date.now() - start,
      timestamp: new Date().toISOString(),
      stages,
    };
  }

  private async handleRoutingError(
    request: RoutingRequest,
    error: Error,
    start: number,
  ): Promise<RoutingDecision> {
    this.logger.error(`Routing error for ${request.id}: ${error.message}`);

    const defaultAgent: AgentDescriptor = {
      id: 'default-agent',
      name: 'Default Agent',
      role: 'programmer',
      domain: ['general'],
      tools: [],
      confidence: {},
      maxConcurrency: 10,
      currentLoad: 0,
      status: 'active',
    };

    return {
      id: uuidv4(),
      requestId: request.id!,
      agentId: defaultAgent.id,
      confidence: 0.3,
      strategy: 'fallback',
      pipeline: getPipelineForLevel('N1'),
      latency: Date.now() - start,
      timestamp: new Date().toISOString(),
      stages: [],
    };
  }

  private async emitDecisionEvent(decision: RoutingDecision): Promise<void> {
    await this.eventBus.publish('router.decision', {
      type: 'routing-decision',
      decision,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 11.2 CapabilityRegistry with Event Bus

(Vide seção 4.5 — código completo acima)

### 11.3 EmbeddingMatcher with FAISS

(Vide seção 5.4 — código completo acima)

### 11.4 LLM Judge Prompt + Structured Output

(Vide seção 6.5 — código completo acima)

### 11.5 LoadBalancer with Circuit Breaker

(Vide seção 7.5 — código completo acima)

### 11.6 FallbackManager

(Vide seção 8.5 — código completo acima)

### 11.7 Metrics + Grafana Dashboard

(Vide seção 9.5 — código completo acima)

---

## 12. Implementation Roadmap

### 12.1 Phase 1 (Week 1-2) — Core Pipeline + Rule-Based Routing

**Objetivo:** Pipeline de roteamento funcional com regras.

| Task | Descrição | Horas | Dependências |
|------|-----------|-------|-------------|
| 1.1 | Estender `RouterConfig` com suporte a cascata | 4 | — |
| 1.2 | Implementar `RoutingRequestSchema` (Zod) | 2 | — |
| 1.3 | Implementar `AgentDescriptor` com status dinâmico | 4 | 1.1 |
| 1.4 | Implementar `ruleFilter` com ferramentas + status | 6 | 1.3 |
| 1.5 | Integrar `ComplexityClassifier` no pipeline | 4 | 1.2 |
| 1.6 | Implementar `RoutingDecision` builder | 3 | 1.5 |
| 1.7 | Integrar `RouteSelector` para pipeline building | 3 | 1.6 |
| 1.8 | Testes unitários do pipeline | 8 | 1.4-1.7 |
| 1.9 | Integração com `agent-router` existente | 4 | 1.8 |
| | **Total Fase 1** | **38h** | |

**Entregáveis:**
- `AgentRouter` com pipeline funcional
- Rule filter com suporte a ferramentas + status
- Testes de unidade (> 80% coverage)
- Integração com `RouteSelector` e `ComplexityClassifier`

### 12.2 Phase 2 (Week 3-4) — Capability Registry + Health Checks

**Objetivo:** Descoberta dinâmica de agentes via registry.

| Task | Descrição | Horas | Dependências |
|------|-----------|-------|-------------|
| 2.1 | Criar `AgentCapabilityBridge` | 6 | Fase 1 |
| 2.2 | Implementar `syncAgentsToRegistry` | 4 | 2.1 |
| 2.3 | Implementar `HealthCheckMonitor` | 6 | 2.1 |
| 2.4 | Implementar heartbeat loop | 4 | 2.3 |
| 2.5 | Implementar `capabilityMatch` | 8 | 2.2 |
| 2.6 | Implementar `capability-matcher.ts` estágio | 4 | 2.5 |
| 2.7 | Testes de capability match | 8 | 2.5-2.6 |
| 2.8 | Testes de health check (timeout, fallback) | 6 | 2.3-2.4 |
| | **Total Fase 2** | **46h** | |

**Entregáveis:**
- Bridge entre AgentRouter e CapabilityRegistryService
- Agentes se registram automaticamente via capability
- Health checks com heartbeats (30s)
- Agentes offline após 3 heartbeats perdidos

### 12.3 Phase 3 (Week 5-6) — Embedding Matcher

**Objetivo:** Matching semântico via embeddings.

| Task | Descrição | Horas | Dependências |
|------|-----------|-------|-------------|
| 3.1 | Implementar `EmbeddingProvider` (local + API) | 6 | — |
| 3.2 | Implementar cosine similarity + FAISS index | 8 | 3.1 |
| 3.3 | Implementar `EmbeddingMatcher` | 6 | 3.2 |
| 3.4 | Implementar threshold tuning | 4 | 3.3 |
| 3.5 | Integrar embedding stage no pipeline | 4 | Fase 2 + 3.3 |
| 3.6 | Cache de embeddings (LRU) | 4 | 3.3 |
| 3.7 | Testes de matcher (exatidão, performance) | 10 | 3.3-3.6 |
| 3.8 | Benchmark de latência vs precisão | 4 | 3.7 |
| | **Total Fase 3** | **46h** | |

**Entregáveis:**
- EmbeddingProvider com fallback (local → API)
- FAISS index para busca de similaridade
- Threshold tuning automático
- Cache LRU de embeddings

### 12.4 Phase 4 (Week 7-8) — LLM Judge

**Objetivo:** Decisor final via LLM para casos complexos.

| Task | Descrição | Horas | Dependências |
|------|-----------|-------|-------------|
| 4.1 | Implementar prompt template | 3 | — |
| 4.2 | Implementar `LLMJudge` com JSON mode | 6 | 4.1 |
| 4.3 | Implementar retry + backoff | 4 | 4.2 |
| 4.4 | Implementar fallback entre modelos | 4 | 4.3 |
| 4.5 | Integrar LLM Judge stage no pipeline | 4 | Fase 3 + 4.3 |
| 4.6 | Implementar rate limiting de custo | 4 | 4.4 |
| 4.7 | Testes de LLM Judge | 8 | 4.4-4.6 |
| 4.8 | Benchmark custo vs precisão | 4 | 4.7 |
| | **Total Fase 4** | **37h** | |

**Entregáveis:**
- LLMJudge com JSON mode estruturado
- Retry com exponential backoff
- Fallback entre modelos (GPT-4o → GPT-4o-mini → local)
- Rate limiting de custo ($/decisão)

### 12.5 Phase 5 (Week 9-10) — Load Balancing + Circuit Breaker

**Objetivo:** Distribuição de carga e resiliência.

| Task | Descrição | Horas | Dependências |
|------|-----------|-------|-------------|
| 5.1 | Implementar `LoadBalancer` (3 estratégias) | 6 | Fase 1 |
| 5.2 | Implementar `WeightedLoadBalancer` com ajuste dinâmico | 6 | 5.1 |
| 5.3 | Implementar `AgentRateLimiter` | 4 | 5.1 |
| 5.4 | Implementar `CircuitBreaker` com half-open | 8 | 5.1 |
| 5.5 | Implementar `RequestQueue` com prioridade | 6 | 5.1 |
| 5.6 | Integrar load balancer no pipeline | 4 | 5.2-5.5 |
| 5.7 | Testes de concorrência | 8 | 5.6 |
| 5.8 | Testes de circuit breaker (transições) | 6 | 5.4 |
| | **Total Fase 5** | **48h** | |

**Entregáveis:**
- LoadBalancer com round-robin, least-connections, weighted
- WeightedLoadBalancer com rebalanceamento automático
- CircuitBreaker com half-open state
- RequestQueue com ordenação por prioridade

### 12.6 Phase 6 (Week 11-12) — Observability + Tuning

**Objetivo:** Métricas, tracing, auditoria e calibração.

| Task | Descrição | Horas | Dependências |
|------|-----------|-------|-------------|
| 6.1 | Implementar `PrometheusMetricsCollector` | 6 | Fase 1 |
| 6.2 | Implementar `RouterTracer` (OpenTelemetry) | 6 | 6.1 |
| 6.3 | Implementar `DecisionAuditLogger` (SHA-256 chain) | 6 | 6.1 |
| 6.4 | Criar Grafana dashboard JSON | 4 | 6.2 |
| 6.5 | Implementar auto-tuning de thresholds | 6 | 6.1 |
| 6.6 | Testes de integração (observabilidade) | 8 | 6.2-6.5 |
| 6.7 | Documentação + ADR | 6 | 6.6 |
| 6.8 | Benchmark completo | 4 | 6.7 |
| | **Total Fase 6** | **46h** | |

**Entregáveis:**
- Métricas Prometheus (decisions, latency, confidence, fallback rate)
- OpenTelemetry tracing (router.request, router.stage.*)
- Audit trail com SHA-256 chain verificável
- Grafana dashboard com 6+ painéis
- Threshold tuning automático baseado em F1 score

### 12.7 Resumo do Roadmap

| Fase | Horas | Tasks | Entregável Principal |
|------|-------|-------|---------------------|
| Fase 1 | 38h | 9 | Pipeline híbrido funcional |
| Fase 2 | 46h | 8 | Capability registry + health checks |
| Fase 3 | 46h | 8 | Embedding matcher + FAISS |
| Fase 4 | 37h | 8 | LLM Judge + retry/fallback |
| Fase 5 | 48h | 8 | Load balancing + circuit breaker |
| Fase 6 | 46h | 8 | Observabilidade + tuning |
| **Total** | **261h** | **49** | **Sistema completo** |

**Distribuição de horas por tipo:**

```
┌────────────────────────────────────────────┐
│  Implementação:           140h  (54%)      │
│  Testes:                   62h  (24%)      │
│  Integração:               32h  (12%)      │
│  Documentação + Tuning:    27h  (10%)      │
└────────────────────────────────────────────┘
```

---

## 13. Conexões com Estudos Existentes

### S5 — Orquestração Multiagente

O `AgentRouter` é o **entry point** da orquestração multiagente. Enquanto S5 foca em como agentes cooperam (LangGraph, StateGraph, sub-grafos), este estudo foca em **qual** agente executa cada request.

- **S5 provê:** mecanismo de execução (nós, edges, paralelismo)
- **Este estudo provê:** decisão de roteamento (qual nó, quando, com que orçamento)
- **Integração:** `AgentRouter.route()` → `AgentOrchestrator.execute()`

### S47 — Theia AI Agents

Os Theia AI Agents precisam rotear tools entre si no ambiente Theia. O `ProviderRouter` existente faz roteamento entre LLM providers; o Agent Router estende para todos os agentes Theia.

- **S47 provê:** widgets, serviços, contribuições Theia
- **Este estudo provê:** roteamento entre agentes Theia
- **Integração:** `AgentRouterService` injetado nos serviços Theia

### S51 — Parallel Agents

Roteamento para execução paralela de agentes. O Load Balancer e a Request Queue garantem distribuição justa entre agentes concorrentes.

- **S51 provê:** arquitetura de paralelismo, fusion, child sessions
- **Este estudo provê:** como distribuir requests entre agentes paralelos
- **Integração:** `WeightedLoadBalancer` distribui carga entre sidekicks

### S31 — External LLM

O LLM Judge depende de providers externos de LLM. A integração com S31 garante fallback entre providers e gestão de custos.

- **S31 provê:** providers, routing entre LLMs
- **Este estudo provê:** uso do LLM como decisor de roteamento
- **Integração:** `LLMJudge` usa `ProviderRouter` para chamar LLM

### S55 — Resiliência

Circuit breaker, retry com backoff, health checks e fallback strategies vêm diretamente dos padrões de resiliência.

- **S55 provê:** failure types, recovery plans, repair coordinator
- **Este estudo provê:** circuit breaker para agentes, fallback chain
- **Integração:** `CircuitBreaker` usa `failure-types.ts` e `recovery-engine.ts`

### S17 — Observabilidade

Métricas Prometheus, tracing OpenTelemetry e audit trail seguem os padrões definidos em S17.

- **S17 provê:** ObservabilityEngine, SloMonitor, Telemetry
- **Este estudo provê:** métricas específicas de roteamento
- **Integração:** `PrometheusMetricsCollector` → `ObservabilityEngine`

### S4 — Segurança

A decisão de roteamento afeta segurança: agentes com acesso a produção só podem ser selecionados em níveis N4-N5 com aprovação.

- **S4 provê:** policy patterns, output validation, audit SHA-256
- **Este estudo provê:** roteamento sensível a segurança
- **Integração:** `ruleFilter` verifica policies antes de selecionar agente

### GAPS-PRODUCAO-IDE.md

Gaps relacionados a roteamento de agentes:

| Gap | Descrição | Endereçado por |
|-----|-----------|---------------|
| G47 | SSE sem backpressure | RequestQueue (seção 7.4) |
| G30 | Sem cache de contexto | EmbeddingCache (seção 11.3) |
| GS1 | Sem capability discovery | CapabilityRegistry (seção 4) |
| GS8 | Sem circuit breaker | CircuitBreaker (seção 7.3) |
| GS15 | Sem health check | HealthCheckMonitor (seção 4.3) |
| GS22 | Sem audit trail | DecisionAuditLogger (seção 9.3) |

### Documentos Relacionados

| Documento | Relação |
|-----------|---------|
| `ESTUDO-EMPILHAMENTO-CONTRATOS-INTEGRACOES.md` | Contratos entre router e agentes |
| `ESTUDO-IMPLEMENTACAO-LANGGRAPH-MULTIAGENTE.md` | LangGraph como backend do router |
| `ESTUDO-IMPLEMENTACAO-NATS-JETSTREAM.md` | Event Bus para heartbeats e decisões |
| `ESTUDO-SELF-OPTIMIZATION-PANEL-AUTONOMOUS-EVOLUTION.md` | Threshold tuning automático |
| `ESTUDO-PROMPT-ECONOMY-TOKENS.md` | BudgetTracker para orçamento de tokens |
| `ESTUDO-POLICY-RISK-APPROVAL.md` | Risk assessment antes de rotear |
| `ESTUDO-QUALIDADE-TOTAL-IDEIA.md` | Quality gates para roteamento |

---

## Apêndice A: Glossário

| Termo | Definição |
|-------|-----------|
| **Router Core** | Módulo central que executa o pipeline de roteamento |
| **Capability Registry** | Catálogo de agentes, ferramentas e suas capacidades |
| **Embedding Matcher** | Motor de similaridade semântica baseado em vetores |
| **LLM Judge** | Decisor final via modelo de linguagem |
| **Load Balancer** | Distribuidor de carga entre agentes |
| **Circuit Breaker** | Padrão de resiliência que evita chamadas a agentes com falha |
| **Fallback Chain** | Sequência de estratégias quando o roteamento falha |
| **Híbrida (Cascata)** | Pipeline multi-estágio: rule → capability → embedding → llm → fallback |
| **N0-N5** | Níveis de autonomia: N0 (direto) a N5 (completo com aprovação) |
| **Heartbeat** | Sinal periódico de agente informando que está ativo |
| **Threshold** | Limiar de confiança para considerar um match válido |

## Apêndice B: Referências

1. AWS Well-Architected Framework — Reliability Pillar
2. OpenAI Embeddings API — text-embedding-3-small
3. FAISS (Facebook AI Similarity Search) — IndexFlatIP
4. OpenTelemetry Tracing API — @opentelemetry/api
5. Prometheus Client — prom-client (Node.js)
6. Circuit Breaker Pattern — Michael Nygard, "Release It!"
7. LangGraph — StateGraph, sub-graphs, parallel execution
8. NATS JetStream — Event Bus, KV Store, Object Store
