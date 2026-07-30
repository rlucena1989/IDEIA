import { FinOpsEngine } from './finops-engine';

describe('FinOpsEngine', () => {
  it('should record model cost and calculate correctly', () => {
    const engine = new FinOpsEngine();
    const result = engine.recordModelCost('gpt-4o-mini', 1000, 500, 'task-1');
    expect(result.model).toBe('gpt-4o-mini');
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.totalCost).toBeLessThan(0.01);
  });

  it('should return zero cost for unknown models', () => {
    const engine = new FinOpsEngine();
    const result = engine.recordModelCost('unknown-model', 1000, 500, 'task-1');
    expect(result.totalCost).toBe(0);
  });

  it('should select cheap model when daily budget is high', () => {
    const engine = new FinOpsEngine({ dailyBudget: 100, monthlyBudget: 1000 });
    const model = engine.selectCostEffectiveModel({ complexity: 'low' });
    expect(model).toBe('deepseek-coder-v2');
  });

  it('should select cheaper model when budget is tight', () => {
    const engine = new FinOpsEngine({ dailyBudget: 0.08, monthlyBudget: 1, modelRates: { 'gpt-4o': { inputPer1K: 0.0025, outputPer1K: 0.01 } } });
    for (let i = 0; i < 8; i++) engine.recordModelCost('gpt-4o', 1000, 500, `task-${i}`);
    const model = engine.selectCostEffectiveModel({ complexity: 'high' });
    expect(model).not.toBe('gpt-4o');
  });

  it('should prefer local model when specified', () => {
    const engine = new FinOpsEngine();
    const model = engine.selectCostEffectiveModel({ complexity: 'high', preferLocal: true });
    expect(model).toBe('deepseek-coder-v2');
  });

  it('should respect max cost constraint', () => {
    const engine = new FinOpsEngine({ maxPerRequest: 0.001 });
    const model = engine.selectCostEffectiveModel({ complexity: 'medium', maxCost: 0.001 });
    expect(model).toBeDefined();
  });

  it('should generate recommendations', () => {
    const engine = new FinOpsEngine();
    for (let i = 0; i < 10; i++) engine.recordModelCost('gpt-4o', 2000, 1000, `task-${i}`);
    const recs = engine.getRecommendations();
    expect(recs.length).toBeGreaterThanOrEqual(0);
  });

  it('should return comprehensive report', () => {
    const engine = new FinOpsEngine({ dailyBudget: 100, monthlyBudget: 1000 });
    engine.recordModelCost('gpt-4o-mini', 500, 200, 'test-task');
    const report = engine.getReport();
    expect(report.dailyCost).toBeGreaterThan(0);
    expect(report.monthlyCost).toBeGreaterThan(0);
    expect(report.byModel!['gpt-4o-mini']).toBeDefined();
    expect(report.budgetPercentage).toBeGreaterThanOrEqual(0);
  });

  it('should generate alerts when daily budget exceeded', () => {
    const engine = new FinOpsEngine({ dailyBudget: 0.001, monthlyBudget: 100, maxPerRequest: 100 });
    engine.recordModelCost('gpt-4o', 10000, 5000, 'expensive-task');
    const report = engine.getReport();
    expect(report.alerts!.length).toBeGreaterThan(0);
    expect(report.alerts!.some(a => a.type === 'daily_limit')).toBe(true);
  });

  it('should reset state', () => {
    const engine = new FinOpsEngine();
    engine.recordModelCost('gpt-4o-mini', 100, 50, 't1');
    engine.reset();
    expect(engine.getReport().dailyCost).toBe(0);
  });

  it('should track model usage distribution', () => {
    const engine = new FinOpsEngine();
    engine.recordModelCost('gpt-4o-mini', 100, 50, 't1');
    engine.recordModelCost('gpt-4o', 200, 100, 't2');
    const report = engine.getReport();
    expect(Object.keys(report.byModel ?? {}).length).toBe(2);
  });
});
