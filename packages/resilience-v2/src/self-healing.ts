import { Emitter, Disposable } from '@ideia/core-contributions';
import { SelfHealingPolicy, SelfHealingEngine, HealingAction, HealingActionResult } from './types';

export class DefaultSelfHealingEngine implements SelfHealingEngine {
  private policies: SelfHealingPolicy[] = [];
  private actionHistory: HealingActionResult[] = [];

  registerPolicy(policy: SelfHealingPolicy): Disposable {
    this.policies.push(policy);
    return { dispose: () => this.unregisterPolicy(policy.id) };
  }

  async triggerCheck(): Promise<HealingActionResult[]> {
    const results: HealingActionResult[] = [];
    for (const policy of this.policies) {
      const actions = policy.actions.map(action => this.executeAction(policy.id, action));
      results.push(...await Promise.all(actions));
    }
    return results;
  }

  getActions(): HealingActionResult[] {
    return [...this.actionHistory];
  }

  private async executeAction(policyId: string, action: HealingAction): Promise<HealingActionResult> {
    const result: HealingActionResult = {
      policyId,
      action,
      status: 'executing',
      startedAt: new Date(),
    };

    try {
      switch (action.type) {
        case 'restart':
          break;
        case 'reconnect':
          break;
        case 'clear_cache':
          break;
        case 'rollback':
          break;
        case 'notify':
          break;
      }
      result.status = 'completed';
      result.completedAt = new Date();
    } catch (err) {
      result.status = 'failed';
      result.error = (err as Error).message;
    }

    this.actionHistory.push(result);
    return result;
  }

  private unregisterPolicy(id: string): void {
    this.policies = this.policies.filter(p => p.id !== id);
  }
}

export class DefaultErrorBudgetCalculator {
  private budgets = new Map<string, { total: number; consumed: number; resetPeriod: string; lastReset: Date }>();

  getBudget(service: string): { service: string; totalBudget: number; consumed: number; remaining: number; resetPeriod: string; lastReset: Date } {
    const budget = this.budgets.get(service) || { total: 1000, consumed: 0, resetPeriod: '24h', lastReset: new Date() };
    return { service, totalBudget: budget.total, consumed: budget.consumed, remaining: budget.total - budget.consumed, resetPeriod: budget.resetPeriod, lastReset: budget.lastReset };
  }

  consume(service: string, amount: number): void {
    const budget = this.budgets.get(service) || { total: 1000, consumed: 0, resetPeriod: '24h', lastReset: new Date() };
    budget.consumed += amount;
    this.budgets.set(service, budget);
  }

  isExhausted(service: string): boolean {
    const budget = this.budgets.get(service);
    return budget ? budget.consumed >= budget.total : false;
  }

  resetAll(): void {
    for (const [key, budget] of this.budgets) {
      budget.consumed = 0;
      budget.lastReset = new Date();
    }
  }
}

export class DefaultGracefulShutdown {
  private services = new Map<string, () => Promise<void>>();

  register(service: string, shutdownFn: () => Promise<void>): Disposable {
    this.services.set(service, shutdownFn);
    return { dispose: () => this.services.delete(service) };
  }

  async shutdownAll(timeout = 30000): Promise<void> {
    const results = await Promise.allSettled(
      Array.from(this.services.entries()).map(([name, fn]) =>
        fn().then(() => name)
      )
    );
    const completedServices: string[] = [];
    const failedServices: string[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') completedServices.push(result.value);
      else failedServices.push('unknown');
    }
  }

  getStatus(): { inProgress: boolean; completedServices: string[]; pendingServices: string[]; failedServices: string[] } {
    return { inProgress: false, completedServices: [], pendingServices: [], failedServices: [] };
  }
}
