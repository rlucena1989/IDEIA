import { v4 as uuid } from 'uuid';
import {
  TutorialStep, TutorialProgress, TutorialSession,
  StepResult, ValidationResult, CompletionSummary, TutorialId, SessionId
} from './types';
import { TutorialRegistry } from './registry';
import { ProgressTracker } from './tracker';

export class TutorialValidator {
  validateStep(step: TutorialStep, userInput: string): ValidationResult {
    if (step.validationFn) {
      const valid = step.validationFn(userInput);
      return valid ? { valid: true } : { valid: false, error: `Input did not match expected result for step "${step.id}"` };
    }
    if (step.expectedOutput) {
      const matches = userInput.trim().toLowerCase().includes(step.expectedOutput.trim().toLowerCase());
      return matches ? { valid: true } : { valid: false, error: `Expected output containing "${step.expectedOutput}"` };
    }
    return { valid: true };
  }

  generateHint(step: TutorialStep): string {
    return step.hint || 'Tente novamente com atenção aos detalhes do passo.';
  }
}

export class TutorialEngine {
  private sessions: Map<SessionId, TutorialSession> = new Map();
  private registry: TutorialRegistry;
  private tracker: ProgressTracker;
  private validator: TutorialValidator;

  constructor(registry: TutorialRegistry, tracker: ProgressTracker, validator?: TutorialValidator) {
    this.registry = registry;
    this.tracker = tracker;
    this.validator = validator ?? new TutorialValidator();
  }

  start(tutorialId: TutorialId): TutorialSession {
    const tutorial = this.registry.get(tutorialId);
    const sessionId = uuid();
    const progress: TutorialProgress = {
      tutorialId,
      currentStep: 0,
      completed: false,
      startedAt: Date.now(),
      score: 0
    };
    const session: TutorialSession = {
      sessionId,
      tutorialId,
      currentStep: 0,
      steps: tutorial.steps,
      progress,
      hintsUsed: 0,
      skippedSteps: []
    };
    this.sessions.set(sessionId, session);
    this.tracker.saveProgress(progress);
    return session;
  }

  executeStep(sessionId: SessionId): StepResult {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const step = session.steps[session.currentStep];
    if (!step) throw new Error('No more steps to execute');

    const result: StepResult = {
      stepId: step.id,
      status: 'pending',
      startedAt: Date.now(),
      attempts: 0,
      hintsUsed: 0
    };

    session.currentStep++;
    session.progress.currentStep = session.currentStep;
    this.tracker.saveProgress(session.progress);

    return result;
  }

  validateStep(sessionId: SessionId, userInput: string): ValidationResult {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const currentIndex = Math.max(0, session.currentStep - 1);
    const step = session.steps[currentIndex];
    if (!step) return { valid: false, error: 'No step to validate' };

    return this.validator.validateStep(step, userInput);
  }

  getHint(sessionId: SessionId): string {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    session.hintsUsed++;
    const currentIndex = Math.max(0, session.currentStep - 1);
    const step = session.steps[currentIndex];
    if (!step) return 'Complete the current step first.';

    return this.validator.generateHint(step);
  }

  skipStep(sessionId: SessionId): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const step = session.steps[Math.max(0, session.currentStep - 1)];
    if (step) {
      session.skippedSteps.push(step.id);
    }
  }

  getProgress(sessionId: SessionId): TutorialProgress {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    return { ...session.progress };
  }

  complete(sessionId: SessionId): CompletionSummary {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const tutorial = this.registry.get(session.tutorialId);
    const completedSteps = session.currentStep;
    const skippedSteps = session.skippedSteps.length;
    const failedSteps = 0;
    const totalSteps = session.steps.length;

    const baseScore = Math.round((completedSteps / totalSteps) * 100);
    const penalty = skippedSteps * 10;
    const score = Math.max(0, baseScore - penalty);

    const badges: string[] = [];
    if (score >= 80) badges.push('tutorial-master');
    if (completedSteps === totalSteps) badges.push('step-completer');

    session.progress.completed = true;
    session.progress.completedAt = Date.now();
    session.progress.score = score;
    this.tracker.saveProgress(session.progress);

    return {
      sessionId,
      tutorialId: session.tutorialId,
      tutorialName: tutorial.name,
      completed: true,
      totalSteps,
      completedSteps,
      skippedSteps,
      failedSteps,
      score,
      timeSpent: session.progress.completedAt - session.progress.startedAt,
      hintsUsed: session.hintsUsed,
      badges,
      startedAt: session.progress.startedAt,
      completedAt: session.progress.completedAt
    };
  }
}
