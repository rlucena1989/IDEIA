import { DecisionTrace, Explanation } from './explanation-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('explanation-engine');

export function explainDecision(trace: DecisionTrace): Explanation {
  return {
    explanationId: `explain-${Date.now()}`,
    title: `Explanation for ${trace.decisionType}`,
    summary: `Decision ${trace.outcome} under policy ${trace.policyApplied}.`,
    details: [
      `Context: ${trace.context}`,
      `Signals: ${trace.signals.join(', ')}`,
      `Policy applied: ${trace.policyApplied}`,
      `Outcome: ${trace.outcome}`,
    ],
    evidenceIds: [],
    confidence: 0.9,
    createdAt: new Date().toISOString(),
  };
}
