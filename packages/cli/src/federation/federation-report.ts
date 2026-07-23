import { ContextNode } from './federation-types';
import { SyncDecision } from './federation-types';
import { ConflictResolution } from './conflict-resolver';

export interface FederationReport {
  generatedAt: string;
  nodes: ContextNode[];
  decisions: SyncDecision[];
  resolutions: ConflictResolution[];
  summary: string[];
}

export function buildFederationReport(params: {
  nodes: ContextNode[];
  decisions: SyncDecision[];
  resolutions: ConflictResolution[];
}): FederationReport {
  const healthy = params.nodes.filter(n => n.status === 'healthy').length;
  const blocked = params.nodes.filter(n => n.status === 'blocked').length;
  const conflicts = params.resolutions.filter(r => !r.resolved).length;

  const summary: string[] = [
    `${params.nodes.length} nó(s) federado(s)`,
    `${healthy} saudável(is), ${blocked} bloqueado(s)`,
    `${params.decisions.length} decisão(ões) de sync`,
    `${conflicts} conflito(s) não resolvido(s)`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    ...params,
    summary,
  };
}
