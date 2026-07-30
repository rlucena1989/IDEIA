import { injectable } from '@theia/core/shared/inversify';
import { createLogger } from '@ideia/logger';
import type { IEventBus } from '@ideia/event-bus';
import { v4 as uuid } from 'uuid';
import type {  } from '@ideia/event-bus';
import type { BusEvent } from '@ideia/event-bus';
import {
  IDEIA_EventBridge, BridgeEvent, BridgeSubscription,
} from '../common/ideia-protocol';
const logger = createLogger('event-bridge');

@injectable()
export class IDEIA_EventBridgeBackendService implements IDEIA_EventBridge {
  private subscriptions = new Map<string, BridgeSubscription>();
  private recentEvents: BridgeEvent[] = [];
  private busSubscriptions = new Map<string, string>();
  private streamQueues = new Map<string, Array<{ resolve: (value: IteratorResult<BridgeEvent>) => void }>>();
  private maxRecentEvents = 200;
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus) { this.eventBus = eventBus; }

  async subscribe(eventTypes?: string[]): Promise<string> {
    const id = uuid();
    const types = eventTypes ?? [];

    this.subscriptions.set(id, {
      id,
      eventTypes: types,
      createdAt: new Date().toISOString(),
    });

    const handler = (event: BusEvent): void => {
      if (types.length === 0 || types.includes(event.type)) {
        const bridgeEvent: BridgeEvent = {
          id: event.id,
          type: event.type,
          timestamp: event.timestamp,
          source: event.source,
          payload: event.payload as Record<string, unknown> | undefined,
        };
        this.recentEvents.push(bridgeEvent);
        if (this.recentEvents.length > this.maxRecentEvents) {
          this.recentEvents = this.recentEvents.slice(-this.maxRecentEvents);
        }
        this.drainStreamQueue(id, bridgeEvent);
      }
    };

    const pattern = types.length === 0 ? '*' : types.join('|');
    const subId = await this.eventBus.subscribe(pattern, handler);
    this.busSubscriptions.set(id, subId);

    return id;
  }

  async unsubscribe(id: string): Promise<void> {
    const busSubId = this.busSubscriptions.get(id);
    if (busSubId) {
      await this.eventBus.unsubscribe(busSubId);
      this.busSubscriptions.delete(id);
    }
    this.subscriptions.delete(id);
    this.streamQueues.delete(id);
  }

  async getActiveSubscriptions(): Promise<BridgeSubscription[]> {
    return Array.from(this.subscriptions.values());
  }

  async getRecentEvents(count = 50): Promise<BridgeEvent[]> {
    return this.recentEvents.slice(-count);
  }

  async *streamEvents(eventTypes?: string[]): AsyncIterable<BridgeEvent> {
    const subId = await this.subscribe(eventTypes);
    const queue: Array<{ resolve: (value: IteratorResult<BridgeEvent>) => void }> = [];
    this.streamQueues.set(subId, queue);

    try {
      while (true) {
        const event = await new Promise<BridgeEvent>(resolve => {
          queue.push({ resolve: (result: IteratorResult<BridgeEvent>) => resolve(result.value) });
        });
        yield event;
      }
    } finally {
      await this.unsubscribe(subId);
    }
  }

  private drainStreamQueue(id: string, event: BridgeEvent): void {
    const queue = this.streamQueues.get(id);
    if (queue && queue.length > 0) {
      const waiter = queue.shift();
      if (waiter) {
        waiter.resolve({ value: event, done: false });
      }
    }
  }
}
