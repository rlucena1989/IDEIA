import { BudgetManager } from '../src/budget/token-budget';
import { BudgetTracker } from '../src/budget/budget-tracker';
import { EarlyExitDecider } from '../src/budget/early-exit';

describe('BudgetManager', () => {
  const manager = new BudgetManager();

  it('returns budget for task type and level', () => {
    const budget = manager.getBudget('feature', 'N3');
    expect(budget.taskType).toBe('feature');
    expect(budget.complexityLevel).toBe('N3');
    expect(budget.maxTokens).toBeGreaterThan(0);
    expect(budget.warningThreshold).toBeGreaterThan(0);
    expect(budget.hardLimit).toBeGreaterThan(budget.maxTokens);
  });

  it('estimates tokens for different types', () => {
    const featureTokens = manager.estimateTaskTokens('feature', 'N3');
    const questionTokens = manager.estimateTaskTokens('question', 'N3');
    expect(featureTokens).toBeGreaterThan(questionTokens);
  });

  it('allows custom budget per type', () => {
    manager.setCustomBudget('feature', { maxTokens: 10000 });
    const budget = manager.getBudget('feature', 'N3');
    expect(budget.maxTokens).toBe(10000);
  });
});

describe('BudgetTracker', () => {
  const tracker = new BudgetTracker();
  const mockBudget = { taskType: 'bugfix' as const, complexityLevel: 'N2' as const, maxTokens: 1000, warningThreshold: 0.8, hardLimit: 1500 };

  it('allocates budget for a task', () => {
    const allocation = tracker.allocate('task-1', mockBudget);
    expect(allocation.taskId).toBe('task-1');
    expect(allocation.spent).toBe(0);
  });

  it('tracks spending', () => {
    tracker.allocate('task-2', mockBudget);
    tracker.spend('task-2', 200);
    expect(tracker.getSpent('task-2')).toBe(200);
    expect(tracker.getRemaining('task-2')).toBe(800);
  });

  it('detects exhaustion', () => {
    tracker.allocate('task-3', mockBudget);
    tracker.spend('task-3', 1600);
    expect(tracker.isExhausted('task-3')).toBe(true);
  });

  it('detects warning threshold', () => {
    tracker.allocate('task-4', mockBudget);
    tracker.spend('task-4', 850);
    expect(tracker.isWarning('task-4')).toBe(true);
  });

  it('generates usage report', () => {
    tracker.allocate('task-5', mockBudget);
    tracker.spend('task-5', 300, 'planning');
    tracker.spend('task-5', 200, 'execution');
    const report = tracker.getUsageReport('task-5');
    expect(report).not.toBeNull();
    expect(report!.spent).toBe(500);
    expect(report!.stages.planning).toBe(300);
    expect(report!.stages.execution).toBe(200);
  });
});

describe('EarlyExitDecider', () => {
  const decider = new EarlyExitDecider();

  it('exits when sufficient high-confidence evidence', () => {
    const result = decider.shouldExit('bugfix', [
      { type: 'test', value: 'all passing', confidence: 0.9 },
      { type: 'lint', value: 'no errors', confidence: 0.85 },
    ]);
    expect(result.shouldExit).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('does not exit with low-confidence evidence', () => {
    const result = decider.shouldExit('bugfix', [
      { type: 'test', value: 'some passing', confidence: 0.5 },
    ]);
    expect(result.shouldExit).toBe(false);
  });

  it('does not exit without evidence', () => {
    const result = decider.shouldExit('bugfix', []);
    expect(result.shouldExit).toBe(false);
  });
});
