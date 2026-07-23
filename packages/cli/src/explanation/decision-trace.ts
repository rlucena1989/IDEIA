import { DecisionTrace } from './explanation-types';

export function createDecisionTrace(input: {
  decisionType: string;
  context: string;
  signals: string[];
  policyApplied: string;
  outcome: string;
}): DecisionTrace {
  return {
    traceId: `trace-${Date.now()}`,
    decisionType: input.decisionType,
    context: input.context,
    signals: input.signals,
    policyApplied: input.policyApplied,
    outcome: input.outcome,
    createdAt: new Date().toISOString(),
  };
}
