import { ResolvedPack, AttentionScorerConfig } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('attention-context-scorer');

export class AttentionContextScorer {
  private _config: AttentionScorerConfig;
  private _sectionEncodings: Map<string, number[]> = new Map();

  constructor(config: Partial<AttentionScorerConfig> = {}) {
    this._config = {
      encoderDim: 64,
      numHeads: 4,
      dropout: 0.1,
      temperature: 0.7,
      ...config,
    };
  }

  private _encode(text: string): number[] {
    const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
    const encoding = Array(this._config.encoderDim).fill(0);

    for (const token of tokens) {
      let hash = 0;
      for (let i = 0; i < token.length; i++) {
        hash = ((hash << 5) - hash + token.charCodeAt(i)) | 0;
        if (i >= 2) {
          const subword = token.slice(i - 2, i + 1);
          let swHash = 0;
          for (let j = 0; j < subword.length; j++) {
            swHash = ((swHash << 5) - swHash + subword.charCodeAt(j)) | 0;
          }
          const dim = Math.abs(swHash) % (this._config.encoderDim - 1);
          encoding[dim] += 1;
        }
      }
      const dim = Math.abs(hash) % this._config.encoderDim;
      encoding[dim] += Math.log(1 + tokens.filter(t => t === token).length);
    }

    const norm = Math.sqrt(encoding.reduce((s, v) => s + v ** 2, 0));
    if (norm > 0) {
      for (let i = 0; i < encoding.length; i++) {
        encoding[i] /= norm;
      }
    }

    return encoding;
  }

  indexSections(packs: ResolvedPack[]): void {
    for (const resolved of packs) {
      for (const section of resolved.pack.sections) {
        const key = `${resolved.pack.name}/${section.id}`;
        this._sectionEncodings.set(
          key,
          this._encode(`${section.title} ${section.content.slice(0, 200)}`)
        );
      }
    }
  }

  private _multiHeadCrossAttention(
    query: number[],
    keys: number[][],
    values: number[][]
  ): { scores: number[]; context: number[] } {
    const headDim = Math.floor(this._config.encoderDim / this._config.numHeads);
    const headScores: number[][] = [];

    for (let h = 0; h < this._config.numHeads; h++) {
      const hQuery = query.slice(h * headDim, (h + 1) * headDim);
      const headScoresH: number[] = [];

      for (let i = 0; i < keys.length; i++) {
        const hKey = keys[i].slice(h * headDim, (h + 1) * headDim);
        let dot = 0;
        for (let j = 0; j < headDim; j++) {
          dot += hQuery[j] * hKey[j];
        }
        headScoresH.push(dot / (Math.sqrt(headDim) * this._config.temperature));
      }
      headScores.push(headScoresH);
    }

    const avgScores: number[] = Array(keys.length).fill(0);
    for (let h = 0; h < headScores.length; h++) {
      for (let i = 0; i < headScores[h].length; i++) {
        avgScores[i] += headScores[h][i] / this._config.numHeads;
      }
    }

    const maxScore = Math.max(...avgScores, 0);
    let sumExp = 0;
    for (let i = 0; i < avgScores.length; i++) {
      avgScores[i] = Math.exp(avgScores[i] - maxScore);
      sumExp += avgScores[i];
    }
    if (sumExp > 0) {
      for (let i = 0; i < avgScores.length; i++) {
        avgScores[i] /= sumExp;
      }
    }

    const context = Array(this._config.encoderDim).fill(0);
    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        context[j] += avgScores[i] * values[i][j];
      }
    }

    return { scores: avgScores, context };
  }

  score(
    taskDescription: string,
    packs: ResolvedPack[],
    maxSections: number = 10
  ): {
    rankedSections: { packName: string; sectionId: string; score: number }[];
    attentionWeights: number[];
  } {
    this.indexSections(packs);
    const taskEncoding = this._encode(taskDescription);

    const keys: number[][] = [];
    const values: number[][] = [];
    const sectionKeys: string[] = [];

    for (const [key, encoding] of this._sectionEncodings) {
      keys.push(encoding);
      values.push(encoding);
      sectionKeys.push(key);
    }

    if (keys.length === 0) {
      return { rankedSections: [], attentionWeights: [] };
    }

    const { scores } = this._multiHeadCrossAttention(taskEncoding, keys, values);

    const ranked = sectionKeys
      .map((key, i) => ({ key, score: scores[i] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSections);

    const entropy = -scores.reduce((s, p) => s + (p > 0 ? p * Math.log(p) : 0), 0);
    const normalizedEntropy = entropy / Math.log(scores.length + 1);

    if (normalizedEntropy > 0.8) {
      const topScore = ranked[0]?.score || 0;
      for (const r of ranked) {
        r.score = r.score * (1 + (topScore - r.score) * 0.5);
      }
    }

    return {
      rankedSections: ranked.map(r => {
        const [packName, ...sectionParts] = r.key.split('/');
        return { packName, sectionId: sectionParts.join('/'), score: r.score };
      }),
      attentionWeights: scores.map(s => Math.round(s * 100) / 100),
    };
  }
}
