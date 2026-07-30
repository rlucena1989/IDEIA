import { createGitRoutes } from '../git-routes';

function makeCtx(overrides: Record<string, unknown> = {}): any {
  return {
    root: '/test/repo',
    ...overrides,
  };
}

describe('createGitRoutes', () => {
  it('returns all expected git route keys', () => {
    const routes = createGitRoutes(makeCtx());
    expect(Object.keys(routes).sort()).toEqual([
      'GET /api/git/branch/compare',
      'GET /api/git/diff',
      'GET /api/git/status',
    ]);
  });

  it('each route is a function', () => {
    const routes = createGitRoutes(makeCtx());
    for (const handler of Object.values(routes)) {
      expect(typeof handler).toBe('function');
    }
  });
});

describe('GET /api/git/status - file parsing from porcelain output', () => {
  it('returns correct structure even when git fails', async () => {
    const routes = createGitRoutes(makeCtx());
    const handler = routes['GET /api/git/status'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, {} as any);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.files)).toBe(true);
    expect(typeof data.ahead).toBe('number');
    expect(typeof data.behind).toBe('number');
  });
});

describe('GET /api/git/branch/compare - branch sanitization', () => {
  it('sanitizes branch parameter, removing dangerous chars', async () => {
    const routes = createGitRoutes(makeCtx());
    const handler = routes['GET /api/git/branch/compare'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    const parsed = { query: { branch: 'main' } } as any;
    await handler({} as any, res as any, parsed);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.branch).toBe('main');
  });

  it('defaults to main when no branch provided', async () => {
    const routes = createGitRoutes(makeCtx());
    const handler = routes['GET /api/git/branch/compare'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    await handler({} as any, res as any, { query: {} } as any);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.branch).toBe('main');
  });

  it('strips shell-dangerous characters from branch name', async () => {
    const routes = createGitRoutes(makeCtx());
    const handler = routes['GET /api/git/branch/compare'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    const parsed = { query: { branch: 'main; rm -rf /' } } as any;
    await handler({} as any, res as any, parsed);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.branch).not.toContain(';');
    expect(data.branch).not.toContain(' ');
  });

  it('allows valid branch characters', async () => {
    const routes = createGitRoutes(makeCtx());
    const handler = routes['GET /api/git/branch/compare'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    const parsed = { query: { branch: 'feature/my-branch_v2.1' } } as any;
    await handler({} as any, res as any, parsed);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.branch).toBe('feature/my-branch_v2.1');
  });
});

describe('GET /api/git/diff - file sanitization', () => {
  it('sanitizes file parameter', async () => {
    const routes = createGitRoutes(makeCtx());
    const handler = routes['GET /api/git/diff'];

    const res = { writeHead: jest.fn(), end: jest.fn() };
    const parsed = { query: { file: 'src/index.ts' } } as any;
    await handler({} as any, res as any, parsed);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.ok).toBe(true);
  });
});
