import * as crypto from 'node:crypto';

export interface ContextNode {
  nodeId: string;
  name: string;
  type: 'local' | 'edge' | 'remote' | 'authority';
  status: 'healthy' | 'degraded' | 'blocked' | 'offline';
  version: string;
  scope: string[];
  lastSyncAt?: string;
  authorityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SyncRequest {
  requestId: string;
  fromNodeId: string;
  toNodeId: string;
  payloadType: string;
  priority: number;
  requestedAt: string;
}

export interface SyncDecision {
  decisionId: string;
  approved: boolean;
  winnerNodeId?: string;
  reason: string;
  decidedAt: string;
}

export function createContextNode(params: {
  name: string;
  type: ContextNode['type'];
  scope?: string[];
  authorityLevel?: ContextNode['authorityLevel'];
  status?: ContextNode['status'];
}): ContextNode {
  return {
    nodeId: crypto.randomUUID(),
    name: params.name,
    type: params.type,
    status: params.status ?? 'healthy',
    version: '1.0.0',
    scope: params.scope ?? [],
    authorityLevel: params.authorityLevel ?? 'medium',
  };
}

export function createSyncRequest(params: {
  fromNodeId: string;
  toNodeId: string;
  payloadType: string;
  priority?: number;
}): SyncRequest {
  return {
    requestId: crypto.randomUUID(),
    fromNodeId: params.fromNodeId,
    toNodeId: params.toNodeId,
    payloadType: params.payloadType,
    priority: params.priority ?? 5,
    requestedAt: new Date().toISOString(),
  };
}
