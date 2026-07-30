import { createLogger } from '@ideia/logger'
import { GateRunnerResult, FailureAction } from '../types'

const logger = createLogger('quality-gates')

export interface MakerInput {
  artifactPath: string
  description: string
}

export interface MakerVerifierGateResult {
  makerPassed: boolean
  verifierPassed: boolean
  makerError?: string
  verifierError?: string
  verifierIssues: string[]
  loops: number
}

export class MakerVerifierGate {
  async evaluate(
    spec: string,
    makerArtifact: MakerInput,
    verifierResult: string,
    options: {
      requiredLoops: number
      independentVerifier: boolean
    },
    action: FailureAction,
  ): Promise<GateRunnerResult> {
    const start = Date.now()
    const issues: string[] = []

    if (!options.independentVerifier) {
      issues.push('Verifier must be independent from maker (different model/session)')
    }

    if (!verifierResult || verifierResult.trim().length === 0) {
      issues.push('Verifier produced no output — cannot validate artifact')
    }

    if (verifierResult.toLowerCase().includes('fail') || verifierResult.toLowerCase().includes('error')) {
      issues.push(`Verifier rejected the artifact: ${verifierResult.slice(0, 200)}`)
    }

    const passed = issues.length === 0
    return {
      name: 'maker-verifier',
      passed,
      action,
      durationMs: Date.now() - start,
      output: [
        passed ? '✓ Maker/Verifier cycle passed' : '✗ Maker/Verifier cycle failed',
        `  Spec: ${spec.slice(0, 100)}`,
        `  Artifact: ${makerArtifact.artifactPath}`,
        `  Independent verifier: ${options.independentVerifier ? 'yes' : '⚠ no'}`,
        ...issues.map(i => `  ✗ ${i}`),
      ].join('\n'),
      errorCount: issues.length,
    }
  }
}
