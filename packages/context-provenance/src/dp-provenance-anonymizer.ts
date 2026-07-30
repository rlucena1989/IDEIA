import { ProvenanceEntry } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('dp-provenance-anonymizer');

export class DPProvenanceAnonymizer {
  private _epsilon = 1.0;
  private _sensitivity = 0.1;

  anonymizeInfluenceScore(rawScore: number): number {
    const noise = this._laplaceNoise(this._sensitivity / this._epsilon);
    return Math.max(0, Math.min(1, rawScore + noise));
  }

  anonymizeSourceDistribution(entries: ProvenanceEntry[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const e of entries) {
      counts.set(e.source, (counts.get(e.source) || 0) + 1);
    }
    for (const [key, val] of counts) {
      counts.set(key, val + this._laplaceNoise(this._sensitivity / this._epsilon));
    }
    return counts;
  }

  getEpsilon(): number { return this._epsilon; }
  setEpsilon(eps: number): void { this._epsilon = eps; }

  private _laplaceNoise(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
}