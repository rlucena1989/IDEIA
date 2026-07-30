import fs from 'node:fs';

import {
  saveState,
  loadState,
  listSessionIds,
  createSession,
  logAction,
  setCheckpoint,
  resumeSession,
  completeSession,
  failSession,
} from '../agent-runtime';

const mockFiles = new Map<string, string>();
const mockDirExists = new Set<string>();

jest.mock('node:fs', () => ({
  mkdirSync: jest.fn((dir: string) => { mockDirExists.add(dir); }),
  writeFileSync: jest.fn((path: string, data: string) => { mockFiles.set(path, data); }),
  readFileSync: jest.fn((path: string) => {
    if (!mockFiles.has(path)) throw new Error(`ENOENT: ${path}`);
    return mockFiles.get(path);
  }),
  existsSync: jest.fn((path: string) => mockFiles.has(path) || mockDirExists.has(path)),
  readdirSync: jest.fn((dir: string) => {
    const files: string[] = [];
    for (const key of mockFiles.keys()) {
      if (key.startsWith(dir) && key.endsWith('.json') && !key.includes('ledger')) {
        files.push(key.split(/[/\\]/).pop()!);
      }
    }
    return files;
  }),
  appendFileSync: jest.fn(),
}));

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(() => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'a1b2c3d4e5f6'),
  })),
}));

function resetMockFs(): void {
  mockFiles.clear();
  mockDirExists.clear();
}

describe('agent-runtime', () => {
  beforeEach(() => {
    resetMockFs();
    jest.clearAllMocks();
  });

  describe('createSession()', () => {
    it('should create a new session with created status', () => {
      const session = createSession('task-1', 5, 'development');
      expect(session.sessionId).toBe('aaaaaaaa');
      expect(session.taskId).toBe('task-1');
      expect(session.status).toBe('created');
      expect(session.phase).toBe('development');
      expect(session.totalSteps).toBe(5);
      expect(session.step).toBe(0);
      expect(session.history).toEqual([]);
    });

    it('should persist the session state to disk', () => {
      createSession('task-2', 3, 'testing');
      expect(fs.writeFileSync).toHaveBeenCalled();
      const savedContent = (fs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(savedContent);
      expect(parsed.taskId).toBe('task-2');
      expect(parsed.status).toBe('created');
    });
  });

  describe('saveState() / loadState()', () => {
    it('should save and load state', () => {
      const session = createSession('task-save', 2, 'dev');
      session.status = 'running';
      saveState(session);

      const loaded = loadState(session.sessionId);
      expect(loaded).not.toBeNull();
      expect(loaded!.status).toBe('running');
      expect(loaded!.taskId).toBe('task-save');
    });

    it('should return null for nonexistent session', () => {
      const loaded = loadState('nonexistent');
      expect(loaded).toBeNull();
    });
  });

  describe('listSessionIds()', () => {
    it('should return empty array when no sessions exist', () => {
      const ids = listSessionIds();
      expect(ids).toEqual([]);
    });

    it('should list created session ids', () => {
      createSession('task-list', 1, 'dev');
      const ids = listSessionIds();
      expect(ids).toContain('aaaaaaaa');
    });
  });

  describe('logAction()', () => {
    it('should log an action to session history', () => {
      const session = createSession('task-log', 3, 'coding');
      logAction(session, 'write-file', 'editor', 'src/index.ts', 'file written', 'success', 150);

      expect(session.history).toHaveLength(1);
      expect(session.history[0].action).toBe('write-file');
      expect(session.history[0].tool).toBe('editor');
      expect(session.history[0].status).toBe('success');
      expect(session.history[0].durationMs).toBe(150);
      expect(session.step).toBe(1);
    });

    it('should increment seq for each action', () => {
      const session = createSession('task-seq', 5, 'testing');
      logAction(session, 'action1', 't1', 'i1', 'o1', 'success', 10);
      logAction(session, 'action2', 't2', 'i2', 'o2', 'error', 20);

      expect(session.history[0].seq).toBe(1);
      expect(session.history[1].seq).toBe(2);
    });
  });

  describe('setCheckpoint()', () => {
    it('should set checkpoint and pause the session', () => {
      const session = createSession('task-cp', 4, 'dev');
      setCheckpoint(session, ['src/main.ts', 'src/utils.ts']);

      expect(session.status).toBe('paused');
      expect(session.checkpoint.filesChanged).toEqual(['src/main.ts', 'src/utils.ts']);
      expect(session.checkpoint.hash).toBe('a1b2c3d4e5f6');
    });
  });

  describe('resumeSession()', () => {
    it('should resume a paused session', () => {
      const session = createSession('task-resume', 2, 'dev');
      setCheckpoint(session, ['src/index.ts']);

      const resumed = resumeSession(session.sessionId);
      expect(resumed).not.toBeNull();
      expect(resumed!.status).toBe('running');
    });

    it('should return null for unknown session', () => {
      const resumed = resumeSession('unknown');
      expect(resumed).toBeNull();
    });
  });

  describe('completeSession()', () => {
    it('should mark session as completed', () => {
      const session = createSession('task-complete', 3, 'dev');
      completeSession(session);

      expect(session.status).toBe('completed');
      expect(session.step).toBe(session.totalSteps);
    });
  });

  describe('failSession()', () => {
    it('should mark session as failed with error', () => {
      const session = createSession('task-fail', 2, 'dev');
      failSession(session, 'Something went wrong');

      expect(session.status).toBe('failed');
      expect(session.context.lastError).toBe('Something went wrong');
    });
  });
});
