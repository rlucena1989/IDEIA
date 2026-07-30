import { createLogger } from '@ideia/logger';
import { DPConfig } from './types';

const _logger = createLogger('synthetic-memory:dp');

function _randn(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export class GaussianDPMech {
  private _epsilon: number;
  private _delta: number;
  private _sensitivity: number;
  private _sigma: number;

  constructor(config?: Partial<DPConfig>) {
    this._epsilon = config?.epsilon ?? 1.0;
    this._delta = config?.delta ?? 1e-5;
    this._sensitivity = config?.sensitivity ?? 1.0;
    this._sigma = this._computeSigma();
    _logger.info(`GaussianDP initialized`, { epsilon: this._epsilon, delta: this._delta, sigma: this._sigma });
  }

  get epsilon(): number {
    return this._epsilon;
  }

  get delta(): number {
    return this._delta;
  }

  get sigma(): number {
    return this._sigma;
  }

  get config(): DPConfig {
    return {
      epsilon: this._epsilon,
      delta: this._delta,
      sensitivity: this._sensitivity,
    };
  }

  apply(embedding: Float64Array): Float64Array {
    const result = new Float64Array(embedding.length);
    for (let i = 0; i < embedding.length; i++) {
      result[i] = embedding[i] + _randn() * this._sigma * this._sensitivity;
    }
    return result;
  }

  applyToBatch(embeddings: Float64Array[]): Float64Array[] {
    return embeddings.map(e => this.apply(e));
  }

  setEpsilon(epsilon: number): void {
    this._epsilon = epsilon;
    this._sigma = this._computeSigma();
    _logger.info(`Epsilon updated`, { epsilon, sigma: this._sigma });
  }

  setDelta(delta: number): void {
    this._delta = delta;
    this._sigma = this._computeSigma();
  }

  setSensitivity(sensitivity: number): void {
    this._sensitivity = sensitivity;
    this._sigma = this._computeSigma();
  }

  computePrivacyBudget(compositions: number): number {
    return compositions * this._epsilon;
  }

  computeRemainingBudget(totalBudget: number, usedBudget: number): number {
    const remaining = totalBudget - usedBudget;
    return Math.max(0, remaining);
  }

  applyWithBudget(
    embedding: Float64Array,
    remainingBudget: number
  ): { result: Float64Array; consumedBudget: number } {
    const effectiveEpsilon = Math.min(this._epsilon, remainingBudget);
    if (effectiveEpsilon <= 0) {
      _logger.warn('Privacy budget exhausted');
      return { result: new Float64Array(embedding.length), consumedBudget: 0 };
    }

    const effectiveSigma = Math.sqrt(2 * Math.log(1.25 / this._delta)) / effectiveEpsilon;
    const result = new Float64Array(embedding.length);
    for (let i = 0; i < embedding.length; i++) {
      result[i] = embedding[i] + _randn() * effectiveSigma * this._sensitivity;
    }

    return { result, consumedBudget: effectiveEpsilon };
  }

  calibrateNoise(sensitivity: number, epsilon: number, delta: number): number {
    return Math.sqrt(2 * Math.log(1.25 / delta)) * sensitivity / epsilon;
  }

  private _computeSigma(): number {
    return Math.sqrt(2 * Math.log(1.25 / this._delta)) * this._sensitivity / this._epsilon;
  }
}
