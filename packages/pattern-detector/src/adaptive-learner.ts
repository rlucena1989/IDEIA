import { PatternStore } from './pattern-store';
import { createLogger } from '@ideia/logger';
import { PatternSuggestion, LearningFeedback, AdaptiveRule } from './types';
const logger = createLogger('adaptive-learner');

export class AdaptiveLearner {
  private store: PatternStore;
  private rules: Map<string, AdaptiveRule> = new Map();

  constructor(store: PatternStore) {
    this.store = store;
  }

  processFeedback(feedback: LearningFeedback): void {
    const suggestion = this.store.getSuggestions().find(s => s.suggestionId === feedback.suggestionId);
    if (!suggestion) return;

    if (feedback.accepted) {
      this.handleAccepted(suggestion);
    } else {
      this.handleRejected(suggestion);
    }
  }

  private handleAccepted(suggestion: PatternSuggestion): void {
    this.store.updateSuggestion(suggestion.suggestionId, { status: 'accepted' });

    const ruleId = `rule_${suggestion.patternType}_${Date.now()}`;
    const rule: AdaptiveRule = {
      ruleId,
      sourceSuggestionId: suggestion.suggestionId,
      pattern: this.extractPatternKey(suggestion),
      automationScript: suggestion.automationScript ?? '',
      acceptedCount: 1,
      rejectedCount: 0,
      lastTriggered: new Date().toISOString(),
      autoExecute: false,
      enabled: true,
    };

    this.rules.set(ruleId, rule);
    this.checkAutomationThreshold(suggestion);
  }

  private handleRejected(suggestion: PatternSuggestion): void {
    const existing: PatternSuggestion | null = this.store.getSuggestions().find(
      s => s.suggestionId === suggestion.suggestionId
    ) ?? null;

    if (!existing) return;

    if (existing.status === 'rejected') {
      this.store.updateSuggestion(suggestion.suggestionId, { status: 'rejected' });
    } else {
      this.store.updateSuggestion(suggestion.suggestionId, { status: 'rejected' });
    }

    const ruleId = `rule_${suggestion.patternType}_${suggestion.suggestionId}`;
    const existingRule = this.rules.get(ruleId);
    if (existingRule) {
      existingRule.rejectedCount++;
      if (existingRule.rejectedCount >= 2) {
        existingRule.enabled = false;
        this.rules.set(ruleId, existingRule);
      }
    }
  }

  private checkAutomationThreshold(suggestion: PatternSuggestion): void {
    const ruleId = `rule_${suggestion.patternType}_${suggestion.suggestionId}`;
    const rule = this.rules.get(ruleId);
    if (!rule) return;

    const acceptedCount = this.store.getSuggestions().filter(
      s => s.status === 'accepted' && s.patternType === suggestion.patternType
    ).length;

    if (acceptedCount >= 3) {
      rule.autoExecute = true;
      this.rules.set(ruleId, rule);
      this.store.updateSuggestion(suggestion.suggestionId, { status: 'automated' });
    }
  }

  getActiveRules(): AdaptiveRule[] {
    return Array.from(this.rules.values()).filter(r => r.enabled);
  }

  getAutoExecuteRules(): AdaptiveRule[] {
    return Array.from(this.rules.values()).filter(r => r.enabled && r.autoExecute);
  }

  private extractPatternKey(suggestion: PatternSuggestion): string {
    if (suggestion.patternType === 'command') {
      return (suggestion.pattern as { command: string }).command;
    }
    if (suggestion.patternType === 'error') {
      return (suggestion.pattern as { errorPattern: string }).errorPattern;
    }
    return (suggestion.pattern as { patternId: string }).patternId;
  }
}

export function createAdaptiveLearner(store: PatternStore): AdaptiveLearner {
  return new AdaptiveLearner(store);
}
