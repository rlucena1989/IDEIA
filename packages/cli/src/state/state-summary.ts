import { DevkitState } from './state-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('state-summary');

export interface StateSummary {
  totalBlocks: number;
  doneBlocks: number;
  partialBlocks: number;
  blockedBlocks: number;
  experimentalBlocks: number;
  activeCommands: number;
  totalMetrics: number;
  blockerCount: number;
  overallStatus: 'good' | 'attention' | 'critical';
  completionPct: number;
}

export function summarizeState(state: DevkitState): StateSummary {
  const doneBlocks = state.blocks.filter(b => b.status === 'done').length;
  const partialBlocks = state.blocks.filter(b => b.status === 'partial').length;
  const blockedBlocks = state.blocks.filter(b => b.status === 'blocked').length;
  const experimentalBlocks = state.blocks.filter(b => b.status === 'experimental').length;

  const activeCommands = state.commands.filter(c => c.status === 'active').length;

  let overallStatus: StateSummary['overallStatus'] = 'good';
  if (blockedBlocks > 0) overallStatus = 'critical';
  else if (partialBlocks > 0 || experimentalBlocks > 0) overallStatus = 'attention';

  const totalPossible = state.blocks.length * 2;
  const scored = doneBlocks * 2 + partialBlocks * 1;
  const completionPct = totalPossible > 0 ? Math.round((scored / totalPossible) * 100) : 0;

  return {
    totalBlocks: state.blocks.length,
    doneBlocks,
    partialBlocks,
    blockedBlocks,
    experimentalBlocks,
    activeCommands,
    totalMetrics: state.metrics.length,
    blockerCount: state.blockers.length,
    overallStatus,
    completionPct,
  };
}
