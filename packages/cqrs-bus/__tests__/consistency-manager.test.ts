import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ConsistencyManager } from '../src/consistency-manager';
import type { IKvStore } from '../src/command-bus';

function createMockKv(): IKvStore {
  return {
    get: jest.fn() as any,
    put: jest.fn() as any,
  } as unknown as IKvStore;
}

describe('ConsistencyManager', () => {
  let kv: IKvStore;
  let cm: ConsistencyManager;

  beforeEach(() => {
    kv = createMockKv();
    cm = new ConsistencyManager(kv);
  });

  it('isProjectionCurrent returns true when projection is ahead', async () => {
    (kv.get as any)
      .mockResolvedValueOnce({ value: new TextEncoder().encode('1000') })
      .mockResolvedValueOnce({ value: new TextEncoder().encode('2000') });
    expect(await cm.isProjectionCurrent('users')).toBe(true);
  });

  it('isProjectionCurrent returns false when projection lags', async () => {
    (kv.get as any)
      .mockResolvedValueOnce({ value: new TextEncoder().encode('2000') })
      .mockResolvedValueOnce({ value: new TextEncoder().encode('1000') });
    expect(await cm.isProjectionCurrent('users')).toBe(false);
  });

  it('waitForConsistency returns false on timeout', async () => {
    (kv.get as any)
      .mockResolvedValueOnce({ value: new TextEncoder().encode('100') })
      .mockResolvedValueOnce({ value: new TextEncoder().encode('0') });
    expect(await cm.waitForConsistency('users', 500)).toBe(false);
  });

  it('getProjectionLag returns lag metrics', async () => {
    (kv.get as any).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const lag = await cm.getProjectionLag('users');
    expect(lag.lagMs).toBeGreaterThanOrEqual(0);
    expect(lag.pendingEvents).toBe(0);
  });
});
