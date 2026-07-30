import { TokenAnalyzer } from '../src/analytics/token-analyzer';
import { CostTracker } from '../src/analytics/cost-tracker';
import { OptimizationRecommender } from '../src/analytics/optimization-recommender';
import { AnalyticsDashboard } from '../src/analytics/dashboard';
import {
  LLMCallRecord,
  ContextSource,
  AnalyticsConfig,
  TokenBudget,
  Provider,
} from '../src/analytics/types-analytics';

function makeRecord(overrides: Partial<LLMCallRecord> = {}): LLMCallRecord {
  return {
    id: 'test-1',
    timestamp: Date.now(),
    agentId: 'programmer',
    provider: 'openai',
    model: 'gpt-4',
    promptTokens: 500,
    completionTokens: 100,
    totalTokens: 600,
    cost: 0.018,
    latency: 1200,
    taskType: 'code',
    contextSources: [],
    compressed: false,
    compressionRatio: 1,
    cacheHit: false,
    ...overrides,
  };
}

function makeSource(name: string, provided: number, referenced: number, wasReferenced: boolean): ContextSource {
  return {
    source: name,
    tokensProvided: provided,
    tokensReferenced: referenced,
    wasReferenced,
    priority: 5,
    retrievalTime: 50,
  };
}

const testConfig: AnalyticsConfig = {
  providerCostPer1K: {
    ollama: 0,
    openai: 0.03,
    deepseek: 0.0004,
  },
  wasteThreshold: 30,
  efficiencyThreshold: 0.6,
};

describe('TokenAnalyzer', () => {
  const analyzer = new TokenAnalyzer();

  it('counts tokens approximately for text', () => {
    const result = analyzer.count('hello world');
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(10);
  });

  it('counts tokens approximately for code', () => {
    const result = analyzer.count('function hello() { return 1; }', 'code');
    expect(result).toBeGreaterThan(0);
  });

  it('counts tokens approximately for json', () => {
    const result = analyzer.count('{"key": "value"}', 'json');
    expect(result).toBeGreaterThan(0);
  });

  it('countPrecise falls back to approximate when tiktoken unavailable', () => {
    const result = analyzer.countPrecise('hello world test', 'unknown-model');
    expect(result).toBeGreaterThan(0);
  });

  it('analyzeSource returns correct analysis', () => {
    const records = [
      makeRecord({
        contextSources: [makeSource('memory-store', 1000, 500, true)],
      }),
      makeRecord({
        contextSources: [makeSource('memory-store', 500, 0, false)],
      }),
    ];
    const analysis = analyzer.analyzeSource(records, 'memory-store');
    expect(analysis.totalTokens).toBe(1500);
    expect(analysis.wasteTokens).toBe(500);
  });

  it('calculateEfficiency returns 0 for zero provided', () => {
    expect(analyzer.calculateEfficiency(100, 0)).toBe(0);
  });

  it('calculateEfficiency caps at 1.0', () => {
    expect(analyzer.calculateEfficiency(200, 100)).toBe(1.0);
  });

  it('calculateEfficiency returns correct ratio', () => {
    expect(analyzer.calculateEfficiency(50, 100)).toBe(0.5);
  });

  it('detectWaste finds unreferenced sources', () => {
    const records = [
      makeRecord({
        contextSources: [
          makeSource('memory-store', 1000, 500, true),
          makeSource('knowledge-graph', 500, 0, false),
        ],
      }),
      makeRecord({
        contextSources: [makeSource('file-system', 2000, 0, false)],
      }),
    ];
    const report = analyzer.detectWaste(records);
    expect(report.totalWasteTokens).toBe(2500);
    expect(report.topWasteSources.length).toBeGreaterThanOrEqual(2);
    expect(report.topWasteSources[0].source).toBe('file-system');
  });

  it('detectWaste returns recommendations for high waste', () => {
    const records = [
      makeRecord({
        contextSources: [makeSource('big-source', 15000, 0, false)],
      }),
    ];
    const report = analyzer.detectWaste(records);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it('categorizeBySource groups tokens by source', () => {
    const records = [
      makeRecord({
        contextSources: [
          makeSource('memory', 1000, 500, true),
          makeSource('knowledge', 500, 200, true),
        ],
      }),
      makeRecord({
        contextSources: [makeSource('memory', 500, 300, true)],
      }),
    ];
    const breakdown = analyzer.categorizeBySource(records);
    expect(breakdown.sources['memory'].tokens).toBe(1500);
    expect(breakdown.sources['knowledge'].tokens).toBe(500);
    expect(Object.keys(breakdown.sources).length).toBe(2);
  });
});

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker(testConfig);
  });

  it('records calls and calculates total cost', () => {
    tracker.recordCall(makeRecord({ cost: 0.018 }));
    tracker.recordCall(makeRecord({ cost: 0.009 }));
    expect(tracker.getTotalCost()).toBeCloseTo(0.027, 4);
  });

  it('getCostByProvider filters correctly', () => {
    tracker.recordCall(makeRecord({ provider: 'openai', cost: 0.018 }));
    tracker.recordCall(makeRecord({ provider: 'deepseek', cost: 0.0004 }));
    tracker.recordCall(makeRecord({ provider: 'ollama', cost: 0 }));
    expect(tracker.getCostByProvider('openai')).toBeCloseTo(0.018, 4);
    expect(tracker.getCostByProvider('deepseek')).toBeCloseTo(0.0004, 6);
    expect(tracker.getCostByProvider('ollama')).toBe(0);
  });

  it('getCostByAgent filters correctly', () => {
    tracker.recordCall(makeRecord({ agentId: 'programmer', cost: 0.018 }));
    tracker.recordCall(makeRecord({ agentId: 'analyst', cost: 0.005 }));
    expect(tracker.getCostByAgent('programmer')).toBeCloseTo(0.018, 4);
    expect(tracker.getCostByAgent('analyst')).toBeCloseTo(0.005, 4);
    expect(tracker.getCostByAgent('nonexistent')).toBe(0);
  });

  it('getCostByTask filters correctly', () => {
    tracker.recordCall(makeRecord({ taskType: 'code', cost: 0.018 }));
    tracker.recordCall(makeRecord({ taskType: 'analysis', cost: 0.005 }));
    expect(tracker.getCostByTask('code')).toBeCloseTo(0.018, 4);
    expect(tracker.getCostByTask('analysis')).toBeCloseTo(0.005, 4);
  });

  it('getBudgetUsage returns usage with sources', () => {
    tracker.recordCall(makeRecord({
      agentId: 'programmer',
      totalTokens: 3000,
      cost: 0.09,
      contextSources: [makeSource('memory', 2000, 1000, true)],
    }));
    const budget: TokenBudget = { softLimit: 5000, hardLimit: 10000, period: 'daily', priority: 'cost' };
    const usage = tracker.getBudgetUsage('programmer', budget);
    expect(usage.agentId).toBe('programmer');
    expect(usage.totalTokens).toBe(3000);
    expect(usage.topSources.length).toBeGreaterThan(0);
  });

  it('getBudgetUsage handles empty records', () => {
    const budget: TokenBudget = { softLimit: 5000, hardLimit: 10000, period: 'daily', priority: 'cost' };
    const usage = tracker.getBudgetUsage('ghost', budget);
    expect(usage.totalTokens).toBe(0);
    expect(usage.totalCost).toBe(0);
  });

  it('forecastCost returns 0 for empty records', () => {
    expect(tracker.forecastCost('daily')).toBe(0);
  });

  it('forecastCost predicts for period', () => {
    const now = Date.now();
    tracker.recordCall(makeRecord({ timestamp: now - 86400000, cost: 0.01 }));
    tracker.recordCall(makeRecord({ timestamp: now, cost: 0.01 }));
    const weekly = tracker.forecastCost('weekly');
    expect(weekly).toBeGreaterThan(0);
  });

  it('clear removes all records', () => {
    tracker.recordCall(makeRecord());
    tracker.clear();
    expect(tracker.getTotalCost()).toBe(0);
  });

  it('clear with period only removes old records', () => {
    const now = Date.now();
    tracker.recordCall(makeRecord({ timestamp: now - 86400000 * 2, cost: 0.01 }));
    tracker.recordCall(makeRecord({ timestamp: now, cost: 0.01 }));
    tracker.clear('daily');
    expect(tracker.getTotalCost()).toBeCloseTo(0.01, 4);
  });
});

describe('OptimizationRecommender', () => {
  const recommender = new OptimizationRecommender();

  it('analyze returns recommendations sorted by savings', () => {
    const records = [
      makeRecord({
        provider: 'openai',
        compressed: false,
        totalTokens: 50000,
        cost: 1.5,
        contextSources: [makeSource('memory', 30000, 3000, false)],
      }),
    ];
    const recs = recommender.analyze(records);
    expect(recs.length).toBeGreaterThan(0);
  });

  it('analyze returns low priority when usage is normal', () => {
    const records = [
      makeRecord({
        compressed: true,
        compressionRatio: 0.5,
        cacheHit: true,
        contextSources: [makeSource('small', 100, 90, true)],
      }),
    ];
    const recs = recommender.analyze(records);
    expect(recs[0].priority).toBe('low');
  });

  it('suggestCompression returns null for unknown source', () => {
    const result = recommender.suggestCompression('unknown', []);
    expect(result).toBeNull();
  });

  it('suggestCompression returns suggestion for known source', () => {
    const records = [
      makeRecord({
        compressed: true,
        compressionRatio: 0.5,
        contextSources: [makeSource('docs', 5000, 2000, true)],
      }),
    ];
    const result = recommender.suggestCompression('docs', records);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.currentRatio).toBe(0.5);
      expect(result.suggestedRatio).toBeLessThan(result.currentRatio);
    }
  });

  it('suggestCacheStrategy returns cache suggestion', () => {
    const result = recommender.suggestCacheStrategy('memory');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.source).toBe('memory');
      expect(result.suggestedTTL).toBe(300000);
    }
  });

  it('suggestProviderSwitch suggests deepseek for openai', () => {
    const result = recommender.suggestProviderSwitch('openai', 'code');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.suggestedProvider).toBe('deepseek');
      expect(result.expectedCostReduction).toBe(0.98);
    }
  });

  it('suggestProviderSwitch returns null for non-openai', () => {
    expect(recommender.suggestProviderSwitch('ollama', 'code')).toBeNull();
    expect(recommender.suggestProviderSwitch('deepseek', 'code')).toBeNull();
  });

  it('suggestPromptRefinement returns refinement suggestion', () => {
    const result = recommender.suggestPromptRefinement('docs');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.technique).toBe('summarize');
      expect(result.reduction).toBe(0.6);
    }
  });
});

describe('AnalyticsDashboard', () => {
  const analyzer = new TokenAnalyzer();
  const costTracker = new CostTracker(testConfig);
  const recommender = new OptimizationRecommender();
  const dashboard = new AnalyticsDashboard(analyzer, costTracker, recommender);

  it('getSummary returns summary with correct totals', () => {
    const records = [
      makeRecord({
        totalTokens: 1000,
        cost: 0.03,
        contextSources: [makeSource('memory', 800, 400, true)],
      }),
      makeRecord({
        totalTokens: 500,
        cost: 0.015,
        contextSources: [makeSource('knowledge', 300, 100, true)],
      }),
    ];
    const summary = dashboard.getSummary(records);
    expect(summary.totalCalls).toBe(2);
    expect(summary.totalTokens).toBe(1500);
    expect(summary.totalCost).toBeCloseTo(0.045, 4);
  });

  it('getSummary returns zero efficiency when no sources', () => {
    const records = [makeRecord()];
    const summary = dashboard.getSummary(records);
    expect(summary.efficiency).toBe(0);
  });

  it('getEfficiencyReport returns breakdown', () => {
    const records = [
      makeRecord({
        agentId: 'agent-1',
        provider: 'openai',
        taskType: 'code',
        contextSources: [
          makeSource('memory', 1000, 800, true),
        ],
      }),
      makeRecord({
        agentId: 'agent-2',
        provider: 'deepseek',
        taskType: 'analysis',
        contextSources: [
          makeSource('knowledge', 500, 100, true),
        ],
      }),
    ];
    const report = dashboard.getEfficiencyReport(records);
    expect(report.overall).toBeGreaterThan(0);
    expect(report.bySource['memory']).toBe(0.8);
    expect(report.byAgent['agent-1']).toBeGreaterThan(0);
    expect(report.byTaskType['code']).toBeGreaterThan(0);
    expect(report.byProvider['openai']).toBeGreaterThan(0);
  });

  it('getTopWasteSources returns waste sources sorted', () => {
    const records = [
      makeRecord({
        contextSources: [
          makeSource('big-source', 5000, 0, false),
          makeSource('small-source', 100, 0, false),
          makeSource('used-source', 1000, 800, true),
        ],
      }),
    ];
    const sources = dashboard.getTopWasteSources(records);
    expect(sources.length).toBe(2);
    expect(sources[0].source).toBe('big-source');
  });

  it('getAgentRanking returns agents sorted by efficiency', () => {
    const records = [
      makeRecord({
        agentId: 'efficient-agent',
        contextSources: [makeSource('data', 1000, 900, true)],
      }),
      makeRecord({
        agentId: 'wasteful-agent',
        contextSources: [makeSource('data', 1000, 100, false)],
      }),
    ];
    const ranking = dashboard.getAgentRanking(records);
    expect(ranking.length).toBe(2);
    expect(ranking[0].agentId).toBe('efficient-agent');
    expect(ranking[0].efficiency).toBeGreaterThan(ranking[1].efficiency);
  });

  it('getProviderComparison compares providers', () => {
    const records = [
      makeRecord({ provider: 'openai', cost: 0.03, totalTokens: 1000, latency: 500 }),
      makeRecord({ provider: 'deepseek', cost: 0.0004, totalTokens: 1000, latency: 800 }),
    ];
    const comparison = dashboard.getProviderComparison(records);
    expect(comparison.length).toBe(2);
    const openai = comparison.find(p => p.provider === 'openai');
    const deepseek = comparison.find(p => p.provider === 'deepseek');
    expect(openai).toBeDefined();
    expect(deepseek).toBeDefined();
    if (openai && deepseek) {
      expect(openai.totalCost).toBeGreaterThan(deepseek.totalCost);
    }
  });

  it('generateAlerts returns alerts for threshold breaches', () => {
    const records = [
      makeRecord({
        totalTokens: 200000,
        cost: 15,
        contextSources: [makeSource('wasteful', 100000, 500, false)],
      }),
    ];
    const alerts = dashboard.generateAlerts(records, {
      budgetExceeded: 50000,
      wasteThreshold: 10,
      costSpike: 5,
    });
    expect(alerts.length).toBeGreaterThanOrEqual(3);
  });

  it('generateAlerts returns no alerts when thresholds not breached', () => {
    const records = [
      makeRecord({
        totalTokens: 100,
        cost: 0.003,
        contextSources: [makeSource('small', 50, 45, true)],
      }),
    ];
    const alerts = dashboard.generateAlerts(records, {
      budgetExceeded: 500000,
      wasteThreshold: 90,
      efficiencyDrop: 0.01,
      costSpike: 100,
    });
    expect(alerts.length).toBe(0);
  });
});

describe('Multi-Provider Cost', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker(testConfig);
  });

  it('tracks ollama as free', () => {
    tracker.recordCall(makeRecord({ provider: 'ollama', cost: 0, totalTokens: 10000 }));
    expect(tracker.getTotalCost()).toBe(0);
    expect(tracker.getCostByProvider('ollama')).toBe(0);
  });

  it('tracks openai at $0.03/1K tokens', () => {
    tracker.recordCall(makeRecord({ provider: 'openai', cost: 0.30, totalTokens: 10000 }));
    expect(tracker.getCostByProvider('openai')).toBeCloseTo(0.30, 4);
  });

  it('tracks deepseek at $0.0004/1K tokens', () => {
    tracker.recordCall(makeRecord({ provider: 'deepseek', cost: 0.004, totalTokens: 10000 }));
    expect(tracker.getCostByProvider('deepseek')).toBeCloseTo(0.004, 6);
  });

  it('compares multi-provider costs', () => {
    tracker.recordCall(makeRecord({ provider: 'openai', totalTokens: 1000, cost: 0.03 }));
    tracker.recordCall(makeRecord({ provider: 'deepseek', totalTokens: 1000, cost: 0.0004 }));
    tracker.recordCall(makeRecord({ provider: 'ollama', totalTokens: 1000, cost: 0 }));
    const total = tracker.getTotalCost();
    expect(total).toBeCloseTo(0.0304, 6);
  });
});

describe('Budget Forecasting', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker(testConfig);
  });

  it('forecastCost returns 0 with no records', () => {
    expect(tracker.forecastCost('monthly')).toBe(0);
  });

  it('forecastCost estimates monthly from daily data', () => {
    const now = Date.now();
    const dailyCost = 0.03;
    for (let i = 0; i < 5; i++) {
      tracker.recordCall(makeRecord({
        timestamp: now - i * 86400000,
        cost: dailyCost,
        totalTokens: 1000,
      }));
    }
    const monthly = tracker.forecastCost('monthly');
    expect(monthly).toBeGreaterThan(0.5);
    expect(monthly).toBeLessThan(1.5);
  });

  it('forecastCost scales weekly correctly', () => {
    const now = Date.now();
    tracker.recordCall(makeRecord({ timestamp: now - 86400000, cost: 0.01 }));
    tracker.recordCall(makeRecord({ timestamp: now, cost: 0.01 }));
    const weekly = tracker.forecastCost('weekly');
    const daily = tracker.forecastCost('daily');
    expect(weekly).toBeCloseTo(daily * 7, 1);
  });

  it('getBudgetUsage correctly computes percentUsed', () => {
    tracker.recordCall(makeRecord({
      agentId: 'tester',
      totalTokens: 4000,
      cost: 0.12,
    }));
    const budget: TokenBudget = { softLimit: 5000, hardLimit: 10000, period: 'daily', priority: 'cost' };
    const usage = tracker.getBudgetUsage('tester', budget);
    expect(usage.percentUsed).toBeCloseTo(0.4, 2);
  });
});
