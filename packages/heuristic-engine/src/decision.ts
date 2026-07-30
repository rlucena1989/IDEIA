import { FuzzyRule, ExpertRule, DecisionOption, DecisionResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('decision');

export class DecisionEngine {
  private fuzzyRules: FuzzyRule[] = [];
  private expertRules: ExpertRule[] = [];

  addFuzzyRule(rule: FuzzyRule): void {
    this.fuzzyRules.push(rule);
  }

  addExpertRule(rule: ExpertRule): void {
    this.expertRules.push(rule);
  }

  classifyRisk(impact: number, probability: number): 'low' | 'medium' | 'high' | 'critical' {
    const impactHigh = impact >= 0.7;
    const impactMedium = impact >= 0.3 && impact < 0.7;
    const probHigh = probability >= 0.6;
    const probMedium = probability >= 0.2 && probability < 0.6;

    if (impactHigh && probHigh) return 'critical';
    if (impactHigh && probMedium) return 'high';
    if (impactMedium && probHigh) return 'high';
    if (impact <= 0.3 && probability < 0.2) return 'low';
    return 'medium';
  }

  evaluateFuzzy(input: Record<string, number>): string[] {
    const results: string[] = [];
    for (const rule of this.fuzzyRules) {
      const matches = Object.entries(rule.condition).every(([key, range]) => {
        const value = input[key];
        if (value === undefined) return false;
        if (range.min !== undefined && value < range.min) return false;
        if (range.max !== undefined && value > range.max) return false;
        return true;
      });
      if (matches) results.push(rule.output);
    }
    return results;
  }

  evaluateExpert(context: Record<string, string | number | boolean>): string[] {
    const actions: string[] = [];
    for (const rule of this.expertRules) {
      const matches = this.evaluateCondition(rule.condition, context);
      if (matches) actions.push(...rule.actions);
    }
    return actions;
  }

  decide<T>(options: DecisionOption<T>[]): DecisionResult<T> {
    if (options.length === 0) throw new Error('No options to decide from');

    const sorted = [...options].sort((a, b) => b.score - a.score);
    const best = sorted[0];
    const totalScore = sorted.reduce((s, o) => s + o.score, 0);
    const confidence = totalScore > 0 ? best.score / totalScore : 0;

    return {
      selected: best,
      alternatives: sorted.slice(1),
      confidence: Math.min(1, confidence * options.length),
      rationale: `Selected "${best.label}" (score=${best.score.toFixed(2)}) based on scoring model. Confidence=${(confidence * 100).toFixed(0)}%`,
    };
  }

  setFuzzyRules(rules: FuzzyRule[]): void {
    this.fuzzyRules = [...rules];
  }

  setExpertRules(rules: ExpertRule[]): void {
    this.expertRules = [...rules];
  }

  private evaluateCondition(condition: string, context: Record<string, string | number | boolean>): boolean {
    const parts = condition.split(/\s+(?:AND|OR)\s+/);
    if (parts.length === 0) return false
    const ops = condition.match(/\b(AND|OR)\b/g) || [];
    const results = parts.map(p => this.evaluateAtomic(p, context));
    let result = results[0] ?? false;
    for (let i = 0; i < ops.length; i++) {
      const next = results[i + 1] ?? false;
      if (ops[i] === 'AND') result = result && next;
      else result = result || next;
    }
    return result;
  }

  private evaluateAtomic(expr: string, context: Record<string, string | number | boolean>): boolean {
    expr = expr.trim();
    const matchEq = expr.match(/^(\w+)\s*=\s*(.+)$/);
    if (matchEq) {
      const key = matchEq[1];
      const val = matchEq[2].replace(/^["']|["']$/g, '');
      const ctxVal = context[key];
      if (typeof ctxVal === 'number') return ctxVal === parseFloat(val);
      return ctxVal === val;
    }
    const matchGt = expr.match(/^(\w+)\s*>\s*([\d.]+)$/);
    if (matchGt) {
      return (context[matchGt[1]] as number) > parseFloat(matchGt[2]);
    }
    const matchLt = expr.match(/^(\w+)\s*<\s*([\d.]+)$/);
    if (matchLt) {
      return (context[matchLt[1]] as number) < parseFloat(matchLt[2]);
    }
    const matchNeq = expr.match(/^(\w+)\s*!=\s*(.+)$/);
    if (matchNeq) {
      const val = matchNeq[2].replace(/^["']|["']$/g, '');
      return context[matchNeq[1]] !== val;
    }
    return false;
  }
}

export function createDecisionEngine(): DecisionEngine {
  return new DecisionEngine();
}
