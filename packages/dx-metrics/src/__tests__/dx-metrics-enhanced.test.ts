import { DORACalculator, DeployEvent, DORATargets } from '../dora-metrics';
import { SPACECalculator } from '../space-framework';
import { DXReporter } from '../dx-reporter';
import { DevExMetricCollector } from '../collector';

function _makeEvent(overrides: Partial<DeployEvent> & { timestamp: string; duration: number }): DeployEvent {
  return { success: true, ...overrides };
}

describe('DORACalculator', () => {
  const calc = new DORACalculator();

  it('calculate returns correct deploy frequency', () => {
    const events: DeployEvent[] = [
      { timestamp: '2026-07-20T10:00:00Z', duration: 2, success: true },
      { timestamp: '2026-07-20T14:00:00Z', duration: 3, success: true },
      { timestamp: '2026-07-21T10:00:00Z', duration: 1, success: true },
      { timestamp: '2026-07-21T16:00:00Z', duration: 4, success: true },
      { timestamp: '2026-07-22T10:00:00Z', duration: 2, success: true },
    ];
    const result = calc.calculate(events);
    expect(result.deployFrequency).toBeCloseTo(1.67, 1);
    expect(result.leadTime).toBeGreaterThan(0);
    expect(result.changeFailureRate).toBe(0);
    expect(result.mttr).toBe(0);
    expect(result.timestamp).toBeDefined();
  });

  it('compare with elite targets returns elite status', () => {
    const events: DeployEvent[] = Array.from({ length: 20 }, (_, i) => ({
      timestamp: '2026-07-20T' + String(i).padStart(2, '0') + ':00:00Z' as string,
      duration: 0.3 + (i % 5) * 0.05,
      success: true,
    }));
    const metrics = calc.calculate(events);
    const elite = calc.getEliteTargets();
    const comparisons = calc.compare(metrics, elite);
    for (const c of comparisons) {
      expect(c.status).toBe('elite');
    }
  });

  it('compare with low targets returns low status', () => {
    const metrics = calc.calculate([
      { timestamp: '2026-07-20T10:00:00Z', duration: 48, success: true },
      { timestamp: '2026-07-27T10:00:00Z', duration: 72, success: false, recoveryDuration: 24 },
    ]);
    const targets: DORATargets = { deployFrequency: 10, leadTime: 1, mttr: 1, changeFailureRate: 5 };
    const comparisons = calc.compare(metrics, targets);
    for (const c of comparisons) {
      expect(['low', 'medium']).toContain(c.status);
    }
  });

  it('returns zero metrics for empty events', () => {
    const result = calc.calculate([]);
    expect(result.deployFrequency).toBe(0);
    expect(result.leadTime).toBe(0);
    expect(result.mttr).toBe(0);
    expect(result.changeFailureRate).toBe(0);
  });
});

describe('SPACECalculator', () => {
  it('calculate returns all dimensions within range', async () => {
    const calc = new SPACECalculator();
    const score = await calc.calculate();
    expect(score.satisfaction).toBeGreaterThanOrEqual(0);
    expect(score.satisfaction).toBeLessThanOrEqual(100);
    expect(score.performance).toBeGreaterThanOrEqual(0);
    expect(score.performance).toBeLessThanOrEqual(100);
    expect(score.activity).toBeGreaterThanOrEqual(0);
    expect(score.activity).toBeLessThanOrEqual(100);
    expect(score.communication).toBeGreaterThanOrEqual(0);
    expect(score.communication).toBeLessThanOrEqual(100);
    expect(score.efficiency).toBeGreaterThanOrEqual(0);
    expect(score.efficiency).toBeLessThanOrEqual(100);
    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(100);
  });

  it('overall score is weighted average', async () => {
    const calc = new SPACECalculator();
    const score = await calc.calculate();
    const expected = Math.round(75 * 0.25 + 70 * 0.20 + 65 * 0.15 + 80 * 0.20 + 72 * 0.20);
    expect(score.overall).toBe(expected);
  });
});

describe('DXReporter', () => {
  it('generateReport produces complete report', async () => {
    const collector = new DevExMetricCollector();
    const reporter = new DXReporter(collector);
    const events: DeployEvent[] = [
      { timestamp: '2026-07-20T10:00:00Z', duration: 2, success: true },
      { timestamp: '2026-07-20T14:00:00Z', duration: 3, success: true },
    ];
    const report = await reporter.generateReport(events);
    expect(report.dora).toBeDefined();
    expect(report.dora.deployFrequency).toBeGreaterThan(0);
    expect(report.space).toBeDefined();
    expect(report.space.overall).toBeGreaterThan(0);
    expect(report.alerts).toBeDefined();
    expect(report.generatedAt).toBeDefined();
  });

  it('generateSummary returns non-empty string', async () => {
    const collector = new DevExMetricCollector();
    const reporter = new DXReporter(collector);
    const events: DeployEvent[] = [
      { timestamp: '2026-07-20T10:00:00Z', duration: 2, success: true },
    ];
    const report = await reporter.generateReport(events);
    const summary = reporter.generateSummary(report);
    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toContain('DORA:');
    expect(summary).toContain('SPACE:');
  });

  it('getTrends detects improving direction', async () => {
    const collector = new DevExMetricCollector();
    const reporter = new DXReporter(collector);
    const events1: DeployEvent[] = [
      { timestamp: '2026-07-20T10:00:00Z', duration: 5, success: true },
    ];
    const events2: DeployEvent[] = [
      { timestamp: '2026-07-20T10:00:00Z', duration: 5, success: true },
      { timestamp: '2026-07-20T14:00:00Z', duration: 3, success: true },
      { timestamp: '2026-07-21T10:00:00Z', duration: 2, success: true },
    ];
    const report1 = await reporter.generateReport(events1);
    const report2 = await reporter.generateReport(events2);
    const trends = reporter.getTrends([report1, report2]);
    const deployTrend = trends.find(t => t.metric === 'deploy-frequency');
    expect(deployTrend).toBeDefined();
    expect(deployTrend!.direction).toBe('improving');
  });

  it('getTrends detects declining direction', async () => {
    const collector = new DevExMetricCollector();
    const reporter = new DXReporter(collector);
    const events1: DeployEvent[] = [
      { timestamp: '2026-07-20T10:00:00Z', duration: 2, success: true },
      { timestamp: '2026-07-20T14:00:00Z', duration: 3, success: true },
    ];
    const events2: DeployEvent[] = [
      { timestamp: '2026-07-27T10:00:00Z', duration: 5, success: true },
    ];
    const report1 = await reporter.generateReport(events1);
    const report2 = await reporter.generateReport(events2);
    const trends = reporter.getTrends([report1, report2]);
    const deployTrend = trends.find(t => t.metric === 'deploy-frequency');
    expect(deployTrend).toBeDefined();
    expect(deployTrend!.direction).toBe('declining');
  });
});
