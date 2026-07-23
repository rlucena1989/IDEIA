import { AgentTaskResult } from './agent-types';

export function summarizeResults(results: AgentTaskResult[]): {
  total: number;
  ok: number;
  failed: number;
  okRate: number;
} {
  const total = results.length;
  const ok = results.filter(r => r.ok).length;
  const failed = total - ok;
  return { total, ok, failed, okRate: total > 0 ? ok / total : 0 };
}
