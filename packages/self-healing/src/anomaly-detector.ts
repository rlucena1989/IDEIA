import { AnomalyMethod } from './types';

export interface MetricPoint {
  timestamp: number;
  value: number;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  score: number;
  method: AnomalyMethod;
  details: Record<string, unknown>;
  timestamp: number;
}

export interface DetectionStrategy {
  readonly name: AnomalyMethod;
  train(series: MetricPoint[]): void;
  detect(series: MetricPoint[], currentValue: number): AnomalyResult;
}

export class ZScoreStrategy implements DetectionStrategy {
  readonly name: AnomalyMethod = 'zscore';
  private _mean: number = 0;
  private _std: number = 0;
  private _threshold: number = 3.5;
  private _windowSize: number = 100;

  setThreshold(t: number): void {
    this._threshold = t;
  }

  train(series: MetricPoint[]): void {
    const window = series.slice(-this._windowSize);
    if (window.length === 0) return;
    const values = window.map(p => p.value);
    this._mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - this._mean) ** 2, 0) / values.length;
    this._std = Math.sqrt(variance);
  }

  detect(_series: MetricPoint[], currentValue: number): AnomalyResult {
    const deviation = this._std === 0 ? 0 : (currentValue - this._mean) / this._std;
    const score = Math.min(1, Math.abs(deviation) / (this._threshold * 2));
    const isAnomaly = Math.abs(deviation) > this._threshold;
    return {
      isAnomaly,
      score,
      method: this.name,
      details: { expected: this._mean, deviation, threshold: this._threshold, std: this._std },
      timestamp: Date.now(),
    };
  }
}

export class EWMAStrategy implements DetectionStrategy {
  readonly name: AnomalyMethod = 'ewma';
  private _ewma: number = 0;
  private _variance: number = 0;
  private _alpha: number = 0.15;
  private _threshold: number = 3;
  private _initialized: boolean = false;

  setAlpha(a: number): void {
    this._alpha = a;
  }

  setThreshold(t: number): void {
    this._threshold = t;
  }

  train(series: MetricPoint[]): void {
    if (series.length === 0) return;
    let ewma = series[0]?.value ?? 0;
    for (let i = 1; i < series.length; i++) {
      const val = series[i]?.value ?? 0;
      ewma = this._alpha * val + (1 - this._alpha) * ewma;
    }
    this._ewma = ewma;
    const residuals = series.map(p => Math.abs(p.value - this._ewma));
    this._variance = residuals.reduce((a, b) => a + b ** 2, 0) / residuals.length;
    this._initialized = true;
  }

  detect(_series: MetricPoint[], currentValue: number): AnomalyResult {
    if (!this._initialized) {
      this._ewma = currentValue;
      this._initialized = true;
      return { isAnomaly: false, score: 0, method: this.name, details: { note: 'initializing' }, timestamp: Date.now() };
    }
    const residual = Math.abs(currentValue - this._ewma);
    const std = Math.sqrt(this._variance) || 1;
    const deviation = residual / std;
    const score = Math.min(1, deviation / (this._threshold * 2));
    this._ewma = this._alpha * currentValue + (1 - this._alpha) * this._ewma;
    return {
      isAnomaly: deviation > this._threshold,
      score,
      method: this.name,
      details: { expected: this._ewma, deviation, threshold: this._threshold, std },
      timestamp: Date.now(),
    };
  }
}

export class CUSUMStrategy implements DetectionStrategy {
  readonly name: AnomalyMethod = 'cusum';
  private _target: number = 0;
  private _std: number = 1;
  private _threshold: number = 5;
  private _drift: number = 1;
  private _cumHigh: number = 0;
  private _cumLow: number = 0;
  private _initialized: boolean = false;

  setDrift(d: number): void {
    this._drift = d;
  }

  setThreshold(t: number): void {
    this._threshold = t;
  }

  train(series: MetricPoint[]): void {
    if (series.length === 0) return;
    const values = series.map(p => p.value);
    this._target = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - this._target) ** 2, 0) / values.length;
    this._std = Math.sqrt(variance) || 1;
    this._cumHigh = 0;
    this._cumLow = 0;
    this._initialized = true;
  }

  detect(_series: MetricPoint[], currentValue: number): AnomalyResult {
    if (!this._initialized) {
      this._target = currentValue;
      this._initialized = true;
      return { isAnomaly: false, score: 0, method: this.name, details: { note: 'initializing' }, timestamp: Date.now() };
    }
    const normalized = (currentValue - this._target) / this._std;
    this._cumHigh = Math.max(0, this._cumHigh + normalized - this._drift);
    this._cumLow = Math.min(0, this._cumLow + normalized + this._drift);
    const cumStat = Math.max(Math.abs(this._cumHigh), Math.abs(this._cumLow));
    const score = Math.min(1, cumStat / this._threshold);
    const isAnomaly = cumStat > this._threshold;
    return {
      isAnomaly,
      score,
      method: this.name,
      details: { cumHigh: this._cumHigh, cumLow: this._cumLow, threshold: this._threshold, target: this._target, std: this._std },
      timestamp: Date.now(),
    };
  }
}

export class AnomalyDetector {
  private _strategies: DetectionStrategy[] = [];
  private _metricHistory: Map<string, MetricPoint[]> = new Map();
  private _maxHistorySize: number = 1000;
  private _ensembleThreshold: number = 0.5;

  constructor() {
    this._strategies.push(new ZScoreStrategy());
    this._strategies.push(new EWMAStrategy());
    this._strategies.push(new CUSUMStrategy());
  }

  registerStrategy(strategy: DetectionStrategy): void {
    this._strategies.push(strategy);
  }

  set maxHistorySize(size: number) {
    this._maxHistorySize = size;
  }

  set ensembleThreshold(t: number) {
    this._ensembleThreshold = t;
  }

  addMetricPoint(metricName: string, value: number): void {
    let history = this._metricHistory.get(metricName);
    if (!history) {
      history = [];
      this._metricHistory.set(metricName, history);
    }
    history.push({ timestamp: Date.now(), value });
    if (history.length > this._maxHistorySize) {
      history.splice(0, history.length - this._maxHistorySize);
    }
  }

  getHistory(metricName: string): readonly MetricPoint[] {
    return this._metricHistory.get(metricName) ?? [];
  }

  analyze(metricName: string, currentValue: number): AnomalyResult {
    const history = this._metricHistory.get(metricName) ?? [];
    if (history.length < 10) {
      return { isAnomaly: false, score: 0, method: 'insufficient-data', details: { points: history.length }, timestamp: Date.now() };
    }
    if (history.length % 50 === 0) {
      for (const strategy of this._strategies) {
        strategy.train(history);
      }
    }
    const results = this._strategies
      .filter(() => history.length >= 10)
      .map(s => s.detect(history, currentValue));
    if (results.length === 0) {
      return { isAnomaly: false, score: 0, method: 'no-strategies', details: {}, timestamp: Date.now() };
    }
    const anomalyCount = results.filter(r => r.isAnomaly).length;
    const avgScore = results.reduce((a, r) => a + r.score, 0) / results.length;
    const isAnomaly = (anomalyCount / results.length) >= this._ensembleThreshold || avgScore > 0.8;
    return {
      isAnomaly,
      score: avgScore,
      method: 'ensemble',
      details: {
        strategies: results.map(r => ({ method: r.method, isAnomaly: r.isAnomaly, score: r.score })),
        votes: `${anomalyCount}/${results.length}`,
      },
      timestamp: Date.now(),
    };
  }

  analyzeAllMetrics(metrics: Map<string, number>): Map<string, AnomalyResult> {
    const results = new Map<string, AnomalyResult>();
    for (const [name, value] of metrics) {
      this.addMetricPoint(name, value);
      results.set(name, this.analyze(name, value));
    }
    return results;
  }
}
