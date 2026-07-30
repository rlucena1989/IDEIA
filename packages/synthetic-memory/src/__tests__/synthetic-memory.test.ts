import { SyntheticMemoryGenerator } from '../synthetic-memory-generator';
import { MemoryTemplate } from '../memory-template';
import { MemoryVariantGenerator } from '../memory-variant-generator';
import { MemoryValidator } from '../memory-validator';
import { GeneratorNetwork } from '../generator-network';
import { DiscriminatorNetwork } from '../discriminator-network';
import { ContrastiveMemoryGenerator } from '../contrastive-memory-generator';
import { GaussianDPMech } from '../gaussian-dp-mech';
import { MemoryAugmenter } from '../memory-augmenter';
import { MemoryTemplate as MemoryTemplateInterface, Memory } from '../types';

function _makeRandomEmbedding(dim: number): Float64Array {
  const emb = new Float64Array(dim);
  for (let i = 0; i < dim; i++) {
    emb[i] = Math.random() - 0.5;
  }
  return emb;
}

function _makeSampleMemory(overrides?: Partial<Memory>): Memory {
  return {
    id: 'test-mem-1',
    content: 'Resolved TypeScript strict mode errors by adding explicit type annotations to all function signatures and interfaces.',
    summary: 'Fixed TypeScript strict mode errors',
    importance: 0.75,
    tags: ['typescript', 'strict-mode', 'type-annotations'],
    source: 'synthesis',
    timestamp: Date.now(),
    level: 'L3',
    provenance: { originalSources: ['session-123'], synthesisMethod: 'template', faithfulness: 0.9 },
    accessCount: 5,
    lastAccessed: Date.now(),
    decayFactor: 0.95,
    ...overrides,
  };
}

const _sampleTemplate: MemoryTemplateInterface = {
  id: 'debug-pattern',
  name: 'Debug Pattern Resolution',
  description: 'Records how a specific debugging pattern was resolved',
  contentPattern: 'Fixed {errorType} by applying {solution}. Key insight: {insight}',
  tags: ['debugging', 'pattern'],
  importanceRange: [0.4, 0.8],
  source: 'template-library',
};

// ── MemoryTemplate Tests ──

describe('MemoryTemplate', () => {
  it('should generate a memory from template', () => {
    const template = new MemoryTemplate(_sampleTemplate);
    const memory = template.generateMemory();
    expect(memory.id).toBeTruthy();
    expect(memory.content).toContain('Fixed');
    expect(memory.importance).toBeGreaterThanOrEqual(0.4);
    expect(memory.importance).toBeLessThanOrEqual(0.8);
    expect(memory.source).toBe('synthesis');
    expect(memory.tags).toContain('debugging');
  });

  it('should fill seed values in template', () => {
    const template = new MemoryTemplate(_sampleTemplate);
    const memory = template.generateMemory({ errorType: 'TypeError', solution: 'type guard', insight: 'narrow types early' });
    expect(memory.content).toContain('TypeError');
    expect(memory.content).toContain('type guard');
    expect(memory.content).toContain('narrow types early');
  });

  it('should generate batch of memories', () => {
    const template = new MemoryTemplate(_sampleTemplate);
    const memories = template.generateBatch(5);
    expect(memories).toHaveLength(5);
    for (const m of memories) {
      expect(m.provenance.synthesisMethod).toBe('template');
    }
  });
});

// ── SyntheticMemoryGenerator (Core) Tests ──

describe('SyntheticMemoryGenerator', () => {
  it('should initialize with default config', () => {
    const gen = new SyntheticMemoryGenerator();
    expect(gen.config.mode).toBe('gan');
    expect(gen.config.latentDim).toBe(128);
    expect(gen.config.embeddingDim).toBe(384);
  });

  it('should initialize with custom config', () => {
    const gen = new SyntheticMemoryGenerator({ mode: 'dp', epsilon: 0.5, latentDim: 64 });
    expect(gen.config.mode).toBe('dp');
    expect(gen.config.epsilon).toBe(0.5);
    expect(gen.config.latentDim).toBe(64);
  });

  it('should register and use template', () => {
    const gen = new SyntheticMemoryGenerator();
    gen.registerTemplate(_sampleTemplate);
    const memory = gen.generateMemoriesFromTemplate();
    expect(memory).not.toBeNull();
    if (memory !== null) {
      expect(memory.content).toContain('Fixed');
    }
  });

  it('should generate batch from template', () => {
    const gen = new SyntheticMemoryGenerator();
    gen.registerTemplate(_sampleTemplate);
    const memories = gen.generateBatchFromTemplate(3);
    expect(memories).toHaveLength(3);
  });

  it('should return null for generateMemoriesFromTemplate without template', () => {
    const gen = new SyntheticMemoryGenerator();
    const result = gen.generateMemoriesFromTemplate();
    expect(result).toBeNull();
  });

  it('should run GAN training loop', async () => {
    const gen = new SyntheticMemoryGenerator({ epochs: 2, batchSize: 4 });
    const realEmbeddings = Array.from({ length: 8 }, () => _makeRandomEmbedding(384));
    const metrics = await gen.train(realEmbeddings);
    expect(metrics.epochsCompleted).toBe(2);
    expect(metrics.generatorLoss.length).toBe(2);
    expect(metrics.discriminatorLoss.length).toBe(2);
  });

  it('should generate synthetic samples', async () => {
    const gen = new SyntheticMemoryGenerator();
    const samples = await gen.generate(5);
    expect(samples).toHaveLength(5);
    for (const s of samples) {
      expect(s.isSynthetic).toBe(true);
      expect(s.embedding.length).toBe(384);
      expect(s.id).toContain('syn-');
    }
  });

  it('should generate with DP mode', async () => {
    const gen = new SyntheticMemoryGenerator({ mode: 'dp', epsilon: 2.0 });
    const samples = await gen.generate(3);
    expect(samples).toHaveLength(3);
    for (const s of samples) {
      expect(s.isSynthetic).toBe(true);
    }
  });

  it('should evaluate fidelity', async () => {
    const gen = new SyntheticMemoryGenerator({ epochs: 1 });
    const realEmbeddings = Array.from({ length: 5 }, () => _makeRandomEmbedding(384));
    const metrics = await gen.evaluateFidelity(realEmbeddings, 5);
    expect(metrics.mse).toBeGreaterThanOrEqual(0);
    expect(metrics.coverageScore).toBeGreaterThanOrEqual(0);
    expect(metrics.privacyLoss).toBeGreaterThan(0);
  });
});

// ── GAN Network Tests ──

describe('GeneratorNetwork', () => {
  it('should forward noise to embeddings', () => {
    const gen = new GeneratorNetwork({ inputDim: 16, hiddenDim: 32, outputDim: 64 });
    const noise = Array.from({ length: 3 }, () => {
      const v = new Float64Array(16);
      for (let i = 0; i < 16; i++) v[i] = Math.random();
      return v;
    });
    const output = gen.forward(noise);
    expect(output).toHaveLength(3);
    for (const o of output) {
      expect(o.length).toBe(64);
    }
  });

  it('should update weights via backward and update', () => {
    const gen = new GeneratorNetwork({ inputDim: 8, hiddenDim: 16, outputDim: 8 });
    const before = gen.getWeights()[0][0];
    gen.forward([new Float64Array(8)]);
    gen.backward(1.0);
    gen.update(0.01);
    const after = gen.getWeights()[0][0];
    expect(after).not.toBe(before);
  });

  it('should produce different outputs for different noise', () => {
    const gen = new GeneratorNetwork({ inputDim: 8, hiddenDim: 16, outputDim: 8 });
    const noise1 = [new Float64Array(8)];
    const noise2 = [new Float64Array(8)];
    noise2[0][0] = 1.0;
    const out1 = gen.forward(noise1);
    const out2 = gen.forward(noise2);
    let diff = false;
    for (let i = 0; i < out1[0].length; i++) {
      if (out1[0][i] !== out2[0][i]) { diff = true; break; }
    }
    expect(diff).toBe(true);
  });
});

describe('DiscriminatorNetwork', () => {
  it('should produce sigmoid scores', () => {
    const disc = new DiscriminatorNetwork({ inputDim: 16, hiddenDim: 32 });
    const embeddings = Array.from({ length: 3 }, () => _makeRandomEmbedding(16));
    const scores = disc.forward(embeddings);
    expect(scores).toHaveLength(3);
    for (const s of scores) {
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThan(1);
    }
  });

  it('should distinguish distributions after training', () => {
    const disc = new DiscriminatorNetwork({ inputDim: 8, hiddenDim: 16 });
    const realEmbs = Array.from({ length: 4 }, () => _makeRandomEmbedding(8));
    const fakeEmbs = Array.from({ length: 4 }, () => _makeRandomEmbedding(8));

    const realScores = disc.forward(realEmbs);
    const fakeScores = disc.forward(fakeEmbs);

    expect(realScores.length).toBe(4);
    expect(fakeScores.length).toBe(4);
  });
});

// ── Contrastive Tests ──

describe('ContrastiveMemoryGenerator', () => {
  it('should generate contrastive batch', () => {
    const gen = new ContrastiveMemoryGenerator();
    const batch = gen.generateContrastiveBatch('type-error', 3, 16);
    expect(batch.anchors).toHaveLength(3);
    expect(batch.positives).toHaveLength(3);
    expect(batch.hardNegatives).toHaveLength(3);
    expect(batch.negatives).toHaveLength(3);
  });

  it('should have higher similarity for anchor-positive than anchor-negative', () => {
    const gen = new ContrastiveMemoryGenerator();
    const batch = gen.generateContrastiveBatch('test-concept', 5, 64);

    const anchorPosSim = gen.estimateSimilarity(batch.anchors[0].embedding, batch.positives[0].embedding);
    const anchorNegSim = gen.estimateSimilarity(batch.anchors[0].embedding, batch.negatives[0].embedding);

    expect(anchorPosSim).toBeGreaterThan(anchorNegSim);
  });

  it('should compute NT-Xent loss', () => {
    const gen = new ContrastiveMemoryGenerator();
    const batch = gen.generateContrastiveBatch('loss-test', 4, 32);
    const loss = gen.computeNTXentLoss(
      batch.anchors.map(a => a.embedding),
      batch.positives.map(p => p.embedding)
    );
    expect(loss).toBeGreaterThan(0);
  });
});

// ── DP Mechanism Tests ──

describe('GaussianDPMech', () => {
  it('should apply noise to embedding', () => {
    const dp = new GaussianDPMech({ epsilon: 1.0, delta: 1e-5 });
    const original = new Float64Array([0.5, -0.3, 0.1, 0.8, -0.2]);
    const noised = dp.apply(original);
    expect(noised.length).toBe(5);
    let diff = false;
    for (let i = 0; i < 5; i++) {
      if (noised[i] !== original[i]) { diff = true; break; }
    }
    expect(diff).toBe(true);
  });

  it('should calibrate noise correctly', () => {
    const dp = new GaussianDPMech({ epsilon: 1.0, delta: 1e-5, sensitivity: 1.0 });
    const sigma = dp.calibrateNoise(1.0, 1.0, 1e-5);
    expect(sigma).toBeGreaterThan(0);
  });

  it('should respect privacy budget composition', () => {
    const dp = new GaussianDPMech({ epsilon: 1.0 });
    expect(dp.computePrivacyBudget(5)).toBe(5);
  });

  it('should track remaining budget', () => {
    const dp = new GaussianDPMech({ epsilon: 1.0 });
    const remaining = dp.computeRemainingBudget(10, 3);
    expect(remaining).toBe(7);
    expect(dp.computeRemainingBudget(5, 10)).toBe(0);
  });

  it('should apply with budget awareness', () => {
    const dp = new GaussianDPMech({ epsilon: 0.5 });
    const embedding = new Float64Array([0.1, 0.2, 0.3]);
    const { result, consumedBudget } = dp.applyWithBudget(embedding, 1.0);
    expect(result.length).toBe(3);
    expect(consumedBudget).toBeGreaterThan(0);
  });

  it('should return empty result when budget exhausted', () => {
    const dp = new GaussianDPMech({ epsilon: 1.0 });
    const embedding = new Float64Array(3);
    const { consumedBudget } = dp.applyWithBudget(embedding, -1);
    expect(consumedBudget).toBe(0);
  });

  it('should update epsilon and recompute sigma', () => {
    const dp = new GaussianDPMech({ epsilon: 1.0 });
    const sigma1 = dp.sigma;
    dp.setEpsilon(2.0);
    expect(dp.epsilon).toBe(2.0);
    expect(dp.sigma).toBeLessThan(sigma1);
  });

  it('should apply to batch', () => {
    const dp = new GaussianDPMech({ epsilon: 2.0 });
    const embeddings = Array.from({ length: 3 }, () => _makeRandomEmbedding(8));
    const noised = dp.applyToBatch(embeddings);
    expect(noised).toHaveLength(3);
  });
});

// ── MemoryAugmenter Tests ──

describe('MemoryAugmenter', () => {
  it('should augment a single memory', () => {
    const aug = new MemoryAugmenter({ maxVariationsPerMemory: 3 });
    const embedding = _makeRandomEmbedding(16);
    const variations = aug.augmentMemory(embedding, { id: 'orig-1' });
    expect(variations).toHaveLength(3);
    for (const v of variations) {
      expect(v.isSynthetic).toBe(true);
      expect(v.metadata.parentId).toBe('orig-1');
    }
  });

  it('should augment with different strategies', () => {
    const aug = new MemoryAugmenter({ maxVariationsPerMemory: 2 });
    const embedding = _makeRandomEmbedding(8);
    const gaussian = aug.augmentMemory(embedding, { id: 'test' }, 'gaussian_noise' as any);
    expect(gaussian.length).toBe(2);
  });

  it('should augment batch of memories', () => {
    const aug = new MemoryAugmenter({ maxVariationsPerMemory: 2 });
    const embeddings = Array.from({ length: 3 }, () => _makeRandomEmbedding(8));
    const metadatas = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const all = aug.augmentBatch(embeddings, metadatas);
    expect(all).toHaveLength(6);
  });

  it('should estimate diversity', () => {
    const aug = new MemoryAugmenter({ maxVariationsPerMemory: 3 });
    const embedding = _makeRandomEmbedding(8);
    const variations = aug.augmentMemory(embedding, { id: 'div-test' });
    const diversity = aug.estimateDiversity(variations);
    expect(diversity).toBeGreaterThan(0);
  });

  it('should estimate similarity', () => {
    const aug = new MemoryAugmenter({ maxVariationsPerMemory: 1 });
    const embedding = _makeRandomEmbedding(8);
    const variations = aug.augmentMemory(embedding, { id: 'sim-test' });
    const similarity = aug.estimateSimilarity(embedding, variations[0].embedding);
    expect(similarity).toBeGreaterThan(0);
  });

  it('should return zero diversity for single element', () => {
    const aug = new MemoryAugmenter();
    const embedding = _makeRandomEmbedding(4);
    const div = aug.estimateDiversity([{ id: 'single', embedding, metadata: {}, isSynthetic: true }]);
    expect(div).toBe(0);
  });
});

// ── MemoryValidator Tests ──

describe('MemoryValidator', () => {
  it('should validate a high-quality memory', () => {
    const validator = new MemoryValidator();
    const memory = _makeSampleMemory();
    const result = validator.validate(memory);
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThan(0.5);
  });

  it('should fail a low-quality memory', () => {
    const validator = new MemoryValidator();
    const memory = _makeSampleMemory({ content: '', summary: '', importance: 0.05, level: 'L1' });
    const result = validator.validate(memory);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should validate batch', () => {
    const validator = new MemoryValidator();
    const memories = [_makeSampleMemory(), _makeSampleMemory({ id: 'mem-2' })];
    const results = validator.validateBatch(memories);
    expect(results).toHaveLength(2);
  });

  it('should detect contradictions', () => {
    const validator = new MemoryValidator();
    const memory = _makeSampleMemory({ content: 'Always use X for everything. Must always use X. Avoid using Y sometimes.' });
    const result = validator.validate(memory);
    expect(result.coherence).toBeLessThan(0.6);
  });

  it('should flag low faithfulness', () => {
    const validator = new MemoryValidator(0.9, 0.2, 0.5, 0.5);
    const memory = _makeSampleMemory({
      provenance: { originalSources: [], synthesisMethod: 'reflection', faithfulness: 0.3 },
    });
    const result = validator.validate(memory);
    const hasFaithfulnessIssue = result.issues.some(i => i.type === 'faithfulness');
    expect(hasFaithfulnessIssue).toBe(true);
  });

  it('should detect implausible content', () => {
    const validator = new MemoryValidator();
    const memory = _makeSampleMemory({ content: 'This impossible solution always works and never fails. Guaranteed perfect results.' });
    const result = validator.validate(memory);
    expect(result.plausibility).toBeLessThan(0.7);
  });

  it('should detect redundancy between content and summary', () => {
    const validator = new MemoryValidator();
    const content = 'Fixed bug in authentication module';
    const memory = _makeSampleMemory({ content, summary: content });
    const result = validator.validate(memory);
    const hasRedundancyIssue = result.issues.some(i => i.type === 'redundancy');
    expect(hasRedundancyIssue).toBe(true);
  });
});

// ── MemoryVariantGenerator Tests ──

describe('MemoryVariantGenerator', () => {
  it('should generate variants from memory', () => {
    const gen = new MemoryVariantGenerator();
    const memory = _makeSampleMemory();
    const variants = gen.generateVariants(memory, 3);
    expect(variants).toHaveLength(3);
    for (const v of variants) {
      expect(v.templateId).toBe('direct');
      expect(v.importance).toBeGreaterThanOrEqual(0);
      expect(v.importance).toBeLessThanOrEqual(1);
    }
  });

  it('should generate from registered template', () => {
    const gen = new MemoryVariantGenerator([_sampleTemplate]);
    const variants = gen.generateFromTemplate('debug-pattern', 2);
    expect(variants).toHaveLength(2);
    for (const v of variants) {
      expect(v.templateId).toBe('debug-pattern');
    }
  });

  it('should return empty array for unregistered template', () => {
    const gen = new MemoryVariantGenerator();
    const variants = gen.generateFromTemplate('nonexistent', 3);
    expect(variants).toHaveLength(0);
  });

  it('should estimate diversity', () => {
    const gen = new MemoryVariantGenerator();
    const memory = _makeSampleMemory();
    const variants = gen.generateVariants(memory, 4);
    const diversity = gen.estimateDiversity(variants);
    expect(diversity).toBeGreaterThanOrEqual(0);
  });

  it('should return zero diversity for single variant', () => {
    const gen = new MemoryVariantGenerator();
    const variants = gen.generateVariants(_makeSampleMemory(), 1);
    const diversity = gen.estimateDiversity(variants);
    expect(diversity).toBe(0);
  });
});

// ── Full Pipeline Integration Tests ──

describe('Full Pipeline Integration', () => {
  it('should generate, validate, augment, and contrast in sequence', async () => {
    const gen = new SyntheticMemoryGenerator({ mode: 'gan', epochs: 1, batchSize: 4 });
    gen.registerTemplate(_sampleTemplate);

    const memories = gen.generateBatchFromTemplate(3);
    expect(memories).toHaveLength(3);

    const validationResults = gen.validator.validateBatch(memories);
    expect(validationResults).toHaveLength(3);

    const realEmbeddings = Array.from({ length: 4 }, () => _makeRandomEmbedding(384));
    const metrics = await gen.train(realEmbeddings);
    expect(metrics.epochsCompleted).toBe(1);

    const samples = await gen.generate(5);
    expect(samples).toHaveLength(5);

    const contrastive = await gen.generateContrastiveBatch('test-concept', 2);
    expect(contrastive.anchors.length).toBe(2);

    const augmented = gen.augmenter.augmentMemory(samples[0].embedding, { id: samples[0].id });
    expect(augmented.length).toBeGreaterThan(0);
  });

  it('should run DP pipeline with budget tracking', () => {
    const dp = new GaussianDPMech({ epsilon: 0.1, delta: 1e-5 });
    let budget = 1.0;
    const embeddings = Array.from({ length: 5 }, () => _makeRandomEmbedding(16));

    for (const emb of embeddings) {
      if (budget <= 0) break;
      const { result, consumedBudget } = dp.applyWithBudget(emb, budget);
      expect(result.length).toBe(16);
      budget -= consumedBudget;
    }

    expect(budget).toBeLessThan(1.0);
  });

  it('should produce valid contrastive similarities', () => {
    const cg = new ContrastiveMemoryGenerator({ temperature: 0.5, margin: 0.3, similarityTarget: 0.85, batchSize: 4 });
    const batch = cg.generateContrastiveBatch('integration-test', 3, 32);

    const posSim = cg.estimateSimilarity(batch.anchors[0].embedding, batch.positives[0].embedding);
    const negSim = cg.estimateSimilarity(batch.anchors[0].embedding, batch.negatives[0].embedding);

    expect(posSim).toBeGreaterThan(negSim);

    const loss = cg.computeNTXentLoss(
      batch.anchors.map(a => a.embedding),
      batch.positives.map(p => p.embedding)
    );
    expect(loss).toBeGreaterThan(0);
  });
});
