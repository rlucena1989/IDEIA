import { CostRecord, CostSource, Currency, Environment } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('cost-tracker');

export class CostTracker {
  private _records: CostRecord[] = [];
  private _maxRecords: number;

  constructor(maxRecords = 50000) {
    this._maxRecords = maxRecords;
  }

  async record(record: CostRecord): Promise<void> {
    this._records.push(record);
    if (this._records.length > this._maxRecords) {
      this._records = this._records.slice(-this._maxRecords);
    }
  }

  async recordBatch(records: CostRecord[]): Promise<void> {
    for (const r of records) {
      await this.record(r);
    }
  }

  getTotalCost(source?: CostSource, since?: Date): number {
    let filtered = this._records;
    if (source) filtered = filtered.filter(r => r.source === source);
    if (since) filtered = filtered.filter(r => r.timestamp >= since);
    return filtered.reduce((s, r) => s + r.amount, 0);
  }

  getCostBySource(since?: Date): Record<string, number> {
    const bySource: Record<string, number> = {};
    const filtered = since ? this._records.filter(r => r.timestamp >= since) : this._records;
    for (const r of filtered) {
      bySource[r.source] = (bySource[r.source] ?? 0) + r.amount;
    }
    return bySource;
  }

  getCostByProject(since?: Date): Record<string, number> {
    const byProject: Record<string, number> = {};
    const filtered = since ? this._records.filter(r => r.timestamp >= since) : this._records;
    for (const r of filtered) {
      byProject[r.project] = (byProject[r.project] ?? 0) + r.amount;
    }
    return byProject;
  }

  getCostByProvider(since?: Date): Record<string, number> {
    const byProvider: Record<string, number> = {};
    const filtered = since ? this._records.filter(r => r.timestamp >= since) : this._records;
    for (const r of filtered) {
      byProvider[r.provider] = (byProvider[r.provider] ?? 0) + r.amount;
    }
    return byProvider;
  }

  getCostByModel(since?: Date): Record<string, number> {
    const byModel: Record<string, number> = {};
    const filtered = since ? this._records.filter(r => r.timestamp >= since) : this._records;
    for (const r of filtered) {
      const model = r.metadata?.model as string | undefined;
      if (model) {
        byModel[model] = (byModel[model] ?? 0) + r.amount;
      }
    }
    return byModel;
  }

  getDailyTotals(days: number): number[] {
    const totals: number[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const dayRecords = this._records.filter(r => r.timestamp >= dayStart && r.timestamp < dayEnd);
      totals.push(dayRecords.reduce((s, r) => s + r.amount, 0));
    }
    return totals;
  }

  getDailyAverage(days: number): number {
    const totals = this.getDailyTotals(days);
    return totals.length > 0 ? totals.reduce((s, v) => s + v, 0) / totals.length : 0;
  }

  getRecords(limit?: number, offset?: number): CostRecord[] {
    const start = offset ?? 0;
    const end = limit ? start + limit : undefined;
    return this._records.slice(start, end);
  }

  getRecordCount(): number {
    return this._records.length;
  }

  clear(): void {
    this._records = [];
  }
}
