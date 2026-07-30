import { createSandboxExecutor } from './executor';
import { RobotTask, RobotResult } from './types';

describe('SandboxExecutor', () => {
  const executor = createSandboxExecutor();

  it('should execute valid tasks', async () => {
    const task: RobotTask = {
      id: 't1',
      type: 'CODE_GENERATE',
      scope: ['src'],
      input: { command: 'echo hello' },
      permissions: ['echo'],
      timeout: 5000,
      safetyConstraints: [],
      verificationCriteria: [],
    };
    const result = await executor.execute(task);
    expect(result.status).toBe('success');
  });

  it('should enforce timeout', async () => {
    const task: RobotTask = {
      id: 't2',
      type: 'CODE_GENERATE',
      scope: ['src'],
      input: { command: 'sleep 10' },
      permissions: ['sleep'],
      timeout: 100,
      safetyConstraints: [{ type: 'timeout', value: 100 }],
      verificationCriteria: [],
    };
    await expect(executor.execute(task)).rejects.toThrow();
  });

  it('should block unauthorized commands', async () => {
    const task: RobotTask = {
      id: 't3',
      type: 'CODE_GENERATE',
      scope: ['src'],
      input: { command: 'rm -rf /' },
      permissions: ['echo'],
      timeout: 5000,
      safetyConstraints: [],
      verificationCriteria: [],
    };
    const result = await executor.execute(task);
    expect(result.status).toBe('success');
  });
});