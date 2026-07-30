import { EventEmitter } from 'events';
import { createLogger } from '@ideia/logger';
import { ChangeContext, EngineConfig, EngineStatus, MetricSnapshot, ModelPrediction, ThresholdResult } from './types';
import { DriftDetector } from './drift-detector';
import { BayesianOptimizer } from './bayesian-optimizer';
const logger = createLogger('adaptive-threshold-engine');

class FeatureExtractor {
  extract(context: ChangeContext): number[] {
    return [
      this._encodeChangeType(context.changeType),
      context.projectAge / 365,
      Math.min(context.teamSize / 20, 1),
      Math.min(context.authorExperience / 60, 1),
      this._encodeBranchType(context.branchType),
      Math.min(context.filesChanged / 50, 1),
      Math.min(context.dependenciesChanged / 20, 1),
      this._extractHistoricalTrend(context.historicalMetrics),
    ];
  }

  private _encodeChangeType(type: string): number {
    const map: Record<string, number> = {
      hotfix: 1.0, bugfix: 0.8, feature: 0.5, refactor: 0.3, docs: 0.1, config: 0.2,
    };
    return map[type] ?? 0.4;
  }

  private _encodeBranchType(type: string): number {
    return { main: 1.0, develop: 0.7, feature: 0.4, hotfix: 0.9 }[type] ?? 0.5;
  }

  private _extractHistoricalTrend(metrics: MetricSnapshot[]): number {
    if (metrics.length < 2) return 0.5;
    const recent = metrics.slice(-10);
    const coverageValues = recent.map(m => m.coverage);
    const trend = (coverageValues[coverageValues.length - 1] - coverageValues[0]) / Math.max(coverageValues[0], 1);
    return Math.max(-1, Math.min(1, trend));
  }
}

class GradientBoostingModel {
  async predict(features: number[]): Promise<ModelPrediction> {
    const adjustment = features.reduce((s, f, i) => s + f * (0.1 / (i + 1)), 0);
    return {
      adjustment: Math.max(-0.5, Math.min(0.5, adjustment)),
      confidence: 0.75 + Math.random() * 0.15,
      factors: features.map((f, i) => ({ name: `feature_${i}`, impact: Math.abs(f * 0.1) })),
    };
  }
  async record(_features: number[], _outcome: boolean): Promise<void> {
    // online learning placeholder
  }
}

class ModelEnsemble {
  private _gbModel: GradientBoostingModel;
  private _bayesianModel: BayesianOptimizer;
  private _weights: { gb: number; bayesian: number };
  private _lastTraining: Date | null = null;
  private _trainingCount = 0;

  constructor(weights: { gb: number; bayesian: number }) {
    this._gbModel = new GradientBoostingModel();
    this._bayesianModel = new BayesianOptimizer();
    this._weights = weights;
  }

  async predict(features: number[]): Promise<ModelPrediction> {
    const [gbPred, bayesianPred] = await Promise.all([
      this._gbModel.predict(features),
      this._bayesianModel.predict(features),
    ]);
    const adjustment = gbPred.adjustment * this._weights.gb + bayesianPred.adjustment * this._weights.bayesian;
    const confidence = gbPred.confidence * this._weights.gb + bayesianPred.confidence * this._weights.bayesian;
    return { adjustment, confidence, factors: this._mergeFactors(gbPred.factors, bayesianPred.factors) };
  }

  async record(features: number[], outcome: boolean): Promise<void> {
    await Promise.all([
      this._gbModel.record(features, outcome),
      this._bayesianModel.record(features, outcome),
    ]);
  }

  async retrain(_history: MetricSnapshot[]): Promise<void> {
    this._lastTraining = new Date();
    this._trainingCount++;
  }

  async getLastTraining(): Promise<Date | null> { return this._lastTraining; }

  private _mergeFactors(
    a: Array<{ name: string; impact: number }>,
    b: Array<{ name: string; impact: number }>
  ): Array<{ name: string; impact: number }> {
    const map = new Map<string, number>();
    for (const f of [...a, ...b]) {
      map.set(f.name, (map.get(f.name) ?? 0) + f.impact / 2);
    }
    return Array.from(map.entries())
      .map(([name, impact]) => ({ name, impact: Math.round(impact * 100) / 100 }))
      .sort((x, y) => y.impact - x.impact)
      .slice(0, 5);
  }
}

export class AdaptiveThresholdEngine extends EventEmitter {
  private _featureExtractor: FeatureExtractor;
  private _modelEnsemble: ModelEnsemble;
  private _driftDetector: DriftDetector;
  private _config: EngineConfig;
  private _history: MetricSnapshot[] = [];

  constructor(config: Partial<EngineConfig> = {}) {
    super();
    this._config = {
      modelType: config.modelType ?? 'ensemble',
      calibrationEnabled: config.calibrationEnabled ?? true,
      driftCheckInterval: config.driftCheckInterval ?? 86400000,
      minDataPoints: config.minDataPoints ?? 50,
      ensembleWeights: config.ensembleWeights ?? { gb: 0.6, bayesian: 0.4 },
    };
    this._featureExtractor = new FeatureExtractor();
    this._modelEnsemble = new ModelEnsemble(this._config.ensembleWeights);
    this._driftDetector = new DriftDetector();
  }

  async adjustThreshold(metric: string, baseThreshold: number, context: ChangeContext): Promise<ThresholdResult> {
    this.emit('adjust:start', { metric, baseThreshold });
    const features = this._featureExtractor.extract(context);
    const prediction = await this._modelEnsemble.predict(features);
    const calibrated = this._config.calibrationEnabled ? this._calibrate(prediction) : prediction;
    const delta = calibrated.adjustment * baseThreshold;
    const adjustedValue = Math.max(0, baseThreshold + delta);
    const result: ThresholdResult = {
      metric,
      baseValue: baseThreshold,
      adjustedValue: Math.round(adjustedValue * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      confidence: calibrated.confidence,
      contributingFactors: calibrated.factors,
    };
    this.emit('adjust:done', result);
    return result;
  }

  async recordOutcome(metric: string, threshold: number, passed: boolean, context: ChangeContext): Promise<void> {
    const features = this._featureExtractor.extract(context);
    await this._modelEnsemble.record(features, passed);
    this.emit('outcome:recorded', { metric, threshold, passed });
    const driftSignal = await this._driftDetector.check(this._history);
    if (driftSignal) {
      this.emit('drift:detected', driftSignal);
      await this._modelEnsemble.retrain(this._history);
    }
  }

  private _calibrate(prediction: ModelPrediction): ModelPrediction {
    const confidence = Math.min(1, prediction.confidence * 1.1);
    return { ...prediction, confidence };
  }

  async getStatus(): Promise<EngineStatus> {
    return {
      modelType: this._config.modelType,
      dataPoints: this._history.length,
      driftAlerts: await this._driftDetector.getAlerts(),
      lastTraining: await this._modelEnsemble.getLastTraining(),
    };
  }
}
