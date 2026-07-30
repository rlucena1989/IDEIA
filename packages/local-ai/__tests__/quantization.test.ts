import { QuantizationEngine } from '../src/quantization-engine'
import { MoERouter } from '../src/moe-router'

describe('QuantizationEngine', () => {
  let engine: QuantizationEngine

  beforeEach(() => {
    engine = new QuantizationEngine()
  })

  it('should quantize with AWQ method', async () => {
    const result = await engine.quantize('/fake/model.bin', '/tmp/quant-out', 'awq')
    expect(result.method).toBe('awq')
    expect(result.bits).toBe(4)
    expect(result.compressionRatio).toBeGreaterThan(1)
    expect(result.qualityScore).toBeGreaterThan(0.8)
  })

  it('should quantize with all methods', async () => {
    for (const method of ['gptq', 'awq', 'gguf', 'fp8', 'nf4'] as const) {
      const result = await engine.quantize('/fake/model.bin', '/tmp/quant-out', method)
      expect(result.method).toBe(method)
      expect(result.compressionRatio).toBeGreaterThan(1)
    }
  })

  it('should benchmark and sort by quality', async () => {
    const results = await engine.benchmark(['fp8', 'awq', 'nf4'], '/fake/model.bin')
    expect(results.length).toBe(3)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.qualityScore).toBeGreaterThanOrEqual(results[i]!.qualityScore)
    }
  })

  it('should estimate compression', async () => {
    const est = await engine.estimate(1_000_000_000, 'awq')
    expect(est.compressedSize).toBeLessThan(1_000_000_000)
    expect(est.ratio).toBeGreaterThan(1)
    expect(est.quality).toBeGreaterThan(0)
  })

  it('should estimate different methods correctly', async () => {
    const fp8 = await engine.estimate(1_000_000_000, 'fp8')
    const nf4 = await engine.estimate(1_000_000_000, 'nf4')
    expect(fp8.quality).toBeGreaterThan(nf4.quality)
    expect(nf4.compressedSize).toBeLessThan(fp8.compressedSize)
  })
})

describe('MoERouter', () => {
  let router: MoERouter

  beforeEach(() => {
    router = new MoERouter()
  })

  it('should register known models', () => {
    const decision = router.decide('Qwen3-Coder-Next', 64, 'high')
    expect(decision.useMoE).toBe(true)
    expect(decision.modelId).toBe('Qwen3-Coder-Next')
  })

  it('should fall back for low complexity', () => {
    const decision = router.decide('Qwen3-Coder-Next', 64, 'low')
    expect(decision.useMoE).toBe(false)
    expect(decision.fallbackToDense).toBe(true)
  })

  it('should fall back for insufficient VRAM', () => {
    const decision = router.decide('DeepSeek-V3.2', 16, 'high')
    expect(decision.useMoE).toBe(false)
    expect(decision.fallbackToDense).toBe(true)
    expect(decision.reason).toContain('Insufficient VRAM')
  })

  it('should recommend models for VRAM', () => {
    const models = router.getRecommendedForVRAM(48)
    expect(models.length).toBeGreaterThan(0)
    for (const m of models) {
      expect(m.totalParams * 0.5).toBeLessThanOrEqual(48 * 0.9)
    }
  })

  it('should handle unknown model', () => {
    const decision = router.decide('unknown-model', 64, 'high')
    expect(decision.useMoE).toBe(false)
    expect(decision.fallbackToDense).toBe(true)
  })
})
