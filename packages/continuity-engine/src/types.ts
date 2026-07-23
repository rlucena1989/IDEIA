export type DecisionPriority = 'low' | 'medium' | 'high' | 'critical';

export type TimelinePhase = 'waiting' | 'suggesting' | 'escalating' | 'escalated' | 'escalation-exhausted' | 'auto-continue' | 'forced';

export type DecisionStatus = 'pending' | 'resolved' | 'escalated' | 'auto-decided' | 'timeout';

export type EscalationLevel = 'dev' | 'tech-lead' | 'manager';

export interface DecisionRecord {
  id: string;
  description: string;
  context: Record<string, unknown>;
  priority: DecisionPriority;
  profileMatch: number;
  status: DecisionStatus;
  phase: TimelinePhase;
  createdAt: number;
  updatedAt: number;
  timeoutMs: number;
  alternatives: string[];
  escalationLevel: EscalationLevel;
  resolvedAction?: string;
  resolvedBy?: string;
  preparedAction?: string;
}

export interface ContinuityStatus {
  pendingDecisions: number;
  resolvedDecisions: number;
  escalatedDecisions: number;
  autoDecided: number;
  timeoutCount: number;
  oldestPendingAge: number;
  activePhases: Record<TimelinePhase, number>;
  escalationDistribution: Record<EscalationLevel, number>;
}

export interface DecisionRegistration {
  id?: string;
  description: string;
  context?: Record<string, unknown>;
  priority?: DecisionPriority;
  profileMatch: number;
  timeoutMs?: number;
  preparedAction?: string;
}

export interface DecisionResolution {
  action: string;
  resolvedBy?: string;
}

export interface SchedulerConfig {
  checkIntervalMs?: number;
  autoStart?: boolean;
  maxAlternatives?: number;
}

export interface ContinuityEventPayload {
  decisionId: string;
  description: string;
  phase: TimelinePhase;
  status: DecisionStatus;
  escalationLevel: EscalationLevel;
  profileMatch: number;
  timestamp: number;
}

export const TIMELINE_THRESHOLDS: Record<TimelinePhase, number> = {
  waiting: 5 * 60 * 1000,
  suggesting: 15 * 60 * 1000,
  escalating: 30 * 60 * 1000,
  escalated: 45 * 60 * 1000,
  'escalation-exhausted': 55 * 60 * 1000,
  'auto-continue': 60 * 60 * 1000,
  forced: Infinity,
};

export const ESCALATION_ORDER: EscalationLevel[] = ['dev', 'tech-lead', 'manager'];

export const PROFILE_AUTO_EXECUTE = 90;
export const PROFILE_ASK_PREPARE = 70;
