import { GateRunnerResult, FailureAction } from '../types';
import { createLogger } from '@ideia/logger';
import { execSync } from 'child_process';
const logger = createLogger('quality-gates');

export class TestGate {
  async run(projectRoot: string, script: string, action: FailureAction): Promise<any> {
    const start = Date.now();
    try {
      const stdout = execSync(script, { cwd: projectRoot, timeout: 300000, encoding: 'utf-8' });
      const passed = stdout.includes('PASS') || stdout.includes('passed') || stdout.includes('ok');
      const testPassed = this.extractCount(stdout, /(\d+)\s+passed/);
      const testFailed = this.extractCount(stdout, /(\d+)\s+failed/);
      const testTotal = testPassed + testFailed;
      return {
        name: 'test',
        passed,
        action,
        durationMs: Date.now() - start,
        output: stdout.slice(0, 2000),
        testPassed,
        testFailed,
        testTotal,
      };
    } catch (err: unknown) {
      const errObj = err as { message?: string; stderr?: { toString(): string }; stdout?: { toString(): string } };
      logger.error('Error in test gate', { error: errObj.message });
      const stderr = errObj.stderr?.toString() || errObj.stdout?.toString() || errObj.message || '';
      const testPassed = this.extractCount(stderr, /(\d+)\s+passed/);
      const testFailed = this.extractCount(stderr, /(\d+)\s+failed/);
      const testTotal = testPassed + testFailed;
      return {
        name: 'test',
        passed: false,
        action,
        durationMs: Date.now() - start,
        output: stderr.slice(0, 2000),
        testPassed,
        testFailed: testFailed || 1,
        testTotal: testTotal || 1,
      };
    }
  }

  private extractCount(text: string, pattern: RegExp): number {
    const match = text.match(pattern);
    return match ? parseInt(match[1], 10) : 0;
  }
}


