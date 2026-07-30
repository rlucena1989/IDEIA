import {
  createFileSystemRoutes,
  createTerminalSessionRoutes,
  createPreviewRoutes,
  createApprovalRoutes,
  createMemoryRoutes,
  createStatusRoutes,
  createTaskRoutes,
  createProviderRoutes,
  createWorkspaceRoutes,
  createGitRoutes,
  createDiagnosticsRoutes,
  createMiscRoutes,
} from '../api-router-routes';

function makeCtx(overrides: Record<string, unknown> = {}): any {
  return {
    root: '/test',
    fileBridge: {
      listDir: jest.fn().mockResolvedValue([]),
      readFile: jest.fn().mockResolvedValue({ content: '', binary: false }),
      writeFile: jest.fn().mockResolvedValue(undefined),
      createDir: jest.fn().mockResolvedValue(undefined),
      createFile: jest.fn().mockResolvedValue(undefined),
      rename: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      searchFiles: jest.fn().mockResolvedValue([]),
    },
    terminalBridge: {
      classifyCommand: jest.fn().mockReturnValue('safe'),
      execute: jest.fn().mockResolvedValue({ ok: true, output: 'done', error: '', code: 0, durationMs: 10 }),
      executeHighRisk: jest.fn().mockResolvedValue({ ok: true, output: '', error: '', code: 0, durationMs: 5 }),
      getHistory: jest.fn().mockReturnValue([]),
    },
    memoryStore: {
      count: jest.fn().mockReturnValue(5),
      list: jest.fn().mockReturnValue([]),
      append: jest.fn(),
    },
    session: null,
    commands: [{ name: 'test', description: 'a command' }],
    getSession: jest.fn().mockReturnValue({ session_id: 'sess-001', policy: 'ask', workspace_root: '/test', active_tasks: [] }),
    auditTrail: {
      append: jest.fn(),
      count: jest.fn().mockReturnValue(10),
      load: jest.fn().mockReturnValue([]),
    },
    agentRuntime: {
      run: jest.fn().mockReturnValue({ decision: 'auto', actionId: 'a1' }),
      confirmExecution: jest.fn(),
    },
    broadcast: jest.fn(),
    ...overrides,
  };
}

describe('createFileSystemRoutes', () => {
  it('returns all expected FS route keys', () => {
    const routes = createFileSystemRoutes(makeCtx());
    const keys = Object.keys(routes).sort();
    expect(keys).toEqual([
      'DELETE /api/fs/delete',
      'GET /api/fs/list',
      'GET /api/fs/read',
      'GET /api/fs/search',
      'PATCH /api/fs/rename',
      'POST /api/fs/create',
      'POST /api/fs/write',
    ]);
  });

  it('each route handler is a function', () => {
    const routes = createFileSystemRoutes(makeCtx());
    for (const [key, handler] of Object.entries(routes)) {
      expect(typeof handler).toBe('function');
    }
  });
});

describe('createTerminalSessionRoutes', () => {
  it('returns expected terminal/session route keys', () => {
    const routes = createTerminalSessionRoutes(makeCtx());
    expect(Object.keys(routes).sort()).toEqual([
      'GET /api/commands',
      'GET /api/session',
      'POST /api/session',
      'POST /api/shell',
    ]);
  });
});

describe('createPreviewRoutes', () => {
  it('returns expected preview route keys', () => {
    const routes = createPreviewRoutes(makeCtx());
    expect(Object.keys(routes).sort()).toEqual([
      'GET /api/preview/file',
      'GET /api/preview/report',
      'POST /api/preview/approve',
      'POST /api/preview/reject',
    ]);
  });
});

describe('createApprovalRoutes', () => {
  it('returns expected approval route keys', () => {
    const routes = createApprovalRoutes(makeCtx());
    expect(Object.keys(routes).sort()).toEqual([
      'POST /api/approval/request',
      'POST /api/approval/respond',
    ]);
  });
});

describe('createMemoryRoutes', () => {
  it('returns expected memory route keys', () => {
    const routes = createMemoryRoutes(makeCtx());
    expect(Object.keys(routes).sort()).toEqual([
      'GET /api/memory',
      'POST /api/memory',
    ]);
  });
});

describe('createStatusRoutes', () => {
  it('returns expected status route keys', () => {
    const routes = createStatusRoutes(makeCtx());
    expect(Object.keys(routes).sort()).toEqual([
      'GET /api/audit',
      'GET /api/health',
      'GET /api/ide/status',
      'GET /api/quality',
    ]);
  });
});

describe('createTaskRoutes', () => {
  it('returns expected task route keys', () => {
    const routes = createTaskRoutes(makeCtx());
    expect(Object.keys(routes).sort()).toEqual([
      'GET /api/tasks',
      'PATCH /api/tasks/:id',
      'POST /api/tasks',
    ]);
  });
});

describe('createProviderRoutes', () => {
  it('returns expected provider route keys', () => {
    const routes = createProviderRoutes(makeCtx());
    expect(Object.keys(routes).sort()).toEqual([
      'GET /api/settings/providers',
      'POST /api/settings/providers/config',
      'POST /api/settings/providers/priority',
    ]);
  });
});

describe('createWorkspaceRoutes', () => {
  it('returns expected workspace route keys', () => {
    const routes = createWorkspaceRoutes(makeCtx());
    expect(Object.keys(routes).sort()).toEqual([
      'GET /api/workspace/config',
      'POST /api/workspace/config',
    ]);
  });
});

describe('createGitRoutes', () => {
  it('returns expected git route keys', () => {
    const routes = createGitRoutes(makeCtx());
    expect(Object.keys(routes).sort()).toEqual([
      'GET /api/git/branch/compare',
      'GET /api/git/diff',
      'GET /api/git/status',
    ]);
  });
});

describe('createDiagnosticsRoutes', () => {
  it('returns expected diagnostics route key', () => {
    const routes = createDiagnosticsRoutes(makeCtx());
    expect(Object.keys(routes)).toEqual(['GET /api/diagnostics']);
  });
});

describe('createMiscRoutes', () => {
  it('returns expected misc route keys', () => {
    const routes = createMiscRoutes(makeCtx());
    expect(Object.keys(routes).sort()).toEqual([
      'GET /api/control/status',
      'GET /api/self/status',
      'POST /api/control/command',
      'POST /api/sandbox/exec',
    ]);
  });
});

describe('Status routes - GET /api/ide/status', () => {
  it('returns status with session, memory, terminal info', async () => {
    const ctx = makeCtx();
    const routes = createStatusRoutes(ctx);
    const handler = routes['GET /api/ide/status'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, {} as any);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    const sentData = JSON.parse(res.end.mock.calls[0][0]);
    expect(sentData.ok).toBe(true);
    expect(sentData.version).toBe('0.1.0');
    expect(sentData.session).toBe('sess-001');
    expect(sentData.memoryCount).toBe(5);
  });
});

describe('Status routes - GET /api/health', () => {
  it('returns health check with filesystem, memory, audit, terminal', async () => {
    const ctx = makeCtx();
    const routes = createStatusRoutes(ctx);
    const handler = routes['GET /api/health'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, {} as any);

    const sentData = JSON.parse(res.end.mock.calls[0][0]);
    expect(sentData.status).toBe('healthy');
    expect(sentData.checks.filesystem).toBeDefined();
    expect(sentData.checks.memory).toBeDefined();
    expect(sentData.checks.audit).toBeDefined();
    expect(sentData.checks.terminal).toBeDefined();
    expect(sentData.version).toBe('0.1.0');
    expect(sentData.memory).toBeDefined();
    expect(sentData.memory.unit).toBe('MB');
  });

  it('reports degraded when fileBridge throws', async () => {
    const ctx = makeCtx({ fileBridge: { listDir: jest.fn().mockImplementation(() => { throw new Error('fail'); }) } });
    const routes = createStatusRoutes(ctx);
    const handler = routes['GET /api/health'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, {} as any);

    const sentData = JSON.parse(res.end.mock.calls[0][0]);
    expect(sentData.status).toBe('degraded');
  });
});

describe('Status routes - GET /api/quality', () => {
  it('returns 7 quality dimensions with scores', async () => {
    const routes = createStatusRoutes(makeCtx());
    const handler = routes['GET /api/quality'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, {} as any);

    const sentData = JSON.parse(res.end.mock.calls[0][0]);
    expect(sentData.dimensions).toHaveLength(7);
    expect(sentData.overallScore).toBe(75);
  });
});

describe('Memory routes - GET /api/memory', () => {
  it('returns memory records from store', async () => {
    const ctx = makeCtx({ memoryStore: { list: jest.fn().mockReturnValue([{ id: 'm1' }]), count: jest.fn().mockReturnValue(1) } });
    const routes = createMemoryRoutes(ctx);
    const handler = routes['GET /api/memory'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, {} as any);

    const sentData = JSON.parse(res.end.mock.calls[0][0]);
    expect(sentData.ok).toBe(true);
    expect(sentData.records).toEqual([{ id: 'm1' }]);
  });
});

describe('Status routes - GET /api/audit', () => {
  it('returns audit events', async () => {
    const ctx = makeCtx({ auditTrail: { load: jest.fn().mockReturnValue([{ event: 'e1' }]), count: jest.fn().mockReturnValue(1) } });
    const routes = createStatusRoutes(ctx);
    const handler = routes['GET /api/audit'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, {} as any);

    const sentData = JSON.parse(res.end.mock.calls[0][0]);
    expect(sentData.ok).toBe(true);
    expect(sentData.events).toEqual([{ event: 'e1' }]);
  });

  it('handles load errors gracefully', async () => {
    const ctx = makeCtx({ auditTrail: { load: jest.fn().mockImplementation(() => { throw new Error('load fail'); }), count: jest.fn().mockReturnValue(0) } });
    const routes = createStatusRoutes(ctx);
    const handler = routes['GET /api/audit'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, {} as any);

    const sentData = JSON.parse(res.end.mock.calls[0][0]);
    expect(sentData.ok).toBe(false);
  });
});

describe('Misc routes - GET /api/control/status', () => {
  it('returns control status with defaults', async () => {
    const routes = createMiscRoutes(makeCtx());
    const handler = routes['GET /api/control/status'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, {} as any);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.autonomyLevel).toBe('supervised');
    expect(data.safetyBreaker).toBe('closed');
  });
});

describe('Misc routes - POST /api/control/command', () => {
  it('acknowledges control commands', async () => {
    const routes = createMiscRoutes(makeCtx());
    const handler = routes['POST /api/control/command'];

    const req = new (require('node:events').EventEmitter)() as any;
    process.nextTick(() => { req.emit('data', Buffer.from('{"command":"restart"}')); req.emit('end'); });
    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler(req, res as any, {} as any);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.ok).toBe(true);
    expect(data.command).toBe('restart');
  });
});

describe('Misc routes - GET /api/self/status', () => {
  it('returns self status with metrics', async () => {
    const routes = createMiscRoutes(makeCtx());
    const handler = routes['GET /api/self/status'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, {} as any);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.enabled).toBe(true);
    expect(data.metrics).toEqual({ codeQuality: 85, testCoverage: 30, performance: 70, security: 90 });
  });
});

describe('Task routes - GET /api/tasks', () => {
  it('returns empty tasks when no active session', async () => {
    const routes = createTaskRoutes(makeCtx({ session: null, getSession: jest.fn().mockReturnValue({ active_tasks: [] }) }));
    const handler = routes['GET /api/tasks'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, {} as any);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.ok).toBe(true);
    expect(data.tasks).toEqual([]);
  });

  it('maps active tasks from session', async () => {
    const routes = createTaskRoutes(makeCtx({
      session: { active_tasks: ['build', 'test'] },
    }));
    const handler = routes['GET /api/tasks'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, {} as any);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.tasks).toHaveLength(2);
    expect(data.tasks[0].title).toBe('build');
    expect(data.tasks[0].status).toBe('running');
  });
});

describe('Git routes - GET /api/git/diff sanitization', () => {
  it('returns ok even when git is not available', async () => {
    const ctx = makeCtx();
    const routes = createGitRoutes(ctx);
    const handler = routes['GET /api/git/diff'];

    const parsed = { query: { file: 'src/index.ts' } } as any;
    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, parsed);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.ok).toBe(true);
  });

  it('handles missing diff gracefully', async () => {
    const ctx = makeCtx();
    const routes = createGitRoutes(ctx);
    const handler = routes['GET /api/git/diff'];

    const parsed = { query: {} } as any;
    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, parsed);

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
  });
});
