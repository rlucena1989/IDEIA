import { Disposable, Event } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { AiMessage, AiTool, AiStreamChunk } from '@ideia/theia-ai';
const logger = createLogger('types');

export interface LlmProviderConfig {
  id: string;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  models?: string[];
  defaultModel?: string;
  capabilities: ProviderCapabilities;
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
  rateLimit: { requestsPerMinute: number; tokensPerMinute: number };
}

export interface LlmProvider {
  readonly id: string;
  readonly name: string;
  readonly config: LlmProviderConfig;
  chat(model: string, messages: AiMessage[], options?: ChatOptions): Promise<ChatResponse>;
  streamChat(model: string, messages: AiMessage[], options?: ChatOptions): AsyncIterable<AiStreamChunk>;
  embed(model: string, input: string | string[]): Promise<number[][]>;
  listModels(): Promise<ModelDescriptor[]>;
  healthCheck(): Promise<HealthStatus>;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: AiTool[];
  toolChoice?: 'auto' | 'any' | string;
  jsonMode?: boolean;
  stop?: string[];
  signal?: AbortSignal;
}

export interface ChatResponse {
  id: string;
  model: string;
  provider: string;
  content: string;
  toolCalls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number; costUsd: number };
  finishReason: string;
  latencyMs: number;
  cached: boolean;
  createdAt: string;
}

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
  costPer1KTokensInput: number;
  costPer1KTokensOutput: number;
  avgLatencyMs: number;
  recommendedFor: string[];
  available: boolean;
  since: string;
}

export interface HealthStatus {
  healthy: boolean;
  provider: string;
  latencyMs: number;
  modelsAvailable: number;
  rateLimitRemaining: number;
  uptimeHours: number;
  lastError?: string;
}

export interface RouterEngine {
  selectProvider(task: string, constraints?: RouterConstraints): Promise<LlmProvider>;
  registerProvider(provider: LlmProvider): Disposable;
  getProviders(): LlmProvider[];
  onProviderAdded: Event<LlmProvider>;
  onProviderRemoved: Event<string>;
}

export interface RouterConstraints {
  maxCost?: number;
  maxLatency?: number;
  requireStreaming?: boolean;
  requireFunctions?: boolean;
  requireVision?: boolean;
  requiredCapabilities?: string[];
}

export interface FallbackChain {
  execute(model: string, messages: AiMessage[], options?: ChatOptions): Promise<ChatResponse>;
  setFallbackOrder(providerIds: string[]): void;
}

export interface SemanticCache {
  get(key: string): Promise<ChatResponse | undefined>;
  set(key: string, response: ChatResponse): Promise<void>;
  invalidate(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface RateLimiter {
  checkLimit(providerId: string): Promise<boolean>;
  increment(providerId: string): Promise<void>;
  getRemainingTokens(providerId: string): Promise<number>;
}

export interface SecurityPipeline {
  validateInput(messages: AiMessage[]): Promise<AiMessage[]>;
  validateOutput(response: ChatResponse): Promise<ChatResponse>;
  detectPromptInjection(content: string): Promise<boolean>;
  maskPii(content: string): Promise<string>;
}
