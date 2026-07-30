import { GAECalculator } from './gae-calculator';
import { createLogger } from '@ideia/logger';
import { ClippedSurrogateObjective } from './clipped-surrogate-objective';
import { PolicyNetwork } from './policy-network';
import { ValueNetwork } from './value-network';
import { RewardShaper } from './reward-shaper';
import { Experience, PlanningEnv, PPOLosses, TrainingMetrics } from './types';
const logger = createLogger('ppo-trainer');

export class PPOTrainer {
  private _policy: PolicyNetwork;
  private _valueNet: ValueNetwork;
  private _rewardShaper: RewardShaper;
  private _gae: GAECalculator;
  private _surrogate: ClippedSurrogateObjective;
  private _buffer: Experience[] = [];
  private _config = { clipEpsilon: 0.2, valueCoeff: 0.5, entropyCoeff: 0.01, epochs: 10, batchSize: 64, gamma: 0.99, lambda: 0.95 };

  constructor() {
    this._policy = new PolicyNetwork();
    this._valueNet = new ValueNetwork();
    this._rewardShaper = new RewardShaper();
    this._gae = new GAECalculator();
    this._surrogate = new ClippedSurrogateObjective();
  }

  async train(environments: PlanningEnv[], epochs = 1000, stepsPerEpoch = 64): Promise<TrainingMetrics[]> {
    const metrics: TrainingMetrics[] = [];
    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalReward = 0, totalEpisodes = 0;
      for (const env of environments) {
        const trajectories = await this._collectTrajectories(env, stepsPerEpoch);
        totalReward += trajectories.reduce((s, t) => s + t.totalReward, 0);
        totalEpisodes += trajectories.length;
      }
      const losses = await this.update();
      if (epoch % 50 === 0 || epoch === epochs - 1) {
        const avgReward = totalEpisodes > 0 ? totalReward / totalEpisodes : 0;
        metrics.push({
          epoch, avgReward, avgEpisodeLength: stepsPerEpoch / Math.max(totalEpisodes, 1),
          policyLoss: losses.policyLoss, valueLoss: losses.valueLoss, entropy: losses.entropy,
          clipFraction: losses.clipFraction, convergenceScore: Math.min(1, avgReward / 100),
        });
      }
    }
    return metrics;
  }

  async selectAction(state: Float32Array): Promise<{ action: number; logProb: number; value: number }> {
    return this._policy.getAction(state);
  }

  async update(): Promise<PPOLosses> {
    if (this._buffer.length < 64) {
      return { policyLoss: 0, valueLoss: 0, entropy: 0, totalLoss: 0, clipFraction: 0, approxKL: 0 };
    }
    const batch = this._buffer.splice(0, 64);
    const states = batch.map(e => e.state);
    const rewards = batch.map(e => e.reward);
    const dones = batch.map(e => e.done);
    const values = this._valueNet.evaluate(states);
    const nextValue = dones[dones.length - 1] ? 0 : this._valueNet.forward(batch[batch.length - 1].nextState);
    const advantages = this._gae.computeGAE(rewards, values, nextValue);
    const returns = this._gae.computeReturns(rewards);
    let totalLoss = 0, totalPolicyLoss = 0, totalValueLoss = 0, totalEntropy = 0, totalClipFrac = 0, totalKL = 0;
    for (let epoch = 0; epoch < this._config.epochs; epoch++) {
      const result = await this._surrogate.compute(states, batch.map(e => e.action), advantages, returns, this._policy, this._valueNet);
      totalPolicyLoss += result.policyLoss;
      totalValueLoss += result.valueLoss;
      totalEntropy += result.entropy;
      totalLoss += result.policyLoss + this._config.valueCoeff * result.valueLoss - this._config.entropyCoeff * result.entropy;
      totalClipFrac += result.clipFraction;
      totalKL += result.approxKL;
    }
    return {
      policyLoss: totalPolicyLoss / this._config.epochs,
      valueLoss: totalValueLoss / this._config.epochs,
      entropy: totalEntropy / this._config.epochs,
      totalLoss: totalLoss / this._config.epochs,
      clipFraction: totalClipFrac / this._config.epochs,
      approxKL: totalKL / this._config.epochs,
    };
  }

  private async _collectTrajectories(env: PlanningEnv, steps: number): Promise<Array<{ totalReward: number; steps: number }>> {
    const trajectories: Array<{ totalReward: number; steps: number }> = [];
    let state = env.reset();
    for (let step = 0; step < steps; step++) {
      const actionResult = await this.selectAction(state);
      const action = this._policy.decodeAction(actionResult.action);
      const { nextState, reward, done } = env.step(action);
      const shapedReward = this._rewardShaper.shape(reward, env.getProgress());
      this._buffer.push({ state, action, reward: shapedReward, nextState, done });
      state = nextState;
      if (done) {
        trajectories.push({ totalReward: shapedReward, steps: step + 1 });
        state = env.reset();
      }
    }
    return trajectories;
  }

  getPolicy(): PolicyNetwork { return this._policy; }
}
