import { createLogger } from '@ideia/logger';
import { execSync } from 'child_process';
import { GateRunnerResult, FailureAction } from '../types';
const logger = createLogger('quality-gates');

export class BuildGate {
  async run(projectRoot: string, script: string, action: FailureAction): Promise<GateRunnerResult> {
    const start = Date.now();
    try {
      const stdout = execSync(script, { cwd: projectRoot, timeout: 300000, encoding: 'utf-8' });
      return {
        name: 'build',
        passed: true,
        action,
        durationMs: Date.now() - start,
        output: stdout.slice(0, 2000),
      };
    } catch (err: unknown) {
      const errObj = err as { message?: string; stderr?: { toString(): string }; stdout?: { toString(): string } };
      logger.error('Error in build gate', { error: errObj.message });
      const stderr = errObj.stderr?.toString() || errObj.stdout?.toString() || errObj.message || '';
      return {
        name: 'build',
        passed: false,
        action,
        durationMs: Date.now() - start,
        output: stderr.slice(0, 2000),
      };
    }
  }
}
