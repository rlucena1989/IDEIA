import { WIZARD_STEPS } from './steps.js'
import { PROFILES, AUTONOMY_OPTIONS as _AUTONOMY_OPTIONS } from './types.js'
import type { WizardMode, ProfileType, AutonomyLevel, WizardState, WizardAnswer, WizardSummary, WizardStep } from './types.js'

export class OnboardingWizard {
  private state: WizardState
  private active: boolean = false

  constructor() {
    this.state = this.createInitialState()
  }

  start(mode: WizardMode = 'quick'): WizardStep {
    this.active = true
    this.state = this.createInitialState()
    this.state.mode = mode
    this.state.started = true
    this.state.startedAt = Date.now()

    return this.getFilteredSteps()[0]
  }

  getCurrentStep(): WizardStep | null {
    if (!this.active) return null
    const steps = this.getFilteredSteps()
    return steps[this.state.currentStep] ?? null
  }

  submitStep(answers: WizardAnswer): { next: WizardStep | null; complete: boolean } {
    if (!this.active) throw new Error('Wizard not started')

    const steps = this.getFilteredSteps()
    const step = steps[this.state.currentStep]
    if (!step) return { next: null, complete: true }

    this.state.answers.set(step.id, answers.answers)

    if (step.id === 'welcome') {
      const profile = answers.answers.profile as ProfileType
      this.state.profile = profile
    }

    if (step.id === 'autonomy') {
      this.state.autonomyLevel = answers.answers.level as AutonomyLevel
    }

    this.state.currentStep++

    if (this.state.currentStep >= steps.length) {
      return { next: null, complete: true }
    }

    const nextStep = steps[this.state.currentStep]
    return { next: nextStep, complete: false }
  }

  complete(): WizardSummary {
    this.active = false
    this.state.completed = true
    this.state.completedAt = Date.now()

    const profile = PROFILES.find(p => p.id === this.state.profile)
    const duration = this.state.completedAt - this.state.startedAt

    const config = this.buildConfig()

    return {
      profile: this.state.profile as ProfileType,
      profileLabel: profile?.label ?? 'Unknown',
      autonomyLevel: this.state.autonomyLevel as AutonomyLevel,
      totalSteps: this.getFilteredSteps().length,
      completedSteps: this.state.currentStep,
      mode: this.state.mode,
      config,
      duration
    }
  }

  getSummary(): WizardSummary | null {
    if (!this.state.completed) return null
    return this.complete()
  }

  private getFilteredSteps(): WizardStep[] {
    return WIZARD_STEPS.filter(s => this.state.mode === 'expert' || !s.expertOnly)
  }

  private buildConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {}
    for (const [stepId, answers] of this.state.answers) {
      for (const [key, value] of Object.entries(answers)) {
        config[`${stepId}.${key}`] = value
      }
    }
    return config
  }

  private createInitialState(): WizardState {
    return {
      mode: 'quick',
      currentStep: 0,
      profile: null,
      autonomyLevel: null,
      answers: new Map(),
      started: false,
      completed: false,
      startedAt: 0,
      completedAt: null
    }
  }
}
