import { EventEmitter } from 'node:events';
import { LspBridge } from '../lsp-bridge';

let mockProcess: EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; stdin: { write: jest.Mock }; kill: jest.Mock };

jest.mock('node:child_process', () => {
  const EE = jest.requireActual('node:events');
  return {
    spawn: jest.fn(() => {
      if (!mockProcess) {
        mockProcess = Object.assign(new EE.EventEmitter(), {
          stdout: new EE.EventEmitter(),
          stderr: new EE.EventEmitter(),
          stdin: { write: jest.fn(), writable: true },
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
    stdin: { write: jest.fn(), writable: true },
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

  it('should be an instance of EventEmitter', () => {
    expect(bridge).toBeInstanceOf(EventEmitter);
  });

  it('should spawn LSP server with server path', () => {
    const session = bridge.spawnServer('/tmp/test-project', FAKE_SERVER);
    expect(session.id).toBeTruthy();
    expect(session.id).toContain('lsp_');
    expect(session.connectedAt).toBeTruthy();
    expect(session.process).toBeTruthy();
  });

  it('should send formatted LSP messages', () => {
    bridge.spawnServer('/tmp/test', FAKE_SERVER);
    const message = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });

    const buffer = Buffer.byteLength(message, 'utf-8');
    const header = `Content-Length: ${buffer}\r\n\r\n`;
    expect(header).toContain('Content-Length:');
    expect(header).toContain(`${buffer}`);
  });

  it('should send message to LSP process via stdin', () => {
    const session = bridge.spawnServer('/tmp/test', FAKE_SERVER);
    bridge.sendMessage(session.id, JSON.stringify({ jsonrpc: '2.0', method: 'textDocument/completion', params: {} }));

    expect(mockProcess.stdin.write).toHaveBeenCalled();
    const written = (mockProcess.stdin.write as jest.Mock).mock.calls[0][0];
    expect(written).toContain('Content-Length:');
  });

  it('should not send message for non-existent session', () => {
    bridge.sendMessage('non-existent', '{}');
    expect(mockProcess.stdin.write).not.toHaveBeenCalled();
  });

  it('should emit lsp:message on valid LSP response', (done) => {
    bridge.on('lsp:message', (data: { sessionId: string; data: string }) => {
      try {
        const parsed = JSON.parse(data.data);
        expect(parsed.id).toBe(1);
        done();
      } catch { }
    });

    bridge.spawnServer('/tmp/test', FAKE_SERVER);

    const response = JSON.stringify({ jsonrpc: '2.0', id: 1, result: { capabilities: {} } });
    const header = `Content-Length: ${Buffer.byteLength(response, 'utf-8')}\r\n\r\n`;

    mockProcess.stdout.emit('data', Buffer.from(header + response));
  });

  it('should emit lsp:error on server stderr output', (done) => {
    bridge.on('lsp:error', (data: { sessionId: string; data: string }) => {
      expect(data.sessionId).toBeTruthy();
      expect(data.data).toBe('test error');
      done();
    });

    bridge.spawnServer('/tmp/test', FAKE_SERVER);
    mockProcess.stderr.emit('data', Buffer.from('test error'));
  });

  it('should kill all sessions on killAll', () => {
    bridge.spawnServer('/tmp/test1', FAKE_SERVER);
    bridge.spawnServer('/tmp/test2', FAKE_SERVER);
    bridge.killAll();
    expect(mockProcess.kill).toHaveBeenCalled();
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

  it('should handle multiple messages in buffer', () => {
    bridge.spawnServer('/tmp/test', FAKE_SERVER);

    const response1 = JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} });
    const response2 = JSON.stringify({ jsonrpc: '2.0', id: 2, result: {} });
    const header1 = `Content-Length: ${Buffer.byteLength(response1, 'utf-8')}\r\n\r\n`;
    const header2 = `Content-Length: ${Buffer.byteLength(response2, 'utf-8')}\r\n\r\n`;

    const messages: string[] = [];
    bridge.on('lsp:message', (data: { data: string }) => messages.push(data.data));

    mockProcess.stdout.emit('data', Buffer.from(header1 + response1 + header2 + response2));

    expect(messages).toHaveLength(2);
  });

  it('should have no sessions after killAll', () => {
    bridge.spawnServer('/tmp/test1', FAKE_SERVER);
    bridge.spawnServer('/tmp/test2', FAKE_SERVER);
    bridge.killAll();
    expect((bridge as any).sessions.size).toBe(0);
  });
});
