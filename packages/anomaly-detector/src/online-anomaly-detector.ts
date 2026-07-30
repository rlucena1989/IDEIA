import { OnlineConfig, OnlineDetectionResult } from './types';
import { createLogger } from '@ideia/logger';
import { ADWINDetector } from './adwin-detector';
const logger = createLogger('online-anomaly-detector');

export class OnlineAnomalyDetector {
  private _weights: Float64Array;
  private _learningRates: Float64Array;
  private _sumGradients: Float64Array;
  private _sumSquaredGradients: Float64Array;
  private _config: OnlineConfig;
  private _window: number[][];
  private _predictions: number[];
  private _nUpdates: number;
  private _adwin: ADWINDetector;

  constructor(featureDim: number, config?: Partial<OnlineConfig>) {
    this._config = {
      alpha: 0.5,
      beta: 1,
      lambda1: 0.01,
      lambda2: 1,
      windowSize: 100,
      threshold: 0.5,
      ...config,
    };

    this._weights = new Float64Array(featureDim);
    this._learningRates = new Float64Array(featureDim).fill(1);
    this._sumGradients = new Float64Array(featureDim);
    this._sumSquaredGradients = new Float64Array(featureDim);
    this._window = [];
    this._predictions = [];
    this._nUpdates = 0;
    this._adwin = new ADWINDetector();
  }

  async update(
    features: number[],
    actualLabel?: boolean,
  ): Promise<OnlineDetectionResult> {
    this._window.push(features);
    if (this._window.length > this._config.windowSize) {
      this._window.shift();
    }

    const score = this._predict(features);
    const isAnomaly = score > this._config.threshold;
    this._predictions.push(score);

    const driftDetected = this._adwin.update(isAnomaly ? 1 : 0);

    if (actualLabel !== undefined) {
      const gradient = this._computeGradient(features, score, actualLabel);
      this._applyFTRLUpdate(gradient);
      this._nUpdates++;
    }

    return {
      timestamp: Date.now(),
      score,
      isAnomaly,
      currentThreshold: this._config.threshold,
      driftDetected,
      modelAge: this._nUpdates,
    };
  }

  async detectBatch(
    featuresBatch: number[][],
  ): Promise<OnlineDetectionResult[]> {
    const results: OnlineDetectionResult[] = [];
    for (const features of featuresBatch) {
      results.push(await this.update(features));
    }
    return results;
  }

  private _predict(features: number[]): number {
    let z = 0;
    for (let i = 0; i < Math.min(features.length, this._weights.length); i++) {
      z += (features[i] ?? 0) * (this._weights[i] ?? 0);
    }
    return 1 / (1 + Math.exp(-z));
  }

  private _computeGradient(
    features: number[],
    prediction: number,
    label: boolean,
  ): number[] {
    const error = prediction - (label ? 1 : 0);
    return features.map((f) => error * f);
  }

  private _applyFTRLUpdate(gradient: number[]): void {
    for (let i = 0; i < Math.min(gradient.length, this._weights.length); i++) {
      const gi = gradient[i] ?? 0;
      this._sumGradients[i] = (this._sumGradients[i] ?? 0) + gi;
      this._sumSquaredGradients[i] =
        (this._sumSquaredGradients[i] ?? 0) + gi * gi;

      const sigma =
        (Math.sqrt(
          (this._sumSquaredGradients[i] ?? 0) + this._config.alpha,
        ) -
          Math.sqrt(
            (this._sumSquaredGradients[i] ?? 0) -
              gi * gi +
              this._config.alpha,
          )) /
        (this._config.alpha + (this._learningRates[i] ?? 1));

      this._learningRates[i] =
        (Math.sqrt(
          (this._sumSquaredGradients[i] ?? 0) + this._config.alpha,
        ) -
          Math.sqrt(this._config.alpha)) /
        (this._config.beta + (this._learningRates[i] ?? 1));

      const sign = (this._weights[i] ?? 0) >= 0 ? 1 : -1;

      if (Math.abs(this._weights[i] ?? 0) <= this._config.lambda1) {
        this._weights[i] = 0;
      } else {
        this._weights[i] =
          sign * (Math.abs(this._weights[i] ?? 0) - this._config.lambda1);
      }

      this._weights[i] =
        (this._weights[i] ?? 0) -
        (this._learningRates[i] ?? 0) *
          ((this._sumGradients[i] ?? 0) + sigma * (this._weights[i] ?? 0));
    }
  }

  async adaptThreshold(fprTarget: number): Promise<void> {
    if (this._predictions.length < 100) return;

    const sorted = [...this._predictions].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * (1 - fprTarget));
    this._config.threshold = sorted[
      Math.max(0, Math.min(idx, sorted.length - 1))
    ] ?? 0.5;
  }

  getWeights(): Float64Array {
    return new Float64Array(this._weights);
  }

  getMetadata(): Record<string, number> {
    const zeroCount = Array.from(this._weights).filter((w) => w === 0).length;
    return {
      featureCount: this._weights.length,
      nUpdates: this._nUpdates,
      threshold: this._config.threshold,
      sparsity: zeroCount / this._weights.length,
    };
  }

  getAdwin(): ADWINDetector {
    return this._adwin;
  }
}
