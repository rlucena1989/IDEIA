export interface OnboardingState { completed: boolean; currentStep: number; totalSteps: number; stackDetected?: string; llmConfigured: boolean; modeSelected?: string; startedAt: string; completedAt?: string; tutorialProgress: number; }
export interface OnboardingStep { id: number; name: string; description: string; status: 'pending'|'completed'|'skipped'; }
