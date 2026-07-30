import { execFileSync } from 'node:child_process';
import { createLogger } from '@ideia/logger';

const log = createLogger('test-orchestrator');

export interface TestSuite {
  name: string;
  path: string;
  command: string;
  args?: string[];
  type: 'unit' | 'integration' | 'e2e' | 'contract' | 'mutation';
  timeout: number;
  required: boolean;
}

export interface TestResult {
  suite: string;
  passed: boolean;
  total: number;
  failed: number;
  durationMs: number;
  output: string;
  timestamp: string;
}

export interface TestRunReport {
  id: string;
  suites: TestResult[];
  totalPassed: number;
  totalFailed: number;
  totalDurationMs: number;
  startedAt: string;
  completedAt: string;
  status: 'passed' | 'failed' | 'timed_out';
}

export class TestOrchestrator {
  private suites: TestSuite[] = [];

  registerSuite(suite: TestSuite): void {
    this.suites.push(suite);
  }

  registerSuites(suites: TestSuite[]): void {
    this.suites.push(...suites);
  }

  getSuites(): TestSuite[] {
    return [...this.suites];
  }

  getDefaultSuites(cwd?: string): TestSuite[] {
    return [
      { name: 'lint', path: cwd || process.cwd(), command: 'npx', args: ['eslint', 'packages/', '--ext', '.ts', '--no-error-on-unmatched-pattern'], type: 'unit', timeout: 60000, required: false },
      { name: 'typecheck', path: cwd || process.cwd(), command: 'npx', args: ['tsc', '--noEmit'], type: 'unit', timeout: 120000, required: true },
      { name: 'test:unit', path: cwd || process.cwd(), command: 'npx', args: ['jest', '--passWithNoTests'], type: 'unit', timeout: 180000, required: true },
      { name: 'test:integration', path: cwd || process.cwd(), command: 'npx', args: ['jest', '--config', 'jest.e2e.config.js', '--passWithNoTests'], type: 'integration', timeout: 300000, required: false },
      { name: 'test:contract', path: cwd || process.cwd(), command: 'npx', args: ['jest', '--config', 'jest.contract.config.js', '--passWithNoTests'], type: 'contract', timeout: 120000, required: false },
      { name: 'security', path: cwd || process.cwd(), command: 'npm', args: ['audit', '--audit-level=high'], type: 'unit', timeout: 30000, required: false },
    ];
  }

  async runSuite(suite: TestSuite): Promise<TestResult> {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const stdout = execFileSync(suite.command, suite.args || [], {
        cwd: suite.path,
        encoding: 'utf-8',
        timeout: suite.timeout,
        stdio: 'pipe',
        windowsHide: true,
      });

      const parsed = this.parseOutput(stdout);
      return {
        suite: suite.name,
        passed: true,
        total: parsed.total,
        failed: parsed.failed,
        durationMs: Date.now() - start,
        output: stdout.trim().slice(0, 2000),
        timestamp,
      };
    } catch (_err) {
      const e = _err as { stdout?: string; stderr?: string; message?: string; status?: number };
      const output = e.stdout?.toString().trim() || e.stderr?.toString().trim() || e.message || '';
      const parsed = this.parseOutput(output);
      return {
        suite: suite.name,
        passed: false,
        total: parsed.total,
        failed: parsed.failed,
        durationMs: Date.now() - start,
        output: output.slice(0, 2000),
        timestamp,
      };
    }
  }

  async runSuites(suites: TestSuite[]): Promise<TestRunReport> {
    const id = `run_${Date.now()}`;
    const startedAt = new Date().toISOString();
    const results: TestResult[] = [];

    for (const suite of suites) {
      log.info(`Running suite: ${suite.name}`);
      const result = await this.runSuite(suite);
      results.push(result);
      log.info(`Suite ${suite.name}: ${result.passed ? 'PASS' : 'FAIL'} (${result.durationMs}ms)`);
    }

    const totalPassed = results.filter(r => r.passed).length;
    const totalFailed = results.filter(r => !r.passed).length;
    const totalDurationMs = results.reduce((s, r) => s + r.durationMs, 0);
    const allPassed = results.every(r => r.passed);

    return {
      id, suites: results, totalPassed, totalFailed,
      totalDurationMs, startedAt, completedAt: new Date().toISOString(),
      status: allPassed ? 'passed' : 'failed',
    };
  }

  async runParallel(suites: TestSuite[]): Promise<TestRunReport> {
    const id = `run_${Date.now()}`;
    const startedAt = new Date().toISOString();

    const results = await Promise.all(
      suites.map(suite => this.runSuite(suite).catch(err => ({
        suite: suite.name, passed: false, total: 0, failed: 1,
        durationMs: 0, output: String(err), timestamp: new Date().toISOString(),
      })))
    );

    const totalPassed = results.filter(r => r.passed).length;
    const totalFailed = results.filter(r => !r.passed).length;
    const totalDurationMs = Math.max(...results.map(r => r.durationMs));
    const allPassed = results.every(r => r.passed);

    return {
      id, suites: results, totalPassed, totalFailed,
      totalDurationMs, startedAt, completedAt: new Date().toISOString(),
      status: allPassed ? 'passed' : 'failed',
    };
  }

  runAll(cwd?: string): Promise<TestRunReport> {
    return this.runSuites(this.getDefaultSuites(cwd));
  }

  parseOutput(output: string): { total: number; passed: number; failed: number } {
    const totalMatch = output.match(/Tests:\s+(?:.*?\d+\s+\w+,\s*)*(\d+)\s+total/);
    const passedMatch = output.match(/(\d+)\s+passed/);
    const failMatch = output.match(/(\d+)\s+failed/);
    const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;
    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
    return { total, passed, failed };
  }
}

export function createTestOrchestrator(): TestOrchestrator {
  return new TestOrchestrator();
}
