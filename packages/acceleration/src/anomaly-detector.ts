import { mean, stddev } from './numerical-engine';
import { createLogger } from '@ideia/logger';
const logger = createLogger('anomaly-detector');

export interface AnomalyResult {
  value: number;
  zScore: number;
  isAnomaly: boolean;
  severity: 'none' | 'low' | 'medium' | 'high';
}

export function detectAnomalies(values: number[], threshold = 2.5): AnomalyResult[] {
  const m = mean(values);
  const s = stddev(values);
  if (s === 0) return values.map(v => ({ value: v, zScore: 0, isAnomaly: false, severity: 'none' as const }));

  return values.map(v => {
    const z = Math.abs(v - m) / s;
    const isAnomaly = z > threshold;
    let severity: AnomalyResult['severity'] = 'none';
    if (z > threshold * 2) severity = 'high';
    else if (z > threshold * 1.5) severity = 'medium';
    else if (z > threshold) severity = 'low';
    return { value: v, zScore: Math.round(z * 100) / 100, isAnomaly, severity };
  });
}

export function detectTrend(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 3) return 'stable';
  const half = Math.floor(values.length / 2);
  const firstHalf = mean(values.slice(0, half));
  const secondHalf = mean(values.slice(half));
  const diff = secondHalf - firstHalf;
  const threshold = mean(values) * 0.05;
  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'stable';
}
