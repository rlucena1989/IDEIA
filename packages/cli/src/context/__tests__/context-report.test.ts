import { buildContextReport } from '../context-report';
import type { OperationalContext } from '../context-types';
import type { ContextPriorityResult } from '../context-prioritizer';
import type { MergedContext } from '../context-merge';

describe('buildContextReport', () => {
  const makeCtx = (status: OperationalContext['status'], name: string): OperationalContext => ({
    contextId: name,
    name,
    type: 'product',
    status,
    priority: 5,
    source: 'test',
    tags: [],
    dependencies: [],
    summary: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it('builds report with context counts', () => {
    const contexts = [
      makeCtx('active', 'a1'),
      makeCtx('active', 'a2'),
      makeCtx('blocked', 'b1'),
      makeCtx('archived', 'ar1'),
    ];
    const report = buildContextReport({ contexts, activeContext: contexts[0], priorities: [] });
    expect(report.totalContexts).toBe(4);
    expect(report.activeCount).toBe(2);
    expect(report.blockedCount).toBe(1);
    expect(report.archivedCount).toBe(1);
  });

  it('includes active context reference', () => {
    const ctx = makeCtx('active', 'main');
    const report = buildContextReport({ contexts: [ctx], activeContext: ctx, priorities: [] });
    expect(report.activeContext!.name).toBe('main');
  });

  it('active context can be undefined', () => {
    const report = buildContextReport({ contexts: [], activeContext: undefined, priorities: [] });
    expect(report.activeContext).toBeUndefined();
  });

  it('includes priorities', () => {
    const priorities: ContextPriorityResult[] = [
      { contextId: 'c1', score: 85, label: 'high' },
    ];
    const report = buildContextReport({ contexts: [], activeContext: undefined, priorities });
    expect(report.priorities).toHaveLength(1);
  });

  it('includes optional merged context', () => {
    const merged: MergedContext = {
      mergedId: 'merged-1',
      contexts: [],
      mergedAt: new Date().toISOString(),
      summary: 'merged',
    };
    const report = buildContextReport({ contexts: [], activeContext: undefined, priorities: [], merged });
    expect(report.merged).toBeDefined();
    expect(report.merged!.mergedId).toBe('merged-1');
  });

  it('generates summary lines', () => {
    const ctx = makeCtx('active', 'current');
    const report = buildContextReport({ contexts: [ctx], activeContext: ctx, priorities: [] });
    expect(report.summary[0]).toContain('1 contexto(s)');
    expect(report.summary[1]).toContain('1 ativo(s)');
    expect(report.summary[2]).toContain('current');
  });

  it('handles empty contexts', () => {
    const report = buildContextReport({ contexts: [], activeContext: undefined, priorities: [] });
    expect(report.totalContexts).toBe(0);
    expect(report.activeCount).toBe(0);
    expect(report.blockedCount).toBe(0);
    expect(report.archivedCount).toBe(0);
  });
});
