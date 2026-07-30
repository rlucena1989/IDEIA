import { DecisionTrace, Explanation, EvidenceLink } from './explanation-types';
import { createLogger } from '@ideia/logger';
import { Rationale } from './rationale-builder';
const logger = createLogger('explain-report');

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
