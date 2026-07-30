import { NotificationManager } from './notifications';
import { DeliveryOrchestrator } from './delivery-orchestrator';
import { DeployEnvironment } from './types';
export interface ReviewGateConfig {
    timeoutMinutes: number;
    escalateAfterMinutes: number;
    autoRejectAfterMinutes: number;
    requiredReviewers: number;
}
export interface PendingReview {
    deployId: string;
    version: string;
    environment: DeployEnvironment;
    requestedAt: string;
    reviewers: string[];
    approvedBy: string[];
    rejectedBy: string[];
    status: 'pending' | 'approved' | 'rejected' | 'timed_out';
    notifiedAt?: string;
    escalatedAt?: string;
    timeoutAt?: string;
}
export declare class ReviewGateManager {
    private pending;
    private config;
    private orchestrator;
    private notificationManager?;
    private timers;
    constructor(orchestrator: DeliveryOrchestrator, config?: Partial<ReviewGateConfig>, deps?: {
        notificationManager?: NotificationManager;
    });
    setConfig(config: Partial<ReviewGateConfig>): void;
    requestReview(deployId: string, version: string, environment: DeployEnvironment): Promise<PendingReview>;
    approve(deployId: string, reviewer: string, reason?: string): PendingReview | null;
    reject(deployId: string, reviewer: string, reason?: string): PendingReview | null;
    getPending(deployId: string): PendingReview | undefined;
    listPending(environment?: DeployEnvironment): PendingReview[];
    private escalate;
    private autoReject;
    private clearTimers;
    destroy(): void;
}
export declare function createReviewGateManager(orchestrator: DeliveryOrchestrator, config?: Partial<ReviewGateConfig>, deps?: {
    notificationManager?: NotificationManager;
}): ReviewGateManager;
//# sourceMappingURL=review-gate.d.ts.map