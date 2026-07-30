import { TrendSignal } from './autonomous-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('trend-analyzer');

export function analyzeTrend(values: number[], dimension: string): TrendSignal {
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;

  return {
    trendId: `trend-${Date.now()}`,
    dimension,
    direction: last > first ? 'improving' : last === first ? 'stable' : 'degrading',
    confidence: values.length >= 3 ? 0.8 : 0.5,
    observedAt: new Date().toISOString(),
  };
}
