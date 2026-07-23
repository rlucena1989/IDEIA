import { NatsConnection } from 'nats';
export interface NatsConnectionConfig {
    servers?: string | string[];
    token?: string;
    user?: string;
    pass?: string;
    name?: string;
    reconnect?: boolean;
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
    timeout?: number;
}
export interface ConnectionState {
    connected: boolean;
    server: string | null;
    reconnects: number;
    lastError: string | null;
}
export declare class NatsConnectionManager {
    private nc;
    private config;
    private state;
    private reconnectTimer;
    private stateChangeListeners;
    constructor(config?: NatsConnectionConfig);
    getState(): ConnectionState;
    onStateChange(listener: (state: ConnectionState) => void): () => void;
    private notifyStateChange;
    connect(): Promise<NatsConnection>;
    private scheduleReconnect;
    disconnect(): Promise<void>;
    getConnection(): NatsConnection | null;
    isConnected(): Promise<boolean>;
    getStringCodec(): import("nats").Codec<string>;
}
export declare function createNatsConnectionManager(config?: NatsConnectionConfig): NatsConnectionManager;
//# sourceMappingURL=nats-connection.d.ts.map