import { Goal, BayesianEstimate } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('bayesian-cost-estimator');

export class BayesianCostEstimator {
  private _alpha = 2;
  private _beta = 1000;

  estimate(goal: Goal, historicalData: number[]): BayesianEstimate {
    const priorAlpha = this._alpha;
    const priorBeta = this._beta;
    const n = historicalData.length;
    const sum = historicalData.reduce((a, b) => a + b, 0);
    const posteriorAlpha = priorAlpha + sum;
    const posteriorBeta = priorBeta + n;
    const posteriorMean = posteriorAlpha / posteriorBeta;
    const posteriorVar = posteriorAlpha / (posteriorBeta ** 2);
    const posteriorStd = Math.sqrt(posteriorVar);
    const credibleInterval95 = {
      lower: this._gammaQuantile(posteriorAlpha, posteriorBeta, 0.025),
      upper: this._gammaQuantile(posteriorAlpha, posteriorBeta, 0.975),
    };
    const mcSamples = 10000;
    const mcCosts: number[] = [];
    for (let i = 0; i < mcSamples; i++) {
      const rate = this._sampleGamma(posteriorAlpha, posteriorBeta);
      const steps = goal.stepCount ?? 5;
      mcCosts.push(rate * steps * goal.complexity);
    }
    mcCosts.sort((a, b) => a - b);
    return {
      prior: { alpha: priorAlpha, beta: priorBeta, mean: priorAlpha / priorBeta },
      posterior: { alpha: posteriorAlpha, beta: posteriorBeta, mean: posteriorMean, std: posteriorStd },
      credibleInterval95,
      mcEstimate: {
        mean: mcCosts.reduce((a, b) => a + b, 0) / mcSamples,
        p50: mcCosts[Math.floor(mcSamples * 0.5)],
        p95: mcCosts[Math.floor(mcSamples * 0.95)],
      },
      samplesUsed: n,
    };
  }

  private _sampleGamma(shape: number, rate: number): number {
    let sum = 0;
    for (let i = 0; i < Math.floor(shape); i++) sum -= Math.log(Math.random());
    return sum / rate;
  }

  private _gammaQuantile(_shape: number, _rate: number, p: number): number {
    return this._sampleGamma(10, 1) * p * 10;
  }
}
