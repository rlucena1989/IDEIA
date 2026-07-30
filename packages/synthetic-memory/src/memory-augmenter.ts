import { createLogger } from '@ideia/logger';
import { MemorySample, AugmentationConfig, AugmentationStrategy } from './types';

const _logger = createLogger('synthetic-memory:augmenter');

function _randn(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export class MemoryAugmenter {
  private _config: AugmentationConfig;

  constructor(config?: Partial<AugmentationConfig>) {
    this._config = {
      maxVariationsPerMemory: 5,
      similarityThreshold: 0.85,
      noiseStd: 0.05,
      preserveSemantics: true,
      ...config,
    };
  }

  get config(): AugmentationConfig {
    return { ...this._config };
  }

  augmentMemory(
    originalEmbedding: Float64Array,
    originalMetadata: Record<string, unknown>,
    strategy?: AugmentationStrategy
  ): MemorySample[] {
    const variations: MemorySample[] = [];
    const timestamp = Date.now();
    const parentId = typeof originalMetadata.id === 'string' ? originalMetadata.id : 'unknown';

    const effectiveStrategy = strategy ?? AugmentationStrategy.GaussianNoise;

    for (let i = 0; i < this._config.maxVariationsPerMemory; i++) {
      let variation: Float64Array;

      switch (effectiveStrategy) {
        case AugmentationStrategy.GaussianNoise:
          variation = this._gaussianNoise(originalEmbedding, i);
          break;
        case AugmentationStrategy.Interpolation:
          variation = this._interpolate(originalEmbedding, i);
          break;
        case AugmentationStrategy.Extrapolation:
          variation = this._extrapolate(originalEmbedding, i);
          break;
        case AugmentationStrategy.Mixup:
          variation = this._mixup(originalEmbedding, i);
          break;
        default:
          variation = this._gaussianNoise(originalEmbedding, i);
      }

      variations.push({
        id: `aug-${parentId}-${i}`,
        embedding: variation,
        metadata: {
          ...originalMetadata,
          strategy: effectiveStrategy,
          timestamp,
          parentId,
          variationIndex: i,
        },
        isSynthetic: true,
      });
    }

    _logger.info(`Augmented memory with strategy "${effectiveStrategy}"`, {
      parentId,
      variationsCount: variations.length,
    });

    return variations;
  }

  augmentBatch(
    embeddings: Float64Array[],
    metadatas: Record<string, unknown>[],
    strategy?: AugmentationStrategy
  ): MemorySample[] {
    const allAugmented: MemorySample[] = [];
    for (let i = 0; i < embeddings.length; i++) {
      const augmented = this.augmentMemory(embeddings[i], metadatas[i], strategy);
      allAugmented.push(...augmented);
    }
    return allAugmented;
  }

  estimateDiversity(augmentedSet: MemorySample[]): number {
    if (augmentedSet.length < 2) {
      return 0;
    }

    let totalDist = 0;
    let pairs = 0;
    for (let i = 0; i < augmentedSet.length; i++) {
      for (let j = i + 1; j < augmentedSet.length; j++) {
        totalDist += this._cosineDistance(augmentedSet[i].embedding, augmentedSet[j].embedding);
        pairs++;
      }
    }
    return pairs > 0 ? totalDist / pairs : 0;
  }

  estimateSimilarity(original: Float64Array, augmented: Float64Array): number {
    return 1 - this._cosineDistance(original, augmented);
  }

  private _gaussianNoise(original: Float64Array, index: number): Float64Array {
    const decayFactor = Math.exp(-index * 0.5);
    const adaptiveNoise = this._config.noiseStd * (1 - decayFactor * 0.5);
    const variation = new Float64Array(original.length);

    for (let d = 0; d < original.length; d++) {
      const semanticShift = this._config.preserveSemantics
        ? Math.sin(index * 0.1 + d * 0.01) * 0.02
        : 0;
      variation[d] = original[d] + _randn() * adaptiveNoise + semanticShift;
    }

    return variation;
  }

  private _interpolate(original: Float64Array, index: number): Float64Array {
    const alpha = (index + 1) / (this._config.maxVariationsPerMemory + 1) * 0.3;
    const randomVec = new Float64Array(original.length);
    for (let d = 0; d < original.length; d++) {
      randomVec[d] = _randn();
    }

    const variation = new Float64Array(original.length);
    for (let d = 0; d < original.length; d++) {
      variation[d] = (1 - alpha) * original[d] + alpha * randomVec[d];
    }

    return variation;
  }

  private _extrapolate(original: Float64Array, index: number): Float64Array {
    const alpha = (index + 1) * 0.15;
    const direction = new Float64Array(original.length);
    for (let d = 0; d < original.length; d++) {
      direction[d] = _randn() * 0.1;
    }

    const variation = new Float64Array(original.length);
    for (let d = 0; d < original.length; d++) {
      variation[d] = original[d] + alpha * direction[d];
    }

    return variation;
  }

  private _mixup(original: Float64Array, index: number): Float64Array {
    const mixupVec = new Float64Array(original.length);
    for (let d = 0; d < original.length; d++) {
      mixupVec[d] = _randn() * 0.5;
    }

    const lambda = 0.5 + (index / this._config.maxVariationsPerMemory) * 0.4;
    const variation = new Float64Array(original.length);
    for (let d = 0; d < original.length; d++) {
      variation[d] = lambda * original[d] + (1 - lambda) * mixupVec[d];
    }

    return variation;
  }

  private _cosineDistance(a: Float64Array, b: Float64Array): number {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom < 1e-10 ? 1 : 1 - dot / denom;
  }
}
