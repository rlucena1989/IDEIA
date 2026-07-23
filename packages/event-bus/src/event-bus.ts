import { randomUUID } from 'crypto';
import { AuditTrail } from '@ideia/audit-trail';
import { Contract, BusEventSchema } from '@ideia/contracts';
import { BusEvent, EventHandler, EventType, Subscription, IEventBus, EventEmitInput } from './types';
import { createLogger, Logger } from '@ideia/logger';

const log = createLogger('event-bus');

export class EventBus implements IEventBus {
  private subscriptions: Map<string, Subscription[]> = new Map();
  private history: BusEvent[] = [];
  private maxHistory: number;
  private logger: Logger;

  constructor(maxHistory = 1000, private auditTrail?: AuditTrail, logger?: Logger) {
    this.maxHistory = maxHistory;
    this.logger = logger ?? log;
  }

  async subscribe(eventType: string, handler: EventHandler, once = false): Promise<string> {
    const id = randomUUID();
    const subs = this.subscriptions.get(eventType) || [];
    subs.push({ id, eventType, handler, once });
    this.subscriptions.set(eventType, subs);
    return id;
  }

  async subscribeOnce(eventType: EventType | '*', handler: EventHandler): Promise<string> {
    return this.subscribe(eventType, handler, true);
  }

  async unsubscribe(id: string): Promise<boolean> {
    for (const [type, subs] of this.subscriptions) {
      const idx = subs.findIndex(s => s.id === id);
      if (idx !== -1) {
        subs.splice(idx, 1);
        if (subs.length === 0) this.subscriptions.delete(type);
        return true;
      }
    }
    return false;
  }

  async emit(event: EventEmitInput): Promise<BusEvent> {
    const fullEvent: BusEvent = {
      ...event,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const validation = Contract.pre(BusEventSchema, fullEvent);
    if (!validation.success) {
      this.logger.warn('Schema validation warning', { errors: validation.error.format() });
    }

    this.history.push(fullEvent);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    if (this.auditTrail) {
      try {
        await this.auditTrail.append({
          actor: 'system',
          eventType: event.type,
          target: event.source,
          decision: 'approved',
          result: 'success',
          metadata: { payload: event.payload }
        });
      } catch (_err) {
        this.logger.error('AuditTrail append error', { error: String(err) });
      }
    }

    const wildcardSubs = this.subscriptions.get('*') || [];
    const typeSubs = this.subscriptions.get(event.type) || [];
    const allSubs = [...wildcardSubs, ...typeSubs];

    const onceSubs: string[] = [];

    for (const sub of allSubs) {
      try {
        await sub.handler(fullEvent);
      } catch (_err) {
        this.logger.error('Handler error', { error: String(err), eventType: event.type });
      }
      if (sub.once) onceSubs.push(sub.id);
    }

    onceSubs.forEach(id => this.unsubscribe(id));

    return fullEvent;
  }

  async getHistory(eventType?: string): Promise<BusEvent[]> {
    if (eventType) return this.history.filter(e => e.type === eventType);
    return [...this.history];
  }

  async clearHistory(): Promise<void> {
    this.history = [];
  }

  async subscriberCount(): Promise<number> {
    let count = 0;
    for (const subs of this.subscriptions.values()) {
      count += subs.length;
    }
    return count;
  }
}

export function createEventBus(maxHistory?: number, auditTrail?: AuditTrail, logger?: Logger): EventBus {
  return new EventBus(maxHistory, auditTrail, logger);
}
