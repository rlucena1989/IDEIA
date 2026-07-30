import http from 'node:http';
import { WebSocketServer} from 'ws';
import { startIdeServer, IdeServerOptions} from '../ide-server';

const mockFileBridge = { on: jest.fn(), startWatcher: jest.fn(), stopWatcher: jest.fn() };
const mockTerminalBridge = { on: jest.fn(), closeAllPty: jest.fn(), getHistory: jest.fn().mockReturnValue([]) };
const mockMemoryStore = { count: jest.fn().mockReturnValue(0) };
const mockAuditTrail = { count: jest.fn() };
const mockAgentRuntime = { run: jest.fn(), confirmExecution: jest.fn(), getMemoryStore: jest.fn() };
const mockEventBus = { emit: jest.fn() };
const mockWSBroadcast = { start: jest.fn() };
const mockApiRoutes: Record<string, (...args: unknown[]) => unknown> = {};
const mockChatHandler = jest.fn();
const mockSecurity = {
  setSecurityHeaders: jest.fn(),
  applyRateLimit: jest.fn().mockReturnValue(true),
  checkApiKey: jest.fn().mockReturnValue(true),
  destroy: jest.fn(),
};
const mockLspBridge = {
  spawnServer: jest.fn().mockReturnValue({ id: 'lsp_test' }),
  sendMessage: jest.fn(),
  on: jest.fn(),
  kill: jest.fn(),
  killAll: jest.fn(),
};
let mockSession: unknown = { session_id: 'test-session', policy: 'ask', workspace_root: '/test' };

jest.mock('../file-bridge', () => ({ FileBridge: jest.fn(() => mockFileBridge) }));
jest.mock('../terminal-bridge', () => ({ TerminalBridge: jest.fn(() => mockTerminalBridge) }));
jest.mock('../api-router', () => ({ createApiRouter: jest.fn(() => mockApiRoutes) }));
jest.mock('../chat-bridge', () => ({ createChatHandler: jest.fn(() => mockChatHandler) }));
jest.mock('../lsp-bridge', () => ({ LspBridge: jest.fn(() => mockLspBridge) }));
jest.mock('../session-manager', () => ({
  createSession: jest.fn(() => mockSession),
  getActiveSession: jest.fn(() => mockSession),
  IdeSession: {} as unknown,
}));
jest.mock('../security-middleware', () => ({
  SecurityMiddleware: jest.fn(() => mockSecurity),
  createSecurityMiddleware: jest.fn(() => mockSecurity),
}));
jest.mock('@ideia/memory-store', () => ({ MemoryStore: jest.fn(() => mockMemoryStore) }));
jest.mock('@ideia/audit-trail', () => ({ AuditTrail: jest.fn(() => mockAuditTrail) }));
jest.mock('@ideia/agent-runtime', () => ({ AgentRuntime: jest.fn(() => mockAgentRuntime) }));
jest.mock('@ideia/event-bus', () => ({
  createBus: jest.fn(() => Promise.resolve(mockEventBus)),
  createWSBroadcast: jest.fn(() => mockWSBroadcast),
  WSBroadcast: {} as unknown,
}));

jest.mock('node:http', () => {
  const EE = jest.requireActual('node:events');
  return {
    ...jest.requireActual('node:http'),
    createServer: jest.fn(() => {
      const ee = new EE.EventEmitter();
      return Object.assign(ee, {
        listen: jest.fn((_port: number, _host: string, cb: () => void) => { setTimeout(cb, 50); return ee; }),
        close: jest.fn((cb?: (err?: Error) => void) => { if (cb) cb(); }),
      });
    }),
  };
});

jest.mock('ws', () => {
  const EE = jest.requireActual('node:events');
  const mockWS = Object.assign(new EE.EventEmitter(), { send: jest.fn(), close: jest.fn(), readyState: 1 });
  return {
    WebSocketServer: jest.fn(() => Object.assign(new EE.EventEmitter(), { clients: new Set(), close: jest.fn(), on: jest.fn() })),
    WebSocket: jest.fn(() => mockWS),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSession = { session_id: 'test-session', policy: 'ask', workspace_root: '/test', active_tasks: [], memory: { last_decisions: [], project_context: {} }, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), metadata: {} };
});

describe('startIdeServer', () => {
  it('should return an IdeServerInstance with expected shape', async () => {
    const instance = await startIdeServer({ port: 3001, root: '/tmp/test-project' });

    expect(instance).toBeDefined();
    expect(instance.server).toBeDefined();
    expect(instance.wss).toBeDefined();
    expect(instance.address).toBeDefined();
    expect(typeof instance.stop).toBe('function');
  });

  it('should start server with specified port and host options', async () => {
    const opts: IdeServerOptions = { port: 4000, root: '/tmp/other-project', host: '0.0.0.0' };
    const instance = await startIdeServer(opts);

    expect(http.createServer).toHaveBeenCalled();
    expect(WebSocketServer).toHaveBeenCalled();
    expect(instance.address).toContain('4000');
  });

  it('should use provided port', async () => {
    const instance = await startIdeServer({ port: 3001, root: '/tmp/test' });
    expect(instance.address).toContain('3001');
  });

  it('should set up api routes via createApiRouter', async () => {
    await startIdeServer({ port: 3002, root: '/tmp/test' });
    expect(require('../api-router').createApiRouter).toHaveBeenCalled();
  });

  it('should set up chat handler via createChatHandler', async () => {
    await startIdeServer({ port: 3003, root: '/tmp/test' });
    expect(require('../chat-bridge').createChatHandler).toHaveBeenCalled();
  });

  it('should create security middleware', async () => {
    await startIdeServer({ port: 3005, root: '/tmp/test' });
    expect(require('../security-middleware').createSecurityMiddleware).toHaveBeenCalled();
  });

  it('should set up event bus and ws broadcast', async () => {
    await startIdeServer({ port: 3006, root: '/tmp/test' });
    expect(require('@ideia/event-bus').createBus).toHaveBeenCalled();
    expect(require('@ideia/event-bus').createWSBroadcast).toHaveBeenCalled();
  });

  it('should provide a stop function that cleans up resources', async () => {
    const instance = await startIdeServer({ port: 3007, root: '/tmp/test' });

    await instance.stop();

    expect(mockFileBridge.stopWatcher).toHaveBeenCalled();
    expect(mockLspBridge.killAll).toHaveBeenCalled();
    expect(mockTerminalBridge.closeAllPty).toHaveBeenCalled();
    expect(mockSecurity.destroy).toHaveBeenCalled();
  });

  it('should expose address in correct format', async () => {
    const instance = await startIdeServer({ port: 3008, root: '/tmp/test' });
    expect(instance.address).toMatch(/^http:\/\/.+:\d+$/);
  });

  it('should create FileBridge with resolved root path', async () => {
    await startIdeServer({ port: 3009, root: '/tmp/custom-test' });
    const callArg = (require('../file-bridge').FileBridge as jest.Mock).mock.calls[0][0];
    expect(callArg).toContain('tmp');
    expect(callArg).toContain('custom-test');
  });

  it('should create TerminalBridge with resolved root path', async () => {
    await startIdeServer({ port: 3010, root: '/tmp/term-test' });
    const callArg = (require('../terminal-bridge').TerminalBridge as jest.Mock).mock.calls[0][0];
    expect(callArg).toContain('tmp');
    expect(callArg).toContain('term-test');
  });

  it('should start file watcher on server start', async () => {
    await startIdeServer({ port: 3011, root: '/tmp/test' });
    expect(mockFileBridge.startWatcher).toHaveBeenCalled();
  });
});
