import { createFsRoutes } from '../fs-routes';

function makeCtx(overrides: Record<string, unknown> = {}): any {
  return {
    root: '/test',
    fileBridge: {
      listDir: jest.fn().mockResolvedValue([]),
      readFile: jest.fn().mockResolvedValue({ content: 'data', binary: false }),
      writeFile: jest.fn().mockResolvedValue(undefined),
      createDir: jest.fn().mockResolvedValue(undefined),
      createFile: jest.fn().mockResolvedValue(undefined),
      rename: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      searchFiles: jest.fn().mockResolvedValue([]),
    },
    agentRuntime: {
      run: jest.fn().mockReturnValue({ decision: 'auto', actionId: 'a1' }),
      confirmExecution: jest.fn(),
    },
    ...overrides,
  };
}

describe('createFsRoutes', () => {
  it('returns all expected FS route keys', () => {
    const routes = createFsRoutes(makeCtx());
    expect(Object.keys(routes).sort()).toEqual([
      'DELETE /api/fs/delete',
      'GET /api/fs/list',
      'GET /api/fs/read',
      'GET /api/fs/search',
      'PATCH /api/fs/rename',
      'POST /api/fs/create',
      'POST /api/fs/write',
    ]);
  });

  it('each route is a function', () => {
    const routes = createFsRoutes(makeCtx());
    for (const handler of Object.values(routes)) {
      expect(typeof handler).toBe('function');
    }
  });
});

describe('GET /api/fs/list handler', () => {
  it('calls fileBridge.listDir with path from query', async () => {
    const listDir = jest.fn().mockResolvedValue([{ name: 'f.txt' }]);
    const ctx = makeCtx({ fileBridge: { ...makeCtx().fileBridge, listDir } });
    const routes = createFsRoutes(ctx);
    const handler = routes['GET /api/fs/list'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    const parsed = { query: { path: 'subdir' } } as any;

    await handler({} as any, res as any, parsed);

    expect(listDir).toHaveBeenCalledWith('subdir');
    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.ok).toBe(true);
    expect(data.entries).toEqual([{ name: 'f.txt' }]);
  });

  it('defaults path to empty string when not provided', async () => {
    const listDir = jest.fn().mockResolvedValue([]);
    const ctx = makeCtx({ fileBridge: { ...makeCtx().fileBridge, listDir } });
    const routes = createFsRoutes(ctx);
    const handler = routes['GET /api/fs/list'];

    const res = { writeHead: jest.fn(), end: jest.fn() };

    await handler({} as any, res as any, { query: {} } as any);

    expect(listDir).toHaveBeenCalledWith('');
  });
});

describe('GET /api/fs/read handler', () => {
  it('returns error when path is missing', async () => {
    const routes = createFsRoutes(makeCtx());
    const handler = routes['GET /api/fs/read'];

    const res = { writeHead: jest.fn(), end: jest.fn() };

    await handler({} as any, res as any, { query: {} } as any);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('path required');
  });

  it('calls fileBridge.readFile with path', async () => {
    const readFile = jest.fn().mockResolvedValue({ content: 'hello', binary: false });
    const ctx = makeCtx({ fileBridge: { ...makeCtx().fileBridge, readFile } });
    const routes = createFsRoutes(ctx);
    const handler = routes['GET /api/fs/read'];

    const res = { writeHead: jest.fn(), end: jest.fn() };

    await handler({} as any, res as any, { query: { path: 'file.txt' } } as any);

    expect(readFile).toHaveBeenCalledWith('file.txt');
    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.content).toBe('hello');
    expect(data.binary).toBe(false);
  });
});

describe('GET /api/fs/search handler', () => {
  it('returns error when query is missing', async () => {
    const routes = createFsRoutes(makeCtx());
    const handler = routes['GET /api/fs/search'];

    const res = { writeHead: jest.fn(), end: jest.fn() };

    await handler({} as any, res as any, { query: {} } as any);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('query required');
  });

  it('calls fileBridge.searchFiles with pattern', async () => {
    const searchFiles = jest.fn().mockResolvedValue(['a.js', 'b.js']);
    const ctx = makeCtx({ fileBridge: { ...makeCtx().fileBridge, searchFiles } });
    const routes = createFsRoutes(ctx);
    const handler = routes['GET /api/fs/search'];

    const res = { writeHead: jest.fn(), end: jest.fn() };

    await handler({} as any, res as any, { query: { q: 'pattern' } } as any);

    expect(searchFiles).toHaveBeenCalledWith('pattern');
    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.results).toEqual(['a.js', 'b.js']);
  });
});

describe('DELETE /api/fs/delete handler', () => {
  it('returns error when path is missing', async () => {
    const routes = createFsRoutes(makeCtx());
    const handler = routes['DELETE /api/fs/delete'];

    const res = { writeHead: jest.fn(), end: jest.fn() };

    await handler({} as any, res as any, { query: {} } as any);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('path required');
  });

  it('calls withAgent and fileBridge.delete', async () => {
    const del = jest.fn().mockResolvedValue(undefined);
    const run = jest.fn().mockReturnValue({ decision: 'auto', actionId: 'a1' });
    const ctx = makeCtx({
      fileBridge: { ...makeCtx().fileBridge, delete: del },
      agentRuntime: { run, confirmExecution: jest.fn() },
    });
    const routes = createFsRoutes(ctx);
    const handler = routes['DELETE /api/fs/delete'];

    const res = { writeHead: jest.fn(), end: jest.fn() };

    await handler({} as any, res as any, { query: { path: 'file.ts' } } as any);

    expect(run).toHaveBeenCalledWith(expect.objectContaining({ actionType: 'file.delete', riskLevel: 'medium' }));
    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.ok).toBe(true);
  });
});
