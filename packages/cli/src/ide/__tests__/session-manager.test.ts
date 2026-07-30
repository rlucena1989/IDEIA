import fs from 'node:fs';
import {
  createSession,
  saveSession,
  loadSession,
  deleteSession,
  listSessions,
  getActiveSession,
  setActiveSession,
  pushDecision,
  updateContext,
  resolvePolicy,
  IdeSession,
} from '../session-manager';

const JSON_STRINGIFY = JSON.stringify;

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  renameSync: jest.fn(),
  unlinkSync: jest.fn(),
  readdirSync: jest.fn(),
}));

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-12345'),
}));

const mockSession: IdeSession = {
  session_id: 'mock-uuid-12345',
  workspace_root: '/tmp/test-workspace',
  policy: 'ask',
  active_tasks: [],
  memory: { last_decisions: [], project_context: {} },
  created_at: '2026-07-23T10:00:00.000Z',
  updated_at: '2026-07-23T10:00:00.000Z',
  metadata: {},
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.policy = 'ask';
  mockSession.memory = { last_decisions: [], project_context: {} };
  (fs.existsSync as jest.Mock).mockImplementation(() => true);
  (fs.readFileSync as jest.Mock).mockImplementation(() => JSON_STRINGIFY(mockSession));
  (fs.readdirSync as jest.Mock).mockReturnValue(['mock-uuid-12345.json']);
});

describe('IdeSession interface', () => {
  it('should have required properties', () => {
    const keys: (keyof IdeSession)[] = ['session_id', 'workspace_root', 'policy', 'active_tasks', 'memory', 'created_at', 'updated_at', 'metadata'];
    for (const key of keys) {
      expect(mockSession).toHaveProperty(key);
    }
  });

  it('should allow valid policy values', () => {
    const validPolicies: IdeSession['policy'][] = ['auto', 'ask', 'block'];
    for (const p of validPolicies) {
      expect(() => { mockSession.policy = p; }).not.toThrow();
    }
  });
});

describe('createSession', () => {
  it('should create a new session with UUID', () => {
    const session = createSession('/tmp/test-workspace');

    expect(session.session_id).toBe('mock-uuid-12345');
    expect(session.workspace_root).toBe('/tmp/test-workspace');
    expect(session.policy).toBe('ask');
    expect(session.active_tasks).toEqual([]);
    expect(session.memory).toEqual({ last_decisions: [], project_context: {} });
    expect(session.created_at).toBeTruthy();
    expect(session.updated_at).toBeTruthy();
    expect(session.metadata).toEqual({});
  });

  it('should save session on creation', () => {
    createSession('/tmp/test-workspace');
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.renameSync).toHaveBeenCalled();
  });

  it('should set active session on creation', () => {
    createSession('/tmp/test-workspace');
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
  });
});

describe('saveSession', () => {
  it('should save session to disk', () => {
    saveSession(mockSession);
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.renameSync).toHaveBeenCalled();
  });

  it('should update updated_at timestamp', () => {
    const original = mockSession.updated_at;
    saveSession(mockSession);
    expect(mockSession.updated_at).not.toBe(original);
  });
});

describe('loadSession', () => {
  it('should load session from disk', () => {
    const session = loadSession('/tmp/test-workspace', 'mock-uuid-12345');
    expect(session).not.toBeNull();
    expect(session?.session_id).toBe('mock-uuid-12345');
  });

  it('should return null if session file does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const session = loadSession('/tmp/test-workspace', 'nonexistent');
    expect(session).toBeNull();
  });

  it('should return null on parse error', () => {
    (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');
    const session = loadSession('/tmp/test-workspace', 'bad-session');
    expect(session).toBeNull();
  });
});

describe('deleteSession', () => {
  it('should delete session file if exists', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    deleteSession('/tmp/test-workspace', 'mock-uuid-12345');
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  it('should not throw if session file does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    expect(() => deleteSession('/tmp/test-workspace', 'nonexistent')).not.toThrow();
  });
});

describe('listSessions', () => {
  it('should list session IDs', () => {
    (fs.readdirSync as jest.Mock).mockReturnValue(['session1.json', 'session2.json']);
    const sessions = listSessions('/tmp/test-workspace');
    expect(sessions).toEqual(['session1', 'session2']);
  });

  it('should filter out active.link file', () => {
    (fs.readdirSync as jest.Mock).mockReturnValue(['session1.json', 'active.link']);
    const sessions = listSessions('/tmp/test-workspace');
    expect(sessions).toEqual(['session1']);
  });

  it('should return empty array if sessions directory does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    expect(listSessions('/tmp/test-workspace')).toEqual([]);
  });
});

describe('getActiveSession', () => {
  it('should return active session', () => {
    const session = getActiveSession('/tmp/test-workspace');
    expect(session).not.toBeNull();
    expect(session?.session_id).toBe('mock-uuid-12345');
  });

  it('should return null if no active link file', () => {
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => !p.includes('active.link'));
    const session = getActiveSession('/tmp/test-workspace');
    expect(session).toBeNull();
  });

  it('should return null on error reading active link', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation(() => { throw new Error('read error'); });
    const session = getActiveSession('/tmp/test-workspace');
    expect(session).toBeNull();
  });
});

describe('setActiveSession', () => {
  it('should set active session link', () => {
    setActiveSession('/tmp/test-workspace', 'mock-uuid-12345');
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('active.link'), 'mock-uuid-12345');
  });
});

describe('pushDecision', () => {
  it('should add decision to session memory', () => {
    const session = { ...mockSession, memory: { ...mockSession.memory, last_decisions: [] as string[] } };
    pushDecision(session, 'Approved file write');
    expect(session.memory.last_decisions).toContain('Approved file write');
  });

  it('should limit decisions to 100 entries', () => {
    const decisions = Array.from({ length: 110 }, (_, i) => `decision-${i}`);
    const session = { ...mockSession, memory: { ...mockSession.memory, last_decisions: decisions } };
    pushDecision(session, 'latest-decision');
    expect(session.memory.last_decisions.length).toBe(100);
    expect(session.memory.last_decisions[session.memory.last_decisions.length - 1]).toBe('latest-decision');
  });
});

describe('updateContext', () => {
  it('should merge context into session', () => {
    const session = { ...mockSession, memory: { ...mockSession.memory, project_context: {} as Record<string, unknown> } };
    updateContext(session, { language: 'typescript' });
    expect(session.memory.project_context).toEqual({ language: 'typescript' });
  });

  it('should not replace existing context keys', () => {
    const session = { ...mockSession, memory: { ...mockSession.memory, project_context: { framework: 'react' } as Record<string, unknown> } };
    updateContext(session, { language: 'typescript' });
    expect(session.memory.project_context).toEqual({ framework: 'react', language: 'typescript' });
  });
});

describe('resolvePolicy', () => {
  it('should return session policy', () => {
    expect(resolvePolicy(mockSession)).toBe('ask');
  });

  it('should return auto for auto policy', () => {
    const autoSession = { ...mockSession, policy: 'auto' as const };
    expect(resolvePolicy(autoSession)).toBe('auto');
  });

  it('should return block for block policy', () => {
    const blockSession = { ...mockSession, policy: 'block' as const };
    expect(resolvePolicy(blockSession)).toBe('block');
  });
});
