import { ConsensusResult, ConsensusVote, ConsensusProvider } from './types';

export class ConsensusEngine {
  constructor(private options: { minVotes?: number; maxVariance?: number } = {}) {}

  async reachConsensus(
    prompt: string,
    providers: ConsensusProvider[]
  ): Promise<ConsensusResult> {
    const votes: ConsensusVote[] = [];
    const minVotes = this.options.minVotes ?? 2;

    for (const provider of providers) {
      try {
        const result = await provider.vote(prompt);
        votes.push({
          provider: provider.name,
          decision: result.decision,
          confidence: result.confidence,
        });
      } catch {
        // provider failed, skip
      }
    }

    if (votes.length < minVotes) {
      return {
        consensus: 'insufficient_votes',
        confidence: 0,
        agreement: 0,
        votes,
      };
    }

    const totalConfidence = votes.reduce((sum, v) => sum + v.confidence, 0);
    const avgConfidence = totalConfidence / votes.length;

    const decisions = votes.map(v => v.decision);
    const uniqueDecisions = [...new Set(decisions)];
    const agreement = 1 - (uniqueDecisions.length - 1) / Math.max(1, votes.length);

    const decisionCounts = new Map<string, number>();
    for (const d of decisions) {
      decisionCounts.set(d, (decisionCounts.get(d) || 0) + 1);
    }
    const consensus = [...decisionCounts.entries()]
      .sort((a, b) => b[1] - a[1])[0][0];

    return {
      consensus,
      confidence: Math.round(avgConfidence * 100) / 100,
      agreement: Math.round(agreement * 100) / 100,
      votes,
    };
  }
}

export function createConsensusEngine(options?: { minVotes?: number; maxVariance?: number }): ConsensusEngine {
  return new ConsensusEngine(options);
}
