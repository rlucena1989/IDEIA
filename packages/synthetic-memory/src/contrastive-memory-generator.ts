import { createLogger } from '@ideia/logger';
import { MemorySample, ContrastiveConfig } from './types';

const _logger = createLogger('synthetic-memory:contrastive');

function _randn(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export class ContrastiveMemoryGenerator {
  private _config: ContrastiveConfig;
  private _rngState: number;

  constructor(config?: Partial<ContrastiveConfig>) {
    this._config = {
      temperature: 0.5,
      similarityTarget: 0.85,
      margin: 0.3,
      batchSize: 32,
      ...config,
    };
    this._rngState = Date.now();
  }

  get config(): ContrastiveConfig {
    return { ...this._config };
  }

  generateContrastiveBatch(
    anchorConcept: string,
    variations: number,
    embeddingDim: number
  ): {
    anchors: MemorySample[];
    positives: MemorySample[];
    hardNegatives: MemorySample[];
    negatives: MemorySample[];
  } {
    const baseEmbedding = this._generateRandomEmbedding(embeddingDim);

    const anchors: MemorySample[] = [];
    const positives: MemorySample[] = [];
    const hardNegatives: MemorySample[] = [];
    const negatives: MemorySample[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < variations; i++) {
      anchors.push({
        id: `anchor-${anchorConcept}-${i}`,
        embedding: this._addNoise(baseEmbedding, 0.05),
        metadata: { type: 'contrastive', timestamp, similarityGroup: anchorConcept, role: 'anchor' },
        isSynthetic: true,
      });

      positives.push({
        id: `pos-${anchorConcept}-${i}`,
        embedding: this._addNoise(baseEmbedding, 0.1),
        metadata: { type: 'contrastive', timestamp, similarityGroup: anchorConcept, role: 'positive' },
        isSynthetic: true,
      });

      hardNegatives.push({
        id: `hardneg-${anchorConcept}-${i}`,
        embedding: this._addNoise(baseEmbedding, 0.4),
        metadata: { type: 'contrastive', timestamp, similarityGroup: anchorConcept, role: 'hard_negative' },
        isSynthetic: true,
      });

      const negEmbedding = this._generateRandomEmbedding(embeddingDim);
      negatives.push({
        id: `neg-${anchorConcept}-${i}`,
        embedding: negEmbedding,
        metadata: { type: 'contrastive', timestamp, similarityGroup: undefined, role: 'negative' },
        isSynthetic: true,
      });
    }

    _logger.info(`Generated contrastive batch for concept "${anchorConcept}"`, { variations });
    return { anchors, positives, hardNegatives, negatives };
  }

  computeNTXentLoss(
    anchorEmbeddings: Float64Array[],
    positiveEmbeddings: Float64Array[]
  ): number {
    const batchSize = Math.min(anchorEmbeddings.length, positiveEmbeddings.length);
    let totalLoss = 0;

    for (let i = 0; i < batchSize; i++) {
      const anchor = anchorEmbeddings[i];
      const positive = positiveEmbeddings[i];

      const posSim = this._cosineSimilarity(anchor, positive);
      const expPos = Math.exp(posSim / this._config.temperature);

      let sumNeg = 0;
      for (let j = 0; j < batchSize; j++) {
        if (j !== i) {
          const negSim = this._cosineSimilarity(anchor, positiveEmbeddings[j]);
          sumNeg += Math.exp(negSim / this._config.temperature);
        }
      }

      const loss = -Math.log(expPos / (expPos + sumNeg + 1e-8));
      totalLoss += loss;
    }

    return totalLoss / batchSize;
  }

  estimateSimilarity(a: Float64Array, b: Float64Array): number {
    return this._cosineSimilarity(a, b);
  }

  private _generateRandomEmbedding(dim: number): Float64Array {
    const embedding = new Float64Array(dim);
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      embedding[i] = _randn();
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 1e-10) {
      for (let i = 0; i < dim; i++) {
        embedding[i] /= norm;
      }
    }
    return embedding;
  }

  private _addNoise(embedding: Float64Array, std: number): Float64Array {
    const result = new Float64Array(embedding.length);
    for (let i = 0; i < embedding.length; i++) {
      result[i] = embedding[i] + _randn() * std;
    }
    return result;
  }

  private _cosineSimilarity(a: Float64Array, b: Float64Array): number {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom < 1e-10 ? 0 : dot / denom;
  }
}
