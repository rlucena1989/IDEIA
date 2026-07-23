import { LegacyState } from './legacy-types';

export function freezeLegacy(items: string[]): LegacyState {
  return {
    legacyId: `legacy-${Date.now()}`,
    status: 'frozen',
    frozenAt: new Date().toISOString(),
    preservedItems: items,
    notes: ['System capabilities frozen for legacy mode.'],
  };
}
