import { spawn, ChildProcess } from 'child_process'
import { createLogger } from '@ideia/logger'
import type { InferenceEngineConfig } from './auto-optimizer'
import type { LocalInferenceConfig, LocalInferenceResult } from './types'
import * as path from 'path'

const log = createLogger('local-ai:vllm')

export interface VLLMEngineConfig {
  model: string
  quantization?: string
  kvCacheDtype?: string
  maxModelLen?: number
  gpuMemoryUtil?: number
  enablePrefixCaching?: boolean
  enableChunkedPrefill?: boolean
  speculativeModel?: string
  numSpeculativeTokens?: number
  tensorParallelSize?: number
  port?: number
  host?: string
  maxNumSeqs?: number
  maxNumBatchedTokens?: number
}

export interface VLLMStatus {
  running: boolean
  model: string
  pid?: number
  uptimeMs: number
  port: number
}

export class VLLMEngine {
  private process: ChildProcess | null = null
  private config: VLLMEngineConfig
  private port: number
  private host: string
  private startedAt: number = 0
  private ready = false

  constructor(config: VLLMEngineConfig) {
    this.config = config
    this.port = config.port || 8000
    this.host = config.host || '127.0.0.1'
  }

  async start(): Promise<void> {
    if (this.process) {
      log.warn('vLLM already running')
      return
    }

    const args = [
      this.config.model,
      '--port', String(this.port),
      '--host', this.host,
    ]

    if (this.config.quantization) {
      args.push('--quantization', this.config.quantization)
    }
    if (this.config.kvCacheDtype) {
      args.push('--kv-cache-dtype', this.config.kvCacheDtype)
    }
    if (this.config.maxModelLen) {
      args.push('--max-model-len', String(this.config.maxModelLen))
    }
    if (this.config.gpuMemoryUtil) {
      args.push('--gpu-memory-utilization', String(this.config.gpuMemoryUtil))
    }
    if (this.config.enablePrefixCaching) {
      args.push('--enable-prefix-caching')
    }
    if (this.config.enableChunkedPrefill) {
      args.push('--enable-chunked-prefill')
    }
    if (this.config.speculativeModel) {
      args.push('--speculative-model', this.config.speculativeModel)
      args.push('--num-speculative-tokens', String(this.config.numSpeculativeTokens || 5))
    }
    if (this.config.tensorParallelSize && this.config.tensorParallelSize > 1) {
      args.push('--tensor-parallel-size', String(this.config.tensorParallelSize))
    }
    if (this.config.maxNumSeqs) {
      args.push('--max-num-seqs', String(this.config.maxNumSeqs))
    }
    if (this.config.maxNumBatchedTokens) {
      args.push('--max-num-batched-tokens', String(this.config.maxNumBatchedTokens))
    }

    log.info('Starting vLLM server', { model: this.config.model, args })

    this.startedAt = Date.now()

    this.process = spawn('vllm', ['serve', ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    this.process.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      if (text.includes('Uvicorn running on')) {
        this.ready = true
        log.info('vLLM server ready', { port: this.port })
      }
    })

    this.process.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      if (text.includes('error') || text.includes('Error')) {
        log.error('vLLM error', { error: text.slice(0, 500) })
      }
    })

    this.process.on('exit', (code) => {
      log.warn('vLLM process exited', { code })
      this.process = null
      this.ready = false
    })

    await this.waitForReady(60000)
  }

  async generate(config: LocalInferenceConfig): Promise<LocalInferenceResult> {
    if (!this.ready) {
      throw new Error('vLLM server not ready')
    }

    const start = Date.now()

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: [
        ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
        { role: 'user', content: config.prompt },
      ],
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      stream: false,
    }

    try {
      const response = await fetch(`http://${this.host}:${this.port}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      })

      if (!response.ok) {
        throw new Error(`vLLM API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>
        usage: { prompt_tokens: number; completion_tokens: number }
      }

      return {
        text: data.choices[0]?.message?.content || '',
        model: this.config.model,
        tokensPerSecond: data.usage?.completion_tokens
          ? data.usage.completion_tokens / ((Date.now() - start) / 1000)
          : 0,
        totalTokens: (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0),
        ttft: Date.now() - start,
        finished: true,
      }
    } catch (err) {
      log.error('vLLM generation failed', { error: String(err) })
      throw err
    }
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
      this.ready = false
      log.info('vLLM server stopped')
    }
  }

  getStatus(): VLLMStatus {
    return {
      running: this.process !== null,
      model: this.config.model,
      pid: this.process?.pid,
      uptimeMs: this.startedAt > 0 ? Date.now() - this.startedAt : 0,
      port: this.port,
    }
  }

  isReady(): boolean {
    return this.ready
  }

  private waitForReady(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now()
      const check = async () => {
        if (this.ready) {
          resolve()
          return
        }
        if (Date.now() - start > timeoutMs) {
          reject(new Error('vLLM server start timeout'))
          return
        }
        try {
          const resp = await fetch(`http://${this.host}:${this.port}/v1/models`, { signal: AbortSignal.timeout(2000) })
          if (resp.ok) {
            this.ready = true
            resolve()
            return
          }
        } catch { /* not ready yet */ }
        setTimeout(check, 1000)
      }
      check()
    })
  }
}
