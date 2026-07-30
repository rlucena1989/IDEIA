import { ValueNetworkInput } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('value-network');

export class ValueNetwork {
  private _layers: number[][] = [];
  private readonly _hiddenSize = 256;
  private readonly _outputSize = 1;

  constructor() {
    this._layers = [
      new Array(this._hiddenSize).fill(0).map(() => Math.random() * 0.01),
      new Array(this._hiddenSize).fill(0).map(() => Math.random() * 0.01),
      new Array(this._outputSize).fill(0).map(() => Math.random() * 0.01),
    ];
  }

  forward(input: ValueNetworkInput): number {
    const thoughtEmb = input.thoughtEmbedding ?? [];
    const goalEmb = input.goalEmbedding ?? [];
    const combined = [
      ...thoughtEmb,
      ...goalEmb,
      input.depthNormalized ?? 0,
      input.branchPosition ?? 0,
      input.parentValue ?? 0,
    ];

    let hidden = this._relu(this._dotProduct(combined, this._layers[0]));
    hidden = this._relu(this._dotProductV2(hidden, this._layers[1]));
    const output = this._sigmoid(this._dotProductV2(hidden, this._layers[2]));

    return output;
  }

  train(batch: Array<{ input: ValueNetworkInput; target: number }>, learningRate: number = 0.001): void {
    for (const example of batch) {
      const pred = this.forward(example.input);
      const error = pred - example.target;
      for (let i = 0; i < this._layers.length; i++) {
        for (let j = 0; j < this._layers[i].length; j++) {
          this._layers[i][j] -= learningRate * error * (this._layers[i][j] || 0.01);
        }
      }
    }
  }

  private _relu(x: number): number {
    return Math.max(0, x);
  }

  private _sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private _dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, v, i) => sum + v * (b[i] || 0), 0);
  }

  private _dotProductV2(a: number, b: number[]): number {
    return a * b.reduce((s, v) => s + v, 0) / b.length;
  }

  static simpleEmbed(text: string): number[] {
    const vec = new Array(64).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      const hash = ValueNetwork._hashCode(word) % 64;
      vec[Math.abs(hash)] += 1;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / norm);
  }

  private static _hashCode(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
