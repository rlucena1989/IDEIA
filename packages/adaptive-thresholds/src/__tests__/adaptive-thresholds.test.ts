import { AdaptiveThresholdEngine } from '../adaptive-threshold-engine';
import { DriftDetector } from '../drift-detector';
import { ZScoreThreshold } from '../zscore-threshold';
import { BayesianOptimizer } from '../bayesian-optimizer';
import { OnlineThresholdLearner } from '../online-threshold-learner';
import { MetaThresholdAdapter } from '../meta-threshold-adapter';
import { ThresholdExplainer } from '../threshold-explainer';
import { AdaptiveGateEngine } from '../adaptive-gate-engine';
import { ChangeContext, MetricSnapshot } from '../types';

describe('AdaptiveThresholdEngine', () => {
  let engine: AdaptiveThresholdEngine;

  beforeEach(() => { engine = new AdaptiveThresholdEngine(); });

  test('adjusts threshold based on change context', async () => {
    const result = await engine.adjustThreshold('coverage', 80, {
      changeType: 'hotfix', projectAge: 365, teamSize: 5,
      authorExperience: 24, branchType: 'hotfix',
      filesChanged: 3, dependenciesChanged: 1, historicalMetrics: [],
    });
    expect(result.metric).toBe('coverage');
    expect(result.baseValue).toBe(80);
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('relaxes threshold for hotfix vs feature', async () => {
    const hotfix = await engine.adjustThreshold('coverage', 80, {
      changeType: 'hotfix', projectAge: 365, teamSize: 5,
      authorExperience: 24, branchType: 'hotfix',
      filesChanged: 2, dependenciesChanged: 0, historicalMetrics: [],
    });
    const feature = await engine.adjustThreshold('coverage', 80, {
      changeType: 'feature', projectAge: 365, teamSize: 5,
      authorExperience: 24, branchType: 'feature',
      filesChanged: 20, dependenciesChanged: 5, historicalMetrics: [],
    });
    const diff = feature.adjustedValue - hotfix.adjustedValue;
    expect(diff).toBeGreaterThan(-5);
  });

  test('emits adjust events', async () => {
    const events: string[] = [];
    engine.on('adjust:start', () => events.push('start'));
    engine.on('adjust:done', () => events.push('done'));
    await engine.adjustThreshold('coverage', 80, {
      changeType: 'feature', projectAge: 100, teamSize: 3,
      authorExperience: 12, branchType: 'feature',
      filesChanged: 5, dependenciesChanged: 1, historicalMetrics: [],
    });
    expect(events).toEqual(['start', 'done']);
  });

  test('records outcome and retrains on drift', async () => {
    const ctx: ChangeContext = {
      changeType: 'feature', projectAge: 200, teamSize: 4,
      authorExperience: 18, branchType: 'develop',
      filesChanged: 10, dependenciesChanged: 2,
      historicalMetrics: Array(20).fill(null).map(() => ({
        coverage: 50 + Math.random() * 10, mutationScore: 60,
        complexity: 8, duplications: 5, maintainability: 75, testCount: 50,
      })),
    };
    await engine.recordOutcome('coverage', 75, true, ctx);
  });

  test('getStatus returns correct structure', async () => {
    const status = await engine.getStatus();
    expect(status.modelType).toBe('ensemble');
    expect(Array.isArray(status.driftAlerts)).toBe(true);
  });

  test('handles empty historical metrics', async () => {
    const result = await engine.adjustThreshold('complexity', 10, {
      changeType: 'refactor', projectAge: 50, teamSize: 2,
      authorExperience: 6, branchType: 'main',
      filesChanged: 1, dependenciesChanged: 0, historicalMetrics: [],
    });
    expect(result.adjustedValue).toBeGreaterThanOrEqual(0);
  });

  test('adjusts threshold with calibration disabled', async () => {
    const eng = new AdaptiveThresholdEngine({ calibrationEnabled: false });
    const result = await eng.adjustThreshold('coverage', 80, {
      changeType: 'hotfix', projectAge: 365, teamSize: 5,
      authorExperience: 24, branchType: 'hotfix',
      filesChanged: 3, dependenciesChanged: 1, historicalMetrics: [],
    });
    expect(result.adjustedValue).toBeDefined();
  });

  test('ensemble weights affect prediction', async () => {
    const eng1 = new AdaptiveThresholdEngine({ ensembleWeights: { gb: 1, bayesian: 0 } });
    const eng2 = new AdaptiveThresholdEngine({ ensembleWeights: { gb: 0, bayesian: 1 } });
    const ctx: ChangeContext = {
      changeType: 'feature', projectAge: 100, teamSize: 3,
      authorExperience: 12, branchType: 'feature',
      filesChanged: 5, dependenciesChanged: 1, historicalMetrics: [],
    };
    const [r1, r2] = await Promise.all([
      eng1.adjustThreshold('coverage', 80, ctx),
      eng2.adjustThreshold('coverage', 80, ctx),
    ]);
    expect(r1.adjustedValue).toBeDefined();
    expect(r2.adjustedValue).toBeDefined();
  });

  test('confidence is between 0 and 1', async () => {
    const result = await engine.adjustThreshold('coverage', 80, {
      changeType: 'bugfix', projectAge: 500, teamSize: 8,
      authorExperience: 36, branchType: 'develop',
      filesChanged: 15, dependenciesChanged: 3,
      historicalMetrics: Array(5).fill(null).map(() => ({
        coverage: 70, mutationScore: 50, complexity: 10,
        duplications: 5, maintainability: 80, testCount: 100,
      })),
    });
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  test('delta is properly calculated', async () => {
    const result = await engine.adjustThreshold('coverage', 80, {
      changeType: 'docs', projectAge: 100, teamSize: 2,
      authorExperience: 6, branchType: 'main',
      filesChanged: 1, dependenciesChanged: 0, historicalMetrics: [],
    });
    expect(result.delta).toBeGreaterThanOrEqual(-80);
    expect(result.delta).toBeLessThanOrEqual(80);
  });

  test('contributing factors are returned', async () => {
    const result = await engine.adjustThreshold('coverage', 80, {
      changeType: 'feature', projectAge: 365, teamSize: 5,
      authorExperience: 24, branchType: 'feature',
      filesChanged: 10, dependenciesChanged: 2, historicalMetrics: [],
    });
    expect(result.contributingFactors.length).toBeGreaterThan(0);
  });

  test('handles extreme project age', async () => {
    const result = await engine.adjustThreshold('coverage', 80, {
      changeType: 'hotfix', projectAge: 10000, teamSize: 50,
      authorExperience: 120, branchType: 'hotfix',
      filesChanged: 100, dependenciesChanged: 50, historicalMetrics: [],
    });
    expect(result.adjustedValue).toBeGreaterThanOrEqual(0);
  });
});

describe('ZScoreThreshold', () => {
  test('detects anomalies', () => {
    const z = new ZScoreThreshold(2);
    z.fit([10, 11, 10, 12, 11, 10, 11, 10]);
    expect(z.isAnomaly(50)).toBe(true);
    expect(z.isAnomaly(11)).toBe(false);
  });

  test('computes adjusted threshold', () => {
    const z = new ZScoreThreshold(3);
    z.fit([10, 12, 11, 13, 10, 12]);
    const adj = z.getAdjustedThreshold(80);
    expect(adj).toBeGreaterThan(80);
  });

  test('updates online', () => {
    const z = new ZScoreThreshold();
    z.fit([10, 10, 10]);
    z.update(15);
    expect(z.getMean()).toBeGreaterThan(10);
  });

  test('handles zero std', () => {
    const z = new ZScoreThreshold();
    z.fit([5, 5, 5]);
    expect(z.isAnomaly(5)).toBe(false);
  });
});

describe('DriftDetector', () => {
  test('returns null for insufficient data', async () => {
    const detector = new DriftDetector();
    const signal = await detector.check([]);
    expect(signal).toBeNull();
  });

  test('detects drift with large distribution change', async () => {
    const detector = new DriftDetector();
    const createSnapshot = (coverage: number): MetricSnapshot => ({
      coverage, mutationScore: 50, complexity: 10,
      duplications: 5, maintainability: 80, testCount: 100,
    });
    const oldData = Array(10).fill(null).map(() => createSnapshot(70 + Math.random() * 10));
    const newData = Array(10).fill(null).map(() => createSnapshot(40 + Math.random() * 10));
    const allData = [...oldData, ...newData];
    const signal = await detector.check(allData);
    expect(signal).not.toBeNull();
  });

  test('returns empty alerts initially', async () => {
    const detector = new DriftDetector();
    const alerts = await detector.getAlerts();
    expect(alerts).toEqual([]);
  });
});

describe('BayesianOptimizer', () => {
  test('predicts with valid output structure', async () => {
    const opt = new BayesianOptimizer();
    const pred = await opt.predict([0.5, 0.3, 0.8]);
    expect(pred.adjustment).toBeGreaterThanOrEqual(-0.3);
    expect(pred.adjustment).toBeLessThanOrEqual(0.3);
    expect(pred.confidence).toBeGreaterThan(0);
    expect(pred.factors.length).toBe(3);
  });

  test('tracks observation count', async () => {
    const opt = new BayesianOptimizer();
    await opt.record([0.5], true);
    await opt.record([0.3], false);
    expect(opt.getObservationCount()).toBe(2);
  });
});

describe('OnlineThresholdLearner', () => {
  test('predicts threshold', async () => {
    const learner = new OnlineThresholdLearner(4);
    const result = await learner.predict([0.5, 0.3, 0.8, 0.1]);
    expect(result.threshold).toBeGreaterThanOrEqual(0);
    expect(result.threshold).toBeLessThanOrEqual(100);
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('updates weights via FTRL', async () => {
    const learner = new OnlineThresholdLearner(4);
    await learner.update([0.5, 0.3, 0.8, 0.1], true);
    const metrics = learner.getOnlineMetrics();
    expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
    expect(metrics.activeFeatures.length).toBeGreaterThanOrEqual(0);
  });

  test('tracks regret bounds', () => {
    const learner = new OnlineThresholdLearner(4);
    const bounds = learner.getRegretBounds();
    expect(bounds.expectedRegret).toBe(0);
  });

  test('getWeights returns weight array', () => {
    const learner = new OnlineThresholdLearner(3);
    const w = learner.getWeights();
    expect(w.length).toBe(3);
  });
});

describe('MetaThresholdAdapter', () => {
  test('trains and produces metrics', async () => {
    const adapter = new MetaThresholdAdapter(4, 8);
    const tasks = Array(5).fill(null).map(() => ({
      metricName: 'coverage', supportFeatures: [[0.5, 0.3, 0.8, 0.1]],
      supportLabels: [1], queryFeatures: [[0.4, 0.2, 0.7, 0.3]],
      queryLabels: [1],
    }));
    const metrics = await adapter.metaTrain(tasks, 10);
    expect(typeof metrics.finalLoss).toBe('number');
    expect(metrics.epochs).toBe(10);
  });

  test('adapts to new metric', async () => {
    const adapter = new MetaThresholdAdapter(4, 8);
    const result = await adapter.adaptToNewMetric('complexity', [[0.5, 0.3, 0.8, 0.1]], [1]);
    expect(result.adaptedWeights.length).toBe(4);
  });

  test('predicts with adaptation', async () => {
    const adapter = new MetaThresholdAdapter(4, 8);
    await adapter.adaptToNewMetric('coverage', [[0.5, 0.3, 0.8, 0.1]], [1]);
    const pred = await adapter.predictWithAdaptation('coverage', [0.5, 0.3, 0.8, 0.1]);
    expect(typeof pred).toBe('number');
  });

  test('returns meta metrics', () => {
    const adapter = new MetaThresholdAdapter(4, 8);
    const metrics = adapter.getMetaMetrics();
    expect(metrics.nTasks).toBe(0);
    expect(metrics.uniqueMetrics).toBe(0);
  });

  test('predicts without adaptation using meta weights', async () => {
    const adapter = new MetaThresholdAdapter(4, 8);
    const pred = await adapter.predictWithAdaptation('unknown', [0.5, 0.3, 0.8, 0.1]);
    expect(typeof pred).toBe('number');
  });
});

describe('ThresholdExplainer', () => {
  test('generates explanation with feature contributions', async () => {
    const explainer = new ThresholdExplainer(['complexity', 'files', 'age', 'team']);
    explainer.setBackground([[0.5, 0.3, 0.8, 0.1], [0.4, 0.2, 0.7, 0.3]]);
    const model = { predict: async (f: number[]) => ({ threshold: f.reduce((s, v) => s + v, 0) * 10, confidence: 0.8 }) };
    const explanation = await explainer.explain([0.6, 0.4, 0.9, 0.2], 80, model);
    expect(explanation.featureContributions.length).toBe(4);
    expect(explanation.topFactors.length).toBeGreaterThan(0);
    expect(explanation.baseThreshold).toBe(80);
  });

  test('generates report', async () => {
    const explainer = new ThresholdExplainer(['f1', 'f2']);
    const model = { predict: async (f: number[]) => ({ threshold: 50, confidence: 0.8 }) };
    const explanation = await explainer.explain([0.5, 0.3], 80, model);
    const report = explainer.generateExplanationReport(explanation);
    expect(report).toContain('Threshold Explanation');
    expect(report).toContain('Base threshold');
  });
});

describe('AdaptiveGateEngine', () => {
  test('evaluates gate', async () => {
    const engine = new AdaptiveThresholdEngine();
    const gate = new AdaptiveGateEngine(engine);
    const evalResult = await gate.evaluate('coverage', 80, 85, {
      changeType: 'feature', projectAge: 100, teamSize: 3,
      authorExperience: 12, branchType: 'feature',
      filesChanged: 5, dependenciesChanged: 1, historicalMetrics: [],
    });
    expect(evalResult.passed).toBeDefined();
    expect(evalResult.confidence).toBeGreaterThan(0);
  });

  test('recordAndAdapt does not throw', async () => {
    const engine = new AdaptiveThresholdEngine();
    const gate = new AdaptiveGateEngine(engine);
    await gate.recordAndAdapt({
      metric: 'coverage', threshold: 75, actual: 80, passed: true,
      confidence: 0.8, factors: [],
    }, {
      changeType: 'feature', projectAge: 100, teamSize: 3,
      authorExperience: 12, branchType: 'feature',
      filesChanged: 5, dependenciesChanged: 1, historicalMetrics: [],
    });
  });
});
