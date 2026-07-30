import { PlanningAction, PolicyOutput } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('policy-network');

class LinearLayer {
  private _weights: Float32Array;
  private _bias: Float32Array;

  constructor(inputDim: number, outputDim: number) {
    const scale = Math.sqrt(2.0 / inputDim);
    this._weights = new Float32Array(inputDim * outputDim);
    this._bias = new Float32Array(outputDim);
    for (let i = 0; i < this._weights.length; i++) {
      this._weights[i] = (Math.random() * 2 - 1) * scale;
    }
  }

  forward(input: Float32Array): Float32Array {
    const rows = this._bias.length;
    const cols = this._weights.length / rows;
    const output = new Float32Array(rows);
    for (let j = 0; j < rows; j++) {
      let sum = this._bias[j];
      for (let i = 0; i < cols; i++) {
        sum += input[i] * this._weights[i * rows + j];
      }
      output[j] = sum;
    }
    return output;
  }
}

export class PolicyNetwork {
  private readonly _layers: LinearLayer[];
  private readonly _actionDim = 3;

  constructor() {
    this._layers = [
      new LinearLayer(138, 256), new LinearLayer(256, 128),
      new LinearLayer(128, 64), new LinearLayer(64, this._actionDim * 2),
    ];
  }

  forward(state: Float32Array): PolicyOutput {
    let x = state;
    for (let i = 0; i < this._layers.length - 1; i++) {
      x = this._layers[i].forward(x);
      x = new Float32Array(x.map(v => Math.tanh(v)));
    }
    const output = this._layers[this._layers.length - 1].forward(x);
    const mean = output.slice(0, this._actionDim);
    const logStd = output.slice(this._actionDim);
    return { mean: new Float32Array(mean), logStd: new Float32Array(logStd) };
  }

  getAction(state: Float32Array): { action: number; logProb: number; value: number } {
    const { mean, logStd } = this.forward(state);
    const std = new Float32Array(logStd.map(v => Math.exp(Math.max(v, -5))));
    const sampled = new Float32Array(mean.length);
    for (let i = 0; i < mean.length; i++) {
      sampled[i] = mean[i] + std[i] * this._boxMuller();
    }
    const action = Math.floor(Math.abs(sampled[0]) * 6) % 6;
    const logProb = Math.log(Math.max(1e-10, 1 / 6));
    return { action, logProb, value: 0 };
  }

  decodeAction(action: number): PlanningAction {
    const strategies = ['top-down', 'bottom-up', 'hybrid', 'example-based', 'agile', 'waterfall'];
    return {
      strategy: strategies[action % 6] ?? 'hybrid',
      granularity: ['coarse', 'medium', 'fine'][action % 3] as 'coarse' | 'medium' | 'fine',
      temperature: 0.5 + (action % 10) * 0.05,
    };
  }

  evaluate(states: Float32Array[], actions: PlanningAction[]): { logProbs: number[]; entropy: number } {
    let totalLogProb = 0, totalEntropy = 0;
    for (let i = 0; i < states.length; i++) {
      const { mean, logStd } = this.forward(states[i]);
      const std = logStd.map(v => Math.exp(Math.max(v, -5)));
      const actionVec = this._actionToOneHot(actions[i]);
      const logProb = actionVec.reduce((sum, a, j) => sum + this._gaussianLogProb(a, mean[j] ?? 0, std[j] ?? 0), 0);
      totalLogProb += logProb;
      totalEntropy += std.reduce((sum, s) => sum + 0.5 * Math.log(2 * Math.PI * Math.E * s * s), 0);
    }
    return { logProbs: [totalLogProb / Math.max(states.length, 1)], entropy: totalEntropy / Math.max(states.length, 1) };
  }

  async computeOldLogProbs(states: Float32Array[], actions: PlanningAction[]): Promise<number[]> {
    const { logProbs } = this.evaluate(states, actions);
    return logProbs;
  }

  private _actionToOneHot(action: PlanningAction): number[] {
    const strategyMap: Record<string, number> = { 'top-down': 0, 'bottom-up': 1, 'hybrid': 2, 'example-based': 3, 'agile': 4, 'waterfall': 5 };
    const granularityMap: Record<string, number> = { coarse: 0, medium: 1, fine: 2 };
    return [(strategyMap[action.strategy] ?? 0) / 5, (granularityMap[action.granularity] ?? 0) / 2, action.temperature];
  }

  private _gaussianLogProb(x: number, mean: number, std: number): number {
    const variance = std * std;
    return -0.5 * Math.log(2 * Math.PI * variance) - ((x - mean) ** 2) / (2 * variance);
  }

  private _boxMuller(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}
