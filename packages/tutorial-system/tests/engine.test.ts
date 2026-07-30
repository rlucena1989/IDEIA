import { describe, it, expect, beforeEach } from '@jest/globals';
import { TutorialEngine, TutorialValidator } from '../src/engine';
import { TutorialRegistry } from '../src/registry';
import { ProgressTracker } from '../src/tracker';
import { Tutorial, TutorialStep, Difficulty } from '../src/types';

describe('TutorialValidator', () => {
  let validator: TutorialValidator;

  beforeEach(() => {
    validator = new TutorialValidator();
  });

  describe('validateStep', () => {
    it('should validate step with validation function', () => {
      const step: TutorialStep = {
        id: 'step-1',
        title: 'Test Step',
        description: 'Test',
        hint: 'Test hint',
        type: 'shell',
        validationFn: (input: string) => input.includes('success'),
      };
      const result = validator.validateStep(step, 'success output');
      expect(result.valid).toBe(true);
    });

    it('should fail validation with validation function', () => {
      const step: TutorialStep = {
        id: 'step-1',
        title: 'Test Step',
        description: 'Test',
        hint: 'Test hint',
        type: 'shell',
        validationFn: (input: string) => input.includes('success'),
      };
      const result = validator.validateStep(step, 'failure output');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate step with expected output', () => {
      const step: TutorialStep = {
        id: 'step-1',
        title: 'Test Step',
        description: 'Test',
        expectedOutput: 'Hello World',
        hint: 'Test hint',
        type: 'shell',
      };
      const result = validator.validateStep(step, 'Hello World');
      expect(result.valid).toBe(true);
    });

    it('should pass validation when no validation criteria', () => {
      const step: TutorialStep = {
        id: 'step-1',
        title: 'Test Step',
        description: 'Test',
        hint: 'Test hint',
        type: 'shell',
      };
      const result = validator.validateStep(step, 'any output');
      expect(result.valid).toBe(true);
    });
  });

  describe('generateHint', () => {
    it('should return step hint', () => {
      const step: TutorialStep = {
        id: 'step-1',
        title: 'Test Step',
        description: 'Test',
        hint: 'Custom hint',
        type: 'shell',
      };
      const hint = validator.generateHint(step);
      expect(hint).toBe('Custom hint');
    });

    it('should return default hint when none provided', () => {
      const step: TutorialStep = {
        id: 'step-1',
        title: 'Test Step',
        description: 'Test',
        type: 'shell',
      };
      const hint = validator.generateHint(step);
      expect(hint).toContain('Tente novamente');
    });
  });
});

describe('TutorialEngine', () => {
  let engine: TutorialEngine;
  let registry: TutorialRegistry;
  let tracker: ProgressTracker;
  let mockTutorial: Tutorial;

  beforeEach(() => {
    registry = new TutorialRegistry();
    tracker = new ProgressTracker();
    engine = new TutorialEngine(registry, tracker);
    
    mockTutorial = {
      id: 'tutorial-1',
      name: 'Test Tutorial',
      description: 'Test description',
      difficulty: 'beginner' as Difficulty,
      prerequisites: [],
      steps: [
        {
          id: 'step-1',
          title: 'Step 1',
          description: 'First step',
          command: 'echo "test"',
          hint: 'Test hint',
          type: 'shell',
        },
      ],
      estimatedMinutes: 10,
      tags: ['test'],
    };
    
    registry.register(mockTutorial);
  });

  describe('constructor', () => {
    it('should create engine with components', () => {
      expect(engine).toBeInstanceOf(TutorialEngine);
    });

    it('should create engine with custom validator', () => {
      const customValidator = new TutorialValidator();
      const engine = new TutorialEngine(registry, tracker, customValidator);
      expect(engine).toBeInstanceOf(TutorialEngine);
    });
  });

  describe('start', () => {
    it('should start tutorial session', () => {
      const session = engine.start('tutorial-1');
      expect(session).toBeDefined();
      expect(session.tutorialId).toBe('tutorial-1');
      expect(session.currentStep).toBe(0);
      expect(session.progress.completed).toBe(false);
    });
  });

  describe('validator', () => {
    it('should have validator instance', () => {
      const validator = (engine as any).validator;
      expect(validator).toBeInstanceOf(TutorialValidator);
    });
  });

  describe('registry', () => {
    it('should have registry instance', () => {
      const registry = (engine as any).registry;
      expect(registry).toBeInstanceOf(TutorialRegistry);
    });
  });

  describe('tracker', () => {
    it('should have tracker instance', () => {
      const tracker = (engine as any).tracker;
      expect(tracker).toBeInstanceOf(ProgressTracker);
    });
  });
});
