import { NatsConnectionManager } from './nats-connection';
export declare const EVENT_STREAMS: readonly ["agent.started", "agent.completed", "agent.failed", "agent.stuck", "task.created", "task.started", "task.completed", "task.failed", "policy.evaluated", "policy.violated", "cycle.completed", "feedback.submitted", "trace.linked", "workflow.completed", "file.change", "terminal.execution"];
export type EventStreamType = typeof EVENT_STREAMS[number];
export interface StreamConfigOptions {
    maxAge?: number;
    maxBytes?: number;
    maxMsgs?: number;
}
export declare class NatsStreamManager {
    private connectionManager;
    private streamConfigs;
    private inMemoryStreams;
    private jsm;
    private jetstreamEnabled;
    constructor(connectionManager: NatsConnectionManager);
    initialize(): Promise<void>;
    private toStreamName;
    createStream(eventType: string, options?: StreamConfigOptions): Promise<void>;
    deleteStream(eventType: string): Promise<void>;
    getStreamInfo(eventType: string): Promise<StreamConfigOptions | null>;
    listStreams(): Promise<string[]>;
    purgeStream(eventType: string): Promise<void>;
    getSubject(eventType: string): string;
    publish(eventType: string, data: unknown): Promise<void>;
    consume(eventType: string): Promise<Array<{
        data: unknown;
        timestamp: number;
    }>>;
    createConsumer(eventType: string, consumerName: string): Promise<void>;
    deleteConsumer(eventType: string, consumerName: string): Promise<void>;
    listConsumers(eventType: string): Promise<string[]>;
    getJetstreamStatus(): string;
}
export declare function createNatsStreamManager(connectionManager: NatsConnectionManager): NatsStreamManager;
//# sourceMappingURL=streams.d.ts.map