import { OperationalContext } from './context-types';

export interface PublishedContext {
  contextId: string;
  publishedAt: string;
  target: 'cli' | 'extension' | 'file' | 'json';
  summary: string;
}

export function publishContext(
  context: OperationalContext,
  target: PublishedContext['target']
): PublishedContext {
  return {
    contextId: context.contextId,
    publishedAt: new Date().toISOString(),
    target,
    summary: context.summary,
  };
}
