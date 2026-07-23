import { SyncDecision } from './federation-types';

export function arbitrateSync(
  localVersion: string,
  remoteVersion: string,
  localAuthority: number,
  remoteAuthority: number
): SyncDecision {
  if (localAuthority === remoteAuthority && localVersion !== remoteVersion) {
    return {
      decisionId: `decision-${Date.now()}`,
      approved: false,
      reason: 'Conflict requires manual review.',
      decidedAt: new Date().toISOString(),
    };
  }

  const winnerNodeId = remoteAuthority > localAuthority ? 'remote' : 'local';

  return {
    decisionId: `decision-${Date.now()}`,
    approved: true,
    winnerNodeId,
    reason: 'Synchronization arbitrated by authority.',
    decidedAt: new Date().toISOString(),
  };
}
