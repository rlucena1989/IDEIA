import { SWEBenchEvaluator } from '../evaluator';
import { SWEBenchTask, SWEBenchConfig } from '../types';

const sampleTask: SWEBenchTask = {
  id: 'django-123', repo: 'django/django', baseCommit: 'abc123',
  problemStatement: 'Fix admin panel pagination bug',
  hints: ['Look at django/contrib/admin/options.py'],
  createdPatch: 'diff --git a/file.py b/file.py\n--- a/file.py\n+++ b/file.py\n@@ -1,3 +1,4 @@\n-old line\n+new line\n',
  testCommands: ['python -m pytest tests/test_admin.py -x'],
  environment: 'python:3.11', instanceId: 'django__django-123',
  createdAt: '2024-01-01T00:00:00Z',
};

const sampleConfig: SWEBenchConfig = {
  tasksFilePath: './tasks.json', maxParallelism: 4, timeoutPerTaskMs: 900000,
  modelName: 'qwen2.5:7b', agentVersion: '1.0.0', outputDir: './reports',
  skipCached: false, dryRun: true,
};

describe('SWEBenchEvaluator', () => {
  let evaluator: SWEBenchEvaluator;
  beforeEach(() => { evaluator = new SWEBenchEvaluator(); });

  test('should start empty', () => {
    expect(evaluator.computeMetrics().totalTasks).toBe(0);
  });

  test('should load tasks', () => {
    evaluator.loadTasks([sampleTask]);
    expect(evaluator.getTasks()).toHaveLength(1);
  });

  test('should add single result', () => {
    evaluator.addResult({ taskId: 'test-1', resolved: true, generatedPatch: '', diffFromGold: '',
      resolvedBy: 'agent', attempts: 1, durationMs: 10000, costUsd: 0.003, tokensUsed: 500, logs: [], finalStatus: 'resolved' });
    expect(evaluator.getResults()).toHaveLength(1);
  });

  test('should compute metrics correctly', () => {
    evaluator.addResult({ taskId: 'pass-1', resolved: true, generatedPatch: '', diffFromGold: '',
      resolvedBy: 'agent', attempts: 1, durationMs: 5000, costUsd: 0.002, tokensUsed: 300, logs: [], finalStatus: 'resolved' });
    evaluator.addResult({ taskId: 'fail-1', resolved: false, generatedPatch: '', diffFromGold: '',
      resolvedBy: 'unresolved', attempts: 3, durationMs: 30000, costUsd: 0.01, tokensUsed: 1500, logs: [], errorMessage: 'Timeout', finalStatus: 'error' });
    const metrics = evaluator.computeMetrics();
    expect(metrics.totalTasks).toBe(2);
    expect(metrics.resolved).toBe(1);
    expect(metrics.resolveRate).toBe(0.5);
    expect(metrics.errors).toBe(1);
  });

  test('should evaluate task in dry-run mode', async () => {
    const result = await evaluator.evaluateSingleTask(sampleTask, { ...sampleConfig, dryRun: true });
    expect(result.taskId).toBe('django-123');
    expect(result.resolved).toBe(false);
    expect(result.logs.length).toBeGreaterThan(0);
  });

  test('should generate CSV output', () => {
    evaluator.addResult({ taskId: 'test-1', resolved: true, generatedPatch: '', diffFromGold: '',
      resolvedBy: 'agent', attempts: 1, durationMs: 10000, costUsd: 0.003, tokensUsed: 500, logs: [], finalStatus: 'resolved' });
    expect(evaluator.toCsv()).toContain('taskId,resolved,durationMs');
    expect(evaluator.toCsv()).toContain('test-1');
  });

  test('should compute diff between patches', () => {
    expect(evaluator.computeDiff('patch', 'patch')).toBe('Exact match');
    expect(evaluator.computeDiff('', '')).toBe('N/A');
  });

  test('should rank results', () => {
    evaluator.addResult({ taskId: 'fast-pass', resolved: true, generatedPatch: '', diffFromGold: '',
      resolvedBy: 'agent', attempts: 1, durationMs: 1000, costUsd: 0.001, tokensUsed: 100, logs: [], finalStatus: 'resolved' });
    evaluator.addResult({ taskId: 'fail', resolved: false, generatedPatch: '', diffFromGold: '',
      resolvedBy: 'unresolved', attempts: 3, durationMs: 500000, costUsd: 0.01, tokensUsed: 2000, logs: [], errorMessage: 'Failed', finalStatus: 'error' });
    const ranking = evaluator.getSortableRanking();
    expect(ranking).toHaveLength(2);
    expect(ranking[0].score).toBeGreaterThan(ranking[1].score);
  });

  test('should reset state', () => {
    evaluator.loadTasks([sampleTask]);
    evaluator.addResult({ taskId: 'test-1', resolved: true, generatedPatch: '', diffFromGold: '',
      resolvedBy: 'agent', attempts: 1, durationMs: 10000, costUsd: 0.003, tokensUsed: 500, logs: [], finalStatus: 'resolved' });
    evaluator.reset();
    expect(evaluator.getTasks()).toHaveLength(0);
    expect(evaluator.getResults()).toHaveLength(0);
  });

  test('should evaluate multiple tasks and compute aggregate metrics', async () => {
    const task2: SWEBenchTask = { ...sampleTask, id: 'flask-456', repo: 'pallets/flask', baseCommit: 'def456',
      problemStatement: 'Fix routing issue', hints: [], createdPatch: '',
      testCommands: ['python -m pytest tests/'], environment: 'python:3.10',
      instanceId: 'pallets__flask-456', createdAt: '2024-01-02T00:00:00Z' };
    evaluator.loadTasks([sampleTask, task2]);
    const r1 = await evaluator.evaluateSingleTask(sampleTask, sampleConfig);
    const r2 = await evaluator.evaluateSingleTask(task2, sampleConfig);
    evaluator.addResults([r1, r2]);
    expect(evaluator.getResults()).toHaveLength(2);
    expect(evaluator.computeMetrics().totalTasks).toBe(2);
  });

  test('should handle mixed success/failure in ranking', () => {
    for (let i = 0; i < 5; i++) {
      evaluator.addResult({ taskId: 'task-' + i, resolved: i % 2 === 0, generatedPatch: '', diffFromGold: '',
        resolvedBy: i % 2 === 0 ? 'agent' : 'unresolved', attempts: i + 1, durationMs: (i + 1) * 10000,
        costUsd: 0.001 * (i + 1), tokensUsed: 100 * (i + 1), logs: [], finalStatus: i % 2 === 0 ? 'resolved' : 'error' });
    }
    const m = evaluator.computeMetrics();
    expect(m.totalTasks).toBe(5);
    expect(m.resolved).toBe(3);
    expect(m.medianDurationMs).toBeGreaterThan(0);
    expect(m.p95DurationMs).toBeGreaterThan(0);
  });
});