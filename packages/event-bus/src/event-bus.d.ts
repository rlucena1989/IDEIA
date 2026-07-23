import { AuditTrail } from '@ideia/audit-trail';
import { BusEvent, EventHandler, EventType } from './types';
import { Logger } from '@ideia/logger';
export declare class EventBus {
    private auditTrail?;
    private subscriptions;
    private history;
    private maxHistory;
    private logger;
    constructor(maxHistory?: number, auditTrail?: AuditTrail | undefined, logger?: Logger);
    subscribe(eventType: string, handler: EventHandler, once?: boolean): string;
    subscribeOnce(eventType: EventType | '*', handler: EventHandler): string;
    unsubscribe(id: string): boolean;
    emit(event: {
        type: string;
        source: string;
        payload?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
    }): Promise<BusEvent>;
    getHistory(eventType?: string): BusEvent[];
    clearHistory(): void;
    subscriberCount(): number;
}
export declare function createEventBus(maxHistory?: number, auditTrail?: AuditTrail, logger?: Logger): EventBus;
//# sourceMappingURL=event-bus.d.ts.map