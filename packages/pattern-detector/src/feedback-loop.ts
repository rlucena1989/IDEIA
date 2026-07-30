import { AdaptiveLearner } from './adaptive-learner';
import { createLogger } from '@ideia/logger';
import { PatternStore } from './pattern-store';
import { LearningFeedback, PatternSuggestion} from './types';
const logger = createLogger('feedback-loop');

export interface FeedbackLoopConfig {
  autoExecuteThreshold: number;
  suppressAfterRejections: number;
}

export class FeedbackLoop {
  private learner: AdaptiveLearner;
  private store: PatternStore;
  private config: FeedbackLoopConfig;

  constructor(learner: AdaptiveLearner, store: PatternStore, config?: Partial<FeedbackLoopConfig>) {
    this.learner = learner;
    this.store = store;
    this.config = {
      autoExecuteThreshold: 3,
      suppressAfterRejections: 2,
      ...config,
    };
  }

  processFeedback(feedback: LearningFeedback): void {
    this.learner.processFeedback(feedback);
  }

  getPendingSuggestions(): PatternSuggestion[] {
    const all = this.store.getSuggestionsByStatus('pending');
    return all.filter(s => {
      const rejectedCount = this.store.getSuggestions().filter(
        other => other.patternType === s.patternType && other.status === 'rejected'
      ).length;
      return rejectedCount < this.config.suppressAfterRejections;
    });
  }

  shouldAutoExecute(suggestionId: string): boolean {
    const rule = this.learner.getAutoExecuteRules().find(
      r => r.sourceSuggestionId === suggestionId
    );
    return !!rule;
  }

  getAutomationStatus(): { total: number; auto: number; pending: number; suppressed: number } {
    const all = this.store.getSuggestions();
    const auto = all.filter(s => s.status === 'automated').length;
    const pending = all.filter(s => s.status === 'pending').length;
    const rejected = all.filter(s => s.status === 'rejected').length;
    return {
      total: all.length,
      auto,
      pending,
      suppressed: rejected,
    };
  }

  integrateWithMemory(memoryStore: {
    store: (key: string, value: unknown) => Promise<void>;
    retrieve: (key: string) => Promise<unknown>;
  }): void {
    const rules = this.learner.getActiveRules();
    for (const rule of rules) {
      memoryStore.store(`adaptive_rule:${rule.ruleId}`, rule).catch(() => {});
    }
  }
}

export function createFeedbackLoop(
  learner: AdaptiveLearner,
  store: PatternStore,
  config?: Partial<FeedbackLoopConfig>
): FeedbackLoop {
  return new FeedbackLoop(learner, store, config);
}
