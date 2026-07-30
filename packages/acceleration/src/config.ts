import { EngineConfig, EngineMode } from './types';
import { createLogger } from '@ideia/logger';
import { ConfigManager } from '@ideia/config-engine';
const config = ConfigManager.getInstance();
const logger = createLogger('config');


function parseMode(value: string | undefined): EngineMode {
  if (value === 'fast' || value === 'balanced' || value === 'deep') return value;
  return 'balanced';
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function parseNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadConfig(): EngineConfig {
  const mode = parseMode(config.get('AI_MODE'));
  const loop = parseBoolean(config.get('AI_LOOP'), false);
  const stopOnFailure = parseBoolean(config.get('AI_STOP_ON_FAILURE'), true);

  const concurrencyByMode: Record<EngineMode, number> = {
    fast: 8,
    balanced: 4,
    deep: 2
  };

  return {
    mode,
    concurrency: parseNumber(config.get('AI_CONCURRENCY'), concurrencyByMode[mode]),
    loop,
    stopOnFailure,
    reportDir: config.get('AI_REPORT_DIR') ?? '.ai-devkit/reports',
    cacheFile: config.get('AI_CACHE_FILE') ?? '.ai-devkit/cache.json',
    stateFile: config.get('AI_STATE_FILE') ?? '.ai-devkit/state.json',
    metricsFile: config.get('AI_METRICS_FILE') ?? '.ai-devkit/metrics.json',
    telemetryFile: config.get('AI_TELEMETRY_FILE') ?? '.ai-devkit/telemetry.json'
  };
}
