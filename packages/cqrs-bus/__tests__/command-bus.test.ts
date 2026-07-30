import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CommandBus, Command } from '../src/command-bus';
import type { IMessageBus, IKvStore } from '../src/command-bus';

jest.mock('uuid', () => ({
  v4: () => 'mocked-uuid',
}));

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

function makeCommand(overrides: Partial<Command> = {}): Command {
  return {
    id: '',
    type: 'test.command',
    aggregateId: 'agg-1',
    data: { key: 'value' },
    metadata: { agentId: 'agent-1', timestamp: Date.now(), correlationId: 'corr-1' },
    ...overrides,
  };
}

describe('CommandBus', () => {
  let bus: IMessageBus;
  let kv: IKvStore;
  let commandBus: CommandBus;

  beforeEach(() => {
    bus = createMockBus();
    kv = createMockKv();
    commandBus = new CommandBus(bus, kv);
  });

  it('dispatches a command', async () => {
    await commandBus.dispatch(makeCommand());
    expect(bus.publish).toHaveBeenCalledWith(
      'cmd.test.command',
      expect.any(Uint8Array),
      { headers: { 'content-type': 'application/json' } }
    );
  });

  it('throws when command type is missing', async () => {
    await expect(commandBus.dispatch(makeCommand({ type: '' }))).rejects.toThrow('Command type is required');
  });

  it('throws when aggregateId is missing', async () => {
    await expect(commandBus.dispatch(makeCommand({ aggregateId: '' }))).rejects.toThrow('Command aggregateId is required');
  });

  it('dispatchAndWait sends request and returns response', async () => {
    const result = await commandBus.dispatchAndWait<Command, { result: string }>(makeCommand());
    expect(result).toEqual({ result: 'ok' });
    expect(bus.request).toHaveBeenCalled();
  });

  it('dispatchWithDedup skips when already processed', async () => {
    (kv.get as any).mockResolvedValue({ value: new TextEncoder().encode('1') });
    await commandBus.dispatchWithDedup(makeCommand());
    expect(kv.get).toHaveBeenCalledWith('dedup:cmd:corr-1');
    expect(bus.publish).not.toHaveBeenCalled();
  });

  it('dispatchWithDedup dispatches when not in kv', async () => {
    (kv.get as any).mockResolvedValue(null);
    await commandBus.dispatchWithDedup(makeCommand());
    expect(kv.get).toHaveBeenCalled();
    expect(kv.put).toHaveBeenCalled();
    expect(bus.publish).toHaveBeenCalled();
  });

  it('dispatchWithDedup falls back when no kv', async () => {
    const cmdBusNoKv = new CommandBus(bus);
    await cmdBusNoKv.dispatchWithDedup(makeCommand());
    expect(bus.publish).toHaveBeenCalled();
  });
});
