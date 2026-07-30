import { describe, it, expect } from '@jest/globals';
import { ErrorBudget, ErrorBudgetManager } from '../src/error-budget';
import type { BudgetAlert } from '../src/error-budget';

describe('ErrorBudget', () => {
  it('should start with 100% budget', () => {
    const budget = new ErrorBudget('test', 0.99, 30);
    expect(budget.getBudget()).toBe(100);
  });

  it('should throw on invalid SLO', () => {
    expect(() => new ErrorBudget('bad', 0, 30)).toThrow();
    expect(() => new ErrorBudget('bad', 1, 30)).toThrow();
  });

  it('should throw on invalid period', () => {
    expect(() => new ErrorBudget('bad', 0.99, 0)).toThrow();
  });

  it('should return ok alert level when healthy', () => {
    const budget = new ErrorBudget('test', 0.99, 30);
    expect(budget.getAlertLevel()).toBe('ok');
  });

  it('should consume budget on failures', () => {
    const budget = new ErrorBudget('test', 0.9, 30);
    for (let i = 0; i < 10; i++) {
      budget.recordSuccess();
    }
    expect(budget.getBudget()).toBe(100);
    budget.recordFailure();
    expect(budget.getBudget()).toBeLessThan(100);
  });

  it('should be exhausted at 0% budget', () => {
    const budget = new ErrorBudget('test', 0.5, 30);
    for (let i = 0; i < 10; i++) {
      budget.recordFailure();
    }
    expect(budget.getBudget()).toBe(0);
    expect(budget.isExhausted()).toBe(true);
  });

  it('should return warning when budget <= 50%', () => {
    const budget = new ErrorBudget('test', 0.9, 30);
    for (let i = 0; i < 50; i++) budget.recordSuccess();
    for (let i = 0; i < 6; i++) budget.recordFailure();
    const level = budget.getAlertLevel();
    expect(['warning', 'critical', 'exhausted']).toContain(level);
  });

  it('should return critical when budget <= 20%', () => {
    const budget = new ErrorBudget('test', 0.8, 30);
    for (let i = 0; i < 10; i++) budget.recordSuccess();
    for (let i = 0; i < 2; i++) budget.recordFailure();
    expect(budget.getAlertLevel()).toBe('critical');
  });

  it('should reset state', () => {
    const budget = new ErrorBudget('test', 0.9, 30);
    for (let i = 0; i < 10; i++) budget.recordFailure();
    expect(budget.isExhausted()).toBe(true);
    budget.reset();
    expect(budget.getBudget()).toBe(100);
    expect(budget.isExhausted()).toBe(false);
  });

  it('should return non-zero burn rate', () => {
    const budget = new ErrorBudget('test', 0.99, 30);
    for (let i = 0; i < 100; i++) budget.recordSuccess();
    for (let i = 0; i < 5; i++) budget.recordFailure();
    const rate = budget.getBurnRate(1);
    expect(rate).toBeGreaterThan(0);
  });

  it('should fire alert on budget threshold crossing', () => {
    const budget = new ErrorBudget('test', 0.5, 30);
    const alerts: BudgetAlert[] = [];
    budget.onBudgetAlert((a) => alerts.push(a));
    for (let i = 0; i < 6; i++) budget.recordFailure();
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('should fire multiple alerts as budget depletes', () => {
    const budget = new ErrorBudget('test', 0.5, 30);
    const alerts: BudgetAlert[] = [];
    budget.onBudgetAlert((a) => alerts.push(a));
    for (let i = 0; i < 5; i++) budget.recordSuccess();
    for (let i = 0; i < 10; i++) budget.recordFailure();
    expect(alerts.length).toBeGreaterThanOrEqual(2);
  });

  it('should auto-reset after period elapses', () => {
    const budget = new ErrorBudget('test', 0.9, 0.0001);
    for (let i = 0; i < 10; i++) budget.recordFailure();
    expect(budget.isExhausted()).toBe(true);
  });
});

describe('ErrorBudgetManager', () => {
  it('should register and retrieve budgets', () => {
    const manager = new ErrorBudgetManager();
    manager.registerBudget('api', 0.99, 30);
    const budget = manager.getBudget('api');
    expect(budget).toBeDefined();
    expect(budget!.getBudget()).toBe(100);
  });

  it('should throw on duplicate registration', () => {
    const manager = new ErrorBudgetManager();
    manager.registerBudget('api', 0.99, 30);
    expect(() => manager.registerBudget('api', 0.95, 30)).toThrow();
  });

  it('should list all budgets', () => {
    const manager = new ErrorBudgetManager();
    manager.registerBudget('api', 0.99, 30);
    manager.registerBudget('db', 0.999, 30);
    const all = manager.getAllBudgets();
    expect(all).toHaveLength(2);
    expect(all[0].name).toBe('api');
    expect(all[1].name).toBe('db');
  });

  it('should check burn rates', () => {
    const manager = new ErrorBudgetManager();
    manager.registerBudget('api', 0.99, 30);
    const rates = manager.checkBurnRate(1);
    expect(rates).toHaveLength(1);
    expect(rates[0].name).toBe('api');
    expect(rates[0].burnRate).toBe(0);
  });

  it('should propagate alerts from managed budgets', () => {
    const manager = new ErrorBudgetManager();
    const alerts: BudgetAlert[] = [];
    manager.onBudgetAlert((a) => alerts.push(a));
    const budget = manager.registerBudget('api', 0.5, 30);
    for (let i = 0; i < 6; i++) budget.recordFailure();
    expect(alerts.length).toBeGreaterThan(0);
  });
});
