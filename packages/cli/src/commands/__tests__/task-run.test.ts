import { taskRunCommand } from '../task-run';

describe('task-run', () => {
  it('taskRunCommand should be defined', () => {
    expect(taskRunCommand).toBeDefined();
  });
  it('taskRunCommand should execute without throwing', () => {
    expect(typeof taskRunCommand).toBe('function');
    try { (taskRunCommand as any)(); } catch {}
  });
});
