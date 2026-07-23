import { TutorialEngine, TutorialValidator } from '../src/engine';
import { TutorialRegistry } from '../src/registry';
import { ProgressTracker } from '../src/tracker';
import { Tutorial } from '../src/types';

function makeTutorial(): Tutorial {
  return {
    id: 'test',
    name: 'Test',
    description: 'A test',
    difficulty: 'beginner',
    prerequisites: [],
    steps: [
      { id: 's1', title: 'Step 1', description: 'Do X', hint: 'Try Y', type: 'shell', command: 'echo hello', expectedOutput: 'hello' },
      { id: 's2', title: 'Step 2', description: 'Do Z', hint: 'Use W', type: 'shell', command: 'ls', expectedOutput: 'file' },
    ],
    estimatedMinutes: 10,
    tags: ['test'],
  };
}

function createEngine(): TutorialEngine {
  const registry = new TutorialRegistry();
  registry.register(makeTutorial());
  const tracker = new ProgressTracker();
  return new TutorialEngine(registry, tracker);
}

describe('TutorialEngine', () => {
  it('should start a tutorial session', () => {
    const engine = createEngine();
    const session = engine.start('test');
    expect(session.sessionId).toBeTruthy();
    expect(session.tutorialId).toBe('test');
    expect(session.currentStep).toBe(0);
  });

  it('should execute a step', () => {
    const engine = createEngine();
    const session = engine.start('test');
    const result = engine.executeStep(session.sessionId);
    expect(result.stepId).toBe('s1');
    expect(result.status).toBe('pending');
  });

  it('should validate a step with expected output', () => {
    const engine = createEngine();
    const session = engine.start('test');
    engine.executeStep(session.sessionId);
    const validation = engine.validateStep(session.sessionId, 'hello world');
    expect(validation.valid).toBe(true);
  });

  it('should fail validation on wrong output', () => {
    const engine = createEngine();
    const session = engine.start('test');
    engine.executeStep(session.sessionId);
    const validation = engine.validateStep(session.sessionId, 'goodbye');
    expect(validation.valid).toBe(false);
  });

  it('should return a hint', () => {
    const engine = createEngine();
    const session = engine.start('test');
    engine.executeStep(session.sessionId);
    const hint = engine.getHint(session.sessionId);
    expect(hint).toBeTruthy();
  });

  it('should skip a step', () => {
    const engine = createEngine();
    const session = engine.start('test');
    engine.executeStep(session.sessionId);
    engine.skipStep(session.sessionId);
    expect(session.skippedSteps).toContain('s1');
  });

  it('should get current progress', () => {
    const engine = createEngine();
    const session = engine.start('test');
    engine.executeStep(session.sessionId);
    const progress = engine.getProgress(session.sessionId);
    expect(progress.currentStep).toBe(1);
  });

  it('should complete and return a summary', () => {
    const engine = createEngine();
    const session = engine.start('test');
    engine.executeStep(session.sessionId);
    engine.executeStep(session.sessionId);
    const summary = engine.complete(session.sessionId);
    expect(summary.completed).toBe(true);
    expect(summary.totalSteps).toBe(2);
    expect(summary.completedSteps).toBe(2);
    expect(summary.score).toBe(100);
  });

  it('should throw for unknown session', () => {
    const engine = createEngine();
    expect(() => engine.executeStep('invalid')).toThrow('Session not found');
  });
});

describe('TutorialValidator', () => {
  const validator = new TutorialValidator();

  it('should validate using custom validationFn', () => {
    const step = { id: 'step', title: 'T', description: 'D', hint: 'H', type: 'shell' as const, validationFn: (input: string) => input === 'correct' };
    expect(validator.validateStep(step, 'correct').valid).toBe(true);
    expect(validator.validateStep(step, 'wrong').valid).toBe(false);
  });

  it('should return valid when no validation defined', () => {
    const step = { id: 'step', title: 'T', description: 'D', hint: 'H', type: 'shell' as const };
    expect(validator.validateStep(step, 'anything').valid).toBe(true);
  });

  it('should generate hint from step', () => {
    const step = { id: 'step', title: 'T', description: 'D', hint: 'My hint', type: 'shell' as const };
    expect(validator.generateHint(step)).toBe('My hint');
  });
});
