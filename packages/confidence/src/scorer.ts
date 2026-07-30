import { ConfidenceScore, ConfidenceLevel, ScoringFactor, ClassificationResult, ConsensusResult } from './types';
import { createLogger } from '@ideia/logger';
import { SemanticClassifier } from './classifier';
import { ConsensusEngine } from './consensus';

const ConsensusProvider = class {} as any;

export class ConfidenceScorer {
  private classifier: SemanticClassifier;
  private consensusEngine: ConsensusEngine;

  constructor() {
    this.classifier = new SemanticClassifier();
    this.consensusEngine = new ConsensusEngine();
  }

  async score(options: {
    input?: string;
    classification?: ClassificationResult;
    consensus?: ConsensusResult;
    factors?: ScoringFactor[];
  }): Promise<ConfidenceScore> {
    const factors: ScoringFactor[] = [...(options.factors || [])];

    if (options.input) {
      const classification = options.classification ?? this.classifier.classify(options.input);
      factors.push({
        name: 'classification',
        weight: 0.3,
        score: classification.confidence,
      });
    }

    if (options.consensus) {
      factors.push({
        name: 'consensus',
        weight: 0.4,
        score: options.consensus.confidence * options.consensus.agreement,
      });
    }

    if (factors.length === 0) {
      return { overall: 0, level: 'unknown', factors: [] };
    }

    let totalWeight = 0;
    let weightedSum = 0;
    for (const f of factors) {
      totalWeight += f.weight;
      weightedSum += f.weight * f.score;
    }

    const overall = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
    const level = this.toLevel(overall);

    return { overall, level, factors };
  }

  classify(input: string): ClassificationResult {
    return this.classifier.classify(input);
  }

  async consensus(prompt: string, providers: unknown[]): Promise<ConsensusResult> {
    return this.consensusEngine.reachConsensus(prompt, providers as any[]);
  }

  private toLevel(score: number): ConfidenceLevel {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    if (score >= 0.1) return 'low';
    return 'unknown';
  }
}
