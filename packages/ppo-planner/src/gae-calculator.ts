export class GAECalculator {
  private readonly _gamma = 0.99;
  private readonly _lambda = 0.95;

  computeGAE(rewards: number[], values: Float32Array, nextValue: number): Float32Array {
    const advantages = new Float32Array(rewards.length);
    let gae = 0;
    for (let t = rewards.length - 1; t >= 0; t--) {
      const vNext = t === rewards.length - 1 ? nextValue : values[t + 1];
      const delta = rewards[t] + this._gamma * vNext - values[t];
      gae = delta + this._gamma * this._lambda * gae;
      advantages[t] = gae;
    }
    return advantages;
  }

  computeReturns(rewards: number[]): number[] {
    const returnsList: number[] = new Array(rewards.length);
    let runningReturn = 0;
    for (let t = rewards.length - 1; t >= 0; t--) {
      runningReturn = rewards[t] + this._gamma * runningReturn;
      returnsList[t] = runningReturn;
    }
    return returnsList;
  }
}
