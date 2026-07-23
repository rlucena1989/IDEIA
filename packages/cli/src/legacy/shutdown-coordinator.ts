import { LegacyState } from './legacy-types';

export function shutdownSystem(state: LegacyState): LegacyState {
  return {
    ...state,
    status: 'shutdown',
    notes: [...state.notes, 'System shutdown completed safely.'],
  };
}

export function confirmShutdown(state: LegacyState): boolean {
  return state.status === 'shutdown' && state.notes.some(n => n.includes('shutdown completed'));
}
