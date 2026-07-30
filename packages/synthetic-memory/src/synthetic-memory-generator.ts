import { createLogger } from '@ideia/logger';
import {
  Memory,
  MemoryTemplate as MemoryTemplateInterface,
  MemorySample,
  SynthesisConfig,
  TrainingMetrics,
  FidelityMetrics,
} from './types';
import { GeneratorNetwork } from './generator-network';
import { DiscriminatorNetwork } from './discriminator-network';
import { GaussianDPMech } from './gaussian-dp-mech';
import { MemoryTemplate } from './memory-template';
import { MemoryVariantGenerator } from './memory-variant-generator';
import { MemoryValidator } from './memory-validator';
import { ContrastiveMemoryGenerator } from './contrastive-memory-generator';
import { MemoryAugmenter } from './memory-augmenter';

const _logger = createLogger('synthetic-memory:generator');

function _randn(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export class SyntheticMemoryGenerator {
  private _generator: GeneratorNetwork;
  private _discriminator: DiscriminatorNetwork;
  private _dpMechanism: GaussianDPMech;
  private _config: SynthesisConfig;
  private _templateEngine: MemoryTemplate | null;
  private _variantGenerator: MemoryVariantGenerator;
  private _validator: MemoryValidator;
  private _contrastiveGenerator: ContrastiveMemoryGenerator;
  private _augmenter: MemoryAugmenter;

  constructor(config?: Partial<SynthesisConfig>) {
    this._config = {
      mode: 'gan',
      latentDim: 128,
      embeddingDim: 384,
      epsilon: 1.0,
      delta: 1e-5,
      batchSize: 64,
      learningRate: 3e-4,
      epochs: 100,
      ...config,
    };

    this._generator = new GeneratorNetwork({
      inputDim: this._config.latentDim,
      hiddenDim: 256,
      outputDim: this._config.embeddingDim,
    });

    this._discriminator = new DiscriminatorNetwork({
      inputDim: this._config.embeddingDim,
      hiddenDim: 128,
    });

    this._dpMechanism = new GaussianDPMech({
      epsilon: this._config.epsilon,
      delta: this._config.delta,
      sensitivity: 1.0,
    });

    this._templateEngine = null;
    this._variantGenerator = new MemoryVariantGenerator();
    this._validator = new MemoryValidator();
    this._contrastiveGenerator = new ContrastiveMemoryGenerator();
    this._augmenter = new MemoryAugmenter();

    _logger.info(`SyntheticMemoryGenerator initialized`, { mode: this._config.mode });
  }

  get generator(): GeneratorNetwork {
    return this._generator;
  }

  get discriminator(): DiscriminatorNetwork {
    return this._discriminator;
  }

  get dpMechanism(): GaussianDPMech {
    return this._dpMechanism;
  }

  get config(): SynthesisConfig {
    return { ...this._config };
  }

  get variantGenerator(): MemoryVariantGenerator {
    return this._variantGenerator;
  }

  get validator(): MemoryValidator {
    return this._validator;
  }

  get contrastiveGenerator(): ContrastiveMemoryGenerator {
    return this._contrastiveGenerator;
  }

  get augmenter(): MemoryAugmenter {
    return this._augmenter;
  }

  registerTemplate(template: MemoryTemplateInterface): void {
    this._templateEngine = new MemoryTemplate(template);
    this._variantGenerator.registerTemplate(template);
    _logger.info(`Template registered: "${template.name}"`);
  }

  async train(realEmbeddings: Float64Array[]): Promise<TrainingMetrics> {
    const n = realEmbeddings.length;
    const metrics: TrainingMetrics = {
      generatorLoss: [],
      discriminatorLoss: [],
      dpEpsilon: this._config.epsilon,
      epochsCompleted: 0,
    };

    if (n === 0) {
      _logger.warn('No real embeddings provided for training');
      return metrics;
    }

    for (let epoch = 0; epoch < this._config.epochs; epoch++) {
      let gLoss = 0;
      let dLoss = 0;
      const batches = Math.ceil(n / this._config.batchSize);

      for (let b = 0; b < batches; b++) {
        const start = b * this._config.batchSize;
        const end = Math.min(start + this._config.batchSize, n);
        const realBatch = realEmbeddings.slice(start, end);

        const noiseBatch = this._sampleNoise(realBatch.length);
        let syntheticBatch = this._generator.forward(noiseBatch);

        if (this._config.mode === 'dp') {
          syntheticBatch = syntheticBatch.map(e => this._dpMechanism.apply(e));
        }

        const realScores = this._discriminator.forward(realBatch);
        const fakeScores = this._discriminator.forward(syntheticBatch);

        const batchDLoss = this._computeDiscriminatorLoss(realScores, fakeScores);
        const batchGLoss = this._computeGeneratorLoss(fakeScores);

        this._discriminator.backward(batchDLoss);
        this._generator.backward(batchGLoss);

        this._discriminator.update(this._config.learningRate);
        this._generator.update(this._config.learningRate);

        gLoss += batchGLoss;
        dLoss += batchDLoss;
      }

      metrics.generatorLoss.push(gLoss / batches);
      metrics.discriminatorLoss.push(dLoss / batches);
      metrics.epochsCompleted = epoch + 1;
    }

    _logger.info(`Training completed`, { epochs: metrics.epochsCompleted, finalGLoss: metrics.generatorLoss[metrics.generatorLoss.length - 1] });
    return metrics;
  }

  async generate(count: number, similarityGroup?: string): Promise<MemorySample[]> {
    const noise = this._sampleNoise(count);
    let embeddings = this._generator.forward(noise);

    if (this._config.mode === 'dp') {
      embeddings = embeddings.map(e => this._dpMechanism.apply(e));
    }

    const samples: MemorySample[] = [];
    for (let i = 0; i < count; i++) {
      samples.push({
        id: `syn-${Date.now()}-${i}`,
        embedding: embeddings[i],
        metadata: {
          type: this._config.mode,
          timestamp: Date.now(),
          similarityGroup,
          privacyBudget: this._config.epsilon,
        },
        isSynthetic: true,
      });
    }

    return samples;
  }

  generateMemoriesFromTemplate(seedValues?: Record<string, string>): Memory | null {
    if (this._templateEngine === null) {
      _logger.warn('No template registered');
      return null;
    }
    return this._templateEngine.generateMemory(seedValues);
  }

  generateBatchFromTemplate(count: number): Memory[] {
    if (this._templateEngine === null) {
      _logger.warn('No template registered');
      return [];
    }
    return this._templateEngine.generateBatch(count);
  }

  async generateContrastiveBatch(
    anchorConcept: string,
    variations: number
  ): Promise<{
    anchors: MemorySample[];
    positives: MemorySample[];
    hardNegatives: MemorySample[];
    negatives: MemorySample[];
  }> {
    return this._contrastiveGenerator.generateContrastiveBatch(
      anchorConcept,
      variations,
      this._config.embeddingDim
    );
  }

  async evaluateFidelity(realEmbeddings: Float64Array[], syntheticCount: number): Promise<FidelityMetrics> {
    const synthetic = await this.generate(syntheticCount);

    const realMean = this._meanEmbedding(realEmbeddings);
    const synMean = this._meanEmbedding(synthetic.map(s => s.embedding));
    const mse = this._meanSquaredError(realMean, synMean);

    const distances = synthetic.map(s =>
      Math.min(...realEmbeddings.map(r => this._cosineDistance(s.embedding, r)))
    );

    return {
      mse,
      avgMinDistance: distances.length > 0
        ? distances.reduce((a, b) => a + b, 0) / distances.length
        : 0,
      coverageScore: this._computeCoverage(synthetic.map(s => s.embedding), realEmbeddings),
      privacyLoss: this._config.epsilon,
    };
  }

  private _sampleNoise(count: number): Float64Array[] {
    return Array.from({ length: count }, () => {
      const vec = new Float64Array(this._config.latentDim);
      for (let i = 0; i < this._config.latentDim; i++) {
        vec[i] = _randn();
      }
      return vec;
    });
  }

  private _meanEmbedding(embeddings: Float64Array[]): Float64Array {
    const n = embeddings.length;
    if (n === 0) {
      return new Float64Array(this._config.embeddingDim);
    }
    const dim = embeddings[0].length;
    const mean = new Float64Array(dim);
    for (const emb of embeddings) {
      for (let d = 0; d < dim; d++) {
        mean[d] += emb[d] / n;
      }
    }
    return mean;
  }

  private _meanSquaredError(a: Float64Array, b: Float64Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return sum / a.length;
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

  private _computeCoverage(synthetic: Float64Array[], real: Float64Array[]): number {
    if (real.length === 0) {
      return 0;
    }
    let covered = 0;
    for (const r of real) {
      const minDist = Math.min(...synthetic.map(s => this._cosineDistance(s, r)));
      if (minDist < 0.3) covered++;
    }
    return covered / real.length;
  }

  private _computeDiscriminatorLoss(realScores: number[], fakeScores: number[]): number {
    let loss = 0;
    for (const s of realScores) {
      loss -= Math.log(Math.max(s, 1e-8));
    }
    for (const s of fakeScores) {
      loss -= Math.log(Math.max(1 - s, 1e-8));
    }
    return loss / (realScores.length + fakeScores.length);
  }

  private _computeGeneratorLoss(fakeScores: number[]): number {
    let loss = 0;
    for (const s of fakeScores) {
      loss -= Math.log(Math.max(s, 1e-8));
    }
    return loss / fakeScores.length;
  }
}
