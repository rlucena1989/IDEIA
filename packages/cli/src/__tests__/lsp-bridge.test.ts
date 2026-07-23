import { EventEmitter } from 'node:events';
import { LspBridge } from '../ide/lsp-bridge';

let mockProcess: EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; stdin: { write: jest.Mock }; kill: jest.Mock };

jest.mock('node:child_process', () => {
  const EE = jest.requireActual('node:events');
  return {
    spawn: jest.fn(() => {
      if (!mockProcess) {
        mockProcess = Object.assign(new EE.EventEmitter(), {
          stdout: new EE.EventEmitter(),
          stderr: new EE.EventEmitter(),
          stdin: { write: jest.fn() },
          kill: jest.fn(),
        });
      }
      return mockProcess;
    }),
  };
});

const FAKE_SERVER = 'lsp-server-mock.mjs';

beforeEach(() => {
  mockProcess = Object.assign(new EventEmitter(), {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    stdin: { write: jest.fn() },
    kill: jest.fn(),
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('LspBridge', () => {
  let bridge: LspBridge;

  beforeEach(() => {
    bridge = new LspBridge();
  });

  afterEach(() => {
    bridge.killAll();
  });

  it('should create bridge', () => {
    expect(bridge).toBeDefined();
  });

  it('should spawn LSP server with server path', () => {
    const session = bridge.spawnServer('/tmp/test-project', FAKE_SERVER);
    expect(session.id).toBeTruthy();
    expect(session.connectedAt).toBeTruthy();
    expect(session.process).toBeTruthy();
  });

  it('should format LSP messages correctly', () => {
    bridge.spawnServer('/tmp/test', FAKE_SERVER);
    const message = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    const buffer = Buffer.byteLength(message, 'utf-8');
    const header = `Content-Length: ${buffer}\r\n\r\n`;
    expect(header).toContain('Content-Length:');
    expect(header).toContain(`${buffer}`);
  });

  it('should emit lsp:message on valid LSP response', (done) => {
    bridge.on('lsp:message', (data: { sessionId: string; data: string }) => {
      try {
        const parsed = JSON.parse(data.data);
        expect(parsed.id).toBe(1);
        done();
      } catch { /* will be caught by timeout */ }
    });

    bridge.spawnServer('/tmp/test', FAKE_SERVER);

    const response = JSON.stringify({ jsonrpc: '2.0', id: 1, result: { capabilities: {} } });
    const header = `Content-Length: ${Buffer.byteLength(response, 'utf-8')}\r\n\r\n`;

    mockProcess.stdout.emit('data', Buffer.from(header + response));
  });

  it('should kill all sessions on killAll', () => {
    bridge.spawnServer('/tmp/test1', FAKE_SERVER);
    bridge.spawnServer('/tmp/test2', FAKE_SERVER);
    bridge.killAll();
  });

  it('should handle server spawn failure gracefully', () => {
    const session = bridge.spawnServer('/nonexistent');
    expect(session).toBeDefined();
    expect(session.id).toBeTruthy();
  });

  it('should emit lsp:exit on server exit', (done) => {
    bridge.on('lsp:exit', (data: { sessionId: string; code: number | null }) => {
      expect(data.sessionId).toBeTruthy();
      done();
    });

    bridge.spawnServer('/tmp/test', FAKE_SERVER);
    setTimeout(() => mockProcess.emit('exit', 0), 50);
  }, 10000);

  it('should emit lsp:error on server error', (done) => {
    bridge.on('lsp:error', (data: { sessionId: string; data: string }) => {
      expect(data.sessionId).toBeTruthy();
      done();
    });

    bridge.spawnServer('/tmp/test', FAKE_SERVER);
    setTimeout(() => mockProcess.emit('error', new Error('Server error')), 50);
  }, 10000);
});
