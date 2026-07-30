import { json, error, withAgent } from '../api-router-ctx';
import type { ApiContext } from '../api-router-ctx';

const mockCreateApprovalRequest = jest.fn(() => ({ approvalId: 'test-123', requestedAt: new Date().toISOString(), status: 'pending' }));
jest.mock('../../governance/approval-flow', () => ({
  createApprovalRequest: (...args: unknown[]) => mockCreateApprovalRequest(...args),
}));

describe('api-router-ctx', () => {
  let mockRes: { writeHead: jest.Mock; end: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = { writeHead: jest.fn(), end: jest.fn() };
  });

  describe('json', () => {
    it('writes JSON with default 200 status', () => {
      json(mockRes as any, { message: 'ok' });
      expect(mockRes.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith('{"message":"ok"}');
    });

    it('writes JSON with custom status code', () => {
      json(mockRes as any, { error: 'fail' }, 500);
      expect(mockRes.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith('{"error":"fail"}');
    });

    it('writes null data as JSON', () => {
      json(mockRes as any, null, 204);
      expect(mockRes.writeHead).toHaveBeenCalledWith(204, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith('null');
    });
  });

  describe('error', () => {
    it('writes error response with status 400', () => {
      error(mockRes as any, 'bad request');
      expect(mockRes.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith('{"ok":false,"error":"bad request"}');
    });

    it('writes error response with custom status', () => {
      error(mockRes as any, 'not found', 404);
      expect(mockRes.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'application/json' });
    });
  });

  describe('withAgent', () => {
    function makeCtx(overrides: Record<string, unknown> = {}): ApiContext {
      return {
        root: '/test',
        fileBridge: {} as any,
        terminalBridge: {} as any,
        memoryStore: {} as any,
        session: null,
        commands: [],
        getSession: jest.fn(),
        auditTrail: {} as any,
        agentRuntime: {
          run: jest.fn(),
          confirmExecution: jest.fn(),
        },
        ...overrides,
      } as unknown as ApiContext;
    }

    it('returns blocked result when agentRuntime blocks', async () => {
      const ctx = makeCtx({
        agentRuntime: {
          run: jest.fn().mockReturnValue({ decision: 'block', reason: 'policy violation', actionId: 'a1' }),
          confirmExecution: jest.fn(),
        },
      });
      const result = await withAgent(ctx, { actionType: 'file.write', message: 'test' }, async () => 'done');
      expect(result).toEqual({ ok: false, error: 'Blocked by policy: policy violation', decision: 'block', actionId: 'a1' });
    });

    it('returns ask result and broadcasts when agentRuntime asks', async () => {
      const broadcast = jest.fn();
      const ctx = makeCtx({
        agentRuntime: {
          run: jest.fn().mockReturnValue({ decision: 'ask', reason: 'needs approval', actionId: 'a2' }),
          confirmExecution: jest.fn(),
        },
        broadcast,
      });
      const result = await withAgent(ctx, { actionType: 'file.delete', message: 'test' }, async () => 'done');
      expect(result).toEqual({ ok: false, error: 'Approval needed: needs approval', decision: 'ask', actionId: 'a2' });
      expect(broadcast).toHaveBeenCalledWith('approval:request', expect.objectContaining({ action: 'file.delete', approvalId: 'test-123' }));
    });

    it('does not broadcast when broadcast is undefined', async () => {
      const ctx = makeCtx({
        agentRuntime: {
          run: jest.fn().mockReturnValue({ decision: 'ask', reason: 'needs approval', actionId: 'a2' }),
          confirmExecution: jest.fn(),
        },
      });
      delete (ctx as any).broadcast;
      const result = await withAgent(ctx, { actionType: 'test', message: 'x' }, async () => 'data');
      expect(result.decision).toBe('ask');
    });

    it('executes and returns auto result when agent approves', async () => {
      const confirmExecution = jest.fn();
      const ctx = makeCtx({
        agentRuntime: {
          run: jest.fn().mockReturnValue({ decision: 'auto', reason: 'allowed', actionId: 'a3' }),
          confirmExecution,
        },
      });
      const result = await withAgent(ctx, { actionType: 'file.read', message: 'test' }, async () => 'file-content');
      expect(result).toEqual({ ok: true, data: 'file-content', decision: 'auto', actionId: 'a3' });
      expect(confirmExecution).toHaveBeenCalledWith('a3', true);
    });

    it('passes params to agentRuntime.run', async () => {
      const run = jest.fn().mockReturnValue({ decision: 'auto', actionId: 'a4' });
      const ctx = makeCtx({ agentRuntime: { run, confirmExecution: jest.fn() } });
      await withAgent(ctx, { actionType: 'shell.exec', resource: 'ls', riskLevel: 'high', message: 'List files' }, async () => 'output');
      expect(run).toHaveBeenCalledWith({ message: 'List files', actionType: 'shell.exec', resource: 'ls', riskLevel: 'high' });
    });
  });
});
