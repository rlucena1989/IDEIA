import { ConsistencyReport } from '../state/consistency-types';

export interface ConsistencyCheckResult {
  ok: boolean;
  attentionCount: number;
  blockedCount: number;
  summary: string[];
}

export function checkConsistency(report: ConsistencyReport): ConsistencyCheckResult {
  const attentionCount = report.items.filter(item => item.status === 'attention').length;
  const blockedCount = report.items.filter(item => item.status === 'blocked').length;

  return {
    ok: blockedCount === 0,
    attentionCount,
    blockedCount,
    summary: report.summary,
  };
}
