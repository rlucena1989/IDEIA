import { Task, PrioritizedTask, PriorityStrategy } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('priority');

export class PriorityEngine {
  prioritize(tasks: Task[], strategy: PriorityStrategy): PrioritizedTask[] {
    switch (strategy) {
      case 'moscow': return this.moscow(tasks);
      case 'eisenhower': return this.eisenhower(tasks);
      case 'wsjf': return this.wsjf(tasks);
      case 'risk-adjusted': return this.riskAdjusted(tasks);
      default: return this.moscow(tasks);
    }
  }

  private moscow(tasks: Task[]): PrioritizedTask[] {
    return tasks.map(t => {
      const score = t.impact * 0.5 + t.urgency * 0.3 - t.effort * 0.2;
      let priority: PrioritizedTask['priority'] = 'could';
      if (score >= 0.8) priority = 'must';
      else if (score >= 0.6) priority = 'should';
      else if (score >= 0.3) priority = 'could';
      else priority = 'wont';
      return { task: t, score, priority, rationale: `Impact=${t.impact}, Urgency=${t.urgency}, Effort=${t.effort}` };
    }).sort((a, b) => b.score - a.score);
  }

  private eisenhower(tasks: Task[]): PrioritizedTask[] {
    const label = (u: number, i: number): PrioritizedTask['priority'] => {
      if (u >= 0.6 && i >= 0.6) return 'must';
      if (u >= 0.6) return 'should';
      if (i >= 0.6) return 'could';
      return 'wont';
    };
    return tasks.map(t => {
      const score = t.urgency * 0.5 + t.impact * 0.5;
      return { task: t, score, priority: label(t.urgency, t.impact), rationale: `Urgency=${t.urgency}, Impact=${t.impact}` };
    }).sort((a, b) => b.score - a.score);
  }

  private wsjf(tasks: Task[]): PrioritizedTask[] {
    return tasks.map(t => {
      const value = t.impact * 0.6 + t.urgency * 0.4;
      const duration = Math.max(0.1, t.effort);
      const score = value / duration;
      let priority: PrioritizedTask['priority'] = 'could';
      if (score >= 2) priority = 'must';
      else if (score >= 1) priority = 'should';
      else if (score >= 0.5) priority = 'could';
      else priority = 'wont';
      return { task: t, score, priority, rationale: `Value=${value.toFixed(2)}, Duration=${duration.toFixed(2)}, WSJF=${score.toFixed(2)}` };
    }).sort((a, b) => b.score - a.score);
  }

  private riskAdjusted(tasks: Task[]): PrioritizedTask[] {
    return tasks.map(t => {
      const score = t.impact * 0.35 + t.urgency * 0.25 + t.riskScore * 0.2 + (1 - t.effort) * 0.2;
      let priority: PrioritizedTask['priority'] = 'could';
      if (score >= 0.7) priority = 'must';
      else if (score >= 0.5) priority = 'should';
      else if (score >= 0.3) priority = 'could';
      else priority = 'wont';
      return { task: t, score, priority, rationale: `Risk-adjusted score=${score.toFixed(2)}` };
    }).sort((a, b) => b.score - a.score);
  }
}

export function createPriorityEngine(): PriorityEngine {
  return new PriorityEngine();
}
