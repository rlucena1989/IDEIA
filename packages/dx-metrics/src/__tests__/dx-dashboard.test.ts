import { DxDashboardBuilder } from '../dx-dashboard';
import { CIDoraCollector, CIEvent } from '../ci-dora-collector';
import { DORATargets } from '../dora-metrics';
import { DXReport } from '../dx-reporter';

describe('DxDashboardBuilder', () => {
  const builder = new DxDashboardBuilder();

  function makeEliteReport(): DXReport {
    return {
      dora: { deployFrequency: 20, leadTime: 0.5, mttr: 0.5, changeFailureRate: 2, timestamp: '2026-07-25T10:00:00Z' },
      space: { satisfaction: 90, performance: 92, activity: 85, communication: 88, efficiency: 90, overall: 89 },
      trends: [],
      alerts: [],
      generatedAt: '2026-07-25T10:00:00Z',
    };
  }

  function makeLowReport(): DXReport {
    return {
      dora: { deployFrequency: 0.2, leadTime: 96, mttr: 48, changeFailureRate: 50, timestamp: '2026-07-25T10:00:00Z' },
      space: { satisfaction: 30, performance: 25, activity: 20, communication: 35, efficiency: 28, overall: 28 },
      trends: [],
      alerts: ['Critical: deploy frequency too low', 'Critical: high change failure rate'],
      generatedAt: '2026-07-25T10:00:00Z',
    };
  }

  it('buildFromReport returns all 9 panels', () => {
    const targets: DORATargets = { deployFrequency: 10, leadTime: 1, mttr: 1, changeFailureRate: 5 };
    const report = makeEliteReport();
    const dashboard = builder.buildFromReport(report, targets);

    expect(dashboard.dora.deployFrequency).toBeDefined();
    expect(dashboard.dora.leadTime).toBeDefined();
    expect(dashboard.dora.mttr).toBeDefined();
    expect(dashboard.dora.changeFailureRate).toBeDefined();
    expect(dashboard.space.satisfaction).toBeDefined();
    expect(dashboard.space.performance).toBeDefined();
    expect(dashboard.space.activity).toBeDefined();
    expect(dashboard.space.communication).toBeDefined();
    expect(dashboard.space.efficiency).toBeDefined();
    expect(dashboard.overall).toBeDefined();
    expect(dashboard.overall.score).toBeGreaterThanOrEqual(0);
  });

  it('status determination with elite metrics', () => {
    const targets: DORATargets = { deployFrequency: 10, leadTime: 1, mttr: 1, changeFailureRate: 5 };
    const report = makeEliteReport();
    const dashboard = builder.buildFromReport(report, targets);

    expect(dashboard.dora.deployFrequency.status).toBe('elite');
    expect(dashboard.dora.leadTime.status).toBe('elite');
    expect(dashboard.dora.mttr.status).toBe('elite');
    expect(dashboard.dora.changeFailureRate.status).toBe('elite');
  });

  it('status determination with low metrics', () => {
    const targets: DORATargets = { deployFrequency: 10, leadTime: 1, mttr: 1, changeFailureRate: 5 };
    const report = makeLowReport();
    const dashboard = builder.buildFromReport(report, targets);

    expect(dashboard.dora.deployFrequency.status).toBe('low');
    expect(dashboard.dora.leadTime.status).toBe('low');
    expect(dashboard.dora.mttr.status).toBe('low');
    expect(dashboard.dora.changeFailureRate.status).toBe('low');
  });

  it('trend analysis in overall score', () => {
    const targets: DORATargets = { deployFrequency: 10, leadTime: 1, mttr: 1, changeFailureRate: 5 };
    const report = makeEliteReport();
    const dashboard = builder.buildFromReport(report, targets);

    expect(dashboard.overall.trend).toBeDefined();
    expect(['improving', 'declining', 'stable']).toContain(dashboard.overall.trend);
  });

  it('overall score calculation within valid range', () => {
    const targets: DORATargets = { deployFrequency: 10, leadTime: 1, mttr: 1, changeFailureRate: 5 };
    const report = makeEliteReport();
    const dashboard = builder.buildFromReport(report, targets);

    expect(dashboard.overall.score).toBeGreaterThanOrEqual(0);
    expect(dashboard.overall.score).toBeLessThanOrEqual(100);
  });

  it('alert generation passes through from report', () => {
    const targets: DORATargets = { deployFrequency: 10, leadTime: 1, mttr: 1, changeFailureRate: 5 };
    const report = makeLowReport();
    const dashboard = builder.buildFromReport(report, targets);

    expect(dashboard.overall.alerts.length).toBe(2);
    expect(dashboard.overall.alerts[0]).toContain('Critical');
  });

  it('buildFromReport with empty alerts', () => {
    const targets: DORATargets = { deployFrequency: 10, leadTime: 1, mttr: 1, changeFailureRate: 5 };
    const report = makeEliteReport();
    const dashboard = builder.buildFromReport(report, targets);

    expect(dashboard.overall.alerts.length).toBe(0);
  });

  it('dashboard lastUpdated matches report generatedAt', () => {
    const targets: DORATargets = { deployFrequency: 10, leadTime: 1, mttr: 1, changeFailureRate: 5 };
    const report = makeEliteReport();
    const dashboard = builder.buildFromReport(report, targets);

    expect(dashboard.overall.lastUpdated).toBe('2026-07-25T10:00:00Z');
  });

  it('each panel has correct shape', () => {
    const targets: DORATargets = { deployFrequency: 10, leadTime: 1, mttr: 1, changeFailureRate: 5 };
    const report = makeEliteReport();
    const dashboard = builder.buildFromReport(report, targets);

    const panel = dashboard.dora.deployFrequency;
    expect(panel.title).toBe('Deploy Frequency');
    expect(typeof panel.value).toBe('number');
    expect(typeof panel.target).toBe('number');
    expect(typeof panel.status).toBe('string');
    expect(typeof panel.trend).toBe('string');
    expect(Array.isArray(panel.sparkline)).toBe(true);
  });
});

describe('CIDoraCollector', () => {
  let collector: CIDoraCollector;

  beforeEach(() => {
    collector = new CIDoraCollector();
  });

  it('processEvent stores event', () => {
    const event: CIEvent = { type: 'deploy', timestamp: '2026-07-25T10:00:00Z', duration: 0.5, environment: 'production' };
    collector.processEvent(event);
    const metrics = collector.getMetrics();
    expect(metrics.deployFrequency).toBeGreaterThan(0);
  });

  it('getMetrics after recording multiple events', () => {
    collector.processEvent({ type: 'deploy', timestamp: '2026-07-25T08:00:00Z', duration: 0.5, environment: 'production' });
    collector.processEvent({ type: 'deploy', timestamp: '2026-07-25T12:00:00Z', duration: 0.3, environment: 'production' });
    collector.processEvent({ type: 'failure', timestamp: '2026-07-25T14:00:00Z', duration: 0.1, environment: 'production' });
    collector.processEvent({ type: 'recovery', timestamp: '2026-07-25T15:00:00Z', duration: 0.8, environment: 'production' });
    collector.processEvent({ type: 'deploy', timestamp: '2026-07-26T10:00:00Z', duration: 0.4, environment: 'production' });

    const metrics = collector.getMetrics();
    expect(metrics.deployFrequency).toBeGreaterThan(0);
    expect(metrics.leadTime).toBeGreaterThan(0);
    expect(metrics.mttr).toBeGreaterThan(0);
    expect(metrics.changeFailureRate).toBeGreaterThan(0);
  });

  it('getDailyMetrics filters by date', () => {
    collector.processEvent({ type: 'deploy', timestamp: '2026-07-25T08:00:00Z', duration: 0.5 });
    collector.processEvent({ type: 'deploy', timestamp: '2026-07-26T10:00:00Z', duration: 0.3 });

    const dayMetrics = collector.getDailyMetrics('2026-07-25');
    expect(dayMetrics.deployFrequency).toBeGreaterThan(0);
    expect(dayMetrics.leadTime).toBe(0.5);
  });

  it('getDailyMetrics returns zeros for empty day', () => {
    const metrics = collector.getDailyMetrics('2026-07-20');
    expect(metrics.deployFrequency).toBe(0);
    expect(metrics.leadTime).toBe(0);
    expect(metrics.mttr).toBe(0);
    expect(metrics.changeFailureRate).toBe(0);
  });

  it('getWeeklyTrend returns 7 entries', () => {
    collector.processEvent({ type: 'deploy', timestamp: '2026-07-25T08:00:00Z', duration: 0.5 });
    collector.processEvent({ type: 'deploy', timestamp: '2026-07-24T10:00:00Z', duration: 0.3 });
    collector.processEvent({ type: 'deploy', timestamp: '2026-07-23T12:00:00Z', duration: 0.4 });

    const trend = collector.getWeeklyTrend();
    expect(trend.length).toBe(7);
    trend.forEach(entry => {
      expect(entry.deployFrequency).toBeDefined();
      expect(entry.leadTime).toBeDefined();
      expect(entry.mttr).toBeDefined();
      expect(entry.changeFailureRate).toBeDefined();
    });
  });

  it('getMetrics returns correct structure', () => {
    const metrics = collector.getMetrics();
    expect(metrics).toHaveProperty('deployFrequency');
    expect(metrics).toHaveProperty('leadTime');
    expect(metrics).toHaveProperty('mttr');
    expect(metrics).toHaveProperty('changeFailureRate');
    expect(metrics).toHaveProperty('timestamp');
  });

  it('handles rollback events gracefully', () => {
    collector.processEvent({ type: 'rollback', timestamp: '2026-07-25T10:00:00Z', duration: 0.2, environment: 'production' });
    const metrics = collector.getMetrics();
    expect(metrics.changeFailureRate).toBe(0);
  });

  it('getWeeklyTrend with no events returns zero metrics', () => {
    const trend = collector.getWeeklyTrend();
    expect(trend.length).toBe(7);
    trend.forEach(entry => {
      expect(entry.deployFrequency).toBe(0);
    });
  });
});
