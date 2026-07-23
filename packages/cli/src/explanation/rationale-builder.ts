import { DecisionTrace, EvidenceLink } from './explanation-types';

export interface Rationale {
  rationaleId: string;
  title: string;
  summary: string;
  facts: string[];
  inferences: string[];
  createdAt: string;
}

export function buildRationale(trace: DecisionTrace, evidence: EvidenceLink[]): Rationale {
  const facts: string[] = [
    `Input context: ${trace.context}`,
    `Observed signals: ${trace.signals.join(', ')}`,
    `Policy applied: ${trace.policyApplied}`,
  ];

  const inferences: string[] = [
    `Decision outcome was "${trace.outcome}" based on pattern matching against policy.`,
    evidence.length > 0
      ? `${evidence.length} piece(s) of evidence support this conclusion.`
      : `No additional evidence was linked to this decision.`,
  ];

  return {
    rationaleId: `rationale-${Date.now()}`,
    title: `Rationale for ${trace.decisionType}`,
    summary: `${trace.decisionType} resulted in "${trace.outcome}" under ${trace.policyApplied}.`,
    facts,
    inferences,
    createdAt: new Date().toISOString(),
  };
}
