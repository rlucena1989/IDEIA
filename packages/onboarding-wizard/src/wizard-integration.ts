import { AdaptiveOnboardingWizard, type InteractionTrackerLike } from './adaptive-wizard.js'
import { createLogger } from '@ideia/logger';
import type { WizardSummary, WizardStep } from './types.js'
const logger = createLogger('wizard-integration');

export interface ProfilesLike {
  apply(profileId: string): Promise<{ id: string; name: string }>
  get(id: string): { id: string; name: string }
  list(): Array<{ id: string; name: string }>
}

export interface ConfigEngineLike {
  set(path: string, value: unknown): Promise<void>
}

export interface AdaptiveSystemLike {
  getSuggestions(): Array<{ id: string; title: string; description: string; type: string; confidence: number; suggestedValue: string; currentValue: string; reason: string }> | Promise<Array<{ id: string; title: string; description: string; type: string; confidence: number; suggestedValue: string; currentValue: string; reason: string }>>
}

export interface WizardIntegrationOptions {
  tracker?: InteractionTrackerLike
  suggestions?: AdaptiveSystemLike
  autoAdapt?: { getPhase(): string; evaluate(suggestions: unknown[]): { apply: unknown[]; skip: unknown[] }; execute(suggestions: unknown[]): Promise<{ applied: unknown[]; skipped: unknown[]; phase: string; summary: string }> }
  profiles?: ProfilesLike
  configEngine?: ConfigEngineLike
}

export class WizardIntegration {
  private tracker?: InteractionTrackerLike
  private suggestions?: AdaptiveSystemLike
  private autoAdapt?: { getPhase(): string; evaluate(suggestions: unknown[]): { apply: unknown[]; skip: unknown[] }; execute(suggestions: unknown[]): Promise<{ applied: unknown[]; skipped: unknown[]; phase: string; summary: string }> }
  private profiles?: ProfilesLike
  private configEngine?: ConfigEngineLike

  constructor(options: WizardIntegrationOptions = {}) {
    this.tracker = options.tracker
    this.suggestions = options.suggestions
    this.autoAdapt = options.autoAdapt
    this.profiles = options.profiles
    this.configEngine = options.configEngine
  }

  getDefaultStep(wizard: AdaptiveOnboardingWizard, mode: 'quick' | 'expert'): WizardStep {
    return wizard.start(mode)
  }

  async runFullWizard(mode: 'quick' | 'expert'): Promise<{
    wizard: WizardSummary
    adaptationForecast: {
      currentPhase: string
      interactionsToSuggestion: number
      interactionsToAuto: number
    }
  }> {
    const wizard = new AdaptiveOnboardingWizard()

    if (this.tracker) {
      wizard.setInteractionTracker(this.tracker)
    }

    if (this.suggestions) {
      const suggestions = await this.suggestions.getSuggestions()
      if (suggestions.length > 0) {
        wizard.injectSuggestions(suggestions as any)
      }
    }

    if (mode === 'quick') {
      this.getDefaultStep(wizard, mode)
    } else {
      wizard.start(mode)
    }

    let step = wizard.getCurrentStep()
    while (step) {
      let defaults: Record<string, string | number | boolean | string[]>

      if (mode === 'quick') {
        defaults = this.buildDefaults(step)
      } else {
        defaults = this.buildDefaults(step)
      }

      const result = wizard.submitStep({ stepId: step.id, answers: defaults })
      if (result.complete) break
      step = result.next
    }

    const summary = wizard.complete()

    if (this.tracker) {
      this.tracker.record('wizard.completed', 'wizard-integration', {
        mode,
        profile: summary.profile,
      })
    }

    if (this.profiles && summary.profile) {
      await this.profiles.apply(summary.profile)
    }

    if (this.configEngine) {
      for (const [key, value] of Object.entries(summary.config)) {
        await this.configEngine.set(`wizard.${key}`, value)
      }
      await this.configEngine.set('wizard.profile', summary.profile ?? '')
      await this.configEngine.set('wizard.mode', summary.mode)
      await this.configEngine.set('wizard.autonomyLevel', summary.autonomyLevel)
    }

    const interactionCount = this.tracker?.getCount() ?? 0
    const currentPhase = summary.adaptationPhase ?? this.calculatePhase(interactionCount)
    const interactionsToSuggestion = Math.max(0, 50 - interactionCount)
    const interactionsToAuto = Math.max(0, 200 - interactionCount)

    return {
      wizard: summary,
      adaptationForecast: {
        currentPhase,
        interactionsToSuggestion,
        interactionsToAuto,
      },
    }
  }

  private buildDefaults(step: { id: string; fields: Array<{ id: string; type: string; defaultValue?: string | number | boolean | string[]; options?: Array<{ value: string }> }> }): Record<string, string | number | boolean | string[]> {
    const answers: Record<string, string | number | boolean | string[]> = {}
    for (const field of step.fields) {
      if (field.defaultValue !== undefined) {
        answers[field.id] = field.defaultValue
      } else if (field.type === 'select' && field.options && field.options.length > 0) {
        answers[field.id] = field.options[0].value
      } else if (field.type === 'multiselect' && field.options) {
        answers[field.id] = [field.options[0].value]
      } else if (field.type === 'toggle') {
        answers[field.id] = false
      } else if (field.type === 'number') {
        answers[field.id] = 0
      } else if (field.type === 'slider') {
        answers[field.id] = 0.5
      } else {
        answers[field.id] = ''
      }
    }
    return answers
  }

  private calculatePhase(count: number): string {
    if (count < 50) return 'observation'
    if (count < 200) return 'suggestion'
    return 'auto'
  }
}
