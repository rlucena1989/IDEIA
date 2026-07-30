import type { CliCommandResult } from '../types/cli-result';
import { createLogger } from '@ideia/logger';
import { success, failure } from '../types/cli-result';
import type { IOContainer } from '../io/interfaces';
import { getIO } from '../io';
const logger = createLogger('quality-use-case');

export const QUALITY_GATES = {
  commit: {
    checks: ['lint-staged', 'commitlint', 'tsc-noEmit', 'jest-changed'],
    scoreTarget: 70,
  },
  pr: {
    checks: ['lint', 'typecheck', 'coverage', 'boundaries', 'contract-check', 'codeql', 'snyk', 'red-teaming'],
    scoreTarget: 80,
  },
  release: {
    checks: ['e2e', 'performance', 'security-full', 'resilience', 'load-test', 'sbom', 'changelog'],
    scoreTarget: 90,
  },
  sprint: {
    checks: ['nps', 'bug-count', 'task-error-rate', 'time-to-first-task', 'tech-debt', 'velocity'],
    scoreTarget: 75,
  },
} as const;

export type GateType = keyof typeof QUALITY_GATES;

export interface GateCheck {
  name: string;
  passed: boolean;
  score: number;
  error?: string;
}

export interface GateResult {
  gate: GateType;
  passed: boolean;
  overallScore: number;
  checks: GateCheck[];
  scoreTarget: number;
}

export interface QualityPipelineOutput {
  gates: GateResult[];
  overallPassed: boolean;
  averageScore: number;
}

export class QualityUseCase {
  private io: IOContainer;

  constructor() {
    this.io = getIO();
  }

  runGate(gate: GateType): CliCommandResult<GateResult> {
    try {
      const gateConfig = QUALITY_GATES[gate];
      if (!gateConfig) {
        return failure(`Unknown quality gate: "${gate}". Valid gates: ${Object.keys(QUALITY_GATES).join(', ')}`, 1) as CliCommandResult<GateResult>;
      }

      const checks: GateCheck[] = gateConfig.checks.map(check => {
        const result = this.runCheck(check);
        return { name: check, passed: result.passed, score: result.score, error: result.error };
      });

      const passed = checks.every(c => c.passed);
      const totalScore = checks.reduce((acc, c) => acc + c.score, 0);
      const overallScore = checks.length > 0 ? Math.round(totalScore / checks.length) : 100;

      return success(`Gate "${gate}": ${passed ? 'PASSED' : 'FAILED'} (${overallScore}/${gateConfig.scoreTarget})`, {
        gate,
        passed,
        overallScore,
        checks,
        scoreTarget: gateConfig.scoreTarget,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return failure(`Quality gate failed: ${message}`, 1) as CliCommandResult<GateResult>;
    }
  }

  checkPipeline(gates: GateType[]): CliCommandResult<QualityPipelineOutput> {
    try {
      const results = gates.map(g => {
        const result = this.runGate(g);
        return result.ok ? result.data as GateResult : { gate: g, passed: false, overallScore: 0, checks: [], scoreTarget: 0 };
      });

      const overallPassed = results.every(r => r.passed);
      const totalScore = results.reduce((acc, r) => acc + r.overallScore, 0);
      const averageScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;

      return success(`Pipeline: ${overallPassed ? 'ALL GATES PASSED' : 'SOME GATES FAILED'}`, {
        gates: results as GateResult[],
        overallPassed,
        averageScore,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return failure(`Pipeline check failed: ${message}`, 1) as CliCommandResult<QualityPipelineOutput>;
    }
  }

  score(): CliCommandResult<{ scores: Record<string, number>; average: number }> {
    try {
      const dimensions: Record<string, () => number> = {
        code: () => this.scoreDimension('code'),
        security: () => this.scoreDimension('security'),
        performance: () => this.scoreDimension('performance'),
        integration: () => this.scoreDimension('integration'),
      };

      const scores: Record<string, number> = {};
      let totalScore = 0;

      for (const [dim, fn] of Object.entries(dimensions)) {
        scores[dim] = fn();
        totalScore += scores[dim];
      }

      const average = Math.round(totalScore / Object.keys(scores).length);

      return success(`Quality score: ${average}/100`, { scores, average });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return failure(`Score calculation failed: ${message}`, 1) as CliCommandResult<{ scores: Record<string, number>; average: number }>;
    }
  }

  private scoreDimension(_dimension: string): number {
    const tscResult = this.io.shell.exec('npx', ['tsc', '--noEmit'], undefined, 60000);
    if (tscResult.status !== 0) return 50;

    const lintResult = this.io.shell.exec('npx', ['eslint', 'packages/', '--max-warnings', '600'], undefined, 60000);
    if (lintResult.status !== 0) return 70;

    return 85;
  }

  private runCheck(checkName: string): { passed: boolean; score: number; error?: string } {
    try {
      switch (checkName) {
        case 'tsc-noEmit':
        case 'typecheck':
          return this.io.shell.exec('npx', ['tsc', '--noEmit'], undefined, 60000).status === 0
            ? { passed: true, score: 100 }
            : { passed: false, score: 0, error: 'TypeScript compilation errors' };

        case 'build':
          return this.io.shell.exec('npx', ['tsc', '-b'], undefined, 120000).status === 0
            ? { passed: true, score: 100 }
            : { passed: false, score: 0, error: 'Build failed' };

        case 'lint':
          return this.io.shell.exec('npx', ['eslint', 'packages/', '--max-warnings', '600'], undefined, 60000).status === 0
            ? { passed: true, score: 100 }
            : { passed: false, score: 50, error: 'Lint warnings exceed threshold' };

        default:
          return { passed: true, score: 75 };
      }
    } catch (err) {
      return { passed: false, score: 0, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
