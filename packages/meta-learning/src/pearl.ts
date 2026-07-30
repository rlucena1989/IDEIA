import { createLogger } from '@ideia/logger';
import {
  PEARLConfig, LatentContext, TaskPolicy, Transition, Trajectory,
} from './types';

const _log = createLogger('pearl');

export class LatentContextImpl implements LatentContext {
  readonly mean: Float32Array;
  readonly logVar: Float32Array;

  constructor(mean: Float32Array, logVar: Float32Array) {
    this.mean = mean;
    this.logVar = logVar;
  }

  sample(): Float32Array {
    const z = new Float32Array(this.mean.length);
    for (let i = 0; i < this.mean.length; i++) {
      const std = Math.exp(this.logVar[i] * 0.5);
      z[i] = this.mean[i] + std * this._randn();
    }
    return z;
  }

  private _randn(): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}

export class PEARL {
  private _encoderWeights: Float32Array[];
  private _encoderBiases: Float32Array[];
  private _actorWeights: Float32Array[];
  private _actorBiases: Float32Array[];
  private _criticWeights: Float32Array[];
  private _criticBiases: Float32Array[];
  private readonly _config: PEARLConfig;

  constructor(config?: Partial<PEARLConfig>) {
    this._config = {
      stateDim: 140,
      actionDim: 6,
      latentDim: 16,
      hiddenDim: 64,
      contextEncoderHidden: [128, 64],
      actorHidden: [64, 32],
      criticHidden: [64, 32],
      lrActor: 0.001,
      lrCritic: 0.001,
      lrEncoder: 0.001,
      gamma: 0.99,
      tau: 0.005,
      batchSize: 64,
      replaySize: 100000,
      ...config,
    };

    this._encoderWeights = [];
    this._encoderBiases = [];
    this._actorWeights = [];
    this._actorBiases = [];
    this._criticWeights = [];
    this._criticBiases = [];

    this._initNetwork(this._config.stateDim + this._config.actionDim, this._config.contextEncoderHidden, this._config.latentDim * 2, this._encoderWeights, this._encoderBiases);
    this._initNetwork(this._config.stateDim + this._config.latentDim, this._config.actorHidden, this._config.actionDim, this._actorWeights, this._actorBiases);
    this._initNetwork(this._config.stateDim + this._config.actionDim + this._config.latentDim, this._config.criticHidden, 1, this._criticWeights, this._criticBiases);
  }

  inferContext(trajectories: Trajectory[]): LatentContext {
    if (trajectories.length === 0) {
      const mean = new Float32Array(this._config.latentDim);
      const logVar = new Float32Array(this._config.latentDim);
      return new LatentContextImpl(mean, logVar);
    }

    let sumEncoding: Float32Array = new Float32Array(this._config.latentDim * 2);
    let count = 0;

    for (const traj of trajectories) {
      for (let t = 0; t < traj.states.length; t++) {
        const contextVec = this._concatContext(traj.states[t], traj.actions[t], traj.rewards[t]);
        const encoding = this._forwardNetwork(contextVec, this._encoderWeights, this._encoderBiases, true);
        for (let i = 0; i < encoding.length; i++) {
          sumEncoding[i] += encoding[i];
        }
        count++;
      }
    }

    if (count > 0) {
      for (let i = 0; i < sumEncoding.length; i++) {
        sumEncoding[i] /= count;
      }
    }

    const latentDim = this._config.latentDim;
    const mean = new Float32Array(sumEncoding.slice(0, latentDim));
    const logVar = new Float32Array(sumEncoding.slice(latentDim, latentDim * 2));

    for (let i = 0; i < logVar.length; i++) {
      logVar[i] = Math.max(-10, Math.min(10, logVar[i]));
    }

    return new LatentContextImpl(mean, logVar);
  }

  act(state: Float32Array, z: LatentContext): number {
    const zSample = z.sample();
    const input = new Float32Array(state.length + zSample.length);
    input.set(state, 0);
    input.set(zSample, state.length);

    const logits = this._forwardNetwork(input, this._actorWeights, this._actorBiases, false);
    const probs = this._softmax(logits);

    let r = Math.random();
    for (let i = 0; i < probs.length; i++) {
      r -= probs[i];
      if (r <= 0) return i;
    }
    return probs.length - 1;
  }

  update(replay: Transition[]): { actorLoss: number; criticLoss: number; encoderLoss: number } {
    if (replay.length < this._config.batchSize) {
      return { actorLoss: 0, criticLoss: 0, encoderLoss: 0 };
    }

    const batch = this._sampleBatch(replay, this._config.batchSize);
    let actorLoss = 0;
    let criticLoss = 0;
    let encoderLoss = 0;

    for (const transition of batch) {
      const contextInput = this._concatContext(transition.state, transition.action, transition.reward);
      const encoding = this._forwardNetwork(contextInput, this._encoderWeights, this._encoderBiases, true);
      const latentDim = this._config.latentDim;
      const mean = encoding.slice(0, latentDim);
      const logVar = encoding.slice(latentDim, latentDim * 2);

      const std = logVar.map(v => Math.exp(v * 0.5));
      let klLoss = 0;
      for (let i = 0; i < latentDim; i++) {
        klLoss += mean[i] * mean[i] + std[i] * std[i] - 1 - logVar[i];
      }
      klLoss *= 0.5;
      encoderLoss += klLoss;

      const zSample = new Float32Array(latentDim);
      for (let i = 0; i < latentDim; i++) {
        zSample[i] = mean[i] + std[i] * this._randn();
      }

      const stateZ = new Float32Array(transition.state.length + zSample.length);
      stateZ.set(transition.state, 0);
      stateZ.set(zSample, transition.state.length);

      const actionLogits = this._forwardNetwork(stateZ, this._actorWeights, this._actorBiases, false);
      const actionProb = Math.max(this._softmax(actionLogits)[transition.action], 1e-8);
      actorLoss += -Math.log(actionProb);

      const criticInput = new Float32Array(transition.state.length + 1 + zSample.length);
      criticInput.set(transition.state, 0);
      criticInput[transition.state.length] = transition.action / (this._config.actionDim - 1);
      criticInput.set(zSample, transition.state.length + 1);

      const qValue = this._forwardNetwork(criticInput, this._criticWeights, this._criticBiases, false)[0];

      const nextStateZ = new Float32Array(transition.nextState.length + zSample.length);
      nextStateZ.set(transition.nextState, 0);
      nextStateZ.set(zSample, transition.nextState.length);

      const nextActionLogits = this._forwardNetwork(nextStateZ, this._actorWeights, this._actorBiases, false);
      const nextAction = Array.from(this._softmax(nextActionLogits)).indexOf(Math.max(...nextActionLogits));

      const nextCriticInput = new Float32Array(transition.nextState.length + 1 + zSample.length);
      nextCriticInput.set(transition.nextState, 0);
      nextCriticInput[transition.nextState.length] = nextAction / (this._config.actionDim - 1);
      nextCriticInput.set(zSample, transition.nextState.length + 1);

      const nextQ = this._forwardNetwork(nextCriticInput, this._criticWeights, this._criticBiases, false)[0];
      const targetQ = transition.reward + (transition.done ? 0 : this._config.gamma * nextQ);
      const tdError = qValue - targetQ;
      criticLoss += tdError * tdError;

      this._applyGradients(this._actorWeights, this._actorBiases, actorLoss, this._config.lrActor);
      this._applyGradients(this._criticWeights, this._criticBiases, criticLoss, this._config.lrCritic);
      this._applyGradients(this._encoderWeights, this._encoderBiases, encoderLoss, this._config.lrEncoder);
    }

    const n = batch.length;
    return {
      actorLoss: n > 0 ? actorLoss / n : 0,
      criticLoss: n > 0 ? criticLoss / n : 0,
      encoderLoss: n > 0 ? encoderLoss / n : 0,
    };
  }

  getPolicy(device?: string): TaskPolicy {
    return {
      parameters: [...this._actorWeights, ...this._actorBiases],
      forward: (state: Float32Array) => {
        const z = this.inferContext([]);
        const zSample = z.sample();
        const input = new Float32Array(state.length + zSample.length);
        input.set(state, 0);
        input.set(zSample, state.length);
        const logits = this._forwardNetwork(input, this._actorWeights, this._actorBiases, false);
        return this._softmax(logits);
      },
    };
  }

  private _initNetwork(
    inputDim: number,
    hidden: number[],
    outputDim: number,
    weights: Float32Array[],
    biases: Float32Array[],
  ): void {
    const dims = [inputDim, ...hidden, outputDim];
    for (let i = 0; i < dims.length - 1; i++) {
      const scale = Math.sqrt(2.0 / dims[i]);
      const w = new Float32Array(dims[i] * dims[i + 1]);
      for (let j = 0; j < w.length; j++) {
        w[j] = (Math.random() * 2 - 1) * scale;
      }
      weights.push(w);
      biases.push(new Float32Array(dims[i + 1]));
    }
  }

  private _forwardNetwork(
    input: Float32Array,
    weights: Float32Array[],
    biases: Float32Array[],
    useReLU: boolean,
  ): Float32Array {
    let current = input;
    for (let layer = 0; layer < weights.length; layer++) {
      const w = weights[layer];
      const b = biases[layer];
      const rows = current.length;
      const cols = b.length;
      const output = new Float32Array(cols);
      for (let j = 0; j < cols; j++) {
        let sum = b[j];
        for (let i = 0; i < rows; i++) {
          sum += current[i] * w[i * cols + j];
        }
        output[j] = (layer < weights.length - 1 && useReLU) ? Math.max(0, sum) : sum;
      }
      current = output;
    }
    return current;
  }

  private _softmax(logits: Float32Array): Float32Array {
    const max = Math.max(...logits);
    const exps = logits.map(v => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return new Float32Array(exps.map(v => v / sum));
  }

  private _concatContext(state: Float32Array, action: number, reward: number): Float32Array {
    const result = new Float32Array(state.length + 2);
    result.set(state, 0);
    result[state.length] = action;
    result[state.length + 1] = reward;
    return result;
  }

  private _sampleBatch(replay: Transition[], batchSize: number): Transition[] {
    const shuffled = [...replay].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, batchSize);
  }

  private _applyGradients(weights: Float32Array[], _biases: Float32Array[], loss: number, lr: number): void {
    const scale = -lr * loss;
    for (let layer = 0; layer < weights.length; layer++) {
      const w = weights[layer];
      for (let i = 0; i < w.length; i++) {
        w[i] += scale * (Math.random() - 0.5) * 0.01;
      }
    }
  }

  private _randn(): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}
