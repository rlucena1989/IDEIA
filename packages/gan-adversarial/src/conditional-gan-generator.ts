import { GeneratorNetwork } from './generator-network';
import { createLogger } from '@ideia/logger';
import { DiscriminatorNetwork } from './discriminator-network';
const logger = createLogger('conditional-gan-generator');

export class ConditionalGANGenerator {
  private _generator: GeneratorNetwork;
  private _discriminator: DiscriminatorNetwork;
  private _defenseTypeEmbeddings: Map<number, number[]>;

  constructor(
    private _noiseDim = 128,
    private _embedDim = 768,
    private _numDefenseTypes = 8
  ) {
    this._generator = new GeneratorNetwork(_noiseDim, _embedDim, 64);
    this._discriminator = new DiscriminatorNetwork(_embedDim);
    this._defenseTypeEmbeddings = new Map();
    for (let i = 0; i < _numDefenseTypes; i++) {
      this._defenseTypeEmbeddings.set(i, Array.from({ length: 64 }, () => Math.random() * 0.1));
    }
  }

  generateAttacks(nSamples: number, defenseType: number): number[][] {
    const condition = this._defenseTypeEmbeddings.get(defenseType) ?? Array.from({ length: 64 }, () => 0);
    const results: number[][] = [];
    for (let i = 0; i < nSamples; i++) {
      const noise = Array.from({ length: this._noiseDim }, () => Math.random() * 2 - 1);
      results.push(this._generator.forward(noise, condition));
    }
    return results;
  }

  targetedAttack(targetDefense: number, nSamples = 32): number[][] {
    return this.generateAttacks(nSamples, targetDefense);
  }

  trainStep(realEmbeddings: number[][], defenseTypes: number[], lambdaGp = 10): { dLoss: number; gLoss: number } {
    const batchSize = realEmbeddings.length;
    const fakeEmbeddings = this.generateAttacks(batchSize, defenseTypes[0] ?? 0);

    const dReal = realEmbeddings.map(e => this._discriminator.forward(e));
    const dFake = fakeEmbeddings.map(e => this._discriminator.forward(e));

    const dLoss = dFake.reduce((a, b) => a + b, 0) / dFake.length -
                  dReal.reduce((a, b) => a + b, 0) / dReal.length;

    const gLoss = -dFake.reduce((a, b) => a + b, 0) / dFake.length;

    return { dLoss, gLoss };
  }

  getGenerator(): GeneratorNetwork {
    return this._generator;
  }
}
