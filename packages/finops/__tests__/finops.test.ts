import { CostTracker } from '../src/cost-tracker';
import { BudgetManager } from '../src/budget-manager';
import { CostAnomalyDetector } from '../src/cost-anomaly-detector';
import { ResourceOptimizer } from '../src/resource-optimizer';
import { ReservedInstancePlanner } from '../src/reserved-instance-planner';
import { CostAllocationEngine } from '../src/cost-allocation-engine';
import { ShowbackReportGenerator } from '../src/showback-report-generator';
import { FinOpsDashboard } from '../src/finops-dashboard';
import { CostRecord, ResourceMetric } from '../src/types';

function makeCost(overrides: Partial<CostRecord> = {}): CostRecord {
  return {
    id: `cost-${Date.now()}-${Math.random()}`,
    source: 'llm',
    provider: 'openai',
    service: 'gpt-4o',
    region: 'us-east-1',
    amount: 100,
    currency: 'USD',
    timestamp: new Date(),
    project: 'default',
    environment: 'prod',
    tags: {},
    metadata: {},
    ...overrides,
  };
}

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => { tracker = new CostTracker(); });

  test('should record a cost', async () => {
    await tracker.record(makeCost({ amount: 50 }));
    expect(tracker.getRecordCount()).toBe(1);
    expect(tracker.getTotalCost()).toBe(50);
  });

  test('should record batch of costs', async () => {
    await tracker.recordBatch([makeCost({ amount: 10 }), makeCost({ amount: 20 })]);
    expect(tracker.getTotalCost()).toBe(30);
  });

  test('should get cost by source', async () => {
    await tracker.record(makeCost({ source: 'llm', amount: 100 }));
    await tracker.record(makeCost({ source: 'compute', amount: 50 }));
    const bySource = tracker.getCostBySource();
    expect(bySource['llm']).toBe(100);
    expect(bySource['compute']).toBe(50);
  });

  test('should get cost by project', async () => {
    await tracker.record(makeCost({ project: 'core', amount: 200 }));
    await tracker.record(makeCost({ project: 'agent', amount: 100 }));
    const byProject = tracker.getCostByProject();
    expect(byProject['core']).toBe(200);
    expect(byProject['agent']).toBe(100);
  });

  test('should get cost by provider', async () => {
    await tracker.record(makeCost({ provider: 'aws', amount: 150 }));
    await tracker.record(makeCost({ provider: 'gcp', amount: 75 }));
    const byProvider = tracker.getCostByProvider();
    expect(byProvider['aws']).toBe(150);
    expect(byProvider['gcp']).toBe(75);
  });

  test('should get cost by model from metadata', async () => {
    await tracker.record(makeCost({ metadata: { model: 'gpt-4' }, amount: 50 }));
    await tracker.record(makeCost({ metadata: { model: 'claude-3' }, amount: 30 }));
    const byModel = tracker.getCostByModel();
    expect(byModel['gpt-4']).toBe(50);
    expect(byModel['claude-3']).toBe(30);
  });

  test('should compute daily totals', async () => {
    await tracker.record(makeCost({ amount: 100, timestamp: new Date() }));
    const totals = tracker.getDailyTotals(7);
    expect(totals.length).toBe(7);
    expect(totals[totals.length - 1]).toBe(100);
  });

  test('should compute daily average', () => {
    expect(tracker.getDailyAverage(7)).toBe(0);
  });

  test('should get records with limit/offset', async () => {
    for (let i = 0; i < 5; i++) await tracker.record(makeCost({ amount: i }));
    const records = tracker.getRecords(2);
    expect(records.length).toBe(2);
  });

  test('should clear all records', async () => {
    await tracker.record(makeCost());
    tracker.clear();
    expect(tracker.getRecordCount()).toBe(0);
  });
});

describe('BudgetManager', () => {
  let bm: BudgetManager;

  beforeEach(() => { bm = new BudgetManager(); });

  test('should set and get budget', () => {
    bm.setBudget({
      id: 'b1', project: 'core', period: 'monthly', total: 1000, spent: 0, remaining: 1000,
      categories: [], alerts: [], startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400000),
    });
    expect(bm.getBudget('core')).toBeDefined();
    expect(bm.getBudget('core')!.total).toBe(1000);
  });

  test('should record cost and update budget', async () => {
    bm.setBudget({
      id: 'b2', project: 'test', period: 'monthly', total: 500, spent: 0, remaining: 500,
      categories: [], alerts: [], startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400000),
    });
    await bm.recordCost(makeCost({ project: 'test', amount: 100 }));
    expect(bm.getBudget('test')!.spent).toBe(100);
    expect(bm.getBudget('test')!.remaining).toBe(400);
  });

  test('should trigger alert at critical threshold', async () => {
    bm.setBudget({
      id: 'b3', project: 'critical', period: 'monthly', total: 100, spent: 0, remaining: 100,
      categories: [], alerts: [], startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400000),
    });
    const alerts = await bm.recordCost(makeCost({ project: 'critical', amount: 95 }));
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].type).toBe('critical');
  });

  test('should return budget status', () => {
    bm.setBudget({
      id: 'b4', project: 'status-test', period: 'monthly', total: 1000, spent: 200, remaining: 800,
      categories: [], alerts: [], startDate: new Date(Date.now() - 15 * 86400000), endDate: new Date(Date.now() + 15 * 86400000),
    });
    const status = bm.getBudgetStatus('status-test');
    expect(status).not.toBeNull();
    expect(status!.utilization).toBe(0.2);
  });

  test('should get unacknowledged alerts', () => {
    const alerts = bm.getUnacknowledgedAlerts();
    expect(Array.isArray(alerts)).toBe(true);
  });

  test('should acknowledge alert', () => {
    bm.setBudget({
      id: 'b5', project: 'ack-test', period: 'monthly', total: 100, spent: 90, remaining: 10,
      categories: [], alerts: [
        { type: 'critical', message: 'test', threshold: 0.9, currentValue: 0.9, timestamp: new Date(), acknowledged: false },
      ], startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400000),
    });
    bm.acknowledgeAlert('ack-test', 0);
    expect(bm.getBudget('ack-test')!.alerts[0].acknowledged).toBe(true);
  });

  test('should reset budget', () => {
    bm.setBudget({
      id: 'b6', project: 'reset-test', period: 'monthly', total: 1000, spent: 500, remaining: 500,
      categories: [], alerts: [], startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400000),
    });
    bm.reset('reset-test');
    expect(bm.getBudget('reset-test')!.spent).toBe(0);
  });
});

describe('CostAnomalyDetector', () => {
  let detector: CostAnomalyDetector;

  beforeEach(() => { detector = new CostAnomalyDetector(2, 5); });

  test('should detect anomalies from records', () => {
    const records: CostRecord[] = [];
    for (let i = 0; i < 10; i++) {
      records.push(makeCost({ source: 'llm', amount: 10, timestamp: new Date(Date.now() - (10 - i) * 86400000) }));
    }
    records.push(makeCost({ source: 'llm', amount: 500 }));
    const anomalies = detector.detect(records);
    expect(anomalies.length).toBeGreaterThanOrEqual(0);
  });

  test('should detect realtime anomaly', () => {
    const recent = Array.from({ length: 10 }, (_, i) => makeCost({ source: 'llm', amount: 10 + Math.random(), timestamp: new Date() }));
    const spike = makeCost({ source: 'llm', amount: 5000 });
    const anomaly = detector.detectRealtime(spike, recent);
    expect(anomaly).not.toBeNull();
    expect(anomaly!.source).toBe('llm');
  });

  test('should return anomaly history', () => {
    const history = detector.getAnomalyHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  test('should reset detector', () => {
    detector.reset();
    expect(detector.getAnomalyHistory().length).toBe(0);
  });
});

describe('ResourceOptimizer', () => {
  let opt: ResourceOptimizer;

  beforeEach(() => { opt = new ResourceOptimizer(); });

  test('should analyze resource and recommend downsizing', async () => {
    const resource: ResourceMetric = {
      resourceId: 'r1', resourceType: 'ec2', provider: 'aws', currentSize: 't3-large',
      usage: { cpu: 0.15, memory: 0.2, disk: 0.3, network: 0.1 },
      costPerHour: 0.5, costPerMonth: 360,
      recommendations: [],
    };
    const recs = await opt.analyzeResource(resource);
    expect(recs.length).toBeGreaterThan(0);
  });

  test('should recommend model routing', () => {
    const records = [
      makeCost({ metadata: { model: 'gpt-4o' }, amount: 500 }),
      makeCost({ metadata: { model: 'gpt-4o-mini' }, amount: 50 }),
    ];
    const rec = opt.generateModelRoutingRecommendation(records);
    expect(rec).not.toBeNull();
    expect(rec!.type).toBe('model_routing');
  });

  test('should generate cache recommendation', () => {
    const rec = opt.generateCacheRecommendation(1000);
    expect(rec.type).toBe('cache');
    expect(rec.estimatedSavings).toBe(150);
  });

  test('should generate compression recommendation', () => {
    const rec = opt.generateCompressionRecommendation(1000);
    expect(rec.type).toBe('compression');
  });
});

describe('ReservedInstancePlanner', () => {
  let planner: ReservedInstancePlanner;

  beforeEach(() => { planner = new ReservedInstancePlanner(); });

  test('should evaluate resource for RI', async () => {
    const resource: ResourceMetric = {
      resourceId: 'db-1', resourceType: 'rds', provider: 'aws', currentSize: 'db.r5.xlarge',
      usage: { cpu: 0.5, memory: 0.6, disk: 0.4, network: 0.3 },
      costPerHour: 0.5, costPerMonth: 360,
      recommendations: [],
    };
    const plan = await planner.evaluateResource(resource);
    expect(plan).not.toBeNull();
    expect(plan!.provider).toBe('aws');
  });

  test('should not recommend for low cost resources', async () => {
    const resource: ResourceMetric = {
      resourceId: 'small', resourceType: 'ec2', provider: 'aws', currentSize: 't3.nano',
      usage: { cpu: 0.1, memory: 0.1, disk: 0.1, network: 0.1 },
      costPerHour: 0.01, costPerMonth: 7.2,
      recommendations: [],
    };
    const plan = await planner.evaluateResource(resource);
    expect(plan).toBeNull();
  });
});

describe('CostAllocationEngine', () => {
  let engine: CostAllocationEngine;

  beforeEach(() => { engine = new CostAllocationEngine(); });

  test('should allocate cost by rules', () => {
    engine.addRule({
      id: 'rule-1', name: 'LLM to Core', source: 'llm', provider: 'openai',
      project: 'core', percentage: 100, conditions: [],
    });
    const records = [makeCost({ source: 'llm', provider: 'openai', project: 'default', amount: 200 })];
    const allocated = engine.allocateCost(records);
    expect(allocated.has('core')).toBe(true);
  });

  test('should generate showback report', async () => {
    const records = [makeCost({ amount: 100 }), makeCost({ amount: 200 })];
    const report = await engine.generateShowbackReport(records, '2026-07');
    expect(report.totalCost).toBe(300);
  });
});

describe('ShowbackReportGenerator', () => {
  test('should generate report with trends', async () => {
    const engine = new CostAllocationEngine();
    const bm = new BudgetManager();
    const gen = new ShowbackReportGenerator(engine, bm);
    const records = [makeCost({ amount: 100 }), makeCost({ amount: 200 })];
    const report = await gen.generate(records, '2026-07');
    expect(report.period).toBe('2026-07');
    expect(report.totalCost).toBe(300);
  });

  test('should generate by source', async () => {
    const engine = new CostAllocationEngine();
    const bm = new BudgetManager();
    const gen = new ShowbackReportGenerator(engine, bm);
    const records = [makeCost({ source: 'llm', amount: 100 }), makeCost({ source: 'compute', amount: 50 })];
    const report = await gen.generateBySource(records, '2026-07');
    expect(report.totalCost).toBe(150);
  });

  test('should generate executive summary', async () => {
    const engine = new CostAllocationEngine();
    const bm = new BudgetManager();
    const gen = new ShowbackReportGenerator(engine, bm);
    const records = [makeCost({ amount: 100 })];
    const summary = await gen.generateExecutiveSummary(records, '2026-07');
    expect(summary.totalCost).toBe(100);
  });

  test('should convert to CSV', async () => {
    const engine = new CostAllocationEngine();
    const bm = new BudgetManager();
    const gen = new ShowbackReportGenerator(engine, bm);
    const report = await gen.generate([makeCost({ amount: 50 })], '2026-07');
    const csv = gen.toCSV(report);
    expect(csv).toContain('Project');
  });
});

describe('FinOpsDashboard', () => {
  test('should return summary', () => {
    const tracker = new CostTracker();
    const bm = new BudgetManager();
    const detector = new CostAnomalyDetector();
    const opt = new ResourceOptimizer();
    const allocation = new CostAllocationEngine();
    const dashboard = new FinOpsDashboard(tracker, bm, detector, opt, allocation);
    const summary = dashboard.getSummary();
    expect(summary.totalSpend).toBe(0);
  });

  test('should get trend data', () => {
    const tracker = new CostTracker();
    const bm = new BudgetManager();
    const detector = new CostAnomalyDetector();
    const opt = new ResourceOptimizer();
    const allocation = new CostAllocationEngine();
    const dashboard = new FinOpsDashboard(tracker, bm, detector, opt, allocation);
    const trends = dashboard.getTrendData(7);
    expect(trends.length).toBe(7);
  });
});
