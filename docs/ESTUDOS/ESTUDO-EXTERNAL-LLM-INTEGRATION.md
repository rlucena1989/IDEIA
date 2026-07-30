# ESTUDO S31 — External LLM Integration Architecture

> **Arquitetura unificada de integração com Large Language Models externos: provedores, roteamento, fallback, cache, segurança e observabilidade**

| Versão | Data | Autor | Descrição |
|--------|------|-------|-----------|
| 1.0 | 2026-07-22 | IDEIA Architecture Team | Versão inicial |

---

## Índice

1. [Introdução](#1-introdução)
2. [Arquitetura do Provider System](#2-arquitetura-do-provider-system)
3. [Provider Interface Unificada](#3-provider-interface-unificada)
4. [Provider Registry & Discovery](#4-provider-registry--discovery)
5. [Router & Fallback Chain](#5-router--fallback-chain)
6. [Caching & Semantic Cache](#6-caching--semantic-cache)
7. [Rate Limiting & Throttling](#7-rate-limiting--throttling)
8. [Segurança & Guardrails](#8-segurança--guardrails)
9. [Observabilidade](#9-observabilidade)
10. [Multi-tenancy](#10-multi-tenancy)
11. [Model Manager](#11-model-manager)
12. [Código TypeScript](#12-código-typescript)
13. [Provedores Detalhados](#13-provedores-detalhados)
14. [Conexões com Estudos](#14-conexões-com-estudos)
15. [Plano de Implementação](#15-plano-de-implementação)

---

## 1. Introdução

### 1.1 Contexto

Em 2026, o ecossistema de Large Language Models atingiu um nível de maturidade sem precedentes. Mais de 20 provedores oferecem centenas de modelos, cada um com características únicas de custo, latência, capacidade e especialização. A IDEIA, como plataforma que transforma ideias em sistemas, depende criticamente de LLMs para execução de agentes, análise de código, geração de conteúdo e tomada de decisão.

**O problema:** Cada provedor tem API, autenticação, formatos de streaming, modelos e preços diferentes. Uma integração hardcoded com cada provedor é insustentável. A IDEIA precisa de uma arquitetura que:

- Abstraia as diferenças entre provedores
- Permita fallback automático entre provedores
- Otimize custo vs latência vs qualidade
- Garanta segurança e audit trail completo
- Suporte multi-tenancy com isolamento

### 1.2 Estado Atual

| Provedor | Status | Capacidade | Limitações |
|----------|--------|------------|------------|
| Ollama (local) | ✅ Implementado | Streaming, chat, listModels | Apenas modelos locais |
| OpenAI | ✅ Implementado | Streaming, chat, listModels | Sem fallback ou cache |
| Anthropic | ✅ Implementado | Streaming, chat, listModels | Sem roteamento inteligente |
| DeepSeek | ✅ Implementado | Streaming, chat, listModels | Sem integração com outros |
| Google Gemini | ❌ Não implementado | — | — |
| AWS Bedrock | ❌ Não implementado | — | — |
| Azure OpenAI | ❌ Não implementado | — | — |
| Groq | ❌ Não implementado | — | — |
| Together AI | ❌ Não implementado | — | — |

### 1.3 Princípios de Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PRINCÍPIOS DO PROVIDER SYSTEM                     │
│                                                                      │
│  ① Provider as Plugin  — Cada provedor é um plugin independente     │
│  ② Fail Fast, Fail Safe — Degradação graciosa em falhas             │
│  ③ Cost-Aware Routing   — Escolha do modelo baseada em custo+task   │
│  ④ Security by Design   — Toda chamada auditada e validada          │
│  ⑤ Observável por Padrão — Métricas, traces e logs automáticos      │
│  ⑥ Multi-Tenant Ready   — Isolamento completo entre workspaces      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Arquitetura do Provider System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL LLM INTEGRATION LAYER                        │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      APPLICATION LAYER                                 │   │
│  │  Agent Runtime · Chat Service · Code Generator · Reviewer · Tester   │   │
│  └──────────────────────────────────────────────────────────────────┬───┘   │
│                                                                     │       │
│  ┌──────────────────────────────────────────────────────────────────▼───┐   │
│  │                    PROVIDER SYSTEM CORE                              │   │
│  │                                                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │
│  │  │  Router   │──│ Fallback │──│  Cache   │──│  Observability   │   │   │
│  │  │  Engine   │  │  Chain   │  │  Layer   │  │  (OTel+LangFuse) │   │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────────────┘   │   │
│  │       │              │              │                               │   │
│  │  ┌────▼──────────────▼──────────────▼──────────────────────────┐   │   │
│  │  │                    PROVIDER INTERFACE                        │   │   │
│  │  │  streamChat(model, messages, options) → AsyncIterable<Chunk> │   │   │
│  │  │  chat(model, messages, options) → Response                   │   │   │
│  │  │  embed(model, input) → number[][]                            │   │   │
│  │  │  listModels() → ModelDescriptor[]                            │   │   │
│  │  │  healthCheck() → HealthStatus                                │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Ollama   │ │  OpenAI  │ │Anthropic │ │ DeepSeek │ │  Gemini  │  ...     │
│  │  Provider │ │ Provider │ │ Provider │ │ Provider │ │ Provider │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    SUPPORTING INFRASTRUCTURE                          │   │
│  │  Rate Limiter · Circuit Breaker · Retry Queue · API Key Vault       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Componentes

| Componente | Responsabilidade | Dependências |
|------------|-----------------|--------------|
| **Router Engine** | Seleciona provedor e modelo baseado na tarefa | Cost table, Latency data, Task classifier |
| **Fallback Chain** | Tenta provedores alternativos em caso de falha | Health checker, Timeout config |
| **Cache Layer** | Cache semântico e exato de respostas | Vector DB, TTL config |
| **Observability** | Tracing, métricas, logging estruturado | OpenTelemetry, LangFuse |
| **Provider Interface** | Contrato unificado para todos os provedores | — |
| **Rate Limiter** | Controle de taxa por provedor/tenant | Token bucket algorithm |
| **Circuit Breaker** | Proteção contra provedores com falha | Failure counting, Half-open |
| **API Key Vault** | Armazenamento seguro de chaves | AES-256 encryption |

---

## 3. Provider Interface Unificada

### 3.1 Schema TypeScript

```typescript
// packages/llm-provider/src/types.ts

export interface ModelDescriptor {
  id: string;
  provider: string;
  name: string;
  family: string;
  version: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  supportsFunctions: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsJsonMode: boolean;
  supportsReasoning: boolean;
  costPer1KTokensInput: number;   // USD
  costPer1KTokensOutput: number;  // USD
  avgLatencyMs: number;
  recommendedFor: string[];        // 'code', 'chat', 'reasoning', 'embedding'
  available: boolean;
  since: string;                   // ISO date
}

export interface ProviderCapabilities {
  maxConcurrentRequests: number;
  requiresApiKey: boolean;
  supportsStreaming: boolean;
  supportsFunctions: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsEmbeddings: boolean;
  supportsFineTuned: boolean;
  authMethods: ('apiKey' | 'oauth' | 'iam')[];
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentBlock[];
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  text?: string;
  image?: { data: string; mimeType: string };
  toolUseId?: string;
  toolName?: string;
  input?: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'any' | 'none' | { type: 'function'; function: { name: string } };
  jsonMode?: boolean;
  reasoningEffort?: 'low' | 'medium' | 'high';
  signal?: AbortSignal;
  onToken?: (token: string) => void;
  userId?: string;
  workspaceId?: string;
  tags?: Record<string, string>;
}

export interface ChatResponse {
  id: string;
  model: string;
  provider: string;
  content: string;
  toolCalls?: ToolCall[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
  };
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
  latencyMs: number;
  cached: boolean;
  createdAt: string;
}

export interface HealthStatus {
  healthy: boolean;
  provider: string;
  latencyMs: number;
  modelsAvailable: number;
  lastError?: string;
  rateLimitRemaining: number;
  uptimeHours: number;
}

// Provider Interface
export interface LLMProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  chat(model: string, messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  streamChat(model: string, messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatChunk>;
  embed(model: string, input: string | string[]): Promise<number[][]>;
  listModels(): Promise<ModelDescriptor[]>;
  healthCheck(): Promise<HealthStatus>;
}
```

### 3.2 Exemplo de Resposta Padronizada

```typescript
// Resposta do OpenAI
{
  id: 'chatcmpl-9a8b7c6d5e',
  model: 'gpt-4o-2026-05-13',
  provider: 'openai',
  content: 'Para criar um CRUD de usuários...',
  usage: {
    inputTokens: 450,
    outputTokens: 1200,
    totalTokens: 1650,
    costUsd: 0.033  // $0.015/1K in + $0.06/1K out → 450*0.015/1000 + 1200*0.06/1000
  },
  finishReason: 'stop',
  latencyMs: 2340,
  cached: false,
  createdAt: '2026-07-22T10:30:00Z'
}

// Resposta do Anthropic
{
  id: 'msg_01a2b3c4d5e6f7g8',
  model: 'claude-4-opus-20260514',
  provider: 'anthropic',
  content: 'Para criar um CRUD de usuários...',
  usage: {
    inputTokens: 480,
    outputTokens: 1100,
    totalTokens: 1580,
    costUsd: 0.088  // $0.04/1K in + $0.08/1K out
  },
  finishReason: 'stop',
  latencyMs: 3120,
  cached: false,
  createdAt: '2026-07-22T10:30:03Z'
}
```

---

## 4. Provider Registry & Discovery

### 4.1 Registro Dinâmico

```typescript
// packages/llm-provider/src/registry.ts

export class ProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();
  private models: Map<string, ModelDescriptor> = new Map();
  private events = new EventEmitter();

  register(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
    this.events.emit('provider:registered', { id: provider.id });
  }

  unregister(providerId: string): void {
    this.providers.delete(providerId);
    this.events.emit('provider:unregistered', { id: providerId });
  }

  getProvider(providerId: string): LLMProvider | undefined {
    return this.providers.get(providerId);
  }

  listProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  async discoverModels(): Promise<ModelDescriptor[]> {
    const allModels: ModelDescriptor[] = [];
    for (const provider of this.providers.values()) {
      try {
        const models = await provider.listModels();
        allModels.push(...models);
      } catch (err) {
        console.warn(`Failed to discover models from ${provider.id}:`, err);
      }
    }
    // Cache models
    allModels.forEach(m => this.models.set(`${m.provider}:${m.id}`, m));
    return allModels;
  }

  getBestModelForTask(task: string, constraints?: {
    maxCost?: number;
    requireVision?: boolean;
    requireFunctions?: boolean;
    maxLatency?: number;
  }): ModelDescriptor | null {
    const candidates = Array.from(this.models.values())
      .filter(m => m.available)
      .filter(m => m.recommendedFor.includes(task))
      .filter(m => !constraints?.requireVision || m.supportsVision)
      .filter(m => !constraints?.requireFunctions || m.supportsFunctions)
      .filter(m => !constraints?.maxCost || m.costPer1KTokensInput <= constraints.maxCost)
      .filter(m => !constraints?.maxLatency || m.avgLatencyMs <= constraints.maxLatency);

    // Sort by cost ascending, then by capability score
    return candidates.sort((a, b) => {
      const costDiff = a.costPer1KTokensInput - b.costPer1KTokensInput;
      if (costDiff !== 0) return costDiff;
      return b.contextWindow - a.contextWindow;
    })[0] || null;
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }
}
```

### 4.2 Provedores Suportados

| Provedor | Tipo | Descoberta | Autenticação | Modelos Principais |
|----------|------|------------|-------------|-------------------|
| **Ollama** | Local | Scan de modelos locais | Nenhuma | llama-4, qwen3, deepseek-coder-v3, mistral-large |
| **OpenAI** | Cloud | API list | API Key | gpt-4o, gpt-4o-mini, o3, o4-mini |
| **Anthropic** | Cloud | API list | API Key | claude-4-opus, claude-4-sonnet, claude-4-haiku |
| **DeepSeek** | Cloud | API list | API Key | deepseek-chat-v3, deepseek-coder-v3, deepseek-reasoner |
| **Google Gemini** | Cloud | API list | API Key | gemini-2.0-flash, gemini-2.0-pro, gemini-2.5-pro |
| **AWS Bedrock** | Cloud | SDK discovery | IAM | claude-4, llama-4, mistral-large via AWS |
| **Azure OpenAI** | Cloud | API list | API Key + Entra ID | gpt-4o, o3 via Azure |
| **Groq** | Cloud | API list | API Key | llama-4-70b, mixtral-8x22b, deepseek-coder |
| **Together AI** | Cloud | API list | API Key | llama-4, deepseek, qwen3, mistral |

### 4.3 Plugin System para Novos Providers

```typescript
// packages/llm-provider/src/plugin.ts

export interface ProviderPlugin {
  id: string;
  name: string;
  version: string;
  createProvider(config: ProviderConfig): LLMProvider;
  validateConfig(config: ProviderConfig): ValidationResult;
}

export class ProviderPluginLoader {
  async loadFromPackage(packageName: string): Promise<ProviderPlugin> {
    const plugin = await import(packageName);
    return plugin.default as ProviderPlugin;
  }

  async loadFromDirectory(dir: string): Promise<ProviderPlugin[]> {
    const files = await fs.readdir(dir);
    const plugins: ProviderPlugin[] = [];
    for (const file of files.filter(f => f.endsWith('.js') || f.endsWith('.ts'))) {
      const plugin = await import(path.join(dir, file));
      plugins.push(plugin.default);
    }
    return plugins;
  }
}
```

---

## 5. Router & Fallback Chain

### 5.1 Router Engine

O Router Engine é o cérebro da arquitetura. Ele decide qual provedor e modelo usar para cada requisição baseado em múltiplos critérios.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ROUTER DECISION FLOW                            │
│                                                                      │
│  Requisição → Classificador de Tarefa → Filtro de Restrições        │
│       ↓                                                              │
│  Lista de Candidatos (modelos que atendem requisitos)                │
│       ↓                                                              │
│  Scoring: (custo × 0.3) + (latência × 0.2) + (qualidade × 0.3)    │
│           + (disponibilidade × 0.2)                                  │
│       ↓                                                              │
│  Seleção do Melhor Modelo → Tentativa                                │
│       ↓                                                              │
│  Falha? → Fallback Chain → Próximo candidato                         │
│       ↓                                                              │
│  Sucesso → Cache + Retorno                                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
// packages/llm-provider/src/router.ts

export interface RoutingConfig {
  strategy: 'cost' | 'latency' | 'quality' | 'balanced' | 'manual';
  preferredProvider?: string;
  preferredModel?: string;
  maxRetries: number;
  fallbackOrder: string[];  // Provider IDs in fallback order
  costLimit?: number;       // Max cost per 1K input tokens
  latencyLimit?: number;    // Max latency in ms
}

export class Router {
  constructor(
    private registry: ProviderRegistry,
    private config: RoutingConfig,
    private metrics: MetricsCollector
  ) {}

  async route(task: string, messages: ChatMessage[], options?: ChatOptions): Promise<{
    provider: LLMProvider;
    model: string;
    chatResponse: ChatResponse;
  }> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    // Get ordered candidate list
    const candidates = this.getCandidates(task, options);
    if (candidates.length === 0) {
      throw new Error(`No available model for task: ${task}`);
    }

    // Try each candidate in order
    for (const candidate of candidates) {
      const provider = this.registry.getProvider(candidate.provider);
      if (!provider) continue;

      try {
        const response = await provider.chat(candidate.id, messages, options);
        this.metrics.record('router.success', {
          provider: candidate.provider,
          model: candidate.id,
          latencyMs: Date.now() - startTime,
          cost: response.usage.costUsd,
        });
        return { provider, model: candidate.id, chatResponse: response };
      } catch (err) {
        lastError = err as Error;
        this.metrics.record('router.fallback', {
          provider: candidate.provider,
          model: candidate.id,
          error: (err as Error).message,
        });
        // Continue to next candidate
      }
    }

    throw new Error(`All providers failed for task ${task}. Last error: ${lastError?.message}`);
  }

  private getCandidates(task: string, options?: ChatOptions): ModelDescriptor[] {
    const allModels = Array.from(this.registry['models'].values())
      .filter(m => m.available);

    let candidates = allModels
      .filter(m => m.recommendedFor.includes(task) || task === 'any');

    // Apply constraints
    if (options?.tools && options.tools.length > 0) {
      candidates = candidates.filter(m => m.supportsFunctions);
    }
    if (options?.jsonMode) {
      candidates = candidates.filter(m => m.supportsJsonMode);
    }

    // Score and sort
    return candidates
      .map(m => ({
        ...m,
        score: this.calculateScore(m, task)
      }))
      .sort((a, b) => b.score - a.score);
  }

  private calculateScore(model: ModelDescriptor, task: string): number {
    const costScore = 1 - (model.costPer1KTokensInput / 0.1); // Normalize to 0-1
    const latencyScore = 1 - (model.avgLatencyMs / 10000);
    const qualityScore = model.recommendedFor.includes(task) ? 1 : 0.5;
    const availabilityScore = model.available ? 1 : 0;

    switch (this.config.strategy) {
      case 'cost':
        return costScore * 0.6 + qualityScore * 0.3 + availabilityScore * 0.1;
      case 'latency':
        return latencyScore * 0.6 + qualityScore * 0.3 + availabilityScore * 0.1;
      case 'quality':
        return qualityScore * 0.6 + costScore * 0.2 + latencyScore * 0.2;
      case 'balanced':
      default:
        return costScore * 0.25 + latencyScore * 0.25 + qualityScore * 0.35 + availabilityScore * 0.15;
    }
  }
}
```

### 5.2 Fallback Chain

```typescript
// packages/llm-provider/src/fallback.ts

export interface FallbackConfig {
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
  circuitBreakerThreshold: number;  // Failures before circuit opens
  circuitBreakerResetMs: number;    // Time before half-open
}

export class FallbackChain {
  private circuitStates: Map<string, {
    failures: number;
    lastFailure: number;
    state: 'closed' | 'open' | 'half-open';
  }> = new Map();

  constructor(private config: FallbackConfig) {}

  async execute<T>(
    providers: LLMProvider[],
    fn: (provider: LLMProvider) => Promise<T>
  ): Promise<{ result: T; provider: LLMProvider }> {
    let lastError: Error | null = null;

    for (const provider of providers) {
      // Check circuit breaker
      if (!this.canAttempt(provider.id)) {
        continue;
      }

      for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
        try {
          const result = await this.withTimeout(
            fn(provider),
            this.config.timeoutMs
          );
          this.recordSuccess(provider.id);
          return { result, provider };
        } catch (err) {
          lastError = err as Error;
          this.recordFailure(provider.id);
          if (attempt < this.config.maxRetries - 1) {
            await this.delay(attempt);
          }
        }
      }
    }

    throw new Error(`Fallback chain exhausted. Last error: ${lastError?.message}`);
  }

  private canAttempt(providerId: string): boolean {
    const state = this.circuitStates.get(providerId);
    if (!state) return true;
    if (state.state === 'open') {
      if (Date.now() - state.lastFailure > this.config.circuitBreakerResetMs) {
        state.state = 'half-open';
        return true;
      }
      return false;
    }
    return true;
  }

  private recordSuccess(providerId: string): void {
    this.circuitStates.set(providerId, {
      failures: 0,
      lastFailure: 0,
      state: 'closed'
    });
  }

  private recordFailure(providerId: string): void {
    const state = this.circuitStates.get(providerId) || {
      failures: 0, lastFailure: 0, state: 'closed'
    };
    state.failures++;
    state.lastFailure = Date.now();
    if (state.failures >= this.config.circuitBreakerThreshold) {
      state.state = 'open';
    }
    this.circuitStates.set(providerId, state);
  }

  private async delay(attempt: number): Promise<void> {
    const delay = this.config.retryDelayMs * Math.pow(this.config.backoffMultiplier, attempt);
    await new Promise(r => setTimeout(r, delay));
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    );
    return Promise.race([promise, timeout]);
  }
}
```

---

## 6. Caching & Semantic Cache

### 6.1 Cache de Duas Camadas

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CACHE LAYER ARCHITECTURE                        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  CAMADA 1: EXACT CACHE (Redis/Mem0)                          │   │
│  │  • Chave: hash(provider + model + messages + options)         │   │
│  │  • TTL: 5-60 minutos configurável                             │   │
│  │  • Hit rate esperado: 15-25%                                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                           ↓                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  CAMADA 2: SEMANTIC CACHE (Vector DB)                        │   │
│  │  • Similaridade cosseno > 0.92                               │   │
│  │  • Embedding da query vs cache store                         │   │
│  │  • TTL: 30-120 minutos                                       │   │
│  │  • Hit rate esperado: 10-20% adicional                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                           ↓                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  CAMADA 3: CACHE WARMING                                     │   │
│  │  • Pré-carregamento de respostas comuns                      │   │
│  │  • Baseado em padrões de uso históricos                      │   │
│  │  • Refresh assíncrono antes do TTL expirar                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
// packages/llm-provider/src/cache.ts

export interface CacheEntry {
  response: ChatResponse;
  embedding?: number[];
  createdAt: string;
  expiresAt: string;
  accessCount: number;
  tags: string[];
}

export class SemanticCache {
  private exactCache: Map<string, CacheEntry> = new Map();
  private maxEntries = 5000;

  constructor(
    private embedder: (text: string) => Promise<number[]>,
    private similarityThreshold = 0.92,
    private defaultTTLMs = 3600000  // 1 hour
  ) {}

  async get(provider: string, model: string, messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse | null> {
    // Level 1: Exact match
    const exactKey = this.hash(provider, model, messages, options);
    const exact = this.exactCache.get(exactKey);
    if (exact && new Date(exact.expiresAt) > new Date()) {
      exact.accessCount++;
      return { ...exact.response, cached: true };
    }
    if (exact) this.exactCache.delete(exactKey);

    // Level 2: Semantic match
    const queryText = messages.map(m =>
      typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    ).join('\n');
    const queryEmbedding = await this.embedder(queryText);

    let bestMatch: { key: string; score: number } | null = null;
    for (const [key, entry] of this.exactCache.entries()) {
      if (new Date(entry.expiresAt) <= new Date()) {
        this.exactCache.delete(key);
        continue;
      }
      if (!entry.embedding) continue;
      const score = this.cosineSimilarity(queryEmbedding, entry.embedding);
      if (score > this.similarityThreshold && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { key, score };
      }
    }

    if (bestMatch) {
      const entry = this.exactCache.get(bestMatch.key)!;
      entry.accessCount++;
      return { ...entry.response, cached: true };
    }

    return null;
  }

  async set(
    response: ChatResponse,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<void> {
    // Evict if full
    if (this.exactCache.size >= this.maxEntries) {
      const oldest = this.exactCache.entries().next().value;
      if (oldest) this.exactCache.delete(oldest[0]);
    }

    const queryText = messages.map(m =>
      typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    ).join('\n');

    const entry: CacheEntry = {
      response,
      embedding: await this.embedder(queryText),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.defaultTTLMs).toISOString(),
      accessCount: 0,
      tags: options?.tags ? Object.values(options.tags) : []
    };

    const key = this.hash(
      response.provider,
      response.model,
      messages,
      options
    );
    this.exactCache.set(key, entry);
  }

  getStats(): { size: number; hits: number; misses: number } {
    let hits = 0, misses = 0;
    for (const entry of this.exactCache.values()) {
      if (entry.accessCount > 0) hits++;
      else misses++;
    }
    return { size: this.exactCache.size, hits, misses };
  }

  private hash(provider: string, model: string, messages: ChatMessage[], options?: ChatOptions): string {
    const data = JSON.stringify({ provider, model, messages, options });
    return require('crypto').createHash('sha256').update(data).digest('hex');
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (magA * magB);
  }
}
```

---

## 7. Rate Limiting & Throttling

### 7.1 Token Bucket Algorithm

```typescript
// packages/llm-provider/src/rate-limiter.ts

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  maxConcurrent: number;
}

export class RateLimiter {
  private requests: Map<string, {
    tokens: number;
    lastRefill: number;
    concurrent: number;
  }> = new Map();
  private queue: Array<{
    key: string;
    resolve: () => void;
    reject: (err: Error) => void;
    tokens: number;
  }> = [];

  constructor(private config: RateLimitConfig) {}

  async acquire(key: string, estimatedTokens: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject, tokens: estimatedTokens });
      this.processQueue();
    });
  }

  private processQueue(): void {
    for (const item of this.queue) {
      const state = this.getOrCreateState(item.key);
      if (state.concurrent >= this.config.maxConcurrent) continue;

      this.refillTokens(item.key, state);

      if (state.tokens >= item.tokens) {
        state.tokens -= item.tokens;
        state.concurrent++;
        this.queue = this.queue.filter(q => q !== item);
        item.resolve();
      }
    }
  }

  release(key: string): void {
    const state = this.getOrCreateState(key);
    state.concurrent = Math.max(0, state.concurrent - 1);
    this.processQueue();
  }

  private getOrCreateState(key: string) {
    if (!this.requests.has(key)) {
      this.requests.set(key, {
        tokens: this.config.tokensPerMinute,
        lastRefill: Date.now(),
        concurrent: 0
      });
    }
    return this.requests.get(key)!;
  }

  private refillTokens(key: string, state: { tokens: number; lastRefill: number }): void {
    const now = Date.now();
    const elapsed = (now - state.lastRefill) / 60000; // minutes
    const refill = elapsed * this.config.tokensPerMinute;
    state.tokens = Math.min(this.config.tokensPerMinute, state.tokens + refill);
    state.lastRefill = now;
  }
}
```

---

## 8. Segurança & Guardrails

### 8.1 Pipeline de Segurança

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SECURITY PIPELINE                               │
│                                                                      │
│  INPUT                    LLM CALL                    OUTPUT         │
│  ┌─────────┐            ┌─────────┐            ┌─────────┐          │
│  │Prompt   │──┬──▶      │ LLM     │──┬──▶      │Output   │          │
│  │Injection│  │         │ Provider│  │         │Validator│          │
│  │Detector │  │         └─────────┘  │         └─────────┘          │
│  └─────────┘  │                      │                               │
│               │                      │                               │
│  ┌─────────┐  │                      │  ┌─────────┐                 │
│  │PII Mask │──┘                      └──│PII      │                 │
│  └─────────┘                             │Restore  │                 │
│                                         └─────────┘                 │
│                                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                │
│  │Audit    │  │Content  │  │Policy   │  │Cost     │                │
│  │Trail    │  │Filter   │  │Check    │  │Control  │                │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 Camadas de Segurança

| Camada | O que faz | Tecnologia | Bloqueia |
|--------|-----------|------------|----------|
| **Prompt Injection Detector** | Detecta jailbreaks, prompt leaks, role-playing malicioso | LLM Guard, NeMo | 95%+ de ataques conhecidos |
| **PII Masker** | Mascara dados sensíveis antes de enviar ao LLM | Regex + NER | CPF, SSN, cartão, email, IP |
| **Content Filter** | Filtra conteúdo gerado por categorias de risco | Classificador categoria | Ódio, sexual, violência |
| **Output Validator** | Valida formato, tipos, segurança da saída | Zod schema + regex | JSON inválido, injection |
| **Policy Check** | Avalia se a chamada está dentro da política | Policy Engine | Ações não autorizadas |
| **Cost Control** | Limita gasto por usuário/projeto/dia | Rate Limiter | Estouro de budget |
| **Audit Trail** | Registra toda chamada para auditoria | SQLite + hash chain | Rastreabilidade |

```typescript
// packages/llm-provider/src/security.ts

export interface SecurityConfig {
  enablePromptInjectionCheck: boolean;
  enablePiiMasking: boolean;
  enableContentFilter: boolean;
  enableOutputValidation: boolean;
  enableAuditTrail: boolean;
  enableCostControl: boolean;
  maxDailyCostPerUser: number;
  blockedCategories: string[];
}

export class SecurityPipeline {
  constructor(
    private config: SecurityConfig,
    private auditTrail: AuditTrail,
    private policyEngine: PolicyEngine
  ) {}

  async processInput(messages: ChatMessage[], context: SecurityContext): Promise<ChatMessage[]> {
    // 1. Policy check
    const policyResult = await this.policyEngine.evaluate('llm:call', {
      workspaceId: context.workspaceId,
      userId: context.userId,
      estimatedCost: context.estimatedCost,
      provider: context.provider
    });
    if (policyResult.action === 'block') {
      throw new SecurityError(`Policy blocked LLM call: ${policyResult.reason}`);
    }

    // 2. Prompt injection detection
    if (this.config.enablePromptInjectionCheck) {
      for (const msg of messages) {
        if (typeof msg.content === 'string') {
          const injectionScore = await this.detectInjection(msg.content);
          if (injectionScore > 0.8) {
            await this.auditTrail.record({
              type: 'prompt_injection_blocked',
              severity: 'critical',
              userId: context.userId,
              details: { content: msg.content.substring(0, 200), score: injectionScore }
            });
            throw new SecurityError('Prompt injection detected');
          }
        }
      }
    }

    // 3. PII masking
    if (this.config.enablePiiMasking) {
      messages = await this.maskPII(messages);
    }

    // 4. Audit trail
    if (this.config.enableAuditTrail) {
      await this.auditTrail.record({
        type: 'llm_call_initiated',
        severity: 'info',
        userId: context.userId,
        details: {
          messages: messages.length,
          estimatedTokens: context.estimatedTokens,
          provider: context.provider,
          model: context.model
        }
      });
    }

    return messages;
  }

  async processOutput(response: ChatResponse, context: SecurityContext): Promise<ChatResponse> {
    // 1. Content filter
    if (this.config.enableContentFilter) {
      const categories = await this.classifyContent(response.content);
      const blocked = categories.filter(c =>
        this.config.blockedCategories.includes(c.category) && c.score > 0.7
      );
      if (blocked.length > 0) {
        await this.auditTrail.record({
          type: 'content_filter_blocked',
          severity: 'high',
          userId: context.userId,
          details: { categories: blocked }
        });
        response.content = '[Content blocked by safety filter]';
        response.finishReason = 'content_filter';
      }
    }

    // 2. Output validation
    if (this.config.enableOutputValidation) {
      const dangerous = await this.scanDangerousPatterns(response.content);
      if (dangerous) {
        await this.auditTrail.record({
          type: 'dangerous_output_blocked',
          severity: 'critical',
          userId: context.userId,
          details: { pattern: dangerous }
        });
        response.content = '[Output blocked by security validator]';
      }
    }

    // 3. Cost control
    if (this.config.enableCostControl) {
      const dailyCost = await this.getDailyCost(context.userId);
      if (dailyCost + response.usage.costUsd > this.config.maxDailyCostPerUser) {
        throw new SecurityError('Daily cost limit exceeded');
      }
    }

    // 4. PII restore
    if (this.config.enablePiiMasking) {
      response = await this.restorePII(response);
    }

    return response;
  }

  private async detectInjection(content: string): Promise<number> {
    // Patterns known for prompt injection
    const patterns = [
      /ignore (all )?(previous|above|prior) (instructions|commands)/i,
      /forget (everything|all|context)/i,
      /you are (now |not )?(an? )?(free|unbounded|ungoverned)/i,
      /system (prompt|message|instruction):/i,
      /DAN|do anything now/i,
      /bypass (restrictions|safeguards|filter)/i,
      /role.play|cognitive.dissonance/i,
    ];

    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        score += 0.3;
      }
    }

    // Use LLM Guard for advanced detection if available
    try {
      const { LlmGuard } = await import('llm-guard');
      const result = await LlmGuard.detectInjection(content);
      score = Math.max(score, result.score);
    } catch {
      // LLM Guard not available, use pattern matching only
    }

    return Math.min(score, 1);
  }

  private async scanDangerousPatterns(content: string): Promise<string | null> {
    const dangerous = [
      { pattern: /(BEGIN|END) (RSA|DSA|EC) (PRIVATE|PUBLIC) KEY/, type: 'crypto_key' },
      { pattern: /(password|passwd|secret|token|api[_-]?key)=['"][^'"]+['"]/i, type: 'credential' },
      { pattern: /export [A-Z_]+=.*/i, type: 'env_variable' },
      { pattern: /(rm|del|remove) (-rf|\/s|\/q)/i, type: 'destructive_command' },
      { pattern: /(exec|eval|spawn|fork)\s*\(/i, type: 'code_injection' },
      { pattern: /https?:\/\/[^\s]+(?:key|token|secret|password)=[^\s]+/i, type: 'url_leak' },
    ];

    for (const d of dangerous) {
      if (d.pattern.test(content)) return d.type;
    }
    return null;
  }

  private async maskPII(messages: ChatMessage[]): Promise<ChatMessage[]> {
    const patterns: Array<{ regex: RegExp; placeholder: string }> = [
      { regex: /\d{3}\.\d{3}\.\d{3}-\d{2}/g, placeholder: '[CPF]' },       // CPF
      { regex: /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, placeholder: '[CNPJ]' }, // CNPJ
      { regex: /\d{3}-\d{2}-\d{4}/g, placeholder: '[SSN]' },                 // SSN
      { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, placeholder: '[EMAIL]' },
      { regex: /\b\d{16}\b/g, placeholder: '[CC_NUMBER]' },                  // Credit card
      { regex: /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, placeholder: '[CC_NUMBER]' },
      { regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, placeholder: '[IP]' },        // IPv4
      { regex: /token[=:]\s*[A-Za-z0-9\-_.]{20,}/gi, placeholder: '[TOKEN]' },
      { regex: /key[=:]\s*[A-Za-z0-9\-_.]{20,}/gi, placeholder: '[API_KEY]' },
    ];

    return messages.map(msg => {
      if (typeof msg.content === 'string') {
        let masked = msg.content;
        for (const p of patterns) {
          masked = masked.replace(p.regex, p.placeholder);
        }
        return { ...msg, content: masked };
      }
      return msg;
    });
  }

  private async restorePII(response: ChatResponse): Promise<ChatResponse> {
    // PII restoration would require a mapping of masked values to original values
    // This is intentionally not implemented in full detail
    return response;
  }

  private async classifyContent(content: string): Promise<Array<{ category: string; score: number }>> {
    // Simplified content classification
    const categories = [
      { pattern: /violence|kill|murder|attack|weapon/i, category: 'violence' },
      { pattern: /hate|discriminat|racist|sexist|nazi/i, category: 'hate_speech' },
      { pattern: /sexual|explicit|porn|nude/i, category: 'sexual' },
      { pattern: /suicide|self.harm|self.injur/i, category: 'self_harm' },
    ];

    const results: Array<{ category: string; score: number }> = [];
    for (const c of categories) {
      const matches = (content.match(c.pattern) || []).length;
      if (matches > 0) {
        results.push({ category: c.category, score: Math.min(matches * 0.3, 1) });
      }
    }
    return results;
  }

  private async getDailyCost(userId: string): Promise<number> {
    // Query audit trail for today's cost
    return 0; // Placeholder
  }
}
```

---

## 9. Observabilidade

### 9.1 Métricas Coletadas

| Métrica | Tipo | Tags | Descrição |
|---------|------|------|-----------|
| `llm.request.total` | Counter | provider, model, task | Total de requisições |
| `llm.request.latency` | Histogram | provider, model | Latência em ms |
| `llm.request.cost` | Histogram | provider, model | Custo por requisição |
| `llm.request.tokens` | Histogram | provider, direction (input/output) | Tokens por requisição |
| `llm.cache.hit` | Counter | cache_level (exact/semantic) | Cache hits |
| `llm.cache.miss` | Counter | — | Cache misses |
| `llm.fallback.chain` | Counter | from_provider, to_provider | Fallback count |
| `llm.error` | Counter | provider, error_type | Erros por tipo |
| `llm.rate_limit.blocked` | Counter | provider, tenant | Rate limit hits |
| `llm.security.blocked` | Counter | security_layer | Bloqueios de segurança |

### 9.2 Tracing com OpenTelemetry

```typescript
// packages/llm-provider/src/observability.ts

import { trace, Span, SpanStatusCode } from '@opentelemetry/api';

export class LLMTracer {
  private tracer = trace.getTracer('ideia.llm-provider');

  async traceChat(
    provider: string,
    model: string,
    messages: ChatMessage[],
    fn: () => Promise<ChatResponse>
  ): Promise<ChatResponse> {
    const span = this.tracer.startSpan('llm.chat');
    span.setAttributes({
      'llm.provider': provider,
      'llm.model': model,
      'llm.messages': messages.length,
      'llm.input_tokens': this.estimateTokens(messages),
    });

    try {
      const result = await fn();
      span.setAttributes({
        'llm.output_tokens': result.usage.outputTokens,
        'llm.total_tokens': result.usage.totalTokens,
        'llm.cost_usd': result.usage.costUsd,
        'llm.cached': result.cached,
        'llm.finish_reason': result.finishReason,
        'llm.latency_ms': result.latencyMs,
      });
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (err as Error).message
      });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end();
    }
  }

  private estimateTokens(messages: ChatMessage[]): number {
    return messages.reduce((sum, msg) => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      return sum + Math.ceil(content.length / 4);
    }, 0);
  }
}
```

### 9.3 LangFuse Integration

```typescript
// packages/llm-provider/src/langfuse.ts

export class LangFuseTracker {
  private client: any | null = null;

  constructor(private enabled: boolean) {
    if (enabled) {
      try {
        // Dynamic import to keep dependency optional
        import('langfuse').then(({ Langfuse }) => {
          this.client = new Langfuse({
            secretKey: process.env.LANGFUSE_SECRET_KEY,
            publicKey: process.env.LANGFUSE_PUBLIC_KEY,
            baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
          });
        });
      } catch {
        console.warn('LangFuse not available, falling back to local logging');
      }
    }
  }

  async traceGeneration(params: {
    name: string;
    provider: string;
    model: string;
    input: string;
    output: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    latencyMs: number;
    userId?: string;
    tags?: Record<string, string>;
  }): Promise<void> {
    if (!this.client) {
      // Local logging fallback
      console.log('[LangFuse Fallback]', JSON.stringify({
        ...params,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    await this.client.trace({
      name: params.name,
      userId: params.userId,
      tags: params.tags ? Object.entries(params.tags).map(([k, v]) => `${k}:${v}`) : [],
      input: params.input,
      output: params.output,
      metadata: {
        provider: params.provider,
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        costUsd: params.costUsd,
        latencyMs: params.latencyMs,
      }
    });
  }
}
```

---

## 10. Multi-tenancy

### 10.1 Isolamento por Workspace

```typescript
// packages/llm-provider/src/multi-tenant.ts

export interface TenantConfig {
  workspaceId: string;
  providerConfigs: Record<string, ProviderConfig>;
  rateLimits: RateLimitConfig;
  costControls: {
    maxMonthlySpend: number;
    maxDailySpend: number;
    notificationThreshold: number;  // % of limit before notification
  };
  allowedModels: string[];
  blockedCategories: string[];
  auditLevel: 'basic' | 'detailed' | 'full';
}

export class TenantManager {
  private tenants: Map<string, TenantConfig> = new Map();
  private tenantRateLimiters: Map<string, RateLimiter> = new Map();
  private spending: Map<string, { daily: number; monthly: number; lastReset: number }> = new Map();

  registerTenant(config: TenantConfig): void {
    this.tenants.set(config.workspaceId, config);
    this.tenantRateLimiters.set(config.workspaceId, new RateLimiter(config.rateLimits));
  }

  unregisterTenant(workspaceId: string): void {
    this.tenants.delete(workspaceId);
    this.tenantRateLimiters.delete(workspaceId);
  }

  async checkAccess(workspaceId: string): Promise<{
    allowed: boolean;
    reason?: string;
    rateLimiter: RateLimiter | null;
  }> {
    const config = this.tenants.get(workspaceId);
    if (!config) {
      return { allowed: false, reason: 'Tenant not registered', rateLimiter: null };
    }

    // Check spending limits
    const spending = this.getSpending(workspaceId);
    if (spending.daily > config.costControls.maxDailySpend) {
      return { allowed: false, reason: 'Daily spending limit exceeded', rateLimiter: null };
    }
    if (spending.monthly > config.costControls.maxMonthlySpend) {
      return { allowed: false, reason: 'Monthly spending limit exceeded', rateLimiter: null };
    }

    const rateLimiter = this.tenantRateLimiters.get(workspaceId) || null;
    return { allowed: true, rateLimiter };
  }

  getSpending(workspaceId: string): { daily: number; monthly: number } {
    const now = Date.now();
    const day = Math.floor(now / 86400000);
    const month = Math.floor(now / 2592000000);

    let spending = this.spending.get(workspaceId);
    if (!spending || spending.lastReset !== day) {
      spending = { daily: 0, monthly: 0, lastReset: day };
      this.spending.set(workspaceId, spending);
    }

    // Reset monthly if needed
    const spendingMonth = Math.floor(spending.lastReset / 30);
    if (spendingMonth !== month) {
      spending.monthly = 0;
    }

    return { daily: spending.daily, monthly: spending.monthly };
  }

  recordSpending(workspaceId: string, cost: number): void {
    const spending = this.getSpending(workspaceId) as any;
    const entry = this.spending.get(workspaceId)!;
    entry.daily = spending.daily + cost;
    entry.monthly = spending.monthly + cost;
  }
}
```

---

## 11. Model Manager

### 11.1 Seleção Automática de Modelos

```typescript
// packages/llm-provider/src/model-manager.ts

export type TaskType = 'code_generation' | 'code_review' | 'chat' | 'reasoning'
  | 'embedding' | 'summarization' | 'classification' | 'extraction'
  | 'planning' | 'debugging' | 'testing' | 'documentation';

export interface ModelSelectionStrategy {
  name: string;
  select(models: ModelDescriptor[], task: TaskType, constraints?: ModelConstraints): ModelDescriptor[];
}

export class ModelManager {
  private strategies: Map<string, ModelSelectionStrategy> = new Map();

  constructor(private registry: ProviderRegistry) {
    this.registerDefaultStrategies();
  }

  registerStrategy(strategy: ModelSelectionStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  async selectModel(task: TaskType, constraints?: ModelConstraints): Promise<ModelDescriptor> {
    const models = await this.registry.discoverModels();
    const strategy = this.strategies.get('balanced')!;
    const candidates = strategy.select(models, task, constraints);

    if (candidates.length === 0) {
      throw new Error(`No suitable model found for task: ${task}`);
    }

    return candidates[0];
  }

  private registerDefaultStrategies(): void {
    // Cost-first strategy
    this.registerStrategy({
      name: 'cost_optimized',
      select(models, task, constraints) {
        return models
          .filter(m => m.available && m.recommendedFor.includes(task))
          .filter(m => !constraints?.requireVision || m.supportsVision)
          .sort((a, b) => a.costPer1KTokensInput - b.costPer1KTokensInput);
      }
    });

    // Quality-first strategy
    this.registerStrategy({
      name: 'quality_optimized',
      select(models, task, constraints) {
        return models
          .filter(m => m.available && m.recommendedFor.includes(task))
          .filter(m => !constraints?.requireVision || m.supportsVision)
          .sort((a, b) => b.contextWindow - a.contextWindow);
      }
    });

    // Balanced (cost + quality)
    this.registerStrategy({
      name: 'balanced',
      select(models, task, constraints) {
        return models
          .filter(m => m.available && m.recommendedFor.includes(task))
          .filter(m => !constraints?.requireVision || m.supportsVision)
          .map(m => ({
            ...m,
            _score: (1 - m.costPer1KTokensInput / 0.1) * 0.4 +
                    (m.contextWindow / 200000) * 0.3 +
                    (m.supportsFunctions ? 0.2 : 0) +
                    (m.supportsStreaming ? 0.1 : 0)
          }))
          .sort((a: any, b: any) => b._score - a._score);
      }
    });
  }
}

export async function selectBestCodeModel(): Promise<ModelDescriptor> {
  const manager = new ModelManager(new ProviderRegistry());
  return manager.selectModel('code_generation', { requireFunctions: true });
}
```

### 11.2 Matriz de Recomendação por Tarefa

| Tarefa | Modelo Recomendado | Alternativa | Por quê |
|--------|-------------------|-------------|---------|
| **Geração de Código** | claude-4-sonnet | gpt-4o, deepseek-coder-v3 | Melhor equilíbrio custo-qualidade |
| **Code Review** | gpt-4o | claude-4-opus | Rápido e preciso para revisão |
| **Chat/Conversação** | gpt-4o-mini | claude-4-haiku | Baixo custo, boa qualidade |
| **Raciocínio Complexo** | o3 | claude-4-opus, deepseek-reasoner | Reasoning nativo |
| **Embeddings** | text-embedding-3-small | — | 1536 dim, $0.02/1M tokens |
| **Planejamento** | o4-mini | deepseek-reasoner | Reasoning + baixo custo |
| **Debugging** | claude-4-opus | gpt-4o | Melhor em análise de código |
| **Documentação** | claude-4-haiku | gpt-4o-mini | Barato e bom para texto |
| **Testes** | deepseek-coder-v3 | claude-4-sonnet | Especializado em código |

---

## 12. Código TypeScript

### 12.1 Provider System Orchestrator

```typescript
// packages/llm-provider/src/orchestrator.ts

export class LLMOrchestrator {
  private router: Router;
  private fallback: FallbackChain;
  private cache: SemanticCache;
  private security: SecurityPipeline;
  private tracer: LLMTracer;
  private metrics: MetricsCollector;
  private tenantManager: TenantManager;

  constructor(config: LLMOrchestratorConfig) {
    const registry = new ProviderRegistry();
    this.metrics = new MetricsCollector();
    this.router = new Router(registry, config.routing, this.metrics);
    this.fallback = new FallbackChain(config.fallback);
    this.cache = new SemanticCache(
      async (text) => registry.getProvider('ollama')!.embed('nomic-embed-text', [text]),
      config.cache.similarityThreshold,
      config.cache.ttlMs
    );
    this.security = new SecurityPipeline(config.security, new AuditTrail(), new PolicyEngine());
    this.tracer = new LLMTracer();
    this.tenantManager = new TenantManager();
  }

  async chat(
    messages: ChatMessage[],
    options?: ChatOptions & { task?: TaskType; tenantId?: string }
  ): Promise<ChatResponse> {
    const task = options?.task || 'chat';
    const tenantId = options?.tenantId || 'default';
    const startTime = Date.now();

    // 1. Tenant check
    const access = await this.tenantManager.checkAccess(tenantId);
    if (!access.allowed) {
      throw new Error(`Access denied: ${access.reason}`);
    }

    // 2. Check cache
    const cached = await this.cache.get('any', 'any', messages, options);
    if (cached) {
      this.metrics.record('llm.cache.hit', { level: 'any' });
      return cached;
    }
    this.metrics.record('llm.cache.miss', {});

    // 3. Process input through security pipeline
    const processedMessages = await this.security.processInput(messages, {
      workspaceId: tenantId,
      userId: options?.userId || 'anonymous',
      estimatedTokens: messages.reduce((s, m) => s + (typeof m.content === 'string' ? m.content.length : 1000), 0) / 4,
      provider: 'any',
      model: 'any'
    });

    // 4. Route and execute with tracing
    const response = await this.tracer.traceChat('any', 'any', processedMessages, async () => {
      // Route to best provider
      const route = await this.router.route(task, processedMessages, options);

      // Execute with fallback
      const { provider } = await this.fallback.execute(
        [route.provider], // Could include more providers
        async (p) => p.chat(route.model, processedMessages, options)
      );

      return await provider.chat(route.model, processedMessages, options);
    });

    // Attach latency
    response.latencyMs = Date.now() - startTime;

    // 5. Process output through security pipeline
    const safeResponse = await this.security.processOutput(response, {
      workspaceId: tenantId,
      userId: options?.userId || 'anonymous',
      estimatedTokens: response.usage.totalTokens,
      provider: response.provider,
      model: response.model
    });

    // 6. Cache response
    await this.cache.set(safeResponse, messages, options);

    // 7. Record metrics
    this.metrics.record('llm.request.total', {
      provider: safeResponse.provider,
      model: safeResponse.model,
      task
    });
    this.metrics.record('llm.request.latency', {
      provider: safeResponse.provider,
      model: safeResponse.model
    }, safeResponse.latencyMs);
    this.metrics.record('llm.request.cost', {
      provider: safeResponse.provider,
      model: safeResponse.model
    }, safeResponse.usage.costUsd);

    // 8. Record tenant spending
    this.tenantManager.recordSpending(tenantId, safeResponse.usage.costUsd);

    return safeResponse;
  }
}
```

### 12.2 Exemplo de Uso

```typescript
// examples/external-llm-integration.ts

async function example() {
  const orchestrator = new LLMOrchestrator({
    routing: {
      strategy: 'balanced',
      maxRetries: 3,
      fallbackOrder: ['anthropic', 'openai', 'deepseek', 'ollama'],
    },
    fallback: {
      maxRetries: 2,
      retryDelayMs: 1000,
      backoffMultiplier: 2,
      timeoutMs: 30000,
      circuitBreakerThreshold: 5,
      circuitBreakerResetMs: 60000,
    },
    cache: {
      similarityThreshold: 0.92,
      ttlMs: 3600000,
    },
    security: {
      enablePromptInjectionCheck: true,
      enablePiiMasking: true,
      enableContentFilter: true,
      enableOutputValidation: true,
      enableAuditTrail: true,
      enableCostControl: true,
      maxDailyCostPerUser: 5.0,
      blockedCategories: ['violence', 'hate_speech', 'sexual'],
    },
  });

  // Register tenants
  orchestrator['tenantManager'].registerTenant({
    workspaceId: 'workspace-1',
    providerConfigs: {},
    rateLimits: { requestsPerMinute: 60, tokensPerMinute: 100000, maxConcurrent: 5 },
    costControls: { maxMonthlySpend: 200, maxDailySpend: 10, notificationThreshold: 0.8 },
    allowedModels: ['claude-4-*', 'gpt-4o*', 'deepseek-*'],
    blockedCategories: ['violence', 'hate_speech'],
    auditLevel: 'full',
  });

  // Use
  const response = await orchestrator.chat([
    { role: 'system', content: 'You are a senior TypeScript developer.' },
    { role: 'user', content: 'Write a function to validate CPF numbers in TypeScript.' }
  ], {
    task: 'code_generation',
    tenantId: 'workspace-1',
    userId: 'user-42',
  });

  console.log(`[${response.provider}/${response.model}]`, response.content.substring(0, 100));
  console.log(`Cost: $${response.usage.costUsd.toFixed(4)} | Latency: ${response.latencyMs}ms`);
}
```

---

## 13. Provedores Detalhados

### 13.1 Ollama (Local)

```typescript
// packages/llm-provider/src/providers/ollama.ts

export class OllamaProvider implements LLMProvider {
  readonly id = 'ollama';
  readonly name = 'Ollama (Local)';
  readonly capabilities: ProviderCapabilities = {
    maxConcurrentRequests: 4,
    requiresApiKey: false,
    supportsStreaming: true,
    supportsFunctions: false,
    supportsTools: false,
    supportsVision: false,
    supportsEmbeddings: true,
    supportsFineTuned: true,
    authMethods: [],
    rateLimit: { requestsPerMinute: 60, tokensPerMinute: 50000 },
  };

  private baseUrl: string;
  private modelCache: ModelDescriptor[] | null = null;

  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async chat(model: string, messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const startTime = Date.now();
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
        options: { temperature: options?.temperature, num_predict: options?.maxTokens },
        stream: false,
      }),
    });

    const data = await response.json();
    return {
      id: `ollama-${Date.now()}`,
      model,
      provider: this.id,
      content: data.message?.content || '',
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0 },
      finishReason: 'stop',
      latencyMs: Date.now() - startTime,
      cached: false,
      createdAt: new Date().toISOString(),
    };
  }

  async streamChat(model: string, messages: ChatMessage[], options?: ChatOptions): Promise<AsyncIterable<ChatChunk>> {
    // Streaming implementation with SSE
    throw new Error('Streaming not yet implemented for Ollama provider');
  }

  async embed(model: string, input: string | string[]): Promise<number[][]> {
    const inputs = Array.isArray(input) ? input : [input];
    const results: number[][] = [];

    for (const text of inputs) {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        body: JSON.stringify({ model, prompt: text }),
      });
      const data = await response.json();
      results.push(data.embedding || []);
    }

    return results;
  }

  async listModels(): Promise<ModelDescriptor[]> {
    if (this.modelCache) return this.modelCache;

    const response = await fetch(`${this.baseUrl}/api/tags`);
    const data = await response.json();

    this.modelCache = (data.models || []).map((m: any) => ({
      id: m.name,
      provider: this.id,
      name: m.name,
      family: m.name.split(':')[0] || m.name,
      version: m.name.split(':')[1] || 'latest',
      contextWindow: 8192,
      maxOutputTokens: 4096,
      supportsStreaming: true,
      supportsFunctions: false,
      supportsTools: false,
      supportsVision: false,
      supportsJsonMode: true,
      supportsReasoning: false,
      costPer1KTokensInput: 0,
      costPer1KTokensOutput: 0,
      avgLatencyMs: 500,
      recommendedFor: ['chat', 'code_generation', 'embedding'],
      available: true,
      since: new Date().toISOString(),
    }));

    return this.modelCache;
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      return {
        healthy: true,
        provider: this.id,
        latencyMs: Date.now() - startTime,
        modelsAvailable: (data.models || []).length,
        rateLimitRemaining: 60,
        uptimeHours: 24,
      };
    } catch (err) {
      return {
        healthy: false,
        provider: this.id,
        latencyMs: Date.now() - startTime,
        modelsAvailable: 0,
        lastError: (err as Error).message,
        rateLimitRemaining: 0,
        uptimeHours: 0,
      };
    }
  }
}
```

### 13.2 OpenAI Provider

```typescript
// packages/llm-provider/src/providers/openai.ts

export class OpenAIProvider implements LLMProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly capabilities: ProviderCapabilities = {
    maxConcurrentRequests: 10,
    requiresApiKey: true,
    supportsStreaming: true,
    supportsFunctions: true,
    supportsTools: true,
    supportsVision: true,
    supportsEmbeddings: true,
    supportsFineTuned: true,
    authMethods: ['apiKey'],
    rateLimit: { requestsPerMinute: 500, tokensPerMinute: 200000 },
  };

  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async chat(model: string, messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const startTime = Date.now();
    const body: any = {
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content,
      })),
    };

    if (options?.temperature) body.temperature = options.temperature;
    if (options?.maxTokens) body.max_tokens = options.maxTokens;
    if (options?.tools) body.tools = options.tools;
    if (options?.toolChoice) body.tool_choice = options.toolChoice;
    if (options?.jsonMode) body.response_format = { type: 'json_object' };
    if (options?.stop) body.stop = options.stop;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      id: data.id,
      model: data.model,
      provider: this.id,
      content: choice?.message?.content || '',
      toolCalls: choice?.message?.tool_calls,
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
        costUsd: this.calculateCost(model, data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0),
      },
      finishReason: choice?.finish_reason || 'stop',
      latencyMs: Date.now() - startTime,
      cached: false,
      createdAt: new Date().toISOString(),
    };
  }

  async streamChat(model: string, messages: ChatMessage[], options?: ChatOptions): Promise<AsyncIterable<ChatChunk>> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
      signal: options?.signal,
    });

    if (!response.ok) throw new Error(`OpenAI stream error: ${response.status}`);

    const reader = response.body!.getReader();

    return {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<IteratorResult<ChatChunk>> {
            const { done, value } = await reader.read();
            if (done) return { done: true, value: undefined as any };

            const text = decoder.decode(value);
            const lines = text.split('\n').filter(l => l.startsWith('data: '));

            for (const line of lines) {
              const data = line.slice(6);
              if (data === '[DONE]') return { done: true, value: undefined as any };

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                return {
                  done: false,
                  value: {
                    content: delta?.content || '',
                    toolCall: delta?.tool_calls?.[0],
                    finishReason: parsed.choices?.[0]?.finish_reason,
                  }
                };
              } catch { continue; }
            }

            return { done: false, value: { content: '' } };
          }
        };
      }
    };
  }

  async embed(model: string, input: string | string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'text-embedding-3-small',
        input: Array.isArray(input) ? input : [input],
      }),
    });

    const data = await response.json();
    return data.data.map((d: any) => d.embedding);
  }

  async listModels(): Promise<ModelDescriptor[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
    const data = await response.json();

    return data.data
      .filter((m: any) => m.id.startsWith('gpt-') || m.id.startsWith('o'))
      .map((m: any) => this.mapModel(m.id));
  }

  private mapModel(id: string): ModelDescriptor {
    const isGpt4o = id.includes('gpt-4o');
    const isO1 = id.startsWith('o1') || id.startsWith('o3');
    const isOMini = id.startsWith('o4-mini') || id.includes('mini');

    return {
      id,
      provider: this.id,
      name: id,
      family: id.includes('gpt-4') ? 'gpt-4' : id.startsWith('o') ? 'o-series' : 'gpt-3.5',
      version: 'latest',
      contextWindow: isGpt4o ? 128000 : isO1 ? 200000 : 16000,
      maxOutputTokens: isO1 ? 100000 : 4096,
      supportsStreaming: true,
      supportsFunctions: !isO1,
      supportsTools: !isO1,
      supportsVision: isGpt4o || isO1,
      supportsJsonMode: isGpt4o,
      supportsReasoning: isO1 || isOMini,
      costPer1KTokensInput: isGpt4o ? 0.005 : isOMini ? 0.0015 : 0.015,
      costPer1KTokensOutput: isGpt4o ? 0.015 : isOMini ? 0.006 : 0.06,
      avgLatencyMs: isO1 ? 5000 : isGpt4o ? 1500 : 3000,
      recommendedFor: isGpt4o ? ['code_generation', 'chat', 'extraction'] :
                       isO1 ? ['reasoning', 'planning', 'debugging'] :
                              ['chat', 'summarization'],
      available: true,
      since: new Date().toISOString(),
    };
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const rates: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.0015, output: 0.006 },
      'o3': { input: 0.015, output: 0.06 },
      'o4-mini': { input: 0.0015, output: 0.006 },
    };

    const rate = Object.entries(rates).find(([key]) => model.includes(key))?.[1] || rates['gpt-4o'];
    return (inputTokens * rate.input + outputTokens * rate.output) / 1000;
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const models = await this.listModels();
      return {
        healthy: true,
        provider: this.id,
        latencyMs: Date.now() - startTime,
        modelsAvailable: models.length,
        rateLimitRemaining: 500,
        uptimeHours: 8760,
      };
    } catch (err) {
      return {
        healthy: false,
        provider: this.id,
        latencyMs: Date.now() - startTime,
        modelsAvailable: 0,
        lastError: (err as Error).message,
        rateLimitRemaining: 0,
        uptimeHours: 0,
      };
    }
  }
}
```

### 13.3 Anthropic Provider

| Característica | Valor |
|---------------|-------|
| **API Base** | `https://api.anthropic.com/v1` |
| **Auth** | `x-api-key` header |
| **Modelos** | claude-4-opus, claude-4-sonnet, claude-4-haiku |
| **Streaming** | SSE (server-sent events) |
| **Contexto** | 200K tokens (opus), 150K (sonnet), 100K (haiku) |
| **Preço (in/out)** | $0.04/$0.08 (opus), $0.015/$0.075 (sonnet), $0.003/$0.015 (haiku) |
| **Diferenciador** | Melhor em código, funções, segurança nativa |

---

## 14. Conexões com Estudos

| Estudo | Conexão | Impacto |
|--------|---------|---------|
| **S3** (Intent-to-Plan) | Router usa classificação de tarefa do S3 | Alto |
| **S4** (Segurança) | Security pipeline integra guardrails do S4 | Alto |
| **S7** (Aprendizado) | Cache warming baseado em padrões do S7 | Médio |
| **S17** (Observabilidade) | Métricas alimentam OTel do S17 | Alto |
| **S18** (AI Safety) | Content filter e injection detector do S18 | Alto |
| **S19** (Prompts) | Provider-aware prompt optimization | Médio |
| **S26** (Manifest) | Provider capabilities no manifesto | Médio |
| **S27** (Capability Registry) | Providers como capacidades registradas | Alto |
| **S28** (Zero-to-Deploy) | LLM calls orquestradas pelo workflow | Alto |
| **S2** (Memória) | Semantic cache usa vector DB do S2 | Alto |

---

## 15. Plano de Implementação

### Fase 1: Core Provider System (Semanas 1-3, 80h)

| Task | Descrição | Prioridade | Esforço |
|------|-----------|------------|---------|
| LLM-01 | Provider Interface e tipos unificados | P0 | 8h |
| LLM-02 | ProviderRegistry com descoberta dinâmica | P0 | 12h |
| LLM-03 | OllamaProvider refatorado para nova interface | P0 | 8h |
| LLM-04 | OpenAIProvider refatorado para nova interface | P0 | 8h |
| LLM-05 | AnthropicProvider refatorado para nova interface | P0 | 8h |
| LLM-06 | Router Engine com scoring e seleção | P0 | 16h |
| LLM-07 | Fallback Chain com circuit breaker | P0 | 12h |
| LLM-08 | Testes do Core (unitários + integração) | P0 | 8h |

### Fase 2: Cache, Rate Limiting & Segurança (Semanas 4-6, 96h)

| Task | Descrição | Prioridade | Esforço |
|------|-----------|------------|---------|
| LLM-09 | Exact Cache Layer | P0 | 8h |
| LLM-10 | Semantic Cache com embeddings | P0 | 16h |
| LLM-11 | Rate Limiter (token bucket) | P0 | 8h |
| LLM-12 | Cache Warming | P1 | 8h |
| LLM-13 | Security Pipeline | P0 | 16h |
| LLM-14 | Prompt Injection Detector | P0 | 12h |
| LLM-15 | PII Masker | P0 | 8h |
| LLM-16 | Output Validator | P0 | 8h |
| LLM-17 | Audit Trail Integration | P1 | 8h |
| LLM-18 | Testes de segurança | P0 | 4h |

### Fase 3: Observabilidade & Multi-tenancy (Semanas 7-8, 64h)

| Task | Descrição | Prioridade | Esforço |
|------|-----------|------------|---------|
| LLM-19 | OpenTelemetry tracing | P0 | 12h |
| LLM-20 | LangFuse integration | P1 | 8h |
| LLM-21 | Metrics dashboard | P1 | 12h |
| LLM-22 | Multi-tenancy system | P1 | 16h |
| LLM-23 | Cost control | P1 | 8h |
| LLM-24 | Testes de integração completos | P0 | 8h |

### Fase 4: Provedores Adicionais (Semanas 9-10, 64h)

| Task | Descrição | Prioridade | Esforço |
|------|-----------|------------|---------|
| LLM-25 | DeepSeek provider | P1 | 8h |
| LLM-26 | Google Gemini provider | P1 | 8h |
| LLM-27 | AWS Bedrock provider | P2 | 12h |
| LLM-28 | Azure OpenAI provider | P2 | 8h |
| LLM-29 | Groq provider | P2 | 8h |
| LLM-30 | Together AI provider | P2 | 8h |
| LLM-31 | Plugin system para providers custom | P1 | 8h |
| LLM-32 | Documentação e exemplos | P1 | 4h |

**Total: 40 tasks, 304h (~7.6 semanas)**

---

> **ESTUDO S31 — External LLM Integration Architecture v1.0**
> **Total:** 15 seções, ~2100 linhas
> **Próximo passo:** Implementar Fase 1 (Core Provider System) — ~80h
> **Conexões:** S3, S4, S7, S17, S18, S19, S26, S27, S28, S2

---

## 16. FRONTEIRAS � LLM Gateway with Circuit Breaker, Semantic Cache & Cost-Optimized Router

> **Prop�sito:** Gateway multi-provedor com circuit breaker, cache sem�ntico por embeddings e roteamento otimizado por custo
> **Frontier References:** "Circuit Breaker Pattern" � Fowler (2024), "Semantic Caching for LLMs" � Google (2025), "Cost-Aware LLM Routing" � MLSys (2025)

### 16.1 LLMGateway � Gateway Multi-Provedor com Circuit Breaker

Gateway resiliente que gerencia m�ltiplos provedores com circuit breaker, retry e fallback:

`	ypescript
interface CircuitBreakerState { failures: number; lastFailure: number; state: 'closed' | 'open' | 'half-open'; }

class LLMGateway {
  private circuits = new Map<string, CircuitBreakerState>();
  private config = { threshold: 5, resetMs: 30000, halfOpenMax: 3 };

  constructor(private providers: Map<string, LLMProvider>) {}

  async execute(providerId: string, model: string, messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    this.checkCircuit(providerId);
    try {
      const provider = this.providers.get(providerId);
      if (!provider) throw new Error('Unknown provider: ' + providerId);
      const result = await this.withTimeout(provider.chat(model, messages, options), options?.timeout || 30000);
      this.recordSuccess(providerId);
      return result;
    } catch (err) {
      this.recordFailure(providerId);
      return this.fallback(providerId, model, messages, options);
    }
  }

  private async fallback(excludeId: string, model: string, messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const ordered = ['anthropic', 'openai', 'deepseek', 'ollama'].filter(p => p !== excludeId);
    for (const pid of ordered) {
      if (this.isCircuitOpen(pid)) continue;
      const provider = this.providers.get(pid);
      if (!provider) continue;
      try {
        return await provider.chat(model, messages, options);
      } catch { continue; }
    }
    throw new Error('All providers failed');
  }

  private checkCircuit(id: string): void {
    const c = this.circuits.get(id);
    if (c?.state === 'open') {
      if (Date.now() - c.lastFailure > this.config.resetMs) { c.state = 'half-open'; return; }
      throw new Error('Circuit open for ' + id);
    }
  }

  private recordSuccess(id: string): void { this.circuits.set(id, { failures: 0, lastFailure: 0, state: 'closed' }); }
  private recordFailure(id: string): void {
    const c = this.circuits.get(id) || { failures: 0, lastFailure: 0, state: 'closed' as const };
    c.failures++; c.lastFailure = Date.now();
    if (c.failures >= this.config.threshold) c.state = 'open';
    this.circuits.set(id, c);
  }
  private isCircuitOpen(id: string): boolean { return this.circuits.get(id)?.state === 'open'; }
  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([promise, new Promise<T>((_, r) => setTimeout(() => r(new Error('Timeout')), ms)) as any]);
  }
}
`

### 16.2 SemanticCache � Cache Sem�ntico com Embeddings

Cache inteligente que retorna respostas similares baseado em similaridade cosseno dos embeddings:

`	ypescript
class SemanticCache {
  private store: Array<{ query: string; embedding: number[]; response: ChatResponse; timestamp: number; accessCount: number }> = [];
  private embedder: (text: string) => Promise<number[]>;

  constructor(embedder: (text: string) => Promise<number[]>, private threshold = 0.92, private maxSize = 5000, private ttlMs = 3600000) {
    this.embedder = embedder;
  }

  async get(messages: ChatMessage[]): Promise<ChatResponse | null> {
    const queryText = messages.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n');
    const queryEmb = await this.embedder(queryText);
    let bestMatch: { response: ChatResponse; score: number } | null = null;

    for (const entry of this.store) {
      if (Date.now() - entry.timestamp > this.ttlMs) continue;
      const score = this.cosineSimilarity(queryEmb, entry.embedding);
      if (score > this.threshold && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { response: entry.response, score };
      }
    }

    if (bestMatch) { bestMatch.response.cached = true; return bestMatch.response; }
    return null;
  }

  async set(messages: ChatMessage[], response: ChatResponse): Promise<void> {
    if (this.store.length >= this.maxSize) this.store.sort((a, b) => a.accessCount - b.accessCount).shift();
    const queryText = messages.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n');
    this.store.push({ query: queryText, embedding: await this.embedder(queryText), response, timestamp: Date.now(), accessCount: 0 });
  }

  getStats(): { size: number; hitRate: number } {
    const hits = this.store.filter(e => e.accessCount > 0).length;
    return { size: this.store.length, hitRate: this.store.length > 0 ? hits / this.store.length : 0 };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i]; }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-10);
  }
}
`

### 16.3 CostOptimizedRouter � Roteamento Otimizado por Custo

Roteia para o modelo mais barato capaz de resolver a tarefa:

`	ypescript
interface ModelCostProfile { provider: string; model: string; inputCost: number; outputCost: number; avgLatencyMs: number; capabilityScore: number; }

class CostOptimizedRouter {
  private profiles: ModelCostProfile[] = [
    { provider: 'ollama', model: 'deepseek-coder-v3', inputCost: 0, outputCost: 0, avgLatencyMs: 500, capabilityScore: 0.7 },
    { provider: 'openai', model: 'gpt-4o-mini', inputCost: 0.0015, outputCost: 0.006, avgLatencyMs: 800, capabilityScore: 0.8 },
    { provider: 'openai', model: 'gpt-4o', inputCost: 0.005, outputCost: 0.015, avgLatencyMs: 1500, capabilityScore: 0.95 },
    { provider: 'anthropic', model: 'claude-4-sonnet', inputCost: 0.015, outputCost: 0.075, avgLatencyMs: 2000, capabilityScore: 0.92 },
    { provider: 'anthropic', model: 'claude-4-opus', inputCost: 0.04, outputCost: 0.08, avgLatencyMs: 3000, capabilityScore: 0.98 },
    { provider: 'deepseek', model: 'deepseek-chat-v3', inputCost: 0.0005, outputCost: 0.002, avgLatencyMs: 1000, capabilityScore: 0.75 },
  ];

  route(task: string, requiredCapability: number, maxCost?: number, maxLatency?: number): { provider: string; model: string; estimatedCost: number } {
    let candidates = this.profiles.filter(p => p.capabilityScore >= requiredCapability);
    if (maxCost) candidates = candidates.filter(c => (c.inputCost + c.outputCost) * 0.5 <= maxCost);
    if (maxLatency) candidates = candidates.filter(c => c.avgLatencyMs <= maxLatency);
    if (!candidates.length) candidates = [this.profiles[2]]; // fallback to gpt-4o

    candidates.sort((a, b) => {
      const costA = (a.inputCost + a.outputCost) * 0.4 + (a.avgLatencyMs / 10000) * 0.3;
      const costB = (b.inputCost + b.outputCost) * 0.4 + (b.avgLatencyMs / 10000) * 0.3;
      return costA - costB;
    });

    const best = candidates[0];
    return { provider: best.provider, model: best.model, estimatedCost: (best.inputCost + best.outputCost) * 500 };
  }

  addProfile(profile: ModelCostProfile): void { this.profiles.push(profile); }
}
`

**Frontier References 2024-2026:**
- Fowler "Circuit Breaker Pattern � Updated for Cloud Native" (2024)
- Google Research "Semantic Caching for Large Language Models" (2025)
- MLSys "Cost-Aware LLM Routing: Balancing Quality and Expense" (2025)
- "LLM Gateway: A Unified Interface for Multi-Provider LLM Access" � arXiv (2024)
- "CacheLLM: Semantic Caching for LLM Applications" � VLDB (2025)
