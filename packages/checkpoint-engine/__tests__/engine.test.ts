import { CheckpointEngine, createCheckpointEngine } from '../src/index';

describe('CheckpointEngine (integration)', () => {
  const engine = createCheckpointEngine();

  it('saves checkpoints through engine', () => {
    const cp = engine.save('task-e1', 'plan', { goal: 'test' });
    expect(cp.id).toBeTruthy();
  });

  it('builds resume state', () => {
    engine.save('task-e2', 'execution', { completedSteps: ['s1', 's2'] });

    const state = engine.resume('task-e2', ['s1', 's2', 's3', 's4']);
    expect(state.completedSteps).toContain('s1');
    expect(state.pendingSteps).toContain('s3');
    expect(state.resumedFrom).toContain('checkpoint_');
  });

  it('returns empty resume when no checkpoints exist', () => {
    const state = engine.resume('task-none', ['s1']);
    expect(state.lastCheckpoint).toBeNull();
    expect(state.resumedFrom).toBe('start');
  });

  it('lists checkpoints', () => {
    engine.save('task-list-cp', 'plan', {});
    engine.save('task-list-cp', 'execution', {});
    const list = engine.listCheckpoints('task-list-cp');
    expect(list.length).toBeGreaterThanOrEqual(2);
  });
});
