import { createExceptionManager } from './exception-manager';
import { Task } from './types';

const makeTask = (overrides?: Partial<Task>): Task => ({
  id: 't1', type: 'write' as const, description: 'complex task requiring exception',
  risk: 0.3, filesChanged: 10, tokensConsumed: 50000,
  accessSecrets: false, isDeploy: false, assignedAgent: 'ag-1',
  ...overrides,
});

describe('ExceptionManager', () => {
  it('should create an exception for valid request', async () => {
    const mgr = createExceptionManager();
    const result = await mgr.requestException(makeTask(), 2, 'Need more tokens for complex task');
    expect(result).not.toBe('denied');
    if (result !== 'denied') {
      expect(result.id).toBeDefined();
      expect(result.justification).toContain('more tokens');
    }
  });

  it('should deny request with short justification', async () => {
    const mgr = createExceptionManager();
    const result = await mgr.requestException(makeTask(), 2, 'short');
    expect(result).toBe('denied');
  });

  it('should track active exceptions', async () => {
    const mgr = createExceptionManager();
    await mgr.requestException(makeTask(), 2, 'Need more tokens for complex task');
    const active = mgr.getActiveExceptions();
    expect(active.length).toBeGreaterThan(0);
  });

  it('should revoke exceptions', async () => {
    const mgr = createExceptionManager();
    const result = await mgr.requestException(makeTask(), 2, 'Need more tokens for complex task');
    if (result !== 'denied') {
      const revoked = mgr.revokeException(result.id);
      expect(revoked).toBe(true);
    }
  });
});
