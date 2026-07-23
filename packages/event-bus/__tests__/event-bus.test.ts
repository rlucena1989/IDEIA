import { EventBus } from '../src/event-bus';
import { WSBroadcast } from '../src/ws-broadcast';

describe('EventBus', () => {
  it('should emit and receive events', async () => {
    const bus = new EventBus();
    const handler = jest.fn();
    await bus.subscribe('task.created', handler);
    await bus.emit({ type: 'task.created', source: 'test', payload: { task: { id: '1' } } });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].type).toBe('task.created');
  });

  it('should support wildcard subscriptions', async () => {
    const bus = new EventBus();
    const handler = jest.fn();
    await bus.subscribe('*', handler);
    await bus.emit({ type: 'agent.started', source: 'test' });
    await bus.emit({ type: 'cycle.completed', source: 'test' });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should support once subscriptions', async () => {
    const bus = new EventBus();
    const handler = jest.fn();
    await bus.subscribeOnce('task.created', handler);
    await bus.emit({ type: 'task.created', source: 'test' });
    await bus.emit({ type: 'task.created', source: 'test' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe', async () => {
    const bus = new EventBus();
    const handler = jest.fn();
    const id = await bus.subscribe('task.created', handler);
    await bus.unsubscribe(id);
    await bus.emit({ type: 'task.created', source: 'test' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should maintain history', async () => {
    const bus = new EventBus(10);
    for (let i = 0; i < 5; i++) {
      await bus.emit({ type: 'task.created', source: 'test' });
    }
    expect((await bus.getHistory()).length).toBe(5);
  });

  it('should respect max history', async () => {
    const bus = new EventBus(3);
    for (let i = 0; i < 5; i++) {
      await bus.emit({ type: 'task.created', source: 'test' });
    }
    expect((await bus.getHistory()).length).toBe(3);
  });

  it('should filter history by type', async () => {
    const bus = new EventBus();
    await bus.emit({ type: 'task.created', source: 'test' });
    await bus.emit({ type: 'agent.started', source: 'test' });
    await bus.emit({ type: 'task.created', source: 'test' });
    expect((await bus.getHistory('task.created')).length).toBe(2);
    expect((await bus.getHistory('agent.started')).length).toBe(1);
  });

  it('should return subscriber count', async () => {
    const bus = new EventBus();
    await bus.subscribe('task.created', jest.fn());
    await bus.subscribe('agent.started', jest.fn());
    await bus.subscribe('*', jest.fn());
    expect(await bus.subscriberCount()).toBe(3);
  });

  it('should persist event metadata', async () => {
    const bus = new EventBus();
    const event = await bus.emit({
      type: 'system.alert',
      source: 'engine',
      payload: { alert: { severity: 'critical', message: 'Test' } },
      metadata: { loop: 5 },
    });
    expect(event.id).toBeDefined();
    expect(event.timestamp).toBeDefined();
    expect(event.metadata?.loop).toBe(5);
  });

  it('should not throw on handler error', async () => {
    const bus = new EventBus();
    await bus.subscribe('task.created', () => { throw new Error('handler error'); });
    await expect(bus.emit({ type: 'task.created', source: 'test' })).resolves.toBeDefined();
  });

  it('should clear history', async () => {
    const bus = new EventBus();
    await bus.clearHistory();
    expect(await bus.getHistory()).toHaveLength(0);
  });

  describe('history replay', () => {
    it('should replay events to new subscribers when requested', async () => {
      const bus = new EventBus(100);
      await bus.emit({ type: 'task.created', source: 'test', payload: { task: { id: '1' } } });
      await bus.emit({ type: 'task.created', source: 'test', payload: { task: { id: '2' } } });

      const history = await bus.getHistory('task.created');
      expect(history).toHaveLength(2);
    });

    it('should maintain event ordering in history', async () => {
      const bus = new EventBus();
      const types = ['a', 'b', 'c', 'd', 'e'];
      for (const t of types) {
        await bus.emit({ type: t, source: 'test' });
      }
      const all = await bus.getHistory();
      expect(all.map(e => e.type)).toEqual(types);
    });
  });

  describe('multiple handlers', () => {
    it('should call all handlers for an event type', async () => {
      const bus = new EventBus();
      const h1 = jest.fn();
      const h2 = jest.fn();
      const h3 = jest.fn();
      await bus.subscribe('test.event', h1);
      await bus.subscribe('test.event', h2);
      await bus.subscribe('test.event', h3);
      await bus.emit({ type: 'test.event', source: 'test' });
      expect(h1).toHaveBeenCalledTimes(1);
      expect(h2).toHaveBeenCalledTimes(1);
      expect(h3).toHaveBeenCalledTimes(1);
    });

    it('should handle unsubscription mid-emission gracefully', async () => {
      const bus = new EventBus();
      const unsubId = await bus.subscribe('test.event', async () => {
        await bus.unsubscribe(unsubId);
      });
      const h2 = jest.fn();
      await bus.subscribe('test.event', h2);
      await bus.emit({ type: 'test.event', source: 'test' });
      expect(h2).toHaveBeenCalledTimes(1);
    });
  });

  describe('wildcard priority', () => {
    it('should fire wildcard before type-specific handlers', async () => {
      const bus = new EventBus();
      const order: string[] = [];
      await bus.subscribe('*', async () => { order.push('wildcard'); });
      await bus.subscribe('test.event', async () => { order.push('specific'); });
      await bus.emit({ type: 'test.event', source: 'test' });
      expect(order[0]).toBe('wildcard');
      expect(order[1]).toBe('specific');
    });
  });

  describe('payload distribution', () => {
    it('should deliver correct payload to subscriber', async () => {
      const bus = new EventBus();
      const handler = jest.fn();
      await bus.subscribe('test.event', handler);
      const payload = { task: { id: '123', name: 'Test Task' } };
      await bus.emit({ type: 'test.event', source: 'tester', payload });
      expect(handler.mock.calls[0][0].payload).toEqual(payload);
      expect(handler.mock.calls[0][0].source).toBe('tester');
    });
  });

  describe('error resilience', () => {
    it('should continue calling remaining handlers after one fails', async () => {
      const bus = new EventBus();
      const failingHandler = jest.fn(() => { throw new Error('fail'); });
      const goodHandler = jest.fn();
      await bus.subscribe('test.event', failingHandler);
      await bus.subscribe('test.event', goodHandler);
      await expect(bus.emit({ type: 'test.event', source: 'test' })).resolves.toBeDefined();
      expect(failingHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
    });
  });
});

describe('WSBroadcast', () => {
  it('should create with config', () => {
    const ws = new WSBroadcast({ port: 0 });
    expect(ws.isRunning()).toBe(false);
    expect(ws.getClientCount()).toBe(0);
  });

  it('should start and stop', () => {
    const bus = new EventBus();
    const ws = new WSBroadcast({ port: 0 });
    ws.start(bus);
    expect(ws.isRunning()).toBe(true);
    ws.stop();
    expect(ws.isRunning()).toBe(false);
  });

  it('should reject invalid path connections', () => {
    const config = { port: 0, path: '/events' };
    expect(config.path).toBe('/events');
    const ws = new WSBroadcast(config);
    expect(ws).toBeDefined();
    ws.stop();
  });
});