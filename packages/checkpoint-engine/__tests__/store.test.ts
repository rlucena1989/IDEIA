import { CheckpointStore } from '../src/store';

describe('CheckpointStore', () => {
  const store = new CheckpointStore();

  it('saves and retrieves checkpoints', () => {
    const cp = store.save('task-1', 'plan', { goal: 'fix auth', steps: ['s1', 's2'] });
    expect(cp.taskId).toBe('task-1');
    expect(cp.type).toBe('plan');
    expect(cp.version).toBe(1);

    const retrieved = store.get(cp.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.snapshot.goal).toBe('fix auth');
  });

  it('increments version', () => {
    store.save('task-2', 'plan', {});
    const cp2 = store.save('task-2', 'execution', { result: 'done' });
    expect(cp2.version).toBe(2);
  });

  it('gets latest by type', () => {
    store.save('task-3', 'plan', {});
    const exec = store.save('task-3', 'execution', { status: 'running' });
    store.save('task-3', 'verification', { passed: true });

    const latest = store.getLatest('task-3', 'execution');
    expect(latest).toBeDefined();
    expect(latest!.id).toBe(exec.id);
  });

  it('lists checkpoints by task', () => {
    store.save('task-list', 'plan', {});
    store.save('task-list', 'execution', {});
    const list = store.listByTask('task-list');
    expect(list.length).toBe(2);
  });

  it('archives checkpoints', () => {
    const cp = store.save('task-arch', 'plan', {});
    store.archive(cp.id);
    const archived = store.get(cp.id);
    expect(archived!.status).toBe('archived');
  });
});
