import { createHash, randomUUID } from 'crypto'
import { createLogger } from '@ideia/logger'
import {
  ChatMessage, ChatResponse, ModelDescriptor, ModelCostProfile,
  RoutingConfig, FallbackConfig, TenantConfig, CacheEntry, LLMProvider, HealthStatus,
} from './types'

const logger = createLogger('llm-gateway')

export class LLMProviderRouter {
  private _providers = new Map<string, LLMProvider>()
  private _models = new Map<string, ModelDescriptor>()

  register(id: string, provider: LLMProvider): void {
    this._providers.set(id, provider)
    logger.info('Provider registered', { id })
  }

  getProvider(id: string): LLMProvider | undefined {
    return this._providers.get(id)
  }

  listProviders(): LLMProvider[] {
    return Array.from(this._providers.values())
  }

  async syncModels(): Promise<ModelDescriptor[]> {
    const all: ModelDescriptor[] = []
    for (const provider of this._providers.values()) {
      try {
        const models = await provider.listModels()
        all.push(...models)
      } catch {
        logger.warn('Failed to sync models', { provider: provider.id })
      }
    }
    for (const m of all) {
      this._models.set(`${m.provider}:${m.id}`, m)
    }
    return all
  }

  getCandidates(task: string, constraints?: { requireVision?: boolean; requireFunctions?: boolean; maxCost?: number; maxLatency?: number }): ModelDescriptor[] {
    return Array.from(this._models.values())
      .filter(m => m.available)
      .filter(m => m.recommendedFor.includes(task))
      .filter(m => !constraints?.requireVision || m.supportsVision)
      .filter(m => !constraints?.requireFunctions || m.supportsFunctions)
      .filter(m => !constraints?.maxCost || m.costPer1KTokensInput <= constraints.maxCost)
      .filter(m => !constraints?.maxLatency || m.avgLatencyMs <= constraints.maxLatency)
      .sort((a, b) => a.costPer1KTokensInput - b.costPer1KTokensInput)
  }
}

export class FallbackChain {
  private _circuits = new Map<string, { failures: number; lastFailure: number; state: 'closed' | 'open' | 'half-open' }>()

  constructor(private _config: FallbackConfig) {}

  async execute(providers: LLMProvider[], fn: (p: LLMProvider) => Promise<ChatResponse>): Promise<{ result: ChatResponse; provider: LLMProvider }> {
    let lastError: Error | null = null
    for (const provider of providers) {
      if (!this._canAttempt(provider.id)) continue
      for (let attempt = 0; attempt < this._config.maxRetries; attempt++) {
        try {
          const result = await this._withTimeout(fn(provider), this._config.timeoutMs)
          this._recordSuccess(provider.id)
          return { result, provider }
        } catch (err) {
          lastError = err as Error
          this._recordFailure(provider.id)
          if (attempt < this._config.maxRetries - 1) {
            await new Promise(r => setTimeout(r, this._config.retryDelayMs * Math.pow(this._config.backoffMultiplier, attempt)))
          }
        }
      }
    }
    throw new Error(`Fallback chain exhausted. Last error: ${lastError?.message}`)
  }

  private _canAttempt(providerId: string): boolean {
    const c = this._circuits.get(providerId)
    if (!c) return true
    if (c.state === 'open') {
      if (Date.now() - c.lastFailure > this._config.circuitBreakerResetMs) {
        c.state = 'half-open'
        return true
      }
      return false
    }
    return true
  }

  private _recordSuccess(providerId: string): void {
    this._circuits.set(providerId, { failures: 0, lastFailure: 0, state: 'closed' })
  }

  private _recordFailure(providerId: string): void {
    const c = this._circuits.get(providerId) || { failures: 0, lastFailure: 0, state: 'closed' as const }
    c.failures++
    c.lastFailure = Date.now()
    if (c.failures >= this._config.circuitBreakerThreshold) c.state = 'open'
    this._circuits.set(providerId, c)
  }

  private _withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))])
  }

  getCircuitState(providerId: string): string {
    return this._circuits.get(providerId)?.state ?? 'closed'
  }
}

export class SemanticCache {
  private _store: Array<{ query: string; embedding: number[]; response: ChatResponse; timestamp: number; accessCount: number }> = []

  constructor(
    private _embedder: (text: string) => Promise<number[]>,
    private _threshold = 0.92,
    private _maxSize = 5000,
    private _ttlMs = 3600000,
  ) {}

  async get(messages: ChatMessage[]): Promise<ChatResponse | null> {
    const queryText = messages.map(m => m.content).join('\n')
    const queryEmb = await this._embedder(queryText)
    let bestMatch: { response: ChatResponse; score: number } | null = null
    const now = Date.now()

    for (const entry of this._store) {
      if (now - entry.timestamp > this._ttlMs) continue
      const score = this._cosineSimilarity(queryEmb, entry.embedding)
      if (score > this._threshold && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { response: { ...entry.response, cached: true }, score }
      }
    }
    return bestMatch?.response ?? null
  }

  async set(messages: ChatMessage[], response: ChatResponse): Promise<void> {
    if (this._store.length >= this._maxSize) {
      this._store.sort((a, b) => a.accessCount - b.accessCount)
      this._store.shift()
    }
    const queryText = messages.map(m => m.content).join('\n')
    const embedding = await this._embedder(queryText)
    this._store.push({ query: queryText, embedding, response, timestamp: Date.now(), accessCount: 0 })
  }

  getStats(): { size: number; hitRate: number } {
    const hits = this._store.filter(e => e.accessCount > 0).length
    return { size: this._store.length, hitRate: this._store.length > 0 ? hits / this._store.length : 0 }
  }

  clear(): void {
    this._store = []
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      magA += a[i] * a[i]
      magB += b[i] * b[i]
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-10)
  }
}

export class RateLimiter {
  private _states = new Map<string, { tokens: number; lastRefill: number; concurrent: number }>()
  private _queue: Array<{ key: string; resolve: () => void; reject: (err: Error) => void; tokens: number }> = []

  constructor(private _config: { requestsPerMinute: number; tokensPerMinute: number; maxConcurrent: number }) {}

  async acquire(key: string, estimatedTokens: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this._queue.push({ key, resolve, reject, tokens: estimatedTokens })
      this._processQueue()
    })
  }

  release(key: string): void {
    const state = this._getState(key)
    state.concurrent = Math.max(0, state.concurrent - 1)
    this._processQueue()
  }

  private _processQueue(): void {
    for (const item of this._queue) {
      const state = this._getState(item.key)
      if (state.concurrent >= this._config.maxConcurrent) continue
      this._refill(item.key, state)
      if (state.tokens >= item.tokens) {
        state.tokens -= item.tokens
        state.concurrent++
        this._queue = this._queue.filter(q => q !== item)
        item.resolve()
      }
    }
  }

  private _getState(key: string): { tokens: number; lastRefill: number; concurrent: number } {
    if (!this._states.has(key)) {
      this._states.set(key, { tokens: this._config.tokensPerMinute, lastRefill: Date.now(), concurrent: 0 })
    }
    return this._states.get(key)!
  }

  private _refill(key: string, state: { tokens: number; lastRefill: number }): void {
    const now = Date.now()
    const elapsed = (now - state.lastRefill) / 60000
    const refill = elapsed * this._config.tokensPerMinute
    state.tokens = Math.min(this._config.tokensPerMinute, state.tokens + refill)
    state.lastRefill = now
  }

  getState(key: string): { tokens: number; concurrent: number } {
    const s = this._getState(key)
    return { tokens: s.tokens, concurrent: s.concurrent }
  }
}

export class MultiTenantManager {
  private _tenants = new Map<string, TenantConfig>()
  private _rateLimiters = new Map<string, RateLimiter>()
  private _spending = new Map<string, { daily: number; monthly: number; lastReset: number }>()

  registerTenant(config: TenantConfig): void {
    this._tenants.set(config.workspaceId, config)
    this._rateLimiters.set(config.workspaceId, new RateLimiter(config.rateLimits))
    logger.info('Tenant registered', { workspaceId: config.workspaceId })
  }

  unregisterTenant(workspaceId: string): void {
    this._tenants.delete(workspaceId)
    this._rateLimiters.delete(workspaceId)
    this._spending.delete(workspaceId)
  }

  getTenant(workspaceId: string): TenantConfig | undefined {
    return this._tenants.get(workspaceId)
  }

  getRateLimiter(workspaceId: string): RateLimiter | undefined {
    return this._rateLimiters.get(workspaceId)
  }

  async checkAccess(workspaceId: string): Promise<{ allowed: boolean; reason?: string }> {
    const config = this._tenants.get(workspaceId)
    if (!config) return { allowed: false, reason: 'Tenant not registered' }
    const spending = this._getSpending(workspaceId)
    if (spending.daily > config.costControls.maxDailySpend) return { allowed: false, reason: 'Daily spending limit exceeded' }
    if (spending.monthly > config.costControls.maxMonthlySpend) return { allowed: false, reason: 'Monthly spending limit exceeded' }
    return { allowed: true }
  }

  recordSpending(workspaceId: string, cost: number): void {
    const s = this._getSpending(workspaceId)
    this._spending.set(workspaceId, { ...s, daily: s.daily + cost, monthly: s.monthly + cost })
  }

  private _getSpending(workspaceId: string): { daily: number; monthly: number; lastReset: number } {
    const now = Date.now()
    const day = Math.floor(now / 86400000)
    let s = this._spending.get(workspaceId)
    if (!s || s.lastReset !== day) {
      s = { daily: 0, monthly: 0, lastReset: day }
      this._spending.set(workspaceId, s)
    }
    return s
  }
}

export class ModelManager {
  private _strategies = new Map<string, { name: string; select: (models: ModelDescriptor[], task: string, constraints?: Record<string, unknown>) => ModelDescriptor[] }>()

  constructor(private _router: LLMProviderRouter) {
    this._registerDefaults()
  }

  registerStrategy(name: string, select: (models: ModelDescriptor[], task: string, constraints?: Record<string, unknown>) => ModelDescriptor[]): void {
    this._strategies.set(name, { name, select })
  }

  async selectModel(task: string, constraints?: Record<string, unknown>, strategyName = 'balanced'): Promise<ModelDescriptor> {
    const models = await this._router.syncModels()
    const strategy = this._strategies.get(strategyName)
    if (!strategy) throw new Error(`Unknown strategy: ${strategyName}`)
    const candidates = strategy.select(models, task, constraints)
    if (candidates.length === 0) throw new Error(`No suitable model for task: ${task}`)
    return candidates[0]
  }

  private _registerDefaults(): void {
    this.registerStrategy('cost_optimized', (models, task, constraints) =>
      models.filter(m => m.available && m.recommendedFor.includes(task))
        .filter(m => !constraints?.requireVision || m.supportsVision)
        .sort((a, b) => a.costPer1KTokensInput - b.costPer1KTokensInput))

    this.registerStrategy('quality_optimized', (models, task, constraints) =>
      models.filter(m => m.available && m.recommendedFor.includes(task))
        .filter(m => !constraints?.requireVision || m.supportsVision)
        .sort((a, b) => b.contextWindow - a.contextWindow))

    this.registerStrategy('balanced', (models, task, constraints) =>
      models.filter(m => m.available && m.recommendedFor.includes(task))
        .filter(m => !constraints?.requireVision || m.supportsVision)
        .map(m => ({ ...m, _score: (1 - m.costPer1KTokensInput / 0.1) * 0.4 + (m.contextWindow / 200000) * 0.3 + (m.supportsFunctions ? 0.2 : 0) + (m.supportsStreaming ? 0.1 : 0) }))
        .sort((a: any, b: any) => b._score - a._score))
  }
}

export class LLMGateway {
  private _circuits = new Map<string, { failures: number; lastFailure: number; state: 'closed' | 'open' | 'half-open' }>()
  private _threshold = 5
  private _resetMs = 30000

  constructor(private _providers: Map<string, LLMProvider>) {}

  async execute(providerId: string, model: string, messages: ChatMessage[], options?: Record<string, unknown>): Promise<ChatResponse> {
    this._checkCircuit(providerId)
    try {
      const provider = this._providers.get(providerId)
      if (!provider) throw new Error(`Unknown provider: ${providerId}`)
      const result = await this._withTimeout(provider.chat(model, messages, options), (options?.timeout as number) || 30000)
      this._recordSuccess(providerId)
      return result
    } catch (err) {
      this._recordFailure(providerId)
      return this._fallback(providerId, model, messages, options)
    }
  }

  private async _fallback(excludeId: string, model: string, messages: ChatMessage[], options?: Record<string, unknown>): Promise<ChatResponse> {
    const ordered = ['anthropic', 'openai', 'deepseek', 'ollama'].filter(p => p !== excludeId)
    for (const pid of ordered) {
      if (this._isCircuitOpen(pid)) continue
      const provider = this._providers.get(pid)
      if (!provider) continue
      try {
        return await provider.chat(model, messages, options)
      } catch { continue }
    }
    throw new Error('All providers failed')
  }

  private _checkCircuit(id: string): void {
    const c = this._circuits.get(id)
    if (c?.state === 'open') {
      if (Date.now() - c.lastFailure > this._resetMs) { c.state = 'half-open'; return }
      throw new Error(`Circuit open for ${id}`)
    }
  }

  private _recordSuccess(id: string): void {
    this._circuits.set(id, { failures: 0, lastFailure: 0, state: 'closed' })
  }

  private _recordFailure(id: string): void {
    const c = this._circuits.get(id) || { failures: 0, lastFailure: 0, state: 'closed' as const }
    c.failures++
    c.lastFailure = Date.now()
    if (c.failures >= this._threshold) c.state = 'open'
    this._circuits.set(id, c)
  }

  private _isCircuitOpen(id: string): boolean {
    return this._circuits.get(id)?.state === 'open'
  }

  private _withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))])
  }

  getCircuitState(providerId: string): string {
    return this._circuits.get(providerId)?.state ?? 'closed'
  }

  resetCircuit(providerId: string): void {
    this._circuits.delete(providerId)
  }
}

export class CostOptimizedRouter {
  private _profiles: ModelCostProfile[] = [
    { provider: 'ollama', model: 'deepseek-coder-v3', inputCost: 0, outputCost: 0, avgLatencyMs: 500, capabilityScore: 0.7 },
    { provider: 'openai', model: 'gpt-4o-mini', inputCost: 0.0015, outputCost: 0.006, avgLatencyMs: 800, capabilityScore: 0.8 },
    { provider: 'openai', model: 'gpt-4o', inputCost: 0.005, outputCost: 0.015, avgLatencyMs: 1500, capabilityScore: 0.95 },
    { provider: 'anthropic', model: 'claude-4-sonnet', inputCost: 0.015, outputCost: 0.075, avgLatencyMs: 2000, capabilityScore: 0.92 },
    { provider: 'anthropic', model: 'claude-4-opus', inputCost: 0.04, outputCost: 0.08, avgLatencyMs: 3000, capabilityScore: 0.98 },
    { provider: 'deepseek', model: 'deepseek-chat-v3', inputCost: 0.0005, outputCost: 0.002, avgLatencyMs: 1000, capabilityScore: 0.75 },
  ]

  route(task: string, requiredCapability: number, maxCost?: number, maxLatency?: number): { provider: string; model: string; estimatedCost: number } {
    let candidates = this._profiles.filter(p => p.capabilityScore >= requiredCapability)
    if (maxCost) candidates = candidates.filter(c => (c.inputCost + c.outputCost) * 0.5 <= maxCost)
    if (maxLatency) candidates = candidates.filter(c => c.avgLatencyMs <= maxLatency)
    if (candidates.length === 0) candidates = [this._profiles[2]]
    candidates.sort((a, b) => {
      const costA = (a.inputCost + a.outputCost) * 0.4 + (a.avgLatencyMs / 10000) * 0.3
      const costB = (b.inputCost + b.outputCost) * 0.4 + (b.avgLatencyMs / 10000) * 0.3
      return costA - costB
    })
    const best = candidates[0]
    return { provider: best.provider, model: best.model, estimatedCost: (best.inputCost + best.outputCost) * 500 }
  }

  addProfile(profile: ModelCostProfile): void {
    this._profiles.push(profile)
  }

  listProfiles(): ModelCostProfile[] {
    return [...this._profiles]
  }
}
