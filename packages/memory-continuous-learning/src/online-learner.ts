import { FTRLParams, TrainingExample } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('online-learner');

export class OnlineLearner {
  private _params: FTRLParams;
  private _z: number[];
  private _n: number[];
  private _weights: number[];
  private _featureCount: number;

  constructor(params: FTRLParams, featureCount = 16) {
    this._params = params;
    this._featureCount = featureCount;
    this._z = new Array(featureCount).fill(0);
    this._n = new Array(featureCount).fill(0);
    this._weights = new Array(featureCount).fill(0);
  }

  getWeights(): number[] {
    return [...this._weights];
  }

  setWeights(weights: number[]): void {
    if (weights.length !== this._featureCount) {
      this._featureCount = weights.length;
      this._z = new Array(this._featureCount).fill(0);
      this._n = new Array(this._featureCount).fill(0);
    }
    this._weights = [...weights];
  }

  predict(input: number[] | string[]): number {
    if (typeof input[0] === 'string') {
      const strInput = input as string[];
      input = strInput.map(s => this._hashFeature(s));
    }
    const numericInput = input as number[];
    const maxLen = Math.min(numericInput.length, this._featureCount);
    let sum = this._weights[0] ?? 0;
    for (let i = 0; i < maxLen; i++) {
      sum += (this._weights[i] ?? 0) * numericInput[i];
    }
    return this._sigmoid(sum);
  }

  train(sample: TrainingExample): number {
    const prediction = this.predict(sample.input);
    const label = sample.label === 'positive' ? 1 : 0;
    const gradient = prediction - label;
    const loss = this._logLoss(prediction, label);
    const numericInput = sample.input.map(s => this._hashFeature(s));
    for (let i = 0; i < this._featureCount; i++) {
      const xi = numericInput[i] ?? 0;
      if (xi === 0) continue;
      const g = gradient * xi;
      const oldN = this._n[i];
      const oldZ = this._z[i];
      this._n[i] = oldN + g * g;
      const sigma = (Math.sqrt(this._n[i]) - Math.sqrt(oldN)) / (this._params.alpha ?? 0.1);
      this._z[i] = oldZ + g - sigma * this._weights[i];
      this._weights[i] = this._applyFtrl(this._z[i], this._n[i]);
    }
    return loss;
  }

  trainBatch(samples: TrainingExample[]): number {
    let totalLoss = 0;
    for (const sample of samples) {
      totalLoss += this.train(sample);
    }
    return totalLoss / samples.length;
  }

  private _sigmoid(x: number): number {
    if (x > 20) return 1;
    if (x < -20) return 0;
    return 1 / (1 + Math.exp(-x));
  }

  private _logLoss(pred: number, label: number): number {
    const eps = 1e-15;
    pred = Math.max(eps, Math.min(1 - eps, pred));
    return -(label * Math.log(pred) + (1 - label) * Math.log(1 - pred));
  }

  private _applyFtrl(z: number, n: number): number {
    const { alpha, beta, lambda1, lambda2 } = this._params;
    if (Math.abs(z) <= lambda1) return 0;
    const sign = z > 0 ? 1 : -1;
    return -(sign * (Math.abs(z) - lambda1)) / ((beta + Math.sqrt(n)) / alpha + lambda2);
  }

  private _hashFeature(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const char = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash % this._featureCount);
  }
}
