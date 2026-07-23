import { EngineConfig, EngineMode } from './types';

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
  const mode = parseMode(process.env.AI_MODE);
  const loop = parseBoolean(process.env.AI_LOOP, false);
  const stopOnFailure = parseBoolean(process.env.AI_STOP_ON_FAILURE, true);

  const concurrencyByMode: Record<EngineMode, number> = {
    fast: 8,
    balanced: 4,
    deep: 2
  };

  return {
    mode,
    concurrency: parseNumber(process.env.AI_CONCURRENCY, concurrencyByMode[mode]),
    loop,
    stopOnFailure,
    reportDir: process.env.AI_REPORT_DIR ?? '.ai-devkit/reports',
    cacheFile: process.env.AI_CACHE_FILE ?? '.ai-devkit/cache.json',
    stateFile: process.env.AI_STATE_FILE ?? '.ai-devkit/state.json',
    metricsFile: process.env.AI_METRICS_FILE ?? '.ai-devkit/metrics.json',
    telemetryFile: process.env.AI_TELEMETRY_FILE ?? '.ai-devkit/telemetry.json'
  };
}
