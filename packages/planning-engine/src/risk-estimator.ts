import { PlannedStep, RiskAssessment, RiskLevel } from './types';

export interface RiskEstimatorConfig {
  environmentRisk: Record<string, number>;
  roleRisk: Record<string, number>;
  defaultImpact: number;
  defaultProbability: number;
}

const DEFAULT_CONFIG: RiskEstimatorConfig = {
  environmentRisk: { dev: 0.1, staging: 0.3, production: 0.8 },
  roleRisk: { analyst: 0.1, architect: 0.3, programmer: 0.5, tester: 0.2, devops: 0.7 },
  defaultImpact: 0.3,
  defaultProbability: 0.3,
};

export class RiskEstimator {
  private config: RiskEstimatorConfig;

  constructor(config?: Partial<RiskEstimatorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  estimate(step: PlannedStep, environment: string): RiskAssessment {
    const envRisk = this.config.environmentRisk[environment] ?? 0.3;
    const roleRisk = this.config.roleRisk[step.agentRole] ?? 0.3;

    const factors: string[] = [];
    if (envRisk > 0.5) factors.push('ambiente_sensivel');
    if (roleRisk > 0.5) factors.push(`papel_risco:${step.agentRole}`);
    if (step.dependencies.length > 3) factors.push('muitas_dependencias');
    if (step.acceptanceCriteria.length === 0) factors.push('sem_criterios');
    if (step.tags.includes('critical') || step.tags.includes('security')) factors.push('tag_critical');

    const impact = Math.min(1, this.config.defaultImpact + envRisk + (step.tags.includes('critical') ? 0.3 : 0));
    const probability = Math.min(1, this.config.defaultProbability + roleRisk * 0.5 + factors.length * 0.1);

    let level: RiskLevel = 'low';
    const score = impact * probability;
    if (score >= 0.6) level = 'critical';
    else if (score >= 0.4) level = 'high';
    else if (score >= 0.2) level = 'medium';

    return { level, impact, probability, factors, mitigation: this.suggestMitigation(level) };
  }

  estimatePlanRisk(steps: PlannedStep[]): RiskAssessment {
    const assessments = steps.map(s => s.risk);
    const avgImpact = assessments.reduce((s, r) => s + r.impact, 0) / assessments.length;
    const avgProb = assessments.reduce((s, r) => s + r.probability, 0) / assessments.length;
    const allFactors = [...new Set(assessments.flatMap(r => r.factors))];
    const score = avgImpact * avgProb;

    let level: RiskLevel = 'low';
    if (score >= 0.6) level = 'critical';
    else if (score >= 0.4) level = 'high';
    else if (score >= 0.2) level = 'medium';

    return { level, impact: avgImpact, probability: avgProb, factors: allFactors, mitigation: this.suggestMitigation(level) };
  }

  private suggestMitigation(level: RiskLevel): string {
    const mitigations: Record<RiskLevel, string> = {
      low: 'Execução padrão, sem controles extras',
      medium: 'Adicionar verificação extra após execução',
      high: 'Requer aprovação antes da execução + rollback preparado',
      critical: 'Bloqueado até revisão humana + aprovação formal + rollback obrigatório',
    };
    return mitigations[level];
  }
}
