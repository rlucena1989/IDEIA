export type AlertLevel = 'ok' | 'warning' | 'critical' | 'exhausted';

export type AlertTrigger = 'warning' | 'critical' | 'exhausted';

export interface BudgetAlert {
  name: string;
  level: AlertTrigger;
  budgetRemaining: number;
  message: string;
  timestamp: number;
}

interface BudgetPeriod {
  totalRequests: number;
  failedRequests: number;
  startTime: number;
}

export class ErrorBudget {
  private slo: number;
  private periodDays: number;
  private name: string;
  private period: BudgetPeriod;
  private alertCallbacks: Array<(alert: BudgetAlert) => void> = [];
  private lastAlertLevel: AlertLevel = 'ok';

  constructor(name: string, slo: number, periodDays: number) {
    if (slo <= 0 || slo >= 1) throw new Error('SLO must be between 0 and 1 (exclusive)');
    if (periodDays <= 0) throw new Error('periodDays must be positive');
    this.name = name;
    this.slo = slo;
    this.periodDays = periodDays;
    this.period = this.newPeriod();
  }

  recordSuccess(): void {
    this.checkReset();
    this.period.totalRequests++;
  }

  recordFailure(): void {
    this.checkReset();
    this.period.totalRequests++;
    this.period.failedRequests++;
    this.checkAlert();
  }

  getBudget(): number {
    this.checkReset();
    if (this.period.totalRequests === 0) return 100;
    const errorBudget = 1 - this.slo;
    const currentErrorRate = this.period.failedRequests / this.period.totalRequests;
    const consumed = currentErrorRate / errorBudget;
    return Math.max(0, Math.round((1 - consumed) * 10000) / 100);
  }

  getBurnRate(windowHours: number): number {
    this.checkReset();
    const windowMs = windowHours * 60 * 60 * 1000;
    const elapsed = Date.now() - this.period.startTime;
    const _windowStart = Math.max(this.period.startTime, Date.now() - windowMs);
    const windowRatio = Math.min(1, windowMs / Math.max(elapsed, 1));

    if (this.period.totalRequests === 0) return 0;
    const errorRate = this.period.failedRequests / this.period.totalRequests;
    const allowedErrorRate = 1 - this.slo;
    return allowedErrorRate > 0
      ? Math.round((errorRate / allowedErrorRate) * windowRatio * 100) / 100
      : 0;
  }

  isExhausted(): boolean {
    return this.getBudget() <= 0;
  }

  getAlertLevel(): AlertLevel {
    const budget = this.getBudget();
    if (budget <= 0) return 'exhausted';
    if (budget <= 20) return 'critical';
    if (budget <= 50) return 'warning';
    return 'ok';
  }

  reset(): void {
    this.period = this.newPeriod();
    this.lastAlertLevel = 'ok';
  }

  onBudgetAlert(callback: (alert: BudgetAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  private checkReset(): void {
    const elapsed = Date.now() - this.period.startTime;
    const periodMs = this.periodDays * 24 * 60 * 60 * 1000;
    if (elapsed >= periodMs) {
      this.reset();
    }
  }

  private checkAlert(): void {
    const level = this.getAlertLevel();
    if (level === this.lastAlertLevel) return;
    this.lastAlertLevel = level;

    const triggerMap: Record<AlertLevel, AlertTrigger | null> = {
      ok: null,
      warning: 'warning',
      critical: 'critical',
      exhausted: 'exhausted',
    };

    const trigger = triggerMap[level];
    if (!trigger) return;

    const alert: BudgetAlert = {
      name: this.name,
      level: trigger,
      budgetRemaining: this.getBudget(),
      message: `Error budget "${this.name}" is ${trigger}: ${this.getBudget()}% remaining`,
      timestamp: Date.now(),
    };

    for (const cb of this.alertCallbacks) {
      try { cb(alert); } catch { }
    }
  }

  private newPeriod(): BudgetPeriod {
    return { totalRequests: 0, failedRequests: 0, startTime: Date.now() };
  }
}

export class ErrorBudgetManager {
  private budgets: Map<string, ErrorBudget> = new Map();
  private alertCallbacks: Array<(alert: BudgetAlert) => void> = [];

  registerBudget(name: string, slo: number, periodDays: number): ErrorBudget {
    if (this.budgets.has(name)) throw new Error(`Budget "${name}" already registered`);
    const budget = new ErrorBudget(name, slo, periodDays);
    budget.onBudgetAlert((alert) => {
      for (const cb of this.alertCallbacks) {
        try { cb(alert); } catch { }
      }
    });
    this.budgets.set(name, budget);
    return budget;
  }

  getBudget(name: string): ErrorBudget | undefined {
    return this.budgets.get(name);
  }

  getAllBudgets(): Array<{ name: string; budget: number; alertLevel: AlertLevel; isExhausted: boolean }> {
    const result: Array<{ name: string; budget: number; alertLevel: AlertLevel; isExhausted: boolean }> = [];
    for (const [name, b] of this.budgets) {
      result.push({
        name,
        budget: b.getBudget(),
        alertLevel: b.getAlertLevel(),
        isExhausted: b.isExhausted(),
      });
    }
    return result;
  }

  checkBurnRate(windowHours: number): Array<{ name: string; burnRate: number; alertLevel: AlertLevel }> {
    const result: Array<{ name: string; burnRate: number; alertLevel: AlertLevel }> = [];
    for (const [name, b] of this.budgets) {
      result.push({
        name,
        burnRate: b.getBurnRate(windowHours),
        alertLevel: b.getAlertLevel(),
      });
    }
    return result;
  }

  onBudgetAlert(callback: (alert: BudgetAlert) => void): void {
    this.alertCallbacks.push(callback);
  }
}
