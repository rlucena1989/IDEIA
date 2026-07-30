import { GeneratorWeights } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('generator-network');

export class GeneratorNetwork {
  private _weights: GeneratorWeights;

  constructor(
    private _noiseDim = 128,
    private _embedDim = 768,
    private _conditionDim = 32
  ) {
    this._weights = {
      layer1: Array.from({ length: _noiseDim + _conditionDim }, () => Math.random() * 0.1),
      layer2: Array.from({ length: 512 }, () => Math.random() * 0.1),
      layer3: Array.from({ length: 1024 }, () => Math.random() * 0.1),
    };
  }

  forward(noise: number[], condition?: number[]): number[] {
    const z = condition ? [...noise, ...condition] : noise;
    const l1 = this._applyLayer(z, this._weights.layer1, 512);
    const l2 = this._applyLayer(l1, this._weights.layer2, 1024);
    const l3 = this._applyLayer(l2, this._weights.layer3, this._embedDim);
    return l3.map((v: number) => Math.tanh(v));
  }

  generateBatch(nSamples: number, condition?: number[]): number[][] {
    const results: number[][] = [];
    for (let i = 0; i < nSamples; i++) {
      const noise = Array.from({ length: this._noiseDim }, () => Math.random() * 2 - 1);
      results.push(this.forward(noise, condition));
    }
    return results;
  }

  getWeights(): GeneratorWeights {
    return { layer1: [...this._weights.layer1], layer2: [...this._weights.layer2], layer3: [...this._weights.layer3] };
  }

  setWeights(weights: GeneratorWeights): void {
    this._weights = { layer1: [...weights.layer1], layer2: [...weights.layer2], layer3: [...weights.layer3] };
  }

  mutate(mutationRate = 0.01, mutationStrength = 0.1): void {
    for (const key of Object.keys(this._weights) as (keyof GeneratorWeights)[]) {
      this._weights[key] = this._weights[key].map(w =>
        Math.random() < mutationRate ? w + (Math.random() - 0.5) * mutationStrength : w
      );
    }
  }

  crossover(other: GeneratorNetwork): GeneratorNetwork {
    const child = new GeneratorNetwork(this._noiseDim, this._embedDim, this._conditionDim);
    const childWeights: GeneratorWeights = { layer1: [], layer2: [], layer3: [] };
    for (const key of Object.keys(this._weights) as (keyof GeneratorWeights)[]) {
      childWeights[key] = this._weights[key].map((w, i) =>
        Math.random() > 0.5 ? w : other._weights[key][i] ?? w
      );
    }
    child.setWeights(childWeights);
    return child;
  }

  copy(): GeneratorNetwork {
    const g = new GeneratorNetwork(this._noiseDim, this._embedDim, this._conditionDim);
    g.setWeights(this.getWeights());
    return g;
  }

  get layerSizes(): { noiseDim: number; embedDim: number; conditionDim: number } {
    return { noiseDim: this._noiseDim, embedDim: this._embedDim, conditionDim: this._conditionDim };
  }

  private _applyLayer(input: number[], weights: number[], outputDim: number): number[] {
    const output: number[] = [];
    for (let i = 0; i < outputDim; i++) {
      let sum = 0;
      for (let j = 0; j < input.length; j++) {
        sum += input[j] * (weights[(i * input.length + j) % weights.length] ?? 0);
      }
      output.push(Math.max(0, sum));
    }
    return output;
  }
}
