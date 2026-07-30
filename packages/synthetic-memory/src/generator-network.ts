import { GeneratorNetworkConfig } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('generator-network');

function _randn(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export class GeneratorNetwork {
  private _weights: Float64Array[];
  private _biases: Float64Array[];
  private _gradients: { w: Float64Array[]; b: Float64Array[] };
  private _config: GeneratorNetworkConfig;
  private _lastInput: Float64Array[] | null;
  private _lastActivations: Float64Array[][] | null;

  constructor(config: GeneratorNetworkConfig) {
    this._config = config;
    this._lastInput = null;
    this._lastActivations = null;

    const hiddenDim = config.hiddenDim;
    this._weights = [
      new Float64Array(config.inputDim * hiddenDim),
      new Float64Array(hiddenDim * hiddenDim),
      new Float64Array(hiddenDim * config.outputDim),
    ];
    this._biases = [
      new Float64Array(hiddenDim),
      new Float64Array(hiddenDim),
      new Float64Array(config.outputDim),
    ];
    this._gradients = {
      w: this._weights.map(w => new Float64Array(w.length)),
      b: this._biases.map(b => new Float64Array(b.length)),
    };
    this._initialize();
  }

  get config(): GeneratorNetworkConfig {
    return { ...this._config };
  }

  forward(noise: Float64Array[]): Float64Array[] {
    this._lastInput = noise;
    const activations: Float64Array[][] = [];

    const result = noise.map(n => {
      let h = n;
      const layerActivations: Float64Array[] = [h];

      for (let layer = 0; layer < this._weights.length; layer++) {
        h = this._linear(h, this._weights[layer], this._biases[layer]);
        if (layer < this._weights.length - 1) {
          const leakyH = new Float64Array(h.length);
          for (let i = 0; i < h.length; i++) {
            leakyH[i] = h[i] > 0 ? h[i] : 0.01 * h[i];
          }
          h = leakyH;
        }
        layerActivations.push(h);
      }

      activations.push(layerActivations);
      return h;
    });

    this._lastActivations = activations;
    return result;
  }

  backward(loss: number): void {
    for (let i = 0; i < this._gradients.w.length; i++) {
      for (let j = 0; j < this._gradients.w[i].length; j++) {
        this._gradients.w[i][j] += loss * (Math.random() - 0.5) * 0.01;
      }
    }
    for (let i = 0; i < this._gradients.b.length; i++) {
      for (let j = 0; j < this._gradients.b[i].length; j++) {
        this._gradients.b[i][j] += loss * (Math.random() - 0.5) * 0.01;
      }
    }
  }

  update(learningRate: number): void {
    for (let i = 0; i < this._weights.length; i++) {
      for (let j = 0; j < this._weights[i].length; j++) {
        this._weights[i][j] -= learningRate * this._gradients.w[i][j];
        this._gradients.w[i][j] = 0;
      }
      for (let j = 0; j < this._biases[i].length; j++) {
        this._biases[i][j] -= learningRate * this._gradients.b[i][j];
        this._gradients.b[i][j] = 0;
      }
    }
  }

  getWeights(): Float64Array[] {
    return this._weights.map(w => new Float64Array(w));
  }

  getBiases(): Float64Array[] {
    return this._biases.map(b => new Float64Array(b));
  }

  setWeights(weights: Float64Array[]): void {
    for (let i = 0; i < this._weights.length; i++) {
      for (let j = 0; j < this._weights[i].length; j++) {
        this._weights[i][j] = weights[i][j];
      }
    }
  }

  private _initialize(): void {
    for (let i = 0; i < this._weights.length; i++) {
      const scale = Math.sqrt(2 / (this._weights[i].length / this._biases[i].length));
      for (let j = 0; j < this._weights[i].length; j++) {
        this._weights[i][j] = (Math.random() - 0.5) * 2 * scale;
      }
    }
  }

  private _linear(input: Float64Array, weight: Float64Array, bias: Float64Array): Float64Array {
    const outDim = bias.length;
    const inDim = input.length;
    const output = new Float64Array(outDim);
    for (let o = 0; o < outDim; o++) {
      let sum = bias[o];
      for (let i = 0; i < inDim; i++) {
        sum += input[i] * weight[o * inDim + i];
      }
      output[o] = sum;
    }
    return output;
  }
}
