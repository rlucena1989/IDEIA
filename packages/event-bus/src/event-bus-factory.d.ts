import { type Logger } from '@ideia/logger';
import { NatsEventBusConfig } from './nats-event-bus';
import { IEventBus } from './types';
import { AuditTrail } from '@ideia/audit-trail';
export type BusType = 'memory' | 'nats' | 'auto';
export interface EventBusFactoryConfig {
    type?: BusType;
    nats?: NatsEventBusConfig;
    memory?: {
        maxHistory?: number;
    };
    auditTrail?: AuditTrail;
    logger?: Logger;
}
export declare function createBus(config?: EventBusFactoryConfig): Promise<IEventBus>;
//# sourceMappingURL=event-bus-factory.d.ts.map