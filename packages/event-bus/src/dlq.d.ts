import { NatsConnectionManager } from './nats-connection';
export interface DeadLetterMessage {
    id?: string;
    originalSubject: string;
    originalData: unknown;
    error: string;
    timestamp: number;
    retryCount: number;
    maxRetries?: number;
}
export interface DLQConfig {
    maxRetries?: number;
    maxAge?: number;
    maxMessages?: number;
}
export declare class DeadLetterQueue {
    private connectionManager;
    private config;
    private messages;
    constructor(connectionManager: NatsConnectionManager, config?: DLQConfig);
    initialize(config?: Partial<DLQConfig>): Promise<void>;
    add(message: DeadLetterMessage): Promise<void>;
    getRetryableMessages(): Promise<DeadLetterMessage[]>;
    getFailedMessages(): Promise<DeadLetterMessage[]>;
    retry(message: DeadLetterMessage): Promise<void>;
    remove(message: DeadLetterMessage): Promise<void>;
    cleanup(): Promise<void>;
    getStats(): Promise<{
        total: number;
        retryable: number;
        failed: number;
    }>;
    purge(): Promise<void>;
}
export declare function createDeadLetterQueue(connectionManager: NatsConnectionManager, config?: DLQConfig): DeadLetterQueue;
//# sourceMappingURL=dlq.d.ts.map