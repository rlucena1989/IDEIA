import { createLogger, Logger } from '@ideia/logger';
import { CIStatus, CIResult, Check, CheckStatus, LogEntry, FailurePattern, FixType } from './types-pr';

export class CIMonitor {
  private logger: Logger;
  private watches: Map<string, { prId: string; checks: Check[]; startedAt: string }> = new Map();

  constructor(logger?: Logger) {
    this.logger = logger ?? createLogger('CIMonitor');
  }

  async watchCI(prId: string): Promise<CIStatus> {
    this.logger.info('Watching CI for PR', { prId });
    const checks: Check[] = [
      {
        name: 'lint',
        status: 'running',
        description: 'ESLint check',
        url: '',
        startedAt: new Date().toISOString(),
      },
      {
        name: 'typecheck',
        status: 'running',
        description: 'TypeScript type check',
        url: '',
        startedAt: new Date().toISOString(),
      },
      {
        name: 'unit-tests',
        status: 'running',
        description: 'Unit tests',
        url: '',
        startedAt: new Date().toISOString(),
      },
    ];

    this.watches.set(prId, { prId, checks, startedAt: new Date().toISOString() });

    return {
      prId,
      status: 'running',
      checks,
      url: '',
      startedAt: new Date().toISOString(),
    };
  }

  async getChecks(prId: string): Promise<Check[]> {
    const watch = this.watches.get(prId);
    if (watch === undefined) {
      return [];
    }
    return watch.checks;
  }

  async waitForChecks(prId: string, timeout: number): Promise<CIResult> {
    this.logger.info('Waiting for CI checks', { prId, timeout });
    const startTime = Date.now();
    const deadline = startTime + timeout;

    while (Date.now() < deadline) {
      const checks = await this.getChecks(prId);
      const allCompleted = checks.every(
        (c) => c.status !== 'pending' && c.status !== 'running'
      );

      if (allCompleted) {
        const allPassed = checks.every((c) => c.status === 'passed');
        return {
          prId,
          passed: allPassed,
          checks,
          duration: Date.now() - startTime,
          url: '',
        };
      }

      await this.delay(1000);
    }

    const checks = await this.getChecks(prId);
    return {
      prId,
      passed: false,
      checks,
      duration: Date.now() - startTime,
      url: '',
    };
  }

  async parseLogs(jobId: string): Promise<LogEntry[]> {
    this.logger.info('Parsing logs for job', { jobId });
    return [
      {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `Job ${jobId} started`,
        jobId,
      },
      {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `Job ${jobId} completed`,
        jobId,
      },
    ];
  }

  detectFailurePatterns(logs: LogEntry[]): FailurePattern[] {
    const patterns: FailurePattern[] = [];
    const combinedLog = logs.map((l) => l.message).join('\n');

    const knownPatterns: Array<{ type: FixType; pattern: string; description: string; suggestion: string }> = [
      {
        type: 'compilation',
        pattern: 'TS\\d+',
        description: 'TypeScript compilation error',
        suggestion: 'Fix type errors in the affected files',
      },
      {
        type: 'lint',
        pattern: 'eslint',
        description: 'ESLint violation',
        suggestion: 'Run eslint --fix to auto-correct',
      },
      {
        type: 'test',
        pattern: 'FAIL|AssertionError',
        description: 'Test assertion failure',
        suggestion: 'Fix test assertions or implementation',
      },
      {
        type: 'coverage',
        pattern: 'coverage.*threshold',
        description: 'Coverage below threshold',
        suggestion: 'Add more tests to increase coverage',
      },
    ];

    for (const known of knownPatterns) {
      const regex = new RegExp(known.pattern, 'i');
      if (regex.test(combinedLog)) {
        patterns.push(known);
      }
    }

    return patterns;
  }

  updateCheckStatus(prId: string, checkName: string, status: CheckStatus): void {
    const watch = this.watches.get(prId);
    if (watch === undefined) return;

    const updatedChecks = watch.checks.map((c) => {
      if (c.name === checkName) {
        return {
          ...c,
          status,
          completedAt: status === 'passed' || status === 'failed' ? new Date().toISOString() : undefined,
        };
      }
      return c;
    });

    watch.checks = updatedChecks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
