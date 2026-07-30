import { createLogger } from '@ideia/logger'
import { ProfessorApiProvider } from './professor-api'
import { applyR1Template } from './r1-prompt-templates'
import type { DistillationSample, DistillationDataset, ProfessorConfig, DistillationMethod } from './types'

const log = createLogger('distillation-engine:generator')

export interface DataGeneratorConfig {
  professor: ProfessorConfig
  prompts: string[]
  maxTokens: number
  method: DistillationMethod
  useR1Template?: boolean
}

export class ReasoningDataGenerator {
  private professorApi: ProfessorApiProvider

  constructor() {
    this.professorApi = new ProfessorApiProvider()
  }

  async generate(config: DataGeneratorConfig): Promise<DistillationDataset> {
    const samples: DistillationSample[] = []
    const batchSize = 10
    let totalCost = 0
    let totalTokens = 0

    const wrappedPrompts = config.prompts.map(p => {
      if (config.useR1Template) {
        const { wrappedPrompt } = applyR1Template(p)
        return wrappedPrompt
      }
      return p
    })

    for (let i = 0; i < wrappedPrompts.length; i += batchSize) {
      const batch = wrappedPrompts.slice(i, i + batchSize)
      const originalBatch = config.prompts.slice(i, i + batchSize)
      const batchPromises = batch.map((p, idx) =>
        this.generateSingle(p, originalBatch[idx] || p, config))
      const results = await Promise.all(batchPromises)

      for (const result of results) {
        if (result) {
          samples.push(result.sample)
          totalCost += result.cost
          totalTokens += result.sample.prompt.length + result.sample.completion.length
        }
      }

      log.info('Batch complete', { batch: i / batchSize + 1, samplesInBatch: results.filter(Boolean).length })
    }

    const verifiedRatio = samples.length > 0
      ? samples.filter(s => s.verified).length / samples.length : 0
    const avgLength = samples.length > 0
      ? samples.reduce((a, s) => a + s.completion.length, 0) / samples.length : 0

    return {
      id: `ds-${Date.now()}`,
      name: `distillation-${config.method}-${Date.now()}`,
      professor: config.professor,
      method: config.method,
      samples,
      totalTokens,
      estimatedCost: totalCost,
      quality: { verifiedRatio, avgLength, diversityScore: this.calculateDiversity(samples) },
    }
  }

  private async generateSingle(
    wrappedPrompt: string,
    originalPrompt: string,
    config: DataGeneratorConfig,
  ): Promise<{ sample: DistillationSample; cost: number } | null> {
    try {
      const result = await this.professorApi.generate(wrappedPrompt, config.professor)

      if (config.method === 'reasoning-r1') {
        result.sample.metadata = {
          ...result.sample.metadata,
          originalPrompt,
          r1Template: true,
        }
      }

      return { sample: result.sample, cost: result.cost }
    } catch (err) {
      log.warn('Failed to generate sample', { prompt: wrappedPrompt.slice(0, 80), error: String(err) })
      return null
    }
  }

  private calculateDiversity(samples: DistillationSample[]): number {
    if (samples.length < 2) return 0

    const ngrams = new Set<string>()
    let totalNgrams = 0

    for (const sample of samples) {
      const words = sample.completion.split(/\s+/)
      for (let i = 0; i < words.length - 2; i++) {
        ngrams.add(words.slice(i, i + 3).join(' '))
        totalNgrams++
      }
    }

    return totalNgrams > 0 ? ngrams.size / totalNgrams : 0
  }
}
