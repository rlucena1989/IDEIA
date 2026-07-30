import * as fsp from 'fs/promises'
import * as path from 'path'
import { createLogger } from '@ideia/logger'
import type { DistillationSample, DistillationDataset } from './types'

const log = createLogger('distillation-engine:export')

export type ExportFormat = 'jsonl-sft' | 'sharegpt' | 'alpaca' | 'chat-template'

export interface ExportOptions {
  format?: ExportFormat
  outputDir: string
  systemPrompt?: string
  split?: boolean
  validRatio?: number
}

export interface ExportResult {
  path: string
  samples: number
  format: string
}

export class DatasetExporter {
  async export(
    dataset: DistillationDataset,
    options: ExportOptions,
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = []
    const outputDir = options.outputDir
    await fsp.mkdir(outputDir, { recursive: true })
    const seen = new Set<string>()

    const format = options.format || 'jsonl-sft'

    if (format === 'jsonl-sft' || format === 'chat-template') {
      const r = await this.exportJsonlSFT(dataset, outputDir, options)
      if (!seen.has(r.path)) { seen.add(r.path); results.push(r) }
    }

    if (format === 'sharegpt') {
      const r = await this.exportShareGPT(dataset, outputDir, options)
      if (!seen.has(r.path)) { seen.add(r.path); results.push(r) }
    }

    if (format === 'alpaca') {
      const r = await this.exportAlpaca(dataset, outputDir, options)
      if (!seen.has(r.path)) { seen.add(r.path); results.push(r) }
    }

    if (options.split && dataset.samples.length > 1) {
      const splitResults = await this.splitTrainValid(dataset, outputDir, options)
      for (const r of splitResults) {
        if (!seen.has(r.path)) { seen.add(r.path); results.push(r) }
      }
    }

    log.info('Dataset exported', {
      formats: results.map(r => r.format),
      totalSamples: dataset.samples.length,
      outputDir,
    })

    return results
  }

  private async exportJsonlSFT(
    dataset: DistillationDataset,
    outputDir: string,
    options: ExportOptions,
  ): Promise<ExportResult> {
    const outputPath = path.join(outputDir, `${dataset.name}-sft.jsonl`)
    const lines = dataset.samples.map(s => JSON.stringify({
      instruction: s.prompt,
      output: s.completion,
      system: options.systemPrompt || '',
    }))
    await fsp.writeFile(outputPath, lines.join('\n'), 'utf-8')
    return { path: outputPath, samples: dataset.samples.length, format: 'jsonl-sft' }
  }

  private async exportShareGPT(
    dataset: DistillationDataset,
    outputDir: string,
    options: ExportOptions,
  ): Promise<ExportResult> {
    const outputPath = path.join(outputDir, `${dataset.name}-sharegpt.jsonl`)
    const lines = dataset.samples.map(s => JSON.stringify({
      conversations: [
        ...(options.systemPrompt ? [{ from: 'system', value: options.systemPrompt }] : []),
        { from: 'human', value: s.prompt },
        { from: 'gpt', value: s.completion },
      ],
    }))
    await fsp.writeFile(outputPath, lines.join('\n'), 'utf-8')
    return { path: outputPath, samples: dataset.samples.length, format: 'sharegpt' }
  }

  private async exportAlpaca(
    dataset: DistillationDataset,
    outputDir: string,
    options: ExportOptions,
  ): Promise<ExportResult> {
    const outputPath = path.join(outputDir, `${dataset.name}-alpaca.json`)
    const data = dataset.samples.map(s => ({
      instruction: s.prompt,
      input: '',
      output: s.completion,
    }))
    await fsp.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8')
    return { path: outputPath, samples: dataset.samples.length, format: 'alpaca' }
  }

  private async splitTrainValid(
    dataset: DistillationDataset,
    outputDir: string,
    options: ExportOptions,
  ): Promise<ExportResult[]> {
    const ratio = options.validRatio ?? 0.1
    const splitIdx = Math.floor(dataset.samples.length * (1 - ratio))
    const trainSamples = dataset.samples.slice(0, splitIdx)
    const validSamples = dataset.samples.slice(splitIdx)
    const results: ExportResult[] = []

    if (trainSamples.length > 0) {
      const trainSet: DistillationDataset = { ...dataset, samples: trainSamples, name: `${dataset.name}-train` }
      const r = await this.exportJsonlSFT(trainSet, outputDir, options)
      results.push({ ...r, path: r.path.replace('.jsonl', '-train.jsonl') })
    }
    if (validSamples.length > 0) {
      const validSet: DistillationDataset = { ...dataset, samples: validSamples, name: `${dataset.name}-valid` }
      const r = await this.exportJsonlSFT(validSet, outputDir, options)
      results.push({ ...r, path: r.path.replace('.jsonl', '-valid.jsonl') })
    }

    return results
  }

  async loadPromptsFromFile(filePath: string): Promise<string[]> {
    const content = await fsp.readFile(filePath, 'utf-8')
    const ext = path.extname(filePath)

    if (ext === '.jsonl') {
      return content.split('\n')
        .filter(Boolean)
        .map(line => {
          try {
            const parsed = JSON.parse(line)
            return parsed.prompt || parsed.instruction || parsed.input || parsed.question || line
          } catch {
            return line
          }
        })
    }

    if (ext === '.json') {
      const data = JSON.parse(content)
      if (Array.isArray(data)) {
        return data.map((item: Record<string, unknown>) =>
          (item.prompt || item.instruction || item.input || item.question || JSON.stringify(item)) as string)
      }
    }

    return content.split('\n').filter(Boolean)
  }

  async saveDataset(dataset: DistillationDataset, outputPath: string): Promise<void> {
    await fsp.mkdir(path.dirname(outputPath), { recursive: true })
    const data = JSON.stringify({
      id: dataset.id,
      name: dataset.name,
      professor: dataset.professor,
      method: dataset.method,
      totalTokens: dataset.totalTokens,
      estimatedCost: dataset.estimatedCost,
      quality: dataset.quality,
      samples: dataset.samples.map(s => ({
        id: s.id, prompt: s.prompt, completion: s.completion,
        professorModel: s.professorModel, verified: s.verified, score: s.score, metadata: s.metadata,
      })),
    }, null, 2)
    await fsp.writeFile(outputPath, data, 'utf-8')
    log.info('Dataset saved', { path: outputPath, samples: dataset.samples.length })
  }

  async getDatasetStats(dataset: DistillationDataset): Promise<{
    totalSamples: number; avgPromptLength: number; avgCompletionLength: number
    verifiedRatio: number; estimatedCost: number; totalTokens: number
  }> {
    const samples = dataset.samples
    return {
      totalSamples: samples.length,
      avgPromptLength: samples.length > 0 ? samples.reduce((a, s) => a + s.prompt.length, 0) / samples.length : 0,
      avgCompletionLength: samples.length > 0 ? samples.reduce((a, s) => a + s.completion.length, 0) / samples.length : 0,
      verifiedRatio: samples.length > 0 ? samples.filter(s => s.verified).length / samples.length : 0,
      estimatedCost: dataset.estimatedCost,
      totalTokens: dataset.totalTokens,
    }
  }
}
