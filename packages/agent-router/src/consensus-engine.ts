import { AgentOpinion, ConsensusResult, AgentRole } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('consensus-engine');

export interface ConsensusConfig {
  minAgentsForConsensus: number;
  confidenceThreshold: number;
  weightByRole: Record<string, number>;
}

const DEFAULT_CONFIG: ConsensusConfig = {
  minAgentsForConsensus: 2,
  confidenceThreshold: 0.6,
  weightByRole: { supervisor: 3, architect: 2, analyst: 1.5, reviewer: 1.5, programmer: 1, tester: 1, devops: 1 },
};

export class ConsensusEngine {
  private config: ConsensusConfig;

  constructor(config?: Partial<ConsensusConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  reachConsensus(opinions: AgentOpinion[]): ConsensusResult {
    if (opinions.length === 0) {
      return { reached: false, finalDecision: '', confidence: 0, supportingAgents: [], dissentingAgents: [], rationale: 'No opinions provided' };
    }

    const decisionGroups = new Map<string, { agents: AgentRole[]; totalWeight: number; totalConfidence: number; evidence: string[] }>();

    for (const opinion of opinions) {
      const key = opinion.decision;
      const existing = decisionGroups.get(key) ?? { agents: [], totalWeight: 0, totalConfidence: 0, evidence: [] };
      existing.agents.push(opinion.agentRole);
      existing.totalWeight += this.config.weightByRole[opinion.agentRole] ?? 1;
      existing.totalConfidence += opinion.confidence;
      existing.evidence.push(...opinion.evidence);
      decisionGroups.set(key, existing);
    }

    let bestDecision = '';
    let bestWeight = 0;
    let bestConfidence = 0;
    let _bestEvidence: string[] = [];

    for (const [decision, group] of decisionGroups) {
      if (group.totalWeight > bestWeight) {
        bestDecision = decision;
        bestWeight = group.totalWeight;
        bestConfidence = group.totalConfidence / group.agents.length;
        _bestEvidence = group.evidence;
      }
    }

    const allAgents = opinions.map(o => o.agentRole);
    const supporting = decisionGroups.get(bestDecision)?.agents ?? [];
    const dissenting = allAgents.filter(a => !supporting.includes(a));

    const reached = supporting.length >= this.config.minAgentsForConsensus && bestConfidence >= this.config.confidenceThreshold;

    return {
      reached,
      finalDecision: bestDecision,
      confidence: bestConfidence,
      supportingAgents: [...new Set(supporting)],
      dissentingAgents: [...new Set(dissenting)],
      rationale: reached
        ? `Consenso alcançado: ${supporting.length}/${opinions.length} agentes concordam (confiança=${Math.round(bestConfidence * 100)}%)`
        : `Sem consenso: melhor decisão tem ${supporting.length}/${opinions.length} agentes (confiança=${Math.round(bestConfidence * 100)}%)`,
    };
  }
}
