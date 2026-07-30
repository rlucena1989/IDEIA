export interface RetentionRule {
  id: string;
  domain: string;
  maxAgeDays: number;
  action: 'archive' | 'purge' | 'anonymize';
  priority: number;
  exemptPatterns?: RegExp[];
}

export class DataRetentionManager {
  private rules: RetentionRule[];
  private purgeLog: Array<{ ruleId: string; recordsPurged: number; timestamp: string }> = [];

  constructor(rules: RetentionRule[]) {
    this.rules = rules.sort((a, b) => b.priority - a.priority);
  }

  addRule(rule: RetentionRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  getRules(): RetentionRule[] {
    return [...this.rules];
  }

  getApplicableRule(domain: string, recordData?: Record<string, unknown>): RetentionRule | undefined {
    for (const rule of this.rules) {
      if (this.matchesDomain(rule.domain, domain)) {
        if (rule.exemptPatterns && recordData) {
          const dataStr = JSON.stringify(recordData);
          const isExempt = rule.exemptPatterns.some(p => p.test(dataStr));
          if (isExempt) continue;
        }
        return rule;
      }
    }
    return undefined;
  }

  calculatePurgeDate(domain: string, createdAt: Date): Date | null {
    const rule = this.getApplicableRule(domain);
    if (!rule) return null;
    const purgeDate = new Date(createdAt);
    purgeDate.setDate(purgeDate.getDate() + rule.maxAgeDays);
    return purgeDate;
  }

  logPurge(ruleId: string, recordsPurged: number): void {
    this.purgeLog.push({ ruleId, recordsPurged, timestamp: new Date().toISOString() });
  }

  getPurgeHistory(): Array<{ ruleId: string; recordsPurged: number; timestamp: string }> {
    return [...this.purgeLog];
  }

  private matchesDomain(pattern: string, domain: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('*')) {
      return domain.startsWith(pattern.slice(0, -1));
    }
    return pattern === domain;
  }
}
