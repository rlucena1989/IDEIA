import { NatsConnectionManager } from './nats-connection';
import { NatsStreamManager } from './streams';
import { DeadLetterQueue } from './dlq';
import { ConsumerGroupManager } from './consumers';
import { KVStore } from './kv-store';
import { ObjectStore } from './object-store';
import { RequestReplyManager } from './req-reply';
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: number;
    components: {
        connection: ComponentHealth;
        streams: ComponentHealth;
        dlq: ComponentHealth;
        consumers: ComponentHealth;
        kv: ComponentHealth;
        objectStore: ComponentHealth;
        reqReply: ComponentHealth;
    };
}
export interface ComponentHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    message?: string;
    details?: Record<string, unknown>;
}
export declare class HealthCheck {
    private connectionManager;
    private streamManager?;
    private dlq?;
    private consumerGroupManager?;
    private kvStore?;
    private objectStore?;
    private reqReplyManager?;
    constructor(connectionManager: NatsConnectionManager);
    setStreamManager(manager: NatsStreamManager): void;
    setDLQ(dlq: DeadLetterQueue): void;
    setConsumerGroupManager(manager: ConsumerGroupManager): void;
    setKVStore(store: KVStore): void;
    setObjectStore(store: ObjectStore): void;
    setRequestReplyManager(manager: RequestReplyManager): void;
    check(): Promise<HealthStatus>;
    private checkConnection;
    private checkStreams;
    private checkDLQ;
    private checkConsumers;
    private checkKV;
    private checkObjectStore;
    private checkReqReply;
    private calculateOverallStatus;
}
export declare function createHealthCheck(connectionManager: NatsConnectionManager): HealthCheck;
//# sourceMappingURL=health.d.ts.map