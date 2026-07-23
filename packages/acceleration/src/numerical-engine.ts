export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

export function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length;
}

export function stddev(values: number[]): number {
  return Math.sqrt(variance(values));
}

export function min(values: number[]): number {
  return values.length === 0 ? 0 : Math.min(...values);
}

export function max(values: number[]): number {
  return values.length === 0 ? 0 : Math.max(...values);
}

export function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function floorTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.floor(value * f) / f;
}

export function ceilTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.ceil(value * f) / f;
}

export function significantDigits(value: number, digits: number): number {
  if (value === 0) return 0;
  const d = Math.ceil(Math.log10(Math.abs(value)));
  const power = digits - d;
  const magnitude = 10 ** power;
  return Math.round(value * magnitude) / magnitude;
}

export function sumKahan(values: number[]): number {
  let sum = 0;
  let compensation = 0;
  for (const v of values) {
    const y = v - compensation;
    const t = sum + y;
    compensation = t - sum - y;
    sum = t;
  }
  return sum;
}

export function varianceWelford(values: number[]): number {
  if (values.length < 2) return 0;
  let n = 0, m = 0, s = 0;
  for (const v of values) {
    n++;
    if (n === 1) { m = v; s = 0; continue; }
    const prevM = m;
    m = prevM + (v - prevM) / n;
    s = s + (v - prevM) * (v - m);
  }
  return s / n;
}

export function stddevWelford(values: number[]): number {
  return Math.sqrt(varianceWelford(values));
}
