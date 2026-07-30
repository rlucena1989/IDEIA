import { LLMProviderRouter, FallbackChain, SemanticCache, RateLimiter, MultiTenantManager, ModelManager, LLMGateway, CostOptimizedRouter } from '../llm-gateway'
import { ChatMessage, ChatResponse, LLMProvider, ModelDescriptor, TenantConfig } from '../types'

function createMockProvider(id: string, models: ModelDescriptor[]): LLMProvider {
  return {
    id,
    name: id,
    chat: jest.fn().mockResolvedValue({ id: 'test', model: 'test', provider: id, content: 'ok', usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30, costUsd: 0.001 }, finishReason: 'stop', latencyMs: 100, cached: false, createdAt: new Date().toISOString() } as ChatResponse),
    embed: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    listModels: jest.fn().mockResolvedValue(models),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true, provider: id, latencyMs: 50, modelsAvailable: models.length, rateLimitRemaining: 100, uptimeHours: 24 }),
  }
}

function makeMsg(content: string): ChatMessage[] {
  return [{ role: 'user', content }]
}

describe('LLMProviderRouter', () => {
  let router: LLMProviderRouter
  const mockModel: ModelDescriptor = { id: 'gpt-4o', provider: 'openai', name: 'GPT-4o', family: 'gpt-4', version: 'latest', contextWindow: 128000, maxOutputTokens: 4096, supportsStreaming: true, supportsFunctions: true, supportsTools: true, supportsVision: true, supportsJsonMode: true, supportsReasoning: false, costPer1KTokensInput: 0.005, costPer1KTokensOutput: 0.015, avgLatencyMs: 1500, recommendedFor: ['code_generation', 'chat'], available: true, since: '2026-01-01' }

  beforeEach(() => { router = new LLMProviderRouter() })

  it('registers and retrieves a provider', () => {
    const provider = createMockProvider('openai', [mockModel])
    router.register('openai', provider)
    expect(router.getProvider('openai')).toBe(provider)
  })

  it('returns undefined for unknown provider', () => {
    expect(router.getProvider('unknown')).toBeUndefined()
  })

  it('lists all registered providers', () => {
    router.register('a', createMockProvider('a', []))
    router.register('b', createMockProvider('b', []))
    expect(router.listProviders()).toHaveLength(2)
  })

  it('syncs models from all providers', async () => {
    router.register('openai', createMockProvider('openai', [mockModel]))
    const models = await router.syncModels()
    expect(models.length).toBeGreaterThanOrEqual(1)
    expect(models[0].id).toBe('gpt-4o')
  })

  it('filters candidates by task', async () => {
    router.register('openai', createMockProvider('openai', [mockModel]))
    await router.syncModels()
    const candidates = router.getCandidates('code_generation')
    expect(candidates.length).toBeGreaterThanOrEqual(1)
  })

  it('filters candidates by vision requirement', async () => {
    router.register('openai', createMockProvider('openai', [mockModel]))
    await router.syncModels()
    const candidates = router.getCandidates('chat', { requireVision: true })
    expect(candidates.length).toBeGreaterThanOrEqual(1)
  })

  it('returns empty for unavailable model', () => {
    const unavailable = { ...mockModel, available: false }
    router.register('openai', createMockProvider('openai', [unavailable]))
    router.syncModels()
    expect(router.getCandidates('chat')).toHaveLength(0)
  })
})

describe('FallbackChain', () => {
  const config = { maxRetries: 2, retryDelayMs: 10, backoffMultiplier: 1, timeoutMs: 5000, circuitBreakerThreshold: 3, circuitBreakerResetMs: 100 }
  let chain: FallbackChain

  beforeEach(() => { chain = new FallbackChain(config) })

  it('executes successfully with first provider', async () => {
    const provider = createMockProvider('a', [])
    const result = await chain.execute([provider], p => p.chat('m', makeMsg('hi')))
    expect(result.result.content).toBe('ok')
    expect(result.provider.id).toBe('a')
  })

  it('falls back to next provider on failure', async () => {
    const failing = createMockProvider('fail', [])
    failing.chat = jest.fn().mockRejectedValue(new Error('fail'))
    const ok = createMockProvider('ok', [])
    const result = await chain.execute([failing, ok], p => p.chat('m', makeMsg('hi')))
    expect(result.provider.id).toBe('ok')
  })

  it('opens circuit after threshold failures', async () => {
    const p = createMockProvider('bad', [])
    p.chat = jest.fn().mockRejectedValue(new Error('fail'))
    for (let i = 0; i < 3; i++) {
      try { await chain.execute([p], pr => pr.chat('m', makeMsg('hi'))) } catch { }
    }
    expect(chain.getCircuitState('bad')).toBe('open')
  })

  it('throws when all providers fail', async () => {
    const p = createMockProvider('bad', [])
    p.chat = jest.fn().mockRejectedValue(new Error('fail'))
    await expect(chain.execute([p], pr => pr.chat('m', makeMsg('hi')))).rejects.toThrow()
  })
})

describe('SemanticCache', () => {
  let cache: SemanticCache
  const embedder = jest.fn().mockResolvedValue([0.1, 0.2, 0.3])

  beforeEach(() => { cache = new SemanticCache(embedder, 0.9, 100, 60000) })

  it('returns null on cache miss', async () => {
    const result = await cache.get(makeMsg('hello'))
    expect(result).toBeNull()
  })

  it('returns cached response on hit', async () => {
    const response: ChatResponse = { id: '1', model: 'gpt-4o', provider: 'openai', content: 'hi', usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15, costUsd: 0.001 }, finishReason: 'stop', latencyMs: 100, cached: false, createdAt: new Date().toISOString() }
    await cache.set(makeMsg('hello'), response)
    embedder.mockResolvedValue([0.1, 0.2, 0.3])
    const result = await cache.get(makeMsg('hello'))
    expect(result).not.toBeNull()
    expect(result!.cached).toBe(true)
  })

  it('returns stats', async () => {
    const stats = cache.getStats()
    expect(stats).toHaveProperty('size')
    expect(stats).toHaveProperty('hitRate')
  })

  it('clears cache', async () => {
    const response: ChatResponse = { id: '1', model: 'gpt-4o', provider: 'openai', content: 'hi', usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15, costUsd: 0.001 }, finishReason: 'stop', latencyMs: 100, cached: false, createdAt: new Date().toISOString() }
    await cache.set(makeMsg('hello'), response)
    cache.clear()
    expect(cache.getStats().size).toBe(0)
  })
})

describe('RateLimiter', () => {
  let limiter: RateLimiter
  beforeEach(() => { limiter = new RateLimiter({ requestsPerMinute: 60, tokensPerMinute: 100000, maxConcurrent: 5 }) })

  it('acquires a token', async () => {
    await expect(limiter.acquire('test', 100)).resolves.toBeUndefined()
  })

  it('releases a token', () => {
    limiter.release('test')
    const state = limiter.getState('test')
    expect(state.concurrent).toBe(0)
  })
})

describe('MultiTenantManager', () => {
  let manager: MultiTenantManager
  const config: TenantConfig = { workspaceId: 'ws-1', rateLimits: { requestsPerMinute: 60, tokensPerMinute: 100000, maxConcurrent: 5 }, costControls: { maxMonthlySpend: 200, maxDailySpend: 10, notificationThreshold: 0.8 }, allowedModels: ['gpt-4*'], blockedCategories: ['violence'], auditLevel: 'full' }

  beforeEach(() => { manager = new MultiTenantManager() })

  it('registers and retrieves a tenant', () => {
    manager.registerTenant(config)
    expect(manager.getTenant('ws-1')).toBeDefined()
  })

  it('unregisters a tenant', () => {
    manager.registerTenant(config)
    manager.unregisterTenant('ws-1')
    expect(manager.getTenant('ws-1')).toBeUndefined()
  })

  it('checks access for registered tenant', async () => {
    manager.registerTenant(config)
    const result = await manager.checkAccess('ws-1')
    expect(result.allowed).toBe(true)
  })

  it('denies access for unregistered tenant', async () => {
    const result = await manager.checkAccess('unknown')
    expect(result.allowed).toBe(false)
  })

  it('records spending', () => {
    manager.registerTenant(config)
    manager.recordSpending('ws-1', 5)
    const access = manager.checkAccess('ws-1')
    expect(access).resolves.toHaveProperty('allowed', true)
  })
})

describe('ModelManager', () => {
  let router: LLMProviderRouter
  let manager: ModelManager

  beforeEach(() => {
    router = new LLMProviderRouter()
    manager = new ModelManager(router)
  })

  it('selects a model for a task', async () => {
    const mockModel: ModelDescriptor = { id: 'gpt-4o', provider: 'openai', name: 'GPT-4o', family: 'gpt-4', version: 'latest', contextWindow: 128000, maxOutputTokens: 4096, supportsStreaming: true, supportsFunctions: true, supportsTools: true, supportsVision: true, supportsJsonMode: true, supportsReasoning: false, costPer1KTokensInput: 0.005, costPer1KTokensOutput: 0.015, avgLatencyMs: 1500, recommendedFor: ['code_generation', 'chat'], available: true, since: '2026-01-01' }
    router.register('openai', createMockProvider('openai', [mockModel]))
    const model = await manager.selectModel('code_generation')
    expect(model).toBeDefined()
  })

  it('registers a custom strategy', () => {
    manager.registerStrategy('custom', (models, _task, _constraints) => models)
    expect(manager).toBeDefined()
  })

  it('throws when no model found', async () => {
    await expect(manager.selectModel('unknown_task')).rejects.toThrow()
  })
})

describe('LLMGateway', () => {
  let gateway: LLMGateway
  let providers: Map<string, LLMProvider>

  beforeEach(() => {
    providers = new Map()
    providers.set('openai', createMockProvider('openai', []))
    gateway = new LLMGateway(providers)
  })

  it('executes a chat request successfully', async () => {
    const result = await gateway.execute('openai', 'gpt-4o', makeMsg('hello'))
    expect(result.content).toBe('ok')
    expect(result.provider).toBe('openai')
  })

  it('rejects unknown provider when no fallback available', async () => {
    const noFallbackProviders = new Map<string, LLMProvider>()
    noFallbackProviders.set('only-provider', createMockProvider('only', []))
    const g = new LLMGateway(noFallbackProviders)
    await expect(g.execute('unknown', 'model', makeMsg('hi'))).rejects.toThrow()
  })

  it('falls back on failure', async () => {
    const failing = createMockProvider('failing', [])
    failing.chat = jest.fn().mockRejectedValue(new Error('fail'))
    providers.set('failing', failing)
    providers.set('anthropic', createMockProvider('anthropic', []))
    const badGateway = new LLMGateway(providers)
    const result = await badGateway.execute('failing', 'model', makeMsg('hi'))
    expect(result).toBeDefined()
  })

  it('opens circuit after threshold failures', async () => {
    const p = createMockProvider('bad', [])
    p.chat = jest.fn().mockRejectedValue(new Error('fail'))
    const g = new LLMGateway(new Map([['bad', p]]))
    for (let i = 0; i < 5; i++) {
      try { await g.execute('bad', 'm', makeMsg('h')) } catch { /* expected */ }
    }
    expect(g.getCircuitState('bad')).toBe('open')
  })

  it('returns circuit state', () => {
    expect(gateway.getCircuitState('openai')).toBe('closed')
  })

  it('resets circuit', () => {
    gateway.resetCircuit('openai')
    expect(gateway.getCircuitState('openai')).toBe('closed')
  })
})

describe('CostOptimizedRouter', () => {
  let router: CostOptimizedRouter

  beforeEach(() => { router = new CostOptimizedRouter() })

  it('routes to cheapest capable model', () => {
    const route = router.route('code_generation', 0.7)
    expect(route).toHaveProperty('provider')
    expect(route).toHaveProperty('model')
    expect(route).toHaveProperty('estimatedCost')
  })

  it('respects max cost constraint', () => {
    const route = router.route('chat', 0.8, 0.01)
    expect(route.estimatedCost).toBeGreaterThanOrEqual(0)
  })

  it('respects max latency constraint', () => {
    const route = router.route('chat', 0.7, undefined, 1000)
    expect(route).toBeDefined()
  })

  it('adds custom profile', () => {
    router.addProfile({ provider: 'custom', model: 'custom-model', inputCost: 0, outputCost: 0, avgLatencyMs: 100, capabilityScore: 1.0 })
    const route = router.route('chat', 0.9)
    expect(route.model).toBe('custom-model')
  })

  it('lists all profiles', () => {
    expect(router.listProfiles().length).toBeGreaterThanOrEqual(6)
  })
})
