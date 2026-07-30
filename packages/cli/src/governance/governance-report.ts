import { GovernancePolicy } from './policy-types';
import { createLogger } from '@ideia/logger';
import { GovernanceAuditEntry } from './governance-audit';
import { GovernanceContext } from './governance-context';
const logger = createLogger('governance-report');

export interface GovernanceReport {
  generatedAt: string;
  totalPolicies: number;
  enabledPolicies: number;
  totalAuditEntries: number;
  currentContext?: GovernanceContext;
  summary: string[];
}

export function buildGovernanceReport(params: {
  policies: GovernancePolicy[];
  audits: GovernanceAuditEntry[];
  context?: GovernanceContext;
}): GovernanceReport {
  const enabledPolicies = params.policies.filter(p => p.enabled).length;

  const summary: string[] = [
    `${params.policies.length} política(s) registrada(s)`,
    `${enabledPolicies} ativa(s)`,
    `${params.audits.length} entrada(s) de auditoria`,
  ];

  if (params.context) {
    summary.push(`Contexto: ${params.context.contextId} (risco: ${params.context.risk})`);
  }

  return {
    generatedAt: new Date().toISOString(),
    totalPolicies: params.policies.length,
    enabledPolicies,
    totalAuditEntries: params.audits.length,
    currentContext: params.context,
    summary,
  };
}
