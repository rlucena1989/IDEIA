import { NotificationManager } from './notifications';
import { WebhookManager } from './webhook';
import { DeliveryOrchestrator } from './delivery-orchestrator';
import { DeployEnvironment, ReviewGateRequest } from './types';

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

const DEFAULT_CONFIG: ReviewGateConfig = {
  timeoutMinutes: 120,
  escalateAfterMinutes: 60,
  autoRejectAfterMinutes: 180,
  requiredReviewers: 1,
};

export class ReviewGateManager {
  private pending: Map<string, PendingReview> = new Map();
  private config: ReviewGateConfig;
  private orchestrator: DeliveryOrchestrator;
  private notificationManager?: NotificationManager;
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(
    orchestrator: DeliveryOrchestrator,
    config?: Partial<ReviewGateConfig>,
    deps?: { notificationManager?: NotificationManager },
  ) {
    this.orchestrator = orchestrator;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.notificationManager = deps?.notificationManager;
  }

  setConfig(config: Partial<ReviewGateConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async requestReview(deployId: string, version: string, environment: DeployEnvironment): Promise<PendingReview> {
    const review: PendingReview = {
      deployId,
      version,
      environment,
      requestedAt: new Date().toISOString(),
      reviewers: [],
      approvedBy: [],
      rejectedBy: [],
      status: 'pending',
    };

    this.pending.set(deployId, review);

    if (this.notificationManager) {
      await this.notificationManager.notify({
        event: 'review.required',
        version,
        environment,
        deployId,
        metadata: { requestedAt: review.requestedAt },
      });
    }

    const escalateTimer = setTimeout(async () => {
      await this.escalate(deployId);
    }, this.config.escalateAfterMinutes * 60000);
    this.timers.set(`${deployId}-escalate`, escalateTimer);

    const rejectTimer = setTimeout(async () => {
      await this.autoReject(deployId);
    }, this.config.autoRejectAfterMinutes * 60000);
    this.timers.set(`${deployId}-reject`, rejectTimer);

    return review;
  }

  approve(deployId: string, reviewer: string, reason?: string): PendingReview | null {
    const review = this.pending.get(deployId);
    if (!review || review.status !== 'pending') return null;

    review.approvedBy.push(reviewer);
    review.notifiedAt = new Date().toISOString();

    if (review.approvedBy.length >= this.config.requiredReviewers) {
      review.status = 'approved';
      this.clearTimers(deployId);

      const request: ReviewGateRequest = {
        deployId,
        reviewer,
        approved: true,
        reason,
      };
      this.orchestrator.reviewGate(request);

      this.notificationManager?.notify({
        event: 'review.approved',
        version: review.version,
        environment: review.environment,
        deployId,
        metadata: { reviewer, reason },
      }).catch(() => {});
    }

    return review;
  }

  reject(deployId: string, reviewer: string, reason?: string): PendingReview | null {
    const review = this.pending.get(deployId);
    if (!review || review.status !== 'pending') return null;

    review.status = 'rejected';
    review.rejectedBy.push(reviewer);
    review.notifiedAt = new Date().toISOString();
    this.clearTimers(deployId);

    const request: ReviewGateRequest = {
      deployId,
      reviewer,
      approved: false,
      reason,
    };
    this.orchestrator.reviewGate(request);

    this.notificationManager?.notify({
      event: 'review.rejected',
      version: review.version,
      environment: review.environment,
      deployId,
      metadata: { reviewer, reason },
    }).catch(() => {});

    return review;
  }

  getPending(deployId: string): PendingReview | undefined {
    return this.pending.get(deployId);
  }

  listPending(environment?: DeployEnvironment): PendingReview[] {
    let result = Array.from(this.pending.values()).filter(r => r.status === 'pending');
    if (environment) result = result.filter(r => r.environment === environment);
    return result;
  }

  private async escalate(deployId: string): Promise<void> {
    const review = this.pending.get(deployId);
    if (!review || review.status !== 'pending') return;

    review.escalatedAt = new Date().toISOString();

    this.notificationManager?.notify({
      event: 'review.timeout',
      version: review.version,
      environment: review.environment,
      deployId,
      metadata: {
        escalatedAt: review.escalatedAt,
        message: `Review pending for ${this.config.escalateAfterMinutes} minutes — escalation triggered`,
      },
    }).catch(() => {});
  }

  private async autoReject(deployId: string): Promise<void> {
    const review = this.pending.get(deployId);
    if (!review || review.status !== 'pending') return;

    review.status = 'timed_out';
    review.timeoutAt = new Date().toISOString();
    this.clearTimers(deployId);

    const request: ReviewGateRequest = {
      deployId,
      reviewer: 'system',
      approved: false,
      reason: `Auto-rejected after ${this.config.autoRejectAfterMinutes} minutes without review`,
    };
    this.orchestrator.reviewGate(request);

    this.notificationManager?.notify({
      event: 'review.rejected',
      version: review.version,
      environment: review.environment,
      deployId,
      metadata: { reason: request.reason, autoRejected: true },
    }).catch(() => {});
  }

  private clearTimers(deployId: string): void {
    for (const key of this.timers.keys()) {
      if (key.startsWith(deployId)) {
        clearTimeout(this.timers.get(key) ?? null);
        this.timers.delete(key);
      }
    }
  }

  destroy(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.pending.clear();
  }
}

export function createReviewGateManager(
  orchestrator: DeliveryOrchestrator,
  config?: Partial<ReviewGateConfig>,
  deps?: { notificationManager?: NotificationManager },
): ReviewGateManager {
  return new ReviewGateManager(orchestrator, config, deps);
}
