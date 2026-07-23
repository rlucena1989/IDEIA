import { OperationalContext } from './context-types';

export interface ContextPriorityResult {
  contextId: string;
  name: string;
  score: number;
  reason: string;
}

export function prioritizeContexts(contexts: OperationalContext[]): ContextPriorityResult[] {
  return contexts.map(context => ({
    contextId: context.contextId,
    name: context.name,
    score: context.priority
      + (context.status === 'blocked' ? -50 : 0)
      + context.dependencies.length * 2
      + (context.status === 'active' ? 10 : 0),
    reason: context.status === 'blocked'
      ? 'Blocked context — needs resolution'
      : 'Priority computed from operational metadata',
  })).sort((a, b) => b.score - a.score);
}
