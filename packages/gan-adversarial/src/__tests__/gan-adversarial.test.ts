import { GANAttackGenerator } from '../gan-attack-generator';
import { GeneratorNetwork } from '../generator-network';
import { DiscriminatorNetwork } from '../discriminator-network';
import { WassersteinLoss } from '../wasserstein-loss';
import { EnsembleDefense } from '../ensemble-defense';
import { EvolutionaryGAN } from '../evolutionary-gan';
import { ConditionalGANGenerator } from '../conditional-gan-generator';
import { StyleGANAttackMixer } from '../stylegan-attack-mixer';
import { GANRLHybrid } from '../gan-rl-hybrid';
import { GANPayloadDecoder } from '../gan-payload-decoder';
import { DEFAULT_GAN_CONFIG, PolicyResult } from '../types';

const mockPolicyEngine = {
  evaluate: async () => ({ allowed: false, matchedPatterns: ['test'] as string[], riskScore: 0.5 }),
  addPattern: async () => {},
  hasCoverage: () => true,
};

describe('GeneratorNetwork', () => {
  it('should generate embeddings from noise', () => {
    const gen = new GeneratorNetwork(128, 768, 32);
    const noise = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
    const result = gen.forward(noise);
    expect(result.length).toBe(768);
    result.forEach(v => expect(v).toBeGreaterThanOrEqual(-1));
    result.forEach(v => expect(v).toBeLessThanOrEqual(1));
  });

  it('should generate batch', () => {
    const gen = new GeneratorNetwork(128, 768);
    const batch = gen.generateBatch(10);
    expect(batch.length).toBe(10);
    expect(batch[0].length).toBe(768);
  });

  it('should crossover two generators', () => {
    const g1 = new GeneratorNetwork(128, 768);
    const g2 = new GeneratorNetwork(128, 768);
    const child = g1.crossover(g2);
    expect(child.layerSizes.embedDim).toBe(768);
  });

  it('should mutate', () => {
    const gen = new GeneratorNetwork(128, 768);
    const before = gen.getWeights().layer1[0];
    gen.mutate(1.0, 1.0);
    const after = gen.getWeights().layer1[0];
    expect(after).not.toBe(before);
  });

  it('should copy', () => {
    const gen = new GeneratorNetwork(128, 768);
    const copy = gen.copy();
    expect(copy.layerSizes.embedDim).toBe(gen.layerSizes.embedDim);
  });

  it('should use condition', () => {
    const gen = new GeneratorNetwork(128, 768, 32);
    const condition = Array.from({ length: 32 }, () => Math.random() * 2 - 1);
    const result = gen.forward(Array.from({ length: 128 }, () => 0), condition);
    expect(result.length).toBe(768);
  });
});

describe('DiscriminatorNetwork', () => {
  it('should produce score between 0 and 1', () => {
    const disc = new DiscriminatorNetwork(768);
    const score = disc.forward(Array.from({ length: 768 }, () => Math.random()));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should predict batch', () => {
    const disc = new DiscriminatorNetwork(768);
    const batch = Array.from({ length: 5 }, () => Array.from({ length: 768 }, () => Math.random()));
    const scores = disc.predictBatch(batch);
    expect(scores.length).toBe(5);
  });

  it('should set and get weights', () => {
    const disc = new DiscriminatorNetwork(768);
    const newWeights = Array.from({ length: 768 }, () => 0.5);
    disc.setWeights(newWeights);
    expect(disc.getWeights()).toEqual(newWeights);
  });
});

describe('WassersteinLoss', () => {
  it('should compute discriminator loss', () => {
    const loss = new WassersteinLoss();
    const dLoss = loss.computeDiscriminatorLoss([0.9, 0.8], [0.2, 0.3]);
    expect(dLoss).toBeLessThan(0);
  });

  it('should compute generator loss', () => {
    const loss = new WassersteinLoss();
    const gLoss = loss.computeGeneratorLoss([0.2, 0.3]);
    expect(gLoss).toBeLessThan(0);
  });

  it('should compute gradient penalty', () => {
    const loss = new WassersteinLoss();
    const gp = loss.gradientPenalty(
      [[1, 0], [0, 1]],
      [[0.5, 0.5], [0.5, 0.5]],
      (embeddings) => embeddings.map(e => e[0])
    );
    expect(gp).toBeGreaterThanOrEqual(0);
  });
});

describe('EnsembleDefense', () => {
  it('should predict with multiple models', () => {
    const ens = new EnsembleDefense(3, 768);
    const result = ens.predict(Array.from({ length: 768 }, () => Math.random()));
    expect(result.meanScore).toBeGreaterThanOrEqual(0);
    expect(result.variance).toBeGreaterThanOrEqual(0);
    expect(result.individualScores.length).toBe(3);
  });

  it('should predict batch', () => {
    const ens = new EnsembleDefense(3, 768);
    const batch = Array.from({ length: 4 }, () => Array.from({ length: 768 }, () => Math.random()));
    const scores = ens.predictBatch(batch);
    expect(scores.length).toBe(4);
  });

  it('should update weights', () => {
    const ens = new EnsembleDefense(3, 768);
    ens.updateWeights([0.9, 0.8, 0.7]);
    expect(ens.getModelCount()).toBe(3);
  });

  it('should add model', () => {
    const ens = new EnsembleDefense(2, 768);
    ens.addModel();
    expect(ens.getModelCount()).toBe(3);
  });

  it('should remove model', () => {
    const ens = new EnsembleDefense(3, 768);
    ens.removeModel(0);
    expect(ens.getModelCount()).toBe(2);
  });

  it('should get confidence', () => {
    const ens = new EnsembleDefense(3, 768);
    const conf = ens.getConfidence();
    expect(conf).toBeGreaterThanOrEqual(0);
    expect(conf).toBeLessThanOrEqual(1);
  });
});

describe('EvolutionaryGAN', () => {
  it('should create population', () => {
    const evo = new EvolutionaryGAN(5, 128, 768);
    expect(evo.getPopulationSize()).toBe(5);
  });

  it('should evaluate fitness', () => {
    const evo = new EvolutionaryGAN(3, 128, 768);
    const gen = new GeneratorNetwork(128, 768);
    const fitness = evo.evaluateFitness(gen, () => Math.random());
    expect(fitness).toBeGreaterThanOrEqual(0);
  });

  it('should get best generator', () => {
    const evo = new EvolutionaryGAN(3, 128, 768);
    const best = evo.getBestGenerator(() => Math.random());
    expect(best).toBeDefined();
  });

  it('should get diversity metric', () => {
    const evo = new EvolutionaryGAN(5, 128, 768);
    const div = evo.getDiversityMetric();
    expect(div).toBeGreaterThanOrEqual(0);
  });

  it('should get fitness history', () => {
    const evo = new EvolutionaryGAN(3, 128, 768);
    expect(evo.getFitnessHistory()).toEqual([]);
  });
});

describe('ConditionalGANGenerator', () => {
  it('should generate conditional attacks', () => {
    const cgan = new ConditionalGANGenerator(128, 768, 8);
    const attacks = cgan.generateAttacks(5, 1);
    expect(attacks.length).toBe(5);
    expect(attacks[0].length).toBe(768);
  });

  it('should perform targeted attack', () => {
    const cgan = new ConditionalGANGenerator(128, 768, 8);
    const attacks = cgan.targetedAttack(2, 3);
    expect(attacks.length).toBe(3);
  });

  it('should train step', () => {
    const cgan = new ConditionalGANGenerator(128, 768, 8);
    const real = Array.from({ length: 4 }, () => Array.from({ length: 768 }, () => Math.random()));
    const result = cgan.trainStep(real, [1, 1, 2, 2]);
    expect(typeof result.dLoss).toBe('number');
    expect(typeof result.gLoss).toBe('number');
  });

  it('should get generator', () => {
    const cgan = new ConditionalGANGenerator(128, 768, 8);
    const gen = cgan.getGenerator();
    expect(gen.layerSizes.embedDim).toBe(768);
  });
});

describe('StyleGANAttackMixer', () => {
  it('should interpolate two attack types', () => {
    const mixer = new StyleGANAttackMixer(768, 256, 7);
    const result = mixer.interpolateAttacks(0, 1, 0.5);
    expect(result.length).toBe(768);
  });

  it('should perform style mixing', () => {
    const mixer = new StyleGANAttackMixer(768, 256, 7);
    const results = mixer.styleMixing(0, [1, 2], 3);
    expect(results.length).toBe(3);
  });

  it('should apply truncation trick', () => {
    const mixer = new StyleGANAttackMixer(768, 256, 7);
    const result = mixer.truncationTrick(0, 0.7);
    expect(result.length).toBe(768);
  });

  it('should generate attack family', () => {
    const mixer = new StyleGANAttackMixer(768, 256, 7);
    const family = mixer.generateAttackFamily(0, 3, 0.3);
    expect(family.length).toBe(3);
  });
});

describe('GANRLHybrid', () => {
  it('should generate attack sequence', () => {
    const hybrid = new GANRLHybrid(100, 768, 10);
    const tokens = hybrid.generateAttackSequence();
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.length).toBeLessThanOrEqual(10);
  });

  it('should compute reward', () => {
    const hybrid = new GANRLHybrid();
    const reward = hybrid.computeReward([1, 2, 3], { evaluate: async () => ({ allowed: false, matchedPatterns: ['x'], riskScore: 0.5 }) });
    expect(typeof reward).toBe('number');
  });

  it('should train step', () => {
    const hybrid = new GANRLHybrid(100, 768, 10);
    const initial = Array.from({ length: 768 }, () => 0);
    const result = hybrid.trainStep(initial, 3);
    expect(typeof result.policyLoss).toBe('number');
    expect(typeof result.avgReward).toBe('number');
  });
});

describe('GANPayloadDecoder', () => {
  it('should decode embedding to scenario', async () => {
    const decoder = new GANPayloadDecoder(mockPolicyEngine);
    const embedding = Array.from({ length: 768 }, () => Math.random() * 2 - 1);
    const scenario = await decoder.decode(embedding);
    expect(scenario.payload).toBeDefined();
    expect(scenario.bypassed).toBeDefined();
    expect(scenario.severity).toBeGreaterThanOrEqual(0);
  });

  it('should classify attack types', async () => {
    const decoder = new GANPayloadDecoder(mockPolicyEngine);
    const embedding = Array.from({ length: 768 }, () => Math.random() * 2 - 1);
    const scenario = await decoder.decode(embedding);
    expect(['injection', 'shell', 'path_traversal', 'xss', 'prompt_injection', 'policy_bypass', 'unknown']).toContain(scenario.attackType);
  });

  it('should decode batch', async () => {
    const decoder = new GANPayloadDecoder(mockPolicyEngine);
    const embeddings = Array.from({ length: 3 }, () => Array.from({ length: 768 }, () => Math.random()));
    const scenarios = await decoder.decodeBatch(embeddings);
    expect(scenarios.length).toBe(3);
  });

  it('should calculate severity', () => {
    const decoder = new GANPayloadDecoder(mockPolicyEngine);
    expect(decoder.calculateSeverity({ allowed: true, matchedPatterns: [], riskScore: 0 })).toBe(1.0);
    expect(decoder.calculateSeverity({ allowed: false, matchedPatterns: [], riskScore: 0.9 })).toBe(0.8);
  });
});

describe('GANAttackGenerator', () => {
  it('should create with default config', () => {
    const gan = new GANAttackGenerator(DEFAULT_GAN_CONFIG, mockPolicyEngine);
    expect(gan.generator).toBeDefined();
    expect(gan.ensemble).toBeDefined();
    expect(gan.evolutionary).toBeDefined();
    expect(gan.conditional).toBeDefined();
    expect(gan.styleMixer).toBeDefined();
    expect(gan.rlHybrid).toBeDefined();
  });

  it('should generate attack embeddings', () => {
    const gan = new GANAttackGenerator(DEFAULT_GAN_CONFIG, mockPolicyEngine);
    const embeddings = gan.generateAttackEmbeddings(5);
    expect(embeddings.length).toBe(5);
    expect(embeddings[0].length).toBe(768);
  });

  it('should generate conditioned attacks', () => {
    const gan = new GANAttackGenerator(DEFAULT_GAN_CONFIG, mockPolicyEngine);
    const embeddings = gan.generateAttackEmbeddings(3, 1);
    expect(embeddings.length).toBe(3);
  });

  it('should compute metrics from log', () => {
    const gan = new GANAttackGenerator(DEFAULT_GAN_CONFIG, mockPolicyEngine);
    const log = [
      { bypassed: true, attackType: 'injection', severity: 0.8 },
      { bypassed: false, attackType: 'shell', severity: 0.4 },
      { bypassed: true, attackType: 'xss', severity: 0.9 },
    ];
    const metrics = gan.getMetrics(log);
    expect(metrics.totalAttacks).toBe(3);
    expect(metrics.attackSuccessRate).toBeCloseTo(2 / 3);
    expect(metrics.robustnessScore).toBeCloseTo(1 / 3);
  });

  it('should return empty metrics for empty log', () => {
    const gan = new GANAttackGenerator(DEFAULT_GAN_CONFIG, mockPolicyEngine);
    const metrics = gan.getMetrics([]);
    expect(metrics.totalAttacks).toBe(0);
    expect(metrics.attackSuccessRate).toBe(0);
  });
});
