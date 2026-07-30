import { EngineReport } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('delta-engine');

export interface DeltaResult {
  qualityDelta: number;
  durationDelta: number;
  successChanged: boolean;
  modeChanged: boolean;
  summary: string;
}

export function computeDelta(previous: EngineReport | null, current: EngineReport): DeltaResult {
  if (!previous) {
    return {
      qualityDelta: 0,
      durationDelta: 0,
      successChanged: false,
      modeChanged: false,
      summary: 'primeira execucao — sem delta anterior'
    };
  }

  const qualityDelta = current.quality.score - previous.quality.score;
  const durationDelta = current.totalDurationMs - previous.totalDurationMs;
  const successChanged = current.success !== previous.success;
  const modeChanged = current.mode !== previous.mode;

  const parts: string[] = [];
  if (qualityDelta !== 0) parts.push(`qualidade ${qualityDelta > 0 ? '+' : ''}${qualityDelta}`);
  if (durationDelta > 1000) parts.push(`duracao +${Math.round(durationDelta / 1000)}s`);
  if (successChanged) parts.push(`sucesso: ${previous.success} -> ${current.success}`);
  if (modeChanged) parts.push(`modo: ${previous.mode} -> ${current.mode}`);

  return {
    qualityDelta,
    durationDelta,
    successChanged,
    modeChanged,
    summary: parts.length > 0 ? parts.join('; ') : 'sem mudancas significativas'
  };
}
