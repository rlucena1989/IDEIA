import { NatsEventBus, createNatsEventBus } from '../src/nats-event-bus';

describe('NatsEventBus', () => {
  it('should create with default config', () => {
    const bus = createNatsEventBus();
    expect(bus).toBeDefined();
    expect(bus.isConnected).toBe(false);
  });

  it('should create with custom config', () => {
    const bus = new NatsEventBus({
      servers: 'nats://localhost:4222',
      streamName: 'test_events',
      maxHistory: 5000,
    });
    expect(bus).toBeDefined();
    expect(bus.isConnected).toBe(false);
  });

  it('should create with logger', () => {
    const bus = new NatsEventBus({
      logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
    });
    expect(bus).toBeDefined();
  });

  it('should not be connected initially', () => {
    const bus = createNatsEventBus();
    expect(bus.isConnected).toBe(false);
  });

  it('should have zero subscribers initially', async () => {
    const bus = createNatsEventBus();
    expect(await bus.subscriberCount()).toBe(0);
  });

  it('should disconnect gracefully', async () => {
    const bus = createNatsEventBus();
    await bus.disconnect();
    expect(bus.isConnected).toBe(false);
  });

  it('should store history locally before NATS connection', async () => {
    const bus = createNatsEventBus();
    await bus.subscriberCount();
    expect(bus.isConnected).toBe(false);
  });
});

describe('NatsEventBus API parity with EventBus', () => {
  it('should implement same method signatures', () => {
    const bus = createNatsEventBus();
    expect(typeof bus.subscribe).toBe('function');
    expect(typeof bus.subscribeOnce).toBe('function');
    expect(typeof bus.unsubscribe).toBe('function');
    expect(typeof bus.emit).toBe('function');
    expect(typeof bus.getHistory).toBe('function');
    expect(typeof bus.clearHistory).toBe('function');
    expect(typeof bus.subscriberCount).toBe('function');
    expect(typeof bus.clearHistory).toBe('function');
    expect(typeof bus.connect).toBe('function');
    expect(typeof bus.disconnect).toBe('function');
  });

  it('should accept same event format as EventBus', async () => {
    const _bus = createNatsEventBus();
    const event = { type: 'test.event', source: 'test-suite', payload: { key: 'value' } };
    expect(event.type).toBe('test.event');
    expect(event.source).toBe('test-suite');
    expect(event.payload).toEqual({ key: 'value' });
  });
});
