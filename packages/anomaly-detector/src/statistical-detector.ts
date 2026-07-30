import { DetectionResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('statistical-detector');

export class ZScoreDetector {
  detect(values: number[], newValue: number, threshold = 3): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
    const std = Math.sqrt(variance);
    if (std === 0) return 0;
    const z = Math.abs(newValue - mean) / std;
    return Math.min(1, z / threshold);
  }
}

export class MADDetector {
  detect(values: number[], newValue: number, threshold = 3.5): number {
    if (values.length < 2) return 0;
    const median = this._median(values);
    const absoluteDeviations = values.map((v) => Math.abs(v - median));
    const mad = this._median(absoluteDeviations);
    if (mad === 0) {
      return values.every((v) => v === newValue) ? 0 : 0.5;
    }
    const modifiedZ = Math.abs(newValue - median) / (mad * 0.6745);
    return Math.min(1, modifiedZ / threshold);
  }

  private _median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
}

export class IQRDetector {
  detect(values: number[], newValue: number, multiplier = 1.5): number {
    if (values.length < 4) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    if (iqr === 0) return 0;
    const upper = q3 + multiplier * iqr;
    const lower = q1 - multiplier * iqr;
    if (newValue > upper) return Math.min(1, (newValue - upper) / (iqr * 3));
    if (newValue < lower) return Math.min(1, (lower - newValue) / (iqr * 3));
    return 0;
  }
}

export class EWMADetector {
  private _ema = 0;
  private _emv = 0;
  private _alpha = 0.3;
  private _beta = 0.1;

  detect(newValue: number, threshold = 3): number {
    if (this._ema === 0) {
      this._ema = newValue;
      return 0;
    }
    const diff = newValue - this._ema;
    this._ema = this._alpha * newValue + (1 - this._alpha) * this._ema;
    this._emv = this._beta * diff * diff + (1 - this._beta) * this._emv;
    const std = Math.sqrt(this._emv);
    if (std === 0) return 0;
    const zScore = Math.abs(diff) / std;
    return Math.min(1, zScore / threshold);
  }

  reset(): void {
    this._ema = 0;
    this._emv = 0;
  }
}

export class StatisticalDetector {
  private _zscore: ZScoreDetector;
  private _mad: MADDetector;
  private _iqr: IQRDetector;
  private _ewma: EWMADetector;

  constructor() {
    this._zscore = new ZScoreDetector();
    this._mad = new MADDetector();
    this._iqr = new IQRDetector();
    this._ewma = new EWMADetector();
  }

  detect(values: number[], newValue: number): DetectionResult[] {
    return [
      {
        detectorName: 'zscore',
        score: this._zscore.detect(values, newValue),
        threshold: 3,
        isAnomaly: this._zscore.detect(values, newValue) > 1,
        details: { method: 'zscore' },
      },
      {
        detectorName: 'mad',
        score: this._mad.detect(values, newValue),
        threshold: 3.5,
        isAnomaly: this._mad.detect(values, newValue) > 1,
        details: { method: 'mad' },
      },
      {
        detectorName: 'iqr',
        score: this._iqr.detect(values, newValue),
        threshold: 1.5,
        isAnomaly: this._iqr.detect(values, newValue) > 0,
        details: { method: 'iqr' },
      },
      {
        detectorName: 'ewma',
        score: this._ewma.detect(newValue),
        threshold: 3,
        isAnomaly: this._ewma.detect(newValue) > 1,
        details: { method: 'ewma' },
      },
    ];
  }

  getMaxScore(values: number[], newValue: number): number {
    const results = this.detect(values, newValue);
    return results.reduce((max, r) => Math.max(max, r.score), 0);
  }

  resetEWMA(): void {
    this._ewma.reset();
  }
}
