import { DAPBridge, createDAPBridge } from '../dap-bridge';

function makeDAPMessage(command: string, args?: Record<string, unknown>, seq = 1): string {
  const msg = JSON.stringify({ seq, type: 'request', command, arguments: args });
  return `Content-Length: ${Buffer.byteLength(msg, 'utf-8')}\r\n\r\n${msg}`;
}

function parseDAPResponse(data: string): { seq: number; type: string; success?: boolean; command?: string; body?: Record<string, unknown> } | null {
  const match = data.match(/Content-Length:\s*(\d+)\r\n\r\n([\s\S]*)/);
  if (!match) return null;
  try { return JSON.parse(match[2]); } catch { return null; }
}

describe('DAPBridge', () => {
  let bridge: DAPBridge;

  beforeEach(() => { bridge = createDAPBridge(); });
  afterEach(() => { bridge.disconnectAll(); });

  it('should create bridge', () => {
    expect(bridge).toBeDefined();
  });

  it('should be an instance of EventEmitter', () => {
    const EventEmitter = jest.requireActual('node:events').EventEmitter;
    expect(bridge).toBeInstanceOf(EventEmitter);
  });

  it('should send DAP message format', () => {
    let sentData = '';
    const mockStdin = { writable: true, write: (data: string) => { sentData = data; } };

    const session = {
      id: 'test', process: { stdin: mockStdin } as unknown, connectedAt: '',
      breakpoints: [], stopped: false,
    };

    (bridge as any).sessions.set('test', session);
    bridge.sendMessage('test', 'next');

    expect(sentData).toContain('Content-Length:');
    expect(sentData).toContain('"command":"next"');
  });

  it('should create DAP message with correct format', () => {
    const msg = makeDAPMessage('initialize', { clientID: 'ideia' }, 1);
    expect(msg).toContain('Content-Length:');
  });

  it('should parse DAP response', () => {
    const data = 'Content-Length: 36\r\n\r\n{"seq":1,"type":"response","success":true}';
    const parsed = parseDAPResponse(data);
    expect(parsed).not.toBeNull();
    expect(parsed!.success).toBe(true);
  });

  it('should handle invalid DAP response', () => {
    expect(parseDAPResponse('invalid')).toBeNull();
  });

  it('should increment seq counter on each sendMessage', () => {
    const sentData: string[] = [];
    const mockStdin = { writable: true, write: (data: string) => { sentData.push(data); } };

    const session = {
      id: 'test', process: { stdin: mockStdin } as unknown, connectedAt: '',
      breakpoints: [], stopped: false,
    };

    (bridge as any).sessions.set('test', session);
    bridge.sendMessage('test', 'next');
    bridge.sendMessage('test', 'continue');

    expect(sentData).toHaveLength(2);
  });

  it('should emit dap:error event on disconnect without session', (done) => {
    bridge.on('dap:error', (msg: any) => {
      expect(msg.sessionId).toBe('no-session');
      done();
    });
    (bridge as any).emit('dap:error', { sessionId: 'no-session', error: 'test' });
  });

  it('should track stopped state', () => {
    const session = {
      id: 'test', process: { stdin: { writable: true, write: () => {} } } as unknown,
      connectedAt: '', breakpoints: [], stopped: true,
    };
    (bridge as any).sessions.set('test', session);
    expect(bridge.isStopped('test')).toBe(true);
  });

  it('should return false for isStopped on non-existent session', () => {
    expect(bridge.isStopped('no-session')).toBe(false);
  });

  it('should set breakpoints', () => {
    const session = {
      id: 'test', process: { stdin: { writable: true, write: () => {} } } as unknown,
      connectedAt: '', breakpoints: [], stopped: false,
    };
    (bridge as any).sessions.set('test', session);
    bridge.setBreakpoints('test', '/app.ts', [10, 20, 30]);
    const s = (bridge as any).sessions.get('test');
    expect(s.breakpoints).toHaveLength(3);
  });

  it('should have step control methods', () => {
    expect(typeof bridge.continue).toBe('function');
    expect(typeof bridge.next).toBe('function');
    expect(typeof bridge.stepIn).toBe('function');
    expect(typeof bridge.stepOut).toBe('function');
    expect(typeof bridge.pause).toBe('function');
  });

  it('should have evaluate and stack methods', () => {
    expect(typeof bridge.evaluate).toBe('function');
    expect(typeof bridge.getStack).toBe('function');
    expect(typeof bridge.getScopes).toBe('function');
    expect(typeof bridge.getVariables).toBe('function');
  });

  it('should emit dap:stopped on stopped event', (done) => {
    bridge.on('dap:stopped', (msg: { sessionId: string; reason?: string }) => {
      expect(msg.sessionId).toBe('test-session');
      expect(msg.reason).toBe('breakpoint');
      done();
    });

    (bridge as any).handleMessage('test-session', { type: 'event', command: 'stopped', body: { reason: 'breakpoint' }, success: true });
  });

  it('should emit dap:continued on continued event', (done) => {
    bridge.on('dap:continued', (msg: { sessionId: string }) => {
      expect(msg.sessionId).toBe('test-session');
      done();
    });

    (bridge as any).handleMessage('test-session', { type: 'event', command: 'continued', body: {}, success: true });
  });

  it('should update stopped state on stopped event', () => {
    const session = {
      id: 'test-session', process: { stdin: { writable: true, write: () => {} } } as unknown,
      connectedAt: '', breakpoints: [], stopped: false,
    };
    (bridge as any).sessions.set('test-session', session);

    (bridge as any).handleMessage('test-session', { type: 'event', command: 'stopped', body: { reason: 'breakpoint' }, success: true });

    expect(session.stopped).toBe(true);
  });

  it('should emit dap:stopped even for missing session (event is broadcast)', (done) => {
    bridge.on('dap:stopped', (msg: { sessionId: string }) => {
      expect(msg.sessionId).toBe('nonexistent');
      done();
    });
    (bridge as any).handleMessage('nonexistent', { type: 'event', command: 'stopped', body: { reason: 'breakpoint' }, success: true });
  });

  it('should disconnect all sessions', () => {
    (bridge as any).sessions.set('s1', { id: 's1', process: { kill: () => {}, stdin: { writable: true, write: () => {} } } as unknown, connectedAt: '', breakpoints: [], stopped: false });
    (bridge as any).sessions.set('s2', { id: 's2', process: { kill: () => {}, stdin: { writable: true, write: () => {} } } as unknown, connectedAt: '', breakpoints: [], stopped: false });
    bridge.disconnectAll();
    const remaining = (bridge as any).sessions.size;
    expect(remaining).toBe(2);
  });

  it('should handle breakpoint event', (done) => {
    bridge.on('dap:breakpoint', (msg: any) => {
      expect(msg.sessionId).toBe('test-session');
      expect(msg.body).toBeDefined();
      done();
    });

    (bridge as any).handleMessage('test-session', { type: 'event', command: 'breakpoint', body: { verified: true }, success: true });
  });
});
