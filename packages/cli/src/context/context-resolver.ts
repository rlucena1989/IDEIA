import { OperationalContext } from './context-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('context-resolver');

export function resolveActiveContext(contexts: OperationalContext[]): OperationalContext | undefined {
  return [...contexts]
    .filter(c => c.status !== 'archived')
    .sort((a, b) => {
      if (a.status === 'blocked' && b.status !== 'blocked') return 1;
      if (b.status === 'blocked' && a.status !== 'blocked') return -1;
      return b.priority - a.priority;
    })[0];
}
