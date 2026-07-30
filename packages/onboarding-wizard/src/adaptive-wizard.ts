import { OnboardingWizard } from './onboarding-wizard.js'
import { createLogger } from '@ideia/logger';
import type { WizardSummary, AdaptiveSuggestionsInput, AdaptiveWizardState} from './types.js'
const logger = createLogger('adaptive-wizard');

export interface InteractionTrackerLike {
  record(type: string, source: string, metadata?: Record<string, unknown>, context?: Record<string, unknown>): unknown
  getCount(): number
  getPhase(): string
}

export class AdaptiveOnboardingWizard extends OnboardingWizard {
  private interactionTracker?: InteractionTrackerLike
  private pendingSuggestions: AdaptiveSuggestionsInput[] = []
  private adaptiveContext: AdaptiveWizardState = { pendingSuggestions: 0, interactionCount: 0, adaptationPhase: 'observation' }

  setInteractionTracker(tracker: InteractionTrackerLike): void {
    this.interactionTracker = tracker
  }

  injectSuggestions(suggestions: AdaptiveSuggestionsInput[]): void {
    this.pendingSuggestions = [...suggestions]
    this.setAdaptiveContext({
      pendingSuggestions: suggestions.length,
      interactionCount: this.interactionTracker?.getCount() ?? 0,
      adaptationPhase: this.getAdaptationPhase(this.interactionTracker?.getCount() ?? 0) as any,
    })
  }

  getPendingSuggestions(): AdaptiveSuggestionsInput[] {
    return [...this.pendingSuggestions]
  }

  setAdaptiveContext(ctx: AdaptiveWizardState): void {
    this.adaptiveContext = { ...ctx }
  }

  getAdaptiveContext(): AdaptiveWizardState {
    return { ...this.adaptiveContext }
  }

  getAdaptationPhase(interactionCount: number): string {
    if (interactionCount < 50) return 'observation'
    if (interactionCount < 200) return 'suggestion'
    return 'auto'
  }

  override complete(): WizardSummary {
    const summary = super.complete()

    if (this.interactionTracker) {
      this.interactionTracker.record(
        'profile.applied',
        'onboarding-wizard',
        { mode: summary.mode },
      )
    }

    const interactionCount = this.interactionTracker?.getCount() ?? 0
    const phase = this.getAdaptationPhase(interactionCount)

    return {
      ...summary,
      adaptationPhase: phase,
      pendingSuggestions: this.pendingSuggestions.length,
      interactionCount,
    }
  }
}
