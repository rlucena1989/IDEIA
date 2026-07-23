import { createBus } from '../src/event-bus-factory';
import { EventBus } from '../src/event-bus';
import { NatsEventBus } from '../src/nats-event-bus';

describe('EventBusFactory', () => {
  it('should create in-memory EventBus when type=memory', async () => {
    const bus = await createBus({ type: 'memory' });
    expect(bus).toBeDefined();
    expect(bus).toBeInstanceOf(EventBus);
    expect(await bus.subscriberCount()).toBe(0);
  });

  it('should create EventBus with custom maxHistory', async () => {
    const bus = await createBus({ type: 'memory', memory: { maxHistory: 50 } });
    expect(bus).toBeDefined();
    const event = await bus.emit({ type: 'test', source: 'factory' });
    expect(event.id).toBeDefined();
    expect(event.type).toBe('test');
  });

  it('should try NATS and fall back to in-memory when NATS unavailable', async () => {
    const bus = await createBus({ type: 'auto', nats: { servers: 'nats://localhost:1' } });
    expect(bus).toBeDefined();
    expect(bus).toBeInstanceOf(EventBus);
  });

  it('should try NATS when type=nats but fall back on connection failure', async () => {
    const bus = await createBus({ type: 'nats', nats: { servers: 'nats://localhost:1' } });
    expect(bus).toBeDefined();
    expect(bus).toBeInstanceOf(EventBus);
  });

  it('should create EventBus with auditTrail', async () => {
    const auditTrail = { append: jest.fn().mockResolvedValue(undefined) } as any;
    const bus = await createBus({ type: 'memory', auditTrail });
    const _event = await bus.emit({ type: 'test', source: 'factory' });
    expect(auditTrail.append).toHaveBeenCalled();
  });

  it('should return an IEventBus with subscribe/emit/unsubscribe working', async () => {
    const bus = await createBus({ type: 'memory' });
    const handler = jest.fn();
    await bus.subscribe('test.event', handler);
    await bus.emit({ type: 'test.event', source: 'factory' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].source).toBe('factory');
  });

  it('should handle wildcard subscriptions through IEventBus', async () => {
    const bus = await createBus({ type: 'memory' });
    const handler = jest.fn();
    await bus.subscribe('*', handler);
    await bus.emit({ type: 'any.event', source: 'test' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should manage history through IEventBus', async () => {
    const bus = await createBus({ type: 'memory', memory: { maxHistory: 10 } });
    await bus.emit({ type: 'event.a', source: 'test' });
    await bus.emit({ type: 'event.b', source: 'test' });
    const history = await bus.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].type).toBe('event.a');
    expect(history[1].type).toBe('event.b');
  });
});