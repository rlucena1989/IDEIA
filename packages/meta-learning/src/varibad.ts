import { createLogger } from '@ideia/logger';
import {
  VariBADConfig, BeliefState, VAEParams, Trajectory,
} from './types';

const _log = createLogger('varibad');

export class BeliefStateImpl implements BeliefState {
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

  klDivergence(): number {
    let kl = 0;
    for (let i = 0; i < this.mean.length; i++) {
      kl += this.mean[i] * this.mean[i] + Math.exp(this.logVar[i]) - 1 - this.logVar[i];
    }
    return kl * 0.5;
  }

  private _randn(): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}

export class VariBAD {
  private _encoderWeights: Float32Array[];
  private _encoderBiases: Float32Array[];
  private _decoderWeights: Float32Array[];
  private _decoderBiases: Float32Array[];
  private _plannerWeights: Float32Array[];
  private _plannerBiases: Float32Array[];
  private _recurrentWeights: Float32Array[];
  private _recurrentBiases: Float32Array[];
  private readonly _config: VariBADConfig;

  constructor(config?: Partial<VariBADConfig>) {
    this._config = {
      stateDim: 140,
      actionDim: 6,
      latentDim: 16,
      hiddenDim: 64,
      encoderHidden: [128, 64],
      decoderHidden: [64, 64],
      plannerHidden: [64, 32],
      lrEncoder: 0.001,
      lrDecoder: 0.001,
      lrPlanner: 0.001,
      klBeta: 0.1,
      horizon: 10,
      planSamples: 100,
      ...config,
    };

    this._encoderWeights = [];
    this._encoderBiases = [];
    this._decoderWeights = [];
    this._decoderBiases = [];
    this._plannerWeights = [];
    this._plannerBiases = [];
    this._recurrentWeights = [];
    this._recurrentBiases = [];

    const encoderInputDim = this._config.stateDim + this._config.actionDim + 1;
    this._initNetwork(encoderInputDim, this._config.encoderHidden, this._config.latentDim * 2, this._encoderWeights, this._encoderBiases);

    const decoderInputDim = this._config.latentDim + this._config.actionDim;
    this._initNetwork(decoderInputDim, this._config.decoderHidden, this._config.stateDim, this._decoderWeights, this._decoderBiases);

    const plannerInputDim = this._config.stateDim + this._config.latentDim;
    this._initNetwork(plannerInputDim, this._config.plannerHidden, this._config.actionDim, this._plannerWeights, this._plannerBiases);

    this._initNetwork(this._config.latentDim, [this._config.hiddenDim], this._config.latentDim, this._recurrentWeights, this._recurrentBiases);
  }

  encodeBelief(trajectory: Trajectory): BeliefState {
    if (trajectory.states.length === 0) {
      return new BeliefStateImpl(
        new Float32Array(this._config.latentDim),
        new Float32Array(this._config.latentDim),
      );
    }

    let belief: Float32Array = new Float32Array(this._config.latentDim);

    for (let t = 0; t < trajectory.states.length; t++) {
      const input = this._concatTransition(trajectory.states[t], trajectory.actions[t], trajectory.rewards[t]);
      const encoding = this._forwardNetwork(input, this._encoderWeights, this._encoderBiases, true);

      const latentDimEnc = this._config.latentDim;
      const meanEnc = new Float32Array(latentDimEnc);
      for (let i = 0; i < latentDimEnc; i++) {
        meanEnc[i] = encoding[i];
      }

      belief = this._recurrentStep(belief, meanEnc);
    }

    const finalInput = this._concatTransition(
      trajectory.states[trajectory.states.length - 1],
      trajectory.actions[trajectory.actions.length - 1],
      trajectory.rewards[trajectory.rewards.length - 1],
    );
    const finalEncoding = this._forwardNetwork(finalInput, this._encoderWeights, this._encoderBiases, true);
    const latentDimFinal = this._config.latentDim;
    const meanFinal = new Float32Array(latentDimFinal);
    const logVarFinal = new Float32Array(latentDimFinal);
    for (let i = 0; i < latentDimFinal; i++) {
      meanFinal[i] = finalEncoding[i];
      logVarFinal[i] = Math.max(-10, Math.min(10, finalEncoding[latentDimFinal + i]));
    }

    return new BeliefStateImpl(meanFinal, logVarFinal);
  }

  plan(belief: BeliefState, horizon: number): Float32Array[] {
    const actions: Float32Array[] = [];
    const z = belief.sample();

    for (let h = 0; h < horizon; h++) {
      const state = new Float32Array(this._config.stateDim);
      const input = new Float32Array(state.length + z.length);
      input.set(state, 0);
      input.set(z, state.length);

      const logits = this._forwardNetwork(input, this._plannerWeights, this._plannerBiases, false);
      const probs = this._softmax(logits);
      actions.push(probs);
    }

    return actions;
  }

  update(trajectories: Trajectory[]): { encoderLoss: number; decoderLoss: number; plannerLoss: number } {
    let encoderLoss = 0;
    let decoderLoss = 0;
    let plannerLoss = 0;

    for (const traj of trajectories) {
      const belief = this.encodeBelief(traj);
      const z = belief.sample();
      const kl = belief.klDivergence();
      encoderLoss += this._config.klBeta * kl;

      for (let t = 0; t < traj.states.length; t++) {
        const decInput = new Float32Array(z.length + 1);
        decInput.set(z, 0);
        decInput[z.length] = traj.actions[t] / (this._config.actionDim - 1);

        const predState = this._forwardNetwork(decInput, this._decoderWeights, this._decoderBiases, true);
        let reconLoss = 0;
        for (let i = 0; i < traj.states[t].length && i < predState.length; i++) {
          const diff = traj.states[t][i] - predState[i];
          reconLoss += diff * diff;
        }
        decoderLoss += reconLoss;

        const planInput = new Float32Array(traj.states[t].length + z.length);
        planInput.set(traj.states[t], 0);
        planInput.set(z, traj.states[t].length);

        const actionLogits = this._forwardNetwork(planInput, this._plannerWeights, this._plannerBiases, false);
        const actionProbs = this._softmax(actionLogits);
        const actionProbValue = actionProbs[traj.actions[t]];
        const clampedProb = actionProbValue > 0 && isFinite(actionProbValue) ? Math.max(actionProbValue, 1e-8) : 1e-8;
        plannerLoss += -Math.log(clampedProb);
      }
    }

    if (trajectories.length > 0) {
      this._applyGradients(this._encoderWeights, this._encoderBiases, encoderLoss, this._config.lrEncoder);
      this._applyGradients(this._decoderWeights, this._decoderBiases, decoderLoss, this._config.lrDecoder);
      this._applyGradients(this._plannerWeights, this._plannerBiases, plannerLoss, this._config.lrPlanner);
    }

    const n = trajectories.length;
    return {
      encoderLoss: n > 0 ? encoderLoss / n : 0,
      decoderLoss: n > 0 ? decoderLoss / n : 0,
      plannerLoss: n > 0 ? plannerLoss / n : 0,
    };
  }

  getVAEParams(): VAEParams {
    return {
      encoderWeights: this._encoderWeights.map(w => new Float32Array(w)),
      encoderBiases: this._encoderBiases.map(b => new Float32Array(b)),
      decoderWeights: this._decoderWeights.map(w => new Float32Array(w)),
      decoderBiases: this._decoderBiases.map(b => new Float32Array(b)),
      latentDim: this._config.latentDim,
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

  private _recurrentStep(belief: Float32Array, obsEncoding: Float32Array): Float32Array {
    const input = new Float32Array(belief.length);
    input.set(belief, 0);

    const output = this._forwardNetwork(input, this._recurrentWeights, this._recurrentBiases, true);
    const result = new Float32Array(output.length);
    for (let i = 0; i < output.length; i++) {
      result[i] = output[i] + obsEncoding[i];
    }
    return result;
  }

  private _concatTransition(state: Float32Array, action: number, reward: number): Float32Array {
    const result = new Float32Array(state.length + 2);
    result.set(state, 0);
    result[state.length] = action;
    result[state.length + 1] = reward;
    return result;
  }

  private _softmax(logits: Float32Array): Float32Array {
    const max = Math.max(...logits);
    const exps = logits.map(v => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return new Float32Array(exps.map(v => v / sum));
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
}
