import { EdgeEvent } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('event-bus');

export class EdgeEventBus {
  private events: EdgeEvent[] = [];
  private subscribers: Map<string, Array<(event: EdgeEvent) => void>> = new Map();
  private maxEvents = 1000;

  publish(event: Omit<EdgeEvent, 'id' | 'timestamp'>): EdgeEvent {
    const full: EdgeEvent = { id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: Date.now(), ...event };
    this.events.push(full);
    if (this.events.length > this.maxEvents) this.events = this.events.slice(-this.maxEvents);
    const handlers = this.subscribers.get(event.type) ?? [];
    for (const h of handlers) { try { h(full); } catch { /* handler error */ } }
    return full;
  }

  subscribe(type: string, handler: (event: EdgeEvent) => void): () => void {
    const list = this.subscribers.get(type) ?? [];
    list.push(handler);
    this.subscribers.set(type, list);
    return () => { this.subscribers.set(type, list.filter(h => h !== handler)); };
  }

  replay(since: number): EdgeEvent[] { return this.events.filter(e => e.timestamp >= since); }
  getStats(): { total: number; activeSubscriptions: number } { return { total: this.events.length, activeSubscriptions: Array.from(this.subscribers.values()).reduce((a, b) => a + b.length, 0) }; }
}
