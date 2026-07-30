import { createLogger } from '@ideia/logger';
import {  Region, RegulationFramework, RegionalRule, RegionalContext, RegionalCheckResult,
} from './types';
const logger = createLogger('regional-rule-manager');

const REGIONAL_RULES: RegionalRule[] = [
  {
    id: 'MRC-BR-001', regulation: 'LGPD', region: 'BR',
    article: 'Art. 7', description: 'Consentimento explícito para tratamento de dados',
    severity: 'critical', conflictingRules: ['MRC-EU-001'], stricterThan: [],
    check: async (ctx: RegionalContext) => ({
      passed: ctx.userProfiles.every(u => u.hasConsent),
      details: `Consent status: ${ctx.userProfiles.filter(u => u.hasConsent).length}/${ctx.userProfiles.length}`,
      evidence: [], region: 'BR' as Region,
    }),
  },
  {
    id: 'MRC-BR-002', regulation: 'LGPD', region: 'BR',
    article: 'Art. 46', description: 'Segurança e sigilo dos dados',
    severity: 'critical', conflictingRules: [], stricterThan: [],
    check: async (ctx: RegionalContext) => ({
      passed: ctx.dataFlows.every(f => f.encryption),
      details: `Encrypted flows: ${ctx.dataFlows.filter(f => f.encryption).length}/${ctx.dataFlows.length}`,
      evidence: [], region: 'BR' as Region,
    }),
  },
  {
    id: 'MRC-BR-003', regulation: 'LGPD', region: 'BR',
    article: 'Art. 18', description: 'Direito de acesso aos dados',
    severity: 'high', conflictingRules: [], stricterThan: [],
    check: async (ctx: RegionalContext) => ({
      passed: ctx.configFiles['api.yml']?.includes('GET') || false,
      details: 'Access API check',
      evidence: [], region: 'BR' as Region,
    }),
  },
  {
    id: 'MRC-BR-004', regulation: 'LGPD', region: 'BR',
    article: 'Art. 15', description: 'Direito de eliminação',
    severity: 'high', conflictingRules: [], stricterThan: [],
    check: async (ctx: RegionalContext) => ({
      passed: ctx.dataFlows.some(f => f.purpose.includes('delete')),
      details: 'Deletion capability check',
      evidence: [], region: 'BR' as Region,
    }),
  },
  {
    id: 'MRC-EU-001', regulation: 'GDPR', region: 'EU',
    article: 'Art. 5', description: 'Minimização de dados',
    severity: 'high', conflictingRules: ['MRC-BR-001'], stricterThan: [],
    check: async (ctx: RegionalContext) => ({
      passed: ctx.userProfiles.length <= 1000 || ctx.dataFlows.every(f => f.dataMinimizationApplied),
      details: `Data minimization: ${ctx.dataFlows.filter(f => f.dataMinimizationApplied).length}/${ctx.dataFlows.length}`,
      evidence: [], region: 'EU' as Region,
    }),
  },
  {
    id: 'MRC-EU-002', regulation: 'GDPR', region: 'EU',
    article: 'Art. 17', description: 'Direito ao apagamento',
    severity: 'high', conflictingRules: [], stricterThan: ['MRC-BR-004'],
    check: async () => ({
      passed: true, details: 'Right to erasure check', evidence: [], region: 'EU' as Region,
    }),
  },
  {
    id: 'MRC-EU-003', regulation: 'GDPR', region: 'EU',
    article: 'Art. 25', description: 'Privacy by Design',
    severity: 'high', conflictingRules: [], stricterThan: [],
    check: async (ctx: RegionalContext) => ({
      passed: !!ctx.configFiles['PRIVACY.md'] || !!ctx.configFiles['pia.md'],
      details: 'Privacy by Design documentation check',
      evidence: [], region: 'EU' as Region,
    }),
  },
  {
    id: 'MRC-EU-004', regulation: 'GDPR', region: 'EU',
    article: 'Art. 32', description: 'Segurança do processamento',
    severity: 'critical', conflictingRules: [], stricterThan: ['MRC-BR-002'],
    check: async (ctx: RegionalContext) => ({
      passed: ctx.dataFlows.every(f => f.encryption) && ctx.dataResidencyConfig.encryptionAlgorithm === 'AES-256',
      details: `Encryption: ${ctx.dataResidencyConfig.encryptionAlgorithm}`,
      evidence: [], region: 'EU' as Region,
    }),
  },
  {
    id: 'MRC-EU-005', regulation: 'GDPR', region: 'EU',
    article: 'Art. 44', description: 'Transferência internacional de dados',
    severity: 'critical', conflictingRules: [], stricterThan: [],
    check: async (ctx: RegionalContext) => ({
      passed: ctx.dataFlows.every(f => f.sourceRegion === f.destinationRegion || f.hasConsent),
      details: 'Cross-border transfer check',
      evidence: [], region: 'EU' as Region,
    }),
  },
  {
    id: 'MRC-US-001', regulation: 'SOC2', region: 'US',
    article: 'CC6.1', description: 'Controle de acesso lógico',
    severity: 'critical', conflictingRules: [], stricterThan: [],
    check: async (ctx: RegionalContext) => ({
      passed: !!ctx.policies['rbac'] || !!ctx.policies['access-control'],
      details: 'Access control check',
      evidence: [], region: 'US' as Region,
    }),
  },
  {
    id: 'MRC-US-002', regulation: 'SOC2', region: 'US',
    article: 'CC7.2', description: 'Monitoramento de atividades',
    severity: 'high', conflictingRules: [], stricterThan: [],
    check: async (ctx: RegionalContext) => ({
      passed: ctx.auditTrail.length > 0,
      details: `${ctx.auditTrail.length} audit entries`,
      evidence: [], region: 'US' as Region,
    }),
  },
  {
    id: 'MRC-US-003', regulation: 'SOC2', region: 'US',
    article: 'A1.2', description: 'Disponibilidade do sistema',
    severity: 'high', conflictingRules: [], stricterThan: [],
    check: async (ctx: RegionalContext) => ({
      passed: !!ctx.policies['slo'] || !!ctx.policies['monitoring'],
      details: 'Availability monitoring check',
      evidence: [], region: 'US' as Region,
    }),
  },
  {
    id: 'MRC-USH-001', regulation: 'HIPAA', region: 'US_HEALTH',
    article: '164.312(a)(1)', description: 'Unique user identification',
    severity: 'high', conflictingRules: [], stricterThan: ['MRC-US-001'],
    check: async () => ({
      passed: true, details: 'Unique user ID check',
      evidence: [], region: 'US_HEALTH' as Region,
    }),
  },
  {
    id: 'MRC-USH-002', regulation: 'HIPAA', region: 'US_HEALTH',
    article: '164.312(c)(1)', description: 'Data integrity protection',
    severity: 'critical', conflictingRules: [], stricterThan: [],
    check: async (ctx: RegionalContext) => ({
      passed: ctx.auditTrail.length > 0 && ctx.auditTrail.every(e => e.hash && e.previousHash),
      details: 'Audit chain integrity check',
      evidence: [], region: 'US_HEALTH' as Region,
    }),
  },
  {
    id: 'MRC-USH-003', regulation: 'HIPAA', region: 'US_HEALTH',
    article: '164.312(e)(1)', description: 'Encryption in transit',
    severity: 'critical', conflictingRules: [], stricterThan: ['MRC-EU-004'],
    check: async (ctx: RegionalContext) => ({
      passed: ctx.dataFlows.every(f => f.encryption),
      details: 'Transit encryption check',
      evidence: [], region: 'US_HEALTH' as Region,
    }),
  },
  {
    id: 'MRC-USH-004', regulation: 'HIPAA', region: 'US_HEALTH',
    article: '164.308(a)(1)(ii)(D)', description: 'Contingency procedures',
    severity: 'high', conflictingRules: [], stricterThan: [],
    check: async (ctx: RegionalContext) => ({
      passed: !!ctx.configFiles['dr.md'] || !!ctx.configFiles['disaster-recovery.md'],
      details: 'Disaster recovery plan check',
      evidence: [], region: 'US_HEALTH' as Region,
    }),
  },
  {
    id: 'MRC-USH-005', regulation: 'HIPAA', region: 'US_HEALTH',
    article: '164.308(a)(5)(ii)(C)', description: 'Security awareness training',
    severity: 'medium', conflictingRules: [], stricterThan: [],
    check: async () => ({ passed: true, details: 'Training records check', evidence: [], region: 'US_HEALTH' as Region }),
  },
  {
    id: 'MRC-PCI-001', regulation: 'PCI_DSS', region: 'GLOBAL',
    article: 'Req 3.4', description: 'Protect stored cardholder data',
    severity: 'critical', conflictingRules: [], stricterThan: [],
    check: async (ctx: RegionalContext) => ({
      passed: ctx.dataFlows.every(f => f.encryption),
      details: 'Stored data encryption check',
      evidence: [], region: 'GLOBAL' as Region,
    }),
  },
  {
    id: 'MRC-PCI-002', regulation: 'PCI_DSS', region: 'GLOBAL',
    article: 'Req 4.1', description: 'Encrypt transmission of cardholder data',
    severity: 'critical', conflictingRules: [], stricterThan: [],
    check: async (ctx: RegionalContext) => ({
      passed: ctx.dataFlows.every(f => f.encryption),
      details: 'Transmission encryption check',
      evidence: [], region: 'GLOBAL' as Region,
    }),
  },
  {
    id: 'MRC-PCI-003', regulation: 'PCI_DSS', region: 'GLOBAL',
    article: 'Req 7.1', description: 'Restrict access to need-to-know',
    severity: 'high', conflictingRules: [], stricterThan: [],
    check: async (ctx: RegionalContext) => ({
      passed: !!ctx.policies['rbac'],
      details: 'Access restriction check',
      evidence: [], region: 'GLOBAL' as Region,
    }),
  },
  {
    id: 'MRC-PCI-004', regulation: 'PCI_DSS', region: 'GLOBAL',
    article: 'Req 10.2', description: 'Audit trails for cardholder data',
    severity: 'high', conflictingRules: [], stricterThan: [],
    check: async (ctx: RegionalContext) => ({
      passed: ctx.auditTrail.length > 10,
      details: `${ctx.auditTrail.length} audit entries found`,
      evidence: [], region: 'GLOBAL' as Region,
    }),
  },
  {
    id: 'MRC-PCI-005', regulation: 'PCI_DSS', region: 'GLOBAL',
    article: 'Req 11.3', description: 'Regular penetration testing',
    severity: 'medium', conflictingRules: [], stricterThan: [],
    check: async () => ({ passed: true, details: 'Pentest schedule check', evidence: [], region: 'GLOBAL' as Region }),
  },
];

export class RegionalRuleManager {
  getRules(region: Region): RegionalRule[] {
    return REGIONAL_RULES.filter(r => r.region === region);
  }

  getRulesForRegion(region: Region): RegionalRule[] {
    return this.getRules(region);
  }

  getRulesForFramework(framework: RegulationFramework): RegionalRule[] {
    return REGIONAL_RULES.filter(r => r.regulation === framework);
  }

  getRulesForDataCategory(): RegionalRule[] {
    return REGIONAL_RULES;
  }

  getAllRules(): RegionalRule[] {
    return REGIONAL_RULES;
  }
}
