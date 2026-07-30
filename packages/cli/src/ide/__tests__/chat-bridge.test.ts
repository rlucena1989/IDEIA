import { IncomingMessage, ServerResponse } from 'node:http';
import { createChatHandler } from '../chat-bridge';

const mockEngine = {
  chat: jest.fn(),
};

const mockAuditTrail = {
  append: jest.fn(),
};

const mockAgentRuntime = {
  run: jest.fn(),
  getMemoryStore: jest.fn(),
  confirmExecution: jest.fn(),
};

jest.mock('../../local-ai/chat', () => ({
  ChatEngine: jest.fn(() => mockEngine),
}));

jest.mock('@ideia/audit-trail', () => ({
  AuditTrail: jest.fn(() => mockAuditTrail),
}));

function makeReq(method: string, body: string, onEvent?: (event: string, cb: (...args: unknown[]) => void) => void): IncomingMessage {
  const ee = new (jest.requireActual('node:events').EventEmitter)();
  const origOn = ee.on.bind(ee);
  return Object.assign(ee, {
    method,
    headers: {},
    url: '/api/chat/completions',
    on: (event: string, cb: (...args: unknown[]) => void) => {
      origOn(event, cb as unknown);
      if (event === 'data') {
        setTimeout(() => cb(Buffer.from(body)), 10);
      }
      if (event === 'end') {
        setTimeout(() => cb(), 20);
      }
      if (event === 'close' && onEvent) {
        onEvent('close', cb);
      }
      return ee;
    },
  }) as unknown as IncomingMessage;
}

function makeRes(): ServerResponse {
  const chunks: { event?: string; data?: string }[] = [];
  return {
    writeHead: jest.fn(),
    end: jest.fn(),
    write: jest.fn((data: string) => {
      const lines = data.split('\n');
      const event = lines.find(l => l.startsWith('event: '))?.replace('event: ', '');
      const dataLine = lines.find(l => l.startsWith('data: '))?.replace('data: ', '');
      chunks.push({ event, data: dataLine ? JSON.parse(dataLine) : undefined });
      return true;
    }),
    _chunks: chunks,
    _getChunks: () => chunks,
  } as unknown as ServerResponse;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEngine.chat.mockResolvedValue([{ role: 'assistant', content: 'Hello!' }]);
  mockAgentRuntime.run.mockReturnValue({ decision: 'auto', reason: 'safe', actionId: 'act-1' });
  mockAgentRuntime.getMemoryStore.mockReturnValue(null);
});

describe('createChatHandler', () => {
  it('should return a handler function', () => {
    const handler = createChatHandler(mockAuditTrail as any, '/tmp/memory.json');
    expect(typeof handler).toBe('function');
    expect(handler.length).toBe(2);
  });

  it('should reject non-POST methods with 405', (done) => {
    const handler = createChatHandler(mockAuditTrail as any, '/tmp/memory.json');
    const res = makeRes();
    const req = makeReq('GET', '', () => {});

    handler(req, res);

    setTimeout(() => {
      expect(res.writeHead).toHaveBeenCalledWith(405, expect.any(Object));
      done();
    }, 50);
  });

  it('should reject invalid JSON with 400', (done) => {
    const handler = createChatHandler(mockAuditTrail as any, '/tmp/memory.json');
    const res = makeRes();
    const req = makeReq('POST', 'not-json', () => {});

    handler(req, res);

    setTimeout(() => {
      expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
      done();
    }, 50);
  });

  it('should process chat messages and return SSE events', (done) => {
    const handler = createChatHandler(mockAuditTrail as any, '/tmp/memory.json');
    const res = makeRes();
    const body = JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] });
    const req = makeReq('POST', body, () => {});

    handler(req, res);

    setTimeout(() => {
      expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
        'Content-Type': 'text/event-stream',
      }));
      expect(mockEngine.chat).toHaveBeenCalled();
      done();
    }, 100);
  });

  it('should pass config to chat engine', (done) => {
    const handler = createChatHandler(mockAuditTrail as any, '/tmp/memory.json');
    const res = makeRes();
    const body = JSON.stringify({
      messages: [{ role: 'user', content: 'hello' }],
      config: { temperature: 0.5, maxTokens: 100 },
    });
    const req = makeReq('POST', body, () => {});

    handler(req, res);

    setTimeout(() => {
      expect(mockEngine.chat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          onDelta: expect.any(Function),
          onToolCall: expect.any(Function),
          onToolResult: expect.any(Function),
        }),
        { temperature: 0.5, maxTokens: 100 },
      );
      done();
    }, 100);
  });

  it('should check agent runtime for policy decisions', (done) => {
    const runtime = { ...mockAgentRuntime, run: jest.fn(() => ({ decision: 'auto', reason: 'safe', actionId: 'act-1' })) };
    const handler = createChatHandler(mockAuditTrail as any, '/tmp/memory.json', '/tmp/root', runtime as any);
    const res = makeRes();
    const body = JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] });
    const req = makeReq('POST', body, () => {});

    handler(req, res);

    setTimeout(() => {
      expect(runtime.run).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'chat.message' }),
      );
      done();
    }, 100);
  });

  it('should block messages when agent runtime returns block decision', (done) => {
    const runtime = { ...mockAgentRuntime, run: jest.fn(() => ({ decision: 'block', reason: 'policy violation', actionId: 'act-1' })) };
    const handler = createChatHandler(mockAuditTrail as any, '/tmp/memory.json', '/tmp/root', runtime as any);
    const res = makeRes();
    const body = JSON.stringify({ messages: [{ role: 'user', content: 'dangerous' }] });
    const req = makeReq('POST', body, () => {});

    handler(req, res);

    setTimeout(() => {
      expect(res.write).toHaveBeenCalled();
      const chunks = (res as any)._chunks;
      expect(chunks.some((c: any) => c.event === 'done')).toBe(true);
      done();
    }, 100);
  });

  it('should request approval when agent returns ask decision', (done) => {
    const runtime = { ...mockAgentRuntime, run: jest.fn(() => ({ decision: 'ask', reason: 'needs approval', actionId: 'act-2' })) };
    const handler = createChatHandler(mockAuditTrail as any, '/tmp/memory.json', '/tmp/root', runtime as any);
    const res = makeRes();
    const body = JSON.stringify({ messages: [{ role: 'user', content: 'risk operation' }] });
    const req = makeReq('POST', body, () => {});

    handler(req, res);

    setTimeout(() => {
      const chunks = (res as any)._chunks;
      expect(chunks.some((c: any) => c.event === 'tool_call')).toBe(true);
      done();
    }, 100);
  });

  it('should handle chat engine errors gracefully', (done) => {
    mockEngine.chat.mockRejectedValue(new Error('LLM error: connection refused'));
    const handler = createChatHandler(mockAuditTrail as any, '/tmp/memory.json');
    const res = makeRes();
    const body = JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] });
    const req = makeReq('POST', body, () => {});

    handler(req, res);

    setTimeout(() => {
      const chunks = (res as any)._chunks;
      expect(chunks.some((c: any) => c.event === 'done')).toBe(true);
      done();
    }, 100);
  });

  it('should close cleanly on request abort', (done) => {
    const handler = createChatHandler(mockAuditTrail as any, '/tmp/memory.json');
    const res = makeRes();
    const body = JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] });
    let closeCb: (...args: unknown[]) => void = () => {};
    const req = makeReq('POST', body, (event, cb) => { if (event === 'close') closeCb = cb; });

    handler(req, res);
    setTimeout(() => closeCb(), 5);

    setTimeout(() => {
      expect(res.end).not.toHaveBeenCalled();
      done();
    }, 100);
  });

  it('should include context messages from agent runtime memory', (done) => {
    const mockMemory = { activeTask: 'test task', lastDecisions: [{ actionType: 'file.write', decision: 'auto' }] };
    const mockMemoryStore = { load: jest.fn(() => mockMemory), save: jest.fn() };
    const runtime = {
      ...mockAgentRuntime,
      getMemoryStore: jest.fn(() => mockMemoryStore),
    };

    const handler = createChatHandler(mockAuditTrail as any, '/tmp/memory.json', '/tmp/root', runtime as any);
    const res = makeRes();
    const body = JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] });
    const req = makeReq('POST', body, () => {});

    handler(req, res);

    setTimeout(() => {
      expect(mockEngine.chat).toHaveBeenCalled();
      const chatCall = mockEngine.chat.mock.calls[0];
      const contextMessages = chatCall[0];
      expect(contextMessages.some((m: any) => m.role === 'system' && m.content.includes('Active task'))).toBe(true);
      done();
    }, 100);
  });
});
