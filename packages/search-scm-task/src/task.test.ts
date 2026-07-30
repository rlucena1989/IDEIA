import { DefaultTaskService, NpmTaskProvider, TypeScriptProblemMatcher } from './task';
import { TaskDefinition } from './types';

describe('TypeScriptProblemMatcher', () => {
  const matcher = new TypeScriptProblemMatcher();

  it('matches a standard tsc error line', () => {
    const result = matcher.parseLine('src/index.ts(10,5): error TS2322: Type "number" is not assignable to type "string".');
    expect(result).toEqual({
      file: 'src/index.ts',
      line: 10,
      column: 5,
      severity: 'error',
      code: 'TS2322',
      message: 'Type "number" is not assignable to type "string".',
    });
  });

  it('matches a warning without error code', () => {
    const result = matcher.parseLine('src/util.ts(3,1): warning unused variable');
    expect(result).toEqual({
      file: 'src/util.ts',
      line: 3,
      column: 1,
      severity: 'warning',
      code: undefined,
      message: 'unused variable',
    });
  });

  it('matches an info severity line', () => {
    const result = matcher.parseLine('src/app.ts(1,1): info TS7006: Parameter implicitly has any type.');
    expect(result).toEqual({
      file: 'src/app.ts',
      line: 1,
      column: 1,
      severity: 'info',
      code: 'TS7006',
      message: 'Parameter implicitly has any type.',
    });
  });

  it('returns null for non-matching lines', () => {
    expect(matcher.parseLine('random log output')).toBeNull();
    expect(matcher.parseLine('> project@1.0.0 build')).toBeNull();
    expect(matcher.parseLine('')).toBeNull();
  });

  it('has the correct name', () => {
    expect(matcher.name).toBe('$tsc');
  });
});

describe('DefaultTaskService', () => {
  let service: DefaultTaskService;
  const taskDef: TaskDefinition = { type: 'npm', label: 'build', command: 'npm run build', group: 'build' };

  beforeEach(() => {
    service = new DefaultTaskService();
  });

  it('runs a task and returns a completed execution', async () => {
    const execution = await service.run(taskDef);
    expect(execution.status).toBe('completed');
    expect(execution.exitCode).toBe(0);
    expect(execution.definition).toEqual(taskDef);
    expect(execution.startedAt).toBeInstanceOf(Date);
    expect(execution.completedAt).toBeInstanceOf(Date);
  });

  it('fires onTaskStarted and onTaskCompleted events', async () => {
    const startSpy = jest.fn();
    const completeSpy = jest.fn();
    service.onTaskStarted(startSpy);
    service.onTaskCompleted(completeSpy);

    const execution = await service.run(taskDef);

    expect(startSpy).toHaveBeenCalledWith(execution);
    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(completeSpy).toHaveBeenCalledWith(execution);
    expect(completeSpy).toHaveBeenCalledTimes(1);
  });

  it('cancels a running task', async () => {
    const exec1 = await service.run(taskDef);
    service.cancel(exec1.id);

    expect(service.getRunningTasks()).toHaveLength(0);
  });

  it('cancel does nothing for unknown execution id', () => {
    expect(() => service.cancel('nonexistent')).not.toThrow();
  });

  it('tracks running tasks', async () => {
    expect(service.getRunningTasks()).toHaveLength(0);

    const exec1 = await service.run(taskDef);
    expect(service.getRunningTasks()).toHaveLength(0);
    expect(exec1.status).toBe('completed');
  });
});

describe('NpmTaskProvider', () => {
  it('provides predefined npm tasks', async () => {
    const provider = new NpmTaskProvider();
    const tasks = await provider.provideTasks();

    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toMatchObject({ type: 'npm', label: 'npm run build', command: 'npm run build', group: 'build' });
    expect(tasks[1]).toMatchObject({ type: 'npm', label: 'npm run test', command: 'npm run test', group: 'test' });
    expect(tasks[2]).toMatchObject({ type: 'npm', label: 'npm run lint', command: 'npm run lint', group: 'build' });
  });

  it('includes problem matcher only on build task', async () => {
    const provider = new NpmTaskProvider();
    const tasks = await provider.provideTasks();

    expect(tasks[0].problemMatchers).toEqual(['$tsc']);
    expect(tasks[1].problemMatchers).toBeUndefined();
    expect(tasks[2].problemMatchers).toBeUndefined();
  });
});
