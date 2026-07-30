interface AdaptiveLimits {
  method: string;
  baseLimit: number;
  currentLimit: number;
  violations: number;
  lastViolationAt: number;
}

export class AdaptiveRateLimiter {
  private limits = new Map<string, AdaptiveLimits>();
  private violationDecayMs: number;

  constructor(violationDecayMs: number = 60000) {
    this.violationDecayMs = violationDecayMs;
  }

  isAllowed(method: string): boolean {
    const now = Date.now();
    let limit = this.limits.get(method);
    if (!limit) {
      limit = { method, baseLimit: 100, currentLimit: 100, violations: 0, lastViolationAt: 0 };
      this.limits.set(method, limit);
    }
    if (limit.violations > 0 && (now - limit.lastViolationAt) > this.violationDecayMs) {
      limit.violations = Math.max(0, limit.violations - 1);
      limit.currentLimit = Math.min(limit.baseLimit, limit.currentLimit + 10);
    }
    if (limit.currentLimit <= 0) return false;
    limit.currentLimit--;
    return true;
  }

  reportViolation(method: string): void {
    const limit = this.limits.get(method);
    if (limit) {
      limit.violations++;
      limit.lastViolationAt = Date.now();
      limit.currentLimit = Math.max(5, limit.baseLimit - limit.violations * 10);
    }
  }

  getLimit(method: string): number {
    return this.limits.get(method)?.currentLimit ?? 100;
  }
}
