import { readBody, json, error, withAgent } from '../api-router-helpers';
import { EventEmitter } from 'node:events';
import type { IncomingMessage } from 'node:http';

jest.mock('../../governance/approval-flow', () => ({
  createApprovalRequest: jest.fn(() => ({ approvalId: 'aid-456' })),
}));

function createMockRequest(chunks?: string[], errorAfter?: number): IncomingMessage {
  const req = new EventEmitter() as unknown as IncomingMessage;
  (req as any).destroy = jest.fn();
  if (chunks) {
    process.nextTick(() => {
      for (const chunk of chunks) req.emit('data', Buffer.from(chunk));
      if (!errorAfter) req.emit('end');
    });
  }
  if (errorAfter) {
    setTimeout(() => req.emit('error', new Error('stream error')), errorAfter);
  }
  return req;
}

describe('api-router-helpers', () => {
  let mockRes: { writeHead: jest.Mock; end: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = { writeHead: jest.fn(), end: jest.fn() };
  });

  describe('json', () => {
    it('writes JSON with 200', () => {
      json(mockRes as any, { ok: true });
      expect(mockRes.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith('{"ok":true}');
    });

    it('writes JSON with custom status', () => {
      json(mockRes as any, { ok: false }, 403);
      expect(mockRes.writeHead).toHaveBeenCalledWith(403, { 'Content-Type': 'application/json' });
    });
  });

  describe('error', () => {
    it('writes error with 400', () => {
      error(mockRes as any, 'invalid');
      expect(mockRes.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith('{"ok":false,"error":"invalid"}');
    });
  });

  describe('readBody', () => {
    it('reads a complete body from request', async () => {
      const req = createMockRequest(['{"key":"value"}']);
      const body = await readBody(req);
      expect(body).toBe('{"key":"value"}');
    });

    it('accumulates multiple data chunks', async () => {
      const req = createMockRequest(['chunk1', 'chunk2', 'chunk3']);
      const body = await readBody(req);
      expect(body).toBe('chunk1chunk2chunk3');
    });

    it('resolves empty string when no data emitted', async () => {
      const req = createMockRequest([]);
      const body = await readBody(req);
      expect(body).toBe('');
    });

    it('rejects on request error event', async () => {
      const req = new EventEmitter() as unknown as IncomingMessage;
      (req as any).destroy = jest.fn();
      const promise = readBody(req);
      process.nextTick(() => req.emit('error', new Error('connection lost')));
      await expect(promise).rejects.toThrow('connection lost');
    });

    it('rejects when body exceeds 10MB limit', async () => {
      const req = new EventEmitter() as unknown as IncomingMessage;
      (req as any).destroy = jest.fn();
      const promise = readBody(req);
      process.nextTick(() => {
        req.emit('data', Buffer.alloc(11 * 1024 * 1024));
      });
      await expect(promise).rejects.toThrow('Request body too large');
    });
  });

  describe('withAgent', () => {
    function makeCtx(overrides: Record<string, unknown> = {}): any {
      return {
        root: '/test',
        fileBridge: {},
        terminalBridge: {},
        memoryStore: {},
        session: null,
        commands: [],
        getSession: jest.fn(),
        auditTrail: {},
        agentRuntime: { run: jest.fn(), confirmExecution: jest.fn() },
        ...overrides,
      };
    }

    it('blocks when decision is block', async () => {
      const ctx = makeCtx({ agentRuntime: { run: jest.fn().mockReturnValue({ decision: 'block', reason: 'denied', actionId: 'a1' }), confirmExecution: jest.fn() } });
      const result = await withAgent(ctx, { actionType: 'test', message: 'x' }, async () => 'data');
      expect(result).toEqual({ ok: false, error: 'Blocked by policy: denied', decision: 'block', actionId: 'a1' });
    });

    it('asks and broadcasts when decision is ask', async () => {
      const broadcast = jest.fn();
      const ctx = makeCtx({ agentRuntime: { run: jest.fn().mockReturnValue({ decision: 'ask', reason: 'manual review', actionId: 'a2' }), confirmExecution: jest.fn() }, broadcast });
      const result = await withAgent(ctx, { actionType: 'shell.exec', message: 'run cmd' }, async () => 'out');
      expect(result.decision).toBe('ask');
      expect(broadcast).toHaveBeenCalledWith('approval:request', expect.objectContaining({ action: 'shell.exec' }));
    });

    it('executes when decision is auto and returns data', async () => {
      const confirmExecution = jest.fn();
      const ctx = makeCtx({ agentRuntime: { run: jest.fn().mockReturnValue({ decision: 'auto', actionId: 'a3' }), confirmExecution } });
      const result = await withAgent(ctx, { actionType: 'file.read', message: 'read file' }, async () => 'content');
      expect(result).toEqual({ ok: true, data: 'content', decision: 'auto', actionId: 'a3' });
      expect(confirmExecution).toHaveBeenCalledWith('a3', true);
    });
  });
});
