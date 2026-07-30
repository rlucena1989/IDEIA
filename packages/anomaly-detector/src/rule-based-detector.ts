import { DetectionResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('rule-based-detector');

export interface RuleDefinition {
  name: string;
  evaluate: (context: Record<string, number>) => number;
  threshold: number;
}

export class RuleBasedDetector {
  private _rules: RuleDefinition[];

  constructor(rules?: RuleDefinition[]) {
    this._rules = rules ?? [
      {
        name: 'high_frequency',
        evaluate: (ctx) => Math.min(1, (ctx.actionsPerMinute ?? 0) / 100),
        threshold: 0.7,
      },
      {
        name: 'off_hours',
        evaluate: (ctx) => {
          const hour = ctx.hourOfDay ?? 12;
          return (hour < 6 || hour > 22) ? 0.6 : 0;
        },
        threshold: 0.5,
      },
      {
        name: 'high_token_cost',
        evaluate: (ctx) => Math.min(1, (ctx.tokenCost ?? 0) / 5000),
        threshold: 0.8,
      },
      {
        name: 'new_target',
        evaluate: (ctx) => ctx.isNewTarget ?? 0,
        threshold: 0.5,
      },
      {
        name: 'unusual_command_chain',
        evaluate: (ctx) => Math.min(1, (ctx.unusualChainLength ?? 0) / 5),
        threshold: 0.6,
      },
    ];
  }

  detect(context: Record<string, number>): DetectionResult[] {
    return this._rules.map((rule) => {
      const score = rule.evaluate(context);
      return {
        detectorName: `rule:${rule.name}`,
        score,
        threshold: rule.threshold,
        isAnomaly: score > rule.threshold,
        details: { ruleName: rule.name },
      };
    });
  }

  getMaxScore(context: Record<string, number>): number {
    const results = this.detect(context);
    return results.reduce((max, r) => Math.max(max, r.score), 0);
  }

  addRule(rule: RuleDefinition): void {
    this._rules.push(rule);
  }
}
