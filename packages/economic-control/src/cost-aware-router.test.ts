import { CostAwareRouter } from './cost-aware-router';

describe('CostAwareRouter', () => {
  it('should prefer local model when specified', () => {
    const router = new CostAwareRouter();
    const model = router.selectModel({ complexity: 'high', estimatedTokens: 1000, preferLocal: true });
    expect(model).toBe('deepseek-coder-v2');
  });

  it('should select gpt-4o for high complexity tasks', () => {
    const router = new CostAwareRouter();
    const model = router.selectModel({ complexity: 'high', estimatedTokens: 500 });
    expect(model).toBe('gpt-4o');
  });

  it('should select cheap model for low complexity tasks', () => {
    const router = new CostAwareRouter();
    const model = router.selectModel({ complexity: 'low', estimatedTokens: 100 });
    expect(model).toBe('deepseek-coder-v2');
  });

  it('should respect max cost constraints', () => {
    const router = new CostAwareRouter({ maxPerRequest: 0.0005 });
    const model = router.selectModel({ complexity: 'medium', estimatedTokens: 100, maxCost: 0.0005 });
    expect(model).toBe('deepseek-coder-v2');
  });

  it('should fallback to local when budget exhausted', () => {
    const router = new CostAwareRouter({ dailyBudget: 0.001, maxPerRequest: 100 });
    router.recordCost('gpt-4o', 100000, 50000);
    const model = router.selectModel({ complexity: 'high', estimatedTokens: 1000 });
    expect(model).toBe('deepseek-coder-v2');
  });

  it('should track daily budget status', () => {
    const router = new CostAwareRouter({ dailyBudget: 100 });
    const status = router.getBudgetStatus();
    expect(status.dailyBudget).toBe(100);
    expect(status.remaining).toBeGreaterThan(0);
    expect(status.requestCount).toBe(0);
  });

  it('should calculate accurate costs', () => {
    const router = new CostAwareRouter();
    const cost = router.recordCost('gpt-4o-mini', 1000, 500);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.01);
  });
});
