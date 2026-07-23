import { PerformanceMonitor } from '../src/performance-monitor';
describe('PerformanceMonitor', () => {
  it('should record metrics', () => {
    const pm = new PerformanceMonitor();
    pm.recordMetric('api_latency', 200); pm.recordMetric('api_latency', 300);
    expect(pm.getMetricHistory('api_latency')).toHaveLength(2);
  });
  it('should check individual budget', () => {
    const pm = new PerformanceMonitor();
    const r1 = pm.checkBudget('api_latency', 100); expect(r1!.passed).toBe(true);
    const r2 = pm.checkBudget('api_latency', 1000); expect(r2!.passed).toBe(false);
  });
  it('should return null for unknown metric', () => {
    const pm = new PerformanceMonitor();
    expect(pm.checkBudget('unknown', 0)).toBeNull();
  });
  it('should check all budgets', () => {
    const pm = new PerformanceMonitor();
    pm.recordMetric('bundle_size', 100000); pm.recordMetric('api_latency', 100);
    const report = pm.checkAll();
    expect(report.totalChecks).toBeGreaterThan(2);
  });
  it('should set budget', () => {
    const pm = new PerformanceMonitor();
    expect(pm.setBudget('api_latency', 1000)).toBe(true);
    expect(pm.setBudget('unknown', 100)).toBe(false);
  });
  it('should reset budget', () => {
    const pm = new PerformanceMonitor();
    pm.setBudget('api_latency', 9999); pm.resetBudget();
    const budget = pm.getBudget().metrics.find(m => m.name === 'api_latency');
    expect(budget!.budget).toBe(500);
  });
});
