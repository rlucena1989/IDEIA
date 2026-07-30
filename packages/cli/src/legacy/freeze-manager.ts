import { LegacyState } from './legacy-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('freeze-manager');

export function freezeLegacy(items: string[]): LegacyState {
  return {
    legacyId: `legacy-${Date.now()}`,
    status: 'frozen',
    frozenAt: new Date().toISOString(),
    preservedItems: items,
    notes: ['System capabilities frozen for legacy mode.'],
  };
}
