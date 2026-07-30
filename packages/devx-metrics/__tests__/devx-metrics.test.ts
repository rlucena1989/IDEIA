import { DevXMetricsCollector } from '../src/devx-metrics-collector';
import { DORAMetricsCalculator } from '../src/dora-metrics-calculator';
import { SPACEFrameworkAnalyzer } from '../src/space-framework-analyzer';
import { SurveyManager } from '../src/survey-manager';
import { TrendAnalyzer } from '../src/trend-analyzer';
import { ProductivityDashboard } from '../src/productivity-dashboard';
import { MetricEvent, SurveyResponse, AggregatedReport } from '../src/types';

describe('DevXMetricsCollector', () => {
  let collector: DevXMetricsCollector;

  beforeEach(() => { collector = new DevXMetricsCollector(); });

  test('should record events', async () => {
    await collector.record({ type: 'deploy', timestamp: new Date(), duration: 10, status: 'success', metadata: {} });
    expect(collector.countByType('deploy')).toBe(1);
  });

  test('should record batch', async () => {
    await collector.recordBatch([
      { type: 'deploy', timestamp: new Date(), duration: 5, status: 'success', metadata: {} },
      { type: 'pr_merge', timestamp: new Date(), duration: 60, status: 'success', metadata: {} },
    ]);
    expect(collector.countByType('deploy')).toBe(1);
    expect(collector.countByType('pr_merge')).toBe(1);
  });

  test('should filter by type', () => {
    expect(collector.getEvents('deploy').length).toBe(0);
  });
});

describe('DORAMetricsCalculator', () => {
  let collector: DevXMetricsCollector;
  let calculator: DORAMetricsCalculator;

  beforeEach(() => {
    collector = new DevXMetricsCollector();
    calculator = new DORAMetricsCalculator(collector);
  });

  test('should calculate DORA metrics', async () => {
    const metrics = await calculator.calculate('24h');
    expect(metrics.deployFrequency).toBe(0);
    expect(metrics.leadTime).toBe(0);
    expect(metrics.mttr).toBe(0);
    expect(metrics.changeFailureRate).toBe(0);
  });

  test('should get history', async () => {
    const history = await calculator.getHistory(7);
    expect(history.length).toBe(7);
  });

  test('should analyze deployment velocity', async () => {
    const velocity = await calculator.analyzeDeploymentVelocity();
    expect(velocity.daily).toBe(0);
    expect(['increasing', 'stable', 'decreasing']).toContain(velocity.trend);
  });
});

describe('SPACEFrameworkAnalyzer', () => {
  let analyzer: SPACEFrameworkAnalyzer;

  beforeEach(() => { analyzer = new SPACEFrameworkAnalyzer(); });

  test('should analyze SPACE scores', async () => {
    const report = { period: '24h' as const, deployFrequency: 1, leadTime: 30, mttr: 15, changeFailureRate: 0.05, cycleTime: 60, prTurnaround: 120, blockRate: 0.08, reworkRate: 0.1, sampleSize: 100 };
    const score = await analyzer.analyze(report);
    expect(score.satisfaction).toBeGreaterThanOrEqual(0);
    expect(score.performance).toBeGreaterThanOrEqual(0);
    expect(score.activity).toBeGreaterThanOrEqual(0);
  });

  test('should add survey responses', () => {
    analyzer.addResponse({ id: 'r1', userId: 'u1', dimension: 'satisfaction', score: 4, type: 'likert', isPositive: true, timestamp: new Date() });
    expect(analyzer.getResponseCount()).toBe(1);
  });
});

describe('SurveyManager', () => {
  let sm: SurveyManager;

  beforeEach(() => { sm = new SurveyManager(); });

  test('should register and get template', () => {
    sm.registerTemplate({
      id: 't1', name: 'Dev Survey', dimensions: ['satisfaction'],
      questions: [{ id: 'q1', text: 'Rate satisfaction', dimension: 'satisfaction', type: 'likert' }],
      frequency: 'monthly',
    });
    expect(sm.getTemplate('t1')).toBeDefined();
  });

  test('should create survey responses', () => {
    sm.registerTemplate({
      id: 't2', name: 'Test', dimensions: ['satisfaction', 'autonomy'],
      questions: [
        { id: 'q1', text: 'Q1', dimension: 'satisfaction', type: 'likert' },
        { id: 'q2', text: 'Q2', dimension: 'autonomy', type: 'likert' },
      ],
      frequency: 'monthly',
    });
    const responses = sm.createSurvey('t2', 'user1', { q1: 5, q2: 4 });
    expect(responses.length).toBe(2);
  });

  test('should compute NPS', () => {
    expect(sm.computeNPS()).toBe(0);
  });

  test('should compute correlations', async () => {
    const result = await sm.computeCorrelations({ cycleTime: 60, blockRate: 0.1, leadTime: 30, changeFailureRate: 0.05 });
    expect(result.nps).toBe(0);
  });
});

describe('TrendAnalyzer', () => {
  let collector: DevXMetricsCollector;
  let analyzer: TrendAnalyzer;

  beforeEach(() => {
    collector = new DevXMetricsCollector();
    analyzer = new TrendAnalyzer(collector);
  });

  test('should analyze metric trend', () => {
    const values = [10, 12, 15, 18, 20, 25, 30];
    const report = analyzer.analyzeMetric('deployFrequency', values);
    expect(report.direction).toBe('improving');
    expect(report.slope).toBeGreaterThan(0);
  });

  test('should detect degradation', async () => {
    const history = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, '0')}`,
      deployFrequency: Math.max(0, 10 - i * 0.5),
      leadTime: 30 + i * 2,
      mttr: 15 + i,
      changeFailureRate: 0.05 + i * 0.01,
    }));
    const signals = await analyzer.detectDegradation(history);
    expect(Array.isArray(signals)).toBe(true);
  });
});

describe('ProductivityDashboard', () => {
  test('should get overview', async () => {
    const collector = new DevXMetricsCollector();
    const dora = new DORAMetricsCalculator(collector);
    const space = new SPACEFrameworkAnalyzer();
    const trend = new TrendAnalyzer(collector);
    const survey = new SurveyManager();
    const dashboard = new ProductivityDashboard(dora, space, trend, survey);
    const overview = await dashboard.getOverview('24h');
    expect(overview.dora).toBeDefined();
    expect(overview.scorecard).toBeDefined();
  });

  test('should get detailed report', async () => {
    const collector = new DevXMetricsCollector();
    const dora = new DORAMetricsCalculator(collector);
    const space = new SPACEFrameworkAnalyzer();
    const trend = new TrendAnalyzer(collector);
    const survey = new SurveyManager();
    const dashboard = new ProductivityDashboard(dora, space, trend, survey);
    const report = await dashboard.getDetailedReport('sprint');
    expect(report.dora).toBeDefined();
    expect(report.nps).toBe(0);
  });

  test('should get sparklines', async () => {
    const collector = new DevXMetricsCollector();
    const dora = new DORAMetricsCalculator(collector);
    const space = new SPACEFrameworkAnalyzer();
    const trend = new TrendAnalyzer(collector);
    const survey = new SurveyManager();
    const dashboard = new ProductivityDashboard(dora, space, trend, survey);
    const sparklines = await dashboard.getSparklines();
    expect(sparklines['Deploy Frequency']).toBeDefined();
  });
});

describe('DORAMetricsCalculator additional', () => {
  test('should calculate lead time change', async () => {
    const collector = new DevXMetricsCollector();
    const dora = new DORAMetricsCalculator(collector);
    const change = await dora.getLeadTimeChange();
    expect(typeof change).toBe('number');
  });

  test('should calculate MTTR change', async () => {
    const collector = new DevXMetricsCollector();
    const dora = new DORAMetricsCalculator(collector);
    const change = await dora.getMTTRChange();
    expect(typeof change).toBe('number');
  });
});

describe('TrendAnalyzer additional', () => {
  test('should get prediction', async () => {
    const collector = new DevXMetricsCollector();
    const trend = new TrendAnalyzer(collector);
    const pred = await trend.getPrediction('deployFrequency', [10, 12, 15, 18, 20], 7);
    expect(pred.predictedValues.length).toBe(7);
    expect(pred.confidence).toBeGreaterThan(0);
  });

  test('should analyze sprint trends', async () => {
    const collector = new DevXMetricsCollector();
    const trend = new TrendAnalyzer(collector);
    const reports = await trend.analyzeSprintTrends([]);
    expect(Array.isArray(reports)).toBe(true);
  });
});

describe('SPACEFrameworkAnalyzer additional', () => {
  test('should get detailed analysis', async () => {
    const analyzer = new SPACEFrameworkAnalyzer();
    const report: AggregatedReport = { period: '24h', deployFrequency: 2, leadTime: 30, mttr: 15, changeFailureRate: 0.05, cycleTime: 60, prTurnaround: 120, blockRate: 0.08, reworkRate: 0.1, sampleSize: 100 };
    const analysis = await analyzer.getDetailedAnalysis(report);
    expect(analysis.dimensions.length).toBe(5);
  });
});

describe('SurveyManager additional', () => {
  test('should respond to survey and compute SUS', () => {
    const sm = new SurveyManager();
    sm.registerTemplate({
      id: 'sus-test', name: 'SUS', dimensions: ['satisfaction'],
      questions: [
        { id: 'q1', text: 'Q1', dimension: 'satisfaction', type: 'sus' },
        { id: 'q2', text: 'Q2', dimension: 'satisfaction', type: 'sus' },
      ],
      frequency: 'monthly',
    });
    sm.createSurvey('sus-test', 'user1', { q1: 4, q2: 2 });
    const sus = sm.computeSUS();
    expect(sus).toBeGreaterThan(0);
  });
});

describe('DevXMetricsCollector additional', () => {
  test('should filter events by time range', async () => {
    const collector = new DevXMetricsCollector();
    const old = new Date(Date.now() - 86400000 * 10);
    await collector.record({ type: 'deploy', timestamp: old, duration: 5, status: 'success', metadata: {} });
    await collector.record({ type: 'deploy', timestamp: new Date(), duration: 5, status: 'success', metadata: {} });
    const recent = collector.getEvents('deploy', new Date(Date.now() - 86400000));
    expect(recent.length).toBe(1);
  });

  test('should clear all events', async () => {
    const collector = new DevXMetricsCollector();
    await collector.record({ type: 'deploy', timestamp: new Date(), duration: 1, status: 'success', metadata: {} });
    collector.clear();
    expect(collector.countByType('deploy')).toBe(0);
  });
});
