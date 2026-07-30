import { LocalTaskEngine, type Task } from '../task-engine';

describe('LocalTaskEngine', () => {
  let engine: LocalTaskEngine;

  beforeEach(() => {
    engine = new LocalTaskEngine();
  });

  it('should run a task and return result', async () => {
    const task: Task = { id: 't1', type: 'test', input: { value: 1 } };
    const result = await engine.run(task);
    expect(result.ok).toBe(true);
    expect(result.taskId).toBe('t1');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should report pending status for unknown task', () => {
    expect(engine.status('nonexistent')).toBe('pending');
  });

  it('should report completed status after successful run', async () => {
    const task: Task = { id: 't2', type: 'test', input: {} };
    await engine.run(task);
    expect(engine.status('t2')).toBe('completed');
  });

  it('should cancel a task before it runs', async () => {
    await engine.cancel('t3');
    expect(engine.status('t3')).toBe('cancelled');
  });
});
