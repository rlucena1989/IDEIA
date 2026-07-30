export type TaskType = 'code_generation' | 'code_review' | 'chat' | 'reasoning' | 'embedding' | 'summarization' | 'classification' | 'extraction' | 'planning' | 'debugging' | 'testing' | 'documentation'

export interface ModelDescriptor {
  id: string
  provider: string
  name: string
  family: string
  version: string
  contextWindow: number
  maxOutputTokens: number
  supportsStreaming: boolean
  supportsFunctions: boolean
  supportsTools: boolean
  supportsVision: boolean
  supportsJsonMode: boolean
  supportsReasoning: boolean
  costPer1KTokensInput: number
  costPer1KTokensOutput: number
  avgLatencyMs: number
  recommendedFor: string[]
  available: boolean
  since: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
  toolCallId?: string
}

export interface ChatResponse {
  id: string
  model: string
  provider: string
  content: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number; costUsd: number }
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error'
  latencyMs: number
  cached: boolean
  createdAt: string
}

export interface HealthStatus {
  healthy: boolean
  provider: string
  latencyMs: number
  modelsAvailable: number
  lastError?: string
  rateLimitRemaining: number
  uptimeHours: number
}

export interface LLMProvider {
  readonly id: string
  readonly name: string
  chat(model: string, messages: ChatMessage[], options?: Record<string, unknown>): Promise<ChatResponse>
  embed(model: string, input: string | string[]): Promise<number[][]>
  listModels(): Promise<ModelDescriptor[]>
  healthCheck(): Promise<HealthStatus>
}

export interface RoutingConfig {
  strategy: 'cost' | 'latency' | 'quality' | 'balanced' | 'manual'
  preferredProvider?: string
  preferredModel?: string
  maxRetries: number
  fallbackOrder: string[]
  costLimit?: number
  latencyLimit?: number
}

export interface FallbackConfig {
  maxRetries: number
  retryDelayMs: number
  backoffMultiplier: number
  timeoutMs: number
  circuitBreakerThreshold: number
  circuitBreakerResetMs: number
}

export interface TenantConfig {
  workspaceId: string
  rateLimits: { requestsPerMinute: number; tokensPerMinute: number; maxConcurrent: number }
  costControls: { maxMonthlySpend: number; maxDailySpend: number; notificationThreshold: number }
  allowedModels: string[]
  blockedCategories: string[]
  auditLevel: 'basic' | 'detailed' | 'full'
}

export interface CacheEntry {
  response: ChatResponse
  embedding?: number[]
  createdAt: string
  expiresAt: string
  accessCount: number
  tags: string[]
}

export interface ModelCostProfile {
  provider: string
  model: string
  inputCost: number
  outputCost: number
  avgLatencyMs: number
  capabilityScore: number
}
