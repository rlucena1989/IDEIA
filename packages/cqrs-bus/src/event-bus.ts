import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { Event } from './types';
const logger = createLogger('event-bus');

type EventHandler = (event: Event) => Promise<void>;

export class EventBus {
  private _subscribers: Map<string, Set<EventHandler>> = new Map();
  private _history: Event[] = [];

  publish(event: Omit<Event, 'id'>): Event {
    const full: Event = {
      id: randomUUID(),
      ...event,
    };
    this._history.push(full);
    if (this._history.length > 10000) this._history.shift();

    const handlers = this._subscribers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(full).catch((err) => logger.error('handler error', { error: err }));
      }
    }

    const wildcardHandlers = this._subscribers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        handler(full).catch((err) => logger.error('wildcard handler error', { error: err }));
      }
    }

    return full;
  }

  subscribe(eventType: string, handler: EventHandler): void {
    if (!this._subscribers.has(eventType)) {
      this._subscribers.set(eventType, new Set());
    }
    this._subscribers.get(eventType)!.add(handler);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    this._subscribers.get(eventType)?.delete(handler);
  }

  getHistory(eventType?: string): Event[] {
    if (eventType) return this._history.filter(e => e.type === eventType);
    return [...this._history];
  }

  getSubscriberCount(): number {
    let count = 0;
    for (const handlers of this._subscribers.values()) {
      count += handlers.size;
    }
    return count;
  }

  clear(): void {
    this._subscribers.clear();
    this._history = [];
  }
}