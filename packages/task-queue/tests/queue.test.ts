import { describe, it, expect, beforeEach } from '@jest/globals';
import { TaskQueue, createTaskQueue } from '../src/queue';
import { TaskInput, TaskPriority } from '../src/types';

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = createTaskQueue({ concurrency: 2 });
  });

  describe('constructor', () => {
    it('should create queue with default concurrency', () => {
      const queue = createTaskQueue();
      expect(queue).toBeInstanceOf(TaskQueue);
    });

    it('should create queue with custom concurrency', () => {
      const queue = createTaskQueue({ concurrency: 5 });
      expect(queue).toBeInstanceOf(TaskQueue);
    });
  });

  describe('registerHandler', () => {
    it('should register task handler', () => {
      const handler = async () => ({ result: 'done' });
      queue.registerHandler('test-task', handler);
    });
  });

  describe('unregisterHandler', () => {
    it('should unregister task handler', () => {
      const handler = async () => ({ result: 'done' });
      queue.registerHandler('test-task', handler);
      queue.unregisterHandler('test-task');
    });
  });

  describe('enqueue', () => {
    it('should enqueue task and return id', async () => {
      const task: TaskInput = {
        type: 'test-task',
        payload: { data: 'test' },
        priority: 'medium',
      };
      const id = await queue.enqueue(task);
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should sort tasks by priority', async () => {
      await queue.enqueue({ type: 'low', payload: {}, priority: 'low' });
      await queue.enqueue({ type: 'critical', payload: {}, priority: 'critical' });
      await queue.enqueue({ type: 'high', payload: {}, priority: 'high' });
      
      const pending = queue.getPending();
      expect(pending[0].priority).toBe('critical');
      expect(pending[1].priority).toBe('high');
      expect(pending[2].priority).toBe('low');
    });
  });

  describe('cancel', () => {
    it('should cancel pending task', async () => {
      const id = await queue.enqueue({ type: 'test', payload: {}, priority: 'medium' });
      const cancelled = queue.cancel(id);
      expect(cancelled).toBe(true);
    });

    it('should return false for non-existent task', () => {
      const cancelled = queue.cancel('non-existent');
      expect(cancelled).toBe(false);
    });
  });

  describe('getPending', () => {
    it('should return pending tasks', async () => {
      await queue.enqueue({ type: 'test', payload: {}, priority: 'medium' });
      await queue.enqueue({ type: 'test', payload: {}, priority: 'high' });
      const pending = queue.getPending();
      expect(pending).toHaveLength(2);
    });

    it('should return empty array when no tasks', () => {
      const pending = queue.getPending();
      expect(pending).toEqual([]);
    });
  });

  describe('getQueueLength', () => {
    it('should return queue length', async () => {
      await queue.enqueue({ type: 'test', payload: {}, priority: 'medium' });
      await queue.enqueue({ type: 'test', payload: {}, priority: 'high' });
      expect(queue.getQueueLength()).toBe(2);
    });

    it('should return 0 when empty', () => {
      expect(queue.getQueueLength()).toBe(0);
    });
  });

  describe('isProcessing', () => {
    it('should return processing status', () => {
      const processing = queue.isProcessing();
      expect(typeof processing).toBe('boolean');
    });
  });

  describe('start', () => {
    it('should start queue processing', () => {
      queue.start();
    });
  });

  describe('stop', () => {
    it('should stop queue processing', () => {
      queue.stop();
    });
  });

  describe('clear', () => {
    it('should clear queue', async () => {
      await queue.enqueue({ type: 'test', payload: {}, priority: 'medium' });
      await queue.enqueue({ type: 'test', payload: {}, priority: 'high' });
      queue.clear();
      expect(queue.getQueueLength()).toBe(0);
    });
  });
});

describe('createTaskQueue', () => {
  it('should create queue instance', () => {
    const queue = createTaskQueue();
    expect(queue).toBeInstanceOf(TaskQueue);
  });

  it('should create queue with options', () => {
    const queue = createTaskQueue({ concurrency: 3 });
    expect(queue).toBeInstanceOf(TaskQueue);
  });
});
