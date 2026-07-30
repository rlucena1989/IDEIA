import { HardwareDetector } from './hardware'
import { VLLMEngine } from './vllm-engine'
import { LocalInference } from './inference'
import { HardwareBackend, InferenceEngine } from './types'
import { createLogger } from '@ideia/logger'

const log = createLogger('local-ai:optimizer')

export type InferenceEngineType = 'vllm' | 'llamacpp' | 'ollama'

export interface InferenceEngineConfig {
  engine: InferenceEngineType
  quantization: {
    weights: 'awq' | 'gptq' | 'fp8' | 'gguf' | 'none'
    kvCache: 'fp8' | 'int8' | 'none'
  }
  batching: {
    type: 'continuous' | 'static'
    maxNumSeqs: number
    maxNumBatchedTokens: number
  }
  prefixCaching: boolean
  chunkedPrefill: boolean
  speculativeDecoding?: {
    draftModel: string
    numSpeculativeTokens: number
  }
  parallelism?: {
    type: 'tensor' | 'pipeline'
    numGPUs: number
  }
}

export interface OptimizerSuggestion {
  config: InferenceEngineConfig
  expectedTokensPerSecond: number
  expectedVRAMUsage: number
  confidence: number
  reasoning: string[]
}

export interface BenchmarkResult {
  config: InferenceEngineConfig
  tokensPerSecond: number
  ttft: number
  p50: number
  p99: number
  vramUsage: number
  totalTimeMs: number
  totalTokens: number
}

const BENCHMARK_PROMPTS = [
  { text: 'Explain what is artificial intelligence in one paragraph', length: 'short' },
  { text: 'Write a TypeScript function that implements a binary search tree with insert, delete, and search operations', length: 'medium' },
  { text: 'Describe the architectural differences between REST, GraphQL, and gRPC APIs, including their use cases, performance characteristics, and best practices for each', length: 'medium' },
  { text: 'Write a comprehensive tutorial on how to implement a multi-agent system using LangGraph, including state management, tool calling, parallel execution, and error handling patterns', length: 'long' },
]

export class InferenceAutoOptimizer {
  private detector: HardwareDetector

  constructor() {
    this.detector = new HardwareDetector()
  }

  async detectHardware(): Promise<{
    platform: string
    cpuCores: number
    totalMemoryGb: number
    freeMemoryGb: number
    hasCuda: boolean
    hasRocm: boolean
    hasMps: boolean
    gpuDevices: Array<{ name: string; memoryGb: number }>
  }> {
    const info = this.detector.detect()

    let gpuDevices: Array<{ name: string; memoryGb: number }> = []
    try {
      const { execSync } = await import('child_process')
      if (info.hasCuda) {
        const output = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits 2>&1', { timeout: 5000, encoding: 'utf-8' })
        gpuDevices = output.trim().split('\n').filter(Boolean).map(line => {
          const [name, memStr] = line.split(', ')
          return { name: name?.trim() || 'unknown', memoryGb: parseFloat(memStr || '0') / 1024 }
        })
      }
    } catch { /* nvidia-smi may not be available */ }

    return {
      platform: info.platform,
      cpuCores: info.cpuCores,
      totalMemoryGb: info.totalMemoryGb,
      freeMemoryGb: info.freeMemoryGb,
      hasCuda: info.hasCuda,
      hasRocm: info.hasRocm,
      hasMps: info.hasMps,
      gpuDevices,
    }
  }

  async suggestConfig(modelSizeInB: number): Promise<OptimizerSuggestion> {
    const hw = await this.detectHardware()
    const totalVRAM = hw.gpuDevices.reduce((sum, g) => sum + g.memoryGb, 0)
    const reasoning: string[] = []
    let engine: InferenceEngineType = 'ollama'
    let weightsQuantization: InferenceEngineConfig['quantization']['weights'] = 'none'
    let kvQuantization: InferenceEngineConfig['quantization']['kvCache'] = 'none'
    let prefixCaching = false
    let chunkedPrefill = false
    let maxNumSeqs = 4
    let maxNumBatchedTokens = 2048
    let expectedTokensPerSecond = 10
    let expectedVRAM = modelSizeInB * 2

    if (hw.hasCuda && totalVRAM > 0) {
      const fp16VRAM = modelSizeInB * 2
      const int4VRAM = modelSizeInB * 0.5

      if (totalVRAM >= fp16VRAM * 1.3) {
        engine = 'vllm'
        weightsQuantization = 'none'
        kvQuantization = 'fp8'
        prefixCaching = true
        chunkedPrefill = true
        maxNumSeqs = Math.min(256, Math.floor(totalVRAM / modelSizeInB) * 8)
        maxNumBatchedTokens = Math.min(8192, maxNumSeqs * 512)
        expectedTokensPerSecond = 50 + modelSizeInB * 5
        expectedVRAM = fp16VRAM * 1.2
        reasoning.push(`GPU VRAM (${totalVRAM}GB) suficiente para FP16 — usando vLLM com performance máxima`)
      } else if (totalVRAM >= int4VRAM * 1.3) {
        engine = 'vllm'
        weightsQuantization = 'awq'
        kvQuantization = 'fp8'
        prefixCaching = true
        chunkedPrefill = true
        maxNumSeqs = Math.min(64, Math.floor(totalVRAM / int4VRAM) * 4)
        maxNumBatchedTokens = Math.min(4096, maxNumSeqs * 512)
        expectedTokensPerSecond = 30 + modelSizeInB * 3
        expectedVRAM = int4VRAM * 1.3
        reasoning.push(`GPU VRAM (${totalVRAM}GB) com AWQ INT4 — boa relação qualidade/performance`)
      } else {
        engine = 'ollama'
        weightsQuantization = 'gguf'
        maxNumSeqs = 1
        reasoning.push(`GPU VRAM (${totalVRAM}GB) insuficiente para modelo ${modelSizeInB}B — usando Ollama GGUF`)
        expectedTokensPerSecond = 5 + modelSizeInB
      }
    } else if (hw.hasMps) {
      engine = 'ollama'
      weightsQuantization = 'gguf'
      reasoning.push('Apple Silicon detectado — Ollama com MPS')
      expectedTokensPerSecond = 8 + modelSizeInB
    } else {
      engine = 'ollama'
      weightsQuantization = 'gguf'
      reasoning.push('Sem GPU — CPU-only com Ollama GGUF')
      expectedTokensPerSecond = 2 + modelSizeInB * 0.5
    }

    if (totalVRAM >= 16) {
      reasoning.push(`${modelSizeInB}B com speculative decoding: draft Qwen2.5-0.5B → ~1.5-3× speedup`)
    }

    const config: InferenceEngineConfig = {
      engine,
      quantization: { weights: weightsQuantization, kvCache: kvQuantization },
      batching: { type: engine === 'vllm' ? 'continuous' : 'static', maxNumSeqs, maxNumBatchedTokens },
      prefixCaching,
      chunkedPrefill,
      speculativeDecoding: totalVRAM >= 16 ? { draftModel: 'Qwen2.5-0.5B', numSpeculativeTokens: 5 } : undefined,
      parallelism: totalVRAM >= 80 ? { type: 'tensor', numGPUs: Math.floor(totalVRAM / 80) || 1 } : undefined,
    }

    return {
      config,
      expectedTokensPerSecond: Math.round(expectedTokensPerSecond),
      expectedVRAMUsage: Math.round(expectedVRAM),
      confidence: hw.gpuDevices.length > 0 ? 0.9 : 0.6,
      reasoning,
    }
  }

  async benchmark(
    configs: InferenceEngineConfig[],
    quickModel: string,
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []

    for (const config of configs) {
      log.info('Benchmarking engine config', {
        engine: config.engine,
        weights: config.quantization.weights,
        kvCache: config.quantization.kvCache,
      })

      try {
        const result = await this.benchmarkSingleConfig(config, quickModel)
        results.push(result)
      } catch (err) {
        log.error('Benchmark failed for config', {
          engine: config.engine,
          error: String(err),
        })
      }
    }

    return results.sort((a, b) => b.tokensPerSecond - a.tokensPerSecond)
  }

  private async benchmarkSingleConfig(
    config: InferenceEngineConfig,
    modelName: string,
  ): Promise<BenchmarkResult> {
    const start = Date.now()
    let totalTokens = 0
    const latencies: number[] = []

    if (config.engine === 'vllm') {
      const engine = new VLLMEngine({
        model: modelName,
        quantization: config.quantization.weights !== 'none' ? config.quantization.weights : undefined,
        kvCacheDtype: config.quantization.kvCache !== 'none' ? config.quantization.kvCache : undefined,
        enablePrefixCaching: config.prefixCaching,
        enableChunkedPrefill: config.chunkedPrefill,
        maxNumSeqs: config.batching.maxNumSeqs,
        maxNumBatchedTokens: config.batching.maxNumBatchedTokens,
        speculativeModel: config.speculativeDecoding?.draftModel,
        numSpeculativeTokens: config.speculativeDecoding?.numSpeculativeTokens,
        port: 8000,
      })

      try {
        await engine.start()

        for (const prompt of BENCHMARK_PROMPTS) {
          const reqStart = Date.now()
          const result = await engine.generate({
            model: modelName,
            prompt: prompt.text,
            maxTokens: 200,
            temperature: 0,
          })
          const elapsed = Date.now() - reqStart
          latencies.push(elapsed)
          totalTokens += result.totalTokens
        }

        await engine.stop()
      } catch (err) {
        log.warn('vLLM benchmark failed, trying Ollama fallback', { error: String(err) })
        return this.benchmarkOllama(modelName, start)
      }
    } else {
      return this.benchmarkOllama(modelName, start)
    }

    const totalTime = Date.now() - start
    const sorted = [...latencies].sort((a, b) => a - b)

    return {
      config,
      tokensPerSecond: totalTime > 0 ? Math.round((totalTokens / totalTime) * 1000) : 0,
      ttft: latencies[0] || 0,
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
      vramUsage: await this.measureVRAM(),
      totalTimeMs: totalTime,
      totalTokens,
    }
  }

  private async benchmarkOllama(
    modelName: string,
    startTime: number,
  ): Promise<BenchmarkResult> {
    const inference = new LocalInference({ ollamaEndpoint: 'http://127.0.0.1:11434' })
    let totalTokens = 0
    const latencies: number[] = []

    for (const prompt of BENCHMARK_PROMPTS) {
      try {
        const reqStart = Date.now()
        const result = await inference.generate({
          model: modelName,
          prompt: prompt.text,
          maxTokens: 200,
          temperature: 0,
        })
        const elapsed = Date.now() - reqStart
        latencies.push(elapsed)
        totalTokens += result.totalTokens
      } catch {
        log.warn('Ollama inference failed for prompt', { prompt: prompt.text.slice(0, 50) })
      }
    }

    const totalTime = Date.now() - startTime
    const sorted = [...latencies].sort((a, b) => a - b)

    return {
      config: {
        engine: 'ollama',
        quantization: { weights: 'none', kvCache: 'none' },
        batching: { type: 'static', maxNumSeqs: 1, maxNumBatchedTokens: 2048 },
        prefixCaching: false,
        chunkedPrefill: false,
      },
      tokensPerSecond: totalTime > 0 ? Math.round((totalTokens / totalTime) * 1000) : 0,
      ttft: latencies[0] || 0,
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
      vramUsage: await this.measureVRAM(),
      totalTimeMs: totalTime,
      totalTokens,
    }
  }

  private async measureVRAM(): Promise<number> {
    try {
      const { execSync } = await import('child_process')
      const output = execSync(
        'nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits 2>&1',
        { timeout: 3000, encoding: 'utf-8' },
      )
      const values = output.trim().split('\n').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
      if (values.length > 0) return Math.round(values[0] / 1024 * 100) / 100
    } catch { /* no nvidia-smi */ }
    return 0
  }
}
