import { randomUUID } from 'crypto';
import { AuditTrail } from '@ideia/audit-trail';
import { createLogger } from '@ideia/logger';
import {
  BHPPlan,
  BHPProfile,
  DecisionResult,
  ConsensusResult,
  BHPDecision,
} from './types';

const log = createLogger('bhp:decision-engine');

export interface DecisionEngineConfig {
  autoApproveThreshold: number;
  consensusThreshold: number;
  escalationThreshold: number;
  timeoutFallback: BHPDecision;
}

const DEFAULT_CONFIG: DecisionEngineConfig = {
  autoApproveThreshold: 0.9,
  consensusThreshold: 0.7,
  escalationThreshold: 0.4,
  timeoutFallback: 'escalated',
};

export class DecisionEngine {
  private config: DecisionEngineConfig;
  private auditTrail?: AuditTrail;
  private decisions: Map<string, DecisionResult> = new Map();

  constructor(config?: Partial<DecisionEngineConfig>, auditTrail?: AuditTrail) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.auditTrail = auditTrail;
  }

  evaluate(
    plan: BHPPlan,
    ideiaProfile?: BHPProfile,
    iaProfile?: BHPProfile,
    options?: { timeout?: boolean },
  ): DecisionResult {
    if (options?.timeout) {
      return this.timeoutFallback(plan.id);
    }

    const consensus = this.detectConsensus(plan, ideiaProfile, iaProfile);
    const matchScore = this.computeMatchScore(ideiaProfile, iaProfile);
    const autoApproved = matchScore >= this.config.autoApproveThreshold;

    let decision: BHPDecision;
    let reason: string;
    let confidence: number;

    if (autoApproved) {
      decision = 'approved';
      reason = `Auto-approved: profile match ${(matchScore * 100).toFixed(1)}% exceeds threshold`;
      confidence = matchScore;
    } else if (consensus.hasConsensus) {
      decision = 'approved';
      reason = `Consensus reached between IDEIA and IA (confidence ${(consensus.confidence * 100).toFixed(1)}%)`;
      confidence = consensus.confidence;
    } else if (consensus.confidence >= this.config.consensusThreshold) {
      decision = 'clarify';
      reason = 'Partial alignment — requesting clarification';
      confidence = consensus.confidence;
    } else if (consensus.confidence < this.config.escalationThreshold) {
      decision = 'escalated';
      reason = `Divergence detected: IDEIA says ${consensus.ideiaDecision}, IA says ${consensus.iaDecision} — escalating to human`;
      confidence = consensus.confidence;
    } else {
      decision = 'clarify';
      reason = 'Moderate divergence — requesting clarification before proceeding';
      confidence = consensus.confidence;
    }

    const result: DecisionResult = {
      planId: plan.id,
      decision,
      confidence: Math.round(confidence * 100) / 100,
      reason,
      autoApproved,
      timestamp: new Date().toISOString(),
    };

    this.decisions.set(plan.id, result);

    this.auditTrail?.append({
      actor: 'system',
      eventType: 'bhp.decision',
      target: plan.agentId,
      decision: decision === 'approved' ? 'approved' : 'rejected',
      result: 'success',
      metadata: {
        planId: plan.id,
        decision: result.decision,
        confidence: result.confidence,
        autoApproved: result.autoApproved,
        consensus: {
          hasConsensus: consensus.hasConsensus,
          ideiaDecision: consensus.ideiaDecision,
          iaDecision: consensus.iaDecision,
        },
      },
    });

    log.info('Decision made', {
      planId: plan.id,
      decision,
      confidence,
      autoApproved,
    });

    return result;
  }

  detectConsensus(
    plan: BHPPlan,
    ideiaProfile?: BHPProfile,
    iaProfile?: BHPProfile,
  ): ConsensusResult {
    const ideiaDecision = this.simulateIdeiaDecision(plan);
    const iaDecision = this.simulateIaDecision(plan, iaProfile);
    const hasConsensus = ideiaDecision === this.mapIaToIdeia(iaDecision);
    const confidence = this.computeConfidence(plan, ideiaProfile, iaProfile);

    return {
      hasConsensus,
      ideiaDecision,
      iaDecision,
      confidence,
    };
  }

  private computeMatchScore(ideiaProfile?: BHPProfile, iaProfile?: BHPProfile): number {
    if (!ideiaProfile || !iaProfile) return 0;

    let score = 0;

    const reliabilityScore = Math.min(ideiaProfile.reliability, iaProfile.reliability);
    score += reliabilityScore * 0.4;

    const matchScore = Math.min(ideiaProfile.matchScore, iaProfile.matchScore);
    score += matchScore * 0.3;

    const commonCapabilities = ideiaProfile.capabilities.filter(c => iaProfile.capabilities.includes(c));
    const capScore = commonCapabilities.length / Math.max(ideiaProfile.capabilities.length, iaProfile.capabilities.length, 1);
    score += capScore * 0.3;

    return Math.min(score, 1.0);
  }

  private simulateIdeiaDecision(plan: BHPPlan): 'approve' | 'reject' | 'clarify' {
    if (plan.estimatedDuration > 86400) return 'reject';
    if (plan.steps.some(s => /rm\s+-rf|format\s+c:|drop\s+table/i.test(s))) return 'reject';
    if (plan.steps.length < 2) return 'clarify';
    if (Object.keys(plan.context).length === 0) return 'clarify';
    return 'approve';
  }

  private simulateIaDecision(plan: BHPPlan, profile?: BHPProfile): 'approve' | 'reject' | 'modify' {
    if (!profile) return plan.steps.length > 0 ? 'approve' : 'modify';
    if (profile.reliability < 0.3) return 'modify';
    return 'approve';
  }

  private mapIaToIdeia(iaDecision: 'approve' | 'reject' | 'modify'): 'approve' | 'reject' | 'clarify' {
    switch (iaDecision) {
      case 'approve': return 'approve';
      case 'reject': return 'reject';
      case 'modify': return 'clarify';
    }
  }

  private computeConfidence(plan: BHPPlan, ideiaProfile?: BHPProfile, iaProfile?: BHPProfile): number {
    let confidence = 0.5;

    if (plan.description.length > 20) confidence += 0.1;
    if (plan.steps.length >= 3) confidence += 0.1;
    if (plan.resources.length > 0) confidence += 0.05;
    if (Object.keys(plan.context).length > 0) confidence += 0.05;
    if (ideiaProfile?.reliability) confidence += ideiaProfile.reliability * 0.1;
    if (iaProfile?.reliability) confidence += iaProfile.reliability * 0.1;

    return Math.min(confidence, 1.0);
  }

  private timeoutFallback(planId: string): DecisionResult {
    const result: DecisionResult = {
      planId,
      decision: this.config.timeoutFallback,
      confidence: 0,
      reason: `Timeout fallback: no decision received within threshold, defaulting to ${this.config.timeoutFallback}`,
      autoApproved: false,
      timestamp: new Date().toISOString(),
    };

    this.decisions.set(planId, result);

    log.warn('Timeout fallback triggered', { planId, fallback: this.config.timeoutFallback });

    return result;
  }

  getDecision(planId: string): DecisionResult | undefined {
    return this.decisions.get(planId);
  }

  getDecisionHistory(): Map<string, DecisionResult> {
    return new Map(this.decisions);
  }

  resetHistory(): void {
    this.decisions.clear();
  }
}
