import { createLogger } from '@ideia/logger'
import { GateRunnerResult, FailureAction } from '../types'

const logger = createLogger('quality-gates')

export interface DistillationGateInput {
  studentModel: string
  professorModel: string
  domain: string
  studentScore: number
  professorScore: number
  threshold: number
  studentPerplexity?: number
  professorPerplexity?: number
  studentTokensPerSec?: number
}

export class DistillationGate {
  evaluate(input: DistillationGateInput, action: FailureAction): GateRunnerResult {
    const start = Date.now()
    const issues: string[] = []

    if (input.professorScore <= 0) {
      issues.push('Professor model has invalid score (≤0) — cannot validate distillation')
    }

    if (input.studentScore <= 0) {
      issues.push('Student model has invalid score (≤0) — distillation may have failed')
    }

    const ratio = input.professorScore > 0 ? input.studentScore / input.professorScore : 0

    if (ratio < input.threshold) {
      issues.push(
        `Student score (${input.studentScore}) is below ${Math.round(input.threshold * 100)}% of professor (${input.professorScore})` +
        ` — ratio: ${(ratio * 100).toFixed(1)}%`
      )
    }

    if (input.studentPerplexity !== undefined && input.professorPerplexity !== undefined) {
      if (input.studentPerplexity > input.professorPerplexity * 1.5) {
        issues.push(
          `Student perplexity (${input.studentPerplexity}) is >50% higher than professor (${input.professorPerplexity})` +
          ` — quality degradation detected`
        )
      }
    }

    const passed = issues.length === 0
    return {
      name: `distillation:${input.domain}`,
      passed,
      action,
      durationMs: Date.now() - start,
      output: [
        passed ? '✓ Distillation quality gate passed' : '✗ Distillation quality gate failed',
        `  Domain: ${input.domain}`,
        `  Professor: ${input.professorModel} (score: ${input.professorScore})`,
        `  Student: ${input.studentModel} (score: ${input.studentScore})`,
        `  Ratio: ${(ratio * 100).toFixed(1)}% (threshold: ${Math.round(input.threshold * 100)}%)`,
        ...issues.map(i => `  ✗ ${i}`),
      ].join('\n'),
      errorCount: issues.length,
    }
  }
}
