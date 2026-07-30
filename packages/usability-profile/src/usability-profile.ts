import { randomUUID } from 'crypto';
import type { IEventBus } from '@ideia/event-bus';
import type { AuditTrail } from '@ideia/audit-trail';
import { createLogger } from '@ideia/logger';
import {
  UsabilityEvent,
  UserBehaviorPattern,
  UsabilityAdaptation,
  UsabilityProfileState,
  AdaptationRule,
  UsabilityProfileConfig,
} from './types';

const log = createLogger('usability-profile');

const DEFAULT_CONFIG: UsabilityProfileConfig = {
  maxPatterns: 100,
  minFrequencyForAdaptation: 3,
  decayDays: 30,
  autoAdapt: true,
  learningRate: 0.1,
};

const DEFAULT_RULES: AdaptationRule[] = [
  {
    id: 'frequent-command-shortcut',
    trigger: { eventType: 'command', action: '*', minFrequency: 5 },
    action: { type: 'shortcut', target: 'command', value: 'suggest-shortcut' },
    priority: 1,
  },
  {
    id: 'frequent-widget-pin',
    trigger: { eventType: 'widget', action: 'open', minFrequency: 10 },
    action: { type: 'layout', target: 'widget', value: 'pin' },
    priority: 2,
  },
  {
    id: 'error-pattern-workflow',
    trigger: { eventType: 'error', action: '*', minFrequency: 3 },
    action: { type: 'suggestion', target: 'workflow', value: 'suggest-alternative' },
    priority: 3,
  },
];

export class UsabilityProfileEngine {
  private state: UsabilityProfileState;
  private config: UsabilityProfileConfig;
  private rules: AdaptationRule[];
  private eventBus?: IEventBus;
  private auditTrail?: AuditTrail;

  constructor(
    userId: string,
    eventBus?: IEventBus,
    auditTrail?: AuditTrail,
    config?: Partial<UsabilityProfileConfig>,
    rules?: AdaptationRule[],
  ) {
    this.eventBus = eventBus;
    this.auditTrail = auditTrail;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rules = rules ?? [...DEFAULT_RULES];
    this.state = {
      userId,
      behaviorPatterns: [],
      adaptations: [],
      preferences: {},
      totalEvents: 0,
      learnedShortcuts: [],
      frequentActions: [],
      commonErrorPatterns: [],
      sessionCount: 0,
      lastActive: new Date().toISOString(),
      adaptationScore: 0,
    };
  }

  trackEvent(event: UsabilityEvent): void {
    this.state.totalEvents++;
    this.state.lastActive = new Date().toISOString();

    const existing = this.state.behaviorPatterns.find(
      p => p.eventType === event.type && p.action === event.action && p.context === (event.context ?? undefined),
    );

    if (existing) {
      existing.frequency++;
      existing.lastUsed = event.timestamp;
      existing.score = this.computeScore(existing.frequency, existing.lastUsed);
    } else {
      if (this.state.behaviorPatterns.length >= this.config.maxPatterns) {
        this.state.behaviorPatterns.sort((a, b) => a.score - b.score);
        this.state.behaviorPatterns.shift();
      }

      const pattern: UserBehaviorPattern = {
        id: randomUUID(),
        eventType: event.type,
        action: event.action,
        frequency: 1,
        lastUsed: event.timestamp,
        context: event.context,
        score: 0.1,
      };
      this.state.behaviorPatterns.push(pattern);
    }

    this.decayPatterns();
    this.emitEvent('control.profile.usability-update', { event });

    if (event.type === 'error') {
      if (!this.state.commonErrorPatterns.includes(event.action)) {
        this.state.commonErrorPatterns.push(event.action);
      }
    }

    this.updateFrequentActions();
    this.auditTrail?.append({
      actor: 'user',
      eventType: `usability.${event.type}`,
      target: event.action,
      decision: 'approved',
      result: 'success',
      metadata: { event },
    });

    if (this.config.autoAdapt) {
      this.evaluateAdaptations(event);
    }
  }

  getState(): UsabilityProfileState {
    return { ...this.state };
  }

  getAdaptations(): UsabilityAdaptation[] {
    return [...this.state.adaptations];
  }

  applyAdaptation(id: string): boolean {
    const adaptation = this.state.adaptations.find(a => a.id === id);
    if (!adaptation || adaptation.applied) return false;

    adaptation.applied = true;
    adaptation.appliedAt = new Date().toISOString();
    this.state.adaptationScore += 0.1;

    this.emitEvent('control.profile.usability-adapt', { adaptation });
    return true;
  }

  addRule(rule: AdaptationRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  getConfig(): UsabilityProfileConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<UsabilityProfileConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getSuggestions(): UsabilityAdaptation[] {
    return this.state.adaptations.filter(a => !a.applied && a.type === 'suggestion');
  }

  private evaluateAdaptations(event: UsabilityEvent): void {
    for (const rule of this.rules) {
      const matchesEventType = rule.trigger.eventType === '*' || rule.trigger.eventType === event.type;
      const matchesAction = rule.trigger.action === '*' || rule.trigger.action === event.action;

      if (!matchesEventType || !matchesAction) continue;

      const pattern = this.state.behaviorPatterns.find(
        p => (rule.trigger.eventType === '*' || p.eventType === rule.trigger.eventType) &&
             (rule.trigger.action === '*' || p.action === rule.trigger.action),
      );

      if (!pattern || pattern.frequency < rule.trigger.minFrequency) continue;

      const alreadyApplied = this.state.adaptations.some(
        a => a.type === rule.action.type && a.target === rule.action.target && a.applied,
      );

      if (alreadyApplied) continue;

      const confidence = Math.min(pattern.frequency / 10, 1);
      const adaptation: UsabilityAdaptation = {
        id: randomUUID(),
        type: rule.action.type,
        target: rule.action.target,
        value: rule.action.value,
        confidence,
        reason: `User performed "${pattern.action}" ${pattern.frequency} times`,
        applied: false,
      };

      this.state.adaptations.push(adaptation);
      log.info('Adaptation suggested', { type: adaptation.type, target: adaptation.target, confidence });
    }
  }

  private decayPatterns(): void {
    const now = Date.now();
    const decayMs = this.config.decayDays * 24 * 60 * 60 * 1000;

    for (const pattern of this.state.behaviorPatterns) {
      const age = now - new Date(pattern.lastUsed).getTime();
      if (age > decayMs) {
        pattern.score *= 0.5;
      }
    }

    this.state.behaviorPatterns = this.state.behaviorPatterns.filter(p => p.score > 0.01);
  }

  private updateFrequentActions(): void {
    const actionFrequency = new Map<string, number>();

    for (const pattern of this.state.behaviorPatterns) {
      const key = `${pattern.eventType}:${pattern.action}`;
      actionFrequency.set(key, (actionFrequency.get(key) ?? 0) + pattern.frequency);
    }

    const sorted = Array.from(actionFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    this.state.frequentActions = sorted.map(([key]) => key);
  }

  private computeScore(frequency: number, lastUsed: string): number {
    const now = Date.now();
    const ageHours = (now - new Date(lastUsed).getTime()) / (1000 * 60 * 60);
    const recencyFactor = Math.max(0, 1 - ageHours / (this.config.decayDays * 24));
    return Math.min(frequency / 10, 1) * 0.6 + recencyFactor * 0.4;
  }

  private emitEvent(type: string, payload: Record<string, unknown>): void {
    this.eventBus?.emit({ type, source: 'usability-profile', payload }).catch(() => {});
  }
}

export function createUsabilityProfileEngine(
  userId: string,
  eventBus?: IEventBus,
  auditTrail?: AuditTrail,
  config?: Partial<UsabilityProfileConfig>,
  rules?: AdaptationRule[],
): UsabilityProfileEngine {
  return new UsabilityProfileEngine(userId, eventBus, auditTrail, config, rules);
}
