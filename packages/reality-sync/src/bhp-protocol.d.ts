import { EventEmitter } from 'node:events';
type BHPMessageType = 'HELP' | 'STATS' | 'PLAN' | 'APPROVE' | 'REJECT' | 'CLARIFY' | 'ADAPT';
export interface BHPMessage {
    id: string;
    type: BHPMessageType;
    from: string;
    to: string;
    context: string;
    payload?: Record<string, unknown>;
    timestamp: number;
    expiresAt: number;
}
interface BHPPendingMessage {
    message: BHPMessage;
    status: 'pending' | 'approved' | 'rejected' | 'expired' | 'clarified';
    respondedAt?: number;
}
export interface BHPStatus {
    pendingCount: number;
    lastMessage: BHPMessage | null;
    messages: BHPPendingMessage[];
    queueSize: number;
}
export declare class BHPProtocol extends EventEmitter {
    private messages;
    private pending;
    private timeoutTimer;
    constructor();
    private startTimeoutChecker;
    private generateId;
    sendHelp(to: string, from: string, context: string): BHPMessage;
    sendStats(to: string, from: string, context: string, payload?: Record<string, unknown>): BHPMessage;
    sendPlan(agent: string, plan: Record<string, unknown>): BHPMessage;
    approvePlan(planId: string): BHPStatus | null;
    rejectPlan(planId: string, reason: string): BHPStatus | null;
    sendClarify(to: string, from: string, context: string, payload?: Record<string, unknown>): BHPMessage;
    sendAdapt(to: string, from: string, context: string, payload?: Record<string, unknown>): BHPMessage;
    respond(id: string, response: string): void;
    getStatus(): BHPStatus;
    getPendingPlans(): BHPPendingMessage[];
    destroy(): void;
}
export {};
//# sourceMappingURL=bhp-protocol.d.ts.map