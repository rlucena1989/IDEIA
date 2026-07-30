import { EventEmitter } from 'node:events';
export type DecisionType = 'plan' | 'execution' | 'policy' | 'security' | 'config';
export type DecisionStatus = 'pending' | 'auto-approved' | 'escalated' | 'approved' | 'rejected' | 'expired';
export interface Decision {
    id: string;
    type: DecisionType;
    description: string;
    context: Record<string, unknown>;
    status: DecisionStatus;
    createdAt: number;
    timeoutMs: number;
    escalatedTo?: string;
    resolvedAt?: number;
    resolution?: string;
}
export interface DecisionStatusReport {
    pending: number;
    autoApproved: number;
    escalated: number;
    approved: number;
    rejected: number;
    expired: number;
    decisions: Decision[];
}
export declare class DecisionContinuityEngine extends EventEmitter {
    private decisions;
    private timeouts;
    private escalationLevels;
    private timer;
    constructor(timeouts?: Partial<Record<DecisionType, number>>);
    private startTimeoutChecker;
    private generateId;
    registerDecision(decision: Omit<Decision, 'id' | 'status' | 'createdAt'>): Decision;
    autoContinue(decisionId: string): Decision | null;
    escalate(decisionId: string): Decision | null;
    resolve(decisionId: string, approved: boolean, reason?: string): Decision | null;
    getPendingDecisions(types?: DecisionType[]): Decision[];
    getStatus(): DecisionStatusReport;
    destroy(): void;
}
//# sourceMappingURL=decision-continuity.d.ts.map