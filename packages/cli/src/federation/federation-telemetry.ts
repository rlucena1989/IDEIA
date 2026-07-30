import { ContextNode, SyncDecision } from './federation-types';
import { createLogger } from '@ideia/logger';
import { ConflictResolution } from './conflict-resolver';
const logger = createLogger('federation-telemetry');

export interface FederationTelemetrySnapshot {
  takenAt: string;
  totalNodes: number;
  healthyNodes: number;
  totalSyncs: number;
  totalConflicts: number;
  resolvedConflicts: number;
}

export function buildFederationTelemetry(
  nodes: ContextNode[],
  decisions: SyncDecision[],
  resolutions: ConflictResolution[]
): FederationTelemetrySnapshot {
  return {
    takenAt: new Date().toISOString(),
    totalNodes: nodes.length,
    healthyNodes: nodes.filter(n => n.status === 'healthy').length,
    totalSyncs: decisions.length,
    totalConflicts: resolutions.length,
    resolvedConflicts: resolutions.filter(r => r.resolved).length,
  };
}
