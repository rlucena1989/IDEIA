import { createApiRouter } from '../api-router';
import type { ApiContext } from '../api-router-helpers';

const mockRouteSets: Record<string, Record<string, (...args: unknown[]) => unknown>> = {
  fileSystem: { 'GET /api/fs/list': jest.fn(), 'GET /api/fs/read': jest.fn() },
  terminalSession: { 'POST /api/shell': jest.fn(), 'GET /api/session': jest.fn() },
  preview: { 'GET /api/preview/report': jest.fn() },
  approval: { 'POST /api/approval/request': jest.fn() },
  memory: { 'GET /api/memory': jest.fn() },
  status: { 'GET /api/ide/status': jest.fn(), 'GET /api/health': jest.fn() },
  task: { 'GET /api/tasks': jest.fn() },
  provider: { 'GET /api/settings/providers': jest.fn() },
  workspace: { 'GET /api/workspace/config': jest.fn() },
  git: { 'GET /api/git/status': jest.fn() },
  diagnostics: { 'GET /api/diagnostics': jest.fn() },
  misc: { 'POST /api/sandbox/exec': jest.fn() },
};

jest.mock('../api-router-routes', () => ({
  createFileSystemRoutes: jest.fn(() => mockRouteSets.fileSystem),
  createTerminalSessionRoutes: jest.fn(() => mockRouteSets.terminalSession),
  createPreviewRoutes: jest.fn(() => mockRouteSets.preview),
  createApprovalRoutes: jest.fn(() => mockRouteSets.approval),
  createMemoryRoutes: jest.fn(() => mockRouteSets.memory),
  createStatusRoutes: jest.fn(() => mockRouteSets.status),
  createTaskRoutes: jest.fn(() => mockRouteSets.task),
  createProviderRoutes: jest.fn(() => mockRouteSets.provider),
  createWorkspaceRoutes: jest.fn(() => mockRouteSets.workspace),
  createGitRoutes: jest.fn(() => mockRouteSets.git),
  createDiagnosticsRoutes: jest.fn(() => mockRouteSets.diagnostics),
  createMiscRoutes: jest.fn(() => mockRouteSets.misc),
}));

const mockContext: ApiContext = {
  root: '/test',
  fileBridge: {} as unknown,
  terminalBridge: {} as unknown,
  memoryStore: {} as unknown,
  session: null,
  commands: [],
  getSession: jest.fn(),
  auditTrail: {} as unknown,
  agentRuntime: {} as unknown,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createApiRouter', () => {
  it('should return an object of route handlers', () => {
    const router = createApiRouter(mockContext);
    expect(router).toBeDefined();
    expect(typeof router).toBe('object');
  });

  it('should include routes from all route groups', () => {
    const router = createApiRouter(mockContext);

    expect(router['GET /api/fs/list']).toBeDefined();
    expect(router['GET /api/fs/read']).toBeDefined();
    expect(router['POST /api/shell']).toBeDefined();
    expect(router['GET /api/session']).toBeDefined();
    expect(router['GET /api/preview/report']).toBeDefined();
    expect(router['POST /api/approval/request']).toBeDefined();
    expect(router['GET /api/memory']).toBeDefined();
    expect(router['GET /api/ide/status']).toBeDefined();
    expect(router['GET /api/health']).toBeDefined();
    expect(router['GET /api/tasks']).toBeDefined();
    expect(router['GET /api/settings/providers']).toBeDefined();
    expect(router['GET /api/workspace/config']).toBeDefined();
    expect(router['GET /api/git/status']).toBeDefined();
    expect(router['GET /api/diagnostics']).toBeDefined();
    expect(router['POST /api/sandbox/exec']).toBeDefined();
  });

  it('should call all route creator functions with context', () => {
    createApiRouter(mockContext);

    expect(require('../api-router-routes').createFileSystemRoutes).toHaveBeenCalledWith(mockContext);
    expect(require('../api-router-routes').createTerminalSessionRoutes).toHaveBeenCalledWith(mockContext);
    expect(require('../api-router-routes').createPreviewRoutes).toHaveBeenCalledWith(mockContext);
    expect(require('../api-router-routes').createApprovalRoutes).toHaveBeenCalledWith(mockContext);
    expect(require('../api-router-routes').createMemoryRoutes).toHaveBeenCalledWith(mockContext);
    expect(require('../api-router-routes').createStatusRoutes).toHaveBeenCalledWith(mockContext);
    expect(require('../api-router-routes').createTaskRoutes).toHaveBeenCalledWith(mockContext);
    expect(require('../api-router-routes').createProviderRoutes).toHaveBeenCalledWith(mockContext);
    expect(require('../api-router-routes').createWorkspaceRoutes).toHaveBeenCalledWith(mockContext);
    expect(require('../api-router-routes').createGitRoutes).toHaveBeenCalledWith(mockContext);
    expect(require('../api-router-routes').createDiagnosticsRoutes).toHaveBeenCalledWith(mockContext);
    expect(require('../api-router-routes').createMiscRoutes).toHaveBeenCalledWith(mockContext);
  });

  it('should include a GET /api/routes endpoint', () => {
    const router = createApiRouter(mockContext);
    expect(router['GET /api/routes']).toBeDefined();
  });

  it('should return endpoint list from GET /api/routes without self-reference', () => {
    const router = createApiRouter(mockContext);
    const endpoints = Object.keys(router).filter(k => k !== 'GET /api/routes');
    expect(endpoints.length).toBeGreaterThan(0);
    expect(endpoints).not.toContain('GET /api/routes');
  });
});
