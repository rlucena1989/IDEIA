import { createLogger } from '@ideia/logger';
import {
  MetaRLConfig, MetaPolicy, TaskPolicy, Episode, Reward,
  Trajectory,
} from './types';

const _log = createLogger('meta-rl');

export class MetaRL {
  private _metaPolicy: RNNPolicy;
  private readonly _config: MetaRLConfig;

  constructor(config?: Partial<MetaRLConfig>) {
    this._config = {
      inputDim: 140,
      hiddenDim: 128,
      actionDim: 6,
      hiddenUnits: 64,
      metaLR: 0.001,
      innerLR: 0.01,
      outerLR: 0.001,
      gamma: 0.99,
      clipEpsilon: 0.2,
      epochs: 3,
      ...config,
    };
    this._metaPolicy = new RNNPolicy(
      this._config.inputDim,
      this._config.hiddenDim,
      this._config.actionDim,
    );
  }

  metaTrain(tasks: Episode[][], episodes: number): MetaPolicy {
    _log.info(`[MetaRL] Starting meta-training for ${episodes} episodes across ${tasks.length} task groups`);

    for (let ep = 0; ep < episodes; ep++) {
      for (const taskEpisodes of tasks) {
        const adapted = this._adaptPolicy(this._metaPolicy, taskEpisodes.slice(0, Math.min(3, taskEpisodes.length)));
        const evalEpisodes = taskEpisodes.slice(Math.min(3, taskEpisodes.length));
        let totalReward = 0;
        for (const epData of evalEpisodes) {
          totalReward += this._evaluateEpisode(adapted, epData);
        }
        const avgReward = evalEpisodes.length > 0 ? totalReward / evalEpisodes.length : 0;
        this._metaUpdate(adapted, avgReward);
      }
    }

    _log.info(`[MetaRL] Meta-training complete`);
    return {
      parameters: this._metaPolicy.parameters,
      forward: (s: Float32Array) => this._metaPolicy.forward(s),
      clone: () => {
        const cloned = new RNNPolicy(this._config.inputDim, this._config.hiddenDim, this._config.actionDim);
        cloned.load(this._metaPolicy.save());
        return cloned as MetaPolicy;
      },
      save: () => this._metaPolicy.save(),
      load: (snap) => this._metaPolicy.load(snap),
    };
  }

  adapt(task: Episode[], episodes: number): TaskPolicy {
    const adaptedRNN = new RNNPolicy(this._config.inputDim, this._config.hiddenDim, this._config.actionDim);
    adaptedRNN.load(this._metaPolicy.save());
    const adapted = this._adaptPolicy(adaptedRNN, task.slice(0, Math.min(episodes, task.length)));

    return {
      parameters: adapted.parameters,
      forward: (s: Float32Array) => adapted.forward(s),
    };
  }

  evaluate(task: Episode[], policy: TaskPolicy): Reward {
    let totalReward = 0;
    const discounted: number[] = [];
    let discount = 1;
    for (const ep of task) {
      totalReward += ep.totalReward;
      discounted.push(ep.totalReward * discount);
      discount *= this._config.gamma;
    }
    const sumDiscounted = discounted.reduce((a, b) => a + b, 0);
    return { value: sumDiscounted, discount: this._config.gamma };
  }

  private _adaptPolicy(policy: RNNPolicy, episodes: Episode[]): RNNPolicy {
    const adapted = new RNNPolicy(this._config.inputDim, this._config.hiddenDim, this._config.actionDim);
    adapted.load(policy.save());

    for (let epoch = 0; epoch < this._config.epochs; epoch++) {
      for (const episode of episodes) {
        for (let t = 0; t < episode.states.length; t++) {
          const state = episode.states[t];
          const actionProbs = adapted.forward(state);
          const action = episode.actions[t];
          const prob = Math.max(actionProbs[action], 1e-8);
          const advantage = episode.rewards[t] - this._baseline(episode.rewards);
          const loss = -Math.log(prob) * advantage;
          adapted.backward(loss, this._config.innerLR);
        }
      }
    }
    return adapted;
  }

  private _evaluateEpisode(policy: RNNPolicy, episode: Episode): number {
    let totalReward = 0;
    for (let t = 0; t < episode.states.length; t++) {
      const state = episode.states[t];
      const probs = policy.forward(state);
      const greedyAction = Array.from(probs).indexOf(Math.max(...probs));
      if (greedyAction === episode.actions[t]) {
        totalReward += episode.rewards[t];
      }
    }
    return totalReward;
  }

  private _metaUpdate(adapted: RNNPolicy, reward: number): void {
    for (let layer = 0; layer < this._metaPolicy.parameters.length; layer++) {
      const metaW = this._metaPolicy.parameters[layer];
      const adaptedW = adapted.parameters[layer];
      for (let i = 0; i < metaW.length; i++) {
        metaW[i] += this._config.outerLR * reward * (adaptedW[i] - metaW[i]);
      }
    }
  }

  private _baseline(rewards: number[]): number {
    if (rewards.length === 0) return 0;
    return rewards.reduce((a, b) => a + b, 0) / rewards.length;
  }

  get metaPolicy(): RNNPolicy {
    return this._metaPolicy;
  }
}

export class RNNPolicy {
  private _weights: Float32Array[];
  private _biases: Float32Array[];
  private _hiddenWeights: Float32Array[];
  private _hiddenBiases: Float32Array[];
  private readonly _inputDim: number;
  private readonly _hiddenDim: number;
  private readonly _actionDim: number;

  constructor(inputDim: number, hiddenDim: number, actionDim: number) {
    this._inputDim = inputDim;
    this._hiddenDim = hiddenDim;
    this._actionDim = actionDim;

    this._weights = [];
    this._biases = [];
    this._hiddenWeights = [];
    this._hiddenBiases = [];

    const wInput = new Float32Array(inputDim * hiddenDim);
    const bInput = new Float32Array(hiddenDim);
    for (let i = 0; i < wInput.length; i++) {
      wInput[i] = (Math.random() - 0.5) * Math.sqrt(2.0 / inputDim);
    }
    this._weights.push(wInput);
    this._biases.push(bInput);

    const wHidden = new Float32Array(hiddenDim * hiddenDim);
    const bHidden = new Float32Array(hiddenDim);
    for (let i = 0; i < wHidden.length; i++) {
      wHidden[i] = (Math.random() - 0.5) * Math.sqrt(2.0 / hiddenDim);
    }
    this._hiddenWeights.push(wHidden);
    this._hiddenBiases.push(bHidden);

    const wOut = new Float32Array(hiddenDim * actionDim);
    const bOut = new Float32Array(actionDim);
    for (let i = 0; i < wOut.length; i++) {
      wOut[i] = (Math.random() - 0.5) * Math.sqrt(2.0 / hiddenDim);
    }
    this._weights.push(wOut);
    this._biases.push(bOut);
  }

  forward(input: Float32Array, hiddenState?: Float32Array): Float32Array {
    const hidden = hiddenState || new Float32Array(this._hiddenDim);

    const newHidden = new Float32Array(this._hiddenDim);
    for (let j = 0; j < this._hiddenDim; j++) {
      let sum = this._biases[0][j];
      for (let i = 0; i < this._inputDim; i++) {
        sum += input[i] * this._weights[0][i * this._hiddenDim + j];
      }
      for (let i = 0; i < this._hiddenDim; i++) {
        sum += hidden[i] * this._hiddenWeights[0][i * this._hiddenDim + j];
      }
      newHidden[j] = Math.max(0, sum);
    }

    const output = new Float32Array(this._actionDim);
    for (let j = 0; j < this._actionDim; j++) {
      let sum = this._biases[1][j];
      for (let i = 0; i < this._hiddenDim; i++) {
        sum += newHidden[i] * this._weights[1][i * this._actionDim + j];
      }
      output[j] = sum;
    }

    return this._softmax(output);
  }

  backward(loss: number, lr: number): void {
    const scale = -lr * loss;
    for (let layer = 0; layer < this._weights.length; layer++) {
      const w = this._weights[layer];
      for (let i = 0; i < w.length; i++) {
        w[i] += scale * (Math.random() - 0.5) * 0.01;
      }
    }
    for (let layer = 0; layer < this._hiddenWeights.length; layer++) {
      const w = this._hiddenWeights[layer];
      for (let i = 0; i < w.length; i++) {
        w[i] += scale * (Math.random() - 0.5) * 0.01;
      }
    }
  }

  clone(): RNNPolicy {
    const cloned = new RNNPolicy(this._inputDim, this._hiddenDim, this._actionDim);
    cloned.load(this.save());
    return cloned;
  }

  get parameters(): Float32Array[] {
    return [...this._weights, ...this._hiddenWeights];
  }

  save(): { weights: Float32Array[]; biases: Float32Array[] } {
    return {
      weights: this._weights.map(w => new Float32Array(w)),
      biases: this._biases.map(b => new Float32Array(b)),
    };
  }

  load(snapshot: { weights: Float32Array[]; biases: Float32Array[] }): void {
    for (let i = 0; i < this._weights.length && i < snapshot.weights.length; i++) {
      this._weights[i] = new Float32Array(snapshot.weights[i]);
      this._biases[i] = new Float32Array(snapshot.biases[i]);
    }
  }

  private _softmax(logits: Float32Array): Float32Array {
    const max = Math.max(...logits);
    const exps = logits.map(v => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return new Float32Array(exps.map(v => v / sum));
  }
}
