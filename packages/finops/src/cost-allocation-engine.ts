import { CostRecord, CostAllocationRule, CostSource, ShowbackReport } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('cost-allocation-engine');

export class CostAllocationEngine {
  private _rules: CostAllocationRule[] = [];

  addRule(rule: CostAllocationRule): void {
    this._rules.push(rule);
  }

  removeRule(ruleId: string): boolean {
    const idx = this._rules.findIndex(r => r.id === ruleId);
    if (idx >= 0) {
      this._rules.splice(idx, 1);
      return true;
    }
    return false;
  }

  getRules(): CostAllocationRule[] {
    return [...this._rules];
  }

  getRulesForProject(project: string): CostAllocationRule[] {
    return this._rules.filter(r => r.project === project);
  }

  allocateCost(records: CostRecord[]): Map<string, CostRecord[]> {
    const allocated = new Map<string, CostRecord[]>();
    for (const record of records) {
      const matchedRules = this._rules.filter(r =>
        r.source === record.source && r.provider === record.provider,
      );
      if (matchedRules.length > 0) {
        for (const rule of matchedRules) {
          if (this._matchesConditions(record, rule.conditions)) {
            const allocatedAmount = record.amount * (rule.percentage / 100);
            const allocatedRecord: CostRecord = {
              ...record,
              amount: allocatedAmount,
              project: rule.project,
            };
            const list = allocated.get(rule.project) ?? [];
            list.push(allocatedRecord);
            allocated.set(rule.project, list);
          }
        }
      } else {
        const list = allocated.get(record.project) ?? [];
        list.push(record);
        allocated.set(record.project, list);
      }
    }
    return allocated;
  }

  async generateShowbackReport(records: CostRecord[], period: string): Promise<ShowbackReport> {
    const allocated = this.allocateCost(records);
    const projects = Array.from(allocated.entries()).map(([project, projectRecords]) => {
      const bySource: Record<string, number> = {};
      const byProvider: Record<string, number> = {};
      let totalCost = 0;
      for (const r of projectRecords) {
        totalCost += r.amount;
        bySource[r.source] = (bySource[r.source] ?? 0) + r.amount;
        byProvider[r.provider] = (byProvider[r.provider] ?? 0) + r.amount;
      }
      return {
        project,
        totalCost,
        bySource,
        byProvider,
        trend: 0,
        budgetUtilization: 0,
      };
    });
    const totalCost = projects.reduce((s, p) => s + p.totalCost, 0);
    return {
      period,
      generatedAt: new Date(),
      projects,
      totalCost,
      savings: totalCost * 0.1,
    };
  }

  getUnallocatedCosts(records: CostRecord[]): CostRecord[] {
    const allocatedProjectKeys = new Set(this._rules.map(r => `${r.source}:${r.provider}:${r.project}`));
    return records.filter(r => {
      const key = `${r.source}:${r.provider}:${r.project}`;
      return !allocatedProjectKeys.has(key);
    });
  }

  clearRules(): void {
    this._rules = [];
  }

  private _matchesConditions(record: CostRecord, conditions: Array<{ field: string; operator: string; value: string }>): boolean {
    for (const cond of conditions) {
      const recordValue = (record as unknown as Record<string, unknown>)[cond.field];
      if (recordValue === undefined) return false;
      const strValue = String(recordValue);
      switch (cond.operator) {
        case 'eq': if (strValue !== cond.value) return false; break;
        case 'neq': if (strValue === cond.value) return false; break;
        case 'contains': if (!strValue.includes(cond.value)) return false; break;
        case 'startsWith': if (!strValue.startsWith(cond.value)) return false; break;
        default: return false;
      }
    }
    return true;
  }
}
