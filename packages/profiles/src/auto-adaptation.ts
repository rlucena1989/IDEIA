import type { AdaptiveSuggestion } from './adaptive-suggestions';
import { createLogger } from '@ideia/logger';
import type { ProfileId, AutonomyLevel } from './types';
import type { Profiles } from './profiles';
const logger = createLogger('auto-adaptation');

export type AdaptationPhase = 'observation' | 'suggestion' | 'auto';

export interface PhaseTransition {
  from: AdaptationPhase;
  to: AdaptationPhase;
  triggeredAt: string;
  triggeredBy: 'threshold' | 'manual' | 'override';
  interactionCount: number;
}

export interface AutoAdaptResult {
  applied: AdaptiveSuggestion[];
  skipped: AdaptiveSuggestion[];
  phase: AdaptationPhase;
  transitions: PhaseTransition[];
  summary: string;
}

export interface AdaptationConfig {
  observationThreshold: number;
  suggestionThreshold: number;
  autoApplyConfidence: number;
  requireApproval: boolean;
}

export interface InteractionTracker {
  getCount(): number;
}

const DEFAULT_CONFIG: AdaptationConfig = {
  observationThreshold: 50,
  suggestionThreshold: 200,
  autoApplyConfidence: 0.85,
  requireApproval: false,
};

export class AutoAdaptation {
  private profileId: ProfileId;
  private autonomyLevel: AutonomyLevel;
  private interactionTracker: InteractionTracker;
  private profiles?: Profiles;
  private transitions: PhaseTransition[] = [];
  private config: AdaptationConfig;
  private currentPhase: AdaptationPhase;
  private manualOverride = false;

  constructor(
    profileId: ProfileId,
    autonomyLevel: AutonomyLevel,
    interactionTracker: InteractionTracker,
    profiles?: Profiles,
  ) {
    this.profileId = profileId;
    this.autonomyLevel = autonomyLevel;
    this.interactionTracker = interactionTracker;
    this.profiles = profiles;
    this.config = { ...DEFAULT_CONFIG };
    this.currentPhase = this.determinePhase(this.interactionTracker.getCount());
  }

  private determinePhase(count: number): AdaptationPhase {
    if (count < this.config.observationThreshold) return 'observation';
    if (count < this.config.suggestionThreshold) return 'suggestion';
    return 'auto';
  }

  getPhase(): AdaptationPhase {
    if (!this.manualOverride) {
      this.currentPhase = this.determinePhase(this.interactionTracker.getCount());
    }
    return this.currentPhase;
  }

  evaluate(suggestions: AdaptiveSuggestion[]): { apply: AdaptiveSuggestion[]; skip: AdaptiveSuggestion[] } {
    const phase = this.currentPhase;

    const apply: AdaptiveSuggestion[] = [];
    const skip: AdaptiveSuggestion[] = [];

    for (const s of suggestions) {
      if (phase === 'observation') {
        skip.push(s);
      } else if (phase === 'suggestion') {
        if (s.confidence >= 0.95 && !this.config.requireApproval) {
          apply.push(s);
        } else {
          skip.push(s);
        }
      } else {
        if (s.confidence >= this.config.autoApplyConfidence) {
          apply.push(s);
        } else {
          skip.push(s);
        }
      }
    }

    return { apply, skip };
  }

  async execute(suggestions: AdaptiveSuggestion[]): Promise<AutoAdaptResult> {
    const previousPhase = this.currentPhase;
    const naturalPhase = this.determinePhase(this.interactionTracker.getCount());
    const transitions: PhaseTransition[] = [];

    if (naturalPhase !== previousPhase) {
      const transition: PhaseTransition = {
        from: previousPhase,
        to: naturalPhase,
        triggeredAt: new Date().toISOString(),
        triggeredBy: 'threshold',
        interactionCount: this.interactionTracker.getCount(),
      };
      this.transitions.push(transition);
      transitions.push(transition);
      this.currentPhase = naturalPhase;
      this.manualOverride = false;
    }

    const { apply, skip } = this.evaluate(suggestions);
    const applied: AdaptiveSuggestion[] = [];

    for (const suggestion of apply) {
      if (suggestion.type === 'profile' && suggestion.suggestedValue && this.profiles) {
        await this.profiles.apply(suggestion.suggestedValue);
      }
      applied.push(suggestion);
    }

    return {
      applied,
      skipped: skip,
      phase: this.currentPhase,
      transitions,
      summary: `Applied ${applied.length}, skipped ${skip.length} suggestions in phase ${this.currentPhase}`,
    };
  }

  transitionTo(targetPhase: AdaptationPhase, triggeredBy: 'manual' | 'override' = 'manual'): PhaseTransition {
    const current = this.currentPhase;
    const transition: PhaseTransition = {
      from: current,
      to: targetPhase,
      triggeredAt: new Date().toISOString(),
      triggeredBy,
      interactionCount: this.interactionTracker.getCount(),
    };
    this.transitions.push(transition);
    this.currentPhase = targetPhase;
    this.manualOverride = true;
    return transition;
  }

  getHistory(): PhaseTransition[] {
    return [...this.transitions];
  }

  getConfig(): AdaptationConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<AdaptationConfig>): AdaptationConfig {
    this.config = { ...this.config, ...partial };
    return this.getConfig();
  }
}
