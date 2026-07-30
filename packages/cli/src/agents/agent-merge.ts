import { AgentTaskResult } from './agent-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('agent-merge');

export interface MergedAgentResult {
  mergedAt: string;
  sources: string[];
  payload: Record<string, unknown>;
}

export function mergeAgentResults(results: AgentTaskResult[]): MergedAgentResult {
  const payload: Record<string, unknown> = {};
  const sources: string[] = [];

  for (const result of results) {
    sources.push(result.agentId);
    payload[result.taskId] = result.output;
  }

  return {
    mergedAt: new Date().toISOString(),
    sources,
    payload,
  };
}
