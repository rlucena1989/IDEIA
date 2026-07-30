import { EventEmitter } from 'node:events';
import { createLogger } from '@ideia/logger';
const logger = createLogger('decision-continuity');

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

const DEFAULT_TIMEOUTS: Record<DecisionType, number> = {
  plan: 5 * 60 * 1000,
  execution: 2 * 60 * 1000,
  policy: 10 * 60 * 1000,
  security: 15 * 60 * 1000,
  config: 3 * 60 * 1000,
};

export class DecisionContinuityEngine extends EventEmitter {
  private decisions: Map<string, Decision> = new Map();
  private timeouts: Record<DecisionType, number>;
  private escalationLevels: string[] = ['dev', 'tech-lead', 'security', 'admin'];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(timeouts?: Partial<Record<DecisionType, number>>) {
    super();
    this.timeouts = { ...DEFAULT_TIMEOUTS, ...timeouts };
    this.startTimeoutChecker();
  }

  private startTimeoutChecker(): void {
    this.timer = setInterval(() => {
      const now = Date.now();
      for (const [id, decision] of this.decisions) {
        if (decision.status === 'pending' && now - decision.createdAt > decision.timeoutMs) {
          this.autoContinue(id);
        }
      }
    }, 10_000);
  }

  private generateId(): string {
    return `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  registerDecision(decision: Omit<Decision, 'id' | 'status' | 'createdAt'>): Decision {
    const newDecision: Decision = {
      ...decision,
      id: this.generateId(),
      status: 'pending',
      createdAt: Date.now(),
    };
    this.decisions.set(newDecision.id, newDecision);
    this.emit('decision:registered', newDecision);
    return newDecision;
  }

  autoContinue(decisionId: string): Decision | null {
    const decision = this.decisions.get(decisionId);
    if (!decision || decision.status !== 'pending') return null;

    decision.status = 'auto-approved';
    decision.resolvedAt = Date.now();
    decision.resolution = 'auto-approved by timeout';
    this.emit('decision:auto-continued', decision);
    return decision;
  }

  escalate(decisionId: string): Decision | null {
    const decision = this.decisions.get(decisionId);
    if (!decision) return null;

    const currentLevel = decision.escalatedTo || 'dev';
    const currentIdx = this.escalationLevels.indexOf(currentLevel);

    if (currentIdx < this.escalationLevels.length - 1) {
      decision.escalatedTo = this.escalationLevels[currentIdx + 1];
      decision.status = 'escalated';
      this.emit('decision:escalated', decision);
    } else {
      decision.status = 'auto-approved';
      decision.resolvedAt = Date.now();
      decision.resolution = 'auto-approved at max escalation level';
      this.emit('decision:auto-continued', decision);
    }

    return decision;
  }

  resolve(decisionId: string, approved: boolean, reason?: string): Decision | null {
    const decision = this.decisions.get(decisionId);
    if (!decision) return null;

    decision.status = approved ? 'approved' : 'rejected';
    decision.resolvedAt = Date.now();
    decision.resolution = reason ?? (approved ? 'Approved' : 'Rejected');
    this.emit(approved ? 'decision:approved' : 'decision:rejected', decision);
    return decision;
  }

  getPendingDecisions(types?: DecisionType[]): Decision[] {
    const all = Array.from(this.decisions.values());
    const filtered = all.filter(d => d.status === 'pending');
    if (types) return filtered.filter(d => types.includes(d.type));
    return filtered;
  }

  getStatus(): DecisionStatusReport {
    const decisions = Array.from(this.decisions.values());
    return {
      pending: decisions.filter(d => d.status === 'pending').length,
      autoApproved: decisions.filter(d => d.status === 'auto-approved').length,
      escalated: decisions.filter(d => d.status === 'escalated').length,
      approved: decisions.filter(d => d.status === 'approved').length,
      rejected: decisions.filter(d => d.status === 'rejected').length,
      expired: decisions.filter(d => d.status === 'expired').length,
      decisions,
    };
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
