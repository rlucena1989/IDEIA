import { ConsistencyReport } from '../state/consistency-types';
import { createLogger } from '@ideia/logger';
import { DevkitState } from '../state/state-types';
import { HardeningWarning } from './warning-contract';
import { HardeningError } from './error-contract';
const logger = createLogger('hardening-checker');

export interface HardeningCheckResult {
  ok: boolean;
  warnings: HardeningWarning[];
  errors: HardeningError[];
  summary: string;
  score: number;
}

export function runHardeningCheck(
  state: DevkitState,
  consistency: ConsistencyReport
): HardeningCheckResult {
  const warnings: HardeningWarning[] = [];
  const errors: HardeningError[] = [];

  if (!state.version) {
    errors.push({ code: 'STATE_NO_VERSION', message: 'Estado sem versão', severity: 'error' });
  }

  if (state.blockers.length > 0) {
    warnings.push({
      code: 'STATE_BLOCKERS',
      message: `${state.blockers.length} bloqueador(es) pendente(s)`,
      source: 'state',
      category: 'consistency',
    });
  }

  for (const item of consistency.items) {
    if (item.status === 'blocked') {
      errors.push({
        code: `CONSISTENCY_BLOCKED_${item.area.replace(/\s+/g, '_').toUpperCase()}`,
        message: `Área bloqueada: ${item.area}`,
        details: item.notes,
        severity: 'critical',
      });
    }
    if (item.status === 'attention') {
      warnings.push({
        code: `CONSISTENCY_ATTENTION_${item.area.replace(/\s+/g, '_').toUpperCase()}`,
        message: `Área com atenção: ${item.area}`,
        source: 'consistency',
        category: 'consistency',
        details: item.notes,
      });
    }
  }

  const totalIssues = errors.length + warnings.length;
  const score = Math.max(0, 100 - totalIssues * 10);
  const ok = errors.length === 0;

  return {
    ok,
    warnings,
    errors,
    summary: `${ok ? 'Hardening OK' : 'Hardening com problemas'} — ${errors.length} erro(s), ${warnings.length} warning(s), score ${score}/100`,
    score,
  };
}
