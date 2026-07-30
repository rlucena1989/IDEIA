import { createLogger, Logger } from '@ideia/logger';
import { MergeDecision, MergeResult, MergeStrategy, ApprovalLevel, ReviewReport, CIResult } from './types-pr';

export interface MergeGateConfig {
  strategy: MergeStrategy;
  requireApproval: boolean;
  approvalLevel: ApprovalLevel;
  deleteBranchAfterMerge: boolean;
}

export class MergeGate {
  private logger: Logger;
  private config: MergeGateConfig;

  constructor(config?: Partial<MergeGateConfig>, logger?: Logger) {
    this.logger = logger ?? createLogger('MergeGate');
    this.config = {
      strategy: 'squash',
      requireApproval: true,
      approvalLevel: 'N1',
      deleteBranchAfterMerge: true,
      ...config,
    };
  }

  canMerge(pr: { id: string; review?: ReviewReport; ciResult?: CIResult }): MergeDecision {
    const failedGates: string[] = [];

    if (this.config.requireApproval) {
      const approved = this.checkApprovals(pr);
      if (!approved) {
        failedGates.push('approval');
      }
    }

    const statusChecksOk = this.checkStatusChecks(pr);
    if (!statusChecksOk) {
      failedGates.push('status_checks');
    }

    const branchPolicyOk = this.enforceBranchPolicy('main');
    if (!branchPolicyOk) {
      failedGates.push('branch_policy');
    }

    if (pr.review !== undefined && (pr.review.decision === 'blocked' || pr.review.decision === 'changes_requested')) {
      failedGates.push('review_decision');
    }

    return {
      canMerge: failedGates.length === 0,
      reason: failedGates.length > 0 ? `Failed gates: ${failedGates.join(', ')}` : undefined,
      failedGates,
      requiredApprovals: this.config.approvalLevel,
    };
  }

  async merge(
    _pr: { id: string; branch?: string },
    strategy?: MergeStrategy
  ): Promise<MergeResult> {
    const mergeStrategy = strategy ?? this.config.strategy;
    this.logger.info('Executing merge', { strategy: mergeStrategy });

    return {
      merged: true,
      sha: 'abcdef1234567890',
      message: `Merge completed using ${mergeStrategy} strategy`,
    };
  }

  checkApprovals(_pr: { id: string }): boolean {
    return true;
  }

  checkStatusChecks(_pr: { review?: ReviewReport; ciResult?: CIResult }): boolean {
    if (_pr.ciResult !== undefined && !_pr.ciResult.passed) {
      return false;
    }
    if (_pr.review !== undefined && _pr.review.decision === 'blocked') {
      return false;
    }
    return true;
  }

  enforceBranchPolicy(_branch: string): boolean {
    return true;
  }

  getConfig(): MergeGateConfig {
    return { ...this.config };
  }
}
