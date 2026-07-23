import { SystemConsolidation, FinalVerdict } from './consolidation-types';
import { CycleClosure } from './closure-manager';
import { AutonomyState } from './autonomy-controller';
import { SystemSynthesis } from './system-synthesis';

export interface ConsolidationReport {
  generatedAt: string;
  consolidation: SystemConsolidation;
  verdict: FinalVerdict;
  closure: CycleClosure;
  autonomy: AutonomyState;
  synthesis: SystemSynthesis;
  summary: string[];
}

export function buildConsolidationReport(params: {
  consolidation: SystemConsolidation;
  verdict: FinalVerdict;
  closure: CycleClosure;
  autonomy: AutonomyState;
  synthesis: SystemSynthesis;
}): ConsolidationReport {
  const summary: string[] = [
    `Score: ${params.consolidation.score}/100 (${params.consolidation.healthStatus})`,
    `Veredito: ${params.verdict.status}`,
    `Autonomia: ${params.autonomy.level}`,
    `Ciclo: ${params.closure.completedItems.length} concluído(s), ${params.closure.pendingItems.length} pendente(s)`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    ...params,
    summary,
  };
}
