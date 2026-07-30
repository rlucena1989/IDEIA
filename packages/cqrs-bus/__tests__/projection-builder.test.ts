import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ProjectionBuilder } from '../src/projection-builder';
import type { IMessageBus, IKvStore } from '../src/command-bus';

function createMockBus(): IMessageBus {
  return {
    publish: jest.fn() as any,
    request: jest.fn() as any,
  } as unknown as IMessageBus;
}

function createMockKv(): IKvStore {
  return {
    get: jest.fn() as any,
    put: jest.fn() as any,
  } as unknown as IKvStore;
}

describe('ProjectionBuilder', () => {
  let bus: IMessageBus;
  let kv: IKvStore;
  let builder: ProjectionBuilder;

  beforeEach(() => {
    bus = createMockBus();
    kv = createMockKv();
    builder = new ProjectionBuilder(bus, kv);
  });

  it('rebuildProjection stores rebuild metadata', async () => {
    await builder.rebuildProjection('users');
    expect(kv.put).toHaveBeenCalledWith('_meta:rebuild:users', expect.any(Uint8Array));
  });

  it('getProjectionState returns null when no entry', async () => {
    (kv.get as any).mockResolvedValue(null);
    const state = await builder.getProjectionState('users', 'user-1');
    expect(state).toBeNull();
  });

  it('getProjectionState returns parsed entry', async () => {
    const data = { name: 'John' };
    (kv.get as any).mockResolvedValue({ value: new TextEncoder().encode(JSON.stringify(data)) });
    const state = await builder.getProjectionState('users', 'user-1');
    expect(state).toEqual(data);
  });
});
