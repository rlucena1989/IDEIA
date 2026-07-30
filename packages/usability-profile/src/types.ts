export interface UsabilityEvent {
  type: 'command' | 'widget' | 'shortcut' | 'navigation' | 'error' | 'preference';
  action: string;
  context?: string;
  timestamp: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface UserBehaviorPattern {
  id: string;
  eventType: UsabilityEvent['type'];
  action: string;
  frequency: number;
  lastUsed: string;
  context?: string;
  score: number;
}

export interface UsabilityAdaptation {
  id: string;
  type: 'layout' | 'shortcut' | 'visibility' | 'default' | 'suggestion';
  target: string;
  value: unknown;
  confidence: number;
  reason: string;
  applied: boolean;
  appliedAt?: string;
}

export interface UsabilityProfileState {
  userId: string;
  behaviorPatterns: UserBehaviorPattern[];
  adaptations: UsabilityAdaptation[];
  preferences: Record<string, unknown>;
  totalEvents: number;
  learnedShortcuts: string[];
  frequentActions: string[];
  commonErrorPatterns: string[];
  sessionCount: number;
  lastActive: string;
  adaptationScore: number;
}

export interface AdaptationRule {
  id: string;
  trigger: {
    eventType: UsabilityEvent['type'] | '*';
    action: string;
    minFrequency: number;
  };
  action: {
    type: UsabilityAdaptation['type'];
    target: string;
    value: unknown;
  };
  priority: number;
}

export type UsabilityProfileConfig = {
  maxPatterns: number;
  minFrequencyForAdaptation: number;
  decayDays: number;
  autoAdapt: boolean;
  learningRate: number;
};
