import * as _crypto from 'node:crypto';

export interface DecisionTrace {
  traceId: string;
  decisionType: string;
  context: string;
  signals: string[];
  policyApplied: string;
  outcome: string;
  createdAt: string;
}

export interface Explanation {
  explanationId: string;
  title: string;
  summary: string;
  details: string[];
  evidenceIds: string[];
  confidence: number;
  createdAt: string;
}

export interface EvidenceLink {
  evidenceId: string;
  sourceType: 'metric' | 'alert' | 'simulation' | 'approval' | 'history' | 'drift' | 'failure' | 'trend' | 'policy';
  sourceRef: string;
  description: string;
}
