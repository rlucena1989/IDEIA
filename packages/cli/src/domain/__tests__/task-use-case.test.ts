import { TaskUseCase } from '../task-use-case';

describe('TaskUseCase', () => {
  let useCase: TaskUseCase;

  beforeEach(() => {
    useCase = new TaskUseCase();
  });

  it('createTask returns task with id', () => {
    const result = useCase.createTask('Test task', 'A test task', 2, ['test', 'demo']);
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.id).toMatch(/^task_/);
    expect(result.data!.name).toBe('Test task');
    expect(result.data!.description).toBe('A test task');
    expect(result.data!.priority).toBe(2);
    expect(result.data!.tags).toEqual(['test', 'demo']);
    expect(result.data!.status).toBe('pending');
    expect(result.data!.createdAt).toBeDefined();
  });

  it('listTasks returns created tasks', () => {
    useCase.createTask('Task 1', 'desc 1', 1, []);
    useCase.createTask('Task 2', 'desc 2', 3, []);
    const result = useCase.listTasks();
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.tasks).toHaveLength(2);
    expect(result.data!.total).toBe(2);
  });

  it('getTask returns specific task', () => {
    const created = useCase.createTask('My task', 'a desc', 1, []);
    const result = useCase.getTask(created.data!.id);
    expect(result.ok).toBe(true);
    expect(result.data!.name).toBe('My task');
  });

  it('updateTaskStatus modifies task status', () => {
    const created = useCase.createTask('Updatable', 'desc', 1, []);
    const result = useCase.updateTaskStatus(created.data!.id, 'running');
    expect(result.ok).toBe(true);
    expect(result.data!.status).toBe('running');
    const fetched = useCase.getTask(created.data!.id);
    expect(fetched.data!.status).toBe('running');
  });

  it('deleteTask removes task', () => {
    const created = useCase.createTask('To delete', 'desc', 1, []);
    const delResult = useCase.deleteTask(created.data!.id);
    expect(delResult.ok).toBe(true);
    const getResult = useCase.getTask(created.data!.id);
    expect(getResult.ok).toBe(false);
  });

  it('getTask on non-existent returns failure', () => {
    const result = useCase.getTask('non-existent');
    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
  });
});
