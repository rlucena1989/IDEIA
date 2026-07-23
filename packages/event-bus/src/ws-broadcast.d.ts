import { EventBus } from './event-bus';
export interface WSBroadcastConfig {
    port: number;
    host?: string;
    path?: string;
}
export declare class WSBroadcast {
    private wss;
    private clients;
    private config;
    private subscriptionId;
    private eventBus;
    constructor(config: WSBroadcastConfig);
    start(eventBus: EventBus): boolean;
    stop(): void;
    getClientCount(): number;
    isRunning(): boolean;
}
export declare function createWSBroadcast(config: WSBroadcastConfig): WSBroadcast;
//# sourceMappingURL=ws-broadcast.d.ts.map