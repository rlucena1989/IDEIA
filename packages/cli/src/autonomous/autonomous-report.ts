import { AutonomousCycle } from './autonomous-types';
import { DriftSignal, TrendSignal } from './autonomous-types';
import { SelfCorrectionAction } from './self-correction-engine';
import { MaintenancePlan } from './maintenance-planner';

export interface AutonomousReport {
  generatedAt: string;
  cycle: AutonomousCycle;
  drifts: DriftSignal[];
  trends: TrendSignal[];
  corrections: SelfCorrectionAction[];
  maintenance: MaintenancePlan;
  summary: string[];
}

export function buildAutonomousReport(params: {
  cycle: AutonomousCycle;
  drifts: DriftSignal[];
  trends: TrendSignal[];
  corrections: SelfCorrectionAction[];
  maintenance: MaintenancePlan;
}): AutonomousReport {
  const correctionsApplied = params.corrections.filter(c => c.appliedAt).length;

  const summary: string[] = [
    `Ciclo: ${params.cycle.status}`,
    `${params.drifts.length} drift(s) detectado(s)`,
    `${params.trends.length} tendência(s) analisada(s)`,
    `${correctionsApplied} correção(ões) aplicada(s)`,
    `Manutenção: ${params.maintenance.priority}`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    ...params,
    summary,
  };
}
