import { OnlineLearnerConfig, OnlineMetrics, RegretMetrics } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('online-threshold-learner');

export class OnlineThresholdLearner {
  private _weights: number[] = [];
  private _gradientSums: number[] = [];
  private _gradientSquaredSums: number[] = [];
  private _config: OnlineLearnerConfig = {
    learningRate: 0.01, alpha: 0.1, beta: 1.0,
    l1Regularization: 0.001, l2Regularization: 0.001, adaptivity: 'ftrl',
  };
  private _predictions: number[] = [];
  private _actuals: number[] = [];
  private _cumulativeRegret = 0;
  private _updateCount = 0;

  constructor(nFeatures: number) {
    this._weights = new Array(nFeatures).fill(0);
    this._gradientSums = new Array(nFeatures).fill(0);
    this._gradientSquaredSums = new Array(nFeatures).fill(0);
  }

  async predict(features: number[]): Promise<{ threshold: number; confidence: number }> {
    const prediction = this._computePrediction(features);
    const threshold = this._sigmoid(prediction) * 100;
    const confidence = Math.min(0.9, 0.5 + 0.4 * (1 - this._cumulativeRegret / Math.max(1, this._updateCount)));
    return { threshold: Math.round(threshold * 100) / 100, confidence };
  }

  async update(features: number[], actualOutcome: boolean): Promise<RegretMetrics> {
    const prediction = this._computePrediction(features);
    const label = actualOutcome ? 1 : 0;
    const loss = this._logLoss(prediction, label);
    const gradient = this._computeGradient(prediction, label, features);
    this._predictions.push(prediction);
    this._actuals.push(label);
    const optimalLoss = Math.min(...this._predictions.slice(-10).map(p => this._logLoss(p, label)));
    const regret = loss - optimalLoss;
    this._cumulativeRegret += regret;
    this._updateCount++;
    switch (this._config.adaptivity) {
      case 'ftrl': this._ftrlUpdate(gradient); break;
      case 'adagrad': this._adagradUpdate(gradient); break;
      case 'decreasing': this._sgdDecreasingUpdate(gradient); break;
      default: this._sgdConstantUpdate(gradient);
    }
    return {
      loss, regret, cumulativeRegret: this._cumulativeRegret,
      avgRegret: this._cumulativeRegret / this._updateCount,
      weightNorm: Math.sqrt(this._weights.reduce((s, w) => s + w * w, 0)),
      updateCount: this._updateCount,
    };
  }

  private _computePrediction(features: number[]): number {
    return features.reduce((sum, f, i) => sum + f * (this._weights[i] ?? 0), 0);
  }

  private _computeGradient(prediction: number, label: number, features: number[]): number[] {
    const sigmoidPred = this._sigmoid(prediction);
    const error = sigmoidPred - label;
    return features.map(f => error * f);
  }

  private _ftrlUpdate(gradient: number[]): void {
    for (let i = 0; i < this._weights.length; i++) {
      this._gradientSquaredSums[i] = (this._gradientSquaredSums[i] ?? 0) + gradient[i] * gradient[i];
      const sigma = (Math.sqrt(this._gradientSquaredSums[i] + this._config.alpha) - Math.sqrt((this._gradientSquaredSums[i] ?? 0))) / this._config.alpha;
      this._gradientSums[i] = (this._gradientSums[i] ?? 0) + gradient[i];
      const z = (this._gradientSums[i] ?? 0) - sigma * this._weights[i];
      if (Math.abs(z) <= this._config.l1Regularization) {
        this._weights[i] = 0;
      } else {
        const sign = z > 0 ? 1 : -1;
        this._weights[i] = -(sign * this._config.l1Regularization - z) / ((this._config.beta + Math.sqrt(this._gradientSquaredSums[i] + this._config.alpha)) / this._config.alpha + this._config.l2Regularization);
      }
    }
  }

  private _adagradUpdate(gradient: number[]): void {
    const lr = this._config.learningRate;
    for (let i = 0; i < this._weights.length; i++) {
      this._gradientSquaredSums[i] = (this._gradientSquaredSums[i] ?? 0) + gradient[i] * gradient[i];
      const adaptiveLR = lr / (Math.sqrt(this._gradientSquaredSums[i] ?? 0) + 1e-8);
      this._weights[i] -= adaptiveLR * gradient[i];
    }
  }

  private _sgdDecreasingUpdate(gradient: number[]): void {
    const lr = this._config.learningRate / (1 + this._config.alpha * this._updateCount);
    for (let i = 0; i < this._weights.length; i++) {
      this._weights[i] -= lr * gradient[i];
    }
  }

  private _sgdConstantUpdate(gradient: number[]): void {
    for (let i = 0; i < this._weights.length; i++) {
      this._weights[i] -= this._config.learningRate * gradient[i];
    }
  }

  private _sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private _logLoss(prediction: number, label: number): number {
    const p = this._sigmoid(prediction);
    return -label * Math.log(Math.max(p, 1e-15)) - (1 - label) * Math.log(Math.max(1 - p, 1e-15));
  }

  getRegretBounds(): { expectedRegret: number; upperBound: number } {
    if (this._updateCount === 0) return { expectedRegret: 0, upperBound: Infinity };
    const theoreticalBound = Math.log(this._updateCount + 1) * this._weights.length;
    return { expectedRegret: this._cumulativeRegret / this._updateCount, upperBound: theoreticalBound };
  }

  getOnlineMetrics(): OnlineMetrics {
    const recentPreds = this._predictions.slice(-100);
    const recentActuals = this._actuals.slice(-100);
    const correct = recentPreds.filter((p, i) => {
      const predClass = p > 0 ? 1 : 0;
      return predClass === recentActuals[i];
    }).length;
    return {
      accuracy: recentPreds.length > 0 ? correct / recentPreds.length : 0,
      cumulativeRegret: this._cumulativeRegret,
      avgRegret: this._cumulativeRegret / Math.max(1, this._updateCount),
      weightCount: this._weights.filter(w => w !== 0).length,
      activeFeatures: this._weights.map((w, i) => ({ index: i, weight: w })).filter(f => Math.abs(f.weight) > 0.01).sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)),
      convergenceRate: this._cumulativeRegret / Math.max(1, Math.log(this._updateCount + 1)),
    };
  }

  getWeights(): number[] { return [...this._weights]; }
}
