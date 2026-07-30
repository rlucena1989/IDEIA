import { ProphetResult, TimePoint, TrendModel } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('prophet-predictor');

export class ProphetPredictor {
  async forecast(history: TimePoint[], horizon: number): Promise<ProphetResult> {
    const trend = this._decomposeTrend(history);
    const weeklySeason = this._decomposeSeasonality(history, 7);
    const dailySeason = this._decomposeSeasonality(history, 24);
    const predictions: number[] = [];
    const intervals: number[][] = [];
    for (let i = 0; i < horizon; i++) {
      const t = history.length + i;
      const trendVal = this._forecastTrend(trend, t);
      const weeklyVal = weeklySeason[i % 7] ?? 0;
      const dailyVal = dailySeason[i % 24] ?? 0;
      const prediction = trendVal + weeklyVal + dailyVal;
      predictions.push(prediction);
      intervals.push([prediction - 1.96 * trend.stdError, prediction + 1.96 * trend.stdError]);
    }
    return {
      predictions, confidence95: intervals,
      components: { trend: this._forecastTrend(trend, history.length + horizon - 1), weekly: weeklySeason, daily: dailySeason },
    };
  }

  private _decomposeTrend(history: TimePoint[]): TrendModel {
    const n = history.length;
    const xMean = n / 2;
    const yMean = history.reduce((s, p) => s + p.value, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (history[i].value - yMean);
      den += (i - xMean) ** 2;
    }
    const slope = den > 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;
    const residuals = history.map((p, i) => p.value - (slope * i + intercept));
    const stdError = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(n - 2, 1));
    return { slope, intercept, stdError };
  }

  private _decomposeSeasonality(history: TimePoint[], period: number): number[] {
    const seasonal = new Array(period).fill(0);
    const counts = new Array(period).fill(0);
    const trend = this._decomposeTrend(history);
    for (let i = 0; i < history.length; i++) {
      const detrended = history[i].value - (trend.slope * i + trend.intercept);
      seasonal[i % period] += detrended;
      counts[i % period]++;
    }
    for (let i = 0; i < period; i++) {
      seasonal[i] = counts[i] > 0 ? seasonal[i] / counts[i] : 0;
    }
    const mean = seasonal.reduce((s, v) => s + v, 0) / period;
    return seasonal.map(v => v - mean);
  }

  private _forecastTrend(trend: TrendModel, t: number): number {
    return trend.slope * t + trend.intercept;
  }
}
