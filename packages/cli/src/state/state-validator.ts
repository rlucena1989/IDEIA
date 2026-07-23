import { DevkitState } from './state-types';

export interface StateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateState(state: DevkitState): StateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!state.version) errors.push('version é obrigatório');
  if (!state.lastUpdated) errors.push('lastUpdated é obrigatório');
  if (!state.summary) warnings.push('summary está vazio');

  if (!state.blocks || state.blocks.length === 0) {
    errors.push('pelo menos um block é obrigatório');
  } else {
    for (const block of state.blocks) {
      if (!block.id) errors.push('block sem id');
      if (!block.title) errors.push(`block "${block.id}" sem title`);
      if (!block.summary) warnings.push(`block "${block.id}" sem summary`);
      if (!block.evidence || block.evidence.length === 0) {
        warnings.push(`block "${block.id}" sem evidence`);
      }
    }
  }

  if (state.blockers && state.blockers.length > 0) {
    warnings.push(`${state.blockers.length} bloqueador(es) pendente(s)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
