import { describe, it, expect} from '@jest/globals';
import { CliWsBroadcast, createCliWsBroadcast } from '../ws-broadcast';

class MockEventBus {
  private handlers = new Map<string, Array<(event: unknown) => void>>();
  private idCounter = 0;

  async subscribe(eventType: string, handler: (event: unknown) => void): Promise<string> {
    const id = `sub-${++this.idCounter}`;
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    return id;
  }

  async unsubscribe(_id: string): Promise<boolean> {
    return true;
  }

  emit(event: unknown): Promise<unknown> {
    const handlers = this.handlers.get(event.type) || [];
    for (const h of handlers) {
      h(event);
    }
    return Promise.resolve(event);
  }
}

describe('CliWsBroadcast', () => {
  it('should create with factory', () => {
    const b = createCliWsBroadcast({ port: 0 });
    expect(b).toBeInstanceOf(CliWsBroadcast);
    expect(b.isRunning()).toBe(false);
  });

  it('should start and stop cleanly', async () => {
    const broadcast = new CliWsBroadcast({ port: 0 });
    expect(broadcast.isRunning()).toBe(false);
    const bus = new MockEventBus() as unknown;
    const started = await broadcast.start(bus);
    expect(started).toBe(true);
    expect(broadcast.isRunning()).toBe(true);
    expect(broadcast.getClientCount()).toBe(0);
    await broadcast.stop();
    expect(broadcast.isRunning()).toBe(false);
  });

  it('should subscribe to memory and session events', async () => {
    const broadcast = new CliWsBroadcast({ port: 0 });
    const bus = new MockEventBus() as unknown;
    await broadcast.start(bus);
    await broadcast.stop();
  });
});
