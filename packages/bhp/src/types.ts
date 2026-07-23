export type BHPPlatform = 'ideia' | 'ia' | 'human';

export type BHPMessageType = 'HELP!' | 'STATS' | 'PLAN' | 'APPROVE' | 'REJECT' | 'CLARIFY' | 'ADAPT';

export type BHPDecision = 'approved' | 'rejected' | 'pending' | 'clarify' | 'escalated';

export interface BHPConfig {
  timeout: number;
  autoApproveThreshold: number;
  maxHistory: number;
}

export interface BHPContext {
  source: BHPPlatform;
  target: BHPPlatform;
  intent: string;
  data: Record<string, unknown>;
  timestamp: string;
  ttl?: number;
}

export interface BHPMessage {
  id: string;
  type: BHPMessageType;
  source: BHPPlatform;
  target: BHPPlatform;
  timestamp: string;
  payload: Record<string, unknown>;
  ttl: number;
}

export interface BHPPlan {
  id: string;
  agentId: string;
  description: string;
  steps: string[];
  resources: string[];
  estimatedDuration: number;
  context: Record<string, unknown>;
}

export interface PlanEvaluation {
  planId: string;
  score: number;
  policyPass: boolean;
  risks: string[];
  recommendations: string[];
  evaluatedAt: string;
}

export interface BHPProfile {
  agentId: string;
  role: string;
  capabilities: string[];
  reliability: number;
  matchScore: number;
  lastActive: string;
}

export interface DecisionResult {
  planId: string;
  decision: BHPDecision;
  confidence: number;
  reason: string;
  autoApproved: boolean;
  timestamp: string;
}

export interface CollaborationState {
  planId: string;
  status: BHPDecision;
  messages: BHPMessage[];
  startedAt: string;
  resolvedAt?: string;
}

export interface ConsensusResult {
  hasConsensus: boolean;
  ideiaDecision: 'approve' | 'reject' | 'clarify';
  iaDecision: 'approve' | 'reject' | 'modify';
  confidence: number;
}

export interface BHPMessageHandler {
  onHelp?: (msg: BHPMessage) => void | Promise<void>;
  onStats?: (msg: BHPMessage) => void | Promise<void>;
  onPlan?: (msg: BHPMessage) => void | Promise<void>;
  onApprove?: (msg: BHPMessage) => void | Promise<void>;
  onReject?: (msg: BHPMessage) => void | Promise<void>;
  onClarify?: (msg: BHPMessage) => void | Promise<void>;
  onAdapt?: (msg: BHPMessage) => void | Promise<void>;
}
