import type { CoverageGap, GapSeverity } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('test-quality-classifier');

export function classifyTestGap(gap: CoverageGap): GapSeverity {
  const text = `${gap.reason} ${gap.impact} ${gap.recommendation}`.toLowerCase();

  if (text.includes('auth') || text.includes('execução crítica') || text.includes('data loss')) {
    return 'critical';
  }

  if (text.includes('core') || text.includes('regression') || text.includes('command')) {
    return 'important';
  }

  if (text.includes('nice to have') || text.includes('visual')) {
    return 'cosmetic';
  }

  return 'optional';
}

export function isCosmetic(gap: CoverageGap): boolean {
  return classifyTestGap(gap) === 'cosmetic';
}

export function isCriticalCoverage(gap: CoverageGap): boolean {
  return classifyTestGap(gap) === 'critical';
}
