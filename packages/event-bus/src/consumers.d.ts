import { NatsConnectionManager } from './nats-connection';
export interface ConsumerGroupConfig {
    name: string;
    streamName: string;
    durableName?: string;
    ackPolicy?: 'explicit' | 'none' | 'all';
    maxDeliver?: number;
    ackWait?: number;
    replayPolicy?: 'instant' | 'original';
}
export interface ConsumerMember {
    id: string;
    groupId: string;
    lastActive: number;
    processedCount: number;
}
export declare class ConsumerGroup {
    private config;
    private members;
    constructor(config: ConsumerGroupConfig);
    addMember(memberId: string): void;
    removeMember(memberId: string): void;
    updateMemberActivity(memberId: string): void;
    incrementProcessedCount(memberId: string): void;
    getMembers(): ConsumerMember[];
    getMemberCount(): number;
    getInactiveMembers(inactiveThresholdMs?: number): ConsumerMember[];
    getConfig(): ConsumerGroupConfig;
}
export declare class ConsumerGroupManager {
    private connectionManager;
    private groups;
    constructor(connectionManager: NatsConnectionManager);
    initialize(): Promise<void>;
    createGroup(config: ConsumerGroupConfig): Promise<ConsumerGroup>;
    getGroup(name: string): ConsumerGroup | undefined;
    deleteGroup(name: string): Promise<void>;
    listGroups(): string[];
    cleanupInactiveMembers(inactiveThresholdMs?: number): Promise<void>;
    getStats(): Array<{
        groupName: string;
        memberCount: number;
        totalProcessed: number;
    }>;
}
export declare function createConsumerGroupManager(connectionManager: NatsConnectionManager): ConsumerGroupManager;
//# sourceMappingURL=consumers.d.ts.map