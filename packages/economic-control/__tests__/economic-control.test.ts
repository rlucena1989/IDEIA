import { EconomicControl } from '../src/economic-control';
describe('EconomicControl', () => {
  it('should allocate budget and track spending', () => {
    const ec = new EconomicControl(); ec.allocate('tokens', 100);
    expect(ec.canSpend('tokens', 50)).toBe(true);
    ec.recordCost('tokens', 30, 'GPT-4 query', 'agent-1');
    expect(ec.canSpend('tokens', 80)).toBe(false);
  });
  it('should generate budget report', () => {
    const ec = new EconomicControl(); ec.allocate('tokens', 100); ec.allocate('api', 50);
    ec.recordCost('tokens', 40, 'embedding');
    const report = ec.getReport();
    expect(report.totalBudget).toBe(150);
    expect(report.totalSpent).toBe(40);
    expect(report.remaining).toBe(110);
  });
  it('should detect over-budget', () => {
    const ec = new EconomicControl(); ec.allocate('tokens', 10);
    ec.recordCost('tokens', 15, 'overspent');
    expect(ec.getReport().overBudget).toContain('tokens');
  });
  it('should return null for unknown category', () => {
    const ec = new EconomicControl();
    expect(ec.recordCost('unknown', 10, 'test')).toBeNull();
  });
  it('should filter cost history', () => {
    const ec = new EconomicControl(); ec.allocate('a', 100); ec.allocate('b', 100);
    ec.recordCost('a', 10, 'op1'); ec.recordCost('b', 20, 'op2');
    expect(ec.getCostHistory('a')).toHaveLength(1);
    expect(ec.getCostHistory()).toHaveLength(2);
  });
});
