export type TutorialId = string;
export type StepId = string;
export type UserId = string;
export type SessionId = string;

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type StepType = 'shell' | 'read' | 'edit' | 'ask';

export interface TutorialStep {
  id: StepId;
  title: string;
  description: string;
  command?: string;
  expectedOutput?: string;
  validationFn?: (input: string) => boolean;
  hint: string;
  type: StepType;
}

export interface Tutorial {
  id: TutorialId;
  name: string;
  description: string;
  difficulty: Difficulty;
  prerequisites: TutorialId[];
  steps: TutorialStep[];
  estimatedMinutes: number;
  tags: string[];
}

export interface TutorialProgress {
  tutorialId: TutorialId;
  currentStep: number;
  completed: boolean;
  startedAt: number;
  completedAt?: number;
  score: number;
}

export interface TutorialSession {
  sessionId: SessionId;
  tutorialId: TutorialId;
  currentStep: number;
  steps: TutorialStep[];
  progress: TutorialProgress;
  hintsUsed: number;
  skippedSteps: string[];
}

export interface StepResult {
  stepId: StepId;
  status: 'pending' | 'success' | 'failure' | 'skipped';
  startedAt: number;
  completedAt?: number;
  attempts: number;
  hintsUsed: number;
  error?: string;
  output?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

export interface CompletionSummary {
  sessionId: SessionId;
  tutorialId: TutorialId;
  tutorialName: string;
  completed: boolean;
  totalSteps: number;
  completedSteps: number;
  skippedSteps: number;
  failedSteps: number;
  score: number;
  timeSpent: number;
  hintsUsed: number;
  badges: string[];
  startedAt: number;
  completedAt: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earnedAt: string;
}
