import { AuditTrail } from '@ideia/audit-trail';
import { BusEvent, EventHandler, EventType, IEventBus, EventEmitInput } from './types';
import { Logger } from '@ideia/logger';
export declare class EventBus implements IEventBus {
    private auditTrail?;
    private subscriptions;
    private history;
    private maxHistory;
    private logger;
    constructor(maxHistory?: number, auditTrail?: AuditTrail | undefined, logger?: Logger);
    subscribe(eventType: string, handler: EventHandler, once?: boolean): Promise<string>;
    subscribeOnce(eventType: EventType | '*', handler: EventHandler): Promise<string>;
    unsubscribe(id: string): Promise<boolean>;
    emit(event: EventEmitInput): Promise<BusEvent>;
    getHistory(eventType?: string): Promise<BusEvent[]>;
    clearHistory(): Promise<void>;
    subscriberCount(): Promise<number>;
}
export declare function createEventBus(maxHistory?: number, auditTrail?: AuditTrail, logger?: Logger): EventBus;
//# sourceMappingURL=event-bus.d.ts.map