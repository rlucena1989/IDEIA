import { RiskAssessment, RiskLevel, ImpactLevel, ProbabilityLevel, RISK_MATRIX, IMPACT_SCORES, PROBABILITY_SCORES } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('risk-classifier');

export interface RiskClassifierConfig {
  defaultImpact: ImpactLevel;
  defaultProbability: ProbabilityLevel;
  environmentRisk: Record<string, number>;
}

const DEFAULT: RiskClassifierConfig = {
  defaultImpact: 'minor',
  defaultProbability: 'unlikely',
  environmentRisk: { dev: 0, staging: 0.3, production: 0.8 },
};

export class RiskClassifier {
  private config: RiskClassifierConfig;

  constructor(config?: Partial<RiskClassifierConfig>) { this.config = { ...DEFAULT, ...config }; }

  classify(impact: ImpactLevel, probability: ProbabilityLevel, factors?: string[], environment?: string): RiskAssessment {
    const envBonus = environment ? (this.config.environmentRisk[environment] ?? 0) : 0;

    const pIdx = PROBABILITY_SCORES[probability];
    const adjustedProb: ProbabilityLevel = envBonus > 0.5
      ? (pIdx >= 4 ? 'almost_certain' : pIdx >= 3 ? 'likely' : pIdx >= 2 ? 'possible' : 'unlikely')
      : probability;

    const level = RISK_MATRIX[impact][adjustedProb];

    const allFactors = [...(factors ?? [])];
    if (environment) allFactors.push(`environment:${environment}`);

    const mitigation = this.suggestMitigation(level);

    return {
      level,
      impact,
      impactScore: IMPACT_SCORES[impact],
      probability: adjustedProb,
      probabilityScore: PROBABILITY_SCORES[adjustedProb],
      score: IMPACT_SCORES[impact] * PROBABILITY_SCORES[adjustedProb],
      factors: allFactors,
      mitigation,
    };
  }

  private suggestMitigation(level: RiskLevel): string[] {
    const map: Record<RiskLevel, string[]> = {
      low: ['Execução padrão'],
      medium: ['Adicionar verificação extra', 'Log detalhado'],
      high: ['Requer aprovação', 'Rollback preparado', 'Testes adicionais'],
      critical: ['Bloqueado até aprovação formal', 'Rollback obrigatório', 'Janela de mudança controlada', 'Revisão de segurança'],
    };
    return map[level];
  }
}
