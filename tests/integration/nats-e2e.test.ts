import { createBus } from '../../packages/event-bus/src/event-bus-factory';

const NATS_AVAILABLE = (() => {
  try {
    const url = process.env.NATS_URL || 'nats://localhost:4222';
    const { connect } = require('nats');
    return true;
  } catch { return false; }
})();

const describeOrSkip = NATS_AVAILABLE ? describe : describe.skip;

describeOrSkip('NATS JetStream E2E', () => {
  let bus: Awaited<ReturnType<typeof createBus>>;
  const testSubject = 'test.e2e';

  beforeAll(async () => {
    bus = await createBus({ type: 'nats', nats: { servers: process.env.NATS_URL || 'nats://localhost:4222' } });
  });

  afterAll(async () => {
    await bus.clearHistory();
  });

  it('should connect and emit events', async () => {
    const received: string[] = [];
    await bus.subscribe(testSubject, (event) => { received.push(event.type); });
    await bus.emit({ type: testSubject, source: 'e2e-test', payload: { msg: 'hello' } });
    await new Promise(r => setTimeout(r, 200));
    expect(received).toContain(testSubject);
  });

  it('should support wildcard subscriptions', async () => {
    const received: string[] = [];
    await bus.subscribe('test.*', (event) => { received.push(event.type); });
    await bus.emit({ type: 'test.wildcard', source: 'e2e-test', payload: {} });
    await new Promise(r => setTimeout(r, 200));
    expect(received).toContain('test.wildcard');
  });

  it('should retrieve event history', async () => {
    await bus.emit({ type: 'test.history', source: 'e2e-test', payload: { seq: 1 } });
    await bus.emit({ type: 'test.history', source: 'e2e-test', payload: { seq: 2 } });
    const history = await bus.getHistory('test.history');
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle subscribe/unsubscribe lifecycle', async () => {
    let count = 0;
    const subId = await bus.subscribe('test.lifecycle', () => { count++; });
    expect(subId).toBeDefined();
    await bus.emit({ type: 'test.lifecycle', source: 'e2e-test', payload: {} });
    await new Promise(r => setTimeout(r, 100));
    expect(count).toBe(1);
    const unsubbed = await bus.unsubscribe(subId);
    expect(unsubbed).toBe(true);
    await bus.emit({ type: 'test.lifecycle', source: 'e2e-test', payload: {} });
    await new Promise(r => setTimeout(r, 100));
    expect(count).toBe(1);
  });

  it('should fall back to memory if NATS unavailable', async () => {
    const fallbackBus = await createBus({ type: 'nats', nats: { servers: 'nats://localhost:9999' } });
    await expect(fallbackBus.emit({ type: 'test.fallback', source: 'e2e-test', payload: {} })).resolves.toBeDefined();
    await fallbackBus.clearHistory();
  });
});
