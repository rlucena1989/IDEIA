import { Goal, PlanningContext } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('cold-start-handler');

export class ColdStartHandler {
  private _coldStartThreshold = 10;

  isColdStart(context: PlanningContext): boolean {
    return context.historyLength < this._coldStartThreshold;
  }

  handle(goal: Goal, _context: PlanningContext): { depth: 'shallow'; reason: string } {
    return {
      depth: 'shallow',
      reason: `Cold start mode: collecting historical data for future decisions`,
    };
  }

  getThreshold(): number { return this._coldStartThreshold; }

  setThreshold(value: number): void { this._coldStartThreshold = value; }

  estimateRequiredSamples(goal: Goal): number {
    const baseSamples = this._coldStartThreshold;
    const complexityMultiplier = 1 + goal.complexity * 0.5;
    return Math.ceil(baseSamples * complexityMultiplier);
  }
}
