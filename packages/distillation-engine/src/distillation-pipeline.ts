import { createLogger } from '@ideia/logger'
import { ReasoningDataGenerator } from './data-generator'
import { TrajectoryFilter } from './trajectory-filter'
import { DatasetExporter } from './dataset-exporter'
import type { DistillationRunConfig, DistillationReport, DistillationDataset } from './types'

const log = createLogger('distillation-engine:pipeline')

export class DistillationPipeline {
  private generator: ReasoningDataGenerator
  private filter: TrajectoryFilter
  private exporter: DatasetExporter

  constructor() {
    this.generator = new ReasoningDataGenerator()
    this.filter = new TrajectoryFilter()
    this.exporter = new DatasetExporter()
  }

  async run(config: DistillationRunConfig, customPrompts?: string[]): Promise<DistillationReport> {
    const report: DistillationReport = {
      runId: `run-${Date.now()}`,
      config,
      datasetGenerated: 0,
      datasetAfterFilter: 0,
      status: 'generating',
    }

    try {
      report.status = 'generating'
      const dataset = await this.generateDataset(config, customPrompts)
      report.datasetGenerated = dataset.samples.length

      const stats = await this.exporter.getDatasetStats(dataset)
      log.info('Dataset generated', {
        samples: stats.totalSamples,
        cost: `$${stats.estimatedCost.toFixed(4)}`,
        verifiedRatio: `${Math.round(stats.verifiedRatio * 100)}%`,
      })

      report.status = 'filtering'
      const filtered = this.filter.filter(dataset.samples, config.filtering)
      report.datasetAfterFilter = filtered.passed.length

      const filteredDataset: DistillationDataset = {
        ...dataset,
        samples: filtered.passed,
        name: `${dataset.name}-filtered`,
      }

      await this.exporter.export(filteredDataset, {
        format: 'jsonl-sft',
        outputDir: config.outputPath,
        split: true,
        validRatio: 0.1,
      })

      await this.exporter.saveDataset(filteredDataset, `${config.outputPath}/${dataset.name}.json`)

      report.status = 'completed'
      log.info('Distillation pipeline complete', {
        generated: report.datasetGenerated,
        afterFilter: report.datasetAfterFilter,
        outputPath: config.outputPath,
      })
    } catch (err) {
      report.status = 'failed'
      report.error = err instanceof Error ? err.message : String(err)
      log.error('Distillation pipeline failed', { error: report.error })
    }

    return report
  }

  private async generateDataset(config: DistillationRunConfig, customPrompts?: string[]): Promise<DistillationDataset> {
    const prompts = customPrompts && customPrompts.length > 0
      ? customPrompts
      : this.getDefaultPrompts()

    log.info('Generating distillation dataset', {
      method: config.method,
      professor: `${config.professor.provider}/${config.professor.model}`,
      promptCount: prompts.length,
      useR1: config.method === 'reasoning-r1',
    })

    return this.generator.generate({
      professor: config.professor,
      prompts,
      maxTokens: config.professor.maxTokens,
      method: config.method,
      useR1Template: config.method === 'reasoning-r1',
    })
  }

  private getDefaultPrompts(): string[] {
    return [
      'Solve the math problem: 2x + 5 = 13. Find the value of x.',
      'Write a TypeScript function to find the longest palindrome substring in a string.',
      'Explain the concept of recursion with practical examples in programming.',
      'Design a REST API endpoint for user authentication with JWT tokens.',
      'Debug and fix this code: const x = [1,2,3]; logger.info(x[3]);',
      'Compare and contrast SQL and NoSQL databases for a social media application.',
      'Implement a binary search tree with insert and search operations in Python.',
      'Explain how attention mechanisms work in transformer architectures.',
      'Write a regular expression to validate email addresses and explain each component.',
      'Describe the process of gradient descent optimization in neural networks.',
    ]
  }
}
