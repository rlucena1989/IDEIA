import { createSession, saveState, loadState, listSessionIds, logAction, setCheckpoint, resumeSession, completeSession, failSession } from '../runtime/agent-runtime';

describe('agent-runtime', () => {
  const _testCleanup = (): void => { try { const fs = require('fs'), path = require('path'); const dir = path.join(process.cwd(), '.ai/optimizer/runtime/agents'); if (fs.existsSync(dir)) { const files = fs.readdirSync(dir).filter((f: string) => f.startsWith('test-')); files.forEach((f: string) => fs.rmSync(path.join(dir, f))); } } catch {} };

  it('createSession creates valid state', () => {
    const state = createSession('task-1', 5, 'planning');
    expect(state.sessionId).toBeDefined();
    expect(state.taskId).toBe('task-1');
    expect(state.totalSteps).toBe(5);
    expect(state.step).toBe(0);
    expect(state.phase).toBe('planning');
    expect(state.status).toBe('created');
    expect(state.history).toEqual([]);
  });

  it('saveState and loadState roundtrip', () => {
    const state = createSession('task-2', 3, 'execution');
    saveState(state);
    const loaded = loadState(state.sessionId);
    expect(loaded).not.toBeNull();
    expect(loaded!.sessionId).toBe(state.sessionId);
    expect(loaded!.taskId).toBe('task-2');
  });

  it('loadState returns null for unknown session', () => {
    expect(loadState('nonexistent-id')).toBeNull();
  });

  it('listSessionIds returns session IDs', () => {
    const s1 = createSession('task-a', 2, 'review');
    const s2 = createSession('task-b', 3, 'testing');
    saveState(s1);
    saveState(s2);
    const sessions = listSessionIds();
    expect(sessions.length).toBeGreaterThanOrEqual(2);
    expect(sessions).toContain(s1.sessionId);
    expect(sessions).toContain(s2.sessionId);
  });

  it('logAction adds action to history', () => {
    const state = createSession('task-3', 1, 'execution');
    logAction(state, 'analyze', 'scanner', 'input', 'output', 'success', 150);
    expect(state.history).toHaveLength(1);
    expect(state.history[0].action).toBe('analyze');
    expect(state.history[0].status).toBe('success');
    expect(state.history[0].durationMs).toBe(150);
  });

  it('setCheckpoint creates checkpoint and pauses session', () => {
    const state = createSession('task-4', 5, 'execution');
    setCheckpoint(state, ['file1.ts', 'file2.ts']);
    expect(state.status).toBe('paused');
    expect(state.checkpoint.filesChanged).toEqual(['file1.ts', 'file2.ts']);
    expect(state.checkpoint.hash).toBeDefined();
    expect(state.checkpoint.timestamp).toBeDefined();
  });

  it('resumeSession resumes paused session', () => {
    const state = createSession('task-5', 3, 'execution');
    setCheckpoint(state, ['file.ts']);
    expect(state.status).toBe('paused');
    const resumed = resumeSession(state.sessionId);
    expect(resumed).not.toBeNull();
    expect(resumed!.status).toBe('running');
  });

  it('resumeSession returns null for non-existent session', () => {
    expect(resumeSession('nonexistent')).toBeNull();
  });

  it('resumeSession returns null for created session', () => {
    const state = createSession('task-6', 2, 'planning');
    expect(state.status).toBe('created');
    expect(resumeSession(state.sessionId)).toBeNull();
  });

  it('completeSession marks session as completed', () => {
    const state = createSession('task-7', 3, 'execution');
    completeSession(state);
    expect(state.status).toBe('completed');
    expect(state.step).toBe(3);
  });

  it('failSession marks session as failed with error', () => {
    const state = createSession('task-8', 2, 'execution');
    failSession(state, 'Network error');
    expect(state.status).toBe('failed');
    expect(state.context.lastError).toBe('Network error');
  });
});
