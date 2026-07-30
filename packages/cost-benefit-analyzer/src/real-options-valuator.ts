import { Goal, RealOptionValue } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('real-options-valuator');

export class RealOptionsValuator {
  evaluate(goal: Goal, deferralPeriods: number): RealOptionValue {
    const S = goal.complexity * 100;
    const K = (goal.stepCount ?? 5) * 10;
    const T = deferralPeriods;
    const r = 0.05;
    const sigma = 0.3 + (1 - goal.complexity) * 0.2;
    const d1 = (Math.log(S / K) + (r + sigma ** 2 / 2) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    const callValue = S * this._normalCDF(d1) - K * Math.exp(-r * T) * this._normalCDF(d2);
    const intrinsicValue = Math.max(0, S - K);
    const timeValue = callValue - intrinsicValue;
    const elasticity = (S / callValue) * this._normalCDF(d1);
    return {
      callValue, intrinsicValue, timeValue, sigma, elasticity,
      recommendation: callValue > intrinsicValue * 1.2 ? 'defer' : 'execute',
      confidence: Math.min(1, Math.abs(d1) / 3),
    };
  }

  private _normalCDF(x: number): number {
    return 0.5 * (1 + this._erf(x / Math.sqrt(2)));
  }

  private _erf(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const t = 1 / (1 + p * x);
    return sign * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
  }
}
