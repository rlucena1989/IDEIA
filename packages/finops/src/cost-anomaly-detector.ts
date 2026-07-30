import { CostRecord, CostAnomaly, AnomalySeverity } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('cost-anomaly-detector');

export class CostAnomalyDetector {
  private _sensitivity: number;
  private _baselinePeriods: number;
  private _anomalyHistory: CostAnomaly[] = [];

  constructor(sensitivity = 2, baselinePeriods = 15) {
    this._sensitivity = sensitivity;
    this._baselinePeriods = baselinePeriods;
  }

  setSensitivity(s: number): void { this._sensitivity = s; }

  detect(records: CostRecord[]): CostAnomaly[] {
    const anomalies: CostAnomaly[] = [];
    const bySource = this._groupBySource(records);
    for (const [source, sourceRecords] of bySource) {
      const sourceAnomalies = this._detectSourceAnomalies(source, sourceRecords);
      anomalies.push(...sourceAnomalies);
    }
    const aggregated = this._detectAggregatedAnomaly(records);
    if (aggregated) anomalies.push(aggregated);
    this._anomalyHistory.push(...anomalies);
    return anomalies;
  }

  detectRealtime(record: CostRecord, recentRecords: CostRecord[]): CostAnomaly | null {
    const sourceRecords = recentRecords.filter(r => r.source === record.source);
    const mean = sourceRecords.reduce((s, r) => s + r.amount, 0) / Math.max(1, sourceRecords.length);
    const variance = sourceRecords.reduce((s, r) => s + (r.amount - mean) ** 2, 0) / Math.max(1, sourceRecords.length);
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return null;
    const deviation = (record.amount - mean) / stdDev;
    if (Math.abs(deviation) > this._sensitivity) {
      const anomaly: CostAnomaly = {
        id: `anomaly-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        source: record.source,
        expectedCost: mean,
        actualCost: record.amount,
        deviation: deviation,
        severity: Math.abs(deviation) > this._sensitivity * 1.5 ? 'critical' : 'high',
        detectedAt: new Date(),
        possibleCauses: ['Usage spike', 'Configuration change', 'Bug or retry loop', 'New deployment'],
        recommendedAction: 'Investigate recent changes and active sessions',
      };
      this._anomalyHistory.push(anomaly);
      return anomaly;
    }
    return null;
  }

  getAnomalyHistory(limit?: number): CostAnomaly[] {
    const sorted = [...this._anomalyHistory].sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  getAnomalyRate(records: CostRecord[]): number {
    if (records.length === 0) return 0;
    return this._anomalyHistory.length / records.length;
  }

  reset(): void {
    this._anomalyHistory = [];
  }

  private _groupBySource(records: CostRecord[]): Map<string, CostRecord[]> {
    const groups = new Map<string, CostRecord[]>();
    for (const r of records) {
      const list = groups.get(r.source) ?? [];
      list.push(r);
      groups.set(r.source, list);
    }
    return groups;
  }

  private _detectSourceAnomalies(source: string, records: CostRecord[]): CostAnomaly[] {
    if (records.length < this._baselinePeriods) return [];
    const baseline = records.slice(0, this._baselinePeriods);
    const mean = baseline.reduce((s, r) => s + r.amount, 0) / baseline.length;
    const variance = baseline.reduce((s, r) => s + (r.amount - mean) ** 2, 0) / baseline.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return [];
    const anomalies: CostAnomaly[] = [];
    const recent = records.slice(this._baselinePeriods);
    for (const r of recent) {
      const deviation = (r.amount - mean) / stdDev;
      if (Math.abs(deviation) > this._sensitivity) {
        anomalies.push({
          id: `anomaly-${source}-${r.timestamp.getTime()}`,
          source,
          expectedCost: mean,
          actualCost: r.amount,
          deviation,
          severity: Math.abs(deviation) > this._sensitivity * 1.5 ? 'critical' : 'high',
          detectedAt: r.timestamp,
          possibleCauses: ['Usage spike', 'Configuration change'],
          recommendedAction: `Investigate ${source} cost spike from $${mean.toFixed(2)} to $${r.amount.toFixed(2)}`,
        });
      }
    }
    return anomalies;
  }

  private _detectAggregatedAnomaly(records: CostRecord[]): CostAnomaly | null {
    if (records.length < this._baselinePeriods * 2) return null;
    const dailyTotals = this._computeDailyTotals(records);
    if (dailyTotals.length < 5) return null;
    const mean = dailyTotals.reduce((s, v) => s + v, 0) / dailyTotals.length;
    const variance = dailyTotals.reduce((s, v) => s + (v - mean) ** 2, 0) / dailyTotals.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return null;
    const latest = dailyTotals[dailyTotals.length - 1] ?? 0;
    const deviation = (latest - mean) / stdDev;
    if (Math.abs(deviation) > this._sensitivity) {
      return {
        id: `anomaly-aggr-${Date.now()}`,
        source: 'aggregated',
        expectedCost: mean,
        actualCost: latest,
        deviation,
        severity: Math.abs(deviation) > this._sensitivity * 1.5 ? 'critical' : 'high',
        detectedAt: new Date(),
        possibleCauses: ['System-wide usage increase', 'Deployment impact', 'Seasonal pattern'],
        recommendedAction: 'Check system-wide metrics and recent deployments',
      };
    }
    return null;
  }

  private _computeDailyTotals(records: CostRecord[]): number[] {
    const totals: number[] = [];
    const byDay = new Map<string, number>();
    for (const r of records) {
      const dayKey = r.timestamp.toISOString().slice(0, 10);
      byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + r.amount);
    }
    const sorted = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([, v]) => v);
  }
}
