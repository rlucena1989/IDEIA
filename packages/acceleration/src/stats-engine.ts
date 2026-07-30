import { mean, variance, stddev, sum, min, max } from './numerical-engine';
import { createLogger } from '@ideia/logger';
const logger = createLogger('stats-engine');

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function quartiles(values: number[]): { q1: number; q2: number; q3: number } {
  const sorted = [...values].sort((a, b) => a - b);
  return { q1: median(sorted.slice(0, Math.floor(sorted.length / 2))), q2: median(sorted), q3: median(sorted.slice(Math.ceil(sorted.length / 2))) };
}

export function correlation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;
  const mx = mean(x), my = mean(y);
  const num = sum(x.map((v, i) => (v - mx) * (y[i] - my)));
  const den = Math.sqrt(sum(x.map(v => (v - mx) ** 2)) * sum(y.map(v => (v - my) ** 2)));
  return den === 0 ? 0 : Math.round((num / den) * 10000) / 10000;
}

export function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  const n = Math.min(x.length, y.length);
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const mx = mean(x), my = mean(y);
  const num = sum(x.map((v, i) => (v - mx) * (y[i] - my)));
  const den = sum(x.map(v => (v - mx) ** 2));
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  const r2 = correlation(x, y) ** 2;
  return { slope: Math.round(slope * 10000) / 10000, intercept: Math.round(intercept * 10000) / 10000, r2: Math.round(r2 * 10000) / 10000 };
}

export function summary(values: number[]): { min: number; max: number; mean: number; median: number; stddev: number; variance: number; count: number } {
  return { min: min(values), max: max(values), mean: mean(values), median: median(values), stddev: stddev(values), variance: variance(values), count: values.length };
}
