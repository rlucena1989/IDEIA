import { StateDelta } from './delta-types';
import { EvolutionDecision } from './decision-types';
import { EvolutionRunResult } from './execution-types';
import { RevalidationResult } from './revalidation-service';
import { EvolutionAuditTrail } from './audit-types';

export interface EvolutionReport {
  generatedAt: string;
  delta: StateDelta;
  decision: EvolutionDecision;
  execution: EvolutionRunResult;
  revalidation: RevalidationResult;
  audit: EvolutionAuditTrail;
  summary: string[];
}

export function buildEvolutionReport(params: {
  delta: StateDelta;
  decision: EvolutionDecision;
  execution: EvolutionRunResult;
  revalidation: RevalidationResult;
  audit: EvolutionAuditTrail;
}): EvolutionReport {
  const summary: string[] = [
    `Delta: ${params.delta.summary.changed} changed, ${params.delta.summary.critical} critical`,
    `Decision: ${params.decision.action} (risk: ${params.decision.risk})`,
    `Execution: ${params.execution.ok ? 'OK' : 'BLOCKED'}`,
    `Revalidation: ${params.revalidation.ok ? 'Stable/Improved' : 'Regressed'}`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    ...params,
    summary,
  };
}
