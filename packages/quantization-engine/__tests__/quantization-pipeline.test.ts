import { QuantizationPipeline, createQuantizationPipeline } from '../src/quantization-pipeline'
import { HardwareDetector } from '../src/hardware'
import { CalibrationManager } from '../src/calibration'
import { QuantizationBenchmark } from '../src/benchmark'

describe('QuantizationPipeline', () => {
  let pipeline: QuantizationPipeline

  beforeEach(() => {
    pipeline = createQuantizationPipeline()
  })

  it('should create pipeline', () => {
    expect(pipeline).toBeInstanceOf(QuantizationPipeline)
  })

  it('should initialize with backend detection', async () => {
    await pipeline.initialize()
    const backends = pipeline.getAvailableBackends()
    expect(Array.isArray(backends)).toBe(true)
  })

  it('should return supported methods', () => {
    const methods = pipeline.getSupportedMethods()
    expect(methods).toContain('awq')
    expect(methods).toContain('gptq')
    expect(methods).toContain('gguf')
    expect(methods).toContain('fp8')
    expect(methods).toContain('nf4')
  })

  it('should return per-backend supported methods', () => {
    expect(pipeline.getSupportedMethods('auto-gptq')).toEqual(['gptq'])
    expect(pipeline.getSupportedMethods('auto-awq')).toEqual(['awq'])
    expect(pipeline.getSupportedMethods('llama-cpp')).toEqual(['gguf'])
    expect(pipeline.getSupportedMethods('vllm')).toEqual(['awq', 'gptq', 'fp8'])
  })

  it('should suggest best method based on hardware', async () => {
    const suggestion = await pipeline.suggestBestMethod(7)
    expect(suggestion).toHaveProperty('method')
    expect(suggestion).toHaveProperty('reasoning')
    expect(Array.isArray(suggestion.reasoning)).toBe(true)
  })

  it('should list jobs', () => {
    const jobs = pipeline.listJobs()
    expect(Array.isArray(jobs)).toBe(true)
  })
})

describe('HardwareDetector', () => {
  let detector: HardwareDetector

  beforeEach(() => {
    detector = new HardwareDetector()
  })

  it('should detect hardware', async () => {
    const profile = await detector.detect()
    expect(profile).toHaveProperty('platform')
    expect(profile).toHaveProperty('cpuCores')
    expect(profile).toHaveProperty('totalMemoryGb')
    expect(profile).toHaveProperty('freeMemoryGb')
    expect(profile).toHaveProperty('hasCuda')
    expect(profile).toHaveProperty('gpuDevices')
    expect(Array.isArray(profile.gpuDevices)).toBe(true)
  })

  it('should estimate max model size', () => {
    expect(detector.estimateMaxModelSize(64)).toBe('34b')
    expect(detector.estimateMaxModelSize(32)).toBe('13b')
    expect(detector.estimateMaxModelSize(16)).toBe('7b')
    expect(detector.estimateMaxModelSize(8)).toBe('3b')
    expect(detector.estimateMaxModelSize(4)).toBe('1b')
  })
})

describe('CalibrationManager', () => {
  let manager: CalibrationManager

  beforeEach(() => {
    manager = new CalibrationManager()
  })

  it('should have default datasets', () => {
    const datasets = manager.listDatasets()
    expect(datasets.length).toBeGreaterThanOrEqual(3)
    expect(datasets.some(d => d.name === 'wikitext2')).toBe(true)
    expect(datasets.some(d => d.name === 'c4')).toBe(true)
  })

  it('should register custom datasets', () => {
    manager.registerDataset({
      name: 'custom-test',
      path: '/tmp/test',
      samples: 10,
      type: 'text',
      description: 'Test dataset',
    })
    const ds = manager.getDataset('custom-test')
    expect(ds).toBeDefined()
    expect(ds!.name).toBe('custom-test')
    expect(ds!.samples).toBe(10)
  })

  it('should prepare dataset to file', async () => {
    const outputDir = '.ai/calibration-test'
    const path = await manager.prepareDataset('wikitext2', outputDir)
    expect(path).toBeTruthy()
    expect(typeof path).toBe('string')
  })

  it('should return undefined for unknown dataset', () => {
    const ds = manager.getDataset('nonexistent')
    expect(ds).toBeUndefined()
  })
})

describe('QuantizationBenchmark', () => {
  let benchmark: QuantizationBenchmark

  beforeEach(() => {
    benchmark = new QuantizationBenchmark()
  })

  it('should create benchmark instance', () => {
    expect(benchmark).toBeInstanceOf(QuantizationBenchmark)
  })
})
