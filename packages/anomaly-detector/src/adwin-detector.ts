export class ADWINDetector {
  private _width: number;
  private _total: number;
  private _bucketSize: number;
  private _buckets: number[][];
  private _delta: number;

  constructor(delta = 0.01, bucketSize = 5) {
    this._width = 0;
    this._total = 0;
    this._bucketSize = bucketSize;
    this._buckets = [];
    this._delta = delta;
  }

  update(value: number): boolean {
    this._total += value;
    this._width++;

    const lastBucket = this._buckets[this._buckets.length - 1];
    if (lastBucket && lastBucket.length < this._bucketSize) {
      lastBucket.push(value);
    } else {
      this._buckets.push([value]);
    }

    const drift = this._detectDrift();
    this._compressBuckets();
    return drift;
  }

  private _compressBuckets(): void {
    while (this._buckets.length > 5) {
      const first = this._buckets[0];
      const second = this._buckets[1];
      if (!first || !second) break;

      const mean1 = first.reduce((a, b) => a + b, 0) / first.length;
      const mean2 = second.reduce((a, b) => a + b, 0) / second.length;

      const epsilon = Math.sqrt(
        (1 / (2 * Math.min(first.length, second.length))) *
          Math.log((4 * this._width) / (this._delta * 0.1)),
      );

      if (Math.abs(mean1 - mean2) > epsilon) {
        break;
      }

      this._buckets = [[...first, ...second], ...this._buckets.slice(2)];
    }
  }

  private _detectDrift(): boolean {
    if (this._buckets.length < 2) return false;

    for (let i = 0; i < this._buckets.length - 1; i++) {
      const leftBuckets = this._buckets.slice(0, i + 1);
      const rightBuckets = this._buckets.slice(i + 1);

      const leftFlat = leftBuckets.flat();
      const rightFlat = rightBuckets.flat();

      const leftMean = leftFlat.reduce((a, b) => a + b, 0) / leftFlat.length;
      const rightMean = rightFlat.reduce((a, b) => a + b, 0) / rightFlat.length;
      const leftSize = leftFlat.length;
      const rightSize = rightFlat.length;

      const epsilon =
        Math.sqrt(
          (1 / (2 * leftSize)) * Math.log((4 * this._width) / this._delta),
        ) +
        Math.sqrt(
          (1 / (2 * rightSize)) * Math.log((4 * this._width) / this._delta),
        );

      if (Math.abs(leftMean - rightMean) > epsilon) {
        this._buckets = this._buckets.slice(i + 1);
        this._width = this._buckets.flat().length;
        this._total = this._buckets.flat().reduce((a, b) => a + b, 0);
        return true;
      }
    }

    return false;
  }

  getWidth(): number {
    return this._width;
  }

  getTotal(): number {
    return this._total;
  }

  getMean(): number {
    return this._width > 0 ? this._total / this._width : 0;
  }

  reset(): void {
    this._width = 0;
    this._total = 0;
    this._buckets = [];
  }
}
