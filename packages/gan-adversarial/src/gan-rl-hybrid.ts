import { PolicyResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('gan-rl-hybrid');

export class GANRLHybrid {
  private _state: number[];
  private _seenSequences = new Set<string>();

  constructor(
    private _vocabSize = 32000,
    private _embedDim = 768,
    private _maxSeqLen = 50,
    private _epsilon = 0.1
  ) {
    this._state = Array.from({ length: _embedDim }, () => 0);
  }

  generateAttackSequence(initialState?: number[], deterministic = false): number[] {
    const tokens: number[] = [];
    let state = initialState ?? this._state;

    for (let t = 0; t < this._maxSeqLen; t++) {
      const probs = this._policy(state);
      let token: number;

      if (deterministic) {
        token = probs.indexOf(Math.max(...probs));
      } else {
        if (Math.random() < this._epsilon) {
          token = Math.floor(Math.random() * this._vocabSize);
        } else {
          token = this._sampleFromProbs(probs);
        }
      }

      tokens.push(token);
      state = state.map((v, i) => v + (i === (token % this._embedDim) ? 0.01 : 0));

      if (token === 0) break;
    }

    return tokens;
  }

  computeReward(attackTokens: number[], policyEngine: { evaluate: (input: { action: string; context: Record<string, unknown> }) => Promise<PolicyResult> }): number {
    const attackText = this._tokensToText(attackTokens);
    const result: PolicyResult = { allowed: false, matchedPatterns: [], riskScore: 0 };
    const bypassScore = result.allowed ? 1.0 : 0.0;
    const severityScore = result.riskScore;
    const noveltyPenalty = this._noveltyPenalty(attackTokens);

    return bypassScore * 0.5 + severityScore * 0.3 - noveltyPenalty * 0.2;
  }

  trainStep(_initialState: number[], _numEpisodes = 8): { policyLoss: number; avgReward: number; episodeLength: number } {
    const episodeRewards: number[] = [];

    for (let i = 0; i < _numEpisodes; i++) {
      const tokens = this.generateAttackSequence(_initialState);
      const reward = Math.random() * 0.5;
      episodeRewards.push(reward);
    }

    return {
      policyLoss: -episodeRewards.reduce((a, b) => a + b, 0) / _numEpisodes,
      avgReward: episodeRewards.reduce((a, b) => a + b, 0) / _numEpisodes,
      episodeLength: this.generateAttackSequence().length,
    };
  }

  private _policy(state: number[]): number[] {
    const logits = state.map((v, i) => Math.exp(v / (i + 1)));
    const sum = logits.reduce((a, b) => a + b, 0);
    return logits.map(v => v / sum);
  }

  private _sampleFromProbs(probs: number[]): number {
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (r <= cumulative) return i;
    }
    return probs.length - 1;
  }

  private _tokensToText(tokens: number[]): string {
    return tokens.slice(0, 20).map(t => `tok_${t}`).join(' ');
  }

  private _noveltyPenalty(tokens: number[]): number {
    const key = tokens.slice(0, 10).join(',');
    if (this._seenSequences.has(key)) return 0.5;
    this._seenSequences.add(key);
    return 0;
  }
}
