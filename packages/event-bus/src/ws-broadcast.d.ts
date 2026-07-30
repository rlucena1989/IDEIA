import type { IEventBus } from './types';
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
    start(eventBus: IEventBus): Promise<boolean>;
    stop(): Promise<void>;
    getClientCount(): number;
    isRunning(): boolean;
}
export declare function createWSBroadcast(config: WSBroadcastConfig): WSBroadcast;
//# sourceMappingURL=ws-broadcast.d.ts.map