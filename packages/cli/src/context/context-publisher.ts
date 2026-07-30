import { OperationalContext } from './context-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('context-publisher');

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
