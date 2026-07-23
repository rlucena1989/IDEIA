import { DecisionTrace, Explanation, EvidenceLink } from './explanation-types';
import { Rationale } from './rationale-builder';

export interface ExplainReport {
  generatedAt: string;
  totalTraces: number;
  traces: DecisionTrace[];
  explanations: Explanation[];
  evidence: EvidenceLink[];
  rationales: Rationale[];
  notes: string[];
}

export function buildExplainReport(params: {
  traces: DecisionTrace[];
  explanations: Explanation[];
  evidence: EvidenceLink[];
  rationales: Rationale[];
}): ExplainReport {
  const notes: string[] = [
    `${params.traces.length} decision trace(s)`,
    `${params.explanations.length} explanation(s)`,
    `${params.evidence.length} evidence link(s)`,
    `${params.rationales.length} rationale(s)`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    totalTraces: params.traces.length,
    ...params,
    notes,
  };
}
