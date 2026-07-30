export interface TimePoint { date: number; value: number }
export interface TrendModel { slope: number; intercept: number; stdError: number }
export interface ProphetResult { predictions: number[]; confidence95: number[][]; components: { trend: number; weekly: number[]; daily: number[] } }

export class ProphetForecaster {
  async forecast(history: TimePoint[], horizon: number): Promise<ProphetResult> {
    const trend = this.decomposeTrend(history);
    const weeklySeason = this.decomposeSeasonality(history, 7);
    const dailySeason = this.decomposeSeasonality(history, 24);

    const predictions: number[] = [];
    const intervals: number[][] = [];

    for (let i = 0; i < horizon; i++) {
      const t = history.length + i;
      const trendVal = trend.slope * t + trend.intercept;
      const weeklyVal = weeklySeason[i % 7] ?? 0;
      const dailyVal = dailySeason[i % 24] ?? 0;
      const prediction = trendVal + weeklyVal + dailyVal;
      predictions.push(prediction);
      intervals.push([prediction - 1.96 * trend.stdError, prediction + 1.96 * trend.stdError]);
    }

    return {
      predictions,
      confidence95: intervals,
      components: { trend: trend.slope * (history.length + horizon - 1) + trend.intercept, weekly: weeklySeason, daily: dailySeason },
    };
  }

  private decomposeTrend(history: TimePoint[]): TrendModel {
    const n = history.length;
    const xMean = n / 2;
    const yMean = history.reduce((s, p) => s + p.value, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (history[i].value - yMean);
      den += (i - xMean) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = yMean - slope * xMean;
    const residuals = history.map((p, i) => p.value - (slope * i + intercept));
    const stdError = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / (n - 2 || 1));
    return { slope, intercept, stdError };
  }

  private decomposeSeasonality(history: TimePoint[], period: number): number[] {
    const seasonal = new Array(period).fill(0);
    const counts = new Array(period).fill(0);
    const trend = this.decomposeTrend(history);
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
}
