import { GeneratorNetwork } from './generator-network';
import { createLogger } from '@ideia/logger';
import { DiscriminatorNetwork } from './discriminator-network';
import { WassersteinLoss } from './wasserstein-loss';
import { EnsembleDefense } from './ensemble-defense';
import { EvolutionaryGAN } from './evolutionary-gan';
import { ConditionalGANGenerator } from './conditional-gan-generator';
import { StyleGANAttackMixer } from './stylegan-attack-mixer';
import { GANRLHybrid } from './gan-rl-hybrid';
import { GANPayloadDecoder } from './gan-payload-decoder';
import { AttackMetrics, GANSystemConfig, DEFAULT_GAN_CONFIG } from './types';
const logger = createLogger('gan-attack-generator');

export class GANAttackGenerator {
  public generator: GeneratorNetwork;
  public discriminator: DiscriminatorNetwork;
  public ensemble: EnsembleDefense;
  public evolutionary: EvolutionaryGAN;
  public conditional: ConditionalGANGenerator;
  public styleMixer: StyleGANAttackMixer;
  public rlHybrid: GANRLHybrid;
  public decoder: GANPayloadDecoder;

  constructor(
    config: GANSystemConfig = DEFAULT_GAN_CONFIG,
    policyEngine: { evaluate: (input: { action: string; context: Record<string, unknown> }) => Promise<{ allowed: boolean; matchedPatterns: string[]; riskScore: number }>; addPattern: (pattern: { pattern: string; type: string; severity: number }) => Promise<void>; hasCoverage: (type: string) => boolean }
  ) {
    this.generator = new GeneratorNetwork(config.wgan.noiseDim, config.wgan.embedDim, config.wgan.conditionDim);
    this.discriminator = new DiscriminatorNetwork(config.wgan.embedDim);
    this.ensemble = new EnsembleDefense(config.ensemble.nModels, config.wgan.embedDim);
    this.evolutionary = new EvolutionaryGAN(
      config.evolutionary.populationSize,
      config.wgan.noiseDim,
      config.wgan.embedDim,
      config.wgan.conditionDim
    );
    this.conditional = new ConditionalGANGenerator(config.wgan.noiseDim, config.wgan.embedDim, 8);
    this.styleMixer = new StyleGANAttackMixer(config.wgan.embedDim, 256, 7);
    this.rlHybrid = new GANRLHybrid(32000, config.wgan.embedDim, 50);
    this.decoder = new GANPayloadDecoder(policyEngine);
  }

  generateAttackEmbeddings(nSamples = 64, attackType?: number): number[][] {
    if (attackType !== undefined) {
      return this.conditional.generateAttacks(nSamples, attackType);
    }
    const noise = Array.from({ length: nSamples }, () =>
      Array.from({ length: 128 }, () => Math.random() * 2 - 1)
    );
    return noise.map(n => this.generator.forward(n));
  }

  getMetrics(attackLog: Array<{ bypassed: boolean; attackType: string; severity: number }>): AttackMetrics {
    const total = attackLog.length;
    if (total === 0) {
      return { totalAttacks: 0, attackSuccessRate: 0, diversityScore: 0, coverageByType: {}, avgSeverity: 0, robustnessScore: 0 };
    }

    const bypassed = attackLog.filter(e => e.bypassed).length;
    const types = new Map<string, number>();
    let totalSeverity = 0;

    for (const entry of attackLog) {
      types.set(entry.attackType, (types.get(entry.attackType) ?? 0) + 1);
      totalSeverity += entry.severity;
    }

    const coverageByType: Record<string, number> = {};
    types.forEach((count, type) => {
      coverageByType[type] = count / total;
    });

    return {
      totalAttacks: total,
      attackSuccessRate: bypassed / total,
      diversityScore: types.size / 7,
      coverageByType,
      avgSeverity: totalSeverity / total,
      robustnessScore: 1 - bypassed / total,
    };
  }
}
