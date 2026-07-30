import { IDEIA_LifecycleBackendService } from '../lifecycle-service';
import { IDEIA_HealthBackendService } from '../health-service';
import { IDEIA_ConfigBackendService } from '../config-service';
import { IDEIA_EventBridgeBackendService } from '../event-bridge';

class MockEventBus {
  private handlers = new Map<string, Array<(event: { id: string; type: string; timestamp: string; source: string; payload?: Record<string, unknown> }) => void | Promise<void>>>();

  async emit(event: { type: string; source: string; payload?: Record<string, unknown> }): Promise<{ id: string; type: string; timestamp: string; source: string; payload?: Record<string, unknown> }> {
    const busEvent = { id: 'mock-id', type: event.type, timestamp: new Date().toISOString(), source: event.source, payload: event.payload };
    const handlers = this.handlers.get(event.type) || [];
    for (const h of handlers) {
      await h(busEvent);
    }
    return busEvent;
  }

  async subscribe(_eventType: string, handler: (event: unknown) => void | Promise<void>): Promise<string> {
    const id = `sub-${Math.random().toString(36).slice(2)}`;
    // subscribe to all matching
    const types = _eventType === '*' ? [] : _eventType.split('|');
    const wrapped = async (event: unknown) => {
      const ev = event as { type: string };
      if (types.length === 0 || types.includes(ev.type)) {
        await handler(event);
      }
    };
    if (types.length === 0) {
      if (!this.handlers.has('*')) this.handlers.set('*', []);
      this.handlers.get('*')!.push(wrapped);
    } else {
      for (const t of types) {
        if (!this.handlers.has(t)) this.handlers.set(t, []);
        this.handlers.get(t)!.push(wrapped);
      }
    }
    return id;
  }

  async unsubscribe(_id: string): Promise<boolean> {
    return true;
  }

  async subscriberCount(): Promise<number> {
    return this.handlers.size;
  }

  async getHistory(): Promise<any[]> {
    return [];
  }
}

function createMockEventBus(): MockEventBus {
  return new MockEventBus();
}

describe('IDEIA_LifecycleService', () => {
  let service: IDEIA_LifecycleBackendService;

  beforeEach(() => {
    service = new IDEIA_LifecycleBackendService(createMockEventBus() as any);
  });

  it('starts as stopped', async () => {
    const status = await service.getStatus();
    expect(status.phase).toBe('stopped');
    expect(status.startedAt).toBeNull();
    expect(status.uptimeMs).toBe(0);
  });

  it('transitions to running after start()', async () => {
    await service.start();
    const status = await service.getStatus();
    expect(status.phase).toBe('running');
    expect(status.startedAt).not.toBeNull();
    expect(status.uptimeMs).toBeGreaterThanOrEqual(0);
    expect(status.components.core).toBe('ok');
    expect(status.components.eventBus).toBe('ok');
  });

  it('transitions to stopped after stop()', async () => {
    await service.start();
    await service.stop();
    const status = await service.getStatus();
    expect(status.phase).toBe('stopped');
    expect(status.startedAt).toBeNull();
  });

  it('restart cycles through stopped to running', async () => {
    await service.start();
    await service.restart();
    const status = await service.getStatus();
    expect(status.phase).toBe('running');
    expect(status.startedAt).not.toBeNull();
  });
});

describe('IDEIA_HealthService', () => {
  let service: IDEIA_HealthBackendService;

  beforeEach(() => {
    service = new IDEIA_HealthBackendService(createMockEventBus() as any);
  });

  it('returns overall health report', async () => {
    const health = await service.getHealth();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(health.overall);
    expect(health.subsystems.length).toBeGreaterThanOrEqual(3);
    expect(health.timestamp).toBeTruthy();
    expect(health.uptime).toBeGreaterThanOrEqual(0);
  });

  it('reports eventBus subsystem health', async () => {
    const health = await service.getHealth();
    const eventBus = health.subsystems.find((s: { name: string }) => s.name === 'eventBus');
    expect(eventBus).toBeDefined();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(eventBus!.status);
    expect(eventBus!.lastCheck).toBeTruthy();
  });

  it('returns system metrics', async () => {
    const metrics = await service.getMetrics();
    expect(metrics).toHaveProperty('eventBusSubscribers');
    expect(metrics).toHaveProperty('memoryUsage');
    expect(metrics).toHaveProperty('uptimeSeconds');
    expect(metrics).toHaveProperty('servicesRegistered');
    expect(metrics.servicesRegistered).toBeGreaterThanOrEqual(10);
  });
});

describe('IDEIA_ConfigService', () => {
  let service: IDEIA_ConfigBackendService;

  beforeEach(() => {
    service = new IDEIA_ConfigBackendService(createMockEventBus() as any);
  });

  it('returns full config with defaults', async () => {
    const config = await service.getFullConfig();
    expect(Object.keys(config)).toContain('ideia.autonomy.level');
    expect(config['ideia.autonomy.level']).toBe('guided');
    expect(Object.keys(config)).toContain('ideia.ui.theme');
    expect(config['ideia.ui.theme']).toBe('dark');
  });

  it('returns config value for specific path', async () => {
    const entry = await service.getConfig('ideia.chat.maxHistory');
    expect(entry.key).toBe('ideia.chat.maxHistory');
    expect(entry.value).toBe(100);
    expect(entry.type).toBe('number');
    expect(entry.description).toBeTruthy();
  });

  it('returns not-found entry for unknown path', async () => {
    const entry = await service.getConfig('nonexistent.path');
    expect(entry.key).toBe('nonexistent.path');
    expect(entry.value).toBeNull();
  });

  it('setConfig stores and emits event', async () => {
    await service.setConfig('ideia.test.value', 42);
    const entry = await service.getConfig('ideia.test.value');
    expect(entry.value).toBe(42);
    expect(entry.type).toBe('number');
  });
});

describe('IDEIA_EventBridge', () => {
  let service: IDEIA_EventBridgeBackendService;

  beforeEach(() => {
    service = new IDEIA_EventBridgeBackendService(createMockEventBus() as any);
  });

  it('creates a subscription', async () => {
    const id = await service.subscribe();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('subscribe with eventTypes filters events', async () => {
    const id = await service.subscribe(['test.event']);
    const subs = await service.getActiveSubscriptions();
    const sub = subs.find(s => s.id === id);
    expect(sub).toBeDefined();
    expect(sub!.eventTypes).toEqual(['test.event']);
  });

  it('unsubscribe removes subscription', async () => {
    const id = await service.subscribe();
    await service.unsubscribe(id);
    const subs = await service.getActiveSubscriptions();
    expect(subs.find(s => s.id === id)).toBeUndefined();
  });

  it('getRecentEvents returns stored events', async () => {
    const eb = createMockEventBus() as never;
    service = new IDEIA_EventBridgeBackendService(eb as never);
    await service.subscribe(['lifecycle.started']);
    await (eb as MockEventBus).emit({ type: 'lifecycle.started', source: 'test', payload: { ok: true } });
    await (eb as MockEventBus).emit({ type: 'lifecycle.started', source: 'test', payload: { ok: true } });
    const events = await service.getRecentEvents(10);
    expect(events.length).toBe(2);
    expect(events[0].type).toBe('lifecycle.started');
  });

  it('streamEvents yields events as AsyncIterable', async () => {
    const eb = createMockEventBus() as never;
    service = new IDEIA_EventBridgeBackendService(eb);
    const stream = service.streamEvents(['test.stream']);

    const iterator = stream[Symbol.asyncIterator]();

    setTimeout(async () => {
      await (eb as MockEventBus).emit({ type: 'test.stream', source: 'test', payload: { data: 1 } });
    }, 10);

    const result = await iterator.next();
    expect(result.done).toBe(false);
    expect(result.value.type).toBe('test.stream');

    iterator.return?.();
  });
});
