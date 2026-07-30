import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { BudgetAllocation, BudgetReport, CostEntry } from './types';
export class EconomicControl {
  private allocations: Map<string, BudgetAllocation> = new Map();
  private costs: CostEntry[] = [];
  allocate(category: string, limit: number, currency = 'USD'): void {
    this.allocations.set(category, { category, limit, spent: 0, currency }); }
  recordCost(category: string, amount: number, description: string, agent?: string): CostEntry | null {
    const alloc = this.allocations.get(category);
    if (!alloc) return null;
    alloc.spent += amount;
    const entry: CostEntry = { id: randomUUID(), timestamp: new Date().toISOString(), category, amount, description, agent };
    this.costs.push(entry);
    return entry;
  }
  canSpend(category: string, amount: number): boolean {
    const alloc = this.allocations.get(category);
    return alloc ? (alloc.spent + amount) <= alloc.limit : false;
  }
  getReport(): BudgetReport {
    let totalBudget = 0, totalSpent = 0;
    const byCategory: Record<string, { limit: number; spent: number; remaining: number }> = {};
    const overBudget: string[] = [];
    for (const [cat, alloc] of this.allocations) {
      totalBudget += alloc.limit; totalSpent += alloc.spent;
      const remaining = alloc.limit - alloc.spent;
      byCategory[cat] = { limit: alloc.limit, spent: alloc.spent, remaining };
      if (remaining < 0) overBudget.push(cat);
    }
    return { totalBudget, totalSpent, remaining: totalBudget - totalSpent, byCategory, overBudget };
  }
  getCostHistory(category?: string): CostEntry[] {
    return category ? this.costs.filter(c => c.category === category) : [...this.costs];
  }
  reset(category?: string): void {
    if (category) { const a = this.allocations.get(category); if (a) a.spent = 0; }
    else { this.allocations.forEach(a => a.spent = 0); this.costs = []; }
  }
}
export function createEconomicControl(): EconomicControl { return new EconomicControl(); }
