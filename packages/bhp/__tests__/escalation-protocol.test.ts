import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { EscalationProtocol, createEscalationProtocol } from '../src/escalation-protocol';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

describe('EscalationProtocol', () => {
  let protocol: EscalationProtocol;

  beforeEach(() => {
    jest.useFakeTimers();
    protocol = new EscalationProtocol();
  });

  afterEach(() => {
    protocol.dispose();
    jest.useRealTimers();
  });

  it('creates an escalation request', () => {
    const req = protocol.escalate('Database connection failed', 'Cannot connect to PostgreSQL', 'critical');
    expect(req.id).toContain('esc-');
    expect(req.issue).toBe('Database connection failed');
    expect(req.status).toBe('open');
    expect(req.level).toBe('critical');
  });

  it('resolves an open request', () => {
    const req = protocol.escalate('Minor issue', 'Something small', 'info');
    const resolved = protocol.resolve(req.id, 'Fixed manually');
    expect(resolved).toBe(true);

    const retrieved = protocol.getRequest(req.id);
    expect(retrieved!.status).toBe('resolved');
    expect(retrieved!.resolvedAt).toBeDefined();
  });

  it('returns false when resolving non-existent request', () => {
    expect(protocol.resolve('nonexistent')).toBe(false);
  });

  it('lists only active (open) requests', () => {
    protocol.escalate('Issue 1', 'Context 1', 'warning');
    const req2 = protocol.escalate('Issue 2', 'Context 2', 'info');
    protocol.resolve(req2.id, 'Done');

    const active = protocol.getActiveRequests();
    expect(active.length).toBe(1);
    expect(active[0].issue).toBe('Issue 1');
  });

  it('dispose clears all active requests', () => {
    protocol.escalate('Issue', 'Context', 'info');
    protocol.dispose();
    expect(protocol.getActiveRequests().length).toBe(0);
  });

  it('emits escalation steps via bus when provided', () => {
    const mockBus = { emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn(), publish: jest.fn() };
    const protocolWithBus = new EscalationProtocol(mockBus as any);

    protocolWithBus.escalate('Test', 'Context', 'info');
    expect(mockBus.emit).toHaveBeenCalled();

    protocolWithBus.dispose();
  });

  it('createEscalationProtocol factory works', () => {
    expect(createEscalationProtocol()).toBeInstanceOf(EscalationProtocol);
  });
});
