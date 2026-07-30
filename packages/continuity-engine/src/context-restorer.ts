import { StoredDecision, DecisionStore } from './decision-store';
import { createLogger } from '@ideia/logger';
const logger = createLogger('context-restorer');

export interface RestoredContext {
  summary: string;
  lastDecision: StoredDecision | null;
  recentDecisions: StoredDecision[];
  hasPendingOutcomes: boolean;
}

export class ContextRestorer {
  private decisionStore: DecisionStore;

  constructor(decisionStore: DecisionStore) {
    this.decisionStore = decisionStore;
  }

  restore(): RestoredContext {
    const recent = this.decisionStore.getRecent(5);
    const lastDecision = recent.length > 0 ? recent[0] : null;
    const pendingOutcomes = recent.filter(d => !d.outcome);

    let summary: string;
    if (!lastDecision) {
      summary = 'No previous session decisions found. Starting fresh.';
    } else {
      const pendingText = pendingOutcomes.length > 0
        ? ` There ${pendingOutcomes.length === 1 ? 'is 1 decision' : `are ${pendingOutcomes.length} decisions`} pending outcome.`
        : '';
      summary = `Last session you decided: "${lastDecision.choice}" (${lastDecision.justification}).${pendingText}`;
    }

    return {
      summary,
      lastDecision,
      recentDecisions: recent,
      hasPendingOutcomes: pendingOutcomes.length > 0,
    };
  }

  getSessionHandoff(): string {
    const context = this.restore();
    if (!context.lastDecision) {
      return 'No previous context to restore.';
    }
    return [
      `=== Session Handoff ===`,
      `${context.summary}`,
      `Recent decisions: ${context.recentDecisions.length}`,
      context.hasPendingOutcomes ? '⚠ Some decisions need outcome tracking.' : '✓ All decisions have outcomes recorded.',
      `=====================`,
    ].join('\n');
  }
}

export function createContextRestorer(decisionStore: DecisionStore): ContextRestorer {
  return new ContextRestorer(decisionStore);
}
