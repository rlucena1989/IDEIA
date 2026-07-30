import { createLogger } from '@ideia/logger';
import { execSync } from 'child_process';
import { GateRunnerResult, FailureAction } from '../types';
const logger = createLogger('quality-gates');

export class CoverageGate {
  async run(projectRoot: string, script: string, action: FailureAction, threshold?: number): Promise<GateRunnerResult> {
    const start = Date.now();
    const minCoverage = threshold ?? 80;
    try {
      const stdout = execSync(script, { cwd: projectRoot, timeout: 300000, encoding: 'utf-8' });
      const coverage = this.extractCoverage(stdout);
      const passed = coverage >= minCoverage;
      return {
        name: 'coverage',
        passed,
        action,
        durationMs: Date.now() - start,
        output: stdout.slice(0, 2000),
        coverage,
      };
    } catch (err: unknown) {
      const errObj = err as { message?: string; stderr?: { toString(): string }; stdout?: { toString(): string } };
      logger.error('Error in coverage gate', { error: errObj.message });
      const stderr = errObj.stderr?.toString() || errObj.stdout?.toString() || errObj.message || '';
      const coverage = this.extractCoverage(stderr);
      const passed = coverage >= minCoverage;
      return {
        name: 'coverage',
        passed,
        action,
        durationMs: Date.now() - start,
        output: stderr.slice(0, 2000),
        coverage,
      };
    }
  }

  private extractCoverage(text: string): number {
    const patterns = [
      /Lines\s*:\s*(\d+(?:\.\d+)?)%/i,
      /coverage:\s*(\d+(?:\.\d+)?)%/i,
      /All files\s*\|\s*(\d+(?:\.\d+)?)/i,
      /Statements\s*:\s*(\d+(?:\.\d+)?)%/i,
      /total.*?(\d+(?:\.\d+)?)%/i,
    ];
    for (const p of patterns) {
      const match = text.match(p);
      if (match) return parseFloat(match[1]);
    }
    return 0;
  }
}
