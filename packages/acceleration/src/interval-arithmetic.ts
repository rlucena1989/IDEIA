export class Interval {
  constructor(public low: number, public high: number) {
    if (low > high) {
      this.low = high;
      this.high = low;
    }
  }

  add(other: Interval): Interval {
    return new Interval(this.low + other.low, this.high + other.high);
  }

  sub(other: Interval): Interval {
    return new Interval(this.low - other.high, this.high - other.low);
  }

  mul(other: Interval): Interval {
    const products = [
      this.low * other.low,
      this.low * other.high,
      this.high * other.low,
      this.high * other.high,
    ];
    return new Interval(Math.min(...products), Math.max(...products));
  }

  div(other: Interval): Interval {
    if (other.low <= 0 && other.high >= 0) {
      return new Interval(-Infinity, Infinity);
    }
    const quotients = [
      this.low / other.low,
      this.low / other.high,
      this.high / other.low,
      this.high / other.high,
    ];
    return new Interval(Math.min(...quotients), Math.max(...quotients));
  }

  pow(n: number): Interval {
    if (n === 0) return new Interval(1, 1);
    if (n < 0) return this.pow(-n).inverse();
    const values = [this.low ** n, this.high ** n];
    if (n % 2 === 0 && this.low < 0) values.push(0);
    return new Interval(Math.min(...values), Math.max(...values));
  }

  inverse(): Interval {
    if (this.low <= 0 && this.high >= 0) {
      return new Interval(-Infinity, Infinity);
    }
    return new Interval(1 / this.high, 1 / this.low);
  }

  contains(value: number): boolean {
    return value >= this.low && value <= this.high;
  }

  width(): number {
    return this.high - this.low;
  }

  midpoint(): number {
    return (this.low + this.high) / 2;
  }

  toString(): string {
    return `[${this.low}, ${this.high}]`;
  }

  toPrecision(precision: number): Interval {
    const f = 10 ** precision;
    return new Interval(
      Math.floor(this.low * f) / f,
      Math.ceil(this.high * f) / f
    );
  }
}

export function interval(value: number, error: number): Interval {
  return new Interval(value - Math.abs(error), value + Math.abs(error));
}

export function intervalFromMeasurement(value: number, relativeError: number): Interval {
  const abs = Math.abs(value * relativeError);
  return new Interval(value - abs, value + abs);
}
