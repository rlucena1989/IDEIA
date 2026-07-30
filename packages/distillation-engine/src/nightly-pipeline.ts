import { DistillationPipeline } from './distillation-pipeline'
import { createLogger } from '@ideia/logger';
import { ProfessorApiProvider } from './professor-api'
import { TrajectoryFilter } from './trajectory-filter'
import type { DistillationRunConfig, DistillationReport } from './types'
const logger = createLogger('nightly-pipeline');

export interface NightlyPipelineConfig {
  schedule: string
  professorModel: string
  professorProvider: 'anthropic' | 'openai' | 'deepseek'
  studentModel: string
  minSamples: number
  maxSamples: number
  outputDir: string
  notifyOnImprovement: boolean
  notifyOnDegradation: boolean
}

export interface NightlyRunReport {
  date: string
  config: NightlyPipelineConfig
  distillation: DistillationReport
  improvement: boolean
  deltaScore: number
  previousScore?: number
}

export class NightlyDistillationPipeline {
  private config: NightlyPipelineConfig
  private pipeline: DistillationPipeline
  private professor: ProfessorApiProvider
  private filter: TrajectoryFilter
  private history: Array<{ date: string; score: number }> = []

  constructor(config: Partial<NightlyPipelineConfig>) {
    this.config = {
      schedule: config.schedule || '0 2 * * *',
      professorModel: config.professorModel || 'deepseek-reasoner',
      professorProvider: config.professorProvider || 'deepseek',
      studentModel: config.studentModel || 'Qwen2.5-7B',
      minSamples: config.minSamples || 50000,
      maxSamples: config.maxSamples || 800000,
      outputDir: config.outputDir || './distillation-output',
      notifyOnImprovement: config.notifyOnImprovement ?? true,
      notifyOnDegradation: config.notifyOnDegradation ?? true,
    }
    this.pipeline = new DistillationPipeline()
    this.professor = new ProfessorApiProvider()
    this.filter = new TrajectoryFilter()
  }

  async run(): Promise<NightlyRunReport> {
    const date = new Date().toISOString().split('T')[0] ?? ''

    const runConfig: DistillationRunConfig = {
      name: `nightly-${date}`,
      professor: {
        provider: this.config.professorProvider,
        model: this.config.professorModel,
        maxTokens: 16000,
        temperature: 0.7,
      },
      method: 'reasoning-r1',
      student: {
        modelId: this.config.studentModel,
        method: 'qlora',
        training: {
          epochs: 3,
          learningRate: 2e-4,
          batchSize: 4,
          gradientAccumulationSteps: 8,
          bf16: true,
        },
      },
      filtering: {
        strategy: 'skill-aware',
        minScore: 0.7,
        maxSamples: this.config.maxSamples,
        verifyWith: 'execution',
      },
      outputPath: `${this.config.outputDir}/${date}`,
    }

    this.filter.registerSkill({
      name: 'reasoning',
      domains: ['math', 'logic', 'reasoning', 'prove', 'explain'],
      weaknessThreshold: 0.9,
    })
    this.filter.registerSkill({
      name: 'coding',
      domains: ['code', 'function', 'implement', 'debug', 'test', 'api'],
      weaknessThreshold: 0.85,
    })
    this.filter.registerSkill({
      name: 'writing',
      domains: ['write', 'document', 'describe', 'summarize', 'explain'],
      weaknessThreshold: 0.7,
    })

    const report = await this.pipeline.run(runConfig)

    const currentScore = report.evaluation?.reasoningScore || 0
    const previousEntry = this.history[this.history.length - 1]
    const previousScore = previousEntry?.score
    const deltaScore = previousScore !== undefined ? currentScore - previousScore : 0
    const improvement = deltaScore > 0

    if (improvement && this.config.notifyOnImprovement) {
      await this.notify(`✅ Distillation improved: +${deltaScore} points (${currentScore} vs ${previousScore})`)
    }
    if (!improvement && deltaScore < 0 && this.config.notifyOnDegradation) {
      await this.notify(`⚠️ Distillation degraded: ${deltaScore} points (${currentScore} vs ${previousScore})`)
    }

    this.history.push({ date, score: currentScore })

    const nightlyReport: NightlyRunReport = {
      date,
      config: this.config,
      distillation: report,
      improvement,
      deltaScore,
      previousScore,
    }

    return nightlyReport
  }

  getHistory(): Array<{ date: string; score: number }> {
    return [...this.history]
  }

  private async notify(message: string): Promise<void> {
    logger.info('[NightlyDistillation] ${message}')
  }
}
