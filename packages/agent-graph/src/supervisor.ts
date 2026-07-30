import { Logger, createLogger } from '@ideia/logger';
import { SupervisorDecision, NodeResult} from './types';

export interface SupervisorConfig {
  autoApprovalScoreThreshold: number;
  requireHumanOnScoreBelow: number;
}

const DEFAULT_SUPERVISOR_CONFIG: SupervisorConfig = {
  autoApprovalScoreThreshold: 0.8,
  requireHumanOnScoreBelow: 0.4,
};

export class SupervisorNode {
  private config: SupervisorConfig;
  private logger: Logger;

  constructor(config?: Partial<SupervisorConfig>) {
    this.config = { ...DEFAULT_SUPERVISOR_CONFIG, ...config };
    this.logger = createLogger('supervisor-node');
  }

  evaluate(results: Map<string, NodeResult>): SupervisorDecision {
    const completed = Array.from(results.values()).filter(r => r.status === 'completed');
    const failed = Array.from(results.values()).filter(r => r.status === 'failed');

    if (failed.length > 0) {
      const decision: SupervisorDecision = {
        type: 'stop',
        reason: `${failed.length} node(s) failed: ${failed.map(f => f.nodeId).join(', ')}`,
        requiresHumanIntervention: true,
        autoApproved: false,
        score: 0,
        details: { failedNodes: failed.map(f => ({ nodeId: f.nodeId, errors: f.errors })) },
      };
      this.logger.warn('Supervisor decision: stop', { reason: decision.reason });
      return decision;
    }

    const score = this.calculateScore(completed);

    if (score >= this.config.autoApprovalScoreThreshold) {
      const decision: SupervisorDecision = {
        type: 'proceed',
        reason: `Auto-approved with score ${score.toFixed(2)} >= ${this.config.autoApprovalScoreThreshold}`,
        requiresHumanIntervention: false,
        autoApproved: true,
        score,
        details: { completedNodes: completed.map(c => c.nodeId) },
      };
      this.logger.info('Supervisor decision: proceed', { score });
      return decision;
    }

    if (score < this.config.requireHumanOnScoreBelow) {
      const decision: SupervisorDecision = {
        type: 'stop',
        reason: `Score ${score.toFixed(2)} below human intervention threshold ${this.config.requireHumanOnScoreBelow}`,
        requiresHumanIntervention: true,
        autoApproved: false,
        score,
        details: { completedNodes: completed.map(c => c.nodeId) },
      };
      this.logger.warn('Supervisor decision: stop (requires human)', { score });
      return decision;
    }

    const decision: SupervisorDecision = {
      type: 'requestReview',
      reason: `Score ${score.toFixed(2)} requires manual review`,
      requiresHumanIntervention: true,
      autoApproved: false,
      score,
      details: { completedNodes: completed.map(c => c.nodeId) },
    };
    this.logger.info('Supervisor decision: requestReview', { score });
    return decision;
  }

  evaluateSingle(nodeId: string, result: NodeResult, previousResults: Map<string, NodeResult>): SupervisorDecision {
    const allResults = new Map(previousResults);
    allResults.set(nodeId, result);
    return this.evaluate(allResults);
  }

  evaluateIntermediate(result: NodeResult): SupervisorDecision {
    if (result.status === 'failed') {
      return {
        type: 'stop',
        reason: `Node ${result.nodeId} (${result.role}) failed: ${result.errors.join('; ')}`,
        requiresHumanIntervention: true,
        autoApproved: false,
        score: 0,
        details: { nodeId: result.nodeId, errors: result.errors },
      };
    }

    return {
      type: 'proceed',
      reason: `Node ${result.nodeId} (${result.role}) completed successfully`,
      requiresHumanIntervention: false,
      autoApproved: true,
      score: 1,
      details: { nodeId: result.nodeId },
    };
  }

  private calculateScore(completed: NodeResult[]): number {
    if (completed.length === 0) return 0;

    let totalScore = 0;
    const roleWeights: Record<string, number> = {
      analyst: 0.15,
      architect: 0.2,
      programmer: 0.25,
      reviewer: 0.2,
      tester: 0.15,
      devops: 0.05,
    };

    for (const result of completed) {
      const weight = roleWeights[result.role] ?? 0.1;
      const durationPenalty = Math.max(0, 1 - result.durationMs / 600000);
      const errorPenalty = result.errors.length > 0 ? 0.3 : 0;
      const nodeScore = Math.max(0, durationPenalty - errorPenalty);
      totalScore += weight * nodeScore;
    }

    return Math.min(1, totalScore);
  }
}

export function createSupervisorNode(config?: Partial<SupervisorConfig>): SupervisorNode {
  return new SupervisorNode(config);
}
