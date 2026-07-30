import { describe, it, expect, beforeEach } from '@jest/globals';
import { CheckpointEngine, createCheckpointEngine } from '../src/engine';
import { CheckpointType, CheckpointStatus } from '../src/types';

describe('CheckpointEngine', () => {
  let engine: CheckpointEngine;

  beforeEach(() => {
    engine = createCheckpointEngine();
  });

  describe('constructor', () => {
    it('should create engine with store and resume manager', () => {
      expect(engine).toBeInstanceOf(CheckpointEngine);
      expect(engine.store).toBeDefined();
      expect(engine.resumeManager).toBeDefined();
    });
  });

  describe('save', () => {
    it('should save a checkpoint', () => {
      const checkpoint = engine.save('task-1', 'plan', { data: 'test' });
      expect(checkpoint).toBeDefined();
      expect(checkpoint.taskId).toBe('task-1');
      expect(checkpoint.type).toBe('plan');
      expect(checkpoint.snapshot).toEqual({ data: 'test' });
    });

    it('should save checkpoint with parent', () => {
      const parent = engine.save('task-1', 'plan', { step: 1 });
      const child = engine.save('task-1', 'execution', { step: 2 }, parent.id);
      expect(child.parentId).toBe(parent.id);
    });

    it('should save checkpoint with diff', () => {
      const checkpoint = engine.save('task-1', 'plan', { data: 'test' }, undefined, { changed: true });
      expect(checkpoint.diff).toEqual({ changed: true });
    });

    it('should increment version for same task', () => {
      const first = engine.save('task-1', 'plan', { step: 1 });
      const second = engine.save('task-1', 'plan', { step: 2 });
      expect(second.version).toBe(first.version + 1);
    });
  });

  describe('getLatest', () => {
    it('should return latest checkpoint for task', () => {
      engine.save('task-1', 'plan', { step: 1 });
      engine.save('task-1', 'execution', { step: 2 });
      const latest = engine.getLatest('task-1');
      expect(latest).toBeDefined();
      expect(latest?.type).toBe('execution');
    });

    it('should return latest checkpoint by type', () => {
      engine.save('task-1', 'plan', { step: 1 });
      engine.save('task-1', 'plan', { step: 2 });
      engine.save('task-1', 'execution', { step: 3 });
      const latestPlan = engine.getLatest('task-1', 'plan');
      expect(latestPlan?.type).toBe('plan');
      expect(latestPlan?.version).toBe(2);
    });

    it('should return undefined for non-existent task', () => {
      const result = engine.getLatest('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('resume', () => {
    it('should build resume state from checkpoints', () => {
      engine.save('task-1', 'plan', { step: 1 });
      engine.save('task-1', 'execution', { step: 2 });
      const resumeState = engine.resume('task-1', ['plan', 'execution', 'verification']);
      expect(resumeState).toBeDefined();
      expect(resumeState.lastCheckpoint).toBeDefined();
      expect(resumeState.pendingSteps).toContain('verification');
    });

    it('should handle task with no checkpoints', () => {
      const resumeState = engine.resume('task-1', ['plan', 'execution']);
      expect(resumeState.lastCheckpoint).toBeNull();
      expect(resumeState.pendingSteps).toEqual(['plan', 'execution']);
    });
  });

  describe('listCheckpoints', () => {
    it('should list all checkpoints for task', () => {
      engine.save('task-1', 'plan', { step: 1 });
      engine.save('task-1', 'execution', { step: 2 });
      engine.save('task-1', 'verification', { step: 3 });
      const checkpoints = engine.listCheckpoints('task-1');
      expect(checkpoints).toHaveLength(3);
    });

    it('should return empty array for non-existent task', () => {
      const checkpoints = engine.listCheckpoints('non-existent');
      expect(checkpoints).toEqual([]);
    });

    it('should return checkpoint summaries', () => {
      engine.save('task-1', 'plan', { step: 1 });
      const checkpoints = engine.listCheckpoints('task-1');
      expect(checkpoints[0]).toHaveProperty('id');
      expect(checkpoints[0]).toHaveProperty('type');
      expect(checkpoints[0]).toHaveProperty('version');
      expect(checkpoints[0]).toHaveProperty('createdAt');
      expect(checkpoints[0]).toHaveProperty('description');
    });
  });

  describe('createCheckpointEngine', () => {
    it('should create engine instance', () => {
      const engine = createCheckpointEngine();
      expect(engine).toBeInstanceOf(CheckpointEngine);
    });
  });
});
