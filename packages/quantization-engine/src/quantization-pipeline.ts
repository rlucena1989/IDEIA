import { createLogger } from '@ideia/logger'
import { EventEmitter } from 'events'
import { HardwareDetector } from './hardware'
import { CalibrationManager } from './calibration'
import { AutoGPTQBackend } from './backends/auto-gptq'
import { AutoAWQBackend } from './backends/auto-awq'
import { LlamaCppBackend } from './backends/llama-cpp'
import { VLLMBackend } from './backends/vllm'
import { BitsAndBytesNF4Backend } from './backends/bitsandbytes-nf4'
import { QuantizationBenchmark } from './benchmark'
import type {
  QuantMethod, QuantizationConfig, QuantizedModelInfo,
  QuantizationJob, BackendType, HardwareProfile, QuantizationBenchmarkResult,
} from './types'

const log = createLogger('quantization-engine:pipeline')

const DEFAULT_CONFIGS: Record<QuantMethod, Partial<QuantizationConfig>> = {
  gptq: { bits: 4, groupSize: 128, dampPercent: 0.01, descAct: false, sym: true, trueSequential: true },
  awq: { bits: 4, groupSize: 128, dampPercent: 0, descAct: true, sym: false, trueSequential: true },
  gguf: { bits: 4, groupSize: 32, dampPercent: 0, descAct: false, sym: false, trueSequential: false },
  fp8: { bits: 8, groupSize: 0, dampPercent: 0, descAct: false, sym: false, trueSequential: false },
  nf4: { bits: 4, groupSize: 64, dampPercent: 0, descAct: false, sym: false, trueSequential: false },
}

export interface QuantizationPipelineEvents {
  'job:start': (job: QuantizationJob) => void
  'job:progress': (jobId: string, progress: number) => void
  'job:complete': (result: QuantizedModelInfo) => void
  'job:error': (jobId: string, error: string) => void
}

export class QuantizationPipeline {
  private jobs: Map<string, QuantizationJob> = new Map()
  private emitter: EventEmitter = new EventEmitter()
  private hardware: HardwareDetector
  private calibration: CalibrationManager
  private benchmark: QuantizationBenchmark
  private backends: Map<BackendType, { instance: unknown; available: boolean }> = new Map()
  private jobCounter = 0

  constructor() {
    this.hardware = new HardwareDetector()
    this.calibration = new CalibrationManager()
    this.benchmark = new QuantizationBenchmark()
  }

  on<K extends keyof QuantizationPipelineEvents>(event: K, listener: QuantizationPipelineEvents[K]): void {
    this.emitter.on(event, listener as (...args: unknown[]) => void)
  }

  async initialize(): Promise<void> {
    log.info('Initializing quantization pipeline')

    const [gptq, awq, llamaCpp, vllmBackend, nf4] = await Promise.all([
      new AutoGPTQBackend().isAvailable(),
      new AutoAWQBackend().isAvailable(),
      new LlamaCppBackend().isAvailable(),
      new VLLMBackend().isAvailable(),
      new BitsAndBytesNF4Backend().isAvailable(),
    ])

    this.backends.set('auto-gptq', { instance: new AutoGPTQBackend(), available: gptq })
    this.backends.set('auto-awq', { instance: new AutoAWQBackend(), available: awq })
    this.backends.set('llama-cpp', { instance: new LlamaCppBackend(), available: llamaCpp })
    this.backends.set('vllm', { instance: new VLLMBackend(), available: vllmBackend })
    this.backends.set('bitsandbytes-nf4', { instance: new BitsAndBytesNF4Backend(), available: nf4 })

    const available = Array.from(this.backends.entries())
      .filter(([, v]) => v.available)
      .map(([k]) => k)

    log.info('Quantization backends detected', { available, count: available.length })
  }

  getAvailableBackends(): BackendType[] {
    return Array.from(this.backends.entries())
      .filter(([, v]) => v.available)
      .map(([k]) => k)
  }

  getSupportedMethods(backend?: BackendType): QuantMethod[] {
    if (backend) {
      switch (backend) {
        case 'auto-gptq': return ['gptq']
        case 'auto-awq': return ['awq']
        case 'llama-cpp': return ['gguf']
        case 'vllm': return ['awq', 'gptq', 'fp8']
        case 'bitsandbytes-nf4': return ['nf4']
        default: return []
      }
    }
    return ['awq', 'gptq', 'gguf', 'fp8', 'nf4']
  }

  async suggestBestMethod(
    modelSizeInB: number,
    hw?: HardwareProfile,
  ): Promise<{
    method: QuantMethod | 'none'
    backend: BackendType | null
    reasoning: string[]
  }> {
    const profile = hw ?? await this.hardware.detect()
    const totalVRAM = profile.gpuDevices.reduce((sum, g) => sum + g.memoryGb, 0)
    const availableBackends = this.getAvailableBackends()
    const reasoning: string[] = []

    if (availableBackends.length === 0) {
      reasoning.push('No quantization backends available — install AutoGPTQ, AutoAWQ, llama.cpp, or vLLM')
      return { method: 'none', backend: null, reasoning }
    }

    const fp16VRAM = modelSizeInB * 2
    const int4VRAM = modelSizeInB * 0.5

    if (profile.hasCuda && totalVRAM > 0) {
      if (totalVRAM >= fp16VRAM * 1.3) {
        reasoning.push(`VRAM (${totalVRAM}GB) sufficient for FP16 — no quantization needed`)
        reasoning.push('Using FP8 KV cache for memory efficiency')
        if (availableBackends.includes('vllm')) {
          return { method: 'fp8', backend: 'vllm', reasoning }
        }
        return { method: 'none', backend: null, reasoning }
      }

      if (totalVRAM >= int4VRAM * 1.3) {
        reasoning.push(`VRAM (${totalVRAM}GB) fits INT4 — AWQ recommended (best quality/speed trade-off)`)

        if (availableBackends.includes('auto-awq')) {
          return { method: 'awq', backend: 'auto-awq', reasoning }
        }
        if (availableBackends.includes('vllm')) {
          return { method: 'awq', backend: 'vllm', reasoning }
        }
        if (availableBackends.includes('auto-gptq')) {
          return { method: 'gptq', backend: 'auto-gptq', reasoning }
        }
      }

      reasoning.push(`VRAM (${totalVRAM}GB) limited — GGUF Q4_K_M via llama.cpp recommended`)
      if (availableBackends.includes('llama-cpp')) {
        return { method: 'gguf', backend: 'llama-cpp', reasoning }
      }
    }

    if (profile.hasMps) {
      reasoning.push('Apple Silicon detected — GGUF via llama.cpp recommended')
      if (availableBackends.includes('llama-cpp')) {
        return { method: 'gguf', backend: 'llama-cpp', reasoning }
      }
    }

    reasoning.push('No GPU detected — GGUF via llama.cpp (CPU) recommended')
    if (availableBackends.includes('llama-cpp')) {
      return { method: 'gguf', backend: 'llama-cpp', reasoning }
    }

    return { method: 'none', backend: null, reasoning }
  }

  async quantize(
    modelPath: string,
    outputDir: string,
    method: QuantMethod,
    customConfig?: Partial<QuantizationConfig>,
  ): Promise<QuantizedModelInfo> {
    const jobId = `q-${++this.jobCounter}-${Date.now()}`
    const defaults = DEFAULT_CONFIGS[method] || DEFAULT_CONFIGS.gptq
    const config: QuantizationConfig = {
      method,
      bits: customConfig?.bits || defaults.bits || 4,
      groupSize: customConfig?.groupSize || defaults.groupSize || 128,
      dataset: customConfig?.dataset || '',
      dampPercent: customConfig?.dampPercent ?? defaults.dampPercent ?? 0.01,
      descAct: customConfig?.descAct ?? defaults.descAct ?? false,
      sym: customConfig?.sym ?? defaults.sym ?? true,
      trueSequential: customConfig?.trueSequential ?? defaults.trueSequential ?? true,
    }

    const backend = this.selectBackend(method)
    if (!backend) {
      throw new Error(`No available backend for quantization method "${method}". Install required tools (AutoGPTQ, AutoAWQ, llama.cpp, vLLM).`)
    }

    const job: QuantizationJob = {
      id: jobId,
      modelPath,
      outputDir,
      method,
      config,
      status: 'pending',
      progress: 0,
      startedAt: Date.now(),
    }

    this.jobs.set(jobId, job)
    this.emitter.emit('job:start', job)

    try {
      job.status = 'running'
      this.emitter.emit('job:progress', jobId, 0)

      const backendInstance = (this.backends.get(backend)?.instance) as {
        quantize: (path: string, dir: string, cfg: QuantizationConfig) => Promise<QuantizedModelInfo>
      }

      const result = await backendInstance.quantize(modelPath, outputDir, config)

      result.method = method
      result.backend = backend

      job.status = 'completed'
      job.progress = 100
      job.result = result
      job.completedAt = Date.now()

      this.emitter.emit('job:progress', jobId, 100)
      this.emitter.emit('job:complete', result)

      return result
    } catch (err) {
      job.status = 'failed'
      job.error = String(err)
      job.completedAt = Date.now()
      this.emitter.emit('job:error', jobId, String(err))
      throw err
    }
  }

  async benchmarkMethods(
    modelPath: string,
    methods: QuantMethod[],
  ): Promise<QuantizationBenchmarkResult[]> {
    const results: QuantizationBenchmarkResult[] = []

    for (const method of methods) {
      try {
        const quantized = await this.quantize(modelPath, '.ai/quantization/benchmark', method)
        const benchmarkResult = await this.benchmark.run(
          modelPath, quantized.outputPath, method, quantized.backend, quantized.bits,
        )
        results.push(benchmarkResult)
      } catch (err) {
        log.error('Benchmark failed', { method, error: String(err) })
      }
    }

    return results.sort((a, b) => b.tokensPerSecond - a.tokensPerSecond)
  }

  getJob(jobId: string): QuantizationJob | undefined {
    return this.jobs.get(jobId)
  }

  listJobs(): QuantizationJob[] {
    return Array.from(this.jobs.values())
  }

  private selectBackend(method: QuantMethod): BackendType | null {
    const preferredBackends: Record<QuantMethod, BackendType[]> = {
      awq: ['auto-awq', 'vllm'],
      gptq: ['auto-gptq', 'vllm'],
      gguf: ['llama-cpp'],
      fp8: ['vllm'],
      nf4: ['bitsandbytes-nf4', 'auto-gptq'],
    }

    const candidates = preferredBackends[method] || []
    for (const backend of candidates) {
      const entry = this.backends.get(backend)
      if (entry?.available) return backend
    }

    return null
  }
}

export function createQuantizationPipeline(): QuantizationPipeline {
  return new QuantizationPipeline()
}
