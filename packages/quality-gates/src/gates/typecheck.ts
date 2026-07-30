import { createLogger } from '@ideia/logger';
import { execSync } from 'child_process';
import { GateRunnerResult, FailureAction } from '../types';
const logger = createLogger('quality-gates');

export class TypecheckGate {
  async run(projectRoot: string, script: string, action: FailureAction): Promise<GateRunnerResult> {
    const start = Date.now();
    try {
      const stdout = execSync(script, { cwd: projectRoot, timeout: 120000, encoding: 'utf-8' });
      const errorCount = (stdout.match(/error TS\d+:/g) || []).length;
      return {
        name: 'typecheck',
        passed: errorCount === 0,
        action,
        durationMs: Date.now() - start,
        output: stdout.slice(0, 2000),
        errorCount,
      };
    } catch (err: unknown) {
      const errObj = err as { message?: string; stderr?: { toString(): string }; stdout?: { toString(): string } };
      logger.error('Error in typecheck gate', { error: errObj.message });
      const stderr = errObj.stderr?.toString() || errObj.stdout?.toString() || errObj.message || '';
      const errorCount = (stderr.match(/error TS\d+:/g) || []).length;
      return {
        name: 'typecheck',
        passed: errorCount === 0,
        action,
        durationMs: Date.now() - start,
        output: stderr.slice(0, 2000),
        errorCount: errorCount || 1,
      };
    }
  }
}
