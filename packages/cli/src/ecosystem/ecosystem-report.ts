import { DomainNode } from './ecosystem-types';
import { createLogger } from '@ideia/logger';
import { AuditEntry } from './federation-auditor';
const logger = createLogger('ecosystem-report');

export interface EcosystemReport {
  generatedAt: string;
  totalDomains: number;
  healthyDomains: number;
  blockedDomains: number;
  totalAudits: number;
  summary: string[];
}

export function buildEcosystemReport(domains: DomainNode[], audits: AuditEntry[]): EcosystemReport {
  const healthyDomains = domains.filter(d => d.status === 'healthy').length;
  const blockedDomains = domains.filter(d => d.status === 'blocked').length;

  const summary: string[] = [
    `${domains.length} domínio(s) registrado(s)`,
    `${healthyDomains} saudável(is), ${blockedDomains} bloqueado(s)`,
    `${audits.length} entrada(s) de auditoria`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    totalDomains: domains.length,
    healthyDomains,
    blockedDomains,
    totalAudits: audits.length,
    summary,
  };
}
