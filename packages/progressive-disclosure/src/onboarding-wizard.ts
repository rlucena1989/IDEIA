export interface WizardStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string;
  action?: string;
  required: boolean;
  skipable: boolean;
  estimatedSeconds: number;
}

export interface WizardConfig {
  steps: WizardStep[];
  completionMessage: string;
  requiredStepsToComplete: number;
  timeToTaskTargetMs: number;
}

export interface WizardProgress {
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: number;
  completedAt: number | null;
  timeToTaskMs: number;
}

export class OnboardingWizard {
  private config: WizardConfig;
  private sessions: Map<string, WizardProgress> = new Map();

  constructor(config: Partial<WizardConfig> & { steps: WizardStep[] }) {
    this.config = {
      steps: config.steps,
      completionMessage: config.completionMessage ?? 'You are ready to use IDEIA!',
      requiredStepsToComplete: config.requiredStepsToComplete ?? config.steps.length,
      timeToTaskTargetMs: config.timeToTaskTargetMs ?? 120000,
    };
  }

  start(sessionId: string): WizardProgress {
    const progress: WizardProgress = {
      currentStep: 0,
      completedSteps: [],
      skippedSteps: [],
      startedAt: Date.now(),
      completedAt: null,
      timeToTaskMs: 0,
    };
    this.sessions.set(sessionId, progress);
    return progress;
  }

  getCurrentStep(sessionId: string): WizardStep | null {
    const progress = this.sessions.get(sessionId);
    if (!progress) return null;
    if (progress.currentStep >= this.config.steps.length) return null;
    return this.config.steps[progress.currentStep];
  }

  completeStep(sessionId: string, stepId: string): WizardProgress | null {
    const progress = this.sessions.get(sessionId);
    if (!progress) return null;

    const step = this.config.steps.find(s => s.id === stepId);
    if (!step) return null;

    if (!progress.completedSteps.includes(stepId)) {
      progress.completedSteps.push(stepId);
    }
    progress.currentStep = Math.min(progress.currentStep + 1, this.config.steps.length);

    if (this.isComplete(progress)) {
      progress.completedAt = Date.now();
      progress.timeToTaskMs = progress.completedAt - progress.startedAt;
    }

    this.sessions.set(sessionId, progress);
    return progress;
  }

  skipStep(sessionId: string, stepId: string): WizardProgress | null {
    const progress = this.sessions.get(sessionId);
    if (!progress) return null;

    const step = this.config.steps.find(s => s.id === stepId);
    if (!step) return null;

    if (!progress.skippedSteps.includes(stepId)) {
      progress.skippedSteps.push(stepId);
    }
    progress.currentStep = Math.min(progress.currentStep + 1, this.config.steps.length);

    this.sessions.set(sessionId, progress);
    return progress;
  }

  getProgress(sessionId: string): WizardProgress | undefined {
    return this.sessions.get(sessionId);
  }

  isComplete(progress: WizardProgress): boolean {
    if (progress.completedAt) return true;
    return progress.completedSteps.length >= this.config.requiredStepsToComplete;
  }

  getTimeToTask(sessionId: string): number | null {
    const progress = this.sessions.get(sessionId);
    if (!progress?.completedAt) return null;
    return progress.timeToTaskMs;
  }

  getConfig(): WizardConfig {
    return { ...this.config };
  }
}
