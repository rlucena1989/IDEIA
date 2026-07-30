import { PlanningAction } from './types';
import { createLogger } from '@ideia/logger';
import { PolicyNetwork } from './policy-network';
import { ValueNetwork } from './value-network';
const logger = createLogger('clipped-surrogate-objective');

export class ClippedSurrogateObjective {
  private readonly _clipEpsilon = 0.2;

  async compute(
    states: Float32Array[], actions: PlanningAction[], advantages: Float32Array, returns: number[],
    policy: PolicyNetwork, valueNet: ValueNetwork
  ): Promise<{ policyLoss: number; valueLoss: number; entropy: number; clipFraction: number; approxKL: number }> {
    const { logProbs, entropy } = policy.evaluate(states, actions);
    const oldLogProbs = await policy.computeOldLogProbs(states, actions);
    const ratio = logProbs.length > 0 && oldLogProbs.length > 0 ? logProbs[0] / Math.max(oldLogProbs[0], 1e-8) : 1;
    const sumAdv = advantages.reduce((s, a) => s + a, 0);
    const surr1 = ratio * sumAdv;
    const surr2 = Math.min(ratio, 1 + this._clipEpsilon) * sumAdv;
    const policyLoss = -Math.min(surr1, surr2);
    const predValues = valueNet.evaluate(states);
    const valueLoss = returns.reduce((sum, ret, i) => sum + (ret - (predValues[i] ?? 0)) ** 2, 0) / Math.max(returns.length, 1);
    const clipFrac = Math.abs(ratio - 1) > this._clipEpsilon ? 1 : 0;
    const approxKL = (ratio - 1) - Math.log(Math.max(ratio, 1e-10));
    return { policyLoss, valueLoss, entropy: entropy ?? 0, clipFraction: clipFrac, approxKL };
  }
}
