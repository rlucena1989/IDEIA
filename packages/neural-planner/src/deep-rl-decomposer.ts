import { Experience, Goal, PPOConfig, PlanExecution, PlanningAction, PlanningContext } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('deep-rl-decomposer');

class PolicyNetwork {
  private _stateDim: number;
  private _actionDim: number;
  private _weights: number[][] = [];
  private _bias: number[][] = [];

  constructor(stateDim: number, actionDim: number, hiddenLayers: number[]) {
    this._stateDim = stateDim;
    this._actionDim = actionDim;
    const dims = [stateDim, ...hiddenLayers, actionDim * 2];
    for (let i = 0; i < dims.length - 1; i++) {
      const fanIn = dims[i];
      const fanOut = dims[i + 1];
      const scale = Math.sqrt(2 / fanIn);
      const w: number[] = [];
      const b: number[] = [];
      for (let j = 0; j < fanIn * fanOut; j++) w.push((Math.random() * 2 - 1) * scale);
      for (let j = 0; j < fanOut; j++) b.push(0);
      this._weights.push(w);
      this._bias.push(b);
    }
  }

  forward(input: number[]): { mean: number[]; logStd: number[] } {
    let x = [...input];
    for (let i = 0; i < this._weights.length - 1; i++) {
      x = this._linear(x, this._weights[i], this._bias[i]);
      x = x.map(v => Math.tanh(v));
    }
    const output = this._linear(x, this._weights[this._weights.length - 1], this._bias[this._weights.length - 1]);
    const mid = output.length / 2;
    return { mean: output.slice(0, mid), logStd: output.slice(mid).map(v => Math.max(-5, Math.min(2, v))) };
  }

  private _linear(input: number[], weights: number[], bias: number[]): number[] {
    const rows = bias.length;
    const cols = weights.length / rows;
    const output: number[] = new Array(rows);
    for (let j = 0; j < rows; j++) {
      let sum = bias[j];
      for (let i = 0; i < cols; i++) sum += input[i] * weights[i * rows + j];
      output[j] = sum;
    }
    return output;
  }

  getAction(state: number[]): PlanningAction {
    const { mean, logStd } = this.forward(state);
    const std = logStd.map(v => Math.exp(v));
    const sampled = mean.map((m, i) => m + std[i] * this._boxMuller());
    return {
      strategy: ['top-down', 'bottom-up', 'hybrid', 'example-based', 'agile', 'waterfall'][
        Math.min(Math.floor(Math.abs(sampled[0]) * 6), 5)
      ],
      granularity: (['coarse', 'medium', 'fine'] as const)[
        Math.min(Math.floor(Math.abs(sampled[1]) * 3), 2)
      ],
      temperature: Math.abs(sampled[2]) % 1 + 0.1,
    };
  }

  private _boxMuller(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}

class ValueNetwork {
  private _weights: number[][] = [];
  private _bias: number[][] = [];

  constructor(stateDim: number, hiddenLayers: number[]) {
    const dims = [stateDim, ...hiddenLayers, 1];
    for (let i = 0; i < dims.length - 1; i++) {
      const scale = Math.sqrt(2 / dims[i]);
      const w: number[] = [];
      const b: number[] = [];
      for (let j = 0; j < dims[i] * dims[i + 1]; j++) w.push((Math.random() * 2 - 1) * scale);
      for (let j = 0; j < dims[i + 1]; j++) b.push(0);
      this._weights.push(w);
      this._bias.push(b);
    }
  }

  forward(input: number[]): number {
    let x = [...input];
    for (let i = 0; i < this._weights.length - 1; i++) {
      x = this._linear(x, this._weights[i], this._bias[i]);
      x = x.map(v => Math.tanh(v));
    }
    const output = this._linear(x, this._weights[this._weights.length - 1], this._bias[this._weights.length - 1]);
    return output[0] ?? 0;
  }

  private _linear(input: number[], weights: number[], bias: number[]): number[] {
    const rows = bias.length;
    const cols = weights.length / rows;
    const output: number[] = new Array(rows);
    for (let j = 0; j < rows; j++) {
      let sum = bias[j];
      for (let i = 0; i < cols; i++) sum += input[i] * weights[i * rows + j];
      output[j] = sum;
    }
    return output;
  }
}

export class DeepRLDecomposer {
  private _policy: PolicyNetwork;
  private _valueNet: ValueNetwork;
  private _ppoConfig: PPOConfig;

  constructor() {
    this._policy = new PolicyNetwork(256, 12, [512, 256]);
    this._valueNet = new ValueNetwork(256, [256, 128]);
    this._ppoConfig = { clipEpsilon: 0.2, valueCoeff: 0.5, entropyCoeff: 0.01, epochs: 10, batchSize: 64, gamma: 0.99, lambda: 0.95 };
  }

  async selectStrategy(goal: Goal, _context: PlanningContext): Promise<PlanningAction> {
    const state = this._encodeState(goal);
    return this._policy.getAction(state);
  }

  async update(experiences: Experience[]): Promise<void> {
    const states = experiences.map(e => e.state);
    const actions = experiences.map(e => e.action);
    const rewards = experiences.map(e => e.reward);
    const dones = experiences.map(e => e.done);
    const advantages = this._computeAdvantage(states, rewards, dones);
    const returnsList = advantages.map((adv, i) => adv + this._valueNet.forward(states[i]));
    for (let epoch = 0; epoch < this._ppoConfig.epochs; epoch++) {
      for (let i = 0; i < states.length; i += this._ppoConfig.batchSize) {
        const batchAdv = advantages.slice(i, i + this._ppoConfig.batchSize);
        const batchRet = returnsList.slice(i, i + this._ppoConfig.batchSize);
      }
    }
  }

  private _computeAdvantage(states: number[][], rewards: number[], dones: boolean[]): number[] {
    const values = states.map(s => this._valueNet.forward(s));
    const advantages: number[] = [];
    let gae = 0;
    for (let t = rewards.length - 1; t >= 0; t--) {
      const delta = rewards[t] + this._ppoConfig.gamma * (dones[t] ? 0 : values[t + 1] ?? 0) - values[t];
      gae = delta + this._ppoConfig.gamma * this._ppoConfig.lambda * (dones[t] ? 0 : gae);
      advantages[t] = gae;
    }
    return advantages;
  }

  private _encodeState(goal: Goal): number[] {
    const embedding = new Array(256).fill(0);
    for (let i = 0; i < Math.min(goal.description.length, 256); i++) {
      embedding[i] = goal.description.charCodeAt(i) / 255;
    }
    embedding[128] = goal.complexity;
    return embedding;
  }
}
