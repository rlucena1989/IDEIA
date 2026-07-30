import { SpeculativeDecoder, SpeculativeResult } from './speculative-decoding'
import { VLLMEngine } from './vllm-engine'
import { LocalInference } from './inference'
import { createLogger } from '@ideia/logger'

const log = createLogger('local-ai:speculative')

export type InferenceBackend = 'vllm' | 'ollama'

export class SpeculativeConnector {
  private decoder: SpeculativeDecoder
  private draftEngine?: VLLMEngine
  private targetEngine?: VLLMEngine | LocalInference
  private backend: InferenceBackend

  constructor(config: {
    draftModel: string
    targetModel: string
    numSpeculativeTokens?: number
    acceptanceThreshold?: number
    backend?: InferenceBackend
    ollamaEndpoint?: string
  }) {
    this.decoder = new SpeculativeDecoder({
      draftModel: config.draftModel,
      targetModel: config.targetModel,
      numSpeculativeTokens: config.numSpeculativeTokens || 5,
      acceptanceThreshold: config.acceptanceThreshold ?? 0.9,
    })
    this.backend = config.backend || 'ollama'
  }

  async start(): Promise<void> {
    if (this.backend === 'vllm') {
      this.draftEngine = new VLLMEngine({
        model: this.decoder['config'].draftModel,
        port: 8001,
        maxNumSeqs: 1,
      })
      this.targetEngine = new VLLMEngine({
        model: this.decoder['config'].targetModel,
        port: 8000,
      })

      log.info('Starting speculative decoding engines', {
        draft: this.decoder['config'].draftModel,
        target: this.decoder['config'].targetModel,
      })

      await this.targetEngine.start()
      await this.draftEngine.start()
    } else {
      this.targetEngine = new LocalInference({
        ollamaEndpoint: 'http://127.0.0.1:11434',
      })
    }
  }

  async generate(prompt: string, maxTokens: number = 1024): Promise<SpeculativeResult> {
    const draftFn = async (p: string, max: number): Promise<string> => {
      if (this.backend === 'vllm' && this.draftEngine) {
        const result = await this.draftEngine.generate({
          model: this.decoder['config'].draftModel,
          prompt: p,
          maxTokens: max,
          temperature: 0.6,
        })
        return result.text
      }
      const inference = this.targetEngine as LocalInference
      const result = await inference.generate({
        model: this.decoder['config'].draftModel,
        prompt: p,
        maxTokens: max,
        temperature: 0.6,
      })
      return result.text
    }

    const verifyFn = async (p: string, candidates: string[]): Promise<boolean[]> => {
      if (this.backend === 'vllm' && this.targetEngine) {
        const results: boolean[] = []
        for (const candidate of candidates) {
          const verifyPrompt = `${p}${candidate}`
          try {
            const targetEngine = this.targetEngine as VLLMEngine
            const result = await targetEngine.generate({
              model: this.decoder['config'].targetModel,
              prompt: verifyPrompt,
              maxTokens: 1,
              temperature: 0,
            })
            const targetToken = result.text.trim().split(/\s+/)[0] || ''
            results.push(targetToken === candidate)
          } catch {
            results.push(true)
          }
        }
        return results
      }

      const inference = this.targetEngine as LocalInference
      const results: boolean[] = []
      for (const candidate of candidates) {
        try {
          const result = await inference.generate({
            model: this.decoder['config'].targetModel,
            prompt: `${p}${candidate}`,
            maxTokens: 1,
            temperature: 0,
          })
          const targetToken = result.text.trim().split(/\s+/)[0] || ''
          results.push(targetToken === candidate)
        } catch {
          results.push(true)
        }
      }
      return results
    }

    log.info('Running speculative decoding', {
      prompt: prompt.slice(0, 100),
      maxTokens,
      backend: this.backend,
    })

    const result = await this.decoder.generate(prompt, draftFn, verifyFn, maxTokens)

    log.info('Speculative decoding complete', {
      accepted: result.acceptedTokens,
      proposed: result.proposedTokens,
      acceptanceRate: `${Math.round(result.acceptanceRate * 100)}%`,
      speedup: `${result.speedup}x`,
    })

    return result
  }

  async stop(): Promise<void> {
    if (this.backend === 'vllm') {
      await this.draftEngine?.stop()
      await (this.targetEngine as VLLMEngine).stop()
    }
  }

  getStats(): ReturnType<SpeculativeDecoder['getStats']> {
    return this.decoder.getStats()
  }

  resetStats(): void {
    this.decoder.resetStats()
  }
}
