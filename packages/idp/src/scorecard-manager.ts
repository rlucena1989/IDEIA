import { ScorecardResult, ScorecardCheck, ScorecardSnapshot, ScorecardGrade, GateRule, GateResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('scorecard-manager');

export class ScorecardManager {
  private _snapshots: ScorecardSnapshot[] = [];
  private _rules: GateRule[] = [
    { category: 'quality', minScore: 70, weight: 30, blocking: true },
    { category: 'docs', minScore: 50, weight: 15, blocking: false },
    { category: 'reliability', minScore: 60, weight: 20, blocking: true },
    { category: 'observability', minScore: 40, weight: 10, blocking: false },
    { category: 'governance', minScore: 50, weight: 10, blocking: false },
    { category: 'security', minScore: 80, weight: 15, blocking: true },
  ];

  async compute(service: string): Promise<ScorecardResult> {
    const checks = await this._gatherChecks(service);
    const maxScore = checks.reduce((s, c) => s + c.weight, 0);
    const score = checks.filter(c => c.passed).reduce((s, c) => s + c.weight, 0);
    const grade = this._calculateGrade(score, maxScore);
    const result: ScorecardResult = { service, score, maxScore, grade, checks, timestamp: Date.now() };
    const snapshot: ScorecardSnapshot = { service, score, maxScore, grade, timestamp: Date.now(), checks };
    this._snapshots.push(snapshot);
    return result;
  }

  async categoryBreakdown(service: string): Promise<Map<string, { score: number; max: number }>> {
    const result = await this.compute(service);
    const breakdown = new Map<string, { score: number; max: number }>();
    for (const check of result.checks) {
      const current = breakdown.get(check.category) ?? { score: 0, max: 0 };
      current.max += check.weight;
      if (check.passed) current.score += check.weight;
      breakdown.set(check.category, current);
    }
    return breakdown;
  }

  async evaluateGate(service: string): Promise<GateResult> {
    const breakdown = await this.categoryBreakdown(service);
    const result = await this.compute(service);
    const failures: string[] = [];
    let totalScore = 0;
    let totalWeight = 0;
    for (const rule of this._rules) {
      const data = breakdown.get(rule.category);
      if (!data) {
        if (rule.blocking) failures.push(`Missing category: ${rule.category}`);
        continue;
      }
      const pct = data.max > 0 ? (data.score / data.max) * 100 : 0;
      totalScore += pct * rule.weight;
      totalWeight += rule.weight;
      if (pct < rule.minScore) {
        const msg = `${rule.category}: ${Math.round(pct)}% < ${rule.minScore}%`;
        if (rule.blocking) failures.push(msg);
      }
    }
    const composite = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    const passed = failures.length === 0;
    return {
      service,
      composite,
      grade: result.grade,
      passed,
      failures,
      breakdown: Object.fromEntries(breakdown),
      timestamp: Date.now(),
    };
  }

  getHistory(service: string, limit = 20): ScorecardSnapshot[] {
    return this._snapshots
      .filter(s => s.service === service)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getLatest(service: string): ScorecardSnapshot | undefined {
    return this._snapshots
      .filter(s => s.service === service)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  async getTrend(service: string): Promise<{ current: number; previous: number; change: number; direction: 'up' | 'down' | 'stable' }> {
    const snapshots = this.getHistory(service, 2);
    if (snapshots.length < 2) {
      return { current: 0, previous: 0, change: 0, direction: 'stable' };
    }
    const current = snapshots[0].score;
    const previous = snapshots[1].score;
    const change = current - previous;
    const direction = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
    return { current, previous, change, direction };
  }

  getRules(): GateRule[] {
    return [...this._rules];
  }

  updateRule(category: string, updates: Partial<GateRule>): void {
    const idx = this._rules.findIndex(r => r.category === category);
    if (idx >= 0) {
      this._rules[idx] = { ...this._rules[idx], ...updates };
    }
  }

  clear(): void {
    this._snapshots = [];
  }

  private async _gatherChecks(_service: string): Promise<ScorecardCheck[]> {
    return [
      { name: 'Has Tests', passed: true, weight: 15, category: 'quality' },
      { name: 'Coverage > 80%', passed: true, weight: 10, category: 'quality' },
      { name: 'Has Documentation', passed: true, weight: 10, category: 'docs' },
      { name: 'API Documented', passed: true, weight: 10, category: 'docs' },
      { name: 'CI Passing', passed: true, weight: 15, category: 'reliability' },
      { name: 'Monitoring Active', passed: true, weight: 10, category: 'observability' },
      { name: 'Has Alerts', passed: true, weight: 5, category: 'observability' },
      { name: 'Has Owner', passed: true, weight: 5, category: 'governance' },
      { name: 'Dependencies Updated', passed: true, weight: 10, category: 'security' },
      { name: 'No Critical CVEs', passed: true, weight: 10, category: 'security' },
    ];
  }

  private _calculateGrade(score: number, max: number): ScorecardGrade {
    const pct = max > 0 ? (score / max) * 100 : 0;
    if (pct >= 90) return 'A';
    if (pct >= 75) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 25) return 'D';
    return 'F';
  }
}
