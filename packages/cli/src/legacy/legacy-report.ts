import { LegacyState, ArchiveBundle, RestorationPlan } from './legacy-types';
import { createLogger } from '@ideia/logger';
import { FinalAuditEntry } from './final-audit';
const logger = createLogger('legacy-report');

export interface LegacyReport {
  generatedAt: string;
  state: LegacyState | null;
  archives: ArchiveBundle[];
  audit: FinalAuditEntry[];
  plan: RestorationPlan | null;
  notes: string[];
}

export function buildLegacyReport(params: {
  state: LegacyState | null;
  archives: ArchiveBundle[];
  audit: FinalAuditEntry[];
  plan: RestorationPlan | null;
}): LegacyReport {
  const notes: string[] = [
    `Status: ${params.state?.status ?? 'not initialized'}`,
    `${params.archives.length} archive bundle(s)`,
    `${params.audit.length} audit entr(ies)`,
    `Restoration plan: ${params.plan ? (params.plan.allowed ? 'allowed' : 'blocked') : 'not defined'}`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    ...params,
    notes,
  };
}
