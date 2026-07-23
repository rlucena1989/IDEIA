export class WelfordAggregator {
  private n = 0;
  private m = 0;
  private s = 0;

  push(value: number): void {
    this.n++;
    if (this.n === 1) {
      this.m = value;
      this.s = 0;
    } else {
      const prevM = this.m;
      this.m = prevM + (value - prevM) / this.n;
      this.s = this.s + (value - prevM) * (value - this.m);
    }
  }

  get mean(): number {
    return this.n === 0 ? 0 : this.m;
  }

  get variance(): number {
    if (this.n < 2) return 0;
    return this.s / this.n;
  }

  get sampleVariance(): number {
    if (this.n < 2) return 0;
    return this.s / (this.n - 1);
  }

  get stddev(): number {
    return Math.sqrt(this.variance);
  }

  get count(): number {
    return this.n;
  }

  merge(other: WelfordAggregator): void {
    if (other.n === 0) return;
    if (this.n === 0) {
      this.n = other.n;
      this.m = other.m;
      this.s = other.s;
      return;
    }
    const total = this.n + other.n;
    const delta = this.m - other.m;
    this.m = (this.n * this.m + other.n * other.m) / total;
    this.s = this.s + other.s + delta * delta * (this.n * other.n) / total;
    this.n = total;
  }

  reset(): void {
    this.n = 0;
    this.m = 0;
    this.s = 0;
  }
}

export function varianceWelford(values: number[]): number {
  if (values.length < 2) return 0;
  const agg = new WelfordAggregator();
  for (const v of values) agg.push(v);
  return agg.variance;
}

export function stddevWelford(values: number[]): number {
  return Math.sqrt(varianceWelford(values));
}

export function meanWelford(values: number[]): number {
  if (values.length === 0) return 0;
  const agg = new WelfordAggregator();
  for (const v of values) agg.push(v);
  return agg.mean;
}
