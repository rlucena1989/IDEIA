export class ZScoreThreshold {
  private _mean: number;
  private _std: number;
  private _zScoreThreshold: number;

  constructor(zScoreThreshold = 3) {
    this._mean = 0;
    this._std = 1;
    this._zScoreThreshold = zScoreThreshold;
  }

  fit(values: number[]): void {
    this._mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - this._mean) ** 2, 0) / values.length;
    this._std = Math.sqrt(variance);
  }

  isAnomaly(value: number): boolean {
    const z = this._std > 0 ? (value - this._mean) / this._std : 0;
    return Math.abs(z) > this._zScoreThreshold;
  }

  getAdjustedThreshold(baseThreshold: number): number {
    const z = this._zScoreThreshold;
    return baseThreshold + z * this._std;
  }

  getMean(): number { return this._mean; }

  getStd(): number { return this._std; }

  update(value: number): void {
    const n = 1;
    const newMean = (this._mean * n + value) / (n + 1);
    const newVariance = ((this._std ** 2) * n + (value - this._mean) * (value - newMean)) / (n + 1);
    this._mean = newMean;
    this._std = Math.sqrt(Math.max(newVariance, 1e-10));
  }
}
