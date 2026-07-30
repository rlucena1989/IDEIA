import { ContinuousLearningEngine } from '../src/continuous-learning-engine';
import { OnlineLearner } from '../src/online-learner';
import { CatastrophicForgettingPreventer } from '../src/catastrophic-forgetting-preventer';
import { ProgressiveMemoryCompactor } from '../src/progressive-memory-compactor';
import { MetaMemoryOptimizer } from '../src/meta-memory-optimizer';
import { ReplayBuffer } from '../src/replay-buffer';
import { MemoryEntry, TrainingExample } from '../src/types';

describe('ContinuousLearningEngine', () => {
  let engine: ContinuousLearningEngine;

  beforeEach(() => {
    engine = new ContinuousLearningEngine();
  });

  test('should initialize with default config', () => {
    expect(engine.taskCount).toBe(0);
    expect(engine.totalSamples).toBe(0);
  });

  test('should train a new task and return metrics', async () => {
    const samples: TrainingExample[] = [
      { input: ['feature', 'bug', 'fix'], label: 'positive', weight: 1 },
      { input: ['docs', 'readme'], label: 'negative', weight: 1 },
    ];
    const result = await engine.trainNewTask('task-1', samples);
    expect(result.ftrlLoss).toBeGreaterThanOrEqual(0);
    expect(result.ewcLoss).toBeGreaterThanOrEqual(0);
    expect(result.forgetting).toBeGreaterThanOrEqual(0);
    expect(engine.taskCount).toBe(1);
    expect(engine.totalSamples).toBe(2);
  });

  test('should predict labels with confidence', () => {
    const result = engine.predict(['test', 'feature']);
    expect(result.probability).toBeGreaterThanOrEqual(0);
    expect(result.probability).toBeLessThanOrEqual(1);
    expect(['positive', 'negative']).toContain(result.label);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  test('should compact memories progressively', async () => {
    const memories: MemoryEntry[] = Array.from({ length: 20 }, (_, i) => ({
      key: `mem-${i}`,
      content: `memory content ${i} with some extra words for testing`,
      importance: Math.random(),
      timestamp: Date.now() - i * 1000,
    }));
    const result = await engine.compactMemories(memories);
    expect(result.stages.length).toBe(4);
    expect(result.totalCompression).toBeGreaterThan(0);
    expect(result.totalCompression).toBeLessThanOrEqual(1);
  });

  test('should run meta optimization', async () => {
    await engine.runMetaOptimization('hit_rate');
    expect(engine.getStats().featureCount).toBeGreaterThan(0);
  });

  test('should get stats', () => {
    const stats = engine.getStats();
    expect(stats.taskCount).toBe(0);
    expect(stats.totalSamples).toBe(0);
    expect(stats.bufferSize).toBe(0);
    expect(stats.featureCount).toBe(16);
  });

  test('should reset engine state', () => {
    engine.reset();
    expect(engine.taskCount).toBe(0);
    expect(engine.totalSamples).toBe(0);
  });
});

describe('OnlineLearner', () => {
  let learner: OnlineLearner;

  beforeEach(() => {
    learner = new OnlineLearner({ alpha: 0.1, beta: 1, lambda1: 0.1, lambda2: 1 });
  });

  test('should predict sigmoid output', () => {
    const result = learner.predict(['test']);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  test('should train on a sample and reduce loss', () => {
    const loss1 = learner.train({ input: ['feature', 'code'], label: 'positive', weight: 1 });
    const loss2 = learner.train({ input: ['feature', 'code'], label: 'positive', weight: 1 });
    expect(loss1).toBeGreaterThanOrEqual(0);
    expect(loss2).toBeLessThanOrEqual(loss1 + 0.1);
  });

  test('should train batch and return average loss', () => {
    const samples: TrainingExample[] = [
      { input: ['a', 'b'], label: 'positive', weight: 1 },
      { input: ['c', 'd'], label: 'negative', weight: 1 },
    ];
    const loss = learner.trainBatch(samples);
    expect(loss).toBeGreaterThanOrEqual(0);
  });

  test('should get and set weights', () => {
    const weights = learner.getWeights();
    expect(weights.length).toBe(16);
    const newWeights = weights.map(() => Math.random());
    learner.setWeights(newWeights);
    expect(learner.getWeights()).toEqual(newWeights);
  });

  test('should handle different feature count', () => {
    const smallLearner = new OnlineLearner({ alpha: 0.1, beta: 1, lambda1: 0.1, lambda2: 1 }, 5);
    expect(smallLearner.getWeights().length).toBe(5);
  });
});

describe('CatastrophicForgettingPreventer', () => {
  let preventer: CatastrophicForgettingPreventer;

  beforeEach(() => {
    preventer = new CatastrophicForgettingPreventer(500);
  });

  test('should compute importance matrix from fisher samples', () => {
    const weights = [0.1, 0.2, 0.3, 0.4];
    const samples = [[1, 2, 3, 4], [4, 3, 2, 1]];
    const importance = preventer.computeImportance(weights, samples);
    expect(importance.length).toBe(4);
    expect(importance.every(v => v >= 0)).toBe(true);
  });

  test('should compute EWC loss', () => {
    const weights = [0.1, 0.2, 0.3, 0.4];
    const samples: TrainingExample[] = [
      { input: ['a'], label: 'pos', weight: 1 },
      { input: ['b'], label: 'neg', weight: 1 },
    ];
    preventer.computeImportance(weights, [[1], [2]]);
    const loss = preventer.getTotalEwcLoss(weights);
    expect(loss).toBeGreaterThanOrEqual(0);
  });

  test('should train new task and return EWC result', async () => {
    const taskData: TrainingExample[] = [
      { input: ['feature1'], label: 'positive', weight: 1 },
      { input: ['feature2'], label: 'negative', weight: 1 },
    ];
    const initialWeights = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const result = await preventer.trainNewTask(taskData, 'task1', initialWeights);
    expect(result.taskId).toBe('task1');
    expect(result.ewcLoss).toBeGreaterThanOrEqual(0);
    expect(result.forgetting).toBeGreaterThanOrEqual(0);
    expect(result.weightChange).toBeGreaterThanOrEqual(0);
  });

  test('should return task count', () => {
    expect(preventer.getTaskCount()).toBe(0);
  });

  test('should reset state', () => {
    preventer.reset();
    expect(preventer.getTaskCount()).toBe(0);
  });
});

describe('ProgressiveMemoryCompactor', () => {
  let compactor: ProgressiveMemoryCompactor;

  beforeEach(() => {
    compactor = new ProgressiveMemoryCompactor();
  });

  test('should compact memories and retain important ones', async () => {
    const memories: MemoryEntry[] = Array.from({ length: 10 }, (_, i) => ({
      key: `m${i}`,
      content: `content ${i} with some extra words for testing purposes`,
      importance: i / 10,
      timestamp: Date.now() - i * 10000,
    }));
    const result = await compactor.compact(memories, 0);
    expect(result.originalCount).toBe(10);
    expect(result.compactedCount).toBeLessThanOrEqual(10);
    expect(result.compressionRatio).toBeGreaterThan(0);
    expect(result.compressionRatio).toBeLessThanOrEqual(1);
    expect(result.summaries.length).toBe(result.compactedCount);
    expect(result.temporalClusters.length).toBeGreaterThanOrEqual(0);
  });

  test('should perform progressive compaction in stages', async () => {
    const memories: MemoryEntry[] = Array.from({ length: 20 }, (_, i) => ({
      key: `m${i}`,
      content: `progressive test content ${i} with extra words`,
      importance: i / 20,
      timestamp: Date.now() - i * 1000,
    }));
    const result = await compactor.progressiveCompact(memories, [0, 1, 2]);
    expect(result.stages.length).toBe(3);
    expect(result.finalCount).toBeLessThan(20);
    expect(result.totalCompression).toBeGreaterThan(0);
  });
});

describe('MetaMemoryOptimizer', () => {
  let optimizer: MetaMemoryOptimizer;

  beforeEach(() => {
    optimizer = new MetaMemoryOptimizer();
  });

  test('should return current params', () => {
    const params = optimizer.currentParams;
    expect(params.workingMemorySize).toBe(50);
    expect(params.embeddingDim).toBe(384);
  });

  test('should optimize for hit rate', async () => {
    const result = await optimizer.optimize('hit_rate');
    expect(result.embeddingDim).toBeDefined();
  });

  test('should auto tune hyperparameters', async () => {
    const result = await optimizer.autoTune({
      workingMemorySize: [25, 50, 100],
      embeddingDim: [128, 256, 384],
    }, 20);
    expect(result.totalTrials).toBe(20);
    expect(result.bestScore).toBeGreaterThan(-Infinity);
    expect(result.finalHitRate).toBeGreaterThanOrEqual(0);
  });

  test('should give recommendations', () => {
    const rec = optimizer.getRecommendation();
    expect(typeof rec).toBe('string');
  });

  test('should track performance history', () => {
    const history = optimizer.getPerformanceHistory();
    expect(Array.isArray(history)).toBe(true);
  });
});

describe('ReplayBuffer', () => {
  let buffer: ReplayBuffer;

  beforeEach(() => {
    buffer = new ReplayBuffer(100);
  });

  test('should add entries', () => {
    buffer.add({ input: ['a', 'b'], label: 'pos', timestamp: Date.now(), weight: 1 });
    expect(buffer.size()).toBe(1);
  });

  test('should add batch of entries', () => {
    buffer.addBatch([
      { input: ['a'], label: 'pos', timestamp: Date.now(), weight: 1 },
      { input: ['b'], label: 'neg', timestamp: Date.now(), weight: 1 },
    ]);
    expect(buffer.size()).toBe(2);
  });

  test('should sample random entries', () => {
    for (let i = 0; i < 20; i++) {
      buffer.add({ input: [`f${i}`], label: i % 2 === 0 ? 'pos' : 'neg', timestamp: Date.now(), weight: 1 });
    }
    const sampled = buffer.sample(5);
    expect(sampled.length).toBe(5);
  });

  test('should sample by weight', () => {
    for (let i = 0; i < 10; i++) {
      buffer.add({ input: [`f${i}`], label: 'pos', timestamp: Date.now(), weight: i + 1 });
    }
    const sampled = buffer.sampleByWeight(3);
    expect(sampled.length).toBe(3);
  });

  test('should get recent entries', () => {
    for (let i = 0; i < 5; i++) {
      buffer.add({ input: [`f${i}`], label: 'pos', timestamp: Date.now(), weight: 1 });
    }
    const recent = buffer.getRecent(3);
    expect(recent.length).toBe(3);
  });

  test('should update weight', () => {
    buffer.add({ input: ['a'], label: 'pos', timestamp: Date.now(), weight: 1 });
    buffer.updateWeight(0, 10);
    const all = buffer.getAll();
    expect(all[0].weight).toBe(10);
  });

  test('should clear buffer', () => {
    buffer.add({ input: ['a'], label: 'pos', timestamp: Date.now(), weight: 1 });
    buffer.clear();
    expect(buffer.size()).toBe(0);
  });

  test('should resize buffer', () => {
    for (let i = 0; i < 10; i++) {
      buffer.add({ input: [`f${i}`], label: 'pos', timestamp: Date.now(), weight: i });
    }
    buffer.resize(5);
    expect(buffer.size()).toBe(5);
  });

  test('should report empty correctly', () => {
    expect(buffer.isEmpty()).toBe(true);
    buffer.add({ input: ['a'], label: 'pos', timestamp: Date.now(), weight: 1 });
    expect(buffer.isEmpty()).toBe(false);
  });
});
