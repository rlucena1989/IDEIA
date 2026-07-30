import { TaskQueue, createTaskQueue } from '../src/queue';
import { TaskHandler } from '../src/types';

describe('TaskQueue Extended', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue({ concurrency: 2 });
    queue.start();
  });

  afterEach(() => {
    queue.stop();
    queue.clear();
  });

  it('should process tasks in priority order', async () => {
    queue.stop();
    const order: string[] = [];
    const handler: TaskHandler = async (_task) => { order.push(_task.priority); };
    queue.registerHandler('prio', handler);

    await queue.enqueue({ type: 'prio', payload: {}, priority: 'low' });
    await queue.enqueue({ type: 'prio', payload: {}, priority: 'critical' });
    await queue.enqueue({ type: 'prio', payload: {}, priority: 'high' });
    await queue.enqueue({ type: 'prio', payload: {}, priority: 'medium' });

    queue.start();
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(order[0]).toBe('critical');
    expect(order[1]).toBe('high');
  });

  it('should handle missing handler gracefully', async () => {
    const id = await queue.enqueue({ type: 'no-handler', payload: {}, priority: 'medium' });
    expect(id).toBeTruthy();
    await new Promise(resolve => setTimeout(resolve, 100));
    const pending = queue.getPending();
    expect(pending.length).toBe(0);
  });

  it('should not process when stopped', async () => {
    queue.stop();
    const handler: TaskHandler = async (_task) => 'done';
    queue.registerHandler('stop-test', handler);
    await queue.enqueue({ type: 'stop-test', payload: {}, priority: 'medium' });
    expect(queue.getPending().length).toBe(1);
    queue.start();
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(queue.getPending().length).toBe(0);
  });

  it('should clear all pending tasks', async () => {
    queue.stop();
    const handler: TaskHandler = async (_task) => 'done';
    queue.registerHandler('clear-test', handler);
    await queue.enqueue({ type: 'clear-test', payload: {}, priority: 'low' });
    await queue.enqueue({ type: 'clear-test', payload: {}, priority: 'medium' });
    expect(queue.getQueueLength()).toBe(2);
    queue.clear();
    expect(queue.getQueueLength()).toBe(0);
  });

  it('should cancel pending task by id', async () => {
    queue.stop();
    const handler: TaskHandler = async (_task) => 'done';
    queue.registerHandler('cancel-test', handler);
    const id1 = await queue.enqueue({ type: 'cancel-test', payload: {}, priority: 'low' });
    await queue.enqueue({ type: 'cancel-test', payload: {}, priority: 'medium' });
    const cancelled = queue.cancel(id1);
    expect(cancelled).toBe(true);
    expect(queue.getPending().length).toBe(1);
  });

  it('should return false when cancelling non-existent task', () => {
    expect(queue.cancel('non-existent')).toBe(false);
  });

  it('should emit enqueued event', (done) => {
    const handler: TaskHandler = async (_task) => 'ok';
    queue.registerHandler('emit-test', handler);
    queue.on('enqueued', (_task) => {
      expect(_task.type).toBe('emit-test');
      done();
    });
    queue.enqueue({ type: 'emit-test', payload: {}, priority: 'low' });
  });

  it('should create queue via factory function', () => {
    const q = createTaskQueue({ concurrency: 5 });
    expect(q).toBeInstanceOf(TaskQueue);
  });

  it('should handle concurrent execution within limit', async () => {
    let running = 0;
    let maxRunning = 0;
    const handler: TaskHandler = async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise(resolve => setTimeout(resolve, 50));
      running--;
    };
    queue = new TaskQueue({ concurrency: 3 });
    queue.registerHandler('conc', handler);
    queue.start();

    await queue.enqueue({ type: 'conc', payload: {}, priority: 'medium' });
    await queue.enqueue({ type: 'conc', payload: {}, priority: 'medium' });
    await queue.enqueue({ type: 'conc', payload: {}, priority: 'medium' });
    await queue.enqueue({ type: 'conc', payload: {}, priority: 'medium' });

    await new Promise(resolve => setTimeout(resolve, 300));
    expect(maxRunning).toBeLessThanOrEqual(3);
  });

  it('should report isProcessing correctly', async () => {
    const handler: TaskHandler = async () => new Promise(resolve => setTimeout(resolve, 50));
    queue.registerHandler('proc', handler);
    expect(queue.isProcessing()).toBe(false);
    await queue.enqueue({ type: 'proc', payload: {}, priority: 'high' });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(queue.isProcessing()).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it('should handle task retry with maxRetries option', async () => {
    let attempts = 0;
    const handler: TaskHandler = async () => {
      attempts++;
      throw new Error('transient');
    };
    queue.registerHandler('retry', handler);
    await queue.enqueue({ type: 'retry', payload: {}, priority: 'low', maxRetries: 1 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(attempts).toBe(2);
  });
});