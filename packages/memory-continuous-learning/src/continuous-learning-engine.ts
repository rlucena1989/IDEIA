import { OnlineLearner } from './online-learner';
import { createLogger } from '@ideia/logger';
import { CatastrophicForgettingPreventer } from './catastrophic-forgetting-preventer';
import { ProgressiveMemoryCompactor } from './progressive-memory-compactor';
import { MetaMemoryOptimizer } from './meta-memory-optimizer';
import { ReplayBuffer } from './replay-buffer';
import { ContinuousLearningConfig, MemoryEntry, PredictionResult, TrainingExample } from './types';
const logger = createLogger('continuous-learning-engine');

export class ContinuousLearningEngine {
  private _onlineLearner: OnlineLearner;
  private _forgettingPreventer: CatastrophicForgettingPreventer;
  private _compactor: ProgressiveMemoryCompactor;
  private _metaOptimizer: MetaMemoryOptimizer;
  private _replayBuffer: ReplayBuffer;
  private _config: ContinuousLearningConfig;
  private _taskCount = 0;
  private _totalSamples = 0;

  constructor(config?: Partial<ContinuousLearningConfig>) {
    this._config = {
      ftrlParams: { alpha: 0.1, beta: 1, lambda1: 0.1, lambda2: 1 },
      ewcLambda: 500,
      replayBufferSize: 10000,
      compactionSchedule: [0.5, 0.3, 0.15, 0.05],
      metaOptimizationInterval: 1000,
    };
    if (config) {
      this._config = { ...this._config, ...config };
    }
    this._onlineLearner = new OnlineLearner(this._config.ftrlParams);
    this._forgettingPreventer = new CatastrophicForgettingPreventer(this._config.ewcLambda);
    this._compactor = new ProgressiveMemoryCompactor();
    this._metaOptimizer = new MetaMemoryOptimizer();
    this._replayBuffer = new ReplayBuffer(this._config.replayBufferSize);
  }

  get onlineLearner(): OnlineLearner { return this._onlineLearner; }
  get forgettingPreventer(): CatastrophicForgettingPreventer { return this._forgettingPreventer; }
  get compactor(): ProgressiveMemoryCompactor { return this._compactor; }
  get metaOptimizer(): MetaMemoryOptimizer { return this._metaOptimizer; }
  get replayBuffer(): ReplayBuffer { return this._replayBuffer; }
  get taskCount(): number { return this._taskCount; }
  get totalSamples(): number { return this._totalSamples; }

  async trainNewTask(taskId: string, samples: Array<{ input: string[]; label: string }>): Promise<{
    ewcLoss: number;
    forgetting: number;
    weightChange: number;
    ftrlLoss: number;
  }> {
    this._taskCount++;
    const trainingExamples: TrainingExample[] = samples.map(s => ({ input: s.input, label: s.label, weight: 1 }));
    const ftrlLoss = this._onlineLearner.trainBatch(trainingExamples);
    for (const s of trainingExamples) {
      this._replayBuffer.add({ input: s.input, label: s.label, timestamp: Date.now(), weight: s.weight ?? 1 });
      this._totalSamples++;
    }
    const currentWeights = this._onlineLearner.getWeights();
    const ewcResult = await this._forgettingPreventer.trainNewTask(trainingExamples, taskId, currentWeights);
    return {
      ewcLoss: ewcResult.ewcLoss,
      forgetting: ewcResult.forgetting,
      weightChange: ewcResult.weightChange,
      ftrlLoss,
    };
  }

  predict(input: string[]): PredictionResult {
    const probability = this._onlineLearner.predict(input);
    const label = probability > 0.5 ? 'positive' : 'negative';
    const confidence = Math.abs(probability - 0.5) * 2;
    return { probability, label, confidence };
  }

  async compactMemories(memories: MemoryEntry[]): Promise<{ stages: unknown[]; totalCompression: number }> {
    const result = await this._compactor.progressiveCompact(memories, this._config.compactionSchedule);
    return { stages: result.stages, totalCompression: result.totalCompression };
  }

  async runMetaOptimization(objective: 'latency' | 'hit_rate' | 'memory'): Promise<void> {
    const optimized = await this._metaOptimizer.optimize(objective);
    if (optimized.workingMemorySize) {
      this._replayBuffer.resize(optimized.projectMemorySize ?? this._config.replayBufferSize);
    }
  }

  getStats(): { taskCount: number; totalSamples: number; bufferSize: number; featureCount: number } {
    return {
      taskCount: this._taskCount,
      totalSamples: this._totalSamples,
      bufferSize: this._replayBuffer.size(),
      featureCount: this._onlineLearner.getWeights().length,
    };
  }

  reset(): void {
    this._onlineLearner = new OnlineLearner(this._config.ftrlParams);
    this._forgettingPreventer = new CatastrophicForgettingPreventer(this._config.ewcLambda);
    this._replayBuffer = new ReplayBuffer(this._config.replayBufferSize);
    this._taskCount = 0;
    this._totalSamples = 0;
  }
}
