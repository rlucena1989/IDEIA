import { createLogger } from '@ideia/logger';
import { GateRunnerResult, FailureAction } from '../types';

const logger = createLogger('quality-gates')

export interface SpecValidationInput {
  specId: string
  title: string
  requirementsCount: number
  tasksCount: number
  acceptanceCriteriaCount: number
  hasDesign: boolean
  requirementsHaveCriteria: boolean
  tasksHaveDependencies: boolean
}

export interface SpecValidationResult {
  valid: boolean
  issues: string[]
  warnings: string[]
  score: number
}

export class SpecGate {
  validate(spec: SpecValidationInput, action: FailureAction): GateRunnerResult {
    const start = Date.now()
    const issues: string[] = []
    const warnings: string[] = []

    if (spec.requirementsCount === 0) {
      issues.push('Spec must have at least 1 requirement')
    }

    if (spec.acceptanceCriteriaCount === 0) {
      issues.push('Acceptance criteria must be defined for validation')
    }

    if (!spec.hasDesign) {
      warnings.push('Design document is missing — implementation may drift')
    }

    if (!spec.requirementsHaveCriteria) {
      warnings.push('Not all requirements have acceptance criteria — validation may be incomplete')
    }

    if (!spec.tasksHaveDependencies) {
      warnings.push('Tasks have no dependencies — parallel execution may cause conflicts')
    }

    if (spec.tasksCount === 0) {
      issues.push('At least 1 task must be defined')
    }

    const passed = issues.length === 0
    return {
      name: `spec-validate:${spec.specId}`,
      passed,
      action,
      durationMs: Date.now() - start,
      output: [
        passed ? '✓ Spec validation passed' : '✗ Spec validation failed',
        ...issues.map(i => `  ✗ ${i}`),
        ...warnings.map(w => `  ⚠ ${w}`),
        `  Score: ${this.calculateScore(issues.length, warnings.length)}/100`,
      ].join('\n'),
      errorCount: issues.length + warnings.length,
    }
  }

  private calculateScore(issues: number, warnings: number): number {
    const base = 100
    return Math.max(0, base - issues * 30 - warnings * 10)
  }
}
