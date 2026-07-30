import { ExpertOffloadManager, LoadBalancer, createExpertOffloadManager, createLoadBalancer } from '../src/expert-offload'
import { MoERouter, KNOWN_MOE_MODELS } from '../src/moe-router'

describe('ExpertOffloadManager', () => {
  let manager: ExpertOffloadManager
  const testModel = KNOWN_MOE_MODELS[0]!

  beforeEach(() => {
    manager = createExpertOffloadManager({ maxVramSlots: 4 })
  })

  it('should create instance', () => {
    expect(manager).toBeInstanceOf(ExpertOffloadManager)
  })

  it('should load expert to VRAM', async () => {
    await manager.loadExpert(1, testModel)
    const slots = manager.getVramSlots()
    expect(slots.size).toBe(1)
    expect(slots.get(1)?.expertId).toBe(1)
    expect(slots.get(1)?.location).toBe('vram')
  })

  it('should cache hit on repeated load', async () => {
    await manager.loadExpert(1, testModel)
    await manager.loadExpert(1, testModel)
    const metrics = manager.getMetrics()
    expect(metrics.hits).toBe(1)
    expect(metrics.misses).toBe(1)
  })

  it('should swap out LRU when full', async () => {
    for (let i = 0; i < 6; i++) {
      await manager.loadExpert(i, testModel)
    }
    const metrics = manager.getMetrics()
    expect(metrics.activeSlots).toBeLessThanOrEqual(4)
  })

  it('should unload expert', async () => {
    await manager.loadExpert(1, testModel)
    await manager.unloadExpert(1)
    const slots = manager.getVramSlots()
    expect(slots.has(1)).toBe(false)
  })

  it('should return metrics', () => {
    const metrics = manager.getMetrics()
    expect(metrics).toHaveProperty('expertUtilization')
    expect(metrics).toHaveProperty('swapRate')
    expect(metrics).toHaveProperty('hitRate')
    expect(metrics).toHaveProperty('activeSlots')
    expect(metrics).toHaveProperty('totalSlots')
  })

  it('should reset state', async () => {
    await manager.loadExpert(1, testModel)
    manager.reset()
    expect(manager.getVramSlots().size).toBe(0)
    const metrics = manager.getMetrics()
    expect(metrics.hits).toBe(0)
  })

  it('should update config', () => {
    manager.updateConfig({ maxVramSlots: 16 })
    expect(manager.getConfig().maxVramSlots).toBe(16)
  })

  it('should get active experts', async () => {
    await manager.loadExpert(1, testModel)
    const active = manager.getActiveExperts()
    expect(active.length).toBe(1)
  })
})

describe('LoadBalancer', () => {
  let balancer: LoadBalancer

  beforeEach(() => {
    balancer = createLoadBalancer()
  })

  it('should compute auxiliary loss', () => {
    const loss = balancer.computeAuxiliaryLoss([10, 10, 10, 10], 40)
    expect(loss).toBeCloseTo(0.01, 2)
  })

  it('should return higher loss for imbalanced distribution', () => {
    const balanced = balancer.computeAuxiliaryLoss([10, 10, 10, 10], 40)
    const imbalanced = balancer.computeAuxiliaryLoss([30, 5, 3, 2], 40)
    expect(imbalanced).toBeGreaterThan(balanced)
  })

  it('should compute z-loss', () => {
    const loss = balancer.computeZLoss([1, 2, 3, 4])
    expect(loss).toBeGreaterThan(0)
  })

  it('should return load balance score', () => {
    const balanced = balancer.getLoadBalanceScore([10, 10, 10, 10])
    expect(balanced).toBeCloseTo(0, 1)

    const imbalanced = balancer.getLoadBalanceScore([100, 1, 1, 1])
    expect(imbalanced).toBeGreaterThan(0.5)
  })

  it('should detect balanced distributions', () => {
    expect(balancer.isBalanced([10, 10, 10, 10])).toBe(true)
    expect(balancer.isBalanced([100, 1, 1, 1])).toBe(false)
  })
})

describe('MoERouter - Enhanced', () => {
  let router: MoERouter

  beforeEach(() => {
    router = new MoERouter()
  })

  it('should decide by complexity level N0-N2 as dense', () => {
    for (const level of ['N0', 'N1', 'N2'] as const) {
      const decision = router.decideByComplexity(level, 64)
      expect(decision.modelType).toBe('dense')
    }
  })

  it('should decide by complexity level N3-N5 as MoE when VRAM sufficient', () => {
    for (const level of ['N3', 'N4', 'N5'] as const) {
      const decision = router.decideByComplexity(level, 128)
      expect(decision.recommendedModel).toBeTruthy()
      expect(decision.maxSteps).toBeGreaterThan(0)
      expect(decision.tokenBudget).toBeGreaterThan(0)
    }
  })

  it('should provide offload config for partial VRAM', () => {
    const decision = router.decide('DeepSeek-V3.2', 200, 'high')
    expect(decision.useMoE).toBe(true)
    if (decision.expertOffloadConfig) {
      expect(decision.expertOffloadConfig.maxVramSlots).toBeGreaterThan(0)
    }
  })

  it('should suggest engine for known models', () => {
    const decision = router.decide('Mixtral-8x7B', 64, 'high')
    expect(decision.suggestedEngine).toBeTruthy()
  })

  it('should expose offload manager and load balancer', () => {
    expect(router.getOffloadManager()).toBeInstanceOf(ExpertOffloadManager)
    expect(router.getLoadBalancer()).toBeInstanceOf(LoadBalancer)
  })

  it('should register custom models', () => {
    router.registerModel({
      id: 'Custom-MoE-123B',
      totalParams: 123,
      activeParams: 5,
      numExperts: 16,
      topK: 3,
      expertsPerToken: 3,
      supportedEngines: ['vllm'],
    })
    const decision = router.decide('Custom-MoE-123B', 128, 'high')
    expect(decision.useMoE).toBe(true)
    expect(decision.modelId).toBe('Custom-MoE-123B')
  })
})
