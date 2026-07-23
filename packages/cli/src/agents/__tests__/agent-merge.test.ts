import { describe, it, expect } from '@jest/globals';
import { mergeAgentResults } from '../agent-merge';
import { AgentTaskResult } from '../agent-types';

describe('agent-merge', () => {
  it('mergeAgentResults should be defined', () => {
    expect(mergeAgentResults).toBeDefined();
  });

  it('should merge results and preserve sources', () => {
    const results: AgentTaskResult[] = [
      { taskId: 't1', agentId: 'a1', ok: true, output: { data: 'from-a1' }, notes: [], completedAt: new Date().toISOString() },
      { taskId: 't2', agentId: 'a2', ok: true, output: { data: 'from-a2' }, notes: [], completedAt: new Date().toISOString() },
    ];
    const merged = mergeAgentResults(results);
    expect(merged.sources).toContain('a1');
    expect(merged.sources).toContain('a2');
    expect(merged.payload['t1']).toEqual({ data: 'from-a1' });
  });
});
