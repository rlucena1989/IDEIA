import { createLogger } from '@ideia/logger'
import { GateRunnerResult, FailureAction } from '../types'
import * as fsp from 'fs/promises'
import * as path from 'path'

const logger = createLogger('quality-gates')

export interface TDDInput {
  testFiles: string[]
  sourceFiles: string[]
  specTestCaseCount: number
}

export class TDDGate {
  async validate(projectRoot: string, input: TDDInput, action: FailureAction): Promise<GateRunnerResult> {
    const start = Date.now()
    const issues: string[] = []
    const warnings: string[] = []

    if (input.testFiles.length === 0) {
      issues.push('No test files found — tests must be written before implementation')
    }

    if (input.sourceFiles.length > 0 && input.testFiles.length === 0) {
      issues.push(`${input.sourceFiles.length} source file(s) exist but no test files — TDD requires test-first`)
    }

    if (input.specTestCaseCount > 0 && input.testFiles.length < Math.ceil(input.specTestCaseCount * 0.5)) {
      warnings.push(`Spec has ${input.specTestCaseCount} test case(s) but only ${input.testFiles.length} test file(s) found`)
    }

    if (input.testFiles.length > 0) {
      let namedCorrectly = 0
      for (const tf of input.testFiles) {
        for (const sf of input.sourceFiles) {
          const tfBase = path.basename(tf, path.extname(tf))
          const sfBase = path.basename(sf, path.extname(sf))
          if (tfBase.includes(sfBase) || tfBase.includes(sfBase.replace('.test', '').replace('.spec', ''))) {
            namedCorrectly++
            break
          }
        }
      }
      if (namedCorrectly < input.testFiles.length) {
        warnings.push(`${input.testFiles.length - namedCorrectly} test file(s) not matching source file naming convention`)
      }
    }

    const passed = issues.length === 0
    return {
      name: 'tdd',
      passed,
      action,
      durationMs: Date.now() - start,
      output: [
        passed ? '✓ TDD validation passed' : '✗ TDD validation failed',
        ...issues.map(i => `  ✗ ${i}`),
        ...warnings.map(w => `  ⚠ ${w}`),
        `  Tests: ${input.testFiles.length} | Sources: ${input.sourceFiles.length} | Spec tests: ${input.specTestCaseCount}`,
      ].join('\n'),
      errorCount: issues.length + warnings.length,
    }
  }
}
