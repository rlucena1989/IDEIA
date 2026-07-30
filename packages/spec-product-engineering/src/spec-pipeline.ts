import { createLogger } from '@ideia/logger'
import { Stage, PipelineContext, PipelineMetrics, PipelineResult, ValidationIssue, Specification } from './types'
import { SpecGenerator } from './spec-generator'
import { SpecValidator } from './spec-validator'
import { SpecCompiler, SpecLexer, SpecParser } from './spec-compiler'
import { AmbiguityDetector } from './ambiguity-detector'

const logger = createLogger('spec-pipeline')

export class SpecificationPipeline {
  private generator: SpecGenerator
  private validator: SpecValidator
  private compiler: SpecCompiler

  constructor(generator?: SpecGenerator, validator?: SpecValidator, compiler?: SpecCompiler) {
    this.generator = generator ?? new SpecGenerator()
    this.validator = validator ?? new SpecValidator()
    this.compiler = compiler ?? new SpecCompiler()
  }

  async run(title: string, rawText: string): Promise<PipelineResult> {
    const metrics: PipelineMetrics = {
      totalDurationMs: 0,
      stageDurations: {} as Record<Stage, number>,
      ambiguityCount: 0,
      validationErrors: 0,
      compilationWarnings: 0,
    }

    const startTime = Date.now()
    const allIssues: ValidationIssue[] = []

    // Stage 1: Analysis
    const t1 = Date.now()
    const ambiguityDetector = new AmbiguityDetector()
    const ambiguities = ambiguityDetector.detect(rawText)
    metrics.ambiguityCount = ambiguities.length
    metrics.stageDurations['analysis' as Stage] = Date.now() - t1

    // Stage 2: Generation
    const t2 = Date.now()
    const spec = await this.generator.generate(title, rawText)
    metrics.stageDurations['generation' as Stage] = Date.now() - t2

    // Stage 3: Validation
    const t3 = Date.now()
    const validationIssues = this.validator.validate(spec)
    allIssues.push(...validationIssues)
    metrics.validationErrors = validationIssues.filter(i => i.type === 'error').length
    metrics.stageDurations['validation' as Stage] = Date.now() - t3

    // Stage 4: Compilation
    const t4 = Date.now()
    const compiled = this.compiler.compile(rawText, title)
    metrics.stageDurations['compilation' as Stage] = Date.now() - t4

    metrics.totalDurationMs = Date.now() - startTime
    const success = metrics.validationErrors === 0

    logger.info(`Pipeline complete`, { success, duration: metrics.totalDurationMs, stages: Object.keys(metrics.stageDurations).length })

    return {
      success,
      spec,
      compiled,
      metrics,
      issues: allIssues,
    }
  }

  private async runStage<T>(stage: Stage, fn: () => Promise<T>, metrics: PipelineMetrics): Promise<T> {
    const start = Date.now()
    try {
      return await fn()
    } finally {
      metrics.stageDurations[stage] = Date.now() - start
    }
  }
}
