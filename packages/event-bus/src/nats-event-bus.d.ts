import { AuditTrail } from '@ideia/audit-trail';
import { BusEvent, EventHandler, EventType, IEventBus, EventEmitInput } from './types';
export interface NatsEventBusConfig {
    servers?: string | string[];
    streamName?: string;
    maxHistory?: number;
    auditTrail?: AuditTrail;
    logger?: Logger;
    reconnect?: boolean;
    maxReconnectAttempts?: number;
}
export interface ReplayOptions {
    eventType?: string;
    fromSeq?: number;
    fromTimestamp?: string;
    maxEvents?: number;
}
export interface StoredEvent {
    seq: number;
    event: BusEvent;
    timestamp: string;
}
export interface Logger {
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
}
export declare class NatsEventBus implements IEventBus {
    private config;
    private nc;
    private js;
    private jsm;
    private subs;
    private stored;
    private maxHistory;
    private streamName;
    private logger;
    private auditTrail?;
    private connected;
    private seqCounter;
    private sc;
    private reconnectTimer;
    constructor(config?: NatsEventBusConfig);
    get isConnected(): boolean;
    connect(): Promise<void>;
    private setupReconnectHandler;
    private ensureStream;
    subscribe(eventType: string, handler: EventHandler, once?: boolean): Promise<string>;
    subscribeOnce(eventType: EventType | '*', handler: EventHandler): Promise<string>;
    unsubscribe(id: string): Promise<boolean>;
    emit(event: EventEmitInput): Promise<BusEvent>;
    getHistory(eventType?: string): Promise<BusEvent[]>;
    subscriberCount(): Promise<number>;
    clearHistory(): Promise<void>;
    replayFromSequence(fromSeq: number, options?: ReplayOptions): Promise<BusEvent[]>;
    replayFromTimestamp(fromTimestamp: string, options?: ReplayOptions): Promise<BusEvent[]>;
    replayFromJetStream(options?: {
        eventType?: string;
        maxEvents?: number;
    }): Promise<BusEvent[]>;
    replayState(options?: ReplayOptions): Promise<Map<string, BusEvent>>;
    disconnect(): Promise<void>;
}
export declare function createNatsEventBus(config?: NatsEventBusConfig): NatsEventBus;
//# sourceMappingURL=nats-event-bus.d.ts.map