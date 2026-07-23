import * as crypto from 'node:crypto';

export interface DomainNode {
  domainId: string;
  name: string;
  type: 'team' | 'workspace' | 'organization' | 'partner' | 'authority';
  trustLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'healthy' | 'degraded' | 'blocked' | 'offline';
  scope: string[];
  owners: string[];
  policies: string[];
}

export interface AuthorityAssignment {
  assignmentId: string;
  domainId: string;
  authorityLevel: 'low' | 'medium' | 'high' | 'critical';
  grantedAt: string;
  grantedBy: string;
  reason: string;
}

export interface GovernanceDecision {
  decisionId: string;
  topic: string;
  approved: boolean;
  reason: string;
  decidedAt: string;
}

export function createDomain(params: {
  name: string;
  type: DomainNode['type'];
  trustLevel?: DomainNode['trustLevel'];
  status?: DomainNode['status'];
  scope?: string[];
  owners?: string[];
  policies?: string[];
}): DomainNode {
  return {
    domainId: crypto.randomUUID(),
    name: params.name,
    type: params.type,
    trustLevel: params.trustLevel ?? 'medium',
    status: params.status ?? 'healthy',
    scope: params.scope ?? [],
    owners: params.owners ?? [],
    policies: params.policies ?? [],
  };
}
