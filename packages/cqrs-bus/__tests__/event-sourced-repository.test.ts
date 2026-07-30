import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Aggregate, EventSourcedRepository } from '../src/event-sourced-repository';
import type { IMessageBus } from '../src/command-bus';

function createMockBus(): IMessageBus {
  return {
    publish: jest.fn() as any,
    request: jest.fn() as any,
  } as unknown as IMessageBus;
}

describe('Aggregate', () => {
  it('creates aggregate with id and version 0', () => {
    const agg = new Aggregate('agg-1');
    expect(agg.id).toBe('agg-1');
    expect(agg.version).toBe(0);
  });

  it('applies event and increments version', () => {
    const agg = new Aggregate('agg-1');
    agg.applyEvent({ type: 'TestEvent', data: { value: 1 } });
    expect(agg.version).toBe(1);
    expect(agg.getUncommittedEvents().length).toBe(1);
  });

  it('raiseEvent creates event with metadata', () => {
    const agg = new Aggregate('agg-1');
    agg.raiseEvent('UserCreated', { name: 'John' });
    const events = agg.getUncommittedEvents();
    expect(events.length).toBe(1);
    expect(events[0]).toMatchObject({
      type: 'UserCreated',
      data: { name: 'John' },
      aggregateId: 'agg-1',
    });
  });

  it('markEventsCommitted clears event buffer', () => {
    const agg = new Aggregate('agg-1');
    agg.raiseEvent('Event1', {});
    agg.markEventsCommitted();
    expect(agg.getUncommittedEvents()).toEqual([]);
  });
});

describe('EventSourcedRepository', () => {
  let bus: IMessageBus;
  let repo: EventSourcedRepository;

  beforeEach(() => {
    bus = createMockBus();
    repo = new EventSourcedRepository(bus);
  });

  it('saves uncommitted events and marks committed', async () => {
    const agg = new Aggregate('agg-1');
    agg.raiseEvent('UserCreated', { name: 'John' });
    await repo.save(agg);
    expect(bus.publish).toHaveBeenCalledWith('evt.UserCreated', expect.any(Uint8Array));
    expect(agg.getUncommittedEvents()).toEqual([]);
  });

  it('load creates empty aggregate', async () => {
    const agg = await repo.load('users', 'agg-1');
    expect(agg).toBeInstanceOf(Aggregate);
    expect(agg.id).toBe('agg-1');
    expect(agg.version).toBe(0);
  });
});
