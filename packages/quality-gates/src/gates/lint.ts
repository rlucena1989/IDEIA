import { createLogger } from '@ideia/logger';
import { execSync } from 'child_process';
import { GateRunnerResult, FailureAction } from '../types';
const logger = createLogger('quality-gates');

export class LintGate {
  async run(projectRoot: string, script: string, action: FailureAction): Promise<GateRunnerResult> {
    const start = Date.now();
    try {
      const stdout = execSync(script, { cwd: projectRoot, timeout: 60000, encoding: 'utf-8' });
      const lines = stdout.split('\n').filter(l => l.includes('error') || l.includes('warning'));
      const errorCount = lines.filter(l => l.includes('error')).length;
      return {
        name: 'lint',
        passed: errorCount === 0,
        action,
        durationMs: Date.now() - start,
        output: stdout.slice(0, 2000),
        errorCount,
      };
    } catch (err: unknown) {
      const errObj = err as { message?: string; stderr?: { toString(): string }; stdout?: { toString(): string } };
      logger.error('Error in lint gate', { error: errObj.message });
      const stderr = errObj.stderr?.toString() || errObj.stdout?.toString() || errObj.message || '';
      const errorCount = (stderr.match(/error/g) || []).length + (stderr.match(/Error/g) || []).length;
      return {
        name: 'lint',
        passed: false,
        action,
        durationMs: Date.now() - start,
        output: stderr.slice(0, 2000),
        errorCount: errorCount || 1,
      };
    }
  }
}
