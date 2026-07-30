import { PRPlanner } from '../pr-planner';
import { CIMonitor } from '../ci-monitor';
import { AutoFixer } from '../auto-fixer';
import { ReviewGenerator } from '../review-generator';
import { MergeGate } from '../merge-gate';
import { PRPipeline } from '../pr-pipeline';
import { IssueRef, CIStatus, Check } from '../types-pr';

function createMockIssue(overrides?: Partial<IssueRef>): IssueRef {
  return {
    id: '123',
    title: 'Add user authentication',
    description: 'Implement OAuth2 login flow',
    type: 'feature',
    priority: 'high',
    labels: ['api', 'security'],
    ...overrides,
  };
}

describe('PRPlanner', () => {
  let planner: PRPlanner;

  beforeEach(() => {
    planner = new PRPlanner();
  });

  it('should plan PR from issue', async () => {
    const issue = createMockIssue();
    const plan = await planner.planFromIssue(issue);

    expect(plan.branchName).toBe('feature/IDEIA-123-add-user-authentication');
    expect(plan.commits).toHaveLength(2);
    expect(plan.commits[0]?.type).toBe('feat');
    expect(plan.commits[1]?.type).toBe('test');
    expect(plan.checklist).toHaveLength(6);
    expect(plan.risk).toBe('medium');
    expect(plan.estimatedEffort).toBeGreaterThan(0);
  });

  it('should generate correct branch name for bugfix', () => {
    const issue = createMockIssue({ type: 'bugfix', title: 'Fix login crash' });
    const branch = planner.generateBranchName(issue);
    expect(branch).toBe('fix/IDEIA-123-fix-login-crash');
  });

  it('should plan reviewers', () => {
    const reviewers = planner.planReviewers(['src/auth.ts', 'src/api.ts']);
    expect(reviewers).toContain('tech-lead');
    expect(reviewers).toContain('senior-dev');
  });

  it('should decompose task into subtasks', () => {
    const issue = createMockIssue();
    const tasks = planner.decomposeTask(issue);
    expect(tasks).toHaveLength(2);
    expect(tasks[0]?.id).toBe('TASK-123-001');
    expect(tasks[1]?.id).toBe('TASK-123-002');
  });

  it('should assess risk as high for critical priority', async () => {
    const issue = createMockIssue({ priority: 'critical' });
    const plan = await planner.planFromIssue(issue);
    expect(plan.risk).toBe('high');
  });

  it('should assess risk as high for breaking changes', async () => {
    const issue = createMockIssue({ labels: ['breaking'] });
    const plan = await planner.planFromIssue(issue);
    expect(plan.risk).toBe('high');
  });
});

describe('CIMonitor', () => {
  let monitor: CIMonitor;

  beforeEach(() => {
    monitor = new CIMonitor();
  });

  it('should start watching CI for a PR', async () => {
    const status = await monitor.watchCI('pr-42');
    expect(status.prId).toBe('pr-42');
    expect(status.status).toBe('running');
    expect(status.checks).toHaveLength(3);
  });

  it('should return checks for a PR', async () => {
    await monitor.watchCI('pr-42');
    const checks = await monitor.getChecks('pr-42');
    expect(checks).toHaveLength(3);
    expect(checks[0]?.name).toBe('lint');
  });

  it('should return empty checks for unknown PR', async () => {
    const checks = await monitor.getChecks('pr-unknown');
    expect(checks).toHaveLength(0);
  });

  it('should update check status', async () => {
    await monitor.watchCI('pr-42');
    monitor.updateCheckStatus('pr-42', 'lint', 'passed');
    const checks = await monitor.getChecks('pr-42');
    const lintCheck = checks.find((c: Check) => c.name === 'lint');
    expect(lintCheck?.status).toBe('passed');
    expect(lintCheck?.completedAt).toBeDefined();
  });

  it('should detect failure patterns from logs', () => {
    const logs = [
      { timestamp: '2024-01-01T00:00:00Z', level: 'ERROR', message: 'TS2345: Type error', jobId: 'job-1' },
      { timestamp: '2024-01-01T00:00:01Z', level: 'ERROR', message: 'eslint: no-unused-vars', jobId: 'job-1' },
    ];

    const patterns = monitor.detectFailurePatterns(logs);
    expect(patterns.length).toBeGreaterThanOrEqual(1);
    const tsPattern = patterns.find((p) => p.type === 'compilation');
    expect(tsPattern).toBeDefined();
  });

  it('should wait for checks with timeout', async () => {
    await monitor.watchCI('pr-42');

    const promise = monitor.waitForChecks('pr-42', 100);
    await expect(promise).resolves.toHaveProperty('prId', 'pr-42');
  });

  it('should parse logs for a job', async () => {
    const logs = await monitor.parseLogs('job-42');
    expect(logs).toHaveLength(2);
    expect(logs[0]?.jobId).toBe('job-42');
    expect(logs[0]?.level).toBe('INFO');
  });

  it('should return empty patterns when no failure found', () => {
    const logs = [
      { timestamp: '2024-01-01T00:00:00Z', level: 'INFO', message: 'All checks passed', jobId: 'job-1' },
    ];
    const patterns = monitor.detectFailurePatterns(logs);
    expect(patterns).toHaveLength(0);
  });
});

describe('AutoFixer', () => {
  let fixer: AutoFixer;

  beforeEach(() => {
    fixer = new AutoFixer(3);
  });

  it('should analyze failure and return fix plan', async () => {
    const failure: CIStatus = {
      prId: 'pr-42',
      status: 'failed',
      checks: [
        { name: 'typecheck', status: 'failed', description: 'TS2345 error', url: '', startedAt: '2024-01-01T00:00:00Z' },
      ],
      url: '',
      startedAt: '2024-01-01T00:00:00Z',
    };

    const plan = await fixer.analyzeFailure(failure, 'code');
    expect(plan.type).toBe('compilation');
    expect(plan.attempt).toBe(1);
  });

  it('should apply fix successfully within max attempts', async () => {
    const plan = {
      type: 'compilation' as const,
      description: 'Fix type errors',
      files: [{ path: 'src/auth.ts', content: 'fixed content' }],
      attempt: 1,
    };

    const result = await fixer.applyFix(plan);
    expect(result.success).toBe(true);
    expect(result.attempt).toBe(1);
  });

  it('should fail when max attempts exceeded', async () => {
    fixer.maxAttempts = 2;

    const plan = {
      type: 'test' as const,
      description: 'Fix test',
      files: [],
      attempt: 1,
    };

    await fixer.applyFix(plan);
    await fixer.applyFix(plan);

    const result = await fixer.applyFix(plan);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Max attempts');
  });

  it('should retry CI and return running status', async () => {
    const status = await fixer.retryCI('pr-42');
    expect(status.prId).toBe('pr-42');
    expect(status.status).toBe('running');
  });

  it('should learn from failure patterns', () => {
    fixer.learnFromFailure(
      { type: 'lint', pattern: 'no-console', description: 'Console log detected', suggestion: 'Use logger' },
      { type: 'lint', description: 'Fix lint', files: [], attempt: 1 }
    );

    const patterns = fixer.getFixPatterns();
    const learned = patterns.find((p) => p.pattern === 'no-console');
    expect(learned).toBeDefined();
  });

  it('should not duplicate existing patterns on learn', () => {
    const initialCount = fixer.getFixPatterns().length;

    fixer.learnFromFailure(
      { type: 'compilation', pattern: 'TS\\d+.*error', description: 'TypeScript error', suggestion: 'Fix types' },
      { type: 'compilation', description: 'Fix types', files: [], attempt: 1 }
    );

    expect(fixer.getFixPatterns()).toHaveLength(initialCount);
  });

  it('should reset attempts', async () => {
    const plan = {
      type: 'compilation' as const,
      description: 'Fix',
      files: [],
      attempt: 1,
    };

    await fixer.applyFix(plan);
    fixer.resetAttempts();

    const result = await fixer.applyFix(plan);
    expect(result.success).toBe(true);
    expect(result.attempt).toBe(1);
  });
});

describe('ReviewGenerator', () => {
  let generator: ReviewGenerator;

  beforeEach(() => {
    generator = new ReviewGenerator();
  });

  it('should generate review from diff', async () => {
    const diff = 'diff --git a/src/auth.ts b/src/auth.ts\n+const secret = "key"';
    const review = await generator.generateReview(diff, 'test-context');

    expect(review.summary).toBeDefined();
    expect(review.quality).toBeDefined();
    expect(review.quality.score).toBeGreaterThan(0);
    expect(review.quality.grade).toBeDefined();
    expect(review.security).toBeDefined();
    expect(review.coverage).toBeDefined();
    expect(review.performance).toBeDefined();
    expect(review.suggestions).toBeDefined();
    expect(review.decision).toBeDefined();
    expect(review.generatedAt).toBeDefined();
  });

  it('should detect security issues in diff', async () => {
    const diff = 'const api_key = "sk-1234567890";';
    const review = await generator.generateReview(diff, '');

    expect(review.security.passed).toBe(false);
    expect(review.security.findings.length).toBeGreaterThan(0);
    expect(review.security.findings[0]?.type).toBe('secret');
  });

  it('should return quality metrics with dimensions', async () => {
    const metrics = await generator.checkCodeQuality('');
    expect(metrics.dimensions.naming).toBeGreaterThanOrEqual(0);
    expect(metrics.dimensions.complexity).toBeGreaterThanOrEqual(0);
    expect(metrics.dimensions.duplication).toBeGreaterThanOrEqual(0);
    expect(metrics.dimensions.errorHandling).toBeGreaterThanOrEqual(0);
    expect(metrics.dimensions.typeSafety).toBeGreaterThanOrEqual(0);
    expect(metrics.dimensions.testing).toBeGreaterThanOrEqual(0);
    expect(metrics.dimensions.documentation).toBeGreaterThanOrEqual(0);
  });

  it('should provide coverage report', async () => {
    const report = await generator.checkTestCoverage('');
    expect(report.status).toBeDefined();
    expect(report.totalCoverage).toBeGreaterThanOrEqual(0);
    expect(report.diffCoverage).toBeGreaterThanOrEqual(0);
  });

  it('should suggest improvements for low quality dimensions', () => {
    const suggestions = generator.suggestImprovements({
      score: 30,
      grade: 'C',
      dimensions: {
        naming: 5,
        complexity: 5,
        duplication: 5,
        errorHandling: 3,
        typeSafety: 5,
        testing: 3,
        documentation: 2,
      },
    });

    const highPriority = suggestions.filter((s) => s.priority === 'high');
    expect(highPriority.length).toBeGreaterThan(0);
    expect(highPriority[0]?.description).toContain('tests');
  });

  it('should generate summary string', () => {
    const summary = generator.generateSummary('10 files changed');
    expect(summary).toContain('Review Summary');
  });

  it('should block if security finds issues', async () => {
    const diff = 'const password = "hunter2";\nconst token = "ghp_xxxx";';
    const review = await generator.generateReview(diff, '');
    expect(review.decision).toBe('blocked');
  });
});

describe('MergeGate', () => {
  let gate: MergeGate;

  beforeEach(() => {
    gate = new MergeGate();
  });

  it('should allow merge when all gates pass', () => {
    const decision = gate.canMerge({
      id: '42',
      review: {
        summary: 'Good',
        quality: { score: 50, grade: 'B', dimensions: { naming: 7, complexity: 7, duplication: 8, errorHandling: 6, typeSafety: 8, testing: 7, documentation: 7 } },
        security: { passed: true, blocked: false, findings: [], summary: 'Clean' },
        coverage: { status: 'green', totalCoverage: 80, diffCoverage: 85, missingTests: [] },
        performance: { impact: 'low', details: '', suggestions: [] },
        suggestions: [],
        decision: 'approve',
        generatedAt: new Date().toISOString(),
      },
    });

    expect(decision.canMerge).toBe(true);
    expect(decision.failedGates).toHaveLength(0);
  });

  it('should block merge when status checks fail', () => {
    const decision = gate.canMerge({
      id: '42',
      ciResult: {
        prId: '42',
        passed: false,
        checks: [{ name: 'test', status: 'failed', description: 'Tests failed', url: '', startedAt: '' }],
        duration: 1000,
        url: '',
      },
    });

    expect(decision.canMerge).toBe(false);
    expect(decision.failedGates).toContain('status_checks');
  });

  it('should block merge when review is blocked', () => {
    const decision = gate.canMerge({
      id: '42',
      review: {
        summary: 'Bad',
        quality: { score: 10, grade: 'F', dimensions: { naming: 2, complexity: 2, duplication: 3, errorHandling: 1, typeSafety: 1, testing: 1, documentation: 0 } },
        security: { passed: false, blocked: true, findings: [{ severity: 'critical', type: 'secret', file: 'x', line: 1, description: 'Secret found', recommendation: 'Remove' }], summary: 'Security issue' },
        coverage: { status: 'red', totalCoverage: 20, diffCoverage: 10, missingTests: ['auth.test.ts'] },
        performance: { impact: 'high', details: '', suggestions: [] },
        suggestions: [],
        decision: 'blocked',
        generatedAt: new Date().toISOString(),
      },
    });

    expect(decision.canMerge).toBe(false);
    expect(decision.failedGates).toContain('review_decision');
  });

  it('should merge with specified strategy', async () => {
    const result = await gate.merge({ id: '42', branch: 'feature/test' }, 'rebase');
    expect(result.merged).toBe(true);
    expect(result.message).toContain('rebase');
  });

  it('should check approvals', () => {
    expect(gate.checkApprovals({ id: '42' })).toBe(true);
  });

  it('should enforce branch policy', () => {
    expect(gate.enforceBranchPolicy('main')).toBe(true);
    expect(gate.enforceBranchPolicy('develop')).toBe(true);
  });

  it('should return config with defaults', () => {
    const config = gate.getConfig();
    expect(config.strategy).toBe('squash');
    expect(config.requireApproval).toBe(true);
    expect(config.approvalLevel).toBe('N1');
    expect(config.deleteBranchAfterMerge).toBe(true);
  });
});

describe('PRPipeline', () => {
  let pipeline: PRPipeline;

  beforeEach(() => {
    pipeline = new PRPipeline({ maxFixAttempts: 3 });
  });

  it('should execute full pipeline from issue to PR result', async () => {
    const issue = createMockIssue();
    const result = await pipeline.execute(issue);

    expect(result.success).toBe(true);
    expect(result.prId).toBe('PR-123');
    expect(result.plan).toBeDefined();
    expect(result.plan.branchName).toBe('feature/IDEIA-123-add-user-authentication');
    expect(result.implementation).toBeDefined();
    expect(result.testResults).toBeDefined();
    expect(result.testResults?.passed).toBe(true);
    expect(result.ciStatus).toBeDefined();
    expect(result.review).toBeDefined();
    expect(result.mergeDecision).toBeDefined();
    expect(result.mergeResult).toBeDefined();
    expect(result.mergeResult?.merged).toBe(true);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should plan PR from issue', async () => {
    const issue = createMockIssue();
    const plan = await pipeline.planPR(issue);
    expect(plan.branchName).toBeDefined();
    expect(plan.commits).toHaveLength(2);
  });

  it('should implement code from plan', async () => {
    const issue = createMockIssue();
    const plan = await pipeline.planPR(issue);
    const implementation = await pipeline.implementCode(plan);
    expect(implementation.commits).toHaveLength(2);
  });

  it('should return test results', async () => {
    const results = await pipeline.runTests({ changes: [], commits: [] });
    expect(results.passed).toBe(true);
    expect(results.total).toBe(10);
  });

  it('should generate review report', async () => {
    const report = await pipeline.generateReview('diff --git a/src/test.ts');
    expect(report.quality).toBeDefined();
    expect(report.decision).toBeDefined();
  });

  it('should check merge gate', async () => {
    const decision = await pipeline.checkMergeGate({
      id: '42',
      review: {
        summary: 'Good',
        quality: { score: 50, grade: 'B', dimensions: { naming: 7, complexity: 7, duplication: 8, errorHandling: 6, typeSafety: 8, testing: 7, documentation: 7 } },
        security: { passed: true, blocked: false, findings: [], summary: 'Clean' },
        coverage: { status: 'green', totalCoverage: 80, diffCoverage: 85, missingTests: [] },
        performance: { impact: 'low', details: '', suggestions: [] },
        suggestions: [],
        decision: 'approve',
        generatedAt: new Date().toISOString(),
      },
    });
    expect(decision.canMerge).toBe(true);
  });

  it('should handle pipeline with minimal issue gracefully', async () => {
    const issue = createMockIssue({ id: '1', title: 'x', description: 'y', type: 'chore', priority: 'low' });
    const result = await pipeline.execute(issue);
    expect(result.success).toBe(true);
    expect(result.plan).toBeDefined();
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});
