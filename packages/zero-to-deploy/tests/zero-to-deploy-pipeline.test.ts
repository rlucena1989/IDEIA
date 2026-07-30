import { describe, it, expect, beforeEach } from '@jest/globals';
import { ZeroToDeployPipeline, PhaseExecutor, PhaseContext } from '../src/zero-to-deploy-pipeline';
import { WorkflowPhase, WorkflowState, AutonomyLevel } from '../src/types';

describe('ZeroToDeployPipeline', () => {
  let pipeline: ZeroToDeployPipeline;
  let mockExecutor: PhaseExecutor;

  beforeEach(() => {
    pipeline = new ZeroToDeployPipeline('test-pipeline');
    mockExecutor = {
      execute: async (_context: PhaseContext) => ({ input: 'test-result' }),
    };
  });

  describe('constructor', () => {
    it('should create pipeline with description', () => {
      expect(pipeline).toBeInstanceOf(ZeroToDeployPipeline);
      expect(pipeline.id).toBeDefined();
      expect(pipeline.state).toBe('entry');
    });

    it('should create pipeline with custom config', () => {
      const pipeline = new ZeroToDeployPipeline('test', { maxRetries: 5, autonomyLevel: 3 });
      expect(pipeline).toBeInstanceOf(ZeroToDeployPipeline);
      expect(pipeline.autonomyLevel).toBe(3);
    });

    it('should set default maxRetries', () => {
      expect(pipeline.autonomyLevel).toBe(2);
    });
  });

  describe('registerPhase', () => {
    it('should register phase executor', () => {
      pipeline.registerPhase('requirements', mockExecutor);
    });
  });

  describe('canTransition', () => {
    it('should allow valid transitions', () => {
      pipeline.transition('requirements');
      expect(pipeline.canTransition('architecture')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      pipeline.transition('requirements');
      expect(pipeline.canTransition('completed')).toBe(false);
    });

    it('should allow transitions from entry', () => {
      expect(pipeline.canTransition('requirements')).toBe(true);
    });
  });

  describe('transition', () => {
    it('should transition to valid state', () => {
      pipeline.transition('requirements');
      expect(pipeline.state).toBe('requirements');
    });

    it('should throw error for invalid transition', () => {
      expect(() => pipeline.transition('completed')).toThrow('Invalid transition');
    });
  });

  describe('needsHumanApproval', () => {
    it('should require approval for level 0', () => {
      const pipeline = new ZeroToDeployPipeline('test', { autonomyLevel: 0 });
      expect(pipeline.needsHumanApproval('requirements')).toBe(true);
      expect(pipeline.needsHumanApproval('deploy')).toBe(true);
    });

    it('should require approval for level 1', () => {
      const pipeline = new ZeroToDeployPipeline('test', { autonomyLevel: 1 });
      expect(pipeline.needsHumanApproval('requirements')).toBe(true);
      expect(pipeline.needsHumanApproval('deploy')).toBe(true);
      expect(pipeline.needsHumanApproval('testing')).toBe(false);
    });

    it('should require approval for level 2', () => {
      const pipeline = new ZeroToDeployPipeline('test', { autonomyLevel: 2 });
      expect(pipeline.needsHumanApproval('architecture')).toBe(true);
      expect(pipeline.needsHumanApproval('deploy')).toBe(true);
      expect(pipeline.needsHumanApproval('requirements')).toBe(false);
    });

    it('should require approval for level 3', () => {
      const pipeline = new ZeroToDeployPipeline('test', { autonomyLevel: 3 });
      expect(pipeline.needsHumanApproval('deploy')).toBe(true);
      expect(pipeline.needsHumanApproval('architecture')).toBe(false);
    });

    it('should not require approval for level 4', () => {
      const pipeline = new ZeroToDeployPipeline('test', { autonomyLevel: 4 });
      expect(pipeline.needsHumanApproval('deploy')).toBe(false);
    });
  });

  describe('start', () => {
    it('should start workflow', async () => {
      await pipeline.start('Test workflow');
      expect(pipeline.state).toBe('requirements');
    });
  });

  describe('executePhase', () => {
    it('should execute registered phase', async () => {
      pipeline.registerPhase('requirements', mockExecutor);
      await pipeline.executePhase('requirements');
      expect(pipeline.context.input).toBe('test-result');
    });

    it('should throw error for unregistered phase', async () => {
      await expect(pipeline.executePhase('requirements')).rejects.toThrow('No executor');
    });

    it('should update context with result', async () => {
      const executor: PhaseExecutor = {
        execute: async () => ({ input: 'updated-result' }),
      };
      pipeline.registerPhase('requirements', executor);
      await pipeline.executePhase('requirements');
      expect(pipeline.context.input).toBe('updated-result');
    });
  });

  describe('getFailedState', () => {
    it('should return failed state for phase', () => {
      expect(pipeline.getFailedState('requirements')).toBe('req_failed');
      expect(pipeline.getFailedState('architecture')).toBe('arch_failed');
      expect(pipeline.getFailedState('deploy')).toBe('dpl_failed');
    });
  });

  describe('getNextState', () => {
    it('should return next state for phase', () => {
      expect(pipeline.getNextState('requirements')).toBe('architecture');
      expect(pipeline.getNextState('architecture')).toBe('implement');
      expect(pipeline.getNextState('verify')).toBe('completed');
    });
  });

  describe('context', () => {
    it('should return context object', () => {
      const context = pipeline.context;
      expect(context).toBeDefined();
      expect(typeof context).toBe('object');
    });
  });

  describe('id', () => {
    it('should return unique id', () => {
      const pipeline1 = new ZeroToDeployPipeline('test');
      const pipeline2 = new ZeroToDeployPipeline('test');
      expect(pipeline1.id).toBeDefined();
      expect(pipeline2.id).toBeDefined();
      expect(pipeline1.id).not.toBe(pipeline2.id);
    });
  });
});
