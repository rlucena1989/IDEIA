import type { MetricsOutput, MetricResult, MetricConfig } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('metrics');

function extractNumericValues(data: unknown): number[] {
  if (Array.isArray(data)) return data.filter((v): v is number => typeof v === 'number' && !isNaN(v));
  if (typeof data === 'object' && data !== null) return extractNumericValues(Object.values(data as Record<string, unknown>));
  if (typeof data === 'number' && !isNaN(data)) return [data];
  return [];
}

function computeTrend(values: number[]): string {
  if (values.length < 2) return 'insufficient_data';
  const half = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, half);
  const secondHalf = values.slice(half);
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  if (avgSecond > avgFirst * 1.05) return 'up';
  if (avgSecond < avgFirst * 0.95) return 'down';
  return 'stable';
}

function computeGrowthRate(values: number[]): number {
  if (values.length < 2) return 0;
  const first = values[0];
  const last = values[values.length - 1];
  if (first === 0) return values.every(v => v === 0) ? 0 : 100;
  return Math.round(((last - first) / Math.abs(first)) * 10000) / 100;
}

function _computeDistribution(values: number[]): Record<string, number> {
  if (values.length === 0) return {};
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const bucketCount = Math.min(5, values.length);
  const bucketSize = range / bucketCount;
  const buckets: Record<string, number> = {};
  for (let i = 0; i < bucketCount; i++) {
    const low = min + i * bucketSize;
    const high = low + bucketSize;
    const label = `${low.toFixed(1)}-${high.toFixed(1)}`;
    buckets[label] = values.filter(v => v >= low && (i === bucketCount - 1 ? v <= high : v < high)).length;
  }
  return buckets;
}

/**
 * Processa metrics.
 * @param data - Valor data.
 * @param config - Valor config.
 * @returns O resultado da operação.
 */
export function computeMetrics(data: unknown, config?: MetricConfig): MetricsOutput {
  const values = extractNumericValues(data);
  const metrics: MetricResult[] = [];

  if (values.length === 0) {
    return { metrics: [], summary: 'Nenhum dado numérico encontrado para análise.' };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const variance = values.length > 1 ? values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length : 0;
  const stddev = Math.sqrt(variance);

  metrics.push({ label: 'count', value: values.length, interpretation: `${values.length} valores analisados` });
  metrics.push({ label: 'sum', value: Math.round(sum * 100) / 100, interpretation: `Soma total: ${Math.round(sum * 100) / 100}` });
  metrics.push({ label: 'mean', value: Math.round(mean * 100) / 100, interpretation: `Média: ${Math.round(mean * 100) / 100}` });
  metrics.push({ label: 'median', value: Math.round(median * 100) / 100, interpretation: `Mediana: ${Math.round(median * 100) / 100}` });
  metrics.push({ label: 'min', value: Math.round(sorted[0] * 100) / 100, interpretation: `Mínimo: ${Math.round(sorted[0] * 100) / 100}` });
  metrics.push({ label: 'max', value: Math.round(sorted[sorted.length - 1] * 100) / 100, interpretation: `Máximo: ${Math.round(sorted[sorted.length - 1] * 100) / 100}` });
  metrics.push({ label: 'stddev', value: Math.round(stddev * 100) / 100, interpretation: `Desvio padrão: ${Math.round(stddev * 100) / 100}` });
  metrics.push({ label: 'variance', value: Math.round(variance * 100) / 100, interpretation: `Variância: ${Math.round(variance * 100) / 100}` });

  if (config?.percentiles) {
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    metrics.push({ label: 'p95', value: p95, interpretation: `Percentil 95: ${p95}` });
    metrics.push({ label: 'p99', value: p99, interpretation: `Percentil 99: ${p99}` });
  }

  if (config?.trend && values.length >= 2) {
    const trend = computeTrend(values);
    metrics.push({ label: 'trend', value: trend === 'up' ? 1 : trend === 'down' ? -1 : 0, interpretation: `Tendência: ${trend}` });
  }

  if (config?.growth && values.length >= 2) {
    const growth = computeGrowthRate(values);
    metrics.push({ label: 'growth_rate', value: growth, interpretation: `Taxa de crescimento: ${growth}%` });
  }

  const summary = `Análise de ${values.length} valores: média ${Math.round(mean * 100) / 100}, mediana ${Math.round(median * 100) / 100}, ` +
    `desvio padrão ${Math.round(stddev * 100) / 100}, min ${Math.round(sorted[0] * 100) / 100}, max ${Math.round(sorted[sorted.length - 1] * 100) / 100}.`;

  return { metrics, summary };
}
