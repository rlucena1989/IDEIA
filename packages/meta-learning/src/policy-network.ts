import { DecompositionStrategy } from './types';

const _STRATEGIES: DecompositionStrategy[] = ['top-down', 'bottom-up', 'hybrid', 'example-based', 'agile', 'waterfall'];
const _STRATEGY_MAP: Record<DecompositionStrategy, number> = { 'top-down': 0, 'bottom-up': 1, 'hybrid': 2, 'example-based': 3, 'agile': 4, 'waterfall': 5 };

export class PolicyNetwork {
  private _weights: Float32Array[];
  private _biases: Float32Array[];
  private readonly _layerSizes: number[];

  constructor(layerSizes: number[]) {
    this._layerSizes = layerSizes;
    this._weights = [];
    this._biases = [];
    for (let i = 0; i < layerSizes.length - 1; i++) {
      const rows = layerSizes[i];
      const cols = layerSizes[i + 1];
      if (rows === undefined || cols === undefined) throw new Error(`Invalid layer sizes at index ${i}: missing dimension`);
      this._weights.push(new Float32Array(rows * cols));
      this._biases.push(new Float32Array(cols));
    }
  }

  forward(input: Float32Array): Float32Array {
    let current = input;
    for (let layer = 0; layer < this._weights.length; layer++) {
      const w = this._weights[layer];
      const b = this._biases[layer];
      if (!w || !b) throw new Error(`Missing weights or biases at layer ${layer}`);
      const cols = this._layerSizes[layer + 1];
      if (cols === undefined) throw new Error(`Missing layer size at index ${layer + 1}`);
      const output = new Float32Array(cols);
      for (let j = 0; j < cols; j++) {
        let sum = b[j] || 0;
        for (let i = 0; i < current.length; i++) sum += (current[i] || 0) * (w[j * current.length + i] || 0);
        output[j] = layer < this._weights.length - 1 ? Math.max(0, sum) : sum;
      }
      current = output;
    }
    return current;
  }

  getWeights(): { weights: Float32Array[]; biases: Float32Array[] } {
    return { weights: this._weights.map(w => new Float32Array(w)), biases: this._biases.map(b => new Float32Array(b)) };
  }

  setWeights(weights: Float32Array[], biases: Float32Array[]): void {
    this._weights = weights.map(w => new Float32Array(w));
    this._biases = biases.map(b => new Float32Array(b));
  }

  getParamCount(): number {
    let count = 0;
    for (const w of this._weights) count += w.length;
    for (const b of this._biases) count += b.length;
    return count;
  }

  getDecompositionStrategy(state: Float32Array): DecompositionStrategy {
    const output = this.forward(state);
    let maxIdx = 0;
    for (let i = 1; i < output.length; i++) if (output[i] > output[maxIdx]) maxIdx = i;
    return _STRATEGIES[maxIdx] || 'top-down';
  }

  clone(): PolicyNetwork {
    const clone = new PolicyNetwork(this._layerSizes);
    clone.setWeights(this._weights, this._biases);
    return clone;
  }
}
