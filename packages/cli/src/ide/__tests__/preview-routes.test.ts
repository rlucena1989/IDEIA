import { EventEmitter } from 'node:events';
import type { IncomingMessage } from 'node:http';
import { createPreviewRoutes } from '../preview-routes';

function makeCtx(overrides: Record<string, unknown> = {}): any {
  return {
    root: '/test',
    fileBridge: {
      readFile: jest.fn().mockResolvedValue({ content: 'file content', binary: false }),
    },
    memoryStore: { count: jest.fn().mockReturnValue(5) },
    auditTrail: { append: jest.fn(), count: jest.fn().mockReturnValue(10) },
    session: null,
    getSession: jest.fn().mockReturnValue({ session_id: 'sess-001', policy: 'ask', workspace_root: '/test', active_tasks: [] }),
    broadcast: jest.fn(),
    ...overrides,
  };
}

function makeRequest(body: string): IncomingMessage {
  const req = new EventEmitter() as unknown as IncomingMessage;
  process.nextTick(() => { req.emit('data', Buffer.from(body)); req.emit('end'); });
  return req;
}

describe('createPreviewRoutes', () => {
  it('returns all expected preview route keys', () => {
    const routes = createPreviewRoutes(makeCtx());
    expect(Object.keys(routes).sort()).toEqual([
      'GET /api/preview/file',
      'GET /api/preview/report',
      'POST /api/preview/approve',
      'POST /api/preview/reject',
    ]);
  });

  it('each route is a function', () => {
    const routes = createPreviewRoutes(makeCtx());
    for (const handler of Object.values(routes)) {
      expect(typeof handler).toBe('function');
    }
  });
});

describe('GET /api/preview/report', () => {
  it('returns report with session summary even without git', async () => {
    const routes = createPreviewRoutes(makeCtx());
    const handler = routes['GET /api/preview/report'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, {} as any);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.ok).toBe(true);
    expect(data.report).toBeDefined();
    expect(data.report.totalFiles).toBe(0);
    expect(data.report.score).toBe(0);
    expect(data.report.summary).toContain('sess-001');
    expect(data.changes).toEqual([]);
  });

  it('includes memory and audit counts', async () => {
    const routes = createPreviewRoutes(makeCtx({
      memoryStore: { count: jest.fn().mockReturnValue(42) },
      auditTrail: { append: jest.fn(), count: jest.fn().mockReturnValue(99) },
    }));
    const handler = routes['GET /api/preview/report'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, {} as any);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.report.summary).toContain('Memory: 42');
    expect(data.report.summary).toContain('Audit: 99');
  });
});

describe('GET /api/preview/file', () => {
  it('returns error when path is missing', async () => {
    const routes = createPreviewRoutes(makeCtx());
    const handler = routes['GET /api/preview/file'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, { query: {} } as any);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('path required');
  });

  it('returns file diff info when path provided', async () => {
    const routes = createPreviewRoutes(makeCtx());
    const handler = routes['GET /api/preview/file'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    const parsed = { query: { path: 'src/index.ts' } } as any;
    await handler({} as any, res as any, parsed);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.ok).toBe(true);
    expect(data.file).toBe('src/index.ts');
    expect(data.risk).toBeDefined();
    expect(data.quality).toBe(100);
  });
});

describe('POST /api/preview/approve', () => {
  it('approves all when no file specified', async () => {
    const append = jest.fn();
    const broadcast = jest.fn();
    const ctx = makeCtx({ auditTrail: { append }, broadcast });
    const routes = createPreviewRoutes(ctx);
    const handler = routes['POST /api/preview/approve'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler(makeRequest('{"file":null}') as any, res as any, {} as any);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.ok).toBe(true);
    expect(data.decision).toBe('approved');
    expect(append).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'preview.approve', target: 'all' }));
    expect(broadcast).toHaveBeenCalledWith('preview:approve', { file: 'all' });
  });

  it('approves specific file', async () => {
    const append = jest.fn();
    const ctx = makeCtx({ auditTrail: { append } });
    const routes = createPreviewRoutes(ctx);
    const handler = routes['POST /api/preview/approve'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler(makeRequest('{"file":"main.ts"}') as any, res as any, {} as any);

    expect(append).toHaveBeenCalledWith(expect.objectContaining({ target: 'main.ts' }));
  });
});

describe('POST /api/preview/reject', () => {
  it('rejects with reason', async () => {
    const append = jest.fn();
    const broadcast = jest.fn();
    const ctx = makeCtx({ auditTrail: { append }, broadcast });
    const routes = createPreviewRoutes(ctx);
    const handler = routes['POST /api/preview/reject'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler(makeRequest('{"file":"bad.ts","reason":"has issues"}') as any, res as any, {} as any);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.decision).toBe('rejected');
    expect(append).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'preview.reject',
      target: 'bad.ts',
      decision: 'rejected',
      metadata: { reason: 'has issues' },
    }));
    expect(broadcast).toHaveBeenCalledWith('preview:reject', { file: 'bad.ts', reason: 'has issues' });
  });
});
