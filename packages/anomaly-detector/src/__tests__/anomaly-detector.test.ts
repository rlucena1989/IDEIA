import {
  AnomalyDetector,
  ZScoreDetector,
  MADDetector,
  IQRDetector,
  EWMADetector,
  IsolationForestDetector,
  LOFDetector,
  OneClassSVMDetector,
  RuleBasedDetector,
  StatisticalDetector,
  MLDetector,
  EnsembleDetector,
  TransformerAnomalyDetector,
  CausalAnomalyDetector,
  OnlineAnomalyDetector,
  ADWINDetector,
} from '../index';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('ZScoreDetector', () => {
  it('returns 0 when not enough values', () => {
    const d = new ZScoreDetector();
    expect(d.detect([1], 5)).toBe(0);
  });

  it('returns 0 for values within normal range', () => {
    const d = new ZScoreDetector();
    const values = [10, 11, 9, 10, 11, 10, 9, 10];
    expect(d.detect(values, 10)).toBeLessThan(0.5);
  });

  it('returns high score for outlier far from mean', () => {
    const d = new ZScoreDetector();
    const values = [10, 11, 9, 10, 11, 9, 10, 11];
    expect(d.detect(values, 100)).toBeGreaterThan(0.9);
  });

  it('returns 0 when std is 0 and value matches', () => {
    const d = new ZScoreDetector();
    const values = [5, 5, 5, 5];
    expect(d.detect(values, 5)).toBe(0);
  });
});

describe('MADDetector', () => {
  it('returns 0 when not enough values', () => {
    const d = new MADDetector();
    expect(d.detect([1], 5)).toBe(0);
  });

  it('returns low score for normal value', () => {
    const d = new MADDetector();
    const values = [1, 2, 3, 4, 5, 4, 3, 2];
    expect(d.detect(values, 3)).toBeLessThan(0.5);
  });

  it('returns high score for extreme outlier', () => {
    const d = new MADDetector();
    const values = [1, 2, 1, 2, 1, 2, 1, 2];
    expect(d.detect(values, 100)).toBeGreaterThan(0.5);
  });
});

describe('IQRDetector', () => {
  it('returns 0 when not enough values', () => {
    const d = new IQRDetector();
    expect(d.detect([1, 2, 3], 10)).toBe(0);
  });

  it('returns 0 for value within IQR range', () => {
    const d = new IQRDetector();
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(d.detect(values, 5)).toBe(0);
  });

  it('returns positive score for value above upper fence', () => {
    const d = new IQRDetector();
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(d.detect(values, 100)).toBeGreaterThan(0);
  });

  it('returns positive score for value below lower fence', () => {
    const d = new IQRDetector();
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(d.detect(values, -50)).toBeGreaterThan(0);
  });
});

describe('EWMADetector', () => {
  it('returns 0 on first value', () => {
    const d = new EWMADetector();
    expect(d.detect(10)).toBe(0);
  });

  it('returns low score for gradual changes', () => {
    const d = new EWMADetector();
    d.detect(10);
    d.detect(10);
    d.detect(10);
    d.detect(10);
    const score = d.detect(10);
    expect(score).toBeLessThan(0.5);
  });

  it('returns high score for sudden large change', () => {
    const d = new EWMADetector();
    d.detect(10);
    d.detect(10);
    d.detect(10);
    const score = d.detect(100);
    expect(score).toBeGreaterThan(0.5);
  });

  it('reset clears state', () => {
    const d = new EWMADetector();
    d.detect(10);
    d.detect(100);
    d.reset();
    expect(d.detect(10)).toBe(0);
  });
});

describe('IsolationForestDetector', () => {
  it('returns 0.5 when not trained', () => {
    const d = new IsolationForestDetector();
    expect(d.anomalyScore([1, 2, 3])).toBe(0.5);
  });

  it('trains and returns scores', () => {
    const d = new IsolationForestDetector({ nEstimators: 10 });
    const normal: number[][] = [];
    for (let i = 0; i < 50; i++) {
      normal.push([Math.random(), Math.random(), Math.random()]);
    }
    d.train(normal);
    const normalScore = d.anomalyScore([0.5, 0.5, 0.5]);
    const outlierScore = d.anomalyScore([100, 100, 100]);
    expect(outlierScore).toBeGreaterThan(normalScore);
  });
});

describe('LOFDetector', () => {
  it('returns 0.5 when not trained', () => {
    const d = new LOFDetector();
    expect(d.anomalyScore([1, 2])).toBe(0.5);
  });

  it('detects outlier after training', () => {
    const d = new LOFDetector();
    const normal: number[][] = [];
    for (let i = 0; i < 30; i++) {
      normal.push([Math.random() * 0.5, Math.random() * 0.5]);
    }
    d.train(normal, 5);
    const outlierScore = d.anomalyScore([10, 10]);
    const normalScore = d.anomalyScore([0.25, 0.25]);
    expect(outlierScore).toBeGreaterThan(normalScore);
  });
});

describe('OneClassSVMDetector', () => {
  it('returns 0.5 when not trained', () => {
    const d = new OneClassSVMDetector();
    expect(d.anomalyScore([1, 2])).toBe(0.5);
  });

  it('returns lower score for similar points', () => {
    const d = new OneClassSVMDetector(0.3, 0.5);
    const normal: number[][] = [
      [0.5, 0.5],
      [0.6, 0.4],
      [0.4, 0.6],
      [0.55, 0.45],
    ];
    d.train(normal);
    const normalScore = d.anomalyScore([0.5, 0.5]);
    const outlierScore = d.anomalyScore([10, -5]);
    expect(outlierScore).toBeGreaterThan(normalScore);
  });
});

describe('RuleBasedDetector', () => {
  it('returns results for each rule', () => {
    const d = new RuleBasedDetector();
    const results = d.detect({
      actionsPerMinute: 5,
      hourOfDay: 14,
      tokenCost: 100,
      isNewTarget: 0,
      unusualChainLength: 0,
      agentId: 1,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.detectorName).toContain('rule:');
  });

  it('off_hours triggers for late night', () => {
    const d = new RuleBasedDetector();
    const results = d.detect({
      actionsPerMinute: 5,
      hourOfDay: 3,
      tokenCost: 100,
      isNewTarget: 0,
      unusualChainLength: 0,
      agentId: 1,
    });
    const offHours = results.find((r) => r.detectorName === 'rule:off_hours');
    expect(offHours?.score).toBeGreaterThan(0.5);
  });

  it('getMaxScore returns highest', () => {
    const d = new RuleBasedDetector();
    const maxScore = d.getMaxScore({
      actionsPerMinute: 200,
      hourOfDay: 3,
      tokenCost: 10000,
      isNewTarget: 1,
      unusualChainLength: 10,
      agentId: 1,
    });
    expect(maxScore).toBeGreaterThan(0.5);
  });

  it('addRule adds new rule', () => {
    const d = new RuleBasedDetector();
    d.addRule({
      name: 'custom',
      evaluate: () => 0.99,
      threshold: 0.5,
    });
    const results = d.detect({ agentId: 1 });
    const custom = results.find((r) => r.detectorName === 'rule:custom');
    expect(custom?.score).toBe(0.99);
  });
});

describe('StatisticalDetector', () => {
  it('returns results from all sub-detectors', () => {
    const d = new StatisticalDetector();
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = d.detect(values, 5);
    expect(results).toHaveLength(4);
    expect(results.map((r) => r.detectorName)).toEqual([
      'zscore',
      'mad',
      'iqr',
      'ewma',
    ]);
  });

  it('getMaxScore returns highest', () => {
    const d = new StatisticalDetector();
    const values = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
    const maxScore = d.getMaxScore(values, 100);
    expect(maxScore).toBeGreaterThan(0.5);
  });

  it('resetEWMA clears internal state', () => {
    const d = new StatisticalDetector();
    d.detect([10, 10], 100);
    d.resetEWMA();
    const results = d.detect([10, 10], 100);
    const ewmaResult = results.find((r) => r.detectorName === 'ewma');
    expect(ewmaResult?.score).toBe(0);
  });
});

describe('MLDetector', () => {
  it('returns results from all sub-detectors', () => {
    const d = new MLDetector();
    const samples: number[][] = [];
    for (let i = 0; i < 20; i++) {
      samples.push([Math.random(), Math.random()]);
    }
    d.train(samples);
    const results = d.detect([0.5, 0.5]);
    expect(results).toHaveLength(3);
    const names = results.map((r) => r.detectorName);
    expect(names).toContain('isolation_forest');
    expect(names).toContain('lof');
    expect(names).toContain('one_class_svm');
  });
});

describe('EnsembleDetector', () => {
  it('produces ensemble score from all detectors', () => {
    const d = new EnsembleDetector();
    const samples: number[][] = [];
    for (let i = 0; i < 20; i++) {
      samples.push([Math.random(), Math.random()]);
    }
    const result = d.detect(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      5,
      { actionsPerMinute: 5, hourOfDay: 14, tokenCost: 100, isNewTarget: 0, unusualChainLength: 0 },
      [0.5, 0.5],
      samples,
      'test',
    );
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.ensembleScore).toBeGreaterThanOrEqual(0);
    expect(result.ensembleScore).toBeLessThanOrEqual(1);
    expect(result.report.agentId).toBe('test');
    expect(result.report.factors.length).toBeGreaterThan(0);
  });

  it('generates critical level for very high scores', () => {
    const d = new EnsembleDetector({ thresholdQuarantine: 0.4, thresholdFlag: 0.3, thresholdWarn: 0.2 });
    const samples: number[][] = [];
    for (let i = 0; i < 20; i++) {
      samples.push([Math.random() * 10, Math.random() * 10]);
    }
    const result = d.detect(
      [1, 2, 1, 2, 1, 2, 1, 2, 1, 2],
      100,
      { actionsPerMinute: 200, hourOfDay: 3, tokenCost: 50000, isNewTarget: 1, unusualChainLength: 10 },
      [100, 100],
      samples,
      'test',
    );
    expect(result.report.score).toBeGreaterThan(0);
    expect(result.report.level).toBe('critical');
  });

  it('registers and uses additional detector', () => {
    const d = new EnsembleDetector();
    d.registerDetector('custom_detector', () => 0.75);
    const result = d.detect(
      [1, 2, 3],
      2,
      { actionsPerMinute: 5, hourOfDay: 14, tokenCost: 100, isNewTarget: 0, unusualChainLength: 0 },
      [0.5, 0.5],
      undefined,
      'test',
    );
    const customResult = result.results.find(
      (r) => r.detectorName === 'custom_detector',
    );
    expect(customResult?.score).toBe(0.75);
  });
});

describe('AnomalyDetector', () => {
  it('detect returns complete report', () => {
    const detector = new AnomalyDetector();
    const samples: number[][] = [];
    for (let i = 0; i < 20; i++) {
      samples.push([Math.random(), Math.random()]);
    }
    const result = detector.detect(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      5,
      { actionsPerMinute: 5, hourOfDay: 14, tokenCost: 100, isNewTarget: 0, unusualChainLength: 0 },
      [0.5, 0.5],
      samples,
      'test',
    );
    expect(result.report).toBeDefined();
    expect(result.report.agentId).toBe('test');
    expect(result.ensembleScore).toBeGreaterThanOrEqual(0);
  });

  it('static factory methods create detectors', () => {
    expect(AnomalyDetector.createZScoreDetector()).toBeInstanceOf(ZScoreDetector);
    expect(AnomalyDetector.createMADDetector()).toBeInstanceOf(MADDetector);
    expect(AnomalyDetector.createIQRDetector()).toBeInstanceOf(IQRDetector);
    expect(AnomalyDetector.createEWMADetector()).toBeInstanceOf(EWMADetector);
    expect(
      AnomalyDetector.createIsolationForestDetector(),
    ).toBeInstanceOf(IsolationForestDetector);
    expect(AnomalyDetector.createLOFDetector()).toBeInstanceOf(LOFDetector);
    expect(
      AnomalyDetector.createOneClassSVMDetector(),
    ).toBeInstanceOf(OneClassSVMDetector);
  });

  it('provides access to sub-detectors', () => {
    const detector = new AnomalyDetector();
    expect(detector.ensemble).toBeInstanceOf(EnsembleDetector);
    expect(detector.ruleBased).toBeInstanceOf(RuleBasedDetector);
    expect(detector.statistical).toBeInstanceOf(StatisticalDetector);
    expect(detector.ml).toBeInstanceOf(MLDetector);
  });
});

describe('TransformerAnomalyDetector', () => {
  it('detects anomalies in sequences', async () => {
    const d = new TransformerAnomalyDetector({
      inputDim: 4,
      dModel: 8,
      maxSeqLen: 20,
    });
    const sequence: number[][] = [];
    for (let i = 0; i < 20; i++) {
      sequence.push([Math.sin(i * 0.1) * 0.5, Math.cos(i * 0.1) * 0.5, Math.random() * 0.1, Math.random() * 0.1]);
    }
    const results = await d.detect(sequence);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.score).toBeGreaterThanOrEqual(0);
    expect(results[0]?.score).toBeLessThanOrEqual(1);
    expect(results[0]?.componentScores.timesnet).toBeDefined();
  });

  it('returns isAnomaly based on threshold', async () => {
    const d = new TransformerAnomalyDetector({
      inputDim: 2,
      dModel: 4,
      maxSeqLen: 10,
    });
    d.updateThreshold(1.5);
    const sequence: number[][] = [];
    for (let i = 0; i < 10; i++) {
      sequence.push([0.5, 0.5]);
    }
    const results = await d.detect(sequence);
    for (const r of results) {
      expect(r.isAnomaly).toBe(false);
    }
  });

  it('adapt computes loss', async () => {
    const d = new TransformerAnomalyDetector({
      inputDim: 2,
      dModel: 4,
      maxSeqLen: 10,
    });
    const sequence: number[][] = [];
    for (let i = 0; i < 10; i++) {
      sequence.push([0.5, 0.5]);
    }
    const labels = [false, false, false, false, false, false, false, false, false, true];
    const loss = await d.adapt(sequence, labels);
    expect(loss).toBeGreaterThan(0);
  });

  it('getThreshold returns current threshold', () => {
    const d = new TransformerAnomalyDetector();
    expect(d.getThreshold()).toBe(0.5);
  });
});

describe('CausalAnomalyDetector', () => {
  it('returns causal anomaly result', async () => {
    const d = new CausalAnomalyDetector({ threshold: 0.5 });
    const result = await d.detectCausal('malicious_file_read', {
      system_load: 0.8,
      hour_of_day: 3,
    });
    expect(result.actionId).toBe('malicious_file_read');
    expect(result.isCausalAnomaly).toBeDefined();
    expect(typeof result.causalEffect).toBe('number');
  });

  it('identifies confounders', async () => {
    const d = new CausalAnomalyDetector();
    await d.learnCausalStructure([
      {
        actions: ['file_read'],
        contexts: [{ system_load: 0.5, hour_of_day: 14 }],
        outcomes: { risk_score: 0.3 },
      },
    ]);
    const result = await d.detectCausal('file_read', {
      system_load: 0.9,
      hour_of_day: 3,
    });
    expect(Array.isArray(result.confoundingFactors)).toBe(true);
  });

  it('builds intervention plan for anomalies', async () => {
    const d = new CausalAnomalyDetector({ threshold: 0.1 });
    const result = await d.detectCausal('anomalous_action', {
      system_load: 0.9,
      hour_of_day: 3,
    });
    if (result.isCausalAnomaly) {
      expect(result.interventionPlan.length).toBeGreaterThan(0);
    }
  });

  it('setThreshold updates detection sensitivity', () => {
    const d = new CausalAnomalyDetector();
    d.setThreshold(0.9);
    expect(d['_threshold']).toBe(0.9);
  });
});

describe('ADWINDetector', () => {
  it('does not detect drift with stable input', () => {
    const d = new ADWINDetector(0.1, 2);
    let drift = false;
    for (let i = 0; i < 50; i++) {
      drift = d.update(0);
    }
    expect(drift).toBe(false);
    expect(d.getMean()).toBeCloseTo(0, 1);
  });

  it('detects drift with abrupt change and enough samples', () => {
    const d = new ADWINDetector(0.5, 5);
    for (let i = 0; i < 50; i++) {
      d.update(0);
    }
    let drift = false;
    for (let i = 0; i < 100; i++) {
      drift = d.update(1) || drift;
    }
    expect(drift).toBe(true);
  });

  it('tracks mean correctly', () => {
    const d = new ADWINDetector(0.1, 5);
    d.update(1);
    d.update(2);
    d.update(3);
    expect(d.getMean()).toBeCloseTo(2, 1);
  });

  it('reset clears all state', () => {
    const d = new ADWINDetector(0.1, 5);
    d.update(1);
    d.update(2);
    d.reset();
    expect(d.getWidth()).toBe(0);
    expect(d.getMean()).toBe(0);
  });
});

describe('OnlineAnomalyDetector', () => {
  it('produces scores for each update', async () => {
    const d = new OnlineAnomalyDetector(3, { threshold: 0.8 });
    const result = await d.update([0.5, 0.5, 0.5]);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(typeof result.isAnomaly).toBe('boolean');
    expect(typeof result.driftDetected).toBe('boolean');
  });

  it('learns from labeled updates', async () => {
    const d = new OnlineAnomalyDetector(2, { threshold: 0.5, lambda1: 0.1 });
    for (let i = 0; i < 20; i++) {
      await d.update([Math.random(), Math.random()], false);
    }
    const metadata = d.getMetadata();
    expect(metadata.nUpdates).toBe(20);
  });

  it('detectBatch processes multiple samples', async () => {
    const d = new OnlineAnomalyDetector(2);
    const batch: number[][] = [];
    for (let i = 0; i < 10; i++) {
      batch.push([Math.random(), Math.random()]);
    }
    const results = await d.detectBatch(batch);
    expect(results).toHaveLength(10);
  });

  it('adaptThreshold adjusts based on FPR target', async () => {
    const d = new OnlineAnomalyDetector(2, { threshold: 0.5 });
    for (let i = 0; i < 100; i++) {
      await d.update([Math.random(), Math.random()], false);
    }
    await d.adaptThreshold(0.1);
    const metadata = d.getMetadata();
    expect(metadata.threshold).toBeGreaterThanOrEqual(0);
  });

  it('getWeights returns copy of weights', () => {
    const d = new OnlineAnomalyDetector(3);
    const weights = d.getWeights();
    expect(weights.length).toBe(3);
  });

  it('getAdwin returns underlying drift detector', () => {
    const d = new OnlineAnomalyDetector(2);
    const adwin = d.getAdwin();
    expect(adwin).toBeInstanceOf(ADWINDetector);
  });
});
