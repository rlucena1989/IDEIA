import { TrendReport, AggregatedReport, MetricEvent, DORAHistory } from './types';
import { createLogger } from '@ideia/logger';
import { DevXMetricsCollector } from './devx-metrics-collector';
const logger = createLogger('trend-analyzer');

export class TrendAnalyzer {
  private _collector: DevXMetricsCollector;

  constructor(collector: DevXMetricsCollector) {
    this._collector = collector;
  }

  analyzeMetric(metric: string, values: number[]): TrendReport {
    const n = values.length;
    if (n < 3) {
      return { metric, direction: 'stable', slope: 0, predictedNext: values[n - 1] ?? 0, recommendations: [] };
    }
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * ((values[i] ?? 0) - yMean);
      den += (i - xMean) ** 2;
    }
    const slope = den > 0 ? num / den : 0;
    const direction = slope > 0.1 ? 'improving' : slope < -0.1 ? 'declining' : 'stable';
    const predictedNext = (values[n - 1] ?? 0) + slope * 14;
    const recommendations: string[] = [];
    if (direction === 'declining') {
      recommendations.push(`Negative trend detected for ${metric}. Review related processes.`);
      recommendations.push('Consider adjusting quality gates or investigating bottlenecks.');
    }
    return { metric, direction, slope, predictedNext, recommendations };
  }

  async analyzeSprintTrends(sprintHistory: AggregatedReport[]): Promise<TrendReport[]> {
    const reports: TrendReport[] = [];
    const metrics = ['deployFrequency', 'leadTime', 'mttr', 'changeFailureRate', 'cycleTime', 'blockRate', 'reworkRate'] as const;
    for (const metric of metrics) {
      const values = sprintHistory.map(h => (h[metric] as number) ?? 0);
      reports.push(this.analyzeMetric(metric, values));
    }
    return reports;
  }

  async detectDegradation(history: DORAHistory[]): Promise<Array<{
    metric: string;
    slope: number;
    magnitude: number;
    sustainedPeriods: number;
  }>> {
    const signals: Array<{ metric: string; slope: number; magnitude: number; sustainedPeriods: number }> = [];
    if (history.length < 3) return signals;
    const doraMetrics = ['deployFrequency', 'leadTime', 'mttr', 'changeFailureRate'] as const;
    for (const metric of doraMetrics) {
      const values = history.map(h => (h[metric] as number) ?? 0);
      const n = values.length;
      const xMean = (n - 1) / 2;
      const yMean = values.reduce((a, b) => a + b, 0) / n;
      let num = 0;
      let den = 0;
      for (let i = 0; i < n; i++) {
        num += (i - xMean) * ((values[i] ?? 0) - yMean);
        den += (i - xMean) ** 2;
      }
      const slope = den > 0 ? num / den : 0;
      const degraded = metric === 'deployFrequency' ? slope < -0.1 : slope > 0.5;
      if (degraded) {
        const magnitude = Math.abs(slope / (yMean || 1));
        let sustainedPeriods = 0;
        for (let i = values.length - 1; i >= 0; i--) {
          const threshold = yMean;
          if ((metric === 'deployFrequency' ? (values[i] ?? 0) < threshold : (values[i] ?? 0) > threshold)) {
            sustainedPeriods++;
          } else break;
        }
        signals.push({ metric, slope, magnitude, sustainedPeriods });
      }
    }
    return signals;
  }

  async getPrediction(metric: string, history: number[], daysAhead = 14): Promise<{
    predictedValues: number[];
    confidence: number;
  }> {
    const n = history.length;
    if (n < 3) return { predictedValues: history.slice(-1), confidence: 0 };
    const xMean = (n - 1) / 2;
    const yMean = history.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * ((history[i] ?? 0) - yMean);
      den += (i - xMean) ** 2;
    }
    const slope = den > 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;
    const residuals = history.map((y, i) => Math.pow(y - (slope * i + intercept), 2));
    const mse = residuals.reduce((a, b) => a + b, 0) / n;
    const stdErr = Math.sqrt(mse);
    const predictedValues = Array.from({ length: daysAhead }, (_, i) => {
      return slope * (n + i) + intercept;
    });
    const confidence = Math.max(0.1, 1 - stdErr / (yMean || 1));
    return { predictedValues, confidence };
  }
}
