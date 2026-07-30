import { PhaseId } from './orchestration-types';

export const PHASE_ORDER: PhaseId[] = [
  'diagnosis', 'structuring', 'parallelization', 'checkpoint', 'multi-model',
  'decision-routing', 'full-autonomous', 'adaptive-governance', 'industrial-autonomy',
];

export const PHASE_NAMES: Record<PhaseId, string> = {
  diagnosis: 'Diagnostico e bootstrap',
  structuring: 'Estruturacao local',
  parallelization: 'Paralelizacao assistida',
  checkpoint: 'Orquestracao de checkpoints',
  'multi-model': 'Roteamento multi-modelo',
  'decision-routing': 'Roteamento de decisoes humanas',
  'full-autonomous': 'Sequenciamento autonomo completo',
  'adaptive-governance': 'Governanca adaptativa',
  'industrial-autonomy': 'Autonomia industrial',
};
