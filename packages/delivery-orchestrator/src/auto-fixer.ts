import { createLogger, Logger } from '@ideia/logger';
import { FailurePattern, FixPlan, FixResult, FixType, CIStatus, LogEntry } from './types-pr';

export class AutoFixer {
  private logger: Logger;
  private attempts: Map<string, number> = new Map();
  private fixPatterns: FailurePattern[] = [];

  maxAttempts: number;

  constructor(maxAttempts: number = 3, logger?: Logger) {
    this.maxAttempts = maxAttempts;
    this.logger = logger ?? createLogger('AutoFixer');
    this.initializePatterns();
  }

  async analyzeFailure(failure: CIStatus, _code: string): Promise<FixPlan> {
    this.logger.info('Analyzing CI failure', { prId: failure.prId });
    const attempt = this.attempts.get(failure.prId) ?? 0;
    const errorType = this.classifyFailure(failure);

    return {
      type: errorType,
      description: `Auto-fix attempt ${attempt + 1} for ${errorType} error`,
      files: [],
      attempt: attempt + 1,
    };
  }

  async applyFix(fixPlan: FixPlan): Promise<FixResult> {
    this.logger.info('Applying fix', { type: fixPlan.type, attempt: fixPlan.attempt });
    const prId = 'current';
    const currentAttempts = (this.attempts.get(prId) ?? 0) + 1;
    this.attempts.set(prId, currentAttempts);

    if (currentAttempts > this.maxAttempts) {
      return {
        success: false,
        attempt: currentAttempts,
        description: fixPlan.description,
        error: `Max attempts (${this.maxAttempts}) exceeded`,
        appliedFixes: [],
      };
    }

    return {
      success: true,
      attempt: currentAttempts,
      description: fixPlan.description,
      appliedFixes: fixPlan.files.map((f) => f.path),
    };
  }

  async retryCI(_prId: string): Promise<CIStatus> {
    this.logger.info('Retrying CI');
    return {
      prId: _prId,
      status: 'running',
      checks: [],
      url: '',
      startedAt: new Date().toISOString(),
    };
  }

  learnFromFailure(failure: FailurePattern, _fix: FixPlan): void {
    this.logger.info('Learning from failure pattern', { type: failure.type });
    const exists = this.fixPatterns.some(
      (p) => p.pattern === failure.pattern && p.type === failure.type
    );
    if (!exists) {
      this.fixPatterns.push(failure);
    }
  }

  getFixPatterns(): FailurePattern[] {
    return [...this.fixPatterns];
  }

  resetAttempts(): void {
    this.attempts.clear();
  }

  private initializePatterns(): void {
    this.fixPatterns = [
      {
        type: 'compilation',
        pattern: 'TS\\d+.*error',
        description: 'TypeScript compilation error detected',
        suggestion: 'Fix type annotations and imports',
      },
      {
        type: 'lint',
        pattern: 'eslint.*error',
        description: 'ESLint violation detected',
        suggestion: 'Auto-fix with eslint --fix',
      },
      {
        type: 'test',
        pattern: 'FAIL.*|.*AssertionError.*',
        description: 'Test failure detected',
        suggestion: 'Verify test assertions match implementation',
      },
      {
        type: 'dependency',
        pattern: 'ERR_PACKAGE_PATH_NOT_EXPORTED|MODULE_NOT_FOUND',
        description: 'Dependency resolution error',
        suggestion: 'Install missing dependency or fix import path',
      },
    ];
  }

  private classifyFailure(status: CIStatus): FixType {
    const allLogs = status.checks
      .filter((c) => c.status === 'failed')
      .map((c) => c.description)
      .join(' ');

    if (/TS\d+/.test(allLogs)) return 'compilation';
    if (/eslint/.test(allLogs)) return 'lint';
    if (/FAIL|AssertionError/.test(allLogs)) return 'test';
    if (/coverage.*threshold/.test(allLogs)) return 'coverage';
    if (/MODULE_NOT_FOUND/.test(allLogs)) return 'dependency';
    if (/timeout/.test(allLogs)) return 'infrastructure';
    return 'compilation';
  }
}
